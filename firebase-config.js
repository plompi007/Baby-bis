// הגדרות Firebase לסנכרון בענן.
// כדי להפעיל: Firebase Console → Project settings → Your apps → Web app → העתיקו את firebaseConfig לכאן.
// אם מחליפים ל-null, האפליקציה חוזרת למצב מקומי (הנתונים רק במכשיר).
// הערכים האלה ציבוריים מטבעם (הם מזהים את הפרויקט); האבטחה נעשית בכללי Firestore (firestore.rules).
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: 'AIzaSyAC3NRKjld0ATzoqkilKoDyoAv-uXZMV04',
  authDomain: 'baby-bis.firebaseapp.com',
  projectId: 'baby-bis',
  storageBucket: 'baby-bis.firebasestorage.app',
  messagingSenderId: '300203641916',
  appId: '1:300203641916:web:b65f99e14803e33407c739',
};
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
