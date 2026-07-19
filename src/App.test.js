import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App, { DEFAULT_SPECIALIZATIONS } from './App';
import { getTechnicianRatingDetails } from './components/home/TechnicianRating';

test('fallback settings include the locally researched service categories', () => {
  expect(DEFAULT_SPECIALIZATIONS).toEqual(
    expect.arrayContaining([
      'Servicio de Limpieza',
      'Tapicero',
      'Mudanzas y Acarreo',
      'Herrero',
      'Técnico en Vidrios y Aluminio',
    ])
  );
  expect(new Set(DEFAULT_SPECIALIZATIONS).size).toBe(DEFAULT_SPECIALIZATIONS.length);
});

test('calculates a rating from reviews when the stored average is stale', () => {
  expect(
    getTechnicianRatingDetails({
      rating: 0,
      reviews: [{ rating: 5 }, { rating: 4 }],
    })
  ).toEqual({ rating: 4.5, reviewCount: 2 });
});

const technicians = [
  {
    id: 'tech-1',
    userId: 'provider-1',
    name: 'María Rodríguez',
    specialization: 'Electricista',
    specializations: ['Electricista'],
    location: 'Santiago de los Caballeros',
    rating: 4.9,
    verified: true,
    mapLocation: {
      latitude: 19.4517,
      longitude: -70.697,
      radiusKm: 2,
      precision: 'approximate',
    },
    reviews: [
      {
        id: 'review-1',
        author: 'Cliente verificado',
        comment: 'Excelente servicio y comunicación.',
        rating: 5,
        date: '2026-07-01',
      },
    ],
  },
  {
    id: 'tech-2',
    userId: 'provider-2',
    name: 'José Pérez',
    specialization: 'Plomero, Carpintero',
    specializations: ['Plomero', 'Carpintero'],
    location: 'Tamboril',
    rating: 0,
    verified: true,
    mapLocation: null,
    reviews: [],
  },
];

const jsonResponse = (data) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
  });

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn((input) => {
    const url = String(input);
    if (url.includes('/api/technicians')) return jsonResponse(technicians);
    if (url.endsWith('/api/settings')) {
      return jsonResponse({
        specializations: ['Electricista', 'Plomero'],
        locations: ['Santiago de los Caballeros', 'Tamboril'],
      });
    }
    return jsonResponse([]);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('loads the directory and filters technicians by search', async () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: /Encuentra un técnico cerca de ti/i })
  ).toBeInTheDocument();
  expect(await screen.findByText('María Rodríguez')).toBeInTheDocument();
  expect(screen.getByText('José Pérez')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Servicio o técnico'), {
    target: { value: 'plomero' },
  });

  expect(screen.queryByRole('heading', { name: 'María Rodríguez', level: 3 })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'José Pérez', level: 3 })).toBeInTheDocument();
});

test('autocompletes a service while the user types', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  const search = screen.getByRole('combobox', { name: 'Servicio o técnico' });
  fireEvent.change(search, { target: { value: 'plo' } });

  const listbox = screen.getByRole('listbox', { name: 'Sugerencias de búsqueda' });
  const serviceOption = within(listbox).getByRole('option', {
    name: /Plomero Servicio/i,
  });

  expect(search).toHaveAttribute('aria-expanded', 'true');
  expect(
    within(listbox).queryByRole('option', { name: /Plomero, Carpintero Servicio/i })
  ).not.toBeInTheDocument();
  fireEvent.click(serviceOption);

  expect(search).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Servicio' })).toHaveTextContent('Plomero');
  expect(screen.queryByRole('listbox', { name: 'Sugerencias de búsqueda' })).not.toBeInTheDocument();
  expect(screen.queryByText('María Rodríguez')).not.toBeInTheDocument();
  expect(screen.getByText('José Pérez')).toBeInTheDocument();
});

test('places autocomplete suggestions above the field when the mobile keyboard leaves little room', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  const search = screen.getByRole('combobox', { name: 'Servicio o técnico' });
  search.getBoundingClientRect = () => ({
    top: 650,
    bottom: 700,
    left: 20,
    right: 355,
    width: 335,
    height: 50,
    x: 20,
    y: 650,
    toJSON: () => ({}),
  });

  fireEvent.change(search, { target: { value: 'plo' } });

  expect(
    await screen.findByRole('listbox', { name: 'Sugerencias de búsqueda' })
  ).toHaveClass('bottom-full');
});

test('supports keyboard autocomplete and includes technician ratings', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  const search = screen.getByRole('combobox', { name: 'Servicio o técnico' });
  fireEvent.change(search, { target: { value: 'maria' } });

  const listbox = screen.getByRole('listbox', { name: 'Sugerencias de búsqueda' });
  const technicianOption = within(listbox).getByRole('option', {
    name: /María Rodríguez.*4\.9.*1 reseña/i,
  });

  fireEvent.keyDown(search, { key: 'ArrowDown' });
  expect(technicianOption).toHaveAttribute('aria-selected', 'true');
  expect(technicianOption).toHaveAttribute('tabindex', '-1');
  expect(search).toHaveAttribute('aria-activedescendant', technicianOption.id);

  fireEvent.keyDown(search, { key: 'Enter' });

  expect(search).toHaveValue('María Rodríguez');
  expect(screen.queryByRole('listbox', { name: 'Sugerencias de búsqueda' })).not.toBeInTheDocument();
  expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
  expect(screen.queryByText('José Pérez')).not.toBeInTheDocument();
});

test('shows a rating or a clear no-reviews state on every result', async () => {
  render(<App />);

  const mariaName = await screen.findByText('María Rodríguez');
  const joseName = screen.getByText('José Pérez');
  const mariaCard = mariaName.closest('article');
  const joseCard = joseName.closest('article');

  expect(mariaCard).not.toBeNull();
  expect(joseCard).not.toBeNull();
  expect(within(mariaCard).getByLabelText('4.9 de 5, 1 reseña')).toBeInTheDocument();
  expect(within(joseCard).getByLabelText('Sin reseñas')).toBeInTheDocument();
});

test('switches between list and map while keeping exact addresses private', async () => {
  render(<App />);
  const mariaName = await screen.findByText('María Rodríguez');
  const mariaCard = mariaName.closest('article');

  expect(mariaCard).not.toBeNull();
  expect(screen.getByText('1 técnico con zona aproximada')).toBeInTheDocument();
  expect(
    screen.getByText('1 perfil aún no tiene zona aproximada y aparece solo en la lista.')
  ).toBeInTheDocument();
  expect(screen.getByText('No es dirección exacta')).toBeInTheDocument();

  fireEvent.click(
    within(mariaCard).getByRole('button', { name: 'Ver a María Rodríguez en el mapa' })
  );

  expect(screen.getByRole('button', { name: 'Mapa' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Ver perfil' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Ver perfil' }));
  expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  await waitFor(() => expect(mariaCard).toHaveFocus());
});

test('search ignores accents in technician names', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  fireEvent.change(screen.getByRole('combobox', { name: 'Servicio o técnico' }), {
    target: { value: 'jose' },
  });

  expect(screen.getByRole('heading', { name: 'José Pérez', level: 3 })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'María Rodríguez', level: 3 })).not.toBeInTheDocument();
});

test('submits search from the mobile keyboard and avoids zero-value trust metrics', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  expect(screen.getByText('Contacto privado')).toBeInTheDocument();
  expect(screen.queryByText('perfiles verificados')).not.toBeInTheDocument();
  expect(screen.queryByText('reseñas publicadas')).not.toBeInTheDocument();

  const resultsSection = document.getElementById('technician-results');
  resultsSection.scrollIntoView = jest.fn();
  const search = screen.getByRole('combobox', { name: 'Servicio o técnico' });
  fireEvent.change(search, { target: { value: 'jose' } });
  fireEvent.keyDown(search, { key: 'Enter' });

  expect(screen.queryByRole('listbox', { name: 'Sugerencias de búsqueda' })).not.toBeInTheDocument();
  expect(resultsSection.scrollIntoView).toHaveBeenCalledWith({
    behavior: 'smooth',
    block: 'start',
  });
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Técnicos disponibles' })).toHaveFocus();
  });
});

test('top-level views are exclusive', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Cómo funciona' }));

  expect(
    screen.getByRole('heading', { name: /Conectamos necesidades reales/i })
  ).toBeInTheDocument();
  await waitFor(() => {
    expect(
      screen.queryByRole('heading', { name: /Encuentra un técnico cerca de ti/i })
    ).not.toBeInTheDocument();
  });
});

test('registration requires an explicit, non-prechecked community rules acceptance', async () => {
  render(<App />);
  await screen.findByText('María Rodríguez');

  fireEvent.click(screen.getByRole('button', { name: 'Crear una cuenta' }));
  const dialog = screen.getByRole('dialog', { name: 'Crea tu cuenta' });
  const consent = within(dialog).getByRole('checkbox', {
    name: /Acepto las Normas de la comunidad y los Términos de uso/i,
  });

  expect(consent).not.toBeChecked();
  expect(within(dialog).getByRole('button', {
    name: 'Normas de la comunidad y los Términos de uso',
  })).toBeInTheDocument();
});

test('blocking a provider removes the profile immediately and calls the moderation API', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'test-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'customer-1',
    name: 'Cliente Prueba',
    email: 'cliente@example.com',
    role: 'user',
  }));
  jest.spyOn(window, 'confirm').mockReturnValue(true);

  render(<App />);
  const mariaName = await screen.findByText('María Rodríguez');
  const mariaCard = mariaName.closest('article');
  fireEvent.click(within(mariaCard).getByRole('button', { name: 'Bloquear usuario' }));

  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'María Rodríguez', level: 3 })).not.toBeInTheDocument();
  });
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/blocks\/provider-1$/),
    expect.objectContaining({ method: 'POST' })
  );
});

test('submits controlled profile reports without free-form reason values', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'test-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'customer-1',
    name: 'Cliente Prueba',
    email: 'cliente@example.com',
    role: 'user',
  }));

  render(<App />);
  const mariaName = await screen.findByText('María Rodríguez');
  const mariaCard = mariaName.closest('article');
  fireEvent.click(within(mariaCard).getByRole('button', { name: 'Reportar perfil' }));

  const reportDialog = screen.getByRole('dialog', { name: 'Reportar perfil' });
  fireEvent.change(within(reportDialog).getByLabelText('Motivo'), { target: { value: 'FRAUD' } });
  fireEvent.change(within(reportDialog).getByLabelText(/Detalles/), { target: { value: 'Información sospechosa.' } });
  fireEvent.click(within(reportDialog).getByRole('button', { name: 'Enviar reporte' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/reports$/),
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        targetUserId: 'provider-1',
        technicianId: 'tech-1',
        contentType: 'PROFILE',
        reason: 'FRAUD',
        details: 'Información sospechosa.',
      }),
    })
  ));
});

test('an ACCOUNT_SUSPENDED API response immediately persists and renders limited access', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'active-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'active-then-suspended',
    name: 'Cuenta Activa',
    email: 'active@example.com',
    role: 'user',
    accountModerationStatus: 'ACTIVE',
  }));

  global.fetch = jest.fn((input) => {
    const url = String(input);
    if (url.endsWith('/api/auth/verification-status')) {
      const payload = {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Esta cuenta está suspendida.',
        accountModerationReason: 'Investigación de seguridad pendiente.',
        supportUrl: '/support',
      };
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => payload,
        clone: () => ({ json: async () => payload }),
      });
    }
    if (url.includes('/api/technicians')) return jsonResponse(technicians);
    if (url.endsWith('/api/settings')) return jsonResponse({ specializations: [], locations: [] });
    return jsonResponse([]);
  });

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Tu cuenta está suspendida' })).toBeInTheDocument();
  expect(screen.getByText('Investigación de seguridad pendiente.')).toBeInTheDocument();
  expect(await screen.findByText('No has enviado reportes.')).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('tecnicos-rd:auth-user'))).toEqual(
    expect.objectContaining({
      accountModerationStatus: 'SUSPENDED',
      limitedAccess: true,
      accountModerationReason: 'Investigación de seguridad pendiente.',
    })
  );
});

test('profile moderation UI shows the latest rejected photo decision and reason', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'photo-owner-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'photo-owner',
    name: 'Dueña de Foto',
    email: 'photo@example.com',
    role: 'user',
    accountModerationStatus: 'ACTIVE',
    photoModerationStatus: 'REJECTED',
    photoModerationReason: 'Usa una foto clara y apropiada.',
  }));

  render(<App />);
  await screen.findByText('María Rodríguez');
  fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }));

  expect(screen.getByText('Foto no aprobada')).toBeInTheDocument();
  expect(screen.getByText(/Motivo de la revisión: Usa una foto clara y apropiada\./)).toBeInTheDocument();
});

test('renders a restricted suspended-account view without calling normal application APIs', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'suspended-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'suspended-1',
    name: 'Cuenta Suspendida',
    email: 'suspendida@example.com',
    role: 'user',
    accountModerationStatus: 'SUSPENDED',
    accountModerationReason: 'Revisión de seguridad pendiente.',
    limitedAccess: true,
  }));

  render(<App />);

  expect(screen.getByRole('heading', { name: 'Tu cuenta está suspendida' })).toBeInTheDocument();
  expect(screen.getByText('Revisión de seguridad pendiente.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Contactar soporte y apelar/i })).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eliminar cuenta permanentemente' })).toBeInTheDocument();
  expect(screen.getByText('Privacidad')).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(await screen.findByText('No has enviado reportes.')).toBeInTheDocument();
  expect(global.fetch.mock.calls.every(([input]) => String(input).endsWith('/api/moderation/reports/mine'))).toBe(true);
});

test('allows a suspended user to permanently delete only their own account', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'suspended-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'suspended-2',
    name: 'Cuenta Suspendida',
    email: 'suspendida2@example.com',
    role: 'user',
    accountModerationStatus: 'SUSPENDED',
    limitedAccess: true,
  }));
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(window, 'alert').mockImplementation(() => {});

  render(<App />);
  expect(await screen.findByText('No has enviado reportes.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta permanentemente' }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/users\/suspended-2$/),
    expect.objectContaining({ method: 'DELETE' })
  ));
  expect(window.confirm).toHaveBeenCalledTimes(2);
});

test('admin users table requires reasons for account and professional restoration actions', async () => {
  window.localStorage.setItem('tecnicos-rd:auth-token', 'admin-token');
  window.localStorage.setItem('tecnicos-rd:auth-user', JSON.stringify({
    id: 'admin-1',
    name: 'Admin Actual',
    email: 'admin@example.com',
    role: 'admin',
    accountModerationStatus: 'ACTIVE',
  }));

  const adminUsers = [
    { id: 'admin-1', name: 'Admin Actual', email: 'admin@example.com', role: 'admin', accountModerationStatus: 'ACTIVE' },
    { id: 'user-2', name: 'Usuario Regular', email: 'user@example.com', role: 'user', accountModerationStatus: 'ACTIVE' },
    {
      id: 'provider-3',
      name: 'Técnico Suspendido',
      email: 'tech@example.com',
      role: 'technician',
      accountModerationStatus: 'ACTIVE',
      technicianId: 'tech-3',
      technicianModerationStatus: 'SUSPENDED',
    },
  ];

  global.fetch = jest.fn((input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/api/technicians?view=ratings')) return jsonResponse(technicians);
    if (url.endsWith('/api/settings')) return jsonResponse({ specializations: ['Electricista'], locations: ['Santiago'] });
    if (url.endsWith('/api/users')) return jsonResponse(adminUsers);
    if (url.endsWith('/api/users/admin/stats')) return jsonResponse({
      totalUsers: 3,
      totalTechnicians: 1,
      totalBookings: 0,
      completedBookings: 0,
      pendingBookings: 0,
      totalRevenue: 0,
      averageRating: 0,
      usersByRole: [],
      bookingsByStatus: [],
      topTechnicians: [],
    });
    if (url.endsWith('/api/bookings/all')) return jsonResponse({ bookings: [] });
    if (url.endsWith('/api/moderation/admin/users/user-2')) return jsonResponse({ moderationStatus: 'SUSPENDED', moderationReason: 'Investigación.' });
    if (url.endsWith('/api/moderation/admin/technicians/tech-3')) return jsonResponse({ technicianModerationStatus: 'APPROVED' });
    return jsonResponse([]);
  });

  render(<App />);
  await screen.findByText('María Rodríguez');
  fireEvent.click(screen.getByLabelText('Panel administrativo'));
  fireEvent.click(await screen.findByRole('button', { name: 'Usuarios' }));

  const userRow = (await screen.findByText('Usuario Regular')).closest('tr');
  const suspend = within(userRow).getByRole('button', { name: 'Suspender cuenta' });
  expect(suspend).toBeDisabled();
  fireEvent.change(within(userRow).getByLabelText('Razón de moderación para Usuario Regular'), {
    target: { value: 'Investigación.' },
  });
  expect(suspend).toBeEnabled();
  fireEvent.click(suspend);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/admin\/users\/user-2$/),
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ decision: 'SUSPEND', reason: 'Investigación.' }) })
  ));

  const techRow = screen.getByText('Técnico Suspendido').closest('tr');
  const restore = within(techRow).getByRole('button', { name: 'Restaurar perfil' });
  expect(restore).toBeDisabled();
  fireEvent.change(within(techRow).getByLabelText('Nota para restaurar el perfil de Técnico Suspendido'), {
    target: { value: 'Apelación aprobada.' },
  });
  fireEvent.click(restore);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/admin\/technicians\/tech-3$/),
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ decision: 'APPROVE', reason: 'Apelación aprobada.' }) })
  ));

  expect(screen.getByText('Cuenta actual protegida')).toBeInTheDocument();
});
