// Explicit maintenance only. Keeps Auth/tutors/Storage/intake/catalog; clears classes and learners.
// Does not alter schemas, policies, roles, migrations or remote CSATOJ data.
const fs=require('node:fs'),{createHash}=require('node:crypto');
const {inspect,resetConnection}=require('./portal-reset.cjs');
const ident=s=>s.split('.').map(x=>'"'+x.replaceAll('"','""')+'"').join('.');
const scope='reinitialize_keep_auth_tutors_storage_intake_catalog_v1';
function verifyBackup(before,backup){
 if(!backup?.restoreVerified||!backup.sha256||!Array.isArray(backup.counts))throw Error('Restored backup required');
 for(const t of [...before.reset,...before.mixed]){
  const saved=backup.counts.find(s=>s.schemaname+'.'+s.tablename===t.name);
  if(!saved||saved.count!==t.count||saved.digest!==t.digest)throw Error('Reset data changed since restored backup');
 }
}
// Caller owns the transaction, allowing seed/import to commit atomically with reset.
async function reinitializeInTransaction(db,token,backup){
 await db.query("set local lock_timeout='10s'");await db.query("set local statement_timeout='120s'");
 await db.query('select pg_advisory_xact_lock(20260908,1),pg_advisory_xact_lock(7100030),pg_advisory_xact_lock(7100032)');
 const tables=(await db.query("select schemaname,tablename from pg_tables where schemaname in ('public','csat_internal','auth','storage') order by 1,2")).rows;
 for(const t of tables)await db.query('lock table '+ident(t.schemaname+'.'+t.tablename)+(['auth','storage'].includes(t.schemaname)?' in access share mode':' in access exclusive mode'));
 const before=await inspect(db);
 if(before.unknown.length||before.token!==token)throw Error('Unknown table or changed preview');
 if(!before.reset.some(t=>t.name==='public.students')||!before.reset.some(t=>t.name==='public.classes')||!before.keep.some(t=>t.name==='auth.users'))throw Error('Unexpected Portal structure');
 verifyBackup(before,backup);
 if(before.mixed.length)await db.query('create temporary table reinitialize_keep_email on commit drop as select * from public.email_reconciliations where consultation_id is not null');
 await db.query('truncate table '+[...before.reset,...before.mixed].map(t=>ident(t.name)).join(',')+' continue identity restrict');
 if(before.mixed.length){
  await db.query('insert into public.email_reconciliations select * from reinitialize_keep_email');
  const {rows:[r]}=await db.query('select not exists ((select * from reinitialize_keep_email except select * from public.email_reconciliations) union all (select * from public.email_reconciliations except select * from reinitialize_keep_email)) ok');
  if(!r.ok)throw Error('Intake reconciliation preservation failed');
 }
 const after=await inspect(db);
 if(after.reset.some(t=>t.count!==0)||JSON.stringify(before.keep)!==JSON.stringify(after.keep))throw Error('Reset or preservation verification failed');
 await db.query("insert into public.business_audit_events(entity_table,entity_id,operation,actor_role,before_data,after_data) values('portal_reinitialize','one-time','RESET','maintenance',$1,$2)",[
  JSON.stringify({scope,token:before.token,counts:before.reset.map(({name,count})=>({name,count}))}),
  JSON.stringify({backupSha256:backup.sha256,preserved:after.keep.map(({name,count})=>({name,count}))}),
 ]);
 return {scope,cleared:before.reset.map(({name,count})=>({name,count})),preserved:after.keep.map(({name,count})=>({name,count}))};
}
async function reinitialize(db,token,backup){
 await db.query('begin');
 try{const result=await reinitializeInTransaction(db,token,backup);await db.query('commit');return result;}
 catch(e){await db.query('rollback');throw e;}
}
async function main(){
 const args=process.argv.slice(2),arg=n=>args.find(s=>s.startsWith(n+'='))?.slice(n.length+1),project=arg('--project');
 const config=resetConnection(process.env.PORTAL_REINITIALIZE_DATABASE_URL,project);
 if(process.env.CSAT_DB_CA_FILE)config.ssl.ca=fs.readFileSync(process.env.CSAT_DB_CA_FILE,'utf8');
 const {Client}=require('../database/tests/node_modules/pg'),db=new Client({...config,application_name:'csat_portal_reinitialize'});await db.connect();
 try{
  if(args.includes('--apply')){
   if(arg('--confirm')!=='REINITIALIZE_KEEP_AUTH_TUTORS_STORAGE_INTAKE_CATALOG'||!arg('--preview-token')||!arg('--backup-manifest'))throw Error('Apply prerequisites missing');
   const backup=JSON.parse(fs.readFileSync(arg('--backup-manifest'),'utf8'));
   const codeHash=createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
   if(backup.project!==project||!backup.reinitializeRehearsalVerified||backup.reinitializeCodeHash!==codeHash||createHash('sha256').update(fs.readFileSync(backup.dumpFile)).digest('hex')!==backup.sha256)throw Error('Backup or rehearsal does not match');
   console.log(JSON.stringify(await reinitialize(db,arg('--preview-token'),backup),null,2));
  }else{await db.query('begin isolation level repeatable read read only');const p=await inspect(db);await db.query('rollback');console.log(JSON.stringify({scope,...p},null,2));}
 }finally{await db.end();}
}
module.exports={scope,verifyBackup,reinitialize,reinitializeInTransaction};
if(require.main===module)main().catch(()=>{console.error('Reinitialize stopped: verify scope, project, restored backup, rehearsal and preview. No credentials or row data logged.');process.exitCode=1;});
