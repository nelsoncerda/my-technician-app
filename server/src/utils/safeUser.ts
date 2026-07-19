export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  photoUrl: true,
  role: true,
  emailVerified: true,
  moderationStatus: true,
  moderationReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function sanitizeUser<T extends Record<string, unknown>>(user: T) {
  const {
    password: _password,
    verificationToken: _verificationToken,
    verificationTokenExpires: _verificationTokenExpires,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    ...safeUser
  } = user;
  return safeUser;
}
