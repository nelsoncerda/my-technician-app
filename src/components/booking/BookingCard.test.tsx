import { fireEvent, render, screen } from '@testing-library/react';
import BookingCard from './BookingCard';
import BookingList from './BookingList';

const booking = {
  id: 'booking-1',
  scheduledDate: '2026-07-20T00:00:00.000Z',
  scheduledTime: '10:00',
  status: 'PENDING',
  serviceType: 'Electricista',
  address: 'Dirección de la reserva',
  city: 'Santiago',
  customer: {
    id: 'customer-1',
    name: 'Cliente Uno',
    email: 'cliente-privado@example.com',
    phone: '809-555-0101',
    photoUrl: 'data:image/png;base64,CLIENT',
  },
  technician: {
    id: 'tech-1',
    user: {
      id: 'provider-1',
      name: 'Técnico Uno',
      email: 'tecnico-privado@example.com',
      phone: '809-555-0202',
      photoUrl: 'data:image/png;base64,TECH',
    },
  },
};

test('offers separate report and block controls to both booking participants', () => {
  const onReport = jest.fn();
  const onBlock = jest.fn();
  const onReportPhoto = jest.fn();
  const { rerender } = render(
    <BookingCard booking={booking} userRole="customer" onReport={onReport} onReportPhoto={onReportPhoto} onBlock={onBlock} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Reportar conducta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bloquear técnico' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reportar foto' }));
  expect(onReport).toHaveBeenCalledTimes(1);
  expect(onBlock).toHaveBeenCalledTimes(1);
  expect(onReportPhoto).toHaveBeenCalledTimes(1);

  rerender(<BookingCard booking={booking} userRole="technician" onReport={onReport} onReportPhoto={onReportPhoto} onBlock={onBlock} />);
  expect(screen.getByRole('button', { name: 'Bloquear cliente' })).toBeInTheDocument();
});

test('keeps historical booking details but suppresses lifecycle actions after a block', () => {
  render(
    <BookingCard
      booking={booking}
      userRole="technician"
      interactionBlocked
      onConfirm={jest.fn()}
      onReport={jest.fn()}
    />
  );

  expect(screen.getByText('Dirección de la reserva, Santiago')).toBeInTheDocument();
  expect(screen.getByText(/Conservamos los datos históricos/i)).toBeInTheDocument();
  expect(screen.queryByText('cliente-privado@example.com')).not.toBeInTheDocument();
  expect(screen.queryByText('809-555-0101')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
});

test('honors the server interactionBlocked flag when rendering a booking list', () => {
  render(
    <BookingList
      bookings={[{ ...booking, interactionBlocked: true }]}
      userRole="customer"
    />
  );

  expect(screen.getByText(/Usuario bloqueado/i)).toBeInTheDocument();
  expect(screen.queryByText('tecnico-privado@example.com')).not.toBeInTheDocument();
  expect(screen.queryByText('809-555-0202')).not.toBeInTheDocument();
});
