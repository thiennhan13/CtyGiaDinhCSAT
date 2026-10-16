// Build the approved notebook presentation; never rewrite the source snapshot.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = require('../lib/self-study-source.json');
const dataFile = Object.keys(source.files).find(name => name.startsWith('roadmap.'));
const nodes = JSON.parse(fs.readFileSync(path.join(root, 'public/self-study', dataFile), 'utf8')).nodes;
const byId = new Map(nodes.map(node => [node.id, node]));
const titles = { full: 'Toàn lộ trình', A: 'Nền tảng C++', B: 'HSG Phường / Xã', C: 'HSG Tỉnh, Chuyên Tin', DP: 'Quy hoạch động' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function wrap(text) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const i = lines.length - 1, candidate = (lines[i] + ' ' + word).trim();
    // Conservative line length also fits Arial when an exported SVG has no Archivo.
    if (candidate.length > 22 && lines[i]) lines.push(word);
    else lines[i] = candidate;
  }
  return lines;
}
function ancestor(a, b, seen = new Set()) {
  if (a === b) return true;
  if (seen.has(b)) return false;
  seen.add(b);
  return byId.get(b).prerequisites.some(id => ancestor(a, id, seen));
}
function layout(view) {
  const scoped = nodes.filter(n => view === 'full' || (view === 'DP' ? n.id.startsWith('D') : n.rank === view));
  const groups = view === 'full' ? ['A', 'B', 'C'] : [view === 'DP' ? 'C' : view];
  const positions = new Map(), boxes = [];
  let offset = 0, width = 0;
  for (const rank of groups) {
    const group = scoped.filter(n => n.rank === rank), ids = new Set(group.map(n => n.id)), depth = new Map();
    function level(n) {
      if (depth.has(n.id)) return depth.get(n.id);
      const value = Math.max(-1, ...n.prerequisites.filter(id => ids.has(id)).map(id => level(byId.get(id)))) + 1;
      depth.set(n.id, value);
      return value;
    }
    group.forEach(level);
    const columns = [];
    for (const n of group) (columns[depth.get(n.id)] ??= []).push(n);
    const order = new Map();
    columns.forEach(col => col.forEach((n, i) => order.set(n.id, i)));
    for (const col of columns) {
      const average = n => {
        const parents = n.prerequisites.filter(id => ids.has(id));
        return parents.length ? parents.reduce((s, id) => s + order.get(id), 0) / parents.length : order.get(n.id);
      };
      col.sort((a, b) => average(a) - average(b));
      col.forEach((n, i) => order.set(n.id, i));
    }
    const breadth = Math.max(...columns.map(col => col.length)), coordinates = new Map();
    const w = columns.length * 310 + 34, h = breadth * 146 + 98;
    columns.forEach((col, d) => {
      let coords = col.map((n, i) => {
        const parents = n.prerequisites.filter(id => coordinates.has(id));
        return parents.length ? parents.reduce((s, id) => s + coordinates.get(id), 0) / parents.length : (breadth - col.length) / 2 + i;
      });
      const desired = coords.reduce((sum, x) => sum + x, 0) / coords.length;
      for (let i = 1; i < coords.length; i++) coords[i] = Math.max(coords[i], coords[i - 1] + 1);
      const adjustment = desired - coords.reduce((sum, x) => sum + x, 0) / coords.length;
      coords = coords.map(x => x + adjustment);
      if (coords.at(-1) - coords[0] > breadth - 1 + .01) coords = col.map((_, i) => (breadth - col.length) / 2 + i);
      if (coords[0] < 0) { const change = -coords[0]; coords = coords.map(x => x + change); }
      if (coords.at(-1) > breadth - 1) { const change = coords.at(-1) - (breadth - 1); coords = coords.map(x => x - change); }
      col.forEach((n, i) => {
        coordinates.set(n.id, coords[i]);
        positions.set(n.id, { x: 42 + d * 310, y: offset + 76 + coords[i] * 146, node: n });
      });
    });
    boxes.push({ rank, x: 12, y: offset + 12, w: w - 10, h: h - 6 });
    offset += h + 38;
    width = Math.max(width, w + 24);
  }
  return { positions, boxes, width, height: offset - 20 };
}
const style = `
.study-map-svg{font-family:Archivo,Arial,sans-serif}
.study-map-svg .node-shadow{fill:#191917}
.study-map-svg .node-face{fill:#fffef9;stroke:#191917;stroke-width:2}
.study-map-svg .node-header{fill:#2b50e0;stroke:#191917;stroke-width:1.5}
.study-map-svg .node-code{font-size:14px;font-weight:700;fill:#fff}
.study-map-svg .node-rank{font-size:10px;font-weight:600;letter-spacing:.7px;fill:#fff}
.study-map-svg .node-title{font-size:18px;font-weight:700;letter-spacing:-.2px;fill:#191917}
.study-map-svg .node-foot{font-size:12px;fill:#65645c}
.study-map-svg .port{fill:#191917;stroke:#fffef9;stroke-width:1.5}
.study-map-svg .edge path{fill:none;stroke:#191917;stroke-width:2}
.study-map-svg .group-box{fill:#fffdf388;stroke:#191917;stroke-width:1}
.study-map-svg .group-label{font-size:11px;font-weight:700;letter-spacing:1px;fill:#191917}
`;
function render(view) {
  const { positions, boxes, width, height } = layout(view);
  let edges = '';
  for (const p of positions.values()) for (const id of p.node.prerequisites) {
    const from = positions.get(id);
    // Match the source's transitive reduction; external prerequisites remain on each card.
    if (!from || from.node.rank !== p.node.rank || p.node.prerequisites.some(other => id !== other && ancestor(id, other))) continue;
    const sx = from.x + 232, sy = from.y + 56, tx = p.x, ty = p.y + 56, middle = (sx + tx) / 2;
    edges += `<g id="edge-${id}-${p.node.id}" class="edge"><path d="M${sx},${sy}H${middle}V${ty}H${tx}" marker-end="url(#study-arrow-${view})"/></g>`;
  }
  const cards = [...positions.values()].map(p => {
    const n = p.node, lines = wrap(n.title);
    if (lines.length > 2) throw Error('Title requires a taller card: ' + n.id);
    const external = n.prerequisites.filter(id => !positions.has(id) || byId.get(id).rank !== n.rank);
    const foot = external.length ? 'Nền: ' + external.join(' · ') : 'Xem chủ đề ↗';
    return `<g class="node" id="graph-${n.id}" transform="translate(${p.x} ${p.y})"><title>${escape(n.summary)}</title><path class="node-shadow" transform="translate(5 5)" d="M0 0H216L232 16V112H0Z"/><path class="node-face" d="M0 0H216L232 16V112H0Z"/><path class="node-header" d="M0 0H216L232 16V36H0Z"/><text class="node-code" x="35" y="27" text-anchor="middle">${n.id}</text><text class="node-rank" x="218" y="27" text-anchor="end">LỚP ${n.rank}</text>${lines.map((line, i) => `<text class="node-title" x="14" y="${57 + i * 21}">${escape(line)}</text>`).join('')}<text class="node-foot" x="14" y="101">${escape(foot)}</text><circle class="port" cx="0" cy="56" r="4"/><circle class="port" cx="232" cy="56" r="4"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="study-map-svg" role="img" aria-labelledby="study-svg-title-${view}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title id="study-svg-title-${view}">${escape(titles[view])} — CSAT</title><style>${style}</style><defs><marker id="study-arrow-${view}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#191917" stroke-width="1.4"/></marker></defs>${boxes.map(b => `<rect class="group-box" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/><text class="group-label" x="${b.x + 22}" y="${b.y + 30}">${escape(view === 'DP' ? 'QUY HOẠCH ĐỘNG' : b.rank + ' / ' + titles[b.rank])}</text>`).join('')}${edges}${cards}</svg>\n`;
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
