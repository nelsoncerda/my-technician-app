import {
  AlertTriangle,
  Camera,
  Clock3,
  Flag,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, LoadingState } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { extractApiErrorMessage } from '@/lib/api';
import {
  moderationApi,
  type AdminModerationQueue,
  type ModerationReport,
  type ModerationReportReason,
  type ModerationResolutionAction,
  type PendingPhotoModeration,
  type PendingProfileModeration,
  type PhotoModerationDecision,
  type ProfileModerationDecision,
} from '@/lib/moderation-api';

const EMPTY_QUEUE: AdminModerationQueue = {
  reports: [],
  pendingProfiles: [],
  pendingPhotos: [],
  counts: {},
};

export function AdminModerationQueuePanel({ token }: { token: string }) {
  const [queue, setQueue] = useState<AdminModerationQueue>(EMPTY_QUEUE);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setQueue(await moderationApi.adminQueue(token));
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos cargar la cola de moderación.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const run = async (key: string, successMessage: string, task: () => Promise<unknown>) => {
    if (workingKey) return;
    setWorkingKey(key);
    setError('');
    setSuccess('');
    try {
      await task();
      setSuccess(successMessage);
      await load();
    } catch (caught: unknown) {
      setError(extractApiErrorMessage(caught, 'No pudimos aplicar esta decisión.'));
    } finally {
      setWorkingKey('');
    }
  };

  const resolveReport = (
    report: ModerationReport,
    status: 'RESOLVED' | 'DISMISSED',
    action: ModerationResolutionAction,
    label: string
  ) => {
    const resolutionNote = notes[`report:${report.id}`]?.trim();
    if (!resolutionNote) {
      setError('Escribe una nota interna antes de resolver o descartar el reporte.');
      return;
    }
    const destructive = action === 'CONTENT_REMOVED' ||
      action === 'TECHNICIAN_SUSPENDED' ||
      action === 'USER_SUSPENDED';
    const execute = () => void run(
      `report:${report.id}:${status}:${action}`,
      `Reporte ${label.toLocaleLowerCase('es')}.`,
      () => moderationApi.resolveReport(report.id, {
        status,
        action,
        resolutionNote,
      }, token)
    );
    if (!destructive) {
      execute();
      return;
    }
    Alert.alert(
      label,
      action === 'TECHNICIAN_SUSPENDED'
        ? 'El perfil profesional dejará de aparecer públicamente.'
        : action === 'USER_SUSPENDED'
          ? 'La cuenta quedará con acceso limitado hasta que un administrador la restaure.'
          : 'El contenido reportado será retirado de la experiencia pública.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: label, style: 'destructive', onPress: execute },
      ]
    );
  };

  const decideProfile = (profile: PendingProfileModeration, decision: ProfileModerationDecision) => {
    const technicianId = profile.technicianId || profile.id;
    if (decision === 'REJECT' && !notes[`profile:${technicianId}`]?.trim()) {
      setError('Escribe un motivo antes de rechazar el perfil.');
      return;
    }
    const label = decision === 'APPROVE' ? 'Perfil aprobado' : decision === 'REJECT' ? 'Perfil rechazado' : 'Perfil suspendido';
    void run(
      `profile:${technicianId}:${decision}`,
      label,
      () => moderationApi.moderateProfile(
        technicianId,
        decision,
        token,
        notes[`profile:${technicianId}`]?.trim() || undefined
      )
    );
  };

  const decidePhoto = (photo: PendingPhotoModeration, decision: PhotoModerationDecision) => {
    if (decision === 'REJECT' && !notes[`photo:${photo.id}`]?.trim()) {
      setError('Escribe un motivo antes de rechazar la foto.');
      return;
    }
    const label = decision === 'APPROVE' ? 'Foto aprobada' : 'Foto rechazada';
    void run(
      `photo:${photo.id}:${decision}`,
      label,
      () => moderationApi.moderatePhoto(
        photo.id,
        decision,
        token,
        notes[`photo:${photo.id}`]?.trim() || undefined
      )
    );
  };

  if (loading) return <LoadingState message="Cargando cola de moderación…" />;

  const reportCount = queue.counts.reports ?? queue.reports.length;
  const profileCount = queue.counts.pendingProfiles ?? queue.pendingProfiles.length;
  const photoCount = queue.counts.pendingPhotos ?? queue.pendingPhotos.length;

  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><ShieldAlert color={Colors.cream} size={25} /></View>
        <View style={styles.flex}>
          <Text style={styles.heroTitle}>Cola de moderación</Text>
          <Text style={styles.heroCopy}>Revisa primero los casos fuera del SLA de 24 horas.</Text>
        </View>
        <Button
          label="Actualizar"
          leftIcon={<RefreshCw color={Colors.ink} size={17} />}
          onPress={() => void load()}
          size="sm"
          variant="outline"
        />
      </View>

      {error ? <Message text={error} tone="error" /> : null}
      {success ? <Message text={success} tone="success" /> : null}

      <View style={styles.countGrid}>
        <CountCard icon={<Flag color={Colors.danger} size={19} />} label="Reportes abiertos" value={reportCount} />
        <CountCard icon={<UserCheck color={Colors.amber} size={19} />} label="Perfiles pendientes" value={profileCount} />
        <CountCard icon={<Camera color={Colors.ocean} size={19} />} label="Fotos pendientes" value={photoCount} />
      </View>

      <View style={styles.section}>
        <SectionTitle icon={<Flag color={Colors.danger} size={20} />} title="Reportes abiertos" />
        {queue.reports.length ? queue.reports.map((report) => (
          <View key={report.id} style={[styles.card, report.overdue && styles.overdueCard]}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{report.targetUser?.name || 'Contenido reportado'}</Text>
                <Text style={styles.meta}>{contentLabel(report.contentType)} · {reasonLabel(report.reason)}</Text>
              </View>
              <AgeBadge createdAt={report.createdAt} ageHours={report.ageHours} overdue={report.overdue} />
            </View>
            {report.details ? <Text style={styles.details}>{report.details}</Text> : null}
            {report.status === 'UNDER_REVIEW' ? (
              <Text style={styles.reviewState}>En revisión por {report.reviewedBy?.name || 'un administrador'}</Text>
            ) : null}
            <Text style={styles.date}><Clock3 color={Colors.muted} size={14} /> {formatDate(report.createdAt)}</Text>
            <TextInput
              accessibilityLabel={`Nota interna para el reporte ${report.id}`}
              maxLength={500}
              multiline
              onChangeText={(value) => setNotes((current) => ({ ...current, [`report:${report.id}`]: value }))}
              placeholder="Nota interna de resolución (requerida)"
              placeholderTextColor={Colors.muted}
              style={styles.noteInput}
              value={notes[`report:${report.id}`] || ''}
            />
            <Text style={styles.noteHelp}>Requerida para documentar la decisión administrativa.</Text>
            <View style={styles.actions}>
              {report.status === 'OPEN' ? <Button disabled={Boolean(workingKey)} label="Tomar caso" loading={workingKey === `report:${report.id}:claim`} onPress={() => void run(`report:${report.id}:claim`, 'Caso asignado para revisión.', () => moderationApi.claimReport(report.id, token))} size="sm" variant="outline" /> : null}
              <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Resolver" loading={workingKey === `report:${report.id}:RESOLVED:NONE`} onPress={() => resolveReport(report, 'RESOLVED', 'NONE', 'Resolver')} size="sm" variant="secondary" />
              <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Registrar advertencia" loading={workingKey === `report:${report.id}:RESOLVED:WARNING_RECORDED`} onPress={() => resolveReport(report, 'RESOLVED', 'WARNING_RECORDED', 'Registrar advertencia')} size="sm" variant="outline" />
              {report.contentType === 'PHOTO' ? <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Retirar contenido" loading={workingKey === `report:${report.id}:RESOLVED:CONTENT_REMOVED`} onPress={() => resolveReport(report, 'RESOLVED', 'CONTENT_REMOVED', 'Retirar contenido')} size="sm" variant="outline" /> : null}
              {report.technicianId ? <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Suspender" loading={workingKey === `report:${report.id}:RESOLVED:TECHNICIAN_SUSPENDED`} onPress={() => resolveReport(report, 'RESOLVED', 'TECHNICIAN_SUSPENDED', 'Suspender')} size="sm" variant="danger" /> : null}
              <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Suspender cuenta" loading={workingKey === `report:${report.id}:RESOLVED:USER_SUSPENDED`} onPress={() => resolveReport(report, 'RESOLVED', 'USER_SUSPENDED', 'Suspender cuenta')} size="sm" variant="danger" />
              <Button disabled={Boolean(workingKey) || !notes[`report:${report.id}`]?.trim()} label="Descartar" loading={workingKey === `report:${report.id}:DISMISSED:NONE`} onPress={() => resolveReport(report, 'DISMISSED', 'NONE', 'Descartar')} size="sm" variant="ghost" />
            </View>
          </View>
        )) : <Empty text="No hay reportes pendientes." />}
      </View>

      <View style={styles.section}>
        <SectionTitle icon={<UserCheck color={Colors.amber} size={20} />} title="Perfiles pendientes" />
        {queue.pendingProfiles.length ? queue.pendingProfiles.map((profile) => {
          const id = profile.technicianId || profile.id;
          return (
            <View key={id} style={[styles.card, profile.overdue && styles.overdueCard]}>
              <View style={styles.cardHeader}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{profile.user?.name || profile.name || 'Técnico'}</Text>
                  <Text style={styles.meta}>{profile.location || 'Zona no indicada'}</Text>
                </View>
                <AgeBadge createdAt={profile.submittedAt || profile.createdAt} ageHours={profile.ageHours} overdue={profile.overdue} />
              </View>
              {profile.specializations?.length ? <Text style={styles.details}>{profile.specializations.join(' · ')}</Text> : null}
              <TextInput
                accessibilityLabel={`Nota interna para el perfil ${id}`}
                maxLength={300}
                onChangeText={(value) => setNotes((current) => ({ ...current, [`profile:${id}`]: value }))}
                placeholder="Motivo o nota (opcional)"
                placeholderTextColor={Colors.muted}
                style={styles.noteInput}
                value={notes[`profile:${id}`] || ''}
              />
              <Text style={styles.noteHelp}>El motivo es requerido para rechazar.</Text>
              <View style={styles.actions}>
                <Button disabled={Boolean(workingKey)} label="Aprobar" loading={workingKey === `profile:${id}:APPROVE`} onPress={() => decideProfile(profile, 'APPROVE')} size="sm" variant="secondary" />
                <Button disabled={Boolean(workingKey) || !notes[`profile:${id}`]?.trim()} label="Rechazar" loading={workingKey === `profile:${id}:REJECT`} onPress={() => decideProfile(profile, 'REJECT')} size="sm" variant="danger" />
              </View>
            </View>
          );
        }) : <Empty text="No hay perfiles pendientes." />}
      </View>

      <View style={styles.section}>
        <SectionTitle icon={<Camera color={Colors.ocean} size={20} />} title="Fotos pendientes" />
        {queue.pendingPhotos.length ? queue.pendingPhotos.map((photo) => {
          const imageUri = photo.pendingPhotoUrl || photo.imageData || photo.photoUrl || photo.user?.photoUrl;
          return (
            <View key={photo.id} style={[styles.card, photo.overdue && styles.overdueCard]}>
              <View style={styles.photoRow}>
                {imageUri ? (
                  <Image accessibilityLabel="Foto pendiente de moderación" source={{ uri: imageUri }} style={styles.photo} />
                ) : (
                  <View style={styles.photoFallback}><Camera color={Colors.muted} size={28} /></View>
                )}
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{photo.user?.name || photo.name || 'Usuario'}</Text>
                  <Text style={styles.meta}>{formatDate(photo.submittedAt || photo.createdAt)}</Text>
                  <AgeBadge createdAt={photo.submittedAt || photo.createdAt} ageHours={photo.ageHours} overdue={photo.overdue} />
                </View>
              </View>
              <TextInput
                accessibilityLabel={`Nota interna para la foto ${photo.id}`}
                maxLength={300}
                onChangeText={(value) => setNotes((current) => ({ ...current, [`photo:${photo.id}`]: value }))}
                placeholder="Motivo o nota (opcional)"
                placeholderTextColor={Colors.muted}
                style={styles.noteInput}
                value={notes[`photo:${photo.id}`] || ''}
              />
              <Text style={styles.noteHelp}>El motivo es requerido para rechazar.</Text>
              <View style={styles.actions}>
                <Button disabled={Boolean(workingKey)} label="Aprobar" loading={workingKey === `photo:${photo.id}:APPROVE`} onPress={() => decidePhoto(photo, 'APPROVE')} size="sm" variant="secondary" />
                <Button disabled={Boolean(workingKey) || !notes[`photo:${photo.id}`]?.trim()} label="Rechazar" loading={workingKey === `photo:${photo.id}:REJECT`} onPress={() => decidePhoto(photo, 'REJECT')} size="sm" variant="danger" />
              </View>
            </View>
          );
        }) : <Empty text="No hay fotos pendientes." />}
      </View>
    </View>
  );
}

function CountCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <View style={styles.countCard}>{icon}<Text style={styles.countValue}>{value}</Text><Text style={styles.countLabel}>{label}</Text></View>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <View style={styles.sectionTitle}>{icon}<Text style={styles.sectionTitleText}>{title}</Text></View>;
}

function AgeBadge({ ageHours, createdAt, overdue }: { ageHours?: number; createdAt?: string; overdue?: boolean }) {
  const computedHours = typeof ageHours === 'number' ? ageHours : hoursSince(createdAt);
  const isOverdue = overdue ?? computedHours >= 24;
  return (
    <View accessibilityLabel={`${Math.round(computedHours)} horas en cola, ${isOverdue ? 'fuera del SLA' : 'dentro del SLA'}`} style={[styles.ageBadge, isOverdue && styles.ageBadgeOverdue]}>
      {isOverdue ? <AlertTriangle color={Colors.danger} size={14} /> : <Clock3 color={Colors.amber} size={14} />}
      <Text style={[styles.ageText, isOverdue && styles.ageTextOverdue]}>{Math.round(computedHours)} h · {isOverdue ? 'SLA vencido' : 'En SLA'}</Text>
    </View>
  );
}

function Message({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  return <View accessibilityLiveRegion="polite" style={[styles.message, tone === 'error' ? styles.errorMessage : styles.successMessage]}><Text style={tone === 'error' ? styles.errorText : styles.successText}>{text}</Text></View>;
}

function Empty({ text }: { text: string }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;
}

function hoursSince(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.max(0, (Date.now() - time) / 3_600_000) : 0;
}

function formatDate(value?: string): string {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function contentLabel(value: ModerationReport['contentType']): string {
  return value === 'PHOTO' ? 'Foto' : value === 'BEHAVIOR' ? 'Conducta' : 'Perfil';
}

const REASON_LABELS: Record<ModerationReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Acoso',
  HATE_SPEECH: 'Discurso de odio',
  SEXUAL_CONTENT: 'Contenido sexual',
  VIOLENCE: 'Violencia o amenazas',
  FRAUD: 'Fraude',
  IMPERSONATION: 'Suplantación',
  PRIVACY: 'Privacidad',
  OTHER: 'Otro motivo',
};

function reasonLabel(value: ModerationReportReason): string {
  return REASON_LABELS[value] || value;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.md },
  hero: { alignItems: 'center', backgroundColor: Colors.ink, borderRadius: Radius.lg, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  heroIcon: { alignItems: 'center', backgroundColor: Colors.teal, borderRadius: Radius.md, height: 48, justifyContent: 'center', width: 48 },
  heroTitle: { ...Typography.subheading, color: Colors.cream },
  heroCopy: { ...Typography.caption, color: '#BCC4D2', marginTop: 2 },
  countGrid: { flexDirection: 'row', gap: Spacing.sm },
  countCard: { backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, flex: 1, minHeight: 110, padding: Spacing.sm },
  countValue: { ...Typography.heading, color: Colors.ink, marginTop: Spacing.sm },
  countLabel: { color: Colors.muted, fontSize: 11, lineHeight: 15 },
  section: { gap: Spacing.sm },
  sectionTitle: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  sectionTitleText: { ...Typography.subheading, color: Colors.ink },
  card: { backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.md },
  overdueCard: { borderColor: '#F7B3AE' },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.sm },
  cardTitle: { ...Typography.bodyStrong, color: Colors.ink },
  meta: { ...Typography.caption, color: Colors.muted, marginTop: 2 },
  details: { ...Typography.body, backgroundColor: Colors.sand, borderRadius: Radius.sm, color: Colors.charcoal, padding: Spacing.sm },
  reviewState: { ...Typography.caption, backgroundColor: Colors.oceanLight, borderRadius: Radius.sm, color: Colors.oceanDark, fontWeight: '700', padding: Spacing.sm },
  date: { ...Typography.caption, alignItems: 'center', color: Colors.muted },
  noteInput: { backgroundColor: Colors.white, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, color: Colors.charcoal, fontSize: 14, minHeight: 46, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  noteHelp: { ...Typography.caption, color: Colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ageBadge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF5DD', borderRadius: Radius.pill, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  ageBadgeOverdue: { backgroundColor: Colors.dangerSoft },
  ageText: { color: Colors.amber, fontSize: 11, fontWeight: '800' },
  ageTextOverdue: { color: Colors.danger },
  photoRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  photo: { backgroundColor: Colors.oceanLight, borderRadius: Radius.md, height: 82, width: 82 },
  photoFallback: { alignItems: 'center', backgroundColor: Colors.oceanLight, borderRadius: Radius.md, height: 82, justifyContent: 'center', width: 82 },
  message: { borderRadius: Radius.md, padding: Spacing.md },
  errorMessage: { backgroundColor: Colors.dangerSoft },
  successMessage: { backgroundColor: Colors.successSoft },
  errorText: { ...Typography.label, color: Colors.danger },
  successText: { ...Typography.label, color: Colors.tealDark },
  empty: { alignItems: 'center', backgroundColor: Colors.cream, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.lg },
  emptyText: { ...Typography.body, color: Colors.muted },
});
