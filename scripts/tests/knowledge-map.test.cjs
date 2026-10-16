const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const provenance=require('../../lib/self-study-source.json');
const dataFile=Object.keys(provenance.files).find(name=>name.startsWith('roadmap.'));
const nodes=JSON.parse(fs.readFileSync(path.join(root,'public/self-study',dataFile),'utf8')).nodes;
const links=require('../../lib/knowledge-map-links.json');

test('self-study publishes the exact approved roadmap data and five source diagrams',()=>{
 assert.equal(Object.keys(provenance.files).filter(name=>name.endsWith('.svg')).length,5);
 for(const [name,sha] of Object.entries(provenance.files))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,'public/self-study',name))).digest('hex'),sha,name);
 assert.equal(nodes.length,43);
 assert.deepEqual(['A','B','C'].map(rank=>nodes.filter(node=>node.rank===rank).length),[9,15,19]);
 assert.equal(nodes.filter(node=>node.id.startsWith('D')&&node.rank==='C').length,7);
 assert.equal(new Set(nodes.map(node=>node.id)).size,43);
 for(const node of nodes){
  assert.equal(node.csatoj_tag_id,links[node.id].practiceTag,node.id);
  assert.equal(node.csatoj_url,`https://csatoj.vn/problems/?tag=${node.csatoj_tag_id}&point_start=&point_end=`);
  assert(node.title&&node.summary&&node.details.length);
  assert(!JSON.stringify(node).includes('/parents/'));
 }
});

test('roadmap prerequisites remain complete and acyclic',()=>{
 const byId=new Map(nodes.map(node=>[node.id,node]));
 function visit(id,ancestors=new Set()){
  assert(byId.has(id),id);assert(!ancestors.has(id),`Cycle at ${id}`);
  for(const prerequisite of byId.get(id).prerequisites)visit(prerequisite,new Set(ancestors).add(id));
 }
 for(const node of nodes)visit(node.id);
});

test('notebook diagrams retain every scoped topic and the source dependency edges',()=>{
 const diagrams=require('../../lib/self-study-diagrams.json');
 for(const [view,url] of Object.entries(diagrams)){
  const svg=fs.readFileSync(path.join(root,'public',url.slice(1)),'utf8');
  const sourceName=Object.keys(provenance.files).find(name=>name.startsWith(`diagram-${view}.`));
  const original=fs.readFileSync(path.join(root,'public/self-study',sourceName),'utf8').replaceAll('&#45;','-');
  const edges=text=>[...text.matchAll(/id="edge-([A-D]\d+)-([A-D]\d+)"/g)].map(m=>m[1]+'-'+m[2]).sort();
  assert.deepEqual(edges(svg),edges(original),view+' prerequisites');
  const expected=nodes.filter(n=>view==='full'||(view==='DP'?n.id.startsWith('D'):n.rank===view)).map(n=>n.id).sort();
  assert.deepEqual([...svg.matchAll(/id="graph-([A-D]\d+)"/g)].map(m=>m[1]).sort(),expected,view+' topics');
  assert(url.includes(createHash('sha256').update(svg).digest('hex').slice(0,12)),view+' immutable URL');
 }
});
