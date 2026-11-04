const {test}=require('node:test'),assert=require('node:assert/strict');
const {portalDB}=require('./portal-upgrade-helper.cjs');
const {inspect}=require('../../scripts/portal-reset.cjs');
const {reinitialize}=require('../../scripts/portal-reinitialize.cjs');
const backupFor=p=>({restoreVerified:true,sha256:'fixture',counts:[...p.reset,...p.keep,...p.mixed].map(t=>{const [schemaname,tablename]=t.name.split('.');return {schemaname,tablename,count:t.count,digest:t.digest};})});
test('reinitialize clears learners/classes and all dependent activity while preserving Auth/tutors/catalog/intake',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role');const before=await inspect(db);assert.equal(before.unknown.length,0);
  const result=await reinitialize(db,before.token,backupFor(before)),after=await inspect(db);
  assert(result.cleared.some(t=>t.name==='public.classes'&&t.count>0));
  for(const t of after.reset)assert.equal(t.count,0,t.name);
  for(const t of before.keep.filter(t=>t.name!=='public.business_audit_events'))assert.deepEqual(after.keep.find(n=>n.name===t.name),t,t.name);
  assert.equal(after.keep.find(t=>t.name==='public.business_audit_events').count,before.keep.find(t=>t.name==='public.business_audit_events').count+1);
 }finally{await db.close();}
});
test('reinitialize rejects stale backup/preview and unknown dependencies atomically',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role');const before=await inspect(db),backup=backupFor(before);
  await assert.rejects(reinitialize(db,'stale',backup));
  backup.counts.find(t=>t.tablename==='students').digest='changed';
  await assert.rejects(reinitialize(db,before.token,backup));
  await db.exec('create table public.unclassified_dependency(id int primary key,class_id uuid references public.classes)');
  const unknown=await inspect(db);await assert.rejects(reinitialize(db,unknown.token,backupFor(unknown)));
  assert.equal((await db.query('select count(*)::int n from public.classes')).rows[0].n,before.reset.find(t=>t.name==='public.classes').count);
 }finally{await db.close();}
});
test('reinitialize never requests write privileges on managed Auth tables',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role; create role reset_operator bypassrls; grant usage on schema public,csat_internal,auth to reset_operator; grant all on all tables in schema public,csat_internal to reset_operator; grant usage on all sequences in schema public,csat_internal to reset_operator; grant select on all tables in schema auth to reset_operator; set role reset_operator');
  const before=await inspect(db);assert.equal((await db.query("select has_table_privilege('auth.users','UPDATE') allowed")).rows[0].allowed,false);
  await reinitialize(db,before.token,backupFor(before));
  assert.deepEqual((await inspect(db)).keep.find(t=>t.name==='auth.users'),before.keep.find(t=>t.name==='auth.users'));
 }finally{await db.close();}
});
test('audit failure after truncate rolls back learners and classes as well as preserved rows',async()=>{
 const db=await portalDB('20261031_32');
 try{
  await db.exec('reset role');const before=await inspect(db);
  const failAudit={query:async(sql,args)=>{if(sql.startsWith('insert into public.business_audit_events'))throw Error('Synthetic audit failure');return db.query(sql,args);}};
  await assert.rejects(reinitialize(failAudit,before.token,backupFor(before)),/Synthetic audit failure/);
  const after=await inspect(db);assert.deepEqual(after,before);
 }finally{await db.close();}
});
