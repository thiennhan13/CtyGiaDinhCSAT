const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const {randomUUID}=require('node:crypto');
const dir=path.join(__dirname,'../migrations');
const sql=name=>fs.readFileSync(path.join(dir,name),'utf8');
async function ready(optional=false) {
 const db=await setup();await db.exec('reset role');
 await db.exec('alter table auth.users add column phone text, add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n<'20261012_24').sort()) {
  if(!optional && /^202609(14_19|22_21|23_22)/.test(name))continue;
  await db.exec(sql(name));
 }
 return db;
}
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
const input=(phone='0912345678')=>({schema_version:2,role:'parent',name:'Synthetic Parent',phone,email:'',level:'primary',course:'E',goal:'beginner',background:'none',school_year:'5',message:'Synthetic only',source_path:'/dang-ky-hoc',consent:true});
const submit=(db,uuid,data=input())=>value(db,'select submit_registration($1,$2,$3)',[uuid,JSON.stringify(data),'a'.repeat(64)]);

test('registration accepts approved fields without mail dependencies; retries, validation, limits and status history',async()=>{
 const db=await ready();try{
  await db.exec(sql('20261012_24_registration_intake.sql'));await service(db);
  const uuid=randomUUID();assert.equal(await submit(db,uuid),uuid);assert.equal(await submit(db,uuid),uuid);
  await assert.rejects(()=>submit(db,uuid,{...input(),message:'changed'}),{code:'23505'});
  for(const patch of [{consent:null},{course:'AB'},{level:'university'},{role:'university'},{goal:'national'},{background:null},{source_path:'https://evil.test'},{name:23},{email:'bad'}])await assert.rejects(()=>submit(db,randomUUID(),{...input(),...patch}),{code:'22023'});
  await submit(db,randomUUID());await submit(db,randomUUID());await assert.rejects(()=>submit(db,randomUUID()),{code:'P0429'});
  await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from consultation_email_outbox'),0);
  await as(db);assert.equal(await value(db,"select update_consultation_status($1,'contacted',1)",[uuid]),2);
  await assert.rejects(()=>value(db,"select update_consultation_status($1,'completed',1)",[uuid]),{code:'40001'});
  assert.equal(await value(db,'select count(*)::int from consultation_status_history'),1);
  await as(db,'tutor');assert.equal(await value(db,'select count(*)::int from consultation_requests'),0);
  await assert.rejects(()=>submit(db,randomUUID()),{code:'42501'});
 }finally{await db.close();}
});

for(const optionalFirst of [false,true])test(`optional fee/profile migrations ${optionalFirst?'before':'after'} completion preserve plans, pacing and password gate`,async()=>{
 const db=await ready(optionalFirst);try{
  const preflight=fs.readFileSync(path.join(__dirname,'../verification/20261012_backend_preflight.sql'),'utf8');
  const postflight=fs.readFileSync(path.join(__dirname,'../verification/20261012_backend_postflight.sql'),'utf8');
  await db.exec(preflight);
  for(const name of ['20261012_24_registration_intake.sql','20261012_25_class_program_codes.sql','20261012_26_parent_password_auth.sql'])await db.exec(sql(name));
  const verified=await db.exec(postflight);
  for(const result of verified)for(const row of result.rows||[])for(const [key,val] of Object.entries(row))if(key.endsWith('_grant_ok'))assert.equal(val,true);
  await db.exec(preflight);
  await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic Parent','0912345678')",[id(80)]);
  await db.query("update students set parent_name='Synthetic Parent',parent_number='0912345678',status='Đang học' where student_id in ($1,$2)",[id(10),id(11)]);
  await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2),($1,$3)',[id(80),id(10),id(11)]);
  await db.query("insert into auth.users(id,phone,raw_app_meta_data) values($1,'84912345678',$2)",[id(80),JSON.stringify({role:'parent',csat_parent_id:id(80)})]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(81),id(80)]);
  await as(db);
  const created=await value(db,'select create_class_with_learning($1,$2)',[JSON.stringify({name:'Synthetic B',program_code:'B',tutor_id:id(20),csat_fee_per_session:0,start_date:'2026-01-01',end_date:'2026-01-31',students:[{student_id:id(10),tuition_fee_per_session:0}],sessions:[]}),randomUUID()]);
  await service(db);assert.equal((await value(db,'select parent_auth_candidates()')).filter(r=>!r.issue).length,2);
  assert.equal(await value(db,'select link_parent_auth($1,$2,$3)',[id(80),id(80),'0912345678']),true);
  assert.equal(await value(db,'select start_parent_password_session($1,$2,$3)',[id(80),id(81),'a'.repeat(64)]),true);
  await value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['a'.repeat(64),id(11)]);
  if(!optionalFirst){
   await db.exec('reset role');
   for(const name of ['20260914_19_email_operations.sql','20260922_21_parent_email_completion.sql','20260923_22_tutor_profiles.sql'])await db.exec(sql(name));
   await service(db);
  }
  const portal=await value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['a'.repeat(64),id(10)]);
  assert.equal(portal.plans.find(p=>p.class_id===created.class_id).program_code,'B');
  assert.ok(portal.class_progress.some(p=>p.class_id===created.class_id));
  assert.ok(portal.attendance.length>0&&portal.attendance.every(a=>'tuition_amount' in a&&'fee_adjusted' in a));
  assert.ok(portal.tutors.length>0&&portal.tutors.every(t=>'tutor_id' in t&&'background' in t));
  await db.exec('reset role');await db.query("update students set parent_number='0987654321' where student_id=$1",[id(11)]);await service(db);
  assert.equal((await value(db,'select parent_auth_candidates()')).find(r=>r.student_id===id(10)).issue,'conflicting_links');
  await assert.rejects(()=>value(db,'select link_parent_auth($1,$2,$3)',[id(80),id(80),'0912345678']),{code:'22023'});
  await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[id(81)]);await service(db);
  await assert.rejects(()=>value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['a'.repeat(64),id(10)]),{code:'42501'});
 }finally{await db.close();}
});

test('program classification preserves curricula/accounting and requires admin revision plus audit',async()=>{
 const db=await ready();try{
  await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);
  const before=await value(db,"select jsonb_build_object('learning',(select jsonb_agg(to_jsonb(r)) from learning_records r),'payments',(select jsonb_agg(to_jsonb(p)) from payments p))");
  await db.exec(sql('20261012_25_class_program_codes.sql'));
  assert.deepEqual(await value(db,"select jsonb_build_object('learning',(select jsonb_agg(to_jsonb(r)) from learning_records r),'payments',(select jsonb_agg(to_jsonb(p)) from payments p))"),before);
  assert.equal(await value(db,'select program_code from class_current_state where class_id=$1',[id(30)]),'AB');
  for(const [name,code]of [['Lớp Luyện thi','K'],['Ôn thi VOI','PREVOI'],['PreVOI','PREVOI'],['Lớp E','E'],['Lớp Nâng cao','C']])assert.equal(await value(db,'select csat_internal.class_program_code($1)',[name]),code);
  await as(db,'tutor');await assert.rejects(()=>value(db,"select admin_set_class_program($1,'B',1,'Synthetic change')",[id(30)]),{code:'42501'});
  await as(db);assert.equal(await value(db,"select admin_set_class_program($1,'B',1,'Synthetic change')",[id(30)]),2);
  await assert.rejects(()=>value(db,"select admin_set_class_program($1,'C',1,'Synthetic change')",[id(30)]),{code:'40001'});
  assert.equal(await value(db,'select count(*)::int from class_program_history'),2);
  assert.equal((await value(db,"select learning_workspace($1,'2026-06')",[id(30)])).class.program_code,'B');
  await assert.rejects(()=>value(db,"select csat_internal.manage_class_core('create',null,'{}',$1)",[randomUUID()]),{code:'42501'});
  for(const code of ['A','B','AB','C','E','PREVOI','K']) {
   const request=randomUUID(),body={name:'Synthetic '+code,program_code:code,tutor_id:id(20),csat_fee_per_session:0,start_date:'2026-01-01',end_date:'2026-01-31',students:[],sessions:[]};
   const r=await value(db,"select manage_class('create',null,$1,$2)",[JSON.stringify(body),request]);
   assert.deepEqual(await value(db,'select create_class_with_learning($1,$2)',[JSON.stringify(body),request]),r);
   const plan=await value(db,"select to_jsonb(r) from learning_records r where class_id=$1 and kind='class'",[r.class_id]);
   if(['A','B','AB','C'].includes(code)){
    assert.ok(plan.published);assert.deepEqual(plan.published.curriculum.parts,code==='A'?['A']:code==='B'?['B']:['A','B']);
    const stages=await value(db,'select stages from learning_templates where template_id=$1',[plan.published.template_id]);
    const topics=stages.filter(s=>s.part==='CD'||plan.published.curriculum.parts.includes(s.part)).flatMap(s=>s.lessons);
    assert.equal(topics.length,{A:9,B:15,AB:24,C:19}[code]);
    if(code==='C'){assert.equal(topics[0].code,'C01');assert.equal(topics.at(-1).code,'D07');}
   }
   else {assert.equal(plan.published,null);assert.equal(plan.draft.template_id,null);}
  }
 }finally{await db.close();}
});

test('internal Auth tables deny direct access and RLS still blocks accidental client grants',async()=>{
 const db=await ready();try{
  await db.exec(sql('20261012_26_parent_password_auth.sql'));
  await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic Parent','0912345678')",[id(80)]);
  await db.query("insert into csat_internal.parent_auth_provisioning(parent_id,state) values($1,'pending')",[id(80)]);
  await service(db);
  assert.equal(await value(db,'select consume_auth_attempt($1,$2)',['a'.repeat(64),'b'.repeat(64)]),true);
  for(const role of ['anon','authenticated','service_role']){
   await db.exec(`reset role;set role ${role}`);
   for(const table of ['auth_attempts','parent_auth_provisioning'])await assert.rejects(()=>value(db,`select count(*) from csat_internal.${table}`),{code:'42501'});
  }
  await db.exec('reset role');
  const flags=await db.query("select relrowsecurity from pg_class where oid in ('csat_internal.auth_attempts'::regclass,'csat_internal.parent_auth_provisioning'::regclass)");
  assert.equal(flags.rows.length,2);assert.ok(flags.rows.every(r=>r.relrowsecurity));
  // Simulate an accidental future GRANT. RLS must continue hiding existing rows
  // and rejecting inserts for ordinary clients; service_role deliberately bypasses RLS.
  await db.exec('grant usage on schema csat_internal to anon,authenticated; grant select,insert,update,delete on csat_internal.auth_attempts,csat_internal.parent_auth_provisioning to anon,authenticated');
  for(const role of ['anon','authenticated']){
   await db.exec(`reset role;set role ${role}`);
   for(const table of ['auth_attempts','parent_auth_provisioning'])assert.equal(await value(db,`select count(*)::int from csat_internal.${table}`),0);
   await assert.rejects(()=>db.query("insert into csat_internal.auth_attempts values($1,1,now())",['c'.repeat(64)]),{code:'42501'});
   await assert.rejects(()=>db.query("insert into csat_internal.parent_auth_provisioning(parent_id,state) values($1,'review')",[id(80)]),{code:'42501'});
   assert.equal((await db.query('delete from csat_internal.auth_attempts returning key_hash')).rows.length,0);
   assert.equal((await db.query("update csat_internal.parent_auth_provisioning set state='review' returning parent_id")).rows.length,0);
  }
  await db.exec('reset role');
  assert.equal(await value(db,'select count(*)::int from csat_internal.auth_attempts'),2);
  assert.equal(await value(db,'select state from csat_internal.parent_auth_provisioning'),'pending');
 }finally{await db.close();}
});

test('password gate rejects old cookies, revoked Auth sessions, inactive accounts and other children; keeps portal projection',async()=>{
 const db=await ready();try{
  await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic Parent','0912345678')",[id(80)]);
  await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
  await db.query("update students set parent_name='Synthetic Parent',parent_number='0912345678',status='Đang học' where student_id=$1",[id(10)]);
  await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
  const before=await value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['a'.repeat(64),id(10)]);
  await db.exec('reset role');await db.exec(sql('20261012_26_parent_password_auth.sql'));
  await db.query("insert into auth.users(id,phone,raw_app_meta_data) values($1,'84912345678',$2)",[id(80),JSON.stringify({role:'parent',csat_parent_id:id(80)})]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[id(81),id(80)]);
  await service(db);await assert.rejects(()=>value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]),{code:'42501'});
  await assert.rejects(()=>value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['a'.repeat(64),id(10)]),{code:'42501'});
  assert.equal(await value(db,'select link_parent_auth($1,$2,$3)',[id(80),id(80),'0912345678']),true);
  assert.equal(await value(db,'select start_parent_password_session($1,$2,$3)',[id(80),id(81),'c'.repeat(64)]),true);
  const after=await value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['c'.repeat(64),id(10)]);
  // as_of is request-time metadata, all substantive projection fields are stable.
  for(const p of before.class_progress||[])delete p.as_of;for(const p of after.class_progress||[])delete p.as_of;
  assert.deepEqual(after,before);
  assert.equal(await value(db,'select parent_password_session_valid($1,$2,$3)',['c'.repeat(64),id(2),id(81)]),false);
  await assert.rejects(()=>value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['c'.repeat(64),id(11)]),{code:'42501'});
  for(const [disable,enable] of [
   ["update parent_accounts set active=false","update parent_accounts set active=true"],
   ["update parent_accounts set phone='0987654321'","update parent_accounts set phone='0912345678'"],
   ["update auth.users set banned_until=now()+interval '1 day'","update auth.users set banned_until=null"],
   ["update auth.users set raw_app_meta_data=raw_app_meta_data||'{\"role\":\"tutor\"}'","update auth.users set raw_app_meta_data=raw_app_meta_data||'{\"role\":\"parent\"}'"]
  ]){
   await db.exec('reset role');await db.exec(disable);await service(db);
   assert.equal(await value(db,'select start_parent_password_session($1,$2,$3)',[id(80),id(81),'d'.repeat(64)]),false);
   assert.equal(await value(db,'select parent_password_session_valid($1,$2,$3)',['c'.repeat(64),id(80),id(81)]),false);
   await assert.rejects(()=>value(db,'select link_parent_auth($1,$2,$3)',[id(80),id(80),'0912345678']),{code:'22023'});
   await db.exec('reset role');await db.exec(enable);await service(db);
  }
  await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[id(81)]);await service(db);
  await assert.rejects(()=>value(db,"select parent_learning_portal($1,$2,'2026-06',0)",['c'.repeat(64),id(10)]),{code:'42501'});
  for(let i=0;i<10;i++)assert.equal(await value(db,'select consume_auth_attempt($1,$2)',['d'.repeat(64),'e'.repeat(64)]),true);
  assert.equal(await value(db,'select consume_auth_attempt($1,$2)',['d'.repeat(64),'e'.repeat(64)]),false);
  await db.exec('reset role;set role anon');await assert.rejects(()=>value(db,'select parent_auth_candidates()'),{code:'42501'});
 }finally{await db.close();}
});
