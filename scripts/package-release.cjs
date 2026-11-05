// Source-only release package from an immutable Git commit; never includes the working tree.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pathRule, contentFindings } = require('./check-repository.cjs');
const root = path.resolve(__dirname, '..');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

function packageRelease(ref = 'HEAD') {
  if (process.versions.node.split('.')[0] !== '24') throw Error('Use Node.js 24 to package this release.');
  if (!/^(?:HEAD|v\d+\.\d+\.\d+|[a-f0-9]{40})$/.test(ref)) throw Error('Use HEAD, a full commit SHA or a vX.Y.Z tag.');
  const commit = git('rev-parse', '--verify', ref + '^{commit}').toString().trim();
  const manifest = JSON.parse(git('show', commit + ':package.json').toString());
  const lock = JSON.parse(git('show', commit + ':package-lock.json').toString());
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || lock.version !== manifest.version || lock.packages[''].version !== manifest.version) throw Error('Package and lockfile versions must agree.');
  const version = 'v' + manifest.version;
  if (ref.startsWith('v') && ref !== version) throw Error('Tag and package version differ.');
  if (manifest.private !== true || manifest.license !== 'SEE LICENSE IN LICENSE.md') throw Error('Keep the internal-use license and npm publishing disabled.');
  const entries = git('ls-tree', '-rz', '--full-tree', commit).toString('utf8').split('\0').filter(Boolean);
  const files = [], findings = [];
  for (const entry of entries) {
    const [meta, file] = entry.split('\t'), [mode, type, oid] = meta.split(' ');
    if (type !== 'blob' || mode === '120000' || pathRule(file)) { findings.push(file); continue; }
    const buffer = git('cat-file', 'blob', oid);
    if (!buffer.includes(0) && contentFindings(file, buffer.toString('utf8')).length) { findings.push(file); continue; }
    files.push({ path: file, bytes: buffer.length, sha256: sha256(buffer) });
  }
  if (findings.length) throw Error('Release rejected: ' + findings.length + ' unsafe path/content findings. Run the repository guard and review privately.');
  if (!files.some(file => file.path === 'LICENSE.md')) throw Error('License missing from the source commit.');
  const directory = path.join(root, 'dist', 'releases', version);
  fs.mkdirSync(directory, { recursive: true });
  const base = 'csat-portal-' + version;
  const archive = base + '-source.tar.gz', inventory = base + '-manifest.json';
  git('archive', '--format=tar.gz', '--prefix=' + base + '/', '--output=' + path.join(directory, archive), commit);
  fs.writeFileSync(path.join(directory, inventory), JSON.stringify({ name: manifest.name, version: manifest.version, commit, node: manifest.engines.node, license: manifest.license, kind: 'source', files }, null, 2) + '\n');
  fs.writeFileSync(path.join(directory, 'SHA256SUMS'), [archive, inventory].map(file => sha256(fs.readFileSync(path.join(directory, file))) + '  ' + file).join('\n') + '\n');
  return { version, commit, files: files.length, directory };
}
if (require.main === module) {
  try { console.log(JSON.stringify(packageRelease(process.argv[2]), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { packageRelease };
