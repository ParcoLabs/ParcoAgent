// client/src/lib/hooks.agent.ts
import { useMutation } from "@tanstack/react-query";
import { apiAgentExecute, type AgentExecuteReq, type AgentExecuteRes, apiAgentPlan, type AgentPlanReq, type AgentPlanRes } from "@/lib/api.agent";

export function useAgentExecute() {
  return useMutation<AgentExecuteRes, Error, AgentExecuteReq>({
    mutationFn: apiAgentExecute,
  });
}

export function useAgentPlan() {
  return useMutation<AgentPlanRes, Error, AgentPlanReq>({
    mutationFn: apiAgentPlan,
  });
}
