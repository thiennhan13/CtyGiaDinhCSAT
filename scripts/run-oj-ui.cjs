// Isolated browser transport fixtures; no real users, Supabase or OJ requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net');
const {spawn,execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,process.env.CSAT_UI_OUTPUT||'scratch/oj-ui');
const {chromium}=require(root+'/node_modules/playwright');
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const exp=Math.floor(Date.now()/1000)+7200,encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const user={id:id(1),aud:'authenticated',role:'authenticated',app_metadata:{role:'admin'},user_metadata:{name:'Admin dữ liệu giả'},created_at:'2026-01-01T00:00:00Z'};
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id(1),aud:'authenticated',role:'authenticated',exp,iat:exp-7200})+'.'+Buffer.from('fixture-only').toString('base64url');
const auth={access_token:token,token_type:'bearer',refresh_token:'unused-fixture',expires_in:7200,expires_at:exp,user};
const student={student_id:id(10),name:'Học sinh kiểm thử',date_of_birth:null,province:null,status:'Đang học',parent_name:'Phụ huynh kiểm thử',parent_number:'0912345678'};
const portal={parent:{name:'Phụ huynh kiểm thử',phone:'0912345678'},student,students:[student],month:'2026-06',reviewPage:0,reviewCount:0,reviews:[],plans:[],enrolledClasses:[],attendanceCount:1,attendance:[{session_id:id(40),class_name:'Lớp lập trình kiểm thử',date:'2026-06-01',start_time:'18:00:00',end_time:'19:30:00',session_status:'completed',status:'attended',lesson:null,tuition_amount:100000,billing_period:null}],invoices:[],provisional:[],tutors:[],class_progress:[],contact:{label:'CSAT',url:'https://example.test'}};
const curriculum=JSON.parse(fs.readFileSync(path.join(root,'lib/learning-curriculum-20260922.json'),'utf8'))[0];
portal.plans=[{class_id:id(30),class_name:'Lớp lập trình kiểm thử',program_code:'AB',kind:'class',published_at:'2026-06-01T00:00:00Z',template:{...curriculum,template_id:id(31),version:1},body:{goal:'Rèn tư duy lập trình và cách tự kiểm tra lời giải.',focus_tags:[],next_step:'',stage_index:null,title:'',content:'',continuation:'',program:'basic',format:'group',template_id:id(31),curriculum:{parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:null}}}];
portal.class_progress=[{class_id:id(30),completed_sessions:12,as_of:'2026-06-01T11:15:00Z'}];
portal.enrolledClasses=[{class_id:id(30),classes:{name:'Lớp lập trình kiểm thử'}}];
const workspace={classes:[{class_id:id(30),name:'Lớp lập trình kiểm thử',organization_id:null,revision:0}],students:[{...student,username:null,state:null,revision:0,pending_request:null}],sessions:[{session_id:id(40),date:'2026-06-01',start_time:'18:00:00',contest_ids:[1,2],revision:1}]};
const stats={submission_count:1200,attempted_count:12,solved_count:8,last_submission_at:null,status:'available'};
function activityFixture(start,end,mode='available'){
 const days=[];for(let time=Date.parse(start);time<=Date.parse(end);time+=86400000){const index=days.length;days.push({date:new Date(time).toISOString().slice(0,10),submission_count:mode==='zero'?0:mode==='limited'&&index===10?null:index%11===0?25:index%5===0?3:0});}
 return {metric:'submission_count',timezone:'Asia/Ho_Chi_Minh',start_date:start,end_date:end,status:mode==='limited'?'limited':'available',available_years:[2024,2025,2026],days,total_submissions:mode==='limited'?null:days.reduce((sum,d)=>sum+d.submission_count,0),active_days:mode==='limited'?null:days.filter(d=>d.submission_count>0).length};
}
const account={profile_id:7,username:'student_fixture',url:'/user/student_fixture'};
const parentData={connected:true,as_of:'2026-06-01T11:15:00Z',data:{account,learning:{scope:'learning',public_practice:stats,practice:stats,learning_total:stats},site:{rating:1500,rating_rank:5,performance_rank:null,rank_status:'listed'},counts:{live_contests:2,virtual_participations:1,registered_contests:0},activity:activityFixture('2025-06-02','2026-06-01')}};
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
  if(process.env.CSAT_UI_PRODUCTION){
   // NEXT_PUBLIC values are compiled into the bundle; build against this exact loopback fixture.
   const build=spawn(process.execPath,[root+'/node_modules/next/dist/bin/next','build'],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
   build.stdout.pipe(log,{end:false});build.stderr.pipe(log,{end:false});
   await new Promise((resolve,reject)=>{build.on('error',reject);build.on('exit',code=>code===0?resolve():reject(Error('Fixture production build failed: '+code)));});
  }
  server=spawn(process.execPath,[root+'/node_modules/next/dist/bin/next',...(process.env.CSAT_UI_PRODUCTION?['start']:['dev','--webpack']),'--hostname','127.0.0.1','--port',new URL(origin).port],{cwd:root,env,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});
  let ready=false;for(let n=0;n<90;n++){if(server.exitCode!==null)throw Error('Preview exited');try{if((await fetch(origin+'/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'preview ready');
  browser=await chromium.launch({headless:true,channel:process.env.CSAT_BROWSER_CHANNEL||'msedge'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+encode(auth),domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  let writes=0,reads=0,denied=false,paid=false,connectionReady=false,exchangeId=null,activityMode='available';
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
  const ojRead=route=>{reads++;if(denied)return json(route,{error:'Quyền truy cập đã được thu hồi.'},403);if(!workspace.students[0].username)return json(route,{connected:false});
   const params=new URL(route.request().url()).searchParams;if(params.get('kind')==='session')return json(route,{connected:true,data:{account,roster_complete:true,class_rank_basis:'session',contests:[contest],totals:{...stats,assigned_count:null}}});if(params.get('kind')==='contests')return json(route,{connected:true,data:{account,items:[contest],next_cursor:null}});
   if(activityMode==='error')return json(route,{error:'Chưa tải được lịch hoạt động.'},503);
   const year=params.get('year');return json(route,{...parentData,data:{...parentData.data,activity:activityMode==='legacy'?undefined:year?activityFixture(year+'-01-01',year+'-12-31',activityMode):parentData.data.activity}});
  };
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
  const parentReads=reads;await page.goto(origin+'/parents?month=2026-06#oj',{waitUntil:'networkidle'});await page.locator('#oj').scrollIntoViewIfNeeded();await page.locator('#oj').getByText('Tài khoản · student_fixture',{exact:true}).waitFor();assert.equal(reads,parentReads+1,'one shared summary request');
  const panel=page.locator('#oj'),practice=page.locator('#practice'),grid=practice.getByRole('group',{name:'Lịch lượt nộp bài theo ngày'});await grid.waitFor();assert.equal(await grid.getByRole('button').count(),365);
  assert.equal(await page.locator('.parent-section-title').count(),8);assert.equal(await panel.getByRole('heading',{name:'Kết quả CSATOJ',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(15, 66, 192)');
  assert.equal(await panel.locator('dl').first().locator(':scope > div').count(),3);assert.equal(await panel.getByText('Hạng performance',{exact:true}).count(),0);
  const competition=panel.locator('details').filter({has:page.getByText('Chi tiết thi đấu',{exact:true})});assert.notEqual(await competition.getAttribute('open'),null);await competition.getByText('Hạng 5',{exact:true}).waitFor();await competition.locator('summary').click();assert.equal(await competition.getAttribute('open'),null);await competition.locator('summary').click();
  assert.equal(await page.getByRole('button',{name:/Làm mới/}).count(),0);
  assert.equal(await page.getByRole('link',{name:'Xem kết quả CSATOJ',exact:true}).count(),0);
  assert.equal(await page.getByRole('link',{name:/Xem ghi nhận mới nhất/}).count(),0);
  assert.equal(await page.locator('.parent-avatar svg').count(),1);
  assert.equal(await page.locator('.parent-active-days dd').first().innerText(),'100');
  assert.equal(await page.locator('.parent-active-days dt').innerText(),'CSAT cùng con luyện tập');
  assert.equal(await page.locator('.parent-active-unit').innerText(),'ngày');
  assert.equal(await page.locator('.parent-active-days').getByText('12 tháng gần nhất',{exact:true}).count(),0);
  assert.equal(await practice.locator('dl').getByText('Bài đã làm thử',{exact:false}).count(),1);
  assert.equal(await practice.locator('dl').getByText('Bài giải đúng',{exact:false}).count(),1);
  const practiceCards=practice.locator('dl > div');
  assert.deepEqual(await practiceCards.evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor)),['rgb(15, 66, 192)','rgb(227, 242, 253)','rgb(227, 239, 79)']);
  for(let index=0;index<3;index++){assert.equal(await practiceCards.nth(index).evaluate(el=>getComputedStyle(el).borderTopWidth),'2px');}
  assert.equal(await page.getByRole('progressbar',{name:'Tiến độ lộ trình lớp'}).getAttribute('aria-valuenow'),'50');
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuetext'),'12 buổi đã hoàn thành trên 24 buổi dự kiến');
  assert.equal(await page.locator('.pkm-progress p').count(),0,'progress has no redundant visible session caption');
  assert.equal(await page.getByText('Giờ Việt Nam',{exact:false}).count(),0);
  assert.equal(await page.locator('#parent-navigation a[href="#development"]').evaluate(el=>el.parentElement.querySelector('p').textContent),'Đồng hành cùng con');
  await grid.getByRole('button').last().focus();await page.keyboard.press('ArrowLeft');assert.equal(await grid.getByRole('button').nth(357).evaluate(el=>el===document.activeElement),true);
  const mainTotal=await panel.locator('dl').first().innerText();
  await Promise.all([page.waitForResponse(r=>r.url().includes('kind=activity')&&r.url().includes('year=2024')),practice.getByLabel('Thời gian hoạt động').selectOption('2024')]);await page.waitForFunction(()=>document.querySelectorAll('#practice [data-index]').length===366);assert.equal(await panel.locator('dl').first().innerText(),mainTotal);
  activityMode='limited';await practice.getByLabel('Thời gian hoạt động').selectOption('2025');await grid.getByRole('button',{name:/11\/1\/2025: chưa có dữ liệu/}).waitFor();assert.equal(await grid.locator('[data-level="unknown"]').count(),1);assert.equal(await page.locator('.parent-active-days dd').first().innerText(),'100');
  activityMode='error';await practice.getByLabel('Thời gian hoạt động').selectOption('2024');await practice.getByRole('alert').filter({hasText:'Chưa tải được lịch hoạt động.'}).waitFor();assert.equal(await practice.getByLabel('Thời gian hoạt động').inputValue(),'2025');assert.equal(await grid.locator('[data-level="unknown"]').count(),1);
  activityMode='zero';await practice.getByLabel('Thời gian hoạt động').selectOption('2024');await page.waitForFunction(()=>document.querySelectorAll('#practice [data-index][data-level="0"]').length===366);assert.equal(await page.locator('.parent-active-days dd').first().innerText(),'100');
  activityMode='legacy';const legacyReads=reads;await page.reload({waitUntil:'networkidle'});await practice.getByText(/CSATOJ chưa cung cấp dữ liệu lượt nộp theo ngày/).waitFor();assert.equal(reads,legacyReads+1,'fresh summary on visit');assert.equal(await grid.count(),0);assert.equal(await panel.locator('dl').first().innerText(),mainTotal);assert.equal(await page.locator('.parent-active-days dd').first().innerText(),'Chưa có dữ liệu');
  activityMode='available';await page.reload({waitUntil:'networkidle'});await grid.waitFor();
  await panel.getByRole('button',{name:'Lịch sử cuộc thi'}).click();await panel.getByText('2 / 10',{exact:true}).waitFor();assert(await panel.getByText('5 / 50',{exact:true}).isVisible());
  assert.equal(await page.getByText('Xem bảng số liệu theo ngày',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Xem tổ chức đang tham gia'}).count(),0);
  assert(await page.evaluate(()=>document.querySelector('#practice').compareDocumentPosition(document.querySelector('#reviews'))&Node.DOCUMENT_POSITION_FOLLOWING),'practice before reviews');
  assert.deepEqual(await page.locator('main > section[id], main > div[id]').evaluateAll(els=>els.map(el=>el.id)),['practice','reviews','roadmap','attendance','oj','services']);
  assert.deepEqual(await page.locator('#services > section').evaluateAll(els=>els.map(el=>el.id)),['contact','tuition','development']);
  const history=panel.getByRole('button',{name:'Lịch sử cuộc thi'});assert((await history.boundingBox()).height>=60);await page.mouse.move(0,0);assert.equal(await history.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(15, 66, 192)');
  await page.setViewportSize({width:390,height:1000});
  const practiceBoxes=await practiceCards.evaluateAll(els=>els.map(el=>{const box=el.getBoundingClientRect();return {top:box.top,bottom:box.bottom};}));
  assert(practiceBoxes[1].top-practiceBoxes[0].bottom>=12 && practiceBoxes[2].top-practiceBoxes[1].bottom>=12,'practice cards remain separate on mobile');
  const mapLink=page.getByRole('link',{name:'Xem bản đồ kiến thức'});assert(await mapLink.isVisible());assert.equal(await page.locator('#roadmap .pkm-paper').isVisible(),false);assert.notEqual(await page.locator('#roadmap .pkm-readable').getAttribute('open'),null);
  const mapHref=await mapLink.getAttribute('href');const mapResponse=await page.goto(origin+mapHref,{waitUntil:'networkidle'});assert.equal(mapResponse.status(),200);assert.match(mapResponse.headers()['cache-control'],/no-store/);assert.match(mapResponse.headers()['x-robots-tag'],/noindex/);
  await page.getByRole('heading',{name:'Bản đồ kiến thức',exact:true}).waitFor();assert(await page.locator('.pkm-paper').isVisible());await page.locator('.pkm-viewport [data-node]').first().focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();assert(await page.getByRole('dialog').getByRole('link',{name:/Đọc chuyên đề/}).isVisible());await page.getByRole('button',{name:'Đóng nội dung chủ đề'}).click();
  assert.equal((await context.request.get(origin+mapHref.replace(id(30),id(99)))).status(),404);
  assert.equal((await context.request.get(origin+mapHref.replace(id(10),id(99)))).status(),404);
  const publication=portal.plans[0].published_at;portal.plans[0].published_at=null;assert.equal((await context.request.get(origin+mapHref)).status(),404);portal.plans[0].published_at=publication;
  parentState='blocked';assert.equal((await context.request.get(origin+mapHref,{maxRedirects:0})).status(),307);parentState='active';
  const guest=await browser.newContext();assert.equal((await guest.request.get(origin+mapHref,{maxRedirects:0})).status(),307);await guest.close();
  await page.getByRole('link',{name:/Về lộ trình học tập/}).click();await grid.waitFor();assert.match(page.url(),/#roadmap$/);await panel.getByRole('button',{name:'Lịch sử cuộc thi'}).click();await panel.getByText('2 / 10',{exact:true}).waitFor();
  assert(await page.getByRole('heading',{name:'Định hướng phát triển của lớp',exact:true}).isVisible());
  await panel.getByLabel('Buổi học',{exact:true}).selectOption(id(40));await panel.getByRole('button',{name:'Xem kết quả buổi',exact:true}).click();await panel.getByText('2 / 10',{exact:true}).first().waitFor();assert.equal(await panel.getByText('2 / 10',{exact:true}).count(),2);
  const captureStyle='nextjs-portal { visibility:hidden!important; }';
  for(const width of [320,375,390,768,1440]){
   await page.setViewportSize({width,height:1000});await practice.scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'parent overflow '+width);
   assert(await grid.getByRole('button').evaluateAll(cells=>cells.every(cell=>{const r=cell.getBoundingClientRect();return Math.abs(r.width-r.height)<1;})),'square calendar cells '+width);
   const edges=await grid.evaluate(el=>{const g=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return {width:g.width,parent:p.width};});
   if(width===1440)assert(Math.abs(edges.width-edges.parent)<12,'calendar fills available width');
   await practice.screenshot({path:path.join(output,'practice-'+width+'.png'),style:captureStyle});
   await panel.screenshot({path:path.join(output,'parent-'+width+'.png'),style:captureStyle});
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'report-'+width+'.png'),fullPage:true,style:captureStyle});
   if(width<768){
    const menu=page.getByRole('button',{name:'Nội dung theo dõi'});await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
    await page.getByRole('navigation',{name:'Nội dung phụ huynh'}).getByRole('link',{name:'Nhịp luyện tập',exact:true}).click();assert.equal(await menu.getAttribute('aria-expanded'),'false');
   }else assert(await page.getByRole('navigation',{name:'Nội dung phụ huynh'}).isVisible());
  }
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.setViewportSize({width:320,height:1000});assert.equal(await panel.locator('dl').first().locator(':scope > div').nth(1).evaluate(el=>getComputedStyle(el).color),'rgb(248, 247, 242)');assert(await page.locator('.parent-active-days').isVisible());
  await practice.screenshot({path:path.join(output,'practice-dark-320.png'),style:captureStyle});await panel.screenshot({path:path.join(output,'parent-dark-320.png'),style:captureStyle});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>document.documentElement.classList.remove('dark'));
  await page.evaluate(async()=>{await document.fonts.ready;if(![...document.fonts].some(font=>font.status==='loaded'&&font.family.includes('Archivo')))throw Error('Archivo not loaded');});
  // Frozen render of this exact fixture, with the actual bundled CSS/fonts, for the taste inspector.
  // Interaction/access tests above run against the live application, not this static export.
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
  const rendered=await page.evaluate(async()=>{
   let css=Array.from(document.styleSheets).flatMap(sheet=>{try{return Array.from(sheet.cssRules,r=>r.cssText.replace(/url\(["']?([^"')]+)["']?\)/g,(_,url)=>`url("${new URL(url,sheet.href||location.href).href}")`));}catch{return [];}}).join('\n');
   const urls=[...new Set([...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]))];
   for(const url of urls){if(url.startsWith('data:'))continue;try{const absolute=new URL(url,location.href);if(absolute.origin!==location.origin)continue;const blob=await (await fetch(absolute)).blob();const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});css=css.split(url).join(data);}catch{}}
   const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,link,style,nextjs-portal').forEach(el=>el.remove());
   for(const img of clone.querySelectorAll('img')){const original=[...document.images].find(el=>el.getAttribute('src')===img.getAttribute('src'));if(!original)continue;try{const blob=await(await fetch(original.currentSrc||original.src)).blob();img.src=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});img.removeAttribute('srcset');}catch{}}
   const style=document.createElement('style');style.textContent=css;clone.querySelector('head').append(style);return '<!doctype html>'+clone.outerHTML;
  });
  fs.writeFileSync(path.join(output,'rendered.html'),rendered);
  await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement!==document.body));
  const initialReads=reads;await page.waitForTimeout(11000);assert.equal(reads,initialReads,'no polling');
  denied=true;await panel.getByRole('button',{name:'Lịch sử cuộc thi'}).click();await panel.getByText('Quyền truy cập đã được thu hồi.').waitFor();assert.equal(await page.locator('#oj').getByText('2 / 10',{exact:true}).count(),0);assert.equal(await grid.count(),0);assert.equal(await page.locator('.parent-active-days dd').first().innerText(),'Chưa có dữ liệu');
  parentState='unlinked';await page.reload({waitUntil:'networkidle'});await page.getByLabel('Số điện thoại').fill('0912345678');await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/parents/link')),page.getByRole('button',{name:'Liên kết học sinh'}).click()]);await page.getByRole('alert').filter({hasText:'Số điện thoại đã được liên kết'}).waitFor();
  await page.goto(origin+'/tutor/payments',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Đã thu tiền',exact:true}).click();await page.getByRole('region',{name:'Xác nhận thu tiền'}).waitFor();assert.equal(paid,false);await page.getByRole('button',{name:'Xác nhận đã thu đủ'}).click();await page.getByText('Đã ghi nhận tiền đã thu.',{exact:true}).waitFor();assert.equal(paid,true);
  assert(await page.getByRole('button',{name:'Đã thu tiền',exact:true}).isDisabled());
  await page.goto(origin+'/tutor/profile',{waitUntil:'networkidle'});await page.getByLabel('Chứng chỉ · mỗi dòng một chứng chỉ').fill('Chứng chỉ thử 1\nChứng chỉ thử 2');await page.getByRole('button',{name:'Lưu và hiển thị',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu.'}).waitFor();
  assert.equal(profile.certificates,'Chứng chỉ thử 1\nChứng chỉ thử 2');portal.tutors=[{...profile,class_name:'Lớp thử'}];parentState='active';denied=false;
  await page.goto(origin+'/parents',{waitUntil:'networkidle'});await page.locator('#contact').getByText('Chứng chỉ thử 1',{exact:true}).waitFor();await page.locator('#contact').getByText('Chứng chỉ thử 2',{exact:true}).waitFor();
  await page.setViewportSize({width:320,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#contact').screenshot({path:path.join(output,'certificates-320.png')});
  await page.goto(origin+'/admin/parents/provisioning',{waitUntil:'networkidle'});await page.getByText(/Phụ huynh đăng nhập Google rồi nhập số điện thoại khớp hồ sơ/).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'reconciliation mobile overflow');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,viewports:[320,375,390,768,1440],checks:['disabled configuration prevents writes','visible save button','retry preserves code and UUID','receipt recovery without code','practice first with shared request state','fresh summary per parent visit','full-width square calendar at every viewport','grouped left navigation and mobile toggle','removed daily table and organizations','book icon and activity KPI','pixel curriculum ratio','development in companion group','three parent metrics','expanded Vietnamese rating details','colored contest history action','daily submission counts','leap year','unknown versus zero','legacy activity absent','year failure retains data','roving calendar keyboard','light/dark contrast','session selector and results','class and contest ranks','no polling','revocation clears heatmap and results','phone conflict','full receipt confirmation','reduced motion','certificates form to parent card'],output}));
 }catch(error){if(page){console.error('URL',page.url());await page.screenshot({path:path.join(output,'failure.png'),fullPage:true,timeout:5000}).catch(()=>{});console.error((await page.locator('body').innerText({timeout:5000}).catch(()=>'' )).slice(-4000));}console.error(errors);throw error;
 }finally{await browser?.close();if(server?.pid)try{if(process.platform==='win32')execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else process.kill(-server.pid,'SIGTERM');}catch{server.kill();}mock.close();log.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
