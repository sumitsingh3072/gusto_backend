from fastapi import FastAPI
from src.scout.schemas import ScoutAnalysisRequest, ScoutAnalysisResponse
from src.scout.agent import ScoutAgent

app = FastAPI(title="Gusto AI Agent Service")
scout_agent = ScoutAgent()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ai/scout/analyze", response_model=ScoutAnalysisResponse)
def analyze(request: ScoutAnalysisRequest) -> ScoutAnalysisResponse:
    """
    The ONE endpoint this entire service exposes, called only by
    orchestrator-service. Stateless: no database connection, no MCP Gateway
    call, no Swiggy access, no order/payment authority. Input in, ranked
    recommendations out.
    """
    return scout_agent.analyze(request)
