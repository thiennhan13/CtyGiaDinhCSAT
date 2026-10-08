const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {setup,as,id,value}=require('./accounting.test.cjs');
const root=path.resolve(__dirname,'../..');
const migrationName='20261008_23_parent_class_progress.sql';
const migration=fs.readFileSync(path.join(__dirname,'../migrations',migrationName),'utf8');
async function ready(baseOnly=false){
 const db=await setup();await db.exec('reset role');
 for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n<migrationName).sort())
  if(!baseOnly || !/^202609(13_18|14_19|22_21|23_22)/.test(name)) await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
 return db;
}
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
async function lookup(db){
 await db.exec('reset role');
 await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic parent','0912345678')",[id(80)]);
 await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
}
const portal=(db,month='2026-06',student=id(10),token='a'.repeat(64))=>value(db,'select parent_learning_portal($1,$2,$3,0)',[token,student,month]);
function load(file){
 const filename=path.join(root,file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));
 m.require=name=>name.startsWith('./')?load(path.relative(root,path.resolve(path.dirname(filename),name+'.ts'))):require(name);
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);
 return m.exports;
}

test('parent class progress preserves the existing projection and counts completed class sessions across months and absences',async()=>{
 const db=await ready();try{
 await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);
 const template=await value(db,"select template_id from learning_templates where program='basic' and version=2");
 const revision=await value(db,"select coalesce((select revision from learning_records where class_id=$1 and kind='class'),0)",[id(30)]);
 await as(db);await value(db,"select save_learning_record($1,'class',null,null,$2,$3,true)",[id(30),revision,JSON.stringify({goal:'Published',focus_tags:[],next_step:'',stage_index:null,title:'',content:'',continuation:'',program:'basic',format:'group',template_id:template})]);
 await db.exec('reset role');
 // Count history before enrollment as class pacing; an absent child is still at the same class stage.
 await db.query("insert into sessions(session_id,class_id,date,start_time,end_time,status) values($1,$2,'2025-12-01','18:00','19:00','completed'),($3,$2,'2026-05-01','18:00','19:00','cancelled'),($4,$2,'2026-05-02','18:00','19:00','scheduled'),($5,$2,(now() at time zone 'Asia/Ho_Chi_Minh')::date+1,'18:00','19:00','completed')",[id(201),id(30),id(202),id(203),id(204)]);
 for(const n of [31,32,33])await db.query("insert into classes(class_id,name,class_type) values($1,$2,'Lớp Cơ bản')",[id(n),'Synthetic '+n]);
 await db.query("insert into class_students(class_id,student_id,tuition_fee_per_session) values($1,$2,0),($3,$2,0),($4,$5,0)",[id(31),id(10),id(32),id(33),id(11)]);
 const published=await value(db,"select published from learning_records where class_id=$1 and kind='class'",[id(30)]);
 await db.query("insert into learning_records(class_id,kind,draft,published,published_at) values($1,'class',$4,$4,now()),($2,'class',$4,null,null),($3,'class',$4,$4,now())",[id(31),id(32),id(33),published]);
 await lookup(db);
 const before=await portal(db);assert.equal(before.class_progress,undefined);
 await db.exec('reset role');await db.exec(migration);await service(db);
 const after=await portal(db);
 const {class_progress,...oldProjection}=after;
 assert.deepEqual(oldProjection,before);
 assert.deepEqual(class_progress.map(p=>[p.class_id,p.completed_sessions]),[[id(30),4],[id(31),0]]);
 assert.ok(class_progress.every(p=>Number.isFinite(Date.parse(p.as_of))));
 assert.ok(after.attendance.every(a=>'tuition_amount' in a&&'fee_adjusted' in a));
 assert.ok(after.tutors.every(t=>'tutor_id' in t&&'background' in t));
 const otherMonth=await portal(db,'2026-05');
 assert.deepEqual(otherMonth.class_progress.map(p=>[p.class_id,p.completed_sessions]),class_progress.map(p=>[p.class_id,p.completed_sessions]));
 await db.exec('reset role');
 const beforeHistory=await value(db,"select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) from learning_history h");
 await service(db);await portal(db);
 await db.exec('reset role');
 assert.deepEqual(await value(db,"select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) from learning_history h"),beforeHistory);
 await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');
 }finally{await db.close();}
});

test('parent progress keeps service-only grants and validates sessions, links and active class membership',async()=>{
 const db=await ready();try{
 await db.exec(migration);await lookup(db);
 await assert.rejects(()=>portal(db,'2026-06',id(11)),{code:'42501'});
 await assert.rejects(()=>portal(db,'2026-06',id(10),'c'.repeat(64)),{code:'42501'});
 await db.exec('reset role;set role anon');await assert.rejects(()=>portal(db),{code:'42501'});
 await as(db);await assert.rejects(()=>portal(db),{code:'42501'});
 await db.exec('reset role');
 await db.query("update class_students set status='dropped' where class_id=$1 and student_id=$2",[id(30),id(10)]);
 await service(db);assert.deepEqual((await portal(db)).class_progress,[]);
 await db.exec('reset role');await db.query("update parent_lookup_sessions set expires_at=now()-interval '1 second' where token_hash=$1",['a'.repeat(64)]);
 await service(db);await assert.rejects(()=>portal(db),{code:'42501'});
 await db.exec('reset role');await db.query("update parent_lookup_sessions set expires_at=now()+interval '1 hour' where token_hash=$1",['a'.repeat(64)]);
 await db.query('delete from parent_student_links where parent_id=$1',[id(80)]);
 await service(db);await assert.rejects(()=>portal(db),{code:'42501'});
 }finally{await db.close();}
});

test('progress migration refuses an incomplete chain without altering the existing RPC',async()=>{
 const db=await ready();try{
 const before=await value(db,"select pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure)");
 await db.exec("delete from csat_internal.schema_migrations where version='20260922_20'");
 await assert.rejects(()=>db.exec(migration),/Apply migration 20 first/);await db.exec('rollback');
 assert.equal(await value(db,"select pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure)"),before);
 assert.equal(await value(db,"select count(*)::int from csat_internal.schema_migrations where version='20261008_23'"),0);
 }finally{await db.close();}
});

test('progress deploys on curriculum 20 alone and survives subsequent optional fee/profile migrations',async()=>{
 const db=await ready(true);try{
 await lookup(db);
 const before=await portal(db);
 await db.exec('reset role');await db.exec(migration);await service(db);
 const after=await portal(db);const {class_progress,...projection}=after;
 assert.deepEqual(projection,before);assert.ok(Array.isArray(class_progress));
 await db.exec('reset role');
 for(const name of ['20260913_18_consultations.sql','20260914_19_email_operations.sql','20260922_21_parent_email_completion.sql','20260923_22_tutor_profiles.sql'])
  await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
 await service(db);const expanded=await portal(db);
 assert.deepEqual(expanded.class_progress.map(p=>[p.class_id,p.completed_sessions]),class_progress.map(p=>[p.class_id,p.completed_sessions]));
 assert.ok(expanded.attendance.every(a=>'tuition_amount' in a&&'fee_adjusted' in a));
 assert.ok(expanded.tutors.every(t=>'tutor_id' in t&&'background' in t));
 await db.exec('reset role;set role anon');await assert.rejects(()=>portal(db),{code:'42501'});
 }finally{await db.close();}
});

test('class pacing resolves the containing effective stage, preserves fallbacks and never modifies curriculum',()=>{
 const {emptyLearningBody}=load('lib/learning.ts');
 const {resolveParentCurriculumProgress:resolve}=load('lib/parent-curriculum-progress.ts');
 const [basic,advanced]=require('../../lib/learning-curriculum-20260922.json').map(t=>({...t,template_id:id(901),version:2}));
 const body={...emptyLearningBody(),program:'basic',curriculum:{parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:null}};
 const progress=n=>({class_id:id(30),completed_sessions:n,as_of:'2026-10-08T00:00:00Z'});
 const snapshot=structuredClone(body);
 assert.equal(resolve(basic,body).source,'none');
 assert.equal(resolve(basic,body,progress(0)).preparing,true);
 assert.equal(resolve(basic,body,progress(0)).topicCode,'A01');
 const firstCount=basic.stages[0].lessons.length;
 assert.equal(resolve(basic,body,progress(firstCount)).stage.id,basic.stages[0].id);
 assert.equal(resolve(basic,body,progress(firstCount+1)).stage.id,basic.stages[1].id);
 assert.equal(resolve(basic,body,progress(100)).topicCode,'B15');
 assert.deepEqual(body,snapshot);
 const selected={...body,curriculum:{...body.curriculum,parts:['B'],excluded_topic_codes:['B01'],excluded_stage_ids:[basic.stages.at(-1).id]}};
 assert.equal(resolve(basic,selected,progress(1)).topicCode,'B02');
 const lastRemaining=basic.stages.filter(s=>s.part==='B'&&s.id!==basic.stages.at(-1).id).at(-1);
 assert.equal(resolve(basic,selected,progress(100)).stage.id,lastRemaining.id);
 const published={...body,curriculum:{...body.curriculum,current_stage_id:basic.stages[1].id}};
 for(const missing of [undefined,null,progress(-1),progress(1.5),progress(NaN)]){
  const fallback=resolve(basic,published,missing);assert.equal(fallback.source,'published');assert.equal(fallback.stage.id,basic.stages[1].id);assert.equal(fallback.completedSessions,null);
 }
 assert.equal(resolve(advanced,{...body,program:'advanced'},progress(100)).topicCode,'D07');
 const legacy={...basic,stages:basic.stages.map(({id,part,lessons,...s})=>({...s,lessons:lessons.map(({code,...l})=>l)}))};
 assert.equal(resolve(legacy,{...body,curriculum:undefined,stage_index:1},progress(10)).source,'published');
 assert.equal(resolve(null,body,progress(1)).source,'none');
});
