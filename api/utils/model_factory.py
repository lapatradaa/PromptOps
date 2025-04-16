# api/utils/model_factory.py
import logging
from ..Backend_v1.PromptOps.test import PromptCompletion

# Import litellm for configuration
import litellm


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
    Now supports litellm for unified API access.
    """
    # Set default URLs based on provider
    if (model_provider == "llama" or model_provider == "custom"):
        if not url or url == "undefined":
            url = "http://127.0.0.1:8000/v1/chat/completions"
    elif model_provider == "typhoon":
        # Always use the Typhoon cloud API for Typhoon models
        url = "https://api.opentyphoon.ai/v1"

    # Configure litellm global settings if needed
    _configure_litellm_globals(model_provider, api_key)

    # Log model information
    logging.info(
        f"Creating completion for {model_provider}/{model} with litellm")
    
    # Create and return the PromptCompletion instance
    return PromptCompletion(
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


def _configure_litellm_globals(model_provider, api_key=None):
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
