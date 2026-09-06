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
const oldSaveSQL = 'select public.admin_save_parent_account($1,$2,$3,$4::uuid[],$5)';
const saveSQL = 'select public.admin_save_parent_contact($1,$2,$3,$4::uuid[],$5)';
const saveArgs = (n=2,students=[11,12],active=true) => [id(n),'Parent '+n,'+8491234567'+n,students.map(id),active];
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
  if(upgrade) {
    await db.query(oldSaveSQL,saveArgs()); await db.query(oldSaveSQL,saveArgs(3,[13]));
    await db.exec('reset role');
    const before=(await db.query(read('../verification/20260906_parent_lookup_preflight.sql'))).rows;
    await db.exec(read('../migrations/20260906_03_parent_phone_lookup.sql'));
    assert.deepEqual((await db.query(read('../verification/20260906_parent_lookup_preflight.sql'))).rows,before);
  } else {
    // Stable fixture IDs are intentionally independent of Auth identities on fresh databases.
    await db.query('insert into parent_accounts(parent_id,display_name,phone) values($1,$2,$3),($4,$5,$6)',[id(2),'Parent 2','+84912345672',id(3),'Parent 3','+84912345673']);
    await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2),($1,$3),($4,$5)',[id(2),id(11),id(12),id(3),id(13)]);
  }
  await db.exec('reset role');
  return db;
}
const lookupMigration=read('../migrations/20260906_03_parent_phone_lookup.sql');
const hash=n=>require('node:crypto').createHash('sha256').update(String(n)).digest('hex');
const beginSQL='select public.start_parent_lookup($1,$2,$3)';
const lookupSQL='select public.get_parent_lookup($1,$2)';
async function service(db) { await claims(db,{role:'service_role'},'service_role'); }
for(const upgrade of [true,false]) test(upgrade?'Phone lookup upgrades populated parent02':'Phone lookup fresh current schema',async t=>{
  const db=await setup(upgrade);
  try {
    const verified=(await db.query(read('../verification/20260906_parent_phone_lookup.sql'))).rows;
    assert.equal(verified.length,12);assert.ok(verified.every(r=>r.passed),JSON.stringify(verified));
    async function check(name,run){await t.test(name,async()=>{
      await db.exec('reset role; begin');
      try{await service(db);await run();}finally{await db.exec('rollback; reset role');}
    });}
    async function start(n=2,token=1,ip=1){return scalar(db,beginSQL,['+8491234567'+n,hash(token),hash('ip'+ip)]);}
    await check('phone alone opens linked students; contact fields do not infer links',async()=>{
      assert.equal(await start(),'ok');
      const data=await scalar(db,lookupSQL,[hash(1),null]);
      assert.deepEqual(data.students.map(s=>s.student_id),[id(11),id(12)]);
      assert.equal(data.student.student_id,id(11));
      assert.equal((await scalar(db,lookupSQL,[hash(1),id(12)])).student.student_id,id(12));
      await denied(db,lookupSQL,[hash(1),id(13)]);
      assert.equal(await start(3,2),'ok');
      assert.equal((await scalar(db,lookupSQL,[hash(2),null])).student.student_id,id(13));
      await denied(db,lookupSQL,[hash(2),id(11)]);
    });
    await check('server projection excludes internal student, tutor and accounting data',async()=>{
      await start();const data=await scalar(db,lookupSQL,[hash(1),null]);
      assert.equal(data.attendanceCount,1);assert.equal(data.reviews[0].general_assessment,'Visible feedback');
      assert.equal(data.enrolledClasses[0].classes.tutors.name,'Tutor');
      assert.doesNotMatch(JSON.stringify(data),/Internal|private@example|Other family|tuition_fee|auth_uid|legacy_auth|token_hash/);
    });
    await check('old parent JWT, anon and admin browser cannot invoke service lookup functions',async()=>{
      for(const [jwt,role] of [[parent(2),'authenticated'],[admin,'authenticated'],[{role:'anon'},'anon']]){
        await claims(db,jwt,role);
        await denied(db,beginSQL,['+84912345672',hash(1),hash('ip1')]);
        await denied(db,lookupSQL,[hash(1),null]);await denied(db,'select public.end_parent_lookup($1)',[hash(1)]);
        await denied(db,'select * from parent_lookup_sessions');await denied(db,'select * from parent_lookup_limits');
      }
      await claims(db,parent(2));
      for(const table of ['parent_accounts','parent_student_links','students','tutors','payments','student_reviews']) assert.equal(await scalar(db,'select count(*) from '+table),0,table);
      await denied(db,saveSQL,saveArgs());
      await denied(db,'insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(2),id(13)]);
      assert.equal(await scalar(db,"select to_regprocedure('public.get_parent_portal(uuid)') is null"),true);
    });
    await check('unknown and inactive phones count toward a shared ten-attempt window',async()=>{
      await db.query('update parent_accounts set active=false where parent_id=$1',[id(3)]);
      for(let n=0;n<10;n++) assert.equal(await start(n%2?3:5,n),'not_found');
      assert.equal(await start(2,11),'rate_limited');
      assert.equal(await scalar(db,'select count(*) from parent_lookup_sessions'),0);
      assert.equal(await start(2,12,2),'ok');
      await db.query('update parent_lookup_limits set reset_at=current_timestamp-interval \'1 second\' where client_key=$1',[hash('ip1')]);
      assert.equal(await start(2,13),'ok');
      await denied(db,beginSQL,['12345672',hash(14),hash('ip1')],'22023');
    });
    await check('unknown, expired and revoked session hashes cannot read data',async()=>{
      await denied(db,lookupSQL,[hash('forged'),null]);await denied(db,lookupSQL,[null,null]);
      await start();await db.query('update parent_lookup_sessions set expires_at=current_timestamp-interval \'1 second\'');
      await denied(db,lookupSQL,[hash(1),null]);
      await start(2,2);await db.query('select public.end_parent_lookup($1)',[hash(2)]);
      await denied(db,lookupSQL,[hash(2),null]);
    });
    await check('closing contact revokes sessions permanently; reopening requires new lookup',async()=>{
      await start();await claims(db,admin);await db.query(saveSQL,saveArgs(2,[11,12],false));
      await service(db);await denied(db,lookupSQL,[hash(1),null]);
      await claims(db,admin);await db.query(saveSQL,saveArgs());
      await service(db);await denied(db,lookupSQL,[hash(1),null]);
      assert.equal(await start(2,2),'ok');
    });
    await check('removed links and soft-deleted children disappear on next read',async()=>{
      await start();await claims(db,admin);await db.query(saveSQL,saveArgs(2,[12]));
      await service(db);await denied(db,lookupSQL,[hash(1),id(11)]);
      await db.query('update students set is_deleted=true where student_id=$1',[id(12)]);
      const data=await scalar(db,lookupSQL,[hash(1),null]);assert.equal(data.student,null);assert.deepEqual(data.students,[]);
      await claims(db,admin);await db.query(saveSQL,saveArgs(2,[12],false));
      await denied(db,saveSQL,saveArgs(2,[12],true),'22023');
    });
    await check('admin creates contacts without Auth users and saves links atomically',async()=>{
      await claims(db,admin);
      const uid=await scalar(db,saveSQL,[null,'New parent','+84912345679',[id(11)],true]);
      assert.ok(uid);assert.equal(await scalar(db,'select count(*) from parent_student_links where parent_id=$1',[uid]),1);
      await denied(db,saveSQL,[null,'Duplicate','+84912345679',[id(12)],true],'23505');
      await denied(db,saveSQL,saveArgs(2,[13,99]),'22023');
      await denied(db,saveSQL,saveArgs(2,[11,11]),'22023');
      assert.equal(await scalar(db,'select count(*) from parent_student_links where parent_id=$1',[id(2)]),2);
      await db.exec('reset role');assert.equal(await scalar(db,'select count(*) from auth.users where id=$1',[uid]),0);
    });
    await check('deleting obsolete Auth identity preserves contact and student links',async()=>{
      await db.exec('reset role');
      if(upgrade) assert.equal(await scalar(db,'select legacy_auth_uid from parent_accounts where parent_id=$1',[id(2)]),id(2));
      await db.query('delete from auth.users where id=$1',[id(2)]);
      assert.equal(await scalar(db,'select count(*) from parent_accounts where parent_id=$1',[id(2)]),1);
      assert.equal(await scalar(db,'select count(*) from parent_student_links where parent_id=$1',[id(2)]),2);
      assert.equal(await scalar(db,'select legacy_auth_uid from parent_accounts where parent_id=$1',[id(2)]),null);
    });
    await check('migration rerun preserves links, legacy mapping, sessions and Auth users',async()=>{
      await start();await db.exec('reset role; commit');
      const before={};for(const table of ['parent_accounts','parent_student_links','parent_lookup_sessions','auth.users']) before[table]=(await db.query('select * from '+table+' order by 1,2')).rows;
      await db.exec(lookupMigration);
      for(const table of Object.keys(before)) assert.deepEqual((await db.query('select * from '+table+' order by 1,2')).rows,before[table]);
      await db.exec('begin');
    });
    await check('unexpected policy aborts before migration changes',async()=>{
      await db.exec('reset role; create policy unexpected on parent_accounts for select using(true)');
      await denied(db,lookupMigration.slice(lookupMigration.indexOf('DO $$'),lookupMigration.indexOf('ALTER TABLE public.parent_accounts ALTER COLUMN')),[],'P0001');
    });
  }finally{await db.close();}
});
test('master schema embeds exact phone lookup migration',()=>{
  const body=lookupMigration.slice(lookupMigration.indexOf('SET LOCAL'),lookupMigration.lastIndexOf('COMMIT;')).trim();
  assert.ok(master.includes('-- BEGIN CSAT PHONE LOOKUP 20260906\n'+body+'\n-- END CSAT PHONE LOOKUP 20260906'));
});
