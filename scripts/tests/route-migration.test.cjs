const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');
const aliases=require('../../lib/route-aliases.json');
function config(){
 const file=path.resolve(__dirname,'../../next.config.ts'),mod=new Module(file,module);
 mod.paths=Module._nodeModulePaths(path.dirname(file));
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,file);
 return mod.exports.default;
}
test('every private document has a unique English address without renaming its content key',()=>{
 const files=fs.readdirSync(path.resolve(__dirname,'../../content/parent-topics')).filter(p=>p.endsWith('.md')).map(p=>p.slice(0,-3));
 assert.deepEqual(Object.keys(aliases.topics).sort(),files.sort());
 assert.equal(new Set(Object.values(aliases.topics)).size,54);
 for(const [key,slug] of Object.entries(aliases.topics)){
  assert.equal(key.split('-')[0],slug.split('-')[0]);
  assert.match(slug,/^[a-z0-9-]+$/);
 }
});
test('old public and private addresses redirect directly to their canonical destination',async()=>{
 const rules=await config().redirects();
 const exact=new Map(rules.map(r=>[r.source,r.destination]));
 for(const [old,next]of Object.entries(aliases.pages))assert.equal(exact.get('/'+old),'/'+next);
 for(const [old,next]of Object.entries(aliases.topics)){
  for(const area of ['parent','parents'])assert.equal(exact.get('/'+area+'/chuyen-de/'+old),'/parents/topics/'+next);
 }
 for(const [old,next]of Object.entries(aliases.posts))assert.equal(exact.get('/bai-dang/'+old),'/posts/'+next);
 assert.ok(rules.every(r=>r.permanent && r.source!==r.destination));
 for(const rule of rules)assert.ok(!exact.has(rule.destination),'redirect chain: '+rule.source);
 assert.deepEqual(config().outputFileTracingIncludes['/parents/topics/*'],['./content/parent-topics/*.md']);
});
test('public tutor directory contains selected professional fields only and metadata-free optimized images',async()=>{
 const sharp=require('sharp'),team=require('../../lib/public-team.json');
 assert.equal(team.length,10);
 for(const tutor of team){
  assert.deepEqual(Object.keys(tutor).sort(),['name','image','school','cohort','university','username','achievements'].sort());
  assert.ok(tutor.name&&tutor.school&&tutor.username&&tutor.achievements.length);
  assert.doesNotMatch(JSON.stringify(tutor),/@|facebook\.com|zalo|GS\d{3}|\b0\d{9}\b/i);
  const image=path.resolve(__dirname,'../../public'+tutor.image);
  const metadata=await sharp(image).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.width,288);assert.equal(metadata.height,288);
  assert.equal(metadata.exif,undefined);assert.equal(metadata.xmp,undefined);assert.ok(fs.statSync(image).size<40000);
 }
});
