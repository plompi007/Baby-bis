'use strict';
// מסך התחברות, שאלון פתיחה, עורך אווטאר והפעלת האפליקציה.

/* ===================== אווטאר בממשק ===================== */
const FRAMES = ['#ff8a65', '#7c6cf2', '#4caf7a', '#f2b134', '#ff7eb3', '#4fc3f7'];
const STICKERS = ['', '👑', '🎀', '⭐', '🌈', '🐣', '🧢'];
const EMOJI_AVATARS = ['👶', '🧒', '👧', '🐣', '🐻', '🐰', '🦁', '🐼', '🦊', '🐸', '🐨', '🦄'];

function avatarHTML(size, av = state.avatar) {
  const a = av || { emoji: '👶', frame: FRAMES[0] };
  const inner = a.img ? `<img src="${a.img}" alt="">` : `<span class="av-emoji" style="font-size:${Math.round(size * .55)}px">${a.emoji || '👶'}</span>`;
  return `<span class="avatar" style="--size:${size}px;--frame:${a.frame || FRAMES[0]}">${inner}${a.sticker ? `<span class="av-sticker">${a.sticker}</span>` : ''}</span>`;
}

/* ===================== התחברות ===================== */
let authMode = 'register';

function authHTML() {
  const floaters = ['🥑', '🍌', '🥕', '🍓', '🥦', '🍠', '🥚', '🫐', '🥜', '🍐'];
  return `
  <div class="auth">
    <div class="floaters" aria-hidden="true">${floaters.map((e, i) => `<span style="--i:${i}">${e}</span>`).join('')}</div>
    <div class="auth-logo">🥄</div>
    <h2 dir="ltr">Baby Bis</h2>
    <p class="muted">${L('כל טעימה נספרת 💛', 'Every taste counts 💛')}</p>
    <button type="button" class="lang-pill" id="auLang">🌐 ${L('English', 'עברית')}</button>
    ${installEnv() === 'inapp' ? `<div class="warn-banner small inapp-warn">⚠️ ${L('פתחתם מתוך וואטסאפ או אינסטגרם – כאן ההתחברות עם Google לא עובדת ואי אפשר להתקין. לחצו על <b>⋮</b> / <b>…</b> או על הכתובת למטה ← <b>פתיחה בדפדפן</b> (ספארי / כרום).', 'You opened this inside WhatsApp or Instagram – Google sign-in won’t work here and the app can’t be installed. Tap <b>⋮</b> / <b>…</b> or the address at the bottom → <b>Open in browser</b> (Safari / Chrome).')}<button type="button" class="link-btn" id="auCopyLink">🔗 ${L('העתקת הקישור', 'Copy the link')}</button></div>` : ''}
    <div class="card auth-card">
      <div class="segment">
        <button type="button" class="${authMode === 'register' ? 'on' : ''}" data-mode="register">${L('הרשמה', 'Sign up')}</button>
        <button type="button" class="${authMode === 'login' ? 'on' : ''}" data-mode="login">${L('כניסה', 'Sign in')}</button>
      </div>
      <form class="form" id="authForm" novalidate>
        <label for="auEmail">${L('מייל', 'Email')}</label>
        <input type="email" id="auEmail" autocomplete="email" required dir="ltr" placeholder="name@example.com">
        <label for="auPass">${L('סיסמה', 'Password')}</label>
        <div class="pass-wrap">
          <input type="password" id="auPass" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" required minlength="6" dir="ltr" placeholder="${authMode === 'register' ? L('לפחות 6 תווים', 'At least 6 characters') : ''}">
          <button type="button" class="pass-eye" id="auEye" aria-label="${L('הצגת סיסמה', 'Show password')}">👁️</button>
        </div>
        <div class="auth-err" id="auErr" role="alert"></div>
        <button class="btn block" type="submit" id="auSubmit">${authMode === 'register' ? L('יצירת חשבון ✨', 'Create account ✨') : L('כניסה', 'Sign in')}</button>
        ${cloudOn() && authMode === 'login' ? `<button type="button" class="link-btn forgot" id="auForgot">${L('שכחתי סיסמה', 'Forgot password')}</button>` : ''}
      </form>
      ${cloudOn() ? `<div class="or"><span>${L('או', 'or')}</span></div>
      <button type="button" class="btn google block" id="auGoogle"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ${L('המשך עם Google', 'Continue with Google')}</button>` : ''}
    </div>
    <p class="small muted">${cloudOn() ? L('☁️ הנתונים מסונכרנים בענן, ואפשר לשתף אותם עם בן/בת הזוג.', '☁️ Data is synced to the cloud and can be shared with your partner.') : L('🔒 החשבון והנתונים נשמרים במכשיר הזה בלבד, והסיסמה נשמרת מוצפנת.', '🔒 The account and data are stored on this device only, and the password is stored encrypted.')}</p>
  </div>`;
}

function bindAuth() {
  $$('[data-mode]').forEach((b) => b.onclick = () => { authMode = b.dataset.mode; render(); });
  $('#auLang').onclick = () => setLang(IS_EN ? 'he' : 'en');
  $('#auEye').onclick = () => { const p = $('#auPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#auSubmit'), err = $('#auErr');
    err.textContent = '';
    btn.disabled = true;
    try {
      if (cloudOn()) {
        await (authMode === 'register' ? Cloud.register : Cloud.login)($('#auEmail').value, $('#auPass').value);
        return; // המשך הזרימה מגיע מ-onAuthStateChanged
      }
      const fn = authMode === 'register' ? Auth.register : Auth.login;
      const id = await fn($('#auEmail').value, $('#auPass').value);
      load(id);
      wizard = null;
      render();
      if (state.onboarded) { celebrate('👋', `${L('ברוכים השבים', 'Welcome back')}${state.parent?.name ? ', ' + state.parent.name : ''}!`); maybeNotify(); }
    } catch (ex) {
      err.textContent = ex.message;
      $('.auth-card').classList.remove('shake-x'); void $('.auth-card').offsetWidth; $('.auth-card').classList.add('shake-x');
    } finally { btn.disabled = false; }
  });
  $('#auCopyLink')?.addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try { await navigator.clipboard.writeText(url); toast(L('הקישור הועתק – הדביקו בספארי או בכרום 📋', 'Link copied – paste it in Safari or Chrome 📋')); } catch { prompt(L('העתיקו את הקישור:', 'Copy the link:'), url); }
  });
  $('#auGoogle')?.addEventListener('click', async () => {
    if (installEnv() === 'inapp') { $('#auErr').textContent = L('Google לא מאפשרת להתחבר מתוך וואטסאפ / אינסטגרם. פתחו את הקישור בספארי או בכרום – או הירשמו כאן עם מייל וסיסמה.', 'Google doesn’t allow sign-in inside WhatsApp / Instagram. Open the link in Safari or Chrome – or sign up here with email and password.'); return; }
    try { await Cloud.google(); } catch (ex) { $('#auErr').textContent = ex.message; }
  });
  $('#auForgot')?.addEventListener('click', async () => {
    const email = $('#auEmail').value.trim();
    if (!email) { $('#auErr').textContent = L('הקלידו את המייל שלכם ואז לחצו שוב על "שכחתי סיסמה"', 'Type your email, then tap "Forgot password" again'); return; }
    try { await Cloud.resetPassword(email); toast(L('שלחנו מייל לאיפוס הסיסמה 📧', 'We sent you a password reset email 📧')); } catch (ex) { $('#auErr').textContent = ex.message; }
  });
}

/* ===================== ענן: טעינה ובחירת משפחה ===================== */
let cloudPhase = 'local'; // local / init / signedOut / loading / needsFamily / ready / error
const cloudOn = () => cloudPhase !== 'local';

function loaderHTML(msg) {
  return `<div class="auth"><div class="auth-logo">🥄</div><h2 dir="ltr">Baby Bis</h2>
    <p class="muted">${msg ? esc(msg) : L('רגע, מכינים הכל... ✨', 'One moment, getting everything ready... ✨')}</p>${msg ? '' : '<div class="dots-loader"><i></i><i></i><i></i></div>'}</div>`;
}

// נתונים שנשמרו במכשיר הזה במצב מקומי, להעברה לענן
function localDataOnDevice() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('bis-rishon-data:') || k === 'bis-rishon-v1');
  const sess = localStorage.getItem('bis-rishon-session');
  keys.sort((a, b) => (b.endsWith(sess) ? 1 : 0) - (a.endsWith(sess) ? 1 : 0));
  for (const k of keys) {
    try { const d = JSON.parse(localStorage.getItem(k)); if (d?.baby?.name) return d; } catch { /* דילוג */ }
  }
  return null;
}

function familyChoiceHTML() {
  const local = localDataOnDevice();
  return `
  <div class="auth">
    <div class="auth-logo">💛</div>
    <h2>${L('כמעט סיימנו!', 'Almost there!')}</h2>
    <p class="muted">${L('איך מתחילים?', 'How would you like to start?')}</p>
    <div class="fam-choices">
      ${local ? `<button class="fam-choice" data-fam="move"><span>📲</span><b>${L(`להעביר את ${esc(local.baby.name)} לענן`, `Move ${esc(local.baby.name)} to the cloud`)}</b><small>${L('כל הטעימות שכבר רשמת במכשיר הזה יעברו לחשבון', 'All tastes you already logged on this device move to the account')}</small></button>` : ''}
      <button class="fam-choice" data-fam="new"><span>✨</span><b>${L('התחלה חדשה', 'Fresh start')}</b><small>${L('שאלון קצר ומתחילים לעקוב', 'A short questionnaire and you’re tracking')}</small></button>
      <button class="fam-choice" data-fam="join"><span>👨‍👩‍👧</span><b>${L('הצטרפות למשפחה קיימת', 'Join an existing family')}</b><small>${L('בן/בת הזוג כבר רשומים? הקלידו את קוד המשפחה', 'Partner already signed up? Type the family code')}</small></button>
      <form class="card form join-form" id="joinForm" hidden>
        <label for="joinCode">${L('קוד המשפחה', 'Family code')}</label>
        <input type="text" id="joinCode" dir="ltr" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="ABC234" required>
        <div class="auth-err" id="joinErr" role="alert"></div>
        <button class="btn block" type="submit">${L('הצטרפות', 'Join')}</button>
      </form>
    </div>
    <button class="link-btn" id="famLogout" style="margin-top:16px">${L('התנתקות', 'Sign out')}</button>
  </div>`;
}

function bindFamilyChoice() {
  const busy = (on) => $$('.fam-choice').forEach((b) => { b.disabled = on; });
  $$('.fam-choice').forEach((b) => b.onclick = async () => {
    const kind = b.dataset.fam;
    if (kind === 'join') { $('#joinForm').hidden = false; $('#joinCode').focus(); return; }
    busy(true);
    try {
      if (kind === 'new') await Cloud.createFamily();
      if (kind === 'move') {
        const local = localDataOnDevice();
        await Cloud.createFamily(Object.assign({}, local, { onboarded: !!local.onboarded }));
        toast(L('הנתונים הועברו לענן ☁️', 'Your data moved to the cloud ☁️'));
      }
    } catch (ex) { toast(ex.message || L('משהו השתבש, נסו שוב', 'Something went wrong, try again')); busy(false); }
  });
  $('#joinForm').onsubmit = async (e) => {
    e.preventDefault();
    $('#joinErr').textContent = '';
    try { await Cloud.joinFamily($('#joinCode').value); toast(L('הצטרפת למשפחה! 👨‍👩‍👧', 'You joined the family! 👨‍👩‍👧')); }
    catch (ex) { $('#joinErr').textContent = ex.message; }
  };
  $('#famLogout').onclick = () => Cloud.logout();
}

/* ===================== שאלון פתיחה ===================== */
const EXPOSURE_OPTS = [
  { id: 'none', t: L('עוד לא', 'Not yet') },
  { id: 'tried', t: L('טעם·ה', 'Tried') },
  { id: 'regular', t: L('אוכל·ת קבוע', 'Eats regularly') },
  { id: 'reaction', t: L('הייתה תגובה', 'Had a reaction') },
];

let wizard = null;

function startWizard() {
  const hasHistory = kidLogs().length > 0; // משתמשים ותיקים – לא שואלים שוב על חשיפות
  let steps = ['parent', 'baby', 'avatar'];
  if (!hasHistory) steps.push('allergens', 'foods');
  steps.push('done');
  // הצטרפות למשפחה קיימת: רק השם שלך
  if (state.onboarded) steps = ['parent', 'done'];
  wizard = {
    steps, i: 0,
    parent: state.parent?.name || '',
    babyName: state.baby?.name || '',
    gender: state.baby?.gender || '',
    birth: state.baby?.birth || '',
    avatar: state.avatar ? { ...state.avatar } : null,
    exposures: {},
    foods: new Set(),
    dir: 1,
  };
}

// הוספת ילד/ה: שאלון בלי שם ההורה
function startAddKid() {
  const prev = activeKidId();
  const k = newKid(state);
  setActiveKid(k.id);
  wizard = null;
  startWizard();
  wizard.steps = ['baby', 'avatar', 'allergens', 'foods', 'done'];
  wizard.addKid = { prev, id: k.id };
  render();
}
function cancelAddKid() {
  const { prev, id } = wizard.addKid;
  state.kids = state.kids.filter((x) => x.id !== id);
  if (prev) setActiveKid(prev);
  wizard = null;
  render();
}

function renderWizard() {
  if (!wizard) startWizard();
  const w = wizard;
  const step = w.steps[w.i];
  const dots = w.steps.map((_, n) => `<i class="${n < w.i ? 'done' : n === w.i ? 'on' : ''}"></i>`).join('');
  const body = { parent: stepParent, baby: stepBaby, avatar: stepAvatar, allergens: stepAllergens, foods: stepFoods, done: stepDone }[step]();
  $('#view').innerHTML = `
  <div class="wizard">
    <div class="wz-top">
      ${w.i > 0 && step !== 'done' ? `<button class="wz-back" id="wzBack" aria-label="${L('חזרה', 'Back')}">${BACK}</button>` : w.addKid && step !== 'done' ? `<button class="wz-back" id="wzCancel" aria-label="${L('ביטול', 'Cancel')}">✕</button>` : '<span></span>'}
      <div class="wz-dots">${dots}</div>
      <span></span>
    </div>
    <div class="wz-step ${w.dir > 0 ? 'in-next' : 'in-prev'}">${body}</div>
  </div>`;
  $('#wzBack')?.addEventListener('click', () => { w.i--; w.dir = -1; renderWizard(); });
  $('#wzCancel')?.addEventListener('click', cancelAddKid);
  ({ parent: bindParent, baby: bindBaby, avatar: bindAvatarStep, allergens: bindAllergens, foods: bindFoods, done: bindDone })[step]();
  window.scrollTo({ top: 0 });
}
function nextStep() { wizard.i++; wizard.dir = 1; renderWizard(); }

function stepParent() {
  return `
    <span class="wz-emoji anim-jelly">💛</span>
    <h2>${L('נעים להכיר!', 'Nice to meet you!')}</h2>
    <p class="muted">${L('כמה שאלות קצרות, ונתאים את האפליקציה בדיוק בשבילכם.', 'A few quick questions so we can tailor the app just for you.')}</p>
    <form class="form card" id="wzForm">
      <label for="wzParent">${L('איך קוראים לך? (שם האמא)', 'What’s your name?')}</label>
      <input type="text" id="wzParent" required maxlength="30" value="${esc(wizard.parent)}" placeholder="${L('למשל: מיכל', 'e.g. Emma')}" autocomplete="given-name">
      <div style="height:16px"></div>
      <button class="btn block" type="submit">${L('המשך', 'Continue')} ${FWD}</button>
    </form>`;
}
function bindParent() {
  $('#wzParent').focus();
  $('#wzForm').onsubmit = (e) => { e.preventDefault(); wizard.parent = $('#wzParent').value.trim(); nextStep(); };
}

function stepBaby() {
  return `
    <span class="wz-emoji anim-bounce">👶</span>
    <h2>${L('בואי נכיר את הקטנטנים', 'Let’s meet your little one')}</h2>
    <form class="form card" id="wzForm">
      <label for="wzBaby">${L('איך קוראים לתינוק?', 'Baby’s name?')}</label>
      <input type="text" id="wzBaby" required maxlength="30" value="${esc(wizard.babyName)}" placeholder="${L('למשל: נועם', 'e.g. Noah')}">
      <label>${L('בן או בת?', 'Boy or girl?')} <span class="muted small">(${L('כדי שנדבר נכון', 'optional')})</span></label>
      <div class="choice-row gender" data-group="gender">
        <button type="button" class="choice ${wizard.gender === 'm' ? 'on' : ''}" data-val="m"><span class="ce">💙</span>${L('בן', 'Boy')}</button>
        <button type="button" class="choice ${wizard.gender === 'f' ? 'on' : ''}" data-val="f"><span class="ce">💗</span>${L('בת', 'Girl')}</button>
      </div>
      <label for="wzBirth">${L('תאריך לידה', 'Date of birth')}</label>
      <input type="date" id="wzBirth" required max="${new Date().toISOString().slice(0, 10)}" value="${esc(wizard.birth)}">
      <div class="wz-age" id="wzAge"></div>
      <div style="height:12px"></div>
      <button class="btn block" type="submit">${L('המשך', 'Continue')} ${FWD}</button>
    </form>`;
}
function bindBaby() {
  const upd = () => {
    const b = $('#wzBirth').value;
    $('#wzAge').innerHTML = b && ageText(b) ? `🎂 ${L('גיל', 'Age')}: <b>${ageText(b)}</b>` : '';
  };
  $('#wzBirth').oninput = upd; upd();
  $('[data-group="gender"]').onclick = (e) => {
    const c = e.target.closest('.choice'); if (!c) return;
    wizard.gender = c.dataset.val;
    state.baby = Object.assign(state.baby || {}, { gender: wizard.gender });
    $$('[data-group="gender"] .choice').forEach((x) => x.classList.toggle('on', x === c));
  };
  if (!wizard.babyName) $('#wzBaby').focus();
  $('#wzForm').onsubmit = (e) => {
    e.preventDefault();
    wizard.babyName = $('#wzBaby').value.trim();
    wizard.birth = $('#wzBirth').value;
    nextStep();
  };
}

function stepAvatar() {
  return `
    <h2>${L(`האווטאר של ${esc(wizard.babyName)}`, `${esc(wizard.babyName)}’s avatar`)} ✨</h2>
    <p class="muted">${L(`העלו תמונה של ${esc(wizard.babyName)}, או בחרו דמות חמודה.`, `Upload a photo of ${esc(wizard.babyName)}, or pick a cute character.`)}</p>
    <div id="avEditor"></div>
    <button class="btn block" id="wzNext" style="margin-top:14px">${L('המשך', 'Continue')} ${FWD}</button>
    <button class="btn ghost block" id="wzSkip" style="margin-top:8px">${L('אולי אחר כך', 'Maybe later')}</button>`;
}
function bindAvatarStep() {
  const ed = mountAvatarEditor($('#avEditor'), wizard.avatar, (av) => { wizard.avatar = av; });
  $('#wzNext').onclick = () => { wizard.avatar = ed.value(); nextStep(); };
  $('#wzSkip').onclick = () => { wizard.avatar = wizard.avatar || { emoji: '👶', frame: FRAMES[0] }; nextStep(); };
}

function stepAllergens() {
  const age = wizard.birth ? (Date.now() - new Date(wizard.birth)) / (30.44 * DAY) : 6;
  return `
    <span class="wz-emoji anim-pulse">⭐</span>
    <h2>${L(G(`למה ${esc(wizard.babyName)} כבר נחשף·ה?`), `What has ${esc(wizard.babyName)} been exposed to?`)}</h2>
    <p class="muted">${L('כך לא תצטרכו להזין הכל מההתחלה. אפשר לשנות בכל רגע.', 'So you won’t have to enter everything from scratch. You can change it anytime.')}</p>
    ${age < 4 ? `<div class="card small">👶 ${L(G(`${esc(wizard.babyName)} עוד צעיר·ה למוצקים, אפשר פשוט לדלג.`), `${esc(wizard.babyName)} is still young for solids – feel free to skip.`)}</div>` : ''}
    <div class="exp-list">
      ${activeAllergens().map((k) => [k, ALLERGENS[k]]).map(([k, a]) => `
        ${nutHeader(activeAllergens(), k, `<h3 class="section-title" style="margin:8px 0 0">🌰 ${L('אגוזים', 'Nuts')} <span class="small muted" style="font-weight:400">– ${L('כל אחד בנפרד', 'each one separately')}</span></h3>`)}
        <div class="exp-row card">
          <div class="exp-name"><span class="anim-float" style="display:inline-block">${allergenIcon(k)}</span> ${a.name}
            ${k === 'milk' ? `<small class="muted">(${L('גם תמ״ל רגיל נחשב', 'regular formula counts too')})</small>` : ''}${k === 'peanut' ? `<small class="muted">(${L('כולל במבה', 'incl. Bamba / peanut puffs')})</small>` : ''}</div>
          <div class="exp-opts" data-al="${k}">
            ${EXPOSURE_OPTS.map((o) => `<button type="button" class="exp-opt ${(wizard.exposures[k] || 'none') === o.id ? 'on' : ''} o-${o.id}" data-v="${o.id}">${G(o.t)}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <button class="btn block" id="wzNext" style="margin-top:14px">${L('המשך', 'Continue')} ${FWD}</button>
    <button class="btn ghost block" id="wzSkip" style="margin-top:8px">${L('עוד לא התחלנו מוצקים ⏭️', 'We haven’t started solids yet ⏭️')}</button>`;
}
function bindAllergens() {
  $$('.exp-opts').forEach((row) => row.addEventListener('click', (e) => {
    const b = e.target.closest('.exp-opt'); if (!b) return;
    wizard.exposures[row.dataset.al] = b.dataset.v;
    $$('.exp-opt', row).forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('#wzNext').onclick = nextStep;
  $('#wzSkip').onclick = () => { wizard.exposures = {}; wizard.foods.clear(); wizard.i = wizard.steps.indexOf('done'); wizard.dir = 1; renderWizard(); };
}

function stepFoods() {
  const cats = CATEGORIES.filter((c) => !['allergen', 'custom'].includes(c.id));
  return `
    <span class="wz-emoji anim-wiggle">🥕</span>
    <h2>${L(G(`ומה ${esc(wizard.babyName)} כבר טעמ·ה?`), `And what has ${esc(wizard.babyName)} already tasted?`)}</h2>
    <p class="muted">${L('סמנו את מה שכבר טעם. לא חייבים לזכור הכל 🙂', 'Tick what they’ve tasted. No need to remember everything 🙂')}</p>
    <div class="wz-count" id="wzCount"></div>
    ${cats.map((c) => {
      const foods = FOODS.filter((f) => f.cat === c.id && !f.allergen);
      if (!foods.length) return '';
      return `<div class="wz-cat"><div class="wz-cat-head"><b>${c.emoji} ${c.name}</b><button type="button" class="link-btn" data-all="${c.id}">${L('סמנו הכל', 'Select all')}</button></div>
        <div class="pick-grid">${foods.map((f) => `<button type="button" class="pick ${wizard.foods.has(f.id) ? 'on' : ''}" data-f="${f.id}"><span class="anim-${f.anim}">${foodIcon(f)}</span>${esc(f.name)}</button>`).join('')}</div></div>`;
    }).join('')}
    <div class="wz-sticky"><button class="btn block" id="wzNext">${L('סיימתי', 'Done')} ${FWD}</button></div>`;
}
function bindFoods() {
  const count = () => { $('#wzCount').textContent = wizard.foods.size ? L(`✓ ${wizard.foods.size} מוצרים נבחרו`, `✓ ${wizard.foods.size} foods selected`) : ''; };
  count();
  $('#view').querySelectorAll('.pick').forEach((b) => b.onclick = () => {
    const id = b.dataset.f;
    if (wizard.foods.has(id)) wizard.foods.delete(id); else wizard.foods.add(id);
    b.classList.toggle('on', wizard.foods.has(id));
    count();
  });
  $$('[data-all]').forEach((b) => b.onclick = () => {
    const ids = FOODS.filter((f) => f.cat === b.dataset.all && !f.allergen).map((f) => f.id);
    const allOn = ids.every((id) => wizard.foods.has(id));
    ids.forEach((id) => (allOn ? wizard.foods.delete(id) : wizard.foods.add(id)));
    b.closest('.wz-cat').querySelectorAll('.pick').forEach((p) => p.classList.toggle('on', wizard.foods.has(p.dataset.f)));
    count();
  });
  $('#wzNext').onclick = nextStep;
}

function stepDone() {
  const al = Object.values(wizard.exposures).filter((v) => v !== 'none').length;
  return `
    <div class="wz-done">
      <div class="wz-av">${avatarHTML(150, wizard.avatar)}</div>
      <h2>${L('הכל מוכן', 'All set')}, ${esc(wizard.parent)}! 🎉</h2>
      <p class="muted">${al || wizard.foods.size ? L(`רשמנו ${wizard.foods.size} מוצרים ו-${al} אלרגנים שכבר מוכרים ל${esc(wizard.babyName)}.`, `We logged ${wizard.foods.size} foods and ${al} allergens ${esc(wizard.babyName)} already knows.`) : L(`מתחילים את המסע של ${esc(wizard.babyName)} מאפס – איזה כיף!`, `Starting ${esc(wizard.babyName)}’s journey from scratch – how exciting!`)}</p>
      <button class="btn block" id="wzFinish">${L('יאללה, נכנסים! 🥄', 'Let’s go! 🥄')}</button>
      <p class="small muted" style="margin-top:14px">${L('⚕️ האפליקציה היא כלי מעקב ומידע כללי, ואינה תחליף לייעוץ רפואי.', '⚕️ This app is a tracking tool with general information and is not a substitute for medical advice.')}</p>
    </div>`;
}
function bindDone() {
  $('#wzFinish').onclick = () => {
    const w = wizard;
    state.parent = { name: w.parent };
    state.baby = { name: w.babyName, birth: w.birth, gender: w.gender || '' };
    state.avatar = w.avatar || { emoji: '👶', frame: FRAMES[0] };
    seedExposures(w.exposures, [...w.foods]);
    checkBadges(true);
    state.onboarded = true;
    save();
    wizard = null;
    tab = 'home';
    render();
    celebrate('🎉', w.addKid ? L(`${state.baby.name} הצטרף/ה למשפחה!`, `${state.baby.name} joined the family!`) : L(`ברוכים הבאים, ${state.baby.name}!`, `Welcome, ${state.baby.name}!`));
  };
}

// הופך את תשובות השאלון לרישומי טעימה, כדי שהסטטוסים והתזכורות יתחילו נכון
function seedExposures(exposures, foodIds) {
  const now = Date.now();
  const add = (foodId, daysAgo, symptoms = []) => state.logs.push({
    id: uid(), kid: activeKidId(), foodId, ts: now - daysAgo * DAY, liked: undefined, amount: undefined, symptoms, notes: 'מהשאלון הראשוני', seed: true,
  });
  for (const [k, v] of Object.entries(exposures)) {
    const f = ALLERGENS[k].rep;
    if (v === 'tried') add(f, 1);
    if (v === 'regular') [1, 3, 5].forEach((d) => add(f, d));
    if (v === 'reaction') add(f, 1, ['past']);
  }
  foodIds.forEach((id) => add(id, 1));
}

/* ===================== עורך אווטאר ===================== */
/* ---------- אווטאר מצויר עם Gemini (חינם, דרך החשבון של ההורה) ---------- */
const AI_STYLES = [
  { id: '3d', e: '🎬', he: 'תלת־ממד', en: '3D animation', d: L('כמו בסרטי אנימציה', 'Like an animated movie'),
    p: 'a 3D animated movie character: soft rounded features, big expressive eyes, smooth stylized skin, warm cinematic lighting, high-quality 3D render' },
  { id: 'water', e: '🎨', he: 'צבעי מים', en: 'Watercolor', d: L('איור של ספר ילדים', 'Storybook illustration'),
    p: "a gentle watercolor children's-book illustration: soft pastel washes, delicate ink outlines, paper texture" },
  { id: 'anime', e: '🌸', he: 'אנימה', en: 'Anime', d: L('מצויר ביד, חלומי', 'Hand-drawn, dreamy'),
    p: 'a hand-drawn Japanese animation character: clean line art, soft cel shading, warm dreamy colors, gentle painted background' },
  { id: 'felt', e: '🧸', he: 'בובת לבד', en: 'Felt doll', d: L('רכה וחמודה', 'Soft and cuddly'),
    p: 'a handmade needle-felted wool doll: fuzzy felt texture, tiny stitched details, soft studio lighting, photographed like a real toy' },
  { id: 'sticker', e: '⭐', he: 'מדבקה', en: 'Sticker', d: L('קריקטורה שטוחה ועליזה', 'Flat, cheerful cartoon'),
    p: 'a cute flat cartoon sticker: bold clean outlines, simple flat colors, thick white sticker border' },
];
const aiPrompt = (st) => `Transform the baby in this photo into ${st.p}.
Keep the baby clearly recognizable: same face shape, eye color, skin tone, hair color and hairstyle, and expression.
Head and shoulders, centered, facing the camera, cheerful and sweet.
Square 1:1 image, simple soft pastel background, no text, no other people.`;
const GEMINI_URL = 'https://gemini.google.com/app';

function aiAvatarHTML() {
  return `
  <details class="ai-av">
    <summary><span>✨</span><b>${L('אווטאר מצויר עם Gemini', 'Illustrated avatar with Gemini')}</b><em>${L('חינם', 'Free')}</em></summary>
    <p class="small muted">${L('הופכים תמונה של הילד/ה לדמות מצוירת בעזרת Gemini של Google, בחינם עם חשבון Google רגיל. לוקח כדקה.', 'Turn a photo of your child into an illustrated character with Google Gemini – free with a regular Google account. Takes about a minute.')}</p>
    <ol class="ai-steps">
      <li><b>${L('בחרו סגנון', 'Pick a style')}</b> <span class="small muted">${L('(דוגמאות אמיתיות שנוצרו ב-Gemini)', '(real examples made with Gemini)')}</span>
        <div class="ai-styles">${AI_STYLES.map((st, i) => `<button type="button" class="ai-style ${i === 0 ? 'on' : ''}" data-aistyle="${st.id}"><img src="icons/styles/${st.id}.jpg" alt="" loading="lazy" width="200" height="200"><b>${st.e} ${L(st.he, st.en)}</b><small>${st.d}</small></button>`).join('')}</div>
      </li>
      <li><b>${L('שולחים ל-Gemini', 'Send to Gemini')}</b>
        <div class="ai-share" id="aiShareBox" hidden>
          <label class="btn block ai-go" id="aiPickBtn">📷 ${L('בחירת תמונה של הילד/ה', 'Choose a photo of your child')}<input type="file" id="aiPick" accept="image/*" hidden></label>
          <div class="ai-picked" id="aiPicked" hidden><img id="aiPickImg" alt=""><button type="button" class="btn block ai-go" id="aiShare">📤 ${L('שיתוף ל-Gemini', 'Share to Gemini')}</button></div>
          <p class="small muted">${L('בתפריט השיתוף בוחרים <b>Gemini</b>. התמונה תצורף לבד וההוראה כבר מועתקת – נשאר רק להדביק ולשלוח.', 'In the share menu choose <b>Gemini</b>. The photo is attached automatically and the instruction is already copied – just paste and send.')}</p>
          <div class="or"><span>${L('או ידנית', 'or manually')}</span></div>
        </div>
        <button type="button" class="btn block ai-go" id="aiGo">📋 ${L('העתקה ופתיחת Gemini', 'Copy & open Gemini')} ↗</button>
        <details class="ai-prompt"><summary>${L('ההעתקה לא עבדה? הטקסט כאן', 'Copy didn’t work? Here’s the text')}</summary><textarea id="aiPrompt" readonly rows="6" dir="ltr"></textarea></details>
      </li>
      <li><b>${L('ב-Gemini', 'In Gemini')}</b>
        <ul class="ai-sub">
          <li>${L('מתחברים עם חשבון Google (אם צריך)', 'Sign in with your Google account (if needed)')}</li>
          <li>${L('שיתפתם תמונה? היא כבר שם – דלגו לשורה הבאה.', 'Shared a photo? It’s already there – skip to the next line.')}</li>
          <li>${L('לוחצים על <b>＋</b> ליד שורת הכתיבה ← <b>העלאת קובץ / גלריה</b> ← בוחרים תמונה ברורה של הפנים', 'Tap <b>＋</b> next to the text box → <b>Upload / Gallery</b> → choose a clear photo of the face')}</li>
          <li>${L('לוחצים לחיצה ארוכה בשורת הכתיבה ← <b>הדבקה</b> ← שליחה ➤', 'Long-press the text box → <b>Paste</b> → send ➤')}</li>
        </ul>
      </li>
      <li><b>${L('שומרים את התמונה שיצאה', 'Save the result')}</b>
        <ul class="ai-sub">
          <li>${L('בטלפון: לוחצים על התמונה ← כפתור ההורדה ⬇️ (או לחיצה ארוכה ← <b>שמירה בתמונות</b>)', 'On a phone: tap the image → the download button ⬇️ (or long-press → <b>Save to Photos</b>)')}</li>
          <li>${L('במחשב: מעבירים את העכבר על התמונה ← ⬇️ הורדה', 'On a computer: hover over the image → ⬇️ download')}</li>
        </ul>
      </li>
      <li><b>${L('חוזרים לכאן ומעלים אותה', 'Come back here and upload it')}</b>
        <button type="button" class="btn ghost block" id="aiUpload">📷 ${L('בחירת התמונה המצוירת', 'Choose the illustrated image')}</button>
      </li>
    </ol>
    <div class="ai-tips small">
      <p>💡 ${L('לא מספיק דומה? כתבו ל-Gemini: <i dir="ltr">make it look more like the photo</i>', 'Not similar enough? Tell Gemini: <i>make it look more like the photo</i>')}</p>
      <p>💡 ${L('רוצים סגנון אחר? חוזרים לשלב 1 ובוחרים שוב, אפשר באותה שיחה.', 'Want a different style? Go back to step 1 and pick again – the same chat works.')}</p>
      <p>🔒 ${L('התמונה נשלחת ל-Google מהחשבון שלכם בלבד, לא דרכנו. אפשר למחוק את השיחה ב-Gemini אחרי שמורידים.', 'The photo goes to Google from your own account only, not through us. You can delete the chat in Gemini after downloading.')}</p>
    </div>
  </details>`;
}

function bindAiAvatar(root) {
  let style = AI_STYLES[0];
  const ta = $('#aiPrompt', root);
  ta.value = aiPrompt(style);
  $$('[data-aistyle]', root).forEach((b) => b.onclick = () => {
    style = AI_STYLES.find((x) => x.id === b.dataset.aistyle);
    ta.value = aiPrompt(style);
    $$('[data-aistyle]', root).forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#aiGo', root).onclick = () => {
    const text = aiPrompt(style);
    const fallback = () => {
      $('.ai-prompt', root).open = true; ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* ללא תמיכה */ }
      if (!ok) toast(L('העתיקו את הטקסט שמופיע מתחת לכפתור 👇', 'Copy the text below the button 👇'));
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback); else fallback();
    window.open(GEMINI_URL, '_blank', 'noopener');
    toast(L('ההוראה הועתקה 📋 עכשיו ב-Gemini: ＋ ← תמונה ← הדבקה ← שליחה', 'Instruction copied 📋 Now in Gemini: ＋ → photo → paste → send'));
  };
  // שיתוף ישיר (בעיקר באנדרואיד): התמונה מצורפת ל-Gemini דרך תפריט השיתוף של הטלפון
  let canShareFiles = false;
  try { canShareFiles = !!navigator.canShare?.({ files: [new File([''], 'a.jpg', { type: 'image/jpeg' })] }); } catch { /* ללא תמיכה */ }
  if (canShareFiles) {
    $('#aiShareBox', root).hidden = false;
    $('#aiGo', root).classList.add('ghost');
    $('#aiGo', root).classList.remove('ai-go');
  }
  let picked = null;
  $('#aiPick', root).onchange = (e) => {
    picked = e.target.files[0] || null;
    if (!picked) return;
    const img = $('#aiPickImg', root);
    if (img.src) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(picked);
    $('#aiPicked', root).hidden = false;
    $('#aiPickBtn', root).firstChild.textContent = L('📷 החלפת תמונה', '📷 Change photo');
    $('#aiPickBtn', root).classList.replace('ai-go', 'ghost');
  };
  $('#aiShare', root).onclick = async () => {
    if (!picked) return;
    const text = aiPrompt(style);
    try { await navigator.clipboard?.writeText(text); } catch { /* ממשיכים בלי */ }
    try {
      await navigator.share({ files: [picked], text });
      toast(L('ב-Gemini: לחיצה ארוכה ← הדבקה ← שליחה ✨', 'In Gemini: long-press → paste → send ✨'));
    } catch (ex) {
      if (ex?.name === 'AbortError') return;
      toast(L('השיתוף לא הצליח – פותחים את Gemini בדרך הרגילה', 'Sharing didn’t work – opening Gemini the regular way'));
      $('#aiGo', root).click();
    }
  };
  $('#aiUpload', root).onclick = () => { $('#avFile', root).click(); root.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };
}

function mountAvatarEditor(root, initial, onChange) {
  const ed = {
    img: null, zoom: 1, ox: 0, oy: 0,
    frame: initial?.frame || FRAMES[0], sticker: initial?.sticker || '',
    emoji: initial?.emoji || '👶', dataUrl: initial?.img || null,
  };
  root.innerHTML = `
    <div class="av-editor card">
      <div class="av-stage" style="--frame:${ed.frame}">
        <canvas id="avCanvas" width="256" height="256" ${ed.dataUrl ? '' : 'hidden'}></canvas>
        <span class="av-placeholder" ${ed.dataUrl ? 'hidden' : ''}>${ed.emoji}</span>
        <span class="av-sticker big" id="avSticker">${ed.sticker}</span>
        <div class="av-processing" id="avBusy" hidden>✨</div>
      </div>
      <label class="btn accent upload-btn">📷 ${ed.dataUrl ? L('החלפת תמונה', 'Change photo') : L('העלאת תמונה', 'Upload photo')}<input type="file" id="avFile" accept="image/*" hidden></label>
      ${ed.dataUrl ? `<button type="button" class="link-btn" id="avRemove" style="display:block;margin:8px auto 0">🗑️ ${L('הסרת התמונה', 'Remove photo')}</button>` : ''}
      <div id="avPhotoCtl" hidden>
        <div class="small muted" style="text-align:center;margin:8px 0">${L('גררו את התמונה כדי למרכז את הפנים', 'Drag the photo to center the face')}</div>
        <label class="zoom-row">🔍<input type="range" id="avZoom" min="1" max="3" step="0.05" value="1"></label>
      </div>
      <div id="avEmojiCtl" ${ed.dataUrl ? 'hidden' : ''}>
        <div class="small muted" style="margin:10px 0 6px">${L('או בחרו דמות:', 'Or pick a character:')}</div>
        <div class="emoji-pick">${EMOJI_AVATARS.map((e) => `<button type="button" class="${e === ed.emoji ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
      </div>
      <div class="small muted" style="margin:12px 0 6px">${L('מסגרת וקישוט:', 'Frame & sticker:')}</div>
      <div class="frame-pick">${FRAMES.map((c) => `<button type="button" class="${c === ed.frame ? 'on' : ''}" data-frame="${c}" style="background:${c}" aria-label="${L('צבע מסגרת', 'Frame color')}"></button>`).join('')}</div>
      <div class="sticker-pick">${STICKERS.map((s) => `<button type="button" class="${s === ed.sticker ? 'on' : ''}" data-sticker="${s}">${s || '✕'}</button>`).join('')}</div>
      ${aiAvatarHTML()}
    </div>`;

  const canvas = $('#avCanvas', root), stage = $('.av-stage', root);
  bindAiAvatar(root);
  let pending = false;

  const emit = () => onChange?.(value());
  function draw() {
    if (!ed.img || pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const r = Avatar.render(canvas, ed.img, ed);
      ed.ox = r.ox; ed.oy = r.oy;
      ed.dataUrl = Avatar.toDataURL(canvas);
      emit();
    });
  }
  // תמונה קיימת – מציגים אותה כמו שהיא
  if (ed.dataUrl) {
    const im = new Image();
    im.onload = () => canvas.getContext('2d').drawImage(im, 0, 0, 256, 256);
    im.src = ed.dataUrl;
  }

  $('#avFile', root).onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $('#avBusy', root).hidden = false;
    try {
      ed.img = await Avatar.loadImage(file);
      ed.zoom = 1; ed.ox = 0; ed.oy = 0;
      $('#avZoom', root).value = 1;
      canvas.hidden = false;
      $('.av-placeholder', root).hidden = true;
      $('#avPhotoCtl', root).hidden = false;
      $('#avEmojiCtl', root).hidden = true;
      $('.upload-btn', root).firstChild.textContent = L('📷 החלפת תמונה', '📷 Change photo');
      draw();
      stage.classList.remove('reveal'); void stage.offsetWidth; stage.classList.add('reveal');
    } catch (ex) { toast(ex.message); }
    $('#avBusy', root).hidden = true;
  };
  $('#avRemove', root)?.addEventListener('click', (e) => {
    ed.dataUrl = null; ed.img = null;
    canvas.hidden = true;
    $('.av-placeholder', root).hidden = false;
    $('#avPhotoCtl', root).hidden = true;
    $('#avEmojiCtl', root).hidden = false;
    e.target.remove();
    emit();
  });
  $('#avZoom', root).oninput = (e) => { ed.zoom = +e.target.value; draw(); };
  // גרירה למיקום הפנים
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { if (!ed.img) return; drag = { x: e.clientX, y: e.clientY, ox: ed.ox, oy: ed.oy }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 256 / canvas.getBoundingClientRect().width;
    ed.ox = drag.ox + (e.clientX - drag.x) * k;
    ed.oy = drag.oy + (e.clientY - drag.y) * k;
    draw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  $$('[data-emoji]', root).forEach((b) => b.onclick = () => {
    ed.emoji = b.dataset.emoji;
    $('.av-placeholder', root).textContent = ed.emoji;
    $$('[data-emoji]', root).forEach((x) => x.classList.toggle('on', x === b));
    emit();
  });
  $$('[data-frame]', root).forEach((b) => b.onclick = () => {
    ed.frame = b.dataset.frame;
    stage.style.setProperty('--frame', ed.frame);
    $$('[data-frame]', root).forEach((x) => x.classList.toggle('on', x === b));
    emit();
  });
  $$('[data-sticker]', root).forEach((b) => b.onclick = () => {
    ed.sticker = b.dataset.sticker;
    const st = $('#avSticker', root);
    st.textContent = ed.sticker;
    st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop');
    $$('[data-sticker]', root).forEach((x) => x.classList.toggle('on', x === b));
    emit();
  });

  function value() {
    return ed.dataUrl ? { img: ed.dataUrl, frame: ed.frame, sticker: ed.sticker } : { emoji: ed.emoji, frame: ed.frame, sticker: ed.sticker };
  }
  return { value };
}

function openAvatarModal() {
  let current = state.avatar;
  openModal(`
    <h2 style="margin-bottom:10px">✨ ${L(`האווטאר של ${esc(babyName())}`, `${esc(babyName())}’s avatar`)}</h2>
    <div id="avEditor"></div>
    <button class="btn block" id="avSave" style="margin-top:14px">${L('שמירה', 'Save')}</button>
  `, (b) => {
    const ed = mountAvatarEditor($('#avEditor', b), state.avatar, (v) => { current = v; });
    $('#avSave', b).onclick = () => {
      state.avatar = ed.value() || current;
      save(); closeModal(); render();
      celebrate('✨', L('אווטאר חדש!', 'New avatar!'));
    };
  });
}

/* ===================== הפעלה ===================== */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (Cloud.enabled()) {
  cloudPhase = 'init';
  render();
  Cloud.init({
    onSignedOut: () => { cloudPhase = 'signedOut'; currentUser = null; state = defaultState(); wizard = null; closeModal(); render(); },
    onLoading: () => { cloudPhase = 'loading'; render(); },
    onNeedsFamily: () => { cloudPhase = 'needsFamily'; currentUser = null; render(); },
    onChange: (merged, initial) => {
      if (wizard?.addKid) return; // באמצע הוספת ילד/ה – מחכים לסיום
      const inWizard = !!wizard;
      const same = cloudPhase === 'ready' && JSON.stringify(merged) === JSON.stringify(state);
      cloudPhase = 'ready';
      currentUser = Cloud.uid();
      state = merged;
      if (same && !initial) return; // אין שינוי אמיתי – לא מרעננים את המסך
      // לא מרעננים באמצע השאלון כדי לא למחוק מה שהוקלד – אלא אם השאלון כבר לא נדרש
      if (inWizard && !initial) {
        if (!(merged.onboarded && merged.parent?.name)) return;
        wizard = null;
      }
      render();
      if (initial) maybeNotify();
    },
  }).catch((e) => { console.warn(e); cloudPhase = 'error'; render(); });
} else {
  load(Auth.session());
  render();
  maybeNotify();
}
setInterval(() => { maybeNotify(); if ($('#modal').hidden) updateBadge(); }, 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentUser && state.onboarded && $('#modal').hidden) { maybeNotify(); render(); }
});
