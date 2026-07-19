import { mergeProfilePhotoSubmission } from './moderation-api';

test('keeps the approved photo while a replacement is staged for moderation', () => {
  const result = mergeProfilePhotoSubmission(
    { id: 'user-1', photoUrl: 'https://example.com/approved.jpg', photoModerationStatus: 'APPROVED' },
    {
      submissionId: 'submission-1',
      photoModerationStatus: 'PENDING',
      photoUrl: 'https://example.com/approved.jpg',
    }
  );

  expect(result.pending).toBe(true);
  expect(result.user.photoUrl).toBe('https://example.com/approved.jpg');
  expect(result.user.photoModerationStatus).toBe('PENDING');
});

test('clears an earlier rejection reason when a replacement photo enters review', () => {
  const currentUser: {
    id: string;
    photoModerationStatus?: string;
    photoModerationReason?: string | null;
    photoModerationReviewedAt?: string | null;
  } = {
    id: 'user-1',
    photoModerationStatus: 'REJECTED',
    photoModerationReason: 'La foto anterior no era apropiada.',
    photoModerationReviewedAt: '2026-07-18T12:00:00Z',
  };
  const result = mergeProfilePhotoSubmission(
    currentUser,
    { submissionId: 'submission-2', photoModerationStatus: 'PENDING' }
  );

  expect(result.user.photoModerationStatus).toBe('PENDING');
  expect(result.user.photoModerationReason).toBeNull();
  expect(result.user.photoModerationReviewedAt).toBeNull();
});
