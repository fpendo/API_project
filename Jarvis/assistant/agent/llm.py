"""Provider-agnostic LLM client using litellm.

litellm speaks OpenAI, Anthropic (Claude), Google Gemini, and 100+ other
providers with the same interface. Switching providers is a .env change:

  OpenAI:     LLM_PROVIDER=openai     LLM_MODEL=gpt-5-nano
  Anthropic:  LLM_PROVIDER=anthropic  LLM_MODEL=claude-3-5-haiku-20241022
  Gemini:     LLM_PROVIDER=gemini     LLM_MODEL=gemini/gemini-2.5-flash-lite

litellm reads provider API keys from the standard env vars automatically
(ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, etc.) so they never
need to be passed explicitly in code.
"""

from __future__ import annotations

import os

import litellm

from assistant.core.config import Config


def _set_api_keys(config: Config) -> None:
    """Ensure litellm can find the right key regardless of how it was named in .env."""
    provider = config.llm_provider.lower()
    key = config.llm_api_key

    if not key:
        return

    if provider == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        os.environ["ANTHROPIC_API_KEY"] = key
    elif provider == "openai" and not os.environ.get("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = key
    elif provider == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        os.environ["GEMINI_API_KEY"] = key


def resolve_model(config: Config) -> str:
    """Return the litellm model string, e.g. 'claude-3-5-haiku-20241022'."""
    model = config.llm_model
    provider = config.llm_provider.lower()

    # If the model name already has a provider prefix (e.g. 'anthropic/...',
    # 'gemini/...'), use it as-is.
    if "/" in model:
        return model

    # litellm requires a provider prefix for non-OpenAI providers.
    if provider == "anthropic":
        return f"anthropic/{model}"
    if provider == "gemini":
        return f"gemini/{model}"

    return model


def completion(config: Config, messages: list[dict], tools: list[dict] | None = None) -> object:
    """Call the configured LLM and return a litellm ModelResponse."""
    _set_api_keys(config)
    model = resolve_model(config)

    kwargs: dict = {
        "model": model,
        "messages": messages,
    }
    if tools:
        kwargs["tools"] = tools

    return litellm.completion(**kwargs)
