import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Phone, Mail, Star, Search, Filter, Wrench, User,
    CheckCircle, PlusCircle, Loader2, X, LogIn, LogOut, Shield, Edit,
    Calendar, Trophy, Gift, Home, Users, BarChart3, TrendingUp, Clock,
    DollarSign, Activity, AlertCircle, UserCheck, UserX, Trash2, Eye
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

// Mock Data (Replace with actual API calls)
const SPECIALIZATIONS = [
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
    location: string;
    phone: string;
    email: string;
    rating: number;
    reviews: Review[];
    verified: boolean;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'technician' | 'admin';
    phone?: string;
    password?: string; // In a real app, this would be hashed
}

interface Review {
    id: string;
    author: string;
    comment: string;
    rating: number;
    date: string;
}

const SANTIAGO_LOCATIONS = [
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
    name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
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
    name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
    email: z.string().email({ message: 'Formato de correo electrónico inválido.' }),
    phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, { message: 'Formato de teléfono inválido (XXX-XXX-XXXX).' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
    accountType: z.enum(['user', 'technician'], { required_error: 'Debes seleccionar un tipo de cuenta.' }),
    // Campos condicionales para técnicos
    specialization: z.string().optional(),
    location: z.string().optional(),
}).refine((data) => {
    // Si es técnico, debe tener especialización y ubicación
    if (data.accountType === 'technician') {
        return data.specialization && data.specialization.length > 0 && data.location && data.location.length > 0;
    }
    return true;
}, {
    message: 'Los técnicos deben seleccionar una especialización y ubicación.',
    path: ['specialization'],
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
    const [adminTab, setAdminTab] = useState<'technicians' | 'users' | 'bookings' | 'reports'>('technicians');
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
            name: '',
            specialization: '',
            location: '',
            phone: '',
            email: '',
        },
    });

    // Pre-fill Technician Form with User Profile
    useEffect(() => {
        if (showRegisterForm && currentUser) {
            resetTechnicianForm({
                name: currentUser.name,
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
            name: '',
            email: '',
            phone: '',
            password: '',
            accountType: undefined,
            specialization: '',
            location: '',
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
                const techResponse = await fetch(`${API_BASE_URL}/api/technicians`);
                const techData = await techResponse.json();
                setTechnicians(techData);

                // Only fetch users if admin (in a real app, this would be protected)
                // For now, let's fetch them to populate the admin view if we are admin
                // Or just fetch them all the time for this demo since we don't have persistent auth token storage yet
                const userResponse = await fetch(`${API_BASE_URL}/api/users`);
                const userData = await userResponse.json();
                setUsers(userData);
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
            const endpoint = currentUser.role === 'technician'
                ? `${API_BASE_URL}/api/bookings/technician/${currentUser.id}`
                : `${API_BASE_URL}/api/bookings/customer/${currentUser.id}`;
            const response = await fetch(endpoint);
            const data = await response.json();
            setUserBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setUserBookings([]);
        } finally {
            setLoadingBookings(false);
        }
    }, [currentUser]);

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
                fetch(`${API_BASE_URL}/api/bookings`)
            ]);

            const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];
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

    // Get unique specializations and locations from registered technicians
    const availableSpecializations = React.useMemo(() => {
        const specs = Array.from(new Set(technicians.map(t => t.specialization)));
        return specs.sort();
    }, [technicians]);

    const availableLocations = React.useMemo(() => {
        const locs = Array.from(new Set(technicians.map(t => t.location)));
        return locs.sort();
    }, [technicians]);

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
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const newUser = await response.json();
                setUsers([...users, newUser]);
                setUserRegistrationSuccess(true);
                resetUserForm();
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
                alert("Credenciales inválidas");
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert("Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('home');
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

        // Get form data
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone }),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setCurrentUser({ ...currentUser, ...updatedUser });
                setShowProfileModal(false);
            } else {
                alert("Error al actualizar perfil");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error al actualizar perfil");
        }
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
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                        <span className="text-3xl">🔧</span>
                        <span className="hidden sm:inline">Santiago Tech RD</span>
                        <span className="sm:hidden">STech</span>
                        <span className="text-2xl">🌴</span>
                    </h1>
                    <div className="flex gap-2 items-center">
                        {currentUser ? (
                            <div className="flex items-center gap-2 md:gap-4">
                                {/* Points display (compact) */}
                                {userPoints && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setCurrentView('gamification')}
                                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-white shadow-md hover:shadow-lg transition-all border-2 border-white/30"
                                    >
                                        <span className="text-sm">⚡</span>
                                        <span className="font-bold text-sm">{userPoints.totalPoints?.toLocaleString() || 0}</span>
                                    </motion.button>
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
                                            tab.color === 'emerald' ? '#10b981' : '#8b5cf6'
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
                                                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                                    <Wrench className="w-5 h-5 text-amber-600" />
                                                                </div>
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
                                                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-blue-100 text-sm">Total Usuarios</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalUsers}</p>
                                                    </div>
                                                    <Users className="w-12 h-12 text-blue-200" />
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-amber-100 text-sm">Técnicos</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalTechnicians}</p>
                                                    </div>
                                                    <Wrench className="w-12 h-12 text-amber-200" />
                                                </div>
                                            </motion.div>

                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-emerald-100 text-sm">Reservas Totales</p>
                                                        <p className="text-3xl font-bold">{adminStats.totalBookings}</p>
                                                    </div>
                                                    <Calendar className="w-12 h-12 text-emerald-200" />
                                                </div>
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

                    {/* Professionals in Action Section - Dominican Style */}
                    <section className="py-16 bg-gradient-to-b from-sky-50 to-white dark:from-gray-800 dark:to-gray-900">
                        <div className="container mx-auto px-4">
                            <h2 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-3">
                                <span>🛠️</span> Nuestros Tígueres en Acción <span>💪</span>
                            </h2>
                            <p className="text-center text-emerald-600 dark:text-emerald-400 mb-12 text-lg">
                                ¡Los mejores del Cibao, pa' servirte!
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <motion.div
                                    whileHover={{ y: -10, scale: 1.02 }}
                                    className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-amber-400 to-orange-500"
                                >
                                    <img
                                        src="/images/electricista.png"
                                        alt="Electricista dominicano profesional"
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="p-5 bg-white dark:bg-gray-800">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
                                            ⚡ Electricidad al Día
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Instalaciones y reparaciones pa' que no te quede' a oscura', ¡garantizado!
                                        </p>
                                    </div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -10, scale: 1.02 }}
                                    className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-sky-400 to-blue-500"
                                >
                                    <img
                                        src="/images/plomero.png"
                                        alt="Plomero dominicano arreglando tubería"
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="p-5 bg-white dark:bg-gray-800">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
                                            🔧 Plomería Sin Problema
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            ¿Goteo? ¿Tubo roto? ¡Nosotros lo resolvemo' rapidito!
                                        </p>
                                    </div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -10, scale: 1.02 }}
                                    className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-pink-400 to-rose-500"
                                >
                                    <img
                                        src="/images/cleaner.png"
                                        alt="Limpiadora dominicana profesional"
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="p-5 bg-white dark:bg-gray-800">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
                                            🧹 Limpieza Impecable
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Tu hogar brillando como nuevo, ¡con el toque dominicano!
                                        </p>
                                    </div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ y: -10, scale: 1.02 }}
                                    className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-emerald-400 to-teal-500"
                                >
                                    <img
                                        src="/images/tecnico.png"
                                        alt="Técnico dominicano con multímetro"
                                        className="w-full h-56 object-cover"
                                    />
                                    <div className="p-5 bg-white dark:bg-gray-800">
                                        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white flex items-center gap-2">
                                            🔌 Técnico Profesional
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Reparaciones y diagnósticos con equipo de primera, ¡tamo' activo!
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </section>

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
                                                <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-700/50 dark:to-gray-700/30 border-b border-emerald-100 dark:border-gray-700">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-full shadow-md">
                                                            <User className="w-6 h-6 text-white" />
                                                        </div>
                                                        {technician.verified && (
                                                            <span title="Técnico Verificado" className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
                                                                <CheckCircle className="w-3 h-3" /> ¡Verificado!
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                        {technician.name}
                                                    </h3>
                                                    <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm flex items-center gap-1">
                                                        <span className="text-base">🔧</span>
                                                        {technician.specialization}
                                                    </p>
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
                                                    <div className="grid grid-cols-2 gap-3 w-full">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 transition-colors rounded-xl"
                                                            onClick={() => setShowReviewForm({ technicianId: technician.id, show: true })}
                                                        >
                                                            ⭐ Calificar
                                                        </Button>
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
                                En Santiago Tech RD, nuestra misión es conectar a los residentes de Santiago de los Caballeros
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
                            Santiago Tech RD
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
                        &copy; {new Date().getFullYear()} Santiago Tech RD. Todos los derechos reservados.
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
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Nombre Completo
                                        </label>
                                        <Input
                                            type="text"
                                            id="name"
                                            {...registerTechnician('name')}
                                            className={cn(
                                                'mt-1',
                                                technicianErrors.name && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="Tu nombre completo"
                                        />
                                        {technicianErrors.name && (
                                            <p className="text-red-500 text-sm mt-1">{technicianErrors.name.message}</p>
                                        )}
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
                                                        {SPECIALIZATIONS.map((specialization) => (
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
                                                        {SANTIAGO_LOCATIONS.map((location) => (
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

                                    <div>
                                        <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Nombre Completo
                                        </label>
                                        <Input
                                            type="text"
                                            id="userName"
                                            {...registerUser('name')}
                                            className={cn(
                                                'mt-1',
                                                userErrors.name && 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                            )}
                                            placeholder="Tu nombre completo"
                                        />
                                        {userErrors.name && (
                                            <p className="text-red-500 text-sm mt-1">{userErrors.name.message}</p>
                                        )}
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
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Especialización <span className="text-red-500">*</span>
                                                            </label>
                                                            <Controller
                                                                name="specialization"
                                                                control={userFormControl}
                                                                render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className={cn(
                                                                            "mt-1",
                                                                            userErrors.specialization && 'border-red-500'
                                                                        )}>
                                                                            <SelectValue placeholder="Selecciona tu especialización" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {SPECIALIZATIONS.map((spec) => (
                                                                                <SelectItem key={spec} value={spec}>
                                                                                    {spec}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                            {userErrors.specialization && (
                                                                <p className="text-red-500 text-sm mt-1">{userErrors.specialization.message}</p>
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
                                                                            {SANTIAGO_LOCATIONS.map((loc) => (
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
                                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
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
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
            </AnimatePresence>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && currentUser && (
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
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6 text-center">
                                Mi Perfil
                            </h2>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                                    <Input name="name" defaultValue={currentUser.name} className="mt-1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo</label>
                                    <Input defaultValue={currentUser.email} disabled className="mt-1 bg-gray-100 dark:bg-gray-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                                    <Input name="phone" defaultValue={currentUser.phone || ''} className="mt-1" />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button type="button" variant="outline" onClick={() => setShowProfileModal(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </form>

                            {currentUser.role === 'user' && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">¿Eres un profesional?</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Regístrate como técnico para ofrecer tus servicios en nuestra plataforma.
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

            {/* Achievement Unlocked Modal */}
            <AchievementUnlocked
                achievement={unlockedAchievement}
                onClose={() => setUnlockedAchievement(null)}
            />
        </div>
    );
};

export default SantiagoTechRDApp;
