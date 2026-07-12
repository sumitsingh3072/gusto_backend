from src.scout.schemas import ScoutAnalysisRequest, WeeklyBudget, PreferenceProfile, MenuItem
import json

def test_camel_case_roundtrip():
    data = {
        "preferenceProfile": {
            "diet": "veg",
            "spiceLevel": 3,
            "cuisineFavorites": ["north-indian"],
            "nutritionTags": []
        },
        "menuItems": [
            {
                "itemId": "123",
                "restaurantId": "r1",
                "name": "Paneer",
                "price": 200.0
            }
        ],
        "weeklyBudget": {
            "totalAmount": 1000.0,
            "spentSoFar": 200.0,
            "mealsRemaining": 5,
            "dailyAvgLimit": 200.0
        }
    }

    req = ScoutAnalysisRequest.model_validate(data)
    assert req.preference_profile.diet == "veg"
    assert req.preference_profile.spice_level == 3
    assert req.weekly_budget is not None
    assert req.weekly_budget.total_amount == 1000.0

    dumped = req.model_dump(by_alias=True)
    assert "weeklyBudget" in dumped
    assert dumped["weeklyBudget"]["totalAmount"] == 1000.0
