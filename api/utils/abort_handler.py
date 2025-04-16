# utils/abort_handler.py

import time
import threading
import uuid
import logging
from typing import Dict, Any, Callable, Optional

logger = logging.getLogger(__name__)


class AbortHandler:
    """
    Utility class to manage active tests and handle aborts.
    This is designed to be a singleton across the FastAPI application.
    """

    def __init__(self):
        self.active_tests: Dict[str, Dict[str, Any]] = {}
        self.cleanup_lock = threading.Lock()
        self._start_cleanup_thread()

    def register_test(self, test_id: Optional[str] = None) -> str:
        """
        Register a new test in the abort handler.

        Args:
            test_id: Optional test ID. If None, a new ID will be generated.

        Returns:
            The test ID
        """
        if test_id is None:
            test_id = f"test-{time.time()}-{uuid.uuid4().hex[:8]}"

        self.active_tests[test_id] = {
            "aborted": False,
            "started_at": time.time(),
            "last_activity": time.time()
        }

        logger.info(
            f"Registered test {test_id}, active tests: {len(self.active_tests)}")
        return test_id

    def is_aborted(self, test_id: str) -> bool:
        """
        Check if a test has been marked as aborted.

        Args:
            test_id: The test ID to check

        Returns:
            True if the test has been aborted, False otherwise
        """
        if test_id not in self.active_tests:
            return False

        # Update last activity time
        self.active_tests[test_id]["last_activity"] = time.time()
        return self.active_tests[test_id]["aborted"]

    def abort_test(self, test_id: str) -> bool:
        """
        Mark a test as aborted.

        Args:
            test_id: The test ID to abort

        Returns:
            True if the test was found and aborted, False otherwise
        """
        if test_id not in self.active_tests:
            logger.warning(f"Abort request for unknown test: {test_id}")
            return False

        self.active_tests[test_id]["aborted"] = True
        logger.info(f"Marked test {test_id} as aborted")
        return True

    def complete_test(self, test_id: str):
        """
        Mark a test as completed and remove it from the active tests.

        Args:
            test_id: The test ID to complete
        """
        if test_id in self.active_tests:
            with self.cleanup_lock:
                logger.info(f"Completing test {test_id}")
                self.active_tests.pop(test_id, None)

    def cleanup_old_tests(self, max_age_hours: float = 6.0):
        """
        Remove tests that have been inactive for too long.

        Args:
            max_age_hours: Maximum age in hours for inactive tests
        """
        try:
            with self.cleanup_lock:
                now = time.time()
                max_age_seconds = max_age_hours * 60 * 60

                tests_to_remove = []
                for test_id, test_info in self.active_tests.items():
                    last_activity = test_info.get(
                        "last_activity", test_info.get("started_at", 0))
                    age = now - last_activity

                    if age > max_age_seconds:
                        tests_to_remove.append(test_id)

                for test_id in tests_to_remove:
                    logger.info(f"Cleaning up inactive test: {test_id}")
                    self.active_tests.pop(test_id, None)

                if tests_to_remove:
                    logger.info(
                        f"Cleaned up {len(tests_to_remove)} inactive tests")
        except Exception as e:
            logger.error(f"Error in cleanup: {e}")

    def _start_cleanup_thread(self):
        """Start a background thread to periodically clean up old tests"""
        def cleanup_worker():
            while True:
                time.sleep(3600)  # Run every hour
                try:
                    self.cleanup_old_tests()
                except Exception as e:
                    logger.error(f"Error in cleanup thread: {e}")

        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()


# Create a singleton instance
abort_handler = AbortHandler()


def check_abort(test_id: str, interval: int = 10) -> bool:
    """
    Check if a test should be aborted. This should be called periodically
    during long-running tests to allow for clean abortion.

    Args:
        test_id: The test ID to check
        interval: How often this function is called (for logging)

    Returns:
        True if the test should abort, False to continue
    """
    if abort_handler.is_aborted(test_id):
        logger.info(f"Test {test_id} abort detected during processing")
        return True
    return False


def with_abort_check(test_id: str):
    """
    Decorator to add abort checking to functions

    Usage:
    @with_abort_check("my-test-id")
    def my_long_function():
        # This function will check for aborts periodically
        pass
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Register with abort handler if not already registered
            if test_id not in abort_handler.active_tests:
                abort_handler.register_test(test_id)

            # Check for abort before starting
            if abort_handler.is_aborted(test_id):
                logger.info(
                    f"Test {test_id} already aborted before starting function")
                return None

            # Run the function with periodic abort checks
            try:
                result = func(*args, **kwargs)

                # Mark as completed if no error occurred
                abort_handler.complete_test(test_id)
                return result
            except Exception as e:
                logger.error(f"Error in function with abort checking: {e}")
                # Still mark as completed on error
                abort_handler.complete_test(test_id)
                raise

        return wrapper

    return decorator
