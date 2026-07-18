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
    if (url.endsWith('/api/technicians')) return jsonResponse(technicians);
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
