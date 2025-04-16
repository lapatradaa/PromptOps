# api/index.py
from .config import Settings
from .routers import calculate_scores, combined, applicability
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from starlette.requests import Request
from starlette.responses import RedirectResponse
import logging
import nltk
import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Instantiate FastAPI
app = FastAPI()

# Force NLTK to use only the virtual environment path
nltk_data_path = os.path.join(os.getcwd(), ".venv", "nltk_data")
nltk.data.path = [nltk_data_path]  # Override default paths

# Download required datasets
nltk.download('punkt', download_dir=nltk_data_path)
nltk.download('punkt_tab', download_dir=nltk_data_path)
nltk.download('wordnet', download_dir=nltk_data_path)
nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_path)
nltk.download('averaged_perceptron_tagger_eng', download_dir=nltk_data_path)
nltk.download('omw-1.4', download_dir=nltk_data_path)

# Load settings
settings = Settings()

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Setup API key authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(api_key_header: str = Depends(api_key_header)):
    if api_key_header == settings.API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API Key",
    )

# HTTPS redirect middleware


@app.middleware("http")
async def https_redirect(request, call_next):
    if settings.HTTPS_REDIRECT and request.url.scheme == "http":
        url = request.url.replace(scheme="https")
        return RedirectResponse(url=str(url), status_code=301)
    return await call_next(request)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", API_KEY_NAME],
)

# Include each router with auth
app.include_router(calculate_scores.router,
                   dependencies=[Depends(get_api_key)])
app.include_router(combined.router, dependencies=[Depends(get_api_key)])
app.include_router(applicability.router, dependencies=[Depends(get_api_key)])

# Add a health check endpoint (no auth required)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

# Home route with auth


@app.get("/", dependencies=[Depends(get_api_key)])
def home():
    return {"message": "Hello from index.py!"}
