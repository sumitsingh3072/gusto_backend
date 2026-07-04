# escrow-service

Owns the `escrow` schema (`subscriptions` table) exclusively. Handles the
30-day deposit balance, daily_avg_limit calculation, and rollover
redistribution when a meal is skipped. Strict transactional consistency --
no eventual consistency on money.

Publishes: BudgetUpdated, RolloverApplied
Consumes: MealSkipped, OrderPlaced
