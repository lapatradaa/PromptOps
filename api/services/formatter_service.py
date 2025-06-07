import logging
from typing import Any, Dict, List, Optional

from ..PromptOps.std_templates import ShotTemplateFormatter
from ..PromptOps.icqa_templates import ICQATemplateFormatter

logger = logging.getLogger(__name__)


class FormatterService:
    """
    Wraps PromptOps template formatters (std/icqa) so that
    callers need only specify filepath + template name.
    """
    def __init__(self, filepath: str, template: str, project_type: str = None):
        tpl = template.lower()
        self.project_type = project_type
        
        if tpl == 'std':
            self.formatter = ShotTemplateFormatter(filepath, project_type)
        elif tpl == 'icqa':
            self.formatter = ICQATemplateFormatter(filepath, project_type)
        else:
            raise ValueError(f"Unsupported template: {template}")

    def format_all(
        self,
        shot_type: str,
        perturb_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Apply the chosen shot_type and perturb_type to every row.
        """
        try:
            return self.formatter.format_all_rows(
                shot_type=shot_type,
                perturb_type=perturb_type
            )
        except Exception as e:
            logger.error(f"FormatterService.format_all error: {e}")
            raise

    def save_csv(
        self,
        formatted_data: List[Dict[str, Any]],
        output_filepath: str
    ) -> str:
        """
        Persist formatted_data to CSV. Returns actual file path used
        (could be a tmp file if patched).
        """
        try:
            path = self.formatter.save_formatted_data_to_csv(
                formatted_data, output_filepath
            )
            logger.info(f"Formatted data saved to: {path}")
            return path
        except Exception as e:
            logger.error(f"FormatterService.save_csv error: {e}")
            raise
