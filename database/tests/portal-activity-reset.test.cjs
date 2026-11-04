const {test}=require('node:test'),assert=require('node:assert/strict');
const {portalDB,as,id}=require('./portal-upgrade-helper.cjs');
const {inspectActivity,resetActivity}=require('../../scripts/portal-activity-reset.cjs');
const backupFor=p=>({restoreVerified:true,sha256:'fixture',counts:p.tables.map(t=>{const [schemaname,tablename]=t.name.split('.');return {schemaname,tablename,count:t.count,digest:t.digest};})});

test('activity reset keeps classes, rosters, prices, people and published class curriculum while clearing generated history',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await as(db);await db.exec('reset role');
  const session=(await db.query('select session_id,class_id from public.sessions order by session_id limit 1')).rows[0];
  await db.query("insert into public.learning_records(record_id,class_id,kind,session_id,draft) values($1,$2,'session',$3,'{}')",[id(779),session.class_id,session.session_id]);
  await db.query("insert into public.learning_history(record_id,revision,body,was_published) values($1,1,'{}',false)",[id(779)]);
  await db.query("insert into csat_internal.operation_results(actor_id,request_id,operation,payload,result) values($1,$2,'class_workflow','{\"action\":\"change_tutor\"}','{}'),($1,$3,'close_billing','{}','{}')",[id(1),id(780),id(781)]);
  const before=await inspectActivity(db);assert.equal(before.unknown.length,0);
  assert(before.tables.find(t=>t.name==='public.sessions').clearCount>0);
  assert(before.tables.find(t=>t.name==='public.learning_records').kept.count>0);
  const result=await resetActivity(db,before.token,backupFor(before));assert.equal(result.scope,before.scope);
  const after=await inspectActivity(db);
  for(const old of before.tables.filter(t=>t.mode==='keep'&&t.name!=='public.business_audit_events')){
   const now=after.tables.find(t=>t.name===old.name);assert.equal(now.count,old.count,old.name);assert.equal(now.digest,old.digest,old.name);
  }
  for(const table of after.tables.filter(t=>t.mode==='reset'))assert.equal(table.count,0,table.name);
  for(const table of after.tables.filter(t=>t.mode==='mixed')){assert.equal(table.clearCount,0,table.name);assert.deepEqual(table.kept,before.tables.find(t=>t.name===table.name).kept,table.name);}
  assert.equal((await db.query('select count(*)::int n from csat_internal.operation_results where request_id=$1',[id(780)])).rows[0].n,1);
  assert.equal(after.tables.find(t=>t.name==='public.business_audit_events').count,before.tables.find(t=>t.name==='public.business_audit_events').count+1);
 }finally{await db.close();}
});

test('activity reset refuses stale previews, changed backup coverage and unclassified dependencies without losing rows',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role');const before=await inspectActivity(db),saved=backupFor(before);
  await assert.rejects(resetActivity(db,'stale',saved));
  const wrong=backupFor(before);wrong.counts.find(t=>t.schemaname==='public'&&t.tablename==='sessions').digest='changed';
  await assert.rejects(resetActivity(db,before.token,wrong));
  await db.exec('create table public.unclassified_activity(id int primary key, class_id uuid references public.classes)');
  const unknown=await inspectActivity(db);await assert.rejects(resetActivity(db,unknown.token,backupFor(unknown)));
  assert.equal((await db.query('select count(*)::int n from public.sessions')).rows[0].n,before.tables.find(t=>t.name==='public.sessions').count);
 }finally{await db.close();}
});

test('activity reset needs only SELECT on managed Auth tables and never requests their write privileges',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role; create role activity_operator bypassrls; grant usage on schema public,csat_internal,auth to activity_operator; grant all on all tables in schema public,csat_internal to activity_operator; grant usage on all sequences in schema public,csat_internal to activity_operator; grant select on all tables in schema auth to activity_operator; set role activity_operator');
  const before=await inspectActivity(db);
  assert.equal((await db.query("select has_table_privilege('auth.users','UPDATE') allowed")).rows[0].allowed,false);
  await resetActivity(db,before.token,backupFor(before));
  const after=await inspectActivity(db);
  assert.deepEqual(after.tables.find(t=>t.name==='auth.users'),before.tables.find(t=>t.name==='auth.users'));
  assert.equal(after.tables.find(t=>t.name==='public.sessions').count,0);
 }finally{await db.close();}
});
