# api/config.py
from environs import Env
from pathlib import Path

# point at your .env
env_path = Path(__file__).parent / ".env"

env = Env()
env.read_env(env_path)    # load from .env


class Settings:
    API_KEY = env.str("API_KEY", default="")
    ALLOWED_ORIGINS = env.list("ALLOWED_ORIGINS",
                               subcast=str,
                               default=["http://localhost:3000"])
    LOG_LEVEL = env.str("LOG_LEVEL", default="INFO")
    HTTPS_REDIRECT = env.bool("HTTPS_REDIRECT", default=False)
