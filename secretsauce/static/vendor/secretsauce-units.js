const $ = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 0.3333333333333333,
  "⅔": 0.6666666666666666,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875
}, h = {
  g: "g",
  gram: "g",
  grams: "g",
  gramm: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  t: "tsp",
  tl: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  el: "tbsp",
  cup: "cup",
  cups: "cup",
  c: "cup",
  clove: "clove",
  cloves: "clove",
  zehe: "clove",
  zehen: "clove",
  piece: "piece",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",
  stück: "piece",
  stk: "piece"
};
function g(o, i = "en") {
  const s = o.trim().replace(/\.$/, "");
  if (!s) return null;
  if (s === "T") return "tbsp";
  if (s === "t") return "tsp";
  const t = s.toLowerCase();
  return h[t] || null;
}
function b(o) {
  const i = o.trim();
  if (!i) return null;
  for (const [t, e] of Object.entries($))
    if (i.includes(t)) {
      const l = i.replace(t, "").trim();
      return (l ? parseFloat(l) : 0) + e;
    }
  if (i.includes("/")) {
    const t = i.split(/\s+/);
    if (t.length === 2) {
      const [e, l] = t[1].split("/").map(Number);
      return parseFloat(t[0]) + e / l;
    } else {
      const [e, l] = t[0].split("/").map(Number);
      return e / l;
    }
  }
  const s = parseFloat(i.replace(",", "."));
  return isNaN(s) ? null : s;
}
function x(o, i = "en") {
  const s = o.trim();
  let t = null, e = s;
  const l = e.match(/\(([^)]+)\)\s*$/);
  if (l && (t = l[1].trim(), e = e.slice(0, l.index).trim()), e.includes(",") && !e.match(/^\d+,\d+\s+[a-zA-Z]/)) {
    const [r, ...n] = e.split(",");
    e = r.trim();
    const c = n.join(",").trim();
    t = t ? `${t}, ${c}` : c;
  }
  const p = e.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+?)\s*(?:-|–|to|bis)\s*([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/i);
  if (p) {
    const [, r, n, c] = p, a = b(r), u = b(n);
    if (a !== null && u !== null) {
      const f = c.split(/\s+/), d = f.length > 0 ? g(f[0], i) : null;
      return {
        rawText: s,
        name: d ? f.slice(1).join(" ") : c.trim(),
        quantity: a,
        quantityMax: u,
        quantityText: `${r}-${n}`.trim(),
        unit: d,
        notes: t
      };
    }
  }
  const m = e.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/);
  if (m) {
    const [, r, n] = m, c = b(r);
    if (c !== null) {
      const a = n.split(/\s+/), u = a.length > 0 ? g(a[0], i) : null;
      return {
        rawText: s,
        name: u ? a.slice(1).join(" ") : n.trim(),
        quantity: c,
        quantityMax: null,
        quantityText: r.trim(),
        unit: u,
        notes: t
      };
    }
  }
  return {
    rawText: s,
    name: e,
    quantity: null,
    quantityMax: null,
    quantityText: null,
    unit: null,
    notes: t
  };
}
const q = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"]
];
function M(o, i, s, t = "en", e = "metric") {
  if (o === null) return "";
  function l(r) {
    if (e === "us_customary") {
      const n = Math.floor(r), c = r - n;
      for (const [a, u] of q)
        if (Math.abs(c - a) <= 0.04)
          return n ? `${n} ${u}` : u;
      return Math.abs(c) < 0.04 ? `${n}` : Math.abs(c - 1) < 0.04 ? `${n + 1}` : r.toFixed(1).replace(/\.0$/, "");
    } else {
      if (Number.isInteger(r)) return `${r}`;
      const n = r.toFixed(2).replace(/\.?0+$/, "");
      return t.startsWith("de") ? n.replace(".", ",") : n;
    }
  }
  const p = l(o), m = i !== null ? `${p}-${l(i)}` : p;
  return s ? `${m} ${s}`.trim() : m;
}
export {
  g as canonical,
  M as format,
  x as parse
};
