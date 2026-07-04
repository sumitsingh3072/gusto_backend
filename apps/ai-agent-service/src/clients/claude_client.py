import os

from anthropic import Anthropic


class ClaudeClient:
    """Thin wrapper around the Claude API. The only outbound network
    dependency of ai-agent-service besides its own health checks."""

    def __init__(self) -> None:
        self._client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

    def complete(self, system_prompt: str, user_content: str) -> str:
        raise NotImplementedError("not implemented in scaffold")
