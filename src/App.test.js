import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App, { DEFAULT_SPECIALIZATIONS } from './App';

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

const technicians = [
  {
    id: 'tech-1',
    name: 'María Rodríguez',
    specialization: 'Electricista',
    specializations: ['Electricista'],
    location: 'Santiago de los Caballeros',
    rating: 4.9,
    verified: true,
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
    specialization: 'Plomero',
    specializations: ['Plomero'],
    location: 'Tamboril',
    rating: 4.7,
    verified: true,
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
    screen.getByRole('heading', { name: /Resuelve lo de tu hogar/i })
  ).toBeInTheDocument();
  expect(await screen.findByText('María Rodríguez')).toBeInTheDocument();
  expect(screen.getByText('José Pérez')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Nombre o servicio'), {
    target: { value: 'plomero' },
  });

  expect(screen.queryByText('María Rodríguez')).not.toBeInTheDocument();
  expect(screen.getByText('José Pérez')).toBeInTheDocument();
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
      screen.queryByRole('heading', { name: /Resuelve lo de tu hogar/i })
    ).not.toBeInTheDocument();
  });
});
