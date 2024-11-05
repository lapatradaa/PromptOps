# ****************************Test OpenAI/Gemini/Claude********************************************
# from PromptOps.test import PromptCompletion, Test
# from PromptOps.test_suite import TestSuite
# from PromptOps.perturb import Perturbation  # Perturbation class
# from langchain_core.prompts import PromptTemplate

# # Initialize the PromptCompletion model
# completion = PromptCompletion(
#     model_provider="openai",  # Can be "openai", "claude", or "gemini"
#     model="gpt-3.5-turbo",  # Specify the OpenAI model
#     api_key="Your-OpenAI-Key"  
# )

# # Initialize the Perturbation object
# perturbation = Perturbation()

# # Initialize the test suite
# test_suite = TestSuite()

# # Define the prompt template
# template = """
# Instruction: Answer the question based on the context below. Answer each question with a simple Boolean answer (Yes or No).
# Don't provide `.` in the last of answer.
# Context: Seedless cucumber fruit does not require pollination. Cucumber plants need insects to pollinate them. Entomophobia is a fear of insects.
# Question: {query}
# """

# prompt_template = PromptTemplate(
#     input_variables=["query"],
#     template=template
# )

# # Define the original query to be perturbed
# original_query = "Is growing seedless cucumber good for a gardener with entomophobia?"

# # List of perturbation methods and their names, with special handling for 'coreference'
# perturbation_methods = [
#     ("Robustness", perturbation.robust),
#     ("Taxonomy", perturbation.taxonomy),
#     ("Negation", perturbation.negation),
#     ("Coref", lambda query: perturbation.coreference(query, "entomophobia")),  # Specify 'entomophobia' for coreference
#     ("SRL", perturbation.srl),
#     ("Logic", perturbation.logic),
#     ("Fairness", perturbation.fairness),
#     ("Temporal", perturbation.temporal),
#     ("NER", perturbation.ner),
#     ("Vocabulary", perturbation.vocab)
# ]

# original_prompt = prompt_template.format(query=original_query)

# # # Apply each perturbation method to the original query
# # for name, perturb_method in perturbation_methods:
# #     try:
# #         perturbed_query = perturb_method(original_query)  # Apply the perturbation method to the query
# #         print(f"{name} Perturbed Query: {perturbed_query}\n")
# #     except Exception as e:
# #         print(f"Error applying {name} perturbation: {e}")

# # Add all perturbation-based test cases to the test suite
# for test_type, perturb_method in perturbation_methods:
#     perturbed_query = perturb_method(original_query)  # Apply the perturbation method to the query
#     perturbed_prompt = prompt_template.format(query=perturbed_query)  # Format the perturbed query in the template

#     print(perturbed_prompt)
#     #Create the test case
#     test = Test(
#         name=f"Test {test_type}",
#         prompt=original_prompt,  # Use the perturbed prompt
#         expected_result="Yes",
#         description=f"Testing with {test_type} perturbation.",
#         perturb_method=perturb_method,
#         perturb_text=perturbed_prompt,  # Apply the perturbation method
#         test_type=f"{test_type} Test"  # Specify the type of test
#     )

#     # Add the test to the test suite
#     test_suite.add_test(test)

# #Run all tests
# test_suite.run_all(completion)

# #Summarize the results
# results, summary = test_suite.summarize()
# print("Summary:", summary)

# # Export results in multiple formats
# test_suite.export_results("test_results.csv", file_format='csv', overwrite=True)
# test_suite.export_results("test_results.xlsx", file_format='xlsx', overwrite=True)
# test_suite.export_results("test_results.json", file_format='json', overwrite=True)

# #Summary: {'total_tests': 10, 'failures': 0, 'fail_rate': 0.0}

# **************************************************Test LLAMA**************************************************************
from PromptOps.test import PromptCompletion, Test
from PromptOps.test_suite import TestSuite
from PromptOps.perturb import Perturbation  # Import the Perturbation class
from langchain_core.prompts import PromptTemplate


# Llama URL where the model is hosted
llama_url = "http://127.0.0.1:8000/v1/chat/completions"  # Replace with the actual URL where Llama is hosted

# Initialize the PromptCompletion model for Llama
completion = PromptCompletion(
    model_provider="llama",  # Specify that we're using Llama
    model="llama-13b",       # Specify the Llama model you want to use
    system_content="You are an assistant that generates logical sentences.",  # System message
    temperature=0.5,
    top_p=0.9,
    max_tokens=150,
    llama_url=llama_url  # The URL for the hosted Llama model
)

# Initialize the Perturbation object
perturbation = Perturbation()

# Initialize the test suite
test_suite = TestSuite()

# Define the prompt template
template = """
Instruction: Answer the question based on the context below. Answer each question with a simple Boolean answer (Yes or No).
Context: Seedless cucumber fruit does not require pollination. Cucumber plants need insects to pollinate them. Entomophobia is a fear of insects.
Question: {query}
"""

prompt_template = PromptTemplate(
    input_variables=["query"],
    template=template
)

# Define the original query to be perturbed
original_query = "Is growing seedless cucumber good for a gardener with entomophobia?"

# List of perturbation methods and their names, with special handling for 'coreference'
perturbation_methods = [
    ("Robustness", perturbation.robust),
    ("Taxonomy", perturbation.taxonomy),
    ("Negation", perturbation.negation),
    ("Coref", perturbation.coreference),  # Specify 'entomophobia' for coreference
    ("SRL", perturbation.srl),
    ("Logic", perturbation.logic),
    ("Fairness", perturbation.fairness),
    ("Temporal", perturbation.temporal),
    ("NER", perturbation.ner),
    ("Vocabulary", perturbation.vocab)
]

# Apply each perturbation method to the original query
for name, perturb_method in perturbation_methods:
    try:
        perturbed_query = perturb_method(original_query)  # Apply the perturbation method to the query
        print(f"{name} Perturbed Query: {perturbed_query}\n")
    except Exception as e:
        print(f"Error applying {name} perturbation: {e}")

#  Apply each perturbation method to the original query and create a test for each perturbation
for name, perturb_method in perturbation_methods:
    try:
        perturbed_query = perturb_method(original_query)  # Apply the perturbation method to the query
        perturbed_prompt = prompt_template.format(query=perturbed_query)  # Generate the full perturbed prompt
        
        # Add test case to the suite
        test = Test(
            name=f"Test {name}",
            prompt=perturbed_prompt,  # Use the perturbed prompt
            expected_result="Yes",    # Expected result for this query
            description=f"A test with {name} perturbation",
            perturb_method=perturb_method,  # Apply the specific perturbation method
            perturb_text=perturbed_prompt,
            test_type=f"{name} Test"  # Specify the type of test
        )
        
        test_suite.add_test(test)

    except Exception as e:
        print(f"Error applying {name} perturbation: {e}")

# Run all tests
test_suite.run_all(completion)

# Summarize the results
results, summary = test_suite.summarize()
print("Summary:", summary)

# Export results in multiple formats
test_suite.export_results("llama_test_results.csv", file_format='csv', overwrite=True)
test_suite.export_results("llama_test_results.xlsx", file_format='xlsx', overwrite=True)
test_suite.export_results("llama_test_results.json", file_format='json', overwrite=True)
