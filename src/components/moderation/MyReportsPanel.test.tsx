import { render, screen, waitFor } from '@testing-library/react';
import MyReportsPanel from './MyReportsPanel';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => [{
      id: 'report-1',
      contentType: 'PHOTO',
      reason: 'PRIVACY',
      status: 'UNDER_REVIEW',
      createdAt: '2026-07-18T12:00:00.000Z',
      targetUser: { name: 'Perfil reportado' },
      resolutionNote: 'Nota interna que nunca debe mostrarse',
    }],
  } as Response)) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

test('shows report status without exposing internal moderation notes', async () => {
  render(<MyReportsPanel />);

  expect(await screen.findByText('Foto · Perfil reportado')).toBeInTheDocument();
  expect(screen.getByText('Privacidad')).toBeInTheDocument();
  expect(screen.getByText('En revisión')).toBeInTheDocument();
  expect(screen.queryByText('Nota interna que nunca debe mostrarse')).not.toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/moderation\/reports\/mine$/),
    expect.any(Object)
  ));
});
