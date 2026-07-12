from langchain_anthropic import ChatAnthropic
from src.config import settings
from src.scout.prompts import RANKER_SYSTEM_PROMPT
from src.scout.state import ScoutGraphState
from src.scout.schemas import RankedMenuItem
import json

llm = ChatAnthropic(
    model=settings.claude_model,
    max_tokens=settings.claude_max_tokens,
    temperature=settings.claude_temperature,
)

def ranker_node(state: ScoutGraphState) -> dict:
    """Claude call: score tagged+budget-filtered items against profile."""
    profile = state["preference_profile"]

    user_content = json.dumps({
        "profile": {
            "diet": profile.diet,
            "spiceLevel": profile.spice_level,
            "cuisineFavorites": profile.cuisine_favorites,
            "nutritionTags": profile.nutrition_tags,
        },
        "taggedItems": state["budget_filtered"],
    })

    response = llm.invoke([
        {"role": "system", "content": RANKER_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ])

    parsed = json.loads(response.content)
    ranked = [RankedMenuItem.model_validate(r) for r in parsed["rankedItems"]]
    ranked.sort(key=lambda x: x.match_score, reverse=True)

    return {"ranked_items": ranked}
