// QA against an isolated local public preview, never a deployed site.
// Set PLAYWRIGHT_MODULE for an installed module, PUBLIC_QA_BASE_URL for localhost,
// and CSAT_BROWSER_CHANNEL for an installed Chromium channel (default msedge).
// PUBLIC_QA_FILTER optionally limits named checks for targeted re-verification.
// External network and all writes are blocked; frontend forms never call the intake API.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const base=new URL(process.env.PUBLIC_QA_BASE_URL||'http://127.0.0.1:3100');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Public QA requires a loopback preview URL.');
const output=path.resolve(__dirname,'../../scratch/public-release');
const routes=['/dang-ky-hoc','/','/hoc-lieu-mien-phi','/lo-trinh','/lo-trinh/a','/lo-trinh/b','/lo-trinh/c','/lo-trinh/e','/lo-trinh/k','/lo-trinh/co-ban','/lo-trinh/nang-cao','/thanh-tich','/login','/gia-su','/bai-dang','/bai-dang/tu-dong-code-dau-tien'];
const failures=[],errors=[],unexpectedWrites=[],assetFailures=[];
const filter=process.env.PUBLIC_QA_FILTER?new RegExp(process.env.PUBLIC_QA_FILTER):null;
let assertions=0,layouts=0,checksRun=0;
function check(value,message){assertions++;if(!value)throw Error(message);}
async function run(name,fn){if(filter&&!filter.test(name))return;checksRun++;try{await fn();console.log('PASS '+name);}catch(e){failures.push({name,error:e.message});console.error('FAIL '+name+': '+e.message);}}
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
  for(const route of ['/dang-ky-hoc','/','/hoc-lieu-mien-phi','/lo-trinh','/lo-trinh/e','/lo-trinh/k']){await go(p,route);check(await p.locator('h1').isVisible(),'no-JS title');check((await p.locator('main').innerText()).length>300,'no-JS content');check(await p.locator('form input[name=phone]').count()===0,'No-JS intake has no submitting form');check(await p.locator('a[href="https://zalo.me/0916246867"]').count()>0,'No-JS contact fallback');await p.locator('.nav-roadmap summary').click();check(await p.locator('.nav-links a[href="/lo-trinh"]').isVisible(),'No-JS native disclosure expands navigation');check(await p.locator('.nav-roadmap-panel a').count()===6,'No-JS overview and five courses');}
  await shot(p,'no-js-k-375');await c.close();
 });
 const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light',reducedMotion:'no-preference'});await secure(context);const page=await context.newPage();
 await run('320px and 200% reflow sanity',async()=>{
  for(const width of [320,720]){await page.setViewportSize({width,height:900});for(const route of ['/','/lo-trinh','/dang-ky-hoc']){await go(page,route);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Narrow/reflow no overflow');check(await page.locator('h1').isVisible(),'Narrow/reflow title visible');const bounds=await page.locator('h1').boundingBox();check(bounds.width<=width&&bounds.x>=0,'Title within viewport');if(route==='/'){const award=await page.locator('.hero-award').boundingBox(),name=await page.locator('.hero-name').boundingBox();check(award.x>=0&&award.x+award.width<=width+1,'Hero award within narrow viewport');check(award.y+award.height<=name.y+1||name.y+name.height<=award.y+1||award.x+award.width<=name.x+1||name.x+name.width<=award.x+1,'Award and name do not overlap');}await shot(page,`${route==='/'?'home':route==='/dang-ky-hoc'?'enrollment':'roadmap'}-${width}-reflow`);}}
 });
 await run('navbar collapse, keyboard and dock mutual exclusion',async()=>{
  for(const width of [375,768,1280,1281,1440]){await page.setViewportSize({width,height:900});await go(page,'/');const menu=page.locator('.menu-button'),dock=page.locator('.dock-toggle');check(await menu.isVisible()===(width<=1280),'Collapse at 1280px');
   if(width<=1280){await menu.focus();await page.keyboard.press('Enter');check(await menu.getAttribute('aria-expanded')==='true','Keyboard opens menu');check(await page.locator('.nav-links a').first().evaluate(e=>e===document.activeElement),'Menu moves focus');await page.keyboard.press('Escape');check(await menu.getAttribute('aria-expanded')==='false','Escape closes menu');check(await menu.evaluate(e=>e===document.activeElement),'Menu focus restored');}
   await dock.focus();await page.keyboard.press('Space');check(await dock.getAttribute('aria-expanded')==='true','Keyboard opens dock');check(await page.locator('.dock-panel a').first().evaluate(e=>e===document.activeElement),'Dock moves focus');if(width<=1280){await menu.click();check(await dock.getAttribute('aria-expanded')==='false','Menu closes dock');await dock.click();check(await menu.getAttribute('aria-expanded')==='false','Dock closes menu');}await page.keyboard.press('Escape');check(await dock.getAttribute('aria-expanded')==='false','Escape closes dock');check(await dock.evaluate(e=>e===document.activeElement),'Dock focus restored');
  }
 });
 await run('roadmap disclosure hover, keyboard, touch and navigation',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/');
  const details=page.locator('.nav-roadmap'),trigger=details.locator('summary'),panel=details.locator('.nav-roadmap-panel');
  await trigger.hover();check(await panel.isVisible(),'Hover opens course dropdown');
  await panel.locator('a').last().hover();check(await panel.isVisible(),'Pointer can enter panel');
  await page.locator('h1').hover();check(!await panel.isVisible(),'Leaving unfocused dropdown dismisses');
  await trigger.focus();await page.keyboard.press('Enter');check(await panel.isVisible(),'Keyboard opens disclosure');
  await page.keyboard.press('Tab');check(await panel.locator('a').first().evaluate(e=>e===document.activeElement),'Tab enters overview');
  await page.keyboard.press('Escape');check(!await panel.isVisible(),'Escape closes dropdown');check(await trigger.evaluate(e=>e===document.activeElement),'Escape restores summary focus');
  await page.keyboard.press('Space');check(await panel.isVisible(),'Space reopens disclosure');
  await panel.locator('a[href="/lo-trinh/e"]').click();await page.waitForURL(url=>url.pathname==='/lo-trinh/e');
  check(!await page.locator('.nav-roadmap-panel').isVisible(),'Navigation resets disclosure');
  check((await page.locator('main').innerText()).includes('Chủ lực'),'Dropdown E uses current catalog');
  const c=await browser.newContext({viewport:{width:375,height:900},hasTouch:true,isMobile:true});await secure(c);const p=await c.newPage();
  await go(p,'/');await p.locator('.menu-button').tap();await p.locator('.nav-roadmap summary').tap();
  check(await p.locator('.nav-roadmap-panel').isVisible(),'Touch opens course dropdown');
  await p.locator('.nav-roadmap-panel a[href="/lo-trinh/k"]').tap();await p.waitForURL(url=>url.pathname==='/lo-trinh/k');
  check(await p.locator('.menu-button').getAttribute('aria-expanded')==='false','Touch navigation closes mobile menu');
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile dropdown creates no overflow');await c.close();
 });
 await run('selector submit, history and enum sanitization',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/lo-trinh');const form=page.locator('.rm-selector-form'),original=page.url(),heading=await page.locator('.rm-result h3').innerText();
  await choose(page,form,'level','thcs');await choose(page,form,'goal','province');await choose(page,form,'background','practice');check(page.url()===original,'Draft inputs do not mutate URL');check(await page.locator('.rm-result h3').innerText()===heading,'Draft does not change committed result');
  await form.getByRole('button',{name:'Xem hướng học'}).click();await page.waitForFunction(()=>new URLSearchParams(location.search).get('show')==='1');check(new URL(page.url()).searchParams.get('background')==='practice','Background committed');check(await page.locator('.rm-result a[href^="/lo-trinh/c"]').count()===1,'Practice background suggests C');check(await page.locator('.rm-result a[href^="/lo-trinh/e"]').count()===0,'Selector does not imply E admission');
  await page.goto(new URL('/lo-trinh/c',base).href,{waitUntil:'networkidle'});await page.goBack({waitUntil:'networkidle'});check(await page.locator('.rm-selector-form [name=background]').inputValue()==='practice','Back restores background');check(await page.locator('.rm-result a[href^="/lo-trinh/c"]').count()===1,'Back restores result');
  await go(page,'/lo-trinh?level=private-name&goal=untrusted&background=0912345678&course=X&email=private%40example.test');await choose(page,page.locator('.rm-selector-form'),'level','primary');await page.locator('.rm-selector-form button[type=submit]').click();check([...new URL(page.url()).searchParams.keys()].every(k=>['level','goal','background','course','show'].includes(k)),'Unknown query fields dropped');check(!page.url().includes('private')&&!page.url().includes('0912345678'),'Free text not propagated');
 });
 await run('new course chapters and legacy enrollment links',async()=>{
  await go(page,'/lo-trinh');
  for(const code of ['a','b','c','e','k'])check(await page.locator('#lop-'+code).count()===1,'Independent course chapter '+code);
  check(!(await page.locator('main').innerText()).includes('MỞ THÊM HƯỚNG ĐI'),'Old combined chapter removed');
  check((await page.locator('#lop-e').innerText()).includes('3–4 học sinh'),'Approved E cohort');
  check((await page.locator('#lop-e').innerText()).includes('2 giờ'),'Approved E duration');
  for(const alias of ['hsgqg','voi','prevoi']){await go(page,'/lo-trinh/'+alias);check(new URL(page.url()).pathname==='/dang-ky-hoc','Legacy course route leads to enrollment');check(!new URL(page.url()).searchParams.has('goal'),'Removed goal is not propagated');}
  await go(page,'/thanh-tich');check(await page.locator('.awards-student-card').count()>=15,'Awards contain verified editorial cards');check(await page.locator('.nav-links a[href="/thanh-tich"]').count()===1,'Awards menu is internal');
 });
 await run('achievements responsive editorial cards and static media',async()=>{
  const requests=[];
  for(const theme of ['light','dark'])for(const motion of ['no-preference','reduce']){
   const c=await browser.newContext({viewport:{width:1440,height:900},colorScheme:theme,reducedMotion:motion});await secure(c);
   await c.addInitScript(t=>{if(['http:','https:'].includes(location.protocol))localStorage.setItem('theme',t);},theme);const p=await c.newPage();
   p.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')||r.url().includes('supabase'))requests.push(r.url());});
   for(const width of [320,375,600,768,800,801,900,901,1024,1050,1051,1100,1101,1200,1201,1280,1439,1440,1600,1920]){
    await p.setViewportSize({width,height:900});await go(p,'/thanh-tich');layouts++;
    const cards=p.locator('.awards-student-card');check(await cards.count()>=15,'Verified achievement cards present');
    for(let y=0;y<await p.evaluate(()=>document.documentElement.scrollHeight);y+=700){await p.evaluate(v=>scrollTo(0,v),y);await p.waitForTimeout(90);}
    await p.waitForFunction(()=>[...document.querySelectorAll('.awards-student-photo img')].every(i=>i.complete&&i.naturalWidth>0));
    await p.waitForFunction(()=>[...document.querySelectorAll('.awards-reveal')].every(e=>e.classList.contains('is-revealed')&&!e.classList.contains('reveal-play')));
    check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Achievement page reflows without overflow');
    check(await p.locator('h1').count()===1,'One page heading');
    check(await p.locator('#awards-students-title').innerText()==='BẢNG VÀNG VINH DANH','Honor roll has the approved heading');
    check(await p.locator('.awards-hero a[href="#hoc-sinh"]').count()===0,'Hero has no removed student-anchor CTA');
    check(await p.locator('.awards-hero-copy').evaluate(e=>getComputedStyle(e).textAlign==='center'),'Hero copy is centered');
    check(await p.locator('.awards-hero').evaluate(e=>{
     const copy=e.querySelector('.awards-hero-copy').getBoundingClientRect(),left=e.querySelector('.awards-art-medal').getBoundingClientRect(),right=e.querySelector('.awards-art-terminal').getBoundingClientRect();
     const within=[left,right,copy].every(r=>r.left>=0&&r.right<=innerWidth+1&&r.width>0&&r.height>0);
     return within&&(innerWidth>800?left.right<=copy.left+1&&copy.right<=right.left+1:left.top>=copy.bottom-1&&right.top>=copy.bottom-1&&left.right<=right.left+1);
    }),'Both decorative arts fit beside or below copy without overlap');
    check(await p.locator('.awards-art-scene').evaluateAll(es=>es.every(e=>Math.abs(Number(getComputedStyle(e).transform.match(/matrix\(([^,]+)/)[1])-1.1)<.001)),'Hero art compositions are enlarged by ten percent');
    if(width>800)check(await p.locator('.awards-hero').evaluate(e=>{
     const h=e.getBoundingClientRect(),t=e.querySelector('.awards-hero-copy').getBoundingClientRect(),a=e.querySelector('.awards-art-medal').getBoundingClientRect(),b=e.querySelector('.awards-art-terminal').getBoundingClientRect();
     return Math.abs(a.left+a.width/2-(h.left+t.left)/2)<1&&Math.abs(b.left+b.width/2-(t.right+h.right)/2)<1;
    }),'Desktop art centers between page edges and text');
    check(await p.locator('.dock-materials-notice').count()===0,'Learning-materials invitation does not cover achievement cards');
    check(await cards.evaluateAll(es=>es.every(e=>{
     const photo=e.querySelector('figure').getBoundingClientRect(),data=e.querySelector('.awards-student-data').getBoundingClientRect();
     return Math.abs(photo.width-photo.height)<1&&Math.abs(photo.top+photo.height/2-data.top-data.height/2)<1&&Math.abs(photo.right-data.left)<1&&data.right<=innerWidth+1&&photo.left>=0;
    })),'Square photo frame is centered beside readable information without clipping');
    check(await cards.evaluateAll(es=>es.every(e=>[...e.querySelectorAll('h3,li,.awards-student-school p')].every(t=>t.scrollWidth<=t.clientWidth+1&&t.scrollHeight<=t.clientHeight+1))),'Real names, achievements and schools fit');
    check(await p.locator('.awards-student-photo img').evaluateAll(es=>es.every(e=>getComputedStyle(e).objectFit==='contain'&&e.loading==='lazy'&&e.getAttribute('src').includes('.webp')&&e.width>0&&e.height>0)),'Full posters use lazy optimized WebP');
    check(await cards.evaluateAll(es=>es.every(e=>e.querySelector('h3').textContent.trim()&&!/\[|\]|placeholder/i.test(e.textContent)&&e.querySelectorAll('.awards-student-award li').length)),'No invented placeholder content');
    check(await p.locator('.awards-student-heading').evaluateAll(es=>{
     const lum=s=>{const v=s.match(/[\d.]+/g).slice(0,3).map(n=>{n=Number(n)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
     return es.every(e=>{const s=getComputedStyle(e),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5;});
    }),'Name bands meet 4.5:1 text contrast');
    const columns=await p.locator('.awards-student-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    check(columns===(width>=1440?3:width>900?2:1),'Three wide-screen, two narrow-screen or one mobile card per row');
    if(width>1100)check(await p.locator('.awards-students').evaluate(e=>{const r=e.getBoundingClientRect();return r.width>=Math.min(1760,innerWidth-24)-1;}),'Desktop uses the widened page space');
    check(await p.locator('.awards-student-label').evaluateAll(es=>es.every(e=>e.textContent.trim()==='HỌC SINH')),'Student labels have no serial numbers');
    check(await p.locator('.awards-card-reveal').evaluateAll(es=>es.every(e=>e.dataset.revealVariant==='rise')),'All cards slide upward on entry');
    if(motion==='reduce')check(await p.locator('.awards-reveal').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).animationName==='none')),'Reduced motion is fully readable');
    if(motion==='no-preference'&&[375,1440].includes(width)){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(output,`achievements-${theme}-${width}.png`),fullPage:true});}
   }
   await c.close();
  }
  check(requests.length===0,'Static achievements make no API/database requests');
 });
 await run('achievements reveal no-JS and client navigation',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/thanh-tich');
  const last=page.locator('.awards-card-reveal').last();check(await last.evaluate(e=>e.classList.contains('reveal-ready')),'Offscreen cards wait for entry');
  await last.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.awards-card-reveal:last-child').classList.contains('is-revealed'));
  await page.waitForTimeout(1100);check(await last.evaluate(e=>getComputedStyle(e).opacity==='1'&&!e.classList.contains('reveal-play')),'Reveal finishes readable');
  await page.evaluate(()=>scrollTo(0,0));await last.scrollIntoViewIfNeeded();check(await last.evaluate(e=>!e.classList.contains('reveal-play')),'Reveal does not repeat');
  await page.evaluate(()=>scrollTo(0,0));await page.emulateMedia({reducedMotion:'no-preference'});
  const art=page.locator('.awards-art-medal'),frame=art.locator('.awards-art-square');
  const rest=await frame.evaluate(e=>getComputedStyle(e).transform);await art.hover();await page.waitForTimeout(320);
  check(await frame.evaluate((e,b)=>getComputedStyle(e).transform!==b,rest),'Decorative art responds to hover');
  await page.mouse.move(0,0);await page.waitForTimeout(320);
  check(await frame.evaluate((e,b)=>getComputedStyle(e).transform===b,rest),'Art returns to its resting layout');
  await page.emulateMedia({reducedMotion:'reduce'});await art.hover();await page.waitForTimeout(320);
  check(await frame.evaluate((e,b)=>getComputedStyle(e).transform===b&&getComputedStyle(e).transitionDuration==='0s',rest),'Reduced motion suppresses decorative hover movement');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);
  for(const width of [320,1440]){
   const c=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});await secure(c);const p=await c.newPage();await go(p,'/thanh-tich');
   check(await p.locator('.awards-student-card').count()>=15,'No-JS includes full static catalog');
   check(await p.locator('.awards-card-reveal').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),'No-JS cards are visible');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No-JS reflow');await c.close();
  }
  await go(page,'/gia-su');await page.locator('.nav-links a[href="/thanh-tich"]').click();await page.waitForURL(url=>url.pathname==='/thanh-tich');
  check(await page.locator('.awards-student-card').count()>=15,'Client navigation renders catalog');
  await page.goBack({waitUntil:'networkidle'});await page.goForward({waitUntil:'networkidle'});
  const first=page.locator('.awards-student-card').first();await first.scrollIntoViewIfNeeded();await page.waitForTimeout(1100);
  check(await first.evaluate(e=>Math.abs(e.querySelector('figure').getBoundingClientRect().right-e.querySelector('.awards-student-data').getBoundingClientRect().left)<1),'Back/forward preserves attached layout');
 });
 await run('separate public A and B courses',async()=>{
  for(const route of ['/lo-trinh','/dang-ky-hoc','/lo-trinh/a','/lo-trinh/b','/','/lo-trinh/c','/lo-trinh/e']){
   await go(page,route);check(!/A\s*\+\s*B/.test(await page.locator('main').innerText()),'No combined public course '+route);
   check(!(await page.locator('main').innerText()).includes('C+D'),'Advanced public name is C '+route);
   check(await page.locator('a[href*="/lo-trinh/co-ban"],a[href*="/lo-trinh/basic"]').count()===0,'No combined route links '+route);
  }
  for(const alias of ['co-ban','basic']){await go(page,'/lo-trinh/'+alias);check(new URL(page.url()).pathname==='/lo-trinh','Old combined route redirects to overview');}
  for(const [background,codes]of [['new',['A']],['syntax',['A','B']],['practice',['B','C']],['unsure',['A','B','C']]]){
   await go(page,'/lo-trinh?background='+background+'&show=1');await page.waitForFunction(()=>document.querySelector('.rm-result h3').textContent!=='Bạn muốn bắt đầu từ đâu?');
   check(JSON.stringify(await page.locator('.rm-result-links b').allTextContents())===JSON.stringify(codes),'Separate course suggestions '+background);
  }
  await go(page,'/lo-trinh?course=AB&background=new&level=thcs');await page.locator('.rm-selector-form button[type=submit]').click();await page.waitForFunction(()=>new URLSearchParams(location.search).get('show')==='1');
  check(!new URL(page.url()).searchParams.has('course'),'Old AB query is not propagated');
  const sitemap=await page.request.get(new URL('/sitemap.xml',base).href);check(sitemap.status()===200,'Sitemap loads');const xml=await sitemap.text();
  check(!xml.includes('/lo-trinh/co-ban')&&!xml.includes('/lo-trinh/basic'),'Combined route removed from sitemap');
  for(const code of ['a','b'])check(xml.includes('/lo-trinh/'+code+'</loc>'),'Separate course in sitemap '+code);
  await go(page,'/lo-trinh/c');check((await page.locator('.rm-stage-index').allTextContents()).every(text=>text.trim().endsWith('/ C')),'Every advanced stage uses public name C');
 });
 await run('roadmap client navigation and CSS load order',async()=>{
  for(const theme of ['light','dark'])for(const width of [375,1440])for(const source of ['/','/dang-ky-hoc','/lo-trinh/e','/gia-su']){
   const c=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});await secure(c);
   try{
    await c.addInitScript(t=>{if(['http:','https:'].includes(location.protocol))localStorage.setItem('theme',t);},theme);const p=await c.newPage();await go(p,source);
    await p.evaluate(()=>window.__csatNavigationProbe='client');
    await p.locator('.footer-nav a[href="/lo-trinh"]').click();await p.waitForURL('**/lo-trinh');await p.waitForLoadState('networkidle');
    check(await p.evaluate(()=>window.__csatNavigationProbe)==='client','Roadmap reached through client navigation '+source);
    // Replay the shared trigger rules last: route chunks may arrive in either order.
    await p.evaluate(()=>{
     const rules=Array.from(document.styleSheets).flatMap(s=>{try{return Array.from(s.cssRules);}catch{return[];}}).filter(r=>r.selectorText?.startsWith('.csat-public .course-poster-trigger'));
     const style=document.createElement('style');style.textContent=rules.map(r=>r.cssText).join('\n');document.head.append(style);
    });
    for(const code of ['a','b','c','e','k'])check(await p.locator('#lop-'+code).evaluate(e=>{
     const trigger=e.querySelector('.rm-background-poster'),band=e.querySelector('.rm-description-band'),r=trigger.getBoundingClientRect(),b=band.getBoundingClientRect();
     return getComputedStyle(trigger).position==='absolute'&&trigger.offsetParent===band&&Math.abs(r.top-b.top)<=2&&Math.abs(r.bottom-b.bottom)<=2;
    }),'Image stays in background regardless of CSS order '+theme+'/'+width+source+'/'+code);
    const e=p.locator('#lop-e');check(await e.evaluate(e=>{
     const image=e.querySelector('.rm-background-poster'),band=e.querySelector('.rm-description-band'),r=image.getBoundingClientRect(),b=band.getBoundingClientRect(),s=getComputedStyle(image.querySelector('img'));
     const overlay=getComputedStyle(image,'::after').backgroundImage;
     return Math.abs((r.left+r.right)-(b.left+b.right))<2&&s.objectPosition==='50% 75%'&&Math.abs(parseFloat(s.height)/r.height-1)<.01&&overlay.includes('gradient')&&/(?:rgba\(0,\s*0,\s*0,\s*0\)|transparent) 50%/.test(overlay)&&/(?:rgba\(0,\s*0,\s*0,\s*0\)|transparent) 100%/.test(overlay);
    }),'E centered 75-percent crop has a transparent lower-half overlay '+theme+'/'+width);
    await p.goBack({waitUntil:'networkidle'});check(new URL(p.url()).pathname===source,'Back restores source '+source);
    await p.goForward({waitUntil:'networkidle'});check(await p.locator('.rm-background-poster').evaluateAll(es=>es.every(e=>getComputedStyle(e).position==='absolute')),'Forward preserves background layout');
    check(await p.locator('.rm-background-poster').evaluateAll(es=>es.every(e=>e.tagName==='DIV'&&!e.hasAttribute('tabindex')&&!e.hasAttribute('href'))),'Overview images remain non-interactive after client navigation');
    check(await p.locator('.course-poster-lightbox').count()===0,'Overview mounts no image dialog');
   }finally{await c.close();}
  }
 });
 await run('roadmap approved hashtags, centered E and simple entrances',async()=>{
  const approved={A:['NhậpMônC++','Lớp5Đến7','NềnTảngChuyênTin'],B:['ThiĐấuCơBản','SốHọcVàTìmKiếm','HSGCấpPhường'],C:['ThuậtToánNângCao','HSGCấpTỉnh','ChuyênTin'],E:[],K:[]};
  for(const theme of ['light','dark'])for(const width of [320,375,768,1440]){
   const c=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});await secure(c);
   try{
    await c.addInitScript(t=>{if(['http:','https:'].includes(location.protocol))localStorage.setItem('theme',t);},theme);
    const p=await c.newPage();await go(p,'/lo-trinh');
    for(const code of ['a','b','c','e','k']){
     const section=p.locator('#lop-'+code);
     if(code==='e'||code==='k'){check(await section.locator('.rm-course-hashtags').count()===0,'No hashtags '+theme+'/'+width+'/'+code);continue;}
     check(JSON.stringify(await section.locator('.rm-course-hashtags li').allTextContents())===JSON.stringify(approved[code.toUpperCase()].map(t=>'#'+t)),'Approved hashtags '+theme+'/'+width+'/'+code);
     check(await section.evaluate(e=>{const tags=e.querySelector('.rm-course-hashtags').getBoundingClientRect(),band=e.querySelector('.rm-description-band').getBoundingClientRect(),heading=e.querySelector('h2').getBoundingClientRect();return tags.left>=band.left&&tags.right<=band.right+1&&tags.top>=band.top&&tags.bottom<=band.bottom&&!(tags.left<heading.right&&tags.right>heading.left&&tags.top<heading.bottom&&tags.bottom>heading.top);}), 'Hashtags fit image and clear heading '+theme+'/'+width+'/'+code);
    }
    check(await p.locator('#lop-e .e-hero-copy').evaluate(e=>{const r=e.getBoundingClientRect(),b=e.parentElement.getBoundingClientRect();return getComputedStyle(e).textAlign==='center'&&Math.abs((r.left+r.right)-(b.left+b.right))<2;}),'E introduction centered '+theme+'/'+width);
    check(await p.locator('#lop-k .course-knowledge>ol>li').evaluateAll((es,w)=>{const r=es.map(e=>e.getBoundingClientRect());return w>600?r.every(b=>Math.abs(b.top-r[0].top)<2):r.every((b,i)=>!i||b.top>=r[i-1].bottom);},width),'K keeps three columns above 600px and stacks on mobile '+theme+'/'+width);
    for(const code of ['a','b','c'])check(await p.locator('#lop-'+code+' .course-knowledge>ol>li').evaluateAll(es=>es.length>0&&es.every(e=>e.querySelector('h3')&&e.querySelectorAll('.knowledge-tags>li').length>0&&!e.querySelector('p'))),'Knowledge cards retain stage and algorithms without descriptions '+theme+'/'+width+'/'+code);
    check(await p.locator('.roadmap-course-letter').evaluateAll(es=>es.length>=6&&es.every(e=>getComputedStyle(e).fontFamily===getComputedStyle(document.querySelector('.nav-roadmap>summary')).fontFamily)),'Course letters share the menu font '+theme+'/'+width);
    check(await p.locator('#lop-e .e-entry>p').count()===0,'No admission footnote');
    check(await p.locator('#lop-e .e-circuit-path li').evaluateAll(es=>{const r=es.map(e=>e.getBoundingClientRect());return es.length===3&&r.every(b=>Math.abs(b.top-r[0].top)<2);}), 'Three circuit nodes fit one row '+theme+'/'+width);
    check(await p.locator('#lop-e .e-hero-copy h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=40),'E heading is larger');
    check(await p.locator('#lop-e .e-hero-copy h2').evaluate(e=>getComputedStyle(e).textTransform==='uppercase'),'E course name is uppercase');
    check(await p.locator('#lop-e .e-circuit-node :is(b,span,strong)').evaluateAll(es=>{const reference=getComputedStyle(es[0]);return es.length===4&&es.every(e=>{const s=getComputedStyle(e);return s.fontFamily===reference.fontFamily&&s.fontSize===reference.fontSize&&s.fontWeight===reference.fontWeight&&s.lineHeight===reference.lineHeight&&s.textTransform==='uppercase';});}),'Admission labels have one font scale and uppercase treatment');
    check(await p.locator('#lop-e .e-competition-tag').innerText()==='Thi đấu & phát triển','E competition tag');
    check(await p.locator('#lop-e .rm-heading-facts>.e-competition-tag').count()===1,'Competition tag shares the facts group');
    check(await p.locator('#lop-e .e-headline').count()===0,'E has no redundant slogan');
    check(await p.locator('#lop-e .e-circuit-heading,#lop-e .e-circuit-c svg').count()===0,'No admission heading or duplicate C icon');
    check(await p.locator('#lop-e .e-entry-mark[aria-hidden=true]').count()===2,'Only selection and flagship marks remain');
    check(await p.locator('#lop-e .e-circuit-selection svg').evaluate(e=>getComputedStyle(e).strokeWidth==='1.5px'),'Selection icon has thin stroke');
    check(await p.locator('#lop-e .e-circuit-node').evaluateAll((es,w)=>es.every(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.height<=(w>600?80:110)&&parseFloat(s.borderTopWidth)===2&&s.boxShadow!=='none';}),width),'Compact neubrutalist entry panels '+theme+'/'+width);
    check(await p.locator('#lop-e .e-entry-label').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect(),box=e.parentElement.getBoundingClientRect(),[a,b]=[...e.children].map(c=>c.getBoundingClientRect());return Math.abs((r.top+r.bottom)-(box.top+box.bottom))<2&&Math.abs((r.left+r.right)-(box.left+box.right))<2&&a.right<=b.left&&Math.abs((a.top+a.bottom)-(b.top+b.bottom))<2;})),'C and Elite labels are centered with inline contents');
    check((await p.locator('#lop-e .e-circuit-e').innerText()).trim()==='ELITE','Last entry panel shows medal and ELITE without duplicate caption');
    check(await p.locator('#lop-e .e-message').evaluate(e=>{const s=getComputedStyle(e);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.backgroundImage.startsWith('radial-gradient(')&&s.backgroundImage.includes('rgba(0, 0, 0, 0) 100%')&&parseFloat(s.borderTopWidth)===0;}),'E description has a transparent cream radial gradient');
    check(await p.locator('#lop-e .e-art-medal').evaluate(e=>getComputedStyle(e).strokeWidth==='0.8px'),'Background medal restores thin stroke');
    check(await p.locator('#lop-e .rm-background-poster img').getAttribute('src').then(s=>s.includes('roadmap-e-v3')&&s.includes('q=90')),'E uses high-quality optimized image');
    if(width===1440)check(await p.locator('#lop-e .rm-heading-facts>span').evaluateAll(es=>{const r=es.map(e=>e.getBoundingClientRect());return r.every(b=>Math.abs(b.top-r[0].top)<2);}), 'All E facts share one desktop row');
    check(await p.locator('#lop-e .e-pillar-3 .e-pillar-label>span:first-child').evaluate(e=>getComputedStyle(e).backgroundColor!==getComputedStyle(e.closest('.e-pillar')).backgroundColor),'03 counter separates from card surface');
    check(await p.locator('.rm-section-reveal').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).animationName==='none')),'Reduced motion reads all sections '+theme+'/'+width);
   }finally{await c.close();}
  }
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await go(page,'/lo-trinh');
  const panel=page.locator('#lop-c .rm-section-reveal');check(await panel.evaluate(e=>e.classList.contains('reveal-ready')),'Off-screen section waits for entry');
  await panel.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#lop-c .rm-section-reveal').classList.contains('is-revealed'));
  check(await panel.evaluate(e=>{const s=getComputedStyle(e);return s.animationName==='csat-editorial-enter'&&s.animationDuration==='0.52s';}),'Entrance is a short slide/fade');
  await page.waitForTimeout(1100);check(await panel.evaluate(e=>getComputedStyle(e).opacity==='1'&&!e.classList.contains('reveal-play')),'Entrance finishes fully readable');
  await page.evaluate(()=>scrollTo(0,0));await panel.scrollIntoViewIfNeeded();check(await panel.evaluate(e=>!e.classList.contains('reveal-play')),'Entrance does not repeat on scrolling');
 });
 await run('roadmap editorial posters, motion and stage navigation',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/lo-trinh');
  check(await page.locator('.rm-class-section [data-glyph-hover]').count()===0,'Course headings have no glyph effect');
  check(await page.locator('.roadmap-overview .rm-section-reveal').count()===7,'Seven sections have one simple entrance each');
  check(await page.locator('.rm-section-reveal[data-reveal-variant=wipe]').count()===0,'Simple entrances have no cover wipe');
  check(await page.locator('.rm-class-section .rm-small').count()===0,'No caption below enrollment actions');
  for(const code of ['a','b','c','e','k']){
   const poster=page.locator('#lop-'+code+' .rm-background-poster');
   check((await poster.locator('img').getAttribute('src')).includes('roadmap-'+(code==='e'?'e-v3':code)+'.webp'),'Course illustration source '+code);
   check(await poster.locator('.course-poster-expand').count()===0,'No view-image button on overview '+code);
   await poster.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
   // Measure scroll attachment after the requested one-time entrance has finished.
   await page.waitForFunction(code=>{const r=document.querySelector('#lop-'+code+' .rm-section-reveal');return r.classList.contains('is-revealed')&&!r.classList.contains('reveal-play');},code);
   const before=await poster.evaluate(e=>e.getBoundingClientRect().top+scrollY);
   await page.evaluate(()=>scrollBy(0,180));
   check(Math.abs(await poster.evaluate(e=>e.getBoundingClientRect().top+scrollY)-before)<1,'Poster stays in document flow '+code);
   check(await poster.evaluate(e=>getComputedStyle(e).position)==='absolute','Background poster stays fixed within description '+code);
  }
  const poster=page.locator('#lop-a .rm-background-poster');const posterBounds=await poster.boundingBox();await poster.hover({position:{x:posterBounds.width-2,y:2}});
  check(await poster.locator('img').evaluate(e=>getComputedStyle(e).animationName)==='rm-background-response','Hover image response keeps zoom');
  check(await poster.locator('img').evaluate(e=>getComputedStyle(e).animationIterationCount)==='1','Hover is finite');
  await page.emulateMedia({reducedMotion:'reduce'});
  check(await poster.locator('img').evaluate(e=>getComputedStyle(e).animationName)==='none','Reduced motion stops hover response');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.mouse.move(0,0);check(await poster.locator('img').evaluate(e=>Math.abs(new DOMMatrix(getComputedStyle(e).transform).a-1.1)<.001),'Background remains zoomed 110 percent');
  check(await page.locator('#lop-e.rm-flagship .rm-admission-path li').count()===3,'E admission path has three distinct steps');
  check((await page.locator('#lop-e .rm-admission-path').innerText()).toLocaleLowerCase('vi').includes('thi tuyển riêng'),'C to E requires selection');
  for(const slug of ['a','b','c','e','k']){
   await go(page,'/lo-trinh/'+slug);
   check(await page.locator('.rm-course-intro').evaluate(e=>e.firstElementChild.classList.contains('rm-course-switch')),'Course switch at top '+slug);
   check(await page.locator('.rm-detail-pathway .rm-pathway-grid>li').count()===3,'Specific development pathway '+slug);
   if(slug==='e')check(await page.locator('.rm-detail-special .rm-pathway-grid>li').count()===3,'E thinking development separate from admission');
   if(['a','b','c'].includes(slug)){
    const last=page.locator('.rm-stage-map a').last();await last.focus();await page.keyboard.press('Enter');
    const id=(await last.getAttribute('href')).slice(1),stage=page.locator('#'+id);
    check(await stage.getAttribute('open')!==null,'Stage anchor opens selected disclosure');
    check(await stage.locator('.rm-stage-body').isVisible(),'Selected stage readable');
    check(await stage.locator('.rm-stage-skills .rm-focus-tags li').count()>0,'Stage shows skill focus');
    check((await stage.locator('.rm-lesson-skill').first().innerText()).length>40,'Lesson skill explanation present');
   }
  }
  for(const theme of ['light','dark'])for(const width of [320,375,768,1440]){
   await page.setViewportSize({width,height:900});await go(page,'/lo-trinh');
   await page.getByRole('button',{name:'Chuyển giao diện sáng/tối'}).evaluate((e,t)=>{if(e.getAttribute('aria-pressed')!==String(t==='dark'))e.click();},theme);
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Editorial reflow '+theme+'/'+width);
   if([375,1440].includes(width)){await shot(page,`roadmap-editorial-${theme}-${width}`);await page.locator('#lop-e').screenshot({path:path.join(output,`roadmap-flagship-${theme}-${width}.png`)});}
   await go(page,'/lo-trinh/b');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Detail reflow '+theme+'/'+width);
   if([375,1440].includes(width)){await page.screenshot({path:path.join(output,`roadmap-detail-b-${theme}-${width}.png`),fullPage:true});}
  }
 });
 await run('poster lightbox and section jump controls',async()=>{
  await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await go(page,'/lo-trinh');
  for(const code of ['a','b','c','e','k']){
   const image=page.locator('#lop-'+code+' .rm-background-poster');
   check(await image.evaluate(e=>e.tagName==='DIV'&&!e.hasAttribute('href')&&!e.hasAttribute('tabindex')&&getComputedStyle(e).cursor!=='zoom-in'),'Overview image has no action or zoom cursor '+code);
   // Click the actual image area below the fixed header; content may cover this static background.
   await image.evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-24,behavior:'instant'}));
   const url=page.url(),box=await image.boundingBox();await page.mouse.click(box.x+box.width-18,box.y+40);
   check(page.url()===url&&await page.locator('.course-poster-lightbox').count()===0,'Clicking overview image has no effect '+code);
  }
  for(const route of ['/dang-ky-hoc']){
   await go(page,route);
   for(const code of ['a','b','c','e','k']){
    const trigger=page.locator(route==='/lo-trinh'?'#lop-'+code+' .course-poster-trigger':'.enrollment-'+code+' .course-poster-trigger');
    const dialog=trigger.locator('xpath=following-sibling::dialog[1]');
    await trigger.scrollIntoViewIfNeeded();await trigger.focus();const url=page.url(),overflow=await page.evaluate(()=>getComputedStyle(document.body).overflow);
    await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});
    check(page.url()===url,'Poster stays on current page '+route+'/'+code);
    check(await dialog.evaluate(e=>e.matches(':modal')),'Native modal is in top layer');
    check(await dialog.getByRole('button',{name:'Đóng ảnh'}).evaluate(e=>e===document.activeElement),'Close button receives focus');
    await page.keyboard.press('Tab');check(await dialog.evaluate(e=>e.contains(document.activeElement)),'Focus remains within image modal');
    await dialog.locator('figure img').evaluate(e=>e.decode());
    check(await dialog.locator('figure img').evaluate((e,expectedWidth)=>{const r=e.getBoundingClientRect();return e.naturalWidth===expectedWidth&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;},route==='/lo-trinh'?1600:1000),'Complete optimized image fits screen');
    check(await page.evaluate(()=>getComputedStyle(document.body).overflow)===overflow,'Image preview does not change page scroll styles');
    if(code==='a')await page.screenshot({path:path.join(output,route==='/lo-trinh'?'roadmap-poster-modal-1440.png':'enrollment-poster-modal-1440.png')});
    if(code==='b')await dialog.getByRole('button',{name:'Đóng ảnh'}).click();else await page.keyboard.press('Escape');
    await dialog.waitFor({state:'hidden'});check(await trigger.evaluate(e=>e===document.activeElement),'Close restores poster focus');
   }
  }
  await go(page,'/lo-trinh/b');await page.locator('.rm-course-poster').click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');check(await page.getByRole('dialog').count()===0,'Detail poster uses same preview');
  for(const width of [320,375,768,1440]){
   await page.setViewportSize({width,height:900});await go(page,'/lo-trinh');
   const navigation=page.getByRole('navigation',{name:'Chuyển giữa các mục trên trang'}),previous=navigation.getByRole('button',{name:'Mục trước'}),next=navigation.getByRole('button',{name:'Mục tiếp theo'});
   await navigation.waitFor();await page.waitForFunction(()=>document.querySelector('.public-section-jump button').disabled);
   check(await previous.isDisabled(),'Previous disabled at opening');await next.focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>{const t=document.querySelector('.rm-choose').getBoundingClientRect().top,h=document.querySelector('.site-header').getBoundingClientRect().bottom;return Math.abs(t-h-24)<3;});
   await page.waitForFunction(()=>!document.querySelector('.public-section-jump button').disabled);
   check(!await previous.isDisabled(),'Previous enabled after next section');
   const floating=await navigation.evaluate(e=>{const n=e.getBoundingClientRect(),main=document.querySelector('main');return getComputedStyle(e).position==='fixed'&&n.left>=0&&n.right<=innerWidth&&getComputedStyle(main).paddingRight==='0px'&&Math.abs(main.getBoundingClientRect().right-innerWidth)<1;});check(floating,'Floating controls preserve full content width '+width);
   await previous.click();await page.waitForFunction(()=>document.querySelector('.public-section-jump button').disabled);check(await previous.isDisabled(),'Previous returns to opening');
   await page.locator('#tu-van').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-document.querySelector('.site-header').getBoundingClientRect().bottom-24,behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('.public-section-jump button:last-child').disabled);check(await next.isDisabled(),'Next disabled at final section');
  }
  await page.setViewportSize({width:375,height:900});await go(page,'/dang-ky-hoc');await page.locator('.enrollment-poster').first().click();const modal=page.getByRole('dialog');await modal.waitFor();await modal.locator('figure img').evaluate(e=>e.decode());await page.screenshot({path:path.join(output,'poster-modal-375.png')});await page.mouse.click(4,880);await modal.waitFor({state:'hidden'});check(await page.getByRole('dialog').count()===0,'Backdrop closes mobile image');
  await go(page,'/lo-trinh');
  for(const code of ['a','b','c','e','k']){
   const section=page.locator('#lop-'+code);
   check(await section.evaluate(e=>{const image=e.querySelector('.rm-background-poster').getBoundingClientRect(),band=e.querySelector('.rm-description-band').getBoundingClientRect(),knowledge=e.querySelector('.rm-overview-roadmap,.e-pillars-group').getBoundingClientRect(),description=e.querySelector('.rm-audience-panel,.e-hero-copy').getBoundingClientRect();return image.bottom<=band.bottom+1&&image.bottom<=knowledge.top+1&&image.bottom>=description.bottom;}),'Background ends after description before knowledge '+code);
  }
  for(const code of ['a','b','c','e','k']){
   const colors=await page.locator('#lop-'+code+' :is(.course-knowledge,.e-pillars) h3').evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).color))]);check(colors.length===1,'Roadmap headings use one shared accent '+code);
   const backgrounds=await page.locator('#lop-'+code+' :is(.course-knowledge>ol>li,.e-pillar)').evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).backgroundColor))]);check(backgrounds.length>=2,'Roadmap cards have distinct surfaces '+code);
   if(code==='e')check(await page.locator('#lop-e .e-pillar').count()===3,'E consolidates learning, community and practice into three pillars');
   else if(code==='k'){const tagColors=await page.locator('#lop-'+code+' .rm-focus-tags li').evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).backgroundColor))]);check(tagColors.length>=3,'Colorful property tags '+code);}
   const ratios=await page.locator('#lop-'+code+' .rm-course-hashtags li,#lop-'+code+' .rm-focus-tags li,#lop-'+code+' .knowledge-tags li,#lop-'+code+' .rm-property,#lop-'+code+' .rm-heading-facts>span').evaluateAll(es=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
    function lum(color){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
    return es.map(e=>{const s=getComputedStyle(e),a=lum(s.color),b=lum(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
   });check(ratios.every(r=>r>=4.5),'Class properties and tags meet readable contrast '+code);
  }
  for(const code of ['a','b','c']){check(await page.locator('#lop-'+code+' .rm-editorial-intro h3,#lop-'+code+' .rm-audience-panel .rm-focus-tags').count()===0,'No duplicate subtitle or algorithm strip '+code);check(await page.locator('#lop-'+code+' .course-knowledge>ol>li>p').count()===0,'Knowledge cards omit skill descriptions '+code);}
  check(await page.locator('#lop-e .e-background-art[aria-hidden=true] svg').count()===4,'E artwork is decorative and static');
  check(await page.getByRole('heading',{name:'Nền tảng để phát triển',exact:true}).count()===3,'Foundation label updated for A/B/C');
  check(!(await page.locator('main').innerText()).includes('Nền tảng để học tiếp'),'Old foundation label removed');
  await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('contact entry role switch and mocked authentication errors',async()=>{
  const c=await browser.newContext({viewport:{width:1440,height:900}});await secure(c);const p=await c.newPage();let parentCalls=0,rateCalls=0,tokenCalls=0;
  await c.route('**/api/parents/auth',async route=>{parentCalls++;check(route.request().postDataJSON().phone==='0912345678','Existing normalized parent payload');await route.fulfill({status:403,json:{error:'Số điện thoại chưa được mở tra cứu.'}});});
  await c.route('**/api/auth/rate-limit',async route=>{rateCalls++;await route.fulfill({status:200,json:{ok:true}});});
  await c.route('http://127.0.0.1:54321/auth/v1/token**',async route=>{tokenCalls++;const payload=route.request().postDataJSON();check(payload.email==='tutor@example.test'&&payload.password==='fake-test-password','Existing tutor password flow');await route.fulfill({status:400,json:{error:'invalid_grant',error_description:'Invalid login credentials',msg:'Invalid login credentials'}});});
  await go(p,'/login');check(await p.locator('.contact-dock').count()===0,'Contact entry omits dock and materials notice');await p.setViewportSize({width:375,height:900});check(await p.locator('.contact-dock').count()===0,'Mobile contact entry omits floating contacts');await p.setViewportSize({width:1440,height:900});check(await p.locator('#entry-parent').isVisible(),'Parent default');check(!await p.locator('#entry-tutor').isVisible(),'Tutor form initially hidden');
  await p.locator('#parent-phone').fill('+84 912 345 678');await p.getByRole('button',{name:'Tra cứu thông tin'}).click();await p.locator('#entry-parent').getByRole('alert').waitFor();check(parentCalls===1,'Parent endpoint used once');
  await p.getByRole('radio',{name:'Gia sư / Admin',exact:true}).check();check(await p.locator('#entry-tutor').isVisible(),'Switch exposes tutor form');check(!await p.locator('#entry-parent').isVisible(),'Parent form hidden');
  await p.locator('#tutor-email').fill('tutor@example.test');await p.locator('#tutor-password').fill('fake-test-password');await p.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();check(await p.locator('#tutor-password').getAttribute('type')==='text','Accessible password toggle');await p.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();
  await p.getByRole('button',{name:'Đăng nhập hệ thống'}).click();await p.locator('#entry-tutor').getByRole('alert').waitFor();check((await p.locator('#entry-tutor').getByRole('alert').innerText()).includes('Email hoặc mật khẩu không chính xác'),'Existing tutor error translated');check(rateCalls===1&&tokenCalls===1,'Rate limit before token request');
  await p.getByRole('radio',{name:'Phụ huynh',exact:true}).check();check(await p.locator('#parent-phone').inputValue()==='+84 912 345 678','Role switch preserves typed parent value');check(!p.url().includes('0912')&&!p.url().includes('example'),'No login details in URL');
  const radio=p.getByRole('radio',{name:'Phụ huynh',exact:true});await radio.focus();await p.keyboard.press('ArrowRight');check(await p.getByRole('radio',{name:'Gia sư / Admin',exact:true}).isChecked(),'Keyboard changes role');
  await go(p,'/login?role=tutor');check(await p.locator('#entry-tutor').isVisible(),'Direct tutor URL works');await p.locator('.nav-links a[href="/login"]').click();await p.locator('#entry-parent').waitFor({state:'visible'});check(new URL(p.url()).search==='','Client navigation resets entry selection');await go(p,'/tutor');check(new URL(p.url()).pathname==='/login'&&new URL(p.url()).searchParams.get('role')==='tutor','Legacy tutor entry redirects to common page');
  await c.close();
 });
 await run('glyph DOM text, multicolor overlay and reduced motion',async()=>{
  await go(page,'/lo-trinh');check(await page.locator('#tu-van [data-glyph-hover]').count()===0,'Overview consultation has no glyph effect');const h=page.locator('[data-glyph-hover]').first();await h.scrollIntoViewIfNeeded();const before=await h.textContent(),box=await h.boundingBox();await page.mouse.move(box.x+30,box.y+25);await page.waitForTimeout(60);const units=page.locator('.csat-glyph-unit');check(await units.count()>0&&await units.count()<=7,'One to seven graphemes');check(await h.textContent()===before,'Original DOM text unchanged');check((await units.evaluateAll(es=>[...new Set(es.map(e=>getComputedStyle(e).color))])).length>=2,'Multiple colors');await page.waitForTimeout(500);check(await units.count()===0,'Glyph ends promptly');
  await page.evaluate(()=>{const h=document.querySelector('[data-glyph-hover]'),r=document.createRange();r.selectNodeContents(h);getSelection().removeAllRanges();getSelection().addRange(r);});check((await page.evaluate(()=>getSelection().toString())).replace(/\s/g,'').toLocaleUpperCase('vi')===before.replace(/\s/g,'').toLocaleUpperCase('vi'),'Selected text remains original');await page.evaluate(()=>getSelection().removeAllRanges());await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(box.x+50,box.y+25);await page.waitForTimeout(60);check(await units.count()===0,'Reduced motion suppresses glyph');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('course detail responsive poster, editorial order and outcomes',async()=>{
  for(const theme of ['light','dark']){
   const c=await browser.newContext({colorScheme:theme,reducedMotion:'reduce'});await secure(c);
   await c.addInitScript(t=>{if(['http:','https:'].includes(location.protocol))localStorage.setItem('theme',t);},theme);
   const p=await c.newPage();
   for(const [width,height] of [[320,900],[375,900],[768,1024],[1024,768],[1024,1366],[1440,900],[1920,1080]]){
    await p.setViewportSize({width,height});
    for(const code of ['a','b','c','e','k']){
     await go(p,'/lo-trinh/'+code);layouts++;
     await p.waitForFunction(()=>{const i=document.querySelector('.rm-course-hero img');return i.complete&&i.naturalWidth>0;});
     check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Detail has no overflow '+code+'/'+width+'/'+height);
     check(await p.locator('.rm-breadcrumb').evaluate(e=>{
      const r=[...e.children].map(n=>n.getBoundingClientRect());return r.every(n=>Math.abs(n.top+n.height/2-r[0].top-r[0].height/2)<1)&&getComputedStyle(e).fontSize!=='12px';
     }),'Breadcrumb reads on one centered line '+code);
     check(await p.locator('.rm-course-hero').evaluate(e=>{
      const photo=e.querySelector('.rm-course-poster').getBoundingClientRect();
      return photo.left>=0&&photo.right<=innerWidth+1&&photo.width>0&&[...e.querySelectorAll('h1,.rm-course-lead,.rm-detail-enrollment')].every(n=>{
       const r=n.getBoundingClientRect();return r.right<=photo.left+1||r.left>=photo.right-1||r.bottom<=photo.top+1||r.top>=photo.bottom-1;
      });
     }),'Photo remains in flow without covering copy or registration '+code);
     if(width>900&&width>height)check(await p.locator('.rm-course-poster').evaluate(e=>e.getBoundingClientRect().width>300),'Landscape poster expands with the column '+code);
     check(await p.locator('.rm-detail-enrollment').evaluate(e=>e.querySelector('.btn').nextElementSibling.classList.contains('rm-schedule-note')),'Schedule is immediately below registration '+code);
     check(!(await p.locator('.rm-course-facts').innerText()).includes('Lịch học theo đợt tuyển sinh'),'Old schedule is removed from facts '+code);
     check(await p.locator('.rm-course-outcomes h3').count()===4&&await p.locator('#outcomes-title').innerText()==='Mục tiêu cuối khoá','Four learning aims and next direction '+code);
     check(await p.locator('.rm-course-outcomes').evaluate(e=>e.nextElementSibling?.id==='tu-van'),'Learning aims immediately precede consultation '+code);
     check(await p.locator('.rm-schedule-note').innerText()==='*Lịch học sắp xếp thuận tiện nhất cho học viên theo từng đợt tuyển sinh; trao đổi cụ thể cùng CSAT ngay bây giờ!','Current schedule invitation '+code);
     check(await p.locator('#tu-van [data-glyph-hover]').count()===0,'Consultation headings are plain text '+code);
     check(await p.locator('.rm-course-curriculum,.rm-detail-special').evaluate(e=>{const s=getComputedStyle(e,'::before');return s.backgroundImage.includes('radial-gradient')&&s.pointerEvents==='none'&&s.zIndex==='-1';}),'Course-colored blobs stay behind content and do not intercept input '+code);
     if(code==='e')check(await p.locator('.rm-course-hero').evaluate(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e.parentElement.parentElement).backgroundImage==='none'),'E shares the page surface without a separate background');
     if(['a','b','c'].includes(code)){
      check(await p.locator('.rm-stage-map a').evaluateAll(es=>es.every(e=>getComputedStyle(e).textAlign==='center')),'Stage titles are centered '+code);
      check(await p.locator('.rm-stage-map').evaluate(e=>{
       const r=[...e.querySelectorAll('a')].map(n=>n.getBoundingClientRect());return Math.max(...r.map(n=>n.height))-Math.min(...r.map(n=>n.height))<1;
      }),'Stage tiles keep aligned heights '+code);
      check(await p.locator('.rm-stage-direction').count()===await p.locator('.rm-stage-map a').count()-1,'Arrows connect the ordered stages '+code);
     }
     if(theme==='light'&&['b','e'].includes(code)&&[375,1440].includes(width)){
      await p.locator('.rm-course-intro').screenshot({path:path.join(output,`detail-${code}-intro-${width}.png`)});
      if(code==='b')await p.locator('.rm-stage-map').screenshot({path:path.join(output,`detail-b-stages-${width}.png`)});
     }
    }
   }
   await c.close();
  }
  for(const code of ['a','b','c','e','k']){
   const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});await secure(c);const p=await c.newPage();
   await go(p,'/lo-trinh/'+code);layouts++;check(await p.locator('.rm-course-outcomes h3').count()===4,'No-JS includes learning aims '+code);
   check(await p.locator('.rm-course-poster').getAttribute('href')!==null,'No-JS poster keeps a direct image link '+code);await c.close();
  }
  await page.setViewportSize({width:1440,height:900});await go(page,'/lo-trinh/b');
  const last=page.locator('.rm-stage-map a').last();await last.focus();await last.press('Enter');
  check(await page.locator('.rm-curriculum-stage').last().getAttribute('open')!==null,'Keyboard stage navigation opens its destination');
  await go(page,'/lo-trinh');await page.locator('#lop-b .rm-class-actions .btn').click();await page.waitForURL(u=>u.pathname==='/lo-trinh/b');
  check(await page.locator('.rm-course-poster').evaluate(e=>e.getBoundingClientRect().width>300),'Client navigation preserves fluid poster sizing');
  await page.goBack({waitUntil:'networkidle'});await page.goForward({waitUntil:'networkidle'});
  check(await page.locator('.rm-schedule-note').count()===1&&await page.locator('.rm-course-outcomes h3').count()===4,'Back/forward preserves detail structure');
 });
 await run('approved curriculum preserved on public course routes',async()=>{
  const curriculum=require('../../lib/learning-curriculum-20260922.json');
  for(const [slug,program,part,count] of [['a','basic','A',9],['b','basic','B',15],['c','advanced',null,19]]){
   await go(page,'/lo-trinh/'+slug);const stages=curriculum.find(t=>t.program===program).stages.filter(s=>!part||s.part===part),lessons=stages.flatMap(s=>s.lessons);
   check(lessons.length===count,'Approved source count '+slug);check(await page.locator('.rm-stage-body>ol>li').count()===count,'Rendered topic count '+slug);check(JSON.stringify(await page.locator('.rm-stage-body>ol>li h3').allTextContents())===JSON.stringify(lessons.map(l=>l.title)),'Approved titles/order '+slug);
   await page.locator('.rm-curriculum-stage').last().locator('summary').click();check(await page.locator('.rm-curriculum-stage').last().locator('.rm-stage-body').isVisible(),'Keyboard/native details reveal content');
  }
  for(const slug of ['e','k']){await go(page,'/lo-trinh/'+slug);check(await page.locator('.rm-stage-body>ol>li').count()===0,'No invented curriculum '+slug);check(!(await page.locator('.rm-course-facts').innerText()).includes('99.000'),'No invented E/K price');}
 });
 await run('home values bulb, team placement and keyboard panels',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/');check(await page.locator('.team-profile').count()===3,'Three supplied tutor cards');check(await page.evaluate(()=>{const a=document.querySelector('.home-team'),b=document.querySelector('.home-values'),c=document.querySelector('.home-why');return !!(b.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(a.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING); }),'Team after values and before why CSAT');
  const bulb=page.locator('.values-bulb');await bulb.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.values-bulb').classList.contains('is-revealed'));await page.waitForTimeout(800);check(await bulb.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0&&Number(getComputedStyle(e).opacity)>.95),'Bulb artwork finishes visible');
  const button=page.locator('.value-button').nth(2);await button.focus();await page.keyboard.press('Enter');await button.focus();await page.keyboard.press('Escape');check(await button.getAttribute('aria-expanded')==='false','Escape closes value panel');await page.keyboard.press('Enter');check(await button.getAttribute('aria-expanded')==='true','Keyboard reopens value panel');const panel=page.locator('#'+await button.getAttribute('aria-controls'));check(await panel.isVisible(),'Value panel readable');
  check(await page.locator('.lesson-step').count()===6,'Six learning steps');check(await page.locator('.home-courses .course-row').count()===3,'Three A/B/C rows');
 });
 await run('home narrow bulb does not cover eyebrow text',async()=>{
  for(const theme of ['light','dark']){await page.emulateMedia({colorScheme:theme});for(const width of [320,375]){await page.setViewportSize({width,height:900});await go(page,'/');await page.getByRole('button',{name:'Chuyển giao diện sáng/tối'}).evaluate((e,t)=>{if(e.getAttribute('aria-pressed')!==String(t==='dark'))e.click();},theme);await page.locator('.home-values').evaluate(e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-130));await page.waitForTimeout(900);
   const overlap=await page.evaluate(()=>{const bulb=document.querySelector('.values-bulb img').getBoundingClientRect(),text=document.querySelector('.values-kicker>.eyebrow'),range=document.createRange();range.selectNodeContents(text);return [...range.getClientRects()].some(r=>r.left<bulb.right&&r.right>bulb.left&&r.top<bulb.bottom&&r.bottom>bulb.top);});check(!overlap,'Bulb clears text at '+theme+'/'+width);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Narrow home no overflow');await page.screenshot({path:path.join(output,`home-values-${theme}-${width}-viewport.png`)});
  }}await page.emulateMedia({colorScheme:'light'});
 });
 await run('learning materials route, dock invitation and public contacts',async()=>{
  await page.setViewportSize({width:375,height:900});await go(page,'/');
  check(await page.locator('.home-why').count()===1,'Home explains why CSAT');
  check(await page.locator('.home-page .public-intake').count()===0,'Materials intake moved off home');
  check(await page.locator('.home-page video').count()===0,'Practice video moved off home');
  const invite=page.locator('.dock-materials-notice');check(await invite.isVisible(),'Materials invitation visible');
  const box=await invite.boundingBox();check(box.x>=0&&box.x+box.width<=375,'Invitation within narrow screen');
  const toggleBox=await page.locator('.dock-toggle').boundingBox();check(box.y+box.height<toggleBox.y,'Invitation is above contact button');
  await invite.getByRole('button',{name:'Ẩn gợi ý học liệu'}).click();check(await invite.count()===0,'Invitation is dismissible');
  check(await page.locator('.dock-toggle').evaluate(e=>e===document.activeElement),'Dismiss restores focus');
  await page.locator('.dock-toggle').click();await page.locator('.dock-panel a[href="/hoc-lieu-mien-phi"]').click();
  await page.waitForURL(url=>url.pathname==='/hoc-lieu-mien-phi');
  await page.locator('.materials-page .public-intake form').waitFor();
  check(new URL(page.url()).pathname==='/hoc-lieu-mien-phi','Dock opens materials page');
  check(await page.locator('h1').innerText()==='HỌC LIỆU\nMIỄN PHÍ.','Materials title');
  check(await page.locator('.public-intake form').count()===1,'Materials form preserved');
  check(await page.locator('.practice-video').count()===1,'Optimized video preserved');
  check(await invite.count()===0,'No invitation on destination');
  await page.locator('.oj-tabs button').nth(1).click();check(await page.locator('#oj-practice-1').isVisible(),'Practice step switches');
  for(const href of ['mailto:csattutor@gmail.com','https://zalo.me/0916246867','https://www.facebook.com/csat.tutor','https://www.tiktok.com/@csat.tutor'])check(await page.locator('.footer-contact a[href="'+href+'"]').count()===1,'Official contact '+href);
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});
  await page.locator('.practice-video').scrollIntoViewIfNeeded();await page.waitForTimeout(150);
  check(await page.locator('.practice-video video').evaluate(v=>v.paused&&!v.getAttribute('src')),'Reduced motion does not autoplay video');
  await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('ecosystem circuit tree, bullet content and compact footer',async()=>{
  for(const width of [320,375,900,901,1440]){
   await page.setViewportSize({width,height:900});await go(page,'/');
   for(const theme of ['light','dark']){
    await page.getByRole('button',{name:'Chuyển giao diện sáng/tối'}).evaluate((e,t)=>{if(e.getAttribute('aria-pressed')!==String(t==='dark'))e.click();},theme);
    await page.waitForFunction(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme);
    await page.locator('.why-tree').scrollIntoViewIfNeeded();
    check(await page.locator('.why-branch').count()===4,'Four ecosystem branches');
    check(await page.locator('.why-branch li').count()===12,'Each branch has three bullet points');
    const experience=page.locator('.home-why a');
    check(await experience.count()===1&&await experience.getAttribute('href')==='https://csatoj.vn/','Only the requested CSATOJ experience link in ecosystem');
    check(await experience.getAttribute('target')==='_blank'&&(await experience.getAttribute('rel')).includes('noopener'),'External experience link opens safely');
    check(await page.locator('.footer-top .footer-contact').count()===1,'Contacts integrated into existing footer');
    check(await page.locator('.site-footer h2').count()===0,'No oversized contact section');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Circuit tree and footer stay within viewport');
    check(await page.locator('.why-wires').isVisible()===(width>900),'Circuit tree changes to vertical below 901px');
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.why-parents').scrollIntoViewIfNeeded();check(await page.locator('.why-branch ul').last().isVisible(),'Bullet content available with reduced motion');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('roadmap opening art and scrolling symbols',async()=>{
  for(const width of [375,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await go(page,'/lo-trinh');
   await page.getByRole('button',{name:'Chuyển giao diện sáng/tối'}).evaluate((e,t)=>{if(e.getAttribute('aria-pressed')!==String(t==='dark'))e.click();},theme);
   await page.waitForFunction(t=>document.documentElement.classList.contains('dark')===(t==='dark'),theme);
   check(await page.locator('main h1').count()===1&&/Lộ trình học lập trình/i.test(await page.locator('main h1').innerText()),'New roadmap heading is the single page title');
   check(await page.locator('.rm-hero-tile img').count()===4,'Four background photos retained');
   check(await page.locator('.rm-hero-art').isVisible(),'Terminal art remains with the opening title');
   check(await page.evaluate(()=>!document.querySelector('main').textContent.includes('HIỂU BÀI TOÁN → TỔ CHỨC LỜI GIẢI')),'Repeated assembly caption removed');
   const scene=page.locator('.rm-assembly'),icons=scene.locator('[data-assembly-icon]');
   const absoluteTop=await scene.evaluate(e=>e.getBoundingClientRect().top+scrollY);
   check(await page.evaluate(()=>{const choose=document.querySelector('.rm-choose'),assembly=document.querySelector('.rm-assembly'),a=document.querySelector('#lop-a');return !!(choose.compareDocumentPosition(assembly)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(assembly.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING); }),'Symbols follow selector and precede class A');
   check(await icons.count()===9,'All nine symbols remain on mobile and desktop');
   await page.evaluate(y=>scrollTo(0,y),absoluteTop-760);await page.waitForTimeout(120);
   const before=await icons.evaluateAll(es=>es.map(e=>getComputedStyle(e).transform).join('|'));
   await page.evaluate(y=>scrollTo(0,y),absoluteTop-140);await page.waitForTimeout(120);
   check(await icons.evaluateAll(es=>es.map(e=>getComputedStyle(e).transform).join('|'))!==before,'Scroll drives the symbol composition');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Opening and animation do not cause horizontal overflow');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
   const still=await icons.evaluateAll(es=>es.map(e=>getComputedStyle(e).transform).join('|'));
   await page.evaluate(()=>scrollBy(0,50));await page.waitForTimeout(100);
   check(await icons.evaluateAll(es=>es.map(e=>getComputedStyle(e).transform).join('|'))===still,'Reduced motion leaves a stable complete composition');
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
   await page.locator('.rm-hero').screenshot({path:path.join(output,`roadmap-new-opening-${width}-${theme}.png`)});
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await run('enrollment catalog, course defaults and registration options',async()=>{
  await page.setViewportSize({width:1440,height:900});await go(page,'/dang-ky-hoc');
  check(await page.locator('.enrollment-card').count()===5,'Five enrollment courses');
  check(await page.locator('.enrollment-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===3,'Desktop shows three cards per row');
  check(await page.locator('.enrollment-poster').first().evaluate(e=>e.getBoundingClientRect().width)===144,'Poster doubled from 72 to 144px');
  check((await page.locator('.enrollment-b .enrollment-audience').innerText()).includes('không quá cạnh tranh'),'B audience follows poster');
  check((await page.locator('.enrollment-c .enrollment-audience').innerText()).includes('các tỉnh mạnh, cạnh tranh'),'C audience follows poster');
  check(await page.locator('.enrollment-c .enrollment-knowledge li').count()>=12,'C has expanded learning tags');
  for(const code of ['A','B','C','E','K']){
   await go(page,`/lo-trinh/${code.toLowerCase()}?course=K#tu-van`);
   check((await page.locator('.public-intake [data-select-name=course]').innerText()).startsWith(code+' —'),'Detail route determines default '+code);
   await page.getByRole('link',{name:`Đăng ký học lớp ${code}`,exact:true}).click();
   await page.waitForURL(url=>url.pathname==='/dang-ky-hoc'&&url.searchParams.get('course')===code);
   check((await page.locator('.public-intake [data-select-name=course]').innerText()).startsWith(code+' —'),'Enrollment inherits '+code);
   check(await page.locator('.enrollment-selected').innerText().then(t=>t.includes('Lớp '+code)),'Selected course context shown');
  }
  for(const route of ['/dang-ky-hoc?course=C#thong-tin','/lo-trinh/a#tu-van','/lo-trinh#tu-van','/hoc-lieu-mien-phi#nhan-tai-lieu']){
   await go(page,route);const form=page.locator('.public-intake form');
   for(const [name,count,removed] of [['role',2,['Sinh viên']],['level',3,['Đại học','Trao đổi thêm']],['goal',5,['HSG Quốc gia']]]){
    await form.locator(`[data-select-name=${name}]`).click();const popup=page.locator('.public-select-popup[data-open]');await popup.waitFor({state:'visible'});const options=await popup.getByRole('option').allTextContents();
    check(options.length===count,name+' allowed option count');check(removed.every(value=>!options.includes(value)),name+' removed options absent');await page.keyboard.press('Escape');await popup.waitFor({state:'hidden'});
   }
  }
  await go(page,'/dang-ky-hoc?course=C#thong-tin');const form=page.locator('.public-intake form');
  await form.locator('[name=name]').fill('Phụ huynh kiểm thử');await form.locator('[name=phone]').fill('0912345678');
  await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();check((await page.locator('.intake-review textarea').inputValue()).includes('Khóa quan tâm: C —'),'Default is included in review');
  await page.getByRole('button',{name:'Chỉnh lại',exact:true}).click();await choose(page,form,'course','B — Thi đấu cơ bản');
  await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();check((await page.locator('.intake-review textarea').inputValue()).includes('Khóa quan tâm: B —'),'User can override default');
  await go(page,'/dang-ky-hoc?course=untrusted&phone=0912345678');check((await page.locator('.public-intake [data-select-name=course]').innerText()).includes('Cần tư vấn thêm'),'Unknown course safely falls back');check(!(await page.locator('main').innerText()).includes('0912345678'),'Free text query never becomes contact data');
  for(const width of [375,768,1440])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.addInitScript(t=>localStorage.setItem('theme',t),theme);await go(page,'/dang-ky-hoc');
   check(await page.locator('.enrollment-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)===(width===1440?3:width===768?2:1),'Responsive card columns');
   check(await page.locator('.dock-materials-notice').count()===0,'Registration avoids floating materials invitation');
   await shot(page,`enrollment-${theme}-${width}`);await page.locator('.enrollment-card').first().screenshot({path:path.join(output,`enrollment-card-${theme}-${width}.png`)});
  }
 });
 await run('frontend forms validate review edit copy without requests',async()=>{
  const requests=[];page.on('request',r=>{if(r.url().includes('/api/consultations'))requests.push(r.method());});
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value;}}}));
  for(const route of ['/hoc-lieu-mien-phi','/lo-trinh?course=C&level=thcs&goal=province&background=practice&show=1#tu-van']){
   await page.setViewportSize({width:375,height:900});await go(page,route);const form=page.locator('.public-intake form');await form.waitFor();
   await form.locator('[data-select-name=course]').click();await page.getByRole('option').nth(5).waitFor();check(await page.getByRole('option').count()===6,'Five courses plus advice');await page.keyboard.press('Escape');
   await form.locator('[name=name]').fill('Phụ huynh kiểm thử');await form.locator('[name=phone]').fill('123');await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();check(await form.getByRole('alert').isVisible(),'Invalid phone blocked');check(await page.locator('.intake-review').count()===0,'Invalid form does not advance');
   await form.locator('[name=phone]').fill('0912345678');await form.locator('[name=email]').fill('test@example.test');await form.locator('[name=message]').fill('Muốn tìm tài liệu và luyện thêm thuật toán.');await choose(page,form,'course','C — Thi đấu nâng cao');
   await form.getByRole('button',{name:'Kiểm tra thông tin'}).click();const review=page.locator('.intake-review'),summary=review.locator('textarea');await review.waitFor();check((await summary.inputValue()).includes('C — Thi đấu nâng cao'),'Chosen course preserved');check((await review.innerText()).includes('Thông tin chưa được gửi'),'Honest unsent state');check(await review.locator('h3').evaluate(e=>e===document.activeElement),'Review gets focus');
   await review.getByRole('button',{name:'Sao chép nội dung'}).click();await page.waitForFunction(()=>!!window.__copied);check(await page.evaluate(()=>window.__copied)===(await summary.inputValue()),'Clipboard matches reviewed text');
   if(route!=='/hoc-lieu-mien-phi')check((await summary.inputValue()).includes('Ngữ cảnh tìm hiểu:'),'Selector context carried');
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
 check(checksRun>0,'PUBLIC_QA_FILTER did not select any checks');
 }finally{await browser.close();await fs.writeFile(path.join(output,filter?'qa-targeted-report.json':'qa-report.json'),JSON.stringify({base:base.origin,browser:process.env.CSAT_BROWSER_CHANNEL||'msedge',filter:filter?.source||null,checksRun,layouts,assertions,failures,errors,assetFailures,unexpectedWrites},null,2));}
 console.log(JSON.stringify({passed:failures.length===0,checksRun,layouts,assertions,failures,report:path.join(output,filter?'qa-targeted-report.json':'qa-report.json')}));if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
