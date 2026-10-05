const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathRule, contentFindings, markdownFindings, checkRepository } = require('../check-repository.cjs');

test('private paths stay blocked even if force-added; approved source stays allowed', () => {
  for (const p of ['.env.production', 'folder/.env.example', 'internal/report.md', 'docs/prototypes/view.html', 'data/people.xlsx', 'backup.dump', '.codex/auth.json', 'report.csv', 'keys/private.pem']) assert.ok(pathRule(p), p);
  for (const p of ['.env.example', 'AGENTS.md', 'database/migrations/20260923_22_tutor_profiles.sql', 'database/tests/fixtures/schema-before-accounting.sql', 'public/images/csat-mark.png']) assert.equal(pathRule(p), null, p);
});
test('source media and local IDE state cannot enter Git; selected derivatives remain allowed', () => {
  for (const file of ['public/videos/writing.mp4', 'public/images/tutors/poster.png', 'public/images/3D/orb.jpg', 'public/images/books.jpg', 'public/images/light-bulb.svg', '.idea/workspace.xml', '.vscode/settings.json']) assert.ok(pathRule(file), file);
  for (const file of ['public/media/writing-960.webm', 'public/images/site/books.webp', 'public/icon/csat-logo-compact.svg']) assert.equal(pathRule(file), null, file);
});

test('secret detection returns locations without leaking the secret; no broad fixture bypass', () => {
  const secret = 'gh' + 'p_' + 'a'.repeat(36);
  const found = contentFindings('database/tests/example.cjs', '\nconst value="' + secret + '";');
  assert.deepEqual(found, [{ file: 'database/tests/example.cjs', line: 2, rule: 'provider-token' }]);
  assert.ok(!JSON.stringify(found).includes(secret));
  assert.equal(contentFindings('config', 'postgres' + '://user:synthetic-password@db.example.test/db')[0].rule, 'credential-url');
  assert.equal(contentFindings('config', '-----BEGIN ' + 'PRIVATE KEY-----')[0].rule, 'private-key');
  assert.equal(contentFindings('.env.example', 'SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"').length, 0);
  assert.equal(contentFindings('test.cjs', "{origin:'https://test.example',sender:'test@example.test'}").length, 0);
});
test('Markdown checks relative targets and rejects links to internal material', () => {
  const exists = p => p === 'README.md';
  assert.equal(markdownFindings('docs/a.md', '[home](../README.md)', exists).length, 0);
  assert.equal(markdownFindings('docs/a.md', '[missing](missing.md)', exists)[0].rule, 'missing-markdown-target');
  assert.equal(markdownFindings('docs/a.md', '[private](../internal/report.md)', exists)[0].rule, 'private-markdown-link');
  assert.equal(markdownFindings('docs/a.md', '```md\n[example](missing.md)\n```', exists).length, 0);
});
test('staged guard reads the index, not a cleaned working copy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'csat-repo-guard-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  try {
    git('init');
    fs.writeFileSync(path.join(root, 'example.ts'), 'const token="' + 'gh' + 'p_' + 'z'.repeat(36) + '";');
    git('add', '--', 'example.ts');
    fs.writeFileSync(path.join(root, 'example.ts'), '// Clean working copy does not clean the index.');
    assert.equal(checkRepository(root, true).findings[0].rule, 'provider-token');
    assert.equal(checkRepository(root, false).findings.length, 0);
    fs.writeFileSync(path.join(root, '.env.production'), 'PLACEHOLDER=true');
    git('add', '--', '.env.production');
    assert.ok(checkRepository(root, true).findings.some(f => f.rule === 'environment-file'));
  } finally {
    const resolved = path.resolve(root), base = path.resolve(os.tmpdir()) + path.sep;
    assert.ok(resolved.startsWith(base) && path.basename(resolved).startsWith('csat-repo-guard-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

test('approved video does not bypass review for changed bytes or other media', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'csat-media-guard-'));
  const media = path.join(root, 'public', 'media');
  const original = fs.readFileSync(path.join(__dirname, '../../public/media/writing-960.webm'));
  const reviewed = path.join(media, 'writing-960.webm');
  try {
    execFileSync('git', ['init'], { cwd: root, stdio: 'pipe' });
    fs.mkdirSync(media, { recursive: true });
    fs.writeFileSync(reviewed, original);
    assert.equal(checkRepository(root, false).findings.length, 0);
    const changed = Buffer.from(original); changed[changed.length - 1] ^= 1;
    fs.writeFileSync(reviewed, changed);
    assert.equal(checkRepository(root, false).findings[0].rule, 'binary-needs-review');
    fs.writeFileSync(reviewed, original);
    fs.writeFileSync(path.join(media, 'unreviewed.webm'), original);
    assert.ok(checkRepository(root, false).findings.some(f => f.file.endsWith('unreviewed.webm') && f.rule === 'binary-needs-review'));
  } finally {
    const resolved = path.resolve(root), base = path.resolve(os.tmpdir()) + path.sep;
    assert.ok(resolved.startsWith(base) && path.basename(resolved).startsWith('csat-media-guard-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
