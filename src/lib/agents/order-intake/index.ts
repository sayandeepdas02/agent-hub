import type { AgentDefinition } from "../contract";
import { extract } from "./extract";
import { validate } from "./validate";
import { execute } from "./execute";

export { execute } from "./execute";

export const orderIntakeAgent: AgentDefinition = {
  id: "order-intake",
  name: "Order Intake",
  slug: "order-intake",
  triggers: ["slack", "email", "form", "api", "csv"],

  needsExtraction(record) {
    return ["slack", "email", "form", "api"].includes(record.source);
  },

  extract,
  validate,

  // Auto-execution path: no human overrides
  execute: (orderId, workspaceId) => execute(orderId, workspaceId),
};
