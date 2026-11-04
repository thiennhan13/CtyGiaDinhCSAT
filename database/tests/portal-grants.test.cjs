const {test}=require('node:test'),assert=require('node:assert/strict');
const {portalDB,parent,as,id,value}=require('./portal-upgrade-helper.cjs');
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
const begin=(db,student=10,req=100,rev=0,digest='a'.repeat(64))=>value(db,'select oj_begin_exchange($1,$2,$3,$4,$5,$6)',[id(student),id(900),id(req),rev,digest,'Fixture link']);
const finish=(db,req=100,profile=12)=>value(db,'select oj_finish_exchange($1,$2,7,1,$3)',[id(req),profile,'fixture_account']);
test('grant operations persist pending, enforce unique targets, protect completion and invalidate stale reads',async()=>{
 const db=await portalDB('20261031_32');try{
  const op=await begin(db);assert.equal(op.state,'pending');assert.deepEqual(await begin(db),op);
  await assert.rejects(()=>begin(db,10,100,0,'b'.repeat(64)),{code:'23505'});
  await assert.rejects(()=>finish(db),{code:'42501'});
  await service(db);await finish(db);await as(db);
  await begin(db,11,101);await service(db);await assert.rejects(()=>finish(db,101,12),{code:'23505'});
  await as(db);await value(db,'select admin_save_parent(null,$1,$2,$3,true,null)',['Parent','0912345678',id(10)]);await parent(db);await value(db,"select claim_parent_phone('0912345678')");
  await assert.rejects(()=>value(db,'select oj_account_context($1,null,$2)',[id(10),id(80)]),{code:'42501'});
  await service(db);const context=await value(db,'select oj_account_context($1,null,$2)',[id(10),id(80)]);assert.equal(context.mapping.profile_id,12);
  await assert.rejects(()=>value(db,'select oj_account_context($1,null,$2)',[id(11),id(80)]),{code:'42501'});
  await value(db,'select oj_invalidate_account($1,1)',[id(10)]);assert.equal((await value(db,'select oj_account_context($1,null,$2)',[id(10),id(80)])).mapping,null);
 }finally{await db.close();}
});
test('tutor receipts use current assignment, positive full balance, replay and shared ledger',async()=>{
 const db=await portalDB('20261031_32');try{
  // Verified historical roster/fees allow this fixture period to close.
  await as(db);const {close,verifyFixtureRosters}=require('./accounting.test.cjs');await verifyFixtureRosters(db);await close(db);
  const payments=await value(db,'select payment_accounts()');const p=payments.find(p=>p.billing_period==='New');assert.ok(p);
  await as(db,'tutor');assert.ok((await value(db,'select tutor_payment_accounts()')).some(x=>x.payment_id===p.payment_id));
  const args=[p.payment_id,id(501),Number(p.balance)];const first=await value(db,'select tutor_record_receipt($1,$2,$3)',args);assert.equal(Number(first.balance),0);
  assert.deepEqual(await value(db,'select tutor_record_receipt($1,$2,$3)',args),first);
  await assert.rejects(()=>value(db,'select tutor_record_receipt($1,$2,-1)',[p.payment_id,id(502)]),{code:'22023'});
  await as(db);await value(db,"select manage_class('change_tutor',$1,$2,$3)",[id(30),JSON.stringify({new_tutor_id:id(21)}),id(503)]);await as(db,'tutor');
  await assert.rejects(()=>value(db,'select tutor_record_receipt($1,$2,$3)',args),{code:'42501'});
 }finally{await db.close();}
});
test('reset clears operational data and preserves Auth/tutors/intake/templates atomically',async()=>{
 const db=await portalDB('20261031_32');try{
  await db.exec('reset role');
  await db.exec("create schema storage; create table storage.objects(id uuid primary key,name text); insert into storage.objects values(gen_random_uuid(),'fixture-avatar');");
  const avatar=id(20)+'/'+id(701)+'.webp';
  await db.query("insert into tutor_avatar_assets(path,tutor_id,state) values($1,$2,'attached')",[avatar,id(20)]);
  await db.query("insert into tutor_public_profiles(tutor_id,introduction,certificates,avatar_path) values($1,'Fixture intro','Certificate A',$2) on conflict(tutor_id) do update set certificates=excluded.certificates,avatar_path=excluded.avatar_path",[id(20),avatar]);
  await db.query("insert into consultation_requests(request_id,data,source_hash) values($1,'{}',$2)",[id(702),'a'.repeat(64)]);
  await db.query("insert into consultation_email_outbox(request_id,payload) values($1,'{}')",[id(702)]);
  await db.query("insert into email_reconciliations(consultation_id,outcome,note,actor_id) values($1,'checked','Fixture preserved',$2)",[id(702),id(1)]);
  const {inspect,reset}=require('../../scripts/portal-reset.cjs');const before=await inspect(db);assert.equal(before.unknown.length,0);
  await assert.rejects(()=>reset(db,'stale-token'),/Preview changed/);assert.equal(await value(db,'select count(*)::int from students'),2);
  const result=await reset(db,before.token);assert.ok(result.reset.every(t=>t.count===0));
  assert.equal(await value(db,'select count(*)::int from tutors'),2);assert.equal(await value(db,'select count(*)::int from auth.users'),3);
  assert.equal(await value(db,'select certificates from tutor_public_profiles where tutor_id=$1',[id(20)]),'Certificate A');
  assert.equal(await value(db,'select count(*)::int from storage.objects'),1);assert.equal(await value(db,'select count(*)::int from email_reconciliations'),1);
  assert.ok(await value(db,"select count(*)::int from business_audit_events where operation='RESET'"));
 }finally{await db.close();}
});
