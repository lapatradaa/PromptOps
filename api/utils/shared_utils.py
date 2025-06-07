import logging
import os
import tempfile
import uuid
from typing import Optional

from fastapi import HTTPException

from ..utils.abort_handler import check_abort


def convert_numpy_types(obj):
    """Convert NumPy types to Python native types for JSON serialization."""
    import numpy as np

    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, dict):
        return {convert_numpy_types(k): convert_numpy_types(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return type(obj)(convert_numpy_types(i) for i in obj)
    return obj


async def handle_inline_csv_data(
    test_id: str,
    blocks_list,
    base_dir: Optional[str] = None,
) -> str:
    """
    Extract CSV/XLSX data from a blocks array and write it to `base_dir`
    (defaults to the system temp dir).  Returns the absolute file path.
    """
    if check_abort(test_id):
        raise HTTPException(
            status_code=400, detail="Test aborted during CSV extraction")

    csv_block = next((b for b in blocks_list if b.get(
        "method") in {"csv", "xlsx"}), None)
    if not csv_block:
        logging.error("No file uploaded and no CSV/XLSX block found!")
        raise HTTPException(
            status_code=400,
            detail="No file uploaded and no CSV/XLSX block found!",
        )

    raw_data = csv_block.get("config", {}).get("data")
    if raw_data is None:
        logging.error("CSV/XLSX block found but missing `config.data`")
        raise HTTPException(
            status_code=400,
            detail="CSV/XLSX block found but missing `config.data`",
        )

    method = csv_block.get("method", "csv")
    filename = csv_block.get("config", {}).get("fileName", f"file.{method}")

    logging.info(
        f"Processing {method.upper()} data from block, filename: {filename}")

    # Decide where to write the data -------------------------------------------------
    if base_dir is None:
        base_dir = tempfile.gettempdir()
    os.makedirs(base_dir, exist_ok=True)
    tmp_path = os.path.join(base_dir, f"{test_id}_{uuid.uuid4().hex}.csv")
    # --------------------------------------------------------------------------------

    if method == "xlsx":
        # XLSX is already base-64→CSV converted on the client, so just write it.
        logging.info("Treating XLSX block as CSV after client conversion")
    else:
        logging.info("Writing CSV block data")

    with open(tmp_path, "w+", encoding="utf-8") as fh:
        fh.write(raw_data)

    return tmp_path
