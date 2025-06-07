import os
import logging
import nltk
import filecmp
from pathlib import Path
from shutil import copyfile

log = logging.getLogger(__name__)

# Determine NLTK data directory
nltk_data_env = os.getenv("NLTK_DATA")
if nltk_data_env:
    NLTK_DIR = Path(nltk_data_env)
else:
    NLTK_DIR = Path("/tmp/nltk_data")

# Ensure NLTK data directory exists
try:
    NLTK_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    log.warning(f"Could not create NLTK data dir at {NLTK_DIR}: {e}")

# Add to NLTK search path
nltk.data.path = [str(NLTK_DIR)]

# Required corpora for NLP processing
REQUIRED = [
    "punkt",
    "punkt_tab",
    "wordnet",
    "averaged_perceptron_tagger",
    "averaged_perceptron_tagger_eng",
    "omw-1.4",
]
for corpus in REQUIRED:
    try:
        nltk.download(corpus, download_dir=str(NLTK_DIR), quiet=True)
    except Exception as e:
        log.warning(f"NLTK download failed for {corpus}: {e}")


def _ensure_punkt_tab_alias() -> None:
    """
    Create a 'punkt_tab' alias pointing to 'punkt' tokenizers, for legacy support.
    """
    src = NLTK_DIR / "tokenizers" / "punkt"
    dst = NLTK_DIR / "tokenizers" / "punkt_tab"
    if not src.exists():
        return
    dst.mkdir(parents=True, exist_ok=True)
    for f in src.glob("*.pickle"):
        t = dst / f.name
        if t.exists() and filecmp.cmp(f, t, shallow=False):
            continue
        try:
            t.unlink(missing_ok=True)
            t.symlink_to(f)
        except Exception:
            copyfile(f, t)


# Ensure the alias is in place
_ensure_punkt_tab_alias()
