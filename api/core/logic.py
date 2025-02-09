import numpy as np
import logging
import pandas as pd
import json

from ..Backend_v1.PromptOps.perturb import Perturbation
from ..Backend_v1.PromptOps.std_templates import ShotTemplateFormatter
from ..Backend_v1.PromptOps.icqa_templates import ICQATemplateFormatter
from ..Backend_v1.PromptOps.cot_templates import COTTemplateFormatter
from ..Backend_v1.PromptOps.test import PromptCompletion, Test
from ..Backend_v1.PromptOps.test_suite import TestSuite

# ------------------ Initialize LLM + Perturbation ------------------ #
logging.basicConfig(level=logging.DEBUG)

completion = PromptCompletion(
    model_provider="llama",
    model="llama-13b",
    system_content="You are an assistant that answers questions",
    temperature=0.5,
    top_p=0.9,
    max_tokens=150,
    llama_url="http://127.0.0.1:8000/v1/chat/completions"
)

perturbation = Perturbation()

# ------------------ Original Logic Snippet ------------------ #


def convert_numpy_types(data):
    if isinstance(data, dict):
        return {key: convert_numpy_types(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_numpy_types(item) for item in data]
    elif isinstance(data, (np.integer, np.int64, np.int32)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64, np.float32)):
        return float(data)
    else:
        return data


def process_test_robust(file_path, shot_type, template):
    """
    Process the input CSV file, run robust tests on the data, and return index scores/detailed results.

    Args:
        file_path (str): Path to the input CSV file.
        shot_type (str): Type of shot ('zero', 'one', 'few').
        template (str): Prompt template ('std', 'icqa', or 'cot').

    Returns:
        (dict, list): (index_scores, detailed_results)
    """
    df = pd.read_csv(file_path)

    # 1. Process questions with perturbations
    result_df = perturbation.process_questions(
        df, question_column="Question", expected_answer_column="Expected_answer"
    )
    columns_to_merge = df.drop(columns=["Question", "Expected_answer"])
    merged_result_df = result_df.merge(
        columns_to_merge,
        left_on="Original_Question_Index",
        right_index=True,
        how="left"
    )

    # 2. Rearrange column order
    column_order = (
        ["Original_Question_Index"]
        + list(columns_to_merge.columns)
        + ["Original_Question", "Perturbation",
            "Perturbed_Question", "Expected_Answer"]
    )
    merged_result_df = merged_result_df[column_order]

    # 3. Save intermediate results
    output_file_path = "merged_perturbation_results.csv"
    merged_result_df.to_csv(output_file_path, index=False)

    # 4. Select template formatter
    if template == 'std':
        robust_formatter = ShotTemplateFormatter(output_file_path)
    elif template == 'icqa':
        robust_formatter = ICQATemplateFormatter(output_file_path)
    elif template == 'cot':
        robust_formatter = COTTemplateFormatter(output_file_path)

    # 5. Format data for testing
    robust_formatted_data = robust_formatter.format_all_rows(
        shot_type=shot_type,
        perturb_type='robust'
    )
    robust_formatter.save_formatted_data_to_csv(
        robust_formatted_data, 'robust_new_formatted_one_shot.csv'
    )
    robust_formatted_data = pd.DataFrame(robust_formatted_data)

    # 6. Initialize TestSuite
    test_suite = TestSuite()
    index_scores = {}
    detailed_results = []  # Store detailed results for each Original_Question_Index

    # 7. Run tests per Original_Question_Index
    for original_index in robust_formatted_data['Original_Question_Index'].unique():
        print(f"Running [Original_Question_Index {original_index}] test...")

        subset = robust_formatted_data[robust_formatted_data['Original_Question_Index'] == original_index]
        index_result = {"Original_Question_Index": original_index, "tests": []}

        for _, row in subset.iterrows():
            test = Test(
                name=f"Test robust #{row.name + 1}",
                prompt=row["original_prompt"],
                expected_result=row["expected_result"],
                description="A test with robust perturbation",
                perturb_method=row["perturb_type"],
                test_type=row["perturb_type"],
                perturb_text=row["perturb_prompt"],
            )
            test_suite.add_test(test)

        test_suite.run_all(completion)
        results, summary = test_suite.summarize()
        total_tests = summary['total_tests']
        failures = summary['failures']
        score = (total_tests - failures) / total_tests * 100

        index_scores[int(original_index)] = score
        index_result["score"] = score
        index_result["summary"] = summary
        index_result["results"] = results
        detailed_results.append(index_result)

        # Clear tests for the next index
        test_suite.clear()

    result = {
        "index_scores": index_scores,
        "robust_results": detailed_results
    }

    return convert_numpy_types(result)


def process_test(file_path, shot_type, template, perturbation_types):
    """
    Process the input CSV file, apply multiple perturbation types, and run tests.

    Args:
        file_path (str): Path to the input CSV file.
        shot_type (str): Type of shot ('zero', 'one', 'few').
        template (str): Prompt template ('std', 'icqa', or 'cot').
        perturbation_types (list[str]): List of perturbation types to apply.

    Returns:
        (list, dict): (results, summary) from the TestSuite
    """
    # 1. Select the appropriate template formatter
    if template == 'std':
        formatter = ShotTemplateFormatter(file_path)
    elif template == 'icqa':
        formatter = ICQATemplateFormatter(file_path)
    elif template == 'cot':
        formatter = COTTemplateFormatter(file_path)

    # 2. For each perturbation, create a formatted CSV
    csv_files = []
    for perturb_type in perturbation_types:
        formatted_data = formatter.format_all_rows(
            shot_type=shot_type,
            perturb_type=perturb_type
        )
        output_file = f"formatted_{perturb_type}_output.csv"

        formatter.save_formatted_data_to_csv(formatted_data, output_file)
        csv_files.append((perturb_type, output_file))

    # 3. Run all tests in a single TestSuite
    test_suite = TestSuite()

    for perturb_type, path_to_csv in csv_files:
        df = pd.read_csv(path_to_csv)

        for index, row in df.iterrows():
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

    # 4. Execute all tests, summarize, and export results
    test_suite.run_all(completion)
    results, summary = test_suite.summarize()

    test_suite.export_results(
        "test_results.csv", file_format="csv", overwrite=True)
    test_suite.export_results(
        "test_results.xlsx", file_format="xlsx", overwrite=True)
    test_suite.export_results(
        "test_results.json", file_format="json", overwrite=True)

    test_suite.clear()
    return results, summary


def process_score(index_scores, summary):
    # Initialize counters
    overall_total_tests = 0
    overall_failures = 0

    # Threshold for failure
    threshold = 0.7

    # Process index scores
    for index, score in index_scores.items():
        overall_total_tests += 1  # Each index counts as one test
        if score < threshold * 100:  # Convert threshold to percentage
            overall_failures += 1

    # Add results from the summary for total tests and failures
    overall_total_tests += summary.get('total_tests', 0)
    overall_failures += summary.get('failures', 0)

    # Avoid division by zero
    if overall_total_tests == 0:
        overall_failure_rate = 0
        overall_pass_rate = 0
    else:
        # Calculate overall failure and pass rates
        overall_failure_rate = (overall_failures / overall_total_tests) * 100
        overall_pass_rate = (
            (overall_total_tests - overall_failures) / overall_total_tests) * 100

    # Prepare JSON response
    result = {
        "overall_total_tests": overall_total_tests,
        "overall_failures": overall_failures,
        "overall_failure_rate": overall_failure_rate,
        "overall_pass": overall_total_tests - overall_failures,
        "overall_pass_rate": overall_pass_rate
    }

    return json.dumps(result, indent=4)  # Convert dictionary to JSON format


def calculate_performance_score(detailed_scores, results):

    # Ensure the inputs are not None and provide defaults if missing
    if detailed_scores is None:
        detailed_scores = []
    if results is None:
        results = []

    # Extract all score values
    all_scores = []
    for score in detailed_scores:
        for result in score.get("results", []):
            all_scores.append(result.get("score_original", 0))

    all_scores += [result.get("score_original", 0) for result in results]

    if len(all_scores) == 0:
        overall_performance_score = 0
    else:
        overall_performance_score = sum(all_scores) / len(all_scores)

    # Group scores by perturbation type
    perturbation_scores = {}
    for result in results:
        test_type = result.get("test_type") or result["name"].split("#")[
            0].strip().lower()
        perturbation_scores.setdefault(test_type, []).append(
            result.get("score_original", 0))

    # Add robust scores from detailed scores
    perturbation_scores.setdefault("robust", [])
    for score in detailed_scores:
        perturbation_scores["robust"].append(score.get("score", 0))

    # Calculate average scores for each perturbation type
    perturbation_averages = {}
    for perturbation, scores in perturbation_scores.items():
        if len(scores) == 0:
            perturbation_averages[perturbation] = 0
        else:
            perturbation_averages[perturbation] = sum(scores) / len(scores)

    return json.dumps(
        {
            "overall_performance_score": overall_performance_score,
            **perturbation_averages,
        },
        indent=4,
    )
