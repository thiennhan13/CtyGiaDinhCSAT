const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const dir=path.join(__dirname,'../migrations');
const instance=id(900),hash='a'.repeat(64);
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
async function ready(existing){
 const db=await setup(existing);await db.exec('reset role');
 await db.exec('alter table auth.users add column phone text, add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n<='20261023_28_oj_links.sql').sort()){
  if(/^202609(14_19|22_21|23_22)/.test(name))continue;
  await db.exec(fs.readFileSync(path.join(dir,name),'utf8'));
 }
 await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Parent fixture','0912345678')",[id(80)]);
 await db.query("update students set parent_name='Parent fixture',parent_number='0912345678',status='Đang học' where student_id in ($1,$2)",[id(10),id(11)]);
 await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await service(db);assert.equal(await value(db,'select start_parent_phone_session($1,$2,$3,$4)',['0912345678',hash,'b'.repeat(64),'c'.repeat(64)]),'ok');
 await as(db);return db;
}
const queue=(db,kind,n,rev,payload,req,active=true)=>value(db,'select oj_queue_link($1,$2,$3,$4,$5,$6,$7,$8)',[kind,id(n),instance,rev,active,JSON.stringify(payload),'Admin verified',id(req)]);
const context=db=>value(db,"select oj_parent_context($1,$2,'2026-06')",[hash,id(10)]);
async function ack(db,req,rev=1){await service(db);await value(db,'select oj_ack($1,$2)',[id(req),rev]);await as(db);}

if(require.main===module){
test('OJ migration: permissions, uniqueness, idempotency and retry after definitive rejection',async()=>{
 const db=await ready();try{
  assert.equal((await value(db,'select oj_workspace(null,null)')).admin,true);
  await as(db,'tutor');await assert.rejects(()=>queue(db,'student',10,0,{profile_id:7},100),{code:'42501'});
  await assert.rejects(()=>db.query('select * from oj_links'),{code:'42501'});
  await assert.rejects(()=>value(db,'select oj_ack($1,1)',[id(100)]),{code:'42501'});
  await as(db);const first=await queue(db,'student',10,0,{profile_id:7},100);
  assert.deepEqual(await queue(db,'student',10,0,{profile_id:7},100),first);
  await assert.rejects(()=>queue(db,'student',10,0,{profile_id:8},100),{code:'23505'});
  await assert.rejects(()=>queue(db,'student',10,1,{profile_id:8},101),{code:'40001'});
  await assert.rejects(()=>queue(db,'student',11,0,{profile_id:7},102),{code:'23505'});
  await service(db);assert.equal((await context(db)).student,null);
  await value(db,'select oj_reject($1,$2)',[id(100),'account_unavailable']);
  await as(db);await assert.rejects(()=>queue(db,'student',10,0,{profile_id:7},100),{code:'22023'});
  await queue(db,'student',10,0,{profile_id:8},103);await ack(db,103);
  await service(db);assert.equal((await context(db)).student.revision,1);
  await assert.rejects(()=>value(db,"select oj_parent_context($1,$2,'2026-06')",[hash,id(11)]),{code:'42501'});
  await as(db);await assert.rejects(()=>queue(db,'student',10,0,{profile_id:9},104),{code:'40001'});
 }finally{await db.close();}
});
test('OJ replacement reserves previous target until acknowledgement or definitive rejection',async()=>{
 const db=await ready();try{
  await queue(db,'student',10,0,{profile_id:7},120);await ack(db,120);
  await queue(db,'student',10,1,{profile_id:8},121);
  await assert.rejects(()=>queue(db,'student',11,0,{profile_id:7},122),{code:'23505'});
  await service(db);await value(db,'select oj_reject($1,$2)',[id(121),'account_unavailable']);await as(db);
  const links=(await value(db,'select oj_workspace(null,null)')).links;
  assert.equal(links[0].payload.profile_id,7);assert.equal(links[0].state,'active');assert.equal(links[0].revision,1);
  await queue(db,'student',10,1,{profile_id:9},123);await ack(db,123,2);
  await queue(db,'student',11,0,{profile_id:7},124);await ack(db,124);
 }finally{await db.close();}
});
test('OJ session roster is server-derived; parent access stops before revoke sync and after relink',async()=>{
 const db=await ready();try{
  await queue(db,'student',10,0,{profile_id:7},110);await ack(db,110);
  await queue(db,'student',11,0,{profile_id:8},111);await ack(db,111);
  await queue(db,'class',30,0,{organization_id:3},112);await ack(db,112);
  await as(db,'tutor');await queue(db,'session',41,0,{contest_ids:[9],roster:[{student_id:id(99)}]},113);await ack(db,113);
  await service(db);const c=await context(db);assert.equal(c.sessions.length,1);assert.equal(c.sessions[0].session_id,id(41));
  assert.equal(JSON.stringify(c).includes('profile_id'),false);
  await as(db);await queue(db,'student',10,1,{},114,false);
  await service(db);assert.equal((await context(db)).student,null);assert.equal((await context(db)).sessions.length,0);
  await value(db,'select oj_ack($1,1)',[id(110)]);assert.equal((await context(db)).student,null); // delayed acknowledgement cannot reactivate
  await ack(db,114,2);await queue(db,'student',10,2,{profile_id:10},115);await ack(db,115,3);
  await service(db);assert.equal((await context(db)).sessions.length,0); // stale roster does not follow another account
  await db.exec('reset role');await db.query('delete from parent_student_links where student_id=$1',[id(10)]);await service(db);
  await assert.rejects(()=>context(db),{code:'42501'});
 }finally{await db.close();}
});
}
module.exports={ready,queue,ack,context,service};
