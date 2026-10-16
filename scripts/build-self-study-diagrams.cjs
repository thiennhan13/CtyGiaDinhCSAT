// Build the approved notebook presentation; never rewrite the source snapshot.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = require('../lib/self-study-source.json');
const dataFile = Object.keys(source.files).find(name => name.startsWith('roadmap.'));
const nodes = JSON.parse(fs.readFileSync(path.join(root, 'public/self-study', dataFile), 'utf8')).nodes;
const { renderRoadmapSvg } = require('../lib/roadmap-graph.ts');
const titles = { full: 'Toàn lộ trình', A: 'Nền tảng C++', B: 'HSG Phường / Xã', C: 'HSG Tỉnh, Chuyên Tin', DP: 'Quy hoạch động' };
function render(view) {
  const scoped = nodes.filter(n => view === 'full' || (view === 'DP' ? n.id.startsWith('D') : n.rank === view));
  const ranks = view === 'full' ? ['A', 'B', 'C'] : [view === 'DP' ? 'C' : view];
  return renderRoadmapSvg(scoped.map(n => ({ id: n.id, title: n.title, group: n.rank, prerequisites: n.prerequisites,
    foot: n.prerequisites.some(id => !scoped.some(other => other.id === id && other.rank === n.rank))
      ? 'Nền: ' + n.prerequisites.filter(id => !scoped.some(other => other.id === id && other.rank === n.rank)).join(' · ')
      : 'Xem chủ đề ↗' })), ranks.map(rank => ({ id: rank, title: view === 'DP' ? 'QUY HOẠCH ĐỘNG' : rank + ' / ' + titles[rank] })), {title: titles[view] + ' — CSAT'});
}
const directory = path.join(root, 'public/self-study/notebook');
fs.mkdirSync(directory, { recursive: true });
const diagrams = {};
for (const view of Object.keys(titles)) {
  const svg = render(view), hash = createHash('sha256').update(svg).digest('hex').slice(0, 12);
  const name = `diagram-${view}.${hash}.svg`;
  fs.writeFileSync(path.join(directory, name), svg);
  diagrams[view] = '/self-study/notebook/' + name;
}
fs.writeFileSync(path.join(root, 'lib/self-study-diagrams.json'), JSON.stringify(diagrams, null, 2) + '\n');
console.log('Built 5 notebook SVGs from the unchanged 43-topic source snapshot.');
