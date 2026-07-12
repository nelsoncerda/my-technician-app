import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileAccountMenu from './MobileAccountMenu';

const createProps = () => ({
    currentView: 'home' as const,
    isAdmin: false,
    userName: 'Nelson Cerda',
    onNavigate: jest.fn(),
    onOpenProfile: jest.fn(),
    onLogout: jest.fn(),
});

test('keeps reservations visible and moves secondary account actions into a sheet', async () => {
    const props = createProps();
    render(<MobileAccountMenu {...props} />);

    expect(screen.getByRole('navigation', { name: 'Navegación móvil' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mis reservas' }));
    expect(props.onNavigate).toHaveBeenCalledWith('bookings');

    const accountButton = screen.getByRole('button', { name: 'Abrir menú de cuenta' });
    expect(accountButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(accountButton);

    expect(screen.getByRole('dialog', { name: 'Tu cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú de cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Puntos y recompensas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Administración' })).not.toBeInTheDocument();

    await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Puntos y recompensas' })).toHaveFocus();
    });

    const closeButton = screen.getByRole('button', { name: 'Cerrar menú de cuenta' });
    const logoutButton = screen.getByRole('button', { name: 'Cerrar sesión' });
    logoutButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(logoutButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Tu cuenta' })).not.toBeInTheDocument();
    expect(accountButton).toHaveFocus();
});

test('shows the active admin destination only to administrators', () => {
    const props = {
        ...createProps(),
        currentView: 'admin' as const,
        isAdmin: true,
    };
    render(<MobileAccountMenu {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de cuenta' }));

    const adminButton = screen.getByRole('button', { name: 'Administración' });
    expect(adminButton).toHaveAttribute('aria-current', 'page');
    fireEvent.click(adminButton);

    expect(props.onNavigate).toHaveBeenCalledWith('admin');
    expect(screen.queryByRole('dialog', { name: 'Tu cuenta' })).not.toBeInTheDocument();
});

test('does not return focus behind a profile modal', async () => {
    const profileCloseButton = document.createElement('button');
    profileCloseButton.textContent = 'Cerrar perfil';
    document.body.appendChild(profileCloseButton);

    const props = {
        ...createProps(),
        onOpenProfile: jest.fn(() => profileCloseButton.focus()),
    };
    render(<MobileAccountMenu {...props} />);

    const accountButton = screen.getByRole('button', { name: 'Abrir menú de cuenta' });
    fireEvent.click(accountButton);
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }));

    await waitFor(() => expect(profileCloseButton).toHaveFocus());
    expect(accountButton).not.toHaveFocus();
    profileCloseButton.remove();
});
