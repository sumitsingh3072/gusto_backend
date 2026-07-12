from src.scout.state import ScoutGraphState
from src.scout.schemas import RankedMenuItem

# Known non-veg indicators for defense-in-depth
NON_VEG_TAGS = {"non-veg", "meat", "chicken", "mutton", "fish", "seafood", "prawn"}
DAIRY_TAGS = {"dairy", "paneer", "curd", "cheese", "cream", "ghee", "butter"}
EGG_TAGS = {"egg"}

def diet_guard_node(state: ScoutGraphState) -> dict:
    """Deterministic: zero-score items that violate diet. Last line of defense."""
    diet = state["preference_profile"].diet
    items = state["ranked_items"]

    if diet == "non-veg":
        return {"ranked_items": items}  # No restrictions

    guarded: list[RankedMenuItem] = []
    for item in items:
        tags = {t.lower() for t in item.semantic_tags}

        should_zero = False
        if diet == "veg" and tags & NON_VEG_TAGS:
            should_zero = True
        elif diet == "vegan" and tags & (NON_VEG_TAGS | DAIRY_TAGS | EGG_TAGS):
            should_zero = True
        elif diet == "eggetarian" and tags & (NON_VEG_TAGS - EGG_TAGS):
            should_zero = True

        if should_zero:
            item = RankedMenuItem(
                item_id=item.item_id,
                semantic_tags=item.semantic_tags,
                match_score=0.0,
            )
        guarded.append(item)

    guarded.sort(key=lambda x: x.match_score, reverse=True)
    return {"ranked_items": guarded}
