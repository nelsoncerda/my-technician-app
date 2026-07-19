import { useCallback, useEffect, useState } from 'react';
import { Clock3, Flag, Loader2, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';
import { apiFetch } from '../../lib/api';
import { readApiError } from '../../lib/moderation-api';

interface OwnReport {
  id: string;
  contentType: 'PROFILE' | 'PHOTO' | 'BEHAVIOR';
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  targetUser?: { name?: string };
}

const contentLabels: Record<OwnReport['contentType'], string> = {
  PROFILE: 'Perfil',
  PHOTO: 'Foto',
  BEHAVIOR: 'Conducta',
};

const reasonLabels: Record<string, string> = {
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

const statusLabels: Record<OwnReport['status'], string> = {
  OPEN: 'Recibido',
  UNDER_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Cerrado sin acción',
};

const MyReportsPanel = () => {
  const [reports, setReports] = useState<OwnReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/moderation/reports/mine`);
      if (!response.ok) throw new Error(await readApiError(response, 'No pudimos cargar tus reportes'));
      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar tus reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  return (
    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700" aria-labelledby="my-reports-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-clay-50 text-brand-clay-700"><Flag className="h-5 w-5" /></span>
          <div>
            <h3 id="my-reports-title" className="font-bold text-gray-900 dark:text-white">Mis reportes de seguridad</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Consulta el estado sin exponer notas internas de moderación.</p>
          </div>
        </div>
        <button type="button" onClick={loadReports} disabled={loading} aria-label="Actualizar mis reportes" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {loading ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando reportes…</p>
      ) : error ? (
        <p role="alert" className="mt-4 rounded-xl bg-brand-danger-50 p-3 text-sm text-brand-danger-800">{error}</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-700/50 dark:text-gray-300">No has enviado reportes.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{contentLabels[report.contentType] || report.contentType}{report.targetUser?.name ? ` · ${report.targetUser.name}` : ''}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{reasonLabels[report.reason] || report.reason}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.status === 'RESOLVED' ? 'bg-brand-teal-100 text-brand-teal-700' : report.status === 'DISMISSED' ? 'bg-gray-100 text-gray-700' : 'bg-brand-clay-100 text-brand-clay-700'}`}>
                  {statusLabels[report.status] || report.status}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><Clock3 className="h-3.5 w-3.5" /> {new Date(report.createdAt).toLocaleDateString('es-DO')}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MyReportsPanel;
