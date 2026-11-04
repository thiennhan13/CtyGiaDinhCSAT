const {test}=require('node:test'),assert=require('node:assert/strict');
const {portalDB,parent,as,id,value}=require('./portal-upgrade-helper.cjs');
const contact=(db,student=10,phone='0912345678')=>value(db,'select admin_save_parent(null,$1,$2,$3,true,null)',['Parent fixture',phone,id(student)]);
test('Google claims are exclusive, repeatable, normalized and immediately revoked across readers',async()=>{
 const db=await portalDB();try{
  const pid=await contact(db);
  for(const role of ['anon','authenticated','service_role'])for(const table of ['students','parent_accounts','parent_student_links']){
   for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal(await value(db,'select has_table_privilege($1,$2,$3)',[role,'public.'+table,privilege]),false);
  }
  for(const sig of ['get_parent_lookup(text,uuid)','parent_learning_portal(text,uuid,text,integer)','start_parent_phone_session(text,text,text,text)','start_parent_password_session(uuid,uuid,text)']){
   for(const role of ['anon','authenticated','service_role'])assert.equal(await value(db,'select has_function_privilege($1,$2,$3)',[role,'public.'+sig,'EXECUTE']),false);
  }
  await as(db,'tutor');
  await assert.rejects(()=>value(db,"select claim_parent_phone('0912345678')"),{code:'42501'});
  await parent(db);
  const first=await value(db,"select claim_parent_phone('+84 912 345 678')");assert.equal(first.state,'active');
  assert.deepEqual(await value(db,"select claim_parent_phone('0084912345678')"),first);
  assert.equal((await value(db,"select parent_portal(null,'2026-06',0)")).student.student_id,id(10));
  await assert.rejects(()=>value(db,"select parent_portal($1,'2026-06',0)",[id(11)]),{code:'42501'});
  await as(db);await contact(db,11,'0987654321');await parent(db);
  assert.equal((await value(db,"select claim_parent_phone('0987654321')")).code,'ACCOUNT_ALREADY_LINKED');
  await parent(db,81);assert.equal((await value(db,"select claim_parent_phone('0912345678')")).code,'PHONE_ALREADY_LINKED');
  await as(db);await value(db,'select admin_transfer_parent($1,$2,1,$3,false)',[pid,id(81),'Correct guardian']);
  await assert.rejects(()=>value(db,'select admin_transfer_parent($1,$2,1,$3,false)',[pid,id(80),'Stale form']),{code:'40001'});
  await parent(db);assert.equal((await value(db,'select parent_access()')).state,'unlinked');
  await assert.rejects(()=>value(db,'select parent_portal()'),{code:'42501'});
  await parent(db,81);assert.equal((await value(db,'select parent_access()')).state,'active');
  await as(db);await value(db,'select admin_transfer_parent($1,$2,2,$3,true)',[pid,id(81),'Suspend access']);
  await parent(db,81);assert.equal((await value(db,"select claim_parent_phone('0912345678')")).code,'LINK_BLOCKED');
  await assert.rejects(()=>value(db,'select parent_portal()'),{code:'42501'});
 }finally{await db.close();}
});
test('admin student save synchronizes phone and contact atomically with revision; direct writes denied',async()=>{
 const db=await portalDB();try{
  const student=await value(db,'select admin_save_student(null,$1,null)',[JSON.stringify({name:'New fixture',parent_number:'+84912345678',parent_name:'Fixture parent'})]);
  const pid=await value(db,'select parent_id from parent_student_links where student_id=$1',[student.student_id]);assert.ok(pid);
  await assert.rejects(()=>value(db,'select admin_save_student(null,$1,null)',[JSON.stringify({name:'Duplicate phone',parent_number:'0912345678',parent_name:'Fixture parent'})]),{code:'23505'});
  await value(db,'select admin_save_student($1,$2,1)',[student.student_id,JSON.stringify({parent_number:'0987654321'})]);
  assert.equal(await value(db,'select phone from parent_accounts where parent_id=$1',[pid]),'0987654321');
  await assert.rejects(()=>value(db,'select admin_save_student($1,$2,1)',[student.student_id,JSON.stringify({name:'Stale'})]),{code:'40001'});
  await assert.rejects(()=>db.query("update students set name='Bypass' where student_id=$1",[student.student_id]),{code:'42501'});
 }finally{await db.close();}
});
test('certificates preserve older clients and enforce ownership/revision',async()=>{
 const db=await portalDB();try{
  await as(db,'tutor');
  const data={major:'IT',university:'Fixture university',introduction:'Fixture intro',achievements:'Item A\nItem B',certificates:'Cert A\nCert B',avatar_action:'keep'};
  const saved=await value(db,'select save_tutor_profile($1,0,$2)',[id(20),JSON.stringify(data)]);assert.equal(saved.certificates,data.certificates);
  delete data.certificates;const updated=await value(db,'select save_tutor_profile($1,$2,$3)',[id(20),saved.revision,JSON.stringify(data)]);assert.equal(updated.certificates,'Cert A\nCert B');
  await assert.rejects(()=>value(db,'select save_tutor_profile($1,0,$2)',[id(21),JSON.stringify(data)]),{code:'42501'});
 }finally{await db.close();}
});
