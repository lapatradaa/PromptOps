# api/config.py
from environs import Env
from pathlib import Path
import api.utils.nltk_setup as _

# point at your .env
env_path = Path(__file__).parent / ".env"

env = Env()
env.read_env(env_path)    # load from .env


class Settings:
    # API Configuration
    API_KEY = env.str("API_KEY", default="")
    ALLOWED_ORIGINS = env.list("ALLOWED_ORIGINS",
                               subcast=str,
                               default=["http://localhost:3000"])
    LOG_LEVEL = env.str("LOG_LEVEL", default="INFO")
    HTTPS_REDIRECT = env.bool("HTTPS_REDIRECT", default=False)

    # Redis Configuration
    REDIS_URL = env.str("REDIS_URL", default="redis://localhost:6379")

    # Celery Configuration
    CELERY_BROKER_URL = env.str(
        "CELERY_BROKER_URL", default="redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = env.str(
        "CELERY_RESULT_BACKEND", default="redis://localhost:6379/1")
    CELERY_TASK_SERIALIZER = env.str("CELERY_TASK_SERIALIZER", default="json")
    CELERY_RESULT_SERIALIZER = env.str(
        "CELERY_RESULT_SERIALIZER", default="json")
    CELERY_ACCEPT_CONTENT = env.list("CELERY_ACCEPT_CONTENT",
                                     subcast=str,
                                     default=["json"])
    CELERY_TIMEZONE = env.str("CELERY_TIMEZONE", default="UTC")
    CELERY_ENABLE_UTC = env.bool("CELERY_ENABLE_UTC", default=True)

    # WebSocket Configuration
    WEBSOCKET_PORT = env.int("WEBSOCKET_PORT", default=3001)

    # Application Settings
    DEBUG = env.bool("DEBUG", default=False)
    ENVIRONMENT = env.str("ENVIRONMENT", default="development")

    # Test Settings
    TEST_TIMEOUT = env.int("TEST_TIMEOUT", default=3600)  # 1 hour
    MAX_CONCURRENT_TESTS = env.int("MAX_CONCURRENT_TESTS", default=10)

    # Cleanup Settings
    TEST_RETENTION_HOURS = env.int("TEST_RETENTION_HOURS", default=24)
    CLEANUP_INTERVAL_MINUTES = env.int("CLEANUP_INTERVAL_MINUTES", default=60)
