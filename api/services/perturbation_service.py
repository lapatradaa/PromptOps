import logging
import pandas as pd
from ..PromptOps.perturb import Perturbation

logger = logging.getLogger(__name__)


class PerturbationService:
    """
    Service to apply character-swap “robust” perturbations to
    each question in a DataFrame.
    """

    def __init__(self):
        self.perturb = Perturbation()

    def apply_robust(self, df: pd.DataFrame, num: int) -> pd.DataFrame:
        """
        Args:
            df: DataFrame with columns 'Question' and 'Expected_answer'
            num: percentage of words to perturb (1–100)

        Returns:
            DataFrame with columns:
              [Original_Question_Index,
               Original_Question,
               Perturbation,
               Perturbed_Question,
               Expected_Answer]
        """
        try:
            result_df = self.perturb.process_questions(
                df,
                question_column="Question",
                expected_answer_column="Expected_answer",
                num=num
            )
            return result_df
        except Exception as e:
            logger.error(f"Error in PerturbationService.apply_robust: {e}")
            raise
