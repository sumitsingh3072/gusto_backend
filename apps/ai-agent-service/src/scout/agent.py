from src.clients.claude_client import ClaudeClient
from src.scout.prompts import SCOUT_SYSTEM_PROMPT
from src.scout.schemas import ScoutAnalysisRequest, ScoutAnalysisResponse


class ScoutAgent:
    """
    Semantic menu-to-preference matcher (e.g. recognizing "Paneer Lababdar"
    satisfies a "High Protein" tag). Built with LangGraph/CrewAI-style
    reasoning but exposed to the rest of the system through exactly one
    plain HTTP call -- everything else about how this agent reasons
    internally is free to evolve without touching any Node service.
    """

    def __init__(self) -> None:
        self.claude = ClaudeClient()

    def analyze(self, request: ScoutAnalysisRequest) -> ScoutAnalysisResponse:
        raise NotImplementedError("not implemented in scaffold")
