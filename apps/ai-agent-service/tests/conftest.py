import pytest
from src.scout.schemas import PreferenceProfile, MenuItem, WeeklyBudget
from langchain_core.messages import AIMessage

@pytest.fixture
def sample_preference_profile():
    return PreferenceProfile(
        diet="veg",
        spice_level=3,
        cuisine_favorites=["north-indian"],
        nutrition_tags=["high-protein"]
    )

@pytest.fixture
def sample_menu_items():
    return [
        MenuItem(item_id="1", restaurant_id="r1", name="Paneer Tikka", price=249.0),
        MenuItem(item_id="2", restaurant_id="r1", name="Chicken Biryani", price=349.0),
        MenuItem(item_id="3", restaurant_id="r1", name="Dal Makhani", price=199.0)
    ]

@pytest.fixture
def sample_weekly_budget():
    return WeeklyBudget(
        total_amount=3500.0,
        spent_so_far=2800.0,
        meals_remaining=3,
        daily_avg_limit=500.0
    )

class MockChatAnthropic:
    def __init__(self, **kwargs):
        self.responses = []

    def invoke(self, messages):
        return self.responses.pop(0) if self.responses else AIMessage(content="{}")

@pytest.fixture
def mock_claude_client(monkeypatch):
    mock = MockChatAnthropic()
    # We patch the instantiated `llm` in the modules that use it
    import src.scout.nodes.tagger as tagger
    import src.scout.nodes.ranker as ranker
    monkeypatch.setattr(tagger, "llm", mock)
    monkeypatch.setattr(ranker, "llm", mock)
    return mock
