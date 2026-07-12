from src.scout.state import ScoutGraphState, TaggedItem
from src.config import settings

def budget_filter_node(state: ScoutGraphState) -> dict:
    """Deterministic: annotate items with budget fitness. No LLM call."""
    tagged = state["tagged_items"]
    budget = state.get("weekly_budget")

    if not budget:
        # No budget constraint — pass through unchanged
        return {"budget_filtered": tagged}

    remaining = budget.total_amount - budget.spent_so_far
    per_meal = remaining / budget.meals_remaining if budget.meals_remaining > 0 else 0

    # Also enforce Swiggy cart cap
    cap = min(per_meal, settings.swiggy_cart_cap)

    filtered: list[TaggedItem] = []
    for item in tagged:
        # Add budget metadata to tags
        enriched = dict(item)
        if item["price"] <= cap:
            enriched["tags"] = item["tags"] + ["within-budget"]
        elif item["price"] <= cap * 1.3 and item["price"] < settings.swiggy_cart_cap:
            enriched["tags"] = item["tags"] + ["slightly-over-budget"]
        else:
            enriched["tags"] = item["tags"] + ["over-budget"]
        filtered.append(enriched)

    return {"budget_filtered": filtered}
