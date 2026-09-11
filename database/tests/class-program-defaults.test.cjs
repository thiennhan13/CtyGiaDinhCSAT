const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {setup,as,id,value}=require('./accounting.test.cjs');
const root=path.resolve(__dirname,'../..'),migration=fs.readFileSync(path.join(__dirname,'../migrations/20260911_17_class_program_defaults.sql'),'utf8');
async function ready(){const db=await setup();await db.exec('reset role');for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09|10)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260911_16_parent_domestic_phones.sql'),'utf8'));return db;}
const body=(program='basic',template_id='30000000-0000-4000-8000-000000000001')=>({goal:'Confirmed goal',focus_tags:[],next_step:'',stage_index:3,title:'',content:'',continuation:'',program,format:'individual',template_id});
const save=(db,cid,b,rev,publish)=>value(db,'select save_learning_record($1,\'class\',null,null,$2,$3,$4)',[cid,rev,JSON.stringify(b),publish]);
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
test('backfill publishes only missing basic/advanced plans and preserves all existing content and historical data',async()=>{
 const db=await ready();try{
 await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);
 await as(db);await save(db,id(30),body(),0,true);await save(db,id(30),{...body(),goal:'Private draft'},1,false);
 await db.exec('reset role');
 for(const [n,type,status] of [[31,'Lớp Nâng cao','active'],[32,'Lớp Cơ Bản','archived'],[33,'Lớp Luyện thi','active'],[34,'Lớp HSGQG','active'],[35,'Other','active'],[36,'Lớp Nâng cao','inactive']])await db.query('insert into classes(class_id,name,class_type,status) values($1,$2,$3,$4)',[id(n),'Synthetic class '+n,type,status]);
 const existing=await value(db,'select to_jsonb(r) from learning_records r where class_id=$1',[id(30)]);
 const hist=await value(db,'select jsonb_agg(to_jsonb(h) order by history_id) from learning_history h');
 const before={};for(const t of ['classes','sessions','payments','session_attendance','student_reviews'])before[t]=await value(db,'select jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text) from '+t+' t');
 await db.exec(migration);
 assert.deepEqual(await value(db,'select to_jsonb(r) from learning_records r where class_id=$1',[id(30)]),existing);
 assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(h) order by history_id) from learning_history h where record_id=$1',[existing.record_id]),hist);
 for(const t of Object.keys(before))assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text) from '+t+' t'),before[t]);
 const added=(await db.query('select * from learning_records where class_id<>$1',[id(30)])).rows;
 assert.equal(added.length,3);
 for(const r of added){assert.deepEqual(r.draft,r.published);assert.equal(r.published.stage_index,null);assert.equal(r.published.format,null);assert.equal(r.published.goal,'');assert.equal(r.revision,1);assert.equal(await value(db,"select csat_internal.valid_learning_body($1,'class')",[JSON.stringify(r.published)]),true);}
 assert.equal(await value(db,'select count(*)::int from learning_history'),5);
 await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');
 assert.equal(await value(db,'select count(*)::int from learning_records'),4);
 }finally{await db.close();}
});
test('new classes derive correct programs, publish common curricula, preserve retry edits and reject mismatches atomically',async()=>{
 const db=await ready();try{await db.exec(migration);await as(db);
 const today=await value(db,"select (now() at time zone 'Asia/Ho_Chi_Minh')::date::text");
 const base={name:'Synthetic new class',tutor_id:id(20),csat_fee_per_session:0,start_date:today,end_date:today,students:[],sessions:[],teaching_format:'individual'};
 for(const [class_type,program] of [['Lớp Cơ bản','basic'],['Lớp Nâng cao','advanced'],['Lớp HSGQG','voi'],['Lớp Luyện thi','custom'],['Ôn thi VOI','voi']]){
  const data={...base,class_type},key=randomUUID(),create=()=>value(db,'select create_class_with_learning($1,$2)',[JSON.stringify(data),key]);
  const result=await create();
  let workspace=await value(db,'select learning_workspace($1,$2)',[result.class_id,today.slice(0,7)]);
  let r=workspace.records[0];assert.equal(r.draft.program,program);assert.equal(r.draft.format,'individual');
  assert.equal(!!r.published,['basic','advanced'].includes(program));assert.equal(!!r.draft.template_id,['basic','advanced'].includes(program));assert.equal(r.draft.stage_index,null);
  await save(db,result.class_id,{...r.draft,goal:'Tutor private edits'},r.revision,false);await create();
  workspace=await value(db,'select learning_workspace($1,$2)',[result.class_id,today.slice(0,7)]);r=workspace.records[0];
  assert.equal(r.revision,2);assert.equal(r.draft.goal,'Tutor private edits');assert.notEqual(r.published?.goal,'Tutor private edits');
  if(program==='custom')assert.equal((await save(db,result.class_id,{...r.draft,goal:'Approved custom goal'},2,true)).published.program,'custom');
 }
 await db.exec('reset role');const before=await value(db,'select count(*)::int from classes');await as(db);
 for(const patch of [{class_type:'Lớp Cơ bản',program:'voi'},{class_type:'Lớp Luyện thi',program:'basic'},{class_type:'Unknown'}])await assert.rejects(()=>value(db,'select create_class_with_learning($1,$2)',[JSON.stringify({...base,...patch}),randomUUID()]),{code:'22023'});
 await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from classes'),before);
 await as(db,'tutor');await assert.rejects(()=>value(db,'select create_class_with_learning($1,$2)',[JSON.stringify({...base,class_type:'Lớp Cơ bản'}),randomUUID()]),{code:'42501'});
 await db.exec('reset role;set role anon');await assert.rejects(()=>value(db,'select create_class_with_learning($1,$2)',[JSON.stringify(base),randomUUID()]),{code:'42501'});
 }finally{await db.close();}
});
test('parent sees approved default without invented progress and cannot access another child',async()=>{
 const db=await ready();try{
 await db.query("update classes set class_type='Lớp Cơ bản' where class_id=$1",[id(30)]);
 await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'P','0912345678')",[id(80)]);
 await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await db.exec(migration);await service(db);
 await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
 const data=await value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(10),'2026-06']);
 assert.equal(data.plans.length,1);assert.equal(data.plans[0].template.program,'basic');assert.equal(data.plans[0].template.stages.length,6);
 assert.equal(data.plans[0].body.stage_index,null);assert.equal(data.plans[0].body.format,null);
 assert.doesNotMatch(JSON.stringify(data),/actor_id|tuition_fee_snapshot/);
 await assert.rejects(()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']),/quyền|liên kết/);
 }finally{await db.close();}
});
test('missing or mismatched default aborts migration without partial changes',async()=>{
 const db=await ready();try{
 await db.exec("update learning_defaults set template_id='30000000-0000-4000-8000-000000000002' where program='basic'");
 await assert.rejects(()=>db.exec(migration),/Both approved/);await db.exec('rollback');
 assert.equal(await value(db,"select count(*)::int from csat_internal.schema_migrations where version='20260911_17'"),0);
 assert.equal(await value(db,"select to_regprocedure('csat_internal.class_program(text)')"),null);
 assert.equal(await value(db,'select count(*)::int from learning_records'),0);
 }finally{await db.close();}
});
test('UI maps HSGQG and custom independently and rejects ambiguous class names',()=>{
 const ts=require('typescript'),Module=require('node:module'),file=path.join(root,'lib/learning.ts'),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
 const {defaultProgram,programSchema,CLASS_TYPE_OPTIONS}=m.exports;
 for(const [input,expected] of [['Lớp Cơ Bản','basic'],['  Lớp   Nâng cao ','advanced'],['Lớp HSGQG','voi'],['Ôn thi VOI','voi'],['Lớp Luyện thi','custom'],['Cơ bản bổ sung',null],['',null]])assert.equal(defaultProgram(input),expected);
 assert.equal(programSchema.parse('custom'),'custom');assert.equal(CLASS_TYPE_OPTIONS.length,4);
});
