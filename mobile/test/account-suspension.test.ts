import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notifyAccountSuspended,
  subscribeToAccountSuspended,
  toLimitedAccessUser,
} from '../src/lib/account-suspension.js';

test('turns an existing session user into owner-safe limited access', () => {
  const user = toLimitedAccessUser(
    { accountModerationStatus: 'ACTIVE' as const, accountModerationReason: null },
    {
      token: 'session-token',
      accountModerationReason: 'Investigación de seguridad.',
      suspensionMessage: 'Cuenta suspendida.',
      supportUrl: '/support',
    }
  );

  assert.equal(user.accountModerationStatus, 'SUSPENDED');
  assert.equal(user.accountModerationReason, 'Investigación de seguridad.');
  assert.equal(user.limitedAccess, true);
  assert.equal(user.suspensionCode, 'ACCOUNT_SUSPENDED');
  assert.equal(user.supportUrl, '/support');
});

test('suspension subscribers receive the request token and can unsubscribe', () => {
  const notices: string[] = [];
  const unsubscribe = subscribeToAccountSuspended((notice) => notices.push(notice.token));

  notifyAccountSuspended({ token: 'current-token' });
  unsubscribe();
  notifyAccountSuspended({ token: 'late-token' });

  assert.deepEqual(notices, ['current-token']);
});
