import axios from "axios";
import { ScoutAnalysisRequest, ScoutAnalysisResponse } from "@gusto/contracts";

/**
 * The ONLY client in the codebase allowed to call the AI Agent Service.
 * A single method, mirroring the AI service's single exposed endpoint.
 */
export class AiAgentClient {
  constructor(private readonly baseUrl: string) {}

  analyze(request: ScoutAnalysisRequest): Promise<ScoutAnalysisResponse> {
    return axios.post(`${this.baseUrl}/ai/scout/analyze`, request).then((r) => r.data);
  }
}
