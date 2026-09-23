const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {ready:base}=require('./learning-portal.test.cjs');
const {as,id,value}=require('./accounting.test.cjs');const {randomUUID}=require('node:crypto');
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
const email=(db,a,d={})=>value(db,'select review_email_work($1,$2)',[a,JSON.stringify(d)]);
const config={origin:'https://portal.example.test',sender:'CSAT <test@example.test>',reply_to:'csattutor@gmail.com'};
async function clock(db,date){await db.exec('reset role');let def=await value(db,"select pg_get_functiondef('review_email_work(text,jsonb)'::regprocedure)");def=def.replace(/local_now timestamp:=[^;]+;/,"local_now timestamp:='"+date+"'::timestamp;");await db.exec(def);}
async function ready(date='2026-06-28 08:00'){
 const db=await base();await db.exec('reset role');for(const f of ['20260913_18_consultations.sql','20260914_19_email_operations.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',f),'utf8'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../verification/20260914_email_operations.sql'),'utf8'));
 await db.exec("update parent_portal_settings set email_enabled=true,admin_emails=ARRAY[' ADMIN@example.test ','admin@example.test'];update tutors set email='tutor@example.test'");await clock(db,date);await service(db);return db;
}
const prepare=db=>email(db,'prepare',config);
test('rollout: unique snapshot, normalized digest recipients, reply-to and one monthly instruction; retains history',async()=>{const db=await ready();try{
 await db.exec('reset role');const before=await value(db,'select jsonb_agg(to_jsonb(p)) from payments p');await service(db);await prepare(db);assert.equal((await prepare(db)).existing,true);
 const job=await email(db,'claim');assert.equal(job.kind,'tutor');assert.equal(job.payload.reply_to,'csattutor@gmail.com');assert.match(job.payload.text,/tag sử dụng/);assert.doesNotMatch(job.payload.text,/nhận xétutor/);assert.match(job.payload.text,/không cần nhập lại/);
 assert.equal(await email(db,'claim'),null);assert.equal((await email(db,'finish',{outbox_id:job.outbox_id,lease_id:randomUUID(),status:'accepted'})).updated,false);
 await email(db,'finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:'failed',error_code:'provider_http_429'});await email(db,'admin');await email(db,'admin');const digest=await email(db,'claim');assert.equal(digest.kind,'admin');assert.equal(digest.recipient,'admin@example.test');assert.match(digest.payload.text,/danh sách lập lúc/);assert.match(digest.payload.text,/Gửi lỗi/);
 await db.exec('reset role');assert.equal(await value(db,"select count(*)::int from review_email_outbox where kind='admin'"),1);assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p)) from payments p'),before);
 }finally{await db.close();}});
test('rollout: preview is read-only, admin recovery checks token/date, records actor, never replaces existing run',async()=>{const db=await ready('2026-07-02 09:00');try{
 await as(db,'tutor');await assert.rejects(()=>email(db,'preview',{month:'2026-06'}),/quản trị|admin/i);await assert.rejects(()=>email(db,'claim'),/máy chủ/);
 await as(db);const preview=await email(db,'preview',{month:'2026-06'});assert.equal(preview.allowed,true);assert.equal(preview.existing,false);assert.ok(preview.queue.length);
 const data={...config,month:'2026-06',token:preview.token,request_id:randomUUID()};await assert.rejects(()=>email(db,'prepare_manual',{...data,token:'bad'}),/thay đổi/);
 assert.equal((await email(db,'prepare_manual',data)).prepared,true);assert.equal((await email(db,'prepare_manual',{...data,token:'old'})).existing,true);
 assert.equal(await value(db,'select created_by from review_email_runs'),id(1));await clock(db,'2026-07-08 09:00');await as(db);await assert.rejects(()=>email(db,'prepare_manual',data),/Ngoài/);
 await service(db);await email(db,'claim');await email(db,'admin');await db.exec('reset role');assert.equal(await value(db,"select count(*)::int from review_email_outbox where kind='admin'"),1);
 }finally{await db.close();}});
test('rollout: calendar honors Vietnam day 28/time, February and year rollover',async()=>{const db=await ready();try{
 for(const date of ['2026-02-27 23:59','2026-02-28 07:59','2026-03-01 08:00','2026-12-29 08:00']){await clock(db,date);await service(db);assert.equal((await prepare(db)).outside_schedule,true);}
 await clock(db,'2026-02-28 08:00');await service(db);assert.equal((await prepare(db)).month,'2026-02');await clock(db,'2027-01-07 09:00');await as(db);assert.equal((await email(db,'preview',{month:'2026-12'})).allowed,true);assert.equal((await email(db,'preview',{month:'2026-11'})).allowed,false);
 }finally{await db.close();}});
test('rollout: changed assignment and legacy targets never expose stale student payload',async()=>{const db=await ready();try{
 await prepare(db);await db.exec('reset role');await db.exec("update tutors set email='changed@example.test'");await service(db);assert.equal(await email(db,'claim'),null);await db.exec('reset role');assert.equal(await value(db,'select error_code from review_email_outbox'),'assignment_changed');
 }finally{await db.close();}});
test('rollout: published text-only review is complete; skip final tutor and allow admin digest',async()=>{const db=await ready();try{
 await prepare(db);await db.exec('reset role');const def=await value(db,"select pg_get_functiondef('learning_month_queue(text)'::regprocedure)");await db.exec(def.replace("coalesce(sr.review_status,'missing') AS status","'published'::text AS status"));await service(db);assert.equal(await email(db,'claim'),null);await email(db,'admin');assert.equal((await email(db,'claim')).kind,'admin');await db.exec('reset role');assert.equal(await value(db,"select error_code from review_email_outbox where kind='tutor'"),'already_completed');
 }finally{await db.close();}});
test('rollout: exhausted retries, stale untouched mail and 23-hour cutoff require review',async()=>{const db=await ready();try{
 await prepare(db);let job=await email(db,'claim');await db.exec('reset role');await db.query("update review_email_outbox set attempts=3 where outbox_id=$1",[job.outbox_id]);await service(db);await email(db,'finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:'failed',error_code:'transport_uncertain'});
 await db.exec('reset role');assert.equal(await value(db,'select status from review_email_outbox'),'manual_review');await db.exec("update review_email_outbox set status='failed',attempts=2,first_attempt_at=now()-interval '24 hours',next_attempt_at=now()");await service(db);assert.equal(await email(db,'claim'),null);
 await db.exec('reset role');assert.equal(await value(db,'select error_code from review_email_outbox'),'idempotency_window_expired');await db.exec("update review_email_outbox set status='queued',attempts=0,first_attempt_at=null;update review_email_runs set created_at=now()-interval '8 days'");await service(db);assert.equal(await email(db,'claim'),null);await db.exec('reset role');assert.equal(await value(db,'select error_code from review_email_outbox'),'stale_unattempted');
 }finally{await db.close();}});
test('rollout: reconciliation is admin-only append-only and prevents further retry without rewriting status',async()=>{const db=await ready();try{
 await prepare(db);const job=await email(db,'claim');await email(db,'finish',{outbox_id:job.outbox_id,lease_id:job.lease_id,status:'failed',error_code:'transport_uncertain'});
 await as(db,'tutor');await assert.rejects(()=>value(db,"select reconcile_email('review',$1,'handled_elsewhere','Test handled')",[job.outbox_id]),/quản trị|admin/i);await as(db);await value(db,"select reconcile_email('review',$1,'handled_elsewhere','Test handled')",[job.outbox_id]);
 const overview=await value(db,'select review_email_overview()');assert.equal(overview.runs[0].needs_review,0);assert.equal(await value(db,'select status from review_email_outbox'),'failed');await assert.rejects(()=>db.exec("delete from email_reconciliations"),/permission denied/);await db.exec('reset role');await db.exec('update review_email_outbox set next_attempt_at=now()');await service(db);assert.equal(await email(db,'claim'),null);
 }finally{await db.close();}});
