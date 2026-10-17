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
  if (!silent && fresh.length) setTimeout(() => {
    celebrate(fresh[0].e, L(`הישג חדש: ${G(fresh[0].t)}!`, `New badge: ${fresh[0].t}!`));
    setTimeout(() => toast(L('🏅 הישג חדש! לשתף עם המשפחה?', '🏅 New badge! Share with family?'), [{ label: L('📤 שיתוף', '📤 Share'), fn: () => openShareCard('badge') }]), 1900);
  }, 2100);
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
  const cats = CATEGORIES.filter((x) => !['allergen', 'custom'].includes(x.id) && FOODS.some((y) => y.cat === x.id));
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
  <button class="btn block share-cta" data-action="sharecard">📤 ${L('כרטיס הישג לשיתוף עם המשפחה', 'Share card for the family')}</button>
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

/* ===================== התקנה למסך הבית ===================== */
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
window.addEventListener('appinstalled', () => { installEvt = null; toast(L('Baby Bis הותקנה במסך הבית 🎉', 'Baby Bis was added to your home screen 🎉')); });

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installEnv() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)/.test(ua) || (ios && !/Safari\//.test(ua))) return 'inapp';
  if (ios) return 'ios';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function installCardHTML() {
  let x = false; try { x = !!localStorage.getItem('bis-install-x'); } catch { /* ללא אחסון */ }
  if (isStandalone() || x) return '';
  return `<div class="card install-card"><button class="install-main" data-action="install"><span>📲</span><span><b>${L('התקינו את Baby Bis בטלפון', 'Install Baby Bis on your phone')}</b><small>${L('נפתח במסך מלא, בלחיצה אחת מהמסך הבית', 'Opens full-screen, one tap from your home screen')}</small></span></button><button class="install-x" data-action="install-x" aria-label="${L('לא עכשיו', 'Not now')}">✕</button></div>`;
}

function openInstall() {
  const env = installEnv();
  const steps = {
    inapp: [L('האתר נפתח בתוך אפליקציה אחרת (וואטסאפ, אינסטגרם וכו׳), ומשם אי אפשר להתקין.', 'The site is open inside another app (WhatsApp, Instagram, etc.), which can’t install apps.'),
      L('לוחצים על <b>⋮</b> או <b>…</b> בפינת המסך ← <b>פתיחה בדפדפן</b> (כרום או ספארי).', 'Tap <b>⋮</b> or <b>…</b> in the corner → <b>Open in browser</b> (Chrome or Safari).'),
      L('אין כפתור כזה? מעתיקים את הקישור למטה ומדביקים בכרום / ספארי.', 'No such button? Copy the link below and paste it in Chrome / Safari.'),
      L('ושם פותחים שוב את המדריך הזה מההגדרות ⚙️', 'Then open this guide again from settings ⚙️')],
    ios: [L('פותחים את האתר ב<b>ספארי</b> (בכרום באייפון זה עובד גם, דרך כפתור השיתוף).', 'Open the site in <b>Safari</b> (Chrome on iPhone works too, via its share button).'),
      L('לוחצים על כפתור השיתוף <b>⬆️</b> (ריבוע עם חץ למעלה, בתחתית המסך או ליד הכתובת).', 'Tap the share button <b>⬆️</b> (a square with an up arrow, at the bottom or next to the address).'),
      L('גוללים למטה ובוחרים <b>הוספה למסך הבית</b> ➕', 'Scroll down and choose <b>Add to Home Screen</b> ➕'),
      L('לוחצים <b>הוספה</b> – והאייקון 🥄 יופיע במסך הבית.', 'Tap <b>Add</b> – the 🥄 icon appears on your home screen.')],
    android: [L('פותחים את האתר ב<b>כרום</b>.', 'Open the site in <b>Chrome</b>.'),
      L('לוחצים על <b>⋮</b> (שלוש נקודות למעלה בפינה).', 'Tap <b>⋮</b> (three dots in the top corner).'),
      L('בוחרים <b>התקנת אפליקציה</b> או <b>הוספה למסך הבית</b>.', 'Choose <b>Install app</b> or <b>Add to Home screen</b>.'),
      L('מאשרים <b>התקנה</b> ✓', 'Confirm <b>Install</b> ✓')],
    samsung: [L('לוחצים על <b>☰</b> (התפריט בתחתית המסך).', 'Tap <b>☰</b> (the menu at the bottom).'),
      L('בוחרים <b>הוספת דף אל</b> ← <b>מסך הבית</b>.', 'Choose <b>Add page to</b> → <b>Home screen</b>.'),
      L('מאשרים <b>הוספה</b> ✓', 'Confirm <b>Add</b> ✓')],
    desktop: [L('בכרום או באדג׳: לוחצים על סמל ההתקנה ⊕ בצד שורת הכתובת.', 'In Chrome or Edge: click the install icon ⊕ at the side of the address bar.'),
      L('או: תפריט <b>⋮</b> ← <b>התקנת Baby Bis</b>.', 'Or: menu <b>⋮</b> → <b>Install Baby Bis</b>.'),
      L('הכי נוח בטלפון – פתחו את הקישור בטלפון והתקינו שם 📱', 'Easiest on a phone – open the link on your phone and install there 📱')],
  }[env];
  openModal(`
    <h2 class="sheet-title">📲 ${L('התקנת Baby Bis', 'Install Baby Bis')}</h2>
    <p class="small muted">${L('האפליקציה מותקנת ישר מהאתר, בלי חנות אפליקציות – בחינם ובלי הרשמה נוספת.', 'The app installs straight from the website – no app store, free, no extra sign-up.')}</p>
    ${installEvt ? `<button class="btn block" id="instNow">📲 ${L('התקנה עכשיו', 'Install now')}</button><p class="small muted" style="text-align:center">${L('או ידנית:', 'or manually:')}</p>` : ''}
    <ol class="inst-steps">${steps.map((t) => `<li>${t}</li>`).join('')}</ol>
    ${env === 'inapp' ? `<button class="btn ghost block" id="instCopy">🔗 ${L('העתקת הקישור', 'Copy the link')}</button>` : ''}
    <p class="small muted" style="margin-top:14px">💡 ${L('אחרי ההתקנה פותחים את Baby Bis מהאייקון 🥄. הנתונים שלכם נשארים – מתחברים עם אותו חשבון.', 'After installing, open Baby Bis from the 🥄 icon. Your data stays – sign in with the same account.')}</p>`);
  const b = $('#modalBody');
  $('#instNow', b)?.addEventListener('click', async () => {
    const ev = installEvt; if (!ev) return;
    ev.prompt();
    const r = await ev.userChoice.catch(() => null);
    if (r?.outcome === 'accepted') { installEvt = null; closeModal(); }
  });
  $('#instCopy', b)?.addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try { await navigator.clipboard.writeText(url); toast(L('הקישור הועתק 📋', 'Link copied 📋')); } catch { prompt(L('העתיקו את הקישור:', 'Copy the link:'), url); }
  });
}

/* ===================== ברזל ===================== */
// מגיל 6 חודשים מאגרי הברזל מהלידה מתרוקנים – מומלץ מזון עשיר בברזל בלפחות 2 ארוחות ביום
const IRON_HIGH = ['beef', 'lamb', 'liver', 'lentil', 'blacklentil', 'chickpea', 'hummus', 'bean', 'tofu', 'edamame', 'fava', 'mungbean', 'sardine'];
const IRON_MED = ['chicken', 'turkey', 'salmon', 'tuna', 'seabream', 'shrimp', 'hardegg', 'bakedegg', 'omelet', 'spinach', 'chard', 'kale', 'pea', 'quinoa', 'buckwheat', 'oat', 'millet', 'tahini', 'groundsesame', 'peanutbutter', 'almondbutter', 'raisin', 'apricot'];
const VITC = ['orange', 'clementine', 'kiwi', 'strawberry', 'pepper', 'broccoli', 'tomato', 'mango', 'guava', 'papaya', 'pomelo', 'lemon', 'cauliflower', 'pineapple', 'raspberry', 'kohlrabi', 'cabbage', 'lychee'];
const IRON_TARGET = 2;
const ironLevel = (id) => (IRON_HIGH.includes(id) ? 2 : IRON_MED.includes(id) ? 1 : 0);

function ironToday() {
  const t0 = startOfDay(Date.now());
  const logs = kidLogs().filter((l) => !l.seed && l.ts >= t0 && ironLevel(l.foodId) && !(l.symptoms || []).length);
  // ארוחה = טעימות שנרשמו בהפרש של פחות משעה נחשבות מנה אחת
  const meals = [];
  [...logs].sort((a, b) => a.ts - b.ts).forEach((l) => { if (!meals.length || l.ts - meals[meals.length - 1] > 60 * 60 * 1000) meals.push(l.ts); });
  return { logs, servings: meals.length, foods: [...new Set(logs.map((l) => l.foodId))] };
}

function ironSuggestions(exclude, n = 4) {
  const blocked = (f) => f.allergen && ['notStarted', 'suspected'].includes(allergenInfo(f.allergen).status);
  const tried = (id) => logsFor(id).length > 0;
  return [...IRON_HIGH, ...IRON_MED].map(foodById).filter((f) => f && !exclude.includes(f.id) && !blocked(f))
    .sort((a, b) => (tried(b.id) - tried(a.id)) || (ironLevel(b.id) - ironLevel(a.id)))
    .slice(0, n);
}

function ironCardHTML() {
  const age = ageMonths();
  if (age === null || age < 5.5) return '';
  const it = ironToday();
  const done = Math.min(it.servings, IRON_TARGET);
  const sugg = done < IRON_TARGET ? ironSuggestions(it.foods) : [];
  const vc = VITC.map(foodById).filter((f) => f && logsFor(f.id).length).slice(0, 3);
  const vcText = (vc.length ? vc : VITC.slice(0, 3).map(foodById).filter(Boolean)).map((f) => f.name).join(L(', ', ', '));
  return `<section class="card iron-card">
    <div class="card-head"><h3>💪 ${L('ברזל היום', 'Iron today')}</h3><span class="iron-dots" aria-label="${done}/${IRON_TARGET}">${Array.from({ length: IRON_TARGET }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</span></div>
    <p class="small" style="margin:0 0 8px">${done >= IRON_TARGET
      ? L(`מעולה! ${it.servings} ארוחות עם ברזל היום 🎉`, `Great! ${it.servings} iron-rich meals today 🎉`)
      : done ? L(`ארוחה אחת עם ברזל – עוד אחת ומסיימים להיום`, `One iron-rich meal – one more for today`)
      : L('מומלץ מזון עשיר בברזל בשתי ארוחות ביום', 'Aim for iron-rich food at two meals a day')}</p>
    ${it.foods.length ? `<div class="iron-eaten">${it.foods.map(foodById).filter(Boolean).map((f) => `<span class="plan-chip done">${foodIcon(f)} ${esc(f.name)} ✓</span>`).join('')}</div>` : ''}
    ${sugg.length ? `<div class="iron-sugg">${sugg.map((f) => `<button class="iron-food" data-food="${f.id}">${foodIcon(f)}<span>${esc(f.name)}</span>${ironLevel(f.id) === 2 ? '<em>💪💪</em>' : '<em>💪</em>'}</button>`).join('')}</div>` : ''}
    <p class="small muted" style="margin:8px 0 0">🍊 ${L(`ויטמין C באותה ארוחה מכפיל את ספיגת הברזל – למשל ${vcText}`, `Vitamin C at the same meal boosts iron absorption – e.g. ${vcText}`)}</p>
    <details class="iron-why"><summary>${L('למה ברזל כל כך חשוב?', 'Why is iron so important?')}</summary>
      <ul class="small">
        <li>${L('מאגרי הברזל שהתינוק נולד איתם מתרוקנים בסביבות גיל 6 חודשים, וחלב אם לבדו לא מספיק אחר כך.', 'The iron stores babies are born with run low around 6 months, and breast milk alone isn’t enough after that.')}</li>
        <li>${L('ברזל חיוני להתפתחות המוח. מחסור נפוץ בגיל 6–24 חודשים.', 'Iron is essential for brain development. Deficiency is common between 6 and 24 months.')}</li>
        <li>${L('ברזל מבשר, עוף ודגים נספג הכי טוב. מקטניות, טופו וביצים – לשלב עם ויטמין C.', 'Iron from meat, poultry and fish is absorbed best. From legumes, tofu and eggs – pair with vitamin C.')}</li>
        <li>${L('חלב פרה כמשקה מגיל שנה בלבד, ולא יותר מ-2 כוסות ביום – הוא פוגע בספיגת הברזל.', 'Cow’s milk as a drink only from age 1, and no more than 2 cups a day – it reduces iron absorption.')}</li>
      </ul>
    </details>
  </section>`;
}

/* ===================== עזרה ראשונה בחנק ===================== */
let chokeAge = null; // 'infant' (עד שנה) / 'child' (מעל שנה)

function chokingHTML() {
  if (!chokeAge) chokeAge = (ageMonths() ?? 0) >= 12 ? 'child' : 'infant';
  const inf = chokeAge === 'infant';
  const step = (n, icon, title, text) => `<li class="ch-step"><span class="ch-n">${n}</span><div><b>${icon} ${title}</b><p>${text}</p></div></li>`;
  return `${subHead(L('🆘 חנק – עזרה ראשונה', '🆘 Choking – first aid'))}
  <a class="sos-call" href="tel:101"><span>📞</span><span><b>${L('חייגו 101 – מד״א', 'Call emergency services')}</b><small>${L('אם אפשר – מישהו אחר מחייג ושמים על רמקול', 'If possible, someone else calls – put it on speaker')}</small></span></a>
  ${IS_EN ? '<p class="small muted" style="text-align:center;margin-top:-4px">101 in Israel · 911 US · 999/112 UK/EU – use your local number</p>' : ''}

  <h3 class="section-title">${L('השתנקות או חנק?', 'Gagging or choking?')}</h3>
  <div class="ch-compare">
    <div class="ch-col ok"><b>😮‍💨 ${L('השתנקות (רפלקס הקאה)', 'Gagging')}</b><small>${L('נורמלי ובטוח – חלק מהלמידה', 'Normal and safe – part of learning')}</small>
      <ul><li>${L('משתעל/ת, נשמע/ת', 'Coughing, making noise')}</li><li>${L('פנים אדומות, עיניים דומעות', 'Red face, watery eyes')}</li><li>${L('לשון בחוץ, פלט אוכל', 'Tongue out, pushing food out')}</li></ul>
      <p><b>${L('מה עושים:', 'What to do:')}</b> ${L('נשארים רגועים, לא מכניסים אצבע לפה, נותנים להתמודד לבד.', 'Stay calm, don’t put a finger in the mouth, let them work it out.')}</p></div>
    <div class="ch-col bad"><b>🚨 ${L('חנק', 'Choking')}</b><small>${L('מצב חירום – פועלים מיד', 'Emergency – act now')}</small>
      <ul><li>${L('שקט – לא בוכה ולא משתעל/ת', 'Silent – can’t cry or cough')}</li><li>${L('לא נושם/ת או צפצוף חלש', 'Not breathing, or weak wheeze')}</li><li>${L('שפתיים כחולות, מבט מבוהל', 'Blue lips, panicked look')}</li></ul>
      <p><b>${L('מה עושים:', 'What to do:')}</b> ${L('מתחילים מיד בשלבים למטה ⬇️', 'Start the steps below now ⬇️')}</p></div>
  </div>
  <div class="card small">💡 ${L('משתעל/ת חזק? <b>לא מכים בגב</b> – משתעול עוזר להוציא. רק משגיחים מקרוב ומעודדים.', 'Coughing hard? <b>Don’t hit the back</b> – coughing helps clear it. Just watch closely and encourage.')}</div>

  <div class="segment ch-seg"><button type="button" class="${inf ? 'on' : ''}" data-chage="infant">👶 ${L('עד גיל שנה', 'Under 1 year')}</button><button type="button" class="${inf ? '' : 'on'}" data-chage="child">🧒 ${L('מעל גיל שנה', 'Over 1 year')}</button></div>
  <h3 class="section-title">${L('בהכרה, לא נושם/ת ולא משתעל/ת:', 'Conscious, can’t breathe or cough:')}</h3>
  <ol class="ch-steps">
    ${step(1, '📞', L('מזעיקים עזרה', 'Call for help'), L('צועקים לעזרה ומחייגים 101 על רמקול. לא מחכים – מתחילים מיד.', 'Shout for help and call emergency services on speaker. Don’t wait – start right away.'))}
    ${inf
      ? step(2, '✋', L('5 טפיחות גב', '5 back blows'), L('משכיבים את התינוק על הבטן לאורך האמה, ראש נמוך מהחזה, תומכים בלסת (לא בגרון). נותנים 5 מכות חזקות עם עקב כף היד בין השכמות.', 'Lay the baby face-down along your forearm, head lower than the chest, supporting the jaw (not the throat). Give 5 firm blows between the shoulder blades with the heel of your hand.'))
        + step(3, '☝️', L('5 לחיצות חזה', '5 chest thrusts'), L('הופכים את התינוק על הגב על האמה השנייה, ראש נמוך. 2 אצבעות במרכז החזה, מעט מתחת לקו הפטמות. לוחצים 5 פעמים בחוזקה, כ-4 ס״מ לעומק.', 'Turn the baby face-up on your other forearm, head low. Put 2 fingers in the center of the chest, just below the nipple line. Press firmly 5 times, about 4 cm (1.5 in) deep.'))
      : step(2, '✋', L('5 טפיחות גב', '5 back blows'), L('מטים את הילד/ה קדימה ותומכים בחזה ביד אחת. נותנים 5 מכות חזקות עם עקב כף היד בין השכמות.', 'Lean the child forward, supporting the chest with one hand. Give 5 firm blows between the shoulder blades with the heel of your hand.'))
        + step(3, '✊', L('5 לחיצות בטן (היימליך)', '5 abdominal thrusts (Heimlich)'), L('עומדים או כורעים מאחור, אגרוף מעל הטבור ומתחת לצלעות, היד השנייה עוטפת אותו. מושכים בחדות פנימה ולמעלה, 5 פעמים.', 'Stand or kneel behind, fist above the navel and below the ribs, other hand over it. Pull sharply inward and upward, 5 times.'))}
    ${step(4, '🔁', L('חוזרים', 'Repeat'), L(`ממשיכים לסירוגין 5 טפיחות גב + 5 ${inf ? 'לחיצות חזה' : 'לחיצות בטן'} עד שהחפץ יוצא, ${inf ? 'התינוק' : 'הילד/ה'} בוכה/משתעל/ת – או מאבד/ת הכרה.`, `Keep alternating 5 back blows + 5 ${inf ? 'chest' : 'abdominal'} thrusts until the object comes out, they cry or cough – or they become unresponsive.`))}
  </ol>
  <div class="warn-banner small">🚫 ${L('<b>לא מכניסים אצבע ללוע "בעיוורון"</b> – זה עלול לדחוף את החפץ פנימה. מוציאים רק חפץ שרואים בבירור.', '<b>No blind finger sweeps</b> – they can push the object deeper. Only remove an object you can clearly see.')}</div>

  <h3 class="section-title">😶 ${L('איבד/ה הכרה:', 'If they become unresponsive:')}</h3>
  <ol class="ch-steps">
    ${step(1, '🛏️', L('משכיבים על משטח קשה', 'Lay on a firm surface'), L('מוודאים ש-101 על הקו – המוקדן/ית ידריך/תדריך אתכם.', 'Make sure emergency services are on the line – the dispatcher will guide you.'))}
    ${step(2, '💗', L('30 לחיצות חזה', '30 chest compressions'), inf ? L('2 אצבעות במרכז החזה, כ-4 ס״מ לעומק, בקצב 100–120 בדקה.', '2 fingers in the center of the chest, about 4 cm deep, 100–120 per minute.') : L('עקב כף יד אחת במרכז החזה, כ-5 ס״מ לעומק, בקצב 100–120 בדקה.', 'Heel of one hand in the center of the chest, about 5 cm deep, 100–120 per minute.'))}
    ${step(3, '👀', L('מסתכלים בפה', 'Look in the mouth'), L('רואים את החפץ? מוציאים אותו. לא רואים – לא מחפשים באצבע.', 'See the object? Remove it. Can’t see it – don’t search with a finger.'))}
    ${step(4, '🌬️', L('2 הנשמות', '2 rescue breaths'), inf ? L('מטים מעט את הראש לאחור, מכסים בפה את הפה והאף של התינוק ונושפים קלות עד שהחזה עולה.', 'Tilt the head back slightly, cover the baby’s mouth and nose with your mouth and breathe gently until the chest rises.') : L('מטים את הראש לאחור, סוגרים את האף ונושפים לפה עד שהחזה עולה.', 'Tilt the head back, pinch the nose and breathe into the mouth until the chest rises.'))}
    ${step(5, '🔁', L('ממשיכים', 'Continue'), L('30 לחיצות + 2 הנשמות, עד שמגיעה עזרה או שמתחיל/ה לנשום.', '30 compressions + 2 breaths, until help arrives or they start breathing.'))}
  </ol>
  <div class="card small">🩺 ${L('גם אם הכל הסתדר – <b>פונים לרופא/ה</b> אחרי אירוע חנק, במיוחד אם נדרשו לחיצות.', 'Even if it resolved – <b>see a doctor</b> after a choking episode, especially if thrusts were needed.')}</div>

  <details class="guide"><summary><span style="font-size:22px">🛡️</span>${L('איך מונעים חנק', 'Preventing choking')}</summary>
    <ul>
      <li>${L('אוכלים רק בישיבה זקופה, בכיסא, ותמיד בהשגחה – לא בהליכה, במשחק או ברכב.', 'Eat only sitting upright in a chair, always supervised – not walking, playing or in the car.')}</li>
      <li>${L('ענבים, עגבניות שרי ודובדבנים – חותכים לרבעים לאורך.', 'Grapes, cherry tomatoes and cherries – cut into quarters lengthwise.')}</li>
      <li>${L('אגוזים ובוטנים שלמים – לא עד גיל 5. רק טחונים או כממרח דק.', 'Whole nuts and peanuts – not until age 5. Only ground or as a thin spread.')}</li>
      <li>${L('נקניקיות – פרוסות לאורך ולא עיגולים. ירקות קשים – מבשלים עד שנמעכים בין האצבעות.', 'Hot dogs – sliced lengthwise, not in rounds. Hard vegetables – cook until they squish between your fingers.')}</li>
      <li>${L('בלי פופקורן, סוכריות קשות ומסטיקים בגיל הזה.', 'No popcorn, hard candy or gum at this age.')}</li>
      <li>${L('מוצרים מסומנים ב-⚠️ באפליקציה דורשים תשומת לב מיוחדת לצורת ההגשה.', 'Foods marked ⚠️ in the app need extra care in how they’re served.')}</li>
    </ul></details>
  <p class="small muted" style="text-align:center;margin-top:14px">${L('המידע מבוסס על הנחיות מד״א, הצלב האדום ו-AHA, ואינו מחליף קורס עזרה ראשונה לתינוקות – מומלץ מאוד לעשות אחד.', 'Based on Red Cross and AHA guidance. It doesn’t replace an infant first-aid course – taking one is highly recommended.')}</p>`;
}

/* ===================== כרטיס הישג לשיתוף ===================== */
function shareCardOptions() {
  const c = badgeContext();
  const kid = activeKid();
  const intro = activeAllergens().filter((k) => ['introducing', 'maintaining'].includes(allergenInfo(k).status)).length;
  const lastBadge = BADGES.filter((b) => kid?.badges?.[b.id]).sort((a, b) => kid.badges[b.id] - kid.badges[a.id])[0];
  const name = babyName();
  const opts = [{ id: 'foods', e: '🥄', label: L('מאכלים', 'Foods'), head: L(G(`${name} טעמ·ה ${c.foods.size} מאכלים!`), `${name} has tasted ${c.foods.size} foods!`) }];
  if (intro) opts.push({ id: 'allergens', e: '⭐', label: L('אלרגנים', 'Allergens'), head: L(G(`${name} הכיר·ה ${intro} אלרגנים!`), `${name} has met ${intro} allergens!`) });
  if (lastBadge) opts.push({ id: 'badge', e: lastBadge.e, label: L('הישג אחרון', 'Latest badge'), head: L(`🏅 ${G(lastBadge.t)}!`, `🏅 ${lastBadge.t}!`), sub: L(G(lastBadge.d), lastBadge.d) });
  return { opts, c, intro };
}

async function drawShareCard(canvas, opt, info) {
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext('2d');
  try { await Promise.all(['800 64px Rubik', '700 40px Rubik', '500 34px Rubik'].map((f) => document.fonts.load(f))); } catch { /* ממשיכים עם גופן ברירת מחדל */ }
  x.direction = IS_EN ? 'ltr' : 'rtl';
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#ffb199'); g.addColorStop(0.55, '#ff8a65'); g.addColorStop(1, '#b08cff');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // עיגולים דקורטיביים
  x.fillStyle = 'rgba(255,255,255,.12)';
  [[120, 140, 160], [980, 260, 120], [900, 1220, 200], [140, 1180, 90]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); });
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = '700 40px Rubik, sans-serif';
  x.fillText('🥄 Baby Bis', W / 2, 100);

  // אווטאר
  const R = 190, AX = W / 2, AY = 360;
  x.save(); x.shadowColor = 'rgba(0,0,0,.18)'; x.shadowBlur = 30;
  x.fillStyle = state.avatar?.frame || '#fff'; x.beginPath(); x.arc(AX, AY, R + 14, 0, Math.PI * 2); x.fill(); x.restore();
  x.save(); x.beginPath(); x.arc(AX, AY, R, 0, Math.PI * 2); x.clip();
  x.fillStyle = '#fff4ec'; x.fillRect(AX - R, AY - R, R * 2, R * 2);
  if (state.avatar?.img) {
    await new Promise((res) => { const im = new Image(); im.onload = () => { x.drawImage(im, AX - R, AY - R, R * 2, R * 2); res(); }; im.onerror = res; im.src = state.avatar.img; });
  } else {
    x.font = `${R * 1.3}px sans-serif`; x.textBaseline = 'middle'; x.fillText(state.avatar?.emoji || '👶', AX, AY + 10); x.textBaseline = 'alphabetic';
  }
  x.restore();
  if (state.avatar?.sticker) { x.font = '110px sans-serif'; x.fillText(state.avatar.sticker, AX + R * 0.78, AY - R * 0.62); }

  // כותרת
  x.fillStyle = '#fff';
  const fit = (text, size, weight, maxW) => { let s = size; do { x.font = `${weight} ${s}px Rubik, sans-serif`; s -= 2; } while (x.measureText(text).width > maxW && s > 24); };
  fit(opt.head, 76, 800, W - 120);
  x.shadowColor = 'rgba(0,0,0,.15)'; x.shadowBlur = 12;
  x.fillText(opt.head, W / 2, 680);
  x.shadowBlur = 0;
  if (opt.sub) { x.font = '500 38px Rubik, sans-serif'; x.fillText(opt.sub, W / 2, 740); }

  // סטטיסטיקות
  const stats = [[info.c.foods.size, L('מאכלים', 'foods')], [`${info.intro}/${activeAllergens().length}`, L('אלרגנים', 'allergens')], [Object.keys(activeKid()?.badges || {}).length, L('הישגים', 'badges')]];
  const bw = 280, gap = 30, sy = 800, bh = 170;
  stats.forEach(([v, l], i) => {
    const idx = IS_EN ? i : stats.length - 1 - i;
    const bx = W / 2 - (bw * 3 + gap * 2) / 2 + idx * (bw + gap);
    x.fillStyle = 'rgba(255,255,255,.22)';
    x.beginPath(); x.roundRect ? x.roundRect(bx, sy, bw, bh, 34) : x.rect(bx, sy, bw, bh); x.fill();
    x.fillStyle = '#fff'; x.font = '800 70px Rubik, sans-serif'; x.fillText(String(v), bx + bw / 2, sy + 90);
    x.font = '500 34px Rubik, sans-serif'; x.fillText(l, bx + bw / 2, sy + 140);
  });

  // אימוג׳י של מאכלים שנטעמו
  const emojis = [...info.c.foods].map(foodById).filter((f) => f?.emoji && !/^[\u{1F7E0}-\u{1F7EB}\u26AA\u26AB\u{1F534}\u{1F535}]/u.test(f.emoji)).map((f) => f.emoji).filter((e, i, arr) => arr.indexOf(e) === i).slice(-14);
  if (emojis.length) {
    x.font = '64px sans-serif';
    const rowW = Math.min(emojis.length, 7) * 92;
    emojis.forEach((e, i) => { const row = Math.floor(i / 7), col = i % 7; const n = Math.min(emojis.length - row * 7, 7); x.fillText(e, W / 2 - (n * 92) / 2 + 46 + col * 92, 1080 + row * 92); });
    void rowW;
  }
  x.font = '500 30px Rubik, sans-serif'; x.fillStyle = 'rgba(255,255,255,.9)';
  x.fillText(`${ageText(state.baby?.birth)} · ${new Date().toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}`, W / 2, H - 50);
}

function openShareCard(pref) {
  const info = shareCardOptions();
  let opt = info.opts.find((o) => o.id === pref) || info.opts[0];
  openModal(`
    <h2 class="sheet-title">📤 ${L('כרטיס לשיתוף', 'Share card')}</h2>
    <div class="chips sc-opts">${info.opts.map((o) => `<button class="chip ${o.id === opt.id ? 'active' : ''}" data-sc="${o.id}">${o.e} ${o.label}</button>`).join('')}</div>
    <canvas id="scCanvas" class="sc-canvas"></canvas>
    <div class="sheet-foot"><button class="btn" id="scShare">📤 ${L('שיתוף', 'Share')}</button><button class="btn ghost" id="scSave">⬇️ ${L('שמירה', 'Save')}</button></div>`);
  const b = $('#modalBody'), cv = $('#scCanvas', b);
  const draw = () => drawShareCard(cv, opt, info);
  draw();
  $$('[data-sc]', b).forEach((btn) => btn.onclick = () => { opt = info.opts.find((o) => o.id === btn.dataset.sc); $$('[data-sc]', b).forEach((y) => y.classList.toggle('active', y === btn)); draw(); });
  const blob = () => new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.9));
  const fname = `baby-bis-${new Date().toISOString().slice(0, 10)}.jpg`;
  const download = async () => { const bl = await blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = fname; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  $('#scSave', b).onclick = download;
  $('#scShare', b).onclick = async () => {
    const file = new File([await blob()], fname, { type: 'image/jpeg' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: L(`${opt.head} 💛 (Baby Bis)`, `${opt.head} 💛 (Baby Bis)`) });
      else { await download(); toast(L('התמונה נשמרה – אפשר לשלוח אותה בוואטסאפ 📲', 'Image saved – send it on WhatsApp 📲')); }
    } catch (ex) { if (ex?.name !== 'AbortError') download(); }
  };
}
