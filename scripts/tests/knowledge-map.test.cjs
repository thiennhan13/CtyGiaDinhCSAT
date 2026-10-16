const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(relative) {
  const filename = path.join(root, relative);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = mod.require.bind(mod);
  mod.require = name => name.startsWith('.') && !name.endsWith('.json') ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts'))) : normal(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { knowledgeStages } = load('lib/knowledge-map.ts');
const { matchesKnowledgeTopic } = load('lib/knowledge-map-search.ts');
const curriculum = require('../../lib/learning-curriculum-20260922.json');
const relations = require('../../lib/knowledge-map-links.json');
const topics = knowledgeStages.flatMap(stage => stage.topics);

test('knowledge map preserves the approved curriculum, keeps D topics inside C and has no private article payload', () => {
  const approved = curriculum.flatMap(program => program.stages).flatMap(stage => stage.lessons);
  assert.equal(knowledgeStages.length, 13);
  assert.equal(topics.length, 43);
  assert.deepEqual(topics.map(topic => [topic.code, topic.title, topic.description]), approved.map(topic => [topic.code, topic.title, topic.description]));
  assert.deepEqual(Object.keys(relations).sort(), approved.map(topic => topic.code).sort());
  assert.deepEqual(['A', 'B', 'C'].map(level => knowledgeStages.filter(stage => stage.level === level).flatMap(stage => stage.topics).length), [9, 15, 19]);
  assert.equal(knowledgeStages.filter(stage => stage.level === 'C').flatMap(stage => stage.topics).filter(topic => topic.code.startsWith('D')).length, 7);
  for (const topic of topics) {
    assert.ok(topic.purpose && topic.approach && topic.skill);
    assert.deepEqual(Object.keys(topic).sort(), ['code', 'title', 'description', 'purpose', 'approach', 'skill', 'prerequisites', 'next', 'practiceUrl'].sort());
    const url = new URL(topic.practiceUrl);
    assert.equal(url.origin, 'https://csatoj.vn');
    assert.equal(url.pathname, '/problems/');
    assert.ok(Number(url.searchParams.get('tag')) > 0);
  }
});

test('related knowledge has no broken reference or dependency cycle and can navigate both ways', () => {
  const byCode = new Map(topics.map(topic => [topic.code, topic]));
  function visit(code, ancestors = new Set()) {
    assert.ok(!ancestors.has(code), `Cycle at ${code}`);
    assert.ok(byCode.has(code), `Missing topic ${code}`);
    const next = new Set(ancestors).add(code);
    for (const prerequisite of byCode.get(code).prerequisites) {
      visit(prerequisite, next);
      assert.ok(byCode.get(prerequisite).next.includes(code));
    }
  }
  for (const topic of topics) visit(topic.code);
});

test('student search accepts Vietnamese without accents, topic codes and combined words', () => {
  const find = query => topics.filter(topic => matchesKnowledgeTopic(topic, query)).map(topic => topic.code);
  assert.ok(find('  NHI PHAN ').includes('B14'));
  assert.ok(find('đệ quy').includes('C07'));
  assert.ok(find('de quy').includes('C07'));
  assert.deepEqual(find('d03'), ['D03']);
  assert.ok(find('mang hai').includes('A07'));
  assert.deepEqual(find('zz-no-such-topic'), []);
  assert.equal(find('').length, 43);
});
