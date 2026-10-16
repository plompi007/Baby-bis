'use strict';
// סנכרון בענן עם Firebase: התחברות, נתוני משפחה משותפים לשני ההורים, וסנכרון חי בין מכשירים.
// פעיל רק כשקיים FIREBASE_CONFIG (ראו firebase-config.js). אחרת האפליקציה עובדת במצב מקומי.
//
// מבנה הנתונים ב-Firestore:
//   users/{uid}                 – נתונים אישיים: familyId, parent (השם שלך), favNotes, favRecipes
//   families/{fid}              – members[], inviteCode, data: { onboarded, baby, avatar, customFoods, cleared, settings, v }
//   families/{fid}/logs/{logId} – טעימה אחת לכל מסמך (כך ששני הורים יכולים לרשום בו זמנית בלי לדרוס)
//   invites/{code}              – familyId, להצטרפות של בן/בת הזוג

const Cloud = (() => {
  const SDK = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
  const FAMILY_KEYS = ['v', 'onboarded', 'baby', 'avatar', 'customFoods', 'cleared'];
  const USER_KEYS = ['parent', 'favNotes', 'favRecipes'];
  const DEVICE_KEY = 'bis-rishon-device';

  let auth, db, user = null, familyId = null, familyDoc = null, userDoc = null;
  let unsub = [], syncedLogs = new Map(), lastFamily = '', lastUser = '', saveTimer = null;
  // מחיקות מפורשות בלבד: טעימה שבן/בת הזוג הוסיפו עכשיו לא תימחק רק כי עוד לא הגיעה למכשיר הזה
  let localIds = new Set(), pendingDeletes = new Set(), latest = null, dirty = false, flushing = null;
  let onChange = () => {};
  let pendingFire = () => {};
  const api = { active: false, email: '', inviteCode: '', members: 0 };

  const enabled = () => !!window.FIREBASE_CONFIG?.apiKey;
  const clean = (o) => JSON.parse(JSON.stringify(o ?? null));
  const device = () => { try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; } catch { return {}; } };

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('טעינת Firebase נכשלה. בדקו את החיבור לאינטרנט.'));
      document.head.appendChild(s);
    });
  }

  async function init(handlers) {
    onChange = handlers.onChange;
    for (const f of SDK) await loadScript(`vendor/firebase/${f}`);
    firebase.initializeApp(window.FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    // מצב פיתוח מול אמולטור מקומי: ?emulator=1
    if (new URLSearchParams(location.search).has('emulator')) {
      auth.useEmulator('http://localhost:9099', { disableWarnings: true });
      db.useEmulator('localhost', 8080);
    } else {
      // עבודה גם בלי אינטרנט: Firestore שומר עותק מקומי ומסנכרן כשהחיבור חוזר
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    }
    auth.languageCode = 'he';
    await auth.getRedirectResult().catch(() => {});
    auth.onAuthStateChanged(async (u) => {
      stop();
      user = u;
      api.active = !!u;
      api.email = u?.email || '';
      if (!u) return handlers.onSignedOut();
      handlers.onLoading();
      const snap = await db.doc(`users/${u.uid}`).get().catch(() => null);
      familyId = snap?.data()?.familyId || null;
      if (!familyId) return handlers.onNeedsFamily();
      subscribe();
    });
  }

  function stop() {
    unsub.forEach((f) => f()); unsub = [];
    syncedLogs = new Map(); familyDoc = null; userDoc = null; lastFamily = ''; lastUser = '';
    localIds = new Set(); pendingDeletes = new Set(); latest = null; dirty = false; clearTimeout(saveTimer); pendingFire = () => {};
  }

  // האזנה חיה למסמכי המשפחה, המשתמש והטעימות
  function subscribe() {
    let ready = { fam: false, user: false, logs: false };
    let logs = [];
    const emit = (initial) => {
      if (!ready.fam || !ready.user || !ready.logs) return;
      const fam = familyDoc?.data || {};
      const usr = userDoc || {};
      const dev = device();
      const merged = migrate(Object.assign({}, fam, pick(usr, USER_KEYS), { logs, settings: Object.assign({}, fam.settings, dev) }));
      lastFamily = JSON.stringify(familyPart(merged));
      lastUser = JSON.stringify(userPart(merged));
      localIds = new Set(merged.logs.map((l) => l.id));
      onChange(merged, initial);
    };
    let first = true;
    // כל עוד יש שינויים מקומיים שעוד לא נשלחו – לא דורסים את המצב המקומי בעדכון חלקי מהשרת
    const fire = () => { if (ready.fam && ready.user && ready.logs && !dirty) { emit(first); first = false; } };
    pendingFire = fire;
    unsub.push(db.doc(`families/${familyId}`).onSnapshot((s) => {
      familyDoc = s.data() || {};
      api.inviteCode = familyDoc.inviteCode || '';
      api.members = (familyDoc.members || []).length;
      ready.fam = true; fire();
    }, onError));
    unsub.push(db.doc(`users/${user.uid}`).onSnapshot((s) => {
      userDoc = s.data() || {};
      ready.user = true; fire();
    }, onError));
    unsub.push(db.collection(`families/${familyId}/logs`).onSnapshot((s) => {
      logs = s.docs.map((d) => d.data());
      syncedLogs = new Map(logs.map((l) => [l.id, JSON.stringify(l)]));
      ready.logs = true; fire();
    }, onError));
  }
  function onError(e) { console.warn('cloud', e); toast('בעיה בסנכרון עם הענן. ננסה שוב 🔄'); }

  const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  function familyPart(st) {
    const out = clean(pick(st, FAMILY_KEYS));
    out.settings = clean({ disabled: st.settings.disabled, targets: st.settings.targets });
    return out;
  }
  const userPart = (st) => clean(pick(st, USER_KEYS));

  // שמירה: רק מה שהשתנה, באצוות. נקרא מ-save() של האפליקציה
  function save(st) {
    clearTimeout(saveTimer);
    latest = st;
    dirty = true;
    const ids = new Set(st.logs.map((l) => l.id));
    for (const id of localIds) if (!ids.has(id)) pendingDeletes.add(id);
    localIds = ids;
    try { localStorage.setItem(DEVICE_KEY, JSON.stringify({ notify: st.settings.notify, lastNotified: st.settings.lastNotified })); } catch {}
    saveTimer = setTimeout(flush, 200);
  }
  async function flush() {
    const st = latest;
    if (!user || !familyId || !st) { dirty = false; return; }
    const ops = [];
    const fam = familyPart(st), famJson = JSON.stringify(fam);
    if (famJson !== lastFamily) { lastFamily = famJson; ops.push((b) => b.update(db.doc(`families/${familyId}`), { data: fam, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })); }
    const usr = userPart(st), usrJson = JSON.stringify(usr);
    if (usrJson !== lastUser) { lastUser = usrJson; ops.push((b) => b.set(db.doc(`users/${user.uid}`), usr, { merge: true })); }
    for (const l of st.logs) {
      const c = clean(l), j = JSON.stringify(c);
      if (syncedLogs.get(l.id) !== j) { syncedLogs.set(l.id, j); ops.push((b) => b.set(db.doc(`families/${familyId}/logs/${l.id}`), c)); }
    }
    for (const id of pendingDeletes) { syncedLogs.delete(id); ops.push((b) => b.delete(db.doc(`families/${familyId}/logs/${id}`))); }
    pendingDeletes.clear();
    // Firestore מגביל 500 פעולות לאצווה. הכתיבות נכנסות מיד למטמון המקומי (גם בלי רשת)
    const commits = [];
    for (let i = 0; i < ops.length; i += 450) {
      const b = db.batch();
      ops.slice(i, i + 450).forEach((op) => op(b));
      commits.push(b.commit().catch(onError));
    }
    dirty = false;
    // אם לא היה מה לשלוח, לא יגיע עדכון מהשרת – מעדכנים מיד. אחרת העדכון יגיע מהמטמון המקומי
    if (!ops.length) pendingFire();
    await Promise.all(commits);
  }

  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => CODE_ABC[n % CODE_ABC.length]).join('');

  // יצירת משפחה חדשה (ריקה, או עם נתונים שהועברו מהמכשיר)
  async function createFamily(initial) {
    const famRef = db.collection('families').doc();
    const code = newCode();
    const st = migrate(Object.assign(defaultState(), initial || {}));
    const b = db.batch();
    b.set(famRef, { members: [user.uid], owner: user.uid, inviteCode: code, data: familyPart(st), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    b.set(db.doc(`invites/${code}`), { familyId: famRef.id });
    b.set(db.doc(`users/${user.uid}`), Object.assign({ familyId: famRef.id }, userPart(st)), { merge: true });
    await b.commit();
    familyId = famRef.id;
    // טעימות קיימות (בהעברה מהמכשיר)
    for (let i = 0; i < st.logs.length; i += 450) {
      const lb = db.batch();
      st.logs.slice(i, i + 450).forEach((l) => lb.set(db.doc(`families/${familyId}/logs/${l.id}`), clean(l)));
      await lb.commit();
    }
    subscribe();
  }

  async function joinFamily(code) {
    code = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const inv = await db.doc(`invites/${code}`).get().catch(() => null);
    if (!inv?.exists) throw new Error('הקוד לא נמצא. בדקו שהוקלד נכון.');
    const fid = inv.data().familyId;
    await db.doc(`families/${fid}`).update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid), [`joins.${user.uid}`]: code });
    await db.doc(`users/${user.uid}`).set({ familyId: fid }, { merge: true });
    familyId = fid;
    subscribe();
  }

  // הודעות שגיאה של Firebase בעברית
  function heError(e) {
    const m = {
      'auth/email-already-in-use': 'כבר קיים חשבון עם המייל הזה. נסו להתחבר.',
      'auth/invalid-email': 'כתובת המייל לא תקינה',
      'auth/weak-password': 'הסיסמה צריכה להכיל לפחות 6 תווים',
      'auth/user-not-found': 'לא נמצא חשבון עם המייל הזה',
      'auth/wrong-password': 'הסיסמה שגויה',
      'auth/invalid-credential': 'המייל או הסיסמה שגויים',
      'auth/invalid-login-credentials': 'המייל או הסיסמה שגויים',
      'auth/too-many-requests': 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
      'auth/network-request-failed': 'אין חיבור לאינטרנט',
      'auth/popup-closed-by-user': 'החלון נסגר לפני סיום ההתחברות',
      'auth/unauthorized-domain': 'הכתובת הזו לא מאושרת בהגדרות Firebase (Authorized domains).',
    };
    return new Error(m[e.code] || e.message || 'משהו השתבש, נסו שוב');
  }
  const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw heError(e); } };

  Object.assign(api, {
    enabled, init, save, createFamily, joinFamily,
    register: wrap((email, pass) => auth.createUserWithEmailAndPassword(email.trim(), pass)),
    login: wrap((email, pass) => auth.signInWithEmailAndPassword(email.trim(), pass)),
    resetPassword: wrap((email) => auth.sendPasswordResetEmail(email.trim())),
    google: wrap(() => {
      const p = new firebase.auth.GoogleAuthProvider();
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      return standalone ? auth.signInWithRedirect(p) : auth.signInWithPopup(p);
    }),
    logout: () => auth.signOut(),
    uid: () => user?.uid,
  });
  return api;
})();
