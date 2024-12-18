import pandas as pd
import pickle
from PromptOps.perturb import Perturbation

class COTShotTemplateFormatter:
    def __init__(self, filepath):
        self.filepath = filepath
        self.df = self.load_data()
        self.perturb = Perturbation()  # Initialize the perturbation class

    def load_data(self):
        """
        Load the dataset based on the file extension.
        """
        if self.filepath.endswith('.csv'):
            return pd.read_csv(self.filepath)
        elif self.filepath.endswith('.xlsx'):
            return pd.read_excel(self.filepath)
        elif self.filepath.endswith('.json'):
            return pd.read_json(self.filepath)
        elif self.filepath.endswith('.pkl') or self.filepath.endswith('.pickle'):
            return self.load_pickle_file(self.filepath)
        else:
            raise ValueError("Unsupported file format")

    def load_pickle_file(self, filepath):
        """
        Load a dataset from a pickle file.
        """
        try:
            with open(filepath, 'rb') as file:
                data = pickle.load(file)
            return pd.DataFrame(data)  # Convert the loaded data to a DataFrame if applicable
        except Exception as e:
            raise ValueError(f"Error loading pickle file: {e}")

    def zero_shot_template(self, row, perturb_type=None):
        """
        Zero-shot template format with Question, Elaborated Sentence, and Expected Answer.
        """
        question = row['Question']
        elaborated_sentence = row['Elaborated_sentence']

        if perturb_type:
            question = self.perturb.robust(question)

        original = f"""
        Question: {row['Question']}
        Elaborated Sentence: {row['Elaborated_sentence']}
        """

        perturbed = f"""
        Question: {question}
        Elaborated Sentence: {elaborated_sentence}
        """

        return original, perturbed

    def one_shot_template(self, row, perturb_type=None):
        """
        One-shot template format with Question_1, Elaborated Sentence_1, Answer_1, Question, Elaborated Sentence, and Expected Answer.
        """
        question = row['Question']
        elaborated_sentence = row['Elaborated_sentence']

        if perturb_type:
            question = self.perturb.robust(question)

        original = f"""
        Question 1: {row['Question_1']}
        Elaborated Sentence 1: {row['Elaborated_sentence_1']}
        Answer 1: {row['Answer_1']}

        Question: {row['Question']}
        Elaborated Sentence: {row['Elaborated_sentence']}
        """

        perturbed = f"""
        Question 1: {row['Question_1']}
        Elaborated Sentence 1: {row['Elaborated_sentence_1']}
        Answer 1: {row['Answer_1']}

        Question: {question}
        Elaborated Sentence: {elaborated_sentence}
        """

        return original, perturbed

    def few_shot_template(self, row, perturb_type=None):
        """
        Few-shot template format with Question_1, Elaborated Sentence_1, Answer_1, Question_2, Elaborated Sentence_2, Answer_2, Question, Elaborated Sentence, and Expected Answer.
        """
        question = row['Question']
        elaborated_sentence = row['Elaborated_sentence']

        if perturb_type:
            question = self.perturb.robust(question)

        few_shot_context = f"""
        Question 1: {row['Question_1']}
        Elaborated Sentence 1: {row['Elaborated_sentence_1']}
        Answer 1: {row['Answer_1']}
        """

        if 'Question_2' in row and pd.notna(row['Question_2']):
            few_shot_context += f"""
            Question 2: {row['Question_2']}
            Elaborated Sentence 2: {row['Elaborated_sentence_2']}
            Answer 2: {row['Answer_2']}
            """

        original = f"{few_shot_context}Question: {row['Question']}\nElaborated Sentence: {row['Elaborated_sentence']}"

        perturbed = f"{few_shot_context}Question: {question}\nElaborated Sentence: {elaborated_sentence}"

        return original, perturbed

    def format_all_rows(self, shot_type='zero', perturb_type=None):
        """
        Format all rows based on the specified shot type and apply perturbations if specified.
        """
        formatted_data = []

        for _, row in self.df.iterrows():
            if shot_type == 'zero':
                original, perturbed = self.zero_shot_template(row, perturb_type=perturb_type)
            elif shot_type == 'one':
                original, perturbed = self.one_shot_template(row, perturb_type=perturb_type)
            elif shot_type == 'few':
                original, perturbed = self.few_shot_template(row, perturb_type=perturb_type)
            else:
                raise ValueError("Invalid shot type")

            formatted_data.append({
                "original_prompt": original,
                "perturb_prompt": perturbed,
                "perturb_type": perturb_type,
                "expected_result": row['Expected_answer']
            })

        return formatted_data

    def save_formatted_data_to_csv(self, formatted_data, output_filepath):
        """
        Save the formatted data to a CSV file.
        """
        df = pd.DataFrame(formatted_data)
        df.to_csv(output_filepath, index=False)
