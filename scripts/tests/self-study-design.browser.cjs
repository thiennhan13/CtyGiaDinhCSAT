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
const widths = [320, 375, 680, 681, 768, 1000, 1050, 1051, 1280, 1440, 1920];
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
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1080 });
        await page.goto(origin + '/tu-hoc');
        await page.locator('#stage [data-node]').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), theme + '/' + width + ' overflow');
        check(await page.locator('[data-site-background]').count() === 1, 'shared site background');
        check(await page.locator('.self-study-roadmap').evaluate(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'), 'transparent page surface');
        check(await page.locator('#canvas').evaluate(el => getComputedStyle(el).backgroundImage.includes('linear-gradient')), 'ruled paper canvas');
        check(await page.locator('#stage>svg').getAttribute('role') === 'group', 'interactive children exposed');
        const labels = await page.locator('.svg-node').evaluateAll(elements => elements.map(el => ({ id: el.dataset.node, title: [...el.querySelectorAll('.node-title')].map(t => t.textContent).join(' ') })).sort((a, b) => a.id.localeCompare(b.id)));
        const expected = nodes.map(n => ({ id: n.id, title: n.title })).sort((a, b) => a.id.localeCompare(b.id));
        assertions++; assert.deepEqual(labels, expected, 'all titles preserved');
        const textIssues = await page.locator('.svg-node').evaluateAll(elements => {
          const issues = [];
          for (const node of elements) {
            const foot = node.querySelector('.node-foot').getBBox();
            for (const text of node.querySelectorAll('text')) {
              const r = text.getBBox();
              if (r.x < 7 || r.x + r.width > 224 || r.y < 3 || r.y + r.height > 108) issues.push(node.dataset.node + ': ' + text.textContent);
              if (text.classList.contains('node-title') && (r.y < 37 || r.y + r.height > foot.y - 1)) issues.push(node.dataset.node + ': header/footer collision');
            }
          }
          return issues;
        });
        assertions++; assert.deepEqual(textIssues, [], 'SVG text fits ' + theme + '/' + width);
        await page.locator('.study-enrollment').scrollIntoViewIfNeeded();
        check(await page.locator('.study-enrollment-art svg').count() === 6, 'six decorative icons');
        const collisions = await page.locator('.study-enrollment').evaluate(section => {
          const text = [...section.querySelectorAll('h2,p,a')].map(el => el.getBoundingClientRect());
          return [...section.querySelectorAll('.study-enrollment-art svg')].filter(icon => {
            const a = icon.getBoundingClientRect();
            return text.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          }).map(el => el.getAttribute('class'));
        });
        assertions++; assert.deepEqual(collisions, [], 'CTA icons never overlap text ' + width);
        const highlight = await page.locator('#study-enrollment-title span').evaluate(el => {
          const before = getComputedStyle(el, ':before'), box = el.getBoundingClientRect();
          return { horizontal: Math.abs(parseFloat(before.left)) * 2 / box.width, height: (box.height - parseFloat(before.top) - parseFloat(before.bottom)) / box.height };
        });
        check(highlight.horizontal < .1 && highlight.height > .8 && highlight.height < .95, 'compact highlight');
        check(await page.locator('.study-enrollment a').getAttribute('href') === '/lo-trinh#tu-van', 'unchanged registration target');
        if ([375, 1440].includes(width)) await page.screenshot({ path: path.join(output, `notebook-enrollment-${theme}-${width}.png`) });
        layouts.push({ theme, width });
      }
      await page.setViewportSize({ width: 1440, height: 1080 });
      await page.goto(origin + '/tu-hoc#view=DP');
      await page.locator('#graph-D07').waitFor();
      await page.screenshot({ path: path.join(output, `notebook-${theme}-desktop.png`) });
      // Locate closes the drawer and returns focus to the selected node in the full map.
      await page.locator('#graph-D06').press('Enter');
      await page.locator('#topic-details summary').click();
      check(await page.locator('#detail-list li').count() === 8, 'long DP details');
      await page.screenshot({ path: path.join(output, `notebook-drawer-${theme}.png`) });
      await page.keyboard.press('Escape');
      await page.locator('[data-view=full]').click();
      await page.locator('#graph-A01').waitFor();
      await page.locator('#canvas').evaluate(el => el.scrollTop = 200);
      const before = await page.locator('#canvas').evaluate(el => el.scrollTop);
      const canvas = await page.locator('#canvas').boundingBox();
      await page.mouse.move(canvas.x + 5, canvas.y + 250);
      await page.mouse.down(); await page.mouse.move(canvas.x + 5, canvas.y + 140, { steps: 6 }); await page.mouse.up();
      check(await page.locator('#canvas').evaluate(el => el.scrollTop) > before + 50, 'drag map background');
      await page.setViewportSize({ width: 720, height: 600 });
      await page.evaluate(() => document.body.style.zoom = '2');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'zoom200');
      await page.evaluate(() => document.body.style.zoom = '');
      await page.emulateMedia({ media: 'print' });
      check(!await page.locator('.controls').isVisible() && !await page.locator('.study-enrollment').isVisible(), 'print controls hidden');
      await context.close();
    }
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const p = await noJS.newPage();
    await p.goto(origin + '/tu-hoc');
    const href = await p.locator('.self-study-roadmap noscript a').getAttribute('href');
    check(href.startsWith('/self-study/notebook/'), 'no-JS new SVG');
    check((await p.request.get(origin + href)).status() === 200, 'no-JS SVG served');
    await noJS.close();
    check(errors.length === 0, errors.join('\n'));
    fs.writeFileSync(path.join(output, 'notebook-design.json'), JSON.stringify({ assertions, layouts, svgText: true, sharedBackground: true, ruledMap: true, enrollmentIcons: 6, compactHighlight: true, drag: true, print: true, noJS: true, zoom200: true, errors }, null, 2));
    console.log(`PASS notebook design: ${assertions} assertions, ${layouts.length} light/dark layouts; SVG typography, shared background, CTA, drag, no-JS, print, zoom200.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
