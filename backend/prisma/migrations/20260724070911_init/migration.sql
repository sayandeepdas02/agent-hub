-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "agent_order_intake";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateEnum
CREATE TYPE "platform"."UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "platform"."IntegrationType" AS ENUM ('MONDAY', 'PRINTAVO', 'SHOPWORKS', 'QUICKBOOKS', 'CUSTOM_REST');

-- CreateEnum
CREATE TYPE "platform"."IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "platform"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "agent_order_intake"."OrderStatus" AS ENUM ('PENDING', 'REVIEW_NEEDED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "agent_order_intake"."OrderSource" AS ENUM ('SLACK', 'EMAIL', 'FORM', 'API', 'CSV');

-- CreateTable
CREATE TABLE "platform"."Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."User" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "platform"."UserRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."AgentEnrollment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AgentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "platform"."IntegrationType" NOT NULL,
    "status" "platform"."IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "label" TEXT,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."ApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Webhook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Job" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "platform"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."Order" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "agent_order_intake"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "source" "agent_order_intake"."OrderSource" NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duplicateOfId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."RawMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."ParsedData" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "orderConfidence" DOUBLE PRECISION NOT NULL,
    "fieldConfidence" JSONB NOT NULL,
    "needsReview" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."Customer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "externalRef" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."Product" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalRef" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_order_intake"."AutomationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "platform"."Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_workspaceId_email_key" ON "platform"."User"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "platform"."Agent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEnrollment_workspaceId_agentId_key" ON "platform"."AgentEnrollment"("workspaceId", "agentId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_timestamp_idx" ON "platform"."AuditLog"("workspaceId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_agentId_idx" ON "platform"."AuditLog"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "platform"."ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Job_workspaceId_status_idx" ON "platform"."Job"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Order_workspaceId_status_idx" ON "agent_order_intake"."Order"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Order_workspaceId_createdAt_idx" ON "agent_order_intake"."Order"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ParsedData_orderId_key" ON "agent_order_intake"."ParsedData"("orderId");

-- CreateIndex
CREATE INDEX "Customer_workspaceId_idx" ON "agent_order_intake"."Customer"("workspaceId");

-- CreateIndex
CREATE INDEX "Product_workspaceId_idx" ON "agent_order_intake"."Product"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_workspaceId_sku_key" ON "agent_order_intake"."Product"("workspaceId", "sku");

-- CreateIndex
CREATE INDEX "AutomationRule_workspaceId_idx" ON "agent_order_intake"."AutomationRule"("workspaceId");

-- AddForeignKey
ALTER TABLE "platform"."User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."AgentEnrollment" ADD CONSTRAINT "AgentEnrollment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."AgentEnrollment" ADD CONSTRAINT "AgentEnrollment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "platform"."Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."AuditLog" ADD CONSTRAINT "AuditLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "platform"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Notification" ADD CONSTRAINT "Notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Webhook" ADD CONSTRAINT "Webhook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Job" ADD CONSTRAINT "Job_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."Order" ADD CONSTRAINT "Order_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "agent_order_intake"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."Order" ADD CONSTRAINT "Order_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "agent_order_intake"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."RawMessage" ADD CONSTRAINT "RawMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "agent_order_intake"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."ParsedData" ADD CONSTRAINT "ParsedData_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "agent_order_intake"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_order_intake"."Product" ADD CONSTRAINT "Product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
