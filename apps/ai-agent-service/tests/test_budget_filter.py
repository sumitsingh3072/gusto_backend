from src.scout.state import ScoutGraphState
from src.scout.nodes.budget_filter import budget_filter_node
from src.scout.schemas import WeeklyBudget

def test_budget_filter_tags_items_correctly():
    tagged_items = [
        {"item_id": "1", "name": "Cheap Item", "price": 150.0, "description": "", "tags": ["veg"]},
        {"item_id": "2", "name": "OK Item", "price": 250.0, "description": "", "tags": ["veg"]},
        {"item_id": "3", "name": "Expensive Item", "price": 350.0, "description": "", "tags": ["veg"]}
    ]
    budget = WeeklyBudget(
        total_amount=1000.0,
        spent_so_far=400.0,
        meals_remaining=3,
        daily_avg_limit=200.0
    ) # remaining = 600, per_meal = 200. cap = 200.
    
    state = ScoutGraphState(
        preference_profile=None,
        menu_items=None,
        weekly_budget=budget,
        tagged_items=tagged_items,
        budget_filtered=[],
        ranked_items=[]
    )
    
    result = budget_filter_node(state)
    filtered = result["budget_filtered"]
    assert len(filtered) == 3
    
    # Cheap is <= 200
    assert "within-budget" in filtered[0]["tags"]
    # OK is <= 260 (200 * 1.3)
    assert "slightly-over-budget" in filtered[1]["tags"]
    # Expensive > 260
    assert "over-budget" in filtered[2]["tags"]

def test_budget_filter_enforces_1000_cap():
    tagged_items = [
        {"item_id": "1", "name": "Very Expensive Item", "price": 1200.0, "description": "", "tags": ["veg"]}
    ]
    budget = WeeklyBudget(
        total_amount=10000.0,
        spent_so_far=0.0,
        meals_remaining=2,
        daily_avg_limit=5000.0
    ) # remaining = 10000, per_meal = 5000. cap = 1000.
    
    state = ScoutGraphState(
        preference_profile=None,
        menu_items=None,
        weekly_budget=budget,
        tagged_items=tagged_items,
        budget_filtered=[],
        ranked_items=[]
    )
    
    result = budget_filter_node(state)
    filtered = result["budget_filtered"]
    assert "over-budget" in filtered[0]["tags"]
