# api/utils/model_factory.py
import logging
import signal
from contextlib import contextmanager
import litellm

from ..PromptOps.test import PromptCompletion

class TimeoutException(Exception):
    pass

@contextmanager
def timeout(seconds):
    def handler(signum, frame):
        raise TimeoutException(f"Operation timed out after {seconds} seconds")
    
    original_handler = signal.getsignal(signal.SIGALRM)
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(seconds)
    
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, original_handler)

def create_completion(
    model_provider=None,
    model=None,
    system_content=None,
    url=None,
    api_key=None,
    temperature=0,
    top_p=0,
    max_tokens=150,
    stream=False
):
    """
    Factory function to create PromptCompletion instances with standardized defaults.
    Now supports litellm for unified API access with timeouts.
    """
    try:
        # Set default URLs based on provider
        if (model_provider == "llama" or model_provider == "custom"):
            if not url or url == "undefined":
                url = "http://127.0.0.1:8000/v1/chat/completions"
        elif model_provider == "typhoon":
            # Always use the Typhoon cloud API for Typhoon models
            url = "https://api.opentyphoon.ai/v1"
        
        # Configure litellm global settings if needed
        configure_litellm_globals(model_provider, api_key)
        
        # Log model information
        logging.info(f"Creating completion for {model_provider}/{model} with litellm")
        
        with timeout(45):  # 45-second timeout for the entire creation process
            # Create and return the PromptCompletion instance
            completion = PromptCompletion(
                model_provider=model_provider,
                model=model,
                system_content=system_content,
                url=url,
                temperature=temperature,
                top_p=top_p,
                max_tokens=max_tokens,
                api_key=api_key,
                stream=stream
            )
            logging.info(f"Successfully created completion for {model_provider}/{model}")
            return completion
            
    except TimeoutException as e:
        logging.error(f"Timeout creating completion instance: {e}")
        raise Exception(f"Model creation timed out: {str(e)}")
    except Exception as e:
        logging.error(f"Error creating completion instance: {e}", exc_info=True)
        raise Exception(f"Failed to initialize model: {str(e)}")

def configure_litellm_globals(model_provider, api_key=None):
    """Configure global litellm settings based on the provider."""
    try:
        # Set global litellm configurations as needed
        litellm.verbose = False  # Set to True for debugging
        litellm.request_timeout = 30
        litellm.num_retries = 3
        
        # Add any provider-specific global configurations
        if model_provider == "openai" and api_key:
            litellm.api_key = api_key
        elif model_provider == "claude" and api_key:
            litellm.api_key = api_key
        elif model_provider == "gemini" and api_key:
            litellm.api_key = api_key
    except Exception as e:
        logging.warning(f"Error configuring litellm globals: {str(e)}")