# api/Backend_v1/PromptOps/test_suite.py
import concurrent.futures
import logging
import os
import pickle
import time
import random
from typing import List, Dict, Any, Tuple
import pandas as pd
import json

logger = logging.getLogger(__name__)


class TestSuite:
    def __init__(self, max_workers: int = 5, test_id: str = None):
        self.tests: List[Any] = []
        self.max_workers = max_workers
        self.test_id = test_id
        self.aborted = False

    def add_test(self, test: Any):
        self.tests.append(test)
        logger.info(
            f"Added test: {test.name}. Total tests now: {len(self.tests)}")

    def add_tests(self, tests: List[Any]):
        for test in tests:
            self.add_test(test)

    def clear(self):
        logger.info(f"Clearing {len(self.tests)} tests from the suite.")
        self.tests = []

    def run_all(self, completion_model: Any, abort_check_fn=None):
        if not self.tests:
            logger.warning("No tests to run in the suite.")
            return
        start_time = time.time()
        total_tests = len(self.tests)
        completed_tests = 0

        # We assume all tests use the same provider from completion_model.
        provider = getattr(
            completion_model, 'model_provider', 'default').lower()

        logger.info(
            f"Starting test suite with {total_tests} tests for provider: {provider}")

        # Set concurrency based on provider
        provider_concurrency = self.max_workers
        if provider in ('openai', 'claude'):
            provider_concurrency = min(3, self.max_workers)
        elif provider in ('gemini', 'typhoon'):
            provider_concurrency = min(4, self.max_workers)
        logger.info(
            f"Using concurrency level of {provider_concurrency} for provider {provider}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=provider_concurrency) as executor:
            futures = {executor.submit(
                test.run, completion_model): test for test in self.tests}
            for future in concurrent.futures.as_completed(futures):
                test = futures[future]
                completed_tests += 1
                try:
                    future.result()
                except Exception as e:
                    logger.error(f"Error executing test {test.name}: {str(e)}")
                    test.error = str(e)
                if abort_check_fn and abort_check_fn():
                    logger.warning(
                        f"Aborting test suite execution after {completed_tests}/{total_tests} tests")
                    self.aborted = True
                    for f in futures:
                        if not f.done():
                            f.cancel()
                    break
                if (completed_tests % 10 == 0) or (completed_tests == total_tests) or (completed_tests == 1):
                    elapsed = time.time() - start_time
                    avg_time = elapsed / completed_tests if completed_tests > 0 else 0
                    remaining = (total_tests - completed_tests) * avg_time
                    logger.info(
                        f"Completed {completed_tests}/{total_tests} tests. Elapsed: {elapsed:.1f}s, Est. remaining: {remaining:.1f}s")
                    if completed_tests % (provider_concurrency * 2) == 0:
                        delay = random.uniform(0.5, 2.0)
                        logger.debug(
                            f"Adding small delay of {delay:.2f}s between batches")
                        time.sleep(delay)
        if self.aborted:
            logger.warning("Test suite execution aborted.")
        duration = time.time() - start_time
        logger.info(
            f"Test suite execution completed in {duration:.2f}s. Processed {completed_tests}/{total_tests} tests.")

    def summarize(self) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        results = [test.summarize() for test in self.tests]
        total_tests = len(results)
        failures = sum(1 for r in results if r.get('fail', False))
        passes = total_tests - failures
        summary = {
            "total_tests": total_tests,
            "failures": failures,
            "passes": passes,
            "pass_rate": (passes / total_tests) * 100 if total_tests > 0 else 0
        }
        if self.aborted:
            summary["aborted"] = True
        if self.test_id:
            summary["test_id"] = self.test_id

        # Group results by test_type
        test_types: Dict[str, Dict[str, Any]] = {}
        for result in results:
            test_type = result.get('test_type', 'unknown')
            if test_type not in test_types:
                test_types[test_type] = {
                    "total": 0, "failures": 0, "passes": 0}
            test_types[test_type]["total"] += 1
            if result.get('fail', False):
                test_types[test_type]["failures"] += 1
            else:
                test_types[test_type]["passes"] += 1

        for t, counts in test_types.items():
            if counts["total"] > 0:
                counts["pass_rate"] = (
                    counts["passes"] / counts["total"]) * 100
            else:
                counts["pass_rate"] = 0
        summary["by_test_type"] = test_types

        logger.info(f"Summarized test suite: {json.dumps(summary)}")
        return results, summary

    def export_results(self, filename: str, file_format: str = 'csv', overwrite: bool = False):
        if not overwrite and os.path.exists(filename):
            print(
                f"File {filename} already exists. Set overwrite=True to overwrite the file.")
            return
        results, _ = self.summarize()
        df = pd.DataFrame(results)
        if file_format == 'csv':
            df.to_csv(filename, index=False)
        elif file_format == 'xlsx':
            df.to_excel(filename, index=False)
        elif file_format == 'json':
            with open(filename, 'w') as json_file:
                json.dump(results, json_file, indent=4)
        else:
            print(f"Unsupported file format: {file_format}")

    def save(self, filename: str, overwrite: bool = False):
        if not overwrite and os.path.exists(filename):
            print(
                f"File {filename} already exists. Set overwrite=True to overwrite the file.")
            return
        with open(filename, 'wb') as f:
            pickle.dump(self, f)

    @staticmethod
    def load(filename: str):
        with open(filename, 'rb') as f:
            return pickle.load(f)
