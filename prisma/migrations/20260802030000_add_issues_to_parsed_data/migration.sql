ALTER TABLE "agent_order_intake"."ParsedData"
  ADD COLUMN IF NOT EXISTS "lineItems" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "issues"    JSONB NOT NULL DEFAULT '[]';
