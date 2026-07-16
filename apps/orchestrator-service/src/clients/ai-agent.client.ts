import axios from "axios";
import { ScoutAnalysisRequest, ScoutAnalysisResponse } from "@gusto/contracts";
import { mapUpstreamError } from "./map-upstream-error";

/**
 * The ONLY client in the codebase allowed to call the AI Agent Service.
 * A single method, mirroring the AI service's single exposed endpoint.
 */
export class AiAgentClient {
  constructor(private readonly baseUrl: string) {}

  async analyze(request: ScoutAnalysisRequest): Promise<ScoutAnalysisResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/ai/scout/analyze`, request, { timeout: 10000 });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
