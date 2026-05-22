import { config, requireBloggerConfig } from "./config.js";

export async function publishToBlogger({ title, html, labels = [] }) {
  requireBloggerConfig();
  const accessToken = await refreshAccessToken();
  const url = new URL(`https://www.googleapis.com/blogger/v3/blogs/${config.blogId}/posts/`);
  url.searchParams.set("isDraft", String(config.publishAsDraft));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      kind: "blogger#post",
      title,
      content: html,
      labels
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Blogger publish failed ${response.status}: ${body}`);
  }

  return response.json();
}

async function refreshAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.googleClientId,
      client_secret: config.googleClientSecret,
      refresh_token: config.googleRefreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token refresh failed ${response.status}: ${body}`);
  }

  const payload = await response.json();
  return payload.access_token;
}
