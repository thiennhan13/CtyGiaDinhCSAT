const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8').replace(/\r\n/g,'\n');
const query=async(db,sql,args=[]) => (await db.query(sql,args)).rows;
const value=async(db,sql,args=[])=>Object.values((await query(db,sql,args))[0])[0];
async function as(db,role='admin') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'authenticated',sub:id(role==='admin'?1:2),app_metadata:{role}})]);
  await db.exec('set role authenticated');
}
async function bootstrap(db){
 await db.exec(`create role authenticated; create role anon; create role service_role bypassrls; create schema auth;
 create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on all functions in schema auth to authenticated,anon,service_role;
 create function public.uuid_generate_v4() returns uuid language sql volatile as $$ select gen_random_uuid() $$;`);
}
async function setup(existing,{migrate=true}={}){
 const db=existing??new PGlite();
 await bootstrap(db);
 await db.exec(read('fixtures/schema-before-accounting.sql').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',''));
 await db.exec(`insert into auth.users(id) values('${id(1)}'),('${id(2)}'),('${id(3)}');
 insert into tutors(tutor_id,auth_uid,name) values('${id(20)}','${id(2)}','Tutor A'),('${id(21)}','${id(3)}','Tutor B');
 insert into students(student_id,name) values('${id(10)}','Student A'),('${id(11)}','Student B');
 insert into classes(class_id,tutor_id,name,start_date,end_date,csat_fee_per_session) values('${id(30)}','${id(20)}','Class A','2026-01-01','2026-12-31',30000);
 insert into class_students(class_id,student_id,tuition_fee_per_session) values('${id(30)}','${id(10)}',100000),('${id(30)}','${id(11)}',100000);
 insert into sessions(session_id,class_id,date,start_time,end_time,status,csat_fee_snapshot,tutor_id_snapshot,billing_period)
 values('${id(40)}','${id(30)}','2026-06-01','18:00','19:00','completed',30000,'${id(20)}','Legacy'),
 ('${id(41)}','${id(30)}','2026-06-02','18:00','19:00','completed',30000,'${id(20)}',null),
 ('${id(42)}','${id(30)}','2026-06-03','18:00','19:00','completed',30000,'${id(20)}',null);
 insert into session_attendance(attendance_id,session_id,student_id,status,tuition_fee_snapshot) values
 ('${id(50)}','${id(40)}','${id(10)}','attended',100000),('${id(51)}','${id(41)}','${id(10)}','attended',100000),
 ('${id(52)}','${id(41)}','${id(11)}','absent',100000),('${id(53)}','${id(42)}','${id(10)}','absent',100000);
 insert into payments(payment_id,student_id,class_id,billing_period,amount,status) values
 ('${id(60)}','${id(10)}','${id(30)}','Legacy',100000,'paid'),('${id(61)}','${id(11)}','${id(30)}','Legacy',200000,'unpaid');`);
 const before=await value(db,"select jsonb_agg(to_jsonb(p) order by payment_id) from payments p");
 if(migrate){
 await db.exec(read('../migrations/20260908_05_preserve_history.sql'));
 await db.exec(read('../migrations/20260908_06_atomic_billing.sql'));
 }
 assert.deepEqual(await value(db,"select jsonb_agg(to_jsonb(p) order by payment_id) from payments p"),before);
 await as(db);return db;
}
async function report(db,start='2026-06-02',end='2026-06-03') {
 return value(db,'select public.billing_report($1,$2,null)',[start,end]);
}
async function close(db,request=100,start='2026-06-02',end='2026-06-03',label='New',token){
 const preview=token??(await report(db,start,end)).previewToken;
 return value(db,'select public.close_billing_period($1,$2,$3,$4,$5)',[start,end,label,preview,id(request)]);
}
if(require.main===module){
test('accounting migration preserves legacy records and protects historical writes',async()=>{
 const db=await setup();try{
  await assert.rejects(()=>db.query('select rollback_billing_partial($1)',['Legacy']),/giữ nguyên/);
  await assert.rejects(()=>db.query('select take_attendance_safe($1,$2)',[id(40),JSON.stringify([{student_id:id(10),status:'absent'}])]),/đã chốt/);
  await assert.rejects(()=>db.query('delete from classes where class_id=$1',[id(30)]),/foreign key/);
  await assert.rejects(()=>db.query('delete from payments where payment_id=$1',[id(60)]),/permission denied/);
  assert.equal((await value(db,'select billing_report(null,null,$1)',['Legacy'])).payments.find(p=>p.payment_id===id(60)).balance,0);
 }finally{await db.close();}
});
test('close includes all-absent sessions; repeat is idempotent and another period cannot double bill',async()=>{
 const db=await setup();try{
  const preview=await report(db);const result=await close(db,100,undefined,undefined,undefined,preview.previewToken);
  assert.equal(result.invoice_count,1);assert.equal(result.session_count,2);
  assert.deepEqual(await close(db,100,undefined,undefined,undefined,preview.previewToken),result);
  assert.equal((await report(db)).sessions.length,0);
  assert.equal((await close(db,101,undefined,undefined,'Another')).invoice_count,0);
  assert.equal(await value(db,'select count(*)::int from billing_items'),3);
  assert.equal(await value(db,'select count(*)::int from billing_sessions'),2);
 }finally{await db.close();}
});
test('stale preview and transaction failure leave no partial documents',async()=>{
 const db=await setup();try{
  const preview=await report(db);
  await db.query('select take_attendance_safe($1,$2)',[id(41),JSON.stringify([{student_id:id(10),status:'absent'}])]);
  await assert.rejects(()=>close(db,100,undefined,undefined,undefined,preview.previewToken),/Dữ liệu đã thay đổi/);
  assert.equal(await value(db,'select count(*)::int from billing_sessions'),0);
  await db.exec(`reset role; create function csat_internal.fail_close() returns trigger language plpgsql as $$begin raise exception 'injected close failure';end$$;
    create trigger fail_close before insert on billing_items for each row execute function csat_internal.fail_close();`);
  await as(db);await assert.rejects(()=>close(db),/injected close failure/);
  assert.equal(await value(db,'select count(*)::int from billing_periods where source=\'ledger\''),0);
  assert.equal(await value(db,'select count(*)::int from billing_sessions'),0);
 }finally{await db.close();}
});
test('paid invoices are retained; adjustments calculate tuition, CSAT, salary and refund independently',async()=>{
 const db=await setup();try{
  await close(db);
  const r=await value(db,'select billing_report(null,null,$1)',['New']);const p=r.payments[0];
  const event=await value(db,'select record_payment_event($1,$2,$3)',[p.payment_id,id(110),100000]);
  assert.equal(event.balance,0);
  assert.deepEqual(await value(db,'select record_payment_event($1,$2,$3)',[p.payment_id,id(110),100000]),event);
  const item=await value(db,'select item_id from billing_items where attendance_id=$1',[id(51)]);
  const preview=await value(db,'select preview_billing_adjustment($1,$2,$3)',[item,'absent',100000]);
  assert.equal(preview.tuition_delta,-100000);assert.equal(preview.csat_delta,-30000);assert.equal(preview.net_delta,-70000);
  const adjustment=await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[item,'absent',100000,'Correct attendance',preview.previewToken,id(111)]);
  assert.equal(adjustment.balance,-100000);
  assert.equal(await value(db,'select amount from payments where payment_id=$1',[p.payment_id]),'100000.00');
  assert.equal(await value(db,'select status from session_attendance where attendance_id=$1',[id(51)]),'attended');
  await value(db,'select record_payment_event($1,$2,$3,$4)',[p.payment_id,id(112),-100000,'Refund recorded']);
  assert.equal((await value(db,'select billing_report(null,null,$1)',['New'])).payments[0].balance,0);
 }finally{await db.close();}
});
test('historical tutor report remains available after reassignment without exposing another tutor',async()=>{
 const db=await setup();try{
  await db.exec('reset role');await db.query('update classes set tutor_id=$1 where class_id=$2',[id(21),id(30)]);
  await as(db,'tutor');const history=await value(db,'select tutor_billing_history($1)',['Legacy']);
  assert.equal(history.sessions.length,1);assert.equal(history.sessions[0].tutor_id,id(20));
  await assert.rejects(()=>report(db),/quản trị/);
 }finally{await db.close();}
});
}
async function verifyFixtureRosters(db) {
 for(const [sid,students] of [[id(41),[id(10),id(11)]],[id(42),[id(10)]]])
  await value(db,'select manage_class($1,$2,$3,$4)',['verify_session_roster',id(30),JSON.stringify({session_id:sid,student_ids:students,reason:'Explicit roster from synthetic fixture'}),require('node:crypto').randomUUID()]);
}
module.exports={bootstrap,setup,as,id,query,value,close,report,verifyFixtureRosters};
