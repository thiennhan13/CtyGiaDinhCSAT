const assert = require('node:assert/strict');
const { test } = require('node:test');
// Each test file runs in its own process; do not inherit a deployment/preview origin.
process.env.APP_ORIGIN = 'https://portal.test';
process.env.TURNSTILE_LOGIN_ENABLED = 'false';
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
      exchangeCodeForSession:code=>call('exchangeCode',code,{data:{session:null},error:s.exchangeError||null}),
      signInWithOAuth:payload=>call('oauth',payload,{data:{url:'https://accounts.google.com/synthetic'},error:s.oauthError||null}),
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
    rpc:(name,payload)=>call(name,payload,{data:s.rpcResults?.[name]??s.rpcData??(['consume_auth_attempt','parent_phone_session_valid'].includes(name)?true:'ok'),error:s.rpcError||null}),
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
    if(name==='@/lib/login-security') return load('lib/login-security.ts',s);
    if(name==='@/lib/login-captcha') return load('lib/login-captcha.ts',s);
    if(name==='@/lib/business-api') return load('lib/business-api.ts',s);
    if(name==='@/lib/parent-auth') return load('lib/parent-auth.ts',s);
    if(name==='next/server') return {NextResponse:{json:(body,init)=>Response.json(body,init),redirect:url=>Response.redirect(url,307)}};
    if(name==='next/headers') return {cookies:async()=>({set:(...args)=>s.cookies.push(args),get:name=>s.cookieValues?.[name]?{value:s.cookieValues[name]}:undefined})};
    if(name==='@/lib/supabase/server') return {createClient:async()=>client(s)};
    if(name==='@/lib/supabase/service') return {createAdminClient:()=>{s.calls.push({name:'service'});return client(s);}};
    if(name==='@/lib/rate-limit') return {rateLimit:()=>({success:!s.limited}),getClientIp:()=> '127.0.0.1'};
    if(name==='@/lib/parents'||name==='./parents') return load('lib/parents.ts',s);
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

function captchaConfig(t) {
 const names=['TURNSTILE_LOGIN_ENABLED','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','APP_ORIGIN','VERCEL_ENV'];
 const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 Object.assign(process.env,{TURNSTILE_LOGIN_ENABLED:'true',TURNSTILE_SITE_KEY:'synthetic-sitekey',TURNSTILE_SECRET_KEY:'synthetic-captcha-secret',APP_ORIGIN:'https://portal.test'});
 t.after(()=>{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}});
 return load('lib/login-captcha.ts',state());
}

test('login CAPTCHA fails closed on configuration errors and protects secret from page props',async t=>{
 const captcha=captchaConfig(t);let calls=0;const fetcher=async()=>{calls++;throw Error('Must not call');};
 assert.deepEqual(captcha.loginCaptchaPresentation(),{enabled:true,siteKey:'synthetic-sitekey'});
 for(const flag of ['true','typo']){
  process.env.TURNSTILE_LOGIN_ENABLED=flag;process.env.TURNSTILE_SECRET_KEY='';
  assert.equal((await captcha.verifyLoginCaptcha('token','parent_login',fetcher)).status,503);
  assert.deepEqual(captcha.loginCaptchaPresentation(),{enabled:true,siteKey:''});
 }
 process.env.TURNSTILE_LOGIN_ENABLED='false';
 assert.deepEqual(await captcha.verifyLoginCaptcha(undefined,'parent_login',fetcher),{ok:true});assert.equal(calls,0);
});

test('login CAPTCHA validates hostname/action/expiry and fails safely on network or malformed responses',async t=>{
 const {verifyLoginCaptcha}=captchaConfig(t);
 const valid={success:true,hostname:'portal.test',action:'parent_login',challenge_ts:new Date().toISOString()};
 let calls=0;
 const fetcher=async(url,options)=>{
  calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(JSON.parse(options.body),{secret:'synthetic-captcha-secret',response:'synthetic-token'});
  assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal);
  return Response.json(valid);
 };
 for(const token of [undefined,'','x'.repeat(2049)])assert.equal((await verifyLoginCaptcha(token,'parent_login',fetcher)).status,403);
 assert.equal(calls,0);assert.deepEqual(await verifyLoginCaptcha('synthetic-token','parent_login',fetcher),{ok:true});
 for(const result of [null,{...valid,success:false},{...valid,hostname:'attacker.test'},{...valid,action:'staff_login'},{...valid,challenge_ts:'invalid'},{...valid,challenge_ts:new Date(Date.now()-301000).toISOString()}]){
  assert.equal((await verifyLoginCaptcha('synthetic-token','parent_login',async()=>Response.json(result))).status,403);
 }
 for(const fail of [async()=>{throw Error('timeout');},async()=>new Response('unavailable',{status:503}),async()=>new Response('not JSON')]){
  assert.equal((await verifyLoginCaptcha('synthetic-token','parent_login',fail)).status,503);
 }
});

test('official CAPTCHA test keys cannot be used on a deployed hostname',async t=>{
 const captcha=captchaConfig(t);process.env.TURNSTILE_SITE_KEY='1x00000000000000000000AA';
 assert.equal(captcha.loginCaptchaPresentation().siteKey,'');
 process.env.APP_ORIGIN='http://127.0.0.1:3197';process.env.VERCEL_ENV='development';
 assert.equal(captcha.loginCaptchaPresentation().siteKey,'1x00000000000000000000AA');
 process.env.VERCEL_ENV='production';assert.equal(captcha.loginCaptchaPresentation().siteKey,'');
});

test('both login endpoints reject invalid/replayed CAPTCHA before Auth, database or cookies',async t=>{
 captchaConfig(t);const previousFetch=global.fetch;t.after(()=>{global.fetch=previousFetch;});
 for(const [route,body,action] of [[login,{},'parent_login'],['app/api/auth/login/route.ts',{email:'staff@example.test',password:'synthetic-only'},'staff_login']]){
  let verifies=0;
  global.fetch=async()=>{verifies++;return Response.json({success:verifies===1,hostname:'portal.test',action,challenge_ts:new Date().toISOString()});};
  let s=state({targetUser:{id:id(1),app_metadata:{role:'admin'}}});
  assert.equal((await post(route,s,body)).status,403);assert.equal(s.calls.length,0);assert.equal(verifies,0);
  s=state({targetUser:{id:id(1),app_metadata:{role:'admin'}}});
  assert.equal((await post(route,s,{...body,captchaToken:'synthetic-token'})).status,200);
  if(action==='staff_login')assert.deepEqual(did(s,'login')[0].payload,body);
  s=state();assert.equal((await post(route,s,{...body,captchaToken:'synthetic-token'})).status,403);
  assert.equal(s.calls.length,0);assert.equal(s.cookies.length,0);
  s=state();assert.equal((await post(route,s,{...body,captchaToken:'synthetic-token'},'https://attacker.test')).status,403);assert.equal(verifies,2);
 }
});

test('phone normalization accepts full local/international numbers and rejects suffixes',()=>{
  const {normalizeParentPhone}=load('lib/parents.ts',state());
  for(const value of ['0912 345 678','+84 912-345-678','0084912345678']) assert.equal(normalizeParentPhone(value),'0912345678');
  for(const value of ['912345678','12345678','abc0912345678','+1 912345678','++84912345678','0112345678']) assert.equal(normalizeParentPhone(value),null);
});
test('admin endpoints require verified admin; parent lookup never grants admin',async()=>{
  for(const user of [null,{id:id(2),app_metadata:{role:'parent'}},{id:id(2),user_metadata:{role:'admin'},app_metadata:{}}]){
    const s=state({user});assert.equal((await post(manage,s,createBody)).status,403);
    assert.equal((await load(manage,s).GET(new Request('https://portal.test/api'))).status,403);
    assert.equal(did(s,'service').length,0);assert.equal(did(s,'admin_save_parent').length,0);
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
  assert.deepEqual(did(s,'admin_save_parent')[0].payload,{p_parent_id:null,p_display_name:'Parent',p_phone:'0912345678',p_student_id:id(11),p_active:true,p_revision:null});
  assert.equal(did(s,'create').length,0);assert.equal(did(s,'service').length,0);
});
test('validation, duplicate phone and missing migration errors are surfaced without Auth mutations',async()=>{
  for(const [rpcError,code] of [[{code:'23505'},409],[{code:'PGRST202'},503],[{code:'22023'},400]]){
    const s=state({rpcError});assert.equal((await post(manage,s,createBody)).status,code);assert.equal(did(s,'create').length,0);
  }
  const s=state();assert.equal((await post(manage,s,{...createBody,studentIds:[id(11),id(11)]})).status,400);assert.equal(did(s,'admin_save_parent').length,0);
});
test('admin changes phone only with revision and exactly one student',async()=>{
 const body={action:'update',parentId:id(2),name:'Edited',phone:'0987654321',studentIds:[id(11)],active:false,revision:2};
 const s=state();assert.equal((await post(manage,s,body)).status,200);
 assert.deepEqual(did(s,'admin_save_parent')[0].payload,{p_parent_id:id(2),p_display_name:'Edited',p_phone:'0987654321',p_student_id:id(11),p_active:false,p_revision:2});
 assert.equal((await post(manage,state(),{...body,revision:undefined})).status,400);
 assert.equal((await post(manage,state(),{...body,studentIds:[]})).status,400);
 assert.equal((await post(manage,state({rpcError:{code:'40001'}}),body)).status,409);
});

test('retired parent password endpoint never calls Auth or database',async()=>{
 const s=state();assert.equal((await post(password,s,{current_password:'old',password:'new',confirmation:'new'})).status,410);assert.equal(s.calls.length,0);
 assert.equal((await post(manage,state(),{action:'reset_password',authUid:id(2)})).status,400);
});

test('Google OAuth starts PKCE with fixed callback and rejects legacy phone login',async()=>{
 const s=state({user:null});const r=await post(login,s,{});assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{url:'https://accounts.google.com/synthetic'});
 assert.deepEqual(did(s,'oauth')[0].payload,{provider:'google',options:{redirectTo:'https://portal.test/auth/callback',skipBrowserRedirect:true}});
 assert.equal((await post(login,state(),{phone:'0912345678'})).status,422);
 assert.equal(did(s,'start_parent_phone_session').length,0);
 for(const [override,status] of [[{rpcError:{code:'offline'}},503],[{rpcResults:{consume_auth_attempt:false}},429],[{oauthError:{message:'offline'}},503]]){
  assert.equal((await post(login,state(override),{})).status,status);
 }
});

test('parent session requires verified Auth and current DB linkage; legacy cookie grants nothing',async()=>{
 const old={csat_parent_lookup:'a'.repeat(43),parent_session:'0912345678'};
 assert.equal(await load('lib/parent-auth.ts',state({user:null,cookieValues:old})).parentSession(),null);
 const s=state({rpcResults:{parent_access:{state:'active',student_id:id(11)}}});
 const session=await load('lib/parent-auth.ts',s).parentSession();assert.equal(session.access.student_id,id(11));
 assert.equal(did(s,'getUser').length,1);assert.equal(did(s,'parent_access').length,1);
 await assert.rejects(()=>load('lib/parent-auth.ts',state({rpcError:{code:'offline'}})).parentSession());
});

test('parent phone claim is authenticated, bounded and does not reveal owner identity',async()=>{
 const route='app/api/parents/link/route.ts';
 assert.equal((await post(route,state({user:null}),{phone:'0912345678'})).status,401);
 const s=state({rpcResults:{claim_parent_phone:{code:'PHONE_ALREADY_LINKED'}}});
 const response=await post(route,s,{phone:'+84 912 345 678'});assert.equal(response.status,409);
 assert.equal((await response.json()).code,'PHONE_ALREADY_LINKED');
 assert.deepEqual(did(s,'claim_parent_phone')[0].payload,{p_phone:'0912345678'});
 assert.equal((await post(route,state(),{phone:'0912345678',studentId:id(11)})).status,422);
});

test('logout ends the local Supabase session and clears obsolete lookup cookies',async()=>{
 const s=state();assert.equal((await post('app/api/parents/logout/route.ts',s,{})).status,200);
 assert.deepEqual(did(s,'logout')[0].payload,{scope:'local'});
 assert.deepEqual(s.cookies.map(c=>c[0]).sort(),['csat_parent_lookup','parent_session']);
 assert.ok(s.cookies.every(c=>c[2].maxAge===0));
 assert.equal((await post('app/api/parents/logout/route.ts',state({logoutError:{message:'offline'}}),{})).status,503);
});

test('parent page validates lookup separately; admin/tutor routing stays protected',()=>{
  const {authRedirect}=load('lib/auth-routing.ts',state());
  for(const user of [null,{app_metadata:{role:'parent'}},{app_metadata:{role:'admin'}}]) for(const route of ['/parents','/parents/account','/login'])assert.equal(authRedirect(route,user),null);
  for(const route of ['/admin/parents','/tutor/dashboard','/tutor']) assert.equal(authRedirect(route,{app_metadata:{role:'parent'}}),'/parents');
  assert.equal(authRedirect('/admin/parents',null),'/tutor');
  assert.equal(authRedirect('/admin/parents',{app_metadata:{role:'tutor'}}),'/tutor/dashboard');
  assert.equal(authRedirect('/admin/parents',{user_metadata:{role:'admin'}}),'/parents');
  const page=fs.readFileSync(path.join(root,'app/parents/page.tsx'),'utf8');assert.match(page,/parentSession/);assert.match(page,/parent_portal/);assert.doesNotMatch(page,/get_parent_portal|auth.getUser|parent_session/);
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
 const limited=state({rpcResults:{consume_auth_attempt:false}}),limitedResponse=await post(route,limited,body);assert.equal(limitedResponse.status,429);assert.equal(limitedResponse.headers.get('retry-after'),'900');assert.match((await limitedResponse.json()).error,/vượt quá.*15 phút/);assert.equal(did(limited,'login').length,0);
 for(const profile of [[],[{auth_uid:id(3),status:'inactive',is_deleted:false}],[{auth_uid:id(3),status:'active',is_deleted:true}]]){
  const s=state({targetUser:{id:id(3),app_metadata:{role:'tutor'}},tutors:profile});assert.equal((await post(route,s,body)).status,403);assert.equal(did(s,'logout').length,1);
 }
 const s=state();assert.equal((await post(route,s,body,'https://outside.test')).status,403);assert.equal(s.calls.length,0);
});
test('both login endpoints share source budget, isolate identities and bound request bodies',async()=>{
 const {authAttemptKeys}=load('lib/login-security.ts',state());const request=new Request('https://portal.test/api');
 const parent=authAttemptKeys(request,'parent:0912345678'),staff=authAttemptKeys(request,'staff:tutor@example.test');
 assert.equal(parent.p_source,staff.p_source);assert.notEqual(parent.p_identity,staff.p_identity);
 for(const route of [login,'app/api/auth/login/route.ts']){
  const s=state();const r=await post(route,s,{phone:'0912345678',email:'tutor@example.test',password:'x'.repeat(5000)});assert.ok([400,422].includes(r.status));assert.equal(s.calls.length,0);
 }
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

test('Google callback exchanges PKCE once, ignores client redirect and hides provider errors',async()=>{
 const route='app/auth/callback/route.ts';
 for(const role of [undefined,'tutor','admin']){
  const s=state({user:{id:id(1),app_metadata:{role}}});
  const r=await load(route,s).GET(new Request('https://portal.test/auth/callback?code=synthetic&next=https://outside.test'));
  assert.equal(r.headers.get('location'),'https://portal.test/parents');assert.deepEqual(did(s,'exchangeCode').map(c=>c.payload),['synthetic']);
  assert.equal(did(s,'updateUserById').length,0);assert.equal(did(s,'updateUser').length,0);
 }
 for(const url of ['?error=access_denied','?code='+('x'.repeat(2048)),'?code=expired']){
  const s=state({exchangeError:{message:'Provider-sensitive-detail'}});
  const r=await load(route,s).GET(new Request('https://portal.test/auth/callback'+url));
  assert.equal(r.headers.get('location'),'https://portal.test/login?error=google');
  assert.equal(did(s,'exchangeCode').length,url==='?code=expired'?1:0);
 }
});

test('parent directory accepts the one-to-one PostgREST embedding and preserves a list contract',async()=>{
 const link={student_id:id(11),students:{name:'Fixture student'}};
 for(const embedded of [link,[link],null]){
  const s=state({parent_accounts:[{parent_id:id(2),parent_student_links:embedded,parent_identity_links:{state:'active',revision:1}}],rpcResults:{admin_parent_link_details:{[id(2)]:{google_email:'fixture@example.test'}}}});
  const r=await load(manage,s).GET(new Request('https://portal.test/api'));assert.equal(r.status,200);
  const body=await r.json();assert.deepEqual(body.parents[0].parent_student_links,embedded?[link]:[]);
  assert.equal(body.parents[0].link_details.google_email,'fixture@example.test');
 }
});

test('legacy student API uses the atomic admin RPC, checks Origin/revision and never writes through service role',async()=>{
 const route='app/api/admin/students/route.ts';
 for(const user of [null,{id:id(2),app_metadata:{role:'tutor'}},{id:id(2),user_metadata:{role:'admin'}}]){
  const s=state({user});assert.ok([401,403].includes((await post(route,s,{action:'create',name:'Fixture'})).status));assert.equal(did(s,'admin_save_student').length,0);
 }
 const foreign=state();assert.equal((await post(route,foreign,{action:'create',name:'Fixture'},'https://outside.test')).status,403);assert.equal(foreign.calls.length,0);
 for(const action of ['create','update','delete']){
  const s=state();const body=action==='create'?{action,name:'Fixture',parent_name:'Parent',parent_number:'0912345678'}:{action,student_id:id(11),revision:3,...(action==='update'?{parent_number:'0987654321'}:{})};
  assert.equal((await post(route,s,body)).status,200);assert.equal(did(s,'service').length,0);assert.equal(did(s,'admin_save_student').length,1);
  const payload=did(s,'admin_save_student')[0].payload;assert.equal(payload.p_revision,action==='create'?null:3);
  assert.deepEqual(payload.p_data,action==='delete'?{is_deleted:true}:action==='update'?{parent_number:'0987654321'}:{name:'Fixture',parent_name:'Parent',parent_number:'0912345678'});
  if(action!=='create'){delete body.revision;assert.equal((await post(route,state(),body)).status,422);}
 }
 assert.equal((await post(route,state({rpcError:{code:'40001',message:'Stale'}}),{action:'delete',student_id:id(11),revision:3})).status,409);
});

test('contact import marks shared normalized phone for review even when parent names match',()=>{
 const {previewParentImport}=load('lib/parent-import.ts',state());
 const source=[{student_id:id(11),name:'Student A',parent_name:'Parent',parent_number:'0912345678'},{student_id:id(12),name:'Student B',parent_name:'Parent',parent_number:'+84912345678'}];
 assert.ok(previewParentImport(source,[]).every(row=>row.status==='review'));
 assert.equal(previewParentImport(source.slice(0,1),[])[0].status,'ready');
});
