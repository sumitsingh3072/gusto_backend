# api-gateway

Public entry point for the React SPA. Terminates TLS, validates JWTs issued by
auth-service, and routes to auth-service or orchestrator-service. Holds no
business logic and is not allowed to call the MCP Gateway, the AI Agent
Service, or Postgres directly.
