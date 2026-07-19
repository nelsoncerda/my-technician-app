export interface AccountSuspensionNotice {
  token: string;
  accountModerationReason?: string | null;
  suspensionMessage?: string;
  supportUrl?: string;
}

export interface LimitedAccessUser {
  accountModerationStatus?: 'ACTIVE' | 'SUSPENDED';
  accountModerationReason?: string | null;
  limitedAccess?: boolean;
  suspensionCode?: string;
  suspensionMessage?: string;
  supportUrl?: string;
}

type AccountSuspensionListener = (notice: AccountSuspensionNotice) => void;
const listeners = new Set<AccountSuspensionListener>();

export function notifyAccountSuspended(notice: AccountSuspensionNotice): void {
  for (const listener of listeners) listener(notice);
}

export function subscribeToAccountSuspended(listener: AccountSuspensionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toLimitedAccessUser<T extends LimitedAccessUser>(
  user: T,
  notice: AccountSuspensionNotice
): Omit<T, keyof LimitedAccessUser> & LimitedAccessUser & {
  accountModerationStatus: 'SUSPENDED';
  limitedAccess: true;
  suspensionCode: 'ACCOUNT_SUSPENDED';
} {
  return {
    ...user,
    accountModerationStatus: 'SUSPENDED',
    accountModerationReason:
      notice.accountModerationReason ?? user.accountModerationReason ?? null,
    limitedAccess: true,
    suspensionCode: 'ACCOUNT_SUSPENDED',
    suspensionMessage: notice.suspensionMessage ?? user.suspensionMessage,
    supportUrl: notice.supportUrl ?? user.supportUrl,
  };
}
