const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const original = require.extensions['.ts'];
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const filename = path.join(root, 'lib/parent-topics.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
if (original) require.extensions['.ts'] = original; else delete require.extensions['.ts'];
const { accessibleParentTopic, parentTopicArticles, articlesForTopic, isParentTopicFramework, parentTopicHref, parentTopicReturnHref } = compiled.exports;
const frameworks = require('../../lib/learning-curriculum-20260922.json');
function fixture() {
  return { student: { student_id: 'student-test' }, plans: frameworks.map((standard, index) => ({
    class_id: 'class-' + index, kind: 'class', published_at: '2026-10-08T00:00:00Z',
    template: { ...structuredClone(standard), template_id: 'template-' + index, version: 2 },
    body: { program: standard.program, template_id: 'template-' + index, curriculum: { parts: ['A', 'B'], excluded_stage_ids: [], excluded_topic_codes: [], current_stage_id: null } },
  })) };
}
test('private topic access follows published effective framework, not names or topic codes alone', () => {
  const portal = fixture(), plan = portal.plans[0];
  assert.ok(accessibleParentTopic(portal, 'class-0', 'a04-cau-truc-lap'));
  assert.equal(accessibleParentTopic(portal, 'class-1', 'a04-cau-truc-lap'), null);
  assert.equal(accessibleParentTopic(portal, 'unknown', 'a04-cau-truc-lap'), null);
  assert.equal(accessibleParentTopic(portal, 'class-0', '../../README'), null);
  plan.body.curriculum.parts = ['B'];
  assert.equal(accessibleParentTopic(portal, 'class-0', 'a04-cau-truc-lap'), null);
  assert.ok(accessibleParentTopic(portal, 'class-0', 'b14-tim-kiem-nhi-phan'));
  plan.body.curriculum.excluded_topic_codes = ['B14'];
  assert.equal(accessibleParentTopic(portal, 'class-0', 'b14-tim-kiem-nhi-phan'), null);
  plan.body.curriculum.excluded_topic_codes = [];
  plan.body.curriculum.excluded_stage_ids = ['basic-b-4'];
  assert.equal(accessibleParentTopic(portal, 'class-0', 'b14-tim-kiem-nhi-phan'), null);
  const clean = fixture();
  clean.plans[0].published_at = null;
  assert.equal(accessibleParentTopic(clean, 'class-0', 'a04-cau-truc-lap'), null);
  clean.plans[0].published_at = '2026-10-08';
  clean.plans[0].kind = 'student';
  assert.equal(accessibleParentTopic(clean, 'class-0', 'a04-cau-truc-lap'), null);
  clean.student = null;
  assert.equal(accessibleParentTopic(clean, 'class-1', 'd03-cai-tui-01'), null);
});
test('JSONB key ordering and display names do not affect match, edited or legacy frameworks remain separate', () => {
  const { template, body } = fixture().plans[0];
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)])) : value;
  assert.equal(isParentTopicFramework(reorder(template), body), true);
  template.title = 'Tên hiển thị khác';
  assert.equal(isParentTopicFramework(template, body), true);
  template.stages[0].lessons[0].description += ' · nội dung tùy chỉnh';
  assert.equal(isParentTopicFramework(template, body), false);
  assert.equal(isParentTopicFramework(null, body), false);
  const other = fixture().plans[0];
  other.body.template_id = 'snapshot-other';
  assert.equal(isParentTopicFramework(other.template, other.body), false);
});
test('54 articles cover the 43 canonical topics, with intact series and no orphan files', () => {
  const canonicalCodes = frameworks.flatMap(program => program.stages.flatMap(stage => stage.lessons.map(lesson => lesson.code)));
  assert.equal(canonicalCodes.length, 43);
  assert.equal(parentTopicArticles.length, 54);
  assert.equal(new Set(parentTopicArticles.map(article => article.slug)).size, 54);
  assert.deepEqual([...new Set(parentTopicArticles.map(article => article.topicCode))].sort(), [...canonicalCodes].sort());
  const splitCounts = { B09: 4, C01: 2, C07: 3, C09: 2, C11: 2, D03: 2, D06: 2, D07: 2 };
  assert.deepEqual(fs.readdirSync(path.join(root, 'content/parent-topics')).filter(file => file.endsWith('.md')).sort(), parentTopicArticles.map(article => article.slug + '.md').sort());
  for (const code of new Set(parentTopicArticles.map(article => article.topicCode))) {
    assert.ok(canonicalCodes.includes(code));
    const series = articlesForTopic(code);
    assert.equal(series.length, splitCounts[code] || 1);
    assert.deepEqual(series.map(article => article.order), series.map((_, i) => i + 1));
    for (const article of series) {
      const content = fs.readFileSync(path.join(root, 'content/parent-topics', article.slug + '.md'), 'utf8');
      assert.match(content, /^## .*Tư duy/im);
      assert.match(content, /^## .*Nội dung học/im);
      assert.match(content, /```(?:cpp|text|pseudocode)/);
      assert.match(content, /https:\/\//);
      assert.match(content, /^## Nguồn tham khảo thêm\s*$/m);
      assert.doesNotMatch(content, /Hiểu bài và đồng hành|C\+\+\s*(?:11|14|17|20|23)/);
      const cpp = [...content.matchAll(/```cpp\n([\s\S]*?)```/g)].map(match => match[1]);
      for (const code of cpp) {
        assert.doesNotMatch(code, /std::/, article.slug + ': namespace std is implicit');
        assert.doesNotMatch(code, /using\s+namespace\s+std\s*;/, article.slug + ': omit the implicit namespace declaration');
      }
    }
  }
});
test('each article has two closed native questions with full answers, without authoring HTML', async () => {
  const { unified } = await import('unified');
  const { default: remarkParse } = await import('remark-parse');
  const { default: remarkRehype } = await import('remark-rehype');
  const { default: remarkGfm } = await import('remark-gfm');
  const questionFile = path.join(root, 'lib/parent-topic-questions.ts');
  const questionModule = new Module(questionFile, module);
  questionModule._compile(ts.transpileModule(fs.readFileSync(questionFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, questionFile);
  const { prepareParentQuestions } = questionModule.exports;
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  const text = node => node.type === 'text' ? node.value : (node.children || []).map(text).join('');
  const elements = node => [node, ...(node.children || []).flatMap(elements)];
  for (const article of parentTopicArticles) {
    const markdown = fs.readFileSync(path.join(root, 'content/parent-topics', article.slug + '.md'), 'utf8');
    assert.doesNotMatch(markdown, /^\s*<(?:details|summary|script|iframe)\b/im);
    const tree = await processor.run(processor.parse(markdown));
    prepareParentQuestions(tree);
    const questions = elements(tree).filter(node => node.tagName === 'details');
    assert.equal(questions.length, 2, article.slug);
    questions.forEach((question, index) => {
      assert.equal(question.properties.open, undefined, 'answers start closed');
      assert.equal(question.children[0].tagName, 'summary');
      assert.match(text(question.children[0]), new RegExp('^Câu hỏi ' + (index + 1) + ':'));
      assert.ok(text(question.children[1]).trim().length > 40, 'answer explains the reasoning');
    });
  }
  const ordinary = await processor.run(processor.parse('> Một nhận xét bình thường.\n\n> **Câu hỏi 1:** thiếu đáp án.'));
  prepareParentQuestions(ordinary);
  assert.equal(elements(ordinary).filter(node => node.tagName === 'details').length, 0, 'ordinary or incomplete quotes remain readable quotes');
});
test('article and return navigation preserve whitelisted parent context', () => {
  const context = { student: 'student', classId: 'class', month: '2026-09', page: 2 };
  const url = new URL(parentTopicHref('d03-cai-tui-01', context), 'https://test.invalid');
  assert.equal(url.searchParams.get('student'), 'student');
  assert.equal(url.searchParams.get('class'), 'class');
  assert.equal(url.searchParams.get('month'), '2026-09');
  assert.equal(url.searchParams.get('page'), '2');
  const back = new URL(parentTopicReturnHref(context), url);
  assert.equal(back.pathname, '/parents');
  assert.equal(back.hash, '#roadmap');
  assert.equal(back.searchParams.get('page'), '2');
  assert.deepEqual([...url.searchParams.keys()], ['student', 'class', 'month', 'page']);
});
