import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

test('report reasons use backend enum values and OTHER requires details', () => {
  const reportSource = read('src/app/moderation/report.tsx');
  const apiSource = read('src/lib/moderation-api.ts');

  for (const reason of [
    'SPAM',
    'HARASSMENT',
    'HATE_SPEECH',
    'SEXUAL_CONTENT',
    'VIOLENCE',
    'FRAUD',
    'IMPERSONATION',
    'PRIVACY',
    'OTHER',
  ]) {
    assert.match(reportSource, new RegExp(`value: ['"]${reason}['"]`));
    assert.match(apiSource, new RegExp(`['"]${reason}['"]`));
  }

  assert.match(reportSource, /reason === ['"]OTHER['"] && !details\.trim\(\)/);
  assert.match(reportSource, /REPORT_DETAILS_MAX_LENGTH/);
  assert.match(apiSource, /REPORT_DETAILS_MAX_LENGTH = 500/);
  assert.match(reportSource, /allowedContentTypes\.includes\(initialContentType\)/);
  assert.match(reportSource, /allowedContentTypes\[0\] \?\? ['"]PROFILE['"]/);
  assert.match(reportSource, /!allowedContentTypes\.includes\(contentType\)/);
});

test('community consent is explicit, non-prechecked and versioned', () => {
  const signUpSource = read('src/app/(auth)/sign-up.tsx');
  const consentSource = read('src/components/moderation/community-consent.tsx');
  const moderationApiSource = read('src/lib/moderation-api.ts');

  assert.match(signUpSource, /useState\(false\)/);
  assert.match(signUpSource, /ugcTermsAccepted: true/);
  assert.match(signUpSource, /ugcTermsVersion: COMMUNITY_TERMS_VERSION/);
  assert.match(signUpSource, /!communityTermsAccepted/);
  assert.match(consentSource, /accessibilityRole="checkbox"/);
  assert.match(moderationApiSource, /COMMUNITY_TERMS_VERSION = ['"]2026-07-18['"]/);
});

test('UGC-producing mobile flows require current community consent', () => {
  for (const path of [
    'src/app/profile/edit.tsx',
    'src/app/profile/become-technician.tsx',
    'src/app/booking/[technicianId].tsx',
    'src/app/booking-detail/[id].tsx',
  ]) {
    const source = read(path);
    assert.match(source, /useCommunityConsent/);
    assert.match(source, /acceptIfNeeded\(\)/);
    assert.match(source, /CommunityConsentCard/);
  }
});

test('report and block are separate actions for profiles and both booking participants', () => {
  const profileSource = read('src/app/technician/[id].tsx');
  const bookingSource = read('src/app/booking-detail/[id].tsx');

  for (const source of [profileSource, bookingSource]) {
    assert.match(source, /Reportar/);
    assert.match(source, /Bloquear/);
    assert.match(source, /moderationApi\.block/);
    assert.match(source, /\/moderation\/report/);
  }
  assert.match(bookingSource, /perspective === ['"]customer['"]/);
  assert.match(bookingSource, /booking\.customer/);
  assert.match(bookingSource, /booking\.technician\?\.user/);
});

test('authenticated directory calls carry the token so blocks are server-filtered', () => {
  const directorySource = read('src/app/(tabs)/index.tsx');
  const apiSource = read('src/lib/api.ts');

  assert.match(directorySource, /api\.technicians\.list\(token\)/);
  assert.match(directorySource, /useFocusEffect/);
  assert.match(apiSource, /list: async \(token\?: string \| null\)/);
  assert.match(apiSource, /['"]\/api\/technicians\?view=ratings['"],\s*\{ token \}/s);
});

test('admin moderation actions enforce backend decision constraints', () => {
  const adminSource = read('src/components/moderation/admin-moderation-queue.tsx');
  const adminScreenSource = read('src/app/admin.tsx');
  const apiSource = read('src/lib/moderation-api.ts');

  assert.match(adminSource, /resolutionNote/);
  assert.match(adminSource, /report\.contentType === ['"]PHOTO['"]/);
  assert.match(adminSource, /report\.technicianId/);
  assert.match(adminSource, /!notes\[`profile:\$\{id\}`\]\?\.trim\(\)/);
  assert.match(adminSource, /!notes\[`photo:\$\{photo\.id\}`\]\?\.trim\(\)/);
  assert.doesNotMatch(adminSource, /decideProfile\(profile, ['"]SUSPEND['"]\)/);
  assert.match(adminSource, /WARNING_RECORDED/);
  assert.match(adminSource, /Registrar advertencia/);
  assert.doesNotMatch(adminSource, /WARNING_ISSUED/);
  assert.match(adminScreenSource, /moderateUser\(target\.id, decision, normalizedReason/);
  assert.match(adminScreenSource, /target\.id === user\?\.id \|\| target\.role === ['"]admin['"]/);
  assert.match(adminScreenSource, /technicianModerationStatus === ['"]REJECTED['"]/);
  assert.match(adminScreenSource, /technicianModerationStatus === ['"]SUSPENDED['"]/);
  assert.match(adminScreenSource, /moderateProfile\([\s\S]*?['"]APPROVE['"]/);
  assert.match(adminScreenSource, /Restaura primero la cuenta/);
  assert.match(apiSource, /admin\/profile-photos/);
  assert.match(apiSource, /admin\/users/);
});

test('profile photo UI reflects staged moderation instead of immediate publication', () => {
  const profileSource = read('src/app/profile/edit.tsx');
  const profileApiSource = read('src/lib/profile-api.ts');
  const accountSource = read('src/app/(tabs)/account.tsx');

  assert.match(profileApiSource, /photoModerationStatus/);
  assert.match(profileSource, /Foto enviada para revisión/);
  assert.match(profileSource, /Tu foto pública anterior se mantiene hasta la decisión/);
  assert.match(profileSource, /uploaded\.photoUrl !== undefined/);
  assert.match(profileApiSource, /photoModerationReason/);
  assert.match(profileSource, /La foto más reciente no fue aprobada/);
  assert.match(profileSource, /user\.photoModerationReason/);
  assert.match(accountSource, /photoModerationTitle\(user\.photoModerationStatus\)/);
  assert.match(accountSource, /Motivo: \{user\.photoModerationReason\}/);
});

test('suspended accounts get a limited Account experience and no actionable tabs', () => {
  const accountSource = read('src/app/(tabs)/account.tsx');
  const tabsSource = read('src/app/(tabs)/_layout.tsx');
  const typesSource = read('src/types/api.ts');
  const apiSource = read('src/lib/api.ts');
  const providerSource = read('src/providers/auth.tsx');
  const rootLayoutSource = read('src/app/_layout.tsx');

  assert.match(typesSource, /accountModerationStatus\?: UserAccountModerationStatus/);
  assert.match(typesSource, /technicianModerationStatus\?: TechnicianModerationStatus/);
  assert.match(accountSource, /if \(isAccountSuspended\)/);
  assert.match(accountSource, /Ayuda, soporte y apelaciones/);
  assert.match(accountSource, /label="Mis reportes"/);
  assert.match(accountSource, /pushRoute\(['"]\/moderation\/reports['"]\)/);
  assert.match(accountSource, /Términos y normas de la comunidad/);
  assert.match(accountSource, /Sí, eliminar mi cuenta/);
  assert.doesNotMatch(accountSource, /user\.moderationStatus/);
  assert.match(tabsSource, /href: limitedAccess \? null : undefined/g);
  assert.match(tabsSource, /router\.replace\(['"]\/\(tabs\)\/account['"]\)/);
  assert.match(apiSource, /data\.code === ['"]ACCOUNT_SUSPENDED['"]/);
  assert.match(providerSource, /currentSession\.token !== notice\.token/);
  assert.match(providerSource, /toLimitedAccessUser\(currentSession\.user, notice\)/);
  assert.match(rootLayoutSource, /function SuspendedSessionGuard/);
  assert.match(rootLayoutSource, /if \(!allowed\) router\.replace\(['"]\/\(tabs\)\/account['"]\)/);
});

test('booking safety reloads blocks, hides blocked contacts and allows photo reports', () => {
  const bookingSource = read('src/app/booking-detail/[id].tsx');

  assert.match(bookingSource, /moderationApi\.blocks\(token\)/);
  assert.match(bookingSource, /blockedUserIds\.includes\(contact\.id\)/);
  assert.match(bookingSource, /Usuario bloqueado/);
  assert.match(bookingSource, /!contactBlocked && perspective === ['"]technician['"]/);
  assert.match(bookingSource, /!contactBlocked && user\?\.id === booking\.customerId/);
  assert.match(bookingSource, /target\.photoUrl \? ['"]BEHAVIOR,PHOTO['"] : ['"]BEHAVIOR['"]/);
});
