import diagrams from './self-study-diagrams.json';

// Trusted static interface only. Topic content comes from the public snapshot.
const icon = (paths: string) => `<svg class="study-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
export const selfStudyMarkup = `
<a class="study-skip" href="#content">Đến roadmap</a>
<h1 class="sr-only">Roadmap tự học CSAT</h1>
<div id="content" class="study-workspace" tabindex="-1">
  <details class="study-rail controls" open>
    <summary>Bản đồ kiến thức <span aria-hidden="true">⌄</span></summary>
    <div class="study-rail-content">
      <nav aria-label="Chọn lớp">
        <button data-view="full" aria-pressed="true">Tất cả <small>43</small></button>
        <button data-view="A" aria-pressed="false">Lớp A <small>09</small></button>
        <button data-view="B" aria-pressed="false">Lớp B <small>15</small></button>
        <button data-view="C" aria-pressed="false">Lớp C <small>19</small></button>
        <button data-view="DP" aria-pressed="false">Quy hoạch động <small>07</small></button>
      </nav>
      <div class="map-meta"><span id="view-code">A → B → C</span><h2 id="view-title">Toàn lộ trình</h2></div>
      <div class="study-rail-enrollment"><p>Đăng kí ngay để truy cập các bài giảng chuyên sâu, code mẫu và hình thành tư duy lập trình thi đấu!</p><a href="/lo-trinh#tu-van">Đăng kí ngay ${icon('<path d="M7 17 17 7M7 7h10v10"/>')}</a></div>
    </div>
  </details>
  <section class="study-board" aria-label="Bản đồ kiến thức">
    <div class="study-toolbar" role="region" aria-label="Điều chỉnh bản đồ">
      <div class="tools-row">
        <div class="search-field"><label class="sr-only" for="search">Tìm theo tag, chủ đề hoặc kiến thức</label>${icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>')}<input id="search" type="search" placeholder="Tìm chủ đề, thuật toán…" autocomplete="off"><button id="clear-search" type="button" aria-label="Xóa tìm kiếm" hidden>${icon('<path d="m6 6 12 12M6 18 18 6"/>')}</button></div>
        <div class="study-toolbar-actions">
          <div class="view-modes" role="group" aria-label="Cách xem"><button data-mode="diagram" aria-pressed="true" aria-label="Xem sơ đồ">${icon('<rect x="8" y="2" width="8" height="6"/><rect x="2" y="16" width="7" height="6"/><rect x="15" y="16" width="7" height="6"/><path d="M12 8v4H5v4m7-4h7v4"/>')}<span class="view-mode-label">Sơ đồ</span></button><button data-mode="list" aria-pressed="false" aria-label="Xem danh sách">${icon('<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>')}<span class="view-mode-label">Danh sách</span></button></div>
          <div class="study-zoom-tools"><div id="zoom-controls" role="group" aria-label="Phóng to sơ đồ"><button id="fit" aria-label="Vừa khung">${icon('<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>')}<span>Vừa khung</span></button><button id="minus" aria-label="Thu nhỏ">${icon('<path d="M4 12h16"/>')}</button><span id="scale-label" aria-live="off">100%</span><button id="plus" aria-label="Phóng to">${icon('<path d="M12 4v16M4 12h16"/>')}</button></div><a id="download" download aria-label="Tải sơ đồ SVG" hidden>${icon('<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>')}</a></div>
        </div>
      </div>
      <p id="result" role="status" aria-live="polite">Đang tải roadmap…</p>
    </div>
    <section class="diagram-panel" id="diagram-panel" aria-label="Sơ đồ lộ trình">
      <div id="canvas" tabindex="0" aria-label="Dùng thanh cuộn trang để di chuyển sơ đồ; Tab chọn chủ đề, Enter để đọc" aria-busy="true"><div id="stage"></div></div>
    </section>
    <div id="list" hidden></div>
    <div id="notice" class="notice" hidden><p id="notice-text"></p><button id="retry" hidden>Thử lại</button></div>
    <noscript><style>.csat-public .self-study-roadmap :is(.study-toolbar,.diagram-panel,.map-meta,.study-rail nav){display:none}.csat-public.self-study-page .site-header{position:relative}.csat-public .self-study-roadmap .study-rail{position:relative;top:auto;left:auto;max-height:none;margin:16px;width:min(320px,calc(100vw - 32px))}.csat-public .self-study-roadmap .study-static-link{padding:20px}.csat-public .self-study-roadmap .study-static-map{margin-left:20px}</style><p class="study-static-link"><a href="${diagrams.full}">Mở sơ đồ SVG toàn bộ</a></p><img class="study-static-map" src="${diagrams.full}" alt="Sơ đồ dọc 43 chủ đề CSAT từ lớp A đến lớp C"></noscript>
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
