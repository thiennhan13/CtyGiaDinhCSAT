const assert = require('node:assert/strict');
const { test } = require('node:test');
// Each test file runs in its own process; do not inherit a deployment/preview origin.
process.env.APP_ORIGIN = 'https://portal.test';
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'../..');
// Synthetic key used only by the local test process.
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-service-key';
const id = n => '30000000-0000-4000-8000-'+String(n).padStart(12,'0');
function state(overrides={}) { return {
  user:{id:id(1),app_metadata:{role:'admin'}}, calls:[], cookies:[],
  parent_accounts:[{parent_id:id(2),phone:'0912345678',active:true}],students:[{student_id:id(11),is_deleted:false}],
  targetUser:{id:id(2),app_metadata:{role:'parent'}}, ...overrides,
}; }
function client(s) {
  const call = (name, payload, result) => { s.calls.push({name,payload}); return Promise.resolve(result); };
  return {
    auth:{
      getClaims:()=>call('claims',null,{data:{claims:{session_id:id(50)}}}),
      getUser:()=>call('getUser',null,{data:{user:s.user}}),
      signInWithPassword:payload=>call('login',payload,{data:{user:s.targetUser,session:s.loginError?null:{access_token:'synthetic'}},error:s.loginError||null}),
      signOut:payload=>call('logout',payload,{error:s.logoutError||null}),
      updateUser:payload=>call('password',payload,{error:s.passwordError||null}),
      admin:{
        createUser:payload=>call('create',payload,{data:{user:s.targetUser},error:s.createError||null}),
        deleteUser:payload=>call('delete',payload,{error:s.cleanupError||null}),
        getUserById:payload=>call('target',payload,{data:{user:s.targetUser},error:s.targetError||null}),
        updateUserById:(uid,payload)=>call('reset',{uid,...payload},{error:s.resetError||null}),
      },
    },
    rpc:(name,payload)=>call(name,payload,{data:s.rpcResults?.[name]??s.rpcData??(['consume_auth_attempt','start_parent_password_session','parent_password_session_valid'].includes(name)?true:'ok'),error:s.rpcError||null}),
    from(table) {
      const filters=[]; let single=false, mutation=null;
      const chain = {
        insert(payload){mutation='insert';s.calls.push({name:'insert:'+table,payload});return chain;},
        update(payload){mutation='update';s.calls.push({name:'update:'+table,payload});return chain;},
        select(){return chain;}, limit(){return chain;}, order(){return chain;}, range(){return chain;},ilike(column,pattern){s.calls.push({name:'ilike',payload:{column,pattern}});return chain;},
        eq(k,v){filters.push(r=>r[k]===v);return chain;}, in(k,v){filters.push(r=>v.includes(r[k]));return chain;},
        single(){single=true;return chain;},
        then(resolve,reject){const rows=(s[table]||[]).filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?rows[0]||null:rows,error:(mutation?s.mutationErrors?.[table]:s.queryErrors?.[table])||null,count:rows.length}).then(resolve,reject);},
      }; return chain;
    },
  };
}
function load(relative,s) {
  const filename = path.join(root,relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod = new Module(filename,module); mod.paths = module.paths;
  const baseRequire = mod.require.bind(mod);
  mod.require = name => {
    if(name==='@supabase/supabase-js') return {createClient:()=>client(s)};
    if(name==='server-only') return {};
    if(name==='@/lib/parent-auth') return load('lib/parent-auth.ts',s);
    if(name==='next/server') return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
    if(name==='next/headers') return {cookies:async()=>({set:(...args)=>s.cookies.push(args),get:name=>s.cookieValues?.[name]?{value:s.cookieValues[name]}:undefined})};
    if(name==='@/lib/supabase/server') return {createClient:async()=>client(s)};
    if(name==='@/lib/supabase/service') return {createAdminClient:()=>{s.calls.push({name:'service'});return client(s);}};
    if(name==='@/lib/rate-limit') return {rateLimit:()=>({success:!s.limited}),getClientIp:()=> '127.0.0.1'};
    if(name==='@/lib/parents') return load('lib/parents.ts',s);
    if(name==='@/lib/parent-lookup') return load('lib/parent-lookup.ts',s);
    return baseRequire(name);
  };
  mod._compile(compiled,filename);return mod.exports;
}
const manage = 'app/api/admin/parents/route.ts';
const login = 'app/api/parents/auth/route.ts';
const password = 'app/api/parents/password/route.ts';
const createBody = {action:'create',name:'Parent',phone:'0912 345 678',studentIds:[id(11)]};
function post(route,s,body,origin='https://portal.test') { return load(route,s).POST(new Request('https://portal.test/api',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)})); }
const did = (s,name) => s.calls.filter(c=>c.name===name);

test('phone normalization accepts full local/international numbers and rejects suffixes',()=>{
  const {normalizeParentPhone}=load('lib/parents.ts',state());
  for(const value of ['0912 345 678','+84 912-345-678','0084912345678']) assert.equal(normalizeParentPhone(value),'0912345678');
  for(const value of ['912345678','12345678','abc0912345678','+1 912345678','++84912345678','0112345678']) assert.equal(normalizeParentPhone(value),null);
});
test('admin endpoints require verified admin; parent lookup never grants admin',async()=>{
  for(const user of [null,{id:id(2),app_metadata:{role:'parent'}},{id:id(2),user_metadata:{role:'admin'},app_metadata:{}}]){
    const s=state({user});assert.equal((await post(manage,s,createBody)).status,403);
    assert.equal((await load(manage,s).GET(new Request('https://portal.test/api'))).status,403);
    assert.equal(did(s,'service').length,0);assert.equal(did(s,'admin_save_parent_contact').length,0);
  }
});
test('cross-site parent lookup, logout and admin mutations fail before DB access',async()=>{
  for(const route of [manage,login,password,'app/api/parents/logout/route.ts']){
    const s=state();assert.equal((await post(route,s,createBody,'https://attacker.test')).status,403);assert.equal(s.calls.length,0);
  }
});
test('admin creates a phone contact through guarded RPC without provisioning Auth or passwords',async()=>{
  const s=state();const response=await post(manage,s,createBody);const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.password,undefined);
  assert.deepEqual(did(s,'admin_save_parent_contact')[0].payload,{p_parent_id:null,p_display_name:'Parent',p_phone:'0912345678',p_student_ids:[id(11)],p_active:true});
  assert.equal(did(s,'create').length,0);assert.equal(did(s,'service').length,0);
});
test('validation, duplicate phone and missing migration errors are surfaced without Auth mutations',async()=>{
  for(const [rpcError,code] of [[{code:'23505'},409],[{code:'PGRST202'},503],[{code:'22023'},400]]){
    const s=state({rpcError});assert.equal((await post(manage,s,createBody)).status,code);assert.equal(did(s,'create').length,0);
  }
  const s=state();assert.equal((await post(manage,s,{...createBody,studentIds:[id(11),id(11)]})).status,400);assert.equal(did(s,'admin_save_parent_contact').length,0);
});
test('admin edits existing links/active flag and cannot accidentally change phone from stale client',async()=>{
  const s=state();assert.equal((await post(manage,s,{action:'update',parentId:id(2),name:'Edited',phone:'0987654321',studentIds:[],active:false})).status,200);
  assert.deepEqual(did(s,'admin_save_parent_contact')[0].payload,{p_parent_id:id(2),p_display_name:'Edited',p_phone:'0912345678',p_student_ids:[],p_active:false});
  assert.equal(did(s,'target').length,0);
});

test('password change requires a live parent session and current password, then revokes sessions',async()=>{
 const body={current_password:'synthetic-old',password:'synthetic-new',confirmation:'synthetic-new'};
 const no=state();assert.equal((await post(password,no,body)).status,401);
 const opts={user:{id:id(2),phone:'+84912345678',app_metadata:{role:'parent'}},cookieValues:{csat_parent_lookup:'a'.repeat(43)}};
 const wrong=state({...opts,passwordError:{message:'wrong'}});assert.equal((await post(password,wrong,body)).status,400);assert.equal(did(wrong,'revoke_parent_password_sessions').length,0);
 const s=state(opts);assert.equal((await post(password,s,body)).status,200);assert.deepEqual(did(s,'password')[0].payload,{password:body.password,current_password:body.current_password});assert.equal(did(s,'revoke_parent_password_sessions').length,1);assert.deepEqual(did(s,'logout').at(-1).payload,{scope:'global'});
 assert.equal((await post(manage,state(),{action:'reset_password',authUid:id(2)})).status,400);
});
test('phone and password creates Auth-bound HttpOnly session without exposing credentials',async()=>{
 const s=state({user:null});const response=await post(login,s,{phone:'0912345678',password:'synthetic-password'});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true,redirectUrl:'/parents'});
 const cookie=s.cookies.find(c=>c[0]==='csat_parent_lookup');assert.match(cookie[1],/^[A-Za-z0-9_-]{43}$/);assert.equal(cookie[2].httpOnly,true);assert.equal(cookie[2].maxAge,43200);
 const payload=did(s,'start_parent_password_session')[0].payload;assert.equal(payload.p_auth_uid,id(2));assert.equal(payload.p_session_id,id(50));assert.equal(payload.p_token_hash,require('node:crypto').createHash('sha256').update(cookie[1]).digest('hex'));
 assert.equal(did(s,'start_parent_lookup').length,0);assert.equal(did(s,'login')[0].payload.phone,'+84912345678');
});
test('phone-only, invalid credentials, revoked profile and durable rate limits fail closed',async()=>{
 for(const body of [{phone:'0912345678'},{phone:'bad',password:'synthetic'}])assert.equal((await post(login,state(),body)).status,400);
 for(const [overrides,status] of [[{rpcError:{code:'offline'}},503],[{loginError:{message:'wrong'}},401],[{rpcResults:{start_parent_password_session:false}},401],[{rpcResults:{consume_auth_attempt:false}},429]]){
  const s=state(overrides),r=await post(login,s,{phone:'0912345678',password:'synthetic'});assert.equal(r.status,status);assert.equal(s.cookies.length,0);if(status===429)assert.equal(r.headers.get('retry-after'),'900');
 }
});

test('disabled phone provider is a service configuration failure, not invalid credentials',async()=>{
 const s=state({loginError:{code:'phone_provider_disabled',message:'Phone logins are disabled',status:422}});
 const r=await post(login,s,{phone:'0912345678',password:'synthetic'});
 assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'private, no-store');
 const body=await r.json();assert.match(body.error,/chưa sẵn sàng/);assert.doesNotMatch(body.error,/mật khẩu không đúng|Phone logins/);
 assert.equal(did(s,'start_parent_password_session').length,0);assert.equal(s.cookies.length,0);
});
test('raw phone, legacy and malformed cookies are never accepted as sessions',async()=>{
  for(const cookieValues of [{parent_session:'0912345678'},{csat_parent_lookup:'0912345678'},{csat_parent_lookup:'!'.repeat(43)},{}]){
    assert.equal(await load('lib/parent-lookup.ts',state({cookieValues})).readLookupHash(),null);
  }
});
test('logout revokes only lookup session and preserves admin/tutor Supabase cookies',async()=>{
  const s=state({cookieValues:{csat_parent_lookup:'a'.repeat(43),'sb-project-auth-token':'existing-admin'}});
  assert.equal((await post('app/api/parents/logout/route.ts',s,{})).status,200);
  assert.equal(did(s,'end_parent_lookup').length,1);assert.equal(did(s,'logout').length,0);
  assert.deepEqual(s.cookies.map(c=>c[0]).sort(),['csat_parent_lookup','parent_session']);
  assert.ok(s.cookies.every(c=>c[2].maxAge===0));
  const failed=state({cookieValues:{csat_parent_lookup:'a'.repeat(43)},rpcError:{code:'offline'}});
  assert.equal((await post('app/api/parents/logout/route.ts',failed,{})).status,503);assert.equal(failed.cookies.length,0);
});
test('a new lookup retires the previous browser lookup session',async()=>{
  const s=state({cookieValues:{csat_parent_lookup:'a'.repeat(43)}});assert.equal((await post(login,s,{phone:'0912345678',password:'synthetic'})).status,200);
  assert.equal(did(s,'end_parent_lookup').length,1);
});
test('parent page enforces Auth separately; admin/tutor routing stays protected',()=>{
  const {authRedirect}=load('lib/auth-routing.ts',state());
  for(const user of [null,{app_metadata:{role:'parent'}},{app_metadata:{role:'admin'}}]) for(const route of ['/parents','/parents/account','/login'])assert.equal(authRedirect(route,user),null);
  for(const route of ['/admin/parents','/tutor/dashboard','/tutor']) assert.equal(authRedirect(route,{app_metadata:{role:'parent'}}),'/parents');
  assert.equal(authRedirect('/admin/parents',null),'/tutor');
  assert.equal(authRedirect('/admin/parents',{app_metadata:{role:'tutor'}}),'/tutor/dashboard');
  assert.equal(authRedirect('/admin/parents',{user_metadata:{role:'admin'}}),'/tutor/dashboard');
  const page=fs.readFileSync(path.join(root,'app/parents/page.tsx'),'utf8');assert.match(page,/parentSession/);assert.match(page,/parent_learning_portal/);assert.doesNotMatch(page,/get_parent_portal|auth.getUser|parent_session/);
});
test('same-origin checks use forwarded authority and reject foreign or opaque origins',()=>{
  const {isSameOrigin}=load('lib/parents.ts',state());const req=origin=>new Request('http://localhost:3000/api',{headers:{host:'portal.test','x-forwarded-proto':'https',origin}});
  const configuredOrigin=process.env.APP_ORIGIN;
  try {
    delete process.env.APP_ORIGIN;
    assert.equal(isSameOrigin(req('https://portal.test')),true);
    for(const origin of ['https://attacker.test','http://portal.test','null','not-a-url'])assert.equal(isSameOrigin(req(origin)),false);
  } finally {
    process.env.APP_ORIGIN=configuredOrigin;
  }
});

test('configured origin takes precedence over request authority and still rejects cross-site requests',()=>{
  const {isSameOrigin}=load('lib/parents.ts',state());
  const req=(origin,extra={})=>new Request('http://localhost:3000/api',{
    headers:{host:'attacker.test','x-forwarded-proto':'https',...(origin?{origin}:{}),...extra},
  });
  assert.equal(isSameOrigin(req('https://portal.test')),true);
  for(const origin of ['https://attacker.test','http://portal.test','https://portal.test:444','null','not-a-url',''])assert.equal(isSameOrigin(req(origin)),false);
  assert.equal(isSameOrigin(req('https://portal.test',{'sec-fetch-site':'cross-site'})),false);
});

test('admin searches domestic storage using local or international prefixes',async()=>{
 for(const q of ['0912','+84912','0084912']){
  const s=state();await load(manage,s).GET(new Request('https://portal.test/api?q='+encodeURIComponent(q)));
  assert.deepEqual(did(s,'ilike')[0].payload,{column:'phone',pattern:'%0912%'});
 }
});

test('staff login performs durable limiting and refuses inactive or unlinked tutor identities',async()=>{
 const route='app/api/auth/login/route.ts',body={email:'staff@example.test',password:'synthetic-only'};
 const admin=state({targetUser:{id:id(1),app_metadata:{role:'admin'}}});
 assert.equal((await post(route,admin,body)).status,200);assert.equal(did(admin,'consume_auth_attempt').length,1);
 const limited=state({rpcResults:{consume_auth_attempt:false}});assert.equal((await post(route,limited,body)).status,429);assert.equal(did(limited,'login').length,0);
 for(const profile of [[],[{auth_uid:id(3),status:'inactive',is_deleted:false}],[{auth_uid:id(3),status:'active',is_deleted:true}]]){
  const s=state({targetUser:{id:id(3),app_metadata:{role:'tutor'}},tutors:profile});assert.equal((await post(route,s,body)).status,403);assert.equal(did(s,'logout').length,1);
 }
 const s=state();assert.equal((await post(route,s,body,'https://outside.test')).status,403);assert.equal(s.calls.length,0);
});
test('a wrong current password cannot reach updateUser even if provider update requirements are disabled',async()=>{
 const s=state({user:{id:id(2),phone:'+84912345678',app_metadata:{role:'parent'}},cookieValues:{csat_parent_lookup:'a'.repeat(43)},loginError:{message:'wrong'}});
 assert.equal((await post(password,s,{current_password:'wrong',password:'synthetic-new',confirmation:'synthetic-new'})).status,400);assert.equal(did(s,'password').length,0);
});
test('missing Origin is rejected before authentication or mutations',async()=>{
 for(const route of [login,password,manage,'app/api/auth/login/route.ts']){const s=state();assert.equal((await post(route,s,{},'')).status,403);assert.equal(s.calls.length,0);}
});

test('tutor account partial failures preserve Auth and do not report a completed disable',async()=>{
 const route='app/api/admin/tutors/route.ts';
 const failedCreate=state({mutationErrors:{tutors:{message:'timeout'}}});
 const created=await post(route,failedCreate,{action:'create',name:'Tutor fixture',email:'fixture@example.test',phone:'0912345678'});
 assert.equal(created.status,503);assert.equal(did(failedCreate,'create').length,1);assert.equal(did(failedCreate,'delete').length,0);
 const unreadable=state({queryErrors:{tutors:{message:'offline'}}});
 assert.equal((await post(route,unreadable,{action:'delete',tutor_id:id(21)})).status,503);
 assert.equal(did(unreadable,'update:tutors').length,0);assert.equal(did(unreadable,'reset').length,0);
 const disable=state({tutors:[{tutor_id:id(21),auth_uid:id(22)}],resetError:{message:'provider failed'}});
 assert.equal((await post(route,disable,{action:'delete',tutor_id:id(21)})).status,503);
 assert.equal(did(disable,'update:tutors').length,1);assert.equal(did(disable,'reset').length,1);assert.equal(did(disable,'delete').length,0);
 for(const user of [null,{id:id(2),app_metadata:{role:'parent'}}]){
  const denied=state({user});assert.equal((await post(route,denied,{action:'delete',tutor_id:id(21)})).status,403);assert.equal(did(denied,'service').length,0);
 }
});
