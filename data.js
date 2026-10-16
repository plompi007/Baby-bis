// נתוני האפליקציה: מוצרים, אלרגנים ותוכן מדריך.
// anim = סוג האנימציה של המוצר (מוגדר ב-styles.css כ-.anim-<name>)

const CATEGORIES = [
  { id: 'veg',     name: 'ירקות',         emoji: '🥦', color: '#7cc576' },
  { id: 'fruit',   name: 'פירות',         emoji: '🍓', color: '#ff8a80' },
  { id: 'grain',   name: 'דגנים ופחמימות', emoji: '🍞', color: '#f4c06b' },
  { id: 'protein', name: 'חלבונים',        emoji: '🍗', color: '#e8a07a' },
  { id: 'legume',  name: 'קטניות',        emoji: '🫘', color: '#c9a27c' },
  { id: 'dairy',   name: 'מוצרי חלב',      emoji: '🧀', color: '#9cc9f5' },
  { id: 'allergen',name: 'אלרגנים',        emoji: '⭐', color: '#ffb74d' },
  { id: 'custom',  name: 'שלי',           emoji: '✨', color: '#c39bd3' },
];

// אלרגנים עיקריים. weeklyTarget = מספר חשיפות מומלץ בשבוע לשמירת סבילות.
// maxGap = מספר ימים מקסימלי בלי חשיפה לפני התראה אדומה.
const ALLERGENS = {
  peanut:   { name: 'בוטנים',       emoji: '🥜', weeklyTarget: 3, maxGap: 7, priority: 'high',
              how: 'חמאת בוטנים חלקה (100% בוטנים) מדוללת במים חמים/חלב אם/תמ״ל, או מעורבבת בדייסה/פירה. מתחילים מ-¼ כפית. לעולם לא בוטנים שלמים או חמאה סמיכה מהכפית.',
              note: 'יעד תחזוקה לפי מחקר LEAP: כ-2 גרם חלבון בוטנים (~2 כפיות חמאת בוטנים) 3 פעמים בשבוע.' },
  sesame:   { name: 'שומשום / טחינה', emoji: '🫙', weeklyTarget: 2, maxGap: 7, priority: 'high',
              how: 'טחינה גולמית מדוללת במים או מעורבבת בפירה/דייסה/יוגורט. מתחילים מ-¼ כפית. טחינה סמיכה עלולה להידבק לחך – תמיד לדלל.',
              note: 'בישראל שומשום הוא מהאלרגנים השכיחים והחמורים בילדים – חשוב במיוחד לשמור על חשיפה קבועה.' },
  egg:      { name: 'ביצה',        emoji: '🥚', weeklyTarget: 2, maxGap: 7, priority: 'high',
              how: 'ביצה מבושלת היטב בלבד (קשה או חביתה עשויה היטב) – לא ביצה רכה או נא. מתחילים מכמות קטנה מעוכה בפירה, ומעלים עד ביצה שלמה.',
              note: 'ההנחיות האירופיות (EAACI) ממליצות במפורש על ביצה מבושלת היטב בגיל 4–6 חודשים.' },
  milk:     { name: 'חלב פרה',      emoji: '🥛', weeklyTarget: 3, maxGap: 7, priority: 'high',
              how: 'יוגורט, גבינה לבנה, קוטג׳ או חלב בתוך דייסה/פירה. חלב פרה כמשקה עיקרי רק אחרי גיל שנה.',
              note: 'אם התינוק ניזון מתמ״ל רגיל – הוא כבר נחשף לחלבון חלב פרה באופן קבוע.' },
  wheat:    { name: 'חיטה',         emoji: '🌾', weeklyTarget: 2, maxGap: 10, priority: 'medium',
              how: 'דייסת סולת, פתיתים, פסטה מבושלת היטב, לחם רך.',
              note: 'קל לשמור על חשיפה – חיטה נמצאת ברוב המטבח הישראלי.' },
  treenut:  { name: 'אגוזים',       emoji: '🌰', weeklyTarget: 1, maxGap: 10, priority: 'medium',
              how: 'חמאת שקדים / קשיו / אגוזי לוז חלקה מדוללת, או אגוזים טחונים דק מעורבבים באוכל. כל אגוז נחשב אלרגן נפרד – מומלץ להכיר כל אחד בנפרד.',
              note: 'אגוזים שלמים או חתיכות – סכנת חנק עד גיל 4–5.' },
  fish:     { name: 'דגים',         emoji: '🐟', weeklyTarget: 1, maxGap: 14, priority: 'medium',
              how: 'דג מבושל היטב, מפורק לפתיתים, לבדוק שאין עצמות. סלמון, אמנון, בקלה. להימנע מדגים עשירים בכספית (כמו כריש, דג חרב).',
              note: 'מקור מצוין לאומגה 3.' },
  soy:      { name: 'סויה',         emoji: '🫛', weeklyTarget: 1, maxGap: 14, priority: 'low',
              how: 'טופו רך, אדממה טחונה, יוגורט סויה.',
              note: '' },
  shellfish:{ name: 'פירות ים',     emoji: '🦐', weeklyTarget: 1, maxGap: 14, priority: 'low',
              how: 'שרימפס מבושל היטב קצוץ דק – רק אם זה חלק מהתפריט המשפחתי.',
              note: 'רלוונטי רק אם המשפחה אוכלת פירות ים. ניתן לכבות בהגדרות.' },
};

// מוצרים. allergen = מפתח מתוך ALLERGENS. choke = אזהרת חנק / הכנה בטוחה.
const FOODS = [
  // ירקות
  { id: 'carrot', name: 'גזר', emoji: '🥕', cat: 'veg', anim: 'hop', tip: 'מבושל עד ריכוך מלא, פירה או אצבעות רכות.', choke: 'גזר חי – סכנת חנק עד גיל שנה ומעלה.' },
  { id: 'sweetpotato', name: 'בטטה', emoji: '🍠', cat: 'veg', anim: 'jelly', tip: 'אפויה או מבושלת, מעוכה או ברצועות רכות. מאכל פתיחה מצוין.' },
  { id: 'potato', name: 'תפוח אדמה', emoji: '🥔', cat: 'veg', anim: 'roll', tip: 'פירה חלק או רצועות אפויות רכות.' },
  { id: 'zucchini', name: 'קישוא', emoji: '🥒', cat: 'veg', anim: 'swing', tip: 'מאודה, מעוך או ברצועות רכות.' },
  { id: 'pumpkin', name: 'דלעת', emoji: '🎃', cat: 'veg', anim: 'pulse', tip: 'אפויה ומעוכה. מתוקה וטבעית.' },
  { id: 'broccoli', name: 'ברוקולי', emoji: '🥦', cat: 'veg', anim: 'wiggle', tip: 'פרחים מאודים רכים – ה"גבעול" משמש כידית לאחיזה. טעם מר – צריך הרבה חשיפות!' },
  { id: 'cauliflower', name: 'כרובית', emoji: '🥬', cat: 'veg', anim: 'float', tip: 'מאודה רכה או פירה.' },
  { id: 'avocado', name: 'אבוקדו', emoji: '🥑', cat: 'veg', anim: 'jelly', tip: 'בשל, מעוך או ברצועות. עשיר בשומן בריא.' },
  { id: 'pea', name: 'אפונה', emoji: '🫛', cat: 'veg', anim: 'shake', tip: 'מבושלת ומעוכה. שלמה – רק כשיש אחיזת פינצטה, ולמעוך מעט.' },
  { id: 'tomato', name: 'עגבנייה', emoji: '🍅', cat: 'veg', anim: 'bounce', tip: 'עגבניות שרי – לחתוך לרבעים!', choke: 'עגבניות שרי שלמות – סכנת חנק.' },
  { id: 'cucumber', name: 'מלפפון', emoji: '🥒', cat: 'veg', anim: 'swing', tip: 'רצועה ארוכה קלופה לנגיסה, או מגורר.' },
  { id: 'eggplant', name: 'חציל', emoji: '🍆', cat: 'veg', anim: 'wiggle', tip: 'קלוי ומעוך (כמו סלט חציל בלי מלח).' },
  { id: 'spinach', name: 'תרד', emoji: '🥬', cat: 'veg', anim: 'float', tip: 'קצוץ דק בתוך פירה, חביתה או פסטה.' },
  { id: 'beet', name: 'סלק', emoji: '🟣', cat: 'veg', anim: 'spin', tip: 'מבושל רך. צובע את הטיטול באדום – זה תקין 🙂' },
  { id: 'pepper', name: 'פלפל', emoji: '🫑', cat: 'veg', anim: 'hop', tip: 'קלוי וקלוף, ברצועות רכות.' },
  { id: 'corn', name: 'תירס', emoji: '🌽', cat: 'veg', anim: 'shake', tip: 'קלח שלם לכרסום, או גרעינים מעוכים.', choke: 'גרעיני תירס שלמים – למעוך.' },
  { id: 'onion', name: 'בצל', emoji: '🧅', cat: 'veg', anim: 'spin', tip: 'מבושל/מוקפץ רך בתוך תבשילים – נותן טעם.' },
  { id: 'mushroom', name: 'פטריות', emoji: '🍄', cat: 'veg', anim: 'bounce', tip: 'מבושלות היטב וקצוצות דק.' },

  // פירות
  { id: 'banana', name: 'בננה', emoji: '🍌', cat: 'fruit', anim: 'swing', tip: 'מעוכה או חצי בננה עם קליפה חלקית כידית.' },
  { id: 'apple', name: 'תפוח', emoji: '🍎', cat: 'fruit', anim: 'bounce', tip: 'אפוי/מבושל רך או מגורר.', choke: 'תפוח חי בפרוסות קשות – סכנת חנק.' },
  { id: 'pear', name: 'אגס', emoji: '🍐', cat: 'fruit', anim: 'swing', tip: 'בשל מאוד או מאודה.' },
  { id: 'strawberry', name: 'תות', emoji: '🍓', cat: 'fruit', anim: 'pulse', tip: 'גדול שלם לנגיסה, או קצוץ/מעוך.' },
  { id: 'blueberry', name: 'אוכמניות', emoji: '🫐', cat: 'fruit', anim: 'bounce', tip: 'למעוך כל אחת בין האצבעות.', choke: 'אוכמניות שלמות – למעוך.' },
  { id: 'grape', name: 'ענבים', emoji: '🍇', cat: 'fruit', anim: 'shake', tip: 'לחתוך לרבעים לאורך.', choke: 'ענב שלם – מסכנות החנק הנפוצות!' },
  { id: 'mango', name: 'מנגו', emoji: '🥭', cat: 'fruit', anim: 'jelly', tip: 'בשל, רצועות או גלעין עם מעט פרי לכרסום.' },
  { id: 'watermelon', name: 'אבטיח', emoji: '🍉', cat: 'fruit', anim: 'roll', tip: 'משולש/רצועה בלי גרעינים.' },
  { id: 'melon', name: 'מלון', emoji: '🍈', cat: 'fruit', anim: 'roll', tip: 'בשל ורך, ברצועות.' },
  { id: 'peach', name: 'אפרסק', emoji: '🍑', cat: 'fruit', anim: 'jelly', tip: 'בשל וקלוף, חצי בלי גלעין.' },
  { id: 'plum', name: 'שזיף', emoji: '🟣', cat: 'fruit', anim: 'hop', tip: 'בשל, בלי גלעין. עוזר לעצירות.' },
  { id: 'orange', name: 'תפוז', emoji: '🍊', cat: 'fruit', anim: 'spin', tip: 'פלחים בלי קרום וגרעינים. עלול לגרום לפריחה סביב הפה – בד״כ מגע ולא אלרגיה.' },
  { id: 'kiwi', name: 'קיווי', emoji: '🥝', cat: 'fruit', anim: 'wiggle', tip: 'בשל, קלוף, ברצועות.' },
  { id: 'date', name: 'תמרים', emoji: '🟤', cat: 'fruit', anim: 'float', tip: 'ללא גלעין, מעוך/ממרח סילאן טבעי במתינות.', choke: 'תמר שלם – קצוץ דק בלבד.' },
  { id: 'cherry', name: 'דובדבן', emoji: '🍒', cat: 'fruit', anim: 'swing', tip: 'ללא גלעין, לחתוך לרבעים.', choke: 'גלעין ופרי שלם – סכנת חנק.' },
  { id: 'pomegranate', name: 'רימון', emoji: '🔴', cat: 'fruit', anim: 'pulse', tip: 'מיץ בתוך יוגורט, או גרגירים מעוכים לגדולים יותר.' },

  // דגנים
  { id: 'oat', name: 'שיבולת שועל', emoji: '🥣', cat: 'grain', anim: 'float', tip: 'דייסה. שימו לב: לרוב מעובדת יחד עם חיטה.' },
  { id: 'rice', name: 'אורז', emoji: '🍚', cat: 'grain', anim: 'pulse', tip: 'דייסה או כדורי אורז רך. לגוון דגנים – אורז מכיל ארסן.' },
  { id: 'semolina', name: 'סולת', emoji: '🥣', cat: 'grain', anim: 'float', allergen: 'wheat', tip: 'דייסת סולת – דרך קלה לחשוף לחיטה.' },
  { id: 'bread', name: 'לחם', emoji: '🍞', cat: 'grain', anim: 'bounce', allergen: 'wheat', tip: 'פרוסה קלויה קלות ברצועות, אפשר עם ממרח.' },
  { id: 'pasta', name: 'פסטה', emoji: '🍝', cat: 'grain', anim: 'wiggle', allergen: 'wheat', tip: 'מבושלת היטב (רכה), צורות גדולות לאחיזה.' },
  { id: 'ptitim', name: 'פתיתים', emoji: '⚪', cat: 'grain', anim: 'shake', allergen: 'wheat', tip: 'מבושלים היטב, אפשר לשלב ירקות.' },
  { id: 'quinoa', name: 'קינואה', emoji: '🌾', cat: 'grain', anim: 'shake', tip: 'שטופה ומבושלת היטב, בתוך קציצות.' },
  { id: 'buckwheat', name: 'כוסמת', emoji: '🌰', cat: 'grain', anim: 'roll', tip: 'מבושלת רכה או דייסה. ללא גלוטן.' },
  { id: 'bulgur', name: 'בורגול', emoji: '🌾', cat: 'grain', anim: 'shake', allergen: 'wheat', tip: 'דק, מבושל רך.' },

  // חלבונים
  { id: 'chicken', name: 'עוף', emoji: '🍗', cat: 'protein', anim: 'swing', tip: 'שוק מבושלת שלמה למציצה, קצוץ או קציצות רכות. עשיר בברזל.' },
  { id: 'beef', name: 'בקר', emoji: '🥩', cat: 'protein', anim: 'wiggle', tip: 'בשר טחון מבושל, קציצות רכות. מקור ברזל מצוין – חשוב מגיל 6 חודשים.' },
  { id: 'turkey', name: 'הודו', emoji: '🦃', cat: 'protein', anim: 'hop', tip: 'טחון או מבושל רך.' },
  { id: 'liver', name: 'כבד עוף', emoji: '🟫', cat: 'protein', anim: 'pulse', tip: 'בכמות קטנה, ממרח. עשיר מאוד בברזל ובוויטמין A – פעם-פעמיים בשבוע מספיק.' },
  { id: 'hardegg', name: 'ביצה קשה', emoji: '🥚', cat: 'protein', anim: 'roll', allergen: 'egg', tip: 'מבושלת 10+ דקות, מעוכה או ברבעים.' },
  { id: 'omelet', name: 'חביתה', emoji: '🍳', cat: 'protein', anim: 'jelly', allergen: 'egg', tip: 'עשויה היטב, ברצועות. אפשר להוסיף ירקות.' },
  { id: 'salmon', name: 'סלמון', emoji: '🐟', cat: 'protein', anim: 'swing', allergen: 'fish', tip: 'אפוי, מפורק לפתיתים, ללא עצמות.' },
  { id: 'whitefish', name: 'אמנון / בקלה', emoji: '🐠', cat: 'protein', anim: 'float', allergen: 'fish', tip: 'מבושל, מפורק, ללא עצמות.' },
  { id: 'tofu', name: 'טופו', emoji: '⬜', cat: 'protein', anim: 'jelly', allergen: 'soy', tip: 'רך, קוביות/רצועות, אפשר לצלות קלות.' },
  { id: 'shrimp', name: 'שרימפס', emoji: '🦐', cat: 'protein', anim: 'wiggle', allergen: 'shellfish', tip: 'מבושל היטב וקצוץ דק.' },

  // קטניות
  { id: 'lentil', name: 'עדשים', emoji: '🟠', cat: 'legume', anim: 'shake', tip: 'עדשים כתומות – מתבשלות לפירה בקלות. ברזל צמחי (לשלב עם ויטמין C).' },
  { id: 'chickpea', name: 'חומוס', emoji: '🫘', cat: 'legume', anim: 'bounce', tip: 'ממרח חומוס. גרגירים שלמים – למעוך.', choke: 'גרגירי חומוס שלמים – למעוך.' },
  { id: 'hummus', name: 'ממרח חומוס (עם טחינה)', emoji: '🥙', cat: 'legume', anim: 'jelly', allergen: 'sesame', tip: 'מכיל טחינה – נחשב גם חשיפה לשומשום!' },
  { id: 'bean', name: 'שעועית', emoji: '🫘', cat: 'legume', anim: 'hop', tip: 'מבושלת ומעוכה.' },
  { id: 'edamame', name: 'אדממה', emoji: '🫛', cat: 'legume', anim: 'shake', allergen: 'soy', tip: 'מבושלת וטחונה/מעוכה.', choke: 'שלמה – למעוך.' },

  // מוצרי חלב
  { id: 'yogurt', name: 'יוגורט', emoji: '🥛', cat: 'dairy', anim: 'jelly', allergen: 'milk', tip: 'טבעי, ללא סוכר. בסיס מצוין לערבוב אלרגנים אחרים.' },
  { id: 'whitecheese', name: 'גבינה לבנה', emoji: '🧀', cat: 'dairy', anim: 'float', allergen: 'milk', tip: 'אפשר על לחם או עם פרי.' },
  { id: 'cottage', name: 'קוטג׳', emoji: '🥣', cat: 'dairy', anim: 'pulse', allergen: 'milk', tip: 'מעוך או כמו שהוא.' },
  { id: 'hardcheese', name: 'גבינה צהובה', emoji: '🧀', cat: 'dairy', anim: 'wiggle', allergen: 'milk', tip: 'מגוררת או מומסת. לשים לב לכמות המלח.', choke: 'קוביות קשות – לגרר או להמיס.' },
  { id: 'labane', name: 'לבנה', emoji: '🫙', cat: 'dairy', anim: 'jelly', allergen: 'milk', tip: 'ממרח על לחם. שימו לב למלח.' },

  // אלרגנים ייעודיים
  { id: 'peanutbutter', name: 'חמאת בוטנים', emoji: '🥜', cat: 'allergen', anim: 'wiggle', allergen: 'peanut', tip: 'חלקה, מדוללת במים חמים. ¼ כפית בפעם הראשונה.', choke: 'לא בוטנים שלמים, לא חמאה סמיכה מהכפית.' },
  { id: 'bamba', name: 'במבה', emoji: '🟡', cat: 'allergen', anim: 'bounce', allergen: 'peanut', tip: 'מומסת במים/חלב לדייסה, או מקל שלם שנמס בפה לגדולים יותר. 21 גרם במבה ≈ 2 גרם חלבון בוטנים.' },
  { id: 'tahini', name: 'טחינה גולמית', emoji: '🫙', cat: 'allergen', anim: 'jelly', allergen: 'sesame', tip: 'מדוללת במים או מעורבבת בפירה/יוגורט.' },
  { id: 'halva', name: 'חלבה', emoji: '🟫', cat: 'allergen', anim: 'shake', allergen: 'sesame', tip: 'עשירה בסוכר – לא מומלץ מתחת לגיל שנה. עדיף טחינה.' },
  { id: 'almond', name: 'שקדים', emoji: '🌰', cat: 'allergen', anim: 'roll', allergen: 'treenut', tip: 'חמאת שקדים חלקה מדוללת או שקדים טחונים דק.', choke: 'שקד שלם – סכנת חנק.' },
  { id: 'walnut', name: 'אגוזי מלך', emoji: '🌰', cat: 'allergen', anim: 'spin', allergen: 'treenut', tip: 'טחונים דק, בתוך דייסה.', choke: 'אגוז שלם/חתיכות – סכנת חנק.' },
  { id: 'cashew', name: 'קשיו', emoji: '🌰', cat: 'allergen', anim: 'swing', allergen: 'treenut', tip: 'חמאת קשיו מדוללת.', choke: 'קשיו שלם – סכנת חנק.' },
  { id: 'hazelnut', name: 'אגוזי לוז', emoji: '🌰', cat: 'allergen', anim: 'hop', allergen: 'treenut', tip: 'טחונים דק או ממרח לוז טבעי (ללא סוכר).', choke: 'אגוז שלם – סכנת חנק.' },
  { id: 'pistachio', name: 'פיסטוק', emoji: '🟢', cat: 'allergen', anim: 'pulse', allergen: 'treenut', tip: 'טחון דק. מתקשר אלרגית לקשיו.', choke: 'פיסטוק שלם – סכנת חנק.' },
];

// תוכן "מדריך" – מבוסס על סקירת ספרות והנחיות (ראו RESEARCH.md)
const GUIDE = [
  {
    title: 'מתי מתחילים?', icon: '🗓️',
    body: [
      'ההמלצה המקובלת: להתחיל מוצקים סביב גיל 6 חודשים, ולא לפני 4 חודשים.',
      'סימני מוכנות: יושב/ת עם תמיכה מינימלית ושליטה טובה בראש, מתעניין/ת באוכל של אחרים, מכניס/ה חפצים לפה ואינו/ה דוחף/ת אוטומטית את האוכל החוצה עם הלשון.',
      'חלב אם או תמ״ל ממשיכים להיות מקור התזונה העיקרי עד גיל שנה – המוצקים הם תוספת ולמידה.',
    ],
  },
  {
    title: 'למה לחשוף מוקדם לאלרגנים?', icon: '🛡️',
    body: [
      'מחקר LEAP (2015) הראה שחשיפה מוקדמת וקבועה לבוטנים אצל תינוקות בסיכון הורידה את שיעור האלרגיה לבוטנים בכ-80%.',
      'ההנחיות העדכניות (AAP, NIAID, EAACI והאיגוד הישראלי לאלרגיה) ממליצות לא לדחות אלרגנים, אלא להכניס אותם לתפריט כבר מתחילת המוצקים (4–6 חודשים), כולל לתינוקות בסיכון.',
      'מעניין: בישראל, שבה תינוקות אוכלים במבה מגיל צעיר, שיעור אלרגיית הבוטנים נמוך מאוד – אך אלרגיית שומשום שכיחה יחסית. לכן חשוב לשמור גם על חשיפה לטחינה.',
      'ההיגיון: חשיפה דרך מערכת העיכול "מלמדת" את מערכת החיסון לסבול את המזון, בעוד שחשיפה רק דרך עור פגוע (אקזמה) עלולה לעודד רגישות.',
    ],
  },
  {
    title: 'הכי חשוב: לשמור על החשיפה!', icon: '🔁',
    body: [
      'טעימה חד-פעמית לא מספיקה. אחרי שהאלרגן הוכנס ונסבל – צריך להמשיך לתת אותו באופן קבוע.',
      'בוטנים: היעד ממחקר LEAP הוא כ-2 גרם חלבון בוטנים, 3 פעמים בשבוע (6–7 גרם בשבוע). 2 גרם ≈ 2 כפיות חמאת בוטנים או כ-21 גרם במבה.',
      'האגודה הקנדית לאלרגיה (CSACI) מגדירה לפחות פעם בשבוע כמינימום הנתמך במחקר; כמה פעמים בשבוע – עדיף.',
      'הפסקות ארוכות (שבועות) עלולות לפגוע בסבילות שנבנתה. האפליקציה מזכירה לכם כשעבר יותר מדי זמן.',
    ],
  },
  {
    title: 'איך מכניסים אלרגן חדש?', icon: '🧪',
    body: [
      'אלרגן חדש אחד בכל פעם, ורצוי להמתין 2–3 ימים לפני אלרגן חדש נוסף – כך קל לזהות ממה הייתה תגובה.',
      'עדיף בבוקר או בצהריים, ביום רגיל בבית, כשהתינוק בריא – כך אפשר לעקוב אחרי תגובה בשעות שאחרי.',
      'מתחילים בכמות קטנה (כ-¼ כפית) בצורה בטוחה (ממרח מדולל, מעורבב באוכל מוכר), ואם אין תגובה – מעלים בהדרגה באותה ארוחה או בימים הבאים.',
      'תינוקות עם אקזמה קשה או אלרגיה ידועה לביצה – להתייעץ עם רופא/ת ילדים או אלרגולוג/ית לפני חשיפה ראשונה לבוטנים; לפעמים מומלץ לבצע בדיקה או חשיפה במרפאה.',
    ],
  },
  {
    title: 'סימני תגובה אלרגית', icon: '⚠️', danger: true,
    body: [
      'תגובה קלה: פריחה/סרפדת מעטה סביב הפה במקום שהאוכל נגע, כשהתינוק מתנהג כרגיל. להפסיק את המזון, לצלם, לעקוב ולהתייעץ עם רופא/ה.',
      'תגובה שדורשת פנייה לרופא/ה: סרפדת שמתפשטת, הקאה, שלשול, אי-שקט חריג.',
      '🚨 חירום – מד״א 101 מיד: קושי בנשימה, צפצופים או שיעול חוזר, נפיחות בשפתיים/לשון/פנים, צרידות או בכי "מוזר", הקאות חוזרות, חיוורון, רפיון או ישנוניות פתאומית.',
      'אדרנלין (אפיפן) הוא הטיפול היחיד שעוצר אנפילקסיס. אנטיהיסטמין לא מחליף אותו.',
      'תגובה מתרחשת בדרך כלל תוך דקות ועד כשעתיים מהאכילה.',
    ],
  },
  {
    title: 'כמה פעמים עד שאוהבים?', icon: '😋',
    body: [
      'סקירה שיטתית (NIH, 2019) מצאה שחשיפה חוזרת – פעם ביום במשך 8–10 ימים ומעלה – מעלה משמעותית את הקבלה של ירקות ופירות אצל תינוקות ופעוטות.',
      'פרצוף "יאק" הוא לא סירוב! זו תגובה טבעית לטעם חדש (בעיקר מר וחמוץ). לא לוותר אחרי פעם-פעמיים.',
      'האפליקציה סופרת את הטעימות של כל מוצר, כדי שתדעו מתי באמת נתתם צ׳אנס הוגן.',
      'כדאי להציע ירקות ירוקים ומרים מוקדם – חלון הסקרנות של גיל 6–12 חודשים הוא הזדמנות פז.',
    ],
  },
  {
    title: 'איך לעודד טעימות', icon: '🌱',
    body: [
      'חלוקת אחריות (אלין סאטר): ההורה מחליט מה, מתי ואיפה; התינוק מחליט אם ובכמה.',
      'בלי לחץ, שוחד או "עוד כפית אחת". לחץ דווקא מגביר סירוב לאורך זמן.',
      'אוכלים יחד – תינוקות לומדים מחיקוי. תאכלו את אותו מאכל ותראו הנאה.',
      'מגישים מאכל חדש לצד מאכל מוכר ואהוב.',
      'לתת לגעת, למרוח, ללכלך – משחק עם אוכל הוא חלק מהלמידה (גם חשיפה דרך מגע וריח נחשבת).',
      'מגוון צורות הגשה: אותו גזר כפירה, כרצועות, אפוי – כל אחת היא חוויה אחרת.',
      'ארוחות קבועות ונינוחות, בלי מסכים.',
    ],
  },
  {
    title: 'בטיחות וסכנות חנק', icon: '🛑', danger: true,
    body: [
      'תמיד לשבת זקוף בכיסא, תמיד בהשגחה צמודה. לא לאכול בהליכה או ברכב.',
      'סכנות חנק נפוצות: ענבים ועגבניות שרי שלמים (לחתוך לרבעים לאורך), אגוזים ובוטנים שלמים, פופקורן, גזר ותפוח חיים קשים, נקניקיות בפרוסות עגולות, סוכריות, חמאת בוטנים/טחינה סמיכה מהכפית.',
      'דבש – אסור מתחת לגיל שנה (סכנת בוטוליזם), גם לא באפייה.',
      'מלח וסוכר – להימנע ככל האפשר בשנה הראשונה. משקאות ממותקים – לא.',
      'השתנקות (גאגינג) היא רפלקס הגנה רעשני ותקין; חנק הוא שקט. מומלץ לעבור קורס עזרה ראשונה לתינוקות.',
    ],
  },
  {
    title: 'ברזל – רכיב קריטי', icon: '💪',
    body: [
      'מאגרי הברזל שהתינוק נולד איתם מתדלדלים סביב גיל 6 חודשים, ולכן מומלץ לשלב מזון עשיר בברזל מוקדם ובאופן קבוע.',
      'מקורות טובים: בשר בקר, עוף (בעיקר שוק), כבד, ביצה, עדשים, קטניות, דגנים מועשרים.',
      'ויטמין C (פלפל, עגבנייה, תפוז, תות) באותה ארוחה משפר ספיגת ברזל צמחי.',
    ],
  },
  {
    title: 'שתייה', icon: '💧',
    body: [
      'מגיל 6 חודשים אפשר להציע לגימות מים בכוס פתוחה או כוס קשית בזמן הארוחות.',
      'חלב פרה כמשקה עיקרי – רק אחרי גיל שנה (בתוך אוכל – אפשר קודם).',
      'מיצים – לא מומלץ בשנה הראשונה.',
    ],
  },
];

const SOURCES = [
  { name: 'Du Toit et al., NEJM 2015 – מחקר LEAP', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1414850' },
  { name: 'NIAID Addendum Guidelines – 2g חלבון בוטנים 3 פעמים בשבוע (National Peanut Board)', url: 'https://nationalpeanutboard.org/faqs/early-introduction-prevention/' },
  { name: 'CSACI – On the role of ongoing regular ingestion', url: 'https://www.csaci.ca/wp-content/uploads/2022/12/CSACI-Statement-on-the-Role-of-Ongoing-Regular-Ingestion.pdf' },
  { name: 'Nationwide Children\'s – 6–7 גרם בשבוע ב-3 ארוחות', url: 'https://www.nationwidechildrens.org/new-guidelines-early-introduction-peanut-prevent-peanut-allergy' },
  { name: 'EAACI 2020 – Preventing the development of food allergy', url: 'https://portaldeboaspraticas.iff.fiocruz.br/biblioteca/eaaci-guideline-preventing-the-development-of-food-allergy/' },
  { name: 'סקירה: AAP 2019 והמלצות לפי קבוצות סיכון (PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9268235' },
  { name: 'NIH – Repeated exposure and food acceptability (2019)', url: 'https://www.ncbi.nlm.nih.gov/books/NBK582170/' },
  { name: 'AAAAI – Israel: sesame vs peanut allergy', url: 'https://www.aaaai.org/Tools-for-the-Public/Latest-Research-Summaries/The-Journal-of-Allergy-and-Clinical-Immunology-In/2020/foodall' },
  { name: 'Solid Starts – סימני אנפילקסיס בתינוקות', url: 'https://solidstarts.com/articles/signs-anaphylaxis-baby/' },
  { name: 'Solid Starts – הגשת בוטנים', url: 'https://solidstarts.com/foods/peanut/' },
  { name: 'Penn State – Division of Responsibility', url: 'https://thrive.psu.edu/blog/the-division-of-responsibility/' },
  { name: 'ZERO TO THREE – Mealtime tips', url: 'https://www.zerotothree.org/resource/top-5-mealtime-tips-for-a-healthy-start/' },
];
