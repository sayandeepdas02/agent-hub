-- CreateEnum
CREATE TYPE "platform"."MemberRole" AS ENUM ('ADMIN', 'MANAGER', 'REVIEWER', 'OPERATOR', 'VIEWER');

-- DropForeignKey
ALTER TABLE "platform"."User" DROP CONSTRAINT "User_workspaceId_fkey";

-- DropIndex
DROP INDEX "agent_order_intake"."customer_name_trgm";

-- DropIndex
DROP INDEX "agent_order_intake"."product_name_trgm";

-- DropIndex
DROP INDEX "agent_order_intake"."product_sku_trgm";

-- DropIndex
DROP INDEX "platform"."User_workspaceId_email_key";

-- AlterTable: User — remove old cols, add new NextAuth cols
ALTER TABLE "platform"."User"
  DROP COLUMN "role",
  DROP COLUMN "workspaceId",
  ADD COLUMN "emailVerified" TIMESTAMP(3),
  ADD COLUMN "image" TEXT,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable: Workspace — add plan + updatedAt (DEFAULT NOW() for existing row)
ALTER TABLE "platform"."Workspace"
  ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- DropEnum
DROP TYPE "platform"."UserRole";

-- CreateTable: WorkspaceMembership
CREATE TABLE "platform"."WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "platform"."MemberRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Account (NextAuth OAuth)
CREATE TABLE "platform"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VerificationToken (NextAuth magic link)
CREATE TABLE "platform"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable: Invite
CREATE TABLE "platform"."Invite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "platform"."MemberRole" NOT NULL DEFAULT 'OPERATOR',
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_idx" ON "platform"."WorkspaceMembership"("userId");
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "platform"."WorkspaceMembership"("workspaceId", "userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "platform"."Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "platform"."VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "platform"."VerificationToken"("identifier", "token");
CREATE UNIQUE INDEX "Invite_token_key" ON "platform"."Invite"("token");
CREATE INDEX "Invite_workspaceId_idx" ON "platform"."Invite"("workspaceId");
CREATE INDEX "Invite_token_idx" ON "platform"."Invite"("token");
CREATE UNIQUE INDEX "User_email_key" ON "platform"."User"("email");

-- AddForeignKey
ALTER TABLE "platform"."WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform"."WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "platform"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform"."Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "platform"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "platform"."Invite"
  ADD CONSTRAINT "Invite_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
