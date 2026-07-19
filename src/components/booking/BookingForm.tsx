import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Phone, FileText, ChevronRight, ChevronLeft, Check, Loader2, X } from 'lucide-react';
import { API_BASE_URL, SERVICE_TYPES } from '../../config/constants';
import { apiFetch } from '../../lib/api';

interface BookingFormProps {
  technician: {
    id: string;
    name: string;
    specialization: string;
  };
  onSubmit: (data: BookingData) => Promise<void>;
  onClose: () => void;
}

interface BookingData {
  technicianId: string;
  scheduledDate: string;
  scheduledTime: string;
  serviceType: string;
  description: string;
  address: string;
  city: string;
  phone: string;
}

const CITIES = [
  'Santiago Centro', 'Los Jardines', 'Bella Vista', 'Reparto del Este',
  'Los Pepines', 'Cienfuegos', 'Gurabo', 'Tamboril', 'Licey al Medio',
  'Villa González', 'Puñal'
];

const BookingForm: React.FC<BookingFormProps> = ({ technician, onSubmit, onClose }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [formData, setFormData] = useState<BookingData>({
    technicianId: technician.id,
    scheduledDate: '',
    scheduledTime: '',
    serviceType: '',
    description: '',
    address: '',
    city: '',
    phone: '',
  });

  const formatDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get minimum date (tomorrow) in the user's local timezone.
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInputValue(tomorrow);
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return formatDateInputValue(maxDate);
  };

  // Fetch available slots when date changes
  useEffect(() => {
    let cancelled = false;

    if (formData.scheduledDate) {
      setLoadingSlots(true);
      setSlotsError('');
      setAvailableSlots([]);
      apiFetch(`${API_BASE_URL}/api/bookings/availability/${technician.id}/slots?date=${formData.scheduledDate}`)
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo consultar la disponibilidad');
          return res.json();
        })
        .then((slots) => {
          if (cancelled) return;
          setAvailableSlots(Array.isArray(slots) ? slots : []);
          setLoadingSlots(false);
        })
        .catch(() => {
          if (cancelled) return;
          setSlotsError('No pudimos consultar los horarios. Intenta elegir la fecha nuevamente.');
          setLoadingSlots(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [formData.scheduledDate, technician.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return !!formData.serviceType;
      case 2:
        return !!formData.scheduledDate;
      case 3:
        return !!formData.scheduledTime;
      case 4:
        return Boolean(
          formData.address.trim() &&
          formData.city &&
          /^\+?[\d\s()-]{10,20}$/.test(formData.phone.trim())
        );
      case 5:
        return true;
      default:
        return false;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes = '00'] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selecciona el tipo de servicio
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service.code}
                  onClick={() => setFormData({ ...formData, serviceType: service.nameEs })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.serviceType === service.nameEs
                      ? 'border-brand-clay-500 bg-brand-clay-50 dark:bg-brand-ocean-800/20'
                      : 'border-brand-control dark:border-gray-700 hover:border-brand-clay-500'
                  }`}
                >
                  <span className={`font-medium ${
                    formData.serviceType === service.nameEs
                      ? 'text-brand-clay-700 dark:text-brand-ocean-100'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {service.nameEs}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selecciona la fecha
            </h3>
            <div className="flex items-center gap-3 rounded-lg border border-brand-control bg-brand-sand p-4 focus-within:border-brand-ocean-500 focus-within:ring-2 focus-within:ring-brand-ocean-500 focus-within:ring-offset-2 dark:bg-gray-800">
              <Calendar className="w-6 h-6 text-brand-clay-500" />
              <input
                type="date"
                value={formData.scheduledDate}
                min={getMinDate()}
                max={getMaxDate()}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value, scheduledTime: '' })}
                className="flex-1 bg-transparent border-none text-lg text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            {formData.scheduledDate && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fecha seleccionada: <span className="font-medium">{formatDate(formData.scheduledDate)}</span>
              </p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selecciona la hora
            </h3>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-brand-ocean-500" />
              </div>
            ) : slotsError ? (
              <div role="alert" className="rounded-xl border border-brand-danger-200 bg-brand-danger-50 p-4 text-sm text-brand-danger-700">
                {slotsError}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No hay horarios disponibles para esta fecha. Prueba con otro día.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setFormData({ ...formData, scheduledTime: slot })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.scheduledTime === slot
                        ? 'border-brand-clay-500 bg-brand-clay-50 dark:bg-brand-ocean-800/20'
                        : 'border-brand-control dark:border-gray-700 hover:border-brand-clay-500'
                    }`}
                  >
                    <Clock className={`w-5 h-5 mx-auto mb-1 ${
                      formData.scheduledTime === slot ? 'text-brand-clay-500' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      formData.scheduledTime === slot
                        ? 'text-brand-clay-700 dark:text-brand-ocean-100'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {formatTime(slot)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalles del servicio
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-brand-control p-3 focus-within:border-brand-ocean-500 focus-within:ring-2 focus-within:ring-brand-ocean-500 focus-within:ring-offset-2 dark:border-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Calle, número, sector..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ciudad
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-lg border border-brand-control bg-white p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-ocean-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Selecciona una ciudad</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono de contacto
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-brand-control p-3 focus-within:border-brand-ocean-500 focus-within:ring-2 focus-within:ring-brand-ocean-500 focus-within:ring-offset-2 dark:border-gray-700">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="809-XXX-XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción del problema (opcional)
                </label>
                <div className="flex items-start gap-2 rounded-lg border border-brand-control p-3 focus-within:border-brand-ocean-500 focus-within:ring-2 focus-within:ring-brand-ocean-500 focus-within:ring-offset-2 dark:border-gray-700">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <textarea
                    placeholder="Describe el problema o servicio que necesitas..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="flex-1 bg-transparent border-none text-gray-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Confirmar reserva
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Técnico</span>
                <span className="font-medium text-gray-900 dark:text-white">{technician.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Especialidad</span>
                <span className="font-medium text-gray-900 dark:text-white">{technician.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Servicio</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fecha</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatDate(formData.scheduledDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Hora</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatTime(formData.scheduledTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dirección</span>
                <span className="font-medium text-gray-900 dark:text-white text-right">{formData.address}, {formData.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Teléfono</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.phone}</span>
              </div>
              {formData.description && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 block mb-1">Descripción</span>
                  <span className="text-gray-900 dark:text-white">{formData.description}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-brand-ocean-50 p-3 text-sm text-brand-ocean-800 dark:bg-brand-ocean-800/20 dark:text-brand-ocean-100">
              Al confirmar, el técnico recibirá una notificación y podrá aceptar o rechazar la reserva.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 id="booking-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">Reservar servicio</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paso {step} de 5</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Cerrar reserva"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-clay-500"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Atrás
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                isStepValid()
                  ? 'bg-brand-clay-600 text-white hover:bg-brand-clay-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-brand-teal-700 px-6 py-2 text-white transition-colors hover:bg-brand-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Confirmar reserva
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingForm;
