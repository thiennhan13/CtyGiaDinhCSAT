const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ready:base}=require('./learning-portal.test.cjs');
const {as,id,value,close,verifyFixtureRosters}=require('./accounting.test.cjs');
const read=f=>fs.readFileSync(path.join(__dirname,'../',f),'utf8');
const migration=read('migrations/20260922_21_parent_email_completion.sql');
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
async function ready(){const db=await base();await db.exec('reset role');for(const f of ['20260911_16_parent_domestic_phones.sql','20260911_17_class_program_defaults.sql','20260913_18_consultations.sql','20260914_19_email_operations.sql','20260922_20_curriculum_frameworks.sql'])await db.exec(read('migrations/'+f));return db;}
const email=(db,a,d={})=>value(db,'select review_email_work($1,$2)',[a,JSON.stringify(d)]);
async function prepare(db){let def=await value(db,"select pg_get_functiondef('review_email_work(text,jsonb)'::regprocedure)");await db.exec(def.replace("local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'","local_now timestamp:='2026-06-28 08:00'::timestamp"));await db.exec("update parent_portal_settings set email_enabled=true,admin_emails=ARRAY['admin@example.test'];update tutors set email='tutor@example.test'");await service(db);await email(db,'prepare',{origin:'https://portal.example.test',sender:'CSAT <test@example.test>',reply_to:'csattutor@gmail.com'});}
async function publishQueue(db,student){await db.exec('reset role');const def=db.originalQueue??=await value(db,"select pg_get_functiondef('learning_month_queue(text)'::regprocedure)");await db.exec(def.replace("coalesce(sr.review_status,'missing') AS status",student?"CASE WHEN st.student_id='"+student+"'::uuid THEN 'published' ELSE coalesce(sr.review_status,'missing') END AS status":"'published'::text AS status"));}
test('completion: refresh only pending first-send targets; preserve snapshot and freeze retry payload',async()=>{const db=await ready();try{
 await db.exec(migration);await prepare(db);await db.exec('reset role');const snapshot=await value(db,'select snapshot from review_email_runs');assert.equal(snapshot.length,2);
 await publishQueue(db,id(10));await service(db);const first=await email(db,'claim');assert.equal(first.targets.length,1);assert.equal(first.targets[0].student_id,id(11));assert.doesNotMatch(first.payload.text,/Student A/);assert.match(first.payload.text,/Student B/);
 await email(db,'finish',{outbox_id:first.outbox_id,lease_id:first.lease_id,status:'failed',error_code:'transport_uncertain'});
 await publishQueue(db);await db.exec('update review_email_outbox set next_attempt_at=now()');await service(db);const retry=await email(db,'claim');assert.equal(retry.outbox_id,first.outbox_id);assert.deepEqual(retry.payload,first.payload);assert.deepEqual(retry.targets,first.targets);
 await db.exec('reset role');assert.deepEqual(await value(db,'select snapshot from review_email_runs'),snapshot);
 }finally{await db.close();}});
test('completion: skip all-completed first sends and still create digest; prevent repeated migration',async()=>{const db=await ready();try{
 await db.exec(migration);await prepare(db);await publishQueue(db);await service(db);assert.equal(await email(db,'claim'),null);await email(db,'admin');assert.equal((await email(db,'claim')).kind,'admin');await db.exec('reset role');assert.equal(await value(db,"select error_code from review_email_outbox where kind='tutor'"),'already_completed');
 await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');await db.exec(read('verification/20260922_parent_email_completion.sql'));
 }finally{await db.close();}});
test('completion: session fees reflect snapshots, absences, unknowns and billing corrections without leaking another child',async()=>{const db=await ready();try{
 const before=await value(db,'select jsonb_agg(to_jsonb(p) order by payment_id) from payments p');await db.exec(migration);assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p) order by payment_id) from payments p'),before);
 await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic Parent','0912345678')",[id(80)]);await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
 const portal=()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(10),'2026-06']);
 let p=await portal();assert.equal(p.attendance.find(s=>s.session_id===id(40)).tuition_amount,100000);assert.equal(p.attendance.find(s=>s.session_id===id(40)).billing_period,'Legacy');assert.equal(p.attendance.find(s=>s.session_id===id(42)).tuition_amount,0);
 await assert.rejects(()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']),/quyền|liên kết/);
 await db.exec('reset role');await db.query('update session_attendance set tuition_fee_snapshot=null where attendance_id=$1',[id(51)]);await service(db);assert.equal((await portal()).attendance.find(s=>s.session_id===id(41)).tuition_amount,null);await db.exec('reset role');await db.query('update session_attendance set tuition_fee_snapshot=100000 where attendance_id=$1',[id(51)]);await as(db);await verifyFixtureRosters(db);await close(db);const item=await value(db,'select item_id from billing_items where attendance_id=$1',[id(51)]);const preview=await value(db,'select preview_billing_adjustment($1,$2,$3)',[item,'attended',120000]);await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[item,'attended',120000,'Synthetic correction',preview.previewToken,id(170)]);
 await service(db);p=await portal();assert.equal(p.attendance.find(s=>s.session_id===id(41)).tuition_amount,120000);assert.equal(p.attendance.find(s=>s.session_id===id(41)).fee_adjusted,true);
 assert.doesNotMatch(JSON.stringify(p),/actor_id|Synthetic correction|tuition_fee_snapshot|Student B/);
 await db.exec('reset role');await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(11)]);await service(db);const second=await value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']);assert.equal(second.students.length,2);assert.equal(second.attendance.find(s=>s.session_id===id(40)),undefined);assert.equal(second.attendance.find(s=>s.session_id===id(41)).tuition_amount,0);
 await db.exec('reset role;set role anon');await assert.rejects(()=>portal(),/permission denied/);
 }finally{await db.close();}});
