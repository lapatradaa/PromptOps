
# import openai
# import requests
# import os
# import google.generativeai as genai
# from utils import set_openai_api_key, set_gemini_api_key
# import anthropic

# url = "http://127.0.0.1:8000/v1/chat/completions"  # Default LMStudio endpoint

# class PromptCompletion:
#     def __init__(self, 
#                  model_provider="openai",  # Can be 'openai', 'gemini', 'claude', or 'llama'
#                  model="gpt-3.5-turbo",     
#                  system_content="""You will act as a Question Answering model.""",
#                  temperature=0, 
#                  top_p=0, 
#                  max_tokens=100,
#                  api_key=None,
#                  stream=False,
#                  llama_url=url):
#         """
#         Initialize the PromptCompletion class with default parameters.

#         Parameters:
#         model_provider (str): The provider to use ('openai', 'gemini', 'claude', or 'llama').
#         model (str): The model to use for generating responses.
#         system_content (str): The system message that sets the context and format for the completions.
#         temperature (float): Sampling temperature for the model.
#         top_p (float): Nucleus sampling parameter.
#         max_tokens (int): Maximum number of tokens in the response.
#         api_key (str): The API key to use for the provider, if required.
#         stream (bool): Whether to stream responses (Llama only).
#         llama_url (str): The URL for the Llama model if using LMStudio.
#         """
#         self.model_provider = model_provider
#         self.model = model
#         self.system_content = system_content
#         self.temperature = temperature
#         self.top_p = top_p
#         self.max_tokens = max_tokens
#         self.api_key = api_key
#         self.stream = stream
#         self.llama_url = llama_url

#         if self.model_provider == "openai":
#             # Set the OpenAI API key using the utility function
#             if api_key:
#                 openai.api_key = self.api_key
#             else:
#                 raise ValueError("OpenAI API key is required.")   # Fetch from env if not provided

#         elif self.model_provider == "claude":
#             if not api_key:
#                 raise ValueError("Claude API key is required.")
#             self.client = anthropic.Anthropic(api_key=api_key)  # Initialize the Claude client

#         elif self.model_provider == "gemini":
#             if not api_key:
#                 raise ValueError("Gemini API key is required.")
#             genai.configure(api_key=api_key)  # Configure the Gemini API with the provided key

#         elif self.model_provider == "llama":
#             # No special API key needed for llama, but make sure the Llama server is running.
#             if not llama_url:
#                 raise ValueError("Llama URL is required.")

#         else:
#             raise ValueError(f"Unknown model provider: {self.model_provider}")

#     def generate_completion(self, prompt, batch=False, chain_of_thought=False):
#         """
#         Generate a completion for a given prompt using the set model and provider.
        
#         Parameters:
#         prompt (str): The input prompt for generating completion.
#         batch (bool): Whether to send multiple prompts in a batch (for Claude).
#         chain_of_thought (bool): Whether to generate a Chain of Thought (CoT) response.

#         Returns:
#         str: The completion text.
#         """

#         if self.model_provider == "openai":
#             """
#             Generate a completion using OpenAI models.
#             """
#             response = openai.ChatCompletion.create(
#                 model=self.model,
#                 messages=[
#                     {"role": "system", "content": self.system_content},
#                     {"role": "user", "content": prompt}
#                 ],
#                 temperature=self.temperature,
#                 top_p=self.top_p,
#                 max_tokens=self.max_tokens
#             )
#             response_content = response.choices[0].message['content'].strip()
#             return response_content

#         elif self.model_provider == "claude":
#             """
#             Generate a completion using Claude's Messages API.
#             """
#             formatted_prompt = f"\n\nHuman: {prompt}\n\nAssistant:"
#             response = self.client.completions.create(
#                 model=self.model,
#                 max_tokens_to_sample=self.max_tokens,
#                 temperature=self.temperature,
#                 prompt=formatted_prompt
#             )
#             return response.completion

#         elif self.model_provider == "gemini":
#             """
#             Generate a completion using Gemini's API.
#             """
#             model = genai.GenerativeModel(
#                 model_name=self.model,
#                 system_instruction=self.system_content)
#             response = model.generate_content(prompt)
#             return response.text
        
#         elif self.model_provider == "llama":
#             """
#             Generate a completion using a Llama model hosted on LMStudio.
#             """
#             data = {
#                 "model": self.model,
#                 "messages": [
#                     {"role": "system", "content": self.system_content},
#                     {"role": "user", "content": prompt}
#                 ],
#                 "temperature": self.temperature,
#                 "max_tokens": self.max_tokens,
#                 "stream": self.stream
#             }

#             response = requests.post(self.llama_url, json=data)

#             if response.status_code == 200:
#                 # Extract the assistant's response content
#                 assistant_response = response.json()['choices'][0]['message']['content']
#                 return assistant_response
#             else:
#                 return (f"Failed with status code {response.status_code}: {response.text}")

#         else:
#             raise ValueError(f"Model provider {self.model_provider} is not supported.")




