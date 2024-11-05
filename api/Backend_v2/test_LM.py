
import requests

# Define the LMStudio API endpoint
url = "http://127.0.0.1:8000/v1/chat/completions"

# Define the input data

prompt="Sentence: 'Is growing seedless cucumber good for a gardener with entomophobia?'"

logic_content = "You are an assistant that Transform the following sentence into a logically structured sentence." \
                "- If sentence is a question, return it logically question structured like adding 'Is it logically true...' in the question statement or"\
                "- if sentence is a normal statement, transform it into 'If..., then... (provide some sentiment result based on sentence)'."\
                "You are prohibited from saying anything else Like here is.... "


fairness_content = "You are an assistant that Transform the following sentence into a fairness structured sentence." \
                "- If sentence is a question, return it logically question structured like adding ''Is it fair to ...?' in the question statement or"\
                "- if sentence is a normal statement, add non-biased words"\
                "You are prohibited from saying anything else Like here is.... "

temporal_content = "You are an assistant that add temporal word into sentence. "\
                   "By randomly(random every time that generate the prompt) adding one temporal word: `today, yesterday, tomorrow, now, later, soon, this morning, this evening, next week, or last month` into a structured sentence."\
                    "You are prohibited from saying anything else Like here is...."

data = {
    "model": "hugging-quants/Llama-3.2-3B-Instruct-Q8_0-GGUF/llama-3.2-3b-instruct-q8_0.gguf",
    "messages": [
        {"role": "system", "content":   temporal_content},
        {"role": "user", "content": prompt}
    ],
    "temperature": 0,
    "max_tokens": -1,
    "stream": False  
}

response = requests.post(url, json=data)

# Check for errors
if response.status_code == 200:
    # Extract the assistant's response content
    assistant_response = response.json()['choices'][0]['message']['content']
    print("Assistant Response:", assistant_response)
else:
    print(f"Failed with status code {response.status_code}: {response.text}")

#------------------
# from PromptOps.perturb import Perturbation

# perturbation = Perturbation()

# # Test sentence for each function
# test_sentence = "The sky is blue today."

# # Test the logic function
# print("Logic function result:")
# logic_result = perturbation.logic(test_sentence)
# print(logic_result)

# # Test the fairness function
# print("\nFairness function result:")
# fairness_result = perturbation.fairness(test_sentence)
# print(fairness_result)

# # Test the temporal function
# print("\nTemporal function result:")
# temporal_result = perturbation.temporal(test_sentence)
# print(temporal_result)