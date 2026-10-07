const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

// Report locations and rule names only. Never echo matched values or Git stderr.
function pathRule(file) {
  const p = file.replaceAll('\\', '/');
  if (/(^|\/)(?:internal|private-data|backups|exports|artifacts|scratch|prototypes|node_modules|\.next|\.vercel|\.agents|\.codex|\.aws|\.ssh|\.idea|\.vscode|test-results|playwright-report)(\/|$)/i.test(p)) return 'private-or-generated-path';
  if (/^public\/(?:videos\/|images\/(?:3D\/|tutors\/|courses\/|students\/|(?:3d-code|devpad|light-bulb)\.svg$|(?:basic-class|books|code|code2|code4|code-building|git|comp-program)\.jpg$|(?:haidang|csatkeyboard)\.png$))/i.test(p)) return 'original-media-needs-selection';
  if (/(^|\/)\.env[^/]*$/i.test(p) && p !== '.env.example') return 'environment-file';
  if (/\.(?:env|dump|backup|xlsx?|csv|docx?|pdf|zip|7z|tar|tgz|gz|pem|key|p12|pfx|log|tsbuildinfo)$/i.test(p)) return 'private-export-or-key-file';
  return null;
}
function contentFindings(file, text) {
  const out = [];
  const add = (rule, offset) => out.push({ file, line: text.slice(0, offset).split('\n').length, rule });
  const rules = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
    ['provider-token', /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9]{24,}|AKIA[A-Z0-9]{16})\b/g],
    ['jwt', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g],
    ['credential-url', /\b(?:postgres(?:ql)?|https?):\/\/[^\s"'<>()/:@]+:[^\s"'<>@]+@[^\s"'<>]+/g],
  ];
  for (const [rule, regex] of rules) {
    for (const match of text.matchAll(regex)) add(rule, match.index);
  }
  return out;
}
function markdownFindings(file, text, exists) {
  if (!file.endsWith('.md')) return [];
  const out = [];
  // Preserve line count while excluding fenced code examples.
  const prose = text.replace(/```[^]*?```/g, s => s.replace(/[^\n]/g, ' '));
  for (const match of prose.matchAll(/\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)/g)) {
    let link = match[1].replace(/^<|>$/g, '').trim().replace(/\s+"[^"]*"$/, '');
    if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
    const line = prose.slice(0, match.index).split('\n').length;
    if (/^(?:[A-Za-z]:[\\/]|file:|\/)/.test(link)) { out.push({ file, line, rule: 'machine-local-markdown-link' }); continue; }
    try { link = decodeURIComponent(link.split('#')[0].split('?')[0]); } catch { out.push({ file, line, rule: 'invalid-markdown-link' }); continue; }
    if (!link) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), link));
    if (target.startsWith('../') || pathRule(target)) out.push({ file, line, rule: 'private-markdown-link' });
    else if (!exists(target)) out.push({ file, line, rule: 'missing-markdown-target' });
  }
  return out;
}
function checkRepository(root, staged = false) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
  const files = staged ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split('\0').filter(Boolean)
    : [...new Set([...tracked, ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)])];
  const indexPaths = new Set(tracked);
  const exists = target => staged ? indexPaths.has(target) || tracked.some(p => p.startsWith(target + '/')) : fs.existsSync(path.join(root, target));
  const findings = []; let checked = 0;
  for (const file of files) {
    if (!staged && !fs.existsSync(path.join(root, file))) continue;
    checked++;
    const rule = pathRule(file);
    if (rule) { findings.push({ file, line: 1, rule }); continue; }
    if (!staged && fs.lstatSync(path.join(root, file)).isSymbolicLink()) { findings.push({ file, line: 1, rule: 'symlink-needs-review' }); continue; }
    if (staged && /^120000 /.test(git('ls-files', '--stage', '--', file))) { findings.push({ file, line: 1, rule: 'symlink-needs-review' }); continue; }
    const buffer = staged ? execFileSync('git', ['show', ':' + file], { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) : fs.readFileSync(path.join(root, file));
    if (buffer.includes(0)) {
      // Owner-approved writing derivative, reviewed 05/10/2026 (PUBLIC_WEBSITE).
      // A changed file or another video must be reviewed again; no media-folder bypass.
      const reviewedVideo = file === 'public/media/writing-960.webm'
        && buffer.length <= 2 * 1024 * 1024
        && buffer.subarray(0, 4).toString('hex') === '1a45dfa3'
        && createHash('sha256').update(buffer).digest('hex') === '6ea8bf1707c8a54656faf72fe0dcffbfc582191bb7b129b93b3784f0a2b08ae7';
      if (!reviewedVideo && !/^public\/(?:icon|images)\/[^]+\.(?:png|jpe?g|webp|ico|gif)$/i.test(file)) findings.push({ file, line: 1, rule: 'binary-needs-review' });
      continue;
    }
    const text = buffer.toString('utf8');
    findings.push(...contentFindings(file, text), ...markdownFindings(file, text, exists));
  }
  return { scope: staged ? 'staged-index' : 'working-tree-and-tracked', checked, findings };
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(a => a !== '--staged')) throw new Error('unsupported argument');
    const result = checkRepository(process.cwd(), args.includes('--staged'));
    console.log(JSON.stringify(result, null, 2));
    if (result.findings.length) process.exitCode = 1;
  } catch {
    console.error('Repository check failed. Verify Git, paths and file access locally; no file content was logged.');
    process.exitCode = 1;
  }
}
module.exports = { pathRule, contentFindings, markdownFindings, checkRepository };
