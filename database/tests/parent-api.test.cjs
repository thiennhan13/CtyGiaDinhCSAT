const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname,'../..');
const id = n => '30000000-0000-4000-8000-'+String(n).padStart(12,'0');
function state(overrides={}) { return {
  user:{id:id(1),app_metadata:{role:'admin'}}, calls:[], cookies:[],
  parent_accounts:[{auth_uid:id(2),phone:'+84912345678',active:true}],students:[{student_id:id(11),is_deleted:false}],
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
    rpc:(name,payload)=>call(name,payload,{error:s.rpcError||null}),
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
    if(name==='next/headers') return {cookies:async()=>({set:(...args)=>s.cookies.push(args)})};
    if(name==='@/lib/supabase/server') return {createClient:async()=>client(s)};
    if(name==='@/lib/supabase/service') return {createAdminClient:()=>{s.calls.push({name:'service'});return client(s);}};
    if(name==='@/lib/rate-limit') return {rateLimit:()=>({success:!s.limited}),getClientIp:()=> '127.0.0.1'};
    if(name==='@/lib/parents') return load('lib/parents.ts',s);
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

test('phone normalization accepts full local/international number and rejects suffix identity',()=>{
  const { normalizeParentPhone }=load('lib/parents.ts',state());
  for(const value of ['0912 345 678','+84 912-345-678','0084912345678']) assert.equal(normalizeParentPhone(value),'+84912345678');
  for(const value of ['912345678','12345678','abc0912345678','+1 912345678','++84912345678','0112345678']) assert.equal(normalizeParentPhone(value),null);
});
test('admin endpoints require verified app_metadata before service client access',async()=>{
  for(const user of [null,{id:id(2),app_metadata:{role:'parent'}},{id:id(2),user_metadata:{role:'admin'},app_metadata:{}}]) {
    const s=state({user}); assert.equal((await post(manage,s,createBody)).status,403);
    assert.equal((await load(manage,s).GET(new Request('https://portal.test/api'))).status,403);
    assert.equal(did(s,'service').length,0);
  }
});
test('cross-site auth, password and provisioning requests are denied',async()=>{
  for(const route of [manage,login,password,'app/api/parents/logout/route.ts']) {
    const s=state(); assert.equal((await post(route,s,createBody,'https://attacker.test')).status,403);assert.equal(s.calls.length,0);
  }
});
test('missing migration, duplicate or foreign children never create an Auth user',async()=>{
  for(const [overrides,body,code] of [[{queryErrors:{parent_accounts:{code:'42P01'}}},createBody,503],[{}, {...createBody,studentIds:[id(11),id(11)]},400],[{}, {...createBody,studentIds:[id(99)]},400]]) {
    const s=state(overrides);assert.equal((await post(manage,s,body)).status,code);assert.equal(did(s,'create').length,0);
  }
});
test('provisioning confirms a new phone account and links children through the guarded RPC',async()=>{
  const s=state();const response=await post(manage,s,createBody);const body=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const auth=did(s,'create')[0].payload;
  assert.equal(auth.phone,'+84912345678');assert.equal(auth.phone_confirm,true);assert.deepEqual(auth.app_metadata,{role:'parent'});
  assert.ok(body.password.length>=12);assert.equal(auth.password,body.password);
  const saved=did(s,'admin_save_parent_account')[0].payload;
  assert.equal(saved.p_auth_uid,s.targetUser.id);assert.deepEqual(saved.p_student_ids,[id(11)]);assert.equal(saved.password,undefined);
});
test('existing phone errors never adopt, reset or delete an existing Auth user',async()=>{
  const s=state({createError:{message:'already exists'}});assert.equal((await post(manage,s,createBody)).status,409);
  for(const name of ['admin_save_parent_account','delete','reset']) assert.equal(did(s,name).length,0);
});
test('failed account linking compensates only the just-created Auth ID; no password is returned',async()=>{
  for(const cleanupError of [null,{message:'offline'}]) {
    const s=state({rpcError:{message:'failed'},cleanupError});const response=await post(manage,s,createBody);const body=await response.json();
    assert.equal(response.status,500);assert.equal(body.password,undefined);assert.equal(did(s,'delete')[0].payload,s.targetUser.id);
    if(cleanupError) assert.ok(body.error.includes(s.targetUser.id));
  }
});
test('password reset cannot target a tutor even if the parent profile is inconsistent',async()=>{
  const s=state({targetUser:{id:id(2),app_metadata:{role:'tutor'}}});
  assert.equal((await post(manage,s,{action:'reset_password',authUid:id(2)})).status,409);assert.equal(did(s,'reset').length,0);
});
test('admin reset returns a new credential; updates can revoke all links without changing Auth role',async()=>{
  const s=state(); const response=await post(manage,s,{action:'reset_password',authUid:id(2)});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.ok((await response.json()).password.length>=12);
  assert.equal((await post(manage,s,{action:'update',authUid:id(2),name:'Updated',studentIds:[],active:false})).status,200);
  assert.deepEqual(did(s,'admin_save_parent_account')[0].payload.p_student_ids,[]);
  assert.equal(did(s,'admin_save_parent_account')[0].payload.p_active,false);
});
test('login requires password, a valid Supabase identity and an active parent profile',async()=>{
  const body={phone:'0912345678',password:'a-password'};
  const missing=state();assert.equal((await post(login,missing,{phone:body.phone})).status,400);assert.equal(did(missing,'login').length,0);
  for(const [overrides,code] of [[{loginError:{status:400}},401],[{parent_accounts:[]},403],[{parent_accounts:[{auth_uid:id(2),active:false}]},403],[{targetUser:{id:id(2),app_metadata:{},user_metadata:{role:'parent'}}},403],[{limited:true},429]]) {
    const s=state(overrides);assert.equal((await post(login,s,body)).status,code);if(code===403)assert.equal(did(s,'logout').length,1);
  }
  const s=state();assert.equal((await post(login,s,body)).status,200);
  assert.equal(did(s,'login')[0].payload.phone,'+84912345678');assert.equal(s.cookies[0][0],'parent_session');assert.equal(s.cookies[0][2].maxAge,0);
});
test('parent password change requires active account and forwards current password to Supabase',async()=>{
  const body={currentPassword:'old password',newPassword:'new password long enough'};
  const s=state({user:{id:id(2),phone:'84912345678',app_metadata:{role:'parent'}}});
  assert.equal((await post(password,s,body)).status,200);assert.deepEqual(did(s,'password')[0].payload,{password:body.newPassword,current_password:body.currentPassword});
  for(const overrides of [{user:null},{parent_accounts:[]},{limited:true}]) {
    const denied=state({user:s.user,...overrides});assert.ok((await post(password,denied,body)).status>=400);assert.equal(did(denied,'password').length,0);
  }
  const short=state({user:s.user});assert.equal((await post(password,short,{...body,newPassword:'short'})).status,400);assert.equal(did(short,'password').length,0);
});
test('logout expires Supabase local session and retires the legacy cookie',async()=>{
  const s=state();assert.equal((await post('app/api/parents/logout/route.ts',s,{})).status,200);
  assert.deepEqual(did(s,'logout')[0].payload,{scope:'local'});assert.equal(s.cookies[0][2].maxAge,0);
});
test('routing isolates parent/admin/tutor paths and ignores editable role claims',()=>{
  const {authRedirect}=load('lib/auth-routing.ts',state());
  assert.equal(authRedirect('/parents',null),'/login');assert.equal(authRedirect('/parents/account',null),'/login');
  const parent={app_metadata:{role:'parent'}};
  for(const route of ['/tutor','/tutor/dashboard','/admin/parents','/login']) assert.equal(authRedirect(route,parent),'/parents');
  assert.equal(authRedirect('/parents',parent),null);
  assert.equal(authRedirect('/admin/parents',{app_metadata:{},user_metadata:{role:'admin'}}),'/tutor/dashboard');
  assert.equal(authRedirect('/parents',{app_metadata:{role:'admin'}}),'/admin/dashboard');
  // Architectural regression: the Server Component must never fall back to service-role phone lookup.
  const page=fs.readFileSync(path.join(root,'app/parents/page.tsx'),'utf8');
  assert.doesNotMatch(page,/createAdminClient|parent_session/);assert.match(page,/rpc\('get_parent_portal'/);
  const proxy=fs.readFileSync(path.join(root,'proxy.ts'),'utf8');assert.doesNotMatch(proxy,/parent_session|user_metadata/);
});

test('wrong current password cannot update even when Supabase current-password setting is off',async()=>{
  const s=state({user:{id:id(2),phone:'84912345678',app_metadata:{role:'parent'}},loginError:{status:400}});
  assert.equal((await post(password,s,{currentPassword:'wrong',newPassword:'a long new password'})).status,401);
  assert.equal(did(s,'password').length,0);
});
test('reauthentication must return the exact parent identity',async()=>{
  const s=state({user:{id:id(2),phone:'84912345678',app_metadata:{role:'parent'}},targetUser:{id:id(9),app_metadata:{role:'parent'}}});
  assert.equal((await post(password,s,{currentPassword:'old password',newPassword:'a long new password'})).status,403);
  assert.equal(did(s,'password').length,0);assert.equal(did(s,'logout').length,1);
});

test('same-origin checks support Next.js proxy authority but reject foreign or opaque origins',()=>{
  const {isSameOrigin}=load('lib/parents.ts',state());
  const req=origin=>new Request('http://localhost:3000/api',{headers:{host:'portal.test','x-forwarded-proto':'https',origin}});
  assert.equal(isSameOrigin(req('https://portal.test')),true);
  for(const origin of ['https://attacker.test','http://portal.test','null','not-a-url'])assert.equal(isSameOrigin(req(origin)),false);
});