'use strict';
// חשבונות מקומיים (במכשיר) וחיתוך תמונה לאווטאר.
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

  // ציור התמונה בחיתוך ריבועי לפי זום והזזה
  function render(canvas, img, { zoom = 1, ox = 0, oy = 0 }) {
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const w = img.width, h = img.height;
    const scale = (SIZE / Math.min(w, h)) * zoom;
    const dw = w * scale, dh = h * scale;
    const maxX = (dw - SIZE) / 2, maxY = (dh - SIZE) / 2;
    const x = Math.max(-maxX, Math.min(maxX, ox)), y = Math.max(-maxY, Math.min(maxY, oy));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (SIZE - dw) / 2 + x, (SIZE - dh) / 2 + y, dw, dh);
    return { ox: x, oy: y };
  }

  const toDataURL = (canvas) => canvas.toDataURL('image/jpeg', 0.88);

  return { loadImage, render, toDataURL, SIZE };
})();
