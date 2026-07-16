import type {
  Booking,
  BookingFilters,
  CreateBookingInput,
  LoginResponse,
  MessageResponse,
  RegisterInput,
  Settings,
  User,
} from '@/types/api';
import { normalizeTechnician, type TechnicianApiPayload } from '@/lib/technician';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://api.tecnicosenrd.com'
).replace(/\/$/, '');

const DEFAULT_ERROR_MESSAGE = 'No pudimos completar la solicitud. Inténtalo de nuevo.';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  token?: string | null;
  body?: BodyInit | null;
  json?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extractApiErrorMessage(
  value: unknown,
  fallback = DEFAULT_ERROR_MESSAGE
): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!isRecord(value)) return fallback;

  for (const key of ['message', 'error', 'detail'] as const) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (isRecord(candidate)) {
      const nested = extractApiErrorMessage(candidate, '');
      if (nested) return nested;
    }
  }

  const errors = value.errors;
  if (Array.isArray(errors)) {
    const messages = errors
      .map((entry) => extractApiErrorMessage(entry, ''))
      .filter((message) => message.length > 0);
    if (messages.length > 0) return messages.join('\n');
  }

  return fallback;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text.trim()) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, json, body, headers: suppliedHeaders, ...requestInit } = options;
  if (json !== undefined && body !== undefined) {
    throw new Error('Use either json or body, not both.');
  }

  const headers = new Headers(suppliedHeaders);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (json !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(
      path.startsWith('http') ? path : `${API_BASE_URL}${path}`,
      {
        ...requestInit,
        headers,
        body: json !== undefined ? JSON.stringify(json) : body,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error && error.message
      ? error.message
      : 'No hay conexión con el servidor.';
    throw new ApiError(message, 0, error);
  }

  const data = await readResponseBody(response);
  if (!response.ok) {
    throw new ApiError(extractApiErrorMessage(data), response.status, data);
  }

  return data as T;
}

function toQueryString(filters?: BookingFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        json: { email, password },
      }),
    register: (input: RegisterInput) =>
      apiRequest<User>('/api/auth/register', { method: 'POST', json: input }),
    forgotPassword: (email: string) =>
      apiRequest<MessageResponse>('/api/auth/forgot-password', {
        method: 'POST',
        json: { email },
      }),
    resendVerification: (email: string) =>
      apiRequest<MessageResponse>('/api/auth/resend-verification', {
        method: 'POST',
        json: { email },
      }),
  },
  settings: {
    get: () => apiRequest<Settings>('/api/settings'),
  },
  technicians: {
    list: async () => {
      const technicians = await apiRequest<TechnicianApiPayload[]>(
        '/api/technicians?view=ratings'
      );
      return technicians.map(normalizeTechnician);
    },
  },
  bookings: {
    create: (input: CreateBookingInput, token: string) =>
      apiRequest<Booking>('/api/bookings', { method: 'POST', token, json: input }),
    get: (bookingId: string, token: string) =>
      apiRequest<Booking>(`/api/bookings/${encodeURIComponent(bookingId)}`, { token }),
    forCustomer: (userId: string, token: string, filters?: BookingFilters) =>
      apiRequest<Booking[]>(
        `/api/bookings/customer/${encodeURIComponent(userId)}${toQueryString(filters)}`,
        { token }
      ),
    forTechnician: (technicianId: string, token: string, filters?: BookingFilters) =>
      apiRequest<Booking[]>(
        `/api/bookings/technician/${encodeURIComponent(technicianId)}${toQueryString(filters)}`,
        { token }
      ),
    availableSlots: (technicianId: string, date: string) =>
      apiRequest<string[]>(
        `/api/bookings/availability/${encodeURIComponent(technicianId)}/slots?date=${encodeURIComponent(date)}`
      ),
    cancel: (bookingId: string, reason: string, token: string) =>
      apiRequest<Booking>(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: 'PUT',
        token,
        json: { reason },
      }),
  },
  users: {
    delete: (userId: string, token: string) =>
      apiRequest<MessageResponse>(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        token,
      }),
  },
} as const;
