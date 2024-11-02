import pandas as pd
from .perturb import Perturbation
import pickle
class STDShotTemplateFormatter:
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

    def zero_shot_template(self, row):
        """
        Zero-shot template format (without Instruction and Context).
        """
        return f"""
        Question: {row['Question']}
        Expected Answer: {row['Expected_answer']}
        """

    def one_shot_template(self, row):
        """
        One-shot template format (without Instruction and Context).
        """
        return f"""
        Question 1: {row['Question_1']}
        Answer 1: {row['Answer_1']}
        
        Question: {row['Question']}
        Expected Answer: {row['Expected_answer']}
        """

    def few_shot_template(self, row):
        """
        Few-shot template format (without Instruction and Context).
        """
        template = ""
        
        # Dynamically identify all question-answer pairs (e.g., Question_1, Answer_1, Question_2, Answer_2)
        shot_pairs = [col for col in row.index if col.startswith('Question_') or col.startswith('Answer_')]

        for i in range(0, len(shot_pairs), 2):
            # Ensure there is a valid pair of Question and Answer
            if i + 1 < len(shot_pairs):
                template += f"{shot_pairs[i]}: {row[shot_pairs[i]]}\n{shot_pairs[i+1]}: {row[shot_pairs[i+1]]}\n"
        
        # Add the main question and expected answer at the end
        template += f"Question: {row['Question']}\nExpected Answer: {row['Expected_answer']}\n"
        return template

    def perturb_question(self, question, perturb_type):
        """
        Apply perturbation to the question based on the perturbation type.
        """
        if perturb_type == 'robust':
            return self.perturb.robust(question)
        elif perturb_type == 'taxonomy':
            return self.perturb.taxonomy(question)
        elif perturb_type == 'negation':
            return self.perturb.negation(question)
        elif perturb_type == 'coreference':
            return self.perturb.coreference(question, 'word')  # Specify word to clarify
        elif perturb_type == 'srl':
            return self.perturb.srl(question)
        elif perturb_type == 'logic':
            return self.perturb.logic(question)
        elif perturb_type == 'fairness':
            return self.perturb.fairness(question)
        elif perturb_type == 'temporal':
            return self.perturb.temporal(question)
        elif perturb_type == 'ner':
            return self.perturb.ner(question)
        elif perturb_type == 'vocab':
            return self.perturb.vocab(question)
        else:
            raise ValueError("Invalid perturbation type")

    def format_all_rows(self, shot_type='zero', perturb_type=None):
        """
        Format all rows based on the shot type and apply perturbations if specified.
        """
        formatted_data = []
        perturbed_data = []
        
        for index, row in self.df.iterrows():
            if shot_type == 'zero':
                original_template = self.zero_shot_template(row)
            elif shot_type == 'one':
                original_template = self.one_shot_template(row)
            elif shot_type == 'few':
                original_template = self.few_shot_template(row)
            else:
                raise ValueError("Invalid shot type")

            formatted_data.append(original_template)

            if perturb_type:
                perturbed_question = self.perturb_question(row['Question'], perturb_type)
                perturbed_row = row.copy()
                perturbed_row['Question'] = perturbed_question
                
                if shot_type == 'zero':
                    perturbed_template = self.zero_shot_template(perturbed_row)
                elif shot_type == 'one':
                    perturbed_template = self.one_shot_template(perturbed_row)
                elif shot_type == 'few':
                    perturbed_template = self.few_shot_template(perturbed_row)
                
                perturbed_data.append(perturbed_template)

        return formatted_data, perturbed_data
