-- Add queueName to Job
ALTER TABLE "platform"."Job" ADD COLUMN IF NOT EXISTS "queueName" TEXT NOT NULL DEFAULT 'integration';
CREATE INDEX IF NOT EXISTS "Job_queueName_status_idx" ON "platform"."Job"("queueName", "status");

-- Create FileRef table
CREATE TABLE "platform"."FileRef" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "bucket"      TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "filename"    TEXT NOT NULL,
  "mimeType"    TEXT NOT NULL,
  "sizeBytes"   INTEGER NOT NULL,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FileRef_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileRef_key_key" ON "platform"."FileRef"("key");
CREATE INDEX "FileRef_workspaceId_idx" ON "platform"."FileRef"("workspaceId");

ALTER TABLE "platform"."FileRef"
  ADD CONSTRAINT "FileRef_workspaceId_fkey"
  FOREIGN KEY ("workspaceId")
  REFERENCES "platform"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
