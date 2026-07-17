// Deterministic stand-in for ai-agent-service's POST /ai/scout/analyze,
// used only for Phase 2 chain-run testing (orchestrator/scheduler e2e
// loops) so tests don't burn real Anthropic credits and stay reproducible.
// Contract: packages/contracts/src/dto/ScoutAnalysisRequest.ts
//
// Ranking rule: cheapest item first (matchScore descending from 0.9),
// deterministic given the same menuItems input - lets
// selectNextCandidate()'s SWAP-exhaustion logic be driven predictably.

const http = require("node:http");

const PORT = Number(process.env.PORT ?? 8001);

function rank(menuItems) {
  const sorted = [...menuItems].sort((a, b) => a.price - b.price);
  return sorted.map((item, idx) => ({
    itemId: item.itemId,
    semanticTags: ["stub-ranked"],
    matchScore: Math.max(0.1, 0.9 - idx * 0.1),
  }));
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.method === "POST" && req.url === "/ai/scout/analyze") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: "Invalid JSON body" }));
        return;
      }

      const menuItems = Array.isArray(parsed.menuItems) ? parsed.menuItems : [];
      const rankedItems = rank(menuItems);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ rankedItems }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ detail: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`stub-ai-agent-service listening on :${PORT}`);
});
