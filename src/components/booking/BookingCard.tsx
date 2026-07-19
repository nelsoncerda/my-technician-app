import React from 'react';
import { motion } from 'framer-motion';
import { Ban, Calendar, Clock, MapPin, User, Wrench, CheckCircle, XCircle, PlayCircle, AlertCircle, Mail, Phone, Flag } from 'lucide-react';

interface BookingCardProps {
  booking: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    serviceType: string;
    address: string;
    city: string;
    description?: string;
    customer?: {
      id?: string;
      name: string;
      email?: string;
      phone?: string;
      photoUrl?: string;
    };
    technician?: {
      id?: string;
      user: {
        id?: string;
        name: string;
        email?: string;
        phone?: string;
        photoUrl?: string;
      };
    };
  };
  userRole: 'customer' | 'technician';
  onConfirm?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onReport?: () => void;
  onReportPhoto?: () => void;
  onBlock?: () => void;
  interactionBlocked?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  CONFIRMED: {
    label: 'Confirmada',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  IN_PROGRESS: {
    label: 'En Progreso',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: <PlayCircle className="w-4 h-4" />,
  },
  COMPLETED: {
    label: 'Completada',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="w-4 h-4" />,
  },
  NO_SHOW: {
    label: 'No Asistió',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: <XCircle className="w-4 h-4" />,
  },
};

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  userRole,
  onConfirm,
  onStart,
  onComplete,
  onCancel,
  onReport,
  onReportPhoto,
  onBlock,
  interactionBlocked = false,
}) => {
  const status = statusConfig[booking.status] || statusConfig.PENDING;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-DO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (time: string) => {
    const [hours, minutes = '00'] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const contactPerson = userRole === 'customer' ? booking.technician?.user : booking.customer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-gray-900 dark:text-white">{booking.serviceType}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${status.color}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Date and Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(booking.scheduledDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{formatTime(booking.scheduledTime)}</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4 mt-0.5" />
          <span>{booking.address}, {booking.city}</span>
        </div>

        {/* Contact Person Section */}
        {contactPerson && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {contactPerson.photoUrl ? (
                  <img
                    src={contactPerson.photoUrl}
                    alt={contactPerson.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>
              {/* Contact Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {userRole === 'customer' ? 'Técnico' : 'Cliente'}
                </p>
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {contactPerson.name}
                </p>
                {!interactionBlocked && contactPerson.email && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`mailto:${contactPerson.email}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {contactPerson.email}
                    </a>
                  </div>
                )}
                {!interactionBlocked && contactPerson.phone && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`tel:${contactPerson.phone}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {contactPerson.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {booking.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            "{booking.description}"
          </p>
        )}

        {interactionBlocked && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Usuario bloqueado. Conservamos los datos históricos de esta reserva, pero no se permiten nuevas acciones.
          </p>
        )}

        {(onReport || onReportPhoto || onBlock) && (
          <div className="flex flex-wrap gap-1 border-t border-gray-200 pt-3 dark:border-gray-700" aria-label="Opciones de seguridad de la reserva">
            {onReport && (
              <button type="button" onClick={onReport} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 hover:bg-rose-50 hover:text-rose-800">
                <Flag className="h-3.5 w-3.5" /> Reportar conducta
              </button>
            )}
            {contactPerson?.photoUrl && onReportPhoto && (
              <button type="button" onClick={onReportPhoto} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 hover:bg-rose-50 hover:text-rose-800">
                <Flag className="h-3.5 w-3.5" /> Reportar foto
              </button>
            )}
            {onBlock && (
              <button type="button" onClick={onBlock} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white">
                <Ban className="h-3.5 w-3.5" /> Bloquear {userRole === 'customer' ? 'técnico' : 'cliente'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!interactionBlocked && (booking.status === 'PENDING' || booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS') && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex gap-2 justify-end">
          {booking.status === 'PENDING' && userRole === 'technician' && onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Confirmar
            </button>
          )}

          {booking.status === 'CONFIRMED' && userRole === 'technician' && onStart && (
            <button
              type="button"
              onClick={onStart}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Iniciar trabajo
            </button>
          )}

          {booking.status === 'IN_PROGRESS' && userRole === 'technician' && onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Completar
            </button>
          )}

          {['PENDING', 'CONFIRMED'].includes(booking.status) && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default BookingCard;
