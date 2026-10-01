// Cloudflare Worker: edge redirects from KV (binding: LINKS). Env var: GAS_URL (your Apps Script /exec URL).

const DASH = 'https://fkmins.github.io/url/'; // dashboard
const KV_TTL = 86400 * 7; // [Improvement 1] 7 days in seconds for KV caching

// [Improvement 3] Extended bot detection regex including major crawlers, social previews, and bots
const BOT_REGEX = /bot|crawler|spider|preview|facebookexternalhit|slack|twitterbot|linkedinbot|googlebot|bingbot|discordbot|telegrambot|whatsapp|embedly|quora|pinterest|redditbot/i;

// [Improvement 8] Basic HTML escaping to prevent XSS in error page interpolation
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// [Improvement 4 & 8] Render error page with escaped inputs and CORS headers
const page = (t, m, status = 404, isHead = false) => {
  const safeTitle = escapeHtml(t);
  const safeMsg = escapeHtml(m);
  const body = isHead ? null : `<!DOCTYPE html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${safeTitle}</title><body style="font-family:system-ui;background:#111;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div style="background:#fff;color:#111;padding:32px;border-radius:24px;border:4px solid #facc15;max-width:320px"><h2 style="margin:0 0 8px;color:#dc2626;text-transform:uppercase;font-size:20px">${safeTitle}</h2><p style="font-weight:700;font-size:13px;color:#4b5563">${safeMsg}</p><a href="${DASH}" style="display:inline-block;margin-top:12px;background:#000;color:#fff;padding:10px 24px;border-radius:12px;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">Go Home</a></div></body>`;

  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html;charset=utf-8',
      'Access-Control-Allow-Origin': '*', // [Improvement 4] CORS headers on error pages
      'Access-Control-Allow-Methods': 'GET, HEAD',
      'X-Robots-Tag': 'noindex'
    }
  });
};

const nf = (isHead = false) => page('Link Inactive', 'This link is invalid or has been deleted.', 404, isHead);

// Helper function to build 302 redirect responses with security and caching headers
function createRedirectResponse(url) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': url,
      'Cache-Control': 'private, no-cache', // [Improvement 2] Prevent intermediate caches from swallowing click counts
      'X-Robots-Tag': 'noindex',             // [Improvement 5] Prevent search engines from indexing the short URL
      'Referrer-Policy': 'no-referrer'       // [Improvement 9] Prevent leaking the short URL as referrer
    }
  });
}

export default {
  async fetch(req, env, ctx) {
    const isHead = req.method === 'HEAD';

    // [Improvement 7] Request method validation - only allow GET and HEAD methods
    if (req.method !== 'GET' && !isHead) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          'Allow': 'GET, HEAD',
          'Content-Type': 'text/plain;charset=utf-8',
          'Access-Control-Allow-Origin': '*' // [Improvement 4] CORS header
        }
      });
    }

    const u = new URL(req.url);
    let code;
    try {
      code = decodeURIComponent(u.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();
    } catch (_) {
      return nf(isHead);
    }

    // Root path redirect to dashboard
    if (!code) return createRedirectResponse(DASH);

    // Validate slug format
    if (!/^[a-z0-9_-]{1,64}$/.test(code)) return nf(isHead);

    let dest = await env.LINKS.get(code);

    if (!dest) {
      // [Improvement 11] Log KV miss and GAS lookup in Worker logs
      console.log(JSON.stringify({
        level: 'info',
        event: 'kv_miss',
        code,
        message: 'KV miss; querying Google Apps Script fallback'
      }));

      // Fallback: ask the sheet, then warm KV
      try {
        const gasUrl = env.GAS_URL + (env.GAS_URL.includes('?') ? '&' : '?') + 'code=' + encodeURIComponent(code);
        const r = await fetch(gasUrl).then(r => r.json());
        if (r && r.success && r.url) {
          dest = r.url;
          // [Improvement 1] Add KV TTL on puts (7 days) so stale/deleted links refresh
          ctx.waitUntil(env.LINKS.put(code, dest, { expirationTtl: KV_TTL }));
        }
      } catch (err) {
        console.error(JSON.stringify({
          level: 'error',
          event: 'gas_fallback_error',
          code,
          error: err.message
        }));
      }
    }

    if (!dest) return nf(isHead);

    let t;
    try {
      t = new URL(dest);
    } catch (_) {
      return nf(isHead);
    }

    if (t.protocol !== 'http:' && t.protocol !== 'https:') return nf(isHead);

    // Forward extra query params (UTMs, etc.)
    u.searchParams.forEach((v, k) => t.searchParams.set(k, v));

    const userAgent = req.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(userAgent);

    // [Improvement 3 & 6] Asynchronously log click count for non-bot GET requests
    // HEAD requests (used by previewers) and bots do not count as user clicks
    if (!isBot && !isHead && env.GAS_URL) {
      ctx.waitUntil(
        fetch(env.GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'log_click', code }),
          headers: { 'Content-Type': 'text/plain' }
        }).catch(err => {
          console.error(JSON.stringify({
            level: 'warn',
            event: 'log_click_error',
            code,
            error: err.message
          }));
        })
      );
    }

    const redirectTarget = t.toString();

    // [Improvement 10] Structured logging of code and destination for debugging
    console.log(JSON.stringify({
      level: 'info',
      event: 'redirect',
      code,
      destination: redirectTarget,
      method: req.method,
      isBot
    }));

    // [Improvement 2, 5, 6, 9] Return 302 redirect with no body (handles GET and HEAD properly)
    return createRedirectResponse(redirectTarget);
  }
};
