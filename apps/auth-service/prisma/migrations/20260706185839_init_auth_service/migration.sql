-- CreateTable
CREATE TABLE "auth"."users" (
    "id" TEXT NOT NULL,
    "pref_profile" JSONB NOT NULL,
    "encrypted_mcp_token" TEXT,
    "mcp_token_expires_at" TIMESTAMP(3),
    "mcp_token_scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."pending_auth_sessions" (
    "state" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_verifier" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_auth_sessions_pkey" PRIMARY KEY ("state")
);
