-- CreateTable
CREATE TABLE "orchestrator"."workflow_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_date" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL,
    "address_id" TEXT,
    "restaurant_id" TEXT,
    "shortlist" JSONB,
    "optimized_cart" JSONB,
    "rejected_item_ids" JSONB,
    "decision" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_state_user_id_cycle_date_key" ON "orchestrator"."workflow_state"("user_id", "cycle_date");
