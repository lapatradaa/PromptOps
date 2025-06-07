# api/services/test_status_manager.py

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

import redis.asyncio as redis

from api.config import Settings

logger = logging.getLogger(__name__)


class TestStatus(str, Enum):
    INITIALIZING = "initializing"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"
    ABORTED = "aborted"
    NOT_FOUND = "not_found"


@dataclass
class TestInfo:
    test_id: str
    project_id: str
    user_id: str
    status: TestStatus
    progress: str
    error: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    runtime_seconds: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["status"] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TestInfo":
        if "status" in data:
            data["status"] = TestStatus(data["status"])
        return cls(**data)


class TestStatusManager:
    """
    Lazily creates a Redis connection (and PubSub) inside
    the *current* event loop, and auto-rebinds when the loop changes.
    """

    def __init__(self, redis_url: str):
        self._redis_url = redis_url
        self._redis: Optional[redis.Redis] = None
        self._pubsub: Optional[redis.client.PubSub] = None
        self._local_cache: Dict[str, TestInfo] = {}
        # no lock yet
        self._lock: Optional[asyncio.Lock] = None

    def _get_lock(self) -> asyncio.Lock:
        loop = asyncio.get_running_loop()
        # if uninitialized or bound to a different loop, (re)create it
        if self._lock is None or getattr(self._lock, "_loop", None) is not loop:
            self._lock = asyncio.Lock()
        return self._lock

    def reset(self):
        """
        Clear any loop-bound clients & locks so that the next use
        will re-create them on whichever loop is active.
        """
        self._redis = None
        self._pubsub = None
        self._lock = None
        self._local_cache.clear()

    # ---------- lazy resources ----------

    def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(
                self._redis_url, decode_responses=True
            )
        return self._redis

    def _get_pubsub(self) -> redis.client.PubSub:
        if self._pubsub is None:
            self._pubsub = self._get_redis().pubsub()
        return self._pubsub

    # ---------- public API ----------

    async def create_test(
        self, test_id: str, project_id: str, user_id: str
    ) -> TestInfo:
        async with self._get_lock():
            test_info = TestInfo(
                test_id=test_id,
                project_id=project_id,
                user_id=user_id,
                status=TestStatus.INITIALIZING,
                progress="Test created",
                started_at=datetime.now().timestamp(),
            )
            await self._store_in_redis(test_info)
            self._local_cache[test_id] = test_info
            await self._publish_status_update(test_info)
            logger.info("Created test %s", test_id)
            return test_info

    async def update_status(
        self,
        test_id: str,
        status: TestStatus,
        progress: Optional[str] = None,
        error: Optional[str] = None,
        results: Optional[Dict[str, Any]] = None,
    ) -> bool:
        async with self._get_lock():
            test_info = await self.get_test(test_id)
            if not test_info:
                logger.warning("Test %s not found for update", test_id)
                return False

            test_info.status = status
            if progress:
                test_info.progress = progress
            if error:
                test_info.error = error
            if results:
                test_info.results = results

            now = datetime.now().timestamp()
            if status in (TestStatus.COMPLETED, TestStatus.ERROR, TestStatus.ABORTED):
                test_info.completed_at = now
                if test_info.started_at:
                    test_info.runtime_seconds = now - test_info.started_at

            await self._store_in_redis(test_info)
            self._local_cache[test_id] = test_info
            await self._publish_status_update(test_info)
            logger.info("Updated test %s → %s", test_id, status.value)
            return True

    async def get_test(self, test_id: str) -> Optional[TestInfo]:
        if test_id in self._local_cache:
            return self._local_cache[test_id]

        data = await self._get_from_redis(test_id)
        if data:
            info = TestInfo.from_dict(data)
            self._local_cache[test_id] = info
            return info
        return None

    async def subscribe_to_test(self, test_id: str, callback):
        channel = f"test_status:{test_id}"

        async def handler(message):
            if message["type"] == "message":
                await callback(TestInfo.from_dict(json.loads(message["data"])))

        await self._get_pubsub().subscribe(**{channel: handler})
        logger.info("Subscribed to %s", channel)

    async def cleanup_old_tests(self, max_age_seconds: int = 86_400):
        now = datetime.now().timestamp()
        removed = 0
        async with self._get_lock():
            for tid, info in list(self._local_cache.items()):
                if info.completed_at and now - info.completed_at > max_age_seconds:
                    del self._local_cache[tid]
                    removed += 1
        logger.info("Cleaned %d old tests from cache", removed)

    # ---------- internal helpers ----------

    async def _store_in_redis(self, info: TestInfo):
        r = self._get_redis()
        key = f"test:{info.test_id}"
        await r.set(key, json.dumps(info.to_dict()))
        if info.status in (TestStatus.COMPLETED, TestStatus.ERROR, TestStatus.ABORTED):
            await r.expire(key, 86_400)

    async def _get_from_redis(self, test_id: str) -> Optional[Dict[str, Any]]:
        data = await self._get_redis().get(f"test:{test_id}")
        return json.loads(data) if data else None

    async def _publish_status_update(self, info: TestInfo):
        await self._get_redis().publish(
            f"test_status:{info.test_id}", json.dumps(info.to_dict())
        )


# ---------------- singleton ----------------
test_status_manager = TestStatusManager(Settings().REDIS_URL)
