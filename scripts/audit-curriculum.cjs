// Read-only curriculum audit. Logs counts only, never class/student names or secrets.
const fs=require('node:fs'),path=require('node:path');
const {Client}=require('../database/tests/node_modules/pg');
require('../node_modules/@next/env').loadEnvConfig(path.resolve(__dirname,'..'));
const catalog=require('../lib/learning-curriculum-20260922.json');
(async()=>{
 const url=new URL(process.env.DATABASE_URL);url.searchParams.delete('sslmode');
 const ca=fs.readFileSync(process.env.CSAT_DB_CA_FILE||path.resolve(__dirname,'../scratch/supabase-prod-ca.crt'),'utf8');
 const db=new Client({connectionString:url.toString(),ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:15000,query_timeout:15000,application_name:'csat_readonly_curriculum_audit'});
 try{
  await db.connect();await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await db.query("SET LOCAL statement_timeout='10s'");
  const out={checked_at:new Date().toISOString(),migrations:(await db.query('select version from csat_internal.schema_migrations order by version')).rows,programs:[]};
  for(const seed of catalog){
   const rows=await db.query(`select c.status,count(*)::int classes,
    count(r.record_id)::int plans,
    count(*) filter(where r.published is not null)::int published,
    count(*) filter(where r.published is not null and r.draft is distinct from r.published)::int separate_drafts,
    count(*) filter(where td.program=$1 and td.stages=$2::jsonb)::int approved_draft_catalog,
    count(*) filter(where tp.program=$1 and tp.stages=$2::jsonb)::int approved_published_catalog,
    count(*) filter(where tp.program=$1 and tp.stages=$2::jsonb and
      coalesce(r.published->'curriculum'->'parts','["A","B"]'::jsonb)='["A","B"]'::jsonb and
      coalesce(r.published->'curriculum'->'excluded_stage_ids','[]'::jsonb)='[]'::jsonb and
      coalesce(r.published->'curriculum'->'excluded_topic_codes','[]'::jsonb)='[]'::jsonb)::int full_published_curriculum,
    count(*) filter(where r.published->>'stage_index' is not null or r.published->'curriculum'->>'current_stage_id' is not null)::int recorded_current_stage
    from public.classes c
    left join public.learning_records r on r.class_id=c.class_id and r.kind='class'
    left join public.learning_templates td on td.template_id::text=r.draft->>'template_id'
    left join public.learning_templates tp on tp.template_id::text=r.published->>'template_id'
    where csat_internal.class_program(c.class_type)=$1 group by c.status order by c.status`,[seed.program,JSON.stringify(seed.stages)]);
   const defaults=await db.query(`select t.version,t.stages=$2::jsonb as approved_catalog
    from public.learning_defaults d join public.learning_templates t using(template_id) where d.program=$1`,[seed.program,JSON.stringify(seed.stages)]);
   out.programs.push({program:seed.program,expected_topics:seed.stages.reduce((n,s)=>n+s.lessons.length,0),defaults:defaults.rows,classes:rows.rows});
  }
  await db.query('ROLLBACK');console.log(JSON.stringify(out,null,2));
 }finally{await db.end();}
})().catch(e=>{console.error(JSON.stringify({auditFailed:true,code:e.code||'audit_configuration_error'}));process.exitCode=1;});
