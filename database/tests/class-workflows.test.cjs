
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {setup,as,id,value,query}=require('./accounting.test.cjs');
async function ready(){
 const db=await setup();await db.exec('reset role');
 for(const name of ['20260908_07_class_workflows.sql','20260908_08_read_models.sql','20260908_09_reporting.sql'])
  await db.exec(fs.readFileSync(require('node:path').join(__dirname,'../migrations',name),'utf8'));
 await as(db);return db;
}
async function run(db,action,cid,data,rid=200){return value(db,'select manage_class($1,$2,$3,$4)',[action,cid,JSON.stringify(data),id(rid)]);}
async function newClass(db,rid=200,tutor=id(20)){
 const today=await value(db,"select (now() at time zone 'Asia/Ho_Chi_Minh')::date::text");
 const end=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+30)::text");
 const data={name:'New class',class_type:'Cơ bản',start_date:today,end_date:end,tutor_id:tutor,csat_fee_per_session:30000,
  students:[{student_id:id(10),tuition_fee_per_session:100000}],sessions:[]};
 return {...await run(db,'create',null,data,rid),today,end};
}
test('class workflows: atomic duplicate prevention, bounds, same-day times and adjacency',async()=>{
 const db=await ready();try{
  const c=await newClass(db);
  const spec={sessions:[{date:c.today,start_time:'18:00',end_time:'19:00'}]};
  await run(db,'add_sessions',c.class_id,spec,201);
  assert.deepEqual(await run(db,'add_sessions',c.class_id,spec,201),await run(db,'add_sessions',c.class_id,spec,201));
  await assert.rejects(()=>run(db,'add_sessions',c.class_id,spec,202),/trùng/);
  await run(db,'add_sessions',c.class_id,{sessions:[{date:c.today,start_time:'19:00',end_time:'20:00'}]},203);
  await assert.rejects(()=>run(db,'add_sessions',c.class_id,{sessions:[{date:c.today,start_time:'22:00',end_time:'12:00'}]},204),/cùng ngày/);
  const far=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+50)::text");
  await assert.rejects(()=>run(db,'add_sessions',c.class_id,{sessions:[{date:far,start_time:'18:00',end_time:'19:00'}]},205),/thời hạn/);
  const other=await newClass(db,206);
  await assert.rejects(()=>run(db,'add_sessions',other.class_id,spec,207),/trùng/);
  assert.equal(await value(db,'select count(*)::int from sessions where class_id=$1',[c.class_id]),2);
 }finally{await db.close();}
});
test('class workflows: future rates do not leak into today, and are used by newly created future sessions',async()=>{
 const db=await ready();try{
  const c=await newClass(db),tomorrow=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+1)::text");
  await run(db,'update_csat_fee',c.class_id,{new_csat_fee:99000,effective_date:tomorrow},210);
  assert.equal(Number(await value(db,'select csat_fee_per_session from class_current_state where class_id=$1',[c.class_id])),30000);
  await run(db,'add_sessions',c.class_id,{sessions:[{date:tomorrow,start_time:'18:00',end_time:'19:00'}]},211);
  assert.equal(Number(await value(db,'select csat_fee_snapshot from sessions where class_id=$1',[c.class_id])),99000);
  await assert.rejects(()=>db.query('update classes set csat_fee_per_session=1 where class_id=$1',[c.class_id]),/permission denied/);
 }finally{await db.close();}
});
test('class workflows: pause retains enrollment, archive closes it, resume does not resurrect cancelled sessions',async()=>{
 const db=await ready();try{
  const c=await newClass(db),tomorrow=await value(db,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+1)::text");
  await run(db,'add_sessions',c.class_id,{sessions:[{date:tomorrow,start_time:'18:00',end_time:'19:00'}]},220);
  await run(db,'set_status',c.class_id,{status:'inactive'},221);
  assert.equal(await value(db,'select status from class_students where class_id=$1',[c.class_id]),'active');
  assert.equal(await value(db,'select status from sessions where class_id=$1',[c.class_id]),'cancelled');
  await run(db,'set_status',c.class_id,{status:'active'},222);
  assert.equal(await value(db,'select status from sessions where class_id=$1',[c.class_id]),'cancelled');
  await run(db,'set_status',c.class_id,{status:'archived'},223);
  assert.equal(await value(db,'select status from class_students where class_id=$1',[c.class_id]),'dropped');
  assert.equal(await value(db,'select count(*)::int from class_enrollments where class_id=$1 and left_on is null',[c.class_id]),0);
 }finally{await db.close();}
});
test('class workflows: tutors cannot extend, change prices, create for another tutor or write tables directly',async()=>{
 const db=await ready();try{
  const c=await newClass(db);await as(db,'tutor');
  assert.equal(await value(db,'select is_current_class_tutor($1)',[c.class_id]),true);
  await assert.rejects(()=>run(db,'extend',c.class_id,{start_date:c.today,end_date:c.end,sessions:[]},230),/admin/);
  await assert.rejects(()=>run(db,'update_csat_fee',c.class_id,{new_csat_fee:1},231),/admin/);
  await assert.rejects(()=>db.query('delete from sessions where class_id=$1',[c.class_id]),/permission denied/);
  await as(db);await run(db,'change_tutor',c.class_id,{new_tutor_id:id(21)},232);
  await as(db,'tutor');
  assert.equal(await value(db,'select is_current_class_tutor($1)',[c.class_id]),false);
  assert.equal(await value(db,'select count(*)::int from classes where class_id=$1',[c.class_id]),0);
  assert.equal(await value(db,'select count(*)::int from class_students where class_id=$1',[c.class_id]),0);
 }finally{await db.close();}
});
