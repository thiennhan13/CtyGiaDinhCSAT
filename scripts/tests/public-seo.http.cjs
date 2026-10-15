// Inspect production-build HTML without launching a browser or submitting forms.
const assert=require('node:assert/strict');
const origin=new URL(process.env.PUBLIC_QA_BASE_URL||'http://127.0.0.1:3100');
if(!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||origin.protocol!=='http:')throw Error('SEO checks require an isolated loopback server.');
const canonical='https://portal.csatoj.vn';
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'");
function attr(tag,name){return decode(tag.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1]||'');}
function meta(html,key){const tag=(html.match(/<meta\b[^>]*>/g)||[]).find(tag=>attr(tag,'name')===key||attr(tag,'property')===key);return tag?attr(tag,'content'):'';}
function link(html,rel){const tag=(html.match(/<link\b[^>]*>/g)||[]).find(tag=>attr(tag,'rel')===rel);return tag?attr(tag,'href'):'';}
async function get(path){return fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(20000)});}
async function main(){
 const response=await get('/sitemap.xml');assert.equal(response.status,200);const xml=await response.text();
 const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));assert.equal(urls.length,15);assert.equal(new Set(urls).size,15);
 const pages=new Map(),titles=new Set();let image='';
 for(const url of urls){
  const parsed=new URL(url);assert.equal(parsed.origin,canonical);assert.equal(parsed.search,'');assert.ok(!/\/(parents|admin|tutor|login|api)(\/|$)/.test(parsed.pathname));
  const r=await get(parsed.pathname);assert.equal(r.status,200,parsed.pathname);
  assert.equal(r.headers.get('x-content-type-options'),'nosniff',parsed.pathname);
  assert.equal(r.headers.get('x-frame-options'),'DENY',parsed.pathname);
  assert.equal(r.headers.get('referrer-policy'),'strict-origin-when-cross-origin',parsed.pathname);
  assert.match(r.headers.get('content-security-policy-report-only')||'',/object-src 'none'/,parsed.pathname);
  assert.equal(r.headers.get('content-security-policy'),null,'CSP remains observation-only');
  const html=await r.text(),body=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');pages.set(parsed.pathname,body);
  assert.equal(link(html,'canonical'),url);assert.ok(!/noindex/.test(meta(html,'robots')));assert.ok(!/noindex/.test(r.headers.get('x-robots-tag')||''));
  const title=decode(html.match(/<title>(.*?)<\/title>/)?.[1]||'');assert.ok(title);assert.ok(!titles.has(title));titles.add(title);
  assert.ok(meta(html,'description'));assert.equal(meta(html,'og:title'),title);assert.equal(meta(html,'og:description'),meta(html,'description'));assert.equal(meta(html,'og:url'),url);assert.equal(meta(html,'og:locale'),'vi_VN');assert.equal(meta(html,'twitter:card'),'summary_large_image');
  assert.equal(meta(html,'og:type'),parsed.pathname.startsWith('/bai-dang/')?'article':'website');image=meta(html,'og:image');assert.equal(image,canonical+'/images/site/csat-share.png');
  assert.equal((body.match(/<h1\b/g)||[]).length,1);assert.ok((body.match(/<img\b[^>]*>/g)||[]).every(tag=>/\balt="/.test(tag)),'Missing alt '+parsed.pathname);
  let previous=0;for(const heading of body.matchAll(/<h([1-6])\b[^>]*>/g)){const level=Number(heading[1]);assert.ok(!previous||level<=previous+1,'Heading skips a level '+parsed.pathname);previous=level;}
  const graphs=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const parsed=JSON.parse(m[1]);return parsed['@graph']||[parsed];});
  if(parsed.pathname==='/')assert.ok(graphs.some(g=>g['@type']==='EducationalOrganization')&&graphs.some(g=>g['@type']==='WebSite'));
  if(parsed.pathname==='/lo-trinh')assert.equal(graphs.filter(g=>g['@type']==='Course').length,3);
  if(/^\/lo-trinh\/[abcek]$/.test(parsed.pathname)){assert.ok(graphs.some(g=>g['@type']==='BreadcrumbList'));assert.ok(graphs.some(g=>g['@type']===(/[ek]$/.test(parsed.pathname)?'WebPage':'Course')));}
  if(parsed.pathname.startsWith('/bai-dang/'))assert.ok(graphs.some(g=>g['@type']==='BlogPosting'));
 }
 const checked=new Set();
 for(const [source,html]of pages){for(const tag of html.match(/<a\b[^>]*>/g)||[]){const href=attr(tag,'href');if(!href)continue;const url=new URL(href,new URL(source,origin));if(url.origin!==origin.origin)continue;
  if(url.hash&&pages.has(url.pathname)){const id=decodeURIComponent(url.hash.slice(1));assert.ok((pages.get(url.pathname).match(/\bid="([^"]*)"/g)||[]).some(tag=>attr(tag,'id')===id),'Broken anchor '+source+' -> '+href);}
  if(['/login','/parents','/admin','/tutor'].some(p=>url.pathname===p||url.pathname.startsWith(p+'/'))||pages.has(url.pathname)||checked.has(url.pathname))continue;
  checked.add(url.pathname);assert.ok((await get(url.pathname)).status<400,'Broken link '+href);
 }}
 for(const [alias,target]of Object.entries({'nang-cao':'/lo-trinh/c',advanced:'/lo-trinh/c',custom:'/lo-trinh/k','tuy-chinh':'/lo-trinh/k','co-ban':'/lo-trinh',basic:'/lo-trinh',hsgqg:'/dang-ky-hoc#thong-tin',voi:'/dang-ky-hoc#thong-tin',prevoi:'/dang-ky-hoc#thong-tin'})){
  const r=await get('/lo-trinh/'+alias);assert.equal(r.status,308,alias);assert.equal(new URL(r.headers.get('location'),origin).href,new URL(target,origin).href);
 }
 const alias=await get('/lo-trinh/advanced?level=thpt&goal=province&background=practice&unknown=ignored');assert.equal(new URL(alias.headers.get('location'),origin).search,'?level=thpt&goal=province&background=practice');
 const query=await get('/dang-ky-hoc?course=B');const queryHtml=await query.text();assert.equal(link(queryHtml,'canonical'),canonical+'/dang-ky-hoc');assert.equal(meta(queryHtml,'og:url'),canonical+'/dang-ky-hoc');
 for(const path of ['/login','/parents','/admin/dashboard','/tutor/dashboard','/tutor']){const r=await get(path);assert.match(r.headers.get('x-robots-tag')||'',/noindex/,path);if(r.status===200)assert.match(meta(await r.text(),'robots'),/noindex/,path);}
 for(const path of ['/bai-dang/khong-ton-tai','/lo-trinh/khong-ton-tai','/khong-ton-tai'])assert.equal((await get(path)).status,404,path);
 const robots=await(await get('/robots.txt')).text();assert.ok(!robots.includes('Disallow: /login'));assert.ok(robots.includes('Disallow: /parents'));assert.ok(robots.includes('Sitemap: '+canonical+'/sitemap.xml'));
 const llms=await get('/llms.txt');assert.equal(llms.status,200);assert.match(llms.headers.get('content-type'),/text\/plain/);const content=await llms.text();assert.ok(!/\/parents|\/admin|\/docs|chuyen-de/.test(content));
 const verification=await get('/google8e5ffbef59a10505.html');assert.equal(verification.status,200);assert.equal((await verification.text()).trim(),'google-site-verification: google8e5ffbef59a10505.html');assert.ok(!/noindex/.test(verification.headers.get('x-robots-tag')||''));
 for(const match of content.matchAll(/\]\((https:\/\/[^)]+)\)/g))assert.ok(pages.has(new URL(match[1]).pathname));
 const img=await get(new URL(image).pathname);assert.equal(img.status,200);assert.match(img.headers.get('content-type'),/image\/png/);const png=Buffer.from(await img.arrayBuffer());assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 const expected=process.env.GOOGLE_SITE_VERIFICATION||'';const home=await(await get('/')).text();assert.equal(meta(home,'google-site-verification'),expected);for(const [path,html]of pages)if(path!=='/')assert.equal(meta(html,'google-site-verification'),'');
 console.log(JSON.stringify({passed:true,publicPages:pages.size,additionalLinks:checked.size,aliases:9,privatePaths:5,browserQa:'deferred',performanceBaseline:'deferred'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
