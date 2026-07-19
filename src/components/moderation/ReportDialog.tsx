import { useEffect, useId, useRef, useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';
import { apiFetch } from '../../lib/api';
import {
  ModerationReportTarget,
  readApiError,
  ReportReason,
} from '../../lib/moderation-api';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam o publicidad engañosa' },
  { value: 'HARASSMENT', label: 'Acoso o conducta abusiva' },
  { value: 'HATE_SPEECH', label: 'Discurso de odio' },
  { value: 'SEXUAL_CONTENT', label: 'Contenido sexual' },
  { value: 'VIOLENCE', label: 'Violencia o amenazas' },
  { value: 'FRAUD', label: 'Fraude o posible estafa' },
  { value: 'IMPERSONATION', label: 'Suplantación de identidad' },
  { value: 'PRIVACY', label: 'Expone información privada' },
  { value: 'OTHER', label: 'Otro motivo' },
];

interface ReportDialogProps {
  target: ModerationReportTarget | null;
  onClose: () => void;
}

const ReportDialog = ({ target, onClose }: ReportDialogProps) => {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!target) return;
    setReason('');
    setDetails('');
    setError('');
    setSent(false);
    window.setTimeout(() => closeRef.current?.focus(), 0);
  }, [target]);

  if (!target) return null;

  const contentLabel = target.contentType === 'PHOTO' ? 'foto' : target.contentType === 'BEHAVIOR' ? 'conducta' : 'perfil';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setError('Selecciona un motivo para continuar.');
      return;
    }
    if (reason === 'OTHER' && !details.trim()) {
      setError('Describe brevemente el motivo cuando seleccionas “Otro”.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/moderation/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: target.targetUserId,
          technicianId: target.technicianId,
          contentType: target.contentType,
          reason,
          ...(details.trim() && { details: details.trim() }),
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'No pudimos enviar el reporte'));
      }
      setSent(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No pudimos enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-ink/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-cream p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Flag className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id={titleId} className="text-xl font-extrabold text-brand-ink">
              Reportar {contentLabel}
            </h2>
            <p className="mt-1 text-sm text-brand-muted">{target.name}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:bg-brand-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
            aria-label="Cerrar reporte"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {sent ? (
          <div className="mt-6" role="status">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Recibimos tu reporte. El equipo de moderación lo revisará y mantendrá privada tu identidad.
            </div>
            <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-brand-ink px-4 font-bold text-white">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="moderation-reason" className="mb-1.5 block text-sm font-semibold text-brand-charcoal">
                Motivo
              </label>
              <select
                id="moderation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
                className="min-h-12 w-full rounded-xl border border-brand-border bg-white px-3 text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-ocean-500"
              >
                <option value="">Selecciona un motivo</option>
                {REASONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="moderation-details" className="mb-1.5 block text-sm font-semibold text-brand-charcoal">
                Detalles <span className="font-normal text-brand-muted">(opcional)</span>
              </label>
              <textarea
                id="moderation-details"
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, 500))}
                maxLength={500}
                rows={4}
                placeholder="Describe brevemente lo ocurrido, sin incluir información sensible."
                className="w-full rounded-xl border border-brand-border bg-white p-3 text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-ocean-500"
              />
              <p className="mt-1 text-right text-xs text-brand-muted">{details.length}/500</p>
            </div>
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 font-bold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Enviar reporte
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default ReportDialog;
