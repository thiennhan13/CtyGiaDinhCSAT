// Called only by the isolated loopback runner. Every API response below is synthetic.
// Browser transport checks do not replace API, database or Supabase Auth integration tests.
const path = require('node:path');

module.exports = async function backendUi({ context, origin, run, check, output }) {
  const pause = () => new Promise(resolve => setTimeout(resolve, 500));
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const widths = [375, 768, 1440];
  async function layout(page, name, width) {
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' no overflow at ' + width);
    await page.screenshot({ path: path.join(output, name + '-' + width + '.png'), fullPage: true });
  }
  for (const width of widths) await run('backend registration retry and stable request ID ' + width, async () => {
    const c = await context(null, { viewport: { width, height: 900 } }), p = await c.newPage();
    try {
      const attempts = [];
      await p.route(origin + '/api/consultations', async route => {
        check(route.request().method() === 'POST', 'Registration explicitly uses POST');
        attempts.push(route.request().postDataJSON()); await pause();
        return json(route, attempts.length < 3 ? 503 : 200, attempts.length < 3 ? { error: 'Lỗi fixture, vui lòng thử lại.' } : { ok: true });
      });
      await p.goto(origin + '/dang-ky-hoc?course=C', { waitUntil: 'networkidle' });
      const form = p.locator('.public-intake form');
      await form.locator('[name=name]').fill('Phụ huynh dữ liệu giả');
      await form.locator('[name=phone]').fill('0912345678');
      await form.locator('[name=message]').fill('Nhu cầu kiểm thử tổng hợp.');
      await form.getByRole('button', { name: 'Kiểm tra thông tin' }).click();
      check(await p.locator('.intake-review').count() === 0, 'Consent required before review');
      await form.locator('[name=consent]').check();
      await form.getByRole('button', { name: 'Kiểm tra thông tin' }).click();
      const review = p.locator('.intake-review'); await review.waitFor();
      check(attempts.length === 0, 'Review never submits automatically');
      check(await review.locator('h3').evaluate(e => e === document.activeElement), 'Review heading receives focus');
      const before = await review.locator('textarea').inputValue();
      for (let i = 0; i < 2; i++) {
        await review.getByRole('button', { name: 'Gửi đăng ký' }).click();
        await review.getByRole('button', { name: 'Đang gửi…' }).waitFor();
        check(await review.getByRole('button', { name: 'Đang gửi…' }).isDisabled(), 'Pending request disables send');
        check(await review.getByRole('button', { name: 'Chỉnh lại' }).isDisabled(), 'Pending request disables edit');
        await review.getByRole('alert').waitFor();
        check(await review.locator('textarea').inputValue() === before, 'Failed submit preserves review');
        if (i === 0) {
          await review.getByRole('button', { name: 'Chỉnh lại' }).click();
          check(await form.locator('[name=phone]').inputValue() === '0912345678', 'Edit preserves phone');
          await form.getByRole('button', { name: 'Kiểm tra thông tin' }).click();
        }
      }
      check(attempts[0].request_id === attempts[1].request_id, 'Unchanged edit and retry preserve idempotency key');
      check(attempts[0].schema_version === 2 && attempts[0].course === 'C' && attempts[0].consent === true, 'Versioned intake has course and consent');
      await review.getByRole('button', { name: 'Chỉnh lại' }).click();
      await form.locator('[name=message]').fill('Nhu cầu kiểm thử đã sửa.');
      await form.getByRole('button', { name: 'Kiểm tra thông tin' }).click();
      await review.getByRole('button', { name: 'Gửi đăng ký' }).click();
      await review.getByRole('status').filter({ hasText: 'CSAT đã tiếp nhận' }).waitFor();
      check(attempts[2].request_id !== attempts[1].request_id, 'Changed payload gets new idempotency key');
      check(await review.getByRole('button', { name: 'Gửi đăng ký' }).count() === 0, 'Success removes send action');
      check(!p.url().includes('0912345678') && !p.url().includes('Nhu'), 'Contact data stays out of navigation URL');
      await layout(p, 'backend-registration', width);
      await review.screenshot({ path: path.join(output, 'backend-registration-review-' + width + '.png') });
    } finally { await c.close(); }
  });
  for (const width of widths) await run('backend parent login and password errors ' + width, async () => {
    const c = await context(null, { viewport: { width, height: 900 } }), p = await c.newPage();
    try {
      let loginRequests = 0;
      const donor = await context('valid'); const loginCookies = await donor.cookies(); await donor.close();
      await p.route(origin + '/api/parents/auth', async route => {
        loginRequests++; const body = route.request().postDataJSON();
        check(body.phone === '0912345678' && body.password === 'Fixture-password-123', 'Login sends synthetic credentials in POST body');
        await pause();
        if (loginRequests === 1) return json(route, 401, { error: 'Thông tin đăng nhập không đúng.' });
        await c.addCookies(loginCookies); return json(route, 200, { ok: true });
      });
      await p.goto(origin + '/login', { waitUntil: 'networkidle' });
      await p.locator('#parent-phone').fill('0912345678');
      const form = p.locator('form').filter({ has: p.locator('#parent-phone') });
      await form.locator('input[type=password]').fill('Fixture-password-123');
      await form.getByRole('button', { name: 'Đăng nhập', exact: true }).focus(); await p.keyboard.press('Enter');
      await form.getByRole('button', { name: 'Đang đăng nhập…' }).waitFor();
      check(await form.getByRole('button', { name: 'Đang đăng nhập…' }).isDisabled(), 'Login pending disabled');
      await form.getByRole('alert').waitFor();
      check(loginRequests === 1 && await form.locator('#parent-phone').inputValue() === '0912345678', 'Failed login retains phone');
      check(!p.url().includes('Fixture') && !p.url().includes('0912345678'), 'Credentials never enter login URL');
      await layout(p, 'backend-login', width);
      await form.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await p.waitForURL(url => url.pathname === '/parents');
      await p.getByText('Học sinh dữ liệu giả', { exact: true }).first().waitFor();
      check(!p.url().includes('Fixture') && !p.url().includes('0912345678'), 'Login success navigates without credentials');
    } finally { await c.close(); }
    const authenticated = await context('valid', { viewport: { width, height: 900 } }), page = await authenticated.newPage();
    try {
      let passwordRequests = 0;
      await page.route(origin + '/api/parents/password', async route => {
        passwordRequests++; const body = route.request().postDataJSON();
        check(body.current_password === 'Fixture-old-123' && body.password === 'Fixture-new-123', 'Password fields sent only in POST body');
        await pause(); if (passwordRequests === 1) return json(route, 400, { error: 'Mật khẩu hiện tại chưa đúng.' });
        await authenticated.clearCookies(); return json(route, 200, { ok: true });
      });
      await page.goto(origin + '/parents/account', { waitUntil: 'networkidle' });
      await page.locator('[name=current_password]').fill('Fixture-old-123');
      await page.locator('[name=password]').fill('Fixture-new-123');
      await page.locator('[name=confirmation]').fill('Fixture-new-123');
      await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
      await page.getByRole('button', { name: 'Đang lưu…' }).waitFor();
      check(await page.getByRole('button', { name: 'Đang lưu…' }).isDisabled(), 'Password pending disabled');
      await page.getByRole('alert').filter({ hasText: 'Mật khẩu hiện tại chưa đúng.' }).waitFor();
      check(await page.locator('[name=password]').inputValue() === 'Fixture-new-123', 'Password validation failure retains fields');
      check(await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).isEnabled(), 'Password error enables retry');
      await layout(page, 'backend-password', width);
      await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/login');
      check(!page.url().includes('Fixture'), 'Successful password flow returns to login without secrets');
    } finally { await authenticated.close(); }
  });
  for (const width of widths) await run('backend admin intake filters and revision conflict ' + width, async () => {
    const c = await context('valid', { viewport: { width, height: 900 } }, 'admin'), p = await c.newPage();
    try {
      const requests = [], row = { request_id: '30000000-0000-4000-8000-000000000001', data: { name: 'Liên hệ dữ liệu giả', phone: '0912345678', role: 'parent', course: 'K', level: 'thcs', message: 'Nhu cầu kiểm thử.', source_path: '/dang-ky-hoc' }, status: 'new', revision: 1, created_at: '2026-10-13T01:00:00Z', consultation_status_history: [] };
      let writes = 0;
      await p.route(origin + '/api/admin/consultations**', async route => {
        const request = route.request();
        if (request.method() === 'GET') { requests.push(new URL(request.url()).searchParams); return json(route, 200, { data: [row], total: 1, newCount: 1, contactedCount: 0, completedCount: 0 }); }
        const body = request.postDataJSON(); writes++; check(body.revision === 1 && body.status === 'contacted', 'Status mutation carries known revision');
        await pause(); if (writes === 1) return json(route, 409, { error: 'Đơn đã thay đổi. Hãy tải lại.' });
        row.status = 'contacted'; row.revision = 2; return json(route, 200, { ok: true });
      });
      await p.goto(origin + '/admin/consultations', { waitUntil: 'networkidle' });
      await p.getByRole('heading', { name: 'Liên hệ dữ liệu giả' }).waitFor();
      await p.getByRole('combobox').nth(0).selectOption('new');
      await Promise.all([p.waitForResponse(r => r.url().includes('/api/admin/consultations?') && r.url().includes('course=K')), p.getByRole('combobox').nth(1).selectOption('K')]);
      check(requests.some(q => q.get('status') === 'new' && q.get('course') === 'K'), 'Status and course filters reach list API');
      await p.getByLabel('Tên hoặc số điện thoại').fill('Nguyễn An');
      await Promise.all([p.waitForResponse(r => r.url().includes('/api/admin/consultations?') && new URL(r.url()).searchParams.get('q') === 'Nguyễn An'), p.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()]);
      await p.getByLabel('Nguồn gửi', { exact: true }).selectOption('enrollment');
      await p.getByLabel('Từ ngày', { exact: true }).fill('2026-10-01');
      await Promise.all([p.waitForResponse(r => r.url().includes('to=2026-10-14')), p.getByLabel('Đến ngày', { exact: true }).fill('2026-10-14')]);
      check(requests.some(q => q.get('source') === 'enrollment' && q.get('from') === '2026-10-01' && q.get('to') === '2026-10-14'), 'Source and inclusive day filters reach API');
      await layout(p, 'backend-admin-intake', width);
      await p.getByRole('button', { name: 'Xem đơn của Liên hệ dữ liệu giả' }).click();
      const status = p.getByLabel('Trạng thái của Liên hệ dữ liệu giả');
      await status.selectOption('contacted'); await p.getByRole('button', { name: 'Lưu trạng thái' }).click(); check(await status.isDisabled(), 'Status write blocks duplicate changes');
      await p.getByRole('alert').filter({ hasText: 'Đơn đã thay đổi.' }).waitFor(); check(await p.getByRole('button', { name: 'Lưu trạng thái' }).count() === 0, 'Conflict requires refresh before another write');
      await p.getByRole('button', { name: 'Tải lại thông tin đơn' }).click(); await status.waitFor();
      await status.selectOption('contacted'); await p.getByRole('button', { name: 'Lưu trạng thái' }).click(); await p.getByRole('status').filter({ hasText: 'Đã cập nhật' }).waitFor();
      await p.getByRole('dialog').waitFor({ state: 'hidden' });
      check(await p.getByRole('button', { name: 'Trang sau' }).isDisabled(), 'Single result disables next page');
      await p.getByRole('button', { name: 'Xem đơn của Liên hệ dữ liệu giả' }).click();
      check(await status.inputValue() === 'contacted', 'Successful update reloads server status');
      await p.getByText('Nguồn và lịch sử xử lý', { exact: true }).click();
      check(await p.getByText('Hồ sơ cũ chưa ghi nhận trường đồng ý lưu thông tin.', { exact: true }).isVisible(), 'Legacy intake never invents recorded consent');
      check(!p.url().includes('0912345678'), 'List URL does not carry contact data');
      await layout(p, 'backend-admin-intake-detail', width);
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'hidden' });
      check(await p.getByRole('button', { name: 'Xem đơn của Liên hệ dữ liệu giả' }).evaluate(e => e === document.activeElement), 'Closing detail restores keyboard focus');
    } finally { await c.close(); }
  });
  for (const width of widths) await run('backend admin program mapping and conflict ' + width, async () => {
    const c = await context('valid', { viewport: { width, height: 900 } }, 'admin'), p = await c.newPage();
    try {
      const classId = '30000000-0000-4000-8000-000000000020';
      const row = { class_id: classId, name: 'Lớp dữ liệu giả', program_code: 'AB', program_revision: 0, status: 'active', tutors: { name: 'Gia sư giả' }, csat_fee_per_session: 0 };
      const mockOrigin = 'http://127.0.0.1:' + (process.env.PARENT_TOPICS_QA_RPC_PORT || '54329');
      await p.route(mockOrigin + '/rest/v1/**', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/rest/v1/class_current_state') return json(route, 200, row);
        if (['class_students_current', 'students', 'tutors', 'sessions', 'rpc/admin_class_history'].some(suffix => url.pathname === '/rest/v1/' + suffix)) return json(route, 200, []);
        throw Error('Unexpected program fixture request: ' + url.pathname);
      });
      let writes = 0;
      await p.route(origin + '/api/admin/classes', async route => {
        const body = route.request().postDataJSON(); writes++;
        check(body.action === 'set_program' && body.class_id === classId && body.code === 'K' && body.revision === 0 && body.reason === 'Lý do dữ liệu giả', 'Program mutation carries explicit code, revision and reason');
        await pause(); if (writes === 1) return json(route, 409, { error: 'Phân loại đã thay đổi. Hãy tải lại.' });
        row.program_code = 'K'; row.program_revision = 1; return json(route, 200, { ok: true });
      });
      await p.goto(origin + '/admin/classes/' + classId, { waitUntil: 'networkidle' });
      await p.getByRole('button', { name: 'Đổi phân loại' }).click();
      const section = p.locator('section').filter({ has: p.getByRole('button', { name: 'Đổi phân loại' }) });
      await section.getByRole('combobox').waitFor();
      check((await section.getByRole('combobox').locator('option').allTextContents()).join('|').includes('PreVOI'), 'PreVOI remains separate from E');
      check(await section.getByRole('combobox').locator('option').count() === 8, 'Explicit A/B/AB/C/E/PREVOI/K plus placeholder');
      await section.getByRole('combobox').selectOption('K');
      await section.getByLabel('Lý do', { exact: true }).fill('Lý do dữ liệu giả');
      check(await section.getByRole('button', { name: 'Xác nhận thay đổi' }).isDisabled(), 'Explicit confirmation required');
      await section.getByRole('checkbox').check();
      await section.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
      await section.getByRole('button', { name: 'Đang lưu…' }).waitFor();
      check(await section.getByRole('button', { name: 'Đang lưu…' }).isDisabled(), 'Pending program change blocked');
      await section.getByRole('alert').waitFor();
      check(await section.getByRole('combobox').inputValue() === 'K', 'Conflict retains selected program');
      await layout(p, 'backend-admin-program', width);
      await section.getByRole('button', { name: 'Xác nhận thay đổi' }).click();
      await p.getByRole('heading', { name: 'Chương trình: K · Kèm riêng / tùy chỉnh' }).waitFor();
      check(await p.getByRole('button', { name: 'Xác nhận thay đổi' }).count() === 0, 'Successful update exits editor');
    } finally { await c.close(); }
  });
};
