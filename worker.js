// Cloudflare Worker — edge redirects with KV cache (binding: LINKS, env: GAS_URL)

const DASH    = 'https://fkmins.github.io/url/';
const KV_TTL  = 86400 * 7;
const SLUG_RE = /^[a-z0-9_-]{1,64}$/;

const BOT_RE = /bot|crawl|spider|preview|facebookexternalhit|slack|twitterbot|linkedinbot|googlebot|bingbot|discordbot|telegrambot|whatsapp|embedly|quora|pinterest|redditbot|applebot|yandex|baidu|duckduckbot|semrush|ahrefs|mj12bot/i;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function errorPage(title, msg, status = 404, isHead = false) {
  const t = esc(title), m = esc(msg);
  const body = isHead ? null : `<!DOCTYPE html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${t}</title><body style="font-family:system-ui;background:#111;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div style="background:#fff;color:#111;padding:32px;border-radius:24px;border:4px solid #facc15;max-width:320px"><h2 style="margin:0 0 8px;color:#dc2626;text-transform:uppercase;font-size:20px">${t}</h2><p style="font-weight:700;font-size:13px;color:#4b5563">${m}</p><a href="${DASH}" style="display:inline-block;margin-top:12px;background:#000;color:#fff;padding:10px 24px;border-radius:12px;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">Go Home</a></div></body>`;
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'no-store'
    }
  });
}

function redirect(url) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': url,
      'Cache-Control': 'private, no-cache',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer'
    }
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(req, env, ctx) {
    const method = req.method;
    const isHead = method === 'HEAD';

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    if (method !== 'GET' && !isHead) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { 'Allow': 'GET, HEAD, OPTIONS', 'Content-Type': 'text/plain' }
      });
    }

    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/_ping') {
      return json({ ok: true, ts: Date.now() });
    }

    let code;
    try {
      code = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();
    } catch {
      return errorPage('Bad Request', 'Malformed URL.', 400, isHead);
    }

    if (!code) return redirect(DASH);
    if (!SLUG_RE.test(code)) {
      return errorPage('Link Inactive', 'This link is invalid or has been deleted.', 404, isHead);
    }

    // KV lookup
    let dest = await env.LINKS.get(code);

    // GAS fallback on KV miss
    if (!dest && env.GAS_URL) {
      try {
        const sep = env.GAS_URL.includes('?') ? '&' : '?';
        const r = await fetch(env.GAS_URL + sep + 'code=' + encodeURIComponent(code));
        const data = await r.json();
        if (data?.success && data.url) {
          dest = data.url;
          ctx.waitUntil(env.LINKS.put(code, dest, { expirationTtl: KV_TTL }));
        }
      } catch (err) {
        console.error(JSON.stringify({ event: 'gas_error', code, error: err.message }));
      }
    }

    if (!dest) {
      return errorPage('Link Inactive', 'This link is invalid or has been deleted.', 404, isHead);
    }

    // Validate destination
    let target;
    try { target = new URL(dest); } catch {
      return errorPage('Link Inactive', 'Invalid destination.', 404, isHead);
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return errorPage('Link Inactive', 'Invalid destination.', 404, isHead);
    }

    // Forward query params (UTMs etc.)
    url.searchParams.forEach((v, k) => target.searchParams.set(k, v));

    // Log click (non-bot GET only, async)
    const ua = req.headers.get('user-agent') || '';
    if (!isHead && !BOT_RE.test(ua) && env.GAS_URL) {
      ctx.waitUntil(
        fetch(env.GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'log_click', code }),
          headers: { 'Content-Type': 'text/plain' }
        }).catch(() => {})
      );
    }

    return redirect(target.toString());
  }
};
