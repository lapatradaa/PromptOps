import json
import logging
from fastapi import APIRouter, HTTPException
from ..core.logic import process_score, calculate_performance_score

router = APIRouter()

@router.post("/calculate-scores")
async def calculate_scores(data: dict):
    try:
        index_scores = data.get("index_scores", {})
        summary = data.get("summary", {})
        robust_scores = data.get("robust_results", [])
        other_results = data.get("results", [])

        # Compute scores
        overall_score = process_score(index_scores, summary)
        performance_score = calculate_performance_score(robust_scores, other_results)

        return {
            "overall_score": json.loads(overall_score),
            "performance_score": json.loads(performance_score)
        }
    except Exception as e:
        logging.error(f"Error in /calculate-scores: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
