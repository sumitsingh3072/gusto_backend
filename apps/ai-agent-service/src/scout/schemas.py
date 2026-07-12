from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from typing import Literal

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

class PreferenceProfile(CamelModel):
    diet: Literal["veg", "non-veg", "eggetarian", "vegan"]
    spice_level: Literal[1, 2, 3, 4, 5]
    cuisine_favorites: list[str]
    nutrition_tags: list[str] = []

class MenuItem(CamelModel):
    item_id: str
    restaurant_id: str
    name: str
    price: float
    description: str | None = None

class WeeklyBudget(CamelModel):
    total_amount: float
    spent_so_far: float
    meals_remaining: int
    daily_avg_limit: float

class ScoutAnalysisRequest(CamelModel):
    preference_profile: PreferenceProfile
    menu_items: list[MenuItem]
    weekly_budget: WeeklyBudget | None = None

class RankedMenuItem(CamelModel):
    item_id: str
    semantic_tags: list[str]
    match_score: float = Field(ge=0.0, le=1.0)

class ScoutAnalysisResponse(CamelModel):
    ranked_items: list[RankedMenuItem]
