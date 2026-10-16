'use strict';
// חשבונות מקומיים (במכשיר) ועיבוד תמונה לאווטאר.
// הסיסמה נשמרת כ-hash (PBKDF2 + salt), לא כטקסט. הנתונים של כל חשבון נשמרים במפתח נפרד.

const Auth = (() => {
  const ACCOUNTS_KEY = 'bis-rishon-accounts';
  const SESSION_KEY = 'bis-rishon-session';
  const LEGACY_KEY = 'bis-rishon-v1';

  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const norm = (email) => email.trim().toLowerCase();

  async function hash(password, salt) {
    if (!crypto?.subtle) throw new Error('הדפדפן לא תומך בהצפנה. יש לפתוח את האפליקציה בכתובת מאובטחת (https).');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
    return b64(bits);
  }

  function accounts() { return read(ACCOUNTS_KEY, {}); }

  async function register(email, password) {
    const e = norm(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('כתובת המייל לא תקינה');
    if (password.length < 6) throw new Error('הסיסמה צריכה להכיל לפחות 6 תווים');
    const all = accounts();
    if (all[e]) throw new Error('כבר קיים חשבון עם המייל הזה – נסו להתחבר');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const isFirst = !Object.keys(all).length;
    all[e] = { id, salt: b64(salt), hash: await hash(password, salt), created: Date.now() };
    write(ACCOUNTS_KEY, all);
    // משתמשים בגרסה הקודמת (בלי חשבונות) – הנתונים עוברים לחשבון הראשון שנוצר
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (isFirst && legacy) { localStorage.setItem(dataKey(id), legacy); localStorage.removeItem(LEGACY_KEY); }
    localStorage.setItem(SESSION_KEY, id);
    return id;
  }

  async function login(email, password) {
    const acc = accounts()[norm(email)];
    if (!acc) throw new Error('לא נמצא חשבון עם המייל הזה');
    if (await hash(password, unb64(acc.salt)) !== acc.hash) throw new Error('הסיסמה שגויה');
    localStorage.setItem(SESSION_KEY, acc.id);
    return acc.id;
  }

  function logout() { localStorage.removeItem(SESSION_KEY); }

  function deleteAccount(id) {
    const all = accounts();
    for (const [e, a] of Object.entries(all)) if (a.id === id) delete all[e];
    write(ACCOUNTS_KEY, all);
    localStorage.removeItem(dataKey(id));
    logout();
  }

  function session() {
    const id = localStorage.getItem(SESSION_KEY);
    return id && Object.values(accounts()).some((a) => a.id === id) ? id : null;
  }
  function emailOf(id) { return Object.entries(accounts()).find(([, a]) => a.id === id)?.[0] || ''; }
  function dataKey(id) { return `bis-rishon-data:${id}`; }

  return { register, login, logout, deleteAccount, session, emailOf, dataKey };
})();

/* ===================== אווטאר ===================== */
const Avatar = (() => {
  const SIZE = 256;

  async function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('יש לבחור קובץ תמונה');
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('לא הצלחנו לקרוא את התמונה'));
        img.src = URL.createObjectURL(file);
      });
    }
  }

  // ציור התמונה בחיתוך ריבועי לפי זום והזזה, ואז הפעלת הסגנון
  function render(canvas, img, { zoom = 1, ox = 0, oy = 0, style = 'cartoon' }) {
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const w = img.width, h = img.height;
    const scale = (SIZE / Math.min(w, h)) * zoom;
    const dw = w * scale, dh = h * scale;
    const maxX = (dw - SIZE) / 2, maxY = (dh - SIZE) / 2;
    const x = Math.max(-maxX, Math.min(maxX, ox)), y = Math.max(-maxY, Math.min(maxY, oy));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, (SIZE - dw) / 2 + x, (SIZE - dh) / 2 + y, dw, dh);
    if (style !== 'natural') stylize(ctx, style);
    else glow(ctx);
    return { ox: x, oy: y };
  }

  function blur(src, n, r) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    const pass = (from, to, horiz) => {
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        let s0 = 0, s1 = 0, s2 = 0, c = 0;
        for (let k = -r; k <= r; k++) {
          const xx = horiz ? b + k : b, yy = horiz ? a : a + k;
          if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
          const i = (yy * n + xx) * 4;
          s0 += from[i]; s1 += from[i + 1]; s2 += from[i + 2]; c++;
        }
        const o = (a * n + b) * 4;
        to[o] = s0 / c; to[o + 1] = s1 / c; to[o + 2] = s2 / c; to[o + 3] = 255;
      }
    };
    pass(src, tmp, true); pass(tmp, out, false);
    return out;
  }

  // סגנון "קריקטורה" / "פסטל": החלקה, הגברת צבע, צמצום גוונים וקווי מתאר
  function stylize(ctx, style) {
    const n = SIZE;
    const id = ctx.getImageData(0, 0, n, n), d = id.data;
    let sm = blur(d, n, 2);
    sm = blur(sm, n, 1);
    const lum = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) lum[i] = sm[i * 4] * .299 + sm[i * 4 + 1] * .587 + sm[i * 4 + 2] * .114;
    const levels = style === 'pastel' ? 5 : 7;
    const step = 255 / (levels - 1);
    const sat = style === 'pastel' ? 1.15 : 1.45;
    const thr = style === 'pastel' ? 70 : 48;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, p = i * 4;
      let r = sm[p], g = sm[p + 1], b = sm[p + 2];
      const avg = (r + g + b) / 3;
      r = avg + (r - avg) * sat; g = avg + (g - avg) * sat; b = avg + (b - avg) * sat;
      r = Math.round(Math.max(0, Math.min(255, r)) / step) * step;
      g = Math.round(Math.max(0, Math.min(255, g)) / step) * step;
      b = Math.round(Math.max(0, Math.min(255, b)) / step) * step;
      if (style === 'pastel') { r = r * .7 + 255 * .3; g = g * .7 + 235 * .3; b = b * .7 + 245 * .3; }
      // Sobel
      let edge = 0;
      if (x > 0 && y > 0 && x < n - 1 && y < n - 1) {
        const L = (dx, dy) => lum[(y + dy) * n + x + dx];
        const gx = -L(-1, -1) - 2 * L(-1, 0) - L(-1, 1) + L(1, -1) + 2 * L(1, 0) + L(1, 1);
        const gy = -L(-1, -1) - 2 * L(0, -1) - L(1, -1) + L(-1, 1) + 2 * L(0, 1) + L(1, 1);
        edge = Math.hypot(gx, gy);
      }
      if (edge > thr) {
        const k = style === 'pastel' ? .55 : .25;
        r = r * k + (style === 'pastel' ? 90 : 40) * (1 - k);
        g = g * k + (style === 'pastel' ? 60 : 25) * (1 - k);
        b = b * k + (style === 'pastel' ? 110 : 45) * (1 - k);
      }
      d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
  }

  // סגנון "טבעי": רק חימום עדין ובהירות קלה
  function glow(ctx) {
    const id = ctx.getImageData(0, 0, SIZE, SIZE), d = id.data;
    for (let p = 0; p < d.length; p += 4) {
      d[p] = Math.min(255, d[p] * 1.04 + 6);
      d[p + 1] = Math.min(255, d[p + 1] * 1.02 + 4);
      d[p + 2] = Math.min(255, d[p + 2] * .98 + 2);
    }
    ctx.putImageData(id, 0, 0);
  }

  const toDataURL = (canvas) => canvas.toDataURL('image/jpeg', 0.88);

  return { loadImage, render, toDataURL, SIZE };
})();
