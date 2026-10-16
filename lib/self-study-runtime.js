import diagrams from './self-study-diagrams.json';

// Approved notebook presentation, retaining the source data and scoped lifecycle.
export function mountSelfStudyRoadmap(root) {
const controller = new AbortController();
const on = (target, type, listener) => target.addEventListener(type, listener, { signal: controller.signal });
const DATA_FILE = "/self-study/roadmap.d09f0efd29b0.json";
const DIAGRAM_FILES = diagrams;
const $ = selector => root.querySelector(selector);
const media = matchMedia('(max-width:680px)');
const VALID_VIEWS = new Set(['full', 'A', 'B', 'C', 'DP']);
const CLASS_NAMES = { A: 'Nền tảng C++', B: 'HSG Phường / Xã', C: 'HSG Tỉnh, Chuyên Tin' };
const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'd');
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const dom = { canvas: $('#canvas'), stage: $('#stage'), list: $('#list'), dialog: $('#topic-dialog'), search: $('#search'), result: $('#result'), notice: $('#notice') };
const diagramCache = new Map();
const viewportCache = new Map();
let topics = [], byId = new Map(), searchText = new Map(), nextTopics = new Map();
let state = readHash(), currentSvg = null, loadedView = null, renderRequest = 0, fitMode = false, zoom = 1, previousFocus = null, searchingFrame = 0;

function readHash() {
  const hash = location.hash.slice(1);
  const legacy = /^chu-de-([ABCD]\d{2})$/.exec(hash);
  if (legacy) return { view: 'full', mode: 'diagram', query: '', tag: legacy[1] };
  const parameters = new URLSearchParams(hash);
  const view = hash === 'DP' ? 'DP' : parameters.get('view') || 'full';
  return { view: VALID_VIEWS.has(view) ? view : 'full', mode: parameters.get('mode') === 'list' ? 'list' : 'diagram', query: parameters.get('q') || '', tag: parameters.get('tag') || null };
}
function writeHash(push = false) {
  const parameters = new URLSearchParams();
  if (state.view !== 'full') parameters.set('view', state.view);
  if (state.mode === 'list') parameters.set('mode', 'list');
  if (state.query) parameters.set('q', state.query);
  if (state.tag) parameters.set('tag', state.tag);
  const hash = parameters.size ? '#' + parameters : '';
  const target = location.pathname + location.search + hash;
  if (target !== location.pathname + location.search + location.hash) history[push ? 'pushState' : 'replaceState'](null, '', target);
}
function scope() { return topics.filter(topic => state.view === 'full' || (state.view === 'DP' ? topic.id.startsWith('D') : topic.rank === state.view)); }
function matching() { const query = normalize(state.query.trim()); return scope().filter(topic => !query || searchText.get(topic.id).includes(query)); }
function showNotice(message, retry = false) { $('#notice-text').textContent = message; $('#retry').hidden = !retry; dom.notice.hidden = false; }
function scrollWindow(left, top) { window.scrollTo({ left, top, behavior: 'instant' }); }
function viewport() {
  const rail = $('.study-rail'), shell = root.closest('.self-study-page');
  const top = parseFloat(getComputedStyle(shell).getPropertyValue('--map-header-bottom')) || 116;
  const bottom = $('.study-toolbar').getBoundingClientRect().top - 16;
  const left = innerWidth > 680 && rail.open ? rail.getBoundingClientRect().right + 30 : 16;
  return { left, top: top + (innerWidth <= 680 ? 58 : 20), right: innerWidth - 24, bottom };
}
function saveViewport() { if (loadedView && currentSvg && !$('#diagram-panel').hidden) viewportCache.set(loadedView, { zoom, fitMode, width: innerWidth, left: scrollX, top: scrollY }); }
function scale(value) {
  if (!currentSvg) return;
  zoom = Math.min(2.5, Math.max(0.15, value));
  const bounds = currentSvg.viewBox.baseVal;
  currentSvg.style.width = bounds.width * zoom + 'px'; currentSvg.style.height = bounds.height * zoom + 'px';
  $('#scale-label').textContent = Math.round(zoom * 100) + '%';
  $('#minus').disabled = zoom <= 0.15; $('#plus').disabled = zoom >= 2.5;
}
function fit() {
  if (!currentSvg) return;
  fitMode = true;
  const frame = viewport();
  scale(Math.min(1, (frame.right - frame.left - 32) / currentSvg.viewBox.baseVal.width));
}
function focusNode(id, onlyIfOutside = false) {
  const node = dom.stage.querySelector(`[data-node="${id}"]`); if (!node) return;
  const rectangle = node.getBoundingClientRect(), frame = viewport();
  if (onlyIfOutside && rectangle.left >= frame.left && rectangle.right <= frame.right && rectangle.top >= frame.top && rectangle.bottom <= frame.bottom) return;
  scrollWindow(scrollX + rectangle.left + rectangle.width / 2 - (frame.left + frame.right) / 2,
    scrollY + rectangle.top + rectangle.height / 2 - (frame.top + frame.bottom) / 2);
}
function startViewport() {
  scrollWindow(0, 0);
  const first = dom.stage.querySelector('[data-node]');
  if (!first) return;
  const rectangle = first.getBoundingClientRect(), frame = viewport();
  scrollWindow(rectangle.left + rectangle.width / 2 - (frame.left + frame.right) / 2, 0);
}
async function diagram(view) {
  if (!diagramCache.has(view)) {
    const pending = fetch(new URL(DIAGRAM_FILES[view], location.origin), { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('diagram'); return response.text(); });
    diagramCache.set(view, pending);
    pending.catch(() => diagramCache.delete(view));
  }
  return diagramCache.get(view);
}
function importDiagram(source) {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('diagram');
  const svg = document.importNode(parsed.documentElement, true);
  // A composite diagram must expose its interactive topic buttons to assistive tech.
  svg.setAttribute('role', 'group');
  svg.querySelectorAll('.node').forEach(node => {
    const id = node.id.slice(6), topic = byId.get(id);
    if (!topic) return;
    node.dataset.node = id; node.classList.add('svg-node'); node.setAttribute('tabindex', '0'); node.setAttribute('role', 'button');
    node.setAttribute('aria-label', id + ' · ' + topic.title); node.setAttribute('aria-haspopup', 'dialog'); node.setAttribute('aria-pressed', 'false');
  });
  svg.querySelectorAll('.edge').forEach(edge => edge.classList.add('svg-edge'));
  return svg;
}
function markDiagram() {
  if (!currentSvg) return;
  const matches = new Set(matching().map(topic => topic.id)), isSearch = !!state.query.trim();
  currentSvg.querySelectorAll('[data-node]').forEach(node => { node.classList.toggle('selected', node.dataset.node === state.tag); node.setAttribute('aria-pressed', String(node.dataset.node === state.tag)); node.classList.toggle('matched', isSearch && matches.has(node.dataset.node)); node.classList.toggle('not-matched', isSearch && !matches.has(node.dataset.node)); });
  currentSvg.querySelectorAll('.highlight').forEach(edge => edge.classList.remove('highlight'));
  const chosen = byId.get(state.tag);
  if (chosen) {
    chosen.prerequisites.forEach(id => currentSvg.querySelector(`#edge-${id}-${chosen.id}`)?.classList.add('highlight'));
    (nextTopics.get(chosen.id) || []).forEach(topic => currentSvg.querySelector(`#edge-${chosen.id}-${topic.id}`)?.classList.add('highlight'));
  }
}
function renderList() {
  const matches = matching();
  dom.list.innerHTML = ['A', 'B', 'C'].map(rank => {
    const group = matches.filter(topic => topic.rank === rank); if (!group.length) return '';
    return `<section class="rank-section" data-rank="${rank}"><div class="rank-head"><span class="rank-letter">${rank}</span><div><h2>${CLASS_NAMES[rank]}</h2><p>${group.length} chủ đề</p></div></div>${[...new Set(group.map(topic => topic.lane))].map(lane => `<div class="lane"><h3>${escape(lane)}</h3><div class="topic-grid">${group.filter(topic => topic.lane === lane).map(topic => `<button class="topic${topic.id === state.tag ? ' selected' : ''}" data-node="${topic.id}" aria-haspopup="dialog"><span class="topic-code">${topic.id}</span><span><strong>${escape(topic.title)}</strong><small>${escape(topic.summary)}</small></span></button>`).join('')}</div></div>`).join('')}</section>`;
  }).join('');
  if (!matches.length) showNotice('Không tìm thấy chủ đề. Thử từ khóa khác hoặc chọn Toàn lộ trình.');
}
function updateSearch() {
  const matches = matching(), visible = scope().length;
  $('#clear-search').hidden = !state.query;
  dom.result.textContent = state.query.trim() ? `${matches.length} kết quả trong ${visible} chủ đề` : `${visible} chủ đề`;
  dom.notice.hidden = true;
  if (state.mode === 'diagram') {
    if (!currentSvg && dom.canvas.getAttribute('aria-busy') !== 'true') { showNotice('Chưa tải được sơ đồ. Thử lại hoặc chuyển sang Danh sách.', true); return; }
    markDiagram(); if (state.query.trim() && !matches.length) showNotice('Không tìm thấy chủ đề. Sơ đồ vẫn hiển thị để bạn giữ ngữ cảnh.');
  }
  else renderList();
}
async function render() {
  if (!topics.length) return;
  const request = ++renderRequest;
  const displayChanged = root.dataset.display !== state.mode + ':' + state.view;
  root.dataset.display = state.mode + ':' + state.view;
  root.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
  root.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  dom.search.value = state.query;
  $('#view-title').textContent = state.view === 'full' ? 'Toàn lộ trình' : state.view === 'DP' ? 'Quy hoạch động' : CLASS_NAMES[state.view];
  $('#view-code').textContent = state.view === 'full' ? 'A → B → C' : state.view === 'DP' ? 'C / D01–D07' : 'LỚP ' + state.view;
  const isDiagram = state.mode === 'diagram', wasHidden = $('#diagram-panel').hidden;
  if (isDiagram && !wasHidden && loadedView !== state.view) saveViewport();
  if (!isDiagram && displayChanged) scrollWindow(0, 0);
  $('#diagram-panel').hidden = !isDiagram; dom.list.hidden = isDiagram; $('#zoom-controls').hidden = !isDiagram; $('#download').hidden = true;
  dom.canvas.setAttribute('aria-busy', String(isDiagram && loadedView !== state.view));
  if (isDiagram && wasHidden && loadedView === state.view) { const previous = viewportCache.get(loadedView); if (previous) { fitMode = previous.fitMode; if (fitMode) fit(); else scale(previous.zoom); scrollWindow(previous.left, previous.top); } }
  if (isDiagram && loadedView !== state.view) {
    dom.canvas.setAttribute('aria-busy', 'true'); dom.result.textContent = 'Đang tải sơ đồ…';
    try {
      const [source] = await Promise.all([diagram(state.view), document.fonts.ready]);
      if (controller.signal.aborted || request !== renderRequest) return;
      currentSvg = importDiagram(source); dom.stage.replaceChildren(currentSvg); loadedView = state.view;
      const previous = viewportCache.get(loadedView);
      if (previous && !(innerWidth <= 680 && previous.width > 680)) { fitMode = previous.fitMode; if (fitMode) fit(); else scale(previous.zoom); scrollWindow(previous.left, previous.top); }
      else { fitMode = false; scale(innerWidth <= 680 ? 0.85 : 1); startViewport(); }
    } catch {
      if (controller.signal.aborted || request !== renderRequest) return;
      loadedView = null; currentSvg = null; dom.stage.replaceChildren(); showNotice('Chưa tải được sơ đồ. Thử lại hoặc chuyển sang Danh sách.', true); dom.result.textContent = 'Không tải được sơ đồ';
      return;
    } finally { if (request === renderRequest) dom.canvas.setAttribute('aria-busy', 'false'); }
  }
  $('#download').href = new URL(DIAGRAM_FILES[state.view], location.origin).href;
  $('#download').download = `CSAT-roadmap-${state.view}.svg`;
  $('#download').hidden = !isDiagram;
  updateSearch();
  if (byId.has(state.tag)) showTopic(state.tag, false);
  else { if (state.tag) { state.tag = null; writeHash(); } if (dom.dialog.open) dom.dialog.close(); }
}
function connectionButton(topic) { return `<button class="connection" data-related="${topic.id}"><small>${topic.id} · Lớp ${topic.rank}</small>${escape(topic.title)}</button>`; }
function showTopic(id, push = true) {
  const topic = byId.get(id); if (!topic) return;
  if (!dom.dialog.open) previousFocus = document.activeElement;
  state.tag = id; writeHash(push);
  $('#topic-code').textContent = id; $('#topic-lane').textContent = `LỚP ${topic.rank} / ${topic.lane}`; $('#topic-title').textContent = topic.title; $('#topic-summary').textContent = topic.summary;
  const link = $('#csatoj-link'); link.href = topic.csatoj_url; link.textContent = `Bài tập ${id} trên CSATOJ ↗`; link.setAttribute('aria-label', `Mở danh sách bài tập ${id} trên CSATOJ trong tab mới`);
  const prerequisites = topic.prerequisites.map(key => byId.get(key));
  $('#prerequisites').innerHTML = prerequisites.length ? prerequisites.map(connectionButton).join('') : '<p class="empty-connection">Bắt đầu từ đây.</p>';
  const next = nextTopics.get(id) || [];
  $('#next-topics').innerHTML = next.length ? next.map(connectionButton).join('') : '<p class="empty-connection">Hoàn thành nhánh kiến thức này.</p>';
  $('#detail-list').replaceChildren(...topic.details.map(detail => { const item = document.createElement('li'); item.textContent = detail; return item; }));
  $('#topic-details').open = false;
  markDiagram();
  if (!dom.dialog.open) dom.dialog.showModal();
  $('#topic-title').focus({ preventScroll: true }); dom.dialog.scrollTop = 0;
}
function closeTopic() { state.tag = null; writeHash(); dom.dialog.close(); markDiagram(); dom.list.querySelectorAll('.selected').forEach(node => node.classList.remove('selected')); }
function activateTopic(event) {
  if (dragged) return;
  const node = event.target.closest('[data-node]'); if (!node) return;
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  if (event.type === 'click') node.focus({ preventScroll: true });
  showTopic(node.dataset.node);
}
on(dom.stage, 'click', activateTopic); on(dom.stage, 'keydown', activateTopic); on(dom.list, 'click', activateTopic);
root.querySelectorAll('[data-view]').forEach(button => on(button, 'click', () => { state.view = button.dataset.view; state.tag = null; writeHash(true); render(); }));
root.querySelectorAll('[data-mode]').forEach(button => on(button, 'click', () => { saveViewport(); state.mode = button.dataset.mode; writeHash(true); render(); }));
on(dom.search, 'input', () => { state.query = dom.search.value; writeHash(); cancelAnimationFrame(searchingFrame); searchingFrame = requestAnimationFrame(updateSearch); });
on(dom.search, 'keydown', event => { if (event.key === 'Enter' && state.mode === 'diagram') { const first = matching()[0]; if (first) { focusNode(first.id); dom.stage.querySelector(`[data-node="${first.id}"]`)?.focus({ preventScroll: true }); } } });
on($('#clear-search'), 'click', () => { state.query = ''; dom.search.value = ''; writeHash(); updateSearch(); dom.search.focus(); });
on($('#fit'), 'click', () => { fit(); startViewport(); });
for (const [id, factor] of [['plus', 1.25], ['minus', 0.8]]) on($('#' + id), 'click', () => {
  if (!currentSvg) return;
  const frame = viewport(), x = (frame.left + frame.right) / 2, y = (frame.top + frame.bottom) / 2;
  const before = currentSvg.getBoundingClientRect(), nodeX = (x - before.left) / zoom, nodeY = (y - before.top) / zoom;
  fitMode = false; scale(zoom * factor);
  const after = currentSvg.getBoundingClientRect();
  scrollWindow(scrollX + after.left + nodeX * zoom - x, scrollY + after.top + nodeY * zoom - y);
});
on($('#close-dialog'), 'click', closeTopic); on(dom.dialog, 'cancel', event => { event.preventDefault(); closeTopic(); });
on(dom.dialog, 'close', () => { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); });
on($('#topic-content'), 'click', event => { const button = event.target.closest('[data-related]'); if (button) showTopic(button.dataset.related); });
on($('#locate'), 'click', async () => { const id = state.tag; closeTopic(); state.view = 'full'; state.mode = 'diagram'; state.query = ''; writeHash(true); await render(); if (controller.signal.aborted || !currentSvg) return; if (zoom < 0.7) { fitMode = false; scale(0.7); } focusNode(id); const node = dom.stage.querySelector(`[data-node="${id}"]`); node?.focus({ preventScroll: true }); });
on($('#retry'), 'click', () => { dom.notice.hidden = true; topics.length ? render() : initialize(); });
on(window, 'popstate', () => { state = readHash(); render(); });
on(media, 'change', event => { rail.open = !event.matches; if (event.matches && currentSvg && state.mode === 'diagram') { fitMode = false; scale(0.85); focusNode(scope()[0].id); } });
let resizeFrame = 0;
const shell = root.closest('.self-study-page');
const observer = new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const header = shell.querySelector('.site-header'), toolbar = $('.study-toolbar');
    shell.style.setProperty('--map-header-bottom', Math.ceil(header.getBoundingClientRect().bottom + 4) + 'px');
    shell.style.setProperty('--map-toolbar-height', Math.ceil(toolbar.getBoundingClientRect().height + 32) + 'px');
    if (fitMode && state.mode === 'diagram') fit();
  });
});
observer.observe(shell.querySelector('.site-header')); observer.observe($('.study-toolbar'));
on(window, 'resize', () => { if (fitMode && state.mode === 'diagram') fit(); });
const rail = $('.study-rail');
if (innerWidth <= 680) rail.open = false;
on(rail, 'click', event => { if (innerWidth <= 680 && event.target.closest('[data-view]')) rail.open = false; });
on(dom.stage, 'focusin', event => { const node = event.target.closest('[data-node]'); if (node && !dom.dialog.open) focusNode(node.dataset.node, true); });
if (window.visualViewport) {
  const adjustKeyboard = () => $('.study-toolbar').style.setProperty('margin-bottom', Math.max(0, innerHeight - visualViewport.height - visualViewport.offsetTop) + 'px');
  on(visualViewport, 'resize', adjustKeyboard); on(visualViewport, 'scroll', adjustKeyboard);
}

let drag = null, dragged = false, dragTimer = 0;
on(dom.canvas, 'pointerdown', event => {
  if (event.pointerType === 'touch' || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
  // Prevent native SVG text selection before the movement becomes a drag.
  event.preventDefault();
  drag = { x: event.clientX, y: event.clientY, left: scrollX, top: scrollY, pointerId: event.pointerId };
  clearTimeout(dragTimer); dragged = false;
});
on(dom.canvas, 'pointermove', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!dragged && Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 5) {
    window.getSelection()?.removeAllRanges();
    dragged = true; dom.canvas.setPointerCapture(event.pointerId); dom.canvas.classList.add('is-dragging');
  }
  if (dragged) scrollWindow(drag.left - (event.clientX - drag.x), drag.top - (event.clientY - drag.y));
});
function endDrag() {
  const pointerId = drag?.pointerId;
  drag = null; dom.canvas.classList.remove('is-dragging');
  if (pointerId !== undefined && dom.canvas.hasPointerCapture(pointerId)) dom.canvas.releasePointerCapture(pointerId);
  clearTimeout(dragTimer); dragTimer = setTimeout(() => { dragged = false; }, 0);
}
on(window, 'pointerup', endDrag); on(window, 'pointercancel', endDrag);
on(dom.canvas, 'lostpointercapture', () => { if (drag) endDrag(); });
on(window, 'blur', endDrag);
on(dom.canvas, 'selectstart', event => event.preventDefault());

async function initialize() {
  const controls = root.querySelectorAll('[data-view], [data-mode], .tools-row button, .tools-row input');
  controls.forEach(control => control.disabled = true);
  $('.controls').setAttribute('aria-busy', 'true');
  // The initial diagram request runs alongside the data request; other views stay unloaded.
  if (state.mode === 'diagram') diagram(state.view).catch(() => {});
  try {
    const response = await fetch(new URL(DATA_FILE, location.origin), { signal: controller.signal }); if (!response.ok) throw new Error('data');
    const data = await response.json(); if (controller.signal.aborted) return;
    topics = data.nodes;
    byId = new Map(topics.map(topic => [topic.id, topic]));
    searchText = new Map(topics.map(topic => [topic.id, normalize([topic.id, topic.title, topic.summary, ...topic.details].join(' '))]));
    nextTopics = new Map(topics.map(topic => [topic.id, []]));
    topics.forEach(topic => topic.prerequisites.forEach(id => nextTopics.get(id).push(topic)));
    if (state.tag && !byId.has(state.tag)) state.tag = null;
    controls.forEach(control => control.disabled = false);
    $('.controls').setAttribute('aria-busy', 'false');
    writeHash(); await render();
  } catch { if (controller.signal.aborted) return; dom.canvas.setAttribute('aria-busy', 'false'); showNotice('Chưa tải được roadmap. Kiểm tra kết nối rồi thử lại.', true); dom.result.textContent = 'Không tải được roadmap'; }
}
initialize();

return () => { dom.canvas.classList.remove('is-dragging'); controller.abort(); renderRequest++; observer.disconnect(); cancelAnimationFrame(searchingFrame); cancelAnimationFrame(resizeFrame); clearTimeout(dragTimer); if (dom.dialog.open) dom.dialog.close(); };
}
