// Cloudflare Worker: edge redirects from KV (binding: LINKS). Env var: GAS_URL (your Apps Script /exec URL).
const DASH = 'https://fkmins.github.io/url/'; // dashboard
const page = (t, m) => new Response(`<!DOCTYPE html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${t}</title><body style="font-family:system-ui;background:#111;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div style="background:#fff;color:#111;padding:32px;border-radius:24px;border:4px solid #facc15;max-width:320px"><h2 style="margin:0 0 8px;color:#dc2626;text-transform:uppercase;font-size:20px">${t}</h2><p style="font-weight:700;font-size:13px;color:#4b5563">${m}</p><a href="${DASH}" style="display:inline-block;margin-top:12px;background:#000;color:#fff;padding:10px 24px;border-radius:12px;font-size:12px;font-weight:700;text-decoration:none;text-transform:uppercase">Go Home</a></div>`, { status: 404, headers: { 'content-type': 'text/html;charset=utf-8' } });
const nf = () => page('Link Inactive', 'This link is invalid or has been deleted.');

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    let code; try { code = decodeURIComponent(u.pathname.replace(/^\/+|\/+$/g, '')).toLowerCase(); } catch (_) { return nf(); }
    if (!code) return Response.redirect(DASH, 302);
    if (!/^[a-z0-9_-]{1,64}$/.test(code)) return nf();

    let dest = await env.LINKS.get(code);
    if (!dest) { // fallback: ask the sheet, then warm KV
      try {
        const r = await fetch(env.GAS_URL + '?code=' + encodeURIComponent(code)).then(r => r.json());
        if (r.success && r.url) { dest = r.url; ctx.waitUntil(env.LINKS.put(code, dest)); }
      } catch (_) {}
    }
    if (!dest) return nf();

    let t; try { t = new URL(dest); } catch (_) { return nf(); }
    if (t.protocol !== 'http:' && t.protocol !== 'https:') return nf();
    u.searchParams.forEach((v, k) => t.searchParams.set(k, v)); // forward extra query params (UTMs etc.)

    if (!/bot|crawler|spider|preview|facebookexternalhit|slack/i.test(req.headers.get('user-agent') || ''))
      ctx.waitUntil(fetch(env.GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'log_click', code }), headers: { 'Content-Type': 'text/plain' } }).catch(() => {}));

    return Response.redirect(t.toString(), 302); // 302 so every click is counted
  }
};
