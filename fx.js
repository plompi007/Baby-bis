'use strict';
// אנימציה ייחודית לכל מוצר: תנועה + אפקט חלקיקים + צבע.
// [תנועה, אפקט, צבע]. כל צירוף של תנועה ואפקט מופיע במוצר אחד בלבד.
//
// תנועות: bounce wiggle spin float pulse jelly swing roll hop shake
//          swim tumble heartbeat peek flip zigzag sway squish orbit tada
// אפקטים: juice (טיפות מיץ), steam (אדים), leaves (עלים), seeds (גרעינים), bubbles (בועות),
//          sparkle (נצנוצים), crumbs (פירורים), swirl (תבלין מסתחרר), pop (פיצוץ), zest (קרני רעננות),
//          hearts (לבבות), shine (ברק), smell (ניחוח), drizzle (זילוף), snow (פתיתים)

const FOOD_FX = {
  // ירקות
  carrot: ['hop', 'crumbs', '#ff9800'],
  sweetpotato: ['heartbeat', 'hearts', '#e67e22'],
  potato: ['tumble', 'steam', '#c8a165'],
  zucchini: ['sway', 'leaves', '#7cb342'],
  pumpkin: ['squish', 'seeds', '#ff8f00'],
  broccoli: ['tada', 'leaves', '#43a047'],
  cauliflower: ['float', 'snow', '#d7d2c4'],
  avocado: ['jelly', 'hearts', '#7cb342'],
  pea: ['bounce', 'pop', '#8bc34a'],
  tomato: ['squish', 'juice', '#e53935'],
  cucumber: ['swing', 'juice', '#9ccc65'],
  eggplant: ['wiggle', 'shine', '#6a1b9a'],
  spinach: ['float', 'leaves', '#2e7d32'],
  beet: ['spin', 'juice', '#ad1457'],
  pepper: ['hop', 'shine', '#e53935'],
  corn: ['shake', 'pop', '#fbc02d'],
  onion: ['orbit', 'smell', '#bcaaa4'],
  mushroom: ['peek', 'sparkle', '#a1887f'],
  butternut: ['heartbeat', 'steam', '#ffa726'],
  greenbean: ['zigzag', 'leaves', '#66bb6a'],
  cabbage: ['jelly', 'leaves', '#81c784'],
  kohlrabi: ['orbit', 'shine', '#aed581'],
  fennel: ['sway', 'smell', '#aed581'],
  chard: ['swing', 'leaves', '#e53935'],
  kale: ['wiggle', 'leaves', '#33691e'],
  celery: ['zigzag', 'juice', '#9ccc65'],
  leek: ['peek', 'steam', '#aed581'],
  asparagus: ['swing', 'steam', '#689f38'],
  okra: ['tumble', 'seeds', '#7cb342'],
  artichoke: ['spin', 'sparkle', '#9ccc65'],

  // פירות
  banana: ['swing', 'hearts', '#fbc02d'],
  apple: ['bounce', 'shine', '#e53935'],
  pear: ['heartbeat', 'juice', '#c0ca33'],
  strawberry: ['pulse', 'hearts', '#e91e63'],
  blueberry: ['hop', 'pop', '#3949ab'],
  grape: ['shake', 'juice', '#7b1fa2'],
  mango: ['jelly', 'juice', '#ffb300'],
  watermelon: ['roll', 'seeds', '#e53935'],
  melon: ['roll', 'juice', '#c0ca33'],
  peach: ['squish', 'hearts', '#ff8a65'],
  plum: ['tada', 'juice', '#6a1b9a'],
  orange: ['spin', 'zest', '#fb8c00'],
  kiwi: ['wiggle', 'seeds', '#7cb342'],
  date: ['float', 'drizzle', '#795548'],
  cherry: ['swing', 'shine', '#c62828'],
  pomegranate: ['pulse', 'seeds', '#c62828'],
  apricot: ['bounce', 'juice', '#ffa726'],
  nectarine: ['peek', 'juice', '#ff7043'],
  fig: ['heartbeat', 'seeds', '#8e24aa'],
  raspberry: ['hop', 'juice', '#d81b60'],
  pineapple: ['tada', 'zest', '#f9a825'],
  papaya: ['jelly', 'seeds', '#ff7043'],
  guava: ['float', 'zest', '#f06292'],
  persimmon: ['squish', 'shine', '#ff6f00'],
  clementine: ['tumble', 'zest', '#ff9800'],
  loquat: ['flip', 'shine', '#ffb300'],
  coconut: ['roll', 'snow', '#8d6e63'],
  pomelo: ['orbit', 'zest', '#c0ca33'],
  lychee: ['peek', 'bubbles', '#f48fb1'],
  raisin: ['shake', 'sparkle', '#6d4c41'],

  // דגנים
  oat: ['float', 'steam', '#c9a26b'],
  rice: ['pulse', 'snow', '#cfc8b8'],
  semolina: ['jelly', 'steam', '#e6c27a'],
  bread: ['bounce', 'crumbs', '#d4a056'],
  pasta: ['wiggle', 'steam', '#f9a825'],
  ptitim: ['shake', 'steam', '#e6c27a'],
  quinoa: ['orbit', 'seeds', '#c9a26b'],
  buckwheat: ['tumble', 'crumbs', '#8d6e63'],
  bulgur: ['shake', 'crumbs', '#c9a26b'],
  couscous: ['zigzag', 'snow', '#e6c27a'],
  pita: ['flip', 'crumbs', '#d4a056'],
  spelt: ['sway', 'crumbs', '#c8a165'],
  barley: ['float', 'bubbles', '#bcaaa4'],
  millet: ['bounce', 'seeds', '#f9a825'],
  polenta: ['squish', 'steam', '#fbc02d'],
  ricecake: ['spin', 'crumbs', '#d7c4a0'],
  ricenoodle: ['swing', 'bubbles', '#d7c4a0'],

  // חלבונים
  chicken: ['tada', 'steam', '#e0a96d'],
  beef: ['wiggle', 'smell', '#a1503a'],
  turkey: ['hop', 'steam', '#c58b5a'],
  liver: ['heartbeat', 'sparkle', '#8e3b3b'],
  hardegg: ['roll', 'shine', '#f9a825'],
  bakedegg: ['flip', 'sparkle', '#ffb300'],
  omelet: ['flip', 'steam', '#fbc02d'],
  salmon: ['swim', 'bubbles', '#ff8a65'],
  whitefish: ['swim', 'sparkle', '#4fc3f7'],
  tofu: ['jelly', 'bubbles', '#bdbdbd'],
  shrimp: ['zigzag', 'bubbles', '#ff7043'],
  lamb: ['swing', 'smell', '#8d4b3a'],
  tuna: ['swim', 'shine', '#5c6bc0'],
  sardine: ['swim', 'pop', '#78909c'],
  seabream: ['swim', 'steam', '#26c6da'],

  // קטניות
  lentil: ['bounce', 'steam', '#ff8a50'],
  chickpea: ['peek', 'seeds', '#e0b46a'],
  hummus: ['squish', 'drizzle', '#d7b98e'],
  bean: ['tumble', 'pop', '#8d4b3a'],
  edamame: ['peek', 'pop', '#7cb342'],
  fava: ['orbit', 'sparkle', '#9e9d24'],
  mungbean: ['zigzag', 'seeds', '#689f38'],
  blacklentil: ['shake', 'seeds', '#424242'],

  // מוצרי חלב
  yogurt: ['jelly', 'drizzle', '#90caf9'],
  whitecheese: ['float', 'sparkle', '#f9e79f'],
  cottage: ['pulse', 'bubbles', '#b0bec5'],
  hardcheese: ['wiggle', 'crumbs', '#ffca28'],
  labane: ['squish', 'bubbles', '#e6d3a3'],
  butter: ['heartbeat', 'drizzle', '#ffd54f'],
  ricotta: ['peek', 'snow', '#d7ccc8'],
  mozzarella: ['tada', 'drizzle', '#fff176'],
  feta: ['tumble', 'snow', '#cfd8dc'],
  goatcheese: ['hop', 'sparkle', '#bdbdbd'],
  kefir: ['orbit', 'bubbles', '#81d4fa'],

  // תבלינים ועשבים
  cinnamon: ['spin', 'swirl', '#8d5524'],
  cumin: ['shake', 'swirl', '#9c6b30'],
  turmeric: ['pulse', 'swirl', '#f9a825'],
  paprika: ['tada', 'swirl', '#d84315'],
  garlic: ['bounce', 'smell', '#bcaaa4'],
  ginger: ['hop', 'zest', '#e0a96d'],
  mint: ['swing', 'zest', '#66bb6a'],
  dill: ['sway', 'sparkle', '#7cb342'],
  cilantro: ['wiggle', 'zest', '#43a047'],
  parsley: ['zigzag', 'sparkle', '#388e3c'],
  basil: ['heartbeat', 'leaves', '#2e7d32'],
  lemon: ['squish', 'zest', '#fbc02d'],
  oliveoil: ['swing', 'drizzle', '#9e9d24'],
  zaatar: ['orbit', 'leaves', '#827717'],

  // אלרגנים
  peanutbutter: ['wiggle', 'drizzle', '#c68642'],
  bamba: ['bounce', 'sparkle', '#fbc02d'],
  tahini: ['jelly', 'sparkle', '#c9a26b'],
  halva: ['tumble', 'sparkle', '#c8a165'],
  almond: ['roll', 'sparkle', '#c68642'],
  walnut: ['wiggle', 'sparkle', '#8d6e63'],
  cashew: ['swing', 'sparkle', '#d7b98e'],
  hazelnut: ['peek', 'crumbs', '#a1887f'],
  pistachio: ['pulse', 'sparkle', '#9ccc65'],
  pecan: ['zigzag', 'crumbs', '#8d4b3a'],
  macadamia: ['roll', 'crumbs', '#d7c4a0'],
  brazilnut: ['tumble', 'shine', '#6d4c41'],
  pinenut: ['float', 'seeds', '#c9a26b'],
  almondbutter: ['squish', 'sparkle', '#d7a86e'],
  groundsesame: ['shake', 'snow', '#d7ccc8'],
};

// משך בסיסי לכל תנועה (שניות). לכל מוצר מוסיפים שינוי קטן במהירות, כדי שגם תנועות זהות לא יסתנכרנו.
const MOTION_DUR = {
  bounce: 1.6, wiggle: 1.4, spin: 3.5, float: 3, pulse: 1.8, jelly: 1.8, swing: 2, roll: 3, hop: 1.4, shake: 1.8,
  swim: 2.6, tumble: 2.4, heartbeat: 1.5, peek: 2.8, flip: 2.6, zigzag: 2.2, sway: 2.6, squish: 1.9, orbit: 3.2, tada: 2.2,
};

// אפקטים שמשתמשים בתו במקום בעיגול צבעוני
const FX_GLYPH = { leaves: '🍃', sparkle: '✦', hearts: '♥', smell: '〜' };

const hashOf = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

FOODS.forEach((f) => {
  const x = FOOD_FX[f.id];
  if (x) [f.anim, f.fx, f.color] = x;
});

// סגנון התנועה של מוצר: משך ייחודי + צבע האפקט
function animStyle(f) {
  const base = MOTION_DUR[f.anim] || 2;
  const dur = base * (0.85 + (hashOf(f.id) % 40) / 100);
  return `animation-duration:${dur.toFixed(2)}s;--fxc:${f.color || '#ff8a65'}`;
}

// שכבת חלקיקים סביב המוצר (בכרטיס המוצר ובחלון הרישום)
function fxHTML(f, count = 8) {
  const fx = f.fx || 'sparkle';
  const glyph = FX_GLYPH[fx] || '';
  return `<span class="fx fx-${fx}" style="--fxc:${f.color || '#ff8a65'}" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<i style="--i:${i}">${glyph}</i>`).join('')}</span>`;
}
