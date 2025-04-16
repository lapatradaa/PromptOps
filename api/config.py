# api/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
from pathlib import Path

# Load .env file explicitly
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    API_KEY: str = os.getenv("API_KEY", "")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL")
    HTTPS_REDIRECT: bool = os.getenv("HTTPS_REDIRECT", "FALSE").upper() == "TRUE"

    class Config:
        env_file = ".env"