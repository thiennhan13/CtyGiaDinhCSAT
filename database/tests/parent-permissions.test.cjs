const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const read = file => fs.readFileSync(path.join(__dirname,file),'utf8').replace(/\r\n/g,'\n');
const migration = read('../migrations/20260905_02_parent_accounts.sql');
const master = read('../CSAT_master_schema.sql');
const id = n => '20000000-0000-4000-8000-' + String(n).padStart(12,'0');
const admin = { role:'authenticated', sub:id(1), app_metadata:{role:'admin'} };
const parent = n => ({role:'authenticated', sub:id(n), app_metadata:{role:'parent'}});
async function claims(db, jwt, role='authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(jwt)]);
  await db.exec('set role '+role);
}
async function scalar(db,sql,params=[]) { return Object.values((await db.query(sql,params)).rows[0])[0]; }
async function denied(db,sql,params=[],code='42501') {
  await db.exec('savepoint denied'); let error;
  try { await db.query(sql,params); } catch(e) { error=e; }
  await db.exec('rollback to savepoint denied; release savepoint denied');
  assert.ok(error,'Expected rejection: '+sql); assert.equal(error.code,code,error.message);
}
const saveSQL = 'select public.admin_save_parent_account($1,$2,$3,$4::uuid[],$5)';
const saveArgs = (n=2,students=[11,12],active=true) => [id(n),'Parent '+n,'+8491234567'+n,students.map(id),active];
const portalSQL = 'select public.get_parent_portal($1)';
async function setup(upgrade) {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,phone text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to authenticated,anon,service_role;
    grant execute on all functions in schema auth to authenticated,anon,service_role;
    create function public.uuid_generate_v4() returns uuid language sql volatile as $$ select gen_random_uuid() $$;
    insert into auth.users(id,phone,raw_app_meta_data,raw_user_meta_data) values
      ('${id(1)}',null,'{"role":"admin"}','{}'),
      ('${id(2)}','84912345672','{"role":"parent"}','{}'),
      ('${id(3)}','+84912345673','{"role":"parent"}','{}'),
      ('${id(4)}','84912345674','{"role":"tutor"}','{}'),
      ('${id(5)}','84912345675','{"role":"parent"}','{}');`);
  const schema = upgrade ? read('fixtures/schema-before-permissions.sql') : master;
  await db.exec(schema.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',''));
  if(upgrade) await db.exec(read('../migrations/20260905_01_harden_permissions.sql') + migration);
  await db.exec(`insert into students(student_id,name,notes,parent_number) values
    ('${id(11)}','Child A','Internal A','0912345673'),
    ('${id(12)}','Child B','Internal B','0912345672'),
    ('${id(13)}','Other family','Internal Other','0912345672');
    insert into tutors(tutor_id,auth_uid,name,email) values('${id(20)}','${id(4)}','Tutor','private@example.test');
    insert into classes(class_id,tutor_id,name) values('${id(30)}','${id(20)}','Class');
    insert into class_students(class_id,student_id,tuition_fee_per_session) values('${id(30)}','${id(11)}',100000);
    insert into sessions(session_id,class_id,date,start_time,end_time) values('${id(40)}','${id(30)}','2026-09-01','18:00','19:00');
    insert into session_attendance(session_id,student_id,status,notes,tuition_fee_snapshot) values('${id(40)}','${id(11)}','attended','Internal attendance',100000);
    insert into student_reviews(student_id,tutor_id,class_id,general_assessment) values
      ('${id(11)}','${id(20)}','${id(30)}','Visible feedback'),('${id(13)}','${id(20)}','${id(30)}','Other family feedback');`);
  await claims(db,admin);
  await db.query(saveSQL,saveArgs()); await db.query(saveSQL,saveArgs(3,[13]));
  await db.exec('reset role');
  return db;
}
for (const upgrade of [true,false]) test(upgrade ? 'Parent migration on existing hardened database' : 'Parent schema on fresh database',async t=>{
  const db = await setup(upgrade);
  try {
    const verification = (await db.query(read('../verification/20260905_parent_accounts.sql'))).rows;
    assert.equal(verification.length,10);
    assert.ok(verification.every(r=>r.passed),JSON.stringify(verification));
    async function check(name,run) { await t.test(name,async()=>{
      await db.exec('reset role; begin');
      try { await claims(db,parent(2)); await run(); } finally { await db.exec('rollback; reset role'); }
    }); }
    await check('explicit links win over contact phone; every linked child is selectable',async()=>{
      const first = await scalar(db,portalSQL,[null]);
      assert.deepEqual(first.students.map(s=>s.student_id),[id(11),id(12)]);
      assert.equal(first.student.student_id,id(11));
      assert.equal((await scalar(db,portalSQL,[id(12)])).student.student_id,id(12));
      await denied(db,portalSQL,[id(13)]);
      await claims(db,parent(3));
      assert.deepEqual((await scalar(db,portalSQL,[null])).students.map(s=>s.student_id),[id(13)]);
      await denied(db,portalSQL,[id(11)]);
    });
    await check('projection includes feedback and counts but excludes internal/student and tutor fields',async()=>{
      const result = await scalar(db,portalSQL,[id(11)]);
      assert.equal(result.attendanceCount,1);
      assert.equal(result.enrolledClasses[0].classes.tutors.name,'Tutor');
      assert.equal(result.reviews[0].general_assessment,'Visible feedback');
      assert.equal(result.reviews.length,1);
      assert.deepEqual(Object.keys(result.student).sort(),['student_id','name','date_of_birth','province','status','parent_name','parent_number'].sort());
      assert.doesNotMatch(JSON.stringify(result),/Internal|private@example|Other family|tuition_fee|auth_uid|parent_link/);
    });
    await check('raw internal tables cannot be queried by parent',async()=>{
      for(const table of ['students','tutors','classes','class_students','sessions','session_attendance','student_reviews','payments','parent_student_links'])
        assert.equal(await scalar(db,'select count(*) from public.'+table),0,table);
      assert.equal(await scalar(db,'select count(*) from parent_accounts'),1);
    });
    await check('parent cannot create links, reactivate self or call administration RPC',async()=>{
      await denied(db,'insert into parent_student_links(parent_auth_uid,student_id) values($1,$2)',[id(2),id(13)]);
      assert.equal((await db.query('update parent_accounts set active=false returning auth_uid')).rows.length,0);
      await denied(db,saveSQL,saveArgs(2,[13]));
    });
    await check('anonymous, missing profile and editable metadata cannot impersonate a parent',async()=>{
      await claims(db,{role:'anon'},'anon');
      await denied(db,portalSQL,[null]);
      await denied(db,'select * from parent_accounts');
      for(const jwt of [parent(5),{role:'authenticated',sub:id(2),user_metadata:{role:'parent'}},{role:'authenticated',app_metadata:{role:'parent'}}]) {
        await claims(db,jwt); await denied(db,portalSQL,[null]);
      }
    });
    await check('deactivation blocks an existing JWT immediately and reopening restores access',async()=>{
      await claims(db,admin); await db.query(saveSQL,saveArgs(2,[11,12],false));
      await claims(db,parent(2)); await denied(db,portalSQL,[null]);
      await claims(db,admin); await db.query(saveSQL,saveArgs());
      await claims(db,parent(2)); assert.equal((await scalar(db,portalSQL,[null])).students.length,2);
    });
    await check('removing links revokes child access without logging out',async()=>{
      await claims(db,admin); await db.query(saveSQL,saveArgs(2,[12]));
      await claims(db,parent(2)); await denied(db,portalSQL,[id(11)]);
      assert.equal((await scalar(db,portalSQL,[null])).student.student_id,id(12));
      await claims(db,admin); await db.query(saveSQL,saveArgs(2,[]));
      await claims(db,parent(2)); const empty = await scalar(db,portalSQL,[null]);
      assert.equal(empty.student,null); assert.deepEqual(empty.students,[]);
    });
    await check('deleted students are hidden and cannot be newly linked',async()=>{
      await claims(db,admin); await db.query('update students set is_deleted=true where student_id=$1',[id(11)]);
      await denied(db,saveSQL,saveArgs(),'22023');
      await claims(db,parent(2)); await denied(db,portalSQL,[id(11)]);
      assert.equal((await scalar(db,portalSQL,[null])).students.length,1);
    });
    await check('admin can lock an account even when an existing child was soft-deleted',async()=>{
      await claims(db,admin); await db.query('update students set is_deleted=true where student_id=$1',[id(11)]);
      await db.query(saveSQL,saveArgs(2,[11,12],false));
      await claims(db,parent(2)); await denied(db,portalSQL,[null]);
    });
    await check('invalid link sets fail atomically; Auth role and full phone must match',async()=>{
      await claims(db,admin);
      for(const args of [saveArgs(2,[13,99]),saveArgs(2,[11,11]),saveArgs(4,[11]),[id(2),'Wrong phone','+84912345673',[id(11)],true], [id(2),'Null links','+84912345672',null,true]]) {
        await denied(db,saveSQL,args,'22023');
        assert.equal(await scalar(db,'select count(*) from parent_student_links where parent_auth_uid=$1',[id(2)]),2);
      }
    });
    await check('migration rerun preserves account and link data',async()=>{
      await db.exec('reset role');
      const before = (await db.query('select * from parent_student_links order by parent_auth_uid,student_id')).rows;
      // This migration includes its own transaction; finish the outer rollback scope first.
      await db.exec('rollback');
      await db.exec(migration);
      assert.deepEqual((await db.query('select * from parent_student_links order by parent_auth_uid,student_id')).rows,before);
      await db.exec('begin');
    });
    await check('preflight rejects unexpected parent policy instead of silently retaining it',async()=>{
      await db.exec('reset role');
      await db.exec('create policy unexpected on parent_accounts for select using(true)');
      const preflight = migration.slice(migration.indexOf('DO $$'),migration.indexOf('CREATE TABLE'));
      await denied(db,preflight,[],'P0001');
    });
  } finally { await db.close(); }
});

test('fresh schema uses exactly the migration parent security block',()=>{
  const body = migration.slice(migration.indexOf('SET LOCAL'),migration.lastIndexOf('COMMIT;')).trim();
  assert.ok(master.includes('-- BEGIN CSAT PARENT ACCOUNTS 20260905\n'+body+'\n-- END CSAT PARENT ACCOUNTS 20260905'));
});
