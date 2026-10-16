'use strict';

/* ===================== מצב ושמירה ===================== */
const STORE_KEY = 'bis-rishon-v1';
const DAY = 86400000;
const EXPOSURE_GOAL = 10; // מספר טעימות "הוגן" לפי מחקרי חשיפה חוזרת (8–10+)

const defaultState = () => ({
  baby: null,                 // { name, birth }
  logs: [],                   // { id, foodId, ts, liked, amount, symptoms:[], notes }
  customFoods: [],
  cleared: {},                // allergenKey -> ts שבו ההורה סימן שהרגישות נשללה ע״י רופא/ה
  settings: { disabled: ['shellfish'], targets: {}, notify: false, lastNotified: '' },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* אחסון חסום – נעבוד בזיכרון */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('לא ניתן לשמור במכשיר זה 😕'); }
}

/* ===================== עזרים ===================== */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysBetween = (a, b) => Math.floor((startOfDay(b) - startOfDay(a)) / DAY);

const allFoods = () => FOODS.concat(state.customFoods);
const foodById = (id) => allFoods().find((f) => f.id === id);
const activeAllergens = () => Object.keys(ALLERGENS).filter((k) => !state.settings.disabled.includes(k));
const targetFor = (k) => state.settings.targets[k] ?? ALLERGENS[k].weeklyTarget;

const REACTIONS = [
  { id: 'love', e: '😍', t: 'אהב/ה' },
  { id: 'ok',   e: '🙂', t: 'בסדר' },
  { id: 'meh',  e: '😐', t: 'ככה' },
  { id: 'no',   e: '😖', t: 'לא אהב/ה' },
];
const AMOUNTS = [
  { id: 'lick',  t: 'ליקוק' },
  { id: 'taste', t: 'טעימה' },
  { id: 'spoon', t: 'כפית+' },
  { id: 'meal',  t: 'מנה' },
];
const SYMPTOMS = [
  { id: 'mouthrash', t: 'פריחה סביב הפה' },
  { id: 'hives',     t: 'סרפדת / פריחה בגוף' },
  { id: 'vomit',     t: 'הקאה' },
  { id: 'diarrhea',  t: 'שלשול' },
  { id: 'fussy',     t: 'אי-שקט חריג' },
  { id: 'swelling',  t: 'נפיחות בפנים/שפתיים', severe: true },
  { id: 'breathing', t: 'קושי נשימה / צפצופים', severe: true },
  { id: 'lethargy',  t: 'רפיון / חיוורון', severe: true },
  { id: 'repeatvomit', t: 'הקאות חוזרות', severe: true },
];
const SEVERE = SYMPTOMS.filter((s) => s.severe).map((s) => s.id);

function ageText(birth) {
  if (!birth) return '';
  const b = new Date(birth), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) m--;
  if (m < 0) return '';
  if (m < 1) return `${daysBetween(b, n)} ימים`;
  if (m < 24) {
    const wk = Math.floor((n - new Date(b.getFullYear(), b.getMonth() + m, b.getDate())) / (7 * DAY));
    return m === 1 ? 'חודש' : `${m} חודשים` + (wk > 0 ? ` ו-${wk} שב׳` : '');
  }
  return `${Math.floor(m / 12)} שנים ו-${m % 12} חודשים`;
}
function ageMonths() {
  if (!state.baby?.birth) return null;
  return (Date.now() - new Date(state.baby.birth)) / (30.44 * DAY);
}
function relDay(ts) {
  const d = daysBetween(ts, Date.now());
  if (d === 0) return 'היום';
  if (d === 1) return 'אתמול';
  if (d < 7) return `לפני ${d} ימים`;
  return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}
function babyName() { return state.baby?.name || 'הקטנ/ה'; }

/* ===================== חישובים ===================== */
function logsFor(foodId) { return state.logs.filter((l) => l.foodId === foodId); }

function allergenLogs(key) {
  return state.logs.filter((l) => foodById(l.foodId)?.allergen === key).sort((a, b) => b.ts - a.ts);
}

// סטטוס אלרגן: notStarted / introducing / maintaining / suspected
function allergenInfo(key) {
  const a = ALLERGENS[key];
  const logs = allergenLogs(key);
  const clearedAt = state.cleared[key] || 0;
  const reacted = logs.find((l) => l.symptoms?.length && l.ts > clearedAt);
  const tolerated = logs.filter((l) => !l.symptoms?.length);
  const last = tolerated[0];
  const now = Date.now();
  const weekCount = tolerated.filter((l) => now - l.ts < 7 * DAY).length;
  const target = targetFor(key);
  const daysSince = last ? daysBetween(last.ts, now) : null;
  // ימי החשיפה ב-7 הימים האחרונים (לנקודות)
  const weekDays = [...new Set(tolerated.filter((l) => now - l.ts < 7 * DAY).map((l) => startOfDay(l.ts)))].length;

  let status = 'notStarted';
  if (reacted) status = 'suspected';
  else if (tolerated.length >= 3) status = 'maintaining';
  else if (tolerated.length > 0) status = 'introducing';

  let level = 'ok';
  if (status === 'notStarted') level = 'new';
  else if (status !== 'suspected') {
    if (daysSince >= a.maxGap) level = 'overdue';
    else if (weekCount < target && daysSince >= 2) level = 'soon';
    else if (status === 'introducing' && daysSince >= 3) level = 'soon';
  }
  return { key, a, logs, tolerated, last, weekCount, weekDays, target, daysSince, status, level, reacted };
}

const STATUS_TEXT = {
  notStarted: 'עוד לא נחשף/ה',
  introducing: 'בשלב היכרות',
  maintaining: 'בשמירה ✓',
  suspected: 'חשד לתגובה – בבירור',
};

function reminders() {
  const out = [];
  const age = ageMonths();
  for (const k of activeAllergens()) {
    const info = allergenInfo(k);
    if (info.status === 'suspected') {
      out.push({ info, kind: 'suspected', title: `${info.a.name}: נרשמה תגובה`, text: 'הפסיקו לתת ופנו לרופא/ת ילדים. התזכורות מושהות.' });
    } else if (info.level === 'overdue') {
      out.push({ info, kind: 'overdue', title: `${info.a.name} – עברו ${info.daysSince} ימים!`, text: 'כדי לשמור על הסבילות כדאי לתת היום.' });
    } else if (info.level === 'soon') {
      const left = Math.max(info.target - info.weekCount, 1);
      out.push({ info, kind: 'soon', title: `${info.a.name} – הגיע הזמן`, text: info.status === 'introducing' ? `בשלב היכרות – כדאי להמשיך לחשוף (${info.tolerated.length}/3 חשיפות).` : `${info.weekCount}/${info.target} השבוע · עוד ${left} כדי לעמוד ביעד` });
    }
  }
  // הצעה לאלרגן חדש (אחד בכל פעם, בהפרש של 2–3 ימים)
  if (age === null || age >= 4) {
    const notStarted = activeAllergens().map(allergenInfo).filter((i) => i.status === 'notStarted');
    const lastIntro = lastNewAllergenIntro();
    const gapOk = !lastIntro || daysBetween(lastIntro, Date.now()) >= 2;
    if (notStarted.length && gapOk) {
      const order = { high: 0, medium: 1, low: 2 };
      notStarted.sort((x, y) => order[x.a.priority] - order[y.a.priority]);
      const n = notStarted[0];
      out.push({ info: n, kind: 'new', title: `אלרגן חדש להכיר: ${n.a.name}`, text: 'חשיפה מוקדמת מפחיתה סיכון לאלרגיה. מומלץ בבוקר, בכמות קטנה.' });
    }
  }
  const rank = { suspected: 0, overdue: 1, soon: 2, new: 3 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

function lastNewAllergenIntro() {
  let latest = 0;
  for (const k of Object.keys(ALLERGENS)) {
    const logs = allergenLogs(k);
    if (logs.length) latest = Math.max(latest, logs[logs.length - 1].ts);
  }
  return latest || null;
}

/* ===================== ניווט ===================== */
let tab = 'home';
let foodFilter = { cat: 'all', q: '', show: 'all' };

$$('.tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
$('#settingsBtn').addEventListener('click', openSettings);

function go(t) {
  tab = t;
  $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const v = $('#view');
  $('#babyLine').textContent = state.baby ? `${state.baby.name} · ${ageText(state.baby.birth)}` : 'מעקב טעימות ואלרגנים';
  if (!state.baby) { v.innerHTML = onboardingHTML(); bindOnboarding(); updateBadge(); return; }
  v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  const views = { home: homeHTML, foods: foodsHTML, allergens: allergensHTML, journal: journalHTML, guide: guideHTML };
  v.innerHTML = views[tab]();
  bindView();
  updateBadge();
}

function updateBadge() {
  const btn = $('.tabbar [data-tab="allergens"]');
  $('.dot', btn)?.remove();
  if (!state.baby) return;
  const n = reminders().filter((r) => r.kind !== 'new').length;
  if (n) btn.insertAdjacentHTML('beforeend', `<b class="dot">${n}</b>`);
}

/* ===================== מסכים ===================== */
function onboardingHTML() {
  return `
  <div class="onboard">
    <span class="big">🥑</span>
    <h2>ברוכים הבאים ל״ביס ראשון״!</h2>
    <p class="muted">מעקב אחר כל טעימה, סימון אלרגנים ותזכורות לשמירה על חשיפה קבועה.</p>
    <form class="card form" id="onboardForm">
      <label for="obName">איך קוראים לתינוק/ת?</label>
      <input type="text" id="obName" required maxlength="30" placeholder="למשל: נועה">
      <label for="obBirth">תאריך לידה</label>
      <input type="date" id="obBirth" required max="${new Date().toISOString().slice(0, 10)}">
      <div style="height:16px"></div>
      <button class="btn block" type="submit">יאללה מתחילים! 🎉</button>
    </form>
    <p class="small muted">⚕️ האפליקציה היא כלי מעקב ומידע כללי, ואינה תחליף לייעוץ רפואי.</p>
  </div>`;
}
function bindOnboarding() {
  $('#onboardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.baby = { name: $('#obName').value.trim(), birth: $('#obBirth').value };
    save();
    celebrate('🎉', `שלום ${state.baby.name}!`);
    render();
  });
}

function homeHTML() {
  const triedIds = new Set(state.logs.map((l) => l.foodId));
  const triedCount = [...triedIds].filter((id) => foodById(id)).length;
  const allergenDone = activeAllergens().filter((k) => ['maintaining', 'introducing'].includes(allergenInfo(k).status)).length;
  const weekLogs = state.logs.filter((l) => Date.now() - l.ts < 7 * DAY).length;
  const rems = reminders();
  const age = ageMonths();
  const recent = [...state.logs].sort((a, b) => b.ts - a.ts).slice(0, 4);
  const heroEmojis = ['🥑', '🍌', '🥕', '🍓', '🥦', '🍠'];
  const heroEmoji = heroEmojis[new Date().getDate() % heroEmojis.length];

  let ageNote = '';
  if (age !== null && age < 4) ageNote = `<div class="card small">👶 ${esc(babyName())} עוד צעיר/ה למוצקים. ההמלצה היא להתחיל סביב גיל 6 חודשים (ולא לפני 4), כשמופיעים סימני מוכנות. בינתיים – אפשר לקרוא את המדריך 💡</div>`;

  return `
  <section class="card hero">
    <h2>היי ${esc(babyName())}! 👋</h2>
    <p>${greetingLine()}</p>
    <span class="hero-emoji">${heroEmoji}</span>
    <div class="stats">
      <div class="stat"><b>${triedCount}</b><span>מוצרים נטעמו</span></div>
      <div class="stat"><b>${allergenDone}/${activeAllergens().length}</b><span>אלרגנים הוכרו</span></div>
      <div class="stat"><b>${weekLogs}</b><span>טעימות השבוע</span></div>
    </div>
  </section>
  ${ageNote}
  <h3 class="section-title">🔔 מה היום?</h3>
  ${rems.length ? rems.map(reminderHTML).join('') : `<div class="card empty" style="padding:20px"><span class="e-emoji">🌟</span><p>הכל מעודכן! כל האלרגנים בשמירה.</p></div>`}
  <button class="btn block" data-action="quicklog">＋ רישום טעימה</button>
  <h3 class="section-title">🕒 טעימות אחרונות</h3>
  ${recent.length ? `<div class="card" style="padding:4px">${recent.map(logHTML).join('')}</div>` : `<div class="empty"><span class="e-emoji">🥄</span><p>עוד אין טעימות. בחרו מוצר והתחילו!</p></div>`}
  <h3 class="section-title">💡 טיפ יומי</h3>
  <div class="card">${dailyTip()}</div>`;
}

function greetingLine() {
  const h = new Date().getHours();
  if (h < 11) return 'בוקר טוב! בוקר הוא זמן מצוין להכיר אלרגן חדש ☀️';
  if (h < 16) return 'צהריים טובים! מה טועמים היום?';
  if (h < 20) return 'ערב טוב! אלרגנים חדשים – עדיף להשאיר למחר בבוקר 🌙';
  return 'לילה טוב! נתראה מחר עם טעמים חדשים ✨';
}

function dailyTip() {
  const tips = GUIDE.flatMap((g) => g.body.map((b) => ({ icon: g.icon, b })));
  const d = Math.floor(Date.now() / DAY);
  const t = tips[d % tips.length];
  return `<span style="font-size:24px">${t.icon}</span> ${esc(t.b)}`;
}

function reminderHTML(r) {
  return `
  <div class="reminder ${r.kind}">
    <span class="r-emoji anim-${r.kind === 'overdue' ? 'shake' : 'pulse'}">${r.info.a.emoji}</span>
    <div class="r-text"><b>${esc(r.title)}</b><small>${esc(r.text)}</small></div>
    ${r.kind === 'suspected' ? `<button class="btn small ghost" data-allergen="${r.info.key}">פרטים</button>` : `<button class="btn small" data-quick-allergen="${r.info.key}">נתנו ✓</button>`}
  </div>`;
}

function foodsHTML() {
  const q = foodFilter.q.trim();
  let list = allFoods();
  if (foodFilter.cat !== 'all') list = list.filter((f) => f.cat === foodFilter.cat || (foodFilter.cat === 'allergen' && f.allergen));
  if (q) list = list.filter((f) => f.name.includes(q));
  if (foodFilter.show === 'tried') list = list.filter((f) => logsFor(f.id).length);
  if (foodFilter.show === 'untried') list = list.filter((f) => !logsFor(f.id).length);

  const chips = [{ id: 'all', name: 'הכל', emoji: '🍽️' }, ...CATEGORIES.filter((c) => c.id !== 'custom' || state.customFoods.length)]
    .map((c) => `<button class="chip ${foodFilter.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.name}</button>`).join('');
  const shows = [['all', 'הכל'], ['tried', 'נטעמו'], ['untried', 'עוד לא']]
    .map(([id, t]) => `<button class="chip ${foodFilter.show === id ? 'active' : ''}" data-show="${id}">${t}</button>`).join('');

  return `
  <input class="search" id="foodSearch" type="search" placeholder="🔍 חיפוש מוצר..." value="${esc(foodFilter.q)}">
  <div class="chips">${chips}</div>
  <div class="chips" style="margin-top:6px">${shows}</div>
  <div class="grid">
    ${list.map(foodCardHTML).join('')}
    <button class="food" data-action="addfood"><span class="f-emoji anim-pulse">➕</span><span class="f-name">מוצר חדש</span><span class="f-count">הוספה</span></button>
  </div>
  ${list.length ? '' : '<div class="empty"><span class="e-emoji">🤷</span><p>לא נמצאו מוצרים</p></div>'}`;
}

function foodCardHTML(f) {
  const n = logsFor(f.id).length;
  const pct = Math.min(100, (n / EXPOSURE_GOAL) * 100);
  const delay = (f.id.length * 137) % 1000;
  return `
  <button class="food ${n ? 'tried' : 'untried'} ${f.allergen ? 'is-allergen' : ''}" data-food="${f.id}">
    ${f.allergen ? '<span class="badge-allergen">⭐ אלרגן</span>' : ''}
    ${f.choke ? '<span class="badge-choke" title="שימו לב לצורת ההגשה">⚠️</span>' : ''}
    <span class="f-emoji anim-${f.anim || 'bounce'}" style="animation-delay:-${delay}ms">${f.emoji}</span>
    <span class="f-name">${esc(f.name)}</span>
    <span class="f-count">${n ? `${n} טעימות` : 'עוד לא'}</span>
    ${n ? `<span class="ring"><i style="width:${pct}%"></i></span>` : ''}
  </button>`;
}

function allergensHTML() {
  const keys = activeAllergens();
  const infos = keys.map(allergenInfo);
  return `
  <div class="card small">
    ⭐ <b>למה זה חשוב?</b> חשיפה מוקדמת וקבועה לאלרגנים מפחיתה משמעותית את הסיכון לאלרגיה. אחרי שאלרגן הוכנס – צריך לשמור עליו בתפריט באופן קבוע (בבוטנים: ~3 פעמים בשבוע).
    <a href="#" data-goto-guide>עוד במדריך ←</a>
  </div>
  ${infos.map(allergenCardHTML).join('')}
  <button class="btn ghost block" data-action="calendar">📅 הוספת תזכורות קבועות ליומן</button>
  <p class="small muted" style="text-align:center">אפשר לשנות יעדים ולכבות אלרגנים בהגדרות ⚙️</p>`;
}

function allergenCardHTML(i) {
  const r = 28, c = 2 * Math.PI * r;
  const pct = i.status === 'notStarted' ? 0 : Math.min(1, i.weekCount / i.target);
  const ringColor = i.status === 'suspected' ? 'var(--red)' : i.level === 'overdue' ? 'var(--red)' : i.level === 'soon' ? 'var(--yellow)' : 'var(--green)';
  const dots = Array.from({ length: Math.max(i.target, i.weekDays) }, (_, n) => `<i class="${n < i.weekDays ? 'on' : ''}" style="animation-delay:${n * 80}ms"></i>`).join('');
  let line = 'עוד לא נחשף/ה';
  if (i.last) line = `אחרון: ${relDay(i.last.ts)} · ${i.weekCount}/${i.target} השבוע`;
  if (i.status === 'suspected') line = `תגובה נרשמה ${relDay(i.reacted.ts)}`;
  return `
  <div class="card allergen-card" data-allergen="${i.key}" role="button" tabindex="0">
    <div class="a-emoji">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="${ringColor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="transition:stroke-dashoffset .8s"/></svg>
      <span class="${i.level === 'overdue' ? 'anim-shake' : i.status === 'maintaining' ? 'anim-float' : ''}" style="font-size:30px">${i.a.emoji}</span>
    </div>
    <div>
      <b>${i.a.name}</b><br>
      <span class="status-pill st-${i.status}">${STATUS_TEXT[i.status]}</span>
      <div class="small muted lvl-${i.level}">${line}</div>
      ${i.status !== 'notStarted' && i.status !== 'suspected' ? `<div class="week-dots" title="ימי חשיפה ב-7 הימים האחרונים">${dots}</div>` : ''}
    </div>
    ${i.status === 'suspected' ? '' : `<button class="btn small" data-quick-allergen="${i.key}">＋</button>`}
  </div>`;
}

function journalHTML() {
  if (!state.logs.length) return `<div class="empty"><span class="e-emoji">📖</span><p>היומן ריק. כל טעימה שתרשמו תופיע כאן.</p></div>`;
  const sorted = [...state.logs].sort((a, b) => b.ts - a.ts);
  const groups = [];
  for (const l of sorted) {
    const d = startOfDay(l.ts);
    if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, items: [] });
    groups[groups.length - 1].items.push(l);
  }
  return `
  <div class="row" style="margin-bottom:6px">
    <div class="small muted">${state.logs.length} טעימות · ${new Set(state.logs.map((l) => l.foodId)).size} מוצרים שונים</div>
  </div>
  ${groups.map((g) => `
    <div class="day-head">${new Date(g.d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <div class="card" style="padding:4px">${g.items.map((l) => logHTML(l, true)).join('')}</div>`).join('')}`;
}

function logHTML(l, withDelete) {
  const f = foodById(l.foodId) || { emoji: '❔', name: 'מוצר שנמחק' };
  const r = REACTIONS.find((x) => x.id === l.liked);
  const a = AMOUNTS.find((x) => x.id === l.amount);
  const sym = (l.symptoms || []).map((s) => SYMPTOMS.find((x) => x.id === s)?.t).filter(Boolean);
  const time = new Date(l.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return `
  <div class="log ${sym.length ? 'has-symptoms' : ''}">
    <span class="l-emoji">${f.emoji}</span>
    <div class="l-main">
      <b>${esc(f.name)} ${f.allergen ? '⭐' : ''}</b>
      <small>${withDelete ? time : relDay(l.ts)}${a ? ' · ' + a.t : ''}${sym.length ? ' · ⚠️ ' + esc(sym.join(', ')) : ''}${l.notes ? ' · ' + esc(l.notes) : ''}</small>
    </div>
    <span class="l-react">${r ? r.e : ''}</span>
    ${withDelete ? `<button class="l-del" data-del="${l.id}" aria-label="מחיקה">🗑️</button>` : ''}
  </div>`;
}

function guideHTML() {
  return `
  <div class="card small">📚 התוכן מבוסס על הנחיות AAP, NIAID, EAACI, CSACI ומחקרים עדכניים. <b>אינו מחליף ייעוץ רפואי</b> – בכל שאלה, ובמיוחד אם יש אקזמה קשה או אלרגיה ידועה, התייעצו עם רופא/ת הילדים.</div>
  <div class="emergency">🚨 קושי בנשימה, נפיחות בפנים, רפיון או הקאות חוזרות אחרי אכילה? <a href="tel:101">חייגו 101</a></div>
  ${GUIDE.map((g, n) => `
    <details class="guide ${g.danger ? 'danger' : ''}" ${n === 1 ? 'open' : ''}>
      <summary><span style="font-size:24px">${g.icon}</span>${esc(g.title)}</summary>
      <ul>${g.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </details>`).join('')}
  <details class="guide">
    <summary><span style="font-size:24px">⭐</span>איך להגיש כל אלרגן</summary>
    <ul>${Object.values(ALLERGENS).map((a) => `<li><b>${a.emoji} ${a.name}:</b> ${esc(a.how)} ${a.note ? `<br><span class="muted">${esc(a.note)}</span>` : ''}</li>`).join('')}</ul>
  </details>
  <details class="guide">
    <summary><span style="font-size:24px">🔗</span>מקורות</summary>
    <ul class="sources">${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>
  </details>`;
}

/* ===================== אירועים ===================== */
function bindView() {
  const v = $('#view');
  v.onclick = (e) => {
    const t = e.target.closest('[data-food],[data-cat],[data-show],[data-action],[data-allergen],[data-quick-allergen],[data-del],[data-goto-guide]');
    if (!t) return;
    if (t.dataset.quickAllergen) { e.stopPropagation(); return quickAllergen(t.dataset.quickAllergen); }
    if (t.dataset.food) return openFood(t.dataset.food);
    if (t.dataset.cat) { foodFilter.cat = t.dataset.cat; return render(); }
    if (t.dataset.show) { foodFilter.show = t.dataset.show; return render(); }
    if (t.dataset.allergen) return openAllergen(t.dataset.allergen);
    if (t.dataset.del) return deleteLog(t.dataset.del);
    if (t.hasAttribute('data-goto-guide')) { e.preventDefault(); return go('guide'); }
    const a = t.dataset.action;
    if (a === 'quicklog') { go('foods'); setTimeout(() => $('#foodSearch')?.focus(), 50); }
    if (a === 'addfood') openAddFood();
    if (a === 'calendar') downloadICS();
  };
  v.onkeydown = (e) => { if (e.key === 'Enter' && e.target.dataset.allergen) openAllergen(e.target.dataset.allergen); };
  const s = $('#foodSearch');
  if (s) s.oninput = () => {
    foodFilter.q = s.value;
    const pos = s.selectionStart;
    render();
    const ns = $('#foodSearch'); ns.focus(); ns.setSelectionRange(pos, pos);
  };
}

function deleteLog(id) {
  if (!confirm('למחוק את הרישום?')) return;
  state.logs = state.logs.filter((l) => l.id !== id);
  save(); render(); toast('נמחק');
}

// כפתור "נתנו ✓" – בוחר את המוצר שבו השתמשו לאחרונה לאותו אלרגן
function quickAllergen(key) {
  const recent = allergenLogs(key)[0];
  const food = recent ? foodById(recent.foodId) : allFoods().find((f) => f.allergen === key);
  if (food) openLog(food.id);
}

/* ===================== מודאל ===================== */
function openModal(html, onBind) {
  $('#modalBody').innerHTML = html;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  onBind?.($('#modalBody'));
}
function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}
$('#modal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function openFood(id) {
  const f = foodById(id);
  if (!f) return;
  const logs = logsFor(id).sort((a, b) => b.ts - a.ts);
  const n = logs.length;
  const cat = CATEGORIES.find((c) => c.id === f.cat);
  const al = f.allergen ? ALLERGENS[f.allergen] : null;
  const likes = logs.filter((l) => ['love', 'ok'].includes(l.liked)).length;
  const reacted = logs.some((l) => l.symptoms?.length);
  let encourage = '';
  if (n === 0) encourage = 'טעימה ראשונה מחכה! 🌟';
  else if (n < EXPOSURE_GOAL && logs[0]?.liked === 'no') encourage = `לא אהב/ה? זה טבעי לגמרי. מחקרים מראים שלפעמים צריך 8–10 חשיפות ויותר. עוד ${EXPOSURE_GOAL - n} ונראה 💪`;
  else if (n < EXPOSURE_GOAL) encourage = `עוד ${EXPOSURE_GOAL - n} טעימות כדי לתת לטעם הזה צ׳אנס הוגן`;
  else encourage = `${n} טעימות – ${likes ? 'מוצר מוכר ואהוב! 🏆' : 'נתתם צ׳אנס הוגן. אפשר להמשיך להציע מדי פעם בצורות אחרות.'}`;

  openModal(`
    <div class="detail-hero" style="--stage:${cat?.color || '#ffd9c9'}">
      <div class="stage"><span class="big anim-${f.anim || 'bounce'}">${f.emoji}</span></div>
      <h2>${esc(f.name)}</h2>
      <div class="muted small">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    </div>
    ${al ? `<div class="allergen-banner"><span class="anim-pulse" style="display:inline-block">⭐</span> אלרגן: ${al.name} – חשוב לשמור על חשיפה קבועה</div>` : ''}
    ${reacted ? `<div class="warn-banner">⚠️ נרשמה תגובה למוצר זה. מומלץ להתייעץ עם רופא/ה לפני מתן נוסף.</div>` : ''}
    <div class="progress">
      <div class="lbl"><span>טעימות</span><span>${n}/${EXPOSURE_GOAL}</span></div>
      <div class="bar"><i style="width:0" data-w="${Math.min(100, n / EXPOSURE_GOAL * 100)}"></i></div>
      <div class="small muted" style="margin-top:6px">${encourage}</div>
    </div>
    ${f.tip ? `<div class="card small">🍽️ <b>איך מגישים:</b> ${esc(f.tip)}</div>` : ''}
    ${f.choke ? `<div class="warn-banner small">⚠️ <b>בטיחות:</b> ${esc(f.choke)}</div>` : ''}
    ${al ? `<div class="card small">⭐ <b>הכנסת ${al.name}:</b> ${esc(al.how)}</div>` : ''}
    <button class="btn block" id="logBtn">😋 רישום טעימה</button>
    ${n ? `<h3 class="section-title">היסטוריה</h3><div class="card" style="padding:4px">${logs.slice(0, 8).map((l) => logHTML(l)).join('')}</div>` : ''}
    ${f.custom ? `<button class="btn ghost block" id="delFood" style="margin-top:10px">מחיקת מוצר</button>` : ''}
  `, (b) => {
    requestAnimationFrame(() => { const bar = $('.bar i', b); if (bar) bar.style.width = bar.dataset.w + '%'; });
    $('#logBtn', b).onclick = () => openLog(id);
    const del = $('#delFood', b);
    if (del) del.onclick = () => {
      if (!confirm('למחוק את המוצר ואת כל הטעימות שלו?')) return;
      state.customFoods = state.customFoods.filter((x) => x.id !== id);
      state.logs = state.logs.filter((l) => l.foodId !== id);
      save(); closeModal(); render();
    };
  });
}

function openLog(foodId) {
  const f = foodById(foodId);
  const al = f.allergen ? ALLERGENS[f.allergen] : null;
  const isFirstAllergen = al && allergenLogs(f.allergen).length === 0;
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  let warn = '';
  if (isFirstAllergen) {
    const lastIntro = lastNewAllergenIntro();
    warn += `<div class="allergen-banner">⭐ חשיפה ראשונה ל${al.name}! התחילו בכמות קטנה, בבית, כש${esc(babyName())} בריא/ה, ועקבו כשעתיים אחרי.</div>`;
    if (lastIntro && daysBetween(lastIntro, Date.now()) < 2) warn += `<div class="warn-banner small">💡 הוכנס אלרגן חדש לפני פחות מיומיים. מומלץ להמתין 2–3 ימים בין אלרגנים חדשים, כדי לזהות ממה הייתה תגובה.</div>`;
    if (new Date().getHours() >= 16) warn += `<div class="warn-banner small">🌙 שעת ערב – אלרגן חדש עדיף לתת בבוקר/צהריים, כדי שתוכלו לעקוב אחרי תגובה בזמן ערות.</div>`;
  }

  openModal(`
    <div class="detail-hero" style="padding:0">
      <span class="big anim-${f.anim || 'bounce'}" style="font-size:64px">${f.emoji}</span>
      <h2 style="font-size:22px">טעימה: ${esc(f.name)}</h2>
    </div>
    ${warn}
    <form class="form" id="logForm">
      <label>מתי?</label>
      <input type="datetime-local" id="lgTime" value="${now.toISOString().slice(0, 16)}" required>
      <label>איך היה?</label>
      <div class="choice-row" data-group="liked">${REACTIONS.map((r, i) => `<button type="button" class="choice ${i === 1 ? 'on' : ''}" data-val="${r.id}"><span class="ce">${r.e}</span>${r.t}</button>`).join('')}</div>
      <label>כמה?</label>
      <div class="choice-row" data-group="amount">${AMOUNTS.map((a, i) => `<button type="button" class="choice ${i === 1 ? 'on' : ''}" data-val="${a.id}">${a.t}</button>`).join('')}</div>
      <label>תסמינים? <span class="muted small">(השאירו ריק אם הכל תקין)</span></label>
      <div class="symptoms">${SYMPTOMS.map((s) => `<label class="${s.severe ? 'severe' : ''}"><input type="checkbox" value="${s.id}">${s.t}</label>`).join('')}</div>
      <div id="emergencyBox"></div>
      <label for="lgNotes">הערות</label>
      <textarea id="lgNotes" maxlength="200" placeholder="צורת הגשה, עם מה ערבבנו..."></textarea>
      <div style="height:14px"></div>
      <button class="btn block" type="submit">שמירה ✓</button>
    </form>
  `, (b) => {
    $$('.choice-row', b).forEach((row) => row.addEventListener('click', (e) => {
      const c = e.target.closest('.choice'); if (!c) return;
      $$('.choice', row).forEach((x) => x.classList.toggle('on', x === c));
    }));
    $('.symptoms', b).addEventListener('change', () => {
      const sel = $$('.symptoms input:checked', b).map((x) => x.value);
      const severe = sel.some((s) => SEVERE.includes(s));
      $('#emergencyBox', b).innerHTML = severe
        ? `<div class="emergency">🚨 אלה סימנים של תגובה אלרגית חמורה אפשרית. אם הם מתרחשים עכשיו – <a href="tel:101">חייגו 101 מיד</a>. אם יש אפיפן – השתמשו בו.</div>`
        : sel.length ? `<div class="warn-banner small">הפסיקו לתת את המזון, צלמו את התסמינים ופנו לרופא/ת הילדים. התזכורות לאלרגן זה יושהו.</div>` : '';
    });
    $('#logForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const log = {
        id: uid(), foodId,
        ts: new Date($('#lgTime', b).value).getTime() || Date.now(),
        liked: $('[data-group="liked"] .on', b)?.dataset.val,
        amount: $('[data-group="amount"] .on', b)?.dataset.val,
        symptoms: $$('.symptoms input:checked', b).map((x) => x.value),
        notes: $('#lgNotes', b).value.trim(),
      };
      state.logs.push(log);
      save();
      closeModal();
      const count = logsFor(foodId).length;
      if (log.symptoms.length) toast('נשמר. עקבו אחרי התסמינים והתייעצו עם רופא/ה 🩺');
      else celebrate(f.emoji, count === 1 ? `טעימה ראשונה של ${f.name}! 🎉` : count === EXPOSURE_GOAL ? `${EXPOSURE_GOAL} טעימות! אלופים 🏆` : `טעימה מס׳ ${count} 👏`);
      render();
    });
  });
}

function openAllergen(key) {
  const i = allergenInfo(key);
  const foods = allFoods().filter((f) => f.allergen === key);
  openModal(`
    <div class="detail-hero">
      <div class="stage" style="--stage:#ffe0a6"><span class="big anim-jelly">${i.a.emoji}</span></div>
      <h2>${i.a.name}</h2>
      <span class="status-pill st-${i.status}">${STATUS_TEXT[i.status]}</span>
    </div>
    ${i.status === 'suspected' ? `
      <div class="warn-banner">⚠️ נרשמה תגובה ב-${new Date(i.reacted.ts).toLocaleDateString('he-IL')}. אל תמשיכו לתת עד התייעצות עם רופא/ת ילדים או אלרגולוג/ית. התזכורות מושהות.</div>
      <button class="btn ghost block" id="clearBtn">הרופא/ה אישר/ה להמשיך – חידוש מעקב</button>` : ''}
    <div class="card small">
      <b>יעד שבועי:</b> ${i.target} פעמים · <b>מקסימום הפסקה:</b> ${i.a.maxGap} ימים<br>
      ${i.last ? `<b>חשיפה אחרונה:</b> ${relDay(i.last.ts)} · <b>השבוע:</b> ${i.weekCount}/${i.target}<br><b>סה״כ חשיפות:</b> ${i.tolerated.length}` : 'עוד לא נחשף/ה'}
    </div>
    <div class="card small">🍽️ <b>איך מגישים:</b> ${esc(i.a.how)}${i.a.note ? `<br><br>📌 ${esc(i.a.note)}` : ''}</div>
    <h3 class="section-title">בחרו מוצר לרישום</h3>
    <div class="grid" style="margin-top:0">${foods.map(foodCardHTML).join('')}</div>
  `, (b) => {
    $('.grid', b).addEventListener('click', (e) => { const t = e.target.closest('[data-food]'); if (t) openLog(t.dataset.food); });
    const c = $('#clearBtn', b);
    if (c) c.onclick = () => { state.cleared[key] = Date.now(); save(); closeModal(); render(); toast('המעקב חודש ✓'); };
  });
}

function openAddFood() {
  const emojis = ['🍽️', '🥗', '🍲', '🥞', '🧆', '🥟', '🍜', '🫓', '🥯', '🧇', '🍪', '🫒', '🥥', '🍍', '🍋', '🥜', '🌶️', '🥘'];
  const anims = ['bounce', 'wiggle', 'spin', 'float', 'pulse', 'jelly', 'swing', 'roll', 'hop', 'shake'];
  openModal(`
    <h2 style="margin-bottom:6px">✨ מוצר חדש</h2>
    <form class="form" id="addForm">
      <label for="afName">שם המוצר</label>
      <input type="text" id="afName" required maxlength="30" placeholder="למשל: שקשוקה">
      <label>אימוג׳י</label>
      <div class="choice-row" data-group="emoji">${emojis.map((e, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${e}" style="flex:0 0 52px"><span class="ce">${e}</span></button>`).join('')}</div>
      <label>אנימציה</label>
      <div class="choice-row" data-group="anim">${anims.map((a, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${a}" style="flex:0 0 52px"><span class="ce anim-${a}">🍽️</span></button>`).join('')}</div>
      <label for="afAllergen">מכיל אלרגן?</label>
      <select id="afAllergen"><option value="">לא</option>${Object.entries(ALLERGENS).map(([k, a]) => `<option value="${k}">${a.emoji} ${a.name}</option>`).join('')}</select>
      <label for="afTip">טיפ הגשה (לא חובה)</label>
      <input type="text" id="afTip" maxlength="120">
      <div style="height:14px"></div>
      <button class="btn block" type="submit">הוספה</button>
    </form>
  `, (b) => {
    $$('.choice-row', b).forEach((row) => row.addEventListener('click', (e) => {
      const c = e.target.closest('.choice'); if (!c) return;
      $$('.choice', row).forEach((x) => x.classList.toggle('on', x === c));
      if (row.dataset.group === 'emoji') $$('[data-group="anim"] .ce', b).forEach((x) => { x.textContent = c.dataset.val; });
    }));
    $('#addForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const allergen = $('#afAllergen', b).value;
      const f = {
        id: 'c_' + uid(), custom: true, cat: allergen ? 'allergen' : 'custom',
        name: $('#afName', b).value.trim(),
        emoji: $('[data-group="emoji"] .on', b).dataset.val,
        anim: $('[data-group="anim"] .on', b).dataset.val,
        tip: $('#afTip', b).value.trim(),
      };
      if (allergen) f.allergen = allergen;
      state.customFoods.push(f);
      save(); closeModal(); render(); openFood(f.id);
    });
  });
}

function openSettings() {
  const s = state.settings;
  const notifSupported = 'Notification' in window;
  openModal(`
    <h2 style="margin-bottom:6px">⚙️ הגדרות</h2>
    <form class="form" id="setForm">
      <label for="stName">שם</label>
      <input type="text" id="stName" value="${esc(state.baby?.name)}" maxlength="30">
      <label for="stBirth">תאריך לידה</label>
      <input type="date" id="stBirth" value="${esc(state.baby?.birth)}">
      <h3 class="section-title">⭐ אלרגנים ויעדים שבועיים</h3>
      <div class="card" style="padding:6px 14px">
        ${Object.entries(ALLERGENS).map(([k, a]) => `
          <div class="switch">
            <label style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" data-en="${k}" ${s.disabled.includes(k) ? '' : 'checked'}> ${a.emoji} ${a.name}</label>
            <span><input type="number" min="1" max="7" data-target="${k}" value="${targetFor(k)}" style="width:64px;padding:6px"> /שבוע</span>
          </div>`).join('')}
      </div>
      <h3 class="section-title">🔔 התראות</h3>
      <div class="card small">
        ${notifSupported ? `<label style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" id="stNotify" ${s.notify ? 'checked' : ''}> התראה יומית כשיש אלרגן שצריך לתת</label>
        <p class="muted">ההתראה מוצגת כשהאפליקציה נפתחת או פתוחה ברקע. לתזכורות מובטחות גם כשהאפליקציה סגורה – השתמשו ב״הוספת תזכורות ליומן״ במסך האלרגנים.</p>` : '<p>הדפדפן לא תומך בהתראות. השתמשו בתזכורות ליומן במסך האלרגנים.</p>'}
      </div>
      <button class="btn block" type="submit">שמירה</button>
    </form>
    <h3 class="section-title">💾 גיבוי</h3>
    <div class="row">
      <button class="btn ghost" id="exportBtn">ייצוא</button>
      <label class="btn ghost" style="text-align:center">ייבוא<input type="file" id="importInput" accept="application/json" hidden></label>
    </div>
    <p class="small muted">הנתונים נשמרים רק במכשיר הזה. מומלץ לגבות מדי פעם.</p>
    <button class="btn danger block" id="resetBtn" style="margin-top:20px">מחיקת כל הנתונים</button>
  `, (b) => {
    $('#setForm', b).addEventListener('submit', async (e) => {
      e.preventDefault();
      state.baby = { name: $('#stName', b).value.trim() || state.baby.name, birth: $('#stBirth', b).value || state.baby.birth };
      s.disabled = $$('[data-en]', b).filter((x) => !x.checked).map((x) => x.dataset.en);
      $$('[data-target]', b).forEach((x) => {
        const v = Math.max(1, Math.min(7, parseInt(x.value, 10) || 1));
        if (v === ALLERGENS[x.dataset.target].weeklyTarget) delete s.targets[x.dataset.target];
        else s.targets[x.dataset.target] = v;
      });
      const want = $('#stNotify', b)?.checked;
      if (want && Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        s.notify = p === 'granted';
        if (!s.notify) toast('ההרשאה להתראות נדחתה');
      } else s.notify = !!want;
      save(); closeModal(); render(); toast('נשמר ✓');
      maybeNotify(true);
    });
    $('#exportBtn', b).onclick = exportData;
    $('#importInput', b).onchange = (e) => importData(e.target.files[0]);
    $('#resetBtn', b).onclick = () => {
      if (!confirm('למחוק את כל הנתונים? לא ניתן לבטל.')) return;
      state = defaultState(); save(); closeModal(); go('home');
    };
  });
}

/* ===================== גיבוי ===================== */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bis-rishon-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!Array.isArray(data.logs)) throw new Error('bad');
      if (!confirm('הייבוא יחליף את הנתונים הנוכחיים. להמשיך?')) return;
      state = Object.assign(defaultState(), data);
      save(); closeModal(); go('home'); toast('יובא בהצלחה ✓');
    } catch { toast('קובץ לא תקין'); }
  };
  r.readAsText(file);
}

/* ===================== תזכורות ליומן (ICS) ===================== */
// יוצר אירועים חוזרים לכל אלרגן פעיל, מפוזרים על פני השבוע לפי היעד
function downloadICS() {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const spread = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 2, 4, 5], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
  const pad = (n) => String(n).padStart(2, '0');
  const start = new Date(); start.setDate(start.getDate() + 1);
  const dt = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const keys = activeAllergens().filter((k) => allergenInfo(k).status !== 'suspected');
  const ev = keys.map((k, n) => {
    const a = ALLERGENS[k];
    const offset = n % 2; // מפזר אלרגנים שונים על ימים שונים
    const byday = spread[targetFor(k)].map((d) => days[(d + offset) % 7]).join(',');
    const hour = 9 + (n % 3);
    return [
      'BEGIN:VEVENT',
      `UID:${k}-${Date.now()}@bis-rishon`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt}T${pad(hour)}0000`,
      `DURATION:PT15M`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
      `SUMMARY:${a.emoji} ${a.name} ל${babyName()}`,
      `DESCRIPTION:שמירה על חשיפה ל${a.name} (${targetFor(k)} פעמים בשבוע). ${a.how.replace(/[,;]/g, ' ')}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${a.name}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bis-rishon//HE', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'allergen-reminders.ics';
  a.click();
  toast('נוצר קובץ יומן – פתחו אותו כדי להוסיף את התזכורות 📅');
}

/* ===================== התראות ===================== */
async function maybeNotify(force) {
  const s = state.settings;
  if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted' || !state.baby) return;
  const today = new Date().toDateString();
  if (!force && s.lastNotified === today) return;
  if (new Date().getHours() < 8) return;
  const due = reminders().filter((r) => r.kind === 'overdue' || r.kind === 'soon');
  if (!due.length) return;
  const body = due.map((r) => `${r.info.a.emoji} ${r.title}`).join('\n');
  const title = `תזכורת אלרגנים ל${babyName()}`;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icons/icon.svg', badge: 'icons/icon.svg', tag: 'allergens', dir: 'rtl', lang: 'he' });
    else new Notification(title, { body, dir: 'rtl' });
    s.lastNotified = today; save();
  } catch (e) { /* התעלמות */ }
}

/* ===================== אפקטים ===================== */
function celebrate(emoji, msg) {
  const c = $('#celebrate');
  c.innerHTML = '';
  const extra = ['⭐', '✨', '💛', '🎉', emoji];
  for (let n = 0; n < 26; n++) {
    const p = document.createElement('span');
    p.className = 'p';
    p.textContent = extra[n % extra.length];
    const ang = (n / 26) * Math.PI * 2;
    const dist = 120 + Math.random() * 160;
    p.style.left = '50%'; p.style.top = '40%';
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist + 80}px`);
    p.style.setProperty('--rot', `${(Math.random() - .5) * 720}deg`);
    p.style.animationDelay = `${Math.random() * 120}ms`;
    c.appendChild(p);
  }
  const m = document.createElement('div');
  m.className = 'msg';
  m.innerHTML = `<span class="m-emoji">${emoji}</span>${esc(msg)}`;
  c.appendChild(m);
  navigator.vibrate?.(30);
  setTimeout(() => { c.innerHTML = ''; }, 1900);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===================== הפעלה ===================== */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
render();
maybeNotify();
setInterval(() => { maybeNotify(); if ($('#modal').hidden) updateBadge(); }, 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { maybeNotify(); render(); } });
