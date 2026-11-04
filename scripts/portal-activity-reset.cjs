// One-time maintenance: keep classes/people/configuration; clear generated activity.
// Preview is read-only. Apply requires a matching, independently restored backup.
const {createHash}=require('node:crypto');
const {resetConnection}=require('./portal-reset.cjs');
const resetTables=new Set([
 'public.attendance_fee_verifications','public.billing_adjustments','public.billing_items','public.billing_periods','public.billing_sessions',
 'public.payment_events','public.payments','public.review_corrections','public.review_email_outbox','public.review_email_runs',
 'public.session_attendance','public.session_roster_verifications','public.sessions','public.student_reviews','public.oj_session_contests',
 'csat_internal.legacy_payments',
]);
const keepTables=new Set([
 'public.announcements','public.business_audit_events','public.class_change_log','public.class_enrollments','public.class_fee_history',
 'public.class_program_history','public.class_students','public.class_tutor_history','public.classes','public.consultation_email_outbox',
 'public.consultation_requests','public.consultation_status_history','public.learning_defaults','public.learning_templates','public.parent_accounts',
 'public.parent_identity_links','public.parent_lookup_limits','public.parent_lookup_sessions','public.parent_portal_settings','public.parent_student_links',
 'public.student_fee_history','public.student_oj_accounts','public.students','public.tutor_avatar_assets','public.tutor_public_profiles','public.tutors',
 'public.oj_class_organizations','public.oj_connection_operations','public.oj_link_outbox','public.oj_links','public.oj_target_claims',
 'csat_internal.auth_attempts','csat_internal.oj_request_budget','csat_internal.parent_auth_provisioning','csat_internal.schema_migrations',
]);
// These tables contain both configuration/history to keep and activity to clear.
const mixed={
 'public.learning_records':"kind='class'",
 'public.learning_history':"record_id in (select record_id from public.learning_records where kind='class')",
 'csat_internal.curriculum_migration_snapshots':"record_id in (select record_id from public.learning_records where kind='class')",
 'csat_internal.operation_results':"not (operation in ('close_billing','payment_event','adjustment') or (operation='class_workflow' and payload->>'action' in ('add_sessions','cancel_sessions')))",
 'public.email_reconciliations':'consultation_id is not null',
};
const ident=s=>s.split('.').map(x=>'"'+x.replaceAll('"','""')+'"').join('.');
const fingerprint=async(db,table,where='true')=>(await db.query(`select count(*)::int count,md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' order by md5(to_jsonb(x)::text)),'')) digest from ${ident(table)} x where ${where}`)).rows[0];
async function inspectActivity(db){
 const tables=(await db.query("select schemaname||'.'||tablename name from pg_tables where schemaname in ('public','csat_internal','auth','storage') order by 1")).rows;
 const result={scope:'activity_keep_classes_and_people_v1',tables:[],unknown:[]};
 for(const {name}of tables){
  const mode=resetTables.has(name)?'reset':mixed[name]?'mixed':keepTables.has(name)||/^(auth|storage)\./.test(name)?'keep':'unknown';
  if(mode==='unknown')result.unknown.push(name);
  const all=await fingerprint(db,name),kept=mode==='mixed'?await fingerprint(db,name,mixed[name]):mode==='keep'?all:null;
  result.tables.push({name,mode,...all,...(kept?{kept}:{}),clearCount:mode==='reset'?all.count:mode==='mixed'?all.count-kept.count:0});
 }
 result.token=createHash('sha256').update(JSON.stringify(result)).digest('hex');return result;
}
function verifyBackupCoverage(before,backup){
 if(!backup?.restoreVerified||!Array.isArray(backup.counts))throw Error('A restored backup is required');
 for(const table of before.tables.filter(t=>t.mode==='reset'||t.mode==='mixed')){
  const saved=backup.counts.find(t=>t.schemaname+'.'+t.tablename===table.name);
  if(!saved||saved.count!==table.count||saved.digest!==table.digest)throw Error('Activity changed since the restored backup');
 }
}
async function resetActivity(db,token,backup){
 await db.query('begin');
 try{
  await db.query("set local lock_timeout='10s'");await db.query("set local statement_timeout='120s'");
  // Same centre-wide lock as class/accounting RPCs; table locks cover older direct writers too.
  await db.query('select pg_advisory_xact_lock(20260908,1)');
  const names=(await db.query("select schemaname||'.'||tablename name from pg_tables where schemaname in ('public','csat_internal','auth','storage') order by 1")).rows;
  // Supabase manages Auth/Storage ownership. We never mutate them: a read lock
  // protects their structure without requiring managed-table write privileges.
  for(const {name}of names)await db.query('lock table '+ident(name)+(/^(auth|storage)\./.test(name)?' in access share mode':' in access exclusive mode'));
  const before=await inspectActivity(db);
  if(before.unknown.length||before.token!==token)throw Error('Manifest or preview changed');
  if(!before.tables.some(t=>t.name==='public.classes'&&t.mode==='keep')||!before.tables.some(t=>t.name==='auth.users'))throw Error('Not a Portal database');
  verifyBackupCoverage(before,backup);
  const partitions=before.tables.filter(t=>t.mode==='mixed');
  for(let i=0;i<partitions.length;i++)await db.query(`create temporary table activity_keep_${i} on commit drop as select * from ${ident(partitions[i].name)} where ${mixed[partitions[i].name]}`);
  const targets=before.tables.filter(t=>t.mode==='reset'||t.mode==='mixed').map(t=>ident(t.name));
  // RESTRICT fails on unclassified foreign-key dependencies. Never CASCADE or disable RLS/triggers.
  await db.query('truncate table '+targets.join(',')+' continue identity restrict');
  const order=['public.learning_records','public.learning_history','csat_internal.curriculum_migration_snapshots','csat_internal.operation_results','public.email_reconciliations'];
  for(const name of order){const i=partitions.findIndex(t=>t.name===name);if(i>=0)await db.query(`insert into ${ident(name)} overriding system value select * from activity_keep_${i}`);}
  const after=await inspectActivity(db);
  for(const previous of before.tables){
   const current=after.tables.find(t=>t.name===previous.name);if(!current)throw Error('Table disappeared');
   if(previous.mode==='keep'&&(previous.count!==current.count||previous.digest!==current.digest))throw Error('Preserved data changed');
   if(previous.mode==='reset'&&current.count!==0)throw Error('Activity remains');
   if(previous.mode==='mixed'&&(current.clearCount!==0||JSON.stringify(previous.kept)!==JSON.stringify(current.kept)))throw Error('Configuration partition changed');
  }
  await db.query("insert into public.business_audit_events(entity_table,entity_id,operation,actor_role,before_data,after_data) values('portal_activity_reset','one-time','RESET','maintenance',$1,$2)",[
   JSON.stringify({scope:before.scope,token:before.token,cleared:before.tables.filter(t=>t.clearCount).map(({name,clearCount})=>({name,count:clearCount}))}),
   JSON.stringify({backupSha256:backup.sha256,preserved:after.tables.filter(t=>t.mode==='keep').map(({name,count})=>({name,count})),classCurriculumPreserved:true}),
  ]);
  await db.query('commit');return {scope:before.scope,cleared:before.tables.filter(t=>t.clearCount).map(({name,clearCount})=>({name,count:clearCount})),preserved:after.tables.filter(t=>t.mode==='keep').map(({name,count})=>({name,count}))};
 }catch(error){await db.query('rollback');throw error;}
}
async function main(){
 const fs=require('node:fs'),args=process.argv.slice(2),arg=n=>args.find(x=>x.startsWith(n+'='))?.slice(n.length+1),project=arg('--project');
 const config=resetConnection(process.env.PORTAL_ACTIVITY_DATABASE_URL,project);
 if(process.env.CSAT_DB_CA_FILE)config.ssl.ca=fs.readFileSync(process.env.CSAT_DB_CA_FILE,'utf8');
 const {Client}=require('../database/tests/node_modules/pg'),db=new Client({...config,application_name:'csat_activity_reset'});await db.connect();
 try{
  if(args.includes('--apply')){
   if(arg('--confirm')!=='CLEAR_ACTIVITY_KEEP_CLASSES_AND_PEOPLE'||!arg('--preview-token')||!arg('--backup-manifest'))throw Error('Missing apply prerequisites');
   const backup=JSON.parse(fs.readFileSync(arg('--backup-manifest'),'utf8'));
   if(backup.project!==project||!backup.restoreVerified||createHash('sha256').update(fs.readFileSync(backup.dumpFile)).digest('hex')!==backup.sha256)throw Error('Invalid restored backup');
   console.log(JSON.stringify(await resetActivity(db,arg('--preview-token'),backup),null,2));
  }else{await db.query('begin isolation level repeatable read read only');const preview=await inspectActivity(db);await db.query('rollback');console.log(JSON.stringify(preview,null,2));}
 }finally{await db.end();}
}
module.exports={inspectActivity,resetActivity,verifyBackupCoverage};
if(require.main===module)main().catch(()=>{console.error('Activity reset stopped; check target, restored backup, preview and preservation checks. No credentials or row data logged.');process.exitCode=1;});
