import { Prisma } from '@prisma/client';
import prisma from '../prisma';

export const CURRENT_UGC_TERMS_VERSION = '2026-07-18';
export const MODERATION_SLA_HOURS = 24;

type ModerationDb = Prisma.TransactionClient | typeof prisma;

export function hasInlineCurrentTermsConsent(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const value = body as Record<string, unknown>;
  const accepted = value.ugcTermsAccepted === true || value.accepted === true;
  const version = value.ugcTermsVersion ?? value.termsVersion;
  return accepted && version === CURRENT_UGC_TERMS_VERSION;
}

export async function hasCurrentTermsConsent(userId: string, db: ModerationDb = prisma): Promise<boolean> {
  const consent = await db.ugcTermsConsent.findUnique({
    where: {
      userId_termsVersion: {
        userId,
        termsVersion: CURRENT_UGC_TERMS_VERSION,
      },
    },
    select: { id: true },
  });
  return Boolean(consent);
}

export async function recordCurrentTermsConsent(input: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  db?: ModerationDb;
}) {
  const db = input.db ?? prisma;
  return db.ugcTermsConsent.upsert({
    where: {
      userId_termsVersion: {
        userId: input.userId,
        termsVersion: CURRENT_UGC_TERMS_VERSION,
      },
    },
    update: {},
    create: {
      userId: input.userId,
      termsVersion: CURRENT_UGC_TERMS_VERSION,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent?.slice(0, 500) || null,
    },
  });
}

export function termsRequiredPayload() {
  return {
    code: 'UGC_TERMS_REQUIRED',
    message: 'Debes aceptar las reglas de la comunidad antes de publicar contenido',
    requiredVersion: CURRENT_UGC_TERMS_VERSION,
    termsUrl: '/terms#community-rules',
  };
}

export function moderationAge(createdAt: Date, now = new Date()) {
  const ageHours = Math.max(0, (now.getTime() - createdAt.getTime()) / 3_600_000);
  return {
    ageHours: Math.round(ageHours * 10) / 10,
    overdue: ageHours >= MODERATION_SLA_HOURS,
  };
}
