const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript'),z=require('zod');
const root=path.resolve(__dirname,'../..'),id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function load(file,mocks={},globals={}){
 const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(`(function(require,module,exports){${source}\n})`,{URL,URLSearchParams,Request,Response,AbortSignal,Buffer,process:{env:{}},console,...globals})(name=>{
  if(name==='server-only')return {};
  if(name==='zod')return z;
  if(name.startsWith('node:'))return require(name);
  if(name==='next/server')return {NextResponse:{json:(body,options)=>Response.json(body,options)}};
  if(name in mocks)return mocks[name];
  if(name==='@/lib/oj-grants')return load('lib/oj-grants.ts');
  if(name==='@/lib/login-security')return {readLoginBody:r=>r.json()};
  throw Error('Unexpected dependency: '+name);
 },module,module.exports);return module.exports;
}
class OJError extends Error{constructor(code,status=503){super(code);this.code=code;this.status=status;}}
const backend={OJError,ojConfig:()=>({instance:id(90),origin:'https://oj.example.test',read:'fixture-read',manage:'fixture-manage'}),ojMessage:e=>e.code};
const errorResponse=e=>Response.json({code:e.code},{status:e.status||503});
const denied=e=>Response.json({code:e.code},{status:e.code==='42501'?403:409});
const context={mapping:{student_id:id(10),instance_id:id(90),profile_id:7,grant_id:4,grant_revision:2,revision:1,username:'fixture',state:'active'},access:{state:'active',student_id:id(10)},contest_ids:[1,2],contest_revision:1,roster:[{profile_id:7,revision:2,mapping_revision:1},{profile_id:8,revision:3,mapping_revision:1}],roster_complete:true};
function reader({rpc,remote,access=context.access}={}){
 return load('lib/oj-account-api.ts',{
  '@/lib/business-api':{businessSession:async()=>({user:{id:id(80)},supabase:{rpc:async()=>({data:access})}}),businessError:denied},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:rpc||(async()=>({data:context}))})},
  '@/lib/csat-oj-server':backend,'@/lib/oj-grants-server':{grantRequest:remote||(async()=>({as_of:'2026-06-01T00:00:00Z',data:{account:{profile_id:7}}})),grantErrorResponse:errorResponse}
 }).readOJAccount;
}
const request=q=>new Request(`https://portal.test/api/parents/oj?student=${id(10)}${q||''}`);
test('workspace reports configuration validity to admin only and disabled exchange performs no writes',async()=>{
 let role='admin',configured=false,configReads=0,rpcCalls=0;
 const config={...backend,ojConfig:()=>{configReads++;if(!configured)throw new OJError('not_configured');return backend.ojConfig();}};
 const api=load('app/api/oj/links/route.ts',{
  '@/lib/business-api':{businessSession:async()=>({user:{app_metadata:{role}},supabase:{rpc:async()=>{rpcCalls++;return {data:{students:[],classes:[],sessions:[]}};}}}),businessError:denied},
  '@/lib/supabase/service':{createAdminClient:()=>{throw Error('No service writes expected');}},
  '@/lib/csat-oj-server':config,'@/lib/oj-grants-server':{grantErrorResponse:errorResponse,grantRequest:()=>{throw Error('No remote requests expected');}}
 });
 const get=()=>api.GET(new Request('https://portal.test/api/oj/links'));
 let res=await get();assert.equal((await res.json()).connection_ready,false);assert.match(res.headers.get('Cache-Control'),/private, no-store/);
 const before=rpcCalls;
 res=await api.POST(new Request('https://portal.test/api/oj/links',{method:'POST',body:JSON.stringify({action:'exchange',studentId:id(10),code:'a'.repeat(43),requestId:id(100),revision:0,reason:'Fixture'})}));
 assert.equal(res.status,503);assert.equal((await res.json()).code,'not_configured');assert.equal(rpcCalls,before);
 configured=true;const data=await (await get()).json();assert.equal(data.connection_ready,true);assert.deepEqual(Object.keys(data).sort(),['classes','connection_ready','sessions','students']);
 role='tutor';const configBefore=configReads;assert.equal((await (await get()).json()).connection_ready,undefined);assert.equal(configReads,configBefore);
});
test('OJ configuration requires enabled flag, valid origin and instance, and distinct read/manage keys',()=>{
 const valid={CSAT_OJ_ENABLED:'true',CSAT_OJ_ORIGIN:'https://oj.example.test',CSAT_OJ_INSTANCE_ID:id(90),CSAT_OJ_READ_KEY:'r'.repeat(32),CSAT_OJ_MANAGE_KEY:'m'.repeat(32)};
 const config=env=>load('lib/csat-oj-server.ts',{}, {process:{env}}).ojConfig;
 assert.equal(config(valid)().instance,id(90));
 for(const change of [{CSAT_OJ_ENABLED:'false'},{CSAT_OJ_INSTANCE_ID:''},{CSAT_OJ_ORIGIN:'http://oj.example.test'},{CSAT_OJ_ORIGIN:'https://oj.example.test/api/'},{CSAT_OJ_READ_KEY:''},{CSAT_OJ_MANAGE_KEY:'r'.repeat(32)}])assert.throws(config({...valid,...change}),e=>e.code==='not_configured');
});
test('parent reader denies forged IDs and rechecks DB permission after HTTP',async()=>{
 let reads=0,fetches=0;
 const read=reader({rpc:async()=>++reads===1?{data:context}:{error:{code:'42501'}},remote:async()=>{fetches++;return {data:{account:{profile_id:7}}};}});
 assert.equal((await read(request(),true)).status,403);assert.equal(fetches,1);assert.equal(reads,2);
 assert.equal((await reader({access:{state:'blocked'}})(request(),true)).status,403);
 assert.equal((await reader()(new Request(`https://portal.test/api?student=${id(11)}`),true)).status,403);
});
test('class request uses stored grants and returns no peer roster; changed revision hides result',async()=>{
 let reads=0;
 const read=reader({remote:async(path,schema,options)=>{
  assert.equal(path,'accounts/7/class-results/');assert.equal(options.revision,2);
  assert.deepEqual(JSON.parse(JSON.stringify(options.body)),{contest_ids:[1,2],roster_profile_ids:[7,8],roster_complete:true,roster_grants:[{profile_id:7,revision:2},{profile_id:8,revision:3}]});
  return {data:{account:{profile_id:7},contests:[]}};
 }});
 const response=await read(request('&kind=session&session='+id(40)),true);assert.equal(response.status,200);assert.equal((await response.json()).roster,undefined);assert.match(response.headers.get('Cache-Control'),/no-store/);
 const changed=reader({rpc:async()=>({data:++reads===1?context:{...context,mapping:{...context.mapping,revision:2}}})});
 assert.equal((await changed(request(),true)).status,409);
});
test('grant revocation invalidates only expected local revision; contest absence does not',async()=>{
 for(const [code,status,expected]of [['revision_conflict',409,1],['account_unavailable',404,1],['contest_not_found',404,0]]){
  const writes=[];const read=reader({rpc:async(name,args)=>{if(name==='oj_invalidate_account')writes.push(args);return {data:context};},remote:async()=>{throw new OJError(code,status);}});
  assert.equal((await read(request(),true)).status,status);assert.equal(writes.length,expected);
  if(expected)assert.equal(writes[0].p_revision,1);
 }
});
test('exchange persists UUID and digest before HTTP; recovery uses same UUID without code',async()=>{
 const calls=[],uuid=id(100),code='a'.repeat(43);let role='admin',fail=false;
 const api=load('app/api/oj/links/route.ts',{
  '@/lib/business-api':{businessSession:async()=>({user:{app_metadata:{role}},supabase:{rpc:async(name,args)=>{calls.push([name,args]);return fail?{error:{code:'40001'}}:{data:{state:'pending',instance_id:id(90)}};}}}),businessError:denied},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return {};}})},
  '@/lib/csat-oj-server':backend,'@/lib/oj-grants-server':{grantErrorResponse:errorResponse,grantRequest:async(path,schema,options)=>{calls.push([path,options]);return {data:{account:{profile_id:7,username:'fixture'},grant:{id:4,revision:2}}};}}
 });
 const post=body=>api.POST(new Request('https://portal.test/api',{method:'POST',body:JSON.stringify(body)}));
 const body={action:'exchange',studentId:id(10),code,requestId:uuid,revision:0,reason:'Fixture'};
 role='tutor';assert.equal((await post(body)).status,403);assert.equal(calls.length,0);
 role='admin';fail=true;assert.equal((await post(body)).status,409);assert.equal(calls.length,1);calls.length=0;
 fail=false;assert.equal((await post(body)).status,200);assert.equal(calls[0][0],'oj_begin_exchange');assert.equal(calls[0][1].p_request,uuid);assert.equal(calls[0][1].p_digest,require('node:crypto').createHash('sha256').update(code).digest('hex'));assert.equal(JSON.stringify(calls[0]).includes(code),false);
 assert.equal(calls[1][0],'connections/exchange/');assert.equal(calls[2][0],'oj_finish_exchange');
 calls.length=0;assert.equal((await post({action:'recover',requestId:uuid})).status,200);assert.equal(calls[1][0],`connections/exchanges/${uuid}/`);assert.equal(calls[1][1].body,undefined);
});
test('transport enforces source/schema, separates keys, honors quota and Retry-After',async()=>{
 let response=Response.json({error:'rate_limited'},{status:429,headers:{'Retry-After':'37'}}),slot=0,fetches=0;const calls=[];
 const api=load('lib/oj-grants-server.ts',{'@/lib/csat-oj-server':backend,'@/lib/supabase/service':{createAdminClient:()=>({rpc:async(name,args)=>{calls.push(args);return {data:slot};}})}},{fetch:async(url,options)=>{fetches++;assert.equal(url,'https://oj.example.test/api/csat/v2/accounts/7/');assert.equal(options.headers['X-CSAT-Grant-Revision'],'2');assert.equal(options.headers['X-CSAT-Portal-Key'],'fixture-read');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return response;}});
 await assert.rejects(()=>api.grantRequest('accounts/7/',z.object({}),{revision:2}),e=>e.retryAfter===37&&e.status===429);assert.equal(calls[1].p_retry,37);
 slot=12;await assert.rejects(()=>api.grantRequest('accounts/7/',z.object({}),{revision:2}),e=>e.retryAfter===12);assert.equal(fetches,1);
 slot=0;response=Response.json({api_version:'csat-portal-v2',instance_id:id(91),as_of:'2026-06-01T00:00:00Z',data:{}});
 await assert.rejects(()=>api.grantRequest('accounts/7/',z.object({}),{revision:2}),e=>e.code==='invalid_response');
});
test('schemas preserve withheld/frozen null values and strip uncontracted fields',()=>{
 const schemas=load('lib/oj-grants.ts');
 const item={contest:{contest_id:1,key:'fixture',name:'Fixture',url:'/contest/fixture',start_time:'2026-06-01',end_time:'2026-06-02'},status:'withheld',participation:null,metrics:null,rating:null,private_roster:[8]};
 const parsed=schemas.ojParticipation.parse(item);assert.equal(parsed.metrics,null);assert.equal(parsed.private_roster,undefined);
});
test('daily activity validates real dates, dense leap-year ranges, unknowns and totals without treating attempts as solved problems',()=>{
 const {ojActivity,ojSummary}=load('lib/oj-grants.ts');
 const days=[{date:'2024-02-28',submission_count:5},{date:'2024-02-29',submission_count:0},{date:'2024-03-01',submission_count:2}];
 const base={metric:'submission_count',timezone:'Asia/Ho_Chi_Minh',start_date:'2024-02-28',end_date:'2024-03-01',status:'available',available_years:[2024],days,total_submissions:7,active_days:2};
 assert.equal(ojActivity.parse(base).total_submissions,7);
 for(const change of [{metric:'solved_count'},{timezone:'UTC'},{days:days.filter(d=>d.date!=='2024-02-29')},{days:[days[0],days[0],days[2]]},{total_submissions:2},{active_days:3},{start_date:'2024-03-02'},{start_date:'not-a-date'},{end_date:'2024-13-01'},{end_date:'2025-03-01'},{available_years:[2024,2024]}])assert.equal(ojActivity.safeParse({...base,...change}).success,false);
 const unknown={...base,status:'limited',days:[days[0],{...days[1],submission_count:null},days[2]],total_submissions:null,active_days:null};
 assert.equal(ojActivity.parse(unknown).days[1].submission_count,null);
 assert.equal(ojActivity.safeParse({...unknown,status:'available'}).success,false);
 assert.equal(ojActivity.safeParse({...unknown,total_submissions:7}).success,false);
 assert.equal(ojActivity.parse({...base,status:'unavailable',days:[],total_submissions:null,active_days:null}).days.length,0);
 const stats={submission_count:7,attempted_count:3,solved_count:1,last_submission_at:null};
 const summary={account:{profile_id:7,username:'fixture',url:'/user/fixture'},learning:{scope:'learning',public_practice:stats,practice:stats,learning_total:stats},site:{points:0,performance_points:0,problem_count:1,rating:null,performance_rank:null,rating_rank:null,rank_status:'listed'},counts:{organizations:0,live_contests:0,virtual_participations:0,registered_contests:0}};
 assert.equal(ojSummary.parse(summary).activity,undefined);assert.equal(ojSummary.parse({...summary,activity:base}).activity.total_submissions,7);
});
test('activity year reuses summary date filters and rechecks access; invalid years never fetch',async()=>{
 let reads=0,fetches=0;
 const read=reader({rpc:async()=>({data:++reads===1?context:{...context,mapping:{...context.mapping,revision:2}}}),remote:async(path,schema,options)=>{
  fetches++;const url=new URL('https://oj.test/'+path);assert.equal(url.pathname,'/accounts/7/');assert.equal(url.searchParams.get('from'),'2024-01-01T00:00:00+07:00');assert.equal(url.searchParams.get('until'),'2025-01-01T00:00:00+07:00');assert.equal(options.revision,2);
  return {as_of:'2026-06-01T00:00:00Z',data:{account:{profile_id:7}}};
 }});
 assert.equal((await read(request('&kind=activity&year=2024'),true)).status,409);assert.equal(fetches,1);assert.equal(reads,2);
 for(const query of ['&kind=activity&year=1999','&kind=activity&year=9999','&kind=summary&year=2024'])assert.equal((await read(request(query),true)).status,422);
 assert.equal(fetches,1);
 const legacy=await reader()(request('&kind=activity'),true);assert.equal(legacy.status,200);assert.equal((await legacy.json()).data.activity,null);
 const wrongPeriod=await reader({remote:async()=>({data:{account:{profile_id:7},activity:{start_date:'2025-01-01',end_date:'2025-12-31'}}})})(request('&kind=activity&year=2024'),true);
 assert.equal(wrongPeriod.status,503);assert.equal((await wrongPeriod.json()).code,'invalid_response');
 assert.equal((await reader()(new Request(`https://portal.test/api?student=${id(11)}&kind=activity&year=2024`),true)).status,403);
});
