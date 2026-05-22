export function googleNewsRssUrl(query, language) {
  const params = new URLSearchParams({
    q: query,
    hl: language === "ko" ? "ko" : "en-US",
    gl: language === "ko" ? "KR" : "US",
    ceid: language === "ko" ? "KR:ko" : "US:en"
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export async function fetchRssItems(url, market, query) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "ag-newsletter/1.0 (+https://github.com)"
    }
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed ${response.status}: ${url}`);
  }

  const xml = await response.text();
  const items = parseItems(xml);

  return items.map((item) => ({
    title: clean(item.title),
    link: item.link,
    source: item.source || "Google News",
    sourceUrl: item.sourceUrl,
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    description: clean(stripHtml(item.description || "")),
    market,
    query
  }));
}

function parseItems(xml) {
  const blocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/giu)].map((match) => match[1]);
  return blocks.map((block) => {
    const sourceMatch = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/iu);
    return {
      title: decodeXml(readTag(block, "title")),
      link: decodeXml(readTag(block, "link")),
      pubDate: decodeXml(readTag(block, "pubDate")),
      description: decodeXml(readTag(block, "description")),
      source: sourceMatch ? decodeXml(sourceMatch[2]) : "",
      sourceUrl: sourceMatch ? decodeXml(readAttribute(sourceMatch[1], "url")) : ""
    };
  });
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "iu"));
  return match ? match[1].trim() : "";
}

function readAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`${name}=["']([^"']+)["']`, "iu"));
  return match ? match[1] : "";
}

export function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clean(value) {
  return String(value || "")
    .replace(/\s+-\s+[^-]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}
