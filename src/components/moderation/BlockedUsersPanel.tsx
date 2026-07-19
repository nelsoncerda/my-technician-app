import { Ban, Loader2, RotateCcw } from 'lucide-react';
import { ModerationBlock } from '../../lib/moderation-api';

interface BlockedUsersPanelProps {
  blocks: ModerationBlock[];
  loading: boolean;
  error: string;
  unblockingUserId: string | null;
  onRetry: () => void;
  onUnblock: (userId: string) => void;
}

const BlockedUsersPanel = ({
  blocks,
  loading,
  error,
  unblockingUserId,
  onRetry,
  onUnblock,
}: BlockedUsersPanelProps) => (
  <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700" aria-labelledby="blocked-users-title">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-danger-50 text-brand-danger-700">
        <Ban className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h3 id="blocked-users-title" className="font-bold text-gray-900 dark:text-white">Usuarios bloqueados</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          No aparecen en tus búsquedas ni pueden interactuar contigo.
        </p>
      </div>
    </div>

    {loading ? (
      <p role="status" className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cargando bloqueos…
      </p>
    ) : error ? (
      <div className="mt-4 rounded-xl bg-brand-danger-50 p-3 text-sm text-brand-danger-800" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="mt-2 font-bold underline">Intentar de nuevo</button>
      </div>
    ) : blocks.length === 0 ? (
      <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-700/50 dark:text-gray-300">
        No tienes usuarios bloqueados.
      </p>
    ) : (
      <ul className="mt-4 space-y-2">
        {blocks.map((block) => {
          const name = block.blockedUser?.name || block.name || 'Usuario bloqueado';
          return (
            <li key={block.blockedUserId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
                {block.createdAt && <p className="text-xs text-gray-500">Bloqueado el {new Date(block.createdAt).toLocaleDateString('es-DO')}</p>}
              </div>
              <button
                type="button"
                onClick={() => onUnblock(block.blockedUserId)}
                disabled={unblockingUserId === block.blockedUserId}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {unblockingUserId === block.blockedUserId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Desbloquear
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default BlockedUsersPanel;
