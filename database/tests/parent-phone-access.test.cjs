const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const dir=path.join(__dirname,'../migrations'),migration='20261014_27_parent_phone_access.sql';
const sql=name=>fs.readFileSync(path.join(dir,name),'utf8');
const hash=n=>Number(n).toString(16).padStart(64,'0');
async function ready(optional=false){
 const db=await setup();await db.exec('reset role');
 await db.exec('alter table auth.users add column phone text, add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n<migration).sort()){
  if(!optional&&/^202609(14_19|22_21|23_22)/.test(name))continue;
  await db.exec(sql(name));
 }
 await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Parent fixture','0912345678')",[id(80)]);
 await db.query("update students set parent_name='Parent fixture',parent_number='0912345678',status='Đang học' where student_id in ($1,$2)",[id(10),id(11)]);
 await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2),($1,$3)',[id(80),id(10),id(11)]);
 return db;
}
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
const start=(db,n=1,phone='0912345678',source=hash(100),identity=hash(200))=>value(db,'select start_parent_phone_session($1,$2,$3,$4)',[phone,hash(n),source,identity]);
const valid=(db,n=1)=>value(db,'select parent_phone_session_valid($1)',[hash(n)]);
const portal=(db,n=1,student=id(10))=>value(db,"select parent_learning_portal($1,$2,'2026-06',0)",[hash(n),student]);
const snapshot=db=>value(db,"select jsonb_build_object('contacts',(select jsonb_agg(to_jsonb(x)) from parent_accounts x),'links',(select jsonb_agg(to_jsonb(x)) from parent_student_links x),'users',(select jsonb_agg(to_jsonb(x)) from auth.users x),'learning',(select jsonb_agg(to_jsonb(x)) from learning_records x),'payments',(select jsonb_agg(to_jsonb(x)) from payments x))");

for(const optionalFirst of [false,true])test('phone migration preserves history and projections; optional first='+optionalFirst,async()=>{
 const db=await ready(optionalFirst);try{
  await db.query("insert into auth.users(id,phone,raw_app_meta_data) values($1,'84912345678',$2)",[id(80),JSON.stringify({role:'parent',csat_parent_id:id(80)})]);
  await db.query('update parent_accounts set auth_uid=$1 where parent_id=$1',[id(80)]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(81),id(80)]);
  await service(db);assert.equal(await value(db,'select start_parent_password_session($1,$2,$3)',[id(80),id(81),hash(900)]),true);
  const beforePortal=await portal(db,900);await db.exec('reset role');const before=await snapshot(db);
  await db.exec(sql(migration));assert.deepEqual(await snapshot(db),before);
  assert.equal(await value(db,'select count(*)::int from parent_lookup_sessions'),0);
  await service(db);assert.equal(await valid(db,900),false);assert.equal(await start(db), 'ok');
  const after=await portal(db);
  // Aggregation time changes on each read; all substantive fields must survive.
  const stable=p=>({...p,class_progress:p.class_progress.map(({as_of,...progress})=>{assert.ok(as_of);return progress;})});
  assert.deepEqual(stable(after),stable(beforePortal));
  if(!optionalFirst){await db.exec('reset role');for(const name of ['20260914_19_email_operations.sql','20260922_21_parent_email_completion.sql','20260923_22_tutor_profiles.sql'])await db.exec(sql(name));await service(db);}
  const enriched=await portal(db);assert.ok(Array.isArray(enriched.class_progress));assert.equal(enriched.student.student_id,id(10));
  assert.equal((await portal(db,1,id(11))).student.student_id,id(11));
  await assert.rejects(()=>portal(db,1,id(99)),{code:'42501'});
  for(const statement of ['select start_parent_password_session(null,null,null)','select start_parent_lookup(null,null,null)','select link_parent_auth(null,null,null)','select parent_auth_candidates()'])await assert.rejects(()=>db.query(statement),{code:'42501'});
  await as(db,'tutor');await assert.rejects(()=>value(db,'select parent_contact_candidates()'),{code:'42501'});
  await as(db);assert.equal((await value(db,'select parent_contact_candidates()')).filter(r=>r.parent_id===id(80)).every(r=>r.issue===null),true);
  await db.exec('reset role');const verification=await db.exec(fs.readFileSync(path.join(__dirname,'../verification/20261014_parent_phone_access.sql'),'utf8'));
  for(const result of verification)for(const row of result.rows||[])for(const [key,val]of Object.entries(row))if(key.endsWith('_grant_ok'))assert.equal(val,true,key);
 }finally{await db.close();}
});

test('phone sessions need no Auth; expiry, logout, contact edits and link removal deny access',async()=>{
 const db=await ready();try{
  await db.exec(sql(migration));await service(db);assert.equal(await start(db,1,'+84 912 345 678'),'ok');assert.equal(await valid(db),true);
  for(const role of ['anon','authenticated']){await db.exec('reset role;set role '+role);await assert.rejects(()=>start(db),{code:'42501'});await assert.rejects(()=>valid(db),{code:'42501'});}
  await service(db);await value(db,'select end_parent_lookup($1)',[hash(1)]);assert.equal(await valid(db),false);
  assert.equal(await start(db,2),'ok');await db.exec('reset role');await db.query("update parent_lookup_sessions set expires_at=now()-interval '1 second' where token_hash=$1",[hash(2)]);await service(db);assert.equal(await valid(db,2),false);
  assert.equal(await start(db,3),'ok');await as(db);await value(db,'select admin_save_parent_contact($1,$2,$3,$4,$5)',[id(80),'Parent fixture','0987654321',[id(10),id(11)],true]);await service(db);assert.equal(await valid(db,3),false);assert.equal(await start(db,4),'not_found');assert.equal(await start(db,5,'0987654321'),'ok');
  await as(db);await value(db,'select admin_save_parent_contact($1,$2,$3,$4,$5)',[id(80),'Parent fixture','0987654321',[id(10)],true]);await service(db);await assert.rejects(()=>portal(db,5,id(11)),{code:'42501'});
  await as(db);await value(db,'select admin_save_parent_contact($1,$2,$3,$4,$5)',[id(80),'Parent fixture','0987654321',[id(10)],false]);await service(db);assert.equal(await valid(db,5),false);assert.equal(await start(db,6,'0987654321'),'not_found');
 }finally{await db.close();}
});

test('durable budgets combine staff and parent sources and count unknown numbers',async()=>{
 const db=await ready();try{
  await db.exec(sql(migration));await service(db);
  for(let n=1;n<=10;n++)assert.equal(await start(db,n,'0999999999'), 'not_found');
  assert.equal(await start(db,11,'0999999999'),'rate_limited');
  // Different source still cannot bypass the same identity budget.
  assert.equal(await start(db,12,'0999999999',hash(101)),'rate_limited');
  // Staff consumes 49 slots of the same source, parent consumes slot 50.
  for(let n=1;n<=49;n++)assert.equal(await value(db,'select consume_auth_attempt($1,$2)',[hash(300),hash(400+n)]),true);
  assert.equal(await start(db,20,'0912345678',hash(300),hash(800)),'ok');
  assert.equal(await value(db,'select consume_auth_attempt($1,$2)',[hash(300),hash(999)]),false);
  assert.equal(await start(db,21,'0912345678',hash(300),hash(801)),'rate_limited');
  await db.exec("reset role;update csat_internal.auth_attempts set reset_at=now()-interval '1 second'");await service(db);
  assert.equal(await start(db,22,'0912345678',hash(300),hash(800)),'ok');
 }finally{await db.close();}
});
