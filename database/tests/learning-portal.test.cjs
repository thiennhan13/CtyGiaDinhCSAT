const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
async function ready(){const db=await setup();await db.exec('reset role');
for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09|10)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
await as(db);return db;}
const body=()=>({goal:'Real goal',focus_tags:[],next_step:'Practice',stage_index:null,title:'',content:'',continuation:'',program:'basic',format:'group',template_id:'30000000-0000-4000-8000-000000000001'});
const save=(db,b=body(),rev=0,publish=false)=>value(db,'select save_learning_record($1,$2,null,null,$3,$4,$5)',[id(30),'class',rev,JSON.stringify(b),publish]);
test('learning migration preserves accounting, pins template, isolates drafts and rejects stale revisions',async()=>{
 const db=await ready();try{
 const before=await value(db,'select jsonb_agg(to_jsonb(p)) from payments p');
 await as(db,'tutor'); const first=await save(db,body(),0,true);assert.equal(first.revision,1);
 const second=await save(db,{...body(),goal:'Private draft'},1,false);assert.equal(second.published.goal,'Real goal');
 await assert.rejects(()=>save(db,body(),1,true),/phiên khác/);
 await assert.rejects(()=>save(db,{...body(),program:'advanced'},2,true),/khớp/);
 await db.exec('reset role'); assert.equal(await value(db,'select count(*)::int from learning_history'),2);
 assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p)) from payments p'),before);
 await assert.rejects(()=>db.exec("update learning_templates set title='Changed'"),/không sửa|lịch sử/);
 await as(db,'tutor');await assert.rejects(()=>db.exec("update learning_records set draft='{}'"),/permission denied/);
 }finally{await db.close();}
});
test('parent projection rejects other children and only shows published learning and actual financial values',async()=>{
 const db=await ready();try{
 await save(db,body(),0,true);await save(db,{...body(),goal:'Secret draft'},1,false);
 await db.exec('reset role');await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'P','+84912345678')",[id(80)]);
 await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');
 await value(db,'select start_parent_lookup($1,$2,$3)',['+84912345678','a'.repeat(64),'b'.repeat(64)]);
 const data=await value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(10),'2026-06']);
 assert.equal(data.plans[0].body.goal,'Real goal');assert.doesNotMatch(JSON.stringify(data),/Secret draft|actor_id|tuition_fee_snapshot|legacy_payments/);
 assert.equal(data.invoices[0].balance,0);assert.equal(data.attendance.length,3);
 await assert.rejects(()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']),/quyền|liên kết/);
 await db.exec('reset role;set role anon');await assert.rejects(()=>value(db,'select parent_learning_portal($1,null,null,0)',['a'.repeat(64)]),/permission denied/);
 }finally{await db.close();}
});
module.exports={ready,body,save};

const {randomUUID}=require('node:crypto');
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
const email=(db,action,data={})=>value(db,'select review_email_work($1,$2)',[action,JSON.stringify(data)]);
test('email snapshot is unique, claims are leased, accepted mail never retries, and admin sees failures',async()=>{
 const db=await ready();try{
 await db.exec('reset role');await db.query('update tutors set email=$1 where tutor_id=$2',['tutor@example.test',id(20)]);
 // Freeze only the scheduling clock inside the isolated test database.
 let def=await value(db,"select pg_get_functiondef('review_email_work(text,jsonb)'::regprocedure)");
 def=def.replace("local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'","local_now timestamp:='2026-06-28 08:00'::timestamp");
 await db.exec(def);await as(db);
 await value(db,'select admin_learning_settings($1,$2)',['settings',JSON.stringify({revision:1,contact_label:'CSAT',contact_url:'https://example.test',admin_emails:['admin@example.test'],email_enabled:true})]);
 await assert.rejects(()=>email(db,'claim'),/permission denied/);
 await service(db);
 await email(db,'prepare',{origin:'https://portal.example.test',sender:'CSAT <csat@example.test>'});
 await email(db,'prepare',{origin:'https://portal.example.test',sender:'CSAT <csat@example.test>'});
 const job=await email(db,'claim');assert.equal(job.kind,'tutor');assert.ok(job.payload.text.includes('Student A'));
 assert.equal(await email(db,'claim'),null);
 await email(db,'finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:'failed',error_code:'provider_http_429'});
 await email(db,'admin');await email(db,'admin');
 const admin=await email(db,'claim');assert.equal(admin.kind,'admin');assert.match(admin.payload.text,/provider_http_429/);
 await email(db,'finish',{outbox_id:admin.outbox_id,lease_id:admin.lease_id,status:'accepted',provider_id:'test-provider-id'});
 assert.equal(await email(db,'claim'),null);
 await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from review_email_runs'),1);
 assert.equal(await value(db,'select count(*)::int from review_email_outbox'),2);
 await db.query("update review_email_outbox set first_attempt_at=now()-interval '25 hours',next_attempt_at=now() where outbox_id=$1",[job.outbox_id]);
 await service(db);assert.equal(await email(db,'claim'),null);
 await db.exec('reset role');assert.equal(await value(db,'select status from review_email_outbox where outbox_id=$1',[job.outbox_id]),'manual_review');
 }finally{await db.close();}
});
test('email stays disabled by default and never closes financial periods',async()=>{
 const db=await ready();try{await service(db);assert.deepEqual(await email(db,'prepare'),{disabled:true});await db.exec('reset role');assert.equal(await value(db,"select count(*)::int from billing_periods where source='ledger'"),0);}finally{await db.close();}
});
test('bulk parent import rechecks source, is repeatable, preserves links and refuses locked contacts',async()=>{
 const db=await ready();try{
 await db.exec('reset role');await db.query("update students set parent_name='Parent P',parent_number='0912345678' where student_id=any($1)",[[id(10),id(11)]]);
 await as(db);const row=n=>({student_id:id(n),parent_name:'Parent P',parent_number:'0912345678',phone:'+84912345678'});
 const call=rows=>value(db,'select admin_import_parent_contacts($1)',[JSON.stringify(rows)]);
 assert.deepEqual(await call([row(10)]),{created:1,linked:1});
 assert.deepEqual(await call([row(10),row(11)]),{created:0,linked:1});
 assert.deepEqual(await call([row(11)]),{created:0,linked:0});
 await assert.rejects(()=>call([{...row(11),parent_number:'0987654321'}]),/thay đổi/);
 await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from parent_student_links'),2);
 await db.exec('update parent_accounts set active=false');await as(db);await assert.rejects(()=>call([row(10)]),/khóa/);
 await as(db,'tutor');await assert.rejects(()=>call([row(10)]),/quản trị|admin/i);
 }finally{await db.close();}
});
test('new class receives a pinned default and an idempotent retry preserves tutor edits',async()=>{
 const db=await ready();try{
 const today=await value(db,"select (now() at time zone 'Asia/Ho_Chi_Minh')::date::text");
 const data={name:'Advanced new class',class_type:'Lớp Nâng cao',program:'advanced',teaching_format:'individual',tutor_id:id(20),csat_fee_per_session:0,start_date:today,end_date:today,students:[],sessions:[]};
 const key=randomUUID();const create=()=>value(db,'select create_class_with_learning($1,$2)',[JSON.stringify(data),key]);
 const c=await create();const workspace=await value(db,'select learning_workspace($1,$2)',[c.class_id,today.slice(0,7)]);
 assert.equal(workspace.records[0].draft.template_id,'30000000-0000-4000-8000-000000000002');
 assert.equal(workspace.records[0].draft.format,'individual');assert.equal(workspace.records[0].published,null);
 await create();await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from learning_records where class_id=$1',[c.class_id]),1);
 }finally{await db.close();}
});
test('SQL rejects malformed and cross-scope learning data even when API is bypassed',async()=>{
 const db=await ready();try{
 for(const patch of [{extra:'Hidden payload'},{focus_tags:['fabricated']},{focus_tags:['k-arrays','k-arrays']},{goal:1},{stage_index:9},{format:'unknown'}])
  await assert.rejects(()=>save(db,{...body(),...patch},0,true));
 await as(db,'tutor');await assert.rejects(()=>value(db,'select save_learning_record($1,$2,$3,null,0,$4,false)',[id(30),'student',id(10),JSON.stringify(body())]),/không hợp lệ/);
 await assert.rejects(()=>value(db,'select save_learning_record($1,$2,null,$3,0,$4,false)',[id(30),'session',id(999),JSON.stringify(body())]),/không thuộc/);
 }finally{await db.close();}
});
test('published review corrections append exactly once and keep original content',async()=>{
 const db=await ready();try{
 await as(db,'tutor');const rid=randomUUID();
 await value(db,'select save_student_review($1,$2,$3,null,$4,$5,$6,$7,$8,$9,$10)',[rid,id(10),id(30),'2026-06','Tháng 6','Original observation','','','published','[]']);
 await as(db);const key=randomUUID();
 const correct=()=>value(db,'select admin_review_followup($1,$2,$3,$4)',['correction',rid,key,'Clarification of observed work']);
 await correct();await correct();
 assert.equal(await value(db,'select general_assessment from student_reviews where review_id=$1',[rid]),'Original observation');
 const rows=await value(db,'select admin_class_reviews($1,$2)',[id(30),'2026-06']);assert.equal(rows[0].corrections.length,1);
 await as(db,'tutor');await assert.rejects(()=>correct(),/quản trị|admin/i);
 await db.exec('reset role');await assert.rejects(()=>db.exec("delete from review_corrections"),/không sửa/);
 }finally{await db.close();}
});

test('combined release SQL applies atomically and read-only verification succeeds',async()=>{
 const db=await setup();try{
 await db.exec('reset role');
 for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
 const before=await value(db,'select jsonb_agg(to_jsonb(p) order by payment_id) from payments p');
 await db.exec(fs.readFileSync(path.join(__dirname,'../upgrade-learning-portal.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../verification/20260910_learning_portal.sql'),'utf8'));
 assert.equal(await value(db,"select count(*)::int from csat_internal.schema_migrations where version like '20260910_%'"),5);
 assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p) order by payment_id) from payments p'),before);
 await assert.rejects(()=>db.exec(fs.readFileSync(path.join(__dirname,'../upgrade-learning-portal.sql'),'utf8')),/already present/);
 await db.exec('rollback');
 assert.equal(await value(db,'select count(*)::int from learning_templates'),2);
 }finally{await db.close();}
});
