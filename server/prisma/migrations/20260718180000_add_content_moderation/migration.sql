BEGIN;

-- Trust and safety enums.
CREATE TYPE "TechnicianModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "UserModerationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ProfilePhotoModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ReportContentType" AS ENUM ('PROFILE', 'PHOTO', 'BEHAVIOR');
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'VIOLENCE', 'FRAUD', 'IMPERSONATION', 'PRIVACY', 'OTHER');
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ModerationAction" AS ENUM ('NONE', 'CONTENT_REMOVED', 'TECHNICIAN_SUSPENDED', 'USER_SUSPENDED', 'WARNING_RECORDED');

ALTER TABLE "User"
  ADD COLUMN "moderationStatus" "UserModerationStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "moderationReason" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3),
  ADD COLUMN "moderatedById" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletionIdentityDigest" TEXT,
  ADD COLUMN "sanctionedAtDeletion" BOOLEAN NOT NULL DEFAULT false;

-- Existing technician profiles remain visible after deployment. New profiles use
-- the Prisma default (PENDING) and must be approved through the moderation queue.
ALTER TABLE "Technician"
  ADD COLUMN "moderationStatus" "TechnicianModerationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "moderationReason" TEXT,
  ADD COLUMN "moderationSubmittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "moderatedAt" TIMESTAMP(3),
  ADD COLUMN "moderatedById" TEXT;

UPDATE "Technician"
SET "moderationStatus" = 'APPROVED',
    "moderatedAt" = CURRENT_TIMESTAMP
WHERE "moderationStatus" = 'PENDING';

CREATE TABLE "UgcTermsConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "UgcTermsConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfilePhotoSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "imageData" TEXT NOT NULL,
  "status" "ProfilePhotoModerationStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "reviewNote" TEXT,
  "pendingKey" TEXT,
  CONSTRAINT "ProfilePhotoSubmission_pkey" PRIMARY KEY ("id")
);

-- Preserve already-published photos as approved legacy submissions. The review
-- copy is intentionally empty; User.photoUrl remains the sole public copy.
INSERT INTO "ProfilePhotoSubmission" (
  "id", "userId", "imageData", "status", "submittedAt", "reviewedAt", "reviewNote"
)
SELECT
  'legacy-photo-' || "id", "id", '', 'APPROVED', "createdAt", CURRENT_TIMESTAMP,
  'Foto existente al activar la moderación'
FROM "User"
WHERE "photoUrl" IS NOT NULL;

CREATE TABLE "UserBlock" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserBlock_no_self_block" CHECK ("blockerId" <> "blockedUserId")
);

CREATE TABLE "ContentReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "technicianId" TEXT,
  "profilePhotoSubmissionId" TEXT,
  "contentType" "ReportContentType" NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "details" TEXT,
  "contentFingerprint" TEXT,
  "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
  "action" "ModerationAction" NOT NULL DEFAULT 'NONE',
  "resolutionNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "dedupeKey" TEXT,
  "reporterIdentitySnapshot" JSONB,
  "targetIdentitySnapshot" JSONB,
  "technicianIdSnapshot" TEXT,
  "profilePhotoIdSnapshot" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentReport_no_self_report" CHECK ("reporterId" <> "targetUserId")
);

CREATE TABLE "ModerationAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UgcTermsConsent_userId_termsVersion_key" ON "UgcTermsConsent"("userId", "termsVersion");
CREATE INDEX "User_moderationStatus_idx" ON "User"("moderationStatus");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_deletionIdentityDigest_moderationStatus_idx" ON "User"("deletionIdentityDigest", "moderationStatus");
CREATE INDEX "Technician_moderationStatus_moderationSubmittedAt_idx" ON "Technician"("moderationStatus", "moderationSubmittedAt");
CREATE INDEX "UgcTermsConsent_acceptedAt_idx" ON "UgcTermsConsent"("acceptedAt");
CREATE INDEX "ProfilePhotoSubmission_userId_status_idx" ON "ProfilePhotoSubmission"("userId", "status");
CREATE INDEX "ProfilePhotoSubmission_status_submittedAt_idx" ON "ProfilePhotoSubmission"("status", "submittedAt");
CREATE UNIQUE INDEX "ProfilePhotoSubmission_pendingKey_key" ON "ProfilePhotoSubmission"("pendingKey");
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedUserId_key" ON "UserBlock"("blockerId", "blockedUserId");
CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");
CREATE UNIQUE INDEX "ContentReport_dedupeKey_key" ON "ContentReport"("dedupeKey");
CREATE INDEX "ContentReport_reporterId_createdAt_idx" ON "ContentReport"("reporterId", "createdAt");
CREATE INDEX "ContentReport_targetUserId_status_idx" ON "ContentReport"("targetUserId", "status");
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");
CREATE INDEX "ModerationAuditLog_targetType_targetId_idx" ON "ModerationAuditLog"("targetType", "targetId");
CREATE INDEX "ModerationAuditLog_actorId_createdAt_idx" ON "ModerationAuditLog"("actorId", "createdAt");

ALTER TABLE "Technician" ADD CONSTRAINT "Technician_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UgcTermsConsent" ADD CONSTRAINT "UgcTermsConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePhotoSubmission" ADD CONSTRAINT "ProfilePhotoSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePhotoSubmission" ADD CONSTRAINT "ProfilePhotoSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_profilePhotoSubmissionId_fkey" FOREIGN KEY ("profilePhotoSubmissionId") REFERENCES "ProfilePhotoSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModerationAuditLog" ADD CONSTRAINT "ModerationAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Identity snapshots are populated only when an account is anonymized. Once a
-- snapshot exists it is evidence: later application updates may not rewrite it.
CREATE FUNCTION "preserve_content_report_identity_snapshots"() RETURNS trigger AS $$
BEGIN
  IF OLD."reporterIdentitySnapshot" IS NOT NULL
     AND NEW."reporterIdentitySnapshot" IS DISTINCT FROM OLD."reporterIdentitySnapshot" THEN
    RAISE EXCEPTION 'reporter identity snapshot is immutable';
  END IF;
  IF OLD."targetIdentitySnapshot" IS NOT NULL
     AND NEW."targetIdentitySnapshot" IS DISTINCT FROM OLD."targetIdentitySnapshot" THEN
    RAISE EXCEPTION 'target identity snapshot is immutable';
  END IF;
  IF OLD."technicianIdSnapshot" IS NOT NULL
     AND NEW."technicianIdSnapshot" IS DISTINCT FROM OLD."technicianIdSnapshot" THEN
    RAISE EXCEPTION 'technician identity snapshot is immutable';
  END IF;
  IF OLD."profilePhotoIdSnapshot" IS NOT NULL
     AND NEW."profilePhotoIdSnapshot" IS DISTINCT FROM OLD."profilePhotoIdSnapshot" THEN
    RAISE EXCEPTION 'profile photo identity snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ContentReport_identity_snapshots_immutable"
BEFORE UPDATE ON "ContentReport"
FOR EACH ROW EXECUTE FUNCTION "preserve_content_report_identity_snapshots"();

COMMIT;
