'use strict';
// פיצ׳רים מתקדמים: מרקמים, הישגים, תכנית שבועית ורשימת קניות, דוח לרופא/ה, ספר זיכרונות עם תמונות.

/* ===================== מרקמים ===================== */
const TEXTURES = [
  { id: 'puree',  e: '🥣', t: L('פירה חלק', 'Smooth purée') },
  { id: 'mashed', e: '🍴', t: L('מרוסק', 'Mashed') },
  { id: 'lumpy',  e: '🧆', t: L('גושים רכים', 'Soft lumps') },
  { id: 'finger', e: '✋', t: L('אוכל אצבעות', 'Finger food') },
  { id: 'family', e: '🍽️', t: L('משפחתי', 'Family food') },
];
const RECIPE_TEXTURE = { puree: 'puree', mash: 'mashed', finger: 'finger' };
const lastTexture = () => kidLogs().filter((l) => l.texture).sort((a, b) => b.ts - a.ts)[0]?.texture;

// מה מומלץ בכל גיל (על פי המלצות להתקדמות הדרגתית במרקמים)
function textureAdvice(age) {
  if (age === null || age < 6) return { ids: ['puree', 'mashed'], text: L('בהתחלה: פירה חלק או מרוסק, ואפשר כבר רצועות רכות מאוד.', 'At the start: smooth purée or mashed – very soft strips are fine too.') };
  if (age < 8) return { ids: ['mashed', 'lumpy', 'finger'], text: L('גיל 6–8 חודשים: מעבר למרוסק ולגושים רכים, ואוכל אצבעות רך שנמעך בקלות.', '6–8 months: move to mashed and soft lumps, plus soft finger foods that squish easily.') };
  if (age < 10) return { ids: ['lumpy', 'finger'], text: L('גיל 8–10 חודשים: גושים, קצוץ ואוכל אצבעות. זה הזמן לתרגל לעיסה.', '8–10 months: lumps, chopped food and finger foods. Time to practice chewing.') };
  return { ids: ['finger', 'family'], text: L('מגיל 10 חודשים: אוכל משפחתי קצוץ ואוכל אצבעות, כמעט כמו כולם.', 'From 10 months: chopped family food and finger foods – almost like everyone else.') };
}

function textureCardHTML() {
  const age = ageMonths();
  const recent = kidLogs().filter((l) => l.texture && Date.now() - l.ts < 21 * DAY);
  const counts = Object.fromEntries(TEXTURES.map((t) => [t.id, recent.filter((l) => l.texture === t.id).length]));
  const max = Math.max(1, ...Object.values(counts));
  const adv = textureAdvice(age);
  const smoothOnly = recent.length >= 5 && recent.every((l) => l.texture === 'puree');
  return `
  <section class="card">
    <div class="card-head"><h3>🥄 ${L('מרקמים ב-3 השבועות האחרונים', 'Textures in the last 3 weeks')}</h3></div>
    <div class="tex-bars">
      ${TEXTURES.map((t) => `<div class="tex ${adv.ids.includes(t.id) ? 'rec' : ''}"><i style="height:${Math.round(counts[t.id] / max * 100)}%"></i><b>${counts[t.id] || ''}</b><span>${t.e}</span><small>${t.t}</small></div>`).join('')}
    </div>
    <p class="small"><b>${L('מומלץ עכשיו', 'Recommended now')}:</b> ${adv.text}</p>
    ${smoothOnly && age >= 8 ? `<div class="warn-banner small">💡 ${L('כמעט רק פירה חלק. מחקרים מראים שמעבר למרקמים גסים יותר עד גיל 9–10 חודשים עוזר ללעיסה ומפחית בררנות בהמשך. נסו להשאיר קצת גושים.', 'Almost only smooth purée. Research shows that moving to coarser textures by 9–10 months helps chewing and reduces picky eating later. Try leaving some lumps.')}</div>` : ''}
    ${!recent.length ? `<p class="small muted">${L('כשרושמים טעימה אפשר לבחור מרקם, והגרף יתמלא.', 'Choose a texture when logging a taste and the chart will fill up.')}</p>` : ''}
  </section>`;
}

/* ===================== הישגים ===================== */
function hueBucket(hex) {
  if (!hex) return null;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.22 || l > 0.86) return 'white';
  let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 330) return 'red';
  if (h < 65) return 'orange';
  if (h < 170) return 'green';
  return 'purple';
}
const RAINBOW = IS_EN ? { red: '❤️ Red', orange: '🧡 Orange-yellow', green: '💚 Green', purple: '💜 Purple', white: '🤍 White' } : { red: '❤️ אדום', orange: '🧡 כתום-צהוב', green: '💚 ירוק', purple: '💜 סגול', white: '🤍 לבן' };
const BITTER_GREENS = ['broccoli', 'spinach', 'kale', 'chard', 'cabbage', 'asparagus', 'greenbean', 'zucchini'];
const MAIN_ALLERGENS = ['peanut', 'sesame', 'egg', 'milk', 'wheat'];

function badgeContext() {
  const logs = kidLogs().filter((l) => !l.symptoms?.length);
  const foods = new Set(logs.map((l) => l.foodId));
  const fl = [...foods].map(foodById).filter(Boolean);
  const byCat = (c) => fl.filter((f) => f.cat === c).length;
  const days = new Set(logs.filter((l) => !l.seed).map((l) => startOfDay(l.ts)));
  let streak = 0;
  for (let d = startOfDay(Date.now()); days.has(d); d -= DAY) streak++;
  const colors = new Set(fl.filter((f) => ['veg', 'fruit'].includes(f.cat)).map((f) => hueBucket(f.color)).filter(Boolean));
  const counts = {};
  logs.forEach((l) => { counts[l.foodId] = (counts[l.foodId] || 0) + 1; });
  const changed = [...foods].some((id) => {
    const seq = kidLogs().filter((l) => l.foodId === id && l.liked).sort((a, b) => a.ts - b.ts);
    const firstNo = seq.findIndex((l) => l.liked === 'no');
    return firstNo >= 0 && seq.slice(firstNo + 1).some((l) => ['love', 'ok'].includes(l.liked));
  });
  const introduced = (k) => ['introducing', 'maintaining'].includes(allergenInfo(k).status);
  return { logs, foods, byCat, streak, colors, counts, changed, introduced };
}

const BADGES = [
  { id: 'first', e: '🥄', t: L('ביס ראשון', 'First bite'), d: L('הטעימה הראשונה נרשמה', 'The first taste was logged'), test: (c) => c.logs.length >= 1 },
  { id: 'f10', e: '🌱', t: L('10 טעמים', '10 flavors'), d: L('10 מוצרים שונים', '10 different foods'), test: (c) => c.foods.size >= 10 },
  { id: 'f25', e: '🌿', t: L('25 טעמים', '25 flavors'), d: L('25 מוצרים שונים', '25 different foods'), test: (c) => c.foods.size >= 25 },
  { id: 'f50', e: '🌳', t: L('50 טעמים', '50 flavors'), d: L('50 מוצרים שונים', '50 different foods'), test: (c) => c.foods.size >= 50 },
  { id: 'f100', e: '🏆', t: L('100 טעמים', '100 flavors'), d: L('100 מוצרים שונים!', '100 different foods!'), test: (c) => c.foods.size >= 100 },
  { id: 'veg10', e: '🥦', t: L('חובב·ת ירקות', 'Veggie lover'), d: L('10 ירקות שונים', '10 different vegetables'), test: (c) => c.byCat('veg') >= 10 },
  { id: 'fruit10', e: '🍓', t: L('מלכ·ת הפירות', 'Fruit royalty'), d: L('10 פירות שונים', '10 different fruits'), test: (c) => c.byCat('fruit') >= 10 },
  { id: 'greens', e: '💪', t: L('אמיצ·ה בירוק', 'Brave with greens'), d: L('3 ירקות ירוקים ומרים', '3 bitter green vegetables'), test: (c) => BITTER_GREENS.filter((id) => c.foods.has(id)).length >= 3 },
  { id: 'rainbow', e: '🌈', t: L('קשת בענן', 'Rainbow'), d: L('ירקות ופירות בכל 5 צבעי הקשת', 'Fruit and veg in all 5 rainbow colors'), test: (c) => c.colors.size >= 5 },
  { id: 'spices', e: '🌶️', t: L('חובב·ת טעמים', 'Flavor fan'), d: L('5 תבלינים ועשבי תיבול', '5 spices and herbs'), test: (c) => c.byCat('herbs') >= 5 },
  { id: 'fish', e: '🐟', t: L('דג במים', 'Fish in water'), d: L('טעם·ה דג לראשונה', 'First taste of fish'), test: (c) => [...c.foods].some((id) => foodById(id)?.allergen === 'fish') },
  { id: 'allergen1', e: '⭐', t: L('אלרגן ראשון', 'First allergen'), d: L('הוכר אלרגן ראשון', 'First allergen introduced'), test: (c) => activeAllergens().some(c.introduced) },
  { id: 'main5', e: '🛡️', t: L('מגן האלרגנים', 'Allergen shield'), d: L('בוטנים, שומשום, ביצה, חלב וחיטה הוכרו', 'Peanut, sesame, egg, milk and wheat introduced'), test: (c) => MAIN_ALLERGENS.every(c.introduced) },
  { id: 'allAll', e: '👑', t: L('אלופ·ת האלרגנים', 'Allergen champion'), d: L('כל האלרגנים הפעילים הוכרו', 'All active allergens introduced'), test: (c) => activeAllergens().every(c.introduced) },
  { id: 'peanutWeek', e: '🥜', t: L('שבוע בוטנים מושלם', 'Perfect peanut week'), d: L('3 חשיפות לבוטנים בשבוע', '3 peanut exposures in a week'), test: () => allergenInfo('peanut').weekCount >= 3 },
  { id: 'streak3', e: '🔥', t: L('3 ימים ברצף', '3-day streak'), d: L('רישום טעימות 3 ימים ברצף', 'Tastes logged 3 days in a row'), test: (c) => c.streak >= 3 },
  { id: 'streak7', e: '🔥', t: L('שבוע ברצף', 'Week streak'), d: L('רישום טעימות 7 ימים ברצף', 'Tastes logged 7 days in a row'), test: (c) => c.streak >= 7 },
  { id: 'patience', e: '🔁', t: L('סבלנות משתלמת', 'Patience pays'), d: L('אותו מוצר 10 פעמים', 'The same food 10 times'), test: (c) => Object.values(c.counts).some((n) => n >= EXPOSURE_GOAL) },
  { id: 'changed', e: '😍', t: L('שינוי טעם', 'Change of taste'), d: L('מה שלא אהב·ה – עכשיו אוהב·ת!', 'Disliked it before – loves it now!'), test: (c) => c.changed },
  { id: 'finger', e: '✋', t: L('אוכל·ת לבד', 'Self-feeder'), d: L('אוכל אצבעות ראשון', 'First finger food'), test: (c) => c.logs.some((l) => ['finger', 'family'].includes(l.texture)) },
  { id: 'chef', e: '👩‍🍳', t: L('שף·ית קטנ·ה', 'Little chef'), d: L('5 ארוחות ממתכונים', '5 meals from recipes'), test: (c) => new Set(c.logs.filter((l) => /^(מתוך|From):/.test(l.notes || '')).map((l) => startOfDay(l.ts) + l.notes)).size >= 5 },
];

// בודק הישגים חדשים, שומר אותם על הילד ומחזיר את מה שנפתח עכשיו
function checkBadges(silent) {
  const kid = activeKid();
  if (!kid) return [];
  kid.badges = kid.badges || {};
  const c = badgeContext();
  const fresh = BADGES.filter((b) => !kid.badges[b.id] && b.test(c));
  fresh.forEach((b) => { kid.badges[b.id] = Date.now(); });
  if (fresh.length) save();
  if (!silent && fresh.length) setTimeout(() => celebrate(fresh[0].e, L(`הישג חדש: ${G(fresh[0].t)}!`, `New badge: ${fresh[0].t}!`)), 2100);
  return fresh;
}

function badgesHTML(limit) {
  const kid = activeKid();
  const got = kid?.badges || {};
  const list = BADGES.slice().sort((a, b) => (got[b.id] ? 1 : 0) - (got[a.id] ? 1 : 0));
  const n = BADGES.filter((b) => got[b.id]).length;
  return `
  <section class="card">
    <div class="card-head"><h3>🏅 ${L('הישגים', 'Badges')}</h3><span class="pill">${n}/${BADGES.length}</span></div>
    <div class="badges">
      ${(limit ? list.slice(0, limit) : list).map((b) => `
        <div class="badge ${got[b.id] ? 'got' : ''}" title="${esc(G(b.d))}">
          <span>${b.e}</span><b>${esc(G(b.t))}</b><small>${got[b.id] ? new Date(got[b.id]).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }) : esc(G(b.d))}</small>
        </div>`).join('')}
    </div>
  </section>`;
}

function varietyCardHTML() {
  const c = badgeContext();
  const cats = CATEGORIES.filter((x) => !['allergen', 'custom'].includes(x.id));
  return `
  <section class="card">
    <div class="card-head"><h3>🎨 ${L('מגוון', 'Variety')}</h3><span class="muted small">${c.foods.size} ${L('מוצרים', 'foods')}</span></div>
    <div class="variety">
      ${cats.map((cat) => { const all = FOODS.filter((f) => f.cat === cat.id).length; const got = c.byCat(cat.id); return `<div><span>${cat.emoji} ${cat.name}</span><div class="bar"><i style="width:${Math.round(got / all * 100)}%;background:${cat.color}"></i></div><b>${got}/${all}</b></div>`; }).join('')}
    </div>
    <p class="small" style="margin-bottom:0">${L('צבעי הקשת', 'Rainbow colors')}: ${Object.entries(RAINBOW).map(([k, v]) => `<span class="rb ${c.colors.has(k) ? 'on' : ''}">${v}</span>`).join(' ')}</p>
  </section>`;
}

function progressHTML() {
  return `${subHead(L(`📈 ההתקדמות של ${esc(babyName())}`, `📈 ${esc(babyName())}’s progress`))}
  ${badgesHTML()}
  ${varietyCardHTML()}
  ${textureCardHTML()}
  <div class="shortcut-row">
    <button class="btn ghost" data-action="memories">📸 ${L('ספר זיכרונות', 'Memory book')}</button>
    <button class="btn ghost" data-action="report">🩺 ${L('דוח לרופא/ה', 'Doctor report')}</button>
  </div>`;
}

/* ===================== תכנית שבועית ורשימת קניות ===================== */
const SPREAD = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 2, 4, 5], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const weekStart = () => { const d = new Date(startOfDay(Date.now())); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
const DAY_NAMES = IS_EN ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// תכנית מתגלגלת: 7 הימים הקרובים, מהיום
function weeklyPlan() {
  const ws = startOfDay(Date.now());
  const today = 0;
  const days = Array.from({ length: 7 }, (_, i) => ({ i, ts: ws + i * DAY, allergens: [], fresh: null, recipe: null, veg: null }));
  const keys = activeAllergens().filter((k) => ['introducing', 'maintaining'].includes(allergenInfo(k).status));
  keys.forEach((k, n) => {
    const t = Math.min(7, Math.max(1, targetFor(k)));
    SPREAD[t].forEach((d) => days[(d + (n % 3)) % 7].allergens.push(k));
  });
  // אלרגן חדש: ביום הראשון שמתאים (מהיום והלאה, עם הפרש של יומיים מהאלרגן החדש הקודם)
  const order = { high: 0, medium: 1, low: 2 };
  const fresh = activeAllergens().map(allergenInfo).filter((i) => i.status === 'notStarted').sort((a, b) => order[a.a.priority] - order[b.a.priority]);
  const lastIntro = lastNewAllergenIntro();
  let nextOk = Math.max(today, lastIntro ? Math.round((startOfDay(lastIntro) - ws) / DAY) + 3 : today);
  if ((ageMonths() ?? 6) >= 4) for (const f of fresh.slice(0, 2)) { if (nextOk > 6) break; days[nextOk].fresh = f.key; nextOk += 3; }
  // מתכון מוצע לכל יום – כזה שמכסה כמה שיותר מהאלרגנים של היום
  const pool = RECIPES.filter((r) => recipeAgeOk(r) && !recipeBlockers(r).length);
  const veggies = FOODS.filter((f) => f.cat === 'veg');
  const repeat = veggies.filter((f) => { const n = logsFor(f.id).length; return n > 0 && n < EXPOSURE_GOAL; });
  days.forEach((d) => {
    const scored = pool.map((r) => [r, recipeAllergens(r).filter((k) => d.allergens.includes(k)).length]).sort((a, b) => b[1] - a[1] || ((hashOf(a[0].id) + d.i) % 7) - ((hashOf(b[0].id) + d.i) % 7));
    d.recipe = scored[0]?.[1] ? scored[0][0] : pool[(d.i * 5) % Math.max(1, pool.length)];
    d.veg = (repeat.length ? repeat : veggies)[(d.i * 3 + ws / DAY) % (repeat.length || veggies.length)];
    d.done = (k) => kidLogs().some((l) => foodById(l.foodId)?.allergen === k && startOfDay(l.ts) === d.ts && !l.symptoms?.length);
  });
  return { days, today, ws };
}

function planHTML() {
  const { days, today } = weeklyPlan();
  return `${subHead(L('📅 תכנית ל-7 הימים הקרובים', '📅 Plan for the next 7 days'))}
  <p class="small muted">${L('התכנית מפזרת את האלרגנים לפי היעדים השבועיים, ומציעה מתכון וירק לחשיפה חוזרת לכל יום. מה שנרשם מסומן ✓ אוטומטית.', 'The plan spreads allergens according to weekly targets and suggests a recipe and a vegetable for repeat exposure each day. Anything logged is ticked ✓ automatically.')}</p>
  <button class="btn accent block" data-action="shopping">🛒 ${L('רשימת קניות לשבוע', 'Weekly shopping list')}</button>
  ${[...days.filter((d) => d.i >= today), ...days.filter((d) => d.i < today)].map((d, n, arr) => `
    ${d.i < today && (n === 0 || arr[n - 1].i >= today) ? `<details class="past-days"><summary>${L('ימים שעברו השבוע', 'Earlier this week')}</summary>` : ''}
    <section class="card plan-day ${d.i === today ? 'today' : d.i < today ? 'past' : ''}">
      <div class="card-head"><h3>${d.i === today ? `⭐ ${L('היום', 'Today')} · ` : d.i === 1 ? `${L('מחר', 'Tomorrow')} · ` : ''}${DAY_NAMES[new Date(d.ts).getDay()]} <span class="muted small">${new Date(d.ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric' })}</span></h3></div>
      <div class="plan-chips">
        ${d.allergens.map((k) => `<span class="plan-chip ${d.done(k) ? 'done' : ''}">${allergenIcon(k)} ${ALLERGENS[k].name}${d.done(k) ? ' ✓' : ''}</span>`).join('')}
        ${d.fresh ? `<span class="plan-chip fresh">🌱 ${L('חדש', 'New')}: ${allergenIcon(d.fresh)} ${ALLERGENS[d.fresh].name} (${L('בבוקר', 'morning')})</span>` : ''}
        ${!d.allergens.length && !d.fresh ? `<span class="muted small">${L('יום חופשי מאלרגנים – רק ליהנות 🙂', 'Allergen-free day – just enjoy 🙂')}</span>` : ''}
      </div>
      <div class="plan-ideas">
        ${d.recipe ? `<button class="plan-idea" data-recipe="${d.recipe.id}"><span>${d.recipe.emoji}</span><b>${esc(d.recipe.name)}</b><em>${L('מתכון', 'Recipe')} ${FWD}</em></button>` : ''}
        ${d.veg ? `<button class="plan-idea" data-food="${d.veg.id}"><span>${foodIcon(d.veg)}</span><b>${L('ירק לחשיפה', 'Veggie to repeat')}: ${esc(d.veg.name)}</b><em>${logsFor(d.veg.id).length}/${EXPOSURE_GOAL}</em></button>` : ''}
      </div>
    </section>
    ${d.i < today && n === arr.length - 1 ? '</details>' : ''}`).join('')}`;
}

// רשימת קניות מהתכנית (מהיום ועד סוף השבוע)
function shoppingItems() {
  const { days, today } = weeklyPlan();
  const items = new Map(); // key -> { name, icon, group }
  const add = (key, name, icon, group) => { if (!items.has(key)) items.set(key, { key, name, icon, group }); };
  days.filter((d) => d.i >= today).forEach((d) => {
    [...d.allergens, d.fresh].filter(Boolean).forEach((k) => {
      const recent = allergenLogs(k).find((l) => !l.seed) || allergenLogs(k)[0];
      const f = foodById(recent?.foodId) || foodById(ALLERGENS[k].rep);
      if (f) add(f.id, f.name, foodIcon(f), 'allergen');
    });
    if (d.recipe) {
      d.recipe.ingredients.forEach((id) => { const f = foodById(id); if (f) add(f.id, f.name, foodIcon(f), f.cat); });
      d.recipe.extras.forEach((x) => add('x:' + x, x.replace(/\s*\(.*\)/, ''), '▫️', 'extra'));
    }
    if (d.veg) add(d.veg.id, d.veg.name, foodIcon(d.veg), 'veg');
  });
  return [...items.values()];
}

function openShopping() {
  const key = `bis-shop:${activeKidId()}:${weekStart()}`;
  let checked = {};
  try { checked = JSON.parse(localStorage.getItem(key)) || {}; } catch { /* ריק */ }
  const items = shoppingItems();
  const groups = [['allergen', L('⭐ אלרגנים', '⭐ Allergens')], ...CATEGORIES.filter((c) => !['allergen', 'custom'].includes(c.id)).map((c) => [c.id, `${c.emoji} ${c.name}`]), ['extra', L('🧂 עוד', '🧂 Other')]];
  openModal(`
    <h2 class="sheet-title">🛒 ${L('רשימת קניות לשבוע', 'Weekly shopping list')}</h2>
    <p class="small muted">${L('לפי התכנית ל-7 הימים הקרובים. סמנו מה כבר יש בבית.', 'Based on the plan for the next 7 days. Tick what you already have at home.')}</p>
    ${groups.map(([g, title]) => { const list = items.filter((i) => i.group === g); return list.length ? `<h3 class="pk-head">${title}</h3><div class="shop-list">${list.map((i) => `<label class="shop-item ${checked[i.key] ? 'on' : ''}"><input type="checkbox" data-k="${esc(i.key)}" ${checked[i.key] ? 'checked' : ''}><span class="si-icon">${i.icon}</span>${esc(i.name)}</label>`).join('')}</div>` : ''; }).join('')}
    <div class="sheet-foot"><button class="btn" id="shopShare">📤 ${L('שליחה לוואטסאפ', 'Share')}</button></div>
  `, (b) => {
    b.addEventListener('change', (e) => {
      const k = e.target.dataset.k; if (!k) return;
      checked[k] = e.target.checked;
      e.target.closest('.shop-item').classList.toggle('on', e.target.checked);
      try { localStorage.setItem(key, JSON.stringify(checked)); } catch { /* ללא אחסון */ }
    });
    $('#shopShare', b).onclick = async () => {
      const text = L(`🛒 קניות לשבוע של ${babyName()} (Baby Bis)\n`, `🛒 ${babyName()}’s weekly shopping (Baby Bis)\n`) + items.filter((i) => !checked[i.key]).map((i) => `• ${i.name}`).join('\n');
      try {
        if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); toast(L('הרשימה הועתקה 📋', 'List copied 📋')); }
      } catch { /* בוטל */ }
    };
  });
}

/* ===================== דוח לרופא/ה ===================== */
function reportHTML() {
  const k = activeKid();
  const fmt = (ts) => ts ? new Date(ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'numeric', year: '2-digit' }) : '–';
  const symText = (l) => (l.symptoms || []).map((s) => SYMPTOMS.find((x) => x.id === s)?.t).filter(Boolean).join(', ');
  const infos = activeAllergens().map(allergenInfo);
  const reactions = kidLogs().filter((l) => l.symptoms?.length).sort((a, b) => a.ts - b.ts);
  const tried = [...new Set(kidLogs().map((l) => l.foodId))].map(foodById).filter(Boolean);
  const gender = state.baby?.gender === 'm' ? L('בן', 'Boy') : state.baby?.gender === 'f' ? L('בת', 'Girl') : '';
  return `${subHead(L('🩺 דוח לרופא/ה', '🩺 Doctor report'))}
  <div class="report-actions no-print">
    <p class="small muted">${L('דוח מסודר לביקור אצל רופא/ת הילדים, אחות טיפת חלב או אלרגולוג/ית. לחצו על הכפתור ובחרו "שמירה כ-PDF" או הדפסה.', 'A tidy report for a visit to the pediatrician, health visitor or allergist. Tap the button and choose "Save as PDF" or print.')}</p>
    <button class="btn block" data-action="print">🖨️ ${L('הדפסה / שמירה כ-PDF', 'Print / save as PDF')}</button>
  </div>
  <article class="report">
    <header class="rep-head">
      <div><h1>${L('דוח טעימות וחשיפה לאלרגנים', 'Food tasting & allergen exposure report')}</h1>
      <p><b>${esc(babyName())}</b>${gender ? ` · ${gender}` : ''} · ${L('תאריך לידה', 'Date of birth')}: ${fmt(state.baby?.birth && new Date(state.baby.birth).getTime())} · ${L('גיל', 'Age')}: ${ageText(state.baby?.birth)}</p>
      <p class="muted">${L('הופק ב-', 'Generated ')}${fmt(Date.now())} · Baby Bis${state.parent?.name ? ` · ${L('מילא/ה', 'Recorded by')}: ${esc(state.parent.name)}` : ''}</p></div>
      ${k?.avatar ? avatarHTML(64, k.avatar) : ''}
    </header>

    <h2>⚠️ ${L('תגובות שנרשמו', 'Recorded reactions')}</h2>
    ${reactions.length ? `<table><thead><tr><th>${L('תאריך', 'Date')}</th><th>${L('מוצר', 'Food')}</th><th>${L('אלרגן', 'Allergen')}</th><th>${L('תסמינים', 'Symptoms')}</th><th>${L('הערות', 'Notes')}</th></tr></thead><tbody>
      ${reactions.map((l) => { const f = foodById(l.foodId); return `<tr class="bad"><td>${l.seed ? L('לפני האפליקציה', 'Before the app') : fmt(l.ts)}</td><td>${esc(f?.name || '')}</td><td>${f?.allergen ? ALLERGENS[f.allergen].name : '–'}</td><td>${esc(symText(l))}</td><td>${l.seed ? L('דווח בשאלון הפתיחה', 'Reported in the opening questionnaire') : esc(l.notes || '')}</td></tr>`; }).join('')}
    </tbody></table>` : `<p>${L('לא נרשמו תגובות.', 'No reactions recorded.')}</p>`}

    <h2>⭐ ${L('אלרגנים', 'Allergens')}</h2>
    <table><thead><tr><th>${L('אלרגן', 'Allergen')}</th><th>${L('סטטוס', 'Status')}</th><th>${L('חשיפה ראשונה', 'First exposure')}</th><th>${L('חשיפה אחרונה', 'Last exposure')}</th><th>${L('סה״כ', 'Total')}</th><th>${L('4 שבועות אחרונים', 'Last 4 weeks')}</th></tr></thead><tbody>
      ${infos.map((i) => { const first = i.tolerated[i.tolerated.length - 1]; const real = i.tolerated.filter((l) => !l.seed); const month = real.filter((l) => Date.now() - l.ts < 28 * DAY).length; const when = (l) => (l?.seed ? L('לפני האפליקציה*', 'Before the app*') : fmt(l?.ts)); return `<tr class="${i.status === 'suspected' ? 'bad' : ''}"><td>${i.a.name}</td><td>${STATUS_TEXT[i.status]}</td><td>${when(first)}</td><td>${when(real[0] || i.last)}</td><td>${real.length}${i.tolerated.length > real.length ? '+' : ''}</td><td>${month}</td></tr>`; }).join('')}
    </tbody></table>
    ${kidLogs().some((l) => l.seed) ? `<p class="muted" style="font-size:11px">${L('* נחשף/ה לפני תחילת השימוש באפליקציה (לפי דיווח ההורים בשאלון הפתיחה), ללא תאריך מדויק. "+" = חשיפות נוספות לפני האפליקציה.', '* Exposed before starting to use the app (as reported by the parents in the opening questionnaire), without an exact date. "+" = additional exposures before the app.')}</p>` : ''}

    <h2>🥕 ${L('מוצרים שנטעמו', 'Foods tasted')} (${tried.length})</h2>
    ${CATEGORIES.map((c) => { const list = tried.filter((f) => f.cat === c.id); return list.length ? `<p><b>${c.name}:</b> ${list.map((f) => `${esc(f.name)} (${logsFor(f.id).length}${logsFor(f.id).some((l) => l.symptoms?.length) ? `, ⚠️ ${L('תגובה', 'reaction')}` : ''})`).join(', ')}</p>` : ''; }).join('')}

    <h2>🥄 ${L('מרקמים', 'Textures')}</h2>
    <p>${TEXTURES.map((t) => `${t.t}: ${kidLogs().filter((l) => l.texture === t.id).length}`).join(' · ')}</p>

    <p class="rep-foot">${L('המידע נרשם על ידי ההורים באפליקציית Baby Bis ואינו מהווה אבחנה רפואית.', 'This information was recorded by the parents in the Baby Bis app and is not a medical diagnosis.')}</p>
  </article>`;
}

/* ===================== תמונות וספר זיכרונות ===================== */
// דחיסה לתמונה קטנה (עד 720 פיקסלים, JPEG) כדי לחסוך מקום
async function compressPhoto(file, max = 720) {
  const img = await Avatar.loadImage(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

// אחסון תמונות: בענן במסמכים נפרדים (נטענים רק כשצריך), במצב מקומי במפתח נפרד
const Photos = {
  key: () => `bis-rishon-photos:${currentUser}`,
  local() { try { return JSON.parse(localStorage.getItem(this.key())) || {}; } catch { return {}; } },
  async put(logId, data) {
    if (Cloud.active) return Cloud.putPhoto(logId, data);
    const all = this.local(); all[logId] = data;
    try { localStorage.setItem(this.key(), JSON.stringify(all)); }
    catch { toast(L('אין מספיק מקום במכשיר לתמונה. חיבור לענן פותר את זה ☁️', 'Not enough space on the device for the photo. Connecting to the cloud solves this ☁️')); return false; }
    return true;
  },
  async get(logId) { return Cloud.active ? Cloud.getPhoto(logId) : this.local()[logId]; },
  async remove(logId) {
    if (Cloud.active) return Cloud.removePhoto(logId);
    const all = this.local(); delete all[logId];
    try { localStorage.setItem(this.key(), JSON.stringify(all)); } catch { /* ללא אחסון */ }
  },
};

let memFilter = 'all';
function memoriesHTML() {
  const logs = kidLogs().slice().sort((a, b) => a.ts - b.ts);
  const firsts = [];
  const seen = new Set();
  logs.forEach((l) => { if (!seen.has(l.foodId)) { seen.add(l.foodId); firsts.push(l); } });
  // תמונות של טעימות שאינן ראשונות – גם הן בספר
  const extraPhotos = logs.filter((l) => l.photo && !firsts.includes(l));
  let items = firsts.concat(extraPhotos).sort((a, b) => b.ts - a.ts);
  if (memFilter === 'photos') items = items.filter((l) => l.photo);
  const birth = state.baby?.birth ? new Date(state.baby.birth).getTime() : null;
  const ageAt = (ts) => birth ? Math.max(0, Math.floor((ts - birth) / (30.44 * DAY))) : null;
  return `${subHead(L(`📸 ספר הזיכרונות של ${esc(babyName())}`, `📸 ${esc(babyName())}’s memory book`))}
  <div class="chips"><button class="chip ${memFilter === 'all' ? 'active' : ''}" data-mem="all">🍽️ ${L('כל הפעמים הראשונות', 'All the firsts')}</button><button class="chip ${memFilter === 'photos' ? 'active' : ''}" data-mem="photos">📸 ${L('עם תמונה', 'With photo')}</button></div>
  ${items.length ? `<div class="mem-grid">${items.map((l) => { const f = foodById(l.foodId) || { emoji: '❔', name: '' }; const r = REACTIONS.find((x) => x.id === l.liked); const a = ageAt(l.ts); return `
    <button class="mem ${l.photo ? 'has-photo' : ''}" data-edit="${l.id}">
      <div class="mem-pic">${l.photo ? `<img data-photo="${l.id}" alt="">` : `<span>${foodIcon(f)}</span>`}${r ? `<em>${r.e}</em>` : ''}</div>
      <b>${esc(f.name)}</b>
      <small>${firsts.includes(l) ? `${L('פעם ראשונה', 'First time')} · ` : ''}${new Date(l.ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}${a !== null ? ` · ${L(`בגיל ${a} ח׳`, `at ${a} mo`)}` : ''}</small>
    </button>`; }).join('')}</div>` : `<div class="empty"><span class="e-emoji">📸</span><p>${memFilter === 'photos' ? L('עוד אין תמונות. כשרושמים טעימה, בוחרים "📸 תמונה למזכרת".', 'No photos yet. When logging a taste, choose "📸 Keepsake photo".') : L('עוד אין טעימות.', 'No tastes yet.')}</p></div>`}`;
}
// טעינת התמונות אחרי ההצגה
function hydratePhotos(root = document) {
  $$('img[data-photo]', root).forEach(async (img) => {
    const src = await Photos.get(img.dataset.photo).catch(() => null);
    if (src) img.src = src; else img.closest('.mem-pic')?.classList.add('missing');
  });
}

function printReport() {
  document.body.classList.add('printing');
  setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); }, 50);
}
