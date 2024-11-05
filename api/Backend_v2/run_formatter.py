from PromptOps.icqa_templates import ShotTemplateFormatter
from PromptOps.std_templates import STDShotTemplateFormatter

# *******************************COT****************************
# Import necessary modules and COTShotTemplateFormatter
import pandas as pd
from PromptOps.cot_templates import COTShotTemplateFormatter  # Adjust this path based on your project structure

# Paths to the dataset (update if needed)
cot_filepath = 'cot_few.csv'

# Perturbation type to apply (optional)
perturb_type = 'coreference'  # You can change this to other perturbation types

# Function to run COT formatting for each shot type
def run_cot_formatter(filepath, shot_type, perturb_type=None):
    print(f"\nRunning {shot_type}-shot COT formatting...\n")
    
    # Initialize the formatter with the dataset
    formatter = COTShotTemplateFormatter(filepath=filepath)
    
    # Get the formatted original and perturbed prompts
    original_prompts, perturbed_prompts = formatter.format_all_rows(shot_type=shot_type, perturb_type=perturb_type)

    # Print all original prompts
    print("Original Prompts:")
    for i, prompt in enumerate(original_prompts):
        print(f"Original Prompt {i+1}:")
        print(prompt)
        print("\n")

    # Print all perturbed prompts
    if perturb_type:
        print("Perturbed Prompts:")
        for i, perturbed_prompt in enumerate(perturbed_prompts):
            print(f"Perturbed Prompt {i+1}:")
            print(perturbed_prompt)
            print("\n")

# Run separately for zero, one, and few-shot
run_cot_formatter(cot_filepath, shot_type='few', perturb_type=perturb_type)
# run_cot_formatter(cot_filepath, shot_type='one', perturb_type=perturb_type)
# run_cot_formatter(cot_filepath, shot_type='few', perturb_type=perturb_type)


# ******************************* STD **************************
# Instantiate the formatter
# Import the necessary modules and classes
# Import the necessary modules and classes
# import pandas as pd

# # Paths to your datasets (update these paths if needed)
# zero_shot_filepath = 'std_zero.csv'
# one_shot_filepath = 'std_one.csv'
# few_shot_filepath = 'std_few.csv'

# perturb_type = 'robust'  # You can change this to other perturbation types


# # Initialize formatter with the zero-shot dataset
# formatter = STDShotTemplateFormatter(filepath=zero_shot_filepath) # เปลี่ยน file path

# # zero, one, few
# original_prompts, perturbed_prompts = formatter.format_all_rows(shot_type='zero', perturb_type='robust')

# # Print all original prompts
# print("Original Prompts (Zero-shot):") 
# for i, prompt in enumerate(original_prompts):
#     print(f"Original Prompt {i+1}:")
#     print(prompt)
#     print("\n")

# # Print all perturbed prompts
# print("Perturbed Prompts (Zero-shot):")
# for i, perturbed_prompt in enumerate(perturbed_prompts):
#     print(f"Perturbed Prompt {i+1}:")
#     print(perturbed_prompt)
#     print("\n")





# ********************************ICQA*************************
# Assuming you have the updated ShotTemplateFormatter and Perturbation classes from the provided code.

# Instantiate the formatter
# formatter = ShotTemplateFormatter(filepath='zero_shot_example.csv')

# # shot_type: zero, one, few
# original_prompts, perturbed_prompts = formatter.format_all_rows(shot_type='zero', perturb_type='robust')


# Print all original prompts
# print("Original Prompts:")
# for i, prompt in enumerate(original_prompts):
#     print(f"Original Prompt {i+1}:")
#     print(prompt)
#     print("\n")

# # Print all perturbed prompts
# print("Perturbed Prompts:")
# for i, perturbed_prompt in enumerate(perturbed_prompts):
#     print(f"Perturbed Prompt {i+1}:")
#     print(perturbed_prompt)
#     print("\n")


