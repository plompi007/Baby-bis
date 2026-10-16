'use strict';

/* ===================== מצב ושמירה ===================== */
// הנתונים נשמרים לכל חשבון בנפרד (ראו auth.js)
const DAY = 86400000;
const EXPOSURE_GOAL = 10; // מספר טעימות "הוגן" לפי מחקרי חשיפה חוזרת (8–10+)

const SCHEMA_VERSION = 3;
const defaultState = () => withKids({
  v: SCHEMA_VERSION,
  onboarded: false,           // האם השאלון הראשוני הושלם
  parent: null,               // { name } – ההורה שמשתמש במכשיר
  kids: [],                   // [{ id, baby: { name, birth, gender }, avatar, cleared }]
  logs: [],                   // { id, kid, foodId, ts, liked, amount, texture, symptoms:[], notes, photo }
  customFoods: [],
  favNotes: [],
  favRecipes: [],
  settings: { disabled: ['shellfish', 'macadamia', 'brazil', 'pinenut'], targets: {}, notify: false, lastNotified: '' },
});

/* ---------- כמה ילדים ----------
   state.baby / state.avatar / state.cleared מצביעים תמיד על הילד הפעיל (נבחר בכל מכשיר בנפרד),
   כך ששאר הקוד עובד מול "הילד הנוכחי". הטעימות של כולם נשמרות ב-state.logs עם שדה kid. */
const ACTIVE_KID_KEY = 'bis-rishon-active-kid';
function activeKidId(st = state) {
  let id = null;
  try { id = localStorage.getItem(ACTIVE_KID_KEY); } catch { /* ללא אחסון */ }
  return st.kids.some((k) => k.id === id) ? id : st.kids[0]?.id;
}
const activeKid = (st = state) => st.kids.find((k) => k.id === activeKidId(st));
function setActiveKid(id) { try { localStorage.setItem(ACTIVE_KID_KEY, id); } catch { /* ללא אחסון */ } }
function newKid(st) {
  const k = { id: 'k_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), baby: null, avatar: null, cleared: {} };
  st.kids.push(k);
  return k;
}
function withKids(st) {
  for (const f of ['baby', 'avatar', 'cleared']) {
    Object.defineProperty(st, f, {
      enumerable: false, configurable: true,
      get() { const k = activeKid(st); return k ? k[f] : (f === 'cleared' ? {} : null); },
      set(v) { (activeKid(st) || newKid(st))[f] = v; },
    });
  }
  return st;
}
// הטעימות של הילד הפעיל בלבד
function kidLogs() {
  const id = activeKidId(), first = state.kids[0]?.id;
  return state.logs.filter((l) => (l.kid || first) === id);
}

let currentUser = null;
let state = defaultState();

function load(userId) {
  currentUser = userId;
  state = defaultState();
  if (!userId) return state;
  try {
    const raw = localStorage.getItem(Auth.dataKey(userId));
    if (raw) state = migrate(JSON.parse(raw));
  } catch (e) { /* אחסון חסום – נעבוד בזיכרון */ }
  return state;
}

// עדכון נתונים שנשמרו בגרסאות קודמות
function migrate(data) {
  const st = Object.assign(defaultState(), data, { v: data.v || 1 });
  st.settings = Object.assign(defaultState().settings, data.settings);
  if (st.v < 2) {
    // v2: "אגוזים" פוצל לאלרגן נפרד לכל אגוז
    const nuts = Object.keys(ALLERGENS).filter((k) => ALLERGENS[k].group === 'nuts');
    const s = st.settings;
    s.disabled = [...new Set(s.disabled.includes('treenut') ? s.disabled.concat(nuts) : s.disabled.concat(['macadamia', 'brazil', 'pinenut']))].filter((k) => k !== 'treenut');
    if (s.targets.treenut) { nuts.forEach((k) => { s.targets[k] = s.targets.treenut; }); delete s.targets.treenut; }
    const cl = data.cleared || st.cleared;
    if (cl?.treenut) { nuts.forEach((k) => { cl[k] = cl.treenut; }); delete cl.treenut; }
    st.v = 2;
  }
  if (st.v < 3) {
    // v3: כמה ילדים – הנתונים הקיימים הופכים לילד הראשון, וכל טעימה משויכת אליו
    if (!st.kids.length && (data.baby || data.avatar)) newKid(st);
    const k = st.kids[0];
    if (k) {
      if (data.baby && !k.baby) k.baby = data.baby;
      if (data.avatar && !k.avatar) k.avatar = data.avatar;
      if (data.cleared && !Object.keys(k.cleared || {}).length) k.cleared = data.cleared;
      st.logs.forEach((l) => { if (!l.kid) l.kid = k.id; });
    }
    st.v = 3;
  }
  return st;
}
function save() {
  if (Cloud.active) return Cloud.save(state);
  if (!currentUser) return;
  try { localStorage.setItem(Auth.dataKey(currentUser), JSON.stringify(state)); }
  catch (e) { toast('לא ניתן לשמור במכשיר זה (אולי התמונה גדולה מדי) 😕'); }
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
const activeAllergens = () => Object.keys(ALLERGENS).filter((k) => !ALLERGENS[k].legacy && !state.settings.disabled.includes(k));
const visibleAllergens = () => Object.entries(ALLERGENS).filter(([, a]) => !a.legacy);
// כותרת "אגוזים" לפני האגוז הראשון ברשימה
const nutHeader = (keys, k, html) => (ALLERGENS[k].group === 'nuts' && keys.find((x) => ALLERGENS[x].group === 'nuts') === k ? html : '');
const targetFor = (k) => state.settings.targets[k] ?? ALLERGENS[k].weeklyTarget;

// לשון לפי מין הילד/ה: "אהב·ה" ← אהב / אהבה (ובלי מין ידוע: אהב/ה)
const FINAL_LETTER = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
function G(s) {
  const g = state.baby?.gender;
  return String(s).replace(/([\u0590-\u05FF]+)·([הת])/g, (m, w, suf) =>
    g === 'f' ? w + suf : g === 'm' ? w.slice(0, -1) + (FINAL_LETTER[w.slice(-1)] || w.slice(-1)) : `${w}/${suf}`);
}

const REACTIONS = [
  { id: 'love', e: '😍', t: 'אהב·ה' },
  { id: 'ok',   e: '🙂', t: 'בסדר' },
  { id: 'meh',  e: '😐', t: 'ככה' },
  { id: 'no',   e: '😖', t: 'לא אהב·ה' },
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
  { id: 'past', t: 'תגובה שדווחה בשאלון', hidden: true },
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
function babyName() { return state.baby?.name || G('הקטנ·ה'); }

/* ===================== חישובים ===================== */
function logsFor(foodId) { return kidLogs().filter((l) => l.foodId === foodId); }

function allergenLogs(key) {
  return kidLogs().filter((l) => foodById(l.foodId)?.allergen === key).sort((a, b) => b.ts - a.ts);
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
  get notStarted() { return G('עוד לא נחשף·ה'); },
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
      out.push({ info, kind: 'suspected', title: `${info.a.name}: נרשמה תגובה`, text: 'לא לתת עד התייעצות עם רופא/ת ילדים. התזכורות מושהות.' });
    } else if (info.level === 'overdue') {
      out.push({ info, kind: 'overdue', title: info.a.name, text: `עברו ${info.daysSince} ימים – כדאי לתת היום` });
    } else if (info.level === 'soon') {
      const left = Math.max(info.target - info.weekCount, 1);
      out.push({ info, kind: 'soon', title: info.a.name, text: info.status === 'introducing' ? `בהיכרות · חשיפה ${info.tolerated.length + 1} מתוך 3` : `${info.weekCount} מתוך ${info.target} השבוע · עוד ${left}` });
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
      out.push({ info: n, kind: 'new', title: `חדש להכיר: ${n.a.name}`, text: 'בבוקר, בכמות קטנה, ביום רגיל בבית' });
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

$$('.tabbar [data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
$('#fabBtn').addEventListener('click', () => openPicker());
$('#settingsBtn').addEventListener('click', openSettings);
$('#tipsBtn').addEventListener('click', () => go('guide'));

function go(t) {
  tab = t;
  $$('.tabbar [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// כותרת משנה עם כפתור חזרה, למסכים שאינם בסרגל התחתון
const subHead = (title) => `<div class="subhead"><button class="back-btn" data-action="back" aria-label="חזרה">→</button><h2>${title}</h2></div>`;

function render() {
  const v = $('#view');
  const gated = !currentUser || !state.onboarded || (Cloud.active && !state.parent?.name) || !!(typeof wizard !== 'undefined' && wizard?.addKid);
  document.body.classList.toggle('gate', gated);
  $('#babyLine').textContent = state.baby && !gated && tab !== 'home' ? `${state.baby.name} · ${ageText(state.baby.birth)}` : 'מעקב טעימות ואלרגנים';
  $('#settingsBtn').innerHTML = !gated && state.avatar ? avatarHTML(40) : '⚙️';
  $('#tipsBtn').classList.toggle('on', tab === 'guide');
  if (!currentUser) {
    if (cloudPhase === 'init' || cloudPhase === 'loading') v.innerHTML = loaderHTML();
    else if (cloudPhase === 'needsFamily') { v.innerHTML = familyChoiceHTML(); bindFamilyChoice(); }
    else if (cloudPhase === 'error') v.innerHTML = loaderHTML('לא הצלחנו להתחבר לענן. בדקו את החיבור לאינטרנט ונסו לרענן.');
    else { v.innerHTML = authHTML(); bindAuth(); }
    return;
  }
  if (gated) { renderWizard(); return; }
  v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  const views = { home: homeHTML, foods: foodsHTML, allergens: allergensHTML, recipes: recipesHTML, journal: journalHTML, guide: tipsHTML };
  v.innerHTML = views[tab]();
  bindView();
  updateBadge();
}

function updateBadge() {
  const btn = $('.tabbar [data-tab="allergens"]');
  $('.dot', btn)?.remove();
  if (!currentUser || !state.onboarded) return;
  const n = reminders().filter((r) => r.kind !== 'new').length;
  if (n) btn.insertAdjacentHTML('beforeend', `<b class="dot">${n}</b>`);
}

/* ===================== מסכים ===================== */
function homeHTML() {
  const triedIds = new Set(kidLogs().map((l) => l.foodId));
  const triedCount = [...triedIds].filter((id) => foodById(id)).length;
  const allergenDone = activeAllergens().filter((k) => ['maintaining', 'introducing'].includes(allergenInfo(k).status)).length;
  const rems = reminders();
  const alerts = rems.filter((r) => r.kind === 'suspected');
  const todo = rems.filter((r) => r.kind !== 'suspected');
  const age = ageMonths();
  const recent = kidLogs().filter((l) => !l.seed).sort((a, b) => b.ts - a.ts).slice(0, 4);

  let ageNote = '';
  if (age !== null && age < 4) ageNote = `<div class="card soft small">👶 ${G(`${esc(babyName())} עוד צעיר·ה למוצקים.`)} ההמלצה היא להתחיל סביב גיל 6 חודשים (ולא לפני 4), כשמופיעים סימני מוכנות. בינתיים אפשר לקרוא את הטיפים 💡</div>`;

  return `
  <section class="hero">
    <div class="hero-top">
      <div>
        <p class="hero-hello">${greetingWord()}, ${esc(state.parent?.name || '')} ${greetingIcon()}</p>
        <h2>${esc(babyName())} <span>· ${ageText(state.baby?.birth)}</span></h2>
        <button class="kid-switch" data-action="kids">${state.kids.length > 1 ? `⇄ ${state.kids.length} ילדים · החלפה` : '＋ הוספת ילד/ה'}</button>
      </div>
      ${state.avatar ? `<span class="hero-avatar">${avatarHTML(64)}</span>` : ''}
    </div>
    ${weekStripHTML()}
    <div class="stats">
      <div class="stat"><b>${triedCount}</b><span>מוצרים</span></div>
      <div class="stat"><b>${allergenDone}/${activeAllergens().length}</b><span>אלרגנים</span></div>
      <div class="stat"><b>${kidLogs().filter((l) => !l.seed && Date.now() - l.ts < 7 * DAY).length}</b><span>השבוע</span></div>
    </div>
  </section>
  ${ageNote}
  ${alerts.map(reminderHTML).join('')}
  <section class="card today">
    <div class="card-head"><h3>📋 מה כדאי לתת היום</h3>${todo.length ? `<span class="pill">${todo.length}</span>` : ''}</div>
    ${todo.length ? todo.map(reminderHTML).join('') : `<div class="today-done"><span class="e-emoji">🌟</span><p>הכל מעודכן! אפשר פשוט ליהנות מהארוחה.</p></div>`}
  </section>
  <button class="btn block big-cta" data-action="picker">＋ רישום טעימה</button>
  ${recipeOfDayHTML()}
  <div class="section-row"><h3 class="section-title">🕒 טעימות אחרונות</h3>${kidLogs().length ? '<a href="#" class="see-all" data-action="journal">ליומן המלא ←</a>' : ''}</div>
  ${recent.length ? `<div class="card list">${recent.map((l) => logHTML(l, true)).join('')}</div>` : `<div class="card empty"><span class="e-emoji">🥄</span><p>עוד אין טעימות.<br>לחצו על ＋ למטה כדי לרשום את הראשונה.</p></div>`}
  <div class="section-row"><h3 class="section-title">📝 פנינת חוכמה</h3><a href="#" class="see-all" data-action="tips">לכל הפתקים ←</a></div>
  <div class="note-home">${noteHTML(noteOfDay(), true)}</div>
  <button class="btn ghost block" data-action="shufflenote">🔀 עוד פתק</button>`;
}

// שבוע אחרון: נקודה לכל יום לפי מספר הטעימות
function weekStripHTML() {
  const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const today = startOfDay(Date.now());
  let out = '';
  for (let i = 6; i >= 0; i--) {
    const d = today - i * DAY;
    const n = kidLogs().filter((l) => !l.seed && startOfDay(l.ts) === d).length;
    out += `<div class="wday ${i === 0 ? 'today' : ''} ${n ? 'has' : ''}"><span>${days[new Date(d).getDay()]}</span><i>${n || ''}</i></div>`;
  }
  return `<div class="week-strip" aria-label="טעימות בשבוע האחרון">${out}</div>`;
}
function greetingWord() {
  const h = new Date().getHours();
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}
function greetingIcon() { const h = new Date().getHours(); return h < 5 || h >= 21 ? '🌙' : h < 17 ? '☀️' : '🌆'; }

let noteShift = 0;
function noteOfDay() {
  const d = Math.floor(Date.now() / DAY) + noteShift;
  return NOTES[((d * 7) % NOTES.length + NOTES.length) % NOTES.length];
}

function reminderHTML(r) {
  const btn = r.kind === 'suspected'
    ? `<button class="btn small ghost" data-allergen="${r.info.key}">פרטים</button>`
    : r.kind === 'new'
      ? `<button class="btn small accent" data-quick-allergen="${r.info.key}">להכיר</button>`
      : `<button class="check-btn" data-quick-allergen="${r.info.key}" aria-label="נתנו ${r.info.a.name}">✓</button>`;
  return `
  <div class="reminder ${r.kind}">
    <span class="r-emoji">${allergenIcon(r.info.key)}</span>
    <div class="r-text"><b>${esc(r.title)}</b><small>${esc(r.text)}</small>${reminderIdea(r)}</div>
    ${btn}
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

  const tried = allFoods().filter((f) => logsFor(f.id).length).length;
  return `
  <div class="filter-bar">
    <input class="search" id="foodSearch" type="search" placeholder="🔍 חיפוש מוצר..." value="${esc(foodFilter.q)}" enterkeyhint="search">
    <div class="chips">${chips}</div>
    <div class="chips sub">${shows}<span class="count-note">${G(`${esc(babyName())} טעמ·ה ${tried} מתוך ${allFoods().length}`)}</span></div>
  </div>
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
    <span class="f-emoji anim-${f.anim || 'bounce'}" style="${animStyle(f)};animation-delay:-${delay}ms">${foodIcon(f)}</span>
    <span class="f-name">${esc(f.name)}</span>
    <span class="f-count">${n ? `${n} טעימות` : 'עוד לא'}</span>
    ${n ? `<span class="ring"><i style="width:${pct}%"></i></span>` : ''}
  </button>`;
}

function allergensHTML() {
  const infos = activeAllergens().map(allergenInfo);
  const order = { high: 0, medium: 1, low: 2 };
  const groups = [
    { t: '⚠️ דורש תשומת לב', items: infos.filter((i) => i.status === 'suspected') },
    { t: '🔔 כדאי לתת השבוע', items: infos.filter((i) => ['overdue', 'soon'].includes(i.level)).sort((a, b) => (a.level === 'overdue' ? 0 : 1) - (b.level === 'overdue' ? 0 : 1)) },
    { t: '✅ במסלול – כל הכבוד', items: infos.filter((i) => i.status !== 'suspected' && i.status !== 'notStarted' && i.level === 'ok') },
    { t: '🌱 עוד לא הוכרו', items: infos.filter((i) => i.status === 'notStarted').sort((a, b) => order[a.a.priority] - order[b.a.priority]) },
  ];
  const count = (st) => infos.filter((i) => i.status === st).length;
  return `
  <div class="summary">
    <div><b>${count('maintaining')}</b><span>בשמירה</span></div>
    <div><b>${count('introducing')}</b><span>בהיכרות</span></div>
    <div><b>${count('notStarted')}</b><span>עוד לא</span></div>
  </div>
  ${groups.filter((g) => g.items.length).map((g) => `<h3 class="section-title">${g.t}</h3>${g.items.map(allergenCardHTML).join('')}`).join('')}
  <details class="guide why">
    <summary><span style="font-size:22px">⭐</span>למה חשוב לשמור על חשיפה?</summary>
    <ul><li>חשיפה מוקדמת וקבועה לאלרגנים מפחיתה משמעותית את הסיכון לאלרגיה.</li><li>אחרי שאלרגן הוכנס, צריך להמשיך לתת אותו באופן קבוע (בבוטנים: כ-3 פעמים בשבוע).</li><li><a href="#" data-goto-guide>עוד במדריך ←</a></li></ul>
  </details>
  <button class="btn ghost block" data-action="calendar">📅 הוספת תזכורות קבועות ליומן</button>
  <p class="small muted" style="text-align:center">אפשר לשנות יעדים ולכבות אלרגנים בהגדרות ⚙️</p>`;
}

function allergenCardHTML(i) {
  const r = 28, c = 2 * Math.PI * r;
  const pct = i.status === 'notStarted' ? 0 : Math.min(1, i.weekCount / i.target);
  const ringColor = i.status === 'suspected' ? 'var(--red)' : i.level === 'overdue' ? 'var(--red)' : i.level === 'soon' ? 'var(--yellow)' : 'var(--green)';
  const dots = Array.from({ length: Math.max(i.target, i.weekDays) }, (_, n) => `<i class="${n < i.weekDays ? 'on' : ''}" style="animation-delay:${n * 80}ms"></i>`).join('');
  let line = i.a.priority === 'high' ? 'מומלץ להכיר בקרוב' : 'עוד לא הוכר';
  if (i.last) line = `אחרון: ${relDay(i.last.ts)} · ${i.weekCount}/${i.target} השבוע`;
  if (i.status === 'suspected') line = `תגובה נרשמה ${relDay(i.reacted.ts)}`;
  return `
  <div class="card allergen-card" data-allergen="${i.key}" role="button" tabindex="0">
    <div class="a-emoji">
      <svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--line)" stroke-width="5"/>
      <circle cx="32" cy="32" r="${r}" fill="none" stroke="${ringColor}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}" style="transition:stroke-dashoffset .8s"/></svg>
      <span class="${i.level === 'overdue' ? 'anim-shake' : i.status === 'maintaining' ? 'anim-float' : ''}" style="font-size:30px">${allergenIcon(i.key)}</span>
    </div>
    <div>
      <b>${i.a.name}</b><br>
      <span class="status-pill st-${i.status}">${STATUS_TEXT[i.status]}</span>
      <div class="small muted lvl-${i.level}">${line}</div>
      ${i.status !== 'notStarted' && i.status !== 'suspected' ? `<div class="week-dots" title="ימי חשיפה ב-7 הימים האחרונים">${dots}</div>` : ''}
    </div>
    ${i.status === 'suspected' ? '' : i.status === 'notStarted' ? `<button class="btn small accent" data-quick-allergen="${i.key}">להכיר</button>` : `<button class="check-btn" data-quick-allergen="${i.key}" aria-label="נתנו ${i.a.name}">✓</button>`}
  </div>`;
}

function journalHTML() {
  if (!kidLogs().length) return subHead('📖 יומן טעימות') + `<div class="empty"><span class="e-emoji">📖</span><p>היומן ריק. כל טעימה שתרשמו תופיע כאן.</p></div>`;
  const sorted = kidLogs().sort((a, b) => b.ts - a.ts);
  const groups = [];
  for (const l of sorted) {
    const d = startOfDay(l.ts);
    if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, items: [] });
    groups[groups.length - 1].items.push(l);
  }
  return `${subHead('📖 יומן טעימות')}
  <p class="small muted">${kidLogs().length} טעימות · ${new Set(kidLogs().map((l) => l.foodId)).size} מוצרים שונים · לחצו על טעימה כדי לערוך</p>
  ${groups.map((g) => `
    <div class="day-head">${new Date(g.d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <div class="card list">${g.items.map((l) => logHTML(l, true, true)).join('')}</div>`).join('')}`;
}

function logHTML(l, editable, timeOnly) {
  const f = foodById(l.foodId) || { emoji: '❔', name: 'מוצר שנמחק' };
  const r = REACTIONS.find((x) => x.id === l.liked);
  const a = AMOUNTS.find((x) => x.id === l.amount);
  const sym = (l.symptoms || []).map((s) => SYMPTOMS.find((x) => x.id === s)?.t).filter(Boolean);
  const time = new Date(l.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const when = l.seed ? '📋 מהשאלון הראשוני' : timeOnly ? time : `${relDay(l.ts)} · ${time}`;
  const tag = editable && f.id ? 'button' : 'div';
  return `
  <${tag} class="log ${sym.length ? 'has-symptoms' : ''}" ${editable && f.id ? `data-edit="${l.id}"` : ''}>
    <span class="l-emoji">${foodIcon(f)}</span>
    <span class="l-main">
      <b>${esc(f.name)} ${f.allergen ? '<span class="mini-star">⭐</span>' : ''}</b>
      <small>${when}${a ? ' · ' + a.t : ''}${sym.length ? ' · ⚠️ ' + esc(sym.join(', ')) : ''}${l.notes && !l.seed ? ' · ' + esc(l.notes) : ''}</small>
    </span>
    <span class="l-react">${r ? r.e : ''}</span>
  </${tag}>`;
}

let tipsSeg = 'notes';
let noteFilter = 'all';
function tipsHTML() {
  const seg = `<div class="segment">
    <button class="${tipsSeg === 'notes' ? 'on' : ''}" data-seg="notes">📝 פתקי חוכמה</button>
    <button class="${tipsSeg === 'guide' ? 'on' : ''}" data-seg="guide">📚 מדריך מלא</button>
  </div>`;
  return subHead('💡 טיפים ומדריך') + seg + (tipsSeg === 'notes' ? notesHTML() : guideHTML());
}

function notesHTML() {
  const chips = [{ id: 'all', name: 'הכל', emoji: '📝' }, ...NOTE_CATS, { id: 'fav', name: 'שמורים', emoji: '❤️' }]
    .map((c) => `<button class="chip ${noteFilter === c.id ? 'active' : ''}" data-notecat="${c.id}">${c.emoji} ${c.name}</button>`).join('');
  let list = NOTES;
  if (noteFilter === 'fav') list = NOTES.filter((n) => state.favNotes.includes(n.id));
  else if (noteFilter !== 'all') list = NOTES.filter((n) => n.cat === noteFilter);
  return `
  <div class="chips">${chips}</div>
  ${list.length ? `<div class="notes-board">${list.map((n, i) => noteHTML(n, false, i)).join('')}</div>`
    : `<div class="empty"><span class="e-emoji">🤍</span><p>עוד לא שמרתם פתקים. לחצו על הלב בפתק שאהבתם.</p></div>`}`;
}

function noteHTML(n, big, i = 0) {
  const c = NOTE_CATS.find((x) => x.id === n.cat);
  const fav = state.favNotes.includes(n.id);
  const rot = big ? -1.5 : (((n.id.charCodeAt(1) + n.id.length * 3) % 7) - 3) * 0.8;
  return `
  <article class="note ${big ? 'big' : ''}" style="--note:${c.color};--rot:${rot}deg;animation-delay:${Math.min(i, 12) * 50}ms">
    <span class="pin" aria-hidden="true"></span>
    <div class="note-cat">${c.emoji} ${c.name}</div>
    <h4>${esc(n.title)}</h4>
    <p>${esc(n.text)}</p>
    <button class="note-fav ${fav ? 'on' : ''}" data-favnote="${n.id}" aria-label="שמירה">${fav ? '❤️' : '🤍'}</button>
  </article>`;
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
    <ul>${visibleAllergens().map(([k, a]) => `<li><b>${allergenIcon(k)} ${a.name}:</b> ${esc(a.how)} ${a.note ? `<br><span class="muted">${esc(a.note)}</span>` : ''}</li>`).join('')}</ul>
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
    const t = e.target.closest('[data-food],[data-cat],[data-show],[data-action],[data-allergen],[data-quick-allergen],[data-edit],[data-goto-guide],[data-seg],[data-notecat],[data-favnote],[data-recipe],[data-rtag]');
    if (!t) return;
    if (t.dataset.favnote) { e.stopPropagation(); return toggleFav('favNotes', t.dataset.favnote, t); }
    if (t.dataset.seg) { tipsSeg = t.dataset.seg; return render(); }
    if (t.dataset.notecat) { noteFilter = t.dataset.notecat; return render(); }
    if (t.dataset.recipe) { e.preventDefault(); return openRecipe(t.dataset.recipe); }
    if (t.dataset.rtag) { recipeFilter.tag = t.dataset.rtag; return render(); }
    if (t.dataset.quickAllergen) { e.stopPropagation(); return quickAllergen(t.dataset.quickAllergen); }
    if (t.dataset.food) return openFood(t.dataset.food);
    if (t.dataset.cat) { foodFilter.cat = t.dataset.cat; return render(); }
    if (t.dataset.show) { foodFilter.show = t.dataset.show; return render(); }
    if (t.dataset.allergen) return openAllergen(t.dataset.allergen);
    if (t.dataset.edit) { const l = state.logs.find((x) => x.id === t.dataset.edit); return l && openLog(l.foodId, l); }
    if (t.hasAttribute('data-goto-guide')) { e.preventDefault(); tipsSeg = 'guide'; return go('guide'); }
    const a = t.dataset.action;
    if (['journal', 'tips', 'back', 'picker', 'kids'].includes(a)) e.preventDefault();
    if (a === 'picker') openPicker();
    if (a === 'journal') go('journal');
    if (a === 'tips') { tipsSeg = 'notes'; go('guide'); }
    if (a === 'back') go('home');
    if (a === 'kids') { e.preventDefault(); openKids(); }
    if (a === 'addfood') openAddFood();
    if (a === 'calendar') downloadICS();
    if (a === 'shufflenote') {
      noteShift++;
      const box = $('.note-home');
      box.innerHTML = noteHTML(noteOfDay(), true);
      box.firstElementChild.classList.add('flip');
    }
    if (a === 'agefilter') { recipeFilter.ageOnly = !recipeFilter.ageOnly; render(); }
  };
  v.onkeydown = (e) => { if (e.key === 'Enter' && e.target.dataset.allergen) openAllergen(e.target.dataset.allergen); };
  const rs = $('#recipeSearch');
  if (rs) rs.oninput = () => {
    recipeFilter.q = rs.value;
    const pos = rs.selectionStart;
    render();
    const n = $('#recipeSearch'); n.focus(); n.setSelectionRange(pos, pos);
  };
  const s = $('#foodSearch');
  if (s) s.oninput = () => {
    foodFilter.q = s.value;
    const pos = s.selectionStart;
    render();
    const ns = $('#foodSearch'); ns.focus(); ns.setSelectionRange(pos, pos);
  };
}

function deleteLog(id) {
  const i = state.logs.findIndex((l) => l.id === id);
  if (i < 0) return;
  const [removed] = state.logs.splice(i, 1);
  save(); render();
  toast('הטעימה נמחקה', [{ label: 'ביטול', fn: () => { state.logs.push(removed); save(); render(); } }]);
}

// הכפתור ✓ ליד אלרגן: אם האלרגן כבר מוכר – רישום מהיר בלחיצה אחת. אם חדש – טופס מלא עם הנחיות בטיחות
function quickAllergen(key) {
  const recent = allergenLogs(key).find((l) => !l.seed) || allergenLogs(key)[0];
  const food = recent ? foodById(recent.foodId) : foodById(ALLERGENS[key].rep) || allFoods().find((f) => f.allergen === key);
  if (!food) return;
  if (allergenInfo(key).status === 'notStarted') return openLog(food.id);
  quickLog(food.id);
}

// רישום בלחיצה אחת, עם אפשרות לבטל או להוסיף פרטים
function quickLog(foodId) {
  const f = foodById(foodId);
  const log = { id: uid(), kid: activeKidId(), foodId, ts: Date.now(), amount: 'taste', symptoms: [], notes: '' };
  state.logs.push(log);
  save(); closeModal(); render();
  const count = logsFor(foodId).length;
  celebrate(foodIcon(f), count === 1 ? `טעימה ראשונה של ${f.name}! 🎉` : `${f.name} – טעימה ${count} 👏`);
  toast(`✓ ${f.name} נרשם`, [
    { label: 'ביטול', fn: () => { state.logs = state.logs.filter((l) => l.id !== log.id); save(); render(); } },
    { label: 'פרטים', fn: () => openLog(foodId, log) },
  ]);
}

// חלון בחירת מוצר (מהכפתור ＋): מומלצים, אחרונים, וכל המוצרים עם חיפוש
function openPicker() {
  const due = reminders().filter((r) => ['overdue', 'soon'].includes(r.kind)).map((r) => {
    const l = allergenLogs(r.info.key).find((x) => !x.seed) || allergenLogs(r.info.key)[0];
    return foodById(l?.foodId) || foodById(r.info.a.rep);
  }).filter(Boolean);
  const recentIds = [...new Set(kidLogs().filter((l) => !l.seed).sort((a, b) => b.ts - a.ts).map((l) => l.foodId))].slice(0, 8);
  const recent = recentIds.map(foodById).filter(Boolean);
  const tile = (f) => `<button class="pick-tile ${f.allergen ? 'is-allergen' : ''}" data-pick="${f.id}"><span class="anim-${f.anim}" style="${animStyle(f)}">${foodIcon(f)}</span><b>${esc(f.name)}</b></button>`;
  let cat = 'all';
  const list = (q) => allFoods().filter((f) => (cat === 'all' || f.cat === cat) && (!q || f.name.includes(q)));
  openModal(`
    <h2 class="sheet-title">${G(`מה ${esc(babyName())} טעמ·ה?`)}</h2>
    <input class="search" id="pkSearch" type="search" placeholder="🔍 חיפוש מוצר..." enterkeyhint="search">
    <div id="pkTop">
      ${due.length ? `<h3 class="pk-head">🔔 כדאי היום</h3><div class="pick-row">${due.map(tile).join('')}</div>` : ''}
      ${recent.length ? `<h3 class="pk-head">🕒 לאחרונה</h3><div class="pick-row">${recent.map(tile).join('')}</div>` : ''}
      <button class="recipe-link" data-action="go-recipes">🍲 הכנתם מתכון? רישום כל המרכיבים יחד ←</button>
      <h3 class="pk-head">🍽️ כל המוצרים</h3>
      <div class="chips">${[{ id: 'all', name: 'הכל', emoji: '🍽️' }, ...CATEGORIES.filter((c) => c.id !== 'custom' || state.customFoods.length)].map((c) => `<button class="chip ${c.id === 'all' ? 'active' : ''}" data-pcat="${c.id}">${c.emoji} ${c.name}</button>`).join('')}</div>
    </div>
    <div class="pick-grid-all" id="pkGrid">${list('').map(tile).join('')}</div>
  `, (b) => {
    const grid = $('#pkGrid', b), top = $('#pkTop', b);
    const refresh = () => {
      const q = $('#pkSearch', b).value.trim();
      $$('.pk-head, .pick-row, .recipe-link', top).forEach((x) => { x.hidden = !!q; });
      const items = list(q);
      grid.innerHTML = items.length ? items.map(tile).join('') : `<div class="empty small">לא מצאנו "${esc(q)}". <button class="link-btn" data-action="addfood-q">להוסיף כמוצר חדש?</button></div>`;
    };
    $('#pkSearch', b).oninput = refresh;
    b.onclick = (e) => {
      const t = e.target.closest('[data-pick],[data-pcat],[data-action]');
      if (!t) return;
      if (t.dataset.pick) return openLog(t.dataset.pick);
      if (t.dataset.pcat) { cat = t.dataset.pcat; $$('[data-pcat]', b).forEach((x) => x.classList.toggle('active', x === t)); return refresh(); }
      if (t.dataset.action === 'go-recipes') { closeModal(); return go('recipes'); }
      if (t.dataset.action === 'addfood-q') return openAddFood($('#pkSearch', b).value.trim());
    };
  });
}

function toggleFav(listKey, id, btn) {
  const list = state[listKey];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  save();
  const on = i < 0;
  if (btn) { btn.textContent = on ? '❤️' : '🤍'; btn.classList.toggle('on', on); btn.classList.remove('beat'); void btn.offsetWidth; btn.classList.add('beat'); }
  if (on) toast('נשמר במועדפים ❤️');
  if (!btn || (tab === 'guide' && noteFilter === 'fav') || (tab === 'recipes' && recipeFilter.tag === 'fav')) render();
}

/* ===================== מתכונים ===================== */
let recipeFilter = { tag: 'all', q: '', ageOnly: true };
const TEXTURE = { puree: 'פירה', mash: 'מרוסק', finger: 'אוכל אצבעות' };

function recipeAllergens(r) {
  return [...new Set(r.ingredients.map((id) => foodById(id)?.allergen).filter(Boolean))];
}
// אלרגנים במתכון שעוד לא הוכרו (או שיש חשד לתגובה) – לא מומלץ להכיר אלרגן חדש דרך מתכון משולב
function recipeBlockers(r) {
  return recipeAllergens(r).filter((k) => ['notStarted', 'suspected'].includes(allergenInfo(k).status));
}
function recipeAgeOk(r) { const a = ageMonths(); return a === null || a + 0.25 >= r.age; }

function recipeOfDayHTML() {
  const age = ageMonths();
  if (age !== null && age < 5.5) return '';
  const due = reminders().filter((x) => x.kind === 'overdue' || x.kind === 'soon').map((x) => x.info.key);
  let pool = RECIPES.filter((r) => recipeAgeOk(r) && !recipeBlockers(r).length);
  const forDue = pool.filter((r) => recipeAllergens(r).some((k) => due.includes(k)));
  if (forDue.length) pool = forDue;
  if (!pool.length) pool = RECIPES.filter((r) => recipeAgeOk(r) && !recipeAllergens(r).length);
  if (!pool.length) return '';
  const r = pool[Math.floor(Date.now() / DAY) % pool.length];
  const why = forDue.length ? `שומר על ${recipeAllergens(r).filter((k) => due.includes(k)).map((k) => ALLERGENS[k].name).join(' ו')} 💪` : 'רעיון טעים להיום';
  return `
  <h3 class="section-title">🍲 מתכון מומלץ להיום</h3>
  <button class="card recipe-feature" data-recipe="${r.id}">
    <span class="rf-emoji anim-jelly">${r.emoji}</span>
    <span class="rf-text"><b>${esc(r.name)}</b><small>${why} · ${r.time} דק׳</small></span>
    <span class="rf-go">←</span>
  </button>`;
}

function reminderIdea(r) {
  if (!['overdue', 'soon'].includes(r.kind)) return '';
  const rec = RECIPES.find((x) => recipeAgeOk(x) && recipeAllergens(x).includes(r.info.key) && !recipeBlockers(x).length);
  return rec ? `<a href="#" class="idea" data-recipe="${rec.id}">💡 רעיון: ${esc(rec.name)}</a>` : '';
}

function recipesHTML() {
  const tags = [['all', '🍽️ הכל'], ['fav', '❤️ שמורים'], ['אלרגן', '⭐ אלרגנים'], ['ברזל', '💪 ברזל'], ['אוכל אצבעות', '✋ אוכל אצבעות'], ['מהיר', '⚡ מהיר'], ['מקפיא', '🧊 מקפיא']];
  let list = RECIPES;
  if (recipeFilter.ageOnly) list = list.filter(recipeAgeOk);
  if (recipeFilter.tag === 'fav') list = list.filter((r) => state.favRecipes.includes(r.id));
  else if (recipeFilter.tag !== 'all') list = list.filter((r) => r.tags.includes(recipeFilter.tag));
  const q = recipeFilter.q.trim();
  if (q) list = list.filter((r) => r.name.includes(q) || r.ingredients.some((id) => foodById(id)?.name.includes(q)));
  return `
  <input class="search" id="recipeSearch" type="search" placeholder="🔍 חיפוש מתכון או מרכיב..." value="${esc(recipeFilter.q)}">
  <div class="chips">${tags.map(([id, t]) => `<button class="chip ${recipeFilter.tag === id ? 'active' : ''}" data-rtag="${id}">${t}</button>`).join('')}</div>
  <label class="age-toggle"><input type="checkbox" data-action="agefilter" ${recipeFilter.ageOnly ? 'checked' : ''}> רק מתכונים שמתאימים לגיל של ${esc(babyName())}</label>
  <div class="recipes">${list.map(recipeCardHTML).join('')}</div>
  ${list.length ? '' : '<div class="empty"><span class="e-emoji">🍳</span><p>לא נמצאו מתכונים</p></div>'}
  <h3 class="section-title">✨ שילובי טעמים מנצחים</h3>
  <div class="combos">${COMBOS.map((c, i) => `<div class="combo" style="animation-delay:${i * 40}ms"><b>${c.a}</b><span class="plus">+</span><b>${c.b}</b><small>${c.note}</small></div>`).join('')}</div>
  <p class="small muted">🧂 בלי מלח, בלי סוכר ובלי דבש מתחת לגיל שנה. תבלינים עדינים ועשבי תיבול – בהחלט כן!</p>`;
}

function recipeCardHTML(r) {
  const als = recipeAllergens(r);
  const blockers = recipeBlockers(r);
  const newOnes = r.ingredients.filter((id) => !logsFor(id).length).length;
  const fav = state.favRecipes.includes(r.id);
  return `
  <button class="recipe" data-recipe="${r.id}">
    <span class="r-emoji anim-${['bounce', 'jelly', 'wiggle', 'float', 'pulse'][Number(r.id.slice(1)) % 5]}">${r.emoji}</span>
    <span class="r-body">
      <b>${esc(r.name)} ${fav ? '❤️' : ''}</b>
      <small>מגיל ${r.age} ח׳ · ${TEXTURE[r.texture]} · ${r.time} דק׳</small>
      <span class="r-tags">
        ${als.map((k) => `<span class="mini-allergen ${blockers.includes(k) ? 'blocked' : ''}" title="${ALLERGENS[k].name}">${allergenIcon(k)}</span>`).join('')}
        ${blockers.length ? '<span class="mini-warn">יש אלרגן שעוד לא הוכר</span>' : newOnes ? `<span class="mini-new">${newOnes} טעמים חדשים</span>` : '<span class="mini-ok">הכל מוכר ✓</span>'}
      </span>
    </span>
  </button>`;
}

function openRecipe(id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) return;
  const als = recipeAllergens(r);
  const blockers = recipeBlockers(r);
  const fav = state.favRecipes.includes(r.id);
  const ageOk = recipeAgeOk(r);
  openModal(`
    <div class="detail-hero">
      <div class="stage" style="--stage:#ffe2c4"><span class="big anim-jelly">${r.emoji}</span></div>
      <h2>${esc(r.name)}</h2>
      <div class="muted small">מגיל ${r.age} חודשים · ${TEXTURE[r.texture]} · ${r.time} דק׳</div>
    </div>
    ${!ageOk ? `<div class="warn-banner small">👶 המתכון מתאים מגיל ${r.age} חודשים – כדאי לחכות קצת.</div>` : ''}
    ${blockers.length ? `<div class="warn-banner small">⚠️ המתכון מכיל ${blockers.map((k) => ALLERGENS[k].name).join(', ')} – ${blockers.some((k) => allergenInfo(k).status === 'suspected') ? 'נרשמה תגובה לאלרגן זה, יש להתייעץ עם רופא/ה.' : 'שעוד לא הוכר. מומלץ להכיר אלרגן חדש קודם לבד, בכמות קטנה, ורק אחר כך במתכון משולב.'}</div>`
      : als.length ? `<div class="allergen-banner">⭐ שומר על: ${als.map((k) => allergenIcon(k) + ' ' + ALLERGENS[k].name).join(' · ')}</div>` : ''}
    <h3 class="section-title">🧺 מרכיבים</h3>
    <div class="card ing-list">
      ${r.ingredients.map((fid) => { const f = foodById(fid); const n = logsFor(fid).length; return `
        <div class="ing"><span class="ing-e anim-${f.anim}" style="${animStyle(f)}">${foodIcon(f)}</span><span>${esc(f.name)} ${f.allergen ? '⭐' : ''}</span>
        <small class="${n ? 'ok' : 'new'}">${n ? `טעם ${n}×` : 'חדש!'}</small></div>`; }).join('')}
      ${r.extras.map((x) => `<div class="ing"><span class="ing-e">▫️</span><span>${esc(x)}</span></div>`).join('')}
    </div>
    <h3 class="section-title">👩‍🍳 הכנה</h3>
    <ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="card small">💡 ${esc(r.tip)}</div>
    <div class="sheet-foot">
      <button class="btn ghost" id="favRecipe">${fav ? '❤️ שמור' : '🤍 שמירה'}</button>
      <button class="btn" id="madeIt" style="flex:2">😋 הכנו! רישום טעימה</button>
    </div>
  `, (b) => {
    $('#favRecipe', b).onclick = (e) => { toggleFav('favRecipes', r.id); e.target.textContent = state.favRecipes.includes(r.id) ? '❤️ שמור' : '🤍 שמירה'; };
    $('#madeIt', b).onclick = () => openRecipeLog(r);
  });
}

// רישום טעימה של כל מרכיבי המתכון בבת אחת
function openRecipeLog(r) {
  const blockers = recipeBlockers(r);
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  openModal(`
    <div class="detail-hero" style="padding:0">
      <span class="big anim-bounce" style="font-size:64px">${r.emoji}</span>
      <h2 style="font-size:22px">${esc(r.name)}</h2>
      <div class="muted small">כל מרכיב שתסמנו יירשם כטעימה</div>
    </div>
    <form class="form" id="rlForm">
      <label>${G(`מה ${esc(babyName())} אכל·ה?`)}</label>
      <div class="symptoms ing-pick">${r.ingredients.map((fid) => { const f = foodById(fid); return `<label><input type="checkbox" value="${fid}" ${blockers.includes(f.allergen) ? '' : 'checked'}>${foodIcon(f)} ${esc(f.name)}</label>`; }).join('')}</div>
      ${blockers.length ? `<div class="warn-banner small">⚠️ אלרגן שעוד לא הוכר לא סומן. סמנו אותו רק אם הוא אכן נאכל.</div>` : ''}
      <label>איך היה? <span class="muted small">(לא חובה)</span></label>
      <div class="choice-row reactions" data-group="liked">${REACTIONS.map((x) => `<button type="button" class="choice" data-val="${x.id}"><span class="ce">${x.e}</span>${G(x.t)}</button>`).join('')}</div>
      <div class="opt-rows">
        <button type="button" class="opt-row" data-toggle="time">🕒 <span>עכשיו</span><em>שינוי</em></button>
        <div class="opt-body" data-body="time" hidden><input type="datetime-local" id="rlTime" value="${now.toISOString().slice(0, 16)}"></div>
        <button type="button" class="opt-row warn" data-toggle="sym">⚠️ הייתה תגובה? <em>הכל תקין</em></button>
        <div class="opt-body" data-body="sym" hidden>
          <div class="symptoms sym-pick">${SYMPTOMS.filter((s) => !s.hidden).map((s) => `<label class="${s.severe ? 'severe' : ''}"><input type="checkbox" value="${s.id}">${s.t}</label>`).join('')}</div>
          <div id="emergencyBox"></div>
        </div>
      </div>
      <div class="sheet-foot"><button class="btn" type="submit">שמירה ✓</button></div>
    </form>
  `, (b) => {
    $('.choice-row', b).addEventListener('click', (e) => {
      const c = e.target.closest('.choice'); if (!c) return;
      const wasOn = c.classList.contains('on');
      $$('.choice', e.currentTarget).forEach((x) => x.classList.toggle('on', x === c && !wasOn));
    });
    $$('[data-toggle]', b).forEach((t) => t.onclick = () => { const body = $(`[data-body="${t.dataset.toggle}"]`, b); body.hidden = !body.hidden; });
    $('.sym-pick', b).addEventListener('change', () => {
      const sel = $$('.sym-pick input:checked', b).map((x) => x.value);
      $('[data-toggle="sym"] em', b).textContent = sel.length ? `${sel.length} סומנו` : 'הכל תקין';
      $('#emergencyBox', b).innerHTML = sel.some((s) => SEVERE.includes(s))
        ? `<div class="emergency">🚨 סימנים של תגובה חמורה אפשרית. אם הם מתרחשים עכשיו – <a href="tel:101">חייגו 101 מיד</a>.</div>`
        : sel.length ? `<div class="warn-banner small">הפסיקו לתת, צלמו ופנו לרופא/ת הילדים.</div>` : '';
    });
    $('#rlForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const foods = $$('.ing-pick input:checked', b).map((x) => x.value);
      if (!foods.length) return toast('סמנו לפחות מרכיב אחד');
      const ts = $('[data-body="time"]', b).hidden ? Date.now() : (new Date($('#rlTime', b).value).getTime() || Date.now());
      const liked = $('[data-group="liked"] .on', b)?.dataset.val;
      const symptoms = $$('.sym-pick input:checked', b).map((x) => x.value);
      for (const foodId of foods) state.logs.push({ id: uid(), kid: activeKidId(), foodId, ts, liked, amount: 'meal', symptoms, notes: `מתוך: ${r.name}` });
      save(); closeModal();
      if (symptoms.length) toast('נשמר. עקבו אחרי התסמינים והתייעצו עם רופא/ה 🩺');
      else celebrate(r.emoji, `${foods.length} טעימות נרשמו! 👩‍🍳`);
      render();
    });
  });
}

/* ===================== ילדים ===================== */
function openKids() {
  const act = activeKidId();
  openModal(`
    <h2 class="sheet-title">👶 הילדים</h2>
    <div class="kid-list">
      ${state.kids.map((k) => `
        <div class="kid-row ${k.id === act ? 'on' : ''}">
          <button class="kid-pick" data-kid="${k.id}">${avatarHTML(52, k.avatar)}<span><b>${esc(k.baby?.name || 'ללא שם')}</b><small>${ageText(k.baby?.birth)} · ${state.logs.filter((l) => (l.kid || state.kids[0].id) === k.id).length} טעימות</small></span>${k.id === act ? '<em>✓ נבחר</em>' : ''}</button>
          ${state.kids.length > 1 ? `<button class="kid-del" data-delkid="${k.id}" aria-label="הסרה">🗑️</button>` : ''}
        </div>`).join('')}
    </div>
    <button class="btn block accent" id="addKid" style="margin-top:14px">＋ הוספת ילד/ה</button>
    <p class="small muted" style="text-align:center">כל ילד/ה עם מעקב אלרגנים, טעימות ואווטאר משלו. הבחירה נשמרת בכל מכשיר בנפרד.</p>
  `, (b) => {
    b.onclick = (e) => {
      const pick = e.target.closest('[data-kid]'), del = e.target.closest('[data-delkid]');
      if (pick) {
        setActiveKid(pick.dataset.kid); closeModal(); render();
        return toast(`עכשיו במעקב: ${babyName()} ${state.avatar?.emoji || '👶'}`);
      }
      if (del) {
        const k = state.kids.find((x) => x.id === del.dataset.delkid);
        if (!confirm(`להסיר את ${k.baby?.name || 'הילד/ה'} ואת כל הטעימות שלו/ה? לא ניתן לבטל.`)) return;
        state.kids = state.kids.filter((x) => x.id !== k.id);
        state.logs = state.logs.filter((l) => l.kid !== k.id);
        if (activeKidId() === undefined && state.kids[0]) setActiveKid(state.kids[0].id);
        save(); closeModal(); render(); toast('הוסר');
      }
    };
    $('#addKid', b).onclick = () => { closeModal(); startAddKid(); };
  });
}

/* ===================== מודאל ===================== */
function openModal(html, onBind) {
  $('#toast').classList.remove('show');
  $('#modalBody').innerHTML = html;
  $('.modal-card').scrollTop = 0;
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
  else if (n < EXPOSURE_GOAL && logs[0]?.liked === 'no') encourage = `${G('לא אהב·ה')}? זה טבעי לגמרי. מחקרים מראים שלפעמים צריך 8–10 חשיפות ויותר. עוד ${EXPOSURE_GOAL - n} ונראה 💪`;
  else if (n < EXPOSURE_GOAL) encourage = `עוד ${EXPOSURE_GOAL - n} טעימות כדי לתת לטעם הזה צ׳אנס הוגן`;
  else encourage = `${n} טעימות – ${likes ? 'מוצר מוכר ואהוב! 🏆' : 'נתתם צ׳אנס הוגן. אפשר להמשיך להציע מדי פעם בצורות אחרות.'}`;

  openModal(`
    <div class="detail-hero" style="--stage:${cat?.color || '#ffd9c9'}">
      <div class="stage">${fxHTML(f)}<span class="big anim-${f.anim || 'bounce'}" style="${animStyle(f)}">${foodIcon(f)}</span></div>
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
    ${n ? `<h3 class="section-title">היסטוריה</h3><div class="card list">${logs.slice(0, 8).map((l) => logHTML(l, true)).join('')}</div>` : ''}
    ${f.custom ? `<button class="btn ghost block" id="delFood" style="margin-top:10px">מחיקת מוצר</button>` : ''}
    <div class="sheet-foot">
      ${n && !reacted ? `<button class="btn" id="quickBtn">⚡ ${G('טעמ·ה עכשיו')}</button><button class="btn ghost" id="logBtn">📝 עם פרטים</button>`
        : `<button class="btn" id="logBtn">😋 רישום טעימה</button>`}
    </div>
  `, (b) => {
    requestAnimationFrame(() => { const bar = $('.bar i', b); if (bar) bar.style.width = bar.dataset.w + '%'; });
    $('#logBtn', b).onclick = () => openLog(id);
    const qb = $('#quickBtn', b);
    if (qb) qb.onclick = () => quickLog(id);
    $('.card.list', b)?.addEventListener('click', (e) => { const t = e.target.closest('[data-edit]'); const l = t && state.logs.find((x) => x.id === t.dataset.edit); if (l) openLog(l.foodId, l); });
    const del = $('#delFood', b);
    if (del) del.onclick = () => {
      if (!confirm('למחוק את המוצר ואת כל הטעימות שלו?')) return;
      state.customFoods = state.customFoods.filter((x) => x.id !== id);
      state.logs = state.logs.filter((l) => l.foodId !== id);
      save(); closeModal(); render();
    };
  });
}

function openLog(foodId, edit) {
  const f = foodById(foodId);
  const al = f.allergen ? ALLERGENS[f.allergen] : null;
  const isFirstAllergen = !edit && al && allergenLogs(f.allergen).length === 0;
  const when = new Date(edit ? edit.ts : Date.now()); when.setMinutes(when.getMinutes() - when.getTimezoneOffset());
  const hasSym = !!edit?.symptoms?.filter((x) => x !== 'past').length;
  let warn = '';
  if (isFirstAllergen) {
    const lastIntro = lastNewAllergenIntro();
    warn += `<div class="allergen-banner">⭐ ${G(`חשיפה ראשונה ל${al.name}! מתחילים בכמות קטנה, בבית, כש${esc(babyName())} בריא·ה, ועוקבים כשעתיים אחרי.`)}</div>`;
    if (lastIntro && daysBetween(lastIntro, Date.now()) < 2) warn += `<div class="warn-banner small">💡 הוכנס אלרגן חדש לפני פחות מיומיים. כדאי להמתין 2–3 ימים בין אלרגנים חדשים, כדי לדעת ממה הייתה תגובה.</div>`;
    if (new Date().getHours() >= 16) warn += `<div class="warn-banner small">🌙 שעת ערב: אלרגן חדש עדיף לתת בבוקר או בצהריים, כדי שתוכלו לעקוב אחרי תגובה בזמן ערות.</div>`;
  }
  const isNow = !edit;
  openModal(`
    <div class="log-head">
      <div class="stage mini" style="--stage:${CATEGORIES.find((c) => c.id === f.cat)?.color || '#ffd9c9'}">${fxHTML(f)}<span class="big anim-${f.anim || 'bounce'}" style="font-size:56px;${animStyle(f)}">${foodIcon(f)}</span></div>
      <div><h2>${esc(f.name)}</h2><span class="muted small">${edit ? 'עריכת טעימה' : 'טעימה חדשה'}${al ? ` · ⭐ ${al.name}` : ''}</span></div>
    </div>
    ${warn}
    <form class="form" id="logForm">
      <label>איך היה? <span class="muted small">(לא חובה)</span></label>
      <div class="choice-row reactions" data-group="liked" data-optional>${REACTIONS.map((r) => `<button type="button" class="choice ${edit?.liked === r.id ? 'on' : ''}" data-val="${r.id}"><span class="ce">${r.e}</span>${G(r.t)}</button>`).join('')}</div>
      <label>כמה?</label>
      <div class="choice-row" data-group="amount">${AMOUNTS.map((a) => `<button type="button" class="choice ${(edit?.amount || 'taste') === a.id ? 'on' : ''}" data-val="${a.id}">${a.t}</button>`).join('')}</div>
      <div class="opt-rows">
        <button type="button" class="opt-row" data-toggle="time">🕒 <span id="timeLbl">${isNow ? 'עכשיו' : new Date(edit.ts).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><em>שינוי</em></button>
        <div class="opt-body" data-body="time" hidden><input type="datetime-local" id="lgTime" value="${when.toISOString().slice(0, 16)}"></div>
        <button type="button" class="opt-row warn" data-toggle="sym">⚠️ הייתה תגובה? <em>${hasSym ? 'כן' : 'הכל תקין'}</em></button>
        <div class="opt-body" data-body="sym" ${hasSym ? '' : 'hidden'}>
          <div class="symptoms">${SYMPTOMS.filter((s) => !s.hidden).map((s) => `<label class="${s.severe ? 'severe' : ''}"><input type="checkbox" value="${s.id}" ${edit?.symptoms?.includes(s.id) ? 'checked' : ''}>${s.t}</label>`).join('')}</div>
          <div id="emergencyBox"></div>
        </div>
        <button type="button" class="opt-row" data-toggle="note">📝 הערה <em>${edit?.notes && !edit.seed ? esc(edit.notes) : 'הוספה'}</em></button>
        <div class="opt-body" data-body="note" ${edit?.notes && !edit.seed ? '' : 'hidden'}><textarea id="lgNotes" maxlength="200" placeholder="צורת הגשה, עם מה ערבבנו...">${edit && !edit.seed ? esc(edit.notes || '') : ''}</textarea></div>
      </div>
      <div class="sheet-foot">
        ${edit ? '<button type="button" class="btn ghost danger-text" id="lgDelete">🗑️ מחיקה</button>' : ''}
        <button class="btn" type="submit">${edit ? 'שמירת שינויים' : 'שמירה ✓'}</button>
      </div>
    </form>
  `, (b) => {
    $$('.choice-row', b).forEach((row) => row.addEventListener('click', (e) => {
      const c = e.target.closest('.choice'); if (!c) return;
      const wasOn = c.classList.contains('on');
      $$('.choice', row).forEach((x) => x.classList.toggle('on', x === c && !(wasOn && row.hasAttribute('data-optional'))));
    }));
    $$('[data-toggle]', b).forEach((t) => t.onclick = () => {
      const body = $(`[data-body="${t.dataset.toggle}"]`, b);
      body.hidden = !body.hidden;
      if (!body.hidden) body.querySelector('input,textarea')?.focus?.();
    });
    $('#lgTime', b).onchange = (e) => { $('#timeLbl', b).textContent = new Date(e.target.value).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); };
    const symBox = $('.symptoms', b);
    const updSym = () => {
      const sel = $$('.symptoms input:checked', b).map((x) => x.value);
      const severe = sel.some((s) => SEVERE.includes(s));
      $('[data-toggle="sym"] em', b).textContent = sel.length ? `${sel.length} סומנו` : 'הכל תקין';
      $('#emergencyBox', b).innerHTML = severe
        ? `<div class="emergency">🚨 אלה סימנים של תגובה אלרגית חמורה אפשרית. אם הם מתרחשים עכשיו: <a href="tel:101">חייגו 101 מיד</a>. אם יש אפיפן, השתמשו בו.</div>`
        : sel.length ? `<div class="warn-banner small">הפסיקו לתת את המזון, צלמו את התסמינים ופנו לרופא/ת הילדים. התזכורות לאלרגן הזה יושהו.</div>` : '';
    };
    symBox.addEventListener('change', updSym);
    if (hasSym) updSym();
    $('#lgDelete', b)?.addEventListener('click', () => { closeModal(); deleteLog(edit.id); });
    $('#logForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const timeOpen = !$('[data-body="time"]', b).hidden;
      const data = {
        ts: timeOpen || edit ? (new Date($('#lgTime', b).value).getTime() || Date.now()) : Date.now(),
        liked: $('[data-group="liked"] .on', b)?.dataset.val,
        amount: $('[data-group="amount"] .on', b)?.dataset.val,
        symptoms: $$('.symptoms input:checked', b).map((x) => x.value),
        notes: $('#lgNotes', b).value.trim(),
      };
      if (edit) {
        Object.assign(edit, data, { seed: false });
        save(); closeModal(); render();
        return toast('השינויים נשמרו ✓');
      }
      const log = { id: uid(), kid: activeKidId(), foodId, ...data };
      state.logs.push(log);
      save(); closeModal(); render();
      const count = logsFor(foodId).length;
      if (log.symptoms.length) toast('נשמר. עקבו אחרי התסמינים והתייעצו עם רופא/ה 🩺');
      else {
        celebrate(foodIcon(f), count === 1 ? `טעימה ראשונה של ${f.name}! 🎉` : count === EXPOSURE_GOAL ? `${EXPOSURE_GOAL} טעימות! אלופים 🏆` : `טעימה מס׳ ${count} 👏`);
        toast(`✓ ${f.name} נרשם`, [{ label: 'ביטול', fn: () => { state.logs = state.logs.filter((l) => l.id !== log.id); save(); render(); } }]);
      }
    });
  });
}

function openAllergen(key) {
  const i = allergenInfo(key);
  const foods = allFoods().filter((f) => f.allergen === key);
  openModal(`
    <div class="detail-hero">
      <div class="stage" style="--stage:#ffe0a6"><span class="big anim-jelly">${allergenIcon(key)}</span></div>
      <h2>${i.a.name}</h2>
      <span class="status-pill st-${i.status}">${STATUS_TEXT[i.status]}</span>
    </div>
    ${i.status === 'suspected' ? `
      <div class="warn-banner">⚠️ נרשמה תגובה ב-${new Date(i.reacted.ts).toLocaleDateString('he-IL')}. אל תמשיכו לתת עד התייעצות עם רופא/ת ילדים או אלרגולוג/ית. התזכורות מושהות.</div>
      <button class="btn ghost block" id="clearBtn">הרופא/ה אישר/ה להמשיך – חידוש מעקב</button>` : ''}
    <div class="card small">
      <b>יעד שבועי:</b> ${i.target} פעמים · <b>מקסימום הפסקה:</b> ${i.a.maxGap} ימים<br>
      ${i.last ? `<b>חשיפה אחרונה:</b> ${relDay(i.last.ts)} · <b>השבוע:</b> ${i.weekCount}/${i.target}<br><b>סה״כ חשיפות:</b> ${i.tolerated.length}` : G('עוד לא נחשף·ה')}
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

function openAddFood(prefill = '') {
  const emojis = ['🍽️', '🥗', '🍲', '🥞', '🧆', '🥟', '🍜', '🫓', '🥯', '🧇', '🍪', '🫒', '🥥', '🍍', '🍋', '🥜', '🌶️', '🥘'];
  const anims = Object.keys(MOTION_DUR);
  const fxs = ['sparkle', 'hearts', 'juice', 'steam', 'leaves', 'seeds', 'bubbles', 'crumbs', 'swirl', 'pop', 'zest', 'shine', 'smell', 'drizzle', 'snow'];
  const fxNames = { sparkle: '✨ נצנוץ', hearts: '💛 לבבות', juice: '💧 מיץ', steam: '♨️ אדים', leaves: '🍃 עלים', seeds: '• גרעינים', bubbles: '🫧 בועות', crumbs: '🍞 פירורים', swirl: '🌀 מערבולת', pop: '💥 פיצוץ', zest: '🍋 רעננות', shine: '✨ ברק', smell: '〜 ניחוח', drizzle: '🍯 זילוף', snow: '❄️ פתיתים' };
  openModal(`
    <h2 style="margin-bottom:6px">✨ מוצר חדש</h2>
    <form class="form" id="addForm">
      <label for="afName">שם המוצר</label>
      <input type="text" id="afName" required maxlength="30" placeholder="למשל: שקשוקה" value="${esc(prefill)}">
      <label>אימוג׳י</label>
      <div class="choice-row" data-group="emoji">${emojis.map((e, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${e}" style="flex:0 0 52px"><span class="ce">${e}</span></button>`).join('')}</div>
      <label>אנימציה</label>
      <div class="choice-row" data-group="anim">${anims.map((a, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${a}" style="flex:0 0 52px"><span class="ce anim-${a}">🍽️</span></button>`).join('')}</div>
      <label>אפקט</label>
      <div class="choice-row" data-group="fx">${fxs.map((x, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${x}" style="flex:0 0 auto;padding:6px 10px">${fxNames[x]}</button>`).join('')}</div>
      <label for="afAllergen">מכיל אלרגן?</label>
      <select id="afAllergen"><option value="">לא</option>${visibleAllergens().map(([k, a]) => `<option value="${k}">${a.emoji} ${a.name}</option>`).join('')}</select>
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
        fx: $('[data-group="fx"] .on', b).dataset.val,
        color: CATEGORIES.find((c) => c.id === (allergen ? 'allergen' : 'custom')).color,
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
    <div class="profile-card">
      ${avatarHTML(72)}
      <div><b>${esc(state.parent?.name || '')}</b><div class="small muted">${esc(Cloud.active ? Cloud.email : Auth.emailOf(currentUser))}</div><div class="small ${Cloud.active ? 'sync-on' : 'muted'}">${Cloud.active ? '☁️ מסונכרן בענן' : '📱 נשמר במכשיר בלבד'}</div></div>
      <button class="btn small ghost" id="avatarBtn">📷 אווטאר</button>
    </div>
    <form class="form" id="setForm">
      <label for="stParent">השם שלך</label>
      <input type="text" id="stParent" value="${esc(state.parent?.name)}" maxlength="30">
      <button type="button" class="opt-row" id="kidsBtn" style="margin-top:14px">👶 <span>${state.kids.length > 1 ? `${state.kids.length} ילדים` : 'הוספת ילד/ה נוסף/ת'}</span><em>ניהול</em></button>
      <label for="stName">שם התינוק</label>
      <input type="text" id="stName" value="${esc(state.baby?.name)}" maxlength="30">
      <label for="stGender">בן או בת</label>
      <select id="stGender"><option value="">לא צוין</option><option value="m" ${state.baby?.gender === 'm' ? 'selected' : ''}>💙 בן</option><option value="f" ${state.baby?.gender === 'f' ? 'selected' : ''}>💗 בת</option></select>
      <label for="stBirth">תאריך לידה</label>
      <input type="date" id="stBirth" value="${esc(state.baby?.birth)}">
      <h3 class="section-title">⭐ אלרגנים ויעדים שבועיים</h3>
      <div class="card" style="padding:6px 14px">
        ${visibleAllergens().map(([k, a], _, all) => `
          ${nutHeader(all.map(([x]) => x), k, '<div class="switch-head">🌰 אגוזים</div>')}
          <div class="switch">
            <label style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" data-en="${k}" ${s.disabled.includes(k) ? '' : 'checked'}> ${allergenIcon(k)} ${a.name}</label>
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
    <p class="small muted">${Cloud.active ? 'הנתונים מגובים בענן. הייצוא הוא גיבוי נוסף לקובץ.' : 'הנתונים נשמרים רק במכשיר הזה. מומלץ לגבות מדי פעם.'}</p>
    ${Cloud.active ? `
    <h3 class="section-title">👨‍👩‍👧 שיתוף עם בן/בת הזוג</h3>
    <div class="card share-card">
      <p class="small">שלחו את הקוד לבן/בת הזוג. אחרי ההרשמה בוחרים "הצטרפות למשפחה קיימת" ומקלידים אותו, ומאותו רגע כל טעימה שאחד רושם מופיעה אצל השני.</p>
      <div class="invite-code" dir="ltr">${esc(Cloud.inviteCode)}</div>
      <button type="button" class="btn accent block" id="shareBtn">📤 שליחת הזמנה</button>
      <p class="small muted" style="text-align:center;margin:8px 0 0">${Cloud.members > 1 ? `👥 ${Cloud.members} הורים מחוברים` : 'עדיין רק את מחוברת'}</p>
    </div>` : ''}
    <h3 class="section-title">👤 חשבון</h3>
    <button class="btn ghost block" id="logoutBtn">🚪 התנתקות</button>
    <button class="btn danger block" id="resetBtn" style="margin-top:12px">מחיקת כל הנתונים והתחלה מחדש</button>
    ${Cloud.active ? '' : '<button class="btn ghost block" id="delAccBtn" style="margin-top:12px;color:var(--red)">מחיקת החשבון מהמכשיר</button>'}
  `, (b) => {
    $('#setForm', b).addEventListener('submit', async (e) => {
      e.preventDefault();
      state.baby = { name: $('#stName', b).value.trim() || state.baby.name, birth: $('#stBirth', b).value || state.baby.birth, gender: $('#stGender', b).value };
      state.parent = { name: $('#stParent', b).value.trim() || state.parent?.name || '' };
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
      if (!confirm(Cloud.active ? 'למחוק את כל הנתונים של המשפחה? זה ימחק אותם גם אצל בן/בת הזוג, ולא ניתן לבטל.' : 'למחוק את כל הנתונים? לא ניתן לבטל.')) return;
      state = Object.assign(defaultState(), Cloud.active ? { parent: state.parent } : {}); save(); closeModal(); go('home');
    };
    $('#avatarBtn', b).onclick = openAvatarModal;
    $('#kidsBtn', b).onclick = openKids;
    $('#logoutBtn', b).onclick = () => {
      closeModal();
      if (Cloud.active) { Cloud.logout(); return toast('התנתקת. להתראות 👋'); }
      Auth.logout(); load(null); go('home'); toast('התנתקת. להתראות 👋');
    };
    $('#shareBtn', b)?.addEventListener('click', async () => {
      const text = `הצטרפו למעקב הטעימות של ${babyName()} ב-Baby Bis 🥄\nקוד המשפחה: ${Cloud.inviteCode}\n${location.origin}${location.pathname}`;
      try {
        if (navigator.share) await navigator.share({ title: 'Baby Bis', text });
        else { await navigator.clipboard.writeText(text); toast('ההזמנה הועתקה – אפשר להדביק בוואטסאפ 📋'); }
      } catch { /* המשתמש/ת ביטל/ה */ }
    });
    $('#delAccBtn', b)?.addEventListener('click', () => {
      if (!confirm('למחוק את החשבון ואת כל הנתונים שלו מהמכשיר? לא ניתן לבטל.')) return;
      Auth.deleteAccount(currentUser); load(null); closeModal(); go('home');
    });
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
      state = Object.assign(migrate(data), { onboarded: true });
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
  if (!currentUser || !state.onboarded || !s.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
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
    p.innerHTML = extra[n % extra.length];
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
  m.innerHTML = state.avatar && currentUser
    ? `<span class="m-av">${avatarHTML(84)}<span class="m-food">${emoji}</span></span>${esc(msg)}`
    : `<span class="m-emoji">${emoji}</span>${esc(msg)}`;
  c.appendChild(m);
  navigator.vibrate?.(30);
  setTimeout(() => { c.innerHTML = ''; }, 1900);
}

let toastTimer;
// הודעה קצרה בתחתית, אפשר עם כפתורי פעולה (למשל "ביטול")
function toast(msg, actions = []) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${actions.map((a, i) => `<button data-ti="${i}">${esc(a.label)}</button>`).join('')}`;
  t.classList.toggle('has-actions', actions.length > 0);
  t.onclick = (e) => {
    const b = e.target.closest('[data-ti]');
    if (!b) return;
    t.classList.remove('show');
    actions[+b.dataset.ti].fn();
  };
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), actions.length ? 5500 : 2600);
}
