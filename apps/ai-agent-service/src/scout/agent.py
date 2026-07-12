import logging
from fastapi import HTTPException
from src.config import settings
from src.scout.graph import build_scout_graph
from src.scout.schemas import ScoutAnalysisRequest, ScoutAnalysisResponse

logger = logging.getLogger("scout")

class ScoutAgent:
    """LangGraph-powered semantic menu ranker."""

    def __init__(self) -> None:
        self.graph = build_scout_graph()

    def analyze(self, request: ScoutAnalysisRequest) -> ScoutAnalysisResponse:
        if len(request.menu_items) > settings.max_menu_items_per_batch:
            raise HTTPException(
                status_code=400,
                detail=f"Max {settings.max_menu_items_per_batch} items per batch",
            )

        initial_state = {
            "preference_profile": request.preference_profile,
            "menu_items": request.menu_items,
            "weekly_budget": request.weekly_budget,
            "tagged_items": [],
            "budget_filtered": [],
            "ranked_items": [],
        }

        result = self.graph.invoke(initial_state)
        return ScoutAnalysisResponse(ranked_items=result["ranked_items"])
