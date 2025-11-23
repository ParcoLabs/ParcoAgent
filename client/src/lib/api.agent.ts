// client/src/lib/api.agent.ts
import { api } from "@/lib/api";

export type AgentStep = { action: string; input: any };
export type AgentExecuteReq = { steps: AgentStep[] };
export type AgentExecuteRes = { ok: boolean; results: Array<{ action: string; result?: any; error?: string }> };

export async function apiAgentExecute(body: AgentExecuteReq): Promise<AgentExecuteRes> {
  return api<AgentExecuteRes>("/agent/execute", { method: "POST", body });
}

// Optional future: planning endpoint (stubbed for now)
export type AgentPlanReq = { goal: string; context?: Record<string, any> };
export type AgentPlanRes = { steps: AgentStep[]; justification?: string };
export async function apiAgentPlan(_body: AgentPlanReq): Promise<AgentPlanRes> {
  // If/when /api/agent/plan is implemented, wire it here.
  return { steps: [], justification: "Not implemented yet." };
}
