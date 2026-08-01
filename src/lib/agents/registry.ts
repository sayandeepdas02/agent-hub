import type { AgentDefinition } from "./contract";
import { orderIntakeAgent } from "./order-intake";

const agentMap: Record<string, AgentDefinition> = {
  [orderIntakeAgent.id]: orderIntakeAgent,
};

export function getAgent(id: string): AgentDefinition | undefined {
  return agentMap[id];
}

export function getAllAgents(): AgentDefinition[] {
  return Object.values(agentMap);
}

export const AGENT_IDS = {
  ORDER_INTAKE: "order-intake",
} as const;
