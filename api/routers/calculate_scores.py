# File: api/routers/calculate_scores.py

import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..services.result_aggregator import ResultAggregator

router = APIRouter()


async def calculate_scores_internal(
    index_scores: dict,
    summary: dict,
    robust_results: list,
    test_results: list
):
    """
    Internal: aggregate everything into overall_score & performance_score.
    """
    try:
        return ResultAggregator.aggregate(
            index_scores, summary, robust_results, test_results
        )
    except Exception as e:
        logging.error(f"Error calculating scores: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error calculating scores: {str(e)}"
        )


@router.post("/calculate-scores")
async def calculate_scores(data: dict):
    try:
        logging.info(f"Received data keys: {list(data.keys())}")

        # 1️⃣  If the payload was wrapped under "results", unwrap it.
        if isinstance(data.get("results"), dict):
            data = data["results"]

        # 2️⃣  Ensure the required keys
        missing = [k for k in ("summary", "results") if k not in data]
        if missing:
            return JSONResponse(
                status_code=400,
                content={"error": f"Missing required keys: {missing}"}
            )

        # 3️⃣  Extract everything
        index_scores = data.get("index_scores", {})
        summary = data.get("summary", {})
        robust_results = data.get("robust_results", [])
        test_results = data.get("results", [])

        # 4️⃣  Delegate to aggregator
        scores = await calculate_scores_internal(
            index_scores, summary, robust_results, test_results
        )
        return scores

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in /calculate-scores: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
