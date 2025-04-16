"""
Module to patch the save_formatted_data_to_csv method of formatter classes.
This is imported by logic.py to ensure formatters can handle missing directories.
"""
import os
import logging
import tempfile
import pandas as pd

# Store original methods before patching
original_methods = {}


def _make_patched_save_method(original_method):
    """Create a patched save method that handles directory creation or uses temporary files."""

    def patched_save_method(self, formatted_data, output_filepath):
        # Convert the formatted data to a DataFrame
        df = pd.DataFrame(formatted_data)

        # Check if this is a path to the test_results directory
        if '/test_results/' in output_filepath or '\\test_results\\' in output_filepath:
            # Use a temporary file instead
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                tmp_path = tmp.name
                logging.info(
                    f"Using temporary file instead of test_results: {tmp_path}")
                df.to_csv(tmp_path, index=False)
                # Return the temporary path
                return tmp_path
        else:
            # For other paths, ensure the directory exists
            output_dir = os.path.dirname(output_filepath)
            if output_dir and not os.path.exists(output_dir):
                try:
                    os.makedirs(output_dir, exist_ok=True)
                    logging.info(f"Created directory: {output_dir}")
                except Exception as e:
                    logging.warning(
                        f"Could not create directory {output_dir}: {e}")
                    # Use a temporary file as fallback
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                        tmp_path = tmp.name
                        logging.info(
                            f"Using temporary file as fallback: {tmp_path}")
                        df.to_csv(tmp_path, index=False)
                        # Return the temporary path
                        return tmp_path

            # Save to the original path
            df.to_csv(output_filepath, index=False)
            return output_filepath

    return patched_save_method


def apply_patches():
    """Apply patches to the formatter classes if they haven't been patched already."""
    global original_methods

    # Import the formatter classes
    try:
        from ..Backend_v1.PromptOps.std_templates import ShotTemplateFormatter
        from ..Backend_v1.PromptOps.icqa_templates import ICQATemplateFormatter
        # from ..Backend_v1.PromptOps.cot_templates import COTTemplateFormatter

        # Only patch if we haven't already stored the original methods
        if not original_methods:
            # Store original methods
            original_methods = {
                'icqa': ICQATemplateFormatter.save_formatted_data_to_csv,
                # 'cot': COTTemplateFormatter.save_formatted_data_to_csv,
                'std': ShotTemplateFormatter.save_formatted_data_to_csv
            }

            # Apply patches
            ICQATemplateFormatter.save_formatted_data_to_csv = _make_patched_save_method(
                original_methods['icqa'])
            # COTTemplateFormatter.save_formatted_data_to_csv = _make_patched_save_method(
            #     original_methods['cot'])
            ShotTemplateFormatter.save_formatted_data_to_csv = _make_patched_save_method(
                original_methods['std'])

            logging.info(
                "Template formatter classes patched to handle missing directories")
        else:
            logging.debug("Template formatters already patched, skipping")

    except ImportError as e:
        logging.error(f"Error importing formatter classes: {e}")


# Apply the patches when this module is imported
apply_patches()
