# api/services/test_executor.py

import concurrent.futures
import pandas as pd
import logging
from typing import Any, Dict, List, Optional, Tuple

from ..PromptOps.test_suite import TestSuite
from ..PromptOps.test import Test
from ..utils.abort_handler import abort_handler, check_abort

logger = logging.getLogger(__name__)


class TestExecutor:
    """
    Encapsulates test‐suite construction, concurrent execution, and summarization
    for both robust and non‐robust (basic) tests.
    """

    def __init__(
        self,
        completion_model: Any,
        test_id: Optional[str] = None,
        max_workers: int = 5
    ):
        self.completion_model = completion_model
        self.test_id = test_id
        self.max_workers = max_workers

    def run_robust(
        self,
        robust_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Process a DataFrame of robust‐perturbed rows and return:
          {
            "index_scores": { idx: score, … },
            "robust_results": [ {Original_Question_Index, score, summary, results}, … ]
          }
        """
        unique_indices = robust_df['Original_Question_Index'].unique()
        index_scores: Dict[int, float] = {}
        detailed_results: List[Dict[str, Any]] = []

        def _process_index(idx: int) -> Optional[Dict[str, Any]]:
            # Abort check
            if self.test_id and check_abort(self.test_id):
                logger.info(f"Test {self.test_id} aborted before index {idx}")
                return None

            # Update progress
            if self.test_id:
                abort_handler.active_tests[self.test_id][
                    "progress"] = f"Testing index {idx}"

            # Build a suite just for this index
            subset = robust_df[robust_df['Original_Question_Index'] == idx]
            suite = TestSuite()
            for _, row in subset.iterrows():
                prompt = row.get("Original_Question") or row.get(
                    "original_prompt")
                expected = row.get("Expected_Answer") or row.get(
                    "expected_result")
                perturb = row.get("Perturbation") or row.get("perturb_type")
                pert_text = row.get("Perturbed_Question") or row.get(
                    "perturb_prompt")
                if not prompt or not expected:
                    continue
                test = Test(
                    name=f"Test robust #{row.name+1}",
                    prompt=prompt,
                    expected_result=expected,
                    description="A test with robust perturbation",
                    perturb_method=perturb,
                    test_type=perturb,
                    perturb_text=pert_text
                )
                suite.add_test(test)

            # Run & summarize
            suite.run_all(self.completion_model,
                          abort_check_fn=lambda: check_abort(self.test_id))
            results, summary = suite.summarize()
            total = summary.get("total_tests", 0)
            fails = summary.get("failures", 0)
            score = (total - fails) / total * 100 if total > 0 else 0

            return {
                "Original_Question_Index": idx,
                "score": score,
                "summary": summary,
                "results": results
            }

        # Execute in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as execr:
            futures = {execr.submit(_process_index, idx)
                                    : idx for idx in unique_indices}
            for future in concurrent.futures.as_completed(futures):
                res = future.result()
                if res:
                    i = res["Original_Question_Index"]
                    index_scores[i] = res["score"]
                    detailed_results.append(res)
                if self.test_id and check_abort(self.test_id):
                    logger.info(
                        f"Test {self.test_id} aborted during robust execution")
                    break

        # Finalize
        if self.test_id:
            abort_handler.complete_test(self.test_id)

        return {
            "index_scores": index_scores,
            "robust_results": detailed_results
        }

    def run_basic(
        self,
        csv_files: List[Tuple[str, str]]
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Process non-robust tests given a list of (perturb_type, filepath).
        Returns (results_list, summary_dict).
        """
        suite = TestSuite()
        for perturb_type, path in csv_files:
            # Abort check
            if self.test_id and check_abort(self.test_id):
                logger.info(
                    f"Test {self.test_id} aborted before adding tests for {perturb_type}")
                return [], {"aborted": True}

            # Update progress
            if self.test_id:
                abort_handler.active_tests[self.test_id][
                    "progress"] = f"Adding tests for {perturb_type}"

            df = pd.read_csv(path)
            for idx, row in df.iterrows():
                test = Test(
                    name=f"Test {perturb_type} #{idx+1}",
                    prompt=row["original_prompt"],
                    expected_result=row["expected_result"],
                    description=f"A test with {perturb_type} perturbation",
                    perturb_method=perturb_type,
                    test_type=perturb_type,
                    perturb_text=row["perturb_prompt"]
                )
                suite.add_test(test)

        # Execute all
        if suite.tests:
            suite.run_all(self.completion_model,
                          abort_check_fn=lambda: check_abort(self.test_id))
            results, summary = suite.summarize()
        else:
            results, summary = [], {
                "total_tests": 0, "failures": 0, "passes": 0}

        # Finalize
        if self.test_id:
            abort_handler.complete_test(self.test_id)

        return results, summary
