// Read-only QA on an isolated loopback preview. Never uses real Portal data or submits forms.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.PUBLIC_QA_BASE_URL || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Loopback preview required');
const output = path.resolve(__dirname, '../../scratch/knowledge-map-qa');
const errors = [], writes = [], assets = [];
let checks = 0;
function check(value, message) { checks++; assert.ok(value, message); }
async function secure(context) {
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== new URL(base).origin) return route.abort();
    if (!['GET', 'HEAD'].includes(request.method())) { writes.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && /\.(woff2|png|svg)|\/_next\/image/.test(response.url())) assets.push(response.url()); });
  });
}
async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CSAT_BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await secure(context);
    const page = await context.newPage();
    await page.goto(base + '/ban-do-kien-thuc?lop=C#chu-de-D03', { waitUntil: 'networkidle' });
    check(new URL(page.url()).pathname === '/tu-hoc', 'Legacy URL redirects to self-study');
    check(new URL(page.url()).searchParams.get('lop') === 'C', 'Redirect keeps query');
    check(await page.locator('#chu-de-D03').getAttribute('open') !== null, 'Redirect keeps topic anchor');
    for (const theme of ['light', 'dark']) for (const width of [320, 375, 768, 1280, 1281, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      const response = await page.goto(base + '/tu-hoc', { waitUntil: 'networkidle' });
      check(response.status() === 200, 'Route returns 200');
      await page.locator('.km-controls').waitFor({ state: 'visible' });
      check(await page.locator('.km-topic').count() === 43, 'All topics rendered');
      check(await page.locator('nav > a[href="/tu-hoc"][aria-current="page"]').count() === 1, 'Self-study is a separate active main navigation item');
      check(await page.locator('.nav-roadmap a[href="/tu-hoc"]').count() === 0, 'Self-study is outside course dropdown');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow ${theme}/${width}`);
      await page.screenshot({ path: path.join(output, `${theme}-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'C · Thuật toán nâng cao' }).click();
    check(await page.locator('.km-topic').count() === 19, 'C includes 19 topics');
    await page.getByRole('textbox', { name: 'Tìm theo tên, mã hoặc thuật toán' }).count();
    const search = page.getByRole('searchbox', { name: 'Tìm theo tên, mã hoặc thuật toán' });
    await search.fill('d03');
    check(await page.locator('.km-topic').count() === 1, 'Topic code search');
    await page.locator('#chu-de-D03 > summary').click();
    await page.locator('#chu-de-D03 .km-related a').first().click();
    check(await page.locator('#chu-de-D01').getAttribute('open') !== null, 'Related topic opens across filters');
    check(await search.inputValue() === '', 'Related navigation clears search');
    check(await page.evaluate(() => document.activeElement?.parentElement?.id === 'chu-de-D01'), 'Focus follows related topic');
    await page.goBack();
    check(await page.locator('#chu-de-D03').getAttribute('open') !== null, 'Back restores topic');
    await page.reload({ waitUntil: 'networkidle' });
    check(await page.locator('#chu-de-D03').getAttribute('open') !== null, 'Reload preserves shared topic URL');
    await page.goForward();
    await search.fill('nhi phan');
    check(await page.locator('#chu-de-B14').count() === 1, 'Accent-insensitive search');
    await search.fill('zz-no-such-topic');
    check(await page.locator('.km-empty').isVisible(), 'Empty result state');
    await page.getByRole('button', { name: 'Xóa tìm kiếm và bộ lọc' }).click();
    check(await page.locator('.km-topic').count() === 43, 'Reset restores full map');
    await page.locator('#chu-de-A01 > summary').focus();
    await page.keyboard.press('Enter');
    check(await page.locator('#chu-de-A01').getAttribute('open') !== null, 'Keyboard opens topic');
    await page.keyboard.press('Enter');
    check(await page.locator('#chu-de-A01').getAttribute('open') === null, 'Keyboard closes topic');
    await page.getByRole('button', { name: 'C · Thuật toán nâng cao' }).click();
    await page.locator('.km-route a').first().click();
    check(await page.locator('#nhom-A').isVisible(), 'Hero link restores hidden level');
    for (const link of await page.locator('.km-practice').all()) {
      const url = new URL(await link.getAttribute('href'));
      check(url.origin === 'https://csatoj.vn' && Number(url.searchParams.get('tag')) > 0, 'Practice link');
    }
    await page.goto(base + '/tu-hoc#chu-de-C05', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(output, 'topic-desktop.png') });
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(base + '/tu-hoc#chu-de-D03', { waitUntil: 'networkidle' });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Expanded mobile fits');
    await page.screenshot({ path: path.join(output, 'topic-mobile.png') });
    await page.setViewportSize({ width: 720, height: 450 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Landscape / 200% reflow fits');
    await page.locator('.footer-nav a[href="/lo-trinh"]').click();
    await page.locator('.footer-nav a[href="/tu-hoc"]').click();
    await page.locator('.km-controls').waitFor({ state: 'visible' });
    check(await page.locator('.km-topic').count() === 43, 'Client navigation returns intact');
    const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    await secure(plain);
    const nojs = await plain.newPage();
    await nojs.goto(base + '/tu-hoc', { waitUntil: 'networkidle' });
    check(await nojs.locator('.km-topic').count() === 43, 'No-JS has all topics');
    await nojs.locator('#chu-de-C05 > summary').click();
    check(await nojs.locator('#chu-de-C05 .km-practice').isVisible(), 'No-JS native disclosure and practice link');
    check(!await nojs.locator('.km-controls').isVisible(), 'No inactive controls without JS');
    check(errors.length === 0, errors.join('\n'));
    check(writes.length === 0, 'No unexpected writes');
    check(assets.length === 0, 'No broken media');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, errors, writes, assets }, null, 2));
    console.log(`PASS knowledge map: ${checks} assertions; screenshots in scratch/knowledge-map-qa`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
