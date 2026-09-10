const path=require('node:path');
let playwright;
for(const candidate of [process.env.CSAT_PLAYWRIGHT_MODULE,'playwright',path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){try{playwright=require(candidate);break;}catch{}}
if(!playwright)throw Error('Install/configure Playwright or set CSAT_PLAYWRIGHT_MODULE.');
const {chromium}=playwright;
const fs=require('fs'),assert=require('node:assert/strict');
const id=n=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const seeds=JSON.parse(fs.readFileSync('lib/learning-template-seeds.json','utf8'));
const body={goal:'Mục tiêu kiểm thử',focus_tags:['k-arrays'],next_step:'Luyện kiểm thử',stage_index:2,title:'',content:'',continuation:'',program:'basic',format:'group',template_id:'30000000-0000-4000-8000-000000000001'};
const templates=seeds.map((t,i)=>({...t,template_id:'30000000-0000-4000-8000-00000000000'+(i+1),version:1}));
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
await page.screenshot({path:'scratch/parent-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth),true);
await page.screenshot({path:'scratch/parent-mobile.png',fullPage:true});
await page.evaluate(()=>document.querySelectorAll('.parent-report details').forEach(d=>d.open=true));
await page.pdf({path:'scratch/parent-a4.pdf',format:'A4',printBackground:true});
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
await page.getByRole('button',{name:'Nội dung buổi',exact:true}).click();
await page.getByText('Tên nội dung',{exact:true}).waitFor();
assert.equal(await page.getByText('Tìm trọng tâm',{exact:true}).count(),0);
await page.screenshot({path:'scratch/learning-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:['parent desktop/mobile no overflow','A4 print generated','resume existing monthly draft','autosave once with existing ID','explicit publish','published review locked after reload','no per-student tags in session editor','previous tutor draft read-only, not published','failed autosave does not retry indefinitely'],screenshots:4}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
