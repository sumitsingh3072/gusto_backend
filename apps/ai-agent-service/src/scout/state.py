from typing import TypedDict
from src.scout.schemas import (
    PreferenceProfile, MenuItem, WeeklyBudget, RankedMenuItem,
)

class TaggedItem(TypedDict):
    item_id: str
    name: str
    price: float
    description: str
    tags: list[str]

class ScoutGraphState(TypedDict):
    # Inputs (set once, read by all nodes)
    preference_profile: PreferenceProfile
    menu_items: list[MenuItem]
    weekly_budget: WeeklyBudget | None

    # Intermediate (set by nodes)
    tagged_items: list[TaggedItem]        # After TAGGER
    budget_filtered: list[TaggedItem]     # After BUDGET_FILTER
    ranked_items: list[RankedMenuItem]    # After RANKER (final)
