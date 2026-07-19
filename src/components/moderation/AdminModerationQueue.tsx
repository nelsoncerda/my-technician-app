import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock3, Flag, Loader2, RefreshCw, ShieldBan, UserCheck, XCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';
import { apiFetch } from '../../lib/api';
import { readApiError } from '../../lib/moderation-api';

interface QueueEntry {
  id: string;
  userId?: string;
  technicianId?: string;
  name?: string;
  email?: string;
  specializations?: string[];
  location?: string;
  companyName?: string | null;
  photoUrl?: string | null;
  pendingPhotoUrl?: string | null;
  contentType?: string;
  reason?: string;
  details?: string | null;
  status?: string;
  createdAt?: string;
  submittedAt?: string;
  ageHours?: number;
  overdue?: boolean;
  reporter?: { name?: string; email?: string };
  targetUser?: { name?: string; email?: string; photoUrl?: string | null };
  reviewedById?: string | null;
  reviewedBy?: { id?: string; name?: string; email?: string } | null;
  user?: { id?: string; name?: string; email?: string; photoUrl?: string | null };
}

interface ModerationQueue {
  reports: QueueEntry[];
  pendingProfiles: QueueEntry[];
  pendingPhotos: QueueEntry[];
  counts: { reports?: number; pendingProfiles?: number; pendingPhotos?: number };
}

const emptyQueue: ModerationQueue = { reports: [], pendingProfiles: [], pendingPhotos: [], counts: {} };

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Fecha no disponible';

const AgeBadge = ({ entry }: { entry: QueueEntry }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${entry.overdue ? 'bg-brand-danger-100 text-brand-danger-800' : 'bg-brand-clay-50 text-brand-clay-700'}`}>
    {entry.overdue && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
    {typeof entry.ageHours === 'number' ? `${Math.max(0, Math.round(entry.ageHours))} h en cola` : 'En revisión'}
  </span>
);

const AdminModerationQueue = () => {
  const [queue, setQueue] = useState<ModerationQueue>(emptyQueue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingKey, setWorkingKey] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/moderation/admin/queue`);
      if (!response.ok) throw new Error(await readApiError(response, 'No pudimos cargar la cola'));
      const data = await response.json();
      setQueue({
        reports: Array.isArray(data.reports) ? data.reports : [],
        pendingProfiles: Array.isArray(data.pendingProfiles) ? data.pendingProfiles : [],
        pendingPhotos: Array.isArray(data.pendingPhotos) ? data.pendingPhotos : [],
        counts: data.counts || {},
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la cola');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const runAction = async (key: string, url: string, body: Record<string, unknown>) => {
    setWorkingKey(key);
    setError('');
    try {
      const response = await apiFetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readApiError(response, 'No pudimos aplicar esta decisión'));
      await loadQueue();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No pudimos aplicar esta decisión');
    } finally {
      setWorkingKey('');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-brand-ocean-700" role="status"><Loader2 className="mr-2 h-7 w-7 animate-spin" /> Cargando moderación…</div>;
  }

  const reportCount = queue.counts.reports ?? queue.reports.length;
  const profileCount = queue.counts.pendingProfiles ?? queue.pendingProfiles.length;
  const photoCount = queue.counts.pendingPhotos ?? queue.pendingPhotos.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-brand-ink to-brand-ocean-700 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-extrabold"><ShieldBan className="h-6 w-6" /> Cola de moderación</h3>
          <p className="mt-1 text-sm text-brand-ocean-100">Prioriza los casos marcados fuera del SLA y documenta cada decisión.</p>
        </div>
        <button type="button" onClick={loadQueue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 font-bold hover:bg-white/20">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-brand-danger-200 bg-brand-danger-50 p-4 text-sm text-brand-danger-800">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Reportes abiertos', count: reportCount, icon: Flag },
          { label: 'Perfiles pendientes', count: profileCount, icon: UserCheck },
          { label: 'Fotos pendientes', count: photoCount, icon: Camera },
        ].map(({ label, count, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-brand-border bg-brand-cream p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Icon className="h-5 w-5 text-brand-ocean-700" />
            <p className="mt-3 text-3xl font-extrabold">{count}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="open-reports-title" className="rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h4 id="open-reports-title" className="flex items-center gap-2 text-lg font-extrabold"><Flag className="h-5 w-5 text-brand-danger-700" /> Reportes abiertos</h4>
        {queue.reports.length === 0 ? <p className="mt-4 text-sm text-gray-500">No hay reportes pendientes.</p> : (
          <div className="mt-4 space-y-4">
            {queue.reports.map((report) => (
              <article key={report.id} className={`rounded-xl border p-4 ${report.overdue ? 'border-brand-danger-200 bg-brand-danger-50/40' : 'border-brand-border dark:border-gray-700'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{report.targetUser?.name || report.name || 'Contenido reportado'}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{report.contentType} · {report.reason}</p>
                  </div>
                  <AgeBadge entry={report} />
                </div>
                {report.details && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200">{report.details}</p>}
                <p className="mt-2 text-xs text-gray-500">Reportado por {report.reporter?.name || 'usuario autenticado'}</p>
                {report.status === 'UNDER_REVIEW' && (
                  <p className="mt-2 rounded-lg bg-brand-ocean-50 px-3 py-2 text-xs font-semibold text-brand-ocean-800">
                    En revisión por {report.reviewedBy?.name || 'un administrador'}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" /> {formatDate(report.createdAt || report.submittedAt)}</p>
                <textarea
                  aria-label={`Nota para reporte ${report.id}`}
                  maxLength={500}
                  value={notes[`report-${report.id}`] || ''}
                  onChange={(event) => setNotes((current) => ({ ...current, [`report-${report.id}`]: event.target.value }))}
                  placeholder="Nota interna de resolución (requerida)"
                  className="mt-3 w-full rounded-lg border border-brand-control p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ocean-500 dark:border-gray-600 dark:bg-gray-700"
                />
                {!notes[`report-${report.id}`]?.trim() && <p className="mt-1 text-xs font-medium text-brand-clay-700">Escribe una nota antes de cerrar el reporte.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.status === 'OPEN' && <button type="button" disabled={Boolean(workingKey)} onClick={() => runAction(`claim-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}/claim`, {})} className="min-h-11 rounded-xl bg-brand-ocean-700 px-3 text-sm font-bold text-white disabled:opacity-50">Tomar caso</button>}
                  <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`report-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'RESOLVED', action: 'NONE', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl bg-brand-teal-700 px-3 text-sm font-bold text-white disabled:opacity-50">Resolver</button>
                  <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`warn-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'RESOLVED', action: 'WARNING_RECORDED', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl bg-brand-ocean-700 px-3 text-sm font-bold text-white disabled:opacity-50">Registrar advertencia</button>
                  <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`suspend-user-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'RESOLVED', action: 'USER_SUSPENDED', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl bg-brand-danger-800 px-3 text-sm font-bold text-white disabled:opacity-50">Suspender cuenta</button>
                  {report.contentType === 'PHOTO' && <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`remove-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'RESOLVED', action: 'CONTENT_REMOVED', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl bg-brand-clay-600 px-3 text-sm font-bold text-white disabled:opacity-50">Retirar contenido</button>}
                  {report.technicianId && <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`suspend-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'RESOLVED', action: 'TECHNICIAN_SUSPENDED', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl bg-brand-danger-700 px-3 text-sm font-bold text-white disabled:opacity-50">Suspender</button>}
                  <button type="button" disabled={Boolean(workingKey) || !notes[`report-${report.id}`]?.trim()} onClick={() => runAction(`dismiss-${report.id}`, `${API_BASE_URL}/api/moderation/admin/reports/${report.id}`, { status: 'DISMISSED', action: 'NONE', resolutionNote: notes[`report-${report.id}`].trim() })} className="min-h-11 rounded-xl border border-brand-control px-3 text-sm font-bold disabled:opacity-50">Descartar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="pending-profiles-title" className="rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h4 id="pending-profiles-title" className="flex items-center gap-2 text-lg font-extrabold"><UserCheck className="h-5 w-5 text-brand-clay-500" /> Perfiles pendientes</h4>
          <div className="mt-4 space-y-3">
            {queue.pendingProfiles.length === 0 ? <p className="text-sm text-gray-500">No hay perfiles pendientes.</p> : queue.pendingProfiles.map((profile) => {
              const id = profile.technicianId || profile.id;
              return (
                <article key={id} className="rounded-xl border border-brand-border p-4 dark:border-gray-700">
                  <div className="flex justify-between gap-2"><div><p className="font-bold">{profile.user?.name || profile.name || 'Técnico'}</p><p className="text-xs text-gray-500">{formatDate(profile.createdAt || profile.submittedAt)}</p></div><AgeBadge entry={profile} /></div>
                  {profile.companyName && <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{profile.companyName}</p>}
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{profile.location || 'Zona no indicada'}</p>
                  {profile.specializations && <p className="mt-1 text-xs text-gray-500">{profile.specializations.join(' · ')}</p>}
                  <input aria-label={`Nota para perfil ${id}`} maxLength={300} value={notes[`profile-${id}`] || ''} onChange={(event) => setNotes((current) => ({ ...current, [`profile-${id}`]: event.target.value }))} placeholder="Motivo (requerido para rechazar)" className="mt-3 min-h-11 w-full rounded-lg border border-brand-control bg-brand-cream px-3 text-sm text-brand-charcoal focus:border-brand-ocean-500 focus:outline-none focus:ring-2 focus:ring-brand-ocean-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(workingKey)} onClick={() => runAction(`profile-approve-${id}`, `${API_BASE_URL}/api/moderation/admin/technicians/${id}`, { decision: 'APPROVE', reason: notes[`profile-${id}`] })} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-teal-700 px-3 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" /> Aprobar</button>
                    <button type="button" disabled={Boolean(workingKey) || !notes[`profile-${id}`]?.trim()} onClick={() => runAction(`profile-reject-${id}`, `${API_BASE_URL}/api/moderation/admin/technicians/${id}`, { decision: 'REJECT', reason: notes[`profile-${id}`] })} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand-danger-700 px-3 text-sm font-bold text-white disabled:opacity-50"><XCircle className="h-4 w-4" /> Rechazar</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="pending-photos-title" className="rounded-2xl border border-brand-border bg-brand-cream p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h4 id="pending-photos-title" className="flex items-center gap-2 text-lg font-extrabold"><Camera className="h-5 w-5 text-brand-ocean-700" /> Fotos pendientes</h4>
          <div className="mt-4 space-y-3">
            {queue.pendingPhotos.length === 0 ? <p className="text-sm text-gray-500">No hay fotos pendientes.</p> : queue.pendingPhotos.map((photo) => {
              const id = photo.id;
              const photoUrl = photo.pendingPhotoUrl || photo.photoUrl || photo.user?.photoUrl;
              return (
                <article key={id} className="rounded-xl border border-brand-border p-4 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    {photoUrl ? <img src={photoUrl} alt="Foto pendiente de moderación" className="h-20 w-20 rounded-xl object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100"><Camera className="h-7 w-7 text-gray-400" /></span>}
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{photo.user?.name || photo.name || 'Usuario'}</p><p className="text-xs text-gray-500">{formatDate(photo.submittedAt || photo.createdAt)}</p><div className="mt-2"><AgeBadge entry={photo} /></div></div>
                  </div>
                  <input aria-label={`Nota para foto ${id}`} maxLength={300} value={notes[`photo-${id}`] || ''} onChange={(event) => setNotes((current) => ({ ...current, [`photo-${id}`]: event.target.value }))} placeholder="Motivo (requerido para rechazar)" className="mt-3 min-h-11 w-full rounded-lg border border-brand-control bg-brand-cream px-3 text-sm text-brand-charcoal focus:border-brand-ocean-500 focus:outline-none focus:ring-2 focus:ring-brand-ocean-500/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={Boolean(workingKey)} onClick={() => runAction(`photo-approve-${id}`, `${API_BASE_URL}/api/moderation/admin/profile-photos/${id}`, { decision: 'APPROVE', reason: notes[`photo-${id}`] })} className="min-h-11 rounded-xl bg-brand-teal-700 px-3 text-sm font-bold text-white">Aprobar</button>
                    <button type="button" disabled={Boolean(workingKey) || !notes[`photo-${id}`]?.trim()} onClick={() => runAction(`photo-reject-${id}`, `${API_BASE_URL}/api/moderation/admin/profile-photos/${id}`, { decision: 'REJECT', reason: notes[`photo-${id}`] })} className="min-h-11 rounded-xl bg-brand-danger-700 px-3 text-sm font-bold text-white disabled:opacity-50">Rechazar</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminModerationQueue;
