// Explicit one-time operational reset. Never runs from application startup or migration.
const {createHash}=require('node:crypto');
const resetPublic=['attendance_fee_verifications','billing_adjustments','billing_items','billing_periods','billing_sessions','class_change_log','class_enrollments','class_fee_history','class_program_history','class_students','class_tutor_history','classes','learning_history','learning_records','oj_class_organizations','oj_connection_operations','oj_link_outbox','oj_links','oj_session_contests','oj_target_claims','parent_accounts','parent_identity_links','parent_lookup_limits','parent_lookup_sessions','parent_student_links','payment_events','payments','review_corrections','review_email_outbox','review_email_runs','session_attendance','session_roster_verifications','sessions','student_fee_history','student_oj_accounts','student_reviews','students'];
const keepPublic=['announcements','business_audit_events','consultation_email_outbox','consultation_requests','consultation_status_history','learning_defaults','learning_templates','parent_portal_settings','tutor_avatar_assets','tutor_public_profiles','tutors'];
const resetInternal=['curriculum_migration_snapshots','legacy_payments','operation_results','parent_auth_provisioning'];
const keepInternal=['schema_migrations','auth_attempts','oj_request_budget'];
const quote=x=>'"'+x.replaceAll('"','""')+'"';
async function inspect(db){
 const {rows}=await db.query("select schemaname,tablename from pg_tables where schemaname in ('public','csat_internal','auth','storage') order by 1,2");
 const result={reset:[],keep:[],mixed:[],unknown:[]};
 for(const {schemaname:s,tablename:t}of rows){
  const name=s+'.'+t;
  const kind=['auth','storage'].includes(s)?'keep':s==='public'&&t==='email_reconciliations'?'mixed':(s==='public'?resetPublic:resetInternal).includes(t)?'reset':(s==='public'?keepPublic:keepInternal).includes(t)?'keep':'unknown';
  const {rows:[r]}=await db.query(`select count(*)::int count,md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' order by md5(to_jsonb(x)::text)),'')) digest from ${quote(s)}.${quote(t)} x`);
  result[kind].push({name,...r});
 }
 result.token=createHash('sha256').update(JSON.stringify(result)).digest('hex');return result;
}
async function reset(db,token){
 await db.query('begin');
 try{
  await db.query("set local lock_timeout='5s'");
  await db.query("set local statement_timeout='120s'");
  // Lock every inspected table: neither new intake nor a hidden writer can change the approved preview.
  const tables=await db.query("select schemaname,tablename from pg_tables where schemaname in ('public','csat_internal','auth','storage') order by 1,2");
  for(const t of tables.rows)await db.query(`lock table ${quote(t.schemaname)}.${quote(t.tablename)} in access exclusive mode`);
  const before=await inspect(db);
  if(before.unknown.length)throw Error('Unclassified tables; review reset manifest');
  if(before.token!==token)throw Error('Preview changed; inspect again');
  if(!before.reset.some(t=>t.name==='public.students')||!before.keep.some(t=>t.name==='auth.users'))throw Error('Not a Portal database');
  if(before.mixed.length)await db.query('create temporary table retained_reconciliations on commit drop as select * from public.email_reconciliations where consultation_id is not null');
  const targets=[...before.reset,...before.mixed].map(t=>t.name.split('.').map(quote).join('.'));
  await db.query('truncate table '+targets.join(',')+' continue identity restrict');
  if(before.mixed.length)await db.query('insert into public.email_reconciliations select * from retained_reconciliations');
  if(before.mixed.length){
   const {rows:[check]}=await db.query('select not exists ((select * from retained_reconciliations except select * from public.email_reconciliations) union all (select * from public.email_reconciliations except select * from retained_reconciliations)) ok');
   if(!check.ok)throw Error('Intake reconciliation preservation failed');
  }
  const after=await inspect(db);
  if(after.reset.some(t=>t.count!==0))throw Error('Reset verification failed');
  if(JSON.stringify(before.keep)!==JSON.stringify(after.keep))throw Error('Preserved data changed');
  await db.query("insert into public.business_audit_events(entity_table,entity_id,operation,actor_role,before_data,after_data) values('portal_reset','one-time','RESET','maintenance',$1,$2)",[
   JSON.stringify({token:before.token,counts:before.reset.map(({name,count})=>({name,count}))}),JSON.stringify({preserved:before.keep.map(t=>t.name),reset:after.reset.map(t=>t.name)})]);
  await db.query('commit');return {reset:after.reset.map(({name,count})=>({name,count})),preserved:after.keep.map(({name,count})=>({name,count}))};
 }catch(e){await db.query('rollback');throw e;}
}
function resetConnection(connection,project){
 const url=new URL(connection);
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.username||!url.password||url.pathname!=='/postgres')throw Error('Use a PostgreSQL URL with explicit credentials and postgres database');
 if(!/^[a-z0-9]{20}$/.test(project)||!(url.hostname===`db.${project}.supabase.co`||(url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username)===`postgres.${project}`)))throw Error('Database target does not match --project');
 // pg connectionString query parameters override host/user/ssl options. Never
 // pass the raw URL to pg after validating a different effective destination.
 for(const [key,value] of url.searchParams)if(key!=='sslmode'||!['require','verify-full'].includes(value))throw Error('Unsupported database URL option');
 return {host:url.hostname,port:Number(url.port||5432),database:'postgres',user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),
  ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000,application_name:'csat-portal-reset'};
}
async function main(){
 const args=process.argv.slice(2),arg=name=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
 if(args.includes('--apply')){console.error('Broad reset retired. Use portal-activity-reset.cjs to keep classes and people.');process.exitCode=1;return;}
 const connection=process.env.PORTAL_RESET_DATABASE_URL,project=arg('--project');
 if(!connection||!project)throw Error('Set PORTAL_RESET_DATABASE_URL securely and pass --project=<Supabase project ref>');
 const config=resetConnection(connection,project);
 const {Client}=require('../database/tests/node_modules/pg');
 const client=new Client(config);await client.connect();
 try{
  if(args.includes('--apply')){
   if(!arg('--preview-token')||arg('--confirm')!=='RESET_PORTAL_KEEP_AUTH_TUTORS_STORAGE_INTAKE'||!args.includes('--backup-restored')||!args.includes('--maintenance-active'))throw Error('Apply requires preview token, exact confirmation, restored backup and active maintenance');
   console.log(JSON.stringify(await reset(client,arg('--preview-token')),null,2));
  }else{await client.query('begin read only');const result=await inspect(client);await client.query('rollback');console.log(JSON.stringify(result,null,2));}
 }finally{await client.end();}
}
module.exports={inspect,reset,resetConnection};
if(require.main===module)main().catch(()=>{console.error('Reset stopped. Verify target, manifest, preview token, permissions and maintenance prerequisites; no credentials or row data are logged.');process.exitCode=1;});
