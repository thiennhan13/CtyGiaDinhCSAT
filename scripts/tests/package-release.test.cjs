const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { gunzipSync } = require('node:zlib');

function fixture(fn) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'csat-release-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  try {
    fs.mkdirSync(path.join(directory, 'scripts'));
    for (const file of ['package-release.cjs', 'check-repository.cjs']) fs.copyFileSync(path.join(__dirname, '..', file), path.join(directory, 'scripts', file));
    const pkg = { name: 'csat-release-fixture', version: '2.1.0', private: true, license: 'SEE LICENSE IN LICENSE.md', engines: { node: '24.x' } };
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify({ version: '2.1.0', packages: { '': { version: '2.1.0' } } }));
    fs.writeFileSync(path.join(directory, 'LICENSE.md'), 'Synthetic internal-use notice.');
    git('init', '--quiet'); git('add', '.');
    git('-c', 'user.name=Release Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'Synthetic source');
    const run = ref => spawnSync(process.execPath, [path.join(directory, 'scripts/package-release.cjs'), ref], { cwd: directory, encoding: 'utf8' });
    fn({ directory, git, run });
  } finally {
    if (!path.resolve(directory).startsWith(path.join(path.resolve(os.tmpdir()), 'csat-release-'))) throw Error('Unexpected fixture directory.');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
test('release archive and inventory use committed bytes only and have reproducible checksums', () => fixture(({ directory, run }) => {
  fs.writeFileSync(path.join(directory, '.env.local'), 'DO_NOT_PACKAGE=synthetic');
  fs.appendFileSync(path.join(directory, 'LICENSE.md'), '\nUncommitted change.');
  assert.equal(run('HEAD').status, 0);
  const output = path.join(directory, 'dist/releases/v2.1.0');
  const inventory = JSON.parse(fs.readFileSync(path.join(output, 'csat-portal-v2.1.0-manifest.json')));
  assert.equal(inventory.files.some(file => file.path.startsWith('.env')), false);
  const license = inventory.files.find(file => file.path === 'LICENSE.md');
  assert.equal(license.sha256, createHash('sha256').update('Synthetic internal-use notice.').digest('hex'));
  const first = fs.readFileSync(path.join(output, 'SHA256SUMS'), 'utf8');
  for (const line of first.trim().split('\n')) {
    const [hash, file] = line.split('  ');
    assert.equal(hash, createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex'));
  }
  const tar = gunzipSync(fs.readFileSync(path.join(output, 'csat-portal-v2.1.0-source.tar.gz')));
  assert.equal(tar.includes(Buffer.from('Uncommitted change.')), false);
  assert.equal(run('HEAD').status, 0);
  assert.equal(fs.readFileSync(path.join(output, 'SHA256SUMS'), 'utf8'), first);
}));
test('release rejects a version-mismatched tag and committed internal material', () => fixture(({ directory, git, run }) => {
  git('tag', 'v2.0.0');
  assert.notEqual(run('v2.0.0').status, 0);
  fs.mkdirSync(path.join(directory, 'internal')); fs.writeFileSync(path.join(directory, 'internal/private.txt'), 'Synthetic internal data.');
  git('add', 'internal'); git('-c', 'user.name=Release Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'Unsafe fixture');
  assert.notEqual(run('HEAD').status, 0);
  assert.equal(fs.existsSync(path.join(directory, 'dist')), false);
}));
