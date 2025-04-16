# @/app/utils/csv_helpers.py
import pandas as pd
import logging
import tempfile
import os


def read_csv_safely(file_path, encoding='utf-8'):
    """
    Safely read CSV files with consistent error handling
    """
    try:
        logging.info(f"Reading file as CSV: {file_path}")
        # Use more robust CSV reading options
        df = pd.read_csv(
            file_path,
            on_bad_lines='skip',
            encoding=encoding,
            engine='python'
        )
        logging.info(f"Successfully read file with {len(df)} rows")
        return df
    except Exception as e:
        logging.error(f"Error reading CSV file: {str(e)}")
        raise


def save_to_temp_csv(df, prefix='temp_', suffix='.csv'):
    """
    Save DataFrame to a temporary CSV file
    """
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix, prefix=prefix, mode='w+'
        ) as tmp:
            df.to_csv(tmp.name, index=False)
            return tmp.name
    except Exception as e:
        logging.error(f"Error saving to temp CSV: {str(e)}")
        raise
