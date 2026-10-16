// Layout regression for the vertical map with natural document scrolling.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const origin = process.env.PUBLIC_QA_BASE_URL || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw Error('Loopback preview required');
const source = require('../../lib/self-study-source.json');
const nodes = JSON.parse(fs.readFileSync(path.join(root, 'public/self-study', Object.keys(source.files).find(f => f.startsWith('roadmap.'))), 'utf8')).nodes;
const output = path.join(root, 'scratch/knowledge-map-qa');
fs.mkdirSync(output, { recursive: true });
const widths = [320, 375, 680, 681, 768, 900, 901, 1280, 1440, 1920];
const errors = [], layouts = [];
let assertions = 0;
function check(value, label) { assertions++; assert(value, label); }
(async () => {
 const browser = await chromium.launch({ channel: process.env.CSAT_BROWSER_CHANNEL || 'msedge' });
 try {
  for (const theme of ['light', 'dark']) {
   const context = await browser.newContext({ reducedMotion: 'reduce' });
   await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
   await context.route('**/*', route => new URL(route.request().url()).origin === origin && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
   const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
   for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/tu-hoc');
    await page.locator('#stage [data-node]').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    check(await page.locator('[data-site-background]').count() === 0, 'paper replaces public decorative background');
    check(await page.locator('.self-study-page').evaluate(el => getComputedStyle(el).backgroundImage.includes('linear-gradient')), 'full page ruled paper');
    check(await page.locator('#canvas').evaluate(el => getComputedStyle(el).overflow === 'visible' && el.scrollTop === 0), 'no nested scrolling');
    check(await page.locator('.site-footer').count() === 0, 'map fills page without website footer');
    check(await page.locator('#stage>svg').getAttribute('role') === 'group', 'interactive children exposed');
    const labels = await page.locator('.svg-node').evaluateAll(elements => elements.map(el => ({ id: el.dataset.node, title: [...el.querySelectorAll('.node-title')].map(t => t.textContent).join(' ') })).sort((a,b) => a.id.localeCompare(b.id)));
    assertions++; assert.deepEqual(labels, nodes.map(n => ({id:n.id,title:n.title})).sort((a,b)=>a.id.localeCompare(b.id)), 'all titles preserved');
    const textIssues = await page.locator('.svg-node').evaluateAll(elements => elements.flatMap(node => {
     const issues = [], foot = node.querySelector('.node-foot').getBBox(), height = Number(node.dataset.height);
     for (const text of node.querySelectorAll('text')) {
      const r = text.getBBox();
      if (r.x < 7 || r.x + r.width > 224 || r.y < 3 || r.y + r.height > height - 4) issues.push(node.dataset.node + ': ' + text.textContent);
      if (text.classList.contains('node-title') && (r.y < 37 || r.y + r.height > foot.y - 1)) issues.push(node.dataset.node + ': header/footer collision');
     }
     return issues;
    }));
    assertions++; assert.deepEqual(textIssues, [], 'SVG text fits '+theme+'/'+width);
    const fixed = await page.evaluate(() => {
     const header=document.querySelector('.site-header').getBoundingClientRect(), rail=document.querySelector('.study-rail').getBoundingClientRect(), toolbar=document.querySelector('.study-toolbar').getBoundingClientRect();
     return rail.top >= header.bottom && toolbar.left >= 0 && toolbar.right <= innerWidth + 1 && toolbar.bottom <= innerHeight && rail.bottom < toolbar.top;
    });
    check(fixed, 'floating menu and toolbar fit viewport '+width);
    check(await page.locator('.study-rail-enrollment a').getAttribute('href') === '/lo-trinh#tu-van', 'registration preserved');
    check(await page.locator('.study-rail-enrollment a').evaluate(el=>{const css=getComputedStyle(el);return css.backgroundColor==='rgba(0, 0, 0, 0)'&&css.boxShadow==='none'&&!el.querySelector('span')}),'registration has no blue box or word highlight');
    const buttons = await page.locator('.study-toolbar button:not([hidden])').evaluateAll(els => els.filter(el=>el.getClientRects().length).map(el=>({id:el.id,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
    check(buttons.every(b=>b.w>=43 && b.h>=43), '44px toolbar hitboxes '+JSON.stringify(buttons));
    const initial=await page.evaluate(()=>({x:scrollX,y:scrollY}));
    await page.mouse.move(width/2,450); await page.mouse.wheel(100,320);
    await page.waitForFunction(initial=>scrollY>initial.y+100,initial);
    check(await page.locator('#canvas').evaluate(el=>el.scrollTop===0),'wheel scrolls document');
    const horizontal = await page.evaluate(() => {const before=scrollX;window.scrollTo({left:document.documentElement.scrollWidth,top:scrollY,behavior:'instant'});const after=scrollX;window.scrollTo({left:before,top:scrollY,behavior:'instant'});return {before,after,max:document.documentElement.scrollWidth-innerWidth}});
    check(horizontal.max<=1 || horizontal.after>0,'horizontal document scrollbar moves map');
    check(await page.locator('.study-toolbar').evaluate(el=>el.getBoundingClientRect().bottom <= innerHeight),'toolbar stays visible after scroll');
    await page.locator('#fit').click();
    if ([375,1440].includes(width)) await page.screenshot({path:path.join(output,`vertical-${theme}-${width}.png`)});
    layouts.push({theme,width});
   }
   await page.setViewportSize({width:1440,height:900});
   await page.goto(origin+'/tu-hoc#view=DP'); await page.locator('#graph-D07').waitFor();
   await page.locator('#graph-D06').press('Enter'); await page.locator('#topic-details summary').click();
   check(await page.locator('#detail-list li').count()===8,'long DP drawer');
   await page.screenshot({path:path.join(output,`vertical-drawer-${theme}.png`)});
   await page.keyboard.press('Escape');
   await page.locator('#search').fill('D07'); await page.locator('#search').press('Enter');
   check(await page.evaluate(()=>document.activeElement.dataset.node==='D07'),'search locates distant node');
   const visible=await page.locator('#graph-D07').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>document.querySelector('.site-header').getBoundingClientRect().bottom && r.bottom<document.querySelector('.study-toolbar').getBoundingClientRect().top});
   check(visible,'located final topic clear of overlays');
   await page.locator('#clear-search').click();
   await page.locator('[data-view=A]').click(); await page.locator('#graph-A01').waitFor();
   await page.locator('#fit').click();
   await page.evaluate(()=>window.scrollTo({top:200,behavior:'instant'}));
   const before=await page.evaluate(()=>scrollY);
   await page.mouse.move(260,430); await page.mouse.down(); await page.mouse.move(260,300,{steps:6}); await page.mouse.up();
   check(await page.evaluate(()=>scrollY)>before+50,'background drag scrolls document');
   check(await page.evaluate(()=>getSelection().toString()===''),'background drag does not select SVG text');
   await page.locator('#fit').click();
   const title=await page.locator('#graph-A01 .node-title').first().boundingBox();
   await page.mouse.move(title.x+20,title.y+8); await page.mouse.down(); await page.mouse.move(title.x-70,title.y-110,{steps:8}); await page.mouse.up();
   check(await page.evaluate(()=>scrollY>50),'drag can begin on node title');
   check(await page.evaluate(()=>getSelection().toString()===''),'drag from node never blackens earlier text');
   check(!await page.locator('#topic-dialog').evaluate(el=>el.open),'drag does not activate topic');
   check(!await page.locator('#canvas').evaluate(el=>el.classList.contains('is-dragging')),'drag state clears on pointer release');
   await page.locator('#fit').click(); await page.locator('#graph-A01').click();
   check(await page.locator('#topic-dialog').evaluate(el=>el.open),'normal click still opens topic');
   check(await page.evaluate(()=>getComputedStyle(document.querySelector('#topic-summary')).userSelect!=='none'),'drawer text remains copyable');
   await page.keyboard.press('Escape');
   check(await page.evaluate(()=>document.activeElement.dataset.node==='A01'),'mouse click drawer returns focus to node');
   await page.setViewportSize({width:375,height:812});
   await page.waitForFunction(()=>!document.querySelector('.study-rail').open);
   check(!await page.locator('.study-rail').evaluate(el=>el.open),'mobile breakpoint collapses floating rail');
   await page.setViewportSize({width:720,height:450});
   check(await page.locator('.study-toolbar').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight}),'toolbar fits viewport equivalent to desktop 200% zoom');
   await page.emulateMedia({media:'print'});
   check(!await page.locator('.study-toolbar').isVisible()&&!await page.locator('.study-rail').isVisible(),'print hides controls');
   await page.emulateMedia({media:'screen'});
   await page.setViewportSize({width:1440,height:900});
   await page.locator('.site-header .brand').click(); await page.waitForURL(origin+'/');
   check(await page.locator('.self-study-page').count()===0,'route unmount');
   check(await page.evaluate(()=>getComputedStyle(document.body).overflowX==='hidden'),'document overflow override cleans itself');
   await page.locator('.site-header a[href="/tu-hoc"]').click(); await page.locator('#graph-A01').waitFor();
   check(await page.locator('.study-toolbar').count()===1,'client remount binds once');
   await context.close();
  }
  const noJS=await browser.newContext({javaScriptEnabled:false}); const p=await noJS.newPage(); await p.goto(origin+'/tu-hoc');
  const href=await p.locator('.self-study-roadmap noscript a').getAttribute('href');
  check(href.startsWith('/self-study/notebook/'),'no-JS vertical SVG'); check((await p.request.get(origin+href)).status()===200,'no-JS SVG served');
  check(await p.locator('.study-static-map').isVisible(),'no-JS full map visible'); await noJS.close();
  check(errors.length===0,errors.join('\n'));
  fs.writeFileSync(path.join(output,'vertical-design.json'),JSON.stringify({assertions,layouts,documentScroll:true,svgText:true,print:true,noJS:true,errors},null,2));
  console.log(`PASS vertical design: ${assertions} assertions, ${layouts.length} light/dark layouts.`);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
