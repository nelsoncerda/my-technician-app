import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Phone, FileText, ChevronRight, ChevronLeft, Check, Loader2, X } from 'lucide-react';
import { SERVICE_TYPES } from '../../config/constants';

interface BookingFormProps {
  technician: {
    id: string;
    name: string;
    specialization: string;
  };
  customerId: string;
  onSubmit: (data: BookingData) => Promise<void>;
  onClose: () => void;
}

interface BookingData {
  technicianId: string;
  customerId: string;
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

const BookingForm: React.FC<BookingFormProps> = ({ technician, customerId, onSubmit, onClose }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [formData, setFormData] = useState<BookingData>({
    technicianId: technician.id,
    customerId,
    scheduledDate: '',
    scheduledTime: '',
    serviceType: '',
    description: '',
    address: '',
    city: '',
    phone: '',
  });

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (formData.scheduledDate) {
      setLoadingSlots(true);
      fetch(`http://localhost:3001/api/bookings/availability/${technician.id}/slots?date=${formData.scheduledDate}`)
        .then((res) => res.json())
        .then((slots) => {
          setAvailableSlots(slots.length > 0 ? slots : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
          setLoadingSlots(false);
        })
        .catch(() => {
          // Use default slots if API fails
          setAvailableSlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
          setLoadingSlots(false);
        });
    }
  }, [formData.scheduledDate, technician.id]);

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
        return !!formData.address && !!formData.city && !!formData.phone;
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
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${ampm}`;
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
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <span className={`font-medium ${
                    formData.serviceType === service.nameEs
                      ? 'text-blue-600 dark:text-blue-400'
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
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-500" />
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
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setFormData({ ...formData, scheduledTime: slot })}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.scheduledTime === slot
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <Clock className={`w-5 h-5 mx-auto mb-1 ${
                      formData.scheduledTime === slot ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <span className={`font-medium ${
                      formData.scheduledTime === slot
                        ? 'text-blue-600 dark:text-blue-400'
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
                <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                <div className="flex items-start gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
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
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
              Al confirmar, el técnico recibirá una notificación y podrá aceptar o rechazar la reserva.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reservar servicio</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Paso {step} de 5</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-2">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
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
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
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
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
