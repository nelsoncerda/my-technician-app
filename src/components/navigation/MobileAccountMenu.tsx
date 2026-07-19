import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar,
    ChevronDown,
    LogOut,
    Shield,
    Trophy,
    User as UserIcon,
    X,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type MobileAccountView = 'home' | 'admin' | 'bookings' | 'gamification' | 'about';

interface MobileAccountMenuProps {
    currentView: MobileAccountView;
    isAdmin: boolean;
    userName: string;
    onNavigate: (view: MobileAccountView) => void;
    onOpenProfile: () => void;
    onLogout: () => void;
}

const menuItemClassName =
    'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream';

const MobileAccountMenu = ({
    currentView,
    isAdmin,
    userName,
    onNavigate,
    onOpenProfile,
    onLogout,
}: MobileAccountMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dialogId = useId();
    const dialogTitleId = useId();
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLElement>(null);
    const firstMenuItemRef = useRef<HTMLButtonElement>(null);
    const restoreFocusRef = useRef(true);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        const menuButton = menuButtonRef.current;
        document.body.style.overflow = 'hidden';
        const focusTimer = window.setTimeout(() => firstMenuItemRef.current?.focus(), 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                return;
            }

            if (event.key === 'Tab' && dialogRef.current) {
                const focusableItems = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    )
                );
                const firstItem = focusableItems[0];
                const lastItem = focusableItems[focusableItems.length - 1];
                if (!firstItem || !lastItem) return;

                if (event.shiftKey && document.activeElement === firstItem) {
                    event.preventDefault();
                    lastItem.focus();
                } else if (!event.shiftKey && document.activeElement === lastItem) {
                    event.preventDefault();
                    firstItem.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            if (restoreFocusRef.current) menuButton?.focus();
            restoreFocusRef.current = true;
        };
    }, [isOpen]);

    const closeAndRun = (action: () => void, restoreFocus = true) => {
        restoreFocusRef.current = restoreFocus;
        setIsOpen(false);
        action();
    };

    const menuSheet = isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
                className="fixed inset-0 z-[70] flex items-end bg-brand-ink/55 backdrop-blur-[2px]"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setIsOpen(false);
                }}
            >
                <section
                    ref={dialogRef}
                    id={dialogId}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={dialogTitleId}
                    className="w-full rounded-t-[24px] border-t border-brand-border bg-brand-cream px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl"
                >
                    <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-brand-border" aria-hidden="true" />
                    <div className="mb-3 flex items-start justify-between gap-4 px-2">
                        <div className="min-w-0">
                            <h2 id={dialogTitleId} className="text-lg font-extrabold text-brand-ink">
                                Tu cuenta
                            </h2>
                            <p className="truncate text-sm text-brand-muted">{userName}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-sand hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500"
                            aria-label="Cerrar menú de cuenta"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <nav aria-label="Menú de cuenta" className="space-y-1">
                        <button
                            ref={firstMenuItemRef}
                            type="button"
                            onClick={() => closeAndRun(() => onNavigate('gamification'))}
                            aria-current={currentView === 'gamification' ? 'page' : undefined}
                            className={cn(
                                menuItemClassName,
                                currentView === 'gamification' && 'bg-brand-ocean-50 text-brand-ocean-700'
                            )}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-ocean-50 text-brand-ocean-700">
                                <Trophy className="h-5 w-5" aria-hidden="true" />
                            </span>
                            Puntos y recompensas
                        </button>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => closeAndRun(() => onNavigate('admin'))}
                                aria-current={currentView === 'admin' ? 'page' : undefined}
                                className={cn(
                                    menuItemClassName,
                                    currentView === 'admin' && 'bg-brand-ocean-50 text-brand-ocean-700'
                                )}
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-ocean-50 text-brand-ocean-700">
                                    <Shield className="h-5 w-5" aria-hidden="true" />
                                </span>
                                Administración
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => closeAndRun(onOpenProfile, false)}
                            className={menuItemClassName}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sand text-brand-ink">
                                <UserIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                            Mi perfil
                        </button>

                        <div className="my-2 border-t border-brand-border" />

                        <button
                            type="button"
                            onClick={() => closeAndRun(onLogout)}
                            className={cn(menuItemClassName, 'text-brand-danger-700 hover:bg-brand-danger-50')}
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-danger-50 text-brand-danger-700">
                                <LogOut className="h-5 w-5" aria-hidden="true" />
                            </span>
                            Cerrar sesión
                        </button>
                    </nav>
                </section>
            </div>,
            document.body
        )
        : null;

    return (
        <>
            <nav className="flex items-center gap-1" aria-label="Navegación móvil">
                <button
                    type="button"
                    onClick={() => onNavigate('bookings')}
                    aria-label="Mis reservas"
                    aria-current={currentView === 'bookings' ? 'page' : undefined}
                    className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl text-brand-ink transition-colors hover:bg-brand-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream',
                        currentView === 'bookings' && 'bg-brand-clay-50 text-brand-clay-600'
                    )}
                >
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                </button>

                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => {
                        restoreFocusRef.current = true;
                        setIsOpen(true);
                    }}
                    className="flex h-11 items-center gap-1.5 rounded-xl border border-brand-control bg-brand-cream px-2.5 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream"
                    aria-label="Abrir menú de cuenta"
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-controls={dialogId}
                >
                    <UserIcon className="hidden h-5 w-5 text-brand-ocean-700 min-[360px]:block" aria-hidden="true" />
                    <span>Cuenta</span>
                    <ChevronDown className="hidden h-4 w-4 text-brand-muted sm:block" aria-hidden="true" />
                </button>
            </nav>
            {menuSheet}
        </>
    );
};

export default MobileAccountMenu;
