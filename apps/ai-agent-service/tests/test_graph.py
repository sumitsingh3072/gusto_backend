import json
from src.scout.agent import ScoutAgent
from src.scout.schemas import ScoutAnalysisRequest
from langchain_core.messages import AIMessage

def test_full_graph_integration(mock_claude_client, sample_preference_profile, sample_menu_items, sample_weekly_budget):
    # Setup mock responses
    # Tagger response
    mock_claude_client.responses.append(AIMessage(content=json.dumps({
        "taggedItems": [
            {"item_id": "1", "name": "Paneer Tikka", "price": 249.0, "description": "", "tags": ["veg", "north-indian"]},
            {"item_id": "2", "name": "Chicken Biryani", "price": 349.0, "description": "", "tags": ["non-veg", "chicken"]},
            {"item_id": "3", "name": "Dal Makhani", "price": 199.0, "description": "", "tags": ["veg", "north-indian"]}
        ]
    })))
    
    # Ranker response
    mock_claude_client.responses.append(AIMessage(content=json.dumps({
        "rankedItems": [
            {"itemId": "1", "semanticTags": ["veg", "north-indian", "within-budget"], "matchScore": 0.9},
            {"itemId": "2", "semanticTags": ["non-veg", "chicken", "within-budget"], "matchScore": 0.8}, # LLM mistake
            {"itemId": "3", "semanticTags": ["veg", "north-indian", "within-budget"], "matchScore": 0.85}
        ]
    })))

    agent = ScoutAgent()
    request = ScoutAnalysisRequest(
        preference_profile=sample_preference_profile,
        menu_items=sample_menu_items,
        weekly_budget=sample_weekly_budget
    )
    
    response = agent.analyze(request)
    ranked = response.ranked_items
    
    # Check Diet Guard worked
    assert ranked[0].item_id == "1"
    assert ranked[0].match_score == 0.9
    assert ranked[1].item_id == "3"
    assert ranked[1].match_score == 0.85
    assert ranked[2].item_id == "2"
    assert ranked[2].match_score == 0.0 # Zeroed out
