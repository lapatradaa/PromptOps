# File: api/services/result_aggregator.py

import json
import logging
from typing import Any, Dict, List

from ..core.logic import process_score, calculate_performance_score


class ResultAggregator:
    """
    Aggregates index_scores, summary, robust_results and test_results
    into overall_score and performance_score dicts.
    """

    @staticmethod
    def aggregate(
        index_scores: Dict[Any, float],
        summary: Dict[str, Any],
        robust_results: List[Any],
        test_results: List[Any]
    ) -> Dict[str, Any]:
        # Compute overall_score
        overall_json = process_score(index_scores, summary)

        # Ensure overall_score is a dictionary, not a JSON string
        if isinstance(overall_json, str):
            try:
                overall_score = json.loads(overall_json)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing overall_score_json: {e}")
                overall_score = {"overall_total_tests": 0, "overall_failures": 0,
                                 "overall_failure_rate": 0, "overall_pass": 0, "overall_pass_rate": 0}
        else:
            overall_score = overall_json

        # Compute performance_score
        perf_json = calculate_performance_score(robust_results, test_results)

        # Ensure performance_score is a dictionary, not a JSON string
        if isinstance(perf_json, str):
            try:
                performance_score = json.loads(perf_json)
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing performance_score_json: {e}")
                performance_score = {"overall_performance_score": 0}
        else:
            performance_score = perf_json

        # Log results for debugging
        logging.info(f"Overall score: {overall_score}")
        logging.info(
            f"Performance score keys: {list(performance_score.keys() if performance_score else [])}")

        return {
            "overall_score": overall_score,
            "performance_score": performance_score
        }
