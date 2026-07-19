export type UserRole = 'user' | 'technician' | 'admin';
export type TechnicianModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type UserAccountModerationStatus = 'ACTIVE' | 'SUSPENDED';
export type PhotoModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  photoUrl?: string | null;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  technicianId?: string;
  specializations?: string[];
  location?: string;
  companyName?: string | null;
  technicianModerationStatus?: TechnicianModerationStatus;
  technicianModerationReason?: string | null;
  photoModerationStatus?: PhotoModerationStatus | null;
  photoModerationReason?: string | null;
  photoModerationSubmissionId?: string | null;
  photoModerationReviewedAt?: string | null;
  pendingPhotoSubmissionId?: string | null;
  photoSubmittedAt?: string | null;
  ugcTermsAccepted?: boolean;
  ugcTermsVersion?: string | null;
  ugcTermsAcceptedAt?: string | null;
  accountModerationStatus?: UserAccountModerationStatus;
  accountModerationReason?: string | null;
  limitedAccess?: boolean;
  suspensionCode?: string;
  suspensionMessage?: string;
  supportUrl?: string;
}

export interface Technician {
  id: string;
  /** Account id used for safety actions such as reporting and blocking. */
  userId?: string;
  name: string;
  specialization: string;
  specializations?: string[];
  location: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  companyName?: string | null;
  rating: number;
  ratingCount: number;
  verified: boolean;
  /**
   * Coarse public service-area position. The API rounds these coordinates and
   * never sends a technician's street address to the public directory.
   */
  mapLocation?: TechnicianMapLocation | null;
}

export interface TechnicianMapLocation {
  latitude: number;
  longitude: number;
  radiusKm: number;
  precision: 'approximate';
}

export interface TechnicianReview {
  id: string;
  author: string;
  comment: string;
  rating: number;
  date: string;
}

export interface CreateTechnicianReviewInput {
  rating: number;
  comment: string;
}

export interface Settings {
  specializations: string[];
  locations: string[];
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface BookingPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  photoUrl?: string | null;
}

export interface BookingTechnician {
  id: string;
  userId?: string;
  specializations?: string[];
  location?: string;
  companyName?: string | null;
  rating?: number;
  verified?: boolean;
  user: BookingPerson;
}

export interface Booking {
  id: string;
  customerId: string;
  technicianId: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  status: BookingStatus;
  serviceType: string;
  description?: string | null;
  address: string;
  city: string;
  phone: string;
  totalPrice?: number | null;
  cancelReason?: string | null;
  cancelledBy?: 'customer' | 'technician' | 'admin' | null;
  completedAt?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: BookingPerson;
  technician?: BookingTechnician;
}

export interface LoginResponse extends User {
  token: string;
  /** Legacy aliases returned by older API deployments. They are normalized before storage. */
  moderationStatus?: TechnicianModerationStatus;
  moderationReason?: string | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  accountType: 'user' | 'technician';
  specializations?: string[];
  location?: string;
  photoBase64?: string;
  companyName?: string;
  ugcTermsAccepted: true;
  ugcTermsVersion: string;
}

export interface CreateBookingInput {
  technicianId: string;
  scheduledDate: string;
  scheduledTime: string;
  serviceType: string;
  description?: string;
  address: string;
  city: string;
  phone: string;
  estimatedDuration?: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
}

export interface MessageResponse {
  message: string;
}
