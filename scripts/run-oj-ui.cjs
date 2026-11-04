// Isolated browser transport fixtures; no real users, Supabase or OJ requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'scratch/oj-ui');
const {chromium}=require(root+'/node_modules/playwright');
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const exp=Math.floor(Date.now()/1000)+7200,encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const user={id:id(1),aud:'authenticated',role:'authenticated',app_metadata:{role:'admin'},user_metadata:{name:'Admin dữ liệu giả'},created_at:'2026-01-01T00:00:00Z'};
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id(1),aud:'authenticated',role:'authenticated',exp,iat:exp-7200})+'.'+Buffer.from('fixture-only').toString('base64url');
const auth={access_token:token,token_type:'bearer',refresh_token:'unused-fixture',expires_in:7200,expires_at:exp,user};
const student={student_id:id(10),name:'Học sinh kiểm thử',date_of_birth:null,province:null,status:'Đang học',parent_name:'Phụ huynh kiểm thử',parent_number:'0912345678'};
const portal={parent:{name:'Phụ huynh kiểm thử',phone:'0912345678'},student,students:[student],month:'2026-06',reviewPage:0,reviewCount:0,reviews:[],plans:[],enrolledClasses:[],attendanceCount:0,attendance:[],invoices:[],provisional:[],tutors:[],class_progress:[],contact:{label:'CSAT',url:'https://example.test'}};
const workspace={classes:[{class_id:id(30),name:'Lớp lập trình kiểm thử',organization_id:null,revision:0}],students:[{...student,username:null,state:null,revision:0,pending_request:null}],sessions:[{session_id:id(40),date:'2026-06-01',start_time:'18:00:00',contest_ids:[1,2],revision:1}]};
const stats={submission_count:30,attempted_count:12,solved_count:8,last_submission_at:null,status:'available'};
const account={profile_id:7,username:'student_fixture',url:'/user/student_fixture'};
const parentData={connected:true,as_of:'2026-06-01T11:15:00Z',data:{account,learning:{scope:'learning',public_practice:stats,practice:stats,learning_total:stats},site:{rating:1500,rating_rank:5,performance_rank:null},counts:{live_contests:2,virtual_participations:1,registered_contests:0}}};
const contest={contest:{contest_id:1,key:'fixture',name:'Thuật toán và tư duy lập trình · buổi kiểm thử',start_time:'2026-06-01',end_time:'2026-06-02'},participation:{participation_id:1,mode:'live',state:'completed'},status:'frozen',metrics:{score:80,class_rank:2,class_participants:10,contest_rank:5,contest_participants:50,rank_scope:'live',solved_count:null,attempted_count:null},rating:null};
let parentState='active';
let profile={tutor_id:id(20),name:'Gia sư kiểm thử',background:'',major:'',university:'',introduction:'Giới thiệu kiểm thử',achievements:'',certificates:'',avatar_path:null,avatar_url:null,revision:1};
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
(async()=>{fs.mkdirSync(output,{recursive:true});let server,browser,page;const errors=[];
 const mock=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/auth/v1/user'){res.end(JSON.stringify(user));return;}
  if(req.url==='/rest/v1/rpc/parent_access'){res.end(JSON.stringify({state:parentState,student_id:student.student_id}));return;}
  if(req.url==='/rest/v1/rpc/parent_portal'){res.end(JSON.stringify(portal));return;}
  res.end('[]');
 });
 const log=fs.createWriteStream(path.join(output,'server.log'));
 try{
  await new Promise(r=>mock.listen(0,'127.0.0.1',r));const mockOrigin='http://127.0.0.1:'+mock.address().port;
  const origin='http://127.0.0.1:'+await port();
  const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:mockOrigin,NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',APP_ORIGIN:origin,CSAT_OJ_ENABLED:'false',CONSULTATIONS_ENABLED:'false',CONSULTATIONS_EMAIL_ENABLED:'false',TURNSTILE_LOGIN_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'};
  server=spawn(process.execPath,[root+'/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',new URL(origin).port],{cwd:root,env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});
  let ready=false;for(let n=0;n<90;n++){if(server.exitCode!==null)throw Error('Preview exited');try{if((await fetch(origin+'/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'preview ready');
  browser=await chromium.launch({headless:true,channel:process.env.CSAT_BROWSER_CHANNEL||'msedge'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(auth),domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  let writes=0,reads=0,denied=false,paid=false,connectionReady=false,exchangeId=null;
  await context.route(origin+'/api/oj/links**',async route=>{
   if(route.request().method()==='POST'){
    writes++;const body=route.request().postDataJSON();
    if(body.action==='recover'){assert.equal(body.requestId,exchangeId);workspace.students[0].pending_request=null;return json(route,{success:true});}
    assert.equal(body.action,'exchange');assert.equal(body.studentId,id(10));assert.equal(body.code.length,43);assert.match(body.requestId,/^[a-f0-9-]{36}$/);
    if(writes===1){exchangeId=body.requestId;workspace.students[0].pending_request=exchangeId;return json(route,{error:'Chưa kết nối được CSATOJ. Thử đồng bộ lại.'},503);}
    assert.equal(body.requestId,exchangeId);Object.assign(workspace.students[0],{username:'student_fixture',state:'active',revision:1,pending_request:null});return json(route,{success:true});
   }
   return json(route,{...workspace,connection_ready:connectionReady});
  });
  const ojRead=route=>{reads++;if(denied)return json(route,{error:'Quyền truy cập đã được thu hồi.'},403);if(!workspace.students[0].username)return json(route,{connected:false});return json(route,new URL(route.request().url()).searchParams.get('kind')==='contests'?{connected:true,data:{account,items:[contest],next_cursor:null}}:parentData);};
  await context.route(origin+'/api/parents/oj**',ojRead);await context.route(origin+'/api/oj/accounts**',ojRead);
  await context.route(origin+'/api/parents/link',route=>{console.log('claim requested');return json(route,{error:'Số điện thoại đã được liên kết với tài khoản khác.',code:'PHONE_ALREADY_LINKED'},409);});
  await context.route(origin+'/api/tutor/payments',route=>{
   if(route.request().method()==='POST'){assert.equal(route.request().postDataJSON().expectedBalance,100000);paid=true;return json(route,{balance:0});}
   return json(route,{payments:[{payment_id:id(60),student_name:'Học sinh kiểm thử',class_name:'Lớp kiểm thử',period:'Tháng 6',amount:100000,balance:paid?0:100000}]});
  });
  await context.route(origin+'/api/tutor/profile',route=>{
   if(route.request().method()==='PUT'){
    const body=JSON.parse(route.request().postDataBuffer().toString().match(/\r\n\r\n(\{[^\r]+\})\r\n/)[1]);
    assert.equal(body.certificates,'Chứng chỉ thử 1\nChứng chỉ thử 2');profile={...profile,...body,revision:profile.revision+1};
   }
   return json(route,{profile});
  });
  page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/admin/oj',{waitUntil:'networkidle'});console.log('admin loaded');await page.getByRole('heading',{name:'Kết nối CSATOJ',exact:true}).waitFor();
  await page.getByLabel('Học sinh',{exact:true}).selectOption(id(10));
  await page.getByLabel('Mã kết nối từ admin OJ').fill('a'.repeat(43));await page.getByLabel('Lý do liên kết').fill('Kiểm thử giao diện');
  await page.getByRole('heading',{name:'Chưa bật kết nối CSATOJ',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Lưu kết nối',exact:true}).isDisabled());assert.equal(writes,0);
  await page.setViewportSize({width:320,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,'disabled-320.png'),fullPage:true});
  connectionReady=true;await page.reload({waitUntil:'networkidle'});await page.getByLabel('Học sinh',{exact:true}).selectOption(id(10));
  await page.getByLabel('Mã kết nối từ admin OJ').fill('a'.repeat(43));await page.getByLabel('Lý do liên kết').fill('Kiểm thử giao diện');
  const save=page.getByRole('button',{name:'Lưu kết nối',exact:true});assert(await save.isEnabled());assert((await save.boundingBox()).height>=48);assert.notEqual(await save.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await save.focus();await page.keyboard.press('Enter');await page.getByRole('alert').filter({hasText:'Chưa kết nối được CSATOJ'}).waitFor();
  assert.equal(await page.getByLabel('Mã kết nối từ admin OJ').inputValue(),'a'.repeat(43));await page.getByRole('button',{name:'Thử lại kết nối',exact:true}).click();
  await page.getByText('Đã lưu kết nối.',{exact:true}).waitFor();assert.equal(writes,2);
  workspace.students[0].pending_request=exchangeId;await page.reload({waitUntil:'networkidle'});await page.getByLabel('Học sinh',{exact:true}).selectOption(id(10));
  assert.equal(await page.getByLabel('Mã kết nối từ admin OJ').inputValue(),'');await page.getByRole('button',{name:'Kiểm tra kết quả',exact:true}).click();await page.getByText('Đã lưu kết nối.',{exact:true}).waitFor();assert.equal(writes,3);
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'admin overflow '+width);await page.screenshot({path:path.join(output,'admin-'+width+'.png'),fullPage:true});}
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.setViewportSize({width:320,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,'admin-dark-320.png'),fullPage:true});await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await page.goto(origin+'/parents?month=2026-06',{waitUntil:'networkidle'});await page.locator('#oj').scrollIntoViewIfNeeded();await page.locator('#oj').getByText('student_fixture',{exact:true}).waitFor();
  await page.locator('#oj').getByRole('button',{name:'Lịch sử contest'}).click();await page.locator('#oj').getByText('2 / 10',{exact:true}).waitFor();assert(await page.locator('#oj').getByText('5 / 50',{exact:true}).isVisible());
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});await page.locator('#oj').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'parent overflow '+width);await page.locator('#oj').screenshot({path:path.join(output,'parent-'+width+'.png')});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement!==document.body));
  const initialReads=reads;await page.waitForTimeout(11000);assert.equal(reads,initialReads,'no polling');
  denied=true;await page.locator('#oj').getByRole('button',{name:'Làm mới'}).click();await page.getByText('Quyền truy cập đã được thu hồi.').waitFor();assert.equal(await page.locator('#oj').getByText('2 / 10',{exact:true}).count(),0);
  parentState='unlinked';await page.reload({waitUntil:'networkidle'});await page.getByLabel('Số điện thoại').fill('0912345678');await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/parents/link')),page.getByRole('button',{name:'Liên kết học sinh'}).click()]);await page.getByRole('alert').filter({hasText:'Số điện thoại đã được liên kết'}).waitFor();
  await page.goto(origin+'/tutor/payments',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Đã thu tiền',exact:true}).click();await page.getByRole('region',{name:'Xác nhận thu tiền'}).waitFor();assert.equal(paid,false);await page.getByRole('button',{name:'Xác nhận đã thu đủ'}).click();await page.getByText('Đã ghi nhận tiền đã thu.',{exact:true}).waitFor();assert.equal(paid,true);
  assert(await page.getByRole('button',{name:'Đã thu tiền',exact:true}).isDisabled());
  await page.goto(origin+'/tutor/profile',{waitUntil:'networkidle'});await page.getByLabel('Chứng chỉ · mỗi dòng một chứng chỉ').fill('Chứng chỉ thử 1\nChứng chỉ thử 2');await page.getByRole('button',{name:'Lưu và hiển thị',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu.'}).waitFor();
  assert.equal(profile.certificates,'Chứng chỉ thử 1\nChứng chỉ thử 2');portal.tutors=[{...profile,class_name:'Lớp thử'}];parentState='active';denied=false;
  await page.goto(origin+'/parents',{waitUntil:'networkidle'});await page.locator('#contact').getByText('Chứng chỉ thử 1',{exact:true}).waitFor();await page.locator('#contact').getByText('Chứng chỉ thử 2',{exact:true}).waitFor();
  await page.setViewportSize({width:320,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#contact').screenshot({path:path.join(output,'certificates-320.png')});
  await page.goto(origin+'/admin/parents/provisioning',{waitUntil:'networkidle'});await page.getByText(/Phụ huynh đăng nhập Google rồi nhập số điện thoại khớp hồ sơ/).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'reconciliation mobile overflow');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,viewports:[320,375,768,1440],checks:['disabled configuration prevents writes','visible save button','retry preserves code and UUID','receipt recovery without code','class and contest ranks','no polling','revocation clears data','phone conflict','full receipt confirmation','keyboard','reduced motion','certificates form to parent card','Google reconciliation copy'],output}));
 }catch(error){if(page){console.error('URL',page.url());await page.screenshot({path:path.join(output,'failure.png'),fullPage:true,timeout:5000}).catch(()=>{});console.error((await page.locator('body').innerText({timeout:5000}).catch(()=>'' )).slice(-4000));}console.error(errors);throw error;
 }finally{await browser?.close();if(server?.pid)try{if(process.platform==='win32')execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else process.kill(-server.pid,'SIGTERM');}catch{server.kill();}mock.close();log.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
