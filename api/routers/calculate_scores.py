# api/routers/calculate_scores.py

import json
import logging
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..core.logic import (
    process_score,
    calculate_performance_score
)

router = APIRouter()

# Common utility function for calculating scores


async def calculate_scores_internal(index_scores, summary, robust_results, test_results):
    """
    Internal function to calculate overall and performance scores
    to avoid code duplication.
    """
    try:
        # Calculate overall_score
        overall_score_json = process_score(index_scores, summary)

        # Ensure overall_score is a dictionary, not a JSON string
        if isinstance(overall_score_json, str):
            try:
                overall_score = json.loads(overall_score_json)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing overall_score_json: {e}")
                overall_score = {"overall_total_tests": 0, "overall_failures": 0,
                                 "overall_failure_rate": 0, "overall_pass": 0, "overall_pass_rate": 0}
        else:
            overall_score = overall_score_json

        # Calculate performance_score
        performance_score_json = calculate_performance_score(
            robust_results, test_results)

        # Ensure performance_score is a dictionary, not a JSON string
        if isinstance(performance_score_json, str):
            try:
                performance_score = json.loads(performance_score_json)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing performance_score_json: {e}")
                performance_score = {"overall_performance_score": 0}
        else:
            performance_score = performance_score_json

        # Log results for debugging
        logging.info(f"Overall score: {overall_score}")
        logging.info(
            f"Performance score keys: {list(performance_score.keys() if performance_score else [])}")

        return {
            "overall_score": overall_score,
            "performance_score": performance_score
        }
    except Exception as e:
        logging.error(f"Error calculating scores: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error calculating scores: {str(e)}")

# Public API endpoint for calculating scores on demand


@router.post("/calculate-scores")
async def calculate_scores(data: dict):
    try:
        # Add extensive logging
        logging.info(f"Received data keys: {list(data.keys())}")

        # Validate expected keys exist
        required_keys = ["summary", "results"]
        missing_keys = [key for key in required_keys if key not in data]
        if missing_keys:
            logging.error(f"Missing required keys: {missing_keys}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Missing required keys: {missing_keys}"}
            )

        # Extract data safely with defaults
        index_scores = data.get("index_scores", {})
        summary = data.get("summary", {})
        robust_results = data.get("robust_results", [])
        test_results = data.get("results", [])

        # Call internal function to calculate scores
        scores = await calculate_scores_internal(index_scores, summary, robust_results, test_results)
        return scores

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logging.error(f"Error in /calculate-scores: {e}\n{tb}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "traceback": tb}
        )
