import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadDotEnv();

const toNumber = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  blogId: process.env.BLOGGER_BLOG_ID,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  author: process.env.NEWSLETTER_AUTHOR || "AG Smart Farm Brief",
  daysBack: toNumber(process.env.NEWSLETTER_DAYS_BACK, 2),
  maxItems: toNumber(process.env.NEWSLETTER_MAX_ITEMS, 18),
  publishAsDraft: String(process.env.BLOGGER_IS_DRAFT || "false").toLowerCase() === "true"
};

export function requireBloggerConfig() {
  const missing = [
    ["BLOGGER_BLOG_ID", config.blogId],
    ["GOOGLE_CLIENT_ID", config.googleClientId],
    ["GOOGLE_CLIENT_SECRET", config.googleClientSecret],
    ["GOOGLE_REFRESH_TOKEN", config.googleRefreshToken]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing Blogger settings: ${missing.map(([key]) => key).join(", ")}`);
  }
}

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
