export function kstDate(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

export function postTitle(date = new Date()) {
  return `스마트팜 데일리 브리프 - ${kstDate(date)}`;
}

export function renderNewsletter({ brief, items, author, generatedAt = new Date() }) {
  const domesticItems = items.filter((item) => item.market === "국내");
  const globalItems = items.filter((item) => item.market === "해외");

  return `
${renderBloggerFixStyles()}
<article class="sf-brief">
  <header class="sf-hero">
    <p class="sf-kicker">Smart Farm Daily Brief</p>
    <h1>${escapeHtml(brief.headline)}</h1>
    <p class="sf-date">${escapeHtml(kstDate(generatedAt))} · ${escapeHtml(author)}</p>
    <p class="sf-summary">${escapeHtml(brief.summary)}</p>
  </header>

  <section class="sf-section">
    <h2>오늘의 관찰 포인트</h2>
    <div class="sf-insights">
      ${(brief.insights || []).slice(0, 5).map((insight) => `
        <div class="sf-insight">
          <strong>${escapeHtml(insight.label)}</strong>
          <p>${escapeHtml(insight.text)}</p>
        </div>
      `).join("")}
    </div>
  </section>

  ${renderItemSection("국내 동향", domesticItems)}
  ${renderItemSection("해외 동향", globalItems)}

  <footer class="sf-footer">
    <p>본 글은 공개 뉴스 검색 결과를 바탕으로 자동 생성되었습니다. 투자, 구매, 재배 의사결정 전 원문과 현장 조건을 함께 확인하세요.</p>
  </footer>
</article>`;
}

function renderBloggerFixStyles() {
  return `<style>
.post-share-buttons,
.share-buttons,
.sharing {
  align-items: center !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin: 18px 0 !important;
}
.post-share-buttons ul,
.share-buttons ul,
.sharing ul {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.post-share-buttons li,
.share-buttons li,
.sharing li {
  list-style: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.post-share-buttons a,
.share-buttons a,
.sharing a,
.sharing-platform-button,
.flat-icon-button {
  align-items: center !important;
  display: inline-flex !important;
  justify-content: center !important;
  min-height: 32px !important;
  min-width: 32px !important;
}
.post-share-buttons svg,
.post-share-buttons img,
.share-buttons svg,
.share-buttons img,
.sharing svg,
.sharing img,
.sharing-platform-button svg,
.sharing-platform-button img,
.flat-icon-button svg,
.flat-icon-button img {
  height: 22px !important;
  max-height: 22px !important;
  max-width: 22px !important;
  width: 22px !important;
}
.share-button-link-text,
.sharing-platform-button span {
  font-size: 12px !important;
  line-height: 1.4 !important;
}
.post-share-buttons .goog-inline-block,
.post-share-buttons .share-button,
.post-share-buttons .sharing-platform-button {
  display: inline-flex !important;
  height: 34px !important;
  margin: 0 6px 6px 0 !important;
  overflow: hidden !important;
  vertical-align: middle !important;
  width: 34px !important;
}
.post-share-buttons .share-button-link-text {
  clip: rect(0 0 0 0) !important;
  height: 1px !important;
  overflow: hidden !important;
  position: absolute !important;
  width: 1px !important;
}
</style>`;
}

function renderItemSection(title, items) {
  if (items.length === 0) return "";

  return `
  <section class="sf-section">
    <h2>${escapeHtml(title)}</h2>
    <div class="sf-news-list">
      ${items.map((item) => `
        <article class="sf-news-card">
          <div>
            <span class="sf-source">${escapeHtml(item.source)}</span>
            <h3><a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
            <p>${escapeHtml(item.description || "원문에서 세부 내용을 확인하세요.")}</p>
          </div>
          <time>${escapeHtml(formatDate(item.publishedAt))}</time>
        </article>
      `).join("")}
    </div>
  </section>`;
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
