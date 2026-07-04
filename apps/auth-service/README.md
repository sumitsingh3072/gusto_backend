# auth-service

Owns OAuth 2.1 + PKCE with Swiggy, JWT issuance/validation, and encrypted
storage of the Swiggy MCP access token (`users.encrypted_mcp_token`). Owns the
`auth` Postgres schema exclusively via its own Prisma client.

Publishes: `UserAuthenticated`
Called by: api-gateway
