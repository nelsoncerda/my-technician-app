const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { mkdtemp, mkdir, readFile, symlink, utimes, writeFile } = require('node:fs/promises');
const { promisify } = require('node:util');
const os = require('node:os');
const path = require('node:path');

const execFileAsync = promisify(execFile);
const pruneScript = path.resolve(__dirname, '../../deploy/prune-database-backups.sh');
const releaseScript = path.resolve(__dirname, '../../deploy/release-mobile-api.sh');
const retentionService = path.resolve(
  __dirname,
  '../../deploy/systemd/technician-backup-retention.service',
);

async function createFile(filePath, contents, modifiedAt) {
  await writeFile(filePath, contents);
  if (modifiedAt) await utimes(filePath, modifiedAt, modifiedAt);
}

test('backup retention removes only expired automated database dumps', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'technician-backups-'));
  t.after(async () => {
    const { rm } = require('node:fs/promises');
    await rm(tempRoot, { recursive: true, force: true });
  });

  const appRoot = path.join(tempRoot, 'apps');
  const backupRoot = path.join(appRoot, 'backups');
  const oldAutomated = path.join(backupRoot, '20260501T120000Z-mobile-api');
  const oldLegacy = path.join(backupRoot, '20260502T120000Z');
  const recentAutomated = path.join(backupRoot, '20260715T120000Z-mobile-api');
  const linkedAutomated = path.join(backupRoot, '20260503T120000Z-mobile-api');
  const manualBackup = path.join(backupRoot, 'manual-recovery');
  const nestedBackup = path.join(oldAutomated, 'nested');
  const outsideFile = path.join(tempRoot, 'outside.dump');
  const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

  for (const directory of [oldAutomated, oldLegacy, recentAutomated, linkedAutomated, manualBackup, nestedBackup]) {
    await mkdir(directory, { recursive: true });
  }

  await createFile(path.join(oldAutomated, 'database.dump'), 'expired', oldDate);
  await createFile(path.join(oldLegacy, 'database.dump'), 'expired legacy', oldDate);
  await createFile(path.join(oldAutomated, 'server.env'), 'KEEP=1', oldDate);
  await createFile(path.join(oldAutomated, 'previous-release'), '/release/old', oldDate);
  await createFile(path.join(oldAutomated, 'postgres.dump'), 'special', oldDate);
  await createFile(path.join(nestedBackup, 'database.dump'), 'nested', oldDate);
  await createFile(path.join(manualBackup, 'database.dump'), 'manual', oldDate);
  await createFile(path.join(recentAutomated, 'database.dump'), 'recent');
  await createFile(outsideFile, 'outside', oldDate);
  await symlink(outsideFile, path.join(linkedAutomated, 'database.dump'));

  const { stdout } = await execFileAsync('bash', [pruneScript, appRoot]);

  assert.match(stdout, /pruned 2 artifact\(s\)/);
  await assert.rejects(readFile(path.join(oldAutomated, 'database.dump')));
  await assert.rejects(readFile(path.join(oldLegacy, 'database.dump')));
  assert.equal(await readFile(path.join(oldAutomated, 'server.env'), 'utf8'), 'KEEP=1');
  assert.equal(await readFile(path.join(oldAutomated, 'previous-release'), 'utf8'), '/release/old');
  assert.equal(await readFile(path.join(oldAutomated, 'postgres.dump'), 'utf8'), 'special');
  assert.equal(await readFile(path.join(nestedBackup, 'database.dump'), 'utf8'), 'nested');
  assert.equal(await readFile(path.join(manualBackup, 'database.dump'), 'utf8'), 'manual');
  assert.equal(await readFile(path.join(recentAutomated, 'database.dump'), 'utf8'), 'recent');
  assert.equal(await readFile(path.join(linkedAutomated, 'database.dump'), 'utf8'), 'outside');
  assert.equal(await readFile(outsideFile, 'utf8'), 'outside');
});

test('backup retention refuses a symbolic-link backup root', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'technician-backup-guard-'));
  t.after(async () => {
    const { rm } = require('node:fs/promises');
    await rm(tempRoot, { recursive: true, force: true });
  });

  const appRoot = path.join(tempRoot, 'apps');
  const outsideRoot = path.join(tempRoot, 'outside');
  await mkdir(appRoot, { recursive: true });
  await mkdir(outsideRoot, { recursive: true });
  await symlink(outsideRoot, path.join(appRoot, 'backups'));

  await assert.rejects(
    execFileAsync('bash', [pruneScript, appRoot]),
    /backup root cannot be a symbolic link/,
  );
});

test('release cleanup uses the shared retention lock', async () => {
  const [releaseSource, serviceSource] = await Promise.all([
    readFile(releaseScript, 'utf8'),
    readFile(retentionService, 'utf8'),
  ]);

  assert.match(
    releaseSource,
    /\/usr\/bin\/flock -x "\$SHARED\/database-backup-retention\.lock"/,
  );
  assert.match(
    serviceSource,
    /\/usr\/bin\/flock -x -w 300 \/home\/bitnami\/apps\/shared\/database-backup-retention\.lock/,
  );
  assert.match(serviceSource, /User=bitnami/);
});

test('backend-only releases preserve the deployed web build', async () => {
  const releaseSource = await readFile(releaseScript, 'utf8');

  assert.match(releaseSource, /technician-current\/build\/index\.html/);
  assert.match(releaseSource, /cp -a .*technician-current\/build.*RELEASE\/build/);
  assert.match(releaseSource, /test -f .*RELEASE\/build\/index\.html/);
});
