import { prisma } from "./prisma";
import { enqueueJob } from "./jobs";

interface AutomationStep {
  type: "http_post";
  url: string;
}

export async function runAutomationRules(
  trigger: string,
  workspaceId: string,
  context: Record<string, unknown>
) {
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId, trigger, enabled: true },
  });

  for (const rule of rules) {
    const steps = rule.steps as unknown as AutomationStep[];
    for (const step of steps) {
      if (step.type === "http_post" && step.url) {
        await enqueueJob({
          workspaceId,
          type: "automation_http_post",
          queueName: "automation",
          payload: {
            ruleId: rule.id,
            ruleName: rule.name,
            url: step.url,
            context,
          },
        });
      }
    }
  }
}
