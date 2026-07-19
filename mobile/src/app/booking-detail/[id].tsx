import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Flag,
  Mail,
  Map,
  MapPin,
  Phone,
  Play,
  ReceiptText,
  Star,
  UserRoundX,
  Wrench,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BOOKING_STATUS } from '@/components/booking';
import { CommunityConsentCard } from '@/components/moderation';
import { Button, ErrorState, LoadingState } from '@/components/ui';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { api, ApiError, extractApiErrorMessage } from '@/lib/api';
import { formatBookingDate, formatBookingTime } from '@/lib/date';
import { moderationApi } from '@/lib/moderation-api';
import { useCommunityConsent } from '@/lib/use-community-consent';
import { useAuth } from '@/providers/auth';
import type { Booking, BookingPerson } from '@/types/api';

const REVIEW_FEEDBACK_OPTIONS = [
  'Llegó a tiempo',
  'Buena comunicación',
  'Trabajo de calidad',
  'Buen trato',
  'Precio claro',
] as const;

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const requestScope = id && token && user?.id && isAuthenticated
    ? `${user.id}:${id}:${token}`
    : '';
  const requestSequence = useRef(0);
  const activeScope = useRef(requestScope);
  const [bookingState, setBookingState] = useState<{
    booking: Booking;
    scope: string;
  } | null>(null);
  const booking = bookingState?.scope === requestScope ? bookingState.booking : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConsentError, setCancelConsentError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [bookingAction, setBookingAction] = useState<'confirm' | 'start' | 'complete' | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [totalPrice, setTotalPrice] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewConsentError, setReviewConsentError] = useState('');
  const [safetyError, setSafetyError] = useState('');
  const [blockingContact, setBlockingContact] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const communityConsent = useCommunityConsent(token);

  useEffect(() => {
    activeScope.current = requestScope;
  }, [requestScope]);

  const loadBooking = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setBookingState(null);
    setError('');
    setShowCancel(false);
    setCancelReason('');
    setCancelConsentError('');
    setShowComplete(false);
    setTotalPrice('');
    setCancelling(false);
    setBookingAction(null);
    setReviewError('');
    setReviewSubmitting(false);
    setReviewSubmitted(false);
    setReviewMessage('');
    setReviewConsentError('');
    setSafetyError('');
    setBlockingContact(false);
    setBlockedUserIds([]);

    if (!id || !token || !requestScope) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [loadedBooking, blocks] = await Promise.all([
        api.bookings.get(id, token),
        moderationApi.blocks(token),
      ]);
      if (requestSequence.current !== sequence) return;
      setBlockedUserIds(blocks.map((block) => block.blockedUserId));
      setBookingState({ booking: loadedBooking, scope: requestScope });
    } catch (requestError: unknown) {
      if (requestSequence.current !== sequence) return;
      setBookingState(null);
      setError(extractApiErrorMessage(requestError));
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }, [id, requestScope, token]);

  useFocusEffect(useCallback(() => {
    void loadBooking();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadBooking]));

  const cancelBooking = async () => {
    if (!booking || !token || bookingAction || cancelling) return;
    const actionScope = requestScope;
    setCancelling(true);
    setError('');
    setCancelConsentError('');
    try {
      await communityConsent.acceptIfNeeded();
      const isTechnicianBooking = user?.role === 'technician' &&
        user.technicianId === booking.technicianId;
      const updated = await api.bookings.cancel(
        booking.id,
        cancelReason.trim() || (
          isTechnicianBooking
            ? 'Cancelada por el técnico desde la aplicación móvil.'
            : 'Cancelada por el cliente desde la aplicación móvil.'
        ),
        token
      );
      if (activeScope.current !== actionScope) return;
      setBookingState((current) => current?.scope === actionScope
        ? { booking: { ...current.booking, ...updated }, scope: actionScope }
        : current);
      setShowCancel(false);
      setCancelReason('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      if (activeScope.current === actionScope) {
        const message = extractApiErrorMessage(requestError);
        if (!communityConsent.accepted) setCancelConsentError(message);
        setError(message);
      }
    } finally {
      if (activeScope.current === actionScope) setCancelling(false);
    }
  };

  const changeBookingStatus = async (action: 'confirm' | 'start') => {
    if (!booking || !token || bookingAction || cancelling) return;
    const actionScope = requestScope;
    setBookingAction(action);
    setError('');
    try {
      const updated = action === 'confirm'
        ? await api.bookings.confirm(booking.id, token)
        : await api.bookings.start(booking.id, token);
      if (activeScope.current !== actionScope) return;
      setBookingState((current) => current?.scope === actionScope
        ? { booking: { ...current.booking, ...updated }, scope: actionScope }
        : current);
      setShowCancel(false);
      setCancelReason('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      if (activeScope.current === actionScope) {
        setError(extractApiErrorMessage(requestError));
      }
    } finally {
      if (activeScope.current === actionScope) setBookingAction(null);
    }
  };

  const completeBooking = async () => {
    if (!booking || !token || bookingAction || cancelling) return;
    const actionScope = requestScope;

    const normalizedPrice = totalPrice.trim().replace(/\s/g, '').replace(',', '.');
    const parsedPrice = normalizedPrice ? Number(normalizedPrice) : undefined;
    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError('Ingresa un precio total válido.');
      return;
    }

    setBookingAction('complete');
    setError('');
    try {
      const updated = await api.bookings.complete(booking.id, parsedPrice, token);
      if (activeScope.current !== actionScope) return;
      setBookingState((current) => current?.scope === actionScope
        ? { booking: { ...current.booking, ...updated }, scope: actionScope }
        : current);
      setShowComplete(false);
      setTotalPrice('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      if (activeScope.current === actionScope) {
        setError(extractApiErrorMessage(requestError));
      }
    } finally {
      if (activeScope.current === actionScope) setBookingAction(null);
    }
  };

  const submitReview = async () => {
    if (!booking || !token) return;
    const actionScope = requestScope;
    if (!reviewFeedback) {
      setReviewError('Selecciona la frase que mejor describe tu experiencia.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');
    setReviewConsentError('');
    try {
      await communityConsent.acceptIfNeeded();
      await api.technicians.addReview(
        booking.technicianId,
        { rating: reviewRating, comment: reviewFeedback },
        token
      );
      if (activeScope.current !== actionScope) return;
      setReviewSubmitted(true);
      setReviewMessage('Gracias. Tu calificación fue enviada.');
      setReviewFeedback('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError: unknown) {
      if (activeScope.current !== actionScope) return;
      const message = extractApiErrorMessage(requestError);
      if (
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        message.toLocaleLowerCase('es').includes('ya publicaste')
      ) {
        setReviewSubmitted(true);
        setReviewMessage(message);
      } else {
        if (!communityConsent.accepted) setReviewConsentError(message);
        setReviewError(message);
      }
    } finally {
      if (activeScope.current === actionScope) setReviewSubmitting(false);
    }
  };

  const openContactReport = (target: BookingPerson) => {
    if (!booking) return;
    router.push({
      pathname: '/moderation/report',
      params: {
        targetUserId: target.id,
        ...(target.id === booking.technician?.user.id
          ? { technicianId: booking.technicianId }
          : {}),
        targetName: target.name,
        contentType: 'BEHAVIOR',
        allowedContentTypes: target.photoUrl ? 'BEHAVIOR,PHOTO' : 'BEHAVIOR',
      },
    } as never);
  };

  const requestBlockContact = (target: BookingPerson) => {
    Alert.alert(
      'Bloquear usuario',
      `No verás nuevas interacciones de ${target.name}. Este bloqueo no cancela automáticamente la reserva actual.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Bloquear', style: 'destructive', onPress: () => void blockContact(target) },
      ]
    );
  };

  const blockContact = async (target: BookingPerson) => {
    if (!token || blockingContact) return;
    setBlockingContact(true);
    setSafetyError('');
    try {
      await moderationApi.block(target.id, token);
      setBlockedUserIds((current) => current.includes(target.id) ? current : [...current, target.id]);
      Alert.alert('Usuario bloqueado', 'Puedes administrar tus bloqueos desde Cuenta.');
      router.replace('/(tabs)/bookings');
    } catch (caught: unknown) {
      setSafetyError(extractApiErrorMessage(caught, 'No pudimos bloquear este usuario.'));
    } finally {
      setBlockingContact(false);
    }
  };

  if (authLoading || loading) return <LoadingState message="Cargando la reserva…" />;

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Inicia sesión para continuar</Text>
        <Text style={styles.muted}>Los detalles de esta reserva están protegidos.</Text>
        <Button label="Iniciar sesión" onPress={() => router.replace('/(auth)/sign-in')} />
      </View>
    );
  }

  if (error && !booking) {
    return (
      <View style={styles.stateWrap}>
        <ErrorState actionLabel="Intentar de nuevo" message={error} onAction={loadBooking} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Reserva no encontrada</Text>
        <Button label="Volver a reservas" onPress={() => router.replace('/(tabs)/bookings')} />
      </View>
    );
  }

  const status = BOOKING_STATUS[booking.status];
  const perspective = user?.role === 'technician' && user.technicianId === booking.technicianId
    ? 'technician'
    : 'customer';
  const contact: BookingPerson | undefined = perspective === 'customer'
    ? booking.technician?.user
    : booking.customer;
  const contactBlocked = Boolean(contact && blockedUserIds.includes(contact.id));
  const canCancel = user?.role !== 'admin' && (
    booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  );
  const canReview = !contactBlocked && user?.id === booking.customerId && booking.status === 'COMPLETED';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Wrench color={Colors.clay} size={25} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>RESERVA</Text>
            <Text style={styles.title}>{booking.serviceType}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.foreground }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.bookingNumber}>Código: {booking.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <Section title="Fecha y lugar">
        <DetailRow icon={<CalendarDays color={Colors.ocean} size={20} />} label="Fecha">
          {formatBookingDate(booking.scheduledDate)}
        </DetailRow>
        <DetailRow icon={<Clock3 color={Colors.ocean} size={20} />} label="Hora">
          {formatBookingTime(booking.scheduledTime)}
        </DetailRow>
        <DetailRow icon={<MapPin color={Colors.ocean} size={20} />} label="Dirección">
          {booking.address}, {booking.city}
        </DetailRow>
        <Button
          label="Abrir en el mapa"
          leftIcon={<Map color={Colors.oceanDark} size={18} />}
          onPress={() => openMap(`${booking.address}, ${booking.city}`)}
          variant="outline"
        />
      </Section>

      {contact ? (
        <Section title={perspective === 'customer' ? 'Tu técnico' : 'Cliente'}>
          {contactBlocked ? (
            <View accessibilityLiveRegion="polite" style={styles.blockedContactNotice}>
              <UserRoundX color={Colors.danger} size={24} />
              <View style={styles.flex}>
                <Text style={styles.blockedContactTitle}>Usuario bloqueado</Text>
                <Text style={styles.blockedContactCopy}>
                  Esta reserva se conserva como historial. Ocultamos el contacto y las acciones del servicio.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.contactHeader}>
                <View style={styles.contactAvatar}>
                  <CircleUserRound color={Colors.ocean} size={28} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.muted}>Contacto para esta reserva</Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                {contact.phone ? (
                  <ContactAction
                    icon={<Phone color={Colors.oceanDark} size={18} />}
                    label="Llamar"
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  />
                ) : null}
                {contact.email ? (
                  <ContactAction
                    icon={<Mail color={Colors.oceanDark} size={18} />}
                    label="Correo"
                    onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                  />
                ) : null}
              </View>
              {user?.role !== 'admin' && contact.id !== user?.id ? (
                <View style={styles.safetyActions}>
                  <Button
                    disabled={blockingContact}
                    label="Reportar"
                    leftIcon={<Flag color={Colors.clayDark} size={17} />}
                    onPress={() => openContactReport(contact)}
                    size="sm"
                    variant="outline"
                  />
                  <Button
                    label="Bloquear"
                    leftIcon={<UserRoundX color={Colors.cream} size={17} />}
                    loading={blockingContact}
                    onPress={() => requestBlockContact(contact)}
                    size="sm"
                    variant="danger"
                  />
                </View>
              ) : null}
              {safetyError ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{safetyError}</Text> : null}
            </>
          )}
        </Section>
      ) : null}

      <Section title="Detalles del servicio">
        {perspective !== 'technician' || !contactBlocked ? (
          <DetailRow icon={<Phone color={Colors.ocean} size={20} />} label="Teléfono de contacto">
            {booking.phone}
          </DetailRow>
        ) : null}
        <DetailRow icon={<ReceiptText color={Colors.ocean} size={20} />} label="Duración estimada">
          {booking.estimatedDuration} minutos
        </DetailRow>
        {booking.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.detailLabel}>Descripción</Text>
            <Text style={styles.description}>{booking.description}</Text>
          </View>
        ) : null}
        {typeof booking.totalPrice === 'number' ? (
          <View style={styles.priceRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.price}>{formatCurrency(booking.totalPrice)}</Text>
          </View>
        ) : null}
      </Section>

      {booking.status === 'CANCELLED' && booking.cancelReason ? (
        <View style={styles.cancelledNote}>
          <Text style={styles.cancelledTitle}>Motivo de cancelación</Text>
          <Text style={styles.cancelledCopy}>{booking.cancelReason}</Text>
        </View>
      ) : null}

      {!contactBlocked && perspective === 'technician' && booking.status === 'PENDING' ? (
        <Section title="Gestionar servicio">
          <Text style={styles.sectionCopy}>
            Confirma la solicitud para que el cliente sepa que atenderás el servicio.
          </Text>
          <Button
            accessibilityHint="Cambia el estado de la reserva a confirmada"
            disabled={cancelling}
            fullWidth
            label="Confirmar solicitud"
            leftIcon={<CheckCircle2 color={Colors.cream} size={19} />}
            loading={bookingAction === 'confirm'}
            onPress={() => void changeBookingStatus('confirm')}
          />
        </Section>
      ) : null}

      {!contactBlocked && perspective === 'technician' && booking.status === 'CONFIRMED' ? (
        <Section title="Gestionar servicio">
          <Text style={styles.sectionCopy}>
            Cuando llegues y comiences el trabajo, marca el servicio como iniciado.
          </Text>
          <Button
            accessibilityHint="Cambia el estado de la reserva a en progreso"
            disabled={cancelling}
            fullWidth
            label="Iniciar servicio"
            leftIcon={<Play color={Colors.cream} fill={Colors.cream} size={18} />}
            loading={bookingAction === 'start'}
            onPress={() => void changeBookingStatus('start')}
            variant="secondary"
          />
        </Section>
      ) : null}

      {!contactBlocked && perspective === 'technician' && booking.status === 'IN_PROGRESS' ? (
        <Section title="Gestionar servicio">
          {showComplete ? (
            <>
              <Text style={styles.sectionCopy}>
                Si ya conoces el precio final, puedes registrarlo antes de completar el servicio.
              </Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.currencyPrefix}>RD$</Text>
                <TextInput
                  accessibilityLabel="Precio total del servicio en pesos dominicanos"
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  maxLength={12}
                  onChangeText={(value) => {
                    setTotalPrice(value);
                    if (error) setError('');
                  }}
                  placeholder="Opcional"
                  placeholderTextColor={Colors.muted}
                  style={styles.priceInput}
                  value={totalPrice}
                />
              </View>
              <Button
                accessibilityHint="Completa el servicio y guarda el precio total si fue indicado"
                fullWidth
                label="Confirmar servicio completado"
                leftIcon={<CheckCircle2 color={Colors.cream} size={19} />}
                loading={bookingAction === 'complete'}
                onPress={() => void completeBooking()}
              />
              <Button
                disabled={bookingAction === 'complete'}
                fullWidth
                label="Volver"
                onPress={() => {
                  setShowComplete(false);
                  setError('');
                }}
                variant="ghost"
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionCopy}>
                Al terminar, registra el precio final si aplica y cierra la reserva.
              </Text>
              <Button
                accessibilityHint="Abre el formulario para completar el servicio"
                fullWidth
                label="Completar servicio"
                leftIcon={<CheckCircle2 color={Colors.cream} size={19} />}
                onPress={() => {
                  setShowComplete(true);
                  setError('');
                }}
              />
            </>
          )}
        </Section>
      ) : null}

      {canReview ? (
        <Section title="Comparte tu experiencia">
          {reviewSubmitted ? (
            <View accessibilityLiveRegion="polite" style={styles.successBox}>
              <CheckCircle2 color={Colors.success} size={21} />
              <Text style={styles.successText}>{reviewMessage}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionCopy}>
                Tu calificación ayuda a otras personas a elegir con confianza.
              </Text>
              <View>
                <Text style={styles.inputLabel}>Calificación</Text>
                <View accessibilityRole="radiogroup" style={styles.starPicker}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: reviewRating === star }}
                      hitSlop={4}
                      key={star}
                      onPress={() => setReviewRating(star)}
                      style={({ pressed }) => [styles.starButton, pressed && styles.starButtonPressed]}
                    >
                      <Star
                        color={Colors.amber}
                        fill={star <= reviewRating ? Colors.amber : 'transparent'}
                        size={28}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={styles.inputLabel}>¿Qué destacó?</Text>
                <Text style={styles.feedbackHelp}>
                  Selecciona una opción. No publicamos comentarios escritos desde la app.
                </Text>
                <View accessibilityRole="radiogroup" style={styles.feedbackOptions}>
                  {REVIEW_FEEDBACK_OPTIONS.map((option) => {
                    const selected = reviewFeedback === option;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={option}
                        onPress={() => {
                          setReviewFeedback(option);
                          if (reviewError) setReviewError('');
                        }}
                        style={[styles.feedbackOption, selected && styles.feedbackOptionSelected]}
                      >
                        {selected ? <CheckCircle2 color={Colors.tealDark} size={17} /> : null}
                        <Text style={[styles.feedbackOptionText, selected && styles.feedbackOptionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <CommunityConsentCard
                accepted={communityConsent.accepted}
                checked={communityConsent.checked}
                disabled={reviewSubmitting || communityConsent.isAccepting}
                error={reviewConsentError || communityConsent.error}
                onChange={(checked) => {
                  communityConsent.setChecked(checked);
                  setReviewConsentError('');
                }}
              />
              {reviewError ? (
                <View accessibilityLiveRegion="polite" style={styles.inlineErrorBox}>
                  <Text style={styles.errorText}>{reviewError}</Text>
                </View>
              ) : null}
              <Button
                disabled={
                  !reviewFeedback ||
                  communityConsent.isLoading ||
                  communityConsent.isAccepting
                }
                fullWidth
                label="Enviar calificación"
                loading={reviewSubmitting}
                onPress={() => void submitReview()}
                variant="secondary"
              />
            </>
          )}
        </Section>
      ) : null}

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showCancel && canCancel ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelTitle}>Cancelar esta reserva</Text>
          <Text style={styles.muted}>
            Puedes indicar un motivo para informar {perspective === 'technician' ? 'al cliente' : 'al técnico'}.
          </Text>
          <TextInput
            accessibilityLabel="Motivo de cancelación"
            maxLength={500}
            multiline
            onChangeText={setCancelReason}
            placeholder="Motivo (opcional)"
            placeholderTextColor={Colors.muted}
            style={styles.cancelInput}
            textAlignVertical="top"
            value={cancelReason}
          />
          <CommunityConsentCard
            accepted={communityConsent.accepted}
            checked={communityConsent.checked}
            disabled={cancelling || communityConsent.isAccepting}
            error={cancelConsentError || communityConsent.error}
            onChange={(checked) => {
              communityConsent.setChecked(checked);
              setCancelConsentError('');
            }}
          />
          <Button
            disabled={
              bookingAction !== null ||
              communityConsent.isLoading ||
              communityConsent.isAccepting
            }
            fullWidth
            label="Confirmar cancelación"
            loading={cancelling}
            onPress={cancelBooking}
            variant="danger"
          />
          <Button
            disabled={cancelling}
            fullWidth
            label="Conservar reserva"
            onPress={() => setShowCancel(false)}
            variant="ghost"
          />
        </View>
      ) : canCancel ? (
        <Button
          disabled={bookingAction !== null}
          fullWidth
          label="Cancelar reserva"
          onPress={() => setShowCancel(true)}
          variant="ghost"
          labelStyle={{ color: Colors.danger }}
        />
      ) : null}

      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL('https://api.tecnicosenrd.com/support')}
        style={styles.helpText}
      >
        ¿Necesitas ayuda? Abre el centro de soporte.
      </Text>
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{children}</Text>
      </View>
    </View>
  );
}

function ContactAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.contactAction}>
      {icon}
      <Text style={styles.contactActionText}>{label}</Text>
    </Pressable>
  );
}

async function openMap(address: string) {
  const query = encodeURIComponent(address);
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?q=${query}`
    : `geo:0,0?q=${query}`;
  const supported = await Linking.canOpenURL(url);
  await Linking.openURL(supported ? url : `https://www.google.com/maps/search/?api=1&query=${query}`);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.md, padding: Spacing.md, paddingBottom: Spacing.xxl },
  centered: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    flex: 1,
    gap: Spacing.md,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  stateWrap: { backgroundColor: Colors.sand, flex: 1, justifyContent: 'center', padding: Spacing.md },
  heroCard: {
    ...Shadows.card,
    backgroundColor: Colors.ink,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: Colors.clayLight,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroCopy: { flex: 1 },
  eyebrow: { ...Typography.caption, color: Colors.clay100, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...Typography.heading, color: Colors.cream },
  status: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 12, fontWeight: '800' },
  bookingNumber: { ...Typography.caption, color: '#BCC4D2' },
  section: {
    backgroundColor: Colors.cream,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: { ...Typography.subheading, color: Colors.ink },
  sectionCopy: { ...Typography.body, color: Colors.muted },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  detailLabel: { ...Typography.caption, color: Colors.muted, fontWeight: '700' },
  detailValue: { ...Typography.body, color: Colors.charcoal, marginTop: 1, textTransform: 'capitalize' },
  contactHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  contactAvatar: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  contactName: { ...Typography.bodyStrong, color: Colors.ink },
  blockedContactNotice: {
    alignItems: 'flex-start',
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  blockedContactTitle: { ...Typography.bodyStrong, color: Colors.danger },
  blockedContactCopy: { ...Typography.body, color: Colors.charcoal, marginTop: 2 },
  muted: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  contactActions: { flexDirection: 'row', gap: Spacing.sm },
  safetyActions: {
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  contactAction: {
    alignItems: 'center',
    backgroundColor: Colors.oceanLight,
    borderRadius: Radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  contactActionText: { ...Typography.label, color: Colors.oceanDark },
  descriptionBox: { backgroundColor: Colors.sand, borderRadius: Radius.md, gap: 4, padding: 12 },
  description: { ...Typography.body, color: Colors.charcoal },
  priceRow: {
    alignItems: 'center',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  price: { ...Typography.heading, color: Colors.ink },
  priceInputWrap: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  currencyPrefix: { ...Typography.bodyStrong, color: Colors.charcoal },
  priceInput: {
    ...Typography.body,
    color: Colors.charcoal,
    flex: 1,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 0,
  },
  cancelledNote: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, gap: 4, padding: Spacing.md },
  cancelledTitle: { ...Typography.label, color: Colors.danger },
  cancelledCopy: { ...Typography.body, color: Colors.charcoal },
  errorBox: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, padding: 12 },
  errorText: { ...Typography.label, color: Colors.danger },
  inlineErrorBox: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.md, padding: 12 },
  successBox: {
    alignItems: 'center',
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: 12,
  },
  successText: { ...Typography.label, color: Colors.success, flex: 1 },
  inputLabel: { ...Typography.label, color: Colors.charcoal, marginBottom: Spacing.sm },
  starPicker: { flexDirection: 'row', gap: Spacing.xs },
  starButton: {
    alignItems: 'center',
    borderRadius: Radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  starButtonPressed: { backgroundColor: Colors.clayLight },
  feedbackHelp: { ...Typography.caption, color: Colors.muted, marginBottom: Spacing.sm },
  feedbackOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  feedbackOption: {
    alignItems: 'center',
    backgroundColor: Colors.sand,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  feedbackOptionSelected: { backgroundColor: Colors.tealSoft, borderColor: Colors.teal },
  feedbackOptionText: { ...Typography.label, color: Colors.charcoal },
  feedbackOptionTextSelected: { color: Colors.tealDark },
  cancelBox: {
    backgroundColor: Colors.cream,
    borderColor: Colors.danger,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: Spacing.md,
  },
  cancelTitle: { ...Typography.subheading, color: Colors.danger },
  cancelInput: {
    backgroundColor: Colors.sand,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.charcoal,
    fontSize: 16,
    minHeight: 94,
    padding: 12,
  },
  helpText: { ...Typography.caption, color: Colors.muted, textAlign: 'center' },
});
