import { apiRequest } from '@/lib/api';
import type {
  Booking,
  MessageResponse,
  Settings,
  Technician,
  User,
  UserAccountModerationStatus,
  UserRole,
} from '@/types/api';

type AdminUserPayload = User & {
  /** Compatibility with API versions predating the account-specific names. */
  moderationStatus?: UserAccountModerationStatus;
  moderationReason?: string | null;
};

export interface AdminStats {
  totalUsers: number;
  totalTechnicians: number;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  averageRating: number;
  usersByRole: { role: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topTechnicians: { name: string; jobs: number; rating: number }[];
}

export interface AdminBookingsResponse {
  bookings: Booking[];
  total: number;
}

export const adminApi = {
  users: async (token: string) => {
    const users = await apiRequest<AdminUserPayload[]>('/api/users', { token });
    return users.map(({ moderationReason, moderationStatus, ...user }) => ({
      ...user,
      accountModerationStatus: moderationStatus ?? user.accountModerationStatus ?? 'ACTIVE',
      accountModerationReason: moderationReason ?? user.accountModerationReason ?? null,
    }));
  },
  stats: (token: string) => apiRequest<AdminStats>('/api/users/admin/stats', { token }),
  bookings: (token: string) =>
    apiRequest<AdminBookingsResponse>('/api/bookings/all?limit=100', { token }),
  verifyTechnician: (technicianId: string, token: string) =>
    apiRequest<Technician>(`/api/technicians/${encodeURIComponent(technicianId)}/verify`, {
      method: 'PUT',
      token,
    }),
  deleteTechnician: (technicianId: string, token: string) =>
    apiRequest<MessageResponse>(`/api/technicians/${encodeURIComponent(technicianId)}`, {
      method: 'DELETE',
      token,
    }),
  updateUserRole: (userId: string, role: UserRole, token: string) =>
    apiRequest<User>(`/api/users/${encodeURIComponent(userId)}/role`, {
      method: 'PUT',
      token,
      json: { role },
    }),
  deleteUser: (userId: string, token: string) =>
    apiRequest<MessageResponse>(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      token,
    }),
  addSpecialization: (specialization: string, token: string) =>
    apiRequest<{ message: string; specializations: string[] }>('/api/settings/specializations', {
      method: 'POST',
      token,
      json: { specialization },
    }),
  removeSpecialization: (specialization: string, token: string) =>
    apiRequest<{ message: string; specializations: string[] }>('/api/settings/specializations', {
      method: 'DELETE',
      token,
      json: { specialization },
    }),
  addLocation: (location: string, token: string) =>
    apiRequest<{ message: string; locations: string[] }>('/api/settings/locations', {
      method: 'POST',
      token,
      json: { location },
    }),
  removeLocation: (location: string, token: string) =>
    apiRequest<{ message: string; locations: string[] }>('/api/settings/locations', {
      method: 'DELETE',
      token,
      json: { location },
    }),
  settings: () => apiRequest<Settings>('/api/settings'),
} as const;
