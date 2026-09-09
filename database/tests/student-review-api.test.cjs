const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const id = n => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture() {
  return {
    user: { id: id(1), app_metadata: { role: 'tutor' } }, calls: [],
    tutors: [{ tutor_id: id(1), auth_uid: id(1), status: 'active', is_deleted: false }],
    classes: [{ class_id: id(10), tutor_id: id(1), name: 'Class', class_type: 'Lớp Cơ bản' }],
    students: [{ student_id: id(11), name: 'Student', is_deleted: false }],
    class_students: [{ class_id: id(10), student_id: id(11), status: 'active' }],
    student_reviews: [],
  };
}
function client(state) {
  return {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (name, params) => { state.calls.push({ name, params }); return { data: { review_id: params.p_review_id }, error: state.rpcError || null }; },
    from(table) {
      table=({class_current_state:'classes',class_students_current:'class_students'})[table]??table;
      const filters = []; let single = false, limit = Infinity;
      const chain = {
        select() { return chain; }, eq(k, v) { filters.push(r => r[k] === v); return chain; },
        not(k, op, v) { assert.equal(op, 'is'); filters.push(r => r[k] !== v); return chain; },
        maybeSingle() { single = true; return chain; }, order() { return chain; }, limit(n) { limit = n; return chain; },
        then(resolve, reject) { const rows = (state[table] || []).filter(r => filters.every(f => f(r))).slice(0, limit); return Promise.resolve({ data: single ? rows[0] || null : rows, error: state.queryErrors?.[table] || null }).then(resolve, reject); },
      }; return chain;
    },
  };
}
function loader(state) {
  const cache = new Map();
  function load(file) {
    const filename = path.join(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
    const base = mod.require.bind(mod);
    mod.require = name => {
      if (name === 'next/server') return { NextResponse: { json: (data, options) => Response.json(data, options) } };
      if (name === '@/lib/supabase/server') return { createClient: async () => client(state) };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      return base(name);
    };
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
  }
  return load;
}
const body = (overrides = {}) => ({ review_id: id(100), student_id: id(11), class_id: id(10), expected_updated_at: null, month_year: '2026-09', review_context: 'Buổi 14–18', general_assessment: '', learning_attitude: '', logical_thinking: '', review_status: 'published', tags: [{ tag_id: 'k-arrays', level: 'guided', evidence: 'Observed work', comparison: '', next_step: '', propose_focus: false }], ...overrides });
const request = (payload, origin = 'https://portal.test') => new Request('https://portal.test/api/tutor/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(payload) });
const route = state => loader(state)('app/api/tutor/reviews/route.ts');

test('review POST derives tag snapshots and never accepts caller-supplied ownership/labels', async () => {
  const state = fixture(), api = route(state);
  assert.equal((await api.POST(request(body()))).status, 200);
  const saved = state.calls[0].params;
  assert.equal(saved.p_tags[0].label, 'Mảng & bài toán dãy'); assert.equal(saved.p_tags[0].catalog_version, 1);
  assert.ok(!('p_tutor_id' in saved));
  assert.equal((await api.POST(request(body({ tutor_id: id(2) })))).status, 400);
  assert.equal((await api.POST(request(body({ tags: [{ ...body().tags[0], label: 'Unverified praise' }] })))).status, 400);
  assert.equal(state.calls.length, 1);
});
test('review publishing requires evidence, comparison, level and context; draft permits unfinished content', async () => {
  const state = fixture(), api = route(state);
  for (const payload of [
    body({ review_context: '  ' }), body({ month_year: '2026-13' }), body({ tags: [body().tags[0], body().tags[0]] }),
    body({ tags: [{ ...body().tags[0], evidence: '\n ' }] }), body({ tags: [{ ...body().tags[0], level: '' }] }),
    body({ tags: [{ ...body().tags[0], tag_id: 'r-independent', level: '', comparison: '' }] }),
    body({ tags: [{ ...body().tags[0], propose_focus: true }] }),
    body({ tags: [] }),
  ]) assert.equal((await api.POST(request(payload))).status, 400);
  assert.equal(state.calls.length, 0);
  assert.equal((await api.POST(request(body({ review_status: 'draft', review_context: '', tags: [{ ...body().tags[0], level: '', evidence: '' }] })))).status, 200);
  assert.equal((await api.POST(request(body({ tags: [], review_context: '', general_assessment: 'Text-only review still supported' })))).status, 200);
});
test('review routes reject other tutors, inactive students/enrollments and cross-site writes', async () => {
  for (const change of [s => { s.user = null; }, s => { s.tutors[0].status = 'inactive'; }, s => { s.classes[0].tutor_id = id(2); }, s => { s.class_students[0].status = 'dropped'; }, s => { s.students[0].is_deleted = true; }]) {
    const state = fixture(); change(state); const api = route(state);
    assert.ok([401, 403].includes((await api.POST(request(body()))).status));
    assert.ok([401, 403].includes((await api.GET(new Request(`https://portal.test/api/tutor/reviews?class_id=${id(10)}&student_id=${id(11)}`))).status));
    assert.equal(state.calls.length, 0);
  }
  const state = fixture(); assert.equal((await route(state).POST(request(body(), 'https://unrelated.test'))).status, 403); assert.equal(state.calls.length, 0);
});
test('legacy nullable soft-delete flags do not incorrectly block an active tutor/student', async () => {
  const state = fixture(); state.tutors[0].is_deleted = null; state.students[0].is_deleted = null;
  assert.equal((await route(state).POST(request(body()))).status, 200);
});
test('GET returns only this tutor/student/class history with private no-store response', async () => {
  const state = fixture(); state.student_reviews = [
    { review_id: id(100), tutor_id: id(1), class_id: id(10), student_id: id(11) },
    { review_id: id(101), tutor_id: id(2), class_id: id(10), student_id: id(11) },
    { review_id: id(102), tutor_id: id(1), class_id: id(10), student_id: id(12) },
  ];
  const response = await route(state).GET(new Request(`https://portal.test/api/tutor/reviews?class_id=${id(10)}&student_id=${id(11)}`));
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual((await response.json()).reviews.map(r => r.review_id), [id(100)]);
});
test('DB deployment, authorization, concurrency and transport errors are actionable', async () => {
  for (const [code, status] of [['PGRST202',503],['42703',503],['40001',409],['23505',409],['42501',403],['22023',400],['23514',400],['UNKNOWN',500]]) {
    const state = fixture(); state.rpcError = { code, message: 'Internal details must not leak' };
    const response = await route(state).POST(request(body())); assert.equal(response.status, status); assert.doesNotMatch(JSON.stringify(await response.json()), /Internal details/);
  }
  const state = fixture(); state.queryErrors = { student_reviews: { code: '42703' } };
  assert.equal((await route(state).GET(new Request(`https://portal.test/api/tutor/reviews?class_id=${id(10)}&student_id=${id(11)}`))).status, 503);
  assert.equal((await route(state).POST(new Request('https://portal.test/api/tutor/reviews', { method: 'POST', body: '{invalid' }))).status, 400);
});
