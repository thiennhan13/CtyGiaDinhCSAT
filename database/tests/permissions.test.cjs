const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n');
const legacy = read('fixtures/schema-before-permissions.sql');
const master = read('../CSAT_master_schema.sql');
const migration = read('../migrations/20260905_01_harden_permissions.sql');
const verification = read('../verification/20260905_permissions.sql');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const tables = ['students','tutors','classes','class_students','sessions','session_attendance','payments','announcements','student_reviews','class_change_log'];
const rpcSignatures = [
  'is_admin()', 'current_tutor_id()',
  'create_class_full(character varying,character varying,uuid,numeric,date,date,jsonb,jsonb)',
  'change_tutor_safe(uuid,uuid,date,text,text)', 'update_csat_fee_safe(uuid,numeric,date,text,text)',
  'take_attendance_safe(uuid,jsonb)', 'rollback_billing_partial(text)', 'get_unique_billing_periods()',
];
const tutorClaims = {role:'authenticated', sub:id(1001), app_metadata:{role:'tutor'}};
const adminClaims = {role:'authenticated', sub:id(1000), app_metadata:{role:'admin'}};
async function claims(db, value, role='authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(value)]);
  await db.exec(`set role ${role}`);
}
async function rows(db, sql, params=[]) { return (await db.query(sql, params)).rows; }
async function scalar(db, sql, params=[]) { return Object.values((await rows(db, sql, params))[0])[0]; }
async function denied(db, sql, params=[], expected=/42501|P0001|22023|22P02|P0002/) {
  await db.exec('savepoint expected_denial');
  let error;
  try { await db.query(sql, params); } catch (e) { error=e; }
  await db.exec('rollback to savepoint expected_denial');
  await db.exec('release savepoint expected_denial');
  assert.ok(error, `Expected permission/validation rejection: ${sql}`);
  assert.match(error.code, expected, error.message);
}
async function setup(schema) {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on all functions in schema auth to authenticated,anon,service_role;
    create function public.uuid_generate_v4() returns uuid language sql volatile as $$ select gen_random_uuid() $$;
    insert into auth.users values('${id(1000)}','admin@example.test','{"role":"admin"}','{}');`);
  // Only adapt Supabase auth infrastructure and uuid-ossp; application SQL is unchanged.
  await db.exec(schema.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', ''));
  await claims(db, {role:'service_role'}, 'service_role');
  await db.exec(`insert into tutors(tutor_id,auth_uid,name) values
    ('${id(1)}','${id(1001)}','Tutor A'),('${id(2)}','${id(1002)}','Tutor B');
    insert into students(student_id,name) values('${id(11)}','A'),('${id(12)}','B'),('${id(13)}','Outside');
    insert into classes(class_id,tutor_id,name,csat_fee_per_session) values
    ('${id(10)}','${id(1)}','Class A',30000),('${id(20)}','${id(2)}','Class B',40000);
    insert into class_students(class_id,student_id,tuition_fee_per_session) values
    ('${id(10)}','${id(11)}',100000),('${id(10)}','${id(12)}',150000),('${id(20)}','${id(13)}',200000);
    insert into sessions(session_id,class_id,date,start_time,end_time,status,csat_fee_snapshot,tutor_id_snapshot) values
    ('${id(100)}','${id(10)}','2026-08-01','18:00','19:00','completed',30000,'${id(1)}'),
    ('${id(101)}','${id(10)}','2026-08-02','18:00','19:00','scheduled',30000,'${id(1)}'),
    ('${id(102)}','${id(20)}','2026-08-02','18:00','19:00','scheduled',40000,'${id(2)}');
    insert into session_attendance(session_id,student_id,status,tuition_fee_snapshot) values
    ('${id(100)}','${id(11)}','attended',100000);
    insert into payments(student_id,class_id,billing_period,amount,status) values
    ('${id(11)}','${id(10)}','2026-07',100000,'paid');`);
  await db.exec('reset role');
  return db;
}
async function businessData(db) {
  const snapshot={};
  for (const table of tables) snapshot[table]=await rows(db, `select row_to_json(t)::text as data from public.${table} t order by row_to_json(t)::text`);
  return snapshot;
}
function attendance(student=11, status='absent', fee=1) {
  return [id(100), JSON.stringify([{student_id:id(student),status,tuition_fee_snapshot:fee}])];
}
const attendanceSQL = 'select public.take_attendance_safe($1,$2::jsonb)';
async function suite(t, db) {
  const verified = await rows(db, verification);
  assert.equal(verified.length, 9);
  assert.ok(verified.every(row => row.passed), JSON.stringify(verified));
  async function check(name, run) {
    await t.test(name, async()=>{
      await db.exec('reset role; begin');
      try { await claims(db, tutorClaims); await run(); }
      finally { await db.exec('rollback; reset role'); }
    });
  }
  await check('missing claims, editable metadata and email never grant admin', async()=>{
    for (const value of [{}, {role:'authenticated'}, {...tutorClaims,app_metadata:{}},
      {...tutorClaims,app_metadata:{},user_metadata:{role:'admin'}},
      {...tutorClaims,app_metadata:{},email:'csattutor@gmail.com'},
      {role:'authenticated',app_metadata:{role:'admin'}}]) {
      await claims(db,value);
      assert.equal(await scalar(db,'select public.is_admin()'),false);
      await denied(db,"select public.create_class_full('Forbidden','Basic',$1,0,null,null,'[]','[]')",[id(1)]);
    }
  });
  await check('anonymous callers have no RPC execute, table or truncate privileges', async()=>{
    await claims(db,{role:'anon'},'anon');
    for (const signature of rpcSignatures) assert.equal(await scalar(db,"select has_function_privilege('anon',$1,'execute')",[`public.${signature}`]),false,signature);
    for (const table of tables) {
      assert.equal(await scalar(db,"select has_table_privilege('anon',$1,'select,insert,update,delete,truncate')",[`public.${table}`]),false,table);
      assert.equal(await scalar(db,"select has_table_privilege('authenticated',$1,'truncate')",[`public.${table}`]),false,table);
    }
    await denied(db,attendanceSQL,attendance());
    await denied(db,'select * from public.students');
    await denied(db,'truncate public.sessions cascade');
  });
  await check('every privileged admin RPC rejects a tutor', async()=>{
    await denied(db,"select public.change_tutor_safe($1,$2,'2026-09-01','test')",[id(10),id(2)]);
    await denied(db,"select public.update_csat_fee_safe($1,1,'2026-09-01','test')",[id(10)]);
    await denied(db,"select public.rollback_billing_partial('2026-07')");
    await denied(db,'select * from public.get_unique_billing_periods()');
  });
  await check('admin and service role retain admin RPC access', async()=>{
    for (const [jwt,role] of [[adminClaims,'authenticated'],[{role:'service_role'},'service_role']]) {
      await claims(db,jwt,role);
      assert.equal(await scalar(db,'select public.is_admin()'),true);
      assert.equal(await scalar(db,'select count(*) from public.students'),3);
      const made=await scalar(db,"select public.create_class_full('Allowed','Basic',$1,30000,null,null,'[]','[]')",[id(1)]);
      await db.query("select public.change_tutor_safe($1,$2,'2026-09-01','test')",[made,id(2)]);
      await db.query("select public.update_csat_fee_safe($1,20000,'2026-09-01','test')",[made]);
      assert.deepEqual(await rows(db,'select * from public.get_unique_billing_periods()'),[{billing_period:'2026-07'}]);
    }
  });
  await check('tutor reads only assigned records and cannot edit another class', async()=>{
    assert.equal(await scalar(db,'select count(*) from public.students'),2);
    assert.equal(await scalar(db,'select count(*) from public.classes'),1);
    assert.equal(await scalar(db,'select count(*) from public.payments'),0);
    assert.deepEqual(await rows(db,"update public.sessions set status='cancelled' where session_id=$1 returning session_id",[id(102)]),[]);
    await denied(db,attendanceSQL,[id(102),attendance(13)[1]]);
  });
  await check('late attendance before close works and retains fee snapshot', async()=>{
    await db.query(attendanceSQL,attendance(11,'absent',999999));
    const actual=await rows(db,'select status,tuition_fee_snapshot from public.session_attendance where student_id=$1',[id(11)]);
    assert.deepEqual(actual,[{status:'absent',tuition_fee_snapshot:'100000.00'}]);
  });
  await check('RPC ignores injected fees for new attendance, including dropped students', async()=>{
    await claims(db,adminClaims);
    await db.query("update public.class_students set status='dropped' where student_id=$1",[id(12)]);
    await claims(db,tutorClaims);
    await db.query(attendanceSQL,attendance(12,'attended',1));
    assert.equal(await scalar(db,'select tuition_fee_snapshot from public.session_attendance where student_id=$1',[id(12)]),'150000.00');
  });
  await check('RPC rejects outside student atomically with no partial valid write', async()=>{
    await denied(db,attendanceSQL,[id(100),JSON.stringify([
      {student_id:id(11),status:'absent'}, {student_id:id(13),status:'attended',tuition_fee_snapshot:1}
    ])]);
    assert.equal(await scalar(db,'select status from public.session_attendance where student_id=$1',[id(11)]),'attended');
  });
  await check('RPC rejects empty, malformed, duplicate and invalid status payloads', async()=>{
    for (const payload of [null,{},[],[{}],[{student_id:id(11),status:'unknown'}],
      [{student_id:id(11),status:'attended'},{student_id:id(11),status:'absent'}]]) {
      await denied(db,attendanceSQL,[id(100),JSON.stringify(payload)]);
    }
  });
  await check('removed enrollment retains existing historical fee but cannot invent a missing fee', async()=>{
    await claims(db,adminClaims);
    await db.query('delete from public.class_students where student_id=$1',[id(11)]);
    await claims(db,tutorClaims);
    await db.query(attendanceSQL,attendance());
    await claims(db,adminClaims);
    await db.query('update public.session_attendance set tuition_fee_snapshot=null where student_id=$1',[id(11)]);
    await claims(db,tutorClaims);
    await denied(db,attendanceSQL,attendance());
  });
  await check('direct attendance insert/update/delete cannot bypass the RPC', async()=>{
    await denied(db,"insert into public.session_attendance(session_id,student_id,status,tuition_fee_snapshot) values($1,$2,'attended',1)",[id(100),id(12)]);
    assert.deepEqual(await rows(db,'update public.session_attendance set tuition_fee_snapshot=1 returning attendance_id'),[]);
    assert.deepEqual(await rows(db,'delete from public.session_attendance returning attendance_id'),[]);
    assert.equal(await scalar(db,'select count(*) from public.session_attendance'),1);
  });
  await check('session creation derives tutor and fee from DB, cancellation and scheduled deletion still work', async()=>{
    const made=await rows(db,"insert into public.sessions(class_id,date,start_time,end_time,tutor_id_snapshot,csat_fee_snapshot) values($1,'2026-09-01','18:00','19:00',$2,1) returning session_id,tutor_id_snapshot,csat_fee_snapshot",[id(10),id(2)]);
    assert.equal(made[0].tutor_id_snapshot,id(1));
    assert.equal(made[0].csat_fee_snapshot,'30000.00');
    assert.equal((await rows(db,'delete from public.sessions where session_id=$1 returning session_id',[made[0].session_id])).length,1);
    await db.query("update public.sessions set status='cancelled' where session_id=$1",[id(101)]);
  });
  await check('tutor cannot forge initial completion or billing, reassign or reprice a session', async()=>{
    await denied(db,"insert into public.sessions(class_id,date,start_time,end_time,status) values($1,'2026-09-01','18:00','19:00','completed')",[id(10)]);
    await denied(db,"insert into public.sessions(class_id,date,start_time,end_time,billing_period) values($1,'2026-09-01','18:00','19:00','fake')",[id(10)]);
    await denied(db,"insert into public.sessions(class_id,date,start_time,end_time) values($1,'2026-09-01','18:00','19:00')",[id(20)]);
    for (const mutation of ["csat_fee_snapshot=1",`tutor_id_snapshot='${id(2)}'`,`class_id='${id(20)}'`,"billing_period='fake'","date='2020-01-01'"]) {
      await denied(db,`update public.sessions set ${mutation} where session_id=$1`,[id(100)]);
    }
    await denied(db,'delete from public.sessions where session_id=$1',[id(100)]);
    await db.query("update public.sessions set status='scheduled' where session_id=$1",[id(100)]);
    await denied(db,'delete from public.sessions where session_id=$1',[id(100)]);
  });
  await check('closed session rejects tutor attendance/cancel/delete; admin reopening enables late edits', async()=>{
    await claims(db,adminClaims);
    await db.query("update public.sessions set billing_period='2026-08' where session_id=$1",[id(100)]);
    await claims(db,tutorClaims);
    await denied(db,attendanceSQL,attendance());
    await denied(db,"update public.sessions set status='cancelled' where session_id=$1",[id(100)]);
    await denied(db,'delete from public.sessions where session_id=$1',[id(100)]);
    await claims(db,adminClaims);
    await db.query('update public.sessions set billing_period=null where session_id=$1',[id(100)]);
    await claims(db,tutorClaims);
    await db.query(attendanceSQL,attendance());
  });
  await check('reviews require tutor, student and class to match', async()=>{
    await db.query('insert into public.student_reviews(tutor_id,class_id,student_id) values($1,$2,$3)',[id(1),id(10),id(11)]);
    for (const [tutor,cls,student] of [[1,10,13],[1,20,13],[2,10,11]]) {
      await denied(db,'insert into public.student_reviews(tutor_id,class_id,student_id) values($1,$2,$3)',[id(tutor),id(cls),id(student)]);
    }
    await denied(db,'update public.student_reviews set student_id=$1',[id(13)]);
  });
  await check('disabled tutor cannot use old JWT to read or mutate data', async()=>{
    for (const mutation of ["status='inactive'",'is_deleted=true']) {
      await claims(db,adminClaims);
      await db.query("update public.tutors set status='active',is_deleted=false where tutor_id=$1",[id(1)]);
      await db.query(`update public.tutors set ${mutation} where tutor_id=$1`,[id(1)]);
      await claims(db,tutorClaims);
      assert.equal(await scalar(db,'select public.current_tutor_id()'),null);
      assert.equal(await scalar(db,'select count(*) from public.students'),0);
      await denied(db,attendanceSQL,attendance());
    }
  });
  await check('search_path cannot redirect privileged RPCs to temporary tables', async()=>{
    await claims(db,adminClaims);
    await db.exec('create temp table payments (billing_period text); insert into payments values (\'spoofed\'); set local search_path = pg_temp, public;');
    assert.deepEqual(await rows(db,'select * from public.get_unique_billing_periods()'),[{billing_period:'2026-07'}]);
    for (const signature of rpcSignatures) {
      const config=await scalar(db,'select proconfig from pg_proc where oid=$1::regprocedure',[`public.${signature}`]);
      assert.ok(config.some(v=>v==='search_path=""'),signature);
    }
  });
}

test('existing database migration preserves data, reruns safely, and enforces permissions', async t=>{
  const db=await setup(legacy);
  try {
    await db.exec('create table public.unrelated(id int); alter table public.unrelated enable row level security; create policy preserve_me on public.unrelated for select using(true);');
    const before=await businessData(db);
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(await businessData(db),before);
    assert.equal(await scalar(db,"select count(*) from pg_policies where tablename='unrelated' and policyname='preserve_me'"),1);
    await db.exec("create function public.future_permission_test() returns int language sql as 'select 1'");
    for (const role of ['anon','authenticated']) assert.equal(await scalar(db,"select has_function_privilege($1,'public.future_permission_test()','execute')",[role]),false);
    await suite(t,db);
  } finally {await db.close();}
});
test('fresh master schema has the same permissions and valid tutor workflows', async t=>{
  const security = sql => sql.slice(sql.indexOf('-- BEGIN CSAT PERMISSIONS 20260905'),sql.indexOf('-- END CSAT PERMISSIONS 20260905'));
  assert.equal(security(master),security(migration),'Fresh-install and incremental permissions must match');
  const db=await setup(master);
  try { await suite(t,db); } finally { await db.close(); }
});
test('preflight rejects missing admin, unknown policies and overloaded RPCs atomically', async()=>{
  const db=await setup(legacy);
  try {
    for (const change of [
      "update auth.users set raw_app_meta_data='{}'",
      'create policy unknown_public_access on public.students for select using(true)',
      'create policy "Admin_Full_Access_Reviews" on public.students for select using(true)',
      "create function public.take_attendance_safe(text) returns int language sql as $$ select 1 $$"
    ]) {
      await db.exec('begin'); await db.exec(change);
      // Preserve the outer test transaction: test the full migration without its BEGIN/COMMIT.
      const candidate=migration.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
      await assert.rejects(db.exec(candidate),/CSAT preflight:/);
      await db.exec('rollback');
      assert.equal(await scalar(db,"select has_function_privilege('anon','public.take_attendance_safe(uuid,jsonb)','execute')"),true);
    }
  } finally {await db.close();}
});

// The production report supplied the table/name, not the original predicate.
// Use a deliberately over-permissive fixture to prove the old policy is removed.
test('migration replaces legacy review policy without preserving its permissions', async()=>{
  const db=await setup(legacy);
  try {
    await db.exec('create policy "Admin_Full_Access_Reviews" on public.student_reviews for all to authenticated using(true) with check(true)');
    const before=await businessData(db);
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(await businessData(db),before);
    assert.equal(await scalar(db,"select count(*) from pg_policies where schemaname='public' and tablename='student_reviews' and policyname='Admin_Full_Access_Reviews'"),0);
    assert.equal(await scalar(db,"select count(*) from pg_policies where schemaname='public' and tablename='student_reviews' and policyname='Admin_Full_Student_Reviews'"),1);
    const verified=await rows(db,verification);
    assert.ok(verified.every(row=>row.passed),JSON.stringify(verified));
    await db.exec('begin');
    await claims(db,tutorClaims);
    await db.query('insert into public.student_reviews(tutor_id,class_id,student_id) values($1,$2,$3)',[id(1),id(10),id(11)]);
    await denied(db,'insert into public.student_reviews(tutor_id,class_id,student_id) values($1,$2,$3)',[id(1),id(20),id(13)]);
    await claims(db,adminClaims);
    await db.query('insert into public.student_reviews(tutor_id,class_id,student_id) values($1,$2,$3)',[id(2),id(20),id(13)]);
    assert.equal(await scalar(db,'select count(*) from public.student_reviews'),2);
    await db.exec('rollback');
  } finally {await db.close();}
});
