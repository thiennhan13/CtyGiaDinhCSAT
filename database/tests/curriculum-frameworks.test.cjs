const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {setup,as,id,value}=require('./accounting.test.cjs');
const root=path.resolve(__dirname,'../..'),migration=fs.readFileSync(path.join(__dirname,'../migrations/20260922_20_curriculum_frameworks.sql'),'utf8');
async function ready(){const db=await setup();await db.exec('reset role');for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09|10)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260911_16_parent_domestic_phones.sql'),'utf8'));await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260911_17_class_program_defaults.sql'),'utf8'));return db;}
const body=(program='basic',template_id='30000000-0000-4000-8000-000000000001')=>({goal:'Confirmed goal',focus_tags:[],next_step:'',stage_index:3,title:'',content:'',continuation:'',program,format:'individual',template_id});
const save=(db,cid,b,rev,publish)=>value(db,'select save_learning_record($1,\'class\',null,null,$2,$3,$4)',[cid,rev,JSON.stringify(b),publish]);
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}

const config=()=>({parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:null});
test('new catalog migration updates every class state, preserves drafts/history/finance, and refuses a repeated run',async()=>{
 const db=await ready();try{
 await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);
 await as(db);await save(db,id(30),body(),1,true);await save(db,id(30),{...body(),goal:'Private draft'},2,false);await db.exec('reset role');
 for(const [n,type,status] of [[31,'Lớp Nâng cao','active'],[32,'Lớp Cơ bản','archived'],[33,'Lớp Nâng cao','inactive'],[34,'Lớp Luyện thi','active']])await db.query('insert into classes(class_id,name,class_type,status) values($1,$2,$3,$4)',[id(n),'Test '+n,type,status]);
 const old=await value(db,'select to_jsonb(r) from learning_records r where class_id=$1',[id(30)]);
 const before={};for(const t of ['classes','sessions','payments','session_attendance','student_reviews','learning_history'])before[t]=await value(db,"select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from "+t+' t');
 await db.exec(migration);
 const r=await value(db,'select to_jsonb(r) from learning_records r where class_id=$1',[id(30)]);
 assert.equal(r.draft.goal,'Private draft');assert.equal(r.published.goal,'Confirmed goal');assert.equal(r.revision,4);assert.equal(r.published_at,old.published_at);assert.equal(r.published.stage_index,null);assert.deepEqual(r.published.curriculum,config());
 assert.equal(await value(db,'select count(*)::int from learning_records'),4);
 assert.deepEqual(await value(db,'select before_record from csat_internal.curriculum_migration_snapshots where record_id=$1',[r.record_id]),old);
 for(const t of Object.keys(before).filter(x=>x!=='learning_history'))assert.deepEqual(await value(db,"select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from "+t+' t'),before[t]);
 assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text) from learning_history t where record_id=$1 and revision<=3',[r.record_id]),before.learning_history);
 const templates=(await db.query('select * from learning_templates where version=2 order by program')).rows;
 assert.equal(templates.length,2);assert.equal(templates.find(t=>t.program==='basic').stages.flatMap(s=>s.lessons).length,24);assert.equal(templates.find(t=>t.program==='advanced').stages.flatMap(s=>s.lessons).length,19);
 await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');
 assert.equal(await value(db,'select count(*)::int from csat_internal.curriculum_migration_snapshots'),4);
 await db.exec(fs.readFileSync(path.join(__dirname,'../verification/20260922_curriculum_frameworks.sql'),'utf8')); 
 }finally{await db.close();}
});
test('curriculum permissions, membership, exclusions, empty publication and stale revisions are enforced in SQL',async()=>{
 const db=await ready();try{
 await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);await db.exec(migration);
 let r=await value(db,'select to_jsonb(r) from learning_records r where class_id=$1',[id(30)]);
 const template=await value(db,'select to_jsonb(t) from learning_templates t where template_id=$1',[r.draft.template_id]);
 await as(db,'tutor');
 const b={...r.draft,format:'group',goal:'Tutor selected B',curriculum:{...config(),parts:['B'],excluded_topic_codes:['B01'],current_stage_id:'basic-b-2'}};
 r=await save(db,id(30),b,r.revision,false);assert.notEqual(r.published.goal,b.goal);
 await assert.rejects(()=>save(db,id(30),b,r.revision-1,true),{code:'40001'});
 for(const bad of [ {...b,curriculum:{...b.curriculum,excluded_topic_codes:['C01']}},{...b,curriculum:{...b.curriculum,parts:[]}},{...b,curriculum:{...b.curriculum,parts:['A','A']}},{...b,curriculum:{...b.curriculum,excluded_stage_ids:['basic-b-2']}},{...b,stage_index:1}])await assert.rejects(()=>save(db,id(30),bad,r.revision,true),{code:'22023'});
 const empty={...b,curriculum:{...config(),excluded_stage_ids:template.stages.map(s=>s.id)}};
 await assert.rejects(()=>save(db,id(30),empty,r.revision,true),{code:'22023'});
 r=await save(db,id(30),empty,r.revision,false);assert.equal(r.published.curriculum.excluded_stage_ids.length,0);
 r=await save(db,id(30),b,r.revision,true);assert.deepEqual(r.published.curriculum.parts,['B']);
 await db.exec('reset role');await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'P','0912345678')",[id(80)]);await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
 const parent=await value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(10),'2026-06']);assert.deepEqual(parent.plans[0].body.curriculum,b.curriculum);
 await assert.rejects(()=>save(db,id(30),b,r.revision,true),{code:'42501'});
 await assert.rejects(()=>db.query('select * from csat_internal.curriculum_migration_snapshots'),{code:'42501'});
 await assert.rejects(()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']),{code:'42501'});
 }finally{await db.close();}
});

test('canonical catalog and effective class contents retain topic order, restore exclusions, and never infer mastery',()=>{
 const ts=require('typescript'),Module=require('node:module');
 function load(file){const filename=path.join(root,file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,filename);return m.exports;}
 const {templateSchema,emptyLearningBody}=load('lib/learning.ts'),{effectiveStages,curriculumError}=load('lib/curriculum.ts');
 const seeds=require('../../lib/learning-curriculum-20260922.json');
 const [basic,advanced]=seeds.map((t,i)=>({...templateSchema.parse(t),template_id:id(50+i),version:2}));
 assert.equal(new Set(seeds.flatMap(t=>t.stages.flatMap(s=>s.lessons.map(l=>l.code)))).size,43);
 for(const [parts,count] of [[['A'],9],[['B'],15],[['A','B'],24]]){
  const b={...emptyLearningBody(),program:'basic',curriculum:{...config(),parts}};
  assert.equal(effectiveStages(basic,b).flatMap(s=>s.lessons).length,count);assert.equal(b.curriculum.current_stage_id,null);
 }
 const b={...emptyLearningBody(),program:'basic',curriculum:{...config(),excluded_stage_ids:['basic-a-1'],excluded_topic_codes:['B01']}};
 assert.equal(effectiveStages(basic,b).flatMap(s=>s.lessons).length,19);
 b.curriculum=config();assert.deepEqual(effectiveStages(basic,b).flatMap(s=>s.lessons.map(l=>l.code)),seeds[0].stages.flatMap(s=>s.lessons.map(l=>l.code)));
 assert.equal(effectiveStages(advanced,{...emptyLearningBody(),program:'advanced'}).flatMap(s=>s.lessons).length,19);
 assert.ok(curriculumError(basic,{...b,curriculum:{...config(),parts:['B'],current_stage_id:'basic-a-1'}},true));
 const invalid=structuredClone(seeds[0]);invalid.stages[1].id=invalid.stages[0].id;assert.equal(templateSchema.safeParse(invalid).success,false);
 const duplicate=structuredClone(seeds[0]);duplicate.stages[0].lessons[1].code='A01';assert.equal(templateSchema.safeParse(duplicate).success,false);
 assert.equal(templateSchema.safeParse(require('../../lib/learning-template-seeds.json')[0]).success,true);
});
