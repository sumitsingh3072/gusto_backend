from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.scout.schemas import ScoutAnalysisRequest, ScoutAnalysisResponse
from src.scout.agent import ScoutAgent
import logging, json

logging.basicConfig(level="INFO")
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

@app.exception_handler(json.JSONDecodeError)
async def json_parse_error(request: Request, exc: json.JSONDecodeError):
    """Claude returned malformed JSON — treat as upstream failure."""
    return JSONResponse(status_code=502, content={"error": "LLM returned unparseable output"})

@app.exception_handler(Exception)
async def catch_all(request: Request, exc: Exception):
    logging.error("Unhandled error in Scout", exc_info=exc)
    return JSONResponse(status_code=500, content={"error": "Internal Scout error"})
