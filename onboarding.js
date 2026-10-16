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
    <h2>ביס ראשון</h2>
    <p class="muted">כל טעימה נספרת 💛</p>
    <div class="card auth-card">
      <div class="segment">
        <button type="button" class="${authMode === 'register' ? 'on' : ''}" data-mode="register">הרשמה</button>
        <button type="button" class="${authMode === 'login' ? 'on' : ''}" data-mode="login">כניסה</button>
      </div>
      <form class="form" id="authForm" novalidate>
        <label for="auEmail">מייל</label>
        <input type="email" id="auEmail" autocomplete="email" required dir="ltr" placeholder="name@example.com">
        <label for="auPass">סיסמה</label>
        <div class="pass-wrap">
          <input type="password" id="auPass" autocomplete="${authMode === 'login' ? 'current-password' : 'new-password'}" required minlength="6" dir="ltr" placeholder="${authMode === 'register' ? 'לפחות 6 תווים' : ''}">
          <button type="button" class="pass-eye" id="auEye" aria-label="הצגת סיסמה">👁️</button>
        </div>
        <div class="auth-err" id="auErr" role="alert"></div>
        <button class="btn block" type="submit" id="auSubmit">${authMode === 'register' ? 'יצירת חשבון ✨' : 'כניסה'}</button>
      </form>
    </div>
    <p class="small muted">🔒 החשבון והנתונים נשמרים במכשיר הזה בלבד, והסיסמה נשמרת מוצפנת.</p>
  </div>`;
}

function bindAuth() {
  $$('[data-mode]').forEach((b) => b.onclick = () => { authMode = b.dataset.mode; render(); });
  $('#auEye').onclick = () => { const p = $('#auPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#auSubmit'), err = $('#auErr');
    err.textContent = '';
    btn.disabled = true;
    try {
      const fn = authMode === 'register' ? Auth.register : Auth.login;
      const id = await fn($('#auEmail').value, $('#auPass').value);
      load(id);
      wizard = null;
      render();
      if (state.onboarded) { celebrate('👋', `ברוכים השבים${state.parent?.name ? ', ' + state.parent.name : ''}!`); maybeNotify(); }
    } catch (ex) {
      err.textContent = ex.message;
      $('.auth-card').classList.remove('shake-x'); void $('.auth-card').offsetWidth; $('.auth-card').classList.add('shake-x');
    } finally { btn.disabled = false; }
  });
}

/* ===================== שאלון פתיחה ===================== */
const EXPOSURE_OPTS = [
  { id: 'none', t: 'עוד לא' },
  { id: 'tried', t: 'טעם/ה' },
  { id: 'regular', t: 'אוכל/ת קבוע' },
  { id: 'reaction', t: 'הייתה תגובה' },
];
// מוצר מייצג לכל אלרגן, לרישום החשיפות מהשאלון
const ALLERGEN_REP = { peanut: 'bamba', sesame: 'tahini', egg: 'hardegg', milk: 'yogurt', wheat: 'bread', treenut: 'almond', fish: 'whitefish', soy: 'tofu', shellfish: 'shrimp' };

let wizard = null;

function startWizard() {
  const hasHistory = state.logs.length > 0; // משתמשים ותיקים – לא שואלים שוב על חשיפות
  const steps = ['parent', 'baby', 'avatar'];
  if (!hasHistory) steps.push('allergens', 'foods');
  steps.push('done');
  wizard = {
    steps, i: 0,
    parent: state.parent?.name || '',
    babyName: state.baby?.name || '',
    birth: state.baby?.birth || '',
    avatar: state.avatar ? { ...state.avatar } : null,
    exposures: {},
    foods: new Set(),
    dir: 1,
  };
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
      ${w.i > 0 && step !== 'done' ? '<button class="wz-back" id="wzBack" aria-label="חזרה">→</button>' : '<span></span>'}
      <div class="wz-dots">${dots}</div>
      <span></span>
    </div>
    <div class="wz-step ${w.dir > 0 ? 'in-next' : 'in-prev'}">${body}</div>
  </div>`;
  $('#wzBack')?.addEventListener('click', () => { w.i--; w.dir = -1; renderWizard(); });
  ({ parent: bindParent, baby: bindBaby, avatar: bindAvatarStep, allergens: bindAllergens, foods: bindFoods, done: bindDone })[step]();
  window.scrollTo({ top: 0 });
}
function nextStep() { wizard.i++; wizard.dir = 1; renderWizard(); }

function stepParent() {
  return `
    <span class="wz-emoji anim-jelly">💛</span>
    <h2>נעים להכיר!</h2>
    <p class="muted">כמה שאלות קצרות, ונתאים את האפליקציה בדיוק בשבילכם.</p>
    <form class="form card" id="wzForm">
      <label for="wzParent">איך קוראים לך? (שם האמא)</label>
      <input type="text" id="wzParent" required maxlength="30" value="${esc(wizard.parent)}" placeholder="למשל: מיכל" autocomplete="given-name">
      <div style="height:16px"></div>
      <button class="btn block" type="submit">המשך ←</button>
    </form>`;
}
function bindParent() {
  $('#wzParent').focus();
  $('#wzForm').onsubmit = (e) => { e.preventDefault(); wizard.parent = $('#wzParent').value.trim(); nextStep(); };
}

function stepBaby() {
  return `
    <span class="wz-emoji anim-bounce">👶</span>
    <h2>ספרי לנו על הקטן/ה</h2>
    <form class="form card" id="wzForm">
      <label for="wzBaby">שם הילד/ה</label>
      <input type="text" id="wzBaby" required maxlength="30" value="${esc(wizard.babyName)}" placeholder="למשל: נועם">
      <label for="wzBirth">תאריך לידה</label>
      <input type="date" id="wzBirth" required max="${new Date().toISOString().slice(0, 10)}" value="${esc(wizard.birth)}">
      <div class="wz-age" id="wzAge"></div>
      <div style="height:12px"></div>
      <button class="btn block" type="submit">המשך ←</button>
    </form>`;
}
function bindBaby() {
  const upd = () => {
    const b = $('#wzBirth').value;
    $('#wzAge').innerHTML = b && ageText(b) ? `🎂 גיל: <b>${ageText(b)}</b>` : '';
  };
  $('#wzBirth').oninput = upd; upd();
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
    <h2>האווטאר של ${esc(wizard.babyName)} ✨</h2>
    <p class="muted">העלו תמונה של ${esc(wizard.babyName)}, או בחרו דמות חמודה.</p>
    <div id="avEditor"></div>
    <button class="btn block" id="wzNext" style="margin-top:14px">המשך ←</button>
    <button class="btn ghost block" id="wzSkip" style="margin-top:8px">אולי אחר כך</button>`;
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
    <h2>למה ${esc(wizard.babyName)} כבר נחשף/ה?</h2>
    <p class="muted">כך לא תצטרכו להזין הכל מההתחלה. אפשר לשנות בכל רגע.</p>
    ${age < 4 ? `<div class="card small">👶 ${esc(wizard.babyName)} עוד צעיר/ה למוצקים – אפשר פשוט לדלג.</div>` : ''}
    <div class="exp-list">
      ${Object.entries(ALLERGENS).map(([k, a]) => `
        <div class="exp-row card">
          <div class="exp-name"><span class="anim-float" style="display:inline-block">${a.emoji}</span> ${a.name}
            ${k === 'milk' ? '<small class="muted">(גם תמ״ל רגיל נחשב)</small>' : ''}${k === 'peanut' ? '<small class="muted">(כולל במבה)</small>' : ''}</div>
          <div class="exp-opts" data-al="${k}">
            ${EXPOSURE_OPTS.map((o) => `<button type="button" class="exp-opt ${(wizard.exposures[k] || 'none') === o.id ? 'on' : ''} o-${o.id}" data-v="${o.id}">${o.t}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <button class="btn block" id="wzNext" style="margin-top:14px">המשך ←</button>
    <button class="btn ghost block" id="wzSkip" style="margin-top:8px">עוד לא התחלנו מוצקים ⏭️</button>`;
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
    <h2>ומה ${esc(wizard.babyName)} כבר טעם/ה?</h2>
    <p class="muted">סמנו את מה שכבר טעם. לא חייבים לזכור הכל 🙂</p>
    <div class="wz-count" id="wzCount"></div>
    ${cats.map((c) => {
      const foods = FOODS.filter((f) => f.cat === c.id && !f.allergen);
      if (!foods.length) return '';
      return `<div class="wz-cat"><div class="wz-cat-head"><b>${c.emoji} ${c.name}</b><button type="button" class="link-btn" data-all="${c.id}">סמנו הכל</button></div>
        <div class="pick-grid">${foods.map((f) => `<button type="button" class="pick ${wizard.foods.has(f.id) ? 'on' : ''}" data-f="${f.id}"><span class="anim-${f.anim}">${f.emoji}</span>${esc(f.name)}</button>`).join('')}</div></div>`;
    }).join('')}
    <div class="wz-sticky"><button class="btn block" id="wzNext">סיימתי ←</button></div>`;
}
function bindFoods() {
  const count = () => { $('#wzCount').textContent = wizard.foods.size ? `✓ ${wizard.foods.size} מוצרים נבחרו` : ''; };
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
      <h2>הכל מוכן, ${esc(wizard.parent)}! 🎉</h2>
      <p class="muted">${al || wizard.foods.size ? `רשמנו ${wizard.foods.size} מוצרים ו-${al} אלרגנים שכבר מוכרים ל${esc(wizard.babyName)}.` : `מתחילים את המסע של ${esc(wizard.babyName)} מאפס – איזה כיף!`}</p>
      <button class="btn block" id="wzFinish">יאללה, נכנסים! 🥄</button>
      <p class="small muted" style="margin-top:14px">⚕️ האפליקציה היא כלי מעקב ומידע כללי, ואינה תחליף לייעוץ רפואי.</p>
    </div>`;
}
function bindDone() {
  $('#wzFinish').onclick = () => {
    const w = wizard;
    state.parent = { name: w.parent };
    state.baby = { name: w.babyName, birth: w.birth };
    state.avatar = w.avatar || { emoji: '👶', frame: FRAMES[0] };
    seedExposures(w.exposures, [...w.foods]);
    state.onboarded = true;
    save();
    wizard = null;
    tab = 'home';
    render();
    celebrate('🎉', `ברוכים הבאים, ${state.baby.name}!`);
  };
}

// הופך את תשובות השאלון לרישומי טעימה, כדי שהסטטוסים והתזכורות יתחילו נכון
function seedExposures(exposures, foodIds) {
  const now = Date.now();
  const add = (foodId, daysAgo, symptoms = []) => state.logs.push({
    id: uid(), foodId, ts: now - daysAgo * DAY, liked: undefined, amount: undefined, symptoms, notes: 'מהשאלון הראשוני', seed: true,
  });
  for (const [k, v] of Object.entries(exposures)) {
    const f = ALLERGEN_REP[k];
    if (v === 'tried') add(f, 1);
    if (v === 'regular') [1, 3, 5].forEach((d) => add(f, d));
    if (v === 'reaction') add(f, 1, ['past']);
  }
  foodIds.forEach((id) => add(id, 1));
}

/* ===================== עורך אווטאר ===================== */
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
      <label class="btn accent upload-btn">📷 ${ed.dataUrl ? 'החלפת תמונה' : 'העלאת תמונה'}<input type="file" id="avFile" accept="image/*" hidden></label>
      ${ed.dataUrl ? '<button type="button" class="link-btn" id="avRemove" style="display:block;margin:8px auto 0">🗑️ הסרת התמונה</button>' : ''}
      <div id="avPhotoCtl" hidden>
        <div class="small muted" style="text-align:center;margin:8px 0">גררו את התמונה כדי למרכז את הפנים</div>
        <label class="zoom-row">🔍<input type="range" id="avZoom" min="1" max="3" step="0.05" value="1"></label>
      </div>
      <div id="avEmojiCtl" ${ed.dataUrl ? 'hidden' : ''}>
        <div class="small muted" style="margin:10px 0 6px">או בחרו דמות:</div>
        <div class="emoji-pick">${EMOJI_AVATARS.map((e) => `<button type="button" class="${e === ed.emoji ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
      </div>
      <div class="small muted" style="margin:12px 0 6px">מסגרת וקישוט:</div>
      <div class="frame-pick">${FRAMES.map((c) => `<button type="button" class="${c === ed.frame ? 'on' : ''}" data-frame="${c}" style="background:${c}" aria-label="צבע מסגרת"></button>`).join('')}</div>
      <div class="sticker-pick">${STICKERS.map((s) => `<button type="button" class="${s === ed.sticker ? 'on' : ''}" data-sticker="${s}">${s || '✕'}</button>`).join('')}</div>
    </div>`;

  const canvas = $('#avCanvas', root), stage = $('.av-stage', root);
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
      $('.upload-btn', root).firstChild.textContent = '📷 החלפת תמונה';
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
    <h2 style="margin-bottom:10px">✨ האווטאר של ${esc(babyName())}</h2>
    <div id="avEditor"></div>
    <button class="btn block" id="avSave" style="margin-top:14px">שמירה</button>
  `, (b) => {
    const ed = mountAvatarEditor($('#avEditor', b), state.avatar, (v) => { current = v; });
    $('#avSave', b).onclick = () => {
      state.avatar = ed.value() || current;
      save(); closeModal(); render();
      celebrate('✨', 'אווטאר חדש!');
    };
  });
}

/* ===================== הפעלה ===================== */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
load(Auth.session());
render();
maybeNotify();
setInterval(() => { maybeNotify(); if ($('#modal').hidden) updateBadge(); }, 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentUser && state.onboarded && $('#modal').hidden) { maybeNotify(); render(); }
});
