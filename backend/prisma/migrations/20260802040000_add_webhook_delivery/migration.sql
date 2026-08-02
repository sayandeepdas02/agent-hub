-- Sprint 6: WebhookDelivery delivery log
CREATE TABLE IF NOT EXISTS "platform"."WebhookDelivery" (
  "id"           TEXT        NOT NULL,
  "webhookId"    TEXT        NOT NULL,
  "eventType"    TEXT        NOT NULL,
  "payload"      JSONB       NOT NULL,
  "statusCode"   INTEGER,
  "responseBody" TEXT,
  "error"        TEXT,
  "attempt"      INTEGER     NOT NULL DEFAULT 1,
  "deliveredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_deliveredAt_idx"
  ON "platform"."WebhookDelivery"("webhookId", "deliveredAt" DESC);

ALTER TABLE "platform"."WebhookDelivery"
  ADD CONSTRAINT "WebhookDelivery_webhookId_fkey"
  FOREIGN KEY ("webhookId") REFERENCES "platform"."Webhook"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
