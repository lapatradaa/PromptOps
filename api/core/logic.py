# File: api/core/logic.py

import logging
import pandas as pd
import json
from typing import Any, Dict, List, Tuple, Optional

from ..utils.csv_helpers import read_csv_safely, save_to_temp_csv
from ..utils.model_factory import create_completion
from ..utils.abort_handler import abort_handler, check_abort

from ..services.perturbation_service import PerturbationService
from ..services.formatter_service import FormatterService
from ..services.test_executor import TestExecutor

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def process_test_robust(
    file_path: str,
    shot_type: str,
    template: str,
    num: int,
    completion: Any = None,
    test_id: Optional[str] = None,
    project_type: str = 'qa'
) -> Dict[str, Any]:
    """
    Process test data with robust perturbations and support for abortion.
    Steps:
      1. Read CSV
      2. Apply robust perturbations
      3. Merge extra columns
      4. Format prompts
      5. Execute tests
    """
    try:
        # Register for abort notifications
        if test_id and test_id not in abort_handler.active_tests:
            abort_handler.register_test(test_id)

        # Create completion model if absent
        if completion is None:
            completion = create_completion()

        # 1) Read input CSV
        df = read_csv_safely(file_path)
        logger.info(f"Successfully read file with {len(df)} rows")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "CSV file read"
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after reading file")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # 2) Apply robust perturbations
        perturb_service = PerturbationService()
        perturbed_df = perturb_service.apply_robust(df, num)
        logger.info(
            f"Perturbations applied; generated {len(perturbed_df)} rows")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Perturbations applied"
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after perturbation")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # 3) Merge original columns back
        extras = df.drop(
            columns=["Question", "Expected_answer"], errors="ignore")
        merged = perturbed_df.merge(
            extras,
            left_on="Original_Question_Index",
            right_index=True,
            how="left"
        )
        output_merged = "merged_perturbation_results.csv"
        merged.to_csv(output_merged, index=False)
        logger.info("Merged results CSV saved.")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Merged CSV saved"
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after merging")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # 4) Format prompts using FormatterService
        fmt = FormatterService(output_merged, template, project_type=project_type)
        formatted = fmt.format_all(shot_type=shot_type, perturb_type="robust")
        logger.info("Formatted robust data via FormatterService.")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Data formatted"
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after formatting")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # Persist prompts CSV
        prompts_csv = "robust_new_formatted_one_shot.csv"
        fmt.save_csv(formatted, prompts_csv)

        # Convert to DataFrame for execution
        robust_df = pd.DataFrame(formatted)
        logger.info(
            f"Ready to execute robust tests; columns: {list(robust_df.columns)}")

        # 5) Execute tests via TestExecutor
        executor = TestExecutor(
            completion_model=completion, test_id=test_id, max_workers=5)
        return executor.run_robust(robust_df)

    except Exception as e:
        logger.error(f"Error in process_test_robust: {e}", exc_info=True)
        if test_id:
            abort_handler.complete_test(test_id)
        return {"index_scores": {}, "robust_results": [], "error": str(e)}


def process_test(
    file_path: str,
    shot_type: str,
    template: str,
    perturbation_types: List[str],
    completion: Any = None,
    test_id: Optional[str] = None,
    project_type: str = 'qa'
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process non-robust tests:
      1. Read CSV
      2. Save clean CSV
      3. Format prompts for each perturbation
      4. Execute tests
    Returns: (results_list, summary_dict)
    """
    try:
        if test_id and test_id not in abort_handler.active_tests:
            abort_handler.register_test(test_id)
        if completion is None:
            completion = create_completion()

        # 1) Read input CSV
        df = read_csv_safely(file_path)
        logger.info(f"Successfully read file with {len(df)} rows")
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after reading file")
            return [], {"aborted": True}

        # 2) Save a standardized CSV
        temp_csv = save_to_temp_csv(df, prefix="input_data_", suffix=".csv")
        logger.info(f"Saved clean CSV to: {temp_csv}")
        if test_id and check_abort(test_id):
            logger.info(f"Test {test_id} aborted after saving CSV")
            return [], {"aborted": True}

        # 3) Format prompts for each perturbation
        fmt = FormatterService(temp_csv, template, project_type=project_type)
        csv_files: List[Tuple[str, str]] = []
        for pt in perturbation_types:
            if test_id:
                abort_handler.active_tests[test_id][
                    "progress"] = f"Formatting data for {pt}"
            formatted = fmt.format_all(shot_type=shot_type, perturb_type=pt)
            if test_id and check_abort(test_id):
                logger.info(
                    f"Test {test_id} aborted during formatting for {pt}")
                return [], {"aborted": True}
            out_csv = f"formatted_{pt}_output.csv"
            fmt.save_csv(formatted, out_csv)
            csv_files.append((pt, out_csv))

        # 4) Execute tests via TestExecutor
        executor = TestExecutor(
            completion_model=completion, test_id=test_id, max_workers=5)
        return executor.run_basic(csv_files)

    except Exception as e:
        logger.error(f"Error in process_test: {e}", exc_info=True)
        if test_id:
            abort_handler.complete_test(test_id)
        return [], {"error": str(e), "total_tests": 0, "failures": 0, "passes": 0}


def process_score(index_scores=None, summary=None):
    """
    Process test scores and calculate overall metrics.

    Args:
        index_scores (dict): Dictionary of index scores from robust tests
        summary (dict): Summary from non-robust tests

    Returns:
        str: JSON string with overall score metrics
    """
    if summary is None:
        summary = {'total_tests': 0, 'failures': 0}

    overall_total_tests = 0
    overall_failures = 0
    threshold = 0.7
    if index_scores is None:
        index_scores = {}

    for index, score in index_scores.items():
        overall_total_tests += 1
        if score < threshold * 100:
            overall_failures += 1

    overall_total_tests += summary.get('total_tests', 0)
    overall_failures += summary.get('failures', 0)
    overall_pass = overall_total_tests - overall_failures
    overall_failure_rate = (
        overall_failures / overall_total_tests) * 100 if overall_total_tests > 0 else 0
    overall_pass_rate = (overall_pass / overall_total_tests) * \
        100 if overall_total_tests > 0 else 0

    result = {
        "overall_total_tests": overall_total_tests,
        "overall_failures": overall_failures,
        "overall_failure_rate": overall_failure_rate,
        "overall_pass": overall_pass,
        "overall_pass_rate": overall_pass_rate
    }

    if summary.get('aborted'):
        result['aborted'] = True

    return json.dumps(result, indent=4)


def calculate_performance_score(detailed_scores=None, results=None):
    """
    Calculate performance scores for all perturbation types.

    Args:
        detailed_scores: List of robust test results
        results: List of non-robust test results

    Returns:
        str: JSON string with performance scores
    """
    if detailed_scores is None:
        detailed_scores = []
    if results is None:
        results = []

    detailed_scores_values = []
    for score in detailed_scores:
        for result in score.get('results', []):
            detailed_scores_values.append(result.get('score_original', 0))

    all_scores = detailed_scores_values + \
        [result.get('score_original', 0) for result in results]
    if not all_scores:
        overall_performance_score = 0
    else:
        overall_performance_score = sum(all_scores) / len(all_scores)

    perturbation_scores = {}
    for result in results:
        test_type = result.get('test_type') or result.get(
            'name', '').split("#")[0].strip().lower()
        if test_type not in perturbation_scores:
            perturbation_scores[test_type] = []
        perturbation_scores[test_type].append(result.get('score_original', 0))

    if detailed_scores:
        if 'robust' not in perturbation_scores:
            perturbation_scores['robust'] = []
        for detailed_score in detailed_scores:
            perturbation_scores['robust'].append(
                detailed_score.get('score', 0))

    perturbation_averages = {}
    for perturbation, scores in perturbation_scores.items():
        if scores:
            perturbation_averages[perturbation] = sum(scores) / len(scores)
        else:
            perturbation_averages[perturbation] = 0

    result_data = {
        "overall_performance_score": overall_performance_score,
        **perturbation_averages,
    }

    logging.info(f"calculate_performance_score result: {result_data}")
    return json.dumps(result_data, indent=4)
