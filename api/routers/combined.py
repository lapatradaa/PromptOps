# api/utils/combined.py
import os
import json
import logging
import shutil
import tempfile
import uuid
import time
import pandas as pd
from fastapi import status, APIRouter, Header, Query, UploadFile, Form, HTTPException, File, Body, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, List

# from api.config import Settings
from api.utils.model_rate_limits import MODEL_RATE_LIMITS
from ..core.logic import calculate_performance_score, process_score, process_test, process_test_robust
from ..Backend_v1.PromptOps.test import PromptCompletion
from ..utils.shared_utils import convert_numpy_types, handle_inline_csv_data
from ..utils.model_factory import create_completion
from ..utils.abort_handler import abort_handler, check_abort

import litellm

router = APIRouter()

# Global registry for active tests to support abortion
active_tests = {}


# @router.get("/rate-limit-status")
# async def get_rate_limit_status_endpoint(
#     provider: Optional[str] = Query(None, description="Filter by provider"),
#     model: Optional[str] = Query(None, description="Filter by model")
# ):
#     """
#     Get the current rate limit status. This endpoint uses litellm's
#     internal tracking values.
#     """
#     try:
#         litellm_success_rate_limits = getattr(
#             litellm, 'success_rate_limits', {})
#         litellm_rate_limit_errors = getattr(litellm, 'rate_limit_errors', {})

#         status = {}

#         # Loop through configured limits from MODEL_RATE_LIMITS.
#         for p, models in MODEL_RATE_LIMITS.items():
#             if isinstance(models, dict):
#                 if provider and p.lower() != provider.lower():
#                     continue

#                 p_status = {}
#                 for m, rpm in models.items():
#                     if model and m.lower() != model.lower() and m != "default":
#                         continue

#                     model_key = f"{p}/{m}" if m != "default" else p

#                     success_count = litellm_success_rate_limits.get(
#                         model_key, 0)
#                     error_count = litellm_rate_limit_errors.get(model_key, 0)

#                     p_status[m] = {
#                         "limit": rpm,
#                         "success_count": success_count,
#                         "error_count": error_count,
#                         "usage_percent": 0  # Calculation can be added if needed
#                     }
#                 if p_status:
#                     status[p] = p_status
#             else:
#                 if not provider or p.lower() == provider.lower():
#                     model_key = p
#                     success_count = litellm_success_rate_limits.get(
#                         model_key, 0)
#                     error_count = litellm_rate_limit_errors.get(model_key, 0)
#                     status[p] = {
#                         "limit": models,
#                         "success_count": success_count,
#                         "error_count": error_count,
#                         "usage_percent": 0
#                     }

#         return {
#             "status": status,
#             "config": MODEL_RATE_LIMITS,
#             "litellm_tracking": {
#                 "success_requests": dict(litellm_success_rate_limits),
#                 "rate_limit_errors": dict(litellm_rate_limit_errors)
#             }
#         }
#     except Exception as e:
#         logging.error(f"Error getting rate limit status: {str(e)}")
#         return {
#             "status": "error",
#             "message": str(e),
#             "config": MODEL_RATE_LIMITS
#         }


@router.post("/abort-test/{test_id}")
async def abort_test(test_id: str, payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Abort an ongoing test.
    """
    try:
        logging.info(f"Received abort request for test ID: {test_id}")
        if abort_handler.abort_test(test_id):
            logging.info(f"Successfully aborted test: {test_id}")
            return {"status": "success", "message": f"Test {test_id} aborted successfully"}
        else:
            logging.warning(f"Test {test_id} not found or already completed")
            return {"status": "warning", "message": f"Test {test_id} not found or already completed"}
    except Exception as e:
        logging.error(f"Error aborting test {test_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to abort test: {str(e)}")


@router.get("/task-status/{test_id}")
async def get_task_status(test_id: str):

    if test_id not in active_tests:
        raise HTTPException(status_code=404, detail="Test not found")

    test_info = active_tests[test_id]
    runtime_sec = time.time() - test_info.get("started_at", time.time())
    minutes = int(runtime_sec // 60)
    seconds = int(runtime_sec % 60)
    return {
        "test_id": test_id,
        "status": test_info.get("status", "unknown"),
        "progress": test_info.get("progress", ""),
        "runtime": f"{minutes}m {seconds}s",
        "runtime_seconds": runtime_sec,
        "error": test_info.get("error"),
        "started_at": test_info.get("started_at"),
        "completed_at": test_info.get("completed_at")
    }


@router.get("/task-results/{test_id}")
async def get_task_results(test_id: str):
    """
    Get the results of a completed test.
    """

    if test_id not in active_tests:
        raise HTTPException(status_code=404, detail="Test not found")

    test_info = active_tests[test_id]

    if test_info.get("status") != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Test results not available. Current status: {test_info.get('status')}"
        )
    if "results" not in test_info:
        raise HTTPException(
            status_code=500, detail="Results missing from completed test")
    return test_info["results"]


async def process_test_background(
    file_path: str,
    shot_type: str,
    template: str,
    blocks_list: list,
    topics_list: list,
    topic_configs: Optional[str],
    system_content: Optional[str],
    model_provider: Optional[str],
    model: Optional[str],
    api_key: Optional[str],
    url: Optional[str],
    project_id: Optional[str],
    test_id: str,
    temp_dir: Optional[str] = None,
):
    try:
        # Register test for abort tracking.
        abort_handler.register_test(test_id)
        active_tests[test_id] = {
            "started_at": time.time(),
            "status": "running",
            "progress": "Initializing test",
            "aborted": False
        }
        logging.info(f"Starting background processing for test {test_id}")
        active_tests[test_id]["progress"] = "Creating completion instance"
        completion_instance = create_completion(
            model_provider=model_provider,
            model=model,
            system_content=system_content,
            url=url,
            api_key=api_key
        )

        robust_present = any(t.lower() == "robustness" for t in topics_list)
        non_robust_topics = [
            t for t in topics_list if t.lower() != "robustness"]

        active_tests[test_id]["progress"] = "Processing test configuration"
        robustness_percentage = 10
        if robust_present and topic_configs:
            try:
                configs = json.loads(topic_configs)
                if isinstance(configs, dict) and 'robustness' in configs:
                    robustness_percentage = configs['robustness'].get(
                        'swapPercentage', 10)
                    logging.info(
                        f"Using robustness percentage: {robustness_percentage}%")
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing topic_configs: {str(e)}")

        if check_abort(test_id):
            abort_handler.complete_test(test_id)
            active_tests[test_id]["status"] = "aborted"
            active_tests[test_id]["progress"] = "Test aborted before processing"
            active_tests[test_id]["completed_at"] = time.time()
            return

        combined_result = {
            "results": [],
            "summary": {},
            "index_scores": {},
            "robust_results": [],
            "overall_robust_score": None,
        }

        if non_robust_topics:
            active_tests[test_id][
                "progress"] = f"Running tests for topics: {', '.join(non_robust_topics)}"
            normal_results, normal_summary = await run_normal_tests(
                test_id=test_id,
                file_path=file_path,
                shot_type=shot_type,
                template=template,
                topics=non_robust_topics,
                completion=completion_instance
            )
            if check_abort(test_id):
                if temp_dir and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
                abort_handler.complete_test(test_id)
                active_tests[test_id]["status"] = "aborted"
                active_tests[test_id]["progress"] = "Test aborted during non-robust testing"
                active_tests[test_id]["completed_at"] = time.time()
                return
            combined_result["results"] = normal_results
            combined_result["summary"] = normal_summary

        if robust_present:
            active_tests[test_id][
                "progress"] = f"Running robustness tests with {robustness_percentage}% perturbation"
            robust_data = await run_robust_tests(
                test_id=test_id,
                file_path=file_path,
                shot_type=shot_type,
                template=template,
                percentage=robustness_percentage,
                completion=completion_instance
            )
            if check_abort(test_id):
                if temp_dir and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir, ignore_errors=True)
                abort_handler.complete_test(test_id)
                active_tests[test_id]["status"] = "aborted"
                active_tests[test_id]["progress"] = "Test aborted during robustness testing"
                active_tests[test_id]["completed_at"] = time.time()
                return
            combined_result["index_scores"] = robust_data.get(
                "index_scores", {})
            combined_result["robust_results"] = robust_data.get(
                "robust_results", [])
            index_scores = combined_result["index_scores"]
            overall_robust_score = (
                sum(index_scores.values()) / len(index_scores)) if index_scores else 0
            combined_result["overall_robust_score"] = overall_robust_score

        active_tests[test_id]["progress"] = "Processing test results"
        overall_score_json = process_score(
            combined_result["index_scores"],
            combined_result["summary"]
        )
        combined_result["overall_score"] = json.loads(overall_score_json)
        performance_score_json = calculate_performance_score(
            combined_result["robust_results"],
            combined_result["results"]
        )
        combined_result["performance_score"] = json.loads(
            performance_score_json)
        abort_handler.complete_test(test_id)
        active_tests[test_id]["status"] = "completed"
        active_tests[test_id]["progress"] = "Test completed successfully"
        active_tests[test_id]["results"] = convert_numpy_types(combined_result)
        active_tests[test_id]["completed_at"] = time.time()
        logging.info(f"Test {test_id} processed successfully.")
    except Exception as e:
        logging.error(
            f"Error in background processing: {str(e)}", exc_info=True)
        active_tests[test_id]["status"] = "error"
        active_tests[test_id]["error"] = str(e)
        active_tests[test_id]["progress"] = "Failed with error"
        active_tests[test_id]["completed_at"] = time.time()
        abort_handler.complete_test(test_id)
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
                logging.info(f"Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_error:
                logging.error(
                    f"Error cleaning up temp directory: {cleanup_error}")
        if file_path and os.path.exists(file_path) and not temp_dir:
            try:
                os.remove(file_path)
                logging.info(f"Cleaned up temporary file: {file_path}")
            except Exception as cleanup_error:
                logging.error(f"Error cleaning up temp file: {cleanup_error}")


async def run_normal_tests(test_id: str, file_path: str, shot_type: str, template: str,
                           topics: List[str], completion: PromptCompletion):
    active_tests[test_id]["progress"] = f"Running tests for {', '.join(topics)}"
    if check_abort(test_id):
        return [], {"error": "Test aborted during initialization", "total_tests": 0, "failures": 0, "passes": 0}
    normal_results, normal_summary = [], {
        "total_tests": 0, "failures": 0, "passes": 0}
    for i, topic in enumerate(topics):
        active_tests[test_id]["progress"] = f"Processing topic {i+1}/{len(topics)}: {topic}"
        if check_abort(test_id):
            return normal_results, {"error": f"Test aborted during {topic} processing",
                                    "total_tests": normal_summary.get("total_tests", 0),
                                    "failures": normal_summary.get("failures", 0),
                                    "passes": normal_summary.get("passes", 0)}
        topic_results, topic_summary = process_test(
            file_path=file_path,
            shot_type=shot_type,
            template=template,
            perturbation_types=[topic],
            completion=completion,
            test_id=test_id
        )
        normal_results.extend(topic_results)
        normal_summary["total_tests"] += topic_summary.get("total_tests", 0)
        normal_summary["failures"] += topic_summary.get("failures", 0)
        normal_summary["passes"] += topic_summary.get("passes", 0)
    if normal_summary["total_tests"] > 0:
        normal_summary["pass_rate"] = (
            normal_summary["passes"] / normal_summary["total_tests"]) * 100
    return normal_results, normal_summary


async def run_robust_tests(test_id: str, file_path: str, shot_type: str, template: str,
                           percentage: int, completion: PromptCompletion):
    active_tests[test_id][
        "progress"] = f"Running robustness tests with {percentage}% perturbation"
    if check_abort(test_id):
        return {"index_scores": {}, "robust_results": [], "error": "Test aborted before robustness testing"}
    try:
        robust_data = process_test_robust(
            file_path=file_path,
            shot_type=shot_type,
            template=template,
            num=percentage,
            completion=completion,
            test_id=test_id
        )
        if check_abort(test_id):
            return {"index_scores": {}, "robust_results": [], "error": "Test aborted during robustness testing"}
        return robust_data
    except Exception as e:
        logging.error(f"Error in run_robust_tests: {str(e)}", exc_info=True)
        return {"index_scores": {}, "robust_results": [], "error": str(e)}


@router.post("/process-combined")
async def process_combined_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(None),
    shot_type: str = Form(...),
    template: str = Form(...),
    blocks: str = Form(...),
    topics: str = Form(...),
    topic_configs: str = Form(None),
    system_content: str = Form(None),
    model_provider: str = Form(None),
    model: str = Form(None),
    api_key: str = Form(None),
    url: str = Form(None),
    project_id: str = Form(None),
    test_id: str = Form(None),
):
    try:
        if not test_id:
            test_id = f"test-{time.time()}-{uuid.uuid4().hex[:8]}"
        logging.info(
            f"Starting test {test_id} with parameters: shot_type={shot_type}, template={template}")
        active_tests[test_id] = {
            "started_at": time.time(),
            "status": "initializing",
            "progress": "Preparing test",
            "aborted": False
        }
        try:
            blocks_list = json.loads(blocks)
            logging.info(f"Parsed blocks with {len(blocks_list)} entries")
        except json.JSONDecodeError as e:
            logging.error(f"Invalid JSON in blocks: {str(e)}")
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON in blocks: {str(e)}")
        try:
            topics_list = json.loads(topics)
            logging.info(f"Parsed topics: {topics_list}")
        except Exception as e:
            logging.error(f"Error parsing topics: {str(e)}")
            topics_list = []
        topics_list = ["vocab" if t.lower(
        ) == "vocabulary" else t for t in topics_list]
        temp_dir = None
        file_path = None
        try:
            active_tests[test_id]["progress"] = "Processing uploaded file"
            if file is not None:
                data = await file.read()
                extension = os.path.splitext(file.filename)[1].lower()
                temp_dir = tempfile.mkdtemp()
                file_path = os.path.join(temp_dir, f"uploaded_file{extension}")
                with open(file_path, 'wb') as f:
                    f.write(data)
                logging.info(f"Uploaded file saved to: {file_path}")
            else:
                file_path = await handle_inline_csv_data(test_id, blocks_list)
                logging.info(f"Inline CSV data saved to: {file_path}")
            background_tasks.add_task(
                process_test_background,
                file_path=file_path,
                shot_type=shot_type,
                template=template,
                blocks_list=blocks_list,
                topics_list=topics_list,
                topic_configs=topic_configs,
                system_content=system_content,
                model_provider=model_provider,
                model=model,
                api_key=api_key,
                url=url,
                project_id=project_id,
                test_id=test_id,
                temp_dir=temp_dir
            )
            return {"test_id": test_id, "status": "processing", "message": "Test started. Check /task-status for updates."}
        except Exception as file_error:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            if file_path and os.path.exists(file_path) and not temp_dir:
                os.remove(file_path)
            logging.error(f"File processing error: {str(file_error)}")
            raise HTTPException(
                status_code=500, detail=f"Error processing file: {str(file_error)}")
    except Exception as e:
        logging.error(f"Error in /process-combined: {str(e)}", exc_info=True)
        if test_id in active_tests:
            active_tests[test_id]["status"] = "error"
            active_tests[test_id]["error"] = str(e)
            active_tests[test_id]["progress"] = "Failed with error"
            active_tests[test_id]["completed_at"] = time.time()
        abort_handler.complete_test(test_id)
        raise HTTPException(status_code=500, detail=str(e))
