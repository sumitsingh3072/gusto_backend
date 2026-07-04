# mcp-gateway-service

The single choke point between Gusto and Swiggy. Every call to any of
Swiggy's three MCP servers passes through here. No other service --
including ai-agent-service -- is allowed to call Swiggy directly. Stateless;
caches menu/coupon reads in Redis. Does not store Swiggy tokens (asks
auth-service for one per call).

Exposes: POST /mcp/food/:tool (14 tools, active), POST /mcp/instamart/:tool
(13 tools, reserved), POST /mcp/dineout/:tool (8 tools, reserved)
Calls: Swiggy Food MCP, auth-service (token retrieval)
