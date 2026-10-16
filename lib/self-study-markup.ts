import diagrams from './self-study-diagrams.json';

// Trusted static interface only. Topic content comes from the public snapshot.
const icon = (paths: string) => `<svg class="study-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export const selfStudyMarkup = `
<a class="study-skip" href="#content">Đến roadmap</a>
<header class="study-heading">
  <div class="study-title"><h1>Roadmap tự học</h1><p>HSG Tin học · Chuyên Tin · Từ nền tảng đến tư duy thuật toán.</p></div>
  <div class="study-class-key"><span><b>A</b>09 chủ đề</span><span><b>B</b>15 chủ đề</span><span><b>C</b>19 chủ đề</span></div>
</header>
<div id="content" class="study-workspace" tabindex="-1">
  <aside class="study-rail controls" aria-label="Phạm vi roadmap">
    <p>CSAT / MỤC LỤC</p><strong aria-hidden="true">ABC.</strong>
    <nav aria-label="Chọn lớp">
      <button data-view="full" aria-pressed="true">Tất cả <small>43</small></button>
      <button data-view="A" aria-pressed="false">Lớp A <small>09</small></button>
      <button data-view="B" aria-pressed="false">Lớp B <small>15</small></button>
      <button data-view="C" aria-pressed="false">Lớp C <small>19</small></button>
      <button data-view="DP" aria-pressed="false">Quy hoạch động <small>07</small></button>
    </nav>
    <p class="study-rail-note">Nền tảng →<br>Thuật toán →<br>Quy hoạch động</p>
  </aside>
  <section class="study-board" aria-label="Bản đồ kiến thức">
    <div class="navigation-row"><span class="study-board-label">{ } BẢN ĐỒ KIẾN THỨC</span><div class="view-modes" role="group" aria-label="Cách xem"><button data-mode="diagram" aria-pressed="true">Sơ đồ</button><button data-mode="list" aria-pressed="false">Danh sách</button></div></div>
    <div class="tools-row">
      <div class="search-field"><label class="sr-only" for="search">Tìm theo tag, chủ đề hoặc kiến thức</label>${icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>')}<input id="search" type="search" placeholder="Tìm chủ đề, thuật toán, mã bài…" autocomplete="off"><button id="clear-search" type="button" aria-label="Xóa tìm kiếm" hidden>${icon('<path d="m6 6 12 12M6 18 18 6"/>')}</button></div>
      <div class="study-zoom-tools"><div id="zoom-controls" role="group" aria-label="Phóng to sơ đồ"><button id="fit" aria-label="Vừa khung">${icon('<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>')}<span>Vừa khung</span></button><button id="minus" aria-label="Thu nhỏ">${icon('<path d="M4 12h16"/>')}</button><span id="scale-label" aria-live="off">100%</span><button id="plus" aria-label="Phóng to">${icon('<path d="M12 4v16M4 12h16"/>')}</button></div><a id="download" download aria-label="Tải sơ đồ SVG" hidden>${icon('<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>')}</a></div>
    </div>
    <div class="map-meta"><div><span id="view-code">A → B → C</span><h2 id="view-title">Toàn lộ trình</h2></div><p id="result" role="status" aria-live="polite">Đang tải roadmap…</p></div>
    <section class="diagram-panel" id="diagram-panel" aria-label="Sơ đồ lộ trình">
      <div id="canvas" tabindex="0" aria-label="Sơ đồ có thể cuộn; dùng Tab để chọn chủ đề, Enter để đọc" aria-busy="true"><div id="stage"></div></div>
      <div class="legend"><span><i aria-hidden="true"></i>Nền cần có → Nhánh học tiếp</span><span>Cuộn hoặc kéo nền để di chuyển</span><span>Tab / Enter / Esc</span></div>
    </section>
    <div id="list" hidden></div>
    <div id="notice" class="notice" hidden><p id="notice-text"></p><button id="retry" hidden>Thử lại</button></div>
    <noscript><style>.csat-public .self-study-roadmap :is(.study-rail,.tools-row,.navigation-row,.diagram-panel,.map-meta){display:none}</style><p class="notice"><a href="${diagrams.full}">Mở sơ đồ SVG toàn bộ</a>. Bật JavaScript để tìm kiếm và xem từng chủ đề.</p></noscript>
  </section>
</div>
<dialog id="topic-dialog" aria-labelledby="topic-title">
  <div class="dialog-top"><span>CHỦ ĐỀ / CSAT</span><button id="close-dialog" aria-label="Đóng chi tiết chủ đề">${icon('<path d="m6 6 12 12M6 18 18 6"/>')}</button></div>
  <div id="topic-content">
    <div class="study-detail-kicker"><span id="topic-code"></span><span id="topic-lane"></span></div>
    <h2 id="topic-title" tabindex="-1"></h2><p id="topic-summary"></p>
    <a id="csatoj-link" target="_blank" rel="noopener noreferrer"></a>
    <div class="connections"><section><h3>Cần học trước</h3><div id="prerequisites"></div></section><section><h3>Có thể học tiếp</h3><div id="next-topics"></div></section></div>
    <details id="topic-details"><summary>Nội dung trong chủ đề</summary><ul id="detail-list"></ul></details>
    <div class="dialog-bottom"><button id="locate">Tìm trên roadmap <span aria-hidden="true">⌖</span></button></div>
  </div>
</dialog>
`;
