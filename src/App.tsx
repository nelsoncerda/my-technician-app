import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Phone, Mail, Star, Search, Filter, Wrench, User,
    CheckCircle, PlusCircle, Loader2, X, LogIn, LogOut, Shield, Edit,
    Calendar, Trophy, Gift, Home, Users, BarChart3, TrendingUp, Clock,
    DollarSign, Activity, AlertCircle, UserCheck, UserX, Trash2, Eye, Settings, Plus,
    Camera, History, Save, MailWarning, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Card, CardHeader, CardContent, CardFooter } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { cn } from './lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// New imports for booking and gamification
import BookingForm from './components/booking/BookingForm';
import BookingList from './components/booking/BookingList';
import PointsDisplay from './components/gamification/PointsDisplay';
import AchievementCard from './components/gamification/AchievementCard';
import Leaderboard from './components/gamification/Leaderboard';
import RewardCard from './components/gamification/RewardCard';
import AchievementUnlocked from './components/gamification/AchievementUnlocked';
import { API_BASE_URL } from './config/constants';

// Default data (will be managed via state)
const DEFAULT_SPECIALIZATIONS = [
    'Electricista',
    'Plomero',
    'Mecánico',
    'Carpintero',
    'Técnico de Electrodomésticos',
    'Pintor',
    'Albañil',
    'Cerrajero',
    'Técnico de Aire Acondicionado',
    'Jardinero',
];

interface Technician {
    id: string;
    name: string;
    specialization: string;
    specializations?: string[]; // Array of specializations
    location: string;
    phone: string;
    email: string;
    photoUrl?: string; // Profile photo URL
    rating: number;
    reviews: Review[];
    verified: boolean;
    companyName?: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'technician' | 'admin';
    phone?: string;
    photoUrl?: string;
    emailVerified?: boolean;
    password?: string; // In a real app, this would be hashed
    // Technician-specific fields (only present if role is 'technician')
    technicianId?: string;
    specializations?: string[];
    location?: string;
    companyName?: string;
}

interface ProfileChangeHistory {
    id: string;
    userId: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    changedBy: string | null;
    createdAt: string;
}

interface Review {
    id: string;
    author: string;
    comment: string;
    rating: number;
    date: string;
}

const DEFAULT_LOCATIONS = [
    "Santiago de los Caballeros",
    "Puñal",
    "Tamboril",
    "Licey al Medio",
    "Villa González",
    "Navarrete",
    "Baitoa",
    "San José de las Matas",
    "Jánico",
    "Sabana Iglesia",
];

// Form Schemas
const technicianFormSchema = z.object({
    firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' }),
    specialization: z.string().min(1, { message: 'Debe seleccionar una especialización.' }),
    location: z.string().min(1, { message: 'Debe seleccionar una ubicación.' }),
    phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, { message: 'Formato de teléfono inválido (XXX-XXX-XXXX).' }),
    email: z.string().email({ message: 'Formato de correo electrónico inválido.' }),
});

const reviewFormSchema = z.object({
    author: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
    comment: z.string().min(10, { message: 'El comentario debe tener al menos 10 caracteres.' }),
    rating: z.number().min(1).max(5),
});

const userFormSchema = z.object({
    firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
    lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' }),
    email: z.string().email({ message: 'Formato de correo electrónico inválido.' }),
    phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, { message: 'Formato de teléfono inválido (XXX-XXX-XXXX).' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
    accountType: z.enum(['user', 'technician'], { required_error: 'Debes seleccionar un tipo de cuenta.' }),
    // Campos condicionales para técnicos
    specializations: z.array(z.string()).optional(), // Array of specializations
    location: z.string().optional(),
    companyName: z.string().optional(), // Optional company name for technicians
}).refine((data) => {
    // Si es técnico, debe tener al menos una especialización y ubicación
    if (data.accountType === 'technician') {
        return data.specializations && data.specializations.length > 0 && data.location && data.location.length > 0;
    }
    return true;
}, {
    message: 'Los técnicos deben seleccionar al menos una especialización y ubicación.',
    path: ['specializations'],
});

const loginFormSchema = z.object({
    email: z.string().email({ message: 'Formato de correo electrónico inválido.' }),
    password: z.string().min(1, { message: 'La contraseña es requerida.' }),
});

// Animation Variants
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const reviewVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

const SantiagoTechRDApp = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialization, setSelectedSpecialization] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showUserRegisterForm, setShowUserRegisterForm] = useState(false);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]); // Store registered users
    const [currentView, setCurrentView] = useState<'home' | 'admin' | 'bookings' | 'gamification' | 'about'>('home');
    const [showReviewForm, setShowReviewForm] = useState<{ technicianId: string; show: boolean } | null>(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [userRegistrationSuccess, setUserRegistrationSuccess] = useState(false);

    // New state for booking and gamification
    const [showBookingForm, setShowBookingForm] = useState<{ technician: any; show: boolean } | null>(null);
    const [userBookings, setUserBookings] = useState<any[]>([]);
    const [userPoints, setUserPoints] = useState<any>(null);
    const [userAchievements, setUserAchievements] = useState<any[]>([]);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'ALL_TIME'>('ALL_TIME');
    const [rewards, setRewards] = useState<any[]>([]);
    const [unlockedAchievement, setUnlockedAchievement] = useState<any>(null);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [loadingGamification, setLoadingGamification] = useState(false);

    // Admin panel state
    const [adminTab, setAdminTab] = useState<'technicians' | 'users' | 'bookings' | 'reports' | 'settings'>('technicians');

    // Specializations and Locations state (editable by admin)
    const [specializations, setSpecializations] = useState<string[]>(DEFAULT_SPECIALIZATIONS);
    const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS);
    const [newSpecialization, setNewSpecialization] = useState('');
    const [newLocation, setNewLocation] = useState('');

    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileHistory, setProfileHistory] = useState<ProfileChangeHistory[]>([]);
    const [showProfileHistory, setShowProfileHistory] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [editingSpecializations, setEditingSpecializations] = useState<string[]>([]);

    // Availability state for technicians
    const [profileTab, setProfileTab] = useState<'info' | 'history' | 'availability'>('info');
    const [availability, setAvailability] = useState<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
    }[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);

    // Registration photo state
    const [registrationPhoto, setRegistrationPhoto] = useState<string | null>(null);

    // Email verification state
    const [resendingVerification, setResendingVerification] = useState(false);
    const [verificationEmailSent, setVerificationEmailSent] = useState(false);

    // Password reset state
    const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);
    const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [resetEmail, setResetEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
    const [adminStats, setAdminStats] = useState<{
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
        recentActivity: { type: string; description: string; time: string }[];
    } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [reportDetailModal, setReportDetailModal] = useState<{
        type: 'users' | 'technicians' | 'bookings' | null;
        title: string;
    }>({ type: null, title: '' });

    // Form for Technician Registration
    const {
        register: registerTechnician,
        handleSubmit: handleTechnicianSubmit,
        formState: { errors: technicianErrors, isSubmitting: isTechnicianSubmitting },
        control: technicianControl,
        reset: resetTechnicianForm,
    } = useForm<z.infer<typeof technicianFormSchema>>({
        resolver: zodResolver(technicianFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            specialization: '',
            location: '',
            phone: '',
            email: '',
        },
    });

    // Pre-fill Technician Form with User Profile
    useEffect(() => {
        if (showRegisterForm && currentUser) {
            const nameParts = currentUser.name?.split(' ') || ['', ''];
            resetTechnicianForm({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: currentUser.email,
                phone: currentUser.phone || '',
                specialization: '',
                location: '',
            });
        }
    }, [showRegisterForm, currentUser, resetTechnicianForm]);

    // Form for Review Submission
    const {
        register: registerReview,
        handleSubmit: handleReviewSubmit,
        formState: { errors: reviewErrors, isSubmitting: isReviewSubmitting },
        control: reviewControl,
        reset: resetReviewForm,
    } = useForm<z.infer<typeof reviewFormSchema>>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            author: '',
            comment: '',
            rating: 5,
        },
    });

    // Form for User Registration
    const {
        register: registerUser,
        handleSubmit: handleUserSubmit,
        formState: { errors: userErrors, isSubmitting: isUserSubmitting },
        reset: resetUserForm,
        watch: watchUserForm,
        control: userFormControl,
    } = useForm<z.infer<typeof userFormSchema>>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: '',
            accountType: undefined,
            specializations: [],
            location: '',
            companyName: '',
        },
    });

    // Watch account type to show/hide technician fields
    const selectedAccountType = watchUserForm('accountType');

    // Form for Login
    const {
        register: registerLogin,
        handleSubmit: handleLoginSubmit,
        formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
        reset: resetLoginForm,
    } = useForm<z.infer<typeof loginFormSchema>>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    // Fetch Technicians and Users from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch technicians
                const techResponse = await fetch(`${API_BASE_URL}/api/technicians`);
                const techData = await techResponse.json();
                setTechnicians(techData);

                // Fetch users (for admin view)
                const userResponse = await fetch(`${API_BASE_URL}/api/users`);
                const userData = await userResponse.json();
                setUsers(userData);

                // Fetch app settings (specializations and locations)
                const settingsResponse = await fetch(`${API_BASE_URL}/api/settings`);
                if (settingsResponse.ok) {
                    const settingsData = await settingsResponse.json();
                    if (settingsData.specializations?.length > 0) {
                        setSpecializations(settingsData.specializations);
                    }
                    if (settingsData.locations?.length > 0) {
                        setLocations(settingsData.locations);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]); // Refetch when user changes (e.g. after login/register)

    // Fetch user bookings
    const fetchUserBookings = useCallback(async () => {
        if (!currentUser) return;
        setLoadingBookings(true);
        try {
            // For technicians, fetch BOTH: bookings where they are the technician AND where they are the customer
            // (technicians can also book services from other technicians)
            if (currentUser.role === 'technician' && currentUser.technicianId) {
                const [technicianRes, customerRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/bookings/technician/${currentUser.technicianId}`),
                    fetch(`${API_BASE_URL}/api/bookings/customer/${currentUser.id}`)
                ]);
                const technicianBookings = technicianRes.ok ? await technicianRes.json() : [];
                const customerBookings = customerRes.ok ? await customerRes.json() : [];

                // Combine and deduplicate (in case of any overlap)
                const allBookings = [...(Array.isArray(technicianBookings) ? technicianBookings : [])];
                const customerBookingsArray = Array.isArray(customerBookings) ? customerBookings : [];
                customerBookingsArray.forEach((booking: any) => {
                    if (!allBookings.find((b: any) => b.id === booking.id)) {
                        allBookings.push(booking);
                    }
                });
                setUserBookings(allBookings);
            } else {
                // For regular customers, only fetch their bookings
                const response = await fetch(`${API_BASE_URL}/api/bookings/customer/${currentUser.id}`);
                const data = await response.json();
                setUserBookings(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setUserBookings([]);
        } finally {
            setLoadingBookings(false);
        }
    }, [currentUser]);

    // Check if user has a completed booking with a specific technician
    const hasCompletedBookingWithTechnician = useCallback((technicianId: string): boolean => {
        if (!currentUser || !userBookings || userBookings.length === 0) return false;
        return userBookings.some(
            (booking: any) => booking.technicianId === technicianId && booking.status === 'COMPLETED'
        );
    }, [currentUser, userBookings]);

    // Fetch gamification data
    const fetchGamificationData = useCallback(async () => {
        if (!currentUser) return;
        setLoadingGamification(true);
        try {
            const [pointsRes, achievementsRes, leaderboardRes, rewardsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/gamification/points/${currentUser.id}`),
                fetch(`${API_BASE_URL}/api/gamification/achievements/${currentUser.id}`),
                fetch(`${API_BASE_URL}/api/gamification/leaderboard?period=${leaderboardPeriod}`),
                fetch(`${API_BASE_URL}/api/gamification/rewards`),
            ]);

            if (pointsRes.ok) {
                const pointsData = await pointsRes.json();
                setUserPoints(pointsData);
            }
            if (achievementsRes.ok) {
                const achievementsData = await achievementsRes.json();
                setUserAchievements(achievementsData);
            }
            if (leaderboardRes.ok) {
                const leaderboardData = await leaderboardRes.json();
                setLeaderboard(leaderboardData);
            }
            if (rewardsRes.ok) {
                const rewardsData = await rewardsRes.json();
                setRewards(rewardsData);
            }
        } catch (error) {
            console.error('Error fetching gamification data:', error);
        } finally {
            setLoadingGamification(false);
        }
    }, [currentUser, leaderboardPeriod]);

    // Fetch bookings when view changes to bookings
    useEffect(() => {
        if (currentView === 'bookings' && currentUser) {
            fetchUserBookings();
        }
    }, [currentView, currentUser, fetchUserBookings]);

    // Fetch gamification data when view changes
    useEffect(() => {
        if (currentView === 'gamification' && currentUser) {
            fetchGamificationData();
        }
    }, [currentView, currentUser, fetchGamificationData]);

    // Fetch admin stats when admin view is active
    const fetchAdminStats = useCallback(async () => {
        if (currentUser?.role !== 'admin') return;

        setLoadingStats(true);
        try {
            // Fetch stats from backend and bookings
            const [statsRes, bookingsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users/admin/stats`),
                fetch(`${API_BASE_URL}/api/bookings/all`)
            ]);

            const bookingsJson = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] };
            const bookingsData = bookingsJson.bookings || [];
            setAllBookings(bookingsData);

            // If backend stats available, use them
            if (statsRes.ok) {
                const stats = await statsRes.json();
                setAdminStats({
                    totalUsers: stats.totalUsers,
                    totalTechnicians: stats.totalTechnicians,
                    totalBookings: stats.totalBookings,
                    completedBookings: stats.completedBookings,
                    pendingBookings: stats.pendingBookings,
                    totalRevenue: stats.totalRevenue,
                    averageRating: stats.averageRating,
                    usersByRole: [
                        { role: 'Usuarios', count: stats.usersByRole.find((u: any) => u.role === 'user')?.count || 0 },
                        { role: 'Técnicos', count: stats.usersByRole.find((u: any) => u.role === 'technician')?.count || 0 },
                        { role: 'Admins', count: stats.usersByRole.find((u: any) => u.role === 'admin')?.count || 0 },
                    ],
                    bookingsByStatus: [
                        { status: 'Pendientes', count: stats.bookingsByStatus.find((b: any) => b.status === 'PENDING')?.count || 0 },
                        { status: 'Confirmadas', count: stats.bookingsByStatus.find((b: any) => b.status === 'CONFIRMED')?.count || 0 },
                        { status: 'En Progreso', count: stats.bookingsByStatus.find((b: any) => b.status === 'IN_PROGRESS')?.count || 0 },
                        { status: 'Completadas', count: stats.bookingsByStatus.find((b: any) => b.status === 'COMPLETED')?.count || 0 },
                        { status: 'Canceladas', count: stats.bookingsByStatus.find((b: any) => b.status === 'CANCELLED')?.count || 0 },
                    ],
                    topTechnicians: stats.topTechnicians,
                    recentActivity: bookingsData.slice(0, 5).map((b: any) => ({
                        type: b.status,
                        description: `Reserva de ${b.serviceType}`,
                        time: new Date(b.createdAt).toLocaleDateString('es-DO')
                    }))
                });
            } else {
                // Fallback to client-side calculation
                const completedBookings = bookingsData.filter((b: any) => b.status === 'COMPLETED').length;
                const pendingBookings = bookingsData.filter((b: any) => b.status === 'PENDING').length;
                const confirmedBookings = bookingsData.filter((b: any) => b.status === 'CONFIRMED').length;
                const inProgressBookings = bookingsData.filter((b: any) => b.status === 'IN_PROGRESS').length;
                const cancelledBookings = bookingsData.filter((b: any) => b.status === 'CANCELLED').length;

                const totalRevenue = bookingsData
                    .filter((b: any) => b.status === 'COMPLETED' && b.totalPrice)
                    .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);

                const avgRating = technicians.length > 0
                    ? technicians.reduce((sum, t) => sum + (t.rating || 0), 0) / technicians.length
                    : 0;

                const topTechs = [...technicians]
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 5)
                    .map(t => ({
                        name: t.name,
                        jobs: t.reviews?.length || 0,
                        rating: t.rating || 0
                    }));

                setAdminStats({
                    totalUsers: users.length,
                    totalTechnicians: technicians.length,
                    totalBookings: bookingsData.length,
                    completedBookings,
                    pendingBookings,
                    totalRevenue,
                    averageRating: avgRating,
                    usersByRole: [
                        { role: 'Usuarios', count: users.filter(u => u.role === 'user').length },
                        { role: 'Técnicos', count: users.filter(u => u.role === 'technician').length },
                        { role: 'Admins', count: users.filter(u => u.role === 'admin').length },
                    ],
                    bookingsByStatus: [
                        { status: 'Pendientes', count: pendingBookings },
                        { status: 'Confirmadas', count: confirmedBookings },
                        { status: 'En Progreso', count: inProgressBookings },
                        { status: 'Completadas', count: completedBookings },
                        { status: 'Canceladas', count: cancelledBookings },
                    ],
                    topTechnicians: topTechs,
                    recentActivity: bookingsData.slice(0, 5).map((b: any) => ({
                        type: b.status,
                        description: `Reserva de ${b.serviceType}`,
                        time: new Date(b.createdAt).toLocaleDateString('es-DO')
                    }))
                });
            }
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoadingStats(false);
        }
    }, [currentUser, technicians, users]);

    useEffect(() => {
        if (currentView === 'admin' && currentUser?.role === 'admin') {
            fetchAdminStats();
        }
    }, [currentView, currentUser, fetchAdminStats]);

    // Handle user deletion
    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    // Handle user role change
    const handleChangeUserRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });
            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'technician' | 'admin' } : u));
            }
        } catch (error) {
            console.error('Error changing user role:', error);
        }
    };

    // Handle booking creation
    const handleCreateBooking = async (bookingData: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            });

            if (response.ok) {
                setShowBookingForm(null);
                fetchUserBookings();
                // Check for new achievements
                const achievementsRes = await fetch(`${API_BASE_URL}/api/gamification/achievements/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser?.id, triggerEvent: 'BOOKING_CREATED' }),
                });
                if (achievementsRes.ok) {
                    const { newAchievements } = await achievementsRes.json();
                    if (newAchievements && newAchievements.length > 0) {
                        setUnlockedAchievement(newAchievements[0]);
                    }
                }
                alert('Reserva creada exitosamente!');
            } else {
                const error = await response.json();
                alert(error.error || 'Error al crear la reserva');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Error al crear la reserva');
        }
    };

    // Handle booking actions
    const handleConfirmBooking = async (bookingId: string) => {
        try {
            await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/confirm`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianUserId: currentUser?.id }),
            });
            fetchUserBookings();
        } catch (error) {
            console.error('Error confirming booking:', error);
        }
    };

    const handleStartBooking = async (bookingId: string) => {
        try {
            await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/start`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianUserId: currentUser?.id }),
            });
            fetchUserBookings();
        } catch (error) {
            console.error('Error starting booking:', error);
        }
    };

    const handleCompleteBooking = async (bookingId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianUserId: currentUser?.id }),
            });
            if (response.ok) {
                fetchUserBookings();
                fetchGamificationData();
                // Check for new achievements
                const achievementsRes = await fetch(`${API_BASE_URL}/api/gamification/achievements/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser?.id, triggerEvent: 'JOB_COMPLETED' }),
                });
                if (achievementsRes.ok) {
                    const { newAchievements } = await achievementsRes.json();
                    if (newAchievements && newAchievements.length > 0) {
                        setUnlockedAchievement(newAchievements[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error completing booking:', error);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;
        try {
            await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cancelledBy: currentUser?.role === 'technician' ? 'technician' : 'customer',
                    cancellerUserId: currentUser?.id,
                }),
            });
            fetchUserBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
        }
    };

    // Handle reward redemption
    const handleRedeemReward = async (rewardCode: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/gamification/rewards/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser?.id, rewardCode }),
            });
            if (response.ok) {
                const result = await response.json();
                alert(`Recompensa canjeada! Código: ${result.redemptionCode}`);
                fetchGamificationData();
            } else {
                const error = await response.json();
                alert(error.error || 'Error al canjear la recompensa');
            }
        } catch (error) {
            console.error('Error redeeming reward:', error);
        }
    };

    // Use specializations and locations from app settings (loaded from API)
    // These are already sorted alphabetically in the settings
    const availableSpecializations = React.useMemo(() => {
        return [...specializations].sort();
    }, [specializations]);

    const availableLocations = React.useMemo(() => {
        return [...locations].sort();
    }, [locations]);

    // API functions for managing specializations and locations
    const addSpecializationToAPI = async (spec: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/specializations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specialization: spec }),
            });
            if (response.ok) {
                const data = await response.json();
                setSpecializations(data.specializations);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding specialization:', error);
            return false;
        }
    };

    const removeSpecializationFromAPI = async (spec: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/specializations`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ specialization: spec }),
            });
            if (response.ok) {
                const data = await response.json();
                setSpecializations(data.specializations);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing specialization:', error);
            return false;
        }
    };

    const addLocationToAPI = async (loc: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: loc }),
            });
            if (response.ok) {
                const data = await response.json();
                setLocations(data.locations);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding location:', error);
            return false;
        }
    };

    const removeLocationFromAPI = async (loc: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/locations`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: loc }),
            });
            if (response.ok) {
                const data = await response.json();
                setLocations(data.locations);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing location:', error);
            return false;
        }
    };

    // Filtered Technicians based on search and filters
    const filteredTechnicians = technicians.filter((technician) => {
        const searchMatch =
            technician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            technician.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        const specializationMatch =
            !selectedSpecialization || technician.specialization === selectedSpecialization;
        const locationMatch = !selectedLocation || technician.location === selectedLocation;
        return searchMatch && specializationMatch && locationMatch;
    });

    // Handle Technician Registration Form Submission
    const handleTechnicianRegistration = async (data: z.infer<typeof technicianFormSchema>) => {
        setLoading(true);
        try {
            if (!currentUser) return;

            const response = await fetch(`${API_BASE_URL}/api/technicians`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    specialization: data.specialization,
                    location: data.location,
                    phone: data.phone,
                }),
            });

            if (response.ok) {
                const newTechnician = await response.json();
                // Update local state to reflect changes immediately
                setTechnicians([...technicians, { ...newTechnician, name: currentUser.name, email: currentUser.email, reviews: [] }]);
                setCurrentUser({ ...currentUser, role: 'technician', phone: data.phone });
                setRegistrationSuccess(true);
                resetTechnicianForm();
            } else {
                console.error("Failed to register technician");
            }
        } catch (error) {
            console.error("Error registering technician:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle User Registration Form Submission
    const handleUserRegistration = async (data: z.infer<typeof userFormSchema>) => {
        setLoading(true);
        try {
            // Combine firstName and lastName into name for backend
            const { firstName, lastName, ...restData } = data;
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...restData,
                    name: `${firstName} ${lastName}`,
                    photoBase64: registrationPhoto, // Include photo if selected
                }),
            });

            if (response.ok) {
                const newUser = await response.json();
                setUsers([...users, newUser]);
                setUserRegistrationSuccess(true);
                resetUserForm();
                setRegistrationPhoto(null); // Clear the photo state
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Error registering user:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle Login
    const handleLogin = async (data: z.infer<typeof loginFormSchema>) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const user = await response.json();
                setCurrentUser(user);
                setCurrentView(user.role === 'admin' ? 'admin' : 'home');
                setShowLoginForm(false);
                resetLoginForm();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Login failed:", response.status, errorData);
                alert(errorData.message || "Credenciales inválidas");
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert(`Error al iniciar sesión: ${error instanceof Error ? error.message : 'Error de conexión'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('home');
        setVerificationEmailSent(false);
    };

    // Handle Forgot Password
    const handleForgotPassword = async () => {
        if (!resetEmail.trim()) {
            alert('Por favor ingresa tu correo electrónico');
            return;
        }

        setForgotPasswordLoading(true);
        setForgotPasswordMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });

            const data = await response.json();
            setForgotPasswordMessage(data.message || 'Si el correo existe, recibirás un enlace para restablecer tu contraseña');
        } catch (error) {
            console.error('Error requesting password reset:', error);
            setForgotPasswordMessage('Error al procesar la solicitud. Intenta de nuevo.');
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    // Handle Reset Password
    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            alert('Por favor completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            alert('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setResetPasswordLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('Tu contraseña ha sido actualizada exitosamente');
                setShowResetPasswordForm(false);
                setResetToken(null);
                setNewPassword('');
                setConfirmPassword('');
                // Remove token from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                setShowLoginForm(true);
            } else {
                alert(data.message || 'Error al restablecer la contraseña');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Error al restablecer la contraseña. Intenta de nuevo.');
        } finally {
            setResetPasswordLoading(false);
        }
    };

    // Check for reset token in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('reset');
        if (token) {
            // Verify token is valid
            fetch(`${API_BASE_URL}/api/auth/verify-reset-token?token=${token}`)
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                        setResetToken(token);
                        setShowResetPasswordForm(true);
                    } else {
                        alert('El enlace de recuperación es inválido o ha expirado');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                })
                .catch(() => {
                    alert('Error al verificar el enlace');
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
        }
    }, []);

    // Handle Resend Verification Email
    const handleResendVerification = async () => {
        if (!currentUser?.email) return;

        setResendingVerification(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email }),
            });

            if (response.ok) {
                setVerificationEmailSent(true);
                setTimeout(() => setVerificationEmailSent(false), 10000); // Hide after 10s
            } else {
                const data = await response.json();
                alert(data.message || 'Error al reenviar verificacion');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            alert('Error al reenviar verificacion');
        } finally {
            setResendingVerification(false);
        }
    };

    // Handle Verify Technician
    const handleVerifyTechnician = async (id: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/technicians/${id}/verify`, {
                method: 'PUT',
            });
            if (response.ok) {
                setTechnicians(technicians.map(t => t.id === id ? { ...t, verified: true } : t));
            }
        } catch (error) {
            console.error("Error verifying technician:", error);
        }
    };

    // Handle Delete Technician
    const handleDeleteTechnician = async (id: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/technicians/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setTechnicians(technicians.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error("Error deleting technician:", error);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setSavingProfile(true);

        // Get form data
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;

        try {
            // Build request body
            const requestBody: Record<string, unknown> = { name, phone };

            // If user is a technician, include specializations
            if (currentUser.role === 'technician' && editingSpecializations.length > 0) {
                requestBody.specializations = editingSpecializations;
            }

            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setCurrentUser({ ...currentUser, ...updatedUser });
                setIsEditingProfile(false);
                // Refresh history
                fetchProfileHistory();
            } else {
                alert("Error al actualizar perfil");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error al actualizar perfil");
        } finally {
            setSavingProfile(false);
        }
    };

    // Fetch profile change history
    const fetchProfileHistory = useCallback(async () => {
        if (!currentUser) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/profile-history`);
            if (response.ok) {
                const history = await response.json();
                setProfileHistory(history);
            }
        } catch (error) {
            console.error("Error fetching profile history:", error);
        }
    }, [currentUser]);

    // Fetch technician availability
    const fetchAvailability = useCallback(async () => {
        if (!currentUser || currentUser.role !== 'technician' || !currentUser.technicianId) return;
        setLoadingAvailability(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/technician/${currentUser.technicianId}/availability`);
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    setAvailability(data.map((slot: any) => ({
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        isAvailable: slot.isAvailable,
                    })));
                } else {
                    // Initialize with default availability (Mon-Sat, 8am-6pm)
                    const defaultSlots = [];
                    for (let day = 1; day <= 6; day++) {
                        defaultSlots.push({
                            dayOfWeek: day,
                            startTime: '08:00',
                            endTime: '18:00',
                            isAvailable: true,
                        });
                    }
                    // Sunday off by default
                    defaultSlots.push({
                        dayOfWeek: 0,
                        startTime: '08:00',
                        endTime: '18:00',
                        isAvailable: false,
                    });
                    setAvailability(defaultSlots);
                }
            }
        } catch (error) {
            console.error("Error fetching availability:", error);
        } finally {
            setLoadingAvailability(false);
        }
    }, [currentUser]);

    // Save technician availability
    const saveAvailability = async () => {
        if (!currentUser || currentUser.role !== 'technician' || !currentUser.technicianId) return;
        setSavingAvailability(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/technician/${currentUser.technicianId}/availability`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slots: availability }),
            });
            if (response.ok) {
                alert('¡Disponibilidad guardada exitosamente!');
            } else {
                alert('Error al guardar disponibilidad');
            }
        } catch (error) {
            console.error("Error saving availability:", error);
            alert('Error al guardar disponibilidad');
        } finally {
            setSavingAvailability(false);
        }
    };

    // Update availability for a specific day
    const updateDayAvailability = (dayOfWeek: number, field: string, value: string | boolean) => {
        setAvailability(prev => prev.map(slot =>
            slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
        ));
    };

    // Day names in Spanish
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // Upload profile photo
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentUser || !e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen no puede ser mayor a 2MB');
            return;
        }

        setUploadingPhoto(true);

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async () => {
                const photoBase64 = reader.result as string;

                const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/photo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photoBase64 }),
                });

                if (response.ok) {
                    const result = await response.json();
                    setCurrentUser({ ...currentUser, photoUrl: result.photoUrl });
                    fetchProfileHistory();
                } else {
                    alert('Error al subir la foto');
                }
                setUploadingPhoto(false);
            };
            reader.onerror = () => {
                alert('Error al leer el archivo');
                setUploadingPhoto(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error uploading photo:", error);
            alert('Error al subir la foto');
            setUploadingPhoto(false);
        }
    };

    // Handle photo selection during registration (stores in state, doesn't upload yet)
    const handleRegistrationPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen no puede ser mayor a 2MB');
            return;
        }

        // Convert to base64 and store in state
        const reader = new FileReader();
        reader.onload = () => {
            setRegistrationPhoto(reader.result as string);
        };
        reader.onerror = () => {
            alert('Error al leer el archivo');
        };
        reader.readAsDataURL(file);
    };

    // Format field name for display
    const formatFieldName = (fieldName: string): string => {
        const names: { [key: string]: string } = {
            name: 'Nombre',
            phone: 'Teléfono',
            photoUrl: 'Foto de Perfil',
            email: 'Correo',
        };
        return names[fieldName] || fieldName;
    };

    // Handle Review Form Submission
    const handleAddReview = useCallback(
        (technicianId: string, reviewData: z.infer<typeof reviewFormSchema>) => {
            // Simulate API call
            setTimeout(() => {
                const newReview: Review = {
                    id: crypto.randomUUID(),
                    ...reviewData,
                    date: new Date().toISOString().split('T')[0],
                };

                const updatedTechnicians = technicians.map((tech) =>
                    tech.id === technicianId
                        ? {
                            ...tech,
                            reviews: [...tech.reviews, newReview],
                            rating: calculateAverageRating([...tech.reviews, newReview]),
                        }
                        : tech
                );

                setTechnicians(updatedTechnicians);
                setShowReviewForm(null); // Close form
                resetReviewForm();
                setLoading(false);
            }, 1000);
            setLoading(true);
        },
        [technicians, resetReviewForm]
    );

    // Calculate Average Rating
    const calculateAverageRating = (reviews: Review[]): number => {
        if (reviews.length === 0) return 0;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        return parseFloat((totalRating / reviews.length).toFixed(1));
    };

    // Frases dominicanas para diferentes contextos
    const frasesExito = [
        "¡Dímelo manito! 🎉",
        "¡Tamo' activo! 🔥",
        "¡Eso e' lo que hay! 💪",
        "¡Klk, qué lo qué! 🌴",
    ];

    const getFraseExito = () => frasesExito[Math.floor(Math.random() * frasesExito.length)];

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* Decorative tropical elements */}
            <div className="fixed top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

            <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 shadow-lg sticky top-0 z-50">
                {/* Decorative wave pattern */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1
                        className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setCurrentView('home')}
                    >
                        <span className="text-3xl">🔧</span>
                        <span className="hidden sm:inline">Técnicos en RD</span>
                        <span className="sm:hidden">TecRD</span>
                        <span className="text-2xl">🌴</span>
                    </h1>
                    <div className="flex gap-2 items-center">
                        {currentUser ? (
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Points display (compact) */}
                                {userPoints && (
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setCurrentView('gamification')}
                                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-white shadow-md hover:shadow-lg transition-all border-2 border-white/30 cursor-pointer"
                                    >
                                        <span className="text-sm">⚡</span>
                                        <span className="font-bold text-sm">{userPoints.totalPoints?.toLocaleString() || 0}</span>
                                    </motion.div>
                                )}
                                <span className="text-sm font-medium text-white/90 hidden md:block">
                                    ¡Klk, {currentUser.name}!
                                </span>
                                {/* Navigation buttons */}
                                <Button
                                    onClick={() => setCurrentView(currentView === 'bookings' ? 'home' : 'bookings')}
                                    variant="ghost"
                                    size="sm"
                                    className={cn("text-white/80 hover:text-white hover:bg-white/20", currentView === 'bookings' && "text-white bg-white/20")}
                                    title="Mis Citas"
                                >
                                    <Calendar className="w-5 h-5" />
                                </Button>
                                <Button
                                    onClick={() => setCurrentView(currentView === 'gamification' ? 'home' : 'gamification')}
                                    variant="ghost"
                                    size="sm"
                                    className={cn("text-white/80 hover:text-white hover:bg-white/20", currentView === 'gamification' && "text-white bg-white/20")}
                                    title="Puntos y Trofeos"
                                >
                                    <Trophy className="w-5 h-5" />
                                </Button>
                                {currentUser.role === 'admin' && (
                                    <Button
                                        onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
                                        variant="ghost"
                                        size="sm"
                                        className={cn("text-white/80 hover:text-white hover:bg-white/20", currentView === 'admin' && "text-white bg-white/20")}
                                    >
                                        <Shield className="w-5 h-5" />
                                    </Button>
                                )}
                                <Button onClick={() => setShowProfileModal(true)} variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/20">
                                    <User className="w-5 h-5" />
                                </Button>
                                <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/80 hover:text-red-200 hover:bg-red-500/20">
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Button onClick={() => setShowLoginForm(true)} variant="ghost" className="text-white/90 hover:text-white hover:bg-white/20">
                                    <LogIn className="w-5 h-5 sm:mr-2" />
                                    <span className="hidden sm:inline">Entrar</span>
                                </Button>
                                <Button onClick={() => setShowUserRegisterForm(true)} variant="outline" className="hidden md:flex border-white/50 text-white hover:bg-white/20">
                                    ¡Únete!
                                </Button>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button onClick={() => setShowUserRegisterForm(true)} className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg border-2 border-white/30">
                                        <PlusCircle className="mr-2 w-4 h-4" />
                                        <span className="hidden sm:inline">¡Soy Técnico!</span>
                                        <span className="sm:hidden">Técnico</span>
                                    </Button>
                                </motion.div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Email Verification Banner */}
            {currentUser && currentUser.emailVerified === false && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-md"
                >
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-white">
                                <MailWarning className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">
                                    Tu correo electronico no ha sido verificado. Revisa tu bandeja de entrada.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {verificationEmailSent ? (
                                    <span className="flex items-center gap-2 text-white text-sm bg-white/20 px-3 py-1.5 rounded-full">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Correo enviado!
                                    </span>
                                ) : (
                                    <Button
                                        onClick={handleResendVerification}
                                        disabled={resendingVerification}
                                        size="sm"
                                        className="bg-white text-orange-600 hover:bg-orange-50 font-medium"
                                    >
                                        {resendingVerification ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Reenviar verificacion
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bookings View */}
            {currentView === 'bookings' && currentUser && (
                <main className="container mx-auto px-4 py-8 relative">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="text-4xl">📅</span>
                            Mis Citas
                            <span className="text-sm font-normal text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                                ¡Tamo' activo!
                            </span>
                        </h2>
                        <motion.div whileHover={{ scale: 1.05 }}>
                            <Button
                                onClick={() => setCurrentView('home')}
                                variant="outline"
                                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                            >
                                🏠 Pa'l inicio
                            </Button>
                        </motion.div>
                    </div>
                    <BookingList
                        bookings={userBookings}
                        userRole={currentUser.role === 'technician' ? 'technician' : 'customer'}
                        loading={loadingBookings}
                        onConfirm={currentUser.role === 'technician' ? handleConfirmBooking : undefined}
                        onStart={currentUser.role === 'technician' ? handleStartBooking : undefined}
                        onComplete={currentUser.role === 'technician' ? handleCompleteBooking : undefined}
                        onCancel={handleCancelBooking}
                    />
                </main>
            )}

            {/* Gamification View */}
            {currentView === 'gamification' && currentUser && (
                <main className="container mx-auto px-4 py-8 relative">
                    {/* Decorative confetti-like elements */}
                    <div className="absolute top-10 right-10 text-4xl animate-bounce">🏆</div>
                    <div className="absolute top-20 left-10 text-3xl animate-pulse">⭐</div>

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="text-4xl">🏆</span>
                            ¡Tu Vacano Progreso!
                            <span className="text-sm font-normal text-amber-600 bg-amber-100 px-3 py-1 rounded-full animate-pulse">
                                🔥 ¡Dale que e' tuyo!
                            </span>
                        </h2>
                        <motion.div whileHover={{ scale: 1.05 }}>
                            <Button
                                onClick={() => setCurrentView('home')}
                                variant="outline"
                                className="border-amber-500 text-amber-600 hover:bg-amber-50"
                            >
                                🏠 Pa'l inicio
                            </Button>
                        </motion.div>
                    </div>

                    {loadingGamification ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin text-4xl text-blue-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left column - Points and Achievements */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Points Display */}
                                {userPoints && (
                                    <PointsDisplay
                                        totalPoints={userPoints.totalPoints || 0}
                                        currentLevel={userPoints.currentLevel || 1}
                                        levelName={userPoints.levelNameEs || 'Novato'}
                                        levelProgress={userPoints.levelProgress || 0}
                                        pointsToNextLevel={userPoints.pointsToNextLevel || 500}
                                        nextLevelName={userPoints.nextLevelNameEs}
                                    />
                                )}

                                {/* Achievements */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                        Logros
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {userAchievements.length > 0 ? (
                                            userAchievements.slice(0, 6).map((achievement: any) => (
                                                <AchievementCard
                                                    key={achievement.id || achievement.code}
                                                    code={achievement.code}
                                                    name={achievement.name}
                                                    nameEs={achievement.nameEs}
                                                    description={achievement.description}
                                                    descriptionEs={achievement.descriptionEs}
                                                    pointsReward={achievement.pointsReward}
                                                    badgeColor={achievement.badgeColor || '#3B82F6'}
                                                    category={achievement.category}
                                                    isUnlocked={achievement.isUnlocked}
                                                    unlockedAt={achievement.unlockedAt}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-4">
                                                Completa acciones para desbloquear logros
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Rewards */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Gift className="w-5 h-5 text-purple-500" />
                                        Recompensas Disponibles
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {rewards.length > 0 ? (
                                            rewards.slice(0, 4).map((reward: any) => (
                                                <RewardCard
                                                    key={reward.id || reward.code}
                                                    code={reward.code}
                                                    name={reward.name}
                                                    nameEs={reward.nameEs}
                                                    description={reward.description}
                                                    descriptionEs={reward.descriptionEs}
                                                    pointsCost={reward.pointsCost}
                                                    category={reward.category}
                                                    userPoints={userPoints?.totalPoints || 0}
                                                    onRedeem={() => handleRedeemReward(reward.code)}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 col-span-2 text-center py-4">
                                                No hay recompensas disponibles
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right column - Leaderboard */}
                            <div>
                                <Leaderboard
                                    entries={leaderboard}
                                    currentUserId={currentUser.id}
                                    loading={loadingGamification}
                                    period={leaderboardPeriod}
                                    onPeriodChange={(period) => {
                                        setLeaderboardPeriod(period);
                                        fetchGamificationData();
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* Admin View - Enhanced */}
            {currentView === 'admin' ? (
                <main className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="text-4xl">🛡️</span>
                            Panel de Administración
                            <span className="text-sm font-normal text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                                Admin Mode
                            </span>
                        </h2>
                        <motion.div whileHover={{ scale: 1.05 }}>
                            <Button
                                onClick={() => setCurrentView('home')}
                                variant="outline"
                                className="border-purple-500 text-purple-600 hover:bg-purple-50"
                            >
                                🏠 Pa'l inicio
                            </Button>
                        </motion.div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-md">
                        {[
                            { id: 'technicians', label: 'Técnicos', icon: Wrench, color: 'amber' },
                            { id: 'users', label: 'Usuarios', icon: Users, color: 'blue' },
                            { id: 'bookings', label: 'Reservas', icon: Calendar, color: 'emerald' },
                            { id: 'reports', label: 'Reportes', icon: BarChart3, color: 'purple' },
                            { id: 'settings', label: 'Configuración', icon: Settings, color: 'gray' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setAdminTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                                    adminTab === tab.id
                                        ? `bg-${tab.color}-500 text-white shadow-lg`
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                                style={adminTab === tab.id ? {
                                    backgroundColor: tab.color === 'amber' ? '#f59e0b' :
                                        tab.color === 'blue' ? '#3b82f6' :
                                            tab.color === 'emerald' ? '#10b981' :
                                                tab.color === 'gray' ? '#6b7280' : '#8b5cf6'
                                } : {}}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {/* Technicians Tab */}
                        {adminTab === 'technicians' && (
                            <motion.div
                                key="technicians"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Wrench className="w-5 h-5" />
                                            Gestión de Técnicos ({technicians.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Especialidad</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ubicación</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rating</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                {technicians.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                            <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                            No hay técnicos registrados
                                                        </td>
                                                    </tr>
                                                ) : technicians.map((tech) => (
                                                    <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                {tech.photoUrl ? (
                                                                    <img
                                                                        src={tech.photoUrl}
                                                                        alt={tech.name}
                                                                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-300"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                                        <Wrench className="w-5 h-5 text-amber-600" />
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{tech.name}</p>
                                                                    <p className="text-xs text-gray-500">{tech.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{tech.specialization}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {tech.location}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="flex items-center gap-1 text-amber-600">
                                                                <Star className="w-4 h-4 fill-amber-400" />
                                                                {tech.rating?.toFixed(1) || '0.0'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {tech.verified ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    Verificado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                                    <Clock className="w-3 h-3" />
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                {!tech.verified && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleVerifyTechnician(tech.id)}
                                                                        className="bg-green-500 hover:bg-green-600 text-white text-xs"
                                                                    >
                                                                        <UserCheck className="w-3 h-3 mr-1" />
                                                                        Verificar
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleDeleteTechnician(tech.id)}
                                                                    className="text-xs"
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                                    Eliminar
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Users Tab */}
                        {adminTab === 'users' && (
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            Gestión de Usuarios ({users.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teléfono</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                {users.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                            No hay usuarios registrados
                                                        </td>
                                                    </tr>
                                                ) : users.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                                                    user.role === 'admin' ? "bg-purple-100" :
                                                                        user.role === 'technician' ? "bg-amber-100" : "bg-blue-100"
                                                                )}>
                                                                    {user.role === 'admin' ? <Shield className="w-5 h-5 text-purple-600" /> :
                                                                        user.role === 'technician' ? <Wrench className="w-5 h-5 text-amber-600" /> :
                                                                            <User className="w-5 h-5 text-blue-600" />}
                                                                </div>
                                                                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{user.email}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{user.phone || '-'}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Select
                                                                value={user.role}
                                                                onValueChange={(value: string) => handleChangeUserRole(user.id, value)}
                                                            >
                                                                <SelectTrigger className="w-32 h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="user">Usuario</SelectItem>
                                                                    <SelectItem value="technician">Técnico</SelectItem>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="text-xs"
                                                            >
                                                                <Trash2 className="w-3 h-3 mr-1" />
                                                                Eliminar
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Bookings Tab */}
                        {adminTab === 'bookings' && (
                            <motion.div
                                key="bookings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Calendar className="w-5 h-5" />
                                            Todas las Reservas ({allBookings.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Técnico</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Servicio</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Estado</th>
                                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                {allBookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                                            No hay reservas registradas
                                                        </td>
                                                    </tr>
                                                ) : allBookings.map((booking: any) => (
                                                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <p className="font-medium text-gray-900 dark:text-white">{booking.customer?.name || 'N/A'}</p>
                                                            <p className="text-xs text-gray-500">{booking.phone}</p>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                            {booking.technician?.user?.name || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{booking.serviceType}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                            {new Date(booking.scheduledDate).toLocaleDateString('es-DO')}
                                                            <span className="text-xs text-gray-400 ml-1">{booking.scheduledTime}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={cn(
                                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                                booking.status === 'COMPLETED' ? "bg-green-100 text-green-800" :
                                                                    booking.status === 'PENDING' ? "bg-yellow-100 text-yellow-800" :
                                                                        booking.status === 'CONFIRMED' ? "bg-blue-100 text-blue-800" :
                                                                            booking.status === 'IN_PROGRESS' ? "bg-purple-100 text-purple-800" :
                                                                                "bg-red-100 text-red-800"
                                                            )}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                            {booking.totalPrice ? `RD$${booking.totalPrice.toLocaleString()}` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Reports Tab */}
                        {adminTab === 'reports' && (
                            <motion.div
                                key="reports"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {loadingStats ? (
                                    <div className="flex justify-center items-center py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                    </div>
                                ) : adminStats ? (
                                    <>
                                        {/* Stats Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setReportDetailModal({ type: 'users', title: 'Total Usuarios' })}
                                                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-blue-100 text-sm">Total Usuarios</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalUsers}</p>
                                                    </div>
                                                    <Users className="w-12 h-12 text-blue-200" />
                                                </div>
                                                <p className="text-blue-200 text-xs mt-2">Click para ver detalles →</p>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setReportDetailModal({ type: 'technicians', title: 'Técnicos Registrados' })}
                                                className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-amber-100 text-sm">Técnicos</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalTechnicians}</p>
                                                    </div>
                                                    <Wrench className="w-12 h-12 text-amber-200" />
                                                </div>
                                                <p className="text-amber-200 text-xs mt-2">Click para ver detalles →</p>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setReportDetailModal({ type: 'bookings', title: 'Todas las Reservas' })}
                                                className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-emerald-100 text-sm">Reservas Totales</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalBookings}</p>
                                                    </div>
                                                    <Calendar className="w-12 h-12 text-emerald-200" />
                                                </div>
                                                <p className="text-emerald-200 text-xs mt-2">Click para ver detalles →</p>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-green-100 text-sm">Ingresos Totales</p>
                                                        <p className="text-3xl font-bold">RD${adminStats.totalRevenue.toLocaleString()}</p>
                                                    </div>
                                                    <DollarSign className="w-12 h-12 text-green-200" />
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Second Row Stats */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border-2 border-green-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Completadas</p>
                                                        <p className="text-2xl font-bold text-green-600">{adminStats.completedBookings}</p>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border-2 border-yellow-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                                        <Clock className="w-6 h-6 text-yellow-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Pendientes</p>
                                                        <p className="text-2xl font-bold text-yellow-600">{adminStats.pendingBookings}</p>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border-2 border-amber-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                                        <Star className="w-6 h-6 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Rating Promedio</p>
                                                        <p className="text-2xl font-bold text-amber-600">{adminStats.averageRating.toFixed(1)} ⭐</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Charts Section */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Users by Role */}
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-blue-500" />
                                                    Usuarios por Rol
                                                </h3>
                                                <div className="space-y-3">
                                                    {adminStats.usersByRole.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">{item.role}</div>
                                                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${adminStats.totalUsers > 0 ? (item.count / adminStats.totalUsers) * 100 : 0}%` }}
                                                                    transition={{ duration: 0.8 }}
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-amber-500" : "bg-purple-500"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="w-8 text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bookings by Status */}
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                                    Reservas por Estado
                                                </h3>
                                                <div className="space-y-3">
                                                    {adminStats.bookingsByStatus.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-3">
                                                            <div className="w-24 text-sm text-gray-600 dark:text-gray-400">{item.status}</div>
                                                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${adminStats.totalBookings > 0 ? (item.count / adminStats.totalBookings) * 100 : 0}%` }}
                                                                    transition={{ duration: 0.8 }}
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        idx === 0 ? "bg-yellow-500" :
                                                                            idx === 1 ? "bg-blue-500" :
                                                                                idx === 2 ? "bg-purple-500" :
                                                                                    idx === 3 ? "bg-green-500" : "bg-red-500"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="w-8 text-sm font-bold text-gray-700 dark:text-gray-300">{item.count}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Top Technicians */}
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                <Trophy className="w-5 h-5 text-amber-500" />
                                                Top Técnicos
                                            </h3>
                                            {adminStats.topTechnicians.length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">No hay técnicos registrados</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                    {adminStats.topTechnicians.map((tech, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            whileHover={{ scale: 1.05 }}
                                                            className={cn(
                                                                "p-4 rounded-xl text-center",
                                                                idx === 0 ? "bg-gradient-to-br from-yellow-100 to-amber-200 border-2 border-yellow-400" :
                                                                    idx === 1 ? "bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400" :
                                                                        idx === 2 ? "bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-amber-400" :
                                                                            "bg-gray-50 dark:bg-gray-700"
                                                            )}
                                                        >
                                                            <div className="text-2xl mb-2">
                                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}
                                                            </div>
                                                            <p className="font-bold text-gray-800 dark:text-white truncate">{tech.name}</p>
                                                            <p className="text-sm text-amber-600">⭐ {tech.rating.toFixed(1)}</p>
                                                            <p className="text-xs text-gray-500">{tech.jobs} trabajos</p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>No hay datos de reportes disponibles</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Settings Tab */}
                        {adminTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Specializations Management */}
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Wrench className="w-5 h-5" />
                                                Especializaciones ({specializations.length})
                                            </h3>
                                        </div>
                                        <div className="p-4">
                                            {/* Add new specialization */}
                                            <div className="flex gap-2 mb-4">
                                                <Input
                                                    placeholder="Nueva especialización..."
                                                    value={newSpecialization}
                                                    onChange={(e) => setNewSpecialization(e.target.value)}
                                                    className="flex-1"
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && newSpecialization.trim()) {
                                                            if (!specializations.includes(newSpecialization.trim())) {
                                                                await addSpecializationToAPI(newSpecialization.trim());
                                                            }
                                                            setNewSpecialization('');
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    onClick={async () => {
                                                        if (newSpecialization.trim() && !specializations.includes(newSpecialization.trim())) {
                                                            await addSpecializationToAPI(newSpecialization.trim());
                                                            setNewSpecialization('');
                                                        }
                                                    }}
                                                    className="bg-amber-500 hover:bg-amber-600"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {/* List of specializations */}
                                            <div className="max-h-80 overflow-y-auto space-y-2">
                                                {specializations.map((spec, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Wrench className="w-4 h-4 text-amber-500" />
                                                            {spec}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={async () => {
                                                                // Check if any technician uses this specialization
                                                                const inUse = technicians.some(t => t.specialization === spec || t.specializations?.includes(spec));
                                                                if (inUse) {
                                                                    alert(`No se puede eliminar "${spec}" porque hay técnicos registrados con esta especialización.`);
                                                                } else {
                                                                    await removeSpecializationFromAPI(spec);
                                                                }
                                                            }}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Locations Management */}
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                <MapPin className="w-5 h-5" />
                                                Ubicaciones ({locations.length})
                                            </h3>
                                        </div>
                                        <div className="p-4">
                                            {/* Add new location */}
                                            <div className="flex gap-2 mb-4">
                                                <Input
                                                    placeholder="Nueva ubicación..."
                                                    value={newLocation}
                                                    onChange={(e) => setNewLocation(e.target.value)}
                                                    className="flex-1"
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && newLocation.trim()) {
                                                            if (!locations.includes(newLocation.trim())) {
                                                                await addLocationToAPI(newLocation.trim());
                                                            }
                                                            setNewLocation('');
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    onClick={async () => {
                                                        if (newLocation.trim() && !locations.includes(newLocation.trim())) {
                                                            await addLocationToAPI(newLocation.trim());
                                                            setNewLocation('');
                                                        }
                                                    }}
                                                    className="bg-blue-500 hover:bg-blue-600"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {/* List of locations */}
                                            <div className="max-h-80 overflow-y-auto space-y-2">
                                                {locations.map((loc, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-blue-500" />
                                                            {loc}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={async () => {
                                                                // Check if any technician uses this location
                                                                const inUse = technicians.some(t => t.location === loc);
                                                                if (inUse) {
                                                                    alert(`No se puede eliminar "${loc}" porque hay técnicos registrados en esta ubicación.`);
                                                                } else {
                                                                    await removeLocationFromAPI(loc);
                                                                }
                                                            }}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Info note */}
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                    <p className="text-blue-700 dark:text-blue-300 text-sm flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <span>
                                            Las especializaciones y ubicaciones que agregues estarán disponibles inmediatamente
                                            para que los nuevos técnicos las seleccionen durante el registro.
                                            No se pueden eliminar opciones que estén siendo utilizadas por técnicos registrados.
                                        </span>
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            ) : (
                <>
                    {/* Hero Section - Dominican Style */}
                    <section className="relative bg-gradient-to-br from-emerald-600 via-teal-500 to-sky-600 text-white py-20 px-4 overflow-hidden">
                        {/* Tropical decorations */}
                        <div className="absolute top-5 left-5 text-6xl opacity-20 animate-pulse">🌴</div>
                        <div className="absolute top-10 right-10 text-5xl opacity-20 animate-bounce">🔧</div>
                        <div className="absolute bottom-10 left-20 text-4xl opacity-20">🏝️</div>
                        <div className="absolute bottom-5 right-20 text-5xl opacity-20 animate-pulse">⚡</div>

                        <div className="container mx-auto text-center relative z-10">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="mb-4"
                            >
                                <span className="text-6xl">🔧🌴</span>
                            </motion.div>
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-lg"
                            >
                                ¡Dímelo! Encuentra Tu Técnico
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-xl md:text-2xl mb-4 text-white/90 max-w-2xl mx-auto"
                            >
                                Los mejores técnicos de Santiago, ¡a un clic de tu casa!
                            </motion.p>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="text-lg text-amber-200 font-medium"
                            >
                                🇩🇴 Rápido, seguro y con el mejor servicio caribeño
                            </motion.p>
                        </div>
                        {/* Decorative wave at bottom */}
                        <div className="absolute bottom-0 left-0 right-0">
                            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12 fill-sky-50 dark:fill-gray-900">
                                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                                <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                                <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                            </svg>
                        </div>
                        {/* Decorative background elements */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
                            <Wrench className="absolute top-10 left-10 w-32 h-32 text-white transform -rotate-12" />
                            <User className="absolute bottom-10 right-10 w-40 h-40 text-white transform rotate-12" />
                        </div>
                    </section >

                    {/* Featured Technicians Section - Real Data with Big Photos */}
                    {technicians.length > 0 && (
                        <section className="py-16 bg-gradient-to-b from-sky-50 to-white dark:from-gray-800 dark:to-gray-900">
                            <div className="container mx-auto px-4">
                                <h2 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-3">
                                    <span>🛠️</span> Nuestros Tígueres en Acción <span>💪</span>
                                </h2>
                                <p className="text-center text-emerald-600 dark:text-emerald-400 mb-12 text-lg">
                                    ¡Los mejores del Cibao, pa' servirte!
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {technicians.slice(0, 4).map((technician, index) => {
                                        const gradients = [
                                            'from-amber-400 to-orange-500',
                                            'from-sky-400 to-blue-500',
                                            'from-pink-400 to-rose-500',
                                            'from-emerald-400 to-teal-500'
                                        ];
                                        return (
                                            <motion.div
                                                key={technician.id}
                                                whileHover={{ y: -10, scale: 1.02 }}
                                                className={`rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${gradients[index % 4]} cursor-pointer`}
                                                onClick={() => {
                                                    if (!currentUser) {
                                                        setShowLoginForm(true);
                                                        return;
                                                    }
                                                    setShowBookingForm({
                                                        technician: {
                                                            id: technician.id,
                                                            name: technician.name,
                                                            specialization: technician.specialization,
                                                        },
                                                        show: true,
                                                    });
                                                }}
                                            >
                                                {/* Large Photo Section */}
                                                <div className="relative h-56 bg-gray-200 dark:bg-gray-700">
                                                    {technician.photoUrl ? (
                                                        <img
                                                            src={technician.photoUrl}
                                                            alt={technician.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User className="w-24 h-24 text-white/70" />
                                                        </div>
                                                    )}
                                                    {/* Verified badge */}
                                                    {technician.verified && (
                                                        <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                                                            <CheckCircle className="w-3 h-3" /> Verificado
                                                        </div>
                                                    )}
                                                    {/* Rating badge */}
                                                    {technician.rating > 0 && (
                                                        <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                            <span className="text-gray-800 dark:text-white">{technician.rating.toFixed(1)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-5 bg-white dark:bg-gray-800">
                                                    <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white truncate">
                                                        {technician.name}
                                                    </h3>
                                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-2 flex items-center gap-1">
                                                        <span>🔧</span> {technician.specialization}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {technician.location}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    <main className="container mx-auto px-4 py-8">
                        {/* Search bar with Dominican flair */}
                        <div className="mb-12 flex flex-col md:flex-row gap-4 items-center justify-center max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl -mt-10 relative z-20 border-2 border-emerald-100">
                            <div className="absolute -top-3 left-6 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                                🔍 ¿Qué necesitas?
                            </div>
                            <div className="w-full md:w-1/3 relative mt-2">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 w-5 h-5" />
                                <Input
                                    type="text"
                                    placeholder="Busca tu técnico..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 h-12 text-lg rounded-xl"
                                />
                            </div>
                            <div className="w-full md:w-1/3">
                                <Select onValueChange={(val: string) => setSelectedSpecialization(val === 'all' ? '' : val)} value={selectedSpecialization || 'all'}>
                                    <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-lg">
                                        <SelectValue placeholder="Especialización" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem key="all" value="all">
                                            Todas las Especializaciones
                                        </SelectItem>
                                        {availableSpecializations.map((specialization) => (
                                            <SelectItem key={specialization} value={specialization}>
                                                {specialization}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full md:w-1/3">
                                <Select onValueChange={(val: string) => setSelectedLocation(val === 'all' ? '' : val)} value={selectedLocation || 'all'}>
                                    <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-lg">
                                        <SelectValue placeholder="Ubicación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem key="all" value="all">
                                            Todas las Ubicaciones
                                        </SelectItem>
                                        {availableLocations.map((location) => (
                                            <SelectItem key={location} value={location}>
                                                {location}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="animate-spin text-4xl text-blue-500" />
                            </div>
                        ) : filteredTechnicians.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-6xl mb-4 block">🔍</span>
                                <p className="text-gray-500 dark:text-gray-400 text-lg">
                                    ¡Diache! No encontramo' técnicos con esos criterios.
                                </p>
                                <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-2">
                                    Prueba con otra búsqueda, manito.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {filteredTechnicians.map((technician) => (
                                        <motion.div
                                            key={technician.id}
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            whileHover={{ y: -5 }}
                                        >
                                            <Card className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-300 overflow-hidden group h-full flex flex-col rounded-2xl">
                                                {/* Prominent Photo Section */}
                                                <div className="relative">
                                                    {/* Background gradient banner */}
                                                    <div className="h-24 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

                                                    {/* Profile photo - overlapping the banner */}
                                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
                                                        {technician.photoUrl ? (
                                                            <img
                                                                src={technician.photoUrl}
                                                                alt={technician.name}
                                                                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-xl ring-2 ring-emerald-400"
                                                            />
                                                        ) : (
                                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-xl">
                                                                <User className="w-10 h-10 text-white" />
                                                            </div>
                                                        )}
                                                        {technician.verified && (
                                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-white shadow-md">
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <CardHeader className="pt-14 pb-4 text-center">
                                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                        {technician.name}
                                                    </h3>
                                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center justify-center gap-1">
                                                        <span className="text-base">🔧</span>
                                                        {technician.specialization}
                                                    </p>
                                                    {technician.verified && (
                                                        <span className="inline-flex items-center gap-1 mt-2 bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">
                                                            <CheckCircle className="w-3 h-3" /> Técnico Verificado
                                                        </span>
                                                    )}
                                                </CardHeader>
                                                <CardContent className="pt-6 flex-grow">
                                                    <div className="space-y-3 mb-6">
                                                        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 text-sm">
                                                            <MapPin className="w-4 h-4 text-gray-400" />
                                                            {technician.location}
                                                        </p>
                                                        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 text-sm">
                                                            <Phone className="w-4 h-4 text-gray-400" />
                                                            {technician.phone}
                                                        </p>
                                                        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 text-sm">
                                                            <Mail className="w-4 h-4 text-gray-400" />
                                                            {technician.email}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between mb-6 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                                                        <div className="flex items-center">
                                                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
                                                            <span className="text-gray-800 dark:text-white font-bold text-lg">
                                                                {technician.rating > 0 ? technician.rating.toFixed(1) : '-'}
                                                            </span>
                                                            <span className="text-gray-400 text-xs ml-1">/ 5.0</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {technician.reviews.length} {technician.reviews.length === 1 ? 'reseña' : 'reseñas'}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 uppercase tracking-wider text-xs">Reseñas Recientes</h4>
                                                        <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                            <AnimatePresence>
                                                                {technician.reviews.length > 0 ? (
                                                                    technician.reviews.slice(0, 2).map((review) => (
                                                                        <motion.div
                                                                            key={review.id}
                                                                            variants={reviewVariants}
                                                                            initial="hidden"
                                                                            animate="visible"
                                                                            exit="exit"
                                                                            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 text-sm"
                                                                        >
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="font-medium text-gray-800 dark:text-gray-200">{review.author}</span>
                                                                                <div className="flex items-center">
                                                                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                                                    <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">{review.rating}</span>
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 italic">"{review.comment}"</p>
                                                                        </motion.div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-gray-400 text-xs italic text-center py-2">Sin reseñas aún.</p>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="pt-0 pb-6 px-6">
                                                    <div className={`grid gap-3 w-full ${hasCompletedBookingWithTechnician(technician.id) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                        {hasCompletedBookingWithTechnician(technician.id) && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 transition-colors rounded-xl"
                                                                onClick={() => setShowReviewForm({ technicianId: technician.id, show: true })}
                                                            >
                                                                ⭐ Calificar
                                                            </Button>
                                                        )}
                                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                            <Button
                                                                size="sm"
                                                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all rounded-xl"
                                                                onClick={() => {
                                                                    if (!currentUser) {
                                                                        setShowLoginForm(true);
                                                                        return;
                                                                    }
                                                                    setShowBookingForm({
                                                                        technician: {
                                                                            id: technician.id,
                                                                            name: technician.name,
                                                                            specialization: technician.specialization,
                                                                        },
                                                                        show: true,
                                                                    });
                                                                }}
                                                            >
                                                                📅 ¡Contratarlo!
                                                            </Button>
                                                        </motion.div>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </main>
                </>
            )}

            {/* About Us View */}
            {currentView === 'about' && (
                <main className="container mx-auto px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto"
                    >
                        {/* Header */}
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-center gap-3">
                                <span className="text-5xl">🌴</span>
                                Sobre Nosotros
                                <span className="text-5xl">🇩🇴</span>
                            </h2>
                            <p className="text-xl text-gray-600 dark:text-gray-300">
                                Conectando al Cibao con los mejores técnicos
                            </p>
                        </div>

                        {/* Mission Card */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-2xl mb-8"
                        >
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                🎯 Nuestra Misión
                            </h3>
                            <p className="text-lg leading-relaxed">
                                En Técnicos en RD, nuestra misión es conectar a los residentes de Santiago de los Caballeros
                                y toda la región del Cibao con técnicos profesionales calificados. Creemos que encontrar
                                un buen técnico no debería ser difícil - por eso creamos una plataforma que hace el proceso
                                fácil, seguro y confiable.
                            </p>
                        </motion.div>

                        {/* Values Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-l-4 border-amber-500"
                            >
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    ⭐ Calidad Garantizada
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Todos nuestros técnicos pasan por un proceso de verificación para asegurar
                                    que recibas el mejor servicio posible.
                                </p>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-l-4 border-blue-500"
                            >
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    🤝 Confianza
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Las reseñas y calificaciones de otros usuarios te ayudan a tomar
                                    decisiones informadas sobre qué técnico contratar.
                                </p>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-l-4 border-emerald-500"
                            >
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    🏆 Comunidad Local
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Apoyamos a los técnicos locales de Santiago y el Cibao, fortaleciendo
                                    nuestra economía regional.
                                </p>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-l-4 border-purple-500"
                            >
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    📱 Tecnología Moderna
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Nuestra plataforma es fácil de usar, rápida y disponible las 24 horas
                                    del día, los 7 días de la semana.
                                </p>
                            </motion.div>
                        </div>

                        {/* Team Section */}
                        <div className="bg-gradient-to-r from-sky-100 to-emerald-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-8 mb-8">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                                🔧 Servicios Disponibles
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {['⚡ Electricistas', '🔧 Plomeros', '🚗 Mecánicos', '🪚 Carpinteros', '❄️ A/C'].map((service) => (
                                    <div key={service} className="bg-white dark:bg-gray-600 rounded-xl p-4 text-center shadow-md">
                                        <span className="text-lg font-medium text-gray-700 dark:text-white">{service}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                                ¿Listo para encontrar tu técnico?
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={() => setCurrentView('home')}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 text-lg"
                                >
                                    🔍 Buscar Técnicos
                                </Button>
                                <Button
                                    onClick={() => setShowUserRegisterForm(true)}
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-8 py-3 text-lg"
                                >
                                    📝 Únete Ahora
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </main>
            )}

            {/* Footer - Dominican Style */}
            <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-gray-300 py-12 mt-12 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-5 right-10 text-4xl opacity-10">🌴</div>
                <div className="absolute bottom-5 left-10 text-4xl opacity-10">🇩🇴</div>

                <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">🔧🌴</span>
                            Técnicos en RD
                        </h3>
                        <p className="text-sm text-gray-400">
                            ¡El mejor equipo de tígueres pa' resolver to' lo de tu casa! 💪
                        </p>
                        <p className="text-emerald-400 text-xs mt-2">
                            Desde el Cibao pa'l mundo 🌴
                        </p>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">🔗 Enlaces Rápidos</h4>
                        <ul className="space-y-2 text-sm">
                            <li><button onClick={() => setCurrentView('home')} className="hover:text-emerald-400 transition-colors">🏠 Inicio</button></li>
                            <li><button onClick={() => setCurrentView('home')} className="hover:text-emerald-400 transition-colors">🔍 Buscar Técnicos</button></li>
                            <li><button onClick={() => setShowUserRegisterForm(true)} className="hover:text-emerald-400 transition-colors">📝 Registrarse</button></li>
                            <li><button onClick={() => setCurrentView('about')} className="hover:text-emerald-400 transition-colors">ℹ️ Sobre Nosotros</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">📞 Contáctanos</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-emerald-400" /> contacto@santiagotech.rd</li>
                            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-400" /> (809) 555-0000</li>
                            <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-400" /> Santiago de los Caballeros, RD 🇩🇴</li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-700/50 mt-8 pt-8 text-center">
                    <p className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Técnicos en RD. Todos los derechos reservados.
                    </p>
                    <p className="text-emerald-500 text-xs mt-2">
                        Hecho con ❤️ en República Dominicana 🇩🇴
                    </p>
                </div>
            </footer>

            {/* Floating Home Button - visible on all views except home - TOP LEFT */}
            <AnimatePresence>
                {currentView !== 'home' && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.5, x: -20 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentView('home')}
                        className="fixed top-20 left-4 z-40 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center gap-2"
                        title="Volver al inicio"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-sm font-medium">Pa'l inicio</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Technician Registration Form Modal */}
            <AnimatePresence>
                {showRegisterForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: -20 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                                Regístrate como Técnico
                            </h2>
                            {registrationSuccess ? (
                                <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded relative mb-4" role="alert">
                                    <strong className="font-bold">¡Registro Exitoso! </strong>
                                    <span className="block sm:inline">Tu solicitud ha sido enviada. Un administrador la revisará pronto.</span>
                                    <CheckCircle className="absolute top-3 left-4 w-5 h-5 text-green-500" />
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={() => {
                                                setShowRegisterForm(false);
                                                setRegistrationSuccess(false);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Continuar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleTechnicianSubmit(handleTechnicianRegistration)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Nombre
                                            </label>
                                            <Input
                                                type="text"
                                                id="firstName"
                                                {...registerTechnician('firstName')}
                                                className={cn(
                                                    'mt-1',
                                                    technicianErrors.firstName && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                )}
                                                placeholder="Tu nombre"
                                            />
                                            {technicianErrors.firstName && (
                                                <p className="text-red-500 text-sm mt-1">{technicianErrors.firstName.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Apellido
                                            </label>
                                            <Input
                                                type="text"
                                                id="lastName"
                                                {...registerTechnician('lastName')}
                                                className={cn(
                                                    'mt-1',
                                                    technicianErrors.lastName && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                )}
                                                placeholder="Tu apellido"
                                            />
                                            {technicianErrors.lastName && (
                                                <p className="text-red-500 text-sm mt-1">{technicianErrors.lastName.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Especialización
                                        </label>
                                        <Controller
                                            name="specialization"
                                            control={technicianControl}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isTechnicianSubmitting}
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            'mt-1 w-full',
                                                            technicianErrors.specialization &&
                                                            'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                        )}
                                                    >
                                                        <SelectValue placeholder="Selecciona tu especialización" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {specializations.map((specialization) => (
                                                            <SelectItem key={specialization} value={specialization}>
                                                                {specialization}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {technicianErrors.specialization && (
                                            <p className="text-red-500 text-sm mt-1">{technicianErrors.specialization.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Ubicación
                                        </label>
                                        <Controller
                                            name="location"
                                            control={technicianControl}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isTechnicianSubmitting}
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            'mt-1 w-full',
                                                            technicianErrors.location &&
                                                            'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                        )}
                                                    >
                                                        <SelectValue placeholder="Selecciona tu ubicación" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {locations.map((location) => (
                                                            <SelectItem key={location} value={location}>
                                                                {location}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {technicianErrors.location && (
                                            <p className="text-red-500 text-sm mt-1">{technicianErrors.location.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Teléfono
                                        </label>
                                        <Input
                                            type="text"
                                            id="phone"
                                            {...registerTechnician('phone')}
                                            className={cn(
                                                'mt-1',
                                                technicianErrors.phone && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="XXX-XXX-XXXX"
                                        />
                                        {technicianErrors.phone && (
                                            <p className="text-red-500 text-sm mt-1">{technicianErrors.phone.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Correo Electrónico
                                        </label>
                                        <Input
                                            type="email"
                                            id="email"
                                            {...registerTechnician('email')}
                                            className={cn(
                                                'mt-1',
                                                technicianErrors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="tu.correo@ejemplo.com"
                                        />
                                        {technicianErrors.email && (
                                            <p className="text-red-500 text-sm mt-1">{technicianErrors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowRegisterForm(false);
                                                setRegistrationSuccess(false); // Reset success state
                                            }}
                                            disabled={isTechnicianSubmitting}
                                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isTechnicianSubmitting}
                                            className="bg-blue-500 hover:bg-blue-600 text-white"
                                        >
                                            {isTechnicianSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                'Enviar Solicitud'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Registration Form Modal */}
            <AnimatePresence>
                {showUserRegisterForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: -20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <span>🌴</span> ¡Únete a Santiago Tech!
                            </h2>
                            {userRegistrationSuccess ? (
                                <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded relative mb-4" role="alert">
                                    <strong className="font-bold">¡Registro Exitoso! 🎉</strong>
                                    <span className="block sm:inline">Tu cuenta ha sido creada. Por favor revisa tu correo para verificar tu cuenta.</span>
                                    <CheckCircle className="absolute top-3 left-4 w-5 h-5 text-green-500" />
                                    <Button
                                        onClick={() => {
                                            setShowUserRegisterForm(false);
                                            setUserRegistrationSuccess(false);
                                        }}
                                        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Cerrar
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleUserSubmit(handleUserRegistration)} className="space-y-4">
                                    {/* Tipo de cuenta - PRIMERO */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            ¿Qué tipo de cuenta deseas? <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className={cn(
                                                "flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all",
                                                selectedAccountType === 'user'
                                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                                            )}>
                                                <input
                                                    type="radio"
                                                    value="user"
                                                    {...registerUser('accountType')}
                                                    className="sr-only"
                                                />
                                                <User className={cn(
                                                    "w-8 h-8 mb-2",
                                                    selectedAccountType === 'user' ? "text-emerald-600" : "text-gray-400"
                                                )} />
                                                <span className={cn(
                                                    "font-medium text-sm",
                                                    selectedAccountType === 'user' ? "text-emerald-700 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"
                                                )}>
                                                    Busco Técnicos
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">Cliente</span>
                                            </label>
                                            <label className={cn(
                                                "flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all",
                                                selectedAccountType === 'technician'
                                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                                    : "border-gray-200 dark:border-gray-600 hover:border-amber-300"
                                            )}>
                                                <input
                                                    type="radio"
                                                    value="technician"
                                                    {...registerUser('accountType')}
                                                    className="sr-only"
                                                />
                                                <Wrench className={cn(
                                                    "w-8 h-8 mb-2",
                                                    selectedAccountType === 'technician' ? "text-amber-600" : "text-gray-400"
                                                )} />
                                                <span className={cn(
                                                    "font-medium text-sm",
                                                    selectedAccountType === 'technician' ? "text-amber-700 dark:text-amber-400" : "text-gray-600 dark:text-gray-300"
                                                )}>
                                                    Soy Técnico
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">Proveedor</span>
                                            </label>
                                        </div>
                                        {userErrors.accountType && (
                                            <p className="text-red-500 text-sm mt-1">{userErrors.accountType.message}</p>
                                        )}
                                        {selectedAccountType === 'technician' && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                                💡 Como técnico también podrás contratar otros servicios.
                                            </p>
                                        )}
                                    </div>

                                    {/* Profile Photo Upload */}
                                    <div className="flex flex-col items-center">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Foto de Perfil <span className="text-gray-400">(opcional)</span>
                                        </label>
                                        <div className="relative group cursor-pointer">
                                            <div className={cn(
                                                "w-24 h-24 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all",
                                                registrationPhoto
                                                    ? "border-emerald-400"
                                                    : "border-gray-300 dark:border-gray-600 border-dashed"
                                            )}>
                                                {registrationPhoto ? (
                                                    <img
                                                        src={registrationPhoto}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center text-gray-400">
                                                        <Camera className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleRegistrationPhotoSelect}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        {registrationPhoto && (
                                            <button
                                                type="button"
                                                onClick={() => setRegistrationPhoto(null)}
                                                className="mt-2 text-xs text-red-500 hover:text-red-700"
                                            >
                                                Quitar foto
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="userFirstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Nombre
                                            </label>
                                            <Input
                                                type="text"
                                                id="userFirstName"
                                                {...registerUser('firstName')}
                                                className={cn(
                                                    'mt-1',
                                                    userErrors.firstName && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                )}
                                                placeholder="Tu nombre"
                                            />
                                            {userErrors.firstName && (
                                                <p className="text-red-500 text-sm mt-1">{userErrors.firstName.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="userLastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Apellido
                                            </label>
                                            <Input
                                                type="text"
                                                id="userLastName"
                                                {...registerUser('lastName')}
                                                className={cn(
                                                    'mt-1',
                                                    userErrors.lastName && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                )}
                                                placeholder="Tu apellido"
                                            />
                                            {userErrors.lastName && (
                                                <p className="text-red-500 text-sm mt-1">{userErrors.lastName.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Correo Electrónico
                                        </label>
                                        <Input
                                            type="email"
                                            id="userEmail"
                                            {...registerUser('email')}
                                            className={cn(
                                                'mt-1',
                                                userErrors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="tu.correo@ejemplo.com"
                                        />
                                        {userErrors.email && (
                                            <p className="text-red-500 text-sm mt-1">{userErrors.email.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Teléfono
                                        </label>
                                        <Input
                                            type="text"
                                            id="userPhone"
                                            {...registerUser('phone')}
                                            className={cn(
                                                'mt-1',
                                                userErrors.phone && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="XXX-XXX-XXXX"
                                        />
                                        {userErrors.phone && (
                                            <p className="text-red-500 text-sm mt-1">{userErrors.phone.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            id="userPassword"
                                            {...registerUser('password')}
                                            className={cn(
                                                'mt-1',
                                                userErrors.password && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="******"
                                        />
                                        {userErrors.password && (
                                            <p className="text-red-500 text-sm mt-1">{userErrors.password.message}</p>
                                        )}
                                    </div>

                                    {/* Campos adicionales para técnicos */}
                                    <AnimatePresence>
                                        {selectedAccountType === 'technician' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <div className="border-t border-amber-200 dark:border-amber-800 pt-4">
                                                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                                                        <Wrench className="w-4 h-4" />
                                                        Información de Técnico
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Servicios que ofreces <span className="text-red-500">*</span>
                                                            </label>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                                Selecciona todos los servicios que puedes proveer
                                                            </p>
                                                            <Controller
                                                                name="specializations"
                                                                control={userFormControl}
                                                                render={({ field }) => (
                                                                    <div className={cn(
                                                                        "grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto",
                                                                        userErrors.specializations ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                                                                    )}>
                                                                        {specializations.map((spec) => {
                                                                            const isSelected = field.value?.includes(spec) || false;
                                                                            return (
                                                                                <label
                                                                                    key={spec}
                                                                                    className={cn(
                                                                                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm",
                                                                                        isSelected
                                                                                            ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-400"
                                                                                            : "bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                                    )}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={(e) => {
                                                                                            const currentValues = field.value || [];
                                                                                            if (e.target.checked) {
                                                                                                field.onChange([...currentValues, spec]);
                                                                                            } else {
                                                                                                field.onChange(currentValues.filter((v: string) => v !== spec));
                                                                                            }
                                                                                        }}
                                                                                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                                                    />
                                                                                    <span className={cn(
                                                                                        "text-sm",
                                                                                        isSelected ? "text-amber-700 dark:text-amber-300 font-medium" : "text-gray-700 dark:text-gray-300"
                                                                                    )}>
                                                                                        {spec}
                                                                                    </span>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            />
                                                            {userErrors.specializations && (
                                                                <p className="text-red-500 text-sm mt-1">{userErrors.specializations.message}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Ubicación <span className="text-red-500">*</span>
                                                            </label>
                                                            <Controller
                                                                name="location"
                                                                control={userFormControl}
                                                                render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className={cn(
                                                                            "mt-1",
                                                                            userErrors.location && 'border-red-500'
                                                                        )}>
                                                                            <SelectValue placeholder="Selecciona tu ubicación" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {locations.map((loc) => (
                                                                                <SelectItem key={loc} value={loc}>
                                                                                    {loc}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                            {userErrors.location && (
                                                                <p className="text-red-500 text-sm mt-1">{userErrors.location.message}</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Nombre de Empresa <span className="text-gray-400">(opcional)</span>
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                id="companyName"
                                                                {...registerUser('companyName')}
                                                                className="mt-1"
                                                                placeholder="Ej: Servicios Técnicos González"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Si trabajas con una empresa, ingresa el nombre aquí.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="flex justify-end gap-4 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowUserRegisterForm(false);
                                                setUserRegistrationSuccess(false);
                                                resetUserForm();
                                                setRegistrationPhoto(null);
                                            }}
                                            disabled={isUserSubmitting}
                                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isUserSubmitting}
                                            className={cn(
                                                "text-white",
                                                selectedAccountType === 'technician'
                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                                            )}
                                        >
                                            {isUserSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Registrando...
                                                </>
                                            ) : selectedAccountType === 'technician' ? (
                                                <>
                                                    <Wrench className="mr-2 h-4 w-4" />
                                                    ¡Registrarme como Técnico!
                                                </>
                                            ) : (
                                                <>
                                                    <User className="mr-2 h-4 w-4" />
                                                    ¡Crear mi Cuenta!
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Review Form Modal */}
            <AnimatePresence>
                {showReviewForm?.show && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: -20 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                                Agregar Reseña
                            </h2>
                            <form onSubmit={handleReviewSubmit((data) => {
                                if (showReviewForm?.technicianId) {
                                    handleAddReview(showReviewForm.technicianId, data);
                                }
                            })} className="space-y-4">
                                <div>
                                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tu Nombre
                                    </label>
                                    <Input
                                        type="text"
                                        id="author"
                                        {...registerReview('author')}
                                        className={cn(
                                            'mt-1',
                                            reviewErrors.author && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                        )}
                                        placeholder="Tu nombre"
                                    />
                                    {reviewErrors.author && (
                                        <p className="text-red-500 text-sm mt-1">{reviewErrors.author.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Comentario
                                    </label>
                                    <Textarea
                                        id="comment"
                                        {...registerReview('comment')}
                                        className={cn(
                                            'mt-1',
                                            reviewErrors.comment && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                        )}
                                        placeholder="Escribe tu reseña aquí..."
                                        rows={4}
                                    />
                                    {reviewErrors.comment && (
                                        <p className="text-red-500 text-sm mt-1">{reviewErrors.comment.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Calificación
                                    </label>
                                    <Controller
                                        name="rating"
                                        control={reviewControl}
                                        defaultValue={5}
                                        render={({ field }) => (
                                            <div className="flex items-center mt-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => field.onChange(star)}
                                                        className={cn(
                                                            'mr-1',
                                                            star <= (field.value || 0)
                                                                ? 'text-yellow-400'
                                                                : 'text-gray-300 dark:text-gray-500',
                                                            'focus:outline-none'
                                                        )}
                                                    >
                                                        <Star className="w-6 h-6" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    />
                                    {reviewErrors.rating && (
                                        <p className="text-red-500 text-sm mt-1">{reviewErrors.rating.message}</p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowReviewForm(null)}
                                        disabled={isReviewSubmitting}
                                        className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isReviewSubmitting}
                                        className="bg-blue-500 hover:bg-blue-600 text-white"
                                    >
                                        {isReviewSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            'Enviar Reseña'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Login Form Modal */}
            <AnimatePresence>
                {
                    showLoginForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50"
                        >
                            <motion.div
                                initial={{ scale: 0.8, y: -20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.8, y: -20 }}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative"
                            >
                                <button
                                    onClick={() => setShowLoginForm(false)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
                                    Iniciar Sesión
                                </h2>
                                <form onSubmit={handleLoginSubmit(handleLogin)} className="space-y-4">
                                    <div>
                                        <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Correo Electrónico
                                        </label>
                                        <Input
                                            type="email"
                                            id="loginEmail"
                                            {...registerLogin('email')}
                                            className={cn(
                                                'mt-1',
                                                loginErrors.email && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="tu.correo@ejemplo.com"
                                        />
                                        {loginErrors.email && (
                                            <p className="text-red-500 text-sm mt-1">{loginErrors.email.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            id="loginPassword"
                                            {...registerLogin('password')}
                                            className={cn(
                                                'mt-1',
                                                loginErrors.password && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="******"
                                        />
                                        {loginErrors.password && (
                                            <p className="text-red-500 text-sm mt-1">{loginErrors.password.message}</p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isLoginSubmitting}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
                                    >
                                        {isLoginSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Iniciando...
                                            </>
                                        ) : (
                                            'Entrar'
                                        )}
                                    </Button>
                                </form>
                                <div className="mt-4 text-center space-y-2">
                                    <button
                                        onClick={() => {
                                            setShowLoginForm(false);
                                            setShowForgotPasswordForm(true);
                                            setForgotPasswordMessage('');
                                            setResetEmail('');
                                        }}
                                        className="text-sm text-gray-500 hover:text-blue-600 hover:underline"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        ¿No tienes cuenta?{' '}
                                        <button
                                            onClick={() => {
                                                setShowLoginForm(false);
                                                setShowUserRegisterForm(true);
                                            }}
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            Regístrate aquí
                                        </button>
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
            </AnimatePresence>

            {/* Forgot Password Modal */}
            <AnimatePresence>
                {showForgotPasswordForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowForgotPasswordForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md relative shadow-2xl"
                        >
                            <button
                                onClick={() => setShowForgotPasswordForm(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2 text-center">
                                Recuperar Contraseña
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-6">
                                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Correo Electrónico
                                    </label>
                                    <Input
                                        type="email"
                                        id="resetEmail"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="mt-1"
                                        placeholder="tu.correo@ejemplo.com"
                                    />
                                </div>
                                {forgotPasswordMessage && (
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                                        {forgotPasswordMessage}
                                    </div>
                                )}
                                <Button
                                    onClick={handleForgotPassword}
                                    disabled={forgotPasswordLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {forgotPasswordLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </Button>
                                <button
                                    onClick={() => {
                                        setShowForgotPasswordForm(false);
                                        setShowLoginForm(true);
                                    }}
                                    className="w-full text-sm text-gray-500 hover:text-blue-600 hover:underline"
                                >
                                    Volver a iniciar sesión
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {showResetPasswordForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md relative shadow-2xl"
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2 text-center">
                                Nueva Contraseña
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-6">
                                Ingresa tu nueva contraseña
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nueva Contraseña
                                    </label>
                                    <Input
                                        type="password"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mt-1"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Confirmar Contraseña
                                    </label>
                                    <Input
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="mt-1"
                                        placeholder="Repite la contraseña"
                                    />
                                </div>
                                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-red-500 text-sm">Las contraseñas no coinciden</p>
                                )}
                                <Button
                                    onClick={handleResetPassword}
                                    disabled={resetPasswordLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                >
                                    {resetPasswordLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Restablecer Contraseña'
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Modal - Enhanced with Photo and History */}
            <AnimatePresence>
                {showProfileModal && currentUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
                        onClick={() => { setShowProfileModal(false); setProfileTab('info'); setIsEditingProfile(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: -20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-2xl relative">
                                <button
                                    onClick={() => { setShowProfileModal(false); setProfileTab('info'); setIsEditingProfile(false); }}
                                    className="absolute top-4 right-4 text-white/80 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                {/* Profile Photo */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                            {currentUser.photoUrl ? (
                                                <img
                                                    src={currentUser.photoUrl}
                                                    alt={currentUser.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-12 h-12 text-white" />
                                            )}
                                        </div>
                                        {/* Upload button overlay */}
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                            {uploadingPhoto ? (
                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            ) : (
                                                <Camera className="w-6 h-6 text-white" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploadingPhoto}
                                            />
                                        </label>
                                    </div>
                                    <h2 className="text-xl font-bold text-white mt-3">{currentUser.name}</h2>
                                    <p className="text-white/80 text-sm">{currentUser.email}</p>
                                    <span className={cn(
                                        "mt-2 px-3 py-1 rounded-full text-xs font-semibold",
                                        currentUser.role === 'admin' ? "bg-purple-200 text-purple-800" :
                                            currentUser.role === 'technician' ? "bg-amber-200 text-amber-800" :
                                                "bg-blue-200 text-blue-800"
                                    )}>
                                        {currentUser.role === 'admin' ? 'Administrador' :
                                            currentUser.role === 'technician' ? 'Técnico' : 'Cliente'}
                                    </span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                {/* Tabs: Info / History / Availability (for technicians) */}
                                <div className="flex gap-2 mb-6">
                                    <button
                                        onClick={() => setProfileTab('info')}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5",
                                            profileTab === 'info'
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200"
                                        )}
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="hidden sm:inline">Mi Info</span>
                                    </button>
                                    {currentUser.role === 'technician' && (
                                        <button
                                            onClick={() => { setProfileTab('availability'); fetchAvailability(); }}
                                            className={cn(
                                                "flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5",
                                                profileTab === 'availability'
                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200"
                                            )}
                                        >
                                            <Clock className="w-4 h-4" />
                                            <span className="hidden sm:inline">Horario</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setProfileTab('history'); fetchProfileHistory(); }}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-1.5",
                                            profileTab === 'history'
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200"
                                        )}
                                    >
                                        <History className="w-4 h-4" />
                                        <span className="hidden sm:inline">Historial</span>
                                    </button>
                                </div>

                                {profileTab === 'info' ? (
                                    /* Profile Info */
                                    <>
                                        {isEditingProfile ? (
                                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Nombre
                                                    </label>
                                                    <Input
                                                        name="name"
                                                        defaultValue={currentUser.name}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Correo Electrónico
                                                    </label>
                                                    <Input
                                                        defaultValue={currentUser.email}
                                                        disabled
                                                        className="w-full bg-gray-100 dark:bg-gray-700"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">El correo no se puede cambiar</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                        Teléfono
                                                    </label>
                                                    <Input
                                                        name="phone"
                                                        defaultValue={currentUser.phone || ''}
                                                        placeholder="Ej: 809-555-1234"
                                                        className="w-full"
                                                    />
                                                </div>
                                                {/* Specializations editor for technicians */}
                                                {currentUser.role === 'technician' && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Servicios que Ofreces
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg max-h-48 overflow-y-auto border-gray-200 dark:border-gray-600">
                                                            {specializations.map((spec) => {
                                                                const isSelected = editingSpecializations.includes(spec);
                                                                return (
                                                                    <label
                                                                        key={spec}
                                                                        className={cn(
                                                                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm",
                                                                            isSelected
                                                                                ? "bg-amber-100 dark:bg-amber-900/30 border border-amber-400"
                                                                                : "bg-gray-50 dark:bg-gray-800 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                        )}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setEditingSpecializations([...editingSpecializations, spec]);
                                                                                } else {
                                                                                    setEditingSpecializations(editingSpecializations.filter(s => s !== spec));
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                                                                        />
                                                                        <span className="text-gray-700 dark:text-gray-300">{spec}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        {editingSpecializations.length === 0 && (
                                                            <p className="text-xs text-red-500 mt-1">Debes seleccionar al menos un servicio</p>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => setIsEditingProfile(false)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                        disabled={savingProfile}
                                                    >
                                                        {savingProfile ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="w-4 h-4 mr-2" />
                                                        )}
                                                        Guardar
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                                                        <p className="font-medium text-gray-800 dark:text-white">{currentUser.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <Mail className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Correo</p>
                                                        <p className="font-medium text-gray-800 dark:text-white">{currentUser.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <Phone className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                                                        <p className="font-medium text-gray-800 dark:text-white">
                                                            {currentUser.phone || 'No registrado'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Show specializations for technicians */}
                                                {currentUser.role === 'technician' && currentUser.specializations && currentUser.specializations.length > 0 && (
                                                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                        <Wrench className="w-5 h-5 text-gray-400 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Servicios</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {currentUser.specializations.map((spec) => (
                                                                    <span
                                                                        key={spec}
                                                                        className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full"
                                                                    >
                                                                        {spec}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={() => {
                                                        // Initialize specializations when entering edit mode
                                                        if (currentUser.role === 'technician' && currentUser.specializations) {
                                                            setEditingSpecializations(currentUser.specializations);
                                                        }
                                                        setIsEditingProfile(true);
                                                    }}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Editar Perfil
                                                </Button>
                                            </div>
                                        )}

                                        {/* Become Technician Section */}
                                        {currentUser.role === 'user' && !isEditingProfile && (
                                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                                                    ¿Eres un profesional?
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                    Regístrate como técnico para ofrecer tus servicios.
                                                </p>
                                                <Button
                                                    onClick={() => {
                                                        setShowProfileModal(false);
                                                        setShowUserRegisterForm(true);
                                                    }}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    <Wrench className="w-4 h-4 mr-2" />
                                                    Convertirme en Técnico
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : profileTab === 'availability' ? (
                                    /* Availability Settings (Technicians Only) */
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                <Clock className="w-4 h-4 inline mr-2" />
                                                Configura tus días y horarios de trabajo. Los clientes solo podrán reservarte en estos horarios.
                                            </p>
                                        </div>

                                        {loadingAvailability ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                                                        const daySlot = availability.find(s => s.dayOfWeek === dayNum) || {
                                                            dayOfWeek: dayNum,
                                                            startTime: '08:00',
                                                            endTime: '18:00',
                                                            isAvailable: dayNum !== 0
                                                        };
                                                        return (
                                                            <div
                                                                key={dayNum}
                                                                className={cn(
                                                                    "p-3 rounded-lg border transition-colors",
                                                                    daySlot.isAvailable
                                                                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <label className="flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={daySlot.isAvailable}
                                                                                onChange={(e) => updateDayAvailability(dayNum, 'isAvailable', e.target.checked)}
                                                                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                                                            />
                                                                            <span className={cn(
                                                                                "ml-3 font-medium",
                                                                                daySlot.isAvailable ? "text-gray-800 dark:text-white" : "text-gray-400"
                                                                            )}>
                                                                                {dayNames[dayNum]}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                    {daySlot.isAvailable && (
                                                                        <div className="flex items-center gap-2">
                                                                            <select
                                                                                value={daySlot.startTime}
                                                                                onChange={(e) => updateDayAvailability(dayNum, 'startTime', e.target.value)}
                                                                                className="px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                                                                            >
                                                                                {Array.from({ length: 14 }, (_, i) => i + 6).map(hour => (
                                                                                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                                                                        {hour.toString().padStart(2, '0')}:00
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            <span className="text-gray-500">a</span>
                                                                            <select
                                                                                value={daySlot.endTime}
                                                                                onChange={(e) => updateDayAvailability(dayNum, 'endTime', e.target.value)}
                                                                                className="px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
                                                                            >
                                                                                {Array.from({ length: 14 }, (_, i) => i + 7).map(hour => (
                                                                                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                                                                                        {hour.toString().padStart(2, '0')}:00
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <Button
                                                    onClick={saveAvailability}
                                                    disabled={savingAvailability}
                                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-4"
                                                >
                                                    {savingAvailability ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-2" />
                                                    )}
                                                    Guardar Disponibilidad
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* Profile History */
                                    <div className="space-y-3">
                                        {profileHistory.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p>No hay cambios registrados</p>
                                            </div>
                                        ) : (
                                            profileHistory.map((change) => (
                                                <div
                                                    key={change.id}
                                                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-medium text-gray-800 dark:text-white">
                                                                {formatFieldName(change.fieldName)}
                                                            </p>
                                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                {change.oldValue && (
                                                                    <p className="text-red-500 line-through">
                                                                        {change.oldValue}
                                                                    </p>
                                                                )}
                                                                <p className="text-green-600">
                                                                    {change.newValue || 'Valor eliminado'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(change.createdAt).toLocaleDateString('es-DO', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Booking Form Modal */}
            <AnimatePresence>
                {showBookingForm?.show && currentUser && (
                    <BookingForm
                        technician={showBookingForm.technician}
                        customerId={currentUser.id}
                        onSubmit={handleCreateBooking}
                        onClose={() => setShowBookingForm(null)}
                    />
                )}
            </AnimatePresence>

            {/* Report Detail Modal */}
            <AnimatePresence>
                {reportDetailModal.type && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setReportDetailModal({ type: null, title: '' })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={cn(
                                "p-4 flex items-center justify-between",
                                reportDetailModal.type === 'users' && "bg-gradient-to-r from-blue-500 to-blue-600",
                                reportDetailModal.type === 'technicians' && "bg-gradient-to-r from-amber-500 to-orange-500",
                                reportDetailModal.type === 'bookings' && "bg-gradient-to-r from-emerald-500 to-teal-500"
                            )}>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {reportDetailModal.type === 'users' && <Users className="w-6 h-6" />}
                                    {reportDetailModal.type === 'technicians' && <Wrench className="w-6 h-6" />}
                                    {reportDetailModal.type === 'bookings' && <Calendar className="w-6 h-6" />}
                                    {reportDetailModal.title}
                                </h2>
                                <button
                                    onClick={() => setReportDetailModal({ type: null, title: '' })}
                                    className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto max-h-[calc(80vh-70px)] p-4">
                                {/* Users Detail */}
                                {reportDetailModal.type === 'users' && (
                                    <div className="space-y-4">
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                            Total: {users.length} usuarios registrados
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuario</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teléfono</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Verificado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                    {users.map((user) => (
                                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                                                        {user.photoUrl ? (
                                                                            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            user.name.charAt(0).toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <span className="font-medium text-gray-800 dark:text-white">{user.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.email}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{user.phone || '-'}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={cn(
                                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                                    user.role === 'admin' && "bg-purple-100 text-purple-700",
                                                                    user.role === 'technician' && "bg-amber-100 text-amber-700",
                                                                    user.role === 'user' && "bg-blue-100 text-blue-700"
                                                                )}>
                                                                    {user.role === 'admin' ? 'Admin' : user.role === 'technician' ? 'Técnico' : 'Usuario'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {user.emailVerified ? (
                                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                                ) : (
                                                                    <X className="w-5 h-5 text-red-400" />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Technicians Detail */}
                                {reportDetailModal.type === 'technicians' && (
                                    <div className="space-y-4">
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                            Total: {technicians.length} técnicos registrados
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {technicians.map((tech) => (
                                                <div key={tech.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0">
                                                            {tech.photoUrl ? (
                                                                <img src={tech.photoUrl} alt={tech.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                tech.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-gray-800 dark:text-white truncate">{tech.name}</h4>
                                                                {tech.verified && (
                                                                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                            {tech.companyName && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{tech.companyName}</p>
                                                            )}
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                    {tech.rating.toFixed(1)}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ({tech.reviews?.length || 0} reseñas)
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {(tech.specializations || [tech.specialization]).map((spec, idx) => (
                                                                    <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                                                        {spec}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                                <p className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" /> {tech.location}
                                                                </p>
                                                                <p className="flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" /> {tech.email}
                                                                </p>
                                                                <p className="flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" /> {tech.phone}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Bookings Detail */}
                                {reportDetailModal.type === 'bookings' && (
                                    <div className="space-y-4">
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                            Total: {allBookings.length} reservas
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Servicio</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Técnico</th>
                                                        <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                                    {allBookings.map((booking: any) => (
                                                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {new Date(booking.scheduledDate).toLocaleDateString('es-DO')}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">{booking.scheduledTime}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{booking.serviceType}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {booking.customer?.name || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                {booking.technician?.user?.name || '-'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={cn(
                                                                    "px-2 py-1 rounded-full text-xs font-medium",
                                                                    booking.status === 'PENDING' && "bg-yellow-100 text-yellow-700",
                                                                    booking.status === 'CONFIRMED' && "bg-blue-100 text-blue-700",
                                                                    booking.status === 'IN_PROGRESS' && "bg-purple-100 text-purple-700",
                                                                    booking.status === 'COMPLETED' && "bg-green-100 text-green-700",
                                                                    booking.status === 'CANCELLED' && "bg-red-100 text-red-700"
                                                                )}>
                                                                    {booking.status === 'PENDING' && 'Pendiente'}
                                                                    {booking.status === 'CONFIRMED' && 'Confirmada'}
                                                                    {booking.status === 'IN_PROGRESS' && 'En Progreso'}
                                                                    {booking.status === 'COMPLETED' && 'Completada'}
                                                                    {booking.status === 'CANCELLED' && 'Cancelada'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Achievement Unlocked Modal */}
            <AchievementUnlocked
                achievement={unlockedAchievement}
                onClose={() => setUnlockedAchievement(null)}
            />
        </div>
    );
};

export default SantiagoTechRDApp;
