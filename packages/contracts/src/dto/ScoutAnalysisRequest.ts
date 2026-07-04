import { PreferenceProfile } from "./PreferenceProfile";
import { MenuItem } from "./MenuItem";

/**
 * Contract for the ONE endpoint the AI Agent Service exposes:
 * POST /ai/scout/analyze
 * Called only by orchestrator-service.
 */
export interface ScoutAnalysisRequest {
  preferenceProfile: PreferenceProfile;
  menuItems: MenuItem[];
}

export interface RankedMenuItem {
  itemId: string;
  semanticTags: string[];
  matchScore: number; // 0-1
}

export interface ScoutAnalysisResponse {
  rankedItems: RankedMenuItem[];
}
