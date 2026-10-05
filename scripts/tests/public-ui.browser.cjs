// Manual QA against an isolated local public preview, never a deployed site.
// Set PLAYWRIGHT_MODULE for an installed module, PUBLIC_QA_BASE_URL for localhost,
// and CSAT_BROWSER_CHANNEL for an installed Chromium channel (default msedge).
// PUBLIC_QA_FILTER optionally limits named checks for targeted re-verification.
// External network and all writes are blocked; frontend forms never call the intake API.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const base=new URL(process.env.PUBLIC_QA_BASE_URL||'http://127.0.0.1:3100');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Public QA requires a loopback preview URL.');
const output=path.resolve(__dirname,'../../scratch/public-release');
const routes=['/','/lo-trinh','/lo-trinh/a','/lo-trinh/b','/lo-trinh/c','/lo-trinh/e','/lo-trinh/k','/lo-trinh/co-ban','/lo-trinh/nang-cao','/lo-trinh/hsgqg','/gia-su','/bai-dang','/bai-dang/tu-dong-code-dau-tien'];
const failures=[],errors=[],unexpectedWrites=[],assetFailures=[];
const filter=process.env.PUBLIC_QA_FILTER?new RegExp(process.env.PUBLIC_QA_FILTER):null;
let assertions=0,layouts=0;
function check(value,message){assertions++;if(!value)throw Error(message);}
async function run(name,fn){if(filter&&!filter.test(name))return;try{await fn();console.log('PASS '+name);}catch(e){failures.push({name,error:e.message});console.error('FAIL '+name+': '+e.message);}}
async function secure(context){
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
  if(['data:','blob:'].includes(url.protocol))return route.continue();
  if(url.origin!==base.origin)return route.abort('blockedbyclient');
  if(!['GET','HEAD'].includes(req.method())){unexpectedWrites.push({path:url.pathname,method:req.method()});return route.abort('blockedbyclient');}
  return route.continue();
 });
 context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base.origin)&&/\.(webp|avif|svg|woff2?|png|jpe?g)(?:\?|$)|\/_next\/image/.test(r.url()))assetFailures.push({url:r.url(),status:r.status()});});});
}
async function go(page,route){let r=await page.goto(new URL(route,base).href,{waitUntil:'networkidle'});if(!r)r=await page.reload({waitUntil:'networkidle'});check(r&&r.status()===200,route+' must return 200');await page.evaluate(()=>document.fonts.ready);}
async function choose(page,scope,name,value){
 await scope.locator('[data-select-name="'+name+'"]').click();
   await page.locator('[role="option"][data-option-value='+JSON.stringify(value)+']').click();
}
async function shot(page,name){
 const position=await page.evaluate(()=>scrollY),height=await page.evaluate(()=>document.documentElement.scrollHeight),step=page.viewportSize().height*.75;
 for(let y=0;y<height;y+=step){await page.evaluate(v=>scrollTo(0,v),y);await page.waitForTimeout(70);}
 await page.waitForFunction(()=>[...document.images].filter(i=>i.getBoundingClientRect().width&&i.getBoundingClientRect().height).every(i=>i.complete));await page.waitForTimeout(850);await page.evaluate(v=>scrollTo(0,v),position);await page.waitForTimeout(100);
 check(await page.evaluate(()=>[...document.images].filter(i=>i.getBoundingClientRect().width&&i.getBoundingClientRect().height).every(i=>i.naturalWidth>0)),'Screenshot visible images loaded');await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
 const detail={'home-light-1440':['.home-hero','home-desktop-hero'],'home-dark-375':['.home-team','home-mobile-dark-team'],'roadmap-light-1440':['.rm-hero','roadmap-desktop-hero'],'roadmap-dark-375':['.rm-choose','roadmap-mobile-dark-selector']}[name];
 if(detail){await page.locator(detail[0]).evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-95));await page.waitForTimeout(200);await page.screenshot({path:path.join(output,detail[1]+'.png')});await page.evaluate(v=>scrollTo(0,v),position);}
}
async function main(){
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true,channel:process.env.CSAT_BROWSER_CHANNEL||'msedge'});
 try{
 for(const motion of ['no-preference','reduce'])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:theme,reducedMotion:motion});await secure(context);await context.addInitScript(t=>{if(['http:','https:'].includes(location.protocol))localStorage.setItem('theme',t);},theme);const page=await context.newPage();
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});for(const route of routes)await run(`layout ${motion}/${theme}/${width}${route}`,async()=>{
   await go(page,route);layouts++;check(await page.locator('h1').count()===1,'Exactly one h1');check(await page.locator('h1').isVisible(),'h1 visible');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');check(await page.evaluate(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme),'Theme applied');check(await page.locator('.site-header').isVisible(),'Public navbar present');
   if(['/','/lo-trinh'].includes(route)){const before=await page.locator('main h1,main h2').allTextContents();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(180);await page.evaluate(()=>window.scrollTo(0,0));check(JSON.stringify(await page.locator('main h1,main h2').allTextContents())===JSON.stringify(before),'Scroll preserves original headings');if(motion==='no-preference'&&[375,1440].includes(width))await shot(page,`${route==='/'?'home':'roadmap'}-${theme}-${width}`);}
  });}await context.close();
 }
 await run('no-JS reading and contact fallback',async()=>{
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});await secure(c);const p=await c.newPage();
  for(const route of ['/','/lo-trinh','/lo-trinh/e','/lo-trinh/k']){await go(p,route);check(await p.locator('h1').isVisible(),'no-JS title');check((await p.locator('main').innerText()).length>300,'no-JS content');check(await p.locator('form input[name=phone]').count()===0,'No-JS intake has no submitting form');check(await p.locator('main a[href="https://zalo.me/0916246867"]').count()>0,'No-JS contact fallback');check(await p.locator('.nav-links a[href="/lo-trinh"]').isVisible(),'No-JS navigation expanded');}
  await shot(p,'no-js-k-375');await c.close();
 });
 const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',reducedMotion:'no-preference'});await secure(context);const page=await context.newPage();
 await run('320px and 200% reflow sanity',async()=>{
  for(const width of [320,720]){await page.setViewportSize({width,height:900});for(const route of ['/','/lo-trinh']){await go(page,route);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Narrow/reflow no overflow');check(await page.locator('h1').isVisible(),'Narrow/reflow title visible');const bounds=await page.locator('h1').boundingBox();check(bounds.width<=width&&bounds.x>=0,'Title within viewport');if(route==='/'){const award=await page.locator('.hero-award').boundingBox(),name=await page.locator('.hero-name').boundingBox();check(award.x>=0&&award.x+award.width<=width+1,'Hero award within narrow viewport');check(award.y+award.height<=name.y+1||name.y+name.height<=award.y+1||award.x+award.width<=name.x+1||name.x+name.width<=award.x+1,'Award and name do not overlap');}await shot(page,`${route==='/'?'home':'roadmap'}-${width}-reflow`);}}
 });
 await run('navbar collapse, keyboard and dock mutual exclusion',async()=>{
  for(const width of [375,768,1280,1281,1440]){await page.setViewportSize({width,height:900});await go(page,'/');const menu=page.locator('.menu-button'),dock=page.locator('.dock-toggle');check(await menu.isVisible()===(width<=1280),'Collapse at 1280px');
   if(width<=1280){await menu.focus();await page.keyboard.press('Enter');check(await menu.getAttribute('aria-expanded')==='true','Keyboard opens menu');check(await page.locator('.nav-links a').first().evaluate(e=>e===document.activeElement),'Menu moves focus');await page.keyboard.press('Escape');check(await menu.getAttribute('aria-expanded')==='false','Escape closes menu');check(await menu.evaluate(e=>e===document.activeElement),'Menu focus restored');}
   await dock.focus();await page.keyboard.press('Space');check(await dock.getAttribute('aria-expanded')==='true','Keyboard opens dock');check(await page.locator('.dock-panel a').first().evaluate(e=>e===document.activeElement),'Dock moves focus');if(width<=1280){await menu.click();check(await dock.getAttribute('aria-expanded')==='false','Menu closes dock');await dock.click();check(await menu.getAttribute('aria-expanded')==='false','Dock closes menu');}await page.keyboard.press('Escape');check(await dock.getAttribute('aria-expanded')==='false','Escape closes dock');check(await dock.evaluate(e=>e===document.activeElement),'Dock focus restored');
  }
 });
 await run('selector submit, history and enum sanitization',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/lo-trinh');const form=page.locator('.rm-selector-form'),original=page.url(),heading=await page.locator('.rm-result h3').innerText();
  await choose(page,form,'level','thcs');await choose(page,form,'goal','national');await choose(page,form,'background','practice');check(page.url()===original,'Draft inputs do not mutate URL');check(await page.locator('.rm-result h3').innerText()===heading,'Draft does not change committed result');
  await form.getByRole('button',{name:'Xem hướng học'}).click();await page.waitForFunction(()=>new URLSearchParams(location.search).get('show')==='1');check(new URL(page.url()).searchParams.get('background')==='practice','Background committed');check((await page.locator('.rm-result').innerText()).includes('PreVOI'),'National suggests PreVOI');check(await page.locator('.rm-result a[href^="/lo-trinh/e"]').count()===1,'E destination');
  await page.locator('.rm-result a[href^="/lo-trinh/e"]').click();await page.waitForURL('**/lo-trinh/e?**');await page.goBack({waitUntil:'networkidle'});check(await page.locator('.rm-selector-form [name=background]').inputValue()==='practice','Back restores background');check((await page.locator('.rm-result').innerText()).includes('PreVOI'),'Back restores result');
  await go(page,'/lo-trinh?level=private-name&goal=untrusted&background=0912345678&course=X&email=private%40example.test');await choose(page,page.locator('.rm-selector-form'),'level','primary');await page.locator('.rm-selector-form button[type=submit]').click();check([...new URL(page.url()).searchParams.keys()].every(k=>['level','goal','background','course','show'].includes(k)),'Unknown query fields dropped');check(!page.url().includes('private')&&!page.url().includes('0912345678'),'Free text not propagated');
 });
 await run('glyph DOM text, multicolor overlay and reduced motion',async()=>{
  await go(page,'/lo-trinh');const h=page.locator('[data-glyph-hover]').first(),before=await h.textContent(),box=await h.boundingBox();await page.mouse.move(box.x+30,box.y+25);await page.waitForTimeout(60);const units=page.locator('.csat-glyph-unit');check(await units.count()>0&&await units.count()<=7,'One to seven graphemes');check(await h.textContent()===before,'Original DOM text unchanged');check((await units.evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).color))])).length>=2,'Multiple colors');await page.waitForTimeout(500);check(await units.count()===0,'Glyph ends promptly');
  await page.evaluate(()=>{const h=document.querySelector('[data-glyph-hover]'),r=document.createRange();r.selectNodeContents(h);getSelection().removeAllRanges();getSelection().addRange(r);});check((await page.evaluate(()=>getSelection().toString())).replace(/\s/g,'').toLocaleUpperCase('vi')===before.replace(/\s/g,'').toLocaleUpperCase('vi'),'Selected text remains original');await page.evaluate(()=>getSelection().removeAllRanges());await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(box.x+50,box.y+25);await page.waitForTimeout(60);check(await units.count()===0,'Reduced motion suppresses glyph');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('approved curriculum preserved on public course routes',async()=>{
  const curriculum=require('../../lib/learning-curriculum-20260922.json');
  for(const [slug,program,part,count] of [['a','basic','A',9],['b','basic','B',15],['c','advanced',null,19],['co-ban','basic',null,24]]){
   await go(page,'/lo-trinh/'+slug);const stages=curriculum.find(t=>t.program===program).stages.filter(s=>!part||s.part===part),lessons=stages.flatMap(s=>s.lessons);
   check(lessons.length===count,'Approved source count '+slug);check(await page.locator('.rm-stage-body li').count()===count,'Rendered topic count '+slug);check(JSON.stringify(await page.locator('.rm-stage-body li h3').allTextContents())===JSON.stringify(lessons.map(l=>l.title)),'Approved titles/order '+slug);
   await page.locator('.rm-curriculum-stage').last().locator('summary').click();check(await page.locator('.rm-curriculum-stage').last().locator('.rm-stage-body').isVisible(),'Keyboard/native details reveal content');
  }
  for(const slug of ['e','k']){await go(page,'/lo-trinh/'+slug);check(await page.locator('.rm-stage-body li').count()===0,'No invented curriculum '+slug);check(!(await page.locator('.rm-course-facts').innerText()).includes('99.000'),'No invented E/K price');}
 });
 await run('home values bulb, team placement and keyboard panels',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/');check(await page.locator('.team-profile').count()===3,'Three supplied tutor cards');check(await page.evaluate(()=>{const a=document.querySelector('.home-team'),b=document.querySelector('.home-values'),c=document.querySelector('.home-oj');return !!(b.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(a.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING); }),'Team after values and before CSATOJ');
  const bulb=page.locator('.values-bulb');await bulb.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.values-bulb').classList.contains('is-revealed'));await page.waitForTimeout(800);check(await bulb.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0&&Number(getComputedStyle(e).opacity)>.95),'Bulb artwork finishes visible');
  const button=page.locator('.value-button').nth(2);await button.focus();await page.keyboard.press('Enter');await button.focus();await page.keyboard.press('Escape');check(await button.getAttribute('aria-expanded')==='false','Escape closes value panel');await page.keyboard.press('Enter');check(await button.getAttribute('aria-expanded')==='true','Keyboard reopens value panel');const panel=page.locator('#'+await button.getAttribute('aria-controls'));check(await panel.isVisible(),'Value panel readable');
  check(await page.locator('.lesson-step').count()===6,'Six learning steps');check(await page.locator('.home-courses .course-row').count()===3,'Three A/B/C rows');
 });
 await run('home narrow bulb does not cover eyebrow text',async()=>{
  for(const theme of ['light','dark']){await page.emulateMedia({colorScheme:theme});for(const width of [320,375]){await page.setViewportSize({width,height:900});await go(page,'/');await page.getByRole('button',{name:'Chuyển giao diện sáng/tối'}).evaluate((e,t)=>{if(e.getAttribute('aria-pressed')!==String(t==='dark'))e.click();},theme);await page.locator('.home-values').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-130));await page.waitForTimeout(900);
   const overlap=await page.evaluate(()=>{const bulb=document.querySelector('.values-bulb img').getBoundingClientRect(),text=document.querySelector('.values-heading>.eyebrow'),range=document.createRange();range.selectNodeContents(text);return [...range.getClientRects()].some(r=>r.left<bulb.right&&r.right>bulb.left&&r.top<bulb.bottom&&r.bottom>bulb.top);});check(!overlap,'Bulb clears text at '+theme+'/'+width);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Narrow home no overflow');await page.screenshot({path:path.join(output,`home-values-${theme}-${width}-viewport.png`)});
  }}await page.emulateMedia({colorScheme:'light'});
 });
 await run('frontend forms validate review edit copy without requests',async()=>{
  const requests=[];page.on('request',r=>{if(r.url().includes('/api/consultations'))requests.push(r.method());});
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}}));
  for(const route of ['/','/lo-trinh?course=C&level=thcs&goal=province&background=practice&show=1#tu-van']){
   await page.setViewportSize({width:375,height:900});await go(page,route);const form=page.locator('.public-intake form');await form.waitFor();
   await form.locator('[data-select-name=course]').click();check(await page.getByRole('option').count()===6,'Five courses plus advice');await page.keyboard.press('Escape');
   await form.locator('[name=name]').fill('Phụ huynh kiểm thử');await form.locator('[name=phone]').fill('123');await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();check(await form.getByRole('alert').isVisible(),'Invalid phone blocked');check(await page.locator('.intake-review').count()===0,'Invalid form does not advance');
   await form.locator('[name=phone]').fill('0912345678');await form.locator('[name=email]').fill('test@example.test');await form.locator('[name=message]').fill('Muốn tìm tài liệu và luyện thêm thuật toán.');await choose(page,form,'course','C — Thi đấu nâng cao');
   await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();const review=page.locator('.intake-review'),summary=review.locator('textarea');await review.waitFor();check((await summary.inputValue()).includes('C — Thi đấu nâng cao'),'Chosen course preserved');check((await review.innerText()).includes('Thông tin chưa được gửi'),'Honest unsent state');check(await review.locator('h3').evaluate(e=>e===document.activeElement),'Review gets focus');
   await review.getByRole('button',{name:'Sao chép nội dung'}).click();await page.waitForFunction(()=>!!window.__copied);check(await page.evaluate(()=>window.__copied)===(await summary.inputValue()),'Clipboard matches reviewed text');
   if(route!=='/')check((await summary.inputValue()).includes('Ngữ cảnh tìm hiểu:'),'Selector context carried');
   await review.getByRole('button',{name:'Chỉnh lại'}).click();check(await form.locator('[name=name]').inputValue()==='Phụ huynh kiểm thử','Edit retains input');check(await form.getByRole('button',{name:'Kiểm tra thông tin'}).evaluate(e=>e===document.activeElement),'Edit restores focus');
   await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied');}}}));await review.getByRole('button',{name:'Sao chép nội dung'}).click();await review.getByRole('status').filter({hasText:'thủ công'}).waitFor();check(await summary.evaluate(e=>e.selectionEnd===e.value.length),'Clipboard failure selects text');
   check(!page.url().includes('0912345678'),'No PII in URL');check(await page.evaluate(()=>!Object.values(localStorage).join('').includes('0912345678')&&!Object.values(sessionStorage).join('').includes('0912345678')),'No persistent draft');
   await page.reload({waitUntil:'networkidle'});await page.locator('.public-intake form').waitFor();check(await page.locator('.public-intake [name=name]').inputValue()==='','Reload clears draft');
  }
  check(requests.length===0,'No intake status or send requests');
 });
 await run('taller lesson card and small icons',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/');await page.locator('.lesson-stage').scrollIntoViewIfNeeded();check((await page.locator('.lesson-stage-art').boundingBox()).height>350,'Art area taller');check(await page.locator('.lesson-satellite').count()===3,'Three small code icons');await page.locator('.lesson-controls button').nth(3).click();await page.waitForTimeout(800);check((await page.locator('.lesson-stage-caption').innerText()).includes('Tự tay'),'Step navigation still works');await page.screenshot({path:path.join(output,'lesson-taller-desktop.png')});
  await page.setViewportSize({width:1024,height:650});await go(page,'/');await page.locator('.lesson-stage').scrollIntoViewIfNeeded();check((await page.locator('.lesson-stage').boundingBox()).height<550,'Short viewport card stays usable');
 });
 await context.close();check(errors.length===0,'No JS errors: '+errors.join('; '));check(assetFailures.length===0,'No missing assets: '+JSON.stringify(assetFailures));check(unexpectedWrites.length===0,'No unmocked writes: '+JSON.stringify(unexpectedWrites));
 }finally{await browser.close();await fs.writeFile(path.join(output,filter?'qa-targeted-report.json':'qa-report.json'),JSON.stringify({base:base.origin,browser:process.env.CSAT_BROWSER_CHANNEL||'msedge',filter:filter?.source||null,layouts,assertions,failures,errors,assetFailures,unexpectedWrites},null,2));}
 console.log(JSON.stringify({passed:failures.length===0,layouts,assertions,failures,report:path.join(output,filter?'qa-targeted-report.json':'qa-report.json')}));if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
