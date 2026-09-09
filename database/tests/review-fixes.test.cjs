const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {setup,as,id,value,close,verifyFixtureRosters}=require('./accounting.test.cjs');
async function ready(){const db=await setup();await db.exec('reset role');
 for(const n of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',n),'utf8'));
 await as(db);return db;}
const run=(db,action,cid,data,rid=randomUUID())=>value(db,'select manage_class($1,$2,$3,$4)',[action,cid,JSON.stringify(data),rid]);
const attend=(db,sid,student,status='attended')=>value(db,'select take_attendance_safe($1,$2)',[sid,JSON.stringify([{student_id:student,status,tuition_fee_snapshot:1}])]);
async function newPastClass(db,students=[10,11]){
 const yesterday=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date-1)::text");
 const end=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+5)::text");
 const c=await run(db,'create',null,{name:'Verified class',class_type:'Cơ bản',start_date:yesterday,end_date:end,tutor_id:id(20),csat_fee_per_session:30000,
 students:students.map(n=>({student_id:id(n),tuition_fee_per_session:100000})),sessions:[{date:yesterday,start_time:'06:00',end_time:'07:00'}]});
 return {...c,date:yesterday,session:await value(db,'select session_id from sessions where class_id=$1',[c.class_id])};
}
test('partial attendance blocks closing atomically; a dropped student remains on the historical roster',async()=>{
 const db=await ready();try{
  const c=await newPastClass(db);await attend(db,c.session,id(10));
  await assert.rejects(()=>close(db,900,c.date,c.date,'Complete'),/chưa được điểm danh/);
  assert.equal(await value(db,"select count(*)::int from billing_periods where source='ledger'"),0);
  await assert.rejects(()=>run(db,'verify_session_roster',c.class_id,{session_id:c.session,student_ids:[id(10)],reason:'Try omitting known member'}),/bỏ sót/);
  await run(db,'drop_student',c.class_id,{student_id:id(11)});
  await as(db,'tutor');
  const roster=await value(db,'select session_attendance_roster($1)',[c.session]);
  assert.deepEqual(roster.roster.map(r=>r.students.student_id).sort(),[id(10),id(11)]);
  await attend(db,c.session,id(11),'absent');await as(db);
  await close(db,901,c.date,c.date,'Complete');
  assert.equal(await value(db,'select count(*)::int from billing_items where session_id=$1',[c.session]),2);
  await assert.rejects(()=>attend(db,c.session,id(11),'attended'),/đã chốt/);
 }finally{await db.close();}
});
test('a later enrollment does not enter an earlier session; roster verification cannot hide known members',async()=>{
 const db=await ready();try{
  const c=await newPastClass(db,[10]);await run(db,'enroll',c.class_id,{student_id:id(11),tuition_fee_per_session:100000});
  const roster=await value(db,'select session_attendance_roster($1)',[c.session]);
  assert.deepEqual(roster.roster.map(r=>r.students.student_id),[id(10)]);
  await assert.rejects(()=>attend(db,c.session,id(11)),/tại ngày học/);
  await attend(db,c.session,id(10));await close(db,902,c.date,c.date,'Earlier');
 }finally{await db.close();}
});
test('old missing attendance can be verified and submitted without inventing a status or retroactive fee history',async()=>{
 const db=await ready();try{
  await assert.rejects(()=>close(db),/xác minh đầy đủ/);
  await assert.rejects(()=>attend(db,id(42),id(11)),/Chưa xác minh đơn giá/);
  const payload={session_id:id(42),student_id:id(11),fee:90000,reason:'Archived tuition agreement dated before this lesson'};
  await as(db,'tutor');await assert.rejects(()=>run(db,'verify_attendance_fee',id(30),payload),/admin/);
  await as(db);const request=randomUUID();await run(db,'verify_attendance_fee',id(30),payload,request);await run(db,'verify_attendance_fee',id(30),payload,request);
  assert.equal(await value(db,'select count(*)::int from attendance_fee_verifications'),1);
  assert.equal(await value(db,'select count(*)::int from session_attendance where session_id=$1 and student_id=$2',[id(42),id(11)]),0);
  assert.equal(await value(db,"select count(*)::int from student_fee_history where source='change'"),0);
  await as(db,'tutor');await attend(db,id(42),id(11));await as(db);
  assert.equal(Number(await value(db,'select tuition_fee_snapshot from session_attendance where session_id=$1 and student_id=$2',[id(42),id(11)])),90000);
  await run(db,'verify_session_roster',id(30),{session_id:id(42),student_ids:[id(10),id(11)],reason:'Full archived session roster'});
  await close(db,903,'2026-06-03','2026-06-03','Verified old');
  await assert.rejects(()=>run(db,'verify_attendance_fee',id(30),payload),/chưa chốt/);
  await assert.rejects(()=>db.exec("update attendance_fee_verifications set fee=1"),/permission denied/);
  await db.exec('reset role');await assert.rejects(()=>db.exec("delete from attendance_fee_verifications"),/không sửa hoặc xóa/);
 }finally{await db.close();}
});
test('effective attendance agrees for parent, admin and tutor after adjustments and reversal; originals stay unchanged',async()=>{
 const db=await ready();try{
  await verifyFixtureRosters(db);await close(db);
  const original=await value(db,'select jsonb_agg(to_jsonb(a) order by attendance_id) from session_attendance a');
  const item=await value(db,'select item_id from billing_items where attendance_id=$1',[id(51)]);
  await db.exec('reset role');await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Parent','+84912345678')",[id(80)]);
  await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
  const hash=createHash('sha256').update('synthetic-session').digest('hex');
  const service=async()=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');};
  await service();assert.equal(await value(db,'select start_parent_lookup($1,$2,$3)',['+84912345678',hash,'f'.repeat(64)]),'ok');
  assert.equal((await value(db,'select get_parent_lookup($1,$2)',[hash,id(10)])).attendanceCount,2);
  await as(db);const preview=await value(db,'select preview_billing_adjustment($1,$2,$3)',[item,'absent',100000]);
  const adjustment=await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6)',[item,'absent',100000,'Verified absence',preview.previewToken,randomUUID()]);
  assert.equal(await value(db,'select status from attendance_current where attendance_id=$1',[id(51)]),'absent');
  await as(db,'tutor');assert.equal((await value(db,'select session_attendance_roster($1)',[id(41)])).attendance.find(r=>r.student_id===id(10)).status,'absent');
  await service();const parent=await value(db,'select get_parent_lookup($1,$2)',[hash,id(10)]);assert.equal(parent.attendanceCount,1);
  assert.doesNotMatch(JSON.stringify(parent),/Verified absence|tuition_fee|adjustment_id|actor_id/);
  await assert.rejects(()=>value(db,'select get_parent_lookup($1,$2)',[hash,id(11)]),/quyền|liên kết|không thuộc/i);
  await as(db);const inverse=await value(db,'select preview_billing_adjustment($1,$2,$3,$4)',[item,'absent',100000,adjustment.adjustment_id]);
  await value(db,'select apply_billing_adjustment($1,$2,$3,$4,$5,$6,$7)',[item,'absent',100000,'Reverse correction',inverse.previewToken,randomUUID(),adjustment.adjustment_id]);
  assert.equal(await value(db,'select status from attendance_current where attendance_id=$1',[id(51)]),'attended');
  assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(a) order by attendance_id) from session_attendance a'),original);
  await service();assert.equal((await value(db,'select get_parent_lookup($1,$2)',[hash,id(10)])).attendanceCount,2);
 }finally{await db.close();}
});
test('one audit event per enrollment change; class history includes rename and drop without replay duplicates',async()=>{
 const db=await ready();try{
  const c=await newPastClass(db);
  const enrollment=await value(db,'select enrollment_id from class_enrollments where class_id=$1 and student_id=$2',[c.class_id,id(11)]);
  assert.equal(await value(db,"select count(*)::int from business_audit_events where entity_table='class_enrollments' and entity_id=$1",[enrollment]),1);
  const rid=randomUUID();await run(db,'rename_class',c.class_id,{new_name:'Renamed'},rid);await run(db,'rename_class',c.class_id,{new_name:'Renamed'},rid);
  await run(db,'drop_student',c.class_id,{student_id:id(11)});
  const history=await value(db,'select admin_class_history($1)',[c.class_id]);
  assert.equal(history.filter(h=>h.change_type==='rename_class').length,1);
  assert.equal(history.find(h=>h.change_type==='rename_class').new_label,'Renamed');
  assert.equal(history.filter(h=>h.change_type==='drop_student').length,1);
  assert.equal(await value(db,"select count(*)::int from business_audit_events where entity_table='class_enrollments' and entity_id=$1",[enrollment]),2);
  await assert.rejects(()=>run(db,'delete_empty',c.class_id,{}),/lưu trữ/);
  const empty=await run(db,'create',null,{name:'Empty retained',class_type:'Cơ bản',start_date:c.date,end_date:c.date,tutor_id:id(21),csat_fee_per_session:0,students:[],sessions:[]});
  await assert.rejects(()=>run(db,'delete_empty',empty.class_id,{}),/lưu trữ/);
  assert.equal(await value(db,'select count(*)::int from classes where class_id=$1',[empty.class_id]),1);
 }finally{await db.close();}
});
test('roster and effective attendance deny unrelated tutors, parent JWTs and anonymous access',async()=>{
 const db=await ready();try{
  const c=await newPastClass(db);await attend(db,c.session,id(10));
  const aid=await value(db,'select attendance_id from session_attendance where session_id=$1',[c.session]);
  for(const claims of [{role:'authenticated',sub:id(3),app_metadata:{role:'tutor'}},{role:'authenticated',sub:id(80),app_metadata:{role:'parent'}},{role:'authenticated'}]){
   await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(claims)]);await db.exec('set role authenticated');
   await assert.rejects(()=>value(db,'select session_attendance_roster($1)',[c.session]),/quyền/);
   await assert.rejects(()=>value(db,'select attendance_effective_values($1)',[aid]),/quyền/);
   assert.equal(await value(db,'select count(*)::int from attendance_current'),0);
  }
  await db.exec('reset role;set role anon');await assert.rejects(()=>value(db,'select session_attendance_roster($1)',[c.session]),/permission denied/);
 }finally{await db.close();}
});
