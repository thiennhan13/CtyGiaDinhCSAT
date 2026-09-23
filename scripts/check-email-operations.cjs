// Local-only UI checks. Authentication and all business endpoints use synthetic data.
const http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const user={id:'30000000-0000-4000-8000-000000000111',aud:'authenticated',role:'authenticated',email:'admin@example.test',app_metadata:{role:'admin'},user_metadata:{name:'Admin kiểm thử'},created_at:new Date().toISOString()};
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.url.startsWith('/auth/v1/user'))res.end(JSON.stringify(user));else{res.statusCode=404;res.end('{}');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(54321,'127.0.0.1',resolve);});let browser;
 try{
 browser=await chromium.launch({headless:true,channel:process.env.CSAT_BROWSER_CHANNEL||'msedge'});const context=await browser.newContext({viewport:{width:1280,height:900}});
 const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.synthetic';
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 const page=await context.newPage(),errors=[],calls=[],id='30000000-0000-4000-8000-000000000001';page.on('pageerror',e=>errors.push(e.message));
 let prepared=false,notes=[];
 const json=(route,data)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 await page.route('**/api/learning?**',r=>json(r,[]));
 await page.route('**/api/admin/**',async route=>{const req=route.request(),url=new URL(req.url());
 if(req.method()==='POST'){const d=req.postDataJSON();calls.push(d);if(url.pathname.endsWith('/reconcile')){notes.push({outcome:d.outcome,note:d.note,created_at:new Date().toISOString()});return json(route,{ok:true});}
 if(d.action==='preview')return json(route,{month:d.month,token:'a'.repeat(32),allowed:true,existing:prepared,disabled:false,previewed_at:new Date().toISOString(),queue:[{class_id:'class',student_id:'student',student_name:'Học sinh giả lập',class_name:'Lớp giả lập',tutor_name:'Gia sư giả lập',status:'missing',actionable:true}]});
 if(d.action==='prepare'){prepared=true;return json(route,{prepared:true});}return json(route,{accepted:1,failed:0});}
 if(url.pathname==='/api/admin/learning/emails')return json(route,{month:'2026-09',recovery_month:'2026-09',missing_run:!prepared,runs:prepared?[{month:'2026-09',created_at:new Date().toISOString(),total:1,accepted:0,pending:0,needs_review:notes.length?0:1,digest_missing:false}]:[]});
 if(url.pathname==='/api/admin/learning')return json(route,{templates:[],defaults:[],settings:{revision:1,contact_label:'',contact_url:'',admin_emails:['csattutor@gmail.com'],email_enabled:true},tutors:[],profiles:[],classes:[],emailConfigured:true,emails:[{outbox_id:id,month:'2026-09',kind:'tutor',recipient:'tutor@example.test',status:'manual_review',attempts:3,error_code:'attempts_exhausted',email_reconciliations:notes}]});
 if(url.pathname==='/api/admin/consultations')return json(route,{data:[{request_id:id,data:{role:'parent',name:'Phụ huynh giả lập',phone:'0912345678',email:'parent@example.test',level:'thcs',goal:'specialist',school_year:'8',message:'Dữ liệu kiểm thử'},created_at:new Date().toISOString(),status:'new',revision:1,consultation_email_outbox:{status:'manual_review',attempts:3,error_code:'retry_window_or_attempt_limit',next_attempt_at:new Date().toISOString(),email_reconciliations:notes}}],total:1,newCount:1,contactedCount:0,emailEnabled:false,configurationMissing:['RESEND_API_KEY']});
 return json(route,{});
 });
 await page.goto((process.env.CSAT_UI_QA_ORIGIN||'http://127.0.0.1:3100')+'/admin/learning',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Xem trước đợt nhắc'}).click();await page.getByRole('heading',{name:'Danh sách hiện tại · 2026-09'}).waitFor();
 assert.equal(calls.filter(c=>c.action==='prepare').length,0);await page.getByRole('button',{name:'Xác nhận tạo đợt 2026-09'}).click();await page.getByText('Đã tạo đợt.',{exact:false}).waitFor();assert.equal(calls.filter(c=>c.action==='drain').length,0);
 await page.getByRole('button',{name:'Xử lý thư đang chờ'}).click();await page.getByText('Nhà cung cấp tiếp nhận 1 thư;', {exact:false}).waitFor();
 await page.getByText('Đối chiếu email',{exact:true}).click();await page.getByRole('combobox',{name:'Kết quả đối chiếu',exact:true}).selectOption('handled_elsewhere');await page.getByLabel('Ghi chú',{exact:true}).fill('Đã liên hệ qua kênh giả lập.');await page.getByRole('button',{name:'Lưu đối chiếu'}).click();await page.getByText('Đã đối chiếu và xử lý',{exact:true}).waitFor();
 const preparedRequest=calls.find(c=>c.action==='prepare');assert.match(preparedRequest.request_id,/^[a-f0-9-]{36}$/);assert.equal(preparedRequest.token,'a'.repeat(32));
 await page.goto((process.env.CSAT_UI_QA_ORIGIN||'http://127.0.0.1:3100')+'/admin/consultations',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Phụ huynh giả lập'}).waitFor();await page.getByRole('combobox',{name:'Email',exact:true}).selectOption('manual_review');await page.waitForFunction(()=>document.body.innerText.includes('Chưa liên hệ: 1'));assert.equal(await page.getByRole('button',{name:'Thử gửi email'}).count(),0);
 for(const theme of ['light','dark']){await page.evaluate(t=>localStorage.setItem('theme',t),theme);for(const width of [375,1280]){await page.setViewportSize({width,height:900});for(const path of ['/admin/learning','/admin/consultations']){await page.goto((process.env.CSAT_UI_QA_ORIGIN||'http://127.0.0.1:3100')+path,{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,theme+' '+width+' '+path);await page.screenshot({path:'scratch/email-'+path.split('/').at(-1)+'-'+theme+'-'+width+'.png',fullPage:true});}}}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,responsiveChecks:8,previewBeforePrepare:true,prepareDoesNotSend:true,reconciliation:true,mailFilter:true,noPageErrors:true}));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
