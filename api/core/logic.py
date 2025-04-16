# File: api/core/logic.py

import concurrent
from ..Backend_v1.PromptOps.test import Test, PromptCompletion
from pathlib import Path
import numpy as np
import logging
import pandas as pd
import json
import time

from ..Backend_v1.PromptOps.perturb import Perturbation
from ..Backend_v1.PromptOps.std_templates import ShotTemplateFormatter
from ..Backend_v1.PromptOps.icqa_templates import ICQATemplateFormatter
from ..Backend_v1.PromptOps.test import PromptCompletion, Test
from ..Backend_v1.PromptOps.test_suite import TestSuite

from ..utils.model_factory import create_completion
from ..utils.csv_helpers import read_csv_safely, save_to_temp_csv
from ..utils.abort_handler import abort_handler, check_abort, with_abort_check

logging.basicConfig(level=logging.DEBUG)
perturbation = Perturbation()


def process_test_robust(file_path, shot_type, template, num, completion=None, test_id=None):
    """
    Process test data with robust perturbations and support for abortion.
    This function now updates progress at several key stages so that the status endpoint 
    (or in-memory test status) can be updated frequently while the backend is busy.
    """
    try:
        if test_id and test_id not in abort_handler.active_tests:
            abort_handler.register_test(test_id)

        if completion is None:
            completion = create_completion()

        # Step 1: Read input CSV and update progress.
        df = read_csv_safely(file_path)
        logging.info(f"Successfully read file with {len(df)} rows")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "CSV file read"

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after reading file")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # Step 2: Apply perturbations from the input data.
        result_df = perturbation.process_questions(
            df, question_column="Question", expected_answer_column="Expected_answer", num=num)
        logging.info(f"Perturbations applied; generated {len(result_df)} rows")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Perturbations applied"

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after perturbation")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # Step 3: Merge additional columns and save a CSV (update progress).
        columns_to_merge = df.drop(
            columns=["Question", "Expected_answer"], errors='ignore')
        merged_result_df = result_df.merge(
            columns_to_merge, left_on="Original_Question_Index", right_index=True, how="left"
        )
        expected_columns = ["Original_Question_Index", "Original_Question",
                            "Perturbation", "Perturbed_Question", "Expected_Answer"]
        logging.info(
            f"Merged CSV columns before reordering: {merged_result_df.columns.tolist()}")
        # Apply fallback keys if needed:
        for key, fallback in [
            ("Original_Question", "original_prompt"),
            ("Expected_Answer", "expected_result"),
            ("Perturbation", "perturb_type"),
            ("Perturbed_Question", "perturb_prompt")
        ]:
            if key not in merged_result_df.columns:
                logging.info(
                    f"Key '{key}' missing, using fallback '{fallback}'.")
                merged_result_df[key] = merged_result_df[fallback]

        for col in ["Original_Question_Index"] + expected_columns[1:]:
            if col not in merged_result_df.columns:
                logging.warning(f"Required column '{col}' missing")
        
        output_file_path = "merged_perturbation_results.csv"
        merged_result_df.to_csv(output_file_path, index=False)
        logging.info("Merged results CSV saved.")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Merged CSV saved"

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after saving merged results")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        # Step 4: Format robust data using the chosen template.
        if template == 'std':
            robust_formatter = ShotTemplateFormatter(output_file_path)
        elif template == 'icqa':
            robust_formatter = ICQATemplateFormatter(output_file_path)
        else:
            raise ValueError("Invalid template type")
        robust_formatted_data = robust_formatter.format_all_rows(
            shot_type=shot_type, perturb_type='robust')
        logging.info("Robust data formatted using the selected template.")
        if test_id:
            abort_handler.active_tests[test_id]["progress"] = "Data formatted"
        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after formatting data")
            return {"index_scores": {}, "robust_results": [], "aborted": True}

        robust_formatter.save_formatted_data_to_csv(
            robust_formatted_data, 'robust_new_formatted_one_shot.csv')
        robust_formatted_data = pd.DataFrame(robust_formatted_data)
        logging.info(
            f"Formatted robust data loaded; columns: {robust_formatted_data.columns.tolist()}")

        # Step 5: Process each unique question index concurrently and update progress.
        unique_indices = robust_formatted_data['Original_Question_Index'].unique(
        )
        index_scores = {}
        detailed_results = []

        def process_index(original_index):
            if test_id and check_abort(test_id):
                logging.info(
                    f"Test {test_id} aborted during processing index {original_index}")
                return None

            logging.info(
                f"Processing test for Original_Question_Index {original_index}...")
            if test_id:
                abort_handler.active_tests[test_id][
                    "progress"] = f"Testing index {original_index}"

            subset = robust_formatted_data[robust_formatted_data['Original_Question_Index'] == original_index]
            local_test_suite = TestSuite()
            for _, row in subset.iterrows():
                # Use fallback keys for constructing Test if needed.
                prompt = row.get("Original_Question") or row.get(
                    "original_prompt")
                expected_result = row.get(
                    "Expected_Answer") or row.get("expected_result")
                perturb_method = row.get(
                    "Perturbation") or row.get("perturb_type")
                perturb_text = row.get(
                    "Perturbed_Question") or row.get("perturb_prompt")
                if not prompt or not expected_result:
                    logging.warning(
                        f"Skipping row {row.name} due to missing prompt or expected result.")
                    continue
                test = Test(
                    name=f"Test robust #{row.name + 1}",
                    prompt=prompt,
                    expected_result=expected_result,
                    description="A test with robust perturbation",
                    perturb_method=perturb_method,
                    test_type=perturb_method,
                    perturb_text=perturb_text,
                )
                local_test_suite.add_test(test)

            # Run the tests for this index.
            local_test_suite.run_all(completion)
            results, summary = local_test_suite.summarize()
            total_tests, failures = summary['total_tests'], summary['failures']
            score = (total_tests - failures) / total_tests * \
                100 if total_tests > 0 else 0

            return {
                "Original_Question_Index": original_index,
                "score": score,
                "summary": summary,
                "results": results
            }

        # Run processing concurrently using a ThreadPoolExecutor.
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_index = {executor.submit(
                process_index, idx): idx for idx in unique_indices}
            for future in concurrent.futures.as_completed(future_to_index):
                res = future.result()
                if res is not None:
                    idx = res["Original_Question_Index"]
                    index_scores[idx] = res["score"]
                    detailed_results.append(res)
                if test_id and check_abort(test_id):
                    logging.info(
                        f"Test {test_id} aborted during concurrent processing")
                    break

        if test_id:
            abort_handler.complete_test(test_id)

        logging.info("Robust test processing completed.")
        return {"index_scores": index_scores, "robust_results": detailed_results}

    except Exception as e:
        logging.error(f"Error processing file: {str(e)}", exc_info=True)
        if test_id:
            abort_handler.complete_test(test_id)
        return {"index_scores": {}, "robust_results": [], "error": str(e)}


def process_test(file_path, shot_type, template, perturbation_types, completion=None, test_id=None):
    """
    Process the input file, apply multiple perturbation types, and run tests.
    Always reads file as CSV for maximum compatibility, matching process_test_robust behavior.
    """
    try:
        if test_id and test_id not in abort_handler.active_tests:
            abort_handler.register_test(test_id)

        if completion is None:
            completion = create_completion()

        checkpoints = {"read_file": False,
                       "save_csv": False, "format_data": False}

        df = read_csv_safely(file_path)
        logging.info(f"Successfully read file with {len(df)} rows")
        checkpoints["read_file"] = True

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after reading file")
            return [], {"aborted": True}

        temp_csv = save_to_temp_csv(df, prefix="input_data_", suffix=".csv")
        logging.info(f"Saved clean CSV to: {temp_csv}")
        checkpoints["save_csv"] = True

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after saving CSV")
            return [], {"aborted": True}

        if template == 'std':
            from ..Backend_v1.PromptOps.std_templates import ShotTemplateFormatter

            class CSVShotTemplateFormatter(ShotTemplateFormatter):
                def load_data(self):
                    return pd.read_csv(self.filepath)
            formatter = CSVShotTemplateFormatter(temp_csv)
        elif template == 'icqa':
            from ..Backend_v1.PromptOps.icqa_templates import ICQATemplateFormatter

            class CSVICQATemplateFormatter(ICQATemplateFormatter):
                def load_data(self):
                    return pd.read_csv(self.filepath)
            formatter = CSVICQATemplateFormatter(temp_csv)
        else:
            raise ValueError(f"Invalid template type: {template}")

        if test_id and check_abort(test_id):
            logging.info(f"Test {test_id} aborted after creating formatter")
            return [], {"aborted": True}

        csv_files = []
        for perturb_type in perturbation_types:
            if test_id:
                active_test = abort_handler.active_tests.get(test_id)
                if active_test:
                    active_test["progress"] = f"Formatting data for {perturb_type}"

            formatted_data = formatter.format_all_rows(
                shot_type=shot_type, perturb_type=perturb_type)

            if test_id and check_abort(test_id):
                logging.info(
                    f"Test {test_id} aborted after formatting data for {perturb_type}")
                return [], {"aborted": True}

            output_file = f"formatted_{perturb_type}_output.csv"
            formatter.save_formatted_data_to_csv(formatted_data, output_file)
            csv_files.append((perturb_type, output_file))

        checkpoints["format_data"] = True

        test_suite = TestSuite()
        tests_added = 0

        for perturb_type, path_to_csv in csv_files:
            if test_id:
                active_test = abort_handler.active_tests.get(test_id)
                if active_test:
                    active_test["progress"] = f"Adding tests for {perturb_type}"

            csv_df = pd.read_csv(path_to_csv)

            for index, row in csv_df.iterrows():
                if tests_added % 10 == 0 and test_id and check_abort(test_id):
                    logging.info(
                        f"Test {test_id} aborted during test setup after adding {tests_added} tests")
                    break

                test = Test(
                    name=f"Test {perturb_type} #{index + 1}",
                    prompt=row["original_prompt"],
                    expected_result=row["expected_result"],
                    description=f"A test with {perturb_type} perturbation",
                    perturb_method=perturb_type,
                    test_type=perturb_type,
                    perturb_text=row["perturb_prompt"],
                )
                test_suite.add_test(test)
                tests_added += 1

            if test_id and check_abort(test_id):
                break

        if tests_added > 0:
            if test_id:
                active_test = abort_handler.active_tests.get(test_id)
                if active_test:
                    active_test["progress"] = f"Running {tests_added} tests concurrently"
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(test.run, completion)
                           for test in test_suite.tests]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        future.result()
                    except Exception as e:
                        logging.error(
                            f"Error in concurrent test execution: {e}")
                    if test_id and check_abort(test_id):
                        logging.info(
                            f"Test {test_id} aborted during test execution")
                        break

            if test_id and check_abort(test_id):
                logging.info(f"Test {test_id} aborted after executing tests")
                try:
                    results, summary = test_suite.summarize()
                    summary["aborted"] = True
                    return results, summary
                except Exception as e:
                    logging.error(f"Error getting partial results: {e}")
                    return [], {"error": "Aborted during test execution", "aborted": True}

            results, summary = test_suite.summarize()
        else:
            results, summary = [], {
                "total_tests": 0, "failures": 0, "passes": 0}
            if test_id and check_abort(test_id):
                summary["aborted"] = True

        test_suite.clear()

        if test_id:
            abort_handler.complete_test(test_id)

        return results, summary

    except Exception as e:
        logging.error(f"Error processing file: {str(e)}", exc_info=True)
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
