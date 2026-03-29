export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: { type: "config_error", message: "API key not configured on server." } }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: { type: "invalid_request", message: "Invalid JSON body." } }),
    };
  }

  const { model, max_tokens, system, messages } = payload;

  if (!system || !Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: { type: "invalid_request", message: "Missing required fields: system, messages." } }),
    };
  }

  const MAX_RETRIES = 2;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-4-20250514",
          max_tokens: Math.min(max_tokens || 1024, 4096),
          system,
          messages,
        }),
      });

      const data = await res.text();

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = res.headers.get("retry-after");
        await new Promise((r) => setTimeout(r, (retryAfter ? parseInt(retryAfter, 10) : 2) * 1000));
        continue;
      }

      return {
        statusCode: res.status,
        headers: { "Content-Type": "application/json" },
        body: data,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return {
    statusCode: 502,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: { type: "network_error", message: lastError?.message || "Failed to reach API." } }),
  };
}
