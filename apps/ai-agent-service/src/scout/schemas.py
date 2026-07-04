from pydantic import BaseModel


class PreferenceProfile(BaseModel):
    diet: str
    spice_level: int
    cuisine_favorites: list[str]
    nutrition_tags: list[str] = []


class MenuItem(BaseModel):
    item_id: str
    restaurant_id: str
    name: str
    price: float
    description: str | None = None


class ScoutAnalysisRequest(BaseModel):
    preference_profile: PreferenceProfile
    menu_items: list[MenuItem]


class RankedMenuItem(BaseModel):
    item_id: str
    semantic_tags: list[str]
    match_score: float


class ScoutAnalysisResponse(BaseModel):
    ranked_items: list[RankedMenuItem]
