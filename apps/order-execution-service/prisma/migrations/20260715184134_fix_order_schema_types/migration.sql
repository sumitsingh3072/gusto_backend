-- CreateTable
CREATE TABLE "order_execution"."orders" (
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "swiggy_order_ref" TEXT,
    "status" TEXT NOT NULL,
    "cart" JSONB NOT NULL,
    "savings_achieved" INTEGER NOT NULL,
    "agent_logs" TEXT,
    "placed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_swiggy_order_ref_key" ON "order_execution"."orders"("swiggy_order_ref");
