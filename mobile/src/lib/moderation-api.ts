import { apiRequest } from '@/lib/api';

export const COMMUNITY_TERMS_VERSION = '2026-07-18';
export const REPORT_DETAILS_MAX_LENGTH = 500;

export type ModerationContentType = 'PROFILE' | 'PHOTO' | 'BEHAVIOR';
export type ModerationReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'SEXUAL_CONTENT'
  | 'VIOLENCE'
  | 'FRAUD'
  | 'IMPERSONATION'
  | 'PRIVACY'
  | 'OTHER';
export type ModerationReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ModerationResolutionAction =
  | 'NONE'
  | 'CONTENT_REMOVED'
  | 'TECHNICIAN_SUSPENDED'
  | 'USER_SUSPENDED'
  | 'WARNING_RECORDED';
export type ProfileModerationDecision = 'APPROVE' | 'REJECT' | 'SUSPEND';
export type PhotoModerationDecision = 'APPROVE' | 'REJECT';
export type UserModerationDecision = 'SUSPEND' | 'RESTORE';

export interface CommunityConsent {
  accepted: boolean;
  version: string | null;
  acceptedAt?: string | null;
}

export interface CreateModerationReportInput {
  targetUserId: string;
  technicianId?: string;
  contentType: ModerationContentType;
  reason: ModerationReportReason;
  details?: string;
}

export interface ModerationIdentity {
  id?: string;
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  pendingPhotoUrl?: string | null;
  moderationStatus?: 'ACTIVE' | 'SUSPENDED';
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetUserId: string;
  technicianId?: string | null;
  contentType: ModerationContentType;
  reason: ModerationReportReason;
  details?: string | null;
  status: ModerationReportStatus;
  action?: ModerationResolutionAction | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  reviewedById?: string | null;
  ageHours?: number;
  overdue?: boolean;
  reporter?: ModerationIdentity | null;
  targetUser?: ModerationIdentity | null;
  reviewedBy?: ModerationIdentity | null;
}

export interface ModerationBlock {
  id?: string;
  blockedUserId: string;
  createdAt?: string;
  blockedUser?: ModerationIdentity | null;
}

export interface PendingProfileModeration {
  id: string;
  technicianId?: string;
  userId?: string;
  name?: string;
  companyName?: string | null;
  specializations?: string[];
  location?: string | null;
  createdAt?: string;
  submittedAt?: string;
  ageHours?: number;
  overdue?: boolean;
  user?: ModerationIdentity | null;
}

export interface PendingPhotoModeration {
  id: string;
  userId?: string;
  name?: string;
  photoUrl?: string | null;
  pendingPhotoUrl?: string | null;
  imageData?: string | null;
  createdAt?: string;
  submittedAt?: string;
  ageHours?: number;
  overdue?: boolean;
  user?: ModerationIdentity | null;
}

export interface AdminModerationQueue {
  reports: ModerationReport[];
  pendingProfiles: PendingProfileModeration[];
  pendingPhotos: PendingPhotoModeration[];
  counts: {
    reports?: number;
    pendingProfiles?: number;
    pendingPhotos?: number;
  };
}

export const moderationApi = {
  getConsent: async (token: string) =>
    normalizeConsent(await apiRequest<unknown>('/api/moderation/consent', { token })),
  acceptConsent: async (token: string) => {
    const result = await apiRequest<unknown>('/api/moderation/consent', {
      method: 'POST',
      token,
      json: {
        accepted: true,
        version: COMMUNITY_TERMS_VERSION,
        termsVersion: COMMUNITY_TERMS_VERSION,
        ugcTermsAccepted: true,
        ugcTermsVersion: COMMUNITY_TERMS_VERSION,
      },
    });
    const normalized = normalizeConsent(result);
    return normalized.accepted
      ? normalized
      : { accepted: true, version: COMMUNITY_TERMS_VERSION };
  },
  createReport: (input: CreateModerationReportInput, token: string) =>
    apiRequest<ModerationReport>('/api/moderation/reports', {
      method: 'POST',
      token,
      json: input,
    }),
  myReports: async (token: string) => {
    const value = await apiRequest<unknown>('/api/moderation/reports/mine', { token });
    if (Array.isArray(value)) return value as ModerationReport[];
    return isRecord(value) && Array.isArray(value.reports)
      ? value.reports as ModerationReport[]
      : [];
  },
  blocks: async (token: string) => {
    const value = await apiRequest<unknown>('/api/moderation/blocks', { token });
    if (Array.isArray(value)) return value as ModerationBlock[];
    return isRecord(value) && Array.isArray(value.blocks)
      ? value.blocks as ModerationBlock[]
      : [];
  },
  block: (userId: string, token: string) =>
    apiRequest<ModerationBlock>(`/api/moderation/blocks/${encodeURIComponent(userId)}`, {
      method: 'POST',
      token,
    }),
  unblock: (userId: string, token: string) =>
    apiRequest<void>(`/api/moderation/blocks/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      token,
    }),
  adminQueue: async (token: string) => {
    const value = await apiRequest<unknown>('/api/moderation/admin/queue', { token });
    const record = isRecord(value) ? value : {};
    return {
      reports: Array.isArray(record.reports) ? record.reports as ModerationReport[] : [],
      pendingProfiles: Array.isArray(record.pendingProfiles)
        ? record.pendingProfiles as PendingProfileModeration[]
        : [],
      pendingPhotos: Array.isArray(record.pendingPhotos)
        ? record.pendingPhotos as PendingPhotoModeration[]
        : [],
      counts: isRecord(record.counts) ? record.counts : {},
    } as AdminModerationQueue;
  },
  resolveReport: (
    reportId: string,
    input: Pick<ModerationReport, 'status'> & {
      action: ModerationResolutionAction;
      resolutionNote?: string;
    },
    token: string
  ) => apiRequest<ModerationReport>(
    `/api/moderation/admin/reports/${encodeURIComponent(reportId)}`,
    { method: 'PATCH', token, json: input }
  ),
  claimReport: (reportId: string, token: string) =>
    apiRequest<ModerationReport>(
      `/api/moderation/admin/reports/${encodeURIComponent(reportId)}/claim`,
      { method: 'PATCH', token, json: {} }
    ),
  moderateProfile: (
    technicianId: string,
    decision: ProfileModerationDecision,
    token: string,
    reason?: string
  ) => apiRequest<void>(
    `/api/moderation/admin/technicians/${encodeURIComponent(technicianId)}`,
    { method: 'PATCH', token, json: { decision, ...(reason ? { reason } : {}) } }
  ),
  moderatePhoto: (
    submissionId: string,
    decision: PhotoModerationDecision,
    token: string,
    reason?: string
  ) => apiRequest<void>(
    `/api/moderation/admin/profile-photos/${encodeURIComponent(submissionId)}`,
    { method: 'PATCH', token, json: { decision, ...(reason ? { reason } : {}) } }
  ),
  moderateUser: (
    userId: string,
    decision: UserModerationDecision,
    reason: string,
    token: string
  ) => apiRequest<void>(
    `/api/moderation/admin/users/${encodeURIComponent(userId)}`,
    { method: 'PATCH', token, json: { decision, reason } }
  ),
} as const;

export function hasCurrentCommunityConsent(consent: CommunityConsent | null): boolean {
  return Boolean(consent?.accepted && consent.version === COMMUNITY_TERMS_VERSION);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeConsent(value: unknown): CommunityConsent {
  const record = isRecord(value) ? value : {};
  const nested = isRecord(record.consent) ? record.consent : {};
  const accepted = record.accepted ?? record.ugcTermsAccepted ?? nested.accepted;
  const version =
    record.version ??
    record.acceptedVersion ??
    record.termsVersion ??
    record.ugcTermsVersion ??
    nested.version ??
    nested.termsVersion;
  const acceptedAt = record.acceptedAt ?? nested.acceptedAt;
  return {
    accepted: accepted === true,
    version: typeof version === 'string' ? version : null,
    ...(typeof acceptedAt === 'string' ? { acceptedAt } : {}),
  };
}
