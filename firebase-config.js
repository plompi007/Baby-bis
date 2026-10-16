// הגדרות Firebase לסנכרון בענן.
// כדי להפעיל: Firebase Console → Project settings → Your apps → Web app → העתיקו את firebaseConfig לכאן.
// כל עוד זה null, האפליקציה עובדת במצב מקומי (הנתונים רק במכשיר).
// הערכים האלה ציבוריים מטבעם (הם מזהים את הפרויקט); האבטחה נעשית בכללי Firestore (firestore.rules).
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || null;
/* דוגמה:
window.FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: 'baby-bis.firebaseapp.com',
  projectId: 'baby-bis',
  storageBucket: 'baby-bis.appspot.com',
  messagingSenderId: '...',
  appId: '...',
};
*/
