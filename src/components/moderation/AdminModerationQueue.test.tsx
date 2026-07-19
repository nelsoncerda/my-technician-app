import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminModerationQueue from './AdminModerationQueue';

const response = (data: unknown) => Promise.resolve({
  ok: true,
  status: 200,
  json: async () => data,
} as Response);

beforeEach(() => {
  global.fetch = jest.fn(() => response({
    reports: [{
      id: 'report-1',
      targetUserId: 'user-2',
      contentType: 'PROFILE',
      reason: 'IMPERSONATION',
      status: 'OPEN',
      createdAt: '2026-07-18T10:00:00.000Z',
      ageHours: 25,
      overdue: true,
      targetUser: { name: 'Perfil reportado' },
      reporter: { name: 'Persona reportante' },
    }],
    pendingProfiles: [{
      id: 'tech-1',
      submittedAt: '2026-07-18T11:00:00.000Z',
      ageHours: 3,
      overdue: false,
      user: { name: 'Técnico pendiente' },
      specializations: ['Electricista'],
      location: 'Santiago',
    }],
    pendingPhotos: [{
      id: 'photo-1',
      userId: 'user-3',
      submittedAt: '2026-07-18T12:00:00.000Z',
      pendingPhotoUrl: 'data:image/png;base64,AAAA',
      ageHours: 2,
      overdue: false,
      user: { name: 'Foto pendiente' },
    }],
    counts: { reports: 1, pendingProfiles: 1, pendingPhotos: 1 },
  })) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

test('constrains admin actions to valid content types and requires decision notes', async () => {
  render(<AdminModerationQueue />);
  expect(await screen.findByText('Perfil reportado')).toBeInTheDocument();

  const resolve = screen.getByRole('button', { name: 'Resolver' });
  const warning = screen.getByRole('button', { name: 'Registrar advertencia' });
  const suspendAccount = screen.getByRole('button', { name: 'Suspender cuenta' });
  expect(resolve).toBeDisabled();
  expect(warning).toBeDisabled();
  expect(suspendAccount).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Retirar contenido' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Nota para reporte report-1'), {
    target: { value: 'Revisado contra las normas vigentes.' },
  });
  expect(resolve).toBeEnabled();
  expect(warning).toBeEnabled();
  expect(suspendAccount).toBeEnabled();

  const rejectProfile = screen.getAllByRole('button', { name: 'Rechazar' })[0];
  const rejectPhoto = screen.getAllByRole('button', { name: 'Rechazar' })[1];
  expect(rejectProfile).toBeDisabled();
  expect(rejectPhoto).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Nota para perfil tech-1'), { target: { value: 'Datos no verificables.' } });
  fireEvent.change(screen.getByLabelText('Nota para foto photo-1'), { target: { value: 'La imagen infringe las normas.' } });
  expect(rejectProfile).toBeEnabled();
  expect(rejectPhoto).toBeEnabled();

  await waitFor(() => expect(screen.getByAltText('Foto pendiente de moderación')).toHaveAttribute(
    'src',
    'data:image/png;base64,AAAA'
  ));

  fireEvent.click(warning);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/admin\/reports\/report-1$/),
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        status: 'RESOLVED',
        action: 'WARNING_RECORDED',
        resolutionNote: 'Revisado contra las normas vigentes.',
      }),
    })
  ));
});
