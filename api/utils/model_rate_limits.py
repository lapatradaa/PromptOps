# api/utils/model_rate_limits.py
"""
Rate limits for specific models.
Updated with conservative values for testing.
These limits are used both for our own rate limiting and to configure litellm.
"""

MODEL_RATE_LIMITS = {
    "openai": {
        "gpt-4o": 50,  # Adjusted RPM for testing
        "gpt-4-turbo": 40,
        "gpt-4": 30,
        "gpt-3.5-turbo": 60,
        "default": 30
    },
    "claude": {
        "claude-3-7-sonnet-20250219": 30,
        "claude-3-5-sonnet-20241022": 30,
        "claude-3-5-haiku-20241022": 50,
        "default": 25
    },
    "anthropic": {  # Adding this for litellm compatibility
        "claude-3-7-sonnet-20250219": 30,
        "claude-3-5-sonnet-20241022": 30,
        "claude-3-5-haiku-20241022": 50,
        "default": 25
    },
    "gemini": {
        "gemini-2.0-flash": 30,
        "gemini-1.5-pro": 20,
        "gemini-1.5-flash": 25,
        "default": 20
    },
    "llama": {
        "llama-3.2-3b-instruct": 60,
        "default": 60
    },
    "typhoon": {
        "typhoon-v2-8b-instruct": 30,
        "typhoon-v2-70b-instruct": 20,
        "default": 20
    },
    "custom": {
        "default": 15
    },
    "default": 15  # Global fallback for unspecified providers.
}


def get_rate_limit(provider, model=None):
    """
    Retrieve the rate limit (in requests per minute) for the given provider and model.

    Args:
        provider (str): Provider name (e.g., 'openai', 'claude').
        model (str, optional): Model name.

    Returns:
        int: The allowed number of requests per minute.
    """
    provider = provider.lower() if provider else "default"

    # Handle aliases (e.g., 'anthropic' and 'claude' should use the same limits)
    if provider == "anthropic":
        provider = "claude"

    provider_limits = MODEL_RATE_LIMITS.get(provider, {})

    if isinstance(provider_limits, dict):
        if model and model in provider_limits:
            return provider_limits[model]
        return provider_limits.get("default", MODEL_RATE_LIMITS.get("default", 15))

    return provider_limits


def configure_litellm_rate_limits():
    """
    Configure litellm rate limits based on our MODEL_RATE_LIMITS settings.
    This creates a configuration that can be used with litellm's rate limiting.

    Returns:
        dict: A rate limit configuration dictionary for litellm
    """
    import litellm

    litellm_config = {}

    # Transform our rate limits to litellm format
    for provider, models in MODEL_RATE_LIMITS.items():
        if isinstance(models, dict):
            for model, rpm in models.items():
                if model != "default":
                    # Format used by litellm: provider/model
                    model_key = f"{provider}/{model}"
                    litellm_config[model_key] = {"rpm": rpm}
        else:
            # Provider has a simple RPM limit
            litellm_config[provider] = {"rpm": models}

    return litellm_config
