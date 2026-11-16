const SITE = "https://cuby3212.github.io";
const encoder = new TextEncoder();

function reply(data, status = 200, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin"
  };
  if (origin === SITE) headers["Access-Control-Allow-Origin"] = SITE;
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (url.pathname !== "/visits") return reply({ error: "Not found" }, 404, origin);
    if (request.method === "OPTIONS") {
      if (origin !== SITE) return reply({ error: "Forbidden" }, 403);
      const response = reply({}, 200, origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Max-Age", "86400");
      return response;
    }
    if (!["GET", "POST"].includes(request.method)) return reply({ error: "Method not allowed" }, 405, origin);
    if (request.method === "POST" && origin !== SITE) return reply({ error: "Forbidden" }, 403);
    try {
      if (request.method === "POST") {
        const ip = request.headers.get("CF-Connecting-IP");
        const agent = (request.headers.get("User-Agent") || "").slice(0, 512);
        if (!ip || !env.COUNTER_SALT) return reply({ error: "Unavailable" }, 503, origin);
        if (!/bot|crawler|spider|headless|preview|lighthouse/i.test(agent)) {
          const day = new Date().toISOString().slice(0, 10);
          const key = await crypto.subtle.importKey("raw", encoder.encode(env.COUNTER_SALT), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
          const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify([day, ip, agent])));
          const token = Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("");
          // Se conserva el total, pero los identificadores de días anteriores se eliminan.
          await env.DB.batch([
            env.DB.prepare("DELETE FROM visits WHERE day < ?").bind(day),
            env.DB.prepare("INSERT OR IGNORE INTO visits (token, day) VALUES (?, ?)").bind(token, day)
          ]);
        }
      }
      const row = await env.DB.prepare("SELECT value FROM totals WHERE id = 1").first();
      if (!row || !Number.isSafeInteger(row.value) || row.value < 0) throw new Error("Invalid count");
      return reply({ count: row.value, updatedAt: new Date().toISOString(), period: "day", timezone: "UTC" }, 200, origin);
    } catch {
      return reply({ error: "Temporarily unavailable" }, 503, origin);
    }
  }
};
