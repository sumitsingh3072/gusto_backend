from langchain_anthropic import ChatAnthropic
from src.config import settings
from src.scout.prompts import TAGGER_SYSTEM_PROMPT
from src.scout.state import ScoutGraphState
import json

llm = ChatAnthropic(
    model=settings.claude_model,
    max_tokens=settings.claude_max_tokens,
    temperature=settings.claude_temperature,
)

def tagger_node(state: ScoutGraphState) -> dict:
    """Claude call: tag each menu item with semantic attributes."""
    items_payload = [
        {"itemId": m.item_id, "name": m.name, "price": m.price,
         "description": m.description or ""}
        for m in state["menu_items"]
    ]

    response = llm.invoke([
        {"role": "system", "content": TAGGER_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps({"items": items_payload})},
    ])

    parsed = json.loads(response.content)
    return {"tagged_items": parsed["taggedItems"]}
