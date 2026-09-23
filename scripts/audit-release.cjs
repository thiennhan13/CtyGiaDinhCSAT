// Read-only, aggregate-only production audit. Does not prepare jobs or call business write RPCs.
const fs=require('node:fs'),path=require('node:path');
const {Client}=require('../database/tests/node_modules/pg');
require('../node_modules/@next/env').loadEnvConfig(path.resolve(__dirname,'..'));
(async()=>{
 const url=new URL(process.env.DATABASE_URL);url.searchParams.delete('sslmode');
 const ca=fs.readFileSync(process.env.CSAT_DB_CA_FILE||path.resolve(__dirname,'../scratch/supabase-prod-ca.crt'),'utf8');
 const db=new Client({connectionString:url.toString(),ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:15000,query_timeout:15000,application_name:'csat_readonly_release_audit'});
 try{await db.connect();await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");const out={checked_at:new Date().toISOString()};
 const queries={
 migrations:'select version from csat_internal.schema_migrations order by version',
 classes:'select class_type,status,count(*)::int from public.classes group by class_type,status order by class_type,status',
 learning:"select kind,count(*)::int total,count(*) filter(where published is not null)::int published,count(*) filter(where published is not null and draft is distinct from published)::int separate_drafts from public.learning_records group by kind",
 parents:'select (select count(*)::int from public.parent_accounts) accounts,(select count(*)::int from public.parent_student_links) links',
 reviews:'select review_status,count(*)::int from public.student_reviews group by review_status',
 mail:'select kind,status,count(*)::int from public.review_email_outbox group by kind,status',
 settings:'select email_enabled,cardinality(admin_emails) admin_recipient_count from public.parent_portal_settings',
 finance:'select (select count(*)::int from public.payments) payments,(select count(*)::int from public.billing_items) billing_items,(select count(*)::int from public.billing_adjustments) adjustments',
 rls:"select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('students','parent_accounts','parent_student_links','learning_records','student_reviews','payments','review_email_outbox') order by relname",
 access:"select has_function_privilege('anon','public.parent_learning_portal(text,uuid,text,integer)','EXECUTE') anon_parent,has_function_privilege('authenticated','public.parent_learning_portal(text,uuid,text,integer)','EXECUTE') authenticated_parent,has_function_privilege('anon','public.review_email_work(text,jsonb)','EXECUTE') anon_mail"
 };
 for(const [key,sql] of Object.entries(queries))out[key]=(await db.query(sql)).rows;
 await db.query('ROLLBACK');console.log(JSON.stringify(out,null,2));
 }finally{await db.end();}
})().catch(e=>{console.error(JSON.stringify({auditFailed:true,code:e.code||'audit_configuration_error'}));process.exitCode=1;});
