import nltk
import os
import logging
from fastapi import FastAPI
from .routers import other_routes, calculate_scores, combined
from .core.config import Settings

# Instantiate FastAPI
app = FastAPI()


# Force NLTK to use only the virtual environment path
nltk_data_path = os.path.join(os.getcwd(), ".venv", "nltk_data")
nltk.data.path = [nltk_data_path]  # Override default paths

# Verify the data path
print("✅ Using Forced NLTK Data Path:", nltk.data.path)

# Download required datasets (again, just in case)
nltk.download('punkt', download_dir=nltk_data_path)
nltk.download('punkt_tab', download_dir=nltk_data_path)
nltk.download('wordnet', download_dir=nltk_data_path)
nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_path)
nltk.download('averaged_perceptron_tagger_eng', download_dir=nltk_data_path)
nltk.download('omw-1.4', download_dir=nltk_data_path)

# Load basic settings or logging
settings = Settings()
logging.basicConfig(level=settings.LOG_LEVEL)

# Include each router

app.include_router(other_routes.router)
app.include_router(calculate_scores.router)
app.include_router(combined.router)


@app.get("/")
def home():
    return {"message": "Hello from index.py!"}
