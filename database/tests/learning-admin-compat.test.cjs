const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function load(relative,state){const filename=path.join(root,relative),m=new Module(filename,module);m.paths=Module._nodeModulePaths(path.dirname(filename));const req=m.require.bind(m);m.require=name=>{
 if(name==='next/server')return {NextResponse:{json:(b,o)=>Response.json(b,o)}};
 if(name==='@/lib/learning')return load('lib/learning.ts',state);
 if(name==='@/lib/business-api')return {businessError:e=>Response.json({error:e.code},{status:500}),businessSession:async()=>({supabase:{from:table=>{let selection='';const query={select(s){selection=s;return query;},order(){return query;},not(){return query;},single(){return query;},limit(){return query;},then(resolve){state.calls.push({table,selection});if(table==='review_email_outbox'&&selection.includes('email_reconciliations')&&state.error)return Promise.resolve({data:null,error:{code:state.error}}).then(resolve);return Promise.resolve({data:table==='parent_portal_settings'?{revision:1}:table==='review_email_outbox'?[{outbox_id:'synthetic',status:'pending'}]:[],error:null}).then(resolve);}};return query;}}})};
 return req(name);
 };m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
test('curriculum admin works before email migration 19 while preserving operational errors',async()=>{
 for(const code of ['PGRST200','PGRST204','42703','42P01']){const state={calls:[],error:code},res=await load('app/api/admin/learning/route.ts',state).GET();assert.equal(res.status,200);const b=await res.json();assert.equal(b.emailOperationsReady,false);assert.deepEqual(b.templates,[]);assert.equal(state.calls.filter(c=>c.table==='review_email_outbox').length,2);}
 const healthy=await load('app/api/admin/learning/route.ts',{calls:[]}).GET();assert.equal((await healthy.json()).emailOperationsReady,true);
 const state={calls:[],error:'42501'},failed=await load('app/api/admin/learning/route.ts',state).GET();assert.equal(failed.status,500);assert.equal(state.calls.filter(c=>c.table==='review_email_outbox').length,1);
});
