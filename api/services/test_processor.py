# File: api/services/test_processor.py

import asyncio
import logging
import traceback
from typing import Dict, Any, List, Optional, Tuple

from celery import Celery
from pydantic import BaseModel

import api.utils.nltk_setup as _
from api.config import Settings
from api.core.logic import process_test, process_test_robust
from api.services.result_aggregator import ResultAggregator
from api.services.test_status_manager import test_status_manager, TestStatus
from api.utils.shared_utils import convert_numpy_types
from api.utils.model_factory import create_completion

# Initialize
settings = Settings()
logger = logging.getLogger(__name__)
celery_app = Celery(
    'test_processor',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)


class TestConfig(BaseModel):
    shot_type: str
    template: str
    topics: List[str]
    topic_configs: Optional[Dict[str, Any]] = None
    system_content: Optional[str] = None
    model_provider: str
    model: str
    api_key: Optional[str] = None
    url: Optional[str] = None
    project_id: str
    test_id: str
    file_path: str


class TestProcessor:
    def __init__(self):
        self.status_manager = test_status_manager

    async def _create_completion_instance(self, config: TestConfig):
        try:
            sys_cont = config.system_content or ""
            return create_completion(
                model_provider=config.model_provider,
                model=config.model,
                system_content=sys_cont,
                url=config.url,
                api_key=config.api_key
            )
        except Exception as e:
            raise Exception(f"Failed to initialize LLM: {str(e)}")

    async def _run_normal_tests(
        self,
        test_id: str,
        config: TestConfig,
        topics: List[str],
        completion: Any
    ) -> Tuple[List[Any], Dict[str, Any]]:
        normal_results: List[Any] = []
        normal_summary = {"total_tests": 0, "failures": 0, "passes": 0}
        for topic in topics:
            await self.status_manager.update_status(
                test_id, TestStatus.RUNNING, progress=f"Formatting data for {topic}"
            )
            results, summary = process_test(
                file_path=config.file_path,
                shot_type=config.shot_type,
                template=config.template,
                perturbation_types=[topic],
                completion=completion,
                test_id=test_id
            )
            normal_results.extend(results)
            normal_summary["total_tests"] += summary.get("total_tests", 0)
            normal_summary["failures"] += summary.get("failures", 0)
            normal_summary["passes"] += summary.get("passes", 0)
        if normal_summary["total_tests"] > 0:
            normal_summary["pass_rate"] = (
                normal_summary["passes"] / normal_summary["total_tests"] * 100
            )
        return normal_results, normal_summary

    async def _run_robust_tests(
        self,
        test_id: str,
        config: TestConfig,
        percentage: int,
        completion: Any
    ) -> Dict[str, Any]:
        return process_test_robust(
            file_path=config.file_path,
            shot_type=config.shot_type,
            template=config.template,
            num=percentage,
            completion=completion,
            test_id=test_id
        )

    async def process_test(self, config: TestConfig) -> Dict[str, Any]:
        test_id = config.test_id
        logger.info(f"[Celery] process_test starting for {test_id}")
        try:
            # mark running
            await self.status_manager.update_status(
                test_id, TestStatus.RUNNING, progress="Initializing test processor"
            )
            # build LLM
            completion_instance = await self._create_completion_instance(config)
            # split topics
            robust_present = any(
                t.lower() == "robustness" for t in config.topics)
            non_robust = [t for t in config.topics if t.lower() !=
                          "robustness"]
            combined: Dict[str, Any] = {
                "results": [], "summary": {},
                "index_scores": {}, "robust_results": [],
                "overall_robust_score": None
            }
            # run non-robust
            if non_robust:
                await self.status_manager.update_status(
                    test_id, TestStatus.RUNNING,
                    progress=f"Running tests for topics: {', '.join(non_robust)}"
                )
                nr, ns = await self._run_normal_tests(
                    test_id, config, non_robust, completion_instance
                )
                combined["results"] = nr
                combined["summary"] = ns
            # run robust
            if robust_present:
                pct = (config.topic_configs or {}).get(
                    "robustness", {}).get("swapPercentage", 10)
                await self.status_manager.update_status(
                    test_id, TestStatus.RUNNING,
                    progress=f"Running robustness tests ({pct}%)"
                )
                rd = await self._run_robust_tests(
                    test_id, config, pct, completion_instance
                )
                combined["index_scores"] = rd.get("index_scores", {})
                combined["robust_results"] = rd.get("robust_results", [])
                if combined["index_scores"]:
                    combined["overall_robust_score"] = (
                        sum(combined["index_scores"].values())
                        / len(combined["index_scores"])
                    )
            # final aggregation
            await self.status_manager.update_status(
                test_id, TestStatus.RUNNING, progress="Calculating final scores"
            )
            agg = ResultAggregator.aggregate(
                combined["index_scores"],
                combined["summary"],
                combined["robust_results"],
                combined["results"]
            )
            combined.update(agg)
            final = convert_numpy_types(combined)
            # mark completed
            await self.status_manager.update_status(
                test_id, TestStatus.COMPLETED,
                progress="Test completed successfully",
                results=final
            )
            return final
        except Exception as e:
            err = f"Error processing test: {e}"
            logger.error(f"{err}\n{traceback.format_exc()}")
            await self.status_manager.update_status(
                test_id, TestStatus.ERROR,
                progress="Test failed",
                error=err
            )
            raise


@celery_app.task(bind=True, name='process_test_task')
def process_test_task(self, config_json: str):
    cfg = TestConfig.parse_raw(config_json)
    processor = TestProcessor()
    processor.status_manager.reset()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(processor.process_test(cfg))
    finally:
        loop.close()
