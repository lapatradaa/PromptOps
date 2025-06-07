import json
import logging
import os
import shutil
import tempfile
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile

from ..utils.shared_utils import handle_inline_csv_data

logger = logging.getLogger(__name__)

# The directory that is mounted as a Docker volume by both core & worker
SHARED_DIR = os.getenv("SHARED_DATA_DIR", "/data")


class InputDataService:
    """
    Handles intake of either an uploaded file or inline CSV/XLSX blocks,
    writing them to disk (inside the shared volume) and returning the path.
    """

    @staticmethod
    async def prepare_input_data(
        file: Optional[UploadFile],
        blocks: str,
        test_id: str,
    ) -> Tuple[str, Optional[str]]:
        """
        Returns
        -------
        file_path : str
            Absolute path to the CSV on disk that downstream logic can read.
        temp_dir : Optional[str]
            If we created a temporary directory (for an uploaded file), its
            path so the caller can clean it up.  Otherwise ``None``.
        """
        file_path: Optional[str] = None
        temp_dir: Optional[str] = None

        try:
            # ------------------------------------------------------------------
            # Path 1 – an uploaded file
            # ------------------------------------------------------------------
            if file:
                data = await file.read()
                ext = os.path.splitext(file.filename)[1].lower()
                temp_dir = tempfile.mkdtemp(dir=SHARED_DIR)   # <── shared
                file_path = os.path.join(temp_dir, f"uploaded_file{ext}")

                with open(file_path, "wb") as fh:
                    fh.write(data)

                logger.info(f"Uploaded file saved to: {file_path}")

            # ------------------------------------------------------------------
            # Path 2 – CSV/XLSX provided inline in the blocks JSON
            # ------------------------------------------------------------------
            else:
                blocks_list = json.loads(blocks)
                file_path = await handle_inline_csv_data(
                    test_id,
                    blocks_list,
                    base_dir=SHARED_DIR,              # <── shared
                )
                logger.info(f"Inline CSV data saved to: {file_path}")

            return file_path, temp_dir

        # ----------------------------------------------------------------------
        # Error handling / cleanup
        # ----------------------------------------------------------------------
        except Exception as exc:
            if temp_dir and os.path.isdir(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            if file_path and os.path.isfile(file_path) and not temp_dir:
                os.remove(file_path)

            logger.error(f"Error preparing input data: {exc}")
            raise HTTPException(
                status_code=400,
                detail=f"Error processing input data: {exc}",
            ) from exc
