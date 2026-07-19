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
    color: 'bg-brand-clay-100 text-brand-clay-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  CONFIRMED: {
    label: 'Confirmada',
    color: 'bg-brand-ocean-100 text-brand-ocean-800 dark:bg-brand-ocean-800/30 dark:text-brand-ocean-100',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  IN_PROGRESS: {
    label: 'En Progreso',
    color: 'bg-brand-ink text-white dark:bg-purple-900/30 dark:text-purple-400',
    icon: <PlayCircle className="w-4 h-4" />,
  },
  COMPLETED: {
    label: 'Completada',
    color: 'bg-brand-teal-100 text-brand-teal-700 dark:bg-brand-teal-800/30 dark:text-brand-teal-100',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-brand-danger-100 text-brand-danger-700 dark:bg-brand-danger-800/30 dark:text-brand-danger-200',
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
      className="overflow-hidden rounded-xl border border-brand-border bg-brand-cream shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-brand-clay-500" />
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-ocean-100 dark:bg-brand-ocean-800/30">
                    <User className="w-6 h-6 text-brand-ocean-700 dark:text-brand-ocean-100" />
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
                      className="truncate text-sm text-brand-ocean-700 hover:underline dark:text-brand-ocean-100"
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
                      className="text-sm text-brand-ocean-700 hover:underline dark:text-brand-ocean-100"
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
              <button type="button" onClick={onReport} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 hover:bg-brand-danger-50 hover:text-brand-danger-700">
                <Flag className="h-3.5 w-3.5" /> Reportar conducta
              </button>
            )}
            {contactPerson?.photoUrl && onReportPhoto && (
              <button type="button" onClick={onReportPhoto} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 hover:bg-brand-danger-50 hover:text-brand-danger-700">
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
              className="rounded-lg bg-brand-ocean-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-ocean-600"
            >
              Confirmar
            </button>
          )}

          {booking.status === 'CONFIRMED' && userRole === 'technician' && onStart && (
            <button
              type="button"
              onClick={onStart}
              className="rounded-lg bg-brand-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-ocean-800"
            >
              Iniciar trabajo
            </button>
          )}

          {booking.status === 'IN_PROGRESS' && userRole === 'technician' && onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-lg bg-brand-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-teal-800"
            >
              Completar
            </button>
          )}

          {['PENDING', 'CONFIRMED'].includes(booking.status) && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-brand-danger-200 px-4 py-2 text-sm font-medium text-brand-danger-700 transition-colors hover:bg-brand-danger-50 dark:border-brand-danger-800 dark:text-brand-danger-200 dark:hover:bg-brand-danger-800/20"
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
