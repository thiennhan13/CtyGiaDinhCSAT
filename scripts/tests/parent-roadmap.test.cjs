const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {accessibleParentRoadmap,parentRoadmapHref,parentRoadmapLinks}=require('../../lib/parent-roadmap.ts');
if(previous)require.extensions['.ts']=previous;else delete require.extensions['.ts'];
const standard=require('../../lib/learning-curriculum-20260922.json')[0];
function fixture(){return {student:{student_id:'authorized-student'},plans:[{class_id:'authorized-class',kind:'class',published_at:'2026-11-05T00:00:00Z',template:{...structuredClone(standard),template_id:'template'},body:{program:'basic',template_id:'template',curriculum:{parts:['B'],excluded_stage_ids:[],excluded_topic_codes:['B01'],current_stage_id:null}}}]};}
test('standalone roadmap accepts only a published class plan in the authorized portal projection',()=>{
 const portal=fixture();assert.equal(accessibleParentRoadmap(portal,'authorized-class'),portal.plans[0]);assert.equal(accessibleParentRoadmap(portal,'another-class'),null);
 portal.plans[0].kind='student';assert.equal(accessibleParentRoadmap(portal,'authorized-class'),null);
 portal.plans[0].kind='class';portal.plans[0].published_at=null;assert.equal(accessibleParentRoadmap(portal,'authorized-class'),null);
 portal.student=null;assert.equal(accessibleParentRoadmap(portal,'authorized-class'),null);
});
test('roadmap links preserve parent context and expose only the effective canonical topics',()=>{
 const plan=fixture().plans[0],context={student:'authorized-student',classId:'authorized-class',month:'2026-11',page:2,unsafe:'ignored'};
 const url=new URL(parentRoadmapHref(context),'https://example.test');assert.equal(url.pathname,'/parents/roadmap/authorized-class');assert.equal(url.searchParams.get('student'),'authorized-student');assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.has('unsafe'),false);
 const links=parentRoadmapLinks(plan,context);assert(links.canonical);assert.equal(links.articleLinks.A01,undefined);assert.equal(links.articleLinks.B01,undefined);assert(links.articleLinks.B02.includes('class=authorized-class'));
 plan.template.stages[0].lessons[0].title='Nội dung riêng';assert.deepEqual(parentRoadmapLinks(plan,context),{canonical:false,articleLinks:{},practiceLinks:{}});
});
