import { z } from "zod";
import { PreferenceProfileSchema } from "./PreferenceProfile";
import { MenuItemSchema } from "./MenuItem";

/**
 * Contract for the ONE endpoint the AI Agent Service exposes:
 * POST /ai/scout/analyze
 * Called only by orchestrator-service.
 */
export const ScoutAnalysisRequestSchema = z.object({
  preferenceProfile: PreferenceProfileSchema,
  menuItems: z.array(MenuItemSchema),
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

