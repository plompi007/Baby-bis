'use strict';
// איורי SVG למוצרים שאין להם אימוג׳י מדויק משלהם, כדי שכל מוצר ייראה כמו עצמו.
// כל איור מצויר על קנבס 64×64 ומוצג בגודל 1em, כך שהוא מתנהג כמו אימוג׳י (גודל, אנימציה).

const ICONS = (() => {
  // ---------- עזרים ----------
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  // amt>0 מבהיר, amt<0 מכהה
  const sh = (h, amt) => toHex(hex(h).map((v) => (amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const hl = (cx, cy, rx, ry, rot = 0, op = 0.45) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const C = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
  const E = (cx, cy, rx, ry, fill, rot = 0, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})" ${extra}/>`;

  // עלה: בסיס ב-(x,y), מצביע למעלה לפני סיבוב
  const leaf = (x, y, len, w, rot, fill, vein = true) => `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M0 0C${w} ${-len * 0.3} ${w} ${-len * 0.75} 0 ${-len}C${-w} ${-len * 0.75} ${-w} ${-len * 0.3} 0 0Z" fill="${fill}"/>
    ${vein ? `<path d="M0 -2L0 ${-len * 0.88}" stroke="${sh(fill, 0.35)}" stroke-width="1.4" stroke-linecap="round"/>` : ''}</g>`;

  // קערה עם תוכן. top = ציור על פני התוכן
  const bowl = (content, top = '', bowlColor = '#8fb8e8') => `
    <rect x="22" y="52" width="20" height="5" rx="2.5" fill="${sh(bowlColor, -0.25)}"/>
    <path d="M5 30Q5 55 32 55Q59 55 59 30Z" fill="${bowlColor}"/>
    <path d="M9 36Q14 50 30 52" stroke="#fff" stroke-width="2.5" fill="none" opacity=".4" stroke-linecap="round"/>
    ${E(32, 30, 27, 7.5, sh(bowlColor, -0.15))}
    ${E(32, 29.5, 24.5, 6.2, content)}
    <path d="M12 27Q32 17 52 27" fill="${content}"/>
    ${top}`;

  // צנצנת עם תוכן, מכסה ותווית
  const jar = (content, lid, label = '') => `
    <rect x="13" y="17" width="38" height="42" rx="9" fill="#dfeef3"/>
    <rect x="16" y="25" width="32" height="31" rx="6" fill="${content}"/>
    <rect x="14" y="8" width="36" height="12" rx="4" fill="${lid}"/>
    <rect x="14" y="15" width="36" height="3" fill="${sh(lid, -0.2)}"/>
    <rect x="19" y="33" width="26" height="16" rx="3" fill="#fffdf6"/>
    ${label}
    <rect x="17" y="21" width="4" height="30" rx="2" fill="#fff" opacity=".45"/>`;

  // ערימה של גרעינים/פולים. seed(x, y, i) מצייר יחידה אחת
  const pile = (seed, rows = 5, gap = 8.5) => {
    let out = '', i = 0;
    for (let r = 0; r < rows; r++) {
      const n = rows + 1 - r, y = 52 - r * gap * 0.8;
      for (let k = 0; k < n; k++) out += seed(32 + (k - (n - 1) / 2) * gap + (r % 2 ? 1 : -1), y, i++);
    }
    return `<g transform="translate(32 40) scale(1.18) translate(-32 -40)">${out}</g>`;
  };
  // פיזור נקודות קטנות על אזור אליפטי (גרעינים בקערה)
  const dots = (cx, cy, rx, ry, n, colors, r = 1.6) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, d = Math.sqrt((i + 0.5) / n);
      out += C((cx + Math.cos(a) * rx * d).toFixed(1), (cy + Math.sin(a) * ry * d).toFixed(1), r, colors[i % colors.length]);
    }
    return out;
  };
  // פרי עגול בסיסי עם הצללה והבהרה
  const roundFruit = (color, r = 19, cx = 32, cy = 36) =>
    `${C(cx, cy, r, color)}<path d="M${cx + r * 0.3} ${cy + r * 0.95}A${r} ${r} 0 0 0 ${cx + r} ${cy}A${r * 1.1} ${r * 1.1} 0 0 1 ${cx + r * 0.3} ${cy + r * 0.95}Z" fill="${sh(color, -0.2)}"/>${hl(cx - r * 0.38, cy - r * 0.4, r * 0.28, r * 0.18, -35)}`;
  const stem = (x1, y1, x2, y2, c = '#7a5230', w = 3) => `<path d="M${x1} ${y1}Q${(x1 + x2) / 2 + 2} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

  // ---------- איורים ----------
  const I = {};

  // ירקות
  I.zucchini = `<g transform="rotate(-35 32 32)">
    <rect x="6" y="23" width="52" height="18" rx="9" fill="#2f6b2a"/>
    <path d="M11 28H53M11 32H55M11 36H53" stroke="#5f9e45" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    <rect x="1" y="28.5" width="8" height="7" rx="2" fill="#7c8b3a"/>
    <rect x="14" y="25" width="34" height="3" rx="1.5" fill="#fff" opacity=".3"/></g>`;
  I.cauliflower = `${leaf(32, 56, 30, 12, -55, '#5c9e3c')}${leaf(32, 56, 30, 12, 55, '#5c9e3c')}${leaf(32, 58, 22, 10, 0, '#4b8a2f')}
    ${[[22, 32], [42, 32], [32, 26], [26, 40], [38, 40], [32, 34], [17, 39], [47, 39]].map(([x, y]) => C(x, y, 8.5, '#f6efd9', 'stroke="#e1d3ac" stroke-width="1.2"')).join('')}
    ${hl(28, 25, 4, 2.5, -20, 0.7)}`;
  I.spinach = `${leaf(32, 60, 44, 15, -32, '#256b2a')}${leaf(32, 60, 46, 16, 30, '#2e7d32')}${leaf(32, 60, 50, 16, 0, '#1f5f24')}
    <path d="M32 60L32 50M32 60L27 52M32 60L37 52" stroke="#9ccc65" stroke-width="2.5" stroke-linecap="round"/>`;
  I.cabbage = `${C(32, 35, 23, '#9fcf7a')}
    <path d="M10 37Q14 16 34 13Q22 24 24 50Q12 48 10 37Z" fill="#7cb342"/>
    <path d="M54 37Q50 16 30 13Q42 24 40 50Q52 48 54 37Z" fill="#8bc34a"/>
    <path d="M24 30Q32 22 40 30M22 38Q32 28 42 38" stroke="#c5e1a5" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${C(32, 34, 6, '#d4ecbd')}${hl(22, 24, 4, 2.5, -40, 0.5)}`;
  I.chard = `${leaf(26, 60, 50, 17, -12, '#2e6b2c')}${leaf(38, 60, 46, 15, 16, '#3a7d33')}
    <path d="M26 60L21 13M38 60L44 16" stroke="#d32f2f" stroke-width="3.5" stroke-linecap="round"/>`;
  I.kale = (() => {
    const edge = (x, y, len, rot, c) => {
      let o = `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0C12 -14 12 -${len * 0.7} 0 -${len}C-12 -${len * 0.7} -12 -14 0 0Z" fill="${c}"/>`;
      for (let i = 1; i < 6; i++) { const yy = -len * i / 6, w = 10 * Math.sin(Math.PI * i / 6.2); o += C(w, yy, 4.2, c) + C(-w, yy, 4.2, c); }
      return o + `<path d="M0 0L0 -${len * 0.92}" stroke="#7fae6a" stroke-width="2" stroke-linecap="round"/></g>`;
    };
    return edge(26, 60, 46, -14, '#2f5d3a') + edge(38, 60, 44, 16, '#3b6e45');
  })();
  I.celery = `${[[22, -8], [32, 0], [42, 8]].map(([x, r]) => `<g transform="rotate(${r} ${x} 60)"><path d="M${x - 5} 60L${x - 4} 20Q${x} 16 ${x + 4} 20L${x + 5} 60Z" fill="#b5dc7a"/><path d="M${x - 1} 58L${x} 22M${x + 2.5} 58L${x + 2} 24" stroke="#8fbf4f" stroke-width="1.2"/></g>`).join('')}
    ${leaf(20, 20, 14, 6, -30, '#4caf50', false)}${leaf(32, 18, 15, 6, 0, '#43a047', false)}${leaf(44, 20, 14, 6, 30, '#4caf50', false)}
    ${leaf(26, 18, 12, 5, -10, '#66bb6a', false)}${leaf(38, 18, 12, 5, 12, '#66bb6a', false)}`;
  I.greenbean = ['M10 50Q30 44 54 14', 'M8 40Q30 38 52 8', 'M14 58Q36 50 58 24'].map((d, i) =>
    `<path d="${d}" stroke="${['#4f9a2f', '#3f8a24', '#5aa83a'][i]}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".35" stroke-linecap="round" transform="translate(-1.5 -1.5)"/>`).join('');
  I.edamame = `<g transform="rotate(-25 32 32)">
    <path d="M8 34Q8 22 18 23Q26 18 32 24Q38 18 46 23Q56 22 56 34Q56 44 46 42Q38 46 32 40Q26 46 18 42Q8 44 8 34Z" fill="#7cb342"/>
    ${C(18, 33, 6.5, '#8bc34a')}${C(32, 32, 6.5, '#8bc34a')}${C(46, 33, 6.5, '#8bc34a')}
    ${hl(16, 30, 2.5, 1.5)}${hl(30, 29, 2.5, 1.5)}${hl(44, 30, 2.5, 1.5)}
    <path d="M56 34L62 32" stroke="#5a8f2e" stroke-width="2.5" stroke-linecap="round"/></g>`;
  I.beet = `${leaf(28, 24, 20, 8, -25, '#3d8b37')}${leaf(36, 24, 22, 8, 22, '#2e7d32')}
    <path d="M28 24L22 8M36 24L42 6" stroke="#b0154f" stroke-width="2"/>
    ${C(32, 40, 17, '#8e1b4f')}<path d="M32 56Q33 61 36 63" stroke="#8e1b4f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M45 46A17 17 0 0 1 30 57" stroke="#6d123b" stroke-width="5" fill="none" opacity=".6"/>${hl(25, 33, 4.5, 3, -35)}`;
  I.butternut = `<path d="M26 8H38L37 14Q42 18 41 28Q40 33 47 40Q52 47 49 53Q44 60 32 60Q20 60 15 53Q12 47 17 40Q24 33 23 28Q22 18 27 14Z" fill="#f0b45a"/>
    <path d="M17 41Q24 33 23 28M47 41Q40 33 41 28" stroke="#e39a3b" stroke-width="1.5" fill="none"/>
    <path d="M15 52Q20 60 32 60Q44 60 49 53Q44 56 32 56Q22 56 15 52Z" fill="#e39a3b"/>
    <rect x="29" y="3" width="6" height="7" rx="2" fill="#7a5a30"/>${hl(27, 22, 2.5, 6, 0, 0.5)}`;
  I.kohlrabi = `<path d="M24 26L18 8M30 24L28 5M36 24L40 6M41 27L48 11" stroke="#8fbf4f" stroke-width="2.5" stroke-linecap="round"/>
    ${leaf(18, 10, 10, 5, -20, '#66bb6a', false)}${leaf(40, 7, 10, 5, 15, '#66bb6a', false)}${leaf(48, 12, 10, 5, 30, '#4caf50', false)}
    ${C(32, 40, 19, '#c5e1a5')}<path d="M45 52A19 19 0 0 1 22 56" stroke="#a5c97a" stroke-width="5" fill="none"/>
    <path d="M24 26Q20 40 25 56M32 22V58M40 26Q44 40 39 56" stroke="#a9cf7f" stroke-width="1.6" fill="none"/>${hl(25, 32, 5, 3, -35)}`;
  I.okra = `<g transform="rotate(35 32 32)">
    <path d="M26 14Q32 10 38 14L35 58Q32 63 29 58Z" fill="#5a9e3a"/>
    <path d="M29 16L31 58M35 16L33 58" stroke="#3f7d26" stroke-width="1.3"/>
    <path d="M27 8Q32 4 37 8L38 15Q32 18 26 15Z" fill="#4c7a2a"/><rect x="30" y="1" width="4" height="7" rx="2" fill="#6b8f3a"/>
    <rect x="27.5" y="20" width="2" height="26" rx="1" fill="#fff" opacity=".35"/></g>`;
  I.leek = `<g transform="rotate(30 32 32)">
    <path d="M25 4L32 30L39 4Q36 2 34 8L32 18L30 8Q28 2 25 4Z" fill="#2e6b2a"/>
    <path d="M26 26L38 26L37 52Q32 56 27 52Z" fill="#9ccc65"/>
    <path d="M27 40L37 40L37 52Q32 56 27 52Z" fill="#f1f5e3"/>
    <path d="M29 56L27 62M32 57L32 63M35 56L37 62" stroke="#d7c9a7" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="28.5" y="28" width="2" height="22" rx="1" fill="#fff" opacity=".5"/></g>`;
  I.asparagus = [[22, -10], [32, 0], [42, 10]].map(([x, r]) => `<g transform="rotate(${r} ${x} 60)">
    <rect x="${x - 3}" y="16" width="6" height="44" rx="3" fill="#7cb342"/>
    <path d="M${x - 3.5} 18Q${x} 4 ${x + 3.5} 18Z" fill="#5d8a2e"/>
    ${[26, 36, 46].map((y) => `<path d="M${x - 3} ${y}L${x + 1} ${y - 4}L${x + 1} ${y + 1}Z" fill="#5d8a2e"/>`).join('')}</g>`).join('') +
    `<rect x="16" y="44" width="32" height="5" rx="2" fill="#c0392b"/>`;
  I.artichoke = `<rect x="29" y="50" width="6" height="12" rx="2" fill="#6b8f3a"/>
    ${[[32, 54, 26, 20, 0], [20, 52, 20, 13, -40], [44, 52, 20, 13, 40], [26, 46, 22, 11, -18], [38, 46, 22, 11, 18], [32, 40, 22, 11, 0], [26, 34, 16, 8, -12], [38, 34, 16, 8, 12], [32, 28, 16, 8, 0]].map(([x, y, l, w, r], i) =>
      `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0C${w} ${-l * 0.3} ${w * 0.7} ${-l * 0.8} 0 ${-l}C${-w * 0.7} ${-l * 0.8} ${-w} ${-l * 0.3} 0 0Z" fill="${i % 2 ? '#7ea04d' : '#6b8f3a'}"/><path d="M${-w * 0.3} ${-l * 0.85}L0 ${-l}L${w * 0.3} ${-l * 0.85}" fill="#8e6f8e"/></g>`).join('')}`;
  I.fennel = `${[['M24 30Q16 18 12 6', -1], ['M32 28V4', 0], ['M40 30Q48 18 52 6', 1]].map(([d]) => `<path d="${d}" stroke="#8bc34a" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}
    ${[[12, 6], [32, 4], [52, 6]].map(([x, y]) => [0, 1, 2, 3, 4].map((k) => `<path d="M${x} ${y + 4}l${(k - 2) * 3} -6" stroke="#558b2f" stroke-width="1.2" stroke-linecap="round"/>`).join('')).join('')}
    <path d="M14 46Q14 28 32 26Q50 28 50 46Q50 60 32 60Q14 60 14 46Z" fill="#eef3d6"/>
    <path d="M24 30Q20 44 24 58M40 30Q44 44 40 58M32 27V60" stroke="#cfdca5" stroke-width="1.5" fill="none"/>${hl(21, 40, 3, 7, 0, 0.6)}`;

  // פירות
  I.plum = `${roundFruit('#6a1b9a', 19, 32, 38)}<path d="M32 21Q28 36 33 56" stroke="#4a126b" stroke-width="1.6" fill="none" opacity=".7"/>${stem(32, 21, 36, 10)}${leaf(36, 12, 13, 5, 60, '#558b2f', false)}`;
  I.fig = `<path d="M30 8Q34 8 34 12Q50 24 50 40Q50 56 32 57Q14 56 14 40Q14 24 30 12Z" fill="#6d3a7c" transform="translate(-6 0)"/>
    ${hl(16, 30, 3, 6, 10)}
    <g transform="translate(14 14)"><path d="M18 6Q38 18 38 32Q38 46 22 46Q6 46 6 32Q6 18 18 6Z" fill="#7b4a8a"/>
    <path d="M19 11Q33 21 33 32Q33 41 22 41Q11 41 11 32Q11 21 19 11Z" fill="#f2c7b5"/>
    <path d="M20 16Q29 24 29 32Q29 38 22 38Q15 38 15 32Q15 24 20 16Z" fill="#d84f5c"/>
    ${dots(22, 30, 5, 6, 14, ['#fbe3c4'], 0.9)}</g>`;
  I.persimmon = `${E(32, 38, 22, 19, '#f57c00')}<path d="M10 40Q14 56 32 57Q50 56 54 40Q50 52 32 53Q14 52 10 40Z" fill="#e06500"/>
    ${hl(22, 30, 5, 3, -30)}
    ${[0, 90, 180, 270].map((r) => `<g transform="translate(32 20) rotate(${r + 45})"><path d="M0 0C5 -3 9 -2 11 0C9 2 5 3 0 0Z" fill="#5d7f2a"/></g>`).join('')}
    ${C(32, 20, 3.5, '#4b6b22')}<rect x="30.5" y="12" width="3" height="7" rx="1.5" fill="#6d4c2a"/>`;
  I.apricot = `${roundFruit('#ffa94d', 18, 32, 38)}${E(40, 42, 9, 7, '#ff8a3d', -20, 'opacity=".55"')}
    <path d="M32 21Q27 36 31 55" stroke="#e8893a" stroke-width="1.6" fill="none"/>${stem(32, 21, 33, 13)}${leaf(33, 14, 13, 5, -60, '#689f38', false)}`;
  I.nectarine = `${C(32, 38, 19, '#ffcc4d')}<path d="M13 36Q14 20 30 19Q48 19 50 36Q46 46 34 44Q22 44 13 36Z" fill="#d93a2b"/>
    <path d="M14 40Q20 52 34 55" stroke="#e8a838" stroke-width="3" fill="none" opacity=".6"/>
    ${hl(23, 28, 5, 3, -35, 0.6)}<path d="M32 20Q28 36 33 56" stroke="#a82a1e" stroke-width="1.4" fill="none" opacity=".6"/>
    ${stem(32, 20, 34, 12)}${leaf(34, 13, 14, 5, 55, '#558b2f', false)}`;
  I.clementine = `${roundFruit('#fb8c00', 17, 32, 40)}${dots(32, 40, 13, 13, 18, ['#e07800'], 0.7)}
    ${leaf(32, 24, 17, 6, -55, '#2e7d32')}${leaf(32, 24, 15, 5, 40, '#388e3c')}${C(32, 24, 2.5, '#5d4037')}`;
  I.pomelo = `${E(32, 37, 24, 21, '#d4e157')}<path d="M8 39Q12 58 32 58Q52 58 56 39Q50 54 32 54Q14 54 8 39Z" fill="#b5c33f"/>
    ${dots(32, 37, 19, 16, 22, ['#c0cd48'], 0.8)}${hl(21, 27, 6, 3.5, -30, 0.55)}${E(32, 16, 6, 3, '#aab83a')}${C(32, 15, 1.8, '#6d6a2a')}`;
  I.guava = `${roundFruit('#8bc34a', 17, 24, 30)}${stem(24, 13, 22, 7, '#6d4c2a', 2.5)}
    ${C(40, 42, 17, '#7cb342')}${C(40, 42, 14.5, '#f48fb1')}${C(40, 42, 7, '#fbe3d1')}${dots(40, 42, 5.5, 5.5, 10, ['#e8c7a8'], 0.9)}${hl(34, 36, 3, 2, -30, 0.5)}`;
  I.papaya = `<path d="M32 4Q54 10 54 36Q54 60 32 60Q10 60 10 36Q10 10 32 4Z" fill="#8bb33c"/>
    <path d="M32 7Q51 12 51 36Q51 57 32 57Q13 57 13 36Q13 12 32 7Z" fill="#ff7a3c"/>
    <path d="M32 20Q42 24 42 38Q42 50 32 50Q22 50 22 38Q22 24 32 20Z" fill="#f9a35a"/>
    ${dots(32, 37, 7, 10, 18, ['#2b1d16', '#3e2723'], 1.9)}${hl(20, 24, 3, 7, 10, 0.4)}`;
  I.raisin = [[22, 40, -20], [38, 36, 25], [30, 50, 5], [44, 50, -15], [16, 52, 30]].map(([x, y, r]) =>
    `${E(x, y, 9, 7, '#4e342e', r)}<path d="M${x - 5} ${y - 1}Q${x} ${y + 3} ${x + 5} ${y - 2}M${x - 4} ${y + 3}Q${x} ${y + 5} ${x + 3} ${y + 2}" stroke="#7a5446" stroke-width="1.2" fill="none"/>${hl(x - 3, y - 3, 2.5, 1.2, r, 0.35)}`).join('');
  I.raspberry = `${[[32, 22], [24, 26], [40, 26], [20, 34], [28, 32], [36, 32], [44, 34], [22, 42], [30, 40], [38, 40], [42, 44], [26, 48], [34, 48], [30, 55], [38, 52]].map(([x, y]) => `${C(x, y, 6, '#d81b60')}${hl(x - 2, y - 2, 1.8, 1.2, -30, 0.55)}`).join('')}
    ${[0, 72, 144, 216, 288].map((r) => `<g transform="translate(32 16) rotate(${r})"><path d="M0 0L-3 -8L3 -8Z" fill="#558b2f"/></g>`).join('')}`;
  I.pomegranate = `${roundFruit('#c62828', 20, 32, 38)}
    <path d="M25 19L26 12L29 16L32 10L35 16L38 12L39 19Z" fill="#a51f1f"/>${E(32, 19, 7, 2.5, '#8e1b1b')}`;
  I.lychee = `${C(24, 34, 15, '#d32f2f')}${dots(24, 34, 12, 12, 26, ['#a92424'], 1.2)}${hl(18, 28, 3.5, 2, -30, 0.4)}
    ${C(42, 44, 13, '#f7f1e3')}${C(42, 44, 13, '#fff', 'opacity=".35"')}${E(42, 44, 6, 8, '#efe4cc', 0, 'opacity=".7"')}${hl(37, 38, 3.5, 2.2, -30, 0.9)}`;
  I.loquat = `${leaf(30, 30, 30, 9, -50, '#2e6b2a')}
    ${E(26, 42, 12, 14, '#ffb300', -10)}${E(42, 40, 12, 14, '#ffa000', 12)}
    ${C(26, 29, 2, '#6d4c2a')}${C(42, 27, 2, '#6d4c2a')}${hl(21, 37, 3, 4, -10)}${hl(37, 35, 3, 4, 10)}`;
  I.date = [[20, 40, -30], [34, 34, 15], [44, 46, -10]].map(([x, y, r]) =>
    `${E(x, y, 9, 16, '#6d3a1e', r)}<path d="M${x - 3} ${y - 9}Q${x + 2} ${y} ${x - 2} ${y + 9}M${x + 3} ${y - 6}Q${x + 5} ${y + 2} ${x + 2} ${y + 8}" stroke="#4a2410" stroke-width="1.3" fill="none" transform="rotate(${r} ${x} ${y})"/>${hl(x - 3, y - 6, 2, 4, r, 0.4)}`).join('');

  // דגנים וקערות
  I.oat = bowl('#e9d6a9', [[22, 26, 20], [32, 24, -10], [42, 27, 30], [27, 31, -30], [38, 31, 5]].map(([x, y, r]) => E(x, y, 4.5, 3, '#f6ead0', r, 'stroke="#c9b07a" stroke-width=".8"')).join(''));
  I.semolina = bowl('#f4e3b3', `<path d="M20 27Q32 20 44 27Q32 33 24 28" stroke="#e2c785" stroke-width="1.6" fill="none"/>${C(32, 27, 3, '#fff6dc')}`);
  I.couscous = bowl('#f0cf72', dots(32, 27, 20, 5, 70, ['#e2b94e', '#f7dc8c', '#d9a93a'], 0.9));
  I.quinoa = bowl('#efe4cb', dots(32, 27, 20, 5, 60, ['#f6eedb', '#c0392b', '#3e2723', '#e8d9b5'], 1.3));
  I.bulgur = bowl('#d4a15a', dots(32, 27, 20, 5, 70, ['#b8823e', '#e6bd7a', '#a46d2e'], 1));
  I.ptitim = bowl('#f3e6c4', dots(32, 26, 20, 5, 36, ['#fbf3dc', '#ecdcb2'], 2.3));
  I.ricotta = bowl('#fbf7ee', [[22, 25], [32, 22], [42, 25], [28, 28], [38, 28]].map(([x, y]) => C(x, y, 6, '#fffdf8', 'stroke="#ece4d2" stroke-width="1"')).join(''), '#e8a87c');
  I.zaatar = bowl('#7d8538', dots(32, 27, 20, 5, 34, ['#efe2c4'], 1.1) + leaf(46, 26, 16, 5, 30, '#6b8f3a'), '#d9b38c');
  I.spelt = `<path d="M32 62V20" stroke="#a0763a" stroke-width="2.5" stroke-linecap="round"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => { const y = 46 - k * 6.5; return E(27, y, 4, 6.5, '#c08a3e', -30) + E(37, y, 4, 6.5, '#b47c34', 30) + `<path d="M25 ${y - 5}L18 ${y - 16}M39 ${y - 5}L46 ${y - 16}" stroke="#c9a060" stroke-width="1"/>`; }).join('')}
    ${E(32, 12, 3.5, 6, '#c08a3e')}`;
  I.barley = pile((x, y, i) => `${E(x, y, 4.2, 3.2, i % 3 ? '#efe6d2' : '#e3d6b8', (i * 37) % 60 - 30)}<path d="M${x - 2} ${y}H${x + 2}" stroke="#bfae86" stroke-width="1"/>`);
  I.millet = pile((x, y, i) => `${C(x, y, 3.6, i % 3 ? '#f4c430' : '#e6b422')}${C(x - 1, y - 1, 1.1, '#fff', 'opacity=".6"')}`, 6, 7);
  I.buckwheat = pile((x, y, i) => `<path d="M${x} ${y - 4.5}L${x + 4.5} ${y + 3.5}L${x - 4.5} ${y + 3.5}Z" fill="${i % 2 ? '#8d5a3b' : '#a06a45'}" stroke="${i % 2 ? '#8d5a3b' : '#a06a45'}" stroke-width="2" stroke-linejoin="round" transform="rotate(${(i * 47) % 120} ${x} ${y})"/>`);
  I.polenta = `<path d="M8 42L32 54L56 42L56 30L32 42L8 30Z" fill="#e3a51e"/><path d="M8 30L32 18L56 30L32 42Z" fill="#fbc934"/>
    <path d="M32 42V54" stroke="#c98c12" stroke-width="1"/>
    <path d="M16 30L32 22M22 33L38 25M28 36L44 28" stroke="#e8a92a" stroke-width="2" stroke-linecap="round"/>
    ${leaf(40, 28, 14, 3, 70, '#5d7f2a')}${hl(22, 29, 5, 2, -27, 0.5)}`;

  // חלבונים
  I.liver = `<path d="M8 34Q8 18 26 18Q34 18 36 24Q42 16 52 20Q60 26 56 38Q50 52 32 52Q12 50 8 34Z" fill="#7b1f2a"/>
    <path d="M36 24Q34 36 40 48" stroke="#5a1520" stroke-width="2" fill="none"/>${hl(20, 26, 7, 3, -15, 0.35)}${hl(46, 26, 4, 2, 20, 0.3)}`;
  I.bakedegg = `<path d="M14 36L18 58H46L50 36Z" fill="#ffcc80"/>
    ${[22, 28, 34, 40, 46].map((x) => `<path d="M${x - 3} 37L${x - 2} 57" stroke="#f0a95a" stroke-width="1.4"/>`).join('')}
    <path d="M10 37Q10 18 32 18Q54 18 54 37Q44 41 32 39Q20 41 10 37Z" fill="#d99a4e"/>
    ${E(32, 26, 11, 7, '#fffdf5')}${C(32, 26, 5, '#ffb300')}${hl(29, 24, 1.8, 1.2, 0, 0.8)}${hl(18, 27, 3, 2, -30, 0.35)}`;
  I.salmon = `<path d="M6 30Q10 18 30 18L56 22Q60 34 54 44L28 48Q8 46 6 30Z" fill="#ff8a65"/>
    <path d="M6 30Q8 44 28 48L54 44Q56 50 50 52L26 54Q4 50 6 30Z" fill="#c75a3e"/>
    ${[16, 26, 36, 46].map((x) => `<path d="M${x} 20Q${x + 6} 32 ${x - 2} 46" stroke="#ffd2c2" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}${hl(20, 24, 6, 2, -10, 0.4)}`;
  I.tuna = `<path d="M10 30V50Q10 58 32 58Q54 58 54 50V30Z" fill="#b0bec5"/>
    <path d="M10 34V46Q10 52 32 52Q54 52 54 46V34Q54 40 32 40Q10 40 10 34Z" fill="#1e88e5"/>
    <path d="M24 44Q30 40 38 44Q30 48 24 44ZM38 44L42 41V47Z" fill="#fff"/>
    ${E(32, 30, 22, 8, '#90a4ae')}${E(32, 30, 19, 6.5, '#d9a48c')}
    <path d="M18 29Q24 26 28 30M30 27Q36 25 40 29M38 31Q42 28 46 31" stroke="#b97c63" stroke-width="1.5" fill="none" stroke-linecap="round"/>${hl(16, 44, 2, 6, 0, 0.35)}`;
  I.sardine = [[30, 26, -20, '#78909c'], [34, 42, 15, '#8fa3ad']].map(([x, y, r, c]) => `<g transform="rotate(${r} ${x} ${y})">
    <path d="M${x - 22} ${y}Q${x - 10} ${y - 9} ${x + 12} ${y - 2}L${x + 22} ${y - 8}L${x + 20} ${y}L${x + 22} ${y + 8}L${x + 12} ${y + 2}Q${x - 10} ${y + 9} ${x - 22} ${y}Z" fill="${c}"/>
    <path d="M${x - 20} ${y - 1}Q${x - 6} ${y - 7} ${x + 12} ${y - 2}" stroke="#455a64" stroke-width="3" fill="none"/>
    <path d="M${x - 18} ${y + 2}Q${x - 4} ${y + 5} ${x + 10} ${y + 1}" stroke="#eceff1" stroke-width="1.6" fill="none"/>
    ${C(x - 16, y - 1, 1.6, '#263238')}</g>`).join('');
  I.whitefish = `<path d="M6 32Q8 20 26 20L54 24Q60 34 54 44L26 46Q8 44 6 32Z" fill="#fbf6ec" stroke="#e9dfcc" stroke-width="1.5"/>
    ${[18, 28, 38, 48].map((x) => `<path d="M${x} 22Q${x + 5} 33 ${x - 1} 45" stroke="#e7dcc5" stroke-width="1.6" fill="none"/>`).join('')}
    ${C(50, 48, 9, '#fdd835')}${C(50, 48, 7, '#fff59d')}${[0, 60, 120].map((r) => `<path d="M50 48l0 -6" stroke="#fdd835" stroke-width="1" transform="rotate(${r} 50 48)"/><path d="M50 48l0 6" stroke="#fdd835" stroke-width="1" transform="rotate(${r} 50 48)"/>`).join('')}`;
  I.tofu = `<path d="M10 24L32 14L54 24L32 34Z" fill="#ffffff" stroke="#e3e8ea" stroke-width="1"/>
    <path d="M10 24V46L32 56V34Z" fill="#eef1f2"/><path d="M54 24V46L32 56V34Z" fill="#d5dcdf"/>
    ${hl(26, 22, 6, 2, -24, 0.9)}${C(44, 42, 1.3, '#c2cbcf')}${C(20, 40, 1.2, '#dfe4e6')}`;

  // קטניות
  I.chickpea = pile((x, y, i) => `${C(x, y, 4.6, i % 3 ? '#e6c38a' : '#d9b277')}<path d="M${x - 1} ${y - 4}Q${x + 1} ${y - 1} ${x} ${y + 1}" stroke="#c49a5e" stroke-width="1" fill="none"/>${C(x - 1.6, y - 1.6, 1.2, '#fff', 'opacity=".5"')}`, 5, 9);
  I.fava = [[20, 44, -30], [36, 38, 10], [46, 50, -10], [28, 54, 20], [30, 26, -15]].map(([x, y, r]) =>
    `${E(x, y, 10, 7, '#8bbf5b', r)}${E(x, y, 7, 4.5, '#a3cf75', r)}<path d="M${x + 7} ${y - 2}Q${x + 9} ${y} ${x + 7} ${y + 2}" stroke="#3e5d22" stroke-width="2" fill="none" transform="rotate(${r} ${x} ${y})"/>`).join('');
  I.mungbean = pile((x, y, i) => `${E(x, y, 3.6, 2.6, i % 2 ? '#4e8f2e' : '#5aa03a', (i * 29) % 80 - 40)}${C(x, y - 1, 0.7, '#e8f5d0')}`, 6, 7);
  I.lentil = pile((x, y, i) => `${E(x, y, 4, 2.6, i % 2 ? '#ff8a50' : '#f57c3a', (i * 31) % 50 - 25)}${hl(x - 1, y - 1, 1.5, 0.7, 0, 0.5)}`, 6, 7);
  I.blacklentil = pile((x, y, i) => `${E(x, y, 4, 2.8, i % 2 ? '#263238' : '#37474f', (i * 31) % 50 - 25)}${hl(x - 1, y - 1, 1.5, 0.7, 0, 0.45)}`, 6, 7);
  I.hummus = `${E(32, 40, 28, 15, '#e7eef5')}${E(32, 38, 23, 11, '#e9cf9c')}
    <path d="M14 38Q32 26 50 38Q32 46 20 40" stroke="#d4b47a" stroke-width="2" fill="none"/>
    ${E(32, 38, 8, 4, '#b5b03a', 0, 'opacity=".85"')}${[[30, 37], [34, 39], [32, 36]].map(([x, y]) => C(x, y, 2.2, '#e6c38a')).join('')}
    ${[[20, 34], [44, 36], [38, 44], [24, 43]].map(([x, y]) => C(x, y, 1.2, '#c0392b')).join('')}`;

  // מוצרי חלב
  I.yogurt = `<path d="M14 22L19 58H45L50 22Z" fill="#ffffff" stroke="#dfe7ee" stroke-width="1.2"/>
    <path d="M16 34L17.5 46H46.5L48 34Z" fill="#64b5f6"/>${E(32, 22, 18, 4.5, '#eef5fb')}
    <path d="M14 22Q22 12 40 14L50 22Z" fill="#c5d8e8"/><path d="M40 14Q48 6 54 10" stroke="#c5d8e8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="18" y="26" width="3" height="28" rx="1.5" fill="#fff" opacity=".7"/>`;
  I.cottage = `<path d="M10 30L14 56H50L54 30Z" fill="#ffffff" stroke="#dfe7ee" stroke-width="1.2"/>
    <path d="M12 40L13 48H51L52 40Z" fill="#43a047"/>
    ${[[18, 28], [25, 25], [32, 27], [39, 24], [46, 28], [22, 31], [30, 31], [38, 30], [44, 32], [28, 22], [36, 21]].map(([x, y]) => C(x, y, 4, '#fbfbf7', 'stroke="#dcdcd2" stroke-width=".9"')).join('')}`;
  I.whitecheese = `<path d="M8 32L12 54H52L56 32Z" fill="#ffffff" stroke="#dfe7ee" stroke-width="1.2"/>
    <path d="M10 40L11 47H53L54 40Z" fill="#1e88e5"/>${E(32, 32, 24, 6, '#f3f6f9')}${E(32, 31, 21, 4.5, '#fffefb')}
    <path d="M20 31Q32 27 44 31" stroke="#ebe6da" stroke-width="1.5" fill="none"/>`;
  I.mozzarella = `${C(26, 40, 16, '#fffdf6')}${C(42, 44, 12, '#fbf7ea')}<path d="M30 55A16 16 0 0 0 42 44" stroke="#eae2cc" stroke-width="3" fill="none"/>
    ${hl(20, 33, 5, 3, -35, 0.95)}${leaf(42, 30, 18, 7, 40, '#2e7d32')}`;
  I.feta = `<path d="M10 28L32 18L54 28L32 38Z" fill="#ffffff" stroke="#e6e9eb" stroke-width="1"/>
    <path d="M10 28V48L32 58V38Z" fill="#f2f4f5"/><path d="M54 28V48L32 58V38Z" fill="#dde3e6"/>
    ${[[24, 28], [38, 26], [30, 31], [18, 40], [24, 46], [42, 44], [48, 38]].map(([x, y]) => C(x, y, 1.4, '#c9d1d5')).join('')}
    ${C(52, 54, 3, '#ffffff')}${C(57, 52, 2, '#f2f4f5')}`;
  I.goatcheese = `<path d="M10 32Q10 22 18 22H48V48H18Q10 48 10 38Z" fill="#f5f5f2"/>
    <path d="M10 32Q10 22 18 22H48V26H18Q12 26 11 32Z" fill="#b8bfc2" opacity=".7"/>
    ${E(48, 35, 7, 13, '#fffefa', 0, 'stroke="#aeb6ba" stroke-width="2"')}${E(48, 35, 4, 8, '#ffffff')}
    ${leaf(26, 54, 14, 4, -70, '#6b8f3a')}${hl(22, 30, 7, 2, 0, 0.7)}`;
  I.labane = jar('#d9d27a', '#7cb342', `${C(26, 41, 4.5, '#fffdf4')}${C(35, 39, 4.5, '#fffdf4')}${C(30, 45, 4, '#fffdf4')}${C(39, 45, 4, '#fffdf4')}`)
    .replace('fill="#d9d27a"/>', 'fill="#d9d27a"/>' + [[22, 30], [34, 28], [42, 31], [26, 52], [40, 52]].map(([x, y]) => C(x, y, 4.5, '#fffdf4')).join(''));

  // תבלינים ועשבים
  I.cumin = pile((x, y, i) => `${E(x, y, 4.2, 1.8, i % 2 ? '#9c7a3c' : '#8a6a32', (i * 41) % 140 - 70)}`, 6, 6.5);
  I.cinnamon = [[22, -20], [32, -5], [42, 10]].map(([x, r]) => `<g transform="rotate(${r} ${x} 36)">
    <rect x="${x - 5}" y="8" width="10" height="52" rx="3" fill="#a0522d"/><rect x="${x - 5}" y="8" width="4" height="52" rx="2" fill="#8b4513"/>
    ${E(x, 9, 5, 2.5, '#c27a4a')}<path d="M${x - 3} 9Q${x} 6 ${x + 3} 9Q${x} 12 ${x - 1} 9" stroke="#7a3a12" stroke-width="1" fill="none"/>
    <rect x="${x + 1}" y="12" width="2" height="44" rx="1" fill="#fff" opacity=".25"/></g>`).join('');
  I.turmeric = `<path d="M8 48Q4 38 14 34L30 30Q38 26 40 34Q44 30 50 34Q54 40 46 44L22 54Q10 56 8 48Z" fill="#c98a3c"/>
    <path d="M12 46Q20 40 30 38M34 40Q40 38 46 40" stroke="#a86f2a" stroke-width="1.4" fill="none"/>
    ${E(43, 40, 6, 5, '#f39c12')}${C(43, 40, 3.5, '#f7b733')}
    <path d="M30 58Q36 42 50 46Q62 50 60 58Z" fill="#f6b818"/>${hl(46, 50, 4, 1.5, -15, 0.4)}`;
  const herbStem = (d) => `<path d="${d}" stroke="#5a8f2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  I.mint = `${herbStem('M32 62V12')}${[[50, 22, 13, 8], [40, 19, 12, 7.5], [30, 16, 11, 7], [20, 13, 9, 5.5]].map(([y, len, w, , ], i) =>
      leaf(32, y, len, w * 0.75, -62, i % 2 ? '#43a047' : '#4caf50') + leaf(32, y, len, w * 0.75, 62, i % 2 ? '#4caf50' : '#43a047')).join('')}${leaf(32, 14, 10, 4.5, 0, '#66bb6a')}`;
  I.dill = `${herbStem('M32 62V14')}${herbStem('M32 34Q22 26 16 12')}${herbStem('M32 30Q42 22 48 10')}
    ${[[16, 12], [48, 10], [32, 14], [24, 22], [40, 20]].map(([x, y]) => [0, 40, 80, 120, 160, 200, 240, 280, 320].map((r) => `<path d="M${x} ${y}l0 -7" stroke="#6a9e3a" stroke-width="1.1" stroke-linecap="round" transform="rotate(${r} ${x} ${y})"/>`).join('')).join('')}`;
  I.cilantro = (() => {
    const lobe = (x, y, s, c) => `${C(x, y - 4 * s, 4.2 * s, c)}${C(x - 4 * s, y, 4 * s, c)}${C(x + 4 * s, y, 4 * s, c)}${C(x, y, 3 * s, c)}`;
    return `${herbStem('M32 62Q30 40 20 22')}${herbStem('M32 62Q34 40 46 20')}${herbStem('M32 62V28')}
      ${lobe(20, 22, 1.2, '#388e3c')}${lobe(46, 20, 1.2, '#43a047')}${lobe(32, 26, 1.3, '#2e7d32')}${lobe(26, 40, 0.9, '#4caf50')}${lobe(40, 38, 0.9, '#43a047')}`;
  })();
  I.parsley = `${herbStem('M32 62Q26 40 18 24')}${herbStem('M32 62Q38 40 46 22')}${herbStem('M32 62V22')}
    ${[[18, 22], [46, 20], [32, 18], [24, 30], [40, 28]].map(([x, y], i) => [[0, 0], [-4, -3], [4, -3], [-3, 3], [3, 3], [0, -6]].map(([dx, dy]) => C(x + dx, y + dy, 3.4, i % 2 ? '#1b5e20' : '#2e7d32')).join('')).join('')}`;
  I.basil = `${herbStem('M32 62V30')}${leaf(32, 46, 26, 13, -48, '#2e7d32')}${leaf(32, 42, 26, 13, 46, '#388e3c')}${leaf(32, 32, 26, 12, 0, '#1f6b25')}
    ${hl(22, 30, 3.5, 6, -48, 0.4)}${hl(42, 26, 3.5, 6, 46, 0.4)}${hl(30, 16, 2.5, 5, 0, 0.4)}`;

  // ממרחים וצנצנות
  const peanutMini = `<path d="M27 37Q24 41 27 44Q30 47 32 44Q34 47 37 44Q40 41 37 37Q34 34 32 37Q30 34 27 37Z" fill="#c68642"/>`;
  I.peanutbutter = jar('#b9783a', '#d32f2f', peanutMini);
  I.almondbutter = jar('#d9a066', '#7cb342', `${E(32, 41, 4.5, 7, '#b5703a', 90)}<path d="M28 41H36" stroke="#8a5228" stroke-width="1"/>`);
  I.tahini = jar('#e3c99a', '#1565c0', dots(32, 41, 9, 4, 9, ['#c9a86a'], 1.3));
  I.oliveoil = `<rect x="27" y="2" width="10" height="8" rx="2" fill="#5d4037"/>
    <path d="M27 10H37V18Q46 22 46 32V58Q46 62 42 62H22Q18 62 18 58V32Q18 22 27 18Z" fill="#7d8a2a" opacity=".9"/>
    <path d="M21 34H43V58Q43 59 42 59H22Q21 59 21 58Z" fill="#c8c43a"/>
    <rect x="22" y="38" width="20" height="14" rx="2" fill="#fffdf2"/>${E(29, 45, 3, 4.5, '#556b2f', 20)}${E(35, 45, 3, 4.5, '#6b8e23', -20)}
    <rect x="21" y="22" width="3" height="34" rx="1.5" fill="#fff" opacity=".35"/>`;
  I.halva = `<path d="M8 28L32 16L56 28L32 40Z" fill="#e2cba3"/><path d="M8 28V44L32 56V40Z" fill="#d4b98b"/><path d="M56 28V44L32 56V40Z" fill="#c4a674"/>
    <path d="M16 28Q24 22 30 28T44 26M22 32Q30 28 38 32" stroke="#a1785b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M12 40Q18 38 22 44M38 48Q46 42 52 40" stroke="#a1785b" stroke-width="1.5" fill="none"/>`;
  I.bamba = [[18, 44, -30], [32, 36, 10], [44, 48, -15]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">
    <path d="M${x - 14} ${y}Q${x - 14} ${y - 7} ${x - 7} ${y - 7}Q${x - 3} ${y - 9} ${x} ${y - 7}Q${x + 4} ${y - 9} ${x + 7} ${y - 7}Q${x + 14} ${y - 7} ${x + 14} ${y}Q${x + 14} ${y + 7} ${x + 7} ${y + 7}Q${x + 3} ${y + 9} ${x} ${y + 7}Q${x - 4} ${y + 9} ${x - 7} ${y + 7}Q${x - 14} ${y + 7} ${x - 14} ${y}Z" fill="#f6c23e"/>
    <path d="M${x - 10} ${y + 4}Q${x} ${y + 7} ${x + 10} ${y + 4}" stroke="#e0a526" stroke-width="2" fill="none"/>${hl(x - 5, y - 3, 4, 1.5, 0, 0.5)}</g>`).join('');
  I.groundsesame = pile((x, y, i) => `<path d="M${x} ${y - 3.5}Q${x + 2.6} ${y} ${x} ${y + 3.5}Q${x - 2.6} ${y} ${x} ${y - 3.5}Z" fill="${i % 3 ? '#f3e6c6' : '#e6d4a8'}" stroke="#cdb886" stroke-width=".6" transform="rotate(${(i * 53) % 160 - 80} ${x} ${y})"/>`, 7, 6);

  // אגוזים
  const almondShape = (x, y, r, c) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x} ${y - 16}Q${x + 11} ${y - 2} ${x + 7} ${y + 8}Q${x} ${y + 14} ${x - 7} ${y + 8}Q${x - 11} ${y - 2} ${x} ${y - 16}Z" fill="${c}"/>
    ${[-3, 0, 3].map((d) => `<path d="M${x + d} ${y - 10}Q${x + d * 1.4} ${y} ${x + d} ${y + 9}" stroke="${sh(c, -0.25)}" stroke-width="1" fill="none"/>`).join('')}${hl(x - 3, y - 4, 1.6, 5, 0, 0.35)}</g>`;
  I.almond = almondShape(24, 36, -25, '#b5703a') + almondShape(40, 38, 20, '#a8622e');
  I.walnut = `<path d="M32 10Q50 10 52 30Q54 50 34 56Q32 57 30 56Q10 50 12 30Q14 10 32 10Z" fill="#c8935a"/>
    <path d="M32 12V55" stroke="#8d5a2b" stroke-width="2.5"/>
    <path d="M18 22Q24 26 20 32Q16 38 22 42Q26 46 22 50M46 22Q40 26 44 32Q48 38 42 42Q38 46 42 50M26 16Q28 22 26 28M38 16Q36 22 38 28" stroke="#9e6b36" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${hl(20, 20, 3, 2, -30, 0.35)}`;
  const cashewShape = (x, y, r, c) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 14} ${y - 6}Q${x - 16} ${y + 12} ${x} ${y + 13}Q${x + 14} ${y + 12} ${x + 15} ${y - 4}Q${x + 13} ${y - 10} ${x + 7} ${y - 6}Q${x + 6} ${y + 3} ${x} ${y + 3}Q${x - 6} ${y + 3} ${x - 7} ${y - 6}Q${x - 11} ${y - 11} ${x - 14} ${y - 6}Z" fill="${c}"/>${hl(x - 8, y + 3, 2, 4, 30, 0.45)}</g>`;
  I.cashew = cashewShape(26, 28, -15, '#f0d3a0') + cashewShape(38, 44, 20, '#e8c78e');
  I.pistachio = `<g transform="rotate(-20 32 34)"><path d="M14 34Q14 14 32 12Q50 14 50 34Q50 54 32 56Q14 54 14 34Z" fill="#e8d3a6"/>
    <path d="M22 34Q22 20 32 18Q42 20 42 34Q42 48 32 50Q22 48 22 34Z" fill="#8e5b7a"/><path d="M25 34Q25 23 32 22Q39 23 39 34Q39 45 32 46Q25 45 25 34Z" fill="#8bc34a"/>
    <path d="M16 30Q12 34 16 38" stroke="#cdb48a" stroke-width="1.5" fill="none"/>${hl(29, 28, 2.5, 5, 0, 0.45)}</g>`;
  I.macadamia = `${C(22, 38, 14, '#6d4c2f')}${C(24, 36, 10, '#f3e5c0')}${hl(21, 32, 3, 2, -30, 0.6)}
    ${C(44, 42, 12, '#f3e5c0')}<path d="M54 46A12 12 0 0 1 38 52" stroke="#e0cc9c" stroke-width="3" fill="none"/>${hl(40, 37, 3, 2, -30, 0.7)}`;
  const brazil = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 18} ${y + 4}Q${x - 18} ${y - 6} ${x - 6} ${y - 8}L${x + 16} ${y - 4}Q${x + 20} ${y + 2} ${x + 14} ${y + 6}L${x - 6} ${y + 9}Q${x - 18} ${y + 10} ${x - 18} ${y + 4}Z" fill="#6d4c41"/>
    <path d="M${x - 14} ${y + 2}Q${x - 14} ${y - 3} ${x - 6} ${y - 4}L${x + 12} ${y - 1}" stroke="#a1887f" stroke-width="2" fill="none"/>${hl(x - 8, y - 4, 4, 1.4, 5, 0.3)}</g>`;
  I.brazilnut = brazil(30, 28, -20) + brazil(34, 44, 10);
  const pecanShape = (x, y, r) => `<g transform="rotate(${r} ${x} ${y})">${E(x, y, 10, 18, '#8d4b2b')}
    <path d="M${x} ${y - 17}V${y + 17}" stroke="#5d2f18" stroke-width="2"/>
    <path d="M${x - 8} ${y - 8}Q${x - 3} ${y - 4} ${x - 8} ${y}Q${x - 3} ${y + 4} ${x - 8} ${y + 8}M${x + 8} ${y - 8}Q${x + 3} ${y - 4} ${x + 8} ${y}Q${x + 3} ${y + 4} ${x + 8} ${y + 8}" stroke="#b5703a" stroke-width="1.8" fill="none"/></g>`;
  I.pecan = pecanShape(24, 34, -25) + pecanShape(42, 36, 18);
  I.pinenut = pile((x, y, i) => `<path d="M${x} ${y - 6}Q${x + 3.4} ${y - 1} ${x + 2} ${y + 4}Q${x} ${y + 6} ${x - 2} ${y + 4}Q${x - 3.4} ${y - 1} ${x} ${y - 6}Z" fill="${i % 2 ? '#f3e2b8' : '#ead3a0'}" stroke="#d4b97c" stroke-width=".6" transform="rotate(${(i * 47) % 140 - 70} ${x} ${y})"/>${C(x, y - 5, 0.9, '#b08a4a')}`, 5, 8);
  I.hazelnut = `${[[24, 36, -15], [42, 40, 15]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})">
    <path d="M${x} ${y - 16}Q${x + 13} ${y - 10} ${x + 12} ${y + 4}Q${x + 10} ${y + 14} ${x} ${y + 14}Q${x - 10} ${y + 14} ${x - 12} ${y + 4}Q${x - 13} ${y - 10} ${x} ${y - 16}Z" fill="#9c5d32"/>
    <path d="M${x - 12} ${y + 4}Q${x - 10} ${y + 14} ${x} ${y + 14}Q${x + 10} ${y + 14} ${x + 12} ${y + 4}Q${x} ${y + 8} ${x - 12} ${y + 4}Z" fill="#d9b88a"/>
    <path d="M${x - 4} ${y - 12}Q${x - 6} ${y - 4} ${x - 5} ${y + 2}" stroke="#7a4522" stroke-width="1" fill="none"/>${hl(x - 5, y - 6, 2.4, 4, 15, 0.45)}</g>`).join('')}`;

  return I;
})();

// HTML של אייקון מוצר: איור SVG אם קיים, אחרת האימוג׳י
function foodIcon(f) {
  if (!f) return '❔';
  const svg = ICONS[f.id];
  return svg ? `<svg class="fi" viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true">${svg}</svg>` : esc(f.emoji);
}
// אייקון לאלרגן: לפי מוצר מייצג (iconFood) או האימוג׳י שלו
function allergenIcon(key) {
  const a = ALLERGENS[key];
  if (!a) return '';
  return a.iconFood ? foodIcon(FOODS.find((f) => f.id === a.iconFood)) : esc(a.emoji);
}
