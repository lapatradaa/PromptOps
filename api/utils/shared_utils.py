# @/app/utils/shared_utils.py
import logging
from fastapi import HTTPException

from api.utils.abort_handler import check_abort


def convert_numpy_types(obj):
    """Convert NumPy types to Python native types for JSON serialization"""
    import numpy as np

    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {convert_numpy_types(k): convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(i) for i in obj)
    else:
        return obj


async def handle_inline_csv_data(test_id: str, blocks_list):
    """Extract CSV or XLSX data from a block if no file was provided."""
    import tempfile

    if check_abort(test_id):
        raise HTTPException(
            status_code=400, detail="Test aborted during CSV extraction")

    csv_block = next(
        (b for b in blocks_list if b.get('method') in ['csv', 'xlsx']), None
    )
    if not csv_block:
        logging.error("ERROR: No file uploaded and no CSV/XLSX block found!")
        raise HTTPException(
            status_code=400, detail="No file uploaded and no CSV/XLSX block found!")

    raw_data = csv_block.get("config", {}).get("data")
    if not raw_data:
        logging.error("ERROR: CSV/XLSX block found but missing `config.data`")
        raise HTTPException(
            status_code=400, detail="CSV/XLSX block found but missing `config.data`")

    method = csv_block.get("method", "csv")
    filename = csv_block.get("config", {}).get("fileName", f"file.{method}")

    logging.info(f"Processing {method} data from block, filename: {filename}")

    # For XLSX data, handle as binary
    if method == "xlsx":
        logging.info("Converting XLSX block to CSV")
        # Treat as CSV since it was converted on client
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w+') as tmp:
            tmp.write(raw_data)
            return tmp.name
    else:
        # For CSV, process normally
        logging.info("Processing CSV data normally")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w+') as tmp:
            tmp.write(raw_data)
            return tmp.name
