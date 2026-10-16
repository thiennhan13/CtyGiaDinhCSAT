/** Presentation-only geometry. It does not infer mastery or change curriculum order. */
export interface RoadmapNode { id: string; title: string; prerequisites: string[]; group: string; foot?: string }
export interface RoadmapGroup { id: string; title: string; current?: boolean }
export interface RoadmapPosition { x: number; y: number; width: number; height: number; lines: string[]; node: RoadmapNode }
export interface RoadmapBox extends RoadmapGroup { x: number; y: number; width: number; height: number; lines: string[] }
const CARD = 232, GAP = 52, ROW_GAP = 76;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Conservative wrapping fits Archivo as well as the standalone Arial fallback. */
function wrap(text: string, limit: number): string[] {
 const lines: string[] = [];
 let line = '';
 for (const original of text.trim().split(/\s+/)) {
  const chunks = original.match(new RegExp('.{1,' + limit + '}', 'gu')) ?? [''];
  for (const word of chunks) {
   if (line && (line + ' ' + word).length > limit) { lines.push(line); line = word; }
   else line = (line + ' ' + word).trim();
  }
 }
 if (line || !lines.length) lines.push(line);
 return lines;
}

export function layoutRoadmap(nodes: RoadmapNode[], groups: RoadmapGroup[]) {
 const byId = new Map(nodes.map(node => [node.id, node]));
 if (byId.size !== nodes.length) throw new Error('Duplicate roadmap node id');
 const positions = new Map<string, RoadmapPosition>();
 const boxes: RoadmapBox[] = [];
 const depths = new Map<string, number>();
 const rowBottoms = new Map<string, number>();
 let top = 12, width = 320;
 for (const group of groups) {
  const scoped = nodes.filter(node => node.group === group.id);
  if (!scoped.length) continue;
  const visiting = new Set<string>();
  const level = (node: RoadmapNode): number => {
   if (depths.has(node.id)) return depths.get(node.id)!;
   if (visiting.has(node.id)) throw new Error('Roadmap prerequisites contain a cycle');
   visiting.add(node.id);
   const parents = node.prerequisites.map(id => byId.get(id)).filter(parent => parent?.group === group.id) as RoadmapNode[];
   const depth = Math.max(-1, ...parents.map(level)) + 1;
   visiting.delete(node.id); depths.set(node.id, depth); return depth;
  };
  const rows: RoadmapNode[][] = [];
  for (const node of scoped) (rows[level(node)] ??= []).push(node);
  const breadth = Math.max(...rows.map(row => row.length));
  const boxWidth = Math.max(296, breadth * (CARD + GAP) - GAP + 88);
  const labelLines = wrap(group.title, Math.max(24, Math.floor((boxWidth - 44) / 7.2)));
  let rowTop = top + 38 + labelLines.length * 19;
  for (const row of rows) {
   const rowWidth = row.length * (CARD + GAP) - GAP;
   let rowHeight = 0;
   row.forEach((node, index) => {
    const lines = wrap(node.title, 22);
    const height = Math.max(112, 57 + (lines.length - 1) * 22 + 35);
    positions.set(node.id, {node, x: 12 + (boxWidth - rowWidth) / 2 + index * (CARD + GAP), y: rowTop, width: CARD, height, lines});
    rowHeight = Math.max(rowHeight, height);
   });
   row.forEach(node => rowBottoms.set(node.id, rowTop + rowHeight));
   rowTop += rowHeight + ROW_GAP;
  }
  const height = rowTop - ROW_GAP - top + 34;
  boxes.push({...group, lines: labelLines, x: 12, y: top, width: boxWidth, height});
  top += height + 50; width = Math.max(width, boxWidth + 24);
 }
 // Center each stage on the same vertical axis, including narrow one-topic stages.
 for (const box of boxes) {
  const offset = (width - 24 - box.width) / 2;
  box.x += offset;
  for (const position of positions.values()) if (position.node.group === box.id) position.x += offset;
 }
 const ancestor = (a: string, b: string, seen = new Set<string>()): boolean => {
  if (a === b) return true;
  if (seen.has(b)) return false;
  seen.add(b);
  return (byId.get(b)?.prerequisites ?? []).some(id => ancestor(a, id, seen));
 };
 const edges: {from: string; to: string; path: string}[] = [];
 for (const target of positions.values()) for (const id of target.node.prerequisites) {
  const source = positions.get(id);
  // External foundations remain in card text; preserve the canonical transitive reduction.
  if (!source || source.node.group !== target.node.group || target.node.prerequisites.some(other => id !== other && ancestor(id, other))) continue;
  const sx = source.x + CARD / 2, sy = source.y + source.height, tx = target.x + CARD / 2, ty = target.y;
  const adjacent = depths.get(target.node.id)! - depths.get(source.node.id)! === 1;
  const box = boxes.find(item => item.id === source.node.group)!;
  const bend = rowBottoms.get(source.node.id)! + 28;
  const path = adjacent ? `M${sx},${sy}V${bend}H${tx}V${ty}` : `M${sx},${sy}V${bend}H${box.x + box.width - 18}V${ty - 24}H${tx}V${ty}`;
  edges.push({from: id, to: target.node.id, path});
 }
 return {width, height: Math.max(100, top - 26), positions, boxes, edges};
}

export function renderRoadmapSvg(nodes: RoadmapNode[], groups: RoadmapGroup[], {idPrefix = '', title = 'Bản đồ kiến thức CSAT'}: {idPrefix?: string; title?: string} = {}): string {
 const {width, height, positions, boxes, edges} = layoutRoadmap(nodes, groups);
 const marker = escape(idPrefix + 'roadmap-arrow');
 const styles = `.study-map-svg{font-family:Archivo,Arial,sans-serif}.study-map-svg .node-shadow{fill:#191917}.study-map-svg .node-face{fill:#fffef9;stroke:#191917;stroke-width:2}.study-map-svg .node-header{fill:#2b50e0;stroke:#191917;stroke-width:1.5}.study-map-svg .node-code{font-size:14px;font-weight:700;fill:#fff}.study-map-svg .node-rank{font-size:10px;font-weight:600;fill:#fff}.study-map-svg .node-title{font-size:18px;font-weight:700;letter-spacing:-.2px;fill:#191917}.study-map-svg .node-foot{font-size:12px;fill:#65645c}.study-map-svg .port{fill:#191917;stroke:#fffef9;stroke-width:1.5}.study-map-svg .edge path{fill:none;stroke:#191917;stroke-width:2}.study-map-svg .group-box{fill:#fffdf388;stroke:#191917;stroke-width:1}.study-map-svg .group-current .group-box{fill:#d9e64c55;stroke-width:3}.study-map-svg .group-label{font-size:13px;font-weight:700;fill:#191917}.study-map-svg .node{cursor:pointer;outline:none}.study-map-svg .node:hover .node-face,.study-map-svg .node:focus-visible .node-face{fill:#eef2ff;stroke:#2b50e0;stroke-width:4}`;
 const groupMarkup = boxes.map(box => `<g id="${escape(idPrefix + 'group-' + box.id)}" class="map-group${box.current?' group-current':''}"><rect class="group-box" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"/>${box.lines.map((line,index) => `<text class="group-label" x="${box.x + 22}" y="${box.y + 28 + index * 19}">${escape(line)}</text>`).join('')}</g>`).join('');
 const cards = [...positions.values()].map(p => {
  const n = p.node, shape = `M0 0H216L232 16V${p.height}H0Z`;
  const external = n.prerequisites.filter(id => !positions.has(id) || positions.get(id)!.node.group !== n.group);
  const foot = n.foot ?? (external.length ? 'Nền: ' + external.join(' · ') : 'Xem chủ đề ↗');
  return `<g class="node" id="${escape(idPrefix + 'graph-' + n.id)}" data-node="${escape(n.id)}" data-height="${p.height}" role="button" aria-haspopup="dialog" tabindex="0" aria-label="${escape(n.id + ' · ' + n.title)}" transform="translate(${p.x} ${p.y})"><title>${escape(n.title)}</title><path class="node-shadow" transform="translate(5 5)" d="${shape}"/><path class="node-face" d="${shape}"/><path class="node-header" d="M0 0H216L232 16V36H0Z"/><text class="node-code" x="14" y="26">${escape(n.id)}</text><text class="node-rank" x="214" y="26" text-anchor="end">${/^[ABC]$/.test(n.group)?'LỚP '+escape(n.group):'CHỦ ĐỀ'}</text>${p.lines.map((line,index) => `<text class="node-title" x="14" y="${57 + index * 22}">${escape(line)}</text>`).join('')}<text class="node-foot" x="14" y="${p.height - 11}">${escape(foot)}</text><circle class="port" cx="116" cy="0" r="4"/><circle class="port" cx="116" cy="${p.height}" r="4"/></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="study-map-svg" role="group" aria-label="${escape(title)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${escape(title)}</title><style>${styles}</style><defs><marker id="${marker}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" fill="none" stroke="#191917" stroke-width="1.4"/></marker></defs>${groupMarkup}${edges.map(edge => `<g id="${escape(idPrefix + 'edge-' + edge.from + '-' + edge.to)}" class="edge"><path d="${edge.path}" marker-end="url(#${marker})"/></g>`).join('')}${cards}</svg>\n`;
}
