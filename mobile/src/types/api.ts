export type UserRole = 'user' | 'technician' | 'admin';

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
}

export interface Review {
  id: string;
  technicianId?: string;
  author: string;
  authorId?: string | null;
  comment: string;
  rating: number;
  date: string;
}

export interface Technician {
  id: string;
  name: string;
  specialization: string;
  specializations?: string[];
  location: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  companyName?: string | null;
  rating: number;
  verified: boolean;
  reviews: Review[];
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
