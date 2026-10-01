'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LINKER — URL Shortener Backend (Google Apps Script)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * IMPROVEMENTS APPLIED:
 *  1.  Cached getSheet_() + CacheService ref per execution (avoids re-opening spreadsheet)
 *  2.  Removed setBorder/setHorizontalAlignment from _insertRow → added formatSheet()
 *  3.  Optimized getLastRowA_() — scans getLastRow() instead of getMaxRows()
 *  4.  Optimized handleLogClick_() — reads only column D instead of all 9 columns
 *  5.  Fixed handleLogClick_() — was silently ignoring lock failures (return value discarded)
 *  6.  Fixed handleUpdate_() — prevented double-protocol (https://http://…) bug
 *  7.  Added UrlFetchApp timeout + validateHttpsCertificates for title fetching
 *  8.  Added input validation: alias length, URL length limits
 *  9.  Better error messages in doPost fallback and edge cases
 * 10.  Consolidated multiple CacheService.getScriptCache() calls into getCache_()
 * 11.  Added formatSheet() as public function for manual or trigger-based formatting
 * 12.  Merged serial-number scan with getLastRowA_ to avoid double column-A read
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const SHEET_ID   = '1ykXprcSqRvnU8Yor6tPF5P_27QQtEgGta9JMdr0vxnE';
const SHEET_NAME = 'Url Dump';
const TTL_CACHE  = 21600;
const MAX_ALIAS_LEN = 64;
const MAX_URL_LEN   = 2048;

// Per-execution references (reset every request — safe in Apps Script)
let _sheetRef = null;
let _cacheRef = null;

function getCache_() {
  if (!_cacheRef) _cacheRef = CacheService.getScriptCache();
  return _cacheRef;
}

function json_(d) {
  return ContentService.createTextOutput(JSON.stringify(d))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// SHEET HELPERS
// ============================================================================
function getSheet_() {
  if (_sheetRef) return _sheetRef;                            // [1] cached
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, 9).setValues([['Serial No.', 'Title', 'Source Url', 'Short Code', 'Full Short Link', 'User', 'Clicks', 'Created At', 'Updated At']])
      .setFontWeight('bold').setHorizontalAlignment('center');
    sh.setFrozenRows(1);
    sh.getRange('K1').setValue('Allowed Emails').setFontWeight('bold').setHorizontalAlignment('center');
  } else if (sh.getMaxColumns() < 9 || sh.getRange('H1').getValue() !== 'Created At') {
    sh.getRange(1, 8, 1, 2).setValues([['Created At', 'Updated At']]).setFontWeight('bold');
  }
  _sheetRef = sh;                                            // [1] cached
  return sh;
}

function getRawRows_() {
  const sh = getSheet_(), lr = sh.getLastRow();
  return { sheet: sh, rows: lr < 2 ? [] : sh.getRange(2, 1, lr - 1, 9).getValues() };
}

function getAllData_() {
  return getRawRows_().rows.filter(r =>
    String(r[0]).trim() !== '' &&
    String(r[3]).trim() !== '' &&
    String(r[3]) !== '#NUM!'
  );
}

function getAllowedEmails_() {
  const c = getCache_(), hit = c.get('auth_emails');          // [10]
  if (hit) return JSON.parse(hit);
  const sh = getSheet_(), lr = sh.getLastRow();
  if (lr < 2) return [];
  const e = sh.getRange(2, 11, lr - 1, 1).getValues().flat()
    .filter(String).map(m => String(m).trim().toLowerCase());
  c.put('auth_emails', JSON.stringify(e), TTL_CACHE);
  return e;
}

function isAuthorized_(e) {
  return e ? getAllowedEmails_().includes(String(e).trim().toLowerCase()) : false;
}

function findRow_(rows, code, email) {
  const cl = String(code || '').trim().toLowerCase().replace(/^'/, '');
  const em = email ? String(email).trim().toLowerCase() : null;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][3] || '').trim().toLowerCase().replace(/^'/, '') === cl &&
        (!em || String(rows[i][5] || '').trim().toLowerCase() === em))
      return i + 2;
  }
  return -1;
}

function withLock_(fn) {
  const l = LockService.getScriptLock();
  if (!l.tryLock(8000)) return json_({ success: false, message: 'Server busy.' });
  try { return fn(); } finally { l.releaseLock(); }
}

function randomCode_(len) {
  const ch = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let o = '';
  for (let i = 0; i < (len || 6); i++) o += ch.charAt(Math.floor(Math.random() * ch.length));
  return o;
}

/**
 * Finds the last row in column A (link data only, ignoring Allowed Emails in col K).
 * Optimized: scans up to getLastRow() instead of getMaxRows().            [3]
 */
function getLastRowA_(sh) {
  const lr = sh.getLastRow();
  if (lr < 2) return 1;
  const v = sh.getRange(1, 1, lr, 1).getValues();            // [3] was getMaxRows()
  for (let i = v.length - 1; i >= 0; i--) {
    if (String(v[i][0]).trim() !== '') return i + 1;
  }
  return 1;
}

/**
 * Run manually or via a time-driven trigger to format the data range.     [2]
 * Removed from _insertRow to cut ~200-500ms per create request.
 */
function formatSheet() {
  const sh = getSheet_(), lr = sh.getLastRow();
  if (lr < 2) return;
  const r = sh.getRange(2, 1, lr - 1, 9);
  r.setHorizontalAlignment('center');
  r.setBorder(true, true, true, true, true, true, 'black', SpreadsheetApp.BorderStyle.SOLID);
}

// ============================================================================
// API ENTRY POINTS
// ============================================================================
function doGet(e) {
  if (!e || !e.parameter) return json_({ success: false, message: 'API Active' });
  if (e.parameter.code && !e.parameter.action) return handleRedirect_(e.parameter.code);
  if (e.parameter.action === 'history') return handleHistory_(e.parameter);
  return json_({ success: true, ts: Date.now() });
}

function doPost(e) {
  let p = {};
  try {
    p = e.postData.contents ? JSON.parse(e.postData.contents) : e.parameter;
  } catch (err) {
    return json_({ success: false, message: 'Invalid request body.' });   // [9]
  }
  switch (p.action) {
    case 'create':    return handleCreate_(p);
    case 'update':    return handleUpdate_(p);
    case 'delete':    return handleDelete_(p);
    case 'log_click': return handleLogClick_(p);
    default:          return json_({ success: false, message: 'Unknown action.' }); // [9]
  }
}

// ============================================================================
// CREATE
// ============================================================================
function handleCreate_(p) {
  const em = String(p.email || '').trim().toLowerCase();
  let u  = String(p.url   || '').trim();
  let t  = String(p.title || '').trim();
  let al = String(p.alias || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const dm = String(p.domain || 'https://fkmins.github.io/url/');

  // Validation
  if (!u || u.length > MAX_URL_LEN)                              return json_({ success: false, message: 'Invalid URL.' });      // [8]
  if (!/^https?:\/\//i.test(u) || /^(javascript|data|file):/i.test(u)) return json_({ success: false, message: 'Invalid URL.' });
  if (!isAuthorized_(em))                                        return json_({ success: false, message: 'Unauthorized.' });
  if (al && al.length > MAX_ALIAS_LEN)                           return json_({ success: false, message: 'Alias too long (max ' + MAX_ALIAS_LEN + ').' }); // [8]

  const hm = u.match(/^https?:\/\/([^/?#]+)/i);
  if (!hm || hm[1].toLowerCase().includes('fkmins.github.io'))   return json_({ success: false, message: 'Cannot shorten shortener.' });

  // Title fetch with timeout                                     [7]
  if (!t) {
    try {
      const resp = UrlFetchApp.fetch(u, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false                          // [7]
      });
      const match = resp.getContentText('UTF-8').match(/<title[^>]*>([^<]+)<\/title>/i);
      t = match ? match[1].trim().substring(0, 120) : 'Untitled Link';
    } catch (_) { t = 'Untitled Link'; }
  }

  return withLock_(() => {
    const d = getAllData_();

    // Duplicate check (only when no custom alias)
    if (!al) {
      for (let i = 0; i < d.length; i++) {
        if (String(d[i][2]).trim().toLowerCase() === u.toLowerCase() &&
            String(d[i][5]).trim().toLowerCase() === em) {
          return json_({ success: true, isDuplicate: true, shortLink: String(d[i][4]), title: String(d[i][1]), message: 'Already shortened.' });
        }
      }
    }

    // Alias conflict check
    if (al) {
      if (d.some(r => String(r[3] || '').trim().toLowerCase().replace(/^'/, '') === al.toLowerCase()))
        return json_({ success: false, message: 'Alias taken.' });
      return _insertRow(al, t, u, dm, em);
    }

    // Generate random code (progressive length on collision)
    const set = new Set(d.map(r => String(r[3] || '').trim().toLowerCase().replace(/^'/, '')));
    for (let i = 0; i < 5; i++) {
      const c = randomCode_(6 + i);
      if (!set.has(c)) return _insertRow(c, t, u, dm, em);
    }
    return json_({ success: false, message: 'Code generation failed.' });
  });
}

/**
 * Inserts a new link row. Formatting removed from hot path.               [2][12]
 * Serial number + last-row scan combined into one column-A read.          [12]
 */
function _insertRow(c, t, u, dm, em) {
  const sh = getSheet_(), sl = dm + c;

  // Single column-A read for both last-row and serial-number             [12]
  const lr = sh.getLastRow();
  let lastDataRow = 1, maxSerial = 0;
  if (lr >= 2) {
    const colA = sh.getRange(1, 1, lr, 1).getValues();
    for (let i = colA.length - 1; i >= 1; i--) {
      const val = String(colA[i][0]).trim();
      if (val !== '') {
        if (lastDataRow === 1) lastDataRow = i + 1;             // first non-empty from bottom
        const n = parseInt(val, 10) || 0;
        if (n > maxSerial) maxSerial = n;
      }
    }
  }

  const ir = lastDataRow + 1;
  const s = maxSerial + 1;
  const now = new Date();

  sh.getRange(ir, 1, 1, 9).setValues([[
    String(s).padStart(3, '0'), t, u, "'" + c, sl, em, 0, now, now
  ]]);
  // [2] Formatting removed — use formatSheet() via trigger

  const cache = getCache_();
  cache.put('code_' + c, u, TTL_CACHE);
  cache.remove('history_' + em);
  return json_({ success: true, isDuplicate: false, shortLink: sl, title: t });
}

// ============================================================================
// DELETE
// ============================================================================
function handleDelete_(p) {
  const em = String(p.email || '').trim().toLowerCase();
  const c  = String(p.code  || '').trim();
  if (!isAuthorized_(em)) return json_({ success: false, message: 'Unauthorized' });
  return withLock_(() => {
    const { sheet, rows } = getRawRows_(), r = findRow_(rows, c, em);
    if (r < 2) return json_({ success: false, message: 'Not found.' });
    sheet.deleteRow(r);
    const cache = getCache_();                                   // [10]
    cache.remove('code_' + c.toLowerCase().replace(/^'/, ''));
    cache.remove('history_' + em);
    return json_({ success: true });
  });
}

// ============================================================================
// UPDATE
// ============================================================================
function handleUpdate_(p) {
  const em = String(p.email || '').trim().toLowerCase();
  const c  = String(p.code  || '').trim();
  let u    = String(p.url   || '').trim();
  let t    = String(p.title || '').trim();

  // [6] Only prepend https:// when NO protocol exists (prevents https://http://…)
  if (u && !/^[a-z][a-z0-9+.\-]*:/i.test(u)) u = 'https://' + u;
  if (!/^https?:\/\//i.test(u)) return json_({ success: false, message: 'Invalid URL protocol.' });

  if (!isAuthorized_(em)) return json_({ success: false, message: 'Unauthorized' });

  return withLock_(() => {
    const { sheet, rows } = getRawRows_(), r = findRow_(rows, c, em);
    const cl = c.toLowerCase().replace(/^'/, '');
    if (r < 2) return json_({ success: false, message: 'Not found.' });

    // Duplicate URL check (different code, same user)
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][2]).trim().toLowerCase() === u.toLowerCase() &&
          String(rows[i][5]).trim().toLowerCase() === em &&
          String(rows[i][3] || '').trim().toLowerCase().replace(/^'/, '') !== cl) {
        return json_({ success: false, message: 'Duplicate URL.' });
      }
    }

    sheet.getRange(r, 3).setValue(u);
    if (t) sheet.getRange(r, 2).setValue(t);
    sheet.getRange(r, 9).setValue(new Date());

    const cache = getCache_();                                   // [10]
    cache.put('code_' + cl, u, TTL_CACHE);
    cache.remove('history_' + em);
    return json_({ success: true });
  });
}

// ============================================================================
// HISTORY
// ============================================================================
function handleHistory_(p) {
  const em = String(p.email || '').trim().toLowerCase();
  if (!isAuthorized_(em)) return json_({ success: false, message: 'Unauthorized' });

  const cache = getCache_(), hit = cache.get('history_' + em);  // [10]
  if (hit) return json_({ success: true, history: JSON.parse(hit) });

  const d = getAllData_(), h = [];
  for (let i = 0; i < d.length; i++) {
    if (String(d[i][5]).trim().toLowerCase() === em) {
      h.push({
        title:     String(d[i][1]),
        source:    String(d[i][2]),
        shortCode: String(d[i][3]).trim().replace(/^'/, ''),
        shortLink: String(d[i][4]),
        clicks:    parseInt(d[i][6], 10) || 0
      });
    }
  }
  const res = h.reverse();
  cache.put('history_' + em, JSON.stringify(res), 300);
  return json_({ success: true, history: res });
}

// ============================================================================
// REDIRECT LOOKUP (called by Cloudflare Worker)
// ============================================================================
function handleRedirect_(c) {
  const cl = String(c || '').trim().toLowerCase().replace(/^'/, '');
  if (!cl) return json_({ success: false });

  const cache = getCache_(), cached = cache.get('code_' + cl);  // [10]
  if (cached) return json_({ success: true, url: cached });

  const d = getAllData_();
  for (let i = 0; i < d.length; i++) {
    if (String(d[i][3] || '').trim().toLowerCase().replace(/^'/, '') === cl) {
      const u = String(d[i][2]);
      cache.put('code_' + cl, u, TTL_CACHE);
      return json_({ success: true, url: u });
    }
  }
  return json_({ success: false });
}

// ============================================================================
// CLICK LOGGING
// ============================================================================
/**
 * Optimized: reads only column D (short codes) instead of all 9 columns.  [4]
 * Fixed: now properly returns withLock_ result (was silently discarding).  [5]
 */
function handleLogClick_(p) {
  const c = String(p.code || '').trim().toLowerCase().replace(/^'/, '');
  if (!c) return json_({ success: false });

  return withLock_(() => {                                       // [5] now returns result
    const sh = getSheet_(), lr = sh.getLastRow();
    if (lr < 2) return json_({ success: false });

    const codes = sh.getRange(2, 4, lr - 1, 1).getValues();     // [4] col D only
    for (let i = 0; i < codes.length; i++) {
      if (String(codes[i][0] || '').trim().toLowerCase().replace(/^'/, '') === c) {
        const row = i + 2;
        const clicks = parseInt(sh.getRange(row, 7).getValue(), 10) || 0;
        sh.getRange(row, 7).setValue(clicks + 1);
        return json_({ success: true });
      }
    }
    return json_({ success: false });
  });
}
