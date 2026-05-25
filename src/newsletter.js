import { config } from "./config.js";
import { buildAiBrief } from "./editorial.js";
import { fetchRssItems, googleNewsRssUrl } from "./rss.js";
import { renderNewsletter, postTitle } from "./render.js";
import { selectTopItems } from "./editorial.js";
import { sourceGroups } from "./sources.js";
import { publishToBlogger } from "./blogger.js";

const mode = process.argv.includes("--publish") ? "publish" : "preview";

async function main() {
  const now = new Date();
  const fetched = [];

  for (const group of sourceGroups) {
    const language = group.market === "국내" ? "ko" : "en";
    const results = await Promise.allSettled(
      group.queries.map((query) => fetchRssItems(googleNewsRssUrl(query, language), group.market, query))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        fetched.push(...result.value);
      } else {
        console.warn(result.reason.message);
      }
    }
  }

  const items = selectTopItems(fetched, now, config.daysBack, config.maxItems);
  const brief = await buildAiBrief(items, config);
  const title = postTitle(now);
  const html = renderNewsletter({
    brief,
    items,
    author: config.author,
    generatedAt: now
  });

  if (mode === "preview") {
    console.log(`TITLE: ${title}`);
    console.log(html);
    return;
  }

  const post = await publishToBlogger({
    title,
    html,
    publishedAt: now,
    labels: ["스마트팜 기술", "수직농장", "농업 자동화", "작물재배", "글로벌 농업"]
  });

  console.log(`Published: ${post.url}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
