from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from starlette.requests import Request
from starlette.responses import RedirectResponse
import logging
import os
import redis
from contextlib import asynccontextmanager

from .config import Settings
from .controllers.test_controller import router as test_router
from .routers import calculate_scores, applicability
import api.utils.nltk_setup as _  # ensure NLTK is initialized

# Prevent parallelism warnings
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()

# API key authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_api_key(api_key_header: str = Depends(api_key_header)):
    if api_key_header == settings.API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API Key",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up API service...")
    # Initialize Redis connection
    redis_url = settings.REDIS_URL or "redis://redis:6379/0"
    try:
        redis_client = redis.from_url(redis_url, decode_responses=True)
        redis_client.ping()
        logger.info(f"Redis connection established at {redis_url}")
    except Exception as e:
        logger.error(f"Failed to connect to Redis at {redis_url}: {e}")

    yield

    # Shutdown
    logger.info("Shutting down API service...")
    try:
        redis_client.close()
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="PromptOps API",
    description="API for prompt testing and evaluation",
    version="2.0.0",
    lifespan=lifespan
)

# HTTPS redirect middleware


@app.middleware("http")
async def https_redirect(request: Request, call_next):
    if settings.HTTPS_REDIRECT and request.url.scheme == "http":
        url = request.url.replace(scheme="https")
        return RedirectResponse(url=str(url), status_code=301)
    return await call_next(request)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", API_KEY_NAME],
)

# Include authenticated routers
app.include_router(
    test_router,
    prefix="/api/v2",
    tags=["tests"],
    dependencies=[Depends(get_api_key)]
)
app.include_router(
    calculate_scores.router,
    prefix="/api/v1",
    tags=["scores"],
    dependencies=[Depends(get_api_key)]
)
app.include_router(
    applicability.router,
    prefix="/api/v1",
    tags=["applicability"],
    dependencies=[Depends(get_api_key)]
)

# Health check (no auth)


@app.get("/health", tags=["health"])
async def health_check():
    try:
        redis_client = redis.from_url(
            settings.REDIS_URL or "redis://redis:6379/0")
        redis_client.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {e}"
    return {
        "status": "healthy",
        "message": "API is running",
        "components": {"redis": redis_status}
    }

# Root endpoint (requires auth)


@app.get("/", dependencies=[Depends(get_api_key)])
def home():
    return {
        "message": "Welcome to PromptOps API v2.0",
        "docs": "/docs",
        "version": "2.0.0"
    }

# Exception handlers\ n@app.exception_handler(HTTPException)


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5328)
