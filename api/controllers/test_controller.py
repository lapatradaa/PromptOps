# File: api/controllers/test_controller.py

import json
import logging
import uuid
import time
from fastapi import APIRouter, UploadFile, Form, HTTPException, File, Depends, Header
from typing import Dict, Any, Optional
from pydantic import BaseModel, ValidationError

from api.utils.crypto import decrypt_api_key, is_encrypted
from ..services.test_status_manager import test_status_manager, TestStatus
from ..services.test_processor import TestConfig, process_test_task
from ..services.input_data_service import InputDataService

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> str:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key missing")
    return "default_user"


class CreateTestRequest(BaseModel):
    shot_type: str
    template: str
    topics: list[str]
    topic_configs: Optional[Dict[str, Any]] = None
    system_content: Optional[str] = None
    model_provider: str
    model: str
    api_key: Optional[str] = None
    url: Optional[str] = None
    project_id: str
    project_type: str


class TestController:
    """Controller for test-related operations"""

    def __init__(self):
        self.status_manager = test_status_manager

    async def create_test(
        self,
        file: Optional[UploadFile],
        blocks: str,
        request: CreateTestRequest,
        user_id: str
    ) -> Dict[str, Any]:
        test_id = f"test-{int(time.time())}-{uuid.uuid4().hex[:8]}"
        logger.info(
            f"[test_controller] create_test called for project {request.project_id}")
        logger.info(
            f"[test_controller] model_provider: {request.model_provider}, model: {request.model}")
        try:
            # 1) Create test entry
            await self.status_manager.create_test(test_id, request.project_id, user_id)
            # 2) Prepare input data
            file_path, temp_dir = await InputDataService.prepare_input_data(
                file, blocks, test_id
            )
            # 3) Decrypt API key if needed
            api_key = request.api_key
            if api_key and is_encrypted(api_key):
                api_key = decrypt_api_key(api_key)
            # 4) Build TestConfig
            config = TestConfig(
                shot_type=request.shot_type,
                template=request.template,
                topics=request.topics,
                topic_configs=request.topic_configs,
                system_content=request.system_content,
                model_provider=request.model_provider,
                model=request.model,
                api_key=api_key,
                url=request.url,
                project_id=request.project_id,
                project_type=request.project_type,
                test_id=test_id,
                file_path=file_path
            )
            # 5) Queue the Celery task
            await self.status_manager.update_status(
                test_id,
                TestStatus.QUEUED,
                progress="Test queued for processing"
            )
            process_test_task.delay(config.json())
            logger.info(f"Test {test_id} queued successfully")
            return {
                "test_id": test_id,
                "status": "queued",
                "message": "Test queued successfully. Check status for updates."
            }
        except Exception as e:
            logger.error(f"Error creating test: {e}", exc_info=True)
            await self.status_manager.update_status(
                test_id,
                TestStatus.ERROR,
                progress="Failed to create test",
                error=str(e)
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def get_test_status(self, test_id: str) -> Dict[str, Any]:
        test_info = await self.status_manager.get_test(test_id)
        if not test_info:
            return {
                "test_id": test_id,
                "status": TestStatus.NOT_FOUND.value,
                "error": "Test not found"
            }
        return test_info.to_dict()

    async def get_test_results(self, test_id: str) -> Dict[str, Any]:
        # 1) Fetch stored test
        test_info = await self.status_manager.get_test(test_id)
        if not test_info:
            raise HTTPException(status_code=404, detail="Test not found")
        # 2) Must be completed
        if test_info.status != TestStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail=f"Test results not available. Current status: {test_info.status.value}"
            )
        raw = test_info.results or {}
        # 3) Validate existence
        if not raw.get("results") and not raw.get("robust_results"):
            raise HTTPException(status_code=500, detail="Results missing")
        # 4) Ensure summary
        results_list = raw.get("results", [])
        total = len(results_list)
        failures = sum(1 for r in results_list if r.get("fail"))
        passes = total - failures
        raw["summary"] = {
            "total_tests": total,
            "failures": failures,
            "passes": passes,
            "pass_rate": (passes / total * 100) if total > 0 else 0,
        }
        # 5) Wrap under one top-level `results`
        return {
            "results": {
                "results":            raw.get("results", []),
                "robust_results":     raw.get("robust_results", []),
                "summary":            raw["summary"],
                "index_scores":       raw.get("index_scores", {}),
                "overall_robust_score": raw.get("overall_robust_score"),
                "overall_score":      raw.get("overall_score", {}),
                "performance_score":  raw.get("performance_score", {}),
                "error":              raw.get("error")
            }
        }

    async def abort_test(self, test_id: str) -> Dict[str, Any]:
        test_info = await self.status_manager.get_test(test_id)
        if not test_info:
            return {"status": "warning", "message": f"Test {test_id} not found"}
        if test_info.status in [TestStatus.COMPLETED, TestStatus.ERROR, TestStatus.ABORTED]:
            return {"status": "warning", "message": f"Test {test_id} already finished"}
        await self.status_manager.update_status(
            test_id,
            TestStatus.ABORTED,
            progress="Test aborted by user"
        )
        return {"status": "success", "message": f"Test {test_id} aborted successfully"}


test_controller = TestController()


@router.post("/tests")
async def create_test(
    file: Optional[UploadFile] = File(None),
    shot_type: str = Form(...),
    template: str = Form(...),
    blocks: str = Form(...),
    topics: str = Form(...),
    topic_configs: Optional[str] = Form(None),
    system_content: Optional[str] = Form(None),
    model_provider: str = Form(...),
    model: str = Form(...),
    api_key: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    project_id: str = Form(...),
    project_type: str = Form(...),
    user_id: str = Depends(get_current_user_id)
):
    try:
        topics_list = json.loads(topics)
        topic_configs_dict = json.loads(
            topic_configs) if topic_configs else None
        request = CreateTestRequest(
            shot_type=shot_type,
            template=template,
            topics=topics_list,
            topic_configs=topic_configs_dict,
            system_content=system_content,
            model_provider=model_provider,
            model=model,
            api_key=api_key,
            url=url,
            project_id=project_id,
            project_type=project_type
        )
        return await test_controller.create_test(file, blocks, request, user_id)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tests/{test_id}/status")
async def get_test_status(test_id: str):
    return await test_controller.get_test_status(test_id)


@router.get("/tests/{test_id}/results")
async def get_test_results(test_id: str):
    return await test_controller.get_test_results(test_id)


@router.post("/tests/{test_id}/abort")
async def abort_test(test_id: str):
    return await test_controller.abort_test(test_id)
