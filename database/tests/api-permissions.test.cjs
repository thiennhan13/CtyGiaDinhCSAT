const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
function state(role='admin'){return {user:{id:id(1),app_metadata:{role}},calls:[]};}
function load(file,s){
 const filename=path.join(root,file),mod=new Module(filename,module);mod.paths=Module._nodeModulePaths(path.dirname(filename));
 const base=mod.require.bind(mod);
 mod.require=name=>{
  if(name==='next/server')return {NextResponse:{json:(d,o)=>Response.json(d,o)}};
  if(name==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user:s.user}})},
   rpc:async(name,params)=>{s.calls.push({name,params});return {data:s.rpcData??{ok:true},error:s.rpcError??null};},
   from(){throw new Error('Unexpected direct table access');}})};
  if(name==='@/lib/supabase/service')throw new Error('Business writes must use the authenticated user client');
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts',s);
  return base(name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 return mod.exports;
}
const req=(body,origin='https://portal.test')=>new Request('https://portal.test/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
const attendance={sessionId:id(10),attendanceData:[{session_id:id(10),student_id:id(20),status:'absent',tuition_fee_snapshot:1}]};
const close={startDate:'2026-06-01',endDate:'2026-06-30',billingPeriod:'June',previewToken:'observed-state',requestId:id(30)};
test('billing rejects forged metadata and missing sessions before database access',async()=>{
 for(const user of [null,{id:id(1),app_metadata:{},user_metadata:{role:'admin'}}]){
  const s=state();s.user=user;
  assert.equal((await load('app/api/admin/billing/generate/route.ts',s).POST(req(close))).status,user?403:401);
  assert.equal(s.calls.length,0);
 }
});
test('GET never closes a period; POST requires preview and request identity',async()=>{
 const s=state(),api=load('app/api/admin/billing/generate/route.ts',s);
 assert.equal((await api.GET()).status,405);
 for(const field of ['requestId','previewToken','startDate']){
  const b={...close};delete b[field];assert.equal((await api.POST(req(b))).status,422);
 }
 assert.equal(s.calls.length,0);
 assert.equal((await api.POST(req(close))).status,200);
 assert.equal(s.calls[0].name,'close_billing_period');
 assert.equal(s.calls[0].params.p_request_id,close.requestId);
});
test('cross-origin business mutations are rejected before RPC',async()=>{
 const s=state();assert.equal((await load('app/api/admin/billing/generate/route.ts',s).POST(req(close,'https://foreign.test'))).status,403);
 assert.equal(s.calls.length,0);
});
test('attendance strips caller prices and rejects mixed session identities',async()=>{
 const s=state('tutor'),api=load('app/api/attendance/route.ts',s);
 assert.equal((await api.POST(req(attendance))).status,200);
 assert.equal(s.calls[0].name,'take_attendance_safe');
 assert.ok(!('tuition_fee_snapshot' in s.calls[0].params.p_attendance_data[0]));
 assert.equal((await api.POST(req({...attendance,sessionId:id(99)}))).status,422);
 assert.equal(s.calls.length,1);
});
test('RPC permission, conflict and validation failures are not reported as success',async()=>{
 for(const [code,status] of [['42501',403],['22023',422],['P0002',404],['40001',409],['23505',409],['23514',409]]){
  const s=state('tutor');s.rpcError={code,message:'Database rejected the operation'};
  assert.equal((await load('app/api/attendance/route.ts',s).POST(req(attendance))).status,status);
 }
});
test('renewal endpoint is retired and cannot independently extend class validity',async()=>{
 const s=state('tutor');assert.equal((await load('app/api/tutor/classes/renew/route.ts',s).POST()).status,409);assert.equal(s.calls.length,0);
});
test('tutor makeup delegates authorization, schedule checks and snapshots to one database operation',async()=>{
 const s=state('tutor');
 assert.equal((await load('app/api/tutor/makeup/route.ts',s).POST(req({class_id:id(10),date:'2026-10-01',start_time:'18:00',end_time:'19:00',requestId:id(50)}))).status,200);
 assert.equal(s.calls[0].name,'manage_class');assert.equal(s.calls[0].params.p_action,'add_sessions');
});

test('create returns the class identity expected by the existing new-class form',async()=>{
 const s=state();s.rpcData={class_id:id(42),message:'Created',affected_sessions:2};
 const response=await load('app/api/admin/classes/route.ts',s).POST(req({action:'create',requestId:id(70)}));
 assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.data.class_id,id(42));assert.equal(body.class_id,id(42));
});
test('retired class deletion does not call a mutating RPC',async()=>{
 const s=state();const response=await load('app/api/admin/classes/route.ts',s).POST(req({action:'hard_delete',class_id:id(42)}));
 assert.equal(response.status,409);assert.equal(s.calls.length,0);
});
