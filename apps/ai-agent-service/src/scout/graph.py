from langgraph.graph import StateGraph, END
from src.scout.state import ScoutGraphState
from src.scout.nodes.tagger import tagger_node
from src.scout.nodes.budget_filter import budget_filter_node
from src.scout.nodes.ranker import ranker_node
from src.scout.nodes.diet_guard import diet_guard_node

def build_scout_graph() -> StateGraph:
    graph = StateGraph(ScoutGraphState)

    graph.add_node("tagger", tagger_node)
    graph.add_node("budget_filter", budget_filter_node)
    graph.add_node("ranker", ranker_node)
    graph.add_node("diet_guard", diet_guard_node)

    graph.set_entry_point("tagger")
    graph.add_edge("tagger", "budget_filter")
    graph.add_edge("budget_filter", "ranker")
    graph.add_edge("ranker", "diet_guard")
    graph.add_edge("diet_guard", END)

    return graph.compile()
