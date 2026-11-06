// Production-build browser QA with an exclusively owned loopback Auth fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const aliases = require('../../lib/route-aliases.json');
const origin = process.env.PUBLIC_QA_BASE_URL || 'http://127.0.0.1:3100';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw Error('Loopback preview required');
const output = path.resolve('scratch/portal-access-qa');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const expires = Math.floor(Date.now()/1000)+3600;
const sessions = Object.fromEntries(['admin','tutor','parent','inactive','unknown'].map((role,index)=>{
 const user={id:'70000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),aud:'authenticated',role:'authenticated',app_metadata:{role:role==='inactive'?'tutor':role,provider:'google'},user_metadata:{name:'Fixture User'},created_at:'2026-01-01T00:00:00Z'};
 const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',app_metadata:user.app_metadata,exp:expires})+'.'+encode('fixture-signature');
 return [role,{access_token:token,token_type:'bearer',refresh_token:'fixture-refresh',expires_in:3600,expires_at:expires,user}];
}));
let reads=0;
const mock=http.createServer((req,res)=>{
 res.setHeader('Content-Type','application/json');
 const entry=Object.entries(sessions).find(([,s])=>req.headers.authorization==='Bearer '+s.access_token);
 if(req.url==='/auth/v1/user'){
  res.statusCode=entry?200:401;res.end(JSON.stringify(entry?entry[1].user:{message:'Fixture has no session'}));return;
 }
 if(req.url==='/rest/v1/rpc/current_tutor_id'){res.end(JSON.stringify(entry?.[0]==='tutor'?'70000000-0000-4000-8000-000000000099':null));return;}
 if(req.url==='/rest/v1/rpc/parent_access'){reads++;res.end(JSON.stringify({state:'unlinked'}));return;}
 if(req.url.startsWith('/rest/v1/')){reads++;res.end('[]');return;}
 res.statusCode=404;res.end('{}');
});
async function main(){
 await fs.mkdir(output,{recursive:true});
 await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(54329,'127.0.0.1',resolve);});
 const browser=await chromium.launch({headless:true,channel:process.env.CSAT_BROWSER_CHANNEL||'msedge'});
 let checks=0;
 const check=(condition,message)=>{checks++;assert.ok(condition,message);};
 async function context(role){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  await ctx.route('**/*',route=>{
   const url=new URL(route.request().url());
   return [origin,'http://127.0.0.1:54329'].includes(url.origin)?route.continue():route.abort();
  });
  if(role)await ctx.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(sessions[role]),domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax',expires}]);
  return ctx;
 }
 try{
  for(const role of ['admin','tutor','parent','inactive','unknown',null]){
   const ctx=await context(role);
   const own=role==='parent'?'parents':role;
   const home=role==='parent'?'/parents':role==='admin'||role==='tutor'?'/'+role+'/dashboard':'/access-denied';
   for(const area of ['admin','tutor','parents']){
    if(area===own)continue;
    for(const suffix of ['','/dashboard','/classes/example']){
     const before=reads;
     const response=await ctx.request.get(origin+'/'+area+suffix,{maxRedirects:0,headers:{RSC:'1','Next-Router-Prefetch':'1'}});
     const target=role?home:area==='parents'?'/login':'/login?role=tutor';
     check(response.status()===307 && new URL(response.headers().location,origin).href===origin+target,'Wrong portal redirects '+role+' '+area+suffix);
     check(reads===before,'No data fetched for wrong role');
    }
    const response=await ctx.request.get(origin+'/api/'+area+(area==='parents'?'/oj?student=70000000-0000-4000-8000-000000000001':'/payments'),{maxRedirects:0});
    check(response.status()===(role?403:401),'Direct API denied '+role+' '+area);
   }
   if(role){
    const resumed=await ctx.request.get(origin+'/login?role=tutor',{maxRedirects:0});
    check(resumed.status()===307 && new URL(resumed.headers().location,origin).pathname===home,'Session resumes own portal');
   }
   await ctx.close();
  }
  const parent=await context('parent'), p=await parent.newPage();
  await p.goto(origin+'/tutor/classes',{waitUntil:'networkidle'});
  check(new URL(p.url()).pathname==='/parents','Browser parent returns to parents');
  check(await p.getByLabel('Số điện thoại',{exact:true}).isVisible(),'Unlinked parent can claim phone');
  await p.reload({waitUntil:'networkidle'});
  check(new URL(p.url()).pathname==='/parents','Reload preserves login');
  await parent.close();
  const ctx=await context(null), page=await ctx.newPage();
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});
   await page.goto(origin+'/team',{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   check(await page.locator('.tutor-directory-profile').count()===10,'Ten public tutor profiles');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow '+width);
   const footer=page.locator('.footer-top');
   const boxes=await footer.locator(':scope > *').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};}));
   check(boxes.length===4,'Four footer groups');
   const columns=width<=600?1:width<=1100?2:4;
   check(new Set(boxes.map(b=>Math.round(b.x))).size===columns,'Footer columns '+width);
   if(columns===4)check(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<1,'Footer heading alignment');
   check(await page.locator('.footer-contact a[href^="mailto:"]').count()===3,'Three CSAT contacts');
   const directory=await page.locator('.tutor-directory').innerText();
   check(!/@|facebook\.com|zalo|GS\d{3}|\b0\d{9}\b/i.test(directory),'Public directory contains no private contacts');
   const captureStyle='.site-header,.contact-dock,.dock-materials-notice{visibility:hidden!important}';
   await footer.screenshot({path:path.join(output,'footer-'+width+'.png'),style:captureStyle});
   await page.locator('.tutor-directory-profile').first().scrollIntoViewIfNeeded();
   await page.locator('.tutor-directory-profile').first().locator('img').evaluate(img=>img.decode());
   await page.locator('.tutor-directory-profile').first().screenshot({path:path.join(output,'tutor-'+width+'.png'),style:captureStyle});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Dark reduced-motion layout');
  await page.locator('.tutor-directory-profile').first().screenshot({path:path.join(output,'tutor-dark.png')});
  await page.goto(origin+'/gia-su#gia-su-csat',{waitUntil:'networkidle'});
  check(new URL(page.url()).pathname==='/team' && new URL(page.url()).hash==='#csat-tutors','Old section hash is restored');
  const publicAliases = [
   ...Object.entries(aliases.pages).map(([old,next])=>['/'+old,'/'+next]),
   ...Object.entries(aliases.posts).map(([old,next])=>['/bai-dang/'+old,'/posts/'+next]),
  ];
  for(const [old,next] of publicAliases){
   const response=await ctx.request.get(origin+old+'?source=qa',{maxRedirects:0});
   const target=new URL(response.headers().location,origin);
   check(response.status()===308 && target.pathname===next && target.search==='?source=qa','Legacy public URL '+old);
  }
  for(const [old,next] of Object.entries(aliases.topics)){
   const response=await ctx.request.get(origin+'/parents/chuyen-de/'+old+'?month=2026-10',{maxRedirects:0});
   const target=new URL(response.headers().location,origin);
   check(response.status()===308 && target.pathname==='/parents/topics/'+next && target.search==='?month=2026-10','Legacy private topic preserves scope');
  }
  await ctx.close();
  console.log(JSON.stringify({passed:true,checks,output,scope:'Synthetic Auth; production database unchanged'}));
 }finally{await browser.close();await new Promise(resolve=>mock.close(resolve));}
}
main().catch(error=>{console.error(error);mock.close();process.exitCode=1;});
