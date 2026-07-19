import { apiRequest } from '@/lib/api';
import type { PhotoModerationStatus, TechnicianModerationStatus, User } from '@/types/api';

export interface ProfileUser extends User {
  mapVisible?: boolean;
}

export interface UpdateProfileInput {
  name: string;
  phone: string;
  specializations?: string[];
  location?: string;
  companyName?: string | null;
  mapVisible?: boolean;
  serviceArea?: null;
}

export interface ProfileHistoryEntry {
  id: string;
  userId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface TechnicianRegistrationInput {
  specializations: string[];
  location: string;
  phone?: string;
  companyName?: string;
  mapVisible: boolean;
}

export interface TechnicianRegistrationResult {
  id: string;
  specializations: string[];
  location: string;
  companyName?: string | null;
  mapVisible?: boolean;
  moderationStatus?: TechnicianModerationStatus;
  moderationReason?: string | null;
  technicianModerationStatus?: TechnicianModerationStatus;
  technicianModerationReason?: string | null;
}

export interface UploadProfilePhotoResponse {
  message: string;
  photoUrl?: string | null;
  submissionId: string;
  photoModerationStatus: PhotoModerationStatus;
  submittedAt: string;
}

export interface AccountStatusResponse {
  emailVerified: boolean;
  accountModerationStatus: User['accountModerationStatus'];
  accountModerationReason?: string | null;
  limitedAccess?: boolean;
  technicianModerationStatus?: TechnicianModerationStatus | null;
  technicianModerationReason?: string | null;
  photoModerationStatus?: PhotoModerationStatus | null;
  photoModerationReason?: string | null;
  photoModerationSubmissionId?: string | null;
  pendingPhotoSubmissionId?: string | null;
  photoSubmittedAt?: string | null;
  photoModerationReviewedAt?: string | null;
}

export function getVerificationStatus(token: string) {
  return apiRequest<AccountStatusResponse>('/api/auth/verification-status', { token });
}

export function updateProfile(userId: string, input: UpdateProfileInput, token: string) {
  return apiRequest<ProfileUser>(`/api/users/${encodeURIComponent(userId)}/profile`, {
    method: 'PUT',
    token,
    json: input,
  });
}

export function getProfileHistory(userId: string, token: string) {
  return apiRequest<ProfileHistoryEntry[]>(
    `/api/users/${encodeURIComponent(userId)}/profile-history`,
    { token }
  );
}

export function uploadProfilePhoto(userId: string, photoBase64: string, token: string) {
  return apiRequest<UploadProfilePhotoResponse>(
    `/api/users/${encodeURIComponent(userId)}/photo`,
    {
      method: 'POST',
      token,
      json: { photoBase64 },
    }
  );
}

export function registerTechnician(input: TechnicianRegistrationInput, token: string) {
  return apiRequest<TechnicianRegistrationResult>('/api/technicians', {
    method: 'POST',
    token,
    json: input,
  });
}
