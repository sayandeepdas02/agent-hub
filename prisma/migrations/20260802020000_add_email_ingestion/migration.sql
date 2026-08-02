-- Add GMAIL and OUTLOOK to IntegrationType enum
DO $$ BEGIN
  ALTER TYPE "platform"."IntegrationType" ADD VALUE 'GMAIL';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "platform"."IntegrationType" ADD VALUE 'OUTLOOK';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add emailThreadId to Order for thread grouping
ALTER TABLE "agent_order_intake"."Order"
  ADD COLUMN IF NOT EXISTS "emailThreadId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_emailThreadId_idx"
  ON "agent_order_intake"."Order"("emailThreadId");

-- Add messageId and inReplyTo to RawMessage
ALTER TABLE "agent_order_intake"."RawMessage"
  ADD COLUMN IF NOT EXISTS "messageId" TEXT;
ALTER TABLE "agent_order_intake"."RawMessage"
  ADD COLUMN IF NOT EXISTS "inReplyTo" TEXT;
CREATE INDEX IF NOT EXISTS "RawMessage_messageId_idx"
  ON "agent_order_intake"."RawMessage"("messageId");
