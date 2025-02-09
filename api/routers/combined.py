import base64
import os
import json
import logging
import tempfile
import pandas as pd
from fastapi import APIRouter, UploadFile, Form, HTTPException, File

from ..core.logic import process_test, process_test_robust

router = APIRouter()


@router.post("/process-combined")
async def process_combined_endpoint(
    file: UploadFile = File(None),
    shot_type: str = Form(...),
    template: str = Form(...),
    blocks: str = Form(...),
    topics: str = Form(...)   # This is a JSON-encoded list of topics
):
    """
    Single endpoint that calls process_test for non-robust topics
    and process_test_robust for 'robust' (or 'Robustness') if present.
    Additionally, if 'Vocabulary' is found in the topics, it is changed to 'vocab'.
    It then calculates an overall robust score if robust tests were run.
    """
    try:
        # 1) Parse the blocks JSON
        try:
            blocks_list = json.loads(blocks)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON in 'blocks': {str(e)}"
            )

        # 2) Parse the topics JSON
        try:
            # e.g. ["Vocabulary", "Robustness"]
            topics_list = json.loads(topics)
        except Exception:
            topics_list = []

        # 2a) Normalize topics: if "Vocabulary" is found, change it to "vocab"
        topics_list = [
            "vocab" if t.lower() == "vocabulary" else t
            for t in topics_list
        ]

        # 3) Separate robust from other topics
        robust_present = any(t.lower() == "robustness" for t in topics_list)
        non_robust_topics = [
            t for t in topics_list if t.lower() != "robustness"]

        # 4) Handle the uploaded file (or inline CSV block)
        if file is not None:
            data = await file.read()
            extension = os.path.splitext(file.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
                tmp.write(data)
                file_path = tmp.name
        else:
            file_path = await handle_inline_csv_data(blocks_list)

        # 5) Accumulate results in a single dictionary
        combined_result = {
            "results": [],         # from process_test
            "summary": {},         # from process_test
            "index_scores": {},    # from process_test_robust
            "robust_results": [],  # from process_test_robust
            # overall robust score (to be computed)
            "overall_robust_score": None,
        }

        # 6) Run normal tests if any non-robust topics are present
        if non_robust_topics:
            normal_results, normal_summary = process_test(
                file_path,
                shot_type,
                template,
                perturbation_types=non_robust_topics
            )
            combined_result["results"] = normal_results
            combined_result["summary"] = normal_summary

        # 7) Run robust tests if robust is present
        if robust_present:
            robust_data = process_test_robust(file_path, shot_type, template)
            index_scores = robust_data.get("index_scores", {})
            combined_result["index_scores"] = index_scores
            combined_result["robust_results"] = robust_data.get(
                "robust_results", [])

            # Calculate an overall robust score by averaging the index scores
            if index_scores:
                overall_robust_score = sum(
                    index_scores.values()) / len(index_scores)
            else:
                overall_robust_score = 0
            combined_result["overall_robust_score"] = overall_robust_score

        return combined_result

    except Exception as e:
        logging.error(f"Error in /process-combined: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup the temporary file if it exists
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)


async def handle_inline_csv_data(blocks_list):
    """
    Extract CSV data from a block if no file was provided.
    Returns the path to a temporary file containing the CSV data.
    """
    csv_block = next(
        (b for b in blocks_list if b.get('method') in ['csv', 'xlsx']), None
    )
    if not csv_block:
        raise HTTPException(
            status_code=400,
            detail="No file uploaded and no CSV block found!"
        )

    raw_data = csv_block.get("config", {}).get("data")
    if not raw_data:
        raise HTTPException(
            status_code=400,
            detail="CSV/XLSX block found but missing `config.data`"
        )

    extension = ".csv" if csv_block["method"] == "csv" else ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
        if extension == ".csv":
            tmp.write(raw_data.encode("utf-8"))
        else:
            binary_data = base64.b64decode(raw_data)
            tmp.write(binary_data)
        return tmp.name
