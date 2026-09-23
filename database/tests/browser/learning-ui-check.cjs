const path=require('node:path');
let playwright;
for(const candidate of [process.env.CSAT_PLAYWRIGHT_MODULE,'playwright',path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){try{playwright=require(candidate);break;}catch{}}
if(!playwright)throw Error('Install/configure Playwright or set CSAT_PLAYWRIGHT_MODULE.');
const {chromium}=playwright;
const fs=require('fs'),assert=require('node:assert/strict');
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const seeds=JSON.parse(fs.readFileSync('lib/learning-curriculum-20260922.json','utf8'));
const body={goal:'Mục tiêu kiểm thử',focus_tags:['k-arrays'],next_step:'Luyện kiểm thử',stage_index:null,curriculum:{parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:'basic-a-2'},title:'',content:'',continuation:'',program:'basic',format:'group',template_id:'30000000-0000-4000-8000-000000000001'};
const templates=seeds.map((t,i)=>({...t,template_id:'30000000-0000-4000-8000-00000000000'+(i+1),version:2}));
const workspace={class:{class_id:id(30),name:'Lớp kiểm thử',class_type:'Lớp Cơ bản'},templates,defaults:templates.map(t=>({program:t.program,template_id:t.template_id})),records:[{record_id:id(90),class_id:id(30),kind:'class',student_id:null,session_id:null,draft:body,published:body,revision:1,published_at:'2026-09-01T00:00:00Z'}],students:[{student_id:id(10),name:'Học sinh kiểm thử'}],sessions:[{session_id:id(41),date:'2026-09-05',status:'completed'}],queue:[]};
let reviews=[{review_id:id(100),student_id:id(10),tutor_id:id(20),class_id:id(30),month_year:'2026-09',review_context:'Tháng 2026-09',general_assessment:'Bản nháp đã có',learning_attitude:'',logical_thinking:'',review_tags:[],review_status:'draft',updated_at:'2026-09-01T00:00:00Z'}];
const saves=[],errors=[];let failSave=false;
(async()=>{
const browser=await chromium.launch({headless:true,channel:process.platform==='win32'?'msedge':undefined});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.hostname!=='127.0.0.1'){await route.abort();return;}
 if(url.pathname==='/api/learning'){await route.fulfill({json:workspace});return;}
 if(url.pathname==='/api/tutor/reviews'){
  if(route.request().method()==='POST'){
   const v=route.request().postDataJSON();saves.push(v);
   if(failSave){await route.fulfill({status:503,json:{error:'Lỗi kiểm thử tự lưu'}});return;}
   const review={...v,tutor_id:id(20),review_tags:v.tags,updated_at:new Date().toISOString()};
   reviews=[review,...reviews.filter(r=>r.review_id!==v.review_id)];await route.fulfill({json:{review}});return;
  }
  await route.fulfill({json:{student:{student_id:id(10),name:'Học sinh kiểm thử'},class:workspace.class,tutorId:id(20),reviews}});return;
 }
 await route.continue();
});
const base=(process.env.CSAT_UI_QA_ORIGIN||'http://127.0.0.1:8877')+'/qa-learning-preview/'+id(30);
await page.goto(base,{waitUntil:'networkidle'});
await page.getByRole('heading',{name:'Lộ trình và trọng tâm học tập'}).waitFor();
assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true);
assert.equal(await page.locator('.parent-report').evaluate(el=>{const p=el.querySelector('.parent-profile'),r=el.querySelector('#reviews'),m=el.querySelector('#roadmap');return !!(p.compareDocumentPosition(r)&4)&&!!(r.compareDocumentPosition(m)&4);}),true);
assert.equal(await page.locator('a[href="/"]').count(),1);
assert.equal(await page.locator('.parent-topbar').evaluate(el=>el.firstElementChild.classList.contains('parent-logo')),true);
assert.equal(await page.locator('#roadmap').evaluate(el=>el.nextElementSibling.id),'development');
await page.locator('#development').getByRole('heading',{name:'HSG Tỉnh lớp 9',exact:true}).waitFor();
await page.locator('#development').getByRole('heading',{name:'Chuyên Tin',exact:true}).waitFor();
assert.equal(await page.locator('#development').getByRole('heading',{name:'HSG Quốc gia',exact:true}).count(),0);
assert.equal(await page.getByText('Bài đã giải: — / —',{exact:true}).count(),1);
await page.getByRole('button',{name:/CHẶNG 01/}).click();
await page.locator('.roadmap-detail').getByRole('heading',{name:'Diễn đạt bài toán bằng chương trình'}).waitFor();
assert.equal(await page.getByText(/Gia sư đang ghi nhận trọng tâm: Biểu diễn/).count(),1);
await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:'scratch/parent-desktop.png',fullPage:true});
await page.locator('#development').screenshot({path:'scratch/parent-development-basic.png'});
for(const width of [768,375]){
 await page.setViewportSize({width,height:900});
 assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'scratch/parent-'+width+'.png',fullPage:true});
}
await page.getByRole('button',{name:/Xem buổi 2026-09-05/}).click();
await page.getByRole('dialog').waitFor();
await page.getByRole('dialog').getByText('18:00–19:30',{exact:false}).waitFor();
await page.getByRole('dialog').getByText('Chưa đủ dữ liệu',{exact:false}).waitFor();
await page.getByRole('dialog').getByText('Chưa chốt',{exact:false}).waitFor();
await page.keyboard.press('Escape');
await page.getByRole('dialog').waitFor({state:'hidden'});
await page.getByRole('button',{name:'Nội dung theo dõi'}).click();
await page.getByRole('navigation',{name:'Nội dung phụ huynh'}).getByRole('link',{name:'Nhận xét gia sư'}).click();
assert.equal(await page.getByRole('button',{name:'Nội dung theo dõi'}).getAttribute('aria-expanded'),'false');
await page.evaluate(()=>document.documentElement.classList.add('dark'));
await page.waitForFunction(()=>getComputedStyle(document.querySelector('.roadmap-stage[aria-pressed=false]')).backgroundColor==='rgb(34, 37, 32)');
await page.evaluate(()=>window.scrollTo(0,0));
await page.screenshot({path:'scratch/parent-dark.png',fullPage:true});
await page.evaluate(()=>document.documentElement.classList.remove('dark'));
await page.emulateMedia({reducedMotion:'reduce'});
await page.evaluate(()=>document.querySelectorAll('.parent-report details').forEach(d=>d.open=true));
await page.pdf({path:'scratch/parent-a4.pdf',format:'A4',printBackground:true});
await page.goto(base+'?program=advanced',{waitUntil:'networkidle'});
await page.locator('#development').getByRole('heading',{name:'HSG Tỉnh cấp THPT',exact:true}).waitFor();
await page.locator('#development').getByRole('heading',{name:'HSG Quốc gia',exact:true}).waitFor();
assert.equal(await page.locator('#development').getByRole('heading',{name:'Chuyên Tin',exact:true}).count(),0);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.locator('#development').screenshot({path:'scratch/parent-development-advanced.png'});
await page.goto(base+'?program=none',{waitUntil:'networkidle'});
await page.locator('#development').getByText('Gia sư và gia đình sẽ cùng xác nhận hướng phát triển',{exact:false}).waitFor();
assert.equal(await page.locator('#development h4').count(),0);
await page.goto(base+'?fees=known',{waitUntil:'networkidle'});
await page.getByRole('button',{name:/Xem buổi 2026-09-05/}).click();
await page.getByRole('dialog').getByText(/120.000/).waitFor();
await page.getByRole('dialog').getByText('Đã chốt · Kỳ minh họa',{exact:false}).waitFor();
await page.getByRole('dialog').getByText('Đã cập nhật theo bản điều chỉnh',{exact:false}).waitFor();
await page.getByRole('dialog').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
await page.screenshot({path:'scratch/parent-session-fee-mobile.png',animations:'disabled'});
await page.keyboard.press('Escape');
await page.goto(base+'?fees=empty',{waitUntil:'networkidle'});
assert.equal(await page.locator('#tuition strong').filter({hasText:'Chưa đủ dữ liệu'}).count(),4);
await page.goto(base+'?view=review',{waitUntil:'networkidle'});
const general=page.locator('#review-general_assessment');await general.waitFor();
assert.equal(await general.inputValue(),'Bản nháp đã có');
await general.fill('Nội dung kiểm thử tự lưu');
await page.waitForFunction(()=>document.body.innerText.includes('Đã lưu bản nháp.'),{timeout:10000});
assert.equal(saves.length,1);assert.equal(saves[0].review_id,id(100));assert.equal(saves[0].review_status,'draft');
await page.getByRole('button',{name:'Gửi nhận xét',exact:true}).click();
await page.getByRole('button',{name:'Đã gửi nhận xét',exact:true}).waitFor();
assert.equal(saves.at(-1).review_status,'published');
await page.reload({waitUntil:'networkidle'});
await general.waitFor();assert.equal(await general.isDisabled(),true);
assert.equal(saves.length,2);
await page.screenshot({path:'scratch/review-mobile.png',fullPage:true});
// A previous tutor's draft is locked but must never be labelled published.
reviews[0]={...reviews[0],tutor_id:id(21),review_status:'draft'};
await page.reload({waitUntil:'networkidle'});await general.waitFor();
assert.equal(await general.isDisabled(),true);
await page.getByText('Bản nháp tháng này do gia sư trước tạo.',{exact:false}).waitFor();
assert.equal(await page.getByRole('button',{name:'Đã gửi nhận xét',exact:true}).count(),0);
// A failed autosave is attempted once until the tutor changes content or retries explicitly.
reviews=[];await page.reload({waitUntil:'networkidle'});await general.waitFor();
failSave=true;await general.fill('Nội dung kiểm thử lỗi tự lưu');
await page.getByText('Lỗi kiểm thử tự lưu',{exact:true}).waitFor();
const failedCount=saves.length;await page.waitForTimeout(2500);assert.equal(saves.length,failedCount);
failSave=false;await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
await page.getByText('Đã lưu bản nháp. Phụ huynh chưa nhìn thấy nội dung này.',{exact:true}).waitFor();
await page.goto(base+'?view=learning',{waitUntil:'networkidle'});
await page.getByRole('heading',{name:'Lớp kiểm thử',exact:true}).waitFor();
assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true);
await page.getByLabel('Tầng kiến thức').selectOption('B');
assert.equal(await page.getByText('Giữ chặng này',{exact:true}).count(),4);
assert.equal(await page.getByLabel('Chặng đang tập trung',{exact:true}).inputValue(),'');
await page.getByText('Duyệt phương án và thống kê',{exact:false}).first().click();
await page.getByLabel('B01 · Cơ bản: Vét cạn',{exact:false}).uncheck();
assert.equal(await page.getByLabel('B01 · Cơ bản: Vét cạn',{exact:false}).isChecked(),false);
await page.getByRole('button',{name:'Khôi phục các mục đã bỏ'}).click();
assert.equal(await page.getByLabel('B01 · Cơ bản: Vét cạn',{exact:false}).isChecked(),true);
await page.reload({waitUntil:'networkidle'});
await page.getByRole('heading',{name:'Lớp kiểm thử',exact:true}).waitFor();
await page.getByRole('button',{name:'Nội dung buổi',exact:true}).click();
await page.getByText('Tên nội dung',{exact:true}).waitFor();
assert.equal(await page.getByText('Tìm trọng tâm',{exact:true}).count(),0);
await page.screenshot({path:'scratch/learning-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:['session fees: unknown, adjusted and empty invoice totals','logo left as prototype','development follows roadmap; Basic/Advanced and unpublished fallback','parent desktop/mobile no overflow','A4 print generated','resume existing monthly draft','autosave once with existing ID','explicit publish','published review locked after reload','no per-student tags in session editor','previous tutor draft read-only, not published','failed autosave does not retry indefinitely'],screenshots:9}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
