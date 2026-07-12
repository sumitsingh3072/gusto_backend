import { z } from "zod";
import { PreferenceProfileSchema } from "./PreferenceProfile";
import { MenuItemSchema } from "./MenuItem";

/**
 * Contract for the ONE endpoint the AI Agent Service exposes:
 * POST /ai/scout/analyze
 * Called only by orchestrator-service.
 */
export const WeeklyBudgetSchema = z.object({
  totalAmount: z.number().positive(),       // e.g. ₹3500 (weekly deposit)
  spentSoFar: z.number().nonnegative(),     // e.g. ₹1200
  mealsRemaining: z.number().int().positive(), // e.g. 8
  dailyAvgLimit: z.number().positive(),     // from escrow Subscription
});

export const ScoutAnalysisRequestSchema = z.object({
  preferenceProfile: PreferenceProfileSchema,
  menuItems: z.array(MenuItemSchema),
  weeklyBudget: WeeklyBudgetSchema.optional(), // optional for backward compat
});
export type ScoutAnalysisRequest = z.infer<typeof ScoutAnalysisRequestSchema>;

export const RankedMenuItemSchema = z.object({
  itemId: z.string(),
  semanticTags: z.array(z.string()),
  matchScore: z.number().min(0).max(1),
});
export type RankedMenuItem = z.infer<typeof RankedMenuItemSchema>;

export const ScoutAnalysisResponseSchema = z.object({
  rankedItems: z.array(RankedMenuItemSchema),
});
export type ScoutAnalysisResponse = z.infer<typeof ScoutAnalysisResponseSchema>;

