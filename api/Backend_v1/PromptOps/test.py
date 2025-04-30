# api/Backend_v1/PromptOps/test.py

from functools import wraps
import json
import random
import socket
import logging
import time
import litellm
import openai
import anthropic
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from api.utils.abort_handler import check_abort
import requests
import numpy as np
import threading

logger = logging.getLogger(__name__)
similarity_model = SentenceTransformer("all-distilroberta-v1")

# Global thread-safe provider request tracking
provider_locks = {
    'openai': threading.RLock(),
    'claude': threading.RLock(),
    'gemini': threading.RLock(),
    'lm_studio': threading.RLock(),
    'custom': threading.RLock(),
    'typhoon': threading.RLock(),
}

# Max pending requests before queuing
MAX_CONCURRENT_PER_PROVIDER = {
    'openai': 3,
    'claude': 2,
    'gemini': 3,
    'lm_studio': 5,
    'custom': 5,
    'typhoon': 3
}

# Track concurrent requests per provider
active_requests = {
    provider: 0 for provider in provider_locks
}


def robust_llm_retry(max_retries=5, initial_backoff=3.0, max_backoff=90.0):
    """
    Decorator providing robust retry logic for LLM API calls.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            backoff = initial_backoff

            # Preserve the original provider for callbacks
            provider = kwargs.get('provider', None)
            if not provider and args and hasattr(args[0], 'model_provider'):
                provider = args[0].model_provider

            for attempt in range(max_retries):
                try:
                    old_timeout = socket.getdefaulttimeout()
                    socket.setdefaulttimeout(60)
                    try:
                        return func(*args, **kwargs)
                    finally:
                        socket.setdefaulttimeout(old_timeout)
                except (requests.ConnectionError, requests.Timeout, socket.error, ConnectionRefusedError) as e:
                    last_exception = e
                    logger.warning(
                        f"Connection error on attempt {attempt+1}/{max_retries}: {str(e)}. Retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff = min(backoff * 1.5 * (1 + 0.1 *
                                  random.random()), max_backoff)
                except litellm.exceptions.RateLimitError as e:
                    last_exception = e
                    logger.warning(
                        f"Rate limit hit on attempt {attempt+1}: {str(e)}. Retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, max_backoff)
                except Exception as e:
                    last_exception = e
                    if attempt < min(2, max_retries - 1):
                        logger.warning(
                            f"Error on attempt {attempt+1}: {str(e)}. Retrying in {backoff:.1f}s...")
                        time.sleep(backoff)
                        backoff = min(backoff * 2, max_backoff)
                    else:
                        logger.error(
                            f"Error after {attempt+1} attempts: {str(e)}")
                        raise
            if isinstance(last_exception, (requests.ConnectionError, socket.error, ConnectionRefusedError)):
                error_message = f"Cannot connect to LLM API after {max_retries} attempts. Please verify the service is running."
                logger.error(error_message)
                raise ConnectionError(error_message) from last_exception
            raise last_exception
        return wrapper
    return decorator


def evaluate_response(text1, text2, model):
    """
    Evaluate similarity between two texts.
    """
    emb_a = model.encode([text1])
    emb_b = model.encode([text2])
    similarities = np.dot(emb_a, emb_b.T) / \
        (np.linalg.norm(emb_a) * np.linalg.norm(emb_b))
    return similarities.item()


class PromptCompletion:
    def __init__(self, model_provider, model, system_content, url, temperature=0, top_p=0, max_tokens=100, api_key=None, stream=False):
        self.model_provider = model_provider.lower()
        self.model = model
        self.system_content = system_content
        self.temperature = temperature
        self.top_p = top_p
        self.max_tokens = max_tokens
        self.api_key = api_key or None
        self.stream = stream
        self.url = url

        # Configure litellm with appropriate API keys
        self._configure_litellm()

        # Log current rate limit status
        self._log_rate_limit_status()

    def _configure_litellm(self):
        """Configure LiteLLM with the appropriate API keys and settings."""
        if self.model_provider == "openai":
            litellm.api_key = self.api_key or "dummy_openai_api_key"
        elif self.model_provider == "claude":
            litellm.api_key = self.api_key or "dummy_claude_api_key"
            litellm.api_base = "https://api.anthropic.com/v1"
        elif self.model_provider == "gemini":
            litellm.api_key = self.api_key or "dummy_gemini_api_key"
        # elif self.model_provider == "lm_studio":
        #     # For LM Studio, we do not use an API key.
        #     # We also expect the user to specify the URL when constructing this object.
        #     logger.info(
        #         "LM Studio selected. Ensure that the URL is provided by the user.")
        #     # Do not override or set litellm.api_key and do not set LM Studio base URL from env.
        # elif self.model_provider == "typhoon":
        #     # Custom configuration for Typhoon if needed.
        #     pass
        # elif self.model_provider == "custom":
        #     pass

    def _log_rate_limit_status(self):
        """Log current rate limit status for this provider"""
        try:
            from api.utils.model_rate_limits import MODEL_RATE_LIMITS

            limits = MODEL_RATE_LIMITS.get(self.model_provider, {})
            if isinstance(limits, dict):
                model_limit = limits.get(self.model, limits.get("default", 15))
            else:
                model_limit = limits

            logger.info(f"{self.model_provider} rate limit: {model_limit} RPM")
        except Exception as e:
            logger.warning(f"Error logging rate limit status: {e}")

    def _get_litellm_model_name(self):
        """Convert our model names to litellm format."""
        if self.model_provider == "openai":
            return f"openai/{self.model}"
        elif self.model_provider in ("claude", "anthropic"):
        # For Claude 3.5 models, we need to use the correct model string
            if "claude-3-5" in self.model:
                # Use the model name directly without the prefix for Claude 3.5 models
                return self.model
            else:
                # For older Claude models, use the anthropic/ prefix
                return f"anthropic/{self.model}"
        elif self.model_provider == "gemini":
            return f"gemini/{self.model}"
        elif self.model_provider == "typhoon":
            return f"typhoon/{self.model}"
        elif self.model_provider == "custom":
            return f"custom/{self.model}"
        elif self.model_provider == "lm_studio":
            # LM Studio models must be prefixed with "lm_studio/"
            return f"lm_studio/{self.model}"
        return self.model

    @robust_llm_retry(max_retries=5, initial_backoff=3.0, max_backoff=90.0)
    def generate_completion(self, prompt, batch=False, chain_of_thought=False):
        """
        Generate completion using LiteLLM for all providers.
        """
        try:
            # Format model name for litellm
            model_name = self._get_litellm_model_name()

            # Create messages in the format expected by LiteLLM
            messages = [
                {"role": "system", "content": self.system_content},
                {"role": "user", "content": prompt}
            ]

            # Make the completion request
            response = litellm.completion(
                model=model_name,
                messages=messages,
                temperature=self.temperature,
                top_p=self.top_p,
                max_tokens=self.max_tokens,
                stream=False  # No streaming support for simplicity
            )

            # Extract the response content
            response_content = response.choices[0].message.content
            return response_content

        except litellm.exceptions.RateLimitError as e:
            logger.warning(
                f"Rate limit error with {self.model_provider}: {str(e)}")
            raise Exception(
                f"Rate limit exceeded for {self.model_provider}: {str(e)}")

        except Exception as e:
            # Let the retry decorator handle other errors
            raise


class Test:
    def __init__(self, name, prompt, expected_result, description=None, perturb_method=None, perturb_text=None, capability=None, pass_condition="increase", test_type=None):
        self.name = name
        self.description = description
        self.prompt = prompt
        self.expected_result = expected_result
        self.perturb_method = perturb_method
        self.perturb_text = perturb_text
        self.capability = capability
        self.pass_condition = pass_condition
        self.test_type = test_type
        self.original_response = None
        self.perturb_response = None
        self.score_original = None
        self.score_perturb = None
        self.completion_model = None
        self.error = None

    def _make_api_call(self, text, max_retries=5):
        """
        Attempt to send the API call using LiteLLM via PromptCompletion.
        For rate limit errors, retry with backoff.
        """
        attempt = 0
        backoff_time = 3.0
        while True:
            try:
                response = self.completion_model.generate_completion(text)
                return response
            except Exception as e:
                error_message = str(e).lower()
                # Check if the error relates to rate limit or quota
                if any(phrase in error_message for phrase in ["rate limit", "quota", "capacity", "too many"]):
                    attempt += 1
                    jitter = random.uniform(0.5, 1.5)
                    wait_time = backoff_time * jitter

                    logger.warning(
                        f"Rate limit hit on attempt {attempt} for test {self.name}. "
                        f"Waiting {wait_time:.2f}s before retry.")

                    time.sleep(wait_time)

                    # Double the backoff for next attempt if needed
                    backoff_time = min(backoff_time * 2, 120.0)
                else:
                    # For non-rate limit errors, cap the number of retries
                    attempt += 1
                    if attempt >= max_retries:
                        logger.error(
                            f"Non rate-limit error after {max_retries} attempts for test {self.name}: {str(e)}")
                        return f"ERROR: {str(e)}"
                    else:
                        sleep_time = min(2.0 * attempt, 5.0)
                        logger.warning(
                            f"Error on attempt {attempt} for test {self.name}: {str(e)}. Waiting {sleep_time:.2f}s before retry.")
                        time.sleep(sleep_time)

    def run(self, completion_model: PromptCompletion):
        try:
            self.completion_model = completion_model
            logger.info(f"Running test: {self.name}")
            self.original_response = self._make_api_call(self.prompt)
            if isinstance(self.original_response, str) and self.original_response.startswith("ERROR:"):
                self.error = self.original_response
                self.score_original = 0
                return

            # Add delay between calls to respect rate limits
            provider = self.completion_model.model_provider.lower()
            # Simple delay based on provider - could use more sophisticated approach
            time.sleep(1.0)  # Base delay between calls

            if self.perturb_text:
                self.perturb_response = self._make_api_call(self.perturb_text)

            if self.original_response:
                self.score_original = evaluate_response(
                    self.original_response, self.expected_result, similarity_model)
            if self.perturb_response:
                self.score_perturb = evaluate_response(
                    self.perturb_response, self.expected_result, similarity_model)
        except Exception as e:
            logger.error(f"Error running test {self.name}: {str(e)}")
            self.error = str(e)
            self.original_response = f"ERROR: {str(e)}"
            if self.score_original is None:
                self.score_original = 0

    def summarize(self):
        fail = False
        if self.score_original is not None and self.score_perturb is not None:
            if self.pass_condition == "decrease":
                if self.score_perturb >= self.score_original:
                    fail = True
            elif self.pass_condition == "increase":
                if self.score_perturb < self.score_original:
                    fail = True
                if self.score_original < 0.8:
                    fail = True
        result = {
            'name': self.name,
            'description': self.description,
            'test_type': self.test_type,
            'prompt': self.prompt,
            'expected_result': self.expected_result,
            'perturb_text': self.perturb_text,
            'pass_condition': self.pass_condition,
            'response_original': self.original_response,
            'response_perturb': self.perturb_response,
            'score_original': self.score_original,
            'score_perturb': self.score_perturb,
            'fail': fail
        }
        if self.error:
            result['error'] = self.error
        return result
