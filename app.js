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
  catch (e) { toast(L('לא ניתן לשמור במכשיר זה (אולי התמונה גדולה מדי) 😕', 'Can’t save on this device (maybe the photo is too big) 😕')); }
}

/* ===================== עזרים ===================== */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const matchQ = (name, q) => String(name || '').toLowerCase().includes(String(q).toLowerCase());
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
  { id: 'love', e: '😍', t: L('אהב·ה', 'Loved it') },
  { id: 'ok',   e: '🙂', t: L('בסדר', 'OK') },
  { id: 'meh',  e: '😐', t: L('ככה', 'Meh') },
  { id: 'no',   e: '😖', t: L('לא אהב·ה', 'Disliked') },
];
const AMOUNTS = [
  { id: 'lick',  t: L('ליקוק', 'A lick') },
  { id: 'taste', t: L('טעימה', 'A taste') },
  { id: 'spoon', t: L('כפית+', 'Spoonful+') },
  { id: 'meal',  t: L('מנה', 'A meal') },
];
const SYMPTOMS = [
  { id: 'mouthrash', t: L('פריחה סביב הפה', 'Rash around the mouth') },
  { id: 'hives',     t: L('סרפדת / פריחה בגוף', 'Hives / body rash') },
  { id: 'vomit',     t: L('הקאה', 'Vomiting') },
  { id: 'diarrhea',  t: L('שלשול', 'Diarrhea') },
  { id: 'fussy',     t: L('אי-שקט חריג', 'Unusual fussiness') },
  { id: 'swelling',  t: L('נפיחות בפנים/שפתיים', 'Face/lip swelling'), severe: true },
  { id: 'breathing', t: L('קושי נשימה / צפצופים', 'Breathing difficulty / wheezing'), severe: true },
  { id: 'lethargy',  t: L('רפיון / חיוורון', 'Floppiness / paleness'), severe: true },
  { id: 'repeatvomit', t: L('הקאות חוזרות', 'Repeated vomiting'), severe: true },
  { id: 'past', t: L('תגובה שדווחה בשאלון', 'Reaction reported in the questionnaire'), hidden: true },
];
const SEVERE = SYMPTOMS.filter((s) => s.severe).map((s) => s.id);

function ageText(birth) {
  if (!birth) return '';
  const b = new Date(birth), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) m--;
  if (m < 0) return '';
  if (m < 1) return L(`${daysBetween(b, n)} ימים`, `${daysBetween(b, n)} days`);
  if (m < 24) {
    const wk = Math.floor((n - new Date(b.getFullYear(), b.getMonth() + m, b.getDate())) / (7 * DAY));
    if (IS_EN) return m === 1 ? '1 month' : `${m} months` + (wk > 0 ? ` ${wk} wk` : '');
    return m === 1 ? 'חודש' : `${m} חודשים` + (wk > 0 ? ` ו-${wk} שב׳` : '');
  }
  return L(`${Math.floor(m / 12)} שנים ו-${m % 12} חודשים`, `${Math.floor(m / 12)} yr ${m % 12} mo`);
}
function ageMonths() {
  if (!state.baby?.birth) return null;
  return (Date.now() - new Date(state.baby.birth)) / (30.44 * DAY);
}
function relDay(ts) {
  const d = daysBetween(ts, Date.now());
  if (d === 0) return L('היום', 'Today');
  if (d === 1) return L('אתמול', 'Yesterday');
  if (d < 7) return L(`לפני ${d} ימים`, `${d} days ago`);
  return new Date(ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
}
function babyName() { return state.baby?.name || G(L('הקטנ·ה', 'your little one')); }

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
  get notStarted() { return G(L('עוד לא נחשף·ה', 'Not yet introduced')); },
  introducing: L('בשלב היכרות', 'Introducing'),
  maintaining: L('בשמירה ✓', 'Maintaining ✓'),
  suspected: L('חשד לתגובה – בבירור', 'Suspected reaction – checking'),
};

function reminders() {
  const out = [];
  const age = ageMonths();
  for (const k of activeAllergens()) {
    const info = allergenInfo(k);
    if (info.status === 'suspected') {
      out.push({ info, kind: 'suspected', title: L(`${info.a.name}: נרשמה תגובה`, `${info.a.name}: reaction recorded`), text: L('לא לתת עד התייעצות עם רופא/ת ילדים. התזכורות מושהות.', 'Don’t give it until you’ve consulted a pediatrician. Reminders are paused.') });
    } else if (info.level === 'overdue') {
      out.push({ info, kind: 'overdue', title: info.a.name, text: L(`עברו ${info.daysSince} ימים – כדאי לתת היום`, `${info.daysSince} days since last time – give it today`) });
    } else if (info.level === 'soon') {
      const left = Math.max(info.target - info.weekCount, 1);
      out.push({ info, kind: 'soon', title: info.a.name, text: info.status === 'introducing' ? L(`בהיכרות · חשיפה ${info.tolerated.length + 1} מתוך 3`, `Introducing · exposure ${info.tolerated.length + 1} of 3`) : L(`${info.weekCount} מתוך ${info.target} השבוע · עוד ${left}`, `${info.weekCount} of ${info.target} this week · ${left} to go`) });
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
      out.push({ info: n, kind: 'new', title: L(`חדש להכיר: ${n.a.name}`, `New to introduce: ${n.a.name}`), text: L('בבוקר, בכמות קטנה, ביום רגיל בבית', 'In the morning, a small amount, on a regular day at home') });
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
$('#sosBtn').addEventListener('click', () => { closeModal(); go('choking'); });
document.addEventListener('click', (e) => { if (e.target.closest('[data-sos]')) { e.preventDefault(); closeModal(); go('choking'); } });

function go(t) {
  tab = t;
  $$('.tabbar [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// כותרת משנה עם כפתור חזרה, למסכים שאינם בסרגל התחתון
const subHead = (title) => `<div class="subhead"><button class="back-btn" data-action="back" aria-label="${L('חזרה', 'Back')}">${BACK}</button><h2>${title}</h2></div>`;

function render() {
  const v = $('#view');
  const gated = !currentUser || !state.onboarded || (Cloud.active && !state.parent?.name) || !!(typeof wizard !== 'undefined' && wizard?.addKid);
  document.body.classList.toggle('gate', gated);
  $('#babyLine').textContent = state.baby && !gated && tab !== 'home' ? `${state.baby.name} · ${ageText(state.baby.birth)}` : L('מעקב טעימות ואלרגנים', 'Tastes & allergen tracker');
  $('#settingsBtn').innerHTML = !gated && state.avatar ? avatarHTML(40) : '⚙️';
  $('#tipsBtn').classList.toggle('on', tab === 'guide');
  if (!currentUser) {
    if (cloudPhase === 'init' || cloudPhase === 'loading') v.innerHTML = loaderHTML();
    else if (cloudPhase === 'needsFamily') { v.innerHTML = familyChoiceHTML(); bindFamilyChoice(); }
    else if (cloudPhase === 'error') v.innerHTML = loaderHTML(L('לא הצלחנו להתחבר לענן. בדקו את החיבור לאינטרנט ונסו לרענן.', 'Couldn’t connect to the cloud. Check your internet connection and try refreshing.'));
    else { v.innerHTML = authHTML(); bindAuth(); }
    return;
  }
  if (gated) { renderWizard(); return; }
  v.style.animation = 'none'; void v.offsetWidth; v.style.animation = '';
  const views = { home: homeHTML, foods: foodsHTML, allergens: allergensHTML, recipes: recipesHTML, journal: journalHTML, guide: tipsHTML,
    progress: progressHTML, plan: planHTML, memories: memoriesHTML, report: reportHTML, choking: chokingHTML };
  if (tab === 'home') checkBadges(true); // הישגים קודמים נרשמים בשקט
  v.innerHTML = views[tab]();
  bindView();
  if (tab === 'memories') hydratePhotos(v);
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
  if (age !== null && age < 4) ageNote = `<div class="card soft small">👶 ${L(`${G(`${esc(babyName())} עוד צעיר·ה למוצקים.`)} ההמלצה היא להתחיל סביב גיל 6 חודשים (ולא לפני 4), כשמופיעים סימני מוכנות. בינתיים אפשר לקרוא את הטיפים 💡`, `${esc(babyName())} is still young for solids. The recommendation is to start around 6 months (not before 4), when signs of readiness appear. Meanwhile, check out the tips 💡`)}</div>`;

  return `
  <section class="hero">
    <div class="hero-top">
      <div>
        <p class="hero-hello">${greetingWord()}, ${esc(state.parent?.name || '')} ${greetingIcon()}</p>
        <h2>${esc(babyName())} <span>· ${ageText(state.baby?.birth)}</span></h2>
        <button class="kid-switch" data-action="kids">${state.kids.length > 1 ? L(`⇄ ${state.kids.length} ילדים · החלפה`, `⇄ ${state.kids.length} kids · switch`) : L('＋ הוספת ילד/ה', '＋ Add a child')}</button>
      </div>
      ${state.avatar ? `<span class="hero-avatar">${avatarHTML(64)}</span>` : ''}
    </div>
    ${weekStripHTML()}
    <div class="stats">
      <div class="stat"><b>${triedCount}</b><span>${L('מוצרים', 'Foods')}</span></div>
      <div class="stat"><b>${allergenDone}/${activeAllergens().length}</b><span>${L('אלרגנים', 'Allergens')}</span></div>
      <div class="stat"><b>${kidLogs().filter((l) => !l.seed && Date.now() - l.ts < 7 * DAY).length}</b><span>${L('השבוע', 'This week')}</span></div>
    </div>
  </section>
  <nav class="tiles" aria-label="${L('קיצורים', 'Shortcuts')}">
    <button data-action="plan"><span>📅</span>${L('תכנית', 'Plan')}</button>
    <button data-action="progress"><span>🏅</span>${L('הישגים', 'Badges')} <em>${Object.keys(activeKid()?.badges || {}).length}</em></button>
    <button data-action="memories"><span>📸</span>${L('זיכרונות', 'Memories')}</button>
    <button data-action="report"><span>🩺</span>${L('לרופא/ה', 'Doctor')}</button>
  </nav>
  ${installCardHTML()}
  ${ageNote}
  ${alerts.map(reminderHTML).join('')}
  <section class="card today">
    <div class="card-head"><h3>📋 ${L('מה כדאי לתת היום', 'What to give today')}</h3>${todo.length ? `<span class="pill">${todo.length}</span>` : ''}</div>
    ${todo.length ? todo.map(reminderHTML).join('') : `<div class="today-done"><span class="e-emoji">🌟</span><p>${L('הכל מעודכן! אפשר פשוט ליהנות מהארוחה.', 'All up to date! Just enjoy the meal.')}</p></div>`}
  </section>
  ${ironCardHTML()}
  <button class="btn block big-cta" data-action="picker">＋ ${L('רישום טעימה', 'Log a taste')}</button>
  ${recipeOfDayHTML()}
  <div class="section-row"><h3 class="section-title">🕒 ${L('טעימות אחרונות', 'Recent tastes')}</h3>${kidLogs().length ? `<a href="#" class="see-all" data-action="journal">${L('ליומן המלא', 'Full journal')} ${FWD}</a>` : ''}</div>
  ${recent.length ? `<div class="card list">${recent.map((l) => logHTML(l, true)).join('')}</div>` : `<div class="card empty"><span class="e-emoji">🥄</span><p>${L('עוד אין טעימות.<br>לחצו על ＋ למטה כדי לרשום את הראשונה.', 'No tastes yet.<br>Tap ＋ below to log the first one.')}</p></div>`}
  <div class="section-row"><h3 class="section-title">📝 ${L('פנינת חוכמה', 'Pearl of wisdom')}</h3><a href="#" class="see-all" data-action="tips">${L('לכל הפתקים', 'All notes')} ${FWD}</a></div>
  <div class="note-home">${noteHTML(noteOfDay(), true)}</div>
  <button class="btn ghost block" data-action="shufflenote">🔀 ${L('עוד פתק', 'Another note')}</button>`;
}

// שבוע אחרון: נקודה לכל יום לפי מספר הטעימות
function weekStripHTML() {
  const days = IS_EN ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const today = startOfDay(Date.now());
  let out = '';
  for (let i = 6; i >= 0; i--) {
    const d = today - i * DAY;
    const n = kidLogs().filter((l) => !l.seed && startOfDay(l.ts) === d).length;
    out += `<div class="wday ${i === 0 ? 'today' : ''} ${n ? 'has' : ''}"><span>${days[new Date(d).getDay()]}</span><i>${n || ''}</i></div>`;
  }
  return `<div class="week-strip" aria-label="${L('טעימות בשבוע האחרון', 'Tastes in the last week')}">${out}</div>`;
}
function greetingWord() {
  const h = new Date().getHours();
  if (IS_EN) return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
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
    ? `<button class="btn small ghost" data-allergen="${r.info.key}">${L('פרטים', 'Details')}</button>`
    : r.kind === 'new'
      ? `<button class="btn small accent" data-quick-allergen="${r.info.key}">${L('להכיר', 'Introduce')}</button>`
      : `<button class="check-btn" data-quick-allergen="${r.info.key}" aria-label="${L('נתנו', 'Gave')} ${r.info.a.name}">✓</button>`;
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
  if (foodFilter.cat === 'iron') list = list.filter((f) => ironLevel(f.id)).sort((a, b) => ironLevel(b.id) - ironLevel(a.id));
  else if (foodFilter.cat !== 'all') list = list.filter((f) => f.cat === foodFilter.cat || (foodFilter.cat === 'allergen' && f.allergen));
  if (q) list = list.filter((f) => matchQ(f.name, q));
  if (foodFilter.show === 'tried') list = list.filter((f) => logsFor(f.id).length);
  if (foodFilter.show === 'untried') list = list.filter((f) => !logsFor(f.id).length);

  const chips = [{ id: 'all', name: L('הכל', 'All'), emoji: '🍽️' }, { id: 'iron', name: L('עשיר בברזל', 'Iron-rich'), emoji: '💪' }, ...CATEGORIES.filter((c) => c.id !== 'custom' || state.customFoods.length)]
    .map((c) => `<button class="chip ${foodFilter.cat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.emoji} ${c.name}</button>`).join('');
  const shows = [['all', L('הכל', 'All')], ['tried', L('נטעמו', 'Tasted')], ['untried', L('עוד לא', 'Not yet')]]
    .map(([id, t]) => `<button class="chip ${foodFilter.show === id ? 'active' : ''}" data-show="${id}">${t}</button>`).join('');

  const tried = allFoods().filter((f) => logsFor(f.id).length).length;
  return `
  <div class="filter-bar">
    <input class="search" id="foodSearch" type="search" placeholder="🔍 ${L('חיפוש מוצר...', 'Search foods...')}" value="${esc(foodFilter.q)}" enterkeyhint="search">
    <div class="chips">${chips}</div>
    <div class="chips sub">${shows}<span class="count-note">${L(G(`${esc(babyName())} טעמ·ה ${tried} מתוך ${allFoods().length}`), `${esc(babyName())} tasted ${tried} of ${allFoods().length}`)}</span></div>
  </div>
  <div class="grid">
    ${list.map(foodCardHTML).join('')}
    <button class="food" data-action="addfood"><span class="f-emoji anim-pulse">➕</span><span class="f-name">${L('מוצר חדש', 'New food')}</span><span class="f-count">${L('הוספה', 'Add')}</span></button>
  </div>
  ${list.length ? '' : `<div class="empty"><span class="e-emoji">🤷</span><p>${L('לא נמצאו מוצרים', 'No foods found')}</p></div>`}`;
}

function foodCardHTML(f) {
  const n = logsFor(f.id).length;
  const pct = Math.min(100, (n / EXPOSURE_GOAL) * 100);
  const delay = (f.id.length * 137) % 1000;
  return `
  <button class="food ${n ? 'tried' : 'untried'} ${f.allergen ? 'is-allergen' : ''}" data-food="${f.id}">
    ${f.allergen ? `<span class="badge-allergen">⭐ ${L('אלרגן', 'Allergen')}</span>` : ''}
    ${f.choke ? `<span class="badge-choke" title="${L('שימו לב לצורת ההגשה', 'Mind how you serve it')}">⚠️</span>` : ''}
    <span class="f-emoji anim-${f.anim || 'bounce'}" style="${animStyle(f)};animation-delay:-${delay}ms">${foodIcon(f)}</span>
    <span class="f-name">${esc(f.name)}</span>
    <span class="f-count">${n ? L(`${n} טעימות`, `${n} tastes`) : L('עוד לא', 'Not yet')}</span>
    ${n ? `<span class="ring"><i style="width:${pct}%"></i></span>` : ''}
  </button>`;
}

function allergensHTML() {
  const infos = activeAllergens().map(allergenInfo);
  const order = { high: 0, medium: 1, low: 2 };
  const groups = [
    { t: L('⚠️ דורש תשומת לב', '⚠️ Needs attention'), items: infos.filter((i) => i.status === 'suspected') },
    { t: L('🔔 כדאי לתת השבוע', '🔔 Give this week'), items: infos.filter((i) => ['overdue', 'soon'].includes(i.level)).sort((a, b) => (a.level === 'overdue' ? 0 : 1) - (b.level === 'overdue' ? 0 : 1)) },
    { t: L('✅ במסלול – כל הכבוד', '✅ On track – well done'), items: infos.filter((i) => i.status !== 'suspected' && i.status !== 'notStarted' && i.level === 'ok') },
    { t: L('🌱 עוד לא הוכרו', '🌱 Not yet introduced'), items: infos.filter((i) => i.status === 'notStarted').sort((a, b) => order[a.a.priority] - order[b.a.priority]) },
  ];
  const count = (st) => infos.filter((i) => i.status === st).length;
  return `
  <div class="summary">
    <div><b>${count('maintaining')}</b><span>${L('בשמירה', 'Maintaining')}</span></div>
    <div><b>${count('introducing')}</b><span>${L('בהיכרות', 'Introducing')}</span></div>
    <div><b>${count('notStarted')}</b><span>${L('עוד לא', 'Not yet')}</span></div>
  </div>
  ${groups.filter((g) => g.items.length).map((g) => `<h3 class="section-title">${g.t}</h3>${g.items.map(allergenCardHTML).join('')}`).join('')}
  <details class="guide why">
    <summary><span style="font-size:22px">⭐</span>${L('למה חשוב לשמור על חשיפה?', 'Why keep up exposure?')}</summary>
    <ul><li>${L('חשיפה מוקדמת וקבועה לאלרגנים מפחיתה משמעותית את הסיכון לאלרגיה.', 'Early, regular exposure to allergens significantly reduces the risk of allergy.')}</li><li>${L('אחרי שאלרגן הוכנס, צריך להמשיך לתת אותו באופן קבוע (בבוטנים: כ-3 פעמים בשבוע).', 'Once an allergen is introduced, keep giving it regularly (peanut: about 3 times a week).')}</li><li><a href="#" data-goto-guide>${L('עוד במדריך', 'More in the guide')} ${FWD}</a></li></ul>
  </details>
  <button class="btn ghost block" data-action="calendar">📅 ${L('הוספת תזכורות קבועות ליומן', 'Add recurring reminders to your calendar')}</button>
  <p class="small muted" style="text-align:center">${L('אפשר לשנות יעדים ולכבות אלרגנים בהגדרות ⚙️', 'You can change targets and turn allergens off in settings ⚙️')}</p>`;
}

function allergenCardHTML(i) {
  const r = 28, c = 2 * Math.PI * r;
  const pct = i.status === 'notStarted' ? 0 : Math.min(1, i.weekCount / i.target);
  const ringColor = i.status === 'suspected' ? 'var(--red)' : i.level === 'overdue' ? 'var(--red)' : i.level === 'soon' ? 'var(--yellow)' : 'var(--green)';
  const dots = Array.from({ length: Math.max(i.target, i.weekDays) }, (_, n) => `<i class="${n < i.weekDays ? 'on' : ''}" style="animation-delay:${n * 80}ms"></i>`).join('');
  let line = i.a.priority === 'high' ? L('מומלץ להכיר בקרוב', 'Recommended to introduce soon') : L('עוד לא הוכר', 'Not yet introduced');
  if (i.last) line = L(`אחרון: ${relDay(i.last.ts)} · ${i.weekCount}/${i.target} השבוע`, `Last: ${relDay(i.last.ts)} · ${i.weekCount}/${i.target} this week`);
  if (i.status === 'suspected') line = L(`תגובה נרשמה ${relDay(i.reacted.ts)}`, `Reaction recorded ${relDay(i.reacted.ts)}`);
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
      ${i.status !== 'notStarted' && i.status !== 'suspected' ? `<div class="week-dots" title="${L('ימי חשיפה ב-7 הימים האחרונים', 'Exposure days in the last 7 days')}">${dots}</div>` : ''}
    </div>
    ${i.status === 'suspected' ? '' : i.status === 'notStarted' ? `<button class="btn small accent" data-quick-allergen="${i.key}">${L('להכיר', 'Introduce')}</button>` : `<button class="check-btn" data-quick-allergen="${i.key}" aria-label="${L('נתנו', 'Gave')} ${i.a.name}">✓</button>`}
  </div>`;
}

function journalHTML() {
  if (!kidLogs().length) return subHead(L('📖 יומן טעימות', '📖 Tasting journal')) + `<div class="empty"><span class="e-emoji">📖</span><p>${L('היומן ריק. כל טעימה שתרשמו תופיע כאן.', 'The journal is empty. Every taste you log will show up here.')}</p></div>`;
  const sorted = kidLogs().sort((a, b) => b.ts - a.ts);
  const groups = [];
  for (const l of sorted) {
    const d = startOfDay(l.ts);
    if (!groups.length || groups[groups.length - 1].d !== d) groups.push({ d, items: [] });
    groups[groups.length - 1].items.push(l);
  }
  return `${subHead(L('📖 יומן טעימות', '📖 Tasting journal'))}
  <p class="small muted">${L(`${kidLogs().length} טעימות · ${new Set(kidLogs().map((l) => l.foodId)).size} מוצרים שונים · לחצו על טעימה כדי לערוך`, `${kidLogs().length} tastes · ${new Set(kidLogs().map((l) => l.foodId)).size} different foods · tap a taste to edit`)}</p>
  ${groups.map((g) => `
    <div class="day-head">${new Date(g.d).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <div class="card list">${g.items.map((l) => logHTML(l, true, true)).join('')}</div>`).join('')}`;
}

function logHTML(l, editable, timeOnly) {
  const f = foodById(l.foodId) || { emoji: '❔', name: L('מוצר שנמחק', 'Deleted food') };
  const r = REACTIONS.find((x) => x.id === l.liked);
  const a = AMOUNTS.find((x) => x.id === l.amount);
  const sym = (l.symptoms || []).map((s) => SYMPTOMS.find((x) => x.id === s)?.t).filter(Boolean);
  const time = new Date(l.ts).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const when = l.seed ? L('📋 מהשאלון הראשוני', '📋 From the opening questionnaire') : timeOnly ? time : `${relDay(l.ts)} · ${time}`;
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
    <button class="${tipsSeg === 'notes' ? 'on' : ''}" data-seg="notes">📝 ${L('פתקי חוכמה', 'Wisdom notes')}</button>
    <button class="${tipsSeg === 'guide' ? 'on' : ''}" data-seg="guide">📚 ${L('מדריך מלא', 'Full guide')}</button>
  </div>`;
  return subHead(L('💡 טיפים ומדריך', '💡 Tips & guide')) + seg + (tipsSeg === 'notes' ? notesHTML() : guideHTML());
}

function notesHTML() {
  const chips = [{ id: 'all', name: L('הכל', 'All'), emoji: '📝' }, ...NOTE_CATS, { id: 'fav', name: L('שמורים', 'Saved'), emoji: '❤️' }]
    .map((c) => `<button class="chip ${noteFilter === c.id ? 'active' : ''}" data-notecat="${c.id}">${c.emoji} ${c.name}</button>`).join('');
  let list = NOTES;
  if (noteFilter === 'fav') list = NOTES.filter((n) => state.favNotes.includes(n.id));
  else if (noteFilter !== 'all') list = NOTES.filter((n) => n.cat === noteFilter);
  return `
  <div class="chips">${chips}</div>
  ${list.length ? `<div class="notes-board">${list.map((n, i) => noteHTML(n, false, i)).join('')}</div>`
    : `<div class="empty"><span class="e-emoji">🤍</span><p>${L('עוד לא שמרתם פתקים. לחצו על הלב בפתק שאהבתם.', 'No saved notes yet. Tap the heart on a note you like.')}</p></div>`}`;
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
    <button class="note-fav ${fav ? 'on' : ''}" data-favnote="${n.id}" aria-label="${L('שמירה', 'Save')}">${fav ? '❤️' : '🤍'}</button>
  </article>`;
}

function guideHTML() {
  return `
  <div class="card small">${L('📚 התוכן מבוסס על הנחיות AAP, NIAID, EAACI, CSACI ומחקרים עדכניים. <b>אינו מחליף ייעוץ רפואי</b> – בכל שאלה, ובמיוחד אם יש אקזמה קשה או אלרגיה ידועה, התייעצו עם רופא/ת הילדים.', '📚 Content is based on AAP, NIAID, EAACI and CSACI guidelines and recent research. <b>It does not replace medical advice</b> – with any question, and especially with severe eczema or a known allergy, consult your pediatrician.')}</div>
  <div class="emergency">${L('🚨 קושי בנשימה, נפיחות בפנים, רפיון או הקאות חוזרות אחרי אכילה? <a href="tel:101">חייגו 101</a>', '🚨 Difficulty breathing, face swelling, floppiness or repeated vomiting after eating? <b>Call your emergency number now</b> (101 in Israel, 911 in the US, 999/112 in the UK/EU).')}</div>
  ${GUIDE.map((g, n) => `
    <details class="guide ${g.danger ? 'danger' : ''}" ${n === 1 ? 'open' : ''}>
      <summary><span style="font-size:24px">${g.icon}</span>${esc(g.title)}</summary>
      <ul>${g.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </details>`).join('')}
  <details class="guide">
    <summary><span style="font-size:24px">⭐</span>${L('איך להגיש כל אלרגן', 'How to serve each allergen')}</summary>
    <ul>${visibleAllergens().map(([k, a]) => `<li><b>${allergenIcon(k)} ${a.name}:</b> ${esc(a.how)} ${a.note ? `<br><span class="muted">${esc(a.note)}</span>` : ''}</li>`).join('')}</ul>
  </details>
  <details class="guide">
    <summary><span style="font-size:24px">🔗</span>${L('מקורות', 'Sources')}</summary>
    <ul class="sources">${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>
  </details>`;
}

/* ===================== אירועים ===================== */
function bindView() {
  const v = $('#view');
  v.onclick = (e) => {
    const t = e.target.closest('[data-chage],[data-food],[data-cat],[data-show],[data-action],[data-allergen],[data-quick-allergen],[data-edit],[data-goto-guide],[data-seg],[data-notecat],[data-favnote],[data-recipe],[data-rtag],[data-mem]');
    if (!t) return;
    if (t.dataset.mem) { memFilter = t.dataset.mem; return render(); }
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
    if (t.dataset.chage) { chokeAge = t.dataset.chage; return render(); }
    if (t.dataset.edit) { const l = state.logs.find((x) => x.id === t.dataset.edit); return l && openLog(l.foodId, l); }
    if (t.hasAttribute('data-goto-guide')) { e.preventDefault(); tipsSeg = 'guide'; return go('guide'); }
    const a = t.dataset.action;
    if (['journal', 'tips', 'back', 'picker', 'kids', 'plan', 'progress', 'memories', 'report'].includes(a)) e.preventDefault();
    if (['plan', 'progress', 'memories', 'report'].includes(a)) return go(a);
    if (a === 'shopping') return openShopping();
    if (a === 'sharecard') return openShareCard();
    if (a === 'install') return openInstall();
    if (a === 'install-x') { try { localStorage.setItem('bis-install-x', '1'); } catch { /* ללא אחסון */ } return render(); }
    if (a === 'print') return printReport();
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
  toast(L('הטעימה נמחקה', 'Taste deleted'), [{ label: L('ביטול', 'Undo'), fn: () => { state.logs.push(removed); save(); render(); } }]);
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
  const log = { id: uid(), kid: activeKidId(), foodId, ts: Date.now(), amount: 'taste', texture: lastTexture(), symptoms: [], notes: '' };
  if (!log.texture) delete log.texture;
  state.logs.push(log);
  save(); closeModal(); render();
  checkBadges();
  const count = logsFor(foodId).length;
  celebrate(foodIcon(f), count === 1 ? L(`טעימה ראשונה של ${f.name}! 🎉`, `First taste of ${f.name}! 🎉`) : L(`${f.name} – טעימה ${count} 👏`, `${f.name} – taste #${count} 👏`));
  toast(L(`✓ ${f.name} נרשם`, `✓ ${f.name} logged`), [
    { label: L('ביטול', 'Undo'), fn: () => { state.logs = state.logs.filter((l) => l.id !== log.id); save(); render(); } },
    { label: L('פרטים', 'Details'), fn: () => openLog(foodId, log) },
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
  const list = (q) => allFoods().filter((f) => (cat === 'all' || f.cat === cat) && (!q || matchQ(f.name, q)));
  openModal(`
    <h2 class="sheet-title">${L(G(`מה ${esc(babyName())} טעמ·ה?`), `What did ${esc(babyName())} taste?`)}</h2>
    <input class="search" id="pkSearch" type="search" placeholder="🔍 ${L('חיפוש מוצר...', 'Search foods...')}" enterkeyhint="search">
    <div id="pkTop">
      ${due.length ? `<h3 class="pk-head">🔔 ${L('כדאי היום', 'Due today')}</h3><div class="pick-row">${due.map(tile).join('')}</div>` : ''}
      ${recent.length ? `<h3 class="pk-head">🕒 ${L('לאחרונה', 'Recent')}</h3><div class="pick-row">${recent.map(tile).join('')}</div>` : ''}
      <button class="recipe-link" data-action="go-recipes">🍲 ${L('הכנתם מתכון? רישום כל המרכיבים יחד', 'Made a recipe? Log all ingredients at once')} ${FWD}</button>
      <h3 class="pk-head">🍽️ ${L('כל המוצרים', 'All foods')}</h3>
      <div class="chips">${[{ id: 'all', name: L('הכל', 'All'), emoji: '🍽️' }, ...CATEGORIES.filter((c) => c.id !== 'custom' || state.customFoods.length)].map((c) => `<button class="chip ${c.id === 'all' ? 'active' : ''}" data-pcat="${c.id}">${c.emoji} ${c.name}</button>`).join('')}</div>
    </div>
    <div class="pick-grid-all" id="pkGrid">${list('').map(tile).join('')}</div>
  `, (b) => {
    const grid = $('#pkGrid', b), top = $('#pkTop', b);
    const refresh = () => {
      const q = $('#pkSearch', b).value.trim();
      $$('.pk-head, .pick-row, .recipe-link', top).forEach((x) => { x.hidden = !!q; });
      const items = list(q);
      grid.innerHTML = items.length ? items.map(tile).join('') : `<div class="empty small">${L(`לא מצאנו "${esc(q)}".`, `No match for "${esc(q)}".`)} <button class="link-btn" data-action="addfood-q">${L('להוסיף כמוצר חדש?', 'Add it as a new food?')}</button></div>`;
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
  if (on) toast(L('נשמר במועדפים ❤️', 'Saved to favorites ❤️'));
  if (!btn || (tab === 'guide' && noteFilter === 'fav') || (tab === 'recipes' && recipeFilter.tag === 'fav')) render();
}

/* ===================== מתכונים ===================== */
let recipeFilter = { tag: 'all', q: '', ageOnly: true };
const TEXTURE = IS_EN ? { puree: 'Purée', mash: 'Mashed', finger: 'Finger food' } : { puree: 'פירה', mash: 'מרוסק', finger: 'אוכל אצבעות' };

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
  const dueNames = recipeAllergens(r).filter((k) => due.includes(k)).map((k) => ALLERGENS[k].name);
  const why = forDue.length ? L(`שומר על ${dueNames.join(' ו')} 💪`, `Keeps up ${dueNames.join(' & ')} 💪`) : L('רעיון טעים להיום', 'A tasty idea for today');
  return `
  <h3 class="section-title">🍲 ${L('מתכון מומלץ להיום', 'Recipe of the day')}</h3>
  <button class="card recipe-feature" data-recipe="${r.id}">
    <span class="rf-emoji anim-jelly">${r.emoji}</span>
    <span class="rf-text"><b>${esc(r.name)}</b><small>${why} · ${r.time} ${L('דק׳', 'min')}</small></span>
    <span class="rf-go">${FWD}</span>
  </button>`;
}

function reminderIdea(r) {
  if (!['overdue', 'soon'].includes(r.kind)) return '';
  const rec = RECIPES.find((x) => recipeAgeOk(x) && recipeAllergens(x).includes(r.info.key) && !recipeBlockers(x).length);
  return rec ? `<a href="#" class="idea" data-recipe="${rec.id}">💡 ${L('רעיון', 'Idea')}: ${esc(rec.name)}</a>` : '';
}

function recipesHTML() {
  const tags = [['all', L('🍽️ הכל', '🍽️ All')], ['fav', L('❤️ שמורים', '❤️ Saved')], ['אלרגן', L('⭐ אלרגנים', '⭐ Allergens')], ['ברזל', L('💪 ברזל', '💪 Iron')], ['אוכל אצבעות', L('✋ אוכל אצבעות', '✋ Finger food')], ['מהיר', L('⚡ מהיר', '⚡ Quick')], ['מקפיא', L('🧊 מקפיא', '🧊 Freezer')]];
  let list = RECIPES;
  if (recipeFilter.ageOnly) list = list.filter(recipeAgeOk);
  if (recipeFilter.tag === 'fav') list = list.filter((r) => state.favRecipes.includes(r.id));
  else if (recipeFilter.tag !== 'all') list = list.filter((r) => r.tags.includes(recipeFilter.tag));
  const q = recipeFilter.q.trim();
  if (q) list = list.filter((r) => matchQ(r.name, q) || r.ingredients.some((id) => matchQ(foodById(id)?.name, q)));
  return `
  <input class="search" id="recipeSearch" type="search" placeholder="🔍 ${L('חיפוש מתכון או מרכיב...', 'Search recipes or ingredients...')}" value="${esc(recipeFilter.q)}">
  <div class="chips">${tags.map(([id, t]) => `<button class="chip ${recipeFilter.tag === id ? 'active' : ''}" data-rtag="${id}">${t}</button>`).join('')}</div>
  <label class="age-toggle"><input type="checkbox" data-action="agefilter" ${recipeFilter.ageOnly ? 'checked' : ''}> ${L(`רק מתכונים שמתאימים לגיל של ${esc(babyName())}`, `Only recipes suitable for ${esc(babyName())}'s age`)}</label>
  <div class="recipes">${list.map(recipeCardHTML).join('')}</div>
  ${list.length ? '' : `<div class="empty"><span class="e-emoji">🍳</span><p>${L('לא נמצאו מתכונים', 'No recipes found')}</p></div>`}
  <h3 class="section-title">✨ ${L('שילובי טעמים מנצחים', 'Winning flavor pairs')}</h3>
  <div class="combos">${COMBOS.map((c, i) => `<div class="combo" style="animation-delay:${i * 40}ms"><b>${c.a}</b><span class="plus">+</span><b>${c.b}</b><small>${c.note}</small></div>`).join('')}</div>
  <p class="small muted">${L('🧂 בלי מלח, בלי סוכר ובלי דבש מתחת לגיל שנה. תבלינים עדינים ועשבי תיבול – בהחלט כן!', '🧂 No salt, sugar or honey under age 1. Mild spices and herbs – absolutely yes!')}</p>`;
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
      <small>${L(`מגיל ${r.age} ח׳`, `${r.age}+ mo`)} · ${TEXTURE[r.texture]} · ${r.time} ${L('דק׳', 'min')}</small>
      <span class="r-tags">
        ${als.map((k) => `<span class="mini-allergen ${blockers.includes(k) ? 'blocked' : ''}" title="${ALLERGENS[k].name}">${allergenIcon(k)}</span>`).join('')}
        ${blockers.length ? `<span class="mini-warn">${L('יש אלרגן שעוד לא הוכר', 'Has an allergen not yet introduced')}</span>` : newOnes ? `<span class="mini-new">${L(`${newOnes} טעמים חדשים`, `${newOnes} new tastes`)}</span>` : `<span class="mini-ok">${L('הכל מוכר ✓', 'All familiar ✓')}</span>`}
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
      <div class="muted small">${L(`מגיל ${r.age} חודשים`, `From ${r.age} months`)} · ${TEXTURE[r.texture]} · ${r.time} ${L('דק׳', 'min')}</div>
    </div>
    ${!ageOk ? `<div class="warn-banner small">👶 ${L(`המתכון מתאים מגיל ${r.age} חודשים – כדאי לחכות קצת.`, `This recipe suits ${r.age}+ months – better to wait a little.`)}</div>` : ''}
    ${blockers.length ? `<div class="warn-banner small">⚠️ ${L('המתכון מכיל', 'This recipe contains')} ${blockers.map((k) => ALLERGENS[k].name).join(', ')} – ${blockers.some((k) => allergenInfo(k).status === 'suspected') ? L('נרשמה תגובה לאלרגן זה, יש להתייעץ עם רופא/ה.', 'a reaction was recorded to this allergen – consult a doctor.') : L('שעוד לא הוכר. מומלץ להכיר אלרגן חדש קודם לבד, בכמות קטנה, ורק אחר כך במתכון משולב.', 'which isn’t introduced yet. Introduce a new allergen on its own first, in a small amount, and only then in a combined recipe.')}</div>`
      : als.length ? `<div class="allergen-banner">⭐ ${L('שומר על', 'Keeps up')}: ${als.map((k) => allergenIcon(k) + ' ' + ALLERGENS[k].name).join(' · ')}</div>` : ''}
    <h3 class="section-title">🧺 ${L('מרכיבים', 'Ingredients')}</h3>
    <div class="card ing-list">
      ${r.ingredients.map((fid) => { const f = foodById(fid); const n = logsFor(fid).length; return `
        <div class="ing"><span class="ing-e anim-${f.anim}" style="${animStyle(f)}">${foodIcon(f)}</span><span>${esc(f.name)} ${f.allergen ? '⭐' : ''}</span>
        <small class="${n ? 'ok' : 'new'}">${n ? L(`טעם ${n}×`, `tasted ${n}×`) : L('חדש!', 'New!')}</small></div>`; }).join('')}
      ${r.extras.map((x) => `<div class="ing"><span class="ing-e">▫️</span><span>${esc(x)}</span></div>`).join('')}
    </div>
    <h3 class="section-title">👩‍🍳 ${L('הכנה', 'Method')}</h3>
    <ol class="steps">${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="card small">💡 ${esc(r.tip)}</div>
    <div class="sheet-foot">
      <button class="btn ghost" id="favRecipe">${fav ? L('❤️ שמור', '❤️ Saved') : L('🤍 שמירה', '🤍 Save')}</button>
      <button class="btn" id="madeIt" style="flex:2">😋 ${L('הכנו! רישום טעימה', 'Made it! Log a taste')}</button>
    </div>
  `, (b) => {
    $('#favRecipe', b).onclick = (e) => { toggleFav('favRecipes', r.id); e.target.textContent = state.favRecipes.includes(r.id) ? L('❤️ שמור', '❤️ Saved') : L('🤍 שמירה', '🤍 Save'); };
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
      <div class="muted small">${L('כל מרכיב שתסמנו יירשם כטעימה', 'Every ingredient you tick is logged as a taste')}</div>
    </div>
    <form class="form" id="rlForm">
      <label>${L(G(`מה ${esc(babyName())} אכל·ה?`), `What did ${esc(babyName())} eat?`)}</label>
      <div class="symptoms ing-pick">${r.ingredients.map((fid) => { const f = foodById(fid); return `<label><input type="checkbox" value="${fid}" ${blockers.includes(f.allergen) ? '' : 'checked'}>${foodIcon(f)} ${esc(f.name)}</label>`; }).join('')}</div>
      ${blockers.length ? `<div class="warn-banner small">⚠️ ${L('אלרגן שעוד לא הוכר לא סומן. סמנו אותו רק אם הוא אכן נאכל.', 'An allergen that isn’t introduced yet was left unticked. Tick it only if it was actually eaten.')}</div>` : ''}
      <label>${L('איך היה?', 'How was it?')} <span class="muted small">(${L('לא חובה', 'optional')})</span></label>
      <div class="choice-row reactions" data-group="liked">${REACTIONS.map((x) => `<button type="button" class="choice" data-val="${x.id}"><span class="ce">${x.e}</span>${G(x.t)}</button>`).join('')}</div>
      <div class="opt-rows">
        <button type="button" class="opt-row" data-toggle="time">🕒 <span>${L('עכשיו', 'Now')}</span><em>${L('שינוי', 'Change')}</em></button>
        <div class="opt-body" data-body="time" hidden><input type="datetime-local" id="rlTime" value="${now.toISOString().slice(0, 16)}"></div>
        <button type="button" class="opt-row warn" data-toggle="sym">⚠️ ${L('הייתה תגובה?', 'Any reaction?')} <em>${L('הכל תקין', 'All fine')}</em></button>
        <div class="opt-body" data-body="sym" hidden>
          <div class="symptoms sym-pick">${SYMPTOMS.filter((s) => !s.hidden).map((s) => `<label class="${s.severe ? 'severe' : ''}"><input type="checkbox" value="${s.id}">${s.t}</label>`).join('')}</div>
          <div id="emergencyBox"></div>
        </div>
      </div>
      <div class="sheet-foot"><button class="btn" type="submit">${L('שמירה ✓', 'Save ✓')}</button></div>
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
      $('[data-toggle="sym"] em', b).textContent = sel.length ? L(`${sel.length} סומנו`, `${sel.length} selected`) : L('הכל תקין', 'All fine');
      $('#emergencyBox', b).innerHTML = sel.some((s) => SEVERE.includes(s))
        ? `<div class="emergency">${L('🚨 סימנים של תגובה חמורה אפשרית. אם הם מתרחשים עכשיו – <a href="tel:101">חייגו 101 מיד</a>.', '🚨 Signs of a possible severe reaction. If they’re happening now – <b>call your emergency number immediately</b> (101 in Israel).')}</div>`
        : sel.length ? `<div class="warn-banner small">${L('הפסיקו לתת, צלמו ופנו לרופא/ת הילדים.', 'Stop the food, take photos and contact your pediatrician.')}</div>` : '';
    });
    $('#rlForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const foods = $$('.ing-pick input:checked', b).map((x) => x.value);
      if (!foods.length) return toast(L('סמנו לפחות מרכיב אחד', 'Tick at least one ingredient'));
      const ts = $('[data-body="time"]', b).hidden ? Date.now() : (new Date($('#rlTime', b).value).getTime() || Date.now());
      const liked = $('[data-group="liked"] .on', b)?.dataset.val;
      const symptoms = $$('.sym-pick input:checked', b).map((x) => x.value);
      for (const foodId of foods) state.logs.push({ id: uid(), kid: activeKidId(), foodId, ts, liked, amount: 'meal', texture: RECIPE_TEXTURE[r.texture], symptoms, notes: `${L('מתוך:', 'From:')} ${r.name}` });
      save(); closeModal();
      if (!symptoms.length) checkBadges();
      if (symptoms.length) toast(L('נשמר. עקבו אחרי התסמינים והתייעצו עם רופא/ה 🩺', 'Saved. Watch the symptoms and consult a doctor 🩺'));
      else celebrate(r.emoji, L(`${foods.length} טעימות נרשמו! 👩‍🍳`, `${foods.length} tastes logged! 👩‍🍳`));
      render();
    });
  });
}

/* ===================== ילדים ===================== */
function openKids() {
  const act = activeKidId();
  openModal(`
    <h2 class="sheet-title">👶 ${L('הילדים', 'Children')}</h2>
    <div class="kid-list">
      ${state.kids.map((k) => `
        <div class="kid-row ${k.id === act ? 'on' : ''}">
          <button class="kid-pick" data-kid="${k.id}">${avatarHTML(52, k.avatar)}<span><b>${esc(k.baby?.name || L('ללא שם', 'No name'))}</b><small>${ageText(k.baby?.birth)} · ${state.logs.filter((l) => (l.kid || state.kids[0].id) === k.id).length} ${L('טעימות', 'tastes')}</small></span>${k.id === act ? `<em>${L('✓ נבחר', '✓ Selected')}</em>` : ''}</button>
          ${state.kids.length > 1 ? `<button class="kid-del" data-delkid="${k.id}" aria-label="${L('הסרה', 'Remove')}">🗑️</button>` : ''}
        </div>`).join('')}
    </div>
    <button class="btn block accent" id="addKid" style="margin-top:14px">＋ ${L('הוספת ילד/ה', 'Add a child')}</button>
    <p class="small muted" style="text-align:center">${L('כל ילד/ה עם מעקב אלרגנים, טעימות ואווטאר משלו. הבחירה נשמרת בכל מכשיר בנפרד.', 'Each child has their own allergen tracking, tastes and avatar. The selection is saved per device.')}</p>
  `, (b) => {
    b.onclick = (e) => {
      const pick = e.target.closest('[data-kid]'), del = e.target.closest('[data-delkid]');
      if (pick) {
        setActiveKid(pick.dataset.kid); closeModal(); render();
        return toast(L(`עכשיו במעקב: ${babyName()} ${state.avatar?.emoji || '👶'}`, `Now tracking: ${babyName()} ${state.avatar?.emoji || '👶'}`));
      }
      if (del) {
        const k = state.kids.find((x) => x.id === del.dataset.delkid);
        if (!confirm(L(`להסיר את ${k.baby?.name || 'הילד/ה'} ואת כל הטעימות שלו/ה? לא ניתן לבטל.`, `Remove ${k.baby?.name || 'this child'} and all their tastes? This can’t be undone.`))) return;
        state.kids = state.kids.filter((x) => x.id !== k.id);
        state.logs = state.logs.filter((l) => l.kid !== k.id);
        if (activeKidId() === undefined && state.kids[0]) setActiveKid(state.kids[0].id);
        save(); closeModal(); render(); toast(L('הוסר', 'Removed'));
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
  if (n === 0) encourage = L('טעימה ראשונה מחכה! 🌟', 'A first taste awaits! 🌟');
  else if (n < EXPOSURE_GOAL && logs[0]?.liked === 'no') encourage = L(`${G('לא אהב·ה')}? זה טבעי לגמרי. מחקרים מראים שלפעמים צריך 8–10 חשיפות ויותר. עוד ${EXPOSURE_GOAL - n} ונראה 💪`, `Didn’t like it? Totally normal. Research shows it can take 8–10 exposures or more. ${EXPOSURE_GOAL - n} more and we’ll see 💪`);
  else if (n < EXPOSURE_GOAL) encourage = L(`עוד ${EXPOSURE_GOAL - n} טעימות כדי לתת לטעם הזה צ׳אנס הוגן`, `${EXPOSURE_GOAL - n} more tastes to give this flavor a fair chance`);
  else encourage = `${n} ${L('טעימות', 'tastes')} – ${likes ? L('מוצר מוכר ואהוב! 🏆', 'A familiar favorite! 🏆') : L('נתתם צ׳אנס הוגן. אפשר להמשיך להציע מדי פעם בצורות אחרות.', 'You gave it a fair chance. Keep offering now and then in other forms.')}`;

  openModal(`
    <div class="detail-hero" style="--stage:${cat?.color || '#ffd9c9'}">
      <div class="stage">${fxHTML(f)}<span class="big anim-${f.anim || 'bounce'}" style="${animStyle(f)}">${foodIcon(f)}</span></div>
      <h2>${esc(f.name)}</h2>
      <div class="muted small">${cat ? cat.emoji + ' ' + cat.name : ''}</div>
    </div>
    ${ironLevel(f.id) ? `<div class="iron-banner">💪 ${ironLevel(f.id) === 2 ? L('מקור מצוין לברזל', 'An excellent source of iron') : L('מקור טוב לברזל', 'A good source of iron')}${ironLevel(f.id) && !['beef', 'lamb', 'liver', 'chicken', 'turkey', 'salmon', 'tuna', 'sardine', 'seabream', 'shrimp'].includes(f.id) ? L(' – לשלב עם ויטמין C 🍊', ' – pair with vitamin C 🍊') : ''}</div>` : VITC.includes(f.id) ? `<div class="iron-banner c">🍊 ${L('עשיר בוויטמין C – עוזר לספוג ברזל מהארוחה', 'Rich in vitamin C – helps absorb iron from the meal')}</div>` : ''}
    ${al ? `<div class="allergen-banner"><span class="anim-pulse" style="display:inline-block">⭐</span> ${L('אלרגן', 'Allergen')}: ${al.name} – ${L('חשוב לשמור על חשיפה קבועה', 'keep up regular exposure')}</div>` : ''}
    ${reacted ? `<div class="warn-banner">⚠️ ${L('נרשמה תגובה למוצר זה. מומלץ להתייעץ עם רופא/ה לפני מתן נוסף.', 'A reaction was recorded for this food. Consult a doctor before giving it again.')}</div>` : ''}
    <div class="progress">
      <div class="lbl"><span>${L('טעימות', 'Tastes')}</span><span>${n}/${EXPOSURE_GOAL}</span></div>
      <div class="bar"><i style="width:0" data-w="${Math.min(100, n / EXPOSURE_GOAL * 100)}"></i></div>
      <div class="small muted" style="margin-top:6px">${encourage}</div>
    </div>
    ${f.tip ? `<div class="card small">🍽️ <b>${L('איך מגישים', 'How to serve')}:</b> ${esc(f.tip)}</div>` : ''}
    ${f.choke ? `<div class="warn-banner small">⚠️ <b>${L('בטיחות', 'Safety')}:</b> ${esc(f.choke)} <a href="#" class="sos-link" data-sos>🆘 ${L('מה עושים בחנק?', 'What to do if choking?')}</a></div>` : ''}
    ${al ? `<div class="card small">⭐ <b>${L(`הכנסת ${al.name}`, `Introducing ${al.name}`)}:</b> ${esc(al.how)}</div>` : ''}
    ${n ? `<h3 class="section-title">${L('היסטוריה', 'History')}</h3><div class="card list">${logs.slice(0, 8).map((l) => logHTML(l, true)).join('')}</div>` : ''}
    ${f.custom ? `<button class="btn ghost block" id="delFood" style="margin-top:10px">${L('מחיקת מוצר', 'Delete food')}</button>` : ''}
    <div class="sheet-foot">
      ${n && !reacted ? `<button class="btn" id="quickBtn">⚡ ${L(G('טעמ·ה עכשיו'), 'Tasted now')}</button><button class="btn ghost" id="logBtn">📝 ${L('עם פרטים', 'With details')}</button>`
        : `<button class="btn" id="logBtn">😋 ${L('רישום טעימה', 'Log a taste')}</button>`}
    </div>
  `, (b) => {
    requestAnimationFrame(() => { const bar = $('.bar i', b); if (bar) bar.style.width = bar.dataset.w + '%'; });
    $('#logBtn', b).onclick = () => openLog(id);
    const qb = $('#quickBtn', b);
    if (qb) qb.onclick = () => quickLog(id);
    $('.card.list', b)?.addEventListener('click', (e) => { const t = e.target.closest('[data-edit]'); const l = t && state.logs.find((x) => x.id === t.dataset.edit); if (l) openLog(l.foodId, l); });
    const del = $('#delFood', b);
    if (del) del.onclick = () => {
      if (!confirm(L('למחוק את המוצר ואת כל הטעימות שלו?', 'Delete this food and all its tastes?'))) return;
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
    warn += `<div class="allergen-banner">⭐ ${L(G(`חשיפה ראשונה ל${al.name}! מתחילים בכמות קטנה, בבית, כש${esc(babyName())} בריא·ה, ועוקבים כשעתיים אחרי.`), `First exposure to ${al.name}! Start with a small amount, at home, while ${esc(babyName())} is healthy, and watch for about two hours after.`)}</div>`;
    if (lastIntro && daysBetween(lastIntro, Date.now()) < 2) warn += `<div class="warn-banner small">💡 ${L('הוכנס אלרגן חדש לפני פחות מיומיים. כדאי להמתין 2–3 ימים בין אלרגנים חדשים, כדי לדעת ממה הייתה תגובה.', 'A new allergen was introduced less than two days ago. Wait 2–3 days between new allergens so you’ll know what caused any reaction.')}</div>`;
    if (new Date().getHours() >= 16) warn += `<div class="warn-banner small">🌙 ${L('שעת ערב: אלרגן חדש עדיף לתת בבוקר או בצהריים, כדי שתוכלו לעקוב אחרי תגובה בזמן ערות.', 'It’s evening: a new allergen is better given in the morning or at midday, so you can watch for a reaction while awake.')}</div>`;
  }
  const isNow = !edit;
  openModal(`
    <div class="log-head">
      <div class="stage mini" style="--stage:${CATEGORIES.find((c) => c.id === f.cat)?.color || '#ffd9c9'}">${fxHTML(f)}<span class="big anim-${f.anim || 'bounce'}" style="font-size:56px;${animStyle(f)}">${foodIcon(f)}</span></div>
      <div><h2>${esc(f.name)}</h2><span class="muted small">${edit ? L('עריכת טעימה', 'Edit taste') : L('טעימה חדשה', 'New taste')}${al ? ` · ⭐ ${al.name}` : ''}</span></div>
    </div>
    ${warn}
    <form class="form" id="logForm">
      <label>${L('איך היה?', 'How was it?')} <span class="muted small">(${L('לא חובה', 'optional')})</span></label>
      <div class="choice-row reactions" data-group="liked" data-optional>${REACTIONS.map((r) => `<button type="button" class="choice ${edit?.liked === r.id ? 'on' : ''}" data-val="${r.id}"><span class="ce">${r.e}</span>${G(r.t)}</button>`).join('')}</div>
      <label>${L('כמה?', 'How much?')}</label>
      <div class="choice-row" data-group="amount">${AMOUNTS.map((a) => `<button type="button" class="choice ${(edit?.amount || 'taste') === a.id ? 'on' : ''}" data-val="${a.id}">${a.t}</button>`).join('')}</div>
      <label>${L('מרקם', 'Texture')} <span class="muted small">(${L('לא חובה', 'optional')})</span></label>
      <div class="choice-row textures" data-group="texture" data-optional>${TEXTURES.map((t) => `<button type="button" class="choice ${(edit ? edit.texture : lastTexture()) === t.id ? 'on' : ''}" data-val="${t.id}"><span class="ce">${t.e}</span>${t.t}</button>`).join('')}</div>
      <div class="opt-rows">
        <button type="button" class="opt-row" data-toggle="time">🕒 <span id="timeLbl">${isNow ? L('עכשיו', 'Now') : new Date(edit.ts).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span><em>${L('שינוי', 'Change')}</em></button>
        <div class="opt-body" data-body="time" hidden><input type="datetime-local" id="lgTime" value="${when.toISOString().slice(0, 16)}"></div>
        <button type="button" class="opt-row warn" data-toggle="sym">⚠️ ${L('הייתה תגובה?', 'Any reaction?')} <em>${hasSym ? L('כן', 'Yes') : L('הכל תקין', 'All fine')}</em></button>
        <div class="opt-body" data-body="sym" ${hasSym ? '' : 'hidden'}>
          <div class="symptoms">${SYMPTOMS.filter((s) => !s.hidden).map((s) => `<label class="${s.severe ? 'severe' : ''}"><input type="checkbox" value="${s.id}" ${edit?.symptoms?.includes(s.id) ? 'checked' : ''}>${s.t}</label>`).join('')}</div>
          <div id="emergencyBox"></div>
        </div>
        <button type="button" class="opt-row" data-toggle="note">📝 ${L('הערה', 'Note')} <em>${edit?.notes && !edit.seed ? esc(edit.notes) : L('הוספה', 'Add')}</em></button>
        <label class="opt-row photo-row">📸 ${L('תמונה למזכרת', 'Keepsake photo')} <em id="photoLbl">${edit?.photo ? L('יש תמונה', 'Has photo') : L('הוספה', 'Add')}</em><input type="file" id="lgPhoto" accept="image/*" hidden></label>
        <div class="photo-prev" id="photoPrev" ${edit?.photo ? '' : 'hidden'}><img alt=""><button type="button" class="link-btn" id="photoDel">${L('הסרת התמונה', 'Remove photo')}</button></div>
        <div class="opt-body" data-body="note" ${edit?.notes && !edit.seed ? '' : 'hidden'}><textarea id="lgNotes" maxlength="200" placeholder="${L('צורת הגשה, עם מה ערבבנו...', 'How it was served, what it was mixed with...')}">${edit && !edit.seed ? esc(edit.notes || '') : ''}</textarea></div>
      </div>
      <div class="sheet-foot">
        ${edit ? '<button type="button" class="btn ghost danger-text" id="lgDelete">🗑️ ' + L('מחיקה', 'Delete') + '</button>' : ''}
        <button class="btn" type="submit">${edit ? L('שמירת שינויים', 'Save changes') : L('שמירה ✓', 'Save ✓')}</button>
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
    $('#lgTime', b).onchange = (e) => { $('#timeLbl', b).textContent = new Date(e.target.value).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); };
    const symBox = $('.symptoms', b);
    const updSym = () => {
      const sel = $$('.symptoms input:checked', b).map((x) => x.value);
      const severe = sel.some((s) => SEVERE.includes(s));
      $('[data-toggle="sym"] em', b).textContent = sel.length ? L(`${sel.length} סומנו`, `${sel.length} selected`) : L('הכל תקין', 'All fine');
      $('#emergencyBox', b).innerHTML = severe
        ? `<div class="emergency">${L('🚨 אלה סימנים של תגובה אלרגית חמורה אפשרית. אם הם מתרחשים עכשיו: <a href="tel:101">חייגו 101 מיד</a>. אם יש אפיפן, השתמשו בו.', '🚨 These are signs of a possible severe allergic reaction. If they’re happening now: <b>call your emergency number immediately</b> (101 in Israel). If you have an EpiPen, use it.')}</div>`
        : sel.length ? `<div class="warn-banner small">${L('הפסיקו לתת את המזון, צלמו את התסמינים ופנו לרופא/ת הילדים. התזכורות לאלרגן הזה יושהו.', 'Stop the food, photograph the symptoms and contact your pediatrician. Reminders for this allergen will be paused.')}</div>` : '';
    };
    symBox.addEventListener('change', updSym);
    if (hasSym) updSym();
    $('#lgDelete', b)?.addEventListener('click', () => { closeModal(); deleteLog(edit.id); });
    // תמונה: undefined = ללא שינוי, null = להסיר, מחרוזת = תמונה חדשה
    let photoData;
    const prev = $('#photoPrev', b);
    if (edit?.photo) Photos.get(edit.id).then((src) => { if (src) $('img', prev).src = src; });
    $('#lgPhoto', b).onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        photoData = await compressPhoto(file);
        $('img', prev).src = photoData; prev.hidden = false; $('#photoLbl', b).textContent = L('נבחרה ✓', 'Selected ✓');
      } catch (ex) { toast(ex.message); }
    };
    $('#photoDel', b).onclick = () => { photoData = null; prev.hidden = true; $('#photoLbl', b).textContent = L('הוספה', 'Add'); };
    $('#logForm', b).addEventListener('submit', (e) => {
      e.preventDefault();
      const timeOpen = !$('[data-body="time"]', b).hidden;
      const data = {
        ts: timeOpen || edit ? (new Date($('#lgTime', b).value).getTime() || Date.now()) : Date.now(),
        liked: $('[data-group="liked"] .on', b)?.dataset.val,
        amount: $('[data-group="amount"] .on', b)?.dataset.val,
        texture: $('[data-group="texture"] .on', b)?.dataset.val,
        symptoms: $$('.symptoms input:checked', b).map((x) => x.value),
        notes: $('#lgNotes', b).value.trim(),
      };
      if (!data.texture) delete data.texture;
      const target = edit || { id: uid(), kid: activeKidId(), foodId };
      if (photoData) { data.photo = true; Photos.put(target.id, photoData); }
      if (photoData === null) { data.photo = false; Photos.remove(target.id); }
      if (edit) {
        Object.assign(edit, data, { seed: false });
        save(); closeModal(); render();
        checkBadges();
        return toast(L('השינויים נשמרו ✓', 'Changes saved ✓'));
      }
      const log = Object.assign(target, data);
      state.logs.push(log);
      save(); closeModal(); render();
      if (!log.symptoms.length) checkBadges();
      const count = logsFor(foodId).length;
      if (log.symptoms.length) toast(L('נשמר. עקבו אחרי התסמינים והתייעצו עם רופא/ה 🩺', 'Saved. Watch the symptoms and consult a doctor 🩺'));
      else {
        celebrate(foodIcon(f), count === 1 ? L(`טעימה ראשונה של ${f.name}! 🎉`, `First taste of ${f.name}! 🎉`) : count === EXPOSURE_GOAL ? L(`${EXPOSURE_GOAL} טעימות! אלופים 🏆`, `${EXPOSURE_GOAL} tastes! Champions 🏆`) : L(`טעימה מס׳ ${count} 👏`, `Taste #${count} 👏`));
        toast(L(`✓ ${f.name} נרשם`, `✓ ${f.name} logged`), [{ label: L('ביטול', 'Undo'), fn: () => { state.logs = state.logs.filter((l) => l.id !== log.id); save(); render(); } }]);
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
      <div class="warn-banner">⚠️ ${L(`נרשמה תגובה ב-${new Date(i.reacted.ts).toLocaleDateString(LOCALE)}. אל תמשיכו לתת עד התייעצות עם רופא/ת ילדים או אלרגולוג/ית. התזכורות מושהות.`, `A reaction was recorded on ${new Date(i.reacted.ts).toLocaleDateString(LOCALE)}. Don’t give it again until you’ve consulted a pediatrician or allergist. Reminders are paused.`)}</div>
      <button class="btn ghost block" id="clearBtn">${L('הרופא/ה אישר/ה להמשיך – חידוש מעקב', 'Doctor approved continuing – resume tracking')}</button>` : ''}
    <div class="card small">
      <b>${L('יעד שבועי', 'Weekly target')}:</b> ${i.target} ${L('פעמים', 'times')} · <b>${L('מקסימום הפסקה', 'Max gap')}:</b> ${i.a.maxGap} ${L('ימים', 'days')}<br>
      ${i.last ? `<b>${L('חשיפה אחרונה', 'Last exposure')}:</b> ${relDay(i.last.ts)} · <b>${L('השבוע', 'This week')}:</b> ${i.weekCount}/${i.target}<br><b>${L('סה״כ חשיפות', 'Total exposures')}:</b> ${i.tolerated.length}` : STATUS_TEXT.notStarted}
    </div>
    <div class="card small">🍽️ <b>${L('איך מגישים', 'How to serve')}:</b> ${esc(i.a.how)}${i.a.note ? `<br><br>📌 ${esc(i.a.note)}` : ''}</div>
    <h3 class="section-title">${L('בחרו מוצר לרישום', 'Choose a food to log')}</h3>
    <div class="grid" style="margin-top:0">${foods.map(foodCardHTML).join('')}</div>
  `, (b) => {
    $('.grid', b).addEventListener('click', (e) => { const t = e.target.closest('[data-food]'); if (t) openLog(t.dataset.food); });
    const c = $('#clearBtn', b);
    if (c) c.onclick = () => { state.cleared[key] = Date.now(); save(); closeModal(); render(); toast(L('המעקב חודש ✓', 'Tracking resumed ✓')); };
  });
}

function openAddFood(prefill = '') {
  const emojis = ['🍽️', '🥗', '🍲', '🥞', '🧆', '🥟', '🍜', '🫓', '🥯', '🧇', '🍪', '🫒', '🥥', '🍍', '🍋', '🥜', '🌶️', '🥘'];
  const anims = Object.keys(MOTION_DUR);
  const fxs = ['sparkle', 'hearts', 'juice', 'steam', 'leaves', 'seeds', 'bubbles', 'crumbs', 'swirl', 'pop', 'zest', 'shine', 'smell', 'drizzle', 'snow'];
  const fxNames = IS_EN ? { sparkle: '✨ Sparkle', hearts: '💛 Hearts', juice: '💧 Juice', steam: '♨️ Steam', leaves: '🍃 Leaves', seeds: '• Seeds', bubbles: '🫧 Bubbles', crumbs: '🍞 Crumbs', swirl: '🌀 Swirl', pop: '💥 Pop', zest: '🍋 Zest', shine: '✨ Shine', smell: '〜 Aroma', drizzle: '🍯 Drizzle', snow: '❄️ Flakes' }
    : { sparkle: '✨ נצנוץ', hearts: '💛 לבבות', juice: '💧 מיץ', steam: '♨️ אדים', leaves: '🍃 עלים', seeds: '• גרעינים', bubbles: '🫧 בועות', crumbs: '🍞 פירורים', swirl: '🌀 מערבולת', pop: '💥 פיצוץ', zest: '🍋 רעננות', shine: '✨ ברק', smell: '〜 ניחוח', drizzle: '🍯 זילוף', snow: '❄️ פתיתים' };
  openModal(`
    <h2 style="margin-bottom:6px">✨ ${L('מוצר חדש', 'New food')}</h2>
    <form class="form" id="addForm">
      <label for="afName">${L('שם המוצר', 'Food name')}</label>
      <input type="text" id="afName" required maxlength="30" placeholder="${L('למשל: שקשוקה', 'e.g. shakshuka')}" value="${esc(prefill)}">
      <label>${L('אימוג׳י', 'Emoji')}</label>
      <div class="choice-row" data-group="emoji">${emojis.map((e, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${e}" style="flex:0 0 52px"><span class="ce">${e}</span></button>`).join('')}</div>
      <label>${L('אנימציה', 'Animation')}</label>
      <div class="choice-row" data-group="anim">${anims.map((a, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${a}" style="flex:0 0 52px"><span class="ce anim-${a}">🍽️</span></button>`).join('')}</div>
      <label>${L('אפקט', 'Effect')}</label>
      <div class="choice-row" data-group="fx">${fxs.map((x, n) => `<button type="button" class="choice ${n ? '' : 'on'}" data-val="${x}" style="flex:0 0 auto;padding:6px 10px">${fxNames[x]}</button>`).join('')}</div>
      <label for="afAllergen">${L('מכיל אלרגן?', 'Contains an allergen?')}</label>
      <select id="afAllergen"><option value="">${L('לא', 'No')}</option>${visibleAllergens().map(([k, a]) => `<option value="${k}">${a.emoji} ${a.name}</option>`).join('')}</select>
      <label for="afTip">${L('טיפ הגשה (לא חובה)', 'Serving tip (optional)')}</label>
      <input type="text" id="afTip" maxlength="120">
      <div style="height:14px"></div>
      <button class="btn block" type="submit">${L('הוספה', 'Add')}</button>
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
    <h2 style="margin-bottom:6px">⚙️ ${L('הגדרות', 'Settings')}</h2>
    <div class="profile-card">
      ${avatarHTML(72)}
      <div><b>${esc(state.parent?.name || '')}</b><div class="small muted">${esc(Cloud.active ? Cloud.email : Auth.emailOf(currentUser))}</div><div class="small ${Cloud.active ? 'sync-on' : 'muted'}">${Cloud.active ? L('☁️ מסונכרן בענן', '☁️ Synced to the cloud') : L('📱 נשמר במכשיר בלבד', '📱 Saved on this device only')}</div></div>
      <button class="btn small ghost" id="avatarBtn">📷 ${L('אווטאר', 'Avatar')}</button>
    </div>
    <form class="form" id="setForm">
      <label for="stParent">${L('השם שלך', 'Your name')}</label>
      <input type="text" id="stParent" value="${esc(state.parent?.name)}" maxlength="30">
      <button type="button" class="opt-row" id="kidsBtn" style="margin-top:14px">👶 <span>${state.kids.length > 1 ? L(`${state.kids.length} ילדים`, `${state.kids.length} children`) : L('הוספת ילד/ה נוסף/ת', 'Add another child')}</span><em>${L('ניהול', 'Manage')}</em></button>
      <label for="stName">${L('שם התינוק', 'Baby’s name')}</label>
      <input type="text" id="stName" value="${esc(state.baby?.name)}" maxlength="30">
      <label for="stGender">${L('בן או בת', 'Boy or girl')}</label>
      <select id="stGender"><option value="">${L('לא צוין', 'Not specified')}</option><option value="m" ${state.baby?.gender === 'm' ? 'selected' : ''}>💙 ${L('בן', 'Boy')}</option><option value="f" ${state.baby?.gender === 'f' ? 'selected' : ''}>💗 ${L('בת', 'Girl')}</option></select>
      <label for="stBirth">${L('תאריך לידה', 'Date of birth')}</label>
      <input type="date" id="stBirth" value="${esc(state.baby?.birth)}">
      <h3 class="section-title">⭐ ${L('אלרגנים ויעדים שבועיים', 'Allergens & weekly targets')}</h3>
      <div class="card" style="padding:6px 14px">
        ${visibleAllergens().map(([k, a], _, all) => `
          ${nutHeader(all.map(([x]) => x), k, `<div class="switch-head">🌰 ${L('אגוזים', 'Nuts')}</div>`)}
          <div class="switch">
            <label style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" data-en="${k}" ${s.disabled.includes(k) ? '' : 'checked'}> ${allergenIcon(k)} ${a.name}</label>
            <span><input type="number" min="1" max="7" data-target="${k}" value="${targetFor(k)}" style="width:64px;padding:6px"> /${L('שבוע', 'week')}</span>
          </div>`).join('')}
      </div>
      <h3 class="section-title">🔔 ${L('התראות', 'Notifications')}</h3>
      <div class="card small">
        ${notifSupported ? `<label style="margin:0;display:flex;gap:8px;align-items:center"><input type="checkbox" id="stNotify" ${s.notify ? 'checked' : ''}> ${L('התראה יומית כשיש אלרגן שצריך לתת', 'Daily notification when an allergen is due')}</label>
        <p class="muted">${L('ההתראה מוצגת כשהאפליקציה נפתחת או פתוחה ברקע. לתזכורות מובטחות גם כשהאפליקציה סגורה – השתמשו ב״הוספת תזכורות ליומן״ במסך האלרגנים.', 'The notification shows when the app opens or is running in the background. For guaranteed reminders even when the app is closed, use “Add reminders to your calendar” on the allergens screen.')}</p>` : `<p>${L('הדפדפן לא תומך בהתראות. השתמשו בתזכורות ליומן במסך האלרגנים.', 'This browser doesn’t support notifications. Use calendar reminders on the allergens screen.')}</p>`}
      </div>
      <button class="btn block" type="submit">${L('שמירה', 'Save')}</button>
    </form>
    <h3 class="section-title">💾 ${L('גיבוי', 'Backup')}</h3>
    <div class="row">
      <button class="btn ghost" id="exportBtn">${L('ייצוא', 'Export')}</button>
      <label class="btn ghost" style="text-align:center">${L('ייבוא', 'Import')}<input type="file" id="importInput" accept="application/json" hidden></label>
    </div>
    <p class="small muted">${Cloud.active ? L('הנתונים מגובים בענן. הייצוא הוא גיבוי נוסף לקובץ.', 'Your data is backed up in the cloud. Export is an extra backup to a file.') : L('הנתונים נשמרים רק במכשיר הזה. מומלץ לגבות מדי פעם.', 'Data is saved on this device only. Back it up now and then.')}</p>
    ${Cloud.active ? `
    <h3 class="section-title">👨‍👩‍👧 ${L('שיתוף עם בן/בת הזוג', 'Share with your partner')}</h3>
    <div class="card share-card">
      <p class="small">${L('שלחו את הקוד לבן/בת הזוג. אחרי ההרשמה בוחרים "הצטרפות למשפחה קיימת" ומקלידים אותו, ומאותו רגע כל טעימה שאחד רושם מופיעה אצל השני.', 'Send the code to your partner. After signing up they choose "Join an existing family" and type it in – from then on, every taste one of you logs shows up for the other.')}</p>
      <div class="invite-code" dir="ltr">${esc(Cloud.inviteCode)}</div>
      <button type="button" class="btn accent block" id="shareBtn">📤 ${L('שליחת הזמנה', 'Send invite')}</button>
      <p class="small muted" style="text-align:center;margin:8px 0 0">${Cloud.members > 1 ? L(`👥 ${Cloud.members} הורים מחוברים`, `👥 ${Cloud.members} parents connected`) : L('עדיין רק את מחוברת', 'Only you are connected so far')}</p>
    </div>` : ''}
    ${isStandalone() ? '' : `<h3 class="section-title">📲 ${L('התקנה בטלפון', 'Install on your phone')}</h3>
    <button class="btn ghost block" id="installBtn">📲 ${L('התקנת Baby Bis למסך הבית', 'Add Baby Bis to your home screen')}</button>`}
    <h3 class="section-title">🌐 ${L('שפה', 'Language')}</h3>
    <div class="segment lang-seg"><button type="button" class="${IS_EN ? '' : 'on'}" data-lang="he">עברית</button><button type="button" class="${IS_EN ? 'on' : ''}" data-lang="en">English</button></div>
    <h3 class="section-title">👤 ${L('חשבון', 'Account')}</h3>
    <button class="btn ghost block" id="logoutBtn">🚪 ${L('התנתקות', 'Sign out')}</button>
    <button class="btn danger block" id="resetBtn" style="margin-top:12px">${L('מחיקת כל הנתונים והתחלה מחדש', 'Delete all data and start over')}</button>
    ${Cloud.active ? '' : `<button class="btn ghost block" id="delAccBtn" style="margin-top:12px;color:var(--red)">${L('מחיקת החשבון מהמכשיר', 'Delete account from this device')}</button>`}
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
        if (!s.notify) toast(L('ההרשאה להתראות נדחתה', 'Notification permission was denied'));
      } else s.notify = !!want;
      save(); closeModal(); render(); toast(L('נשמר ✓', 'Saved ✓'));
      maybeNotify(true);
    });
    $('#exportBtn', b).onclick = exportData;
    $('#importInput', b).onchange = (e) => importData(e.target.files[0]);
    $('#resetBtn', b).onclick = () => {
      if (!confirm(Cloud.active ? L('למחוק את כל הנתונים של המשפחה? זה ימחק אותם גם אצל בן/בת הזוג, ולא ניתן לבטל.', 'Delete all of your family’s data? This deletes it for your partner too and can’t be undone.') : L('למחוק את כל הנתונים? לא ניתן לבטל.', 'Delete all data? This can’t be undone.'))) return;
      state = Object.assign(defaultState(), Cloud.active ? { parent: state.parent } : {}); save(); closeModal(); go('home');
    };
    $('#avatarBtn', b).onclick = openAvatarModal;
    $('#kidsBtn', b).onclick = openKids;
    $('#installBtn', b)?.addEventListener('click', openInstall);
    $$('[data-lang]', b).forEach((x) => { x.onclick = () => { if (x.dataset.lang !== LANG) setLang(x.dataset.lang); }; });
    $('#logoutBtn', b).onclick = () => {
      closeModal();
      if (Cloud.active) { Cloud.logout(); return toast(L('התנתקת. להתראות 👋', 'Signed out. See you soon 👋')); }
      Auth.logout(); load(null); go('home'); toast(L('התנתקת. להתראות 👋', 'Signed out. See you soon 👋'));
    };
    $('#shareBtn', b)?.addEventListener('click', async () => {
      const text = L(`הצטרפו למעקב הטעימות של ${babyName()} ב-Baby Bis 🥄\nקוד המשפחה: ${Cloud.inviteCode}\n${location.origin}${location.pathname}`, `Join ${babyName()}'s tasting tracker on Baby Bis 🥄\nFamily code: ${Cloud.inviteCode}\n${location.origin}${location.pathname}`);
      try {
        if (navigator.share) await navigator.share({ title: 'Baby Bis', text });
        else { await navigator.clipboard.writeText(text); toast(L('ההזמנה הועתקה – אפשר להדביק בוואטסאפ 📋', 'Invite copied – paste it in WhatsApp 📋')); }
      } catch { /* המשתמש/ת ביטל/ה */ }
    });
    $('#delAccBtn', b)?.addEventListener('click', () => {
      if (!confirm(L('למחוק את החשבון ואת כל הנתונים שלו מהמכשיר? לא ניתן לבטל.', 'Delete this account and all its data from the device? This can’t be undone.'))) return;
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
      if (!confirm(L('הייבוא יחליף את הנתונים הנוכחיים. להמשיך?', 'Importing will replace the current data. Continue?'))) return;
      state = Object.assign(migrate(data), { onboarded: true });
      save(); closeModal(); go('home'); toast(L('יובא בהצלחה ✓', 'Imported successfully ✓'));
    } catch { toast(L('קובץ לא תקין', 'Invalid file')); }
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
      `SUMMARY:${a.emoji} ${a.name} ${L('ל', 'for ')}${babyName()}`,
      `DESCRIPTION:${L(`שמירה על חשיפה ל${a.name} (${targetFor(k)} פעמים בשבוע).`, `Keep up ${a.name} exposure (${targetFor(k)} times a week).`)} ${a.how.replace(/[,;]/g, ' ')}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${a.name}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//bis-rishon//HE', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'allergen-reminders.ics';
  a.click();
  toast(L('נוצר קובץ יומן – פתחו אותו כדי להוסיף את התזכורות 📅', 'Calendar file created – open it to add the reminders 📅'));
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
  const title = L(`תזכורת אלרגנים ל${babyName()}`, `Allergen reminder for ${babyName()}`);
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
