const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const master = read('database/tests/fixtures/schema-before-accounting.sql');
const migration = read('database/migrations/20260907_04_student_review_tags.sql');
const catalog = JSON.parse(read('lib/review-tag-catalog.json'));
const id = n => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = n => require('node:crypto').createHash('sha256').update(String(n)).digest('hex');
const rpc = 'select public.save_student_review($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)';
function tag(tag_id = 'k-arrays', changes = {}) {
  const definition = catalog.tags.find(item => item.id === tag_id);
  return { tag_id, label: definition.label, group: definition.group, catalog_version: 1,
    level: ['knowledge', 'skill'].includes(definition.group) ? 'guided' : '',
    evidence: 'Observed work', comparison: definition.group === 'progress' ? 'Previous observation' : '',
    next_step: '', propose_focus: false, ...changes };
}
const args = (changes = {}) => {
  const p = { review: 100, student: 11, class: 10, expected: null, month: '2026-09', context: 'Buổi 14–18', general: '', attitude: '', logical: '', status: 'draft', tags: [tag()], ...changes };
  return [id(p.review), id(p.student), id(p.class), p.expected, p.month, p.context, p.general, p.attitude, p.logical, p.status, JSON.stringify(p.tags)];
};
async function scalar(db, sql, values = []) { return Object.values((await db.query(sql, values)).rows[0])[0]; }
async function role(db, who) {
  await db.exec('reset role');
  const jwt = who === 'service' ? { role: 'service_role' } : who === 'anon' ? { role: 'anon' } : { role: 'authenticated', sub: id(who), app_metadata: { role: who === 900 ? 'admin' : 'tutor' } };
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify(jwt)]);
  await db.exec('set role ' + (who === 'service' ? 'service_role' : who === 'anon' ? 'anon' : 'authenticated'));
}
async function denied(db, sql, values, code = '42501') {
  await db.exec('savepoint denial'); let failure;
  try { await db.query(sql, values); } catch (error) { failure = error; }
  await db.exec('rollback to savepoint denial; release savepoint denial');
  assert.ok(failure, 'Expected rejection'); assert.equal(failure.code, code, failure.message);
}
async function setup(upgrade) {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,phone text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on all functions in schema auth to authenticated,anon,service_role;
    create function public.uuid_generate_v4() returns uuid language sql volatile as $$select gen_random_uuid()$$;
    insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(900)}');`);
  await db.exec((upgrade ? master.split('-- Integrated migration: 20260907_04_student_review_tags')[0] : master).replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', ''));
  await db.exec(`insert into tutors(tutor_id,auth_uid,name) values('${id(1)}','${id(1)}','Tutor A'),('${id(2)}','${id(2)}','Tutor B');
    insert into students(student_id,name) values('${id(11)}','Child A'),('${id(12)}','Former child'),('${id(13)}','Other family'),('${id(14)}','Child B');
    insert into classes(class_id,tutor_id,name) values('${id(10)}','${id(1)}','A'),('${id(20)}','${id(2)}','B');
    insert into class_students(class_id,student_id,status) values('${id(10)}','${id(11)}','active'),('${id(10)}','${id(12)}','dropped'),('${id(20)}','${id(13)}','active'),('${id(10)}','${id(14)}','active');
    insert into student_reviews(review_id,student_id,tutor_id,class_id,general_assessment,created_at) values('${id(90)}','${id(11)}','${id(1)}','${id(10)}','Legacy feedback','2025-02-12T01:00:00Z');
    insert into parent_accounts(parent_id,display_name,phone) values('${id(50)}','Parent A','+84912345678'),('${id(51)}','Parent B','+84912345679');
    insert into parent_student_links(parent_id,student_id) values('${id(50)}','${id(11)}'),('${id(51)}','${id(13)}');`);
  if (upgrade) await db.exec(migration);
  await db.exec(read('database/verification/student_review_tags_20260907.sql'));
  return db;
}

for (const upgrade of [false, true]) test(`Review tags ${upgrade ? 'upgrade' : 'historical 04 baseline'}`, async t => {
  const db = await setup(upgrade);
  async function check(name, fn) {
    await t.test(name, async () => {
      await db.exec('reset role; begin');
      try { await role(db, 1); await fn(); } finally { await db.exec('rollback; reset role'); }
    });
  }
  try {
    await check('legacy reviews remain published, with original text', async () => {
      const review = await scalar(db, 'select to_jsonb(r) from student_reviews r where review_id=$1', [id(90)]);
      assert.equal(review.general_assessment, 'Legacy feedback'); assert.equal(review.review_status, 'published'); assert.deepEqual(review.review_tags, []);
      assert.equal(review.updated_at, review.created_at);
      if (upgrade) assert.equal(new Date(review.updated_at).toISOString(), '2025-02-12T01:00:00.000Z');
    });
    await check('all 64 canonical tags validate; malformed and forged snapshots fail', async () => {
      assert.equal(await scalar(db, 'select valid_student_review_tags($1::jsonb,$2)', [JSON.stringify(catalog.tags.map(item => tag(item.id))), 'published']), true);
      for (const invalid of [[tag('k-arrays', { label: 'Invented praise' })], [tag(), tag()], [tag('k-arrays', { catalog_version: 2 })], [tag('k-arrays', { evidence: '\n\t ' })], [tag('k-arrays', { level: '' })], [tag('k-arrays', { propose_focus: true })], [tag('r-independent', { comparison: '' })], [tag('p-logic', { level: 'independent' })], [tag('p-logic', { propose_focus: true, next_step: 'Practice' })], [tag('k-arrays', { extra: 'unexpected' })], null, {}, [1]]) {
        assert.equal(await scalar(db, 'select valid_student_review_tags($1::jsonb,$2)', [JSON.stringify(invalid), 'published']), false, JSON.stringify(invalid));
      }
      await denied(db, 'insert into student_reviews(student_id,tutor_id,class_id,review_context,review_tags) values($1,$2,$3,$4,$5::jsonb)', [id(11),id(1),id(10),'Context',JSON.stringify([tag('k-arrays', { evidence: '' })])], '23514');
    });
    await check('private partial draft can resume and publish; parents see only completed publication', async () => {
      const draft = await scalar(db, rpc, args({ tags: [tag('k-arrays', { level: '', evidence: '' })], context: '' }));
      assert.equal(draft.review_status, 'draft');
      await role(db, 2); assert.equal(await scalar(db, 'select count(*) from student_reviews where review_id=$1', [id(100)]), 0);
      await role(db, 'service');
      assert.equal(await scalar(db, 'select start_parent_lookup($1,$2,$3)', ['+84912345678',hash(1),hash(2)]), 'ok');
      let portal = await scalar(db, 'select get_parent_lookup($1,$2)', [hash(1),id(11)]);
      assert.equal(portal.reviews.length, 1); assert.equal(portal.reviews[0].general_assessment, 'Legacy feedback');
      await role(db, 1);
      const published = await scalar(db, rpc, args({ expected: draft.updated_at, status: 'published', tags: [tag(),tag('p-counterexample'),tag('r-independent')] }));
      assert.equal(published.review_status, 'published');
      await role(db, 'service'); portal = await scalar(db, 'select get_parent_lookup($1,$2)', [hash(1),id(11)]);
      assert.equal(portal.reviews[0].review_id, id(100)); assert.equal(portal.reviews[0].review_tags.length, 3);
      assert.equal(portal.reviews[0].review_context, 'Buổi 14–18');
      await denied(db, 'select get_parent_lookup($1,$2)', [hash(1),id(13)]);
    });
    await check('retry is idempotent; stale edits and modifying published feedback are rejected', async () => {
      const first = await scalar(db, rpc, args());
      assert.equal((await scalar(db, rpc, args())).updated_at, first.updated_at);
      const second = await scalar(db, rpc, args({ expected: first.updated_at, general: 'Updated' }));
      await denied(db, rpc, args({ expected: first.updated_at, general: 'Stale overwrite' }), '40001');
      const sentArgs = args({ expected: second.updated_at, general: 'Updated', status: 'published' });
      const sent = await scalar(db, rpc, sentArgs);
      assert.equal((await scalar(db, rpc, sentArgs)).updated_at, sent.updated_at);
      assert.equal(await scalar(db, 'select count(*) from student_reviews where review_id=$1', [id(100)]), 1);
      await denied(db, rpc, args({ expected: sent.updated_at, status: 'published', general: 'Overwrite' }), '23505');
      assert.equal((await db.query("update student_reviews set general_assessment='Overwrite' where review_id=$1 returning review_id", [id(100)])).rows.length, 0);
      assert.equal((await db.query('delete from student_reviews where review_id=$1 returning review_id', [id(100)])).rows.length, 0);
    });
    await check('class/student ownership, active enrollment and disabled tutor enforced in database', async () => {
      for (const change of [{class:20,student:13},{student:13},{student:12}]) await denied(db,rpc,args(change));
      await scalar(db,rpc,args());
      await denied(db,rpc,args({student:14}));
      await role(db,2); await denied(db,rpc,args());
      await db.exec('reset role'); await db.query("update tutors set status='inactive' where tutor_id=$1",[id(1)]);
      await role(db,1); await denied(db,rpc,args());
    });
    await check('draft identity cannot be moved; direct writes cannot reveal an incomplete review', async () => {
      await scalar(db,rpc,args({tags:[tag('k-arrays',{level:'',evidence:''})],context:''}));
      await denied(db,'update student_reviews set student_id=$1 where review_id=$2',[id(14),id(100)]);
      await denied(db,"update student_reviews set review_status='published' where review_id=$1",[id(100)],'23514');
      await denied(db,rpc,args({review:101,status:'published',context:'\n\t '}),'22023');
    });
    await check('anon and service cannot impersonate tutor RPC', async () => {
      for (const actor of ['anon','service']) { await role(db,actor); await denied(db,rpc,args()); }
    });
    await db.exec('reset role');
    const before = (await db.query('select to_jsonb(r) as data from student_reviews r order by review_id')).rows;
    await db.exec(migration);
    assert.deepEqual((await db.query('select to_jsonb(r) as data from student_reviews r order by review_id')).rows, before, 'Reapplying migration preserves existing rows');
  } finally { await db.close(); }
});
