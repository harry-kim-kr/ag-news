import { focusTerms } from "./sources.js";

export function scoreItem(item, now, daysBack) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const termScore = focusTerms.reduce((score, term) => (
    text.includes(term.toLowerCase()) ? score + 4 : score
  ), 0);
  const publishedAt = item.publishedAt?.getTime?.() || 0;
  const ageHours = publishedAt ? Math.max(0, (now.getTime() - publishedAt) / 36e5) : daysBack * 24;
  const recencyScore = Math.max(0, 36 - ageHours);
  return termScore + recencyScore;
}

export function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeTitle(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function withinWindow(item, now, daysBack) {
  if (!item.publishedAt || Number.isNaN(item.publishedAt.getTime())) return true;
  const minTime = now.getTime() - daysBack * 24 * 60 * 60 * 1000;
  return item.publishedAt.getTime() >= minTime && item.publishedAt.getTime() <= now.getTime() + 60 * 60 * 1000;
}

export function selectTopItems(items, now, daysBack, maxItems) {
  return dedupeItems(items)
    .filter((item) => withinWindow(item, now, daysBack))
    .map((item) => ({ ...item, score: scoreItem(item, now, daysBack) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
}

export function buildFallbackBrief(items) {
  const domestic = items.filter((item) => item.market === "국내").slice(0, 4);
  const global = items.filter((item) => item.market === "해외").slice(0, 4);
  const leadItems = [...domestic, ...global].slice(0, 6);

  return {
    headline: leadItems[0]?.title || "스마트팜 주요 동향",
    summary: leadItems.length
      ? leadItems.map((item) => `${item.market} - ${item.title}`).join(" / ")
      : "오늘 수집된 주요 스마트팜 뉴스가 많지 않습니다.",
    insights: leadItems.slice(0, 5).map((item) => ({
      label: item.market,
      text: item.description || item.title
    }))
  };
}

export async function buildAiBrief(items, config) {
  if (!config.openaiApiKey) return buildFallbackBrief(items);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.openaiApiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiModel,
        input: [
          {
            role: "system",
            content: "You are a Korean agricultural technology editor. Return strict JSON only."
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "스마트팜 뉴스레터의 헤드라인, 요약, 핵심 인사이트를 한국어로 작성하세요. 과장하지 말고 기사 목록에 근거하세요.",
              schema: {
                headline: "string",
                summary: "string, 2-3 Korean sentences",
                insights: [{ label: "string", text: "string" }]
              },
              items: items.map((item) => ({
                title: item.title,
                description: item.description,
                source: item.source,
                market: item.market,
                publishedAt: item.publishedAt?.toISOString?.()
              }))
            })
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    if (!response.ok) return buildFallbackBrief(items);

    const payload = await response.json();
    const text = payload.output_text || payload.output?.flatMap((part) => part.content || [])
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n");

    return JSON.parse(text);
  } catch {
    return buildFallbackBrief(items);
  }
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 80);
}
