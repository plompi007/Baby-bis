'use strict';
// שפה: עברית / English. נבחרת בכל מכשיר (ברירת מחדל לפי שפת הדפדפן), ונשמרת מקומית.
// L('טקסט', 'text') מחזיר את הטקסט בשפה הפעילה. התוכן (מוצרים, מתכונים...) מתורגם ב-i18n-en-*.js.

const LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'he') return q;
    const saved = localStorage.getItem('bis-lang');
    if (saved) return saved;
  } catch { /* ללא אחסון */ }
  return (navigator.language || 'he').toLowerCase().startsWith('he') ? 'he' : 'en';
})();
const IS_EN = LANG === 'en';
const LOCALE = IS_EN ? 'en-GB' : 'he-IL';
const L = (he, en) => (IS_EN ? en : he);
// חץ "קדימה" ו"אחורה" לפי כיוון הכתיבה
const FWD = IS_EN ? '→' : '←';
const BACK = IS_EN ? '←' : '→';

function setLang(lang) {
  try { localStorage.setItem('bis-lang', lang); } catch { /* ללא אחסון */ }
  const u = new URL(location.href);
  u.searchParams.delete('lang');
  location.replace(u.toString());
}

document.documentElement.lang = LANG;
document.documentElement.dir = IS_EN ? 'ltr' : 'rtl';

// טקסטים קבועים ב-index.html: data-en מחליף את הטקסט האחרון באלמנט, data-en-aria את התווית הנגישה
if (IS_EN) {
  document.querySelectorAll('[data-en-aria]').forEach((el) => el.setAttribute('aria-label', el.dataset.enAria));
  document.querySelectorAll('[data-en]').forEach((el) => {
    const t = [...el.childNodes].reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
    if (t) t.textContent = el.dataset.en; else el.append(el.dataset.en);
  });
  const d = document.querySelector('meta[name="description"]');
  if (d) d.content = 'Baby tasting & allergen exposure tracker';
}
