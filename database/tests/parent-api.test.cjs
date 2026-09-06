const assert = require('node:assert/strict');
const { test } = require('node:test');
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
  parent_accounts:[{parent_id:id(2),phone:'+84912345678',active:true}],students:[{student_id:id(11),is_deleted:false}],
  targetUser:{id:id(2),app_metadata:{role:'parent'}}, ...overrides,
}; }
function client(s) {
  const call = (name, payload, result) => { s.calls.push({name,payload}); return Promise.resolve(result); };
  return {
    auth:{
      getUser:()=>call('getUser',null,{data:{user:s.user}}),
      signInWithPassword:payload=>call('login',payload,{data:{user:s.targetUser},error:s.loginError||null}),
      signOut:payload=>call('logout',payload,{error:s.logoutError||null}),
      updateUser:payload=>call('password',payload,{error:s.passwordError||null}),
      admin:{
        createUser:payload=>call('create',payload,{data:{user:s.targetUser},error:s.createError||null}),
        deleteUser:payload=>call('delete',payload,{error:s.cleanupError||null}),
        getUserById:payload=>call('target',payload,{data:{user:s.targetUser},error:s.targetError||null}),
        updateUserById:(uid,payload)=>call('reset',{uid,...payload},{error:s.resetError||null}),
      },
    },
    rpc:(name,payload)=>call(name,payload,{data:s.rpcData??'ok',error:s.rpcError||null}),
    from(table) {
      const filters=[]; let single=false;
      const chain = {
        select(){return chain;}, limit(){return chain;}, order(){return chain;}, range(){return chain;},ilike(){return chain;},
        eq(k,v){filters.push(r=>r[k]===v);return chain;}, in(k,v){filters.push(r=>v.includes(r[k]));return chain;},
        single(){single=true;return chain;},
        then(resolve,reject){const rows=(s[table]||[]).filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?rows[0]||null:rows,error:s.queryErrors?.[table]||null,count:rows.length}).then(resolve,reject);},
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
function post(route,s,body,origin) { return load(route,s).POST(new Request('https://portal.test/api',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)})); }
const did = (s,name) => s.calls.filter(c=>c.name===name);

test('phone normalization accepts full local/international numbers and rejects suffixes',()=>{
  const {normalizeParentPhone}=load('lib/parents.ts',state());
  for(const value of ['0912 345 678','+84 912-345-678','0084912345678']) assert.equal(normalizeParentPhone(value),'+84912345678');
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
  assert.deepEqual(did(s,'admin_save_parent_contact')[0].payload,{p_parent_id:null,p_display_name:'Parent',p_phone:'+84912345678',p_student_ids:[id(11)],p_active:true});
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
  assert.deepEqual(did(s,'admin_save_parent_contact')[0].payload,{p_parent_id:id(2),p_display_name:'Edited',p_phone:'+84912345678',p_student_ids:[],p_active:false});
  assert.equal(did(s,'target').length,0);
});
test('password and reset endpoints are retired and never alter Auth identities',async()=>{
  const s=state();assert.equal((await post(password,s,{currentPassword:'old',newPassword:'new'})).status,410);
  assert.equal((await post(manage,s,{action:'reset_password',authUid:id(2)})).status,400);
  for(const name of ['password','reset','target','create'])assert.equal(did(s,name).length,0);
});
test('phone-only lookup creates an opaque HttpOnly session, returns no token or password',async()=>{
  const s=state({user:null});const response=await post(login,s,{phone:'0912345678'});const body=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(body,{success:true,redirectUrl:'/parents'});
  const cookie=s.cookies.find(c=>c[0]==='csat_parent_lookup');assert.match(cookie[1],/^[A-Za-z0-9_-]{43}$/);
  assert.equal(cookie[2].httpOnly,true);assert.equal(cookie[2].sameSite,'lax');assert.equal(cookie[2].maxAge,43200);
  const payload=did(s,'start_parent_lookup')[0].payload;assert.equal(payload.p_phone,'+84912345678');
  assert.equal(payload.p_token_hash,require('node:crypto').createHash('sha256').update(cookie[1]).digest('hex'));
  assert.match(payload.p_client_key,/^[a-f0-9]{64}$/);assert.notEqual(payload.p_token_hash,cookie[1]);
  for(const name of ['getUser','login','create','password','logout'])assert.equal(did(s,name).length,0);
});
test('lookup rejects invalid phones and fails closed on missing DB, unknown phone, inactive or rate limit',async()=>{
  const invalid=state();assert.equal((await post(login,invalid,{phone:'12345678'})).status,400);assert.equal(invalid.calls.length,0);
  for(const [overrides,status] of [[{rpcError:{code:'PGRST202'}},503],[{rpcData:'not_found'},404],[{rpcData:'rate_limited'},429],[{rpcData:'unexpected'},503]]){
    const s=state(overrides);const response=await post(login,s,{phone:'0912345678'});
    assert.equal(response.status,status);assert.equal(s.cookies.length,0);
    if(status===429)assert.equal(response.headers.get('retry-after'),'60');
  }
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
  const s=state({cookieValues:{csat_parent_lookup:'a'.repeat(43)}});assert.equal((await post(login,s,{phone:'0912345678'})).status,200);
  assert.equal(did(s,'end_parent_lookup').length,1);
});
test('parent routes are independent from Supabase JWT; admin/tutor routing stays protected',()=>{
  const {authRedirect}=load('lib/auth-routing.ts',state());
  for(const user of [null,{app_metadata:{role:'parent'}},{app_metadata:{role:'admin'}}]) for(const route of ['/parents','/parents/account','/login'])assert.equal(authRedirect(route,user),null);
  for(const route of ['/admin/parents','/tutor/dashboard','/tutor']) assert.equal(authRedirect(route,{app_metadata:{role:'parent'}}),'/login');
  assert.equal(authRedirect('/admin/parents',null),'/tutor');
  assert.equal(authRedirect('/admin/parents',{app_metadata:{role:'tutor'}}),'/tutor/dashboard');
  assert.equal(authRedirect('/admin/parents',{user_metadata:{role:'admin'}}),'/tutor/dashboard');
  const page=fs.readFileSync(path.join(root,'app/parents/page.tsx'),'utf8');assert.match(page,/readLookupHash/);assert.match(page,/get_parent_lookup/);assert.doesNotMatch(page,/get_parent_portal|auth.getUser|parent_session/);
});
test('same-origin checks use forwarded authority and reject foreign or opaque origins',()=>{
  const {isSameOrigin}=load('lib/parents.ts',state());const req=origin=>new Request('http://localhost:3000/api',{headers:{host:'portal.test','x-forwarded-proto':'https',origin}});
  assert.equal(isSameOrigin(req('https://portal.test')),true);
  for(const origin of ['https://attacker.test','http://portal.test','null','not-a-url'])assert.equal(isSameOrigin(req(origin)),false);
});
