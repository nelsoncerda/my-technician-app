import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import BookingCard from './BookingCard';

interface Booking {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  serviceType: string;
  address: string;
  city: string;
  description?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
  };
  technician?: {
    user: {
      name: string;
      email?: string;
      phone?: string;
      photoUrl?: string;
    };
  };
}

interface BookingListProps {
  bookings: Booking[];
  userRole: 'customer' | 'technician';
  loading?: boolean;
  onConfirm?: (bookingId: string) => void;
  onStart?: (bookingId: string) => void;
  onComplete?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
}

const statusFilters = [
  { value: 'ALL', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
];

const BookingList: React.FC<BookingListProps> = ({
  bookings,
  userRole,
  loading,
  onConfirm,
  onStart,
  onComplete,
  onCancel,
}) => {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredBookings = bookings.filter(
    (booking) => statusFilter === 'ALL' || booking.status === statusFilter
  );

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((groups, booking) => {
    const date = booking.scheduledDate.split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {} as Record<string, Booking[]>);

  const sortedDates = Object.keys(groupedBookings).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return 'Hoy';
    }
    if (date.getTime() === tomorrow.getTime()) {
      return 'Mañana';
    }

    return new Intl.DateTimeFormat('es-DO', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Bookings */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No hay reservas para mostrar</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {sortedDates.map((date) => (
              <motion.div
                key={date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {formatDateHeader(date)}
                </h3>
                <div className="space-y-3">
                  {groupedBookings[date].map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      userRole={userRole}
                      onConfirm={onConfirm ? () => onConfirm(booking.id) : undefined}
                      onStart={onStart ? () => onStart(booking.id) : undefined}
                      onComplete={onComplete ? () => onComplete(booking.id) : undefined}
                      onCancel={onCancel ? () => onCancel(booking.id) : undefined}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default BookingList;
