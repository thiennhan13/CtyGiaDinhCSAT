const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const cache=new Map();
function load(relative){
 const filename=path.resolve(root,relative);
 if(cache.has(filename))return cache.get(filename);
 const compiled=new Module(filename,module);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(path.dirname(filename));
 const normalRequire=compiled.require.bind(compiled);
 compiled.require=name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):normalRequire(name);
 compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
 cache.set(filename,compiled.exports);return compiled.exports;
}
const seo=load('lib/public-seo.ts');
const schema=load('lib/public-structured-data.ts');
const {publicCourses}=load('lib/public-courses.ts');
const {publicPosts}=load('lib/public-posts.ts');

test('sitemap contains canonical public catalog and posts, never aliases or private curriculum',()=>{
 const entries=load('app/sitemap.ts').default();
 assert.equal(entries.length,8+publicCourses.length+publicPosts.length);
 assert.ok(entries.some(e=>e.url===seo.publicUrl('/tu-hoc')));
 assert.equal(new Set(entries.map(e=>e.url)).size,entries.length);
 for(const entry of entries){const url=new URL(entry.url);assert.equal(url.origin,seo.publicSiteOrigin);assert.equal(url.search,'');assert.equal(url.hash,'');assert.ok(!/\/(parents|admin|tutor|login|api)(\/|$)/.test(url.pathname));assert.equal(entry.lastModified,undefined);}
 for(const course of publicCourses)assert.ok(entries.some(e=>e.url===seo.publicUrl('/lo-trinh/'+course.code.toLowerCase())));
 assert.ok(!entries.some(e=>/advanced|basic|custom|prevoi/.test(e.url)));
 const robots=load('app/robots.ts').default();assert.ok(!robots.rules.disallow.includes('/login'));assert.ok(robots.rules.disallow.includes('/parents'));assert.equal(robots.sitemap,seo.publicUrl('/sitemap.xml'));
});

test('sharing metadata uses authored summaries and the same canonical URL, with no query context',()=>{
 for(const course of publicCourses){const description=seo.publicCourseDescriptions[course.code];assert.ok(description.length>=100&&description.length<=190);const meta=seo.publicPageMetadata({path:'/lo-trinh/'+course.code.toLowerCase(),title:course.name,description});assert.equal(meta.alternates.canonical,meta.openGraph.url);assert.equal(meta.openGraph.description,description);assert.equal(meta.twitter.card,'summary_large_image');assert.equal(meta.openGraph.images[0].width,1200);assert.equal(meta.openGraph.images[0].height,630);assert.equal(meta.robots.index,true);}
 assert.match(seo.publicCourseDescriptions.E,/không bắt buộc học xong C/);
 assert.equal(seo.publicPrivateRobots.index,false);
 const file=fs.readFileSync(path.join(root,'public/images/site/csat-share.png'));assert.equal(file.readUInt32BE(16),1200);assert.equal(file.readUInt32BE(20),630);
});

test('schema matches real catalog, excludes invented course offers and keeps E/K out of Course',()=>{
 const home=schema.homeStructuredData()['@graph'];assert.equal(home[0]['@type'],'EducationalOrganization');assert.equal(home[1].publisher['@id'],home[0]['@id']);
 const graph=schema.courseListStructuredData()['@graph'];assert.equal(graph.filter(e=>e['@type']==='Course').length,3);
 const list=graph.find(e=>e['@type']==='ItemList');assert.equal(list.itemListElement.length,3);
 for(const course of publicCourses){const [entity,crumb]=schema.courseStructuredData(course.code)['@graph'];assert.equal(entity['@type'],['E','K'].includes(course.code)?'WebPage':'Course');assert.equal(entity.description,seo.publicCourseDescriptions[course.code]);assert.equal(entity.offers,undefined);assert.equal(entity.aggregateRating,undefined);assert.equal(crumb.itemListElement.at(-1).item,entity.url);}
 for(const post of publicPosts){const article=schema.postStructuredData(post);assert.equal(article.headline,post.title);assert.equal(article.image,seo.publicUrl(post.image));assert.equal(article.datePublished,undefined);assert.equal(article.author.name,'CSAT Tutor');for(const link of post.relatedLinks)assert.ok(seo.publicPagePaths.includes(new URL(link.href,seo.publicSiteOrigin).pathname));}
});

test('JSON-LD cannot close its script element and still parses to the original authored data',()=>{
 const input={text:'</script><script>alert("example")</script>&<>',name:'Thuật toán'};
 const encoded=schema.structuredDataJson(input);assert.ok(!/[<>&]/.test(encoded));assert.deepEqual(JSON.parse(encoded),input);
});

test('llms.txt is public text with actual course links and no private articles or internal docs',async()=>{
 const response=load('app/llms.txt/route.ts').GET();assert.match(response.headers.get('content-type'),/text\/plain; charset=utf-8/);
 const text=await response.text();assert.ok(text.startsWith('# CSAT Tutor\n'));
 for(const course of publicCourses)assert.ok(text.includes(seo.publicUrl('/lo-trinh/'+course.code.toLowerCase())));
 assert.ok(!/\/parents|\/admin|\/tutor|\/docs|chuyen-de/.test(text));
});
