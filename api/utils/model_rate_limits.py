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
