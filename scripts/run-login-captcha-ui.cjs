// Node 24 + completed fixture build. Real Cloudflare, Supabase and email are never called.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:3198';
const output = path.join(root, 'scratch/login-captcha-qa');
const secret = 'synthetic-captcha-secret';
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-qa-anon-placeholder', SUPABASE_SERVICE_ROLE_KEY: 'local-qa-service-placeholder', APP_ORIGIN: origin, CONSULTATIONS_ENABLED: 'false', CONSULTATIONS_EMAIL_ENABLED: 'false', TURNSTILE_LOGIN_ENABLED: 'true', TURNSTILE_SITE_KEY: 'synthetic-sitekey', TURNSTILE_SECRET_KEY: secret, NEXT_TELEMETRY_DISABLED: '1' };
const widgetScript = `(() => {
 let serial=0; const widgets=new Map();
 window.turnstile={ready(){throw Error('Turnstile.ready is incompatible with async/defer');},render(container,options){
  const id=String(++serial),box=document.createElement('div');box.dataset.fixtureWidget=options.action;
  box.style.cssText='border:1px solid #aaa;padding:12px;box-sizing:border-box;width:'+(options.size==='compact'?'150px':'100%');
  const solve=document.createElement('button');solve.type='button';solve.textContent='Xác minh thử nghiệm';solve.onclick=()=>options.callback('fixture-'+options.action+'-'+id);
  const expire=document.createElement('button');expire.type='button';expire.textContent='Hết hạn thử nghiệm';expire.onclick=()=>options['expired-callback']();
  const error=document.createElement('button');error.type='button';error.textContent='Lỗi Cloudflare thử nghiệm';error.onclick=()=>options['error-callback']('200500');
  const unsafe=document.createElement('button');unsafe.type='button';unsafe.textContent='Lỗi không hợp lệ thử nghiệm';unsafe.onclick=()=>options['error-callback']('private-payload@example.test');
  const timeout=document.createElement('button');timeout.type='button';timeout.textContent='Quá hạn thử nghiệm';timeout.onclick=()=>options['timeout-callback']();
  box.append(solve,expire,error,unsafe,timeout);container.append(box);widgets.set(id,box);return id;
 },remove(id){widgets.get(id)?.remove();widgets.delete(id);}};
})();`;

async function main() {
  await fs.mkdir(output, { recursive: true });
  try { await fetch(origin); throw Error('QA port already in use; refusing to test an unknown server.'); } catch (error) { if (error.message.startsWith('QA port')) throw error; }
  const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3198'], { cwd: root, env, windowsHide: true, stdio: 'ignore' });
  let browser, assertions = 0;
  const check = (value, message) => { assertions++; assert.ok(value, message); };
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { if ((await fetch(origin + '/login')).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 500)); }
    check(ready, 'Preview started');
    browser = await chromium.launch({ headless: true, channel: process.env.CSAT_BROWSER_CHANNEL || 'msedge' });
    async function context(failFirst = false, javaScriptEnabled = true, rateLimited = false) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled });
      const activity = { scripts: 0, posts: [], errors: [], unexpected: [], logs: [] };
      c.on('page', p => {
        p.on('pageerror', e => activity.errors.push(e.message));
        p.on('console', message => { if (message.text().startsWith('[CSAT Turnstile]')) activity.logs.push(message.text()); });
      });
      await c.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.href === 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit') {
          activity.scripts++;
          if (failFirst && activity.scripts === 1) return route.abort();
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: widgetScript });
        }
        if (url.origin !== origin) { activity.unexpected.push(url.origin); return route.abort(); }
        if (['/api/auth/login', '/api/parents/auth'].includes(url.pathname) && request.method() === 'POST') {
          activity.posts.push({ path: url.pathname, data: request.postDataJSON() });
          return route.fulfill({ status: rateLimited ? 429 : 401, headers: rateLimited ? { 'Retry-After': '900' } : {}, json: { error: rateLimited ? 'Đã vượt quá số lượt đăng nhập cho phép với thông tin hoặc mạng đang sử dụng. Vui lòng chờ 15 phút rồi thử lại. Nếu cần hỗ trợ, hãy liên hệ CSAT.' : 'Đăng nhập thử nghiệm bị từ chối.' } });
        }
        if (!['GET', 'HEAD'].includes(request.method())) { activity.unexpected.push(url.pathname); return route.abort(); }
        return route.continue();
      });
      return { c, activity, p: await c.newPage() };
    }
    const { c, p, activity } = await context();
    for (const pathname of ['/', '/dang-ky-hoc', '/lo-trinh/a']) {
      await p.goto(origin + pathname, { waitUntil: 'networkidle' });
      check(activity.scripts === 0, 'No CAPTCHA script outside login');
      check(await p.locator('[data-login-captcha]').count() === 0, 'No widget outside login');
    }
    const response = await p.goto(origin + '/login', { waitUntil: 'networkidle' });
    check(!((await response.text()).includes(secret)), 'Secret never serialized');
    check(response.headers()['content-security-policy-report-only'].includes('frame-src https://challenges.cloudflare.com'), 'CSP permits challenge iframe');
    const parent = p.locator('#entry-parent');
    await parent.locator('#parent-phone').fill('0912345678');
    check(await parent.getByRole('button', { name: 'Đăng nhập', exact: true }).isDisabled(), 'Requires token');
    await parent.getByRole('button', { name: 'Xác minh thử nghiệm' }).click();
    await parent.getByRole('button', { name: 'Hết hạn thử nghiệm' }).click();
    check(await parent.getByRole('button', { name: 'Đăng nhập', exact: true }).isDisabled(), 'Expired token cleared');
    await parent.getByRole('button', { name: 'Xác minh thử nghiệm' }).click();
    await parent.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await parent.getByRole('alert').waitFor();
    check(activity.posts.length === 1 && activity.posts[0].data.captchaToken.startsWith('fixture-parent_login-'), 'Parent sends action token');
    check(await parent.locator('#parent-phone').inputValue() === '0912345678', 'Phone survives failed login');
    check(await parent.getByRole('button', { name: 'Đăng nhập', exact: true }).isDisabled(), 'Used token reset for retry');
    await p.getByRole('radio', { name: 'Gia sư / Admin', exact: true }).check();
    const staff = p.locator('#entry-tutor');
    await staff.getByRole('button', { name: 'Xác minh thử nghiệm' }).waitFor();
    check(await p.locator('[data-fixture-widget]').count() === 1, 'Only visible form has widget');
    check(activity.scripts === 1, 'Script reused between roles');
    await staff.locator('#tutor-email').fill('tutor@example.test'); await staff.locator('#tutor-password').fill('synthetic-password');
    await staff.getByRole('button', { name: 'Xác minh thử nghiệm' }).click();
    await staff.getByRole('button', { name: 'Đăng nhập hệ thống' }).click(); await staff.getByRole('alert').waitFor();
    check(activity.posts[1].data.captchaToken.startsWith('fixture-staff_login-'), 'Staff sends different action token');
    check(await staff.locator('#tutor-email').inputValue() === 'tutor@example.test', 'Email survives failed login');
    await staff.getByRole('button', { name: 'Xác minh thử nghiệm', exact: true }).click();
    await staff.getByRole('button', { name: 'Lỗi Cloudflare thử nghiệm', exact: true }).click();
    await staff.getByRole('status').filter({ hasText: 'CF-200500' }).waitFor();
    check(await staff.getByRole('button', { name: 'Đăng nhập hệ thống' }).isDisabled(), 'Widget error clears previous valid token');
    await staff.getByRole('button', { name: 'Lỗi Cloudflare thử nghiệm', exact: true }).click();
    check(activity.logs.filter(line => line.includes('CF-200500')).length === 1, 'Repeated error logged once per attempt');
    check(activity.logs.some(line => line.includes('staff_login')), 'Safe log identifies login form');
    await staff.getByRole('button', { name: 'Lỗi không hợp lệ thử nghiệm', exact: true }).click();
    await staff.getByRole('status').filter({ hasText: 'CSAT-WIDGET' }).waitFor();
    check(!activity.logs.join('\n').includes('private-payload') && !(await staff.textContent()).includes('private-payload'), 'Arbitrary callback payload never reaches logs or UI');
    check(!activity.logs.join('\n').includes('tutor@example.test') && !activity.logs.join('\n').includes('synthetic-password') && !activity.logs.join('\n').includes('fixture-staff_login'), 'No credentials or token logged');
    await staff.getByRole('button', { name: 'Quá hạn thử nghiệm', exact: true }).click();
    await staff.getByRole('status').filter({ hasText: 'CSAT-TIMEOUT' }).waitFor();
    check(activity.logs.some(line => line.includes('CSAT-TIMEOUT')), 'Timeout has distinct application support code');
    for (const width of [320, 375, 768, 1440]) {
      await p.setViewportSize({ width, height: 1000 }); await p.waitForTimeout(150);
      await staff.getByRole('button', { name: 'Lỗi Cloudflare thử nghiệm', exact: true }).click();
      await staff.getByRole('status').filter({ hasText: 'CF-200500' }).waitFor();
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No overflow at ' + width);
      await p.screenshot({ path: path.join(output, 'login-' + width + '.png'), fullPage: true });
    }
    await staff.getByRole('button', { name: 'Thử lại xác minh' }).click();
    check(!(await staff.textContent()).includes('CF-200500'), 'Retry clears old support code');
    check(await staff.locator('#tutor-email').inputValue() === 'tutor@example.test', 'Widget retry retains email');
    await staff.getByRole('button', { name: 'Xác minh thử nghiệm', exact: true }).click();
    check(await staff.getByRole('button', { name: 'Đăng nhập hệ thống' }).isEnabled(), 'Successful retry enables login');
    await p.getByRole('radio', { name: 'Phụ huynh', exact: true }).check();
    check(await parent.locator('#parent-phone').inputValue() === '0912345678', 'Role switch retains input');
    check(await parent.getByRole('button', { name: 'Đăng nhập', exact: true }).isDisabled(), 'Role switch discards old verification');
    check(activity.errors.length === 0 && activity.unexpected.length === 0, 'No browser errors or unmocked network');
    await c.close();
    const retry = await context(true);
    await retry.p.goto(origin + '/login', { waitUntil: 'networkidle' });
    await retry.p.getByRole('status').filter({ hasText: 'CSAT-LOAD' }).waitFor();
    check(retry.activity.logs.some(line => line.includes('CSAT-LOAD')), 'Script loading failure has safe application code');
    await retry.p.getByRole('button', { name: 'Thử lại xác minh' }).click();
    await retry.p.getByRole('button', { name: 'Xác minh thử nghiệm' }).waitFor();
    check(retry.activity.scripts === 2, 'Failed script can be retried');
    check(retry.activity.posts.length === 0, 'Script failure cannot submit login');
    await retry.c.close();
    const limited = await context(false, true, true);
    await limited.p.goto(origin + '/login', { waitUntil: 'networkidle' });
    await limited.p.setViewportSize({ width: 320, height: 900 });
    for (const role of ['Phụ huynh', 'Gia sư / Admin']) {
      await limited.p.getByRole('radio', { name: role, exact: true }).check();
      const form = limited.p.locator(role === 'Phụ huynh' ? '#entry-parent' : '#entry-tutor');
      if (role === 'Phụ huynh') await form.locator('#parent-phone').fill('0912345678');
      else { await form.locator('#tutor-email').fill('tutor@example.test'); await form.locator('#tutor-password').fill('synthetic-password'); }
      await form.getByRole('button', { name: 'Xác minh thử nghiệm', exact: true }).click();
      await form.getByRole('button', { name: role === 'Phụ huynh' ? 'Đăng nhập' : 'Đăng nhập hệ thống', exact: true }).click();
      await form.getByRole('alert').filter({ hasText: 'Đã vượt quá' }).waitFor();
      check((await form.getByRole('alert').textContent()).includes('15 phút'), '429 shows reason and waiting time for '+role);
      check(await limited.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '429 message wraps at 320px');
      check(await form.getByRole('button', { name: role === 'Phụ huynh' ? 'Đăng nhập' : 'Đăng nhập hệ thống', exact: true }).isDisabled(), '429 resets CAPTCHA');
      await limited.p.screenshot({ path: path.join(output, role === 'Phụ huynh' ? 'rate-limit-parent.png' : 'rate-limit-tutor.png'), fullPage: true });
    }
    check(limited.activity.posts.length === 2, 'No automatic login retry after 429');
    await limited.c.close();
    const nojs = await context(false, false);
    await nojs.p.goto(origin + '/login', { waitUntil: 'networkidle' });
    check(!await nojs.p.locator('.contact-entry-forms').isVisible(), 'No-JS uses contact fallback');
    check(await nojs.p.locator('.contact-entry-help a').isVisible(), 'Support link available without JS');
    check(nojs.activity.scripts === 0, 'No CAPTCHA without JS'); await nojs.c.close();
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, assertions, runtime: process.version, browser: browser.version(), scope: 'Synthetic widget/API fixtures; real Cloudflare verification pending.' }, null, 2));
    console.log('Login CAPTCHA Edge QA passed: ' + assertions + ' assertions. Synthetic data only.');
  } finally { await browser?.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
