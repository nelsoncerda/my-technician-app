import { AlertTriangle, LogOut, Mail, Scale, ShieldBan, Trash2 } from 'lucide-react';
import MyReportsPanel from './MyReportsPanel';

interface SuspendedAccountViewProps {
  name: string;
  email: string;
  reason?: string | null;
  deleting: boolean;
  onLogout: () => void;
  onDelete: () => void;
}

const SuspendedAccountView = ({
  name,
  email,
  reason,
  deleting,
  onLogout,
  onDelete,
}: SuspendedAccountViewProps) => {
  const appealHref = `mailto:ncerda@hotmail.com?subject=${encodeURIComponent('Apelación de cuenta suspendida - Técnicos en RD')}&body=${encodeURIComponent(`Nombre: ${name}\nCorreo: ${email}\n\nDeseo apelar la suspensión de mi cuenta porque:`)}`;

  return (
    <main className="min-h-screen bg-brand-sand px-4 py-10 text-brand-charcoal sm:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-brand-border bg-brand-cream p-6 shadow-soft sm:p-9" aria-labelledby="restricted-account-title">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <ShieldBan className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-rose-700">Acceso restringido</p>
        <h1 id="restricted-account-title" className="mt-2 text-3xl font-extrabold tracking-tight text-brand-ink">Tu cuenta está suspendida</h1>
        <p className="mt-3 leading-7 text-brand-charcoal">
          Las funciones de búsqueda, reservas, perfiles y publicación están desactivadas. Todavía puedes apelar, consultar las políticas, cerrar sesión o eliminar permanentemente tu cuenta.
        </p>

        {reason && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Motivo informado</p>
            <p className="mt-1 whitespace-pre-wrap">{reason}</p>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href={appealHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-ocean-700 px-4 font-bold text-white hover:bg-brand-ocean-800">
            <Mail className="h-4 w-4" /> Contactar soporte y apelar
          </a>
          <button type="button" onClick={onLogout} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 font-bold text-brand-ink hover:bg-brand-sand">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>

        <div className="mt-7 space-y-3">
          <details className="rounded-xl border border-brand-border bg-white p-4">
            <summary className="cursor-pointer font-bold text-brand-ink"><Scale className="mr-2 inline h-4 w-4" /> Normas de la comunidad y Términos de uso</summary>
            <p className="mt-3 text-sm leading-6">No se permite spam, fraude, suplantación, acoso, odio, violencia, contenido sexual ni divulgar datos privados. Podemos revisar, retirar contenido y suspender cuentas cuando sea necesario para proteger a la comunidad.</p>
          </details>
          <details className="rounded-xl border border-brand-border bg-white p-4">
            <summary className="cursor-pointer font-bold text-brand-ink">Privacidad</summary>
            <p className="mt-3 text-sm leading-6">Usamos los datos de tu cuenta para operar el servicio, prevenir abuso, investigar reportes y cumplir obligaciones legales. No publicamos direcciones exactas. Puedes solicitar soporte o eliminar tu cuenta desde esta pantalla.</p>
          </details>
        </div>

        <MyReportsPanel />

        <div className="mt-8 border-t border-brand-border pt-6">
          <h2 className="font-extrabold text-brand-ink">Eliminar mi cuenta</h2>
          <p className="mt-1 text-sm leading-6 text-brand-muted">Esta acción es permanente y elimina tus datos, reservas y perfil profesional conforme a las obligaciones aplicables.</p>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 font-bold text-white hover:bg-rose-800 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> {deleting ? 'Eliminando…' : 'Eliminar cuenta permanentemente'}
          </button>
        </div>
      </section>
    </main>
  );
};

export default SuspendedAccountView;
