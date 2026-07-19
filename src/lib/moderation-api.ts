import { API_BASE_URL } from '../config/constants';
import { apiFetch } from './api';

export const UGC_TERMS_VERSION = '2026-07-18';

interface PhotoSubmissionResponse {
  status?: string;
  photoModerationStatus?: string;
  submissionId?: string;
  photoUrl?: string | null;
}

export const mergeProfilePhotoSubmission = <T extends {
  photoUrl?: string;
  photoModerationStatus?: string;
  photoModerationReason?: string | null;
  photoModerationReviewedAt?: string | null;
}>(
  currentUser: T,
  response: PhotoSubmissionResponse
) => {
  const pending = response.status === 'PENDING'
    || response.photoModerationStatus === 'PENDING'
    || Boolean(response.submissionId);

  return {
    pending,
    user: pending
      ? {
          ...currentUser,
          photoModerationStatus: 'PENDING' as const,
          photoModerationReason: null,
          photoModerationReviewedAt: null,
        }
      : {
          ...currentUser,
          photoUrl: response.photoUrl || undefined,
          photoModerationStatus: 'APPROVED' as const,
          photoModerationReason: null,
        },
  };
};

export type ModerationContentType = 'PROFILE' | 'PHOTO' | 'BEHAVIOR';

export type ReportReason =
  | 'SPAM'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'SEXUAL_CONTENT'
  | 'VIOLENCE'
  | 'FRAUD'
  | 'IMPERSONATION'
  | 'PRIVACY'
  | 'OTHER';

export interface ModerationReportTarget {
  targetUserId: string;
  technicianId?: string;
  contentType: ModerationContentType;
  name: string;
}

export interface ModerationBlock {
  id?: string;
  blockedUserId: string;
  createdAt?: string;
  blockedUser?: {
    id?: string;
    name?: string;
    photoUrl?: string | null;
    role?: string;
  };
  name?: string;
  photoUrl?: string | null;
}

export const readApiError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => ({}));
  return data.message || data.error || fallback;
};

export const getModerationConsent = async () => {
  const response = await apiFetch(`${API_BASE_URL}/api/moderation/consent`);
  if (!response.ok) return false;

  const data = await response.json().catch(() => ({}));
  const accepted = data.accepted ?? data.ugcTermsAccepted ?? data.consent?.accepted;
  const version = data.acceptedVersion ?? data.termsVersion ?? data.ugcTermsVersion ?? data.consent?.termsVersion;
  return accepted === true && (!version || version === UGC_TERMS_VERSION);
};

export const acceptModerationConsent = async () => {
  const response = await apiFetch(`${API_BASE_URL}/api/moderation/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accepted: true,
      termsVersion: UGC_TERMS_VERSION,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, 'No pudimos guardar tu aceptación'));
  }
};

export const getModerationBlocks = async (): Promise<ModerationBlock[]> => {
  const response = await apiFetch(`${API_BASE_URL}/api/moderation/blocks`);
  if (!response.ok) {
    throw new Error(await readApiError(response, 'No pudimos cargar los usuarios bloqueados'));
  }
  const data = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data.blocks) ? data.blocks : [];
};

export const createModerationBlock = async (userId: string) => {
  const response = await apiFetch(`${API_BASE_URL}/api/moderation/blocks/${userId}`, {
    method: 'POST',
  });
  if (response.status === 409) return {};
  if (!response.ok) {
    throw new Error(await readApiError(response, 'No pudimos bloquear este usuario'));
  }
  return response.json().catch(() => ({}));
};

export const deleteModerationBlock = async (userId: string) => {
  const response = await apiFetch(`${API_BASE_URL}/api/moderation/blocks/${userId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, 'No pudimos desbloquear este usuario'));
  }
};
