const {test} = require('node:test');
const assert = require('node:assert/strict');
const {layoutRoadmap, renderRoadmapSvg} = require('../../lib/roadmap-graph.ts');
const curricula = require('../../lib/learning-curriculum-20260922.json');
const links = require('../../lib/knowledge-map-links.json');

test('vertical roadmap keeps approved long titles inside nonoverlapping cards and stages', () => {
 for (const curriculum of curricula) {
  const nodes = curriculum.stages.flatMap(stage => stage.lessons.map(lesson => ({id:lesson.code, title:lesson.title, group:stage.id, prerequisites:links[lesson.code].prerequisites})));
  const groups = curriculum.stages.map(stage => ({id:stage.id,title:stage.title}));
  const layout = layoutRoadmap(nodes, groups);
  assert.equal(layout.positions.size, nodes.length);
  for (const [index, box] of layout.boxes.entries()) {
   if (index) assert(box.y > layout.boxes[index - 1].y + layout.boxes[index - 1].height);
   const scoped = [...layout.positions.values()].filter(p => p.node.group === box.id);
   for (const card of scoped) {
    assert(card.x >= box.x && card.x + card.width < box.x + box.width);
    assert(card.y > box.y && card.y + card.height < box.y + box.height);
    assert(card.lines.every(line => line.length <= 22));
    assert(57 + (card.lines.length - 1) * 22 < card.height - 24);
    for (const other of scoped) if (other !== card) assert(card.x + card.width < other.x || other.x + other.width < card.x || card.y + card.height < other.y || other.y + other.height < card.y, card.node.id + '/' + other.node.id);
   }
  }
  for (const edge of layout.edges) {
   const from = layout.positions.get(edge.from), to = layout.positions.get(edge.to);
   assert(to.y > from.y + from.height, edge.from + '→' + edge.to);
   assert.equal(from.node.group, to.node.group);
  }
 }
});

test('custom stages do not acquire canonical prerequisite edges; SVG escapes source content and namespaces ids', () => {
 const nodes = [{id:'P001',title:'Nội dung <script>alert("x")</script> & thực hành',group:'custom',prerequisites:[]}];
 const svg = renderRoadmapSvg(nodes,[{id:'custom',title:'Kế hoạch riêng & mục tiêu',current:true}],{idPrefix:'class-1-'});
 assert(!svg.includes('<script>'));
 assert(svg.includes('&lt;script&gt;'));
 assert(svg.includes('id="class-1-graph-P001"'));
 assert(svg.includes('class="map-group group-current"'));
 assert.equal(layoutRoadmap(nodes,[{id:'custom',title:'Kế hoạch riêng'}]).edges.length,0);
 assert.throws(() => layoutRoadmap([nodes[0],nodes[0]],[{id:'custom',title:'K'}]), /Duplicate/);
});

test('invalid cyclic prerequisites are rejected without unbounded recursion', () => {
 const nodes = [{id:'A',title:'A',group:'test',prerequisites:['B']},{id:'B',title:'B',group:'test',prerequisites:['A']}];
 assert.throws(() => layoutRoadmap(nodes,[{id:'test',title:'Test'}]), /cycle/);
});

test('class session pacing handles boundaries, filtered scope, missing values and overshoot without database access', () => {
 const Module = require('node:module'), path = require('node:path'), fs = require('node:fs'), ts = require('typescript');
 const load = filename => {
  const absolute = path.resolve(__dirname, '../../lib', filename), compiled = new Module(absolute, module);
  compiled.filename = absolute; compiled.paths = Module._nodeModulePaths(path.dirname(absolute));
  compiled.require = name => name.startsWith('./') ? load(name + '.ts') : require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(absolute,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, absolute);
  return compiled.exports;
 };
 const {resolveParentCurriculumProgress: resolve} = load('parent-curriculum-progress.ts');
 const template = curricula[0], curriculum = {parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:null};
 const body = {curriculum,stage_index:null};
 const progress = n => ({class_id:'fixture',completed_sessions:n,as_of:'2026-10-17T00:00:00Z'});
 assert.equal(resolve(template,body,progress(0)).preparing,true);
 assert.equal(resolve(template,body,progress(1)).topicCode,'A01');
 const boundary = template.stages[0].lessons.length;
 assert.equal(resolve(template,body,progress(boundary)).stage.id,template.stages[0].id);
 assert.equal(resolve(template,body,progress(boundary+1)).stage.id,template.stages[1].id);
 assert.equal(resolve(template,body,progress(999)).topicCode,'B15');
 assert.equal(resolve(template,{...body,curriculum:{...curriculum,parts:['B'],excluded_topic_codes:['B01']}},progress(1)).topicCode,'B02');
 const published = {...body,curriculum:{...curriculum,current_stage_id:template.stages[2].id}};
 for (const absent of [undefined,null,progress(-1),progress(NaN)]) {
  const value = resolve(template,published,absent);
  assert.equal(value.source,'published'); assert.equal(value.completedSessions,null);
  assert.equal(value.stage.id,template.stages[2].id);
 }
 assert.equal(resolve(template,body).source,'none');
});
test('connectors bend below the tallest card on their row, never through a longer title', () => {
 const nodes = [
  {id:'R1',title:'Ngắn',group:'G',prerequisites:[]},
  {id:'R2',title:'Một tiêu đề dài cần nhiều dòng để giải thích phương pháp phân tích bài toán và các trường hợp biên',group:'G',prerequisites:[]},
  {id:'R3',title:'Nền khác',group:'G',prerequisites:[]},
  {id:'T',title:'Nội dung tiếp theo',group:'G',prerequisites:['R1']},
 ];
 const layout=layoutRoadmap(nodes,[{id:'G',title:'Chặng'}]);
 const edge=layout.edges.find(item=>item.from==='R1');
 const firstBend=Number(edge.path.match(/V([\d.]+)/)[1]);
 const tall=layout.positions.get('R2');
 assert(firstBend>tall.y+tall.height,'Horizontal connector must clear the tallest source-row card');
 assert(firstBend<layout.positions.get('T').y,'Bend stays in row gap');
});
