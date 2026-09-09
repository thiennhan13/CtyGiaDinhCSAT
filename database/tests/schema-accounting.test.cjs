const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {bootstrap,setup,as,id,value,close,verifyFixtureRosters}=require('./accounting.test.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8').replace(/\r\n/g,'\n');
const migrations=fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09)_/.test(n)).sort();
async function upgrade(db){await db.exec('reset role');for(const n of migrations.slice(2))await db.exec(read('../migrations/'+n));await as(db);await verifyFixtureRosters(db);}
async function run(db,action,cid,data,rid){return value(db,'select manage_class($1,$2,$3,$4)',[action,cid,JSON.stringify(data),id(rid)]);}
async function catalog(db){
 await db.exec('reset role');
 return {
  columns:(await db.query("select table_schema,table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema in ('public','csat_internal') order by 1,2,3")).rows,
  constraints:(await db.query("select n.nspname,r.relname,c.conname,pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace where n.nspname in ('public','csat_internal') order by 1,2,3")).rows,
  functions:(await db.query("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition,p.proacl::text privileges from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','csat_internal') order by 1,2,3")).rows,
  policies:(await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows,
  indexes:(await db.query("select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','csat_internal') order by 1,2,3")).rows,
  grants:(await db.query("select table_schema,table_name,grantee,privilege_type from information_schema.table_privileges where table_schema in ('public','csat_internal') order by 1,2,3,4")).rows,
 };
}
test('canonical fresh schema and populated upgrade have identical columns, constraints, functions, policies, indexes and grants',async()=>{
 const upgraded=await setup(),fresh=new PGlite();try{
  const originals=await value(upgraded,"select jsonb_build_object('sessions',(select jsonb_agg(to_jsonb(s) order by session_id) from sessions s),'attendance',(select jsonb_agg(to_jsonb(a) order by attendance_id) from session_attendance a),'payments',(select jsonb_agg(to_jsonb(p) order by payment_id) from payments p))");
  await upgrade(upgraded);await bootstrap(fresh);await fresh.exec(read('../CSAT_master_schema.sql').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',''));
  assert.deepEqual(await catalog(fresh),await catalog(upgraded));
  const after=await value(upgraded,"select jsonb_build_object('sessions',(select jsonb_agg(to_jsonb(s) order by session_id) from sessions s),'attendance',(select jsonb_agg(to_jsonb(a) order by attendance_id) from session_attendance a),'payments',(select jsonb_agg(to_jsonb(p) order by payment_id) from payments p))");
  assert.deepEqual(after,originals);
  for(const n of migrations)assert.ok(read('../CSAT_master_schema.sql').includes('-- BEGIN '+n+'\n'+read('../migrations/'+n)));
 }finally{await upgraded.close();await fresh.close();}
});
test('final schema guards all financial writes, privileged RPCs, disabled tutors and old closed periods',async()=>{
 const db=await setup();try{
  await upgrade(db);
  for(const table of ['sessions','session_attendance','classes','class_students','payments']){
   await assert.rejects(()=>db.exec('delete from '+table),/permission denied/);
   assert.equal(await value(db,"select has_table_privilege('service_role',$1,'TRUNCATE')",[table]),false);
  }
  await as(db,'tutor');
  for(const sql of ["select billing_report('2026-06-01','2026-06-30',null)","select payment_accounts()","select admin_finance_summary()","select admin_tutor_salary_history('"+id(20)+"')"])
   await assert.rejects(()=>db.exec(sql),/quản trị/);
  await db.exec('reset role');await db.query("update tutors set status='inactive' where tutor_id=$1",[id(20)]);await as(db,'tutor');
  assert.equal(await value(db,'select count(*)::int from class_current_state'),0);
  await assert.rejects(()=>value(db,'select tutor_billing_history()'),/không hợp lệ/);
  await as(db);await assert.rejects(()=>db.query('update sessions set billing_period=null where session_id=$1',[id(40)]),/permission denied/);
 }finally{await db.close();}
});
test('manual fee verification preserves original attendance; tutor cannot add a student outside known enrollment dates',async()=>{
 const db=await setup();try{
  await upgrade(db);
  await assert.rejects(()=>run(db,'verify_attendance_fee',id(30),{session_id:id(42),student_id:id(11),fee:90000,status:'attended',reason:'Confirmed fee'},600),/danh sách/);
  await run(db,'verify_attendance_fee',id(30),{session_id:id(41),student_id:id(10),fee:120000,status:'absent',reason:'Confirmed fee'},601);
  assert.equal(await value(db,'select status from session_attendance where attendance_id=$1',[id(51)]),'attended');
  assert.equal(Number(await value(db,'select tuition_fee_snapshot from session_attendance where attendance_id=$1',[id(51)])),120000);
  await assert.rejects(()=>run(db,'verify_attendance_fee',id(30),{session_id:id(40),student_id:id(10),fee:1,reason:'Old closed'},602),/chưa chốt/);
  await run(db,'drop_student',id(30),{student_id:id(11)},603);
  await db.exec('reset role');await db.exec("update class_enrollments set joined_on='2026-07-01' where student_id='"+id(11)+"'");
  await as(db,'tutor');
  await assert.rejects(()=>value(db,'select take_attendance_safe($1,$2)',[id(42),JSON.stringify([{student_id:id(11),status:'attended'}])]),/tại ngày học/);
 }finally{await db.close();}
});
test('final reporting keeps snapshots after reassignment and agrees across salary, payment and adjustment reports',async()=>{
 const db=await setup();try{
  await upgrade(db);await close(db);
  const p=(await value(db,'select payment_accounts()')).find(p=>p.billing_period==='New');
  await value(db,'select record_payment_event($1,$2,$3)',[p.payment_id,id(610),100000]);
  const item=await value(db,'select item_id from billing_items where attendance_id=$1',[id(51)]);
  const preview=await value(db,'select preview_billing_adjustment($1,$2,$3)',[item,'absent',100000]);
  await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[item,'absent',100000,'Verified absence',preview.previewToken,id(611)]);
  assert.equal((await value(db,'select payment_accounts(null,$1)',[p.payment_id]))[0].balance,-100000);
  assert.equal((await value(db,'select admin_finance_summary()')).recorded_net_receipts,100000);
  await run(db,'change_tutor',id(30),{new_tutor_id:id(21)},612);
  const logs=await value(db,'select admin_class_history($1,null)',[id(30)]);
  assert.equal(logs.filter(l=>l.change_type==='tutor_change').length,1);
  const history=await value(db,'select admin_tutor_salary_history($1)',[id(20)]);
  assert.equal(history.find(r=>r.period==='New').net,0);
  await as(db,'tutor');
  const summary=await value(db,'select tutor_month_summary($1,$2)',['2026-06-02','2026-06-03']);
  assert.equal(summary.net,0);assert.equal(summary.csat,0);
  assert.equal((await value(db,"select tutor_billing_history('New')")).totalTutorSalary,0);
 }finally{await db.close();}
});
test('reports and close do not silently truncate beyond 1000 sessions',async()=>{
 const db=await setup();try{
  await db.exec('reset role');
  await db.exec("insert into sessions(class_id,date,start_time,end_time,status,csat_fee_snapshot,tutor_id_snapshot) select '"+id(30)+"',d::date,'08:00','09:00','completed',30000,'"+id(20)+"' from generate_series('2020-01-01'::date,'2022-10-01'::date,'1 day') d; insert into session_attendance(session_id,student_id,status,tuition_fee_snapshot) select session_id,'"+id(10)+"','attended',100000 from sessions where date<'2023-01-01';");
  await upgrade(db);
  let verificationRequest=100000;
  for(const row of (await db.query("select session_id from sessions where date<'2023-01-01'")).rows) await run(db,'verify_session_roster',id(30),{session_id:row.session_id,student_ids:[id(10)],reason:'Synthetic historical roster'},verificationRequest++);
  const preview=await value(db,"select billing_report('2020-01-01','2022-10-01',null)");
  assert.equal(preview.sessions.length,1005);
  await value(db,'select close_billing_period($1,$2,$3,$4,$5)',['2020-01-01','2022-10-01','Large period',preview.previewToken,id(620)]);
  const closed=await value(db,"select billing_report(null,null,'Large period')");
  assert.equal(closed.sessions.length,1005);assert.equal(closed.originalInvoiceTotal,100500000);
 }finally{await db.close();}
});

test('one-transaction upgrade preserves populated production-like schema and refuses a partial failure',async()=>{
 for(const invalid of [false,true]){
  const db=await setup(undefined,{migrate:false});try{
   await db.exec('reset role');
   await db.exec('alter table payments drop column paid_at; alter table classes alter column class_type type text; alter table student_reviews add constraint existing_live_review_unique unique(student_id,month_year,class_id)');
   if(invalid)await db.exec("insert into student_reviews(student_id,tutor_id,class_id,general_assessment) values('"+id(10)+"','"+id(20)+"','"+id(30)+"','Unresolved old review')");
   const before=await db.exec(read('../verification/accounting_preflight.sql'));
   await db.exec(read('../verification/accounting_reconciliation.sql'));
   if(invalid){
    await assert.rejects(()=>db.exec(read('../upgrade-accounting.sql')),/Nhận xét thiếu/);await db.exec('rollback');
    assert.equal(await value(db,"select to_regclass('public.billing_items')"),null);
    const after=await db.exec(read('../verification/accounting_preflight.sql'));
    assert.deepEqual(after[1].rows[0].jsonb_build_object.fingerprints,before[1].rows[0].jsonb_build_object.fingerprints);
   }else{
    await db.exec(read('../upgrade-accounting.sql'));
    assert.equal(await value(db,'select count(*)::int from csat_internal.schema_migrations'),6);
    const after=await db.exec(read('../verification/accounting_preflight.sql'));
    const extract=results=>results.flatMap(r=>r.rows).find(r=>r.jsonb_build_object)?.jsonb_build_object;
    assert.deepEqual(extract(after).fingerprints,extract(before).fingerprints);
    assert.equal(await value(db,"select count(*)::int from pg_constraint where conrelid='student_reviews'::regclass and contype='u'"),1);
    await db.exec(read('../verification/accounting_postflight.sql'));
   }
  }finally{await db.close();}
 }
});
test('zero-fee attended sessions require confirmation and never deduct CSAT',async()=>{
 const db=await setup();try{
  await db.exec('reset role');await db.query('update session_attendance set tuition_fee_snapshot=0 where attendance_id=$1',[id(51)]);
  await upgrade(db);
  const preview=await value(db,"select billing_report('2026-06-02','2026-06-02',null)");
  await assert.rejects(()=>value(db,'select close_billing_period($1,$2,$3,$4,$5)',['2026-06-02','2026-06-02','Zero',preview.previewToken,id(630)]),/0 đồng/);
  await value(db,'select close_billing_period($1,$2,$3,$4,$5,$6)',['2026-06-02','2026-06-02','Zero',preview.previewToken,id(631),[id(51)]]);
  const closed=await value(db,"select billing_report(null,null,'Zero')");
  assert.equal(closed.totalStudentTuition,0);assert.equal(closed.totalCsatRevenue,0);assert.equal(closed.totalTutorSalary,0);assert.equal(closed.payments.length,0);
 }finally{await db.close();}
});
test('new attendance uses effective fees, ignores caller fee, rejects duplicates and preserves omitted students',async()=>{
 const db=await setup();try{
  await upgrade(db);
  await value(db,'select take_attendance_safe($1,$2)',[id(41),JSON.stringify([{student_id:id(10),status:'absent',tuition_fee_snapshot:1}])]);
  assert.equal(await value(db,'select count(*)::int from session_attendance where session_id=$1',[id(41)]),2);
  assert.equal(Number(await value(db,'select tuition_fee_snapshot from session_attendance where attendance_id=$1',[id(51)])),100000);
  await assert.rejects(()=>value(db,'select take_attendance_safe($1,$2)',[id(41),JSON.stringify([{student_id:id(10),status:'attended'},{student_id:id(10),status:'absent'}])]),/bị lặp/);
 }finally{await db.close();}
});

test('adjustments recheck the whole session and reversal preserves original records',async()=>{
 const db=await setup();try{
  await upgrade(db);await close(db);
  const first=await value(db,'select item_id from billing_items where attendance_id=$1',[id(51)]);
  const second=await value(db,'select item_id from billing_items where attendance_id=$1',[id(52)]);
  const stale=await value(db,'select preview_billing_adjustment($1,$2,$3)',[first,'absent',100000]);
  const add=await value(db,'select preview_billing_adjustment($1,$2,$3)',[second,'attended',100000]);
  assert.equal(add.csat_delta,0);
  const applied=await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[second,'attended',100000,'Verified second student',add.previewToken,id(640)]);
  await assert.rejects(()=>value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[first,'absent',100000,'Stale first student',stale.previewToken,id(641)]),/đã thay đổi/);
  const inverse=await value(db,'select preview_billing_adjustment($1,$2,$3,$4)',[second,'attended',100000,applied.adjustment_id]);
  assert.equal(inverse.tuition_delta,-100000);assert.equal(inverse.csat_delta,0);
  await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6,$7)',[second,'attended',100000,'Reverse mistaken review',inverse.previewToken,id(642),applied.adjustment_id]);
  assert.equal((await value(db,"select billing_report(null,null,'New')")).totalTutorSalary,70000);
  assert.equal(await value(db,'select status from session_attendance where attendance_id=$1',[id(52)]),'absent');
  await assert.rejects(()=>value(db,'select preview_billing_adjustment($1,$2,$3)',[second,'absent',100000]),/không thay đổi/);
 }finally{await db.close();}
});
test('unknown historical prices cannot be presented as zero revenue or salary',async()=>{
 const db=await setup();try{
  await db.exec('reset role');await db.query('update session_attendance set tuition_fee_snapshot=null where attendance_id=$1',[id(51)]);
  await upgrade(db);
  await assert.rejects(()=>value(db,"select billing_report('2026-06-02','2026-06-03',null)"),/thiếu đơn giá/);
  await as(db,'tutor');await assert.rejects(()=>value(db,"select tutor_month_summary('2026-06-02','2026-06-03')"),/thiếu đơn giá/);
 }finally{await db.close();}
});
