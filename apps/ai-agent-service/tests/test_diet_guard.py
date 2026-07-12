from src.scout.state import ScoutGraphState
from src.scout.nodes.diet_guard import diet_guard_node
from src.scout.schemas import PreferenceProfile, RankedMenuItem

def test_diet_guard_veg():
    profile = PreferenceProfile(diet="veg", spice_level=3, cuisine_favorites=[])
    items = [
        RankedMenuItem(item_id="1", semantic_tags=["veg", "north-indian"], match_score=0.9),
        RankedMenuItem(item_id="2", semantic_tags=["non-veg", "chicken"], match_score=0.8),
    ]
    state = ScoutGraphState(
        preference_profile=profile,
        menu_items=None,
        weekly_budget=None,
        tagged_items=[],
        budget_filtered=[],
        ranked_items=items
    )
    
    result = diet_guard_node(state)
    ranked = result["ranked_items"]
    # Sorted by score descending
    assert ranked[0].item_id == "1"
    assert ranked[0].match_score == 0.9
    assert ranked[1].item_id == "2"
    assert ranked[1].match_score == 0.0

def test_diet_guard_vegan():
    profile = PreferenceProfile(diet="vegan", spice_level=3, cuisine_favorites=[])
    items = [
        RankedMenuItem(item_id="1", semantic_tags=["veg"], match_score=0.9),
        RankedMenuItem(item_id="2", semantic_tags=["veg", "dairy", "paneer"], match_score=0.8),
    ]
    state = ScoutGraphState(
        preference_profile=profile,
        menu_items=None,
        weekly_budget=None,
        tagged_items=[],
        budget_filtered=[],
        ranked_items=items
    )
    
    result = diet_guard_node(state)
    ranked = result["ranked_items"]
    assert ranked[0].item_id == "1"
    assert ranked[0].match_score == 0.9
    assert ranked[1].item_id == "2"
    assert ranked[1].match_score == 0.0
