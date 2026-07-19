import { fireEvent, render, screen } from '@testing-library/react';
import ReportDialog from './ReportDialog';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

test('requires bounded details when the controlled reason is OTHER', () => {
  render(
    <ReportDialog
      target={{
        targetUserId: 'provider-1',
        technicianId: 'tech-1',
        contentType: 'PROFILE',
        name: 'Técnico Uno',
      }}
      onClose={jest.fn()}
    />
  );

  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'OTHER' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Describe brevemente');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByLabelText(/Detalles/)).toHaveAttribute('maxlength', '500');
});
