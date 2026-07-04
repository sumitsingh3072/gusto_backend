# ai-agent-service

The ONLY Python component in Gusto. FastAPI + LangGraph/CrewAI-style
reasoning, exposing a single endpoint: `POST /ai/scout/analyze`.

Boundary rules (enforced by omission, not just convention):
- No database connection of any kind.
- No MCP Gateway client, no Swiggy access.
- No order placement, no payment authority.
- Called only by orchestrator-service.

Any new LLM-powered capability belongs here (or in an equally narrow new
Python service) -- never bolted onto a Node service.
