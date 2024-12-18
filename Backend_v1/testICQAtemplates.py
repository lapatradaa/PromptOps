from PromptOps.icqa_templates import ICQATemplateFormatter

def process_and_save_csv(input_file, output_prefix):
    # Initialize the formatter with the input file
    formatter = ICQATemplateFormatter(input_file)

    # List of perturbation types to apply
    perturbation_types = ['robust', 'taxonomy', 'vocab']

    # Process each perturbation type and save the output
    for perturb_type in perturbation_types:
        print(f"Processing {perturb_type} perturbation...")
        formatted_data = formatter.format_all_rows(shot_type='few', perturb_type=perturb_type) # select type shot_type = 'zero','one','few'
        output_file = f"ICQA_few_{output_prefix}_{perturb_type}_output.csv"
        formatter.save_formatted_data_to_csv(formatted_data, output_file)
        print(f"Saved formatted data with {perturb_type} perturbation to {output_file}")

# Example API usage
if __name__ == "__main__":
    input_csv = "few_shot_example.csv"
    output_prefix = "formatted"
    process_and_save_csv(input_csv, output_prefix)

# Move the file result to result folder