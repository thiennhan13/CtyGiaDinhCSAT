// Isolated production-build QA: every parent/class/session and RPC response is synthetic.
// Requires Node 24 and a completed `next build`; local defaults to installed Edge.
// CI can select its isolated Chromium with CSAT_BROWSER_CHANNEL=chromium.
// NEXT_PUBLIC_SUPABASE_URL can be inlined by Next: build with http://127.0.0.1:54329,
// placeholder anon/service keys and consultation/email disabled. For another fixture build,
// set PARENT_TOPICS_QA_RPC_PORT to its build-time port (the runner must own it exclusively).
// No runtime bypass route is added. The real private page reads its normal HTTP-only cookie and RPC.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { gzipSync } = require('node:zlib');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'scratch', 'parent-topics-qa');
const ids = {
  student: '20000000-0000-4000-8000-000000000010',
  otherStudent: '20000000-0000-4000-8000-000000000011',
  basicClass: '20000000-0000-4000-8000-000000000020',
  advancedClass: '20000000-0000-4000-8000-000000000021',
  otherClass: '20000000-0000-4000-8000-000000000022',
};
const samples = [
  ['a04-cau-truc-lap', ids.basicClass],
  ['b14-tim-kiem-nhi-phan', ids.basicClass],
  ['c01-cong-don-mot-chieu', ids.advancedClass],
  ['c01-cong-don-hai-chieu', ids.advancedClass],
  ['d03-cai-tui-01', ids.advancedClass],
  ['d03-cai-tui-khong-gioi-han', ids.advancedClass],
];
const library = ['ab', 'bc', 'cd'].flatMap(group => require('../lib/parent-topic-catalog/' + group + '.json'));
const allArticles = library.map(article => [article.slug, /^[AB]/.test(article.topicCode) ? ids.basicClass : ids.advancedClass]);
// Optional targeted content refresh; unknown slugs fail instead of silently skipping QA.
const requestedSlugs = process.env.PARENT_TOPICS_QA_ARTICLE_SLUGS?.split(',').map(slug => slug.trim()).filter(Boolean);
if (requestedSlugs && (!requestedSlugs.length || requestedSlugs.some(slug => !library.some(article => article.slug === slug)))) throw Error('Unknown or empty article selection.');
const articlesToReview = requestedSlugs ? allArticles.filter(([slug]) => requestedSlugs.includes(slug)) : allArticles;
const modes = Object.fromEntries(['valid', 'excluded', 'old', 'expired', 'revoked', 'withdrawn', 'draft', 'nullStudent', 'zero', 'missingProgress'].map((mode, i) => {
  const token = String.fromCharCode(97 + i).repeat(43);
  return [mode, { token, hash: crypto.createHash('sha256').update(token).digest('hex') }];
}));
const filter = process.env.PARENT_TOPICS_QA_FILTER ? new RegExp(process.env.PARENT_TOPICS_QA_FILTER) : null;
const report = { filter: filter?.source || null, assertions: 0, checks: [], failures: [], browserErrors: [], unexpectedRequests: [], mockRequests: [] };
const check = (value, message) => { report.assertions++; assert.ok(value, message); };
async function run(name, fn) {
  if (filter && !filter.test(name)) return;
  try { await fn(); report.checks.push(name); console.log('PASS ' + name); }
  catch (error) { report.failures.push({ name, error: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function main() {
  check(process.versions.node.split('.')[0] === '24', 'Use Node.js 24 to run this QA harness.');
  await fs.access(path.join(root, '.next', 'BUILD_ID'));
  await fs.mkdir(output, { recursive: true });
  const standards = JSON.parse(await fs.readFile(path.join(root, 'lib', 'learning-curriculum-20260922.json'), 'utf8'));
  function portal(mode, args) {
    const plans = standards.map((standard, i) => {
      const template = structuredClone(standard);
      template.template_id = `20000000-0000-4000-8000-00000000003${i}`;
      template.version = 1;
      if (mode === 'old') template.stages[0].lessons[0].description += ' · tùy chỉnh kiểm thử';
      return {
        class_id: i === 0 ? ids.basicClass : ids.advancedClass,
        class_name: i === 0 ? 'Lớp cơ bản kiểm thử' : 'Lớp nâng cao kiểm thử', kind: 'class',
        template, published_at: mode === 'draft' ? null : '2026-09-01T00:00:00Z',
        body: { goal: 'Nắm cách phân tích bài toán.', focus_tags: [], next_step: 'Thực hành trên ví dụ nhỏ.', stage_index: null,
          title: '', content: '', continuation: '', program: template.program, format: 'group', template_id: template.template_id,
          curriculum: { parts: ['A', 'B'], excluded_stage_ids: [], excluded_topic_codes: mode === 'excluded' ? standards.flatMap(program => program.stages.flatMap(stage => stage.lessons.map(lesson => lesson.code))) : [], current_stage_id: mode === 'missingProgress' ? template.stages[2].id : null } },
      };
    });
    const student = { student_id: ids.student, name: 'Học sinh dữ liệu giả', date_of_birth: null, province: null,
      status: 'Đang học', parent_name: 'Phụ huynh dữ liệu giả', parent_number: '0912345678' };
    return { parent: { name: 'Phụ huynh dữ liệu giả', phone: '0912345678' }, student: mode === 'nullStudent' ? null : student,
      students: [{ student_id: ids.student, name: student.name }], month: args.p_month || '2026-09', reviewPage: args.p_review_page || 0,
      reviewCount: 0, reviews: [], plans: mode === 'withdrawn' ? [] : plans,
      enrolledClasses: plans.map(plan => ({ class_id: plan.class_id, classes: { name: plan.class_name, class_type: plan.template.program === 'basic' ? 'Lớp Cơ bản' : 'Lớp Nâng cao', status: 'active', tutors: { name: 'Gia sư dữ liệu giả' } } })),
      attendanceCount: 0, attendance: [], invoices: [], provisional: [], tutors: [], contact: { label: 'CSAT', url: 'https://zalo.me/0916246867' },
      class_progress: mode === 'missingProgress' ? undefined : plans.map(plan => ({ class_id: plan.class_id, completed_sessions: mode === 'zero' ? 0 : 5, as_of: '2026-10-08T08:00:00Z' })) };
  }
  const mock = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url !== '/rest/v1/rpc/parent_learning_portal' || req.method !== 'POST') {
      report.unexpectedRequests.push({ surface: 'mock', path: req.url, method: req.method });
      res.writeHead(404); res.end(JSON.stringify({ message: 'Only the read-only parent RPC fixture exists.' })); return;
    }
    try {
      let body = ''; for await (const chunk of req) body += chunk;
      const args = JSON.parse(body);
      const mode = Object.keys(modes).find(key => modes[key].hash === args.p_token_hash);
      // Report only synthetic argument metadata, never cookies or token hashes.
      report.mockRequests.push({ mode: mode || 'unknown', student: args.p_student_id, month: args.p_month, page: args.p_review_page });
      if (!mode || ['expired', 'revoked'].includes(mode) || (args.p_student_id && args.p_student_id !== ids.student)) {
        res.writeHead(403); res.end(JSON.stringify({ code: '42501', message: 'Synthetic lookup denied.' })); return;
      }
      res.end(JSON.stringify(portal(mode, args)));
    } catch {
      res.writeHead(400); res.end(JSON.stringify({ message: 'Invalid fixture request.' }));
    }
  });
  let preview, browser, log;
  try {
    const mockPort = process.env.PARENT_TOPICS_QA_RPC_PORT ? Number(process.env.PARENT_TOPICS_QA_RPC_PORT) : 54329;
    check(Number.isInteger(mockPort) && mockPort > 0 && mockPort < 65536, 'Valid fixture port.');
    await new Promise((resolve, reject) => { mock.once('error', reject); mock.listen(mockPort, '127.0.0.1', resolve); });
    const mockOrigin = 'http://127.0.0.1:' + mock.address().port;
    const port = process.env.CSAT_PARENT_QA_PORT ? Number(process.env.CSAT_PARENT_QA_PORT) : await freePort();
    check(Number.isInteger(port) && port > 0 && port < 65536, 'Valid preview port.');
    const origin = 'http://127.0.0.1:' + port;
    report.origin = origin;
    log = (await fs.open(path.join(output, 'server.log'), 'w')).createWriteStream();
    const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: mockOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-qa-anon-placeholder',
      SUPABASE_SERVICE_ROLE_KEY: 'local-qa-service-placeholder', APP_ORIGIN: origin,
      CONSULTATIONS_ENABLED: 'false', CONSULTATIONS_EMAIL_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1' };
    preview = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)],
      { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    preview.stdout.pipe(log, { end: false }); preview.stderr.pipe(log, { end: false });
    let ready = false;
    for (let attempt = 0; attempt < 45; attempt++) {
      if (preview.exitCode !== null) throw Error('Isolated preview exited; inspect scratch/parent-topics-qa/server.log.');
      try { if ((await fetch(origin + '/login')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    check(ready, 'Isolated preview started.');
    browser = await chromium.launch({ headless: true, channel: process.env.CSAT_BROWSER_CHANNEL || 'msedge' });
    async function context(mode = 'valid', options = {}) {
      const result = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
      await result.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (['data:', 'blob:'].includes(url.protocol)) return route.continue();
        if (url.origin !== origin) return route.abort('blockedbyclient');
        if (!['GET', 'HEAD'].includes(request.method())) {
          report.unexpectedRequests.push({ surface: 'browser', path: url.pathname, method: request.method() });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      result.on('page', page => page.on('pageerror', error => report.browserErrors.push(error.message)));
      if (mode) await result.addCookies([{ name: 'csat_parent_lookup', value: modes[mode].token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
      return result;
    }
    const articleUrl = (slug, classId, overrides = {}) => origin + '/parents/chuyen-de/' + slug + '?' + new URLSearchParams({
      student: ids.student, class: classId, month: '2026-09', page: '2', ...overrides,
    });
    const visit = async (page, url) => {
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      return response;
    };
    async function exportReview(slug) {
      const review = path.join(output, 'review');
      await fs.mkdir(review, { recursive: true });
      const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.href));
      const styles = [];
      for (const stylesheet of stylesheets) {
        check(new URL(stylesheet).origin === origin, 'Review export reads only local compiled CSS.');
        const response = await fetch(stylesheet);
        check(response.ok, 'Compiled stylesheet is available.');
        let css = await response.text();
        const urls = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
        for (const match of urls) {
          if (/^(data:|#)/.test(match[2])) continue;
          const asset = new URL(match[2], stylesheet);
          check(asset.origin === origin, 'Review embeds only local stylesheet assets.');
          const fetched = await fetch(asset);
          check(fetched.ok, 'Local font/style asset available.');
          const type = fetched.headers.get('content-type') || 'application/octet-stream';
          const value = Buffer.from(await fetched.arrayBuffer()).toString('base64');
          css = css.replace(match[0], `url("data:${type};base64,${value}")`);
        }
        styles.push(css.replace(/<\/style/gi, '<\\/style'));
      }
      const images = {};
      for (const image of await page.locator('img').evaluateAll(nodes => nodes.map(node => ({ src: node.src, current: node.currentSrc || node.src })))) {
        const src = image.current;
        if (!src || src.startsWith('data:')) continue;
        const asset = new URL(src, origin);
        check(asset.origin === origin, 'Review image comes from loopback.');
        const response = await fetch(asset);
        check(response.ok, 'Review image available.');
        images[src] = 'data:' + (response.headers.get('content-type') || 'application/octet-stream') + ';base64,' + Buffer.from(await response.arrayBuffer()).toString('base64');
        images[image.src] = images[src];
      }
      const html = await page.evaluate(({ styles, images, slugs }) => {
        const clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('script,link').forEach(node => node.remove());
        clone.querySelectorAll('img').forEach(node => {
          const absolute = new URL(node.getAttribute('src'), location.origin).href;
          if (images[absolute]) node.setAttribute('src', images[absolute]);
          node.removeAttribute('srcset'); node.removeAttribute('loading');
        });
        clone.querySelectorAll('a').forEach(node => {
          const href = node.getAttribute('href') || '';
          if (href.startsWith('/parents/chuyen-de/')) {
            const target = new URL(href, location.origin).pathname.split('/').pop();
            node.setAttribute('href', slugs.includes(target) ? target + '.html' : 'index.html');
          } else if (href.startsWith('/parents')) node.setAttribute('href', 'index.html');
        });
        const style = document.createElement('style'); style.textContent = styles.join('\n'); clone.querySelector('head').append(style);
        return '<!doctype html>\n' + clone.outerHTML;
      }, { styles, images, slugs: allArticles.map(article => article[0]) });
      await fs.writeFile(path.join(review, slug + '.html'), html);
      await fs.writeFile(path.join(review, 'index.html'), '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CSAT · Chuyên đề học tập</title><style>body{max-width:900px;margin:40px auto;padding:0 24px;font:17px/1.8 system-ui;background:#fffaf1;color:#132440}a{color:#244fd7}li{margin:15px 0}b{font-size:13px;color:#5c6270}h2{margin-top:32px}</style><h1>Chuyên đề học tập CSAT</h1><p>54 bài cho 43 chủ đề. Bản HTML nội bộ dùng dữ liệu giả để xem nội dung và bố cục; trang phụ huynh thật vẫn yêu cầu phiên và quyền đọc.</p>' + ['A', 'B', 'C'].map(group => '<h2>Chương trình ' + group + '</h2><ul>' + library.filter(article => group === 'C' ? /^[CD]/.test(article.topicCode) : article.topicCode.startsWith(group)).map(article => '<li><b>' + article.topicCode + ' · ' + article.order + '</b> <a href="' + article.slug + '.html">' + article.title + '</a></li>').join('') + '</ul>').join('') + '</html>');
    }
    await run('missing and malformed lookup cookies redirect to login', async () => {
      const c = await context(null), p = await c.newPage();
      await visit(p, articleUrl(...samples[0])); check(new URL(p.url()).pathname === '/login', 'No cookie must redirect to login.');
      await c.addCookies([{ name: 'csat_parent_lookup', value: 'malformed', domain: '127.0.0.1', path: '/' }]);
      await visit(p, articleUrl(...samples[0])); check(new URL(p.url()).pathname === '/login', 'Malformed cookie must redirect.');
      await c.close();
    });
    for (const mode of ['expired', 'revoked', 'excluded', 'old', 'withdrawn', 'draft', 'nullStudent']) await run('private article denied: ' + mode, async () => {
      const c = await context(mode), p = await c.newPage();
      await visit(p, articleUrl(...samples[0]));
      check(await p.locator('.parent-topic-content').count() === 0, mode + ' must not return article content.');
      check(!(await p.content()).includes('for (int'), mode + ' must not leak core article code.');
      const prefetch = await c.request.get(articleUrl(...samples[0]), { headers: { RSC: '1', 'Next-Router-Prefetch': '1' } });
      check(!(await prefetch.text()).includes('parent-topic-content'), mode + ' must not return an article through RSC prefetch.');
      await c.close();
    });
    await run('class/student scope, slug and query validation', async () => {
      const c = await context(), p = await c.newPage();
      for (const url of [articleUrl(samples[0][0], ids.otherClass), articleUrl(...samples[0], { student: ids.otherStudent }),
        articleUrl('khong-co-chuyen-de', ids.basicClass), articleUrl(...samples[0], { class: 'invalid' }),
        articleUrl(samples[2][0], ids.basicClass)]) {
        await visit(p, url); check(await p.locator('.parent-topic-content').count() === 0, 'Invalid scope/slug must not serve article.');
      }
      await c.close();
    });
    const c = await context(), page = await c.newPage();
    await run('parent dashboard links and class stage independent of month', async () => {
      const dashboard = month => origin + '/parents?' + new URLSearchParams({ student: ids.student, month, page: '2' });
      await visit(page, dashboard('2026-09'));
      const basic = page.locator('#roadmap > article').first();
      const current = await basic.locator('.roadmap-stage[aria-pressed="true"]').innerText();
      check(current.includes('CHẶNG 02') && current.includes(standards[0].stages[1].title), 'Five completed class sessions select the second basic stage.');
      check((await basic.innerText()).includes('Chặng định hướng theo 5 buổi lớp đã hoàn thành.'), 'Current class-stage explanation visible.');
      check(await page.locator('#reviews').evaluate(node => node.nextElementSibling?.id === 'roadmap'), 'Roadmap immediately follows reviews.');
      check(!await page.locator('.contact-dock').isVisible(), 'Marketing contact dock does not cover parent dashboard.');
      const hrefs = await page.locator('#roadmap .parent-read-topic').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      for (const [slug, classId] of library.filter(article => article.order === 1).map(article => [article.slug, /^[AB]/.test(article.topicCode) ? ids.basicClass : ids.advancedClass])) {
        const href = hrefs.find(value => value.includes('/' + slug + '?'));
        check(!!href, 'Dashboard links first article for ' + slug);
        const url = new URL(href, origin);
        check(url.searchParams.get('student') === ids.student && url.searchParams.get('class') === classId && url.searchParams.get('month') === '2026-09' && url.searchParams.get('page') === '2', 'Article link carries dashboard context.');
      }
      check(!hrefs.some(href => /c01-cong-don-hai-chieu|d03-cai-tui-khong-gioi-han/.test(href)), 'Dashboard opens each series from its first article.');
      await visit(page, dashboard('2026-08'));
      check(await page.locator('#roadmap > article').first().locator('.roadmap-stage[aria-pressed="true"]').innerText() === current, 'Changing attendance month does not change current class stage.');
      await page.setViewportSize({ width: 375, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Parent dashboard remains responsive.');
      await page.screenshot({ path: path.join(output, 'parent-dashboard-375.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 900 });
    });
    for (const mode of ['excluded', 'old']) await run('dashboard has no article links for ' + mode, async () => {
      const scope = await context(mode), p = await scope.newPage();
      await visit(p, origin + '/parents?student=' + ids.student);
      check(await p.locator('#roadmap .parent-read-topic').count() === 0, 'Unavailable/custom topics have no read-article links.');
      await scope.close();
    });
    for (const mode of ['zero', 'missingProgress']) await run('dashboard class-stage fallback: ' + mode, async () => {
      const scope = await context(mode), p = await scope.newPage();
      await visit(p, origin + '/parents?student=' + ids.student);
      const basic = p.locator('#roadmap > article').first();
      const selected = await basic.locator('.roadmap-stage[aria-pressed="true"]').innerText();
      check(selected.includes(mode === 'zero' ? 'CHẶNG 01' : 'CHẶNG 03'), 'Zero/fallback select expected stage.');
      check((await basic.innerText()).includes(mode === 'zero' ? 'Lớp đang chuẩn bị cho chặng đầu tiên.' : 'Gia sư đang ghi nhận trọng tâm:'), 'Preparation or published tutor fallback is explained.');
      check(!(await basic.innerText()).includes('Chặng định hướng theo 0 buổi'), 'Missing data is not treated as zero completed sessions.');
      await scope.close();
    });
    await run(articlesToReview.length + ' articles, HTTP privacy, questions and rendered code', async () => {
      for (const [slug, classId] of articlesToReview) {
        const response = await visit(page, articleUrl(slug, classId));
        const htmlBytes = await response.body();
        (report.articlePayloads ||= []).push({ slug, decodedHtmlBytes: htmlBytes.length, estimatedGzipBytes: gzipSync(htmlBytes).length });
        check(response.status() === 200, slug + ' returns 200.');
        check(/private/.test(response.headers()['cache-control'] || '') && /no-store/.test(response.headers()['cache-control'] || ''), 'Private no-store header.');
        check(/noindex/.test(response.headers()['x-robots-tag'] || ''), 'No-index header.');
        check(await page.locator('h1').count() === 1, 'One article heading.');
        check(await page.locator('.parent-topic-content').isVisible(), 'Article content visible.');
        check(!await page.locator('.contact-dock').isVisible(), 'Marketing contact dock does not cover private article.');
        check(await page.locator('.parent-codeblock pre code').count() > 0, 'Code or pseudocode present.');
        check((await page.locator('.parent-codeblock pre').allTextContents()).every(code => !/using\s+namespace\s+std\s*;/.test(code)), 'Namespace convention is implicit in displayed code.');
        check((await page.locator('.parent-topic-content').innerText()).length > 1000, 'Detailed content is rendered server-side.');
        check(await page.locator('.parent-topic-content script').count() === 0, 'Markdown does not produce scripts.');
        check(await page.locator('.parent-topic-question').count() === 2, slug + ' has two self-check questions.');
        check(await page.locator('.parent-topic-question[open]').count() === 0, 'Answers start closed.');
        check(await page.locator('.parent-topic-content h2').last().innerText() === 'Nguồn tham khảo thêm', 'Sources use the approved heading.');
        await exportReview(slug);
        if (samples.some(sample => sample[0] === slug)) await page.screenshot({ path: path.join(output, slug + '.png'), fullPage: true });
      }
    });
    await run('self-check answers open by keyboard and close again', async () => {
      await visit(page, articleUrl(...samples[5]));
      const question = page.locator('.parent-topic-question').first();
      check(!await question.locator('.parent-topic-answer').isVisible(), 'Answer hidden before interaction.');
      await question.locator('summary').focus();
      await page.keyboard.press('Enter');
      check(await question.locator('.parent-topic-answer').isVisible(), 'Enter opens the answer.');
      await page.keyboard.press('Space');
      check(!await question.locator('.parent-topic-answer').isVisible(), 'Space closes the answer.');
      await page.screenshot({ path: path.join(output, 'questions-desktop.png') });
    });
    await run('series, section links and preserved return context', async () => {
      await visit(page, articleUrl(...samples[4]));
      const next = page.locator('a[href*="d03-cai-tui-khong-gioi-han"]').first();
      check(await next.count() > 0, 'Series provides next article.');
      const nextUrl = new URL(await next.getAttribute('href'), origin);
      check(nextUrl.searchParams.get('student') === ids.student && nextUrl.searchParams.get('class') === ids.advancedClass, 'Series keeps child/class context.');
      await next.click(); await page.waitForURL(url => url.pathname.endsWith('d03-cai-tui-khong-gioi-han'));
      const back = page.locator('a[href^="/parents?"]').first();
      check(await back.count() > 0, 'Back-to-parent link exists.');
      const backUrl = new URL(await back.getAttribute('href'), origin);
      check(backUrl.searchParams.get('student') === ids.student && backUrl.searchParams.get('month') === '2026-09' && backUrl.searchParams.get('page') === '2', 'Return keeps child/month/review page.');
      const links = await page.locator('a[href^="#"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      for (const href of links) check(await page.evaluate(id => !!document.getElementById(id), decodeURIComponent(href.slice(1))), 'TOC link resolves: ' + href);
      const headings = await page.locator('.parent-topic-content h2[id],.parent-topic-content h3[id]').evaluateAll(nodes => nodes.map(node => node.id));
      check(headings.length > 2 && new Set(headings).size === headings.length, 'Heading anchors unique.');
    });
    await run('responsive code, keyboard, dark and reduced motion', async () => {
      await visit(page, articleUrl(...samples[0]));
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No page overflow at ' + width);
        check(await page.locator('h1').isVisible(), 'Heading readable at ' + width);
        if (width <= 900) {
          const toc = page.locator('.parent-topic-toc-mobile');
          check(await toc.isVisible() && await toc.getAttribute('open') === null, 'Mobile/tablet TOC starts collapsed.');
        } else check(await page.locator('.parent-topic-toc-desktop nav').isVisible(), 'Desktop TOC visible beside content.');
        check(await page.locator('.parent-codeblock pre code').first().evaluate(node => /monospace|Consolas|Menlo|Monaco/.test(getComputedStyle(node).fontFamily)), 'Code uses a fixed-width font.');
        await page.screenshot({ path: path.join(output, 'article-light-' + width + '.png'), fullPage: true });
        if ([375, 1440].includes(width)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, 'article-top-' + width + '.png') });
          await page.locator('.parent-topic-content').scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, 'article-body-' + width + '.png') });
          await page.evaluate(() => scrollTo(0, 0));
        }
      }
      await page.setViewportSize({ width: 720, height: 450 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Landscape enlarged-text reflow.');
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; document.documentElement.classList.add('dark'); });
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Dark/reduced-motion remains readable.');
      check(await page.locator('.parent-topic-header').evaluate(node => getComputedStyle(node).animationName === 'none'), 'Reduced motion disables reveal animation.');
      await page.screenshot({ path: path.join(output, 'article-dark-reduced.png'), fullPage: true });
      await page.keyboard.press('Tab'); check(await page.evaluate(() => document.activeElement !== document.body), 'Keyboard focus is available.');
      const code = page.locator('.parent-codeblock').first();
      const copy = code.getByRole('button');
      if (await copy.count()) {
        await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
        const expected = await code.locator('pre code').textContent();
        await copy.first().focus();
        check(await copy.first().evaluate(node => getComputedStyle(node).outlineStyle !== 'none'), 'Keyboard copy control has visible focus.');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.parent-code-copy')?.textContent === 'Đã sao chép');
        const actual = await page.evaluate(() => navigator.clipboard.readText());
        // Windows native clipboard can convert LF into CRLF. Normalize only that transport
        // convention; every other character, indentation and trailing space must match.
        const comparable = actual.replace(/\r\n/g, '\n');
        report.clipboard = { expectedLength: expected.length, actualLength: actual.length, nativeCRLF: (actual.match(/\r\n/g) || []).length };
        if (comparable !== expected) {
          const index = [...expected].findIndex((character, i) => character !== actual[i]);
          report.clipboardMismatch = { expectedLength: expected.length, actualLength: actual.length, index,
            expectedCodePoint: expected.codePointAt(index), actualCodePoint: actual.codePointAt(index),
            expectedCRLF: (expected.match(/\r\n/g) || []).length, actualCRLF: (actual.match(/\r\n/g) || []).length };
        }
        check(comparable === expected, 'Copy preserves source and whitespace, allowing Windows CRLF line endings.');
      } else check(false, 'Copy button is present.');
    });
    await run('no-JavaScript and print reading', async () => {
      const nojs = await context('valid', { javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
      const p = await nojs.newPage(); await visit(p, articleUrl(...samples[4]));
      check(await p.locator('.parent-topic-content').isVisible(), 'No-JS article readable.');
      check(await p.locator('.parent-codeblock pre code').count() > 0, 'No-JS code readable.');
      const toc = p.locator('.parent-topic-toc-mobile');
      check(await toc.getAttribute('open') === null, 'No-JS mobile TOC starts collapsed.');
      await toc.locator('summary').click();
      check(await toc.locator('nav').isVisible(), 'Native TOC opens without JavaScript.');
      const question = p.locator('.parent-topic-question').first();
      check(!await question.locator('.parent-topic-answer').isVisible(), 'No-JS answer starts closed.');
      await question.locator('summary').click();
      check(await question.locator('.parent-topic-answer').isVisible(), 'Answer opens without JavaScript.');
      await question.locator('summary').click();
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No-JS mobile has no overflow.');
      await p.screenshot({ path: path.join(output, 'article-no-js-375.png'), fullPage: true });
      await p.emulateMedia({ media: 'print' });
      check(await p.locator('.parent-topic-answer').last().isVisible(), 'Print includes answers even when disclosures were closed.');
      await p.pdf({ path: path.join(output, 'article-a4.pdf'), format: 'A4', printBackground: true });
      check(await p.locator('.parent-codeblock pre').first().evaluate(node => ['pre-wrap', 'break-spaces'].includes(getComputedStyle(node).whiteSpace)), 'Printed code wraps.');
      await nojs.close();
    });
    await c.close();
    await run('no browser errors or unexpected backend operations', async () => {
      check(report.browserErrors.length === 0, 'No browser errors: ' + report.browserErrors.join('; '));
      check(report.unexpectedRequests.length === 0, 'No unexpected API requests.');
      check(report.mockRequests.some(request => request.mode === 'valid'), 'Real SSR made a validated fixture RPC request.');
    });
  } finally {
    await browser?.close();
    if (preview?.pid) {
      if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(preview.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {} }
      else preview.kill('SIGTERM');
    }
    log?.end();
    if (mock.listening) await new Promise(resolve => mock.close(resolve));
    await fs.writeFile(path.join(output, filter ? 'report-targeted.json' : 'report.json'), JSON.stringify(report, null, 2));
  }
  if (report.failures.length) throw Error(`${report.failures.length} parent topic QA checks failed; see scratch/parent-topics-qa/report.json.`);
  console.log(`Parent topic QA passed: ${report.checks.length} checks, ${report.assertions} assertions. Synthetic data only.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
