import { hasInjectionContext as Sn, inject as Tn, effectScope as Cn, ref as bn, markRaw as he, toRaw as ue, computed as Dn, isRef as ge, isReactive as Je, toRef as Or, reactive as Sr, watch as In, unref as Tr, getCurrentScope as Cr, onScopeDispose as br, nextTick as Dr, toRefs as Ir } from "vue";
var wr = Object.create, wn = Object.defineProperty, kr = Object.getOwnPropertyDescriptor, Qe = Object.getOwnPropertyNames, Rr = Object.getPrototypeOf, Pr = Object.prototype.hasOwnProperty, Vr = (e, t) => function() {
  return e && (t = (0, e[Qe(e)[0]])(e = 0)), t;
}, xr = (e, t) => function() {
  return t || (0, e[Qe(e)[0]])((t = { exports: {} }).exports, t), t.exports;
}, Nr = (e, t, n, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of Qe(t))
      !Pr.call(e, o) && o !== n && wn(e, o, { get: () => t[o], enumerable: !(r = kr(t, o)) || r.enumerable });
  return e;
}, Ur = (e, t, n) => (n = e != null ? wr(Rr(e)) : {}, Nr(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  wn(n, "default", { value: e, enumerable: !0 }),
  e
)), Oe = Vr({
  "../../node_modules/.pnpm/tsup@8.4.0_@microsoft+api-extractor@7.51.1_@types+node@22.13.14__jiti@2.4.2_postcss@8.5_96eb05a9d65343021e53791dd83f3773/node_modules/tsup/assets/esm_shims.js"() {
  }
}), Fr = xr({
  "../../node_modules/.pnpm/rfdc@1.4.1/node_modules/rfdc/index.js"(e, t) {
    Oe(), t.exports = r;
    function n(u) {
      return u instanceof Buffer ? Buffer.from(u) : new u.constructor(u.buffer.slice(), u.byteOffset, u.length);
    }
    function r(u) {
      if (u = u || {}, u.circles) return o(u);
      const s = /* @__PURE__ */ new Map();
      if (s.set(Date, (f) => new Date(f)), s.set(Map, (f, g) => new Map(a(Array.from(f), g))), s.set(Set, (f, g) => new Set(a(Array.from(f), g))), u.constructorHandlers)
        for (const f of u.constructorHandlers)
          s.set(f[0], f[1]);
      let i = null;
      return u.proto ? m : _;
      function a(f, g) {
        const c = Object.keys(f), d = new Array(c.length);
        for (let v = 0; v < c.length; v++) {
          const E = c[v], h = f[E];
          typeof h != "object" || h === null ? d[E] = h : h.constructor !== Object && (i = s.get(h.constructor)) ? d[E] = i(h, g) : ArrayBuffer.isView(h) ? d[E] = n(h) : d[E] = g(h);
        }
        return d;
      }
      function _(f) {
        if (typeof f != "object" || f === null) return f;
        if (Array.isArray(f)) return a(f, _);
        if (f.constructor !== Object && (i = s.get(f.constructor)))
          return i(f, _);
        const g = {};
        for (const c in f) {
          if (Object.hasOwnProperty.call(f, c) === !1) continue;
          const d = f[c];
          typeof d != "object" || d === null ? g[c] = d : d.constructor !== Object && (i = s.get(d.constructor)) ? g[c] = i(d, _) : ArrayBuffer.isView(d) ? g[c] = n(d) : g[c] = _(d);
        }
        return g;
      }
      function m(f) {
        if (typeof f != "object" || f === null) return f;
        if (Array.isArray(f)) return a(f, m);
        if (f.constructor !== Object && (i = s.get(f.constructor)))
          return i(f, m);
        const g = {};
        for (const c in f) {
          const d = f[c];
          typeof d != "object" || d === null ? g[c] = d : d.constructor !== Object && (i = s.get(d.constructor)) ? g[c] = i(d, m) : ArrayBuffer.isView(d) ? g[c] = n(d) : g[c] = m(d);
        }
        return g;
      }
    }
    function o(u) {
      const s = [], i = [], a = /* @__PURE__ */ new Map();
      if (a.set(Date, (c) => new Date(c)), a.set(Map, (c, d) => new Map(m(Array.from(c), d))), a.set(Set, (c, d) => new Set(m(Array.from(c), d))), u.constructorHandlers)
        for (const c of u.constructorHandlers)
          a.set(c[0], c[1]);
      let _ = null;
      return u.proto ? g : f;
      function m(c, d) {
        const v = Object.keys(c), E = new Array(v.length);
        for (let h = 0; h < v.length; h++) {
          const T = v[h], S = c[T];
          if (typeof S != "object" || S === null)
            E[T] = S;
          else if (S.constructor !== Object && (_ = a.get(S.constructor)))
            E[T] = _(S, d);
          else if (ArrayBuffer.isView(S))
            E[T] = n(S);
          else {
            const V = s.indexOf(S);
            V !== -1 ? E[T] = i[V] : E[T] = d(S);
          }
        }
        return E;
      }
      function f(c) {
        if (typeof c != "object" || c === null) return c;
        if (Array.isArray(c)) return m(c, f);
        if (c.constructor !== Object && (_ = a.get(c.constructor)))
          return _(c, f);
        const d = {};
        s.push(c), i.push(d);
        for (const v in c) {
          if (Object.hasOwnProperty.call(c, v) === !1) continue;
          const E = c[v];
          if (typeof E != "object" || E === null)
            d[v] = E;
          else if (E.constructor !== Object && (_ = a.get(E.constructor)))
            d[v] = _(E, f);
          else if (ArrayBuffer.isView(E))
            d[v] = n(E);
          else {
            const h = s.indexOf(E);
            h !== -1 ? d[v] = i[h] : d[v] = f(E);
          }
        }
        return s.pop(), i.pop(), d;
      }
      function g(c) {
        if (typeof c != "object" || c === null) return c;
        if (Array.isArray(c)) return m(c, g);
        if (c.constructor !== Object && (_ = a.get(c.constructor)))
          return _(c, g);
        const d = {};
        s.push(c), i.push(d);
        for (const v in c) {
          const E = c[v];
          if (typeof E != "object" || E === null)
            d[v] = E;
          else if (E.constructor !== Object && (_ = a.get(E.constructor)))
            d[v] = _(E, g);
          else if (ArrayBuffer.isView(E))
            d[v] = n(E);
          else {
            const h = s.indexOf(E);
            h !== -1 ? d[v] = i[h] : d[v] = g(E);
          }
        }
        return s.pop(), i.pop(), d;
      }
    }
  }
});
Oe();
Oe();
Oe();
var kn = typeof navigator < "u", p = typeof window < "u" ? window : typeof globalThis < "u" ? globalThis : typeof global < "u" ? global : {};
typeof p.chrome < "u" && p.chrome.devtools;
kn && (p.self, p.top);
var Et;
typeof navigator < "u" && ((Et = navigator.userAgent) == null || Et.toLowerCase().includes("electron"));
Oe();
var Lr = Ur(Fr()), Br = /(?:^|[-_/])(\w)/g;
function Mr(e, t) {
  return t ? t.toUpperCase() : "";
}
function $r(e) {
  return e && `${e}`.replace(Br, Mr);
}
function Hr(e, t) {
  let n = e.replace(/^[a-z]:/i, "").replace(/\\/g, "/");
  n.endsWith(`index${t}`) && (n = n.replace(`/index${t}`, t));
  const r = n.lastIndexOf("/"), o = n.substring(r + 1);
  {
    const u = o.lastIndexOf(t);
    return o.substring(0, u);
  }
}
var ht = (0, Lr.default)({ circles: !0 });
const Kr = {
  trailing: !0
};
function se(e, t = 25, n = {}) {
  if (n = { ...Kr, ...n }, !Number.isFinite(t))
    throw new TypeError("Expected `wait` to be a finite number");
  let r, o, u = [], s, i;
  const a = (_, m) => (s = jr(e, _, m), s.finally(() => {
    if (s = null, n.trailing && i && !o) {
      const f = a(_, i);
      return i = null, f;
    }
  }), s);
  return function(..._) {
    return s ? (n.trailing && (i = _), s) : new Promise((m) => {
      const f = !o && n.leading;
      clearTimeout(o), o = setTimeout(() => {
        o = null;
        const g = n.leading ? r : a(this, _);
        for (const c of u)
          c(g);
        u = [];
      }, t), f ? (r = a(this, _), m(r)) : u.push(m);
    });
  };
}
async function jr(e, t, n) {
  return await e.apply(t, n);
}
function $e(e, t = {}, n) {
  for (const r in e) {
    const o = e[r], u = n ? `${n}:${r}` : r;
    typeof o == "object" && o !== null ? $e(o, t, u) : typeof o == "function" && (t[u] = o);
  }
  return t;
}
const zr = { run: (e) => e() }, Gr = () => zr, Rn = typeof console.createTask < "u" ? console.createTask : Gr;
function Wr(e, t) {
  const n = t.shift(), r = Rn(n);
  return e.reduce(
    (o, u) => o.then(() => r.run(() => u(...t))),
    Promise.resolve()
  );
}
function Yr(e, t) {
  const n = t.shift(), r = Rn(n);
  return Promise.all(e.map((o) => r.run(() => o(...t))));
}
function Fe(e, t) {
  for (const n of [...e])
    n(t);
}
class qr {
  constructor() {
    this._hooks = {}, this._before = void 0, this._after = void 0, this._deprecatedMessages = void 0, this._deprecatedHooks = {}, this.hook = this.hook.bind(this), this.callHook = this.callHook.bind(this), this.callHookWith = this.callHookWith.bind(this);
  }
  hook(t, n, r = {}) {
    if (!t || typeof n != "function")
      return () => {
      };
    const o = t;
    let u;
    for (; this._deprecatedHooks[t]; )
      u = this._deprecatedHooks[t], t = u.to;
    if (u && !r.allowDeprecated) {
      let s = u.message;
      s || (s = `${o} hook has been deprecated` + (u.to ? `, please use ${u.to}` : "")), this._deprecatedMessages || (this._deprecatedMessages = /* @__PURE__ */ new Set()), this._deprecatedMessages.has(s) || (console.warn(s), this._deprecatedMessages.add(s));
    }
    if (!n.name)
      try {
        Object.defineProperty(n, "name", {
          get: () => "_" + t.replace(/\W+/g, "_") + "_hook_cb",
          configurable: !0
        });
      } catch {
      }
    return this._hooks[t] = this._hooks[t] || [], this._hooks[t].push(n), () => {
      n && (this.removeHook(t, n), n = void 0);
    };
  }
  hookOnce(t, n) {
    let r, o = (...u) => (typeof r == "function" && r(), r = void 0, o = void 0, n(...u));
    return r = this.hook(t, o), r;
  }
  removeHook(t, n) {
    if (this._hooks[t]) {
      const r = this._hooks[t].indexOf(n);
      r !== -1 && this._hooks[t].splice(r, 1), this._hooks[t].length === 0 && delete this._hooks[t];
    }
  }
  deprecateHook(t, n) {
    this._deprecatedHooks[t] = typeof n == "string" ? { to: n } : n;
    const r = this._hooks[t] || [];
    delete this._hooks[t];
    for (const o of r)
      this.hook(t, o);
  }
  deprecateHooks(t) {
    Object.assign(this._deprecatedHooks, t);
    for (const n in t)
      this.deprecateHook(n, t[n]);
  }
  addHooks(t) {
    const n = $e(t), r = Object.keys(n).map(
      (o) => this.hook(o, n[o])
    );
    return () => {
      for (const o of r.splice(0, r.length))
        o();
    };
  }
  removeHooks(t) {
    const n = $e(t);
    for (const r in n)
      this.removeHook(r, n[r]);
  }
  removeAllHooks() {
    for (const t in this._hooks)
      delete this._hooks[t];
  }
  callHook(t, ...n) {
    return n.unshift(t), this.callHookWith(Wr, t, ...n);
  }
  callHookParallel(t, ...n) {
    return n.unshift(t), this.callHookWith(Yr, t, ...n);
  }
  callHookWith(t, n, ...r) {
    const o = this._before || this._after ? { name: n, args: r, context: {} } : void 0;
    this._before && Fe(this._before, o);
    const u = t(
      n in this._hooks ? [...this._hooks[n]] : [],
      r
    );
    return u instanceof Promise ? u.finally(() => {
      this._after && o && Fe(this._after, o);
    }) : (this._after && o && Fe(this._after, o), u);
  }
  beforeEach(t) {
    return this._before = this._before || [], this._before.push(t), () => {
      if (this._before !== void 0) {
        const n = this._before.indexOf(t);
        n !== -1 && this._before.splice(n, 1);
      }
    };
  }
  afterEach(t) {
    return this._after = this._after || [], this._after.push(t), () => {
      if (this._after !== void 0) {
        const n = this._after.indexOf(t);
        n !== -1 && this._after.splice(n, 1);
      }
    };
  }
}
function Pn() {
  return new qr();
}
var Zr = Object.create, Vn = Object.defineProperty, Xr = Object.getOwnPropertyDescriptor, et = Object.getOwnPropertyNames, Jr = Object.getPrototypeOf, Qr = Object.prototype.hasOwnProperty, eo = (e, t) => function() {
  return e && (t = (0, e[et(e)[0]])(e = 0)), t;
}, xn = (e, t) => function() {
  return t || (0, e[et(e)[0]])((t = { exports: {} }).exports, t), t.exports;
}, to = (e, t, n, r) => {
  if (t && typeof t == "object" || typeof t == "function")
    for (let o of et(t))
      !Qr.call(e, o) && o !== n && Vn(e, o, { get: () => t[o], enumerable: !(r = Xr(t, o)) || r.enumerable });
  return e;
}, no = (e, t, n) => (n = e != null ? Zr(Jr(e)) : {}, to(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  Vn(n, "default", { value: e, enumerable: !0 }),
  e
)), l = eo({
  "../../node_modules/.pnpm/tsup@8.4.0_@microsoft+api-extractor@7.51.1_@types+node@22.13.14__jiti@2.4.2_postcss@8.5_96eb05a9d65343021e53791dd83f3773/node_modules/tsup/assets/esm_shims.js"() {
  }
}), ro = xn({
  "../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/lib/speakingurl.js"(e, t) {
    l(), (function(n) {
      var r = {
        // latin
        À: "A",
        Á: "A",
        Â: "A",
        Ã: "A",
        Ä: "Ae",
        Å: "A",
        Æ: "AE",
        Ç: "C",
        È: "E",
        É: "E",
        Ê: "E",
        Ë: "E",
        Ì: "I",
        Í: "I",
        Î: "I",
        Ï: "I",
        Ð: "D",
        Ñ: "N",
        Ò: "O",
        Ó: "O",
        Ô: "O",
        Õ: "O",
        Ö: "Oe",
        Ő: "O",
        Ø: "O",
        Ù: "U",
        Ú: "U",
        Û: "U",
        Ü: "Ue",
        Ű: "U",
        Ý: "Y",
        Þ: "TH",
        ß: "ss",
        à: "a",
        á: "a",
        â: "a",
        ã: "a",
        ä: "ae",
        å: "a",
        æ: "ae",
        ç: "c",
        è: "e",
        é: "e",
        ê: "e",
        ë: "e",
        ì: "i",
        í: "i",
        î: "i",
        ï: "i",
        ð: "d",
        ñ: "n",
        ò: "o",
        ó: "o",
        ô: "o",
        õ: "o",
        ö: "oe",
        ő: "o",
        ø: "o",
        ù: "u",
        ú: "u",
        û: "u",
        ü: "ue",
        ű: "u",
        ý: "y",
        þ: "th",
        ÿ: "y",
        "ẞ": "SS",
        // language specific
        // Arabic
        ا: "a",
        أ: "a",
        إ: "i",
        آ: "aa",
        ؤ: "u",
        ئ: "e",
        ء: "a",
        ب: "b",
        ت: "t",
        ث: "th",
        ج: "j",
        ح: "h",
        خ: "kh",
        د: "d",
        ذ: "th",
        ر: "r",
        ز: "z",
        س: "s",
        ش: "sh",
        ص: "s",
        ض: "dh",
        ط: "t",
        ظ: "z",
        ع: "a",
        غ: "gh",
        ف: "f",
        ق: "q",
        ك: "k",
        ل: "l",
        م: "m",
        ن: "n",
        ه: "h",
        و: "w",
        ي: "y",
        ى: "a",
        ة: "h",
        ﻻ: "la",
        ﻷ: "laa",
        ﻹ: "lai",
        ﻵ: "laa",
        // Persian additional characters than Arabic
        گ: "g",
        چ: "ch",
        پ: "p",
        ژ: "zh",
        ک: "k",
        ی: "y",
        // Arabic diactrics
        "َ": "a",
        "ً": "an",
        "ِ": "e",
        "ٍ": "en",
        "ُ": "u",
        "ٌ": "on",
        "ْ": "",
        // Arabic numbers
        "٠": "0",
        "١": "1",
        "٢": "2",
        "٣": "3",
        "٤": "4",
        "٥": "5",
        "٦": "6",
        "٧": "7",
        "٨": "8",
        "٩": "9",
        // Persian numbers
        "۰": "0",
        "۱": "1",
        "۲": "2",
        "۳": "3",
        "۴": "4",
        "۵": "5",
        "۶": "6",
        "۷": "7",
        "۸": "8",
        "۹": "9",
        // Burmese consonants
        က: "k",
        ခ: "kh",
        ဂ: "g",
        ဃ: "ga",
        င: "ng",
        စ: "s",
        ဆ: "sa",
        ဇ: "z",
        "စျ": "za",
        ည: "ny",
        ဋ: "t",
        ဌ: "ta",
        ဍ: "d",
        ဎ: "da",
        ဏ: "na",
        တ: "t",
        ထ: "ta",
        ဒ: "d",
        ဓ: "da",
        န: "n",
        ပ: "p",
        ဖ: "pa",
        ဗ: "b",
        ဘ: "ba",
        မ: "m",
        ယ: "y",
        ရ: "ya",
        လ: "l",
        ဝ: "w",
        သ: "th",
        ဟ: "h",
        ဠ: "la",
        အ: "a",
        // consonant character combos
        "ြ": "y",
        "ျ": "ya",
        "ွ": "w",
        "ြွ": "yw",
        "ျွ": "ywa",
        "ှ": "h",
        // independent vowels
        ဧ: "e",
        "၏": "-e",
        ဣ: "i",
        ဤ: "-i",
        ဉ: "u",
        ဦ: "-u",
        ဩ: "aw",
        "သြော": "aw",
        ဪ: "aw",
        // numbers
        "၀": "0",
        "၁": "1",
        "၂": "2",
        "၃": "3",
        "၄": "4",
        "၅": "5",
        "၆": "6",
        "၇": "7",
        "၈": "8",
        "၉": "9",
        // virama and tone marks which are silent in transliteration
        "္": "",
        "့": "",
        "း": "",
        // Czech
        č: "c",
        ď: "d",
        ě: "e",
        ň: "n",
        ř: "r",
        š: "s",
        ť: "t",
        ů: "u",
        ž: "z",
        Č: "C",
        Ď: "D",
        Ě: "E",
        Ň: "N",
        Ř: "R",
        Š: "S",
        Ť: "T",
        Ů: "U",
        Ž: "Z",
        // Dhivehi
        ހ: "h",
        ށ: "sh",
        ނ: "n",
        ރ: "r",
        ބ: "b",
        ޅ: "lh",
        ކ: "k",
        އ: "a",
        ވ: "v",
        މ: "m",
        ފ: "f",
        ދ: "dh",
        ތ: "th",
        ލ: "l",
        ގ: "g",
        ޏ: "gn",
        ސ: "s",
        ޑ: "d",
        ޒ: "z",
        ޓ: "t",
        ޔ: "y",
        ޕ: "p",
        ޖ: "j",
        ޗ: "ch",
        ޘ: "tt",
        ޙ: "hh",
        ޚ: "kh",
        ޛ: "th",
        ޜ: "z",
        ޝ: "sh",
        ޞ: "s",
        ޟ: "d",
        ޠ: "t",
        ޡ: "z",
        ޢ: "a",
        ޣ: "gh",
        ޤ: "q",
        ޥ: "w",
        "ަ": "a",
        "ާ": "aa",
        "ި": "i",
        "ީ": "ee",
        "ު": "u",
        "ޫ": "oo",
        "ެ": "e",
        "ޭ": "ey",
        "ޮ": "o",
        "ޯ": "oa",
        "ް": "",
        // Georgian https://en.wikipedia.org/wiki/Romanization_of_Georgian
        // National system (2002)
        ა: "a",
        ბ: "b",
        გ: "g",
        დ: "d",
        ე: "e",
        ვ: "v",
        ზ: "z",
        თ: "t",
        ი: "i",
        კ: "k",
        ლ: "l",
        მ: "m",
        ნ: "n",
        ო: "o",
        პ: "p",
        ჟ: "zh",
        რ: "r",
        ს: "s",
        ტ: "t",
        უ: "u",
        ფ: "p",
        ქ: "k",
        ღ: "gh",
        ყ: "q",
        შ: "sh",
        ჩ: "ch",
        ც: "ts",
        ძ: "dz",
        წ: "ts",
        ჭ: "ch",
        ხ: "kh",
        ჯ: "j",
        ჰ: "h",
        // Greek
        α: "a",
        β: "v",
        γ: "g",
        δ: "d",
        ε: "e",
        ζ: "z",
        η: "i",
        θ: "th",
        ι: "i",
        κ: "k",
        λ: "l",
        μ: "m",
        ν: "n",
        ξ: "ks",
        ο: "o",
        π: "p",
        ρ: "r",
        σ: "s",
        τ: "t",
        υ: "y",
        φ: "f",
        χ: "x",
        ψ: "ps",
        ω: "o",
        ά: "a",
        έ: "e",
        ί: "i",
        ό: "o",
        ύ: "y",
        ή: "i",
        ώ: "o",
        ς: "s",
        ϊ: "i",
        ΰ: "y",
        ϋ: "y",
        ΐ: "i",
        Α: "A",
        Β: "B",
        Γ: "G",
        Δ: "D",
        Ε: "E",
        Ζ: "Z",
        Η: "I",
        Θ: "TH",
        Ι: "I",
        Κ: "K",
        Λ: "L",
        Μ: "M",
        Ν: "N",
        Ξ: "KS",
        Ο: "O",
        Π: "P",
        Ρ: "R",
        Σ: "S",
        Τ: "T",
        Υ: "Y",
        Φ: "F",
        Χ: "X",
        Ψ: "PS",
        Ω: "O",
        Ά: "A",
        Έ: "E",
        Ί: "I",
        Ό: "O",
        Ύ: "Y",
        Ή: "I",
        Ώ: "O",
        Ϊ: "I",
        Ϋ: "Y",
        // Latvian
        ā: "a",
        // 'č': 'c', // duplicate
        ē: "e",
        ģ: "g",
        ī: "i",
        ķ: "k",
        ļ: "l",
        ņ: "n",
        // 'š': 's', // duplicate
        ū: "u",
        // 'ž': 'z', // duplicate
        Ā: "A",
        // 'Č': 'C', // duplicate
        Ē: "E",
        Ģ: "G",
        Ī: "I",
        Ķ: "k",
        Ļ: "L",
        Ņ: "N",
        // 'Š': 'S', // duplicate
        Ū: "U",
        // 'Ž': 'Z', // duplicate
        // Macedonian
        Ќ: "Kj",
        ќ: "kj",
        Љ: "Lj",
        љ: "lj",
        Њ: "Nj",
        њ: "nj",
        Тс: "Ts",
        тс: "ts",
        // Polish
        ą: "a",
        ć: "c",
        ę: "e",
        ł: "l",
        ń: "n",
        // 'ó': 'o', // duplicate
        ś: "s",
        ź: "z",
        ż: "z",
        Ą: "A",
        Ć: "C",
        Ę: "E",
        Ł: "L",
        Ń: "N",
        Ś: "S",
        Ź: "Z",
        Ż: "Z",
        // Ukranian
        Є: "Ye",
        І: "I",
        Ї: "Yi",
        Ґ: "G",
        є: "ye",
        і: "i",
        ї: "yi",
        ґ: "g",
        // Romanian
        ă: "a",
        Ă: "A",
        ș: "s",
        Ș: "S",
        // 'ş': 's', // duplicate
        // 'Ş': 'S', // duplicate
        ț: "t",
        Ț: "T",
        ţ: "t",
        Ţ: "T",
        // Russian https://en.wikipedia.org/wiki/Romanization_of_Russian
        // ICAO
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "yo",
        ж: "zh",
        з: "z",
        и: "i",
        й: "i",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "kh",
        ц: "c",
        ч: "ch",
        ш: "sh",
        щ: "sh",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya",
        А: "A",
        Б: "B",
        В: "V",
        Г: "G",
        Д: "D",
        Е: "E",
        Ё: "Yo",
        Ж: "Zh",
        З: "Z",
        И: "I",
        Й: "I",
        К: "K",
        Л: "L",
        М: "M",
        Н: "N",
        О: "O",
        П: "P",
        Р: "R",
        С: "S",
        Т: "T",
        У: "U",
        Ф: "F",
        Х: "Kh",
        Ц: "C",
        Ч: "Ch",
        Ш: "Sh",
        Щ: "Sh",
        Ъ: "",
        Ы: "Y",
        Ь: "",
        Э: "E",
        Ю: "Yu",
        Я: "Ya",
        // Serbian
        ђ: "dj",
        ј: "j",
        // 'љ': 'lj',  // duplicate
        // 'њ': 'nj', // duplicate
        ћ: "c",
        џ: "dz",
        Ђ: "Dj",
        Ј: "j",
        // 'Љ': 'Lj', // duplicate
        // 'Њ': 'Nj', // duplicate
        Ћ: "C",
        Џ: "Dz",
        // Slovak
        ľ: "l",
        ĺ: "l",
        ŕ: "r",
        Ľ: "L",
        Ĺ: "L",
        Ŕ: "R",
        // Turkish
        ş: "s",
        Ş: "S",
        ı: "i",
        İ: "I",
        // 'ç': 'c', // duplicate
        // 'Ç': 'C', // duplicate
        // 'ü': 'u', // duplicate, see langCharMap
        // 'Ü': 'U', // duplicate, see langCharMap
        // 'ö': 'o', // duplicate, see langCharMap
        // 'Ö': 'O', // duplicate, see langCharMap
        ğ: "g",
        Ğ: "G",
        // Vietnamese
        ả: "a",
        Ả: "A",
        ẳ: "a",
        Ẳ: "A",
        ẩ: "a",
        Ẩ: "A",
        đ: "d",
        Đ: "D",
        ẹ: "e",
        Ẹ: "E",
        ẽ: "e",
        Ẽ: "E",
        ẻ: "e",
        Ẻ: "E",
        ế: "e",
        Ế: "E",
        ề: "e",
        Ề: "E",
        ệ: "e",
        Ệ: "E",
        ễ: "e",
        Ễ: "E",
        ể: "e",
        Ể: "E",
        ỏ: "o",
        ọ: "o",
        Ọ: "o",
        ố: "o",
        Ố: "O",
        ồ: "o",
        Ồ: "O",
        ổ: "o",
        Ổ: "O",
        ộ: "o",
        Ộ: "O",
        ỗ: "o",
        Ỗ: "O",
        ơ: "o",
        Ơ: "O",
        ớ: "o",
        Ớ: "O",
        ờ: "o",
        Ờ: "O",
        ợ: "o",
        Ợ: "O",
        ỡ: "o",
        Ỡ: "O",
        Ở: "o",
        ở: "o",
        ị: "i",
        Ị: "I",
        ĩ: "i",
        Ĩ: "I",
        ỉ: "i",
        Ỉ: "i",
        ủ: "u",
        Ủ: "U",
        ụ: "u",
        Ụ: "U",
        ũ: "u",
        Ũ: "U",
        ư: "u",
        Ư: "U",
        ứ: "u",
        Ứ: "U",
        ừ: "u",
        Ừ: "U",
        ự: "u",
        Ự: "U",
        ữ: "u",
        Ữ: "U",
        ử: "u",
        Ử: "ư",
        ỷ: "y",
        Ỷ: "y",
        ỳ: "y",
        Ỳ: "Y",
        ỵ: "y",
        Ỵ: "Y",
        ỹ: "y",
        Ỹ: "Y",
        ạ: "a",
        Ạ: "A",
        ấ: "a",
        Ấ: "A",
        ầ: "a",
        Ầ: "A",
        ậ: "a",
        Ậ: "A",
        ẫ: "a",
        Ẫ: "A",
        // 'ă': 'a', // duplicate
        // 'Ă': 'A', // duplicate
        ắ: "a",
        Ắ: "A",
        ằ: "a",
        Ằ: "A",
        ặ: "a",
        Ặ: "A",
        ẵ: "a",
        Ẵ: "A",
        "⓪": "0",
        "①": "1",
        "②": "2",
        "③": "3",
        "④": "4",
        "⑤": "5",
        "⑥": "6",
        "⑦": "7",
        "⑧": "8",
        "⑨": "9",
        "⑩": "10",
        "⑪": "11",
        "⑫": "12",
        "⑬": "13",
        "⑭": "14",
        "⑮": "15",
        "⑯": "16",
        "⑰": "17",
        "⑱": "18",
        "⑲": "18",
        "⑳": "18",
        "⓵": "1",
        "⓶": "2",
        "⓷": "3",
        "⓸": "4",
        "⓹": "5",
        "⓺": "6",
        "⓻": "7",
        "⓼": "8",
        "⓽": "9",
        "⓾": "10",
        "⓿": "0",
        "⓫": "11",
        "⓬": "12",
        "⓭": "13",
        "⓮": "14",
        "⓯": "15",
        "⓰": "16",
        "⓱": "17",
        "⓲": "18",
        "⓳": "19",
        "⓴": "20",
        "Ⓐ": "A",
        "Ⓑ": "B",
        "Ⓒ": "C",
        "Ⓓ": "D",
        "Ⓔ": "E",
        "Ⓕ": "F",
        "Ⓖ": "G",
        "Ⓗ": "H",
        "Ⓘ": "I",
        "Ⓙ": "J",
        "Ⓚ": "K",
        "Ⓛ": "L",
        "Ⓜ": "M",
        "Ⓝ": "N",
        "Ⓞ": "O",
        "Ⓟ": "P",
        "Ⓠ": "Q",
        "Ⓡ": "R",
        "Ⓢ": "S",
        "Ⓣ": "T",
        "Ⓤ": "U",
        "Ⓥ": "V",
        "Ⓦ": "W",
        "Ⓧ": "X",
        "Ⓨ": "Y",
        "Ⓩ": "Z",
        "ⓐ": "a",
        "ⓑ": "b",
        "ⓒ": "c",
        "ⓓ": "d",
        "ⓔ": "e",
        "ⓕ": "f",
        "ⓖ": "g",
        "ⓗ": "h",
        "ⓘ": "i",
        "ⓙ": "j",
        "ⓚ": "k",
        "ⓛ": "l",
        "ⓜ": "m",
        "ⓝ": "n",
        "ⓞ": "o",
        "ⓟ": "p",
        "ⓠ": "q",
        "ⓡ": "r",
        "ⓢ": "s",
        "ⓣ": "t",
        "ⓤ": "u",
        "ⓦ": "v",
        "ⓥ": "w",
        "ⓧ": "x",
        "ⓨ": "y",
        "ⓩ": "z",
        // symbols
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "∂": "d",
        ƒ: "f",
        "™": "(TM)",
        "©": "(C)",
        œ: "oe",
        Œ: "OE",
        "®": "(R)",
        "†": "+",
        "℠": "(SM)",
        "…": "...",
        "˚": "o",
        º: "o",
        ª: "a",
        "•": "*",
        "၊": ",",
        "။": ".",
        // currency
        $: "USD",
        "€": "EUR",
        "₢": "BRN",
        "₣": "FRF",
        "£": "GBP",
        "₤": "ITL",
        "₦": "NGN",
        "₧": "ESP",
        "₩": "KRW",
        "₪": "ILS",
        "₫": "VND",
        "₭": "LAK",
        "₮": "MNT",
        "₯": "GRD",
        "₱": "ARS",
        "₲": "PYG",
        "₳": "ARA",
        "₴": "UAH",
        "₵": "GHS",
        "¢": "cent",
        "¥": "CNY",
        元: "CNY",
        円: "YEN",
        "﷼": "IRR",
        "₠": "EWE",
        "฿": "THB",
        "₨": "INR",
        "₹": "INR",
        "₰": "PF",
        "₺": "TRY",
        "؋": "AFN",
        "₼": "AZN",
        лв: "BGN",
        "៛": "KHR",
        "₡": "CRC",
        "₸": "KZT",
        ден: "MKD",
        zł: "PLN",
        "₽": "RUB",
        "₾": "GEL"
      }, o = [
        // burmese
        "်",
        // Dhivehi
        "ް"
      ], u = {
        // Burmese
        // dependent vowels
        "ာ": "a",
        "ါ": "a",
        "ေ": "e",
        "ဲ": "e",
        "ိ": "i",
        "ီ": "i",
        "ို": "o",
        "ု": "u",
        "ူ": "u",
        "ေါင်": "aung",
        "ော": "aw",
        "ော်": "aw",
        "ေါ": "aw",
        "ေါ်": "aw",
        "်": "်",
        // this is special case but the character will be converted to latin in the code
        "က်": "et",
        "ိုက်": "aik",
        "ောက်": "auk",
        "င်": "in",
        "ိုင်": "aing",
        "ောင်": "aung",
        "စ်": "it",
        "ည်": "i",
        "တ်": "at",
        "ိတ်": "eik",
        "ုတ်": "ok",
        "ွတ်": "ut",
        "ေတ်": "it",
        "ဒ်": "d",
        "ိုဒ်": "ok",
        "ုဒ်": "ait",
        "န်": "an",
        "ာန်": "an",
        "ိန်": "ein",
        "ုန်": "on",
        "ွန်": "un",
        "ပ်": "at",
        "ိပ်": "eik",
        "ုပ်": "ok",
        "ွပ်": "ut",
        "န်ုပ်": "nub",
        "မ်": "an",
        "ိမ်": "ein",
        "ုမ်": "on",
        "ွမ်": "un",
        "ယ်": "e",
        "ိုလ်": "ol",
        "ဉ်": "in",
        "ံ": "an",
        "ိံ": "ein",
        "ုံ": "on",
        // Dhivehi
        "ައް": "ah",
        "ަށް": "ah"
      }, s = {
        en: {},
        // default language
        az: {
          // Azerbaijani
          ç: "c",
          ə: "e",
          ğ: "g",
          ı: "i",
          ö: "o",
          ş: "s",
          ü: "u",
          Ç: "C",
          Ə: "E",
          Ğ: "G",
          İ: "I",
          Ö: "O",
          Ş: "S",
          Ü: "U"
        },
        cs: {
          // Czech
          č: "c",
          ď: "d",
          ě: "e",
          ň: "n",
          ř: "r",
          š: "s",
          ť: "t",
          ů: "u",
          ž: "z",
          Č: "C",
          Ď: "D",
          Ě: "E",
          Ň: "N",
          Ř: "R",
          Š: "S",
          Ť: "T",
          Ů: "U",
          Ž: "Z"
        },
        fi: {
          // Finnish
          // 'å': 'a', duplicate see charMap/latin
          // 'Å': 'A', duplicate see charMap/latin
          ä: "a",
          // ok
          Ä: "A",
          // ok
          ö: "o",
          // ok
          Ö: "O"
          // ok
        },
        hu: {
          // Hungarian
          ä: "a",
          // ok
          Ä: "A",
          // ok
          // 'á': 'a', duplicate see charMap/latin
          // 'Á': 'A', duplicate see charMap/latin
          ö: "o",
          // ok
          Ö: "O",
          // ok
          // 'ő': 'o', duplicate see charMap/latin
          // 'Ő': 'O', duplicate see charMap/latin
          ü: "u",
          Ü: "U",
          ű: "u",
          Ű: "U"
        },
        lt: {
          // Lithuanian
          ą: "a",
          č: "c",
          ę: "e",
          ė: "e",
          į: "i",
          š: "s",
          ų: "u",
          ū: "u",
          ž: "z",
          Ą: "A",
          Č: "C",
          Ę: "E",
          Ė: "E",
          Į: "I",
          Š: "S",
          Ų: "U",
          Ū: "U"
        },
        lv: {
          // Latvian
          ā: "a",
          č: "c",
          ē: "e",
          ģ: "g",
          ī: "i",
          ķ: "k",
          ļ: "l",
          ņ: "n",
          š: "s",
          ū: "u",
          ž: "z",
          Ā: "A",
          Č: "C",
          Ē: "E",
          Ģ: "G",
          Ī: "i",
          Ķ: "k",
          Ļ: "L",
          Ņ: "N",
          Š: "S",
          Ū: "u",
          Ž: "Z"
        },
        pl: {
          // Polish
          ą: "a",
          ć: "c",
          ę: "e",
          ł: "l",
          ń: "n",
          ó: "o",
          ś: "s",
          ź: "z",
          ż: "z",
          Ą: "A",
          Ć: "C",
          Ę: "e",
          Ł: "L",
          Ń: "N",
          Ó: "O",
          Ś: "S",
          Ź: "Z",
          Ż: "Z"
        },
        sv: {
          // Swedish
          // 'å': 'a', duplicate see charMap/latin
          // 'Å': 'A', duplicate see charMap/latin
          ä: "a",
          // ok
          Ä: "A",
          // ok
          ö: "o",
          // ok
          Ö: "O"
          // ok
        },
        sk: {
          // Slovak
          ä: "a",
          Ä: "A"
        },
        sr: {
          // Serbian
          љ: "lj",
          њ: "nj",
          Љ: "Lj",
          Њ: "Nj",
          đ: "dj",
          Đ: "Dj"
        },
        tr: {
          // Turkish
          Ü: "U",
          Ö: "O",
          ü: "u",
          ö: "o"
        }
      }, i = {
        ar: {
          "∆": "delta",
          "∞": "la-nihaya",
          "♥": "hob",
          "&": "wa",
          "|": "aw",
          "<": "aqal-men",
          ">": "akbar-men",
          "∑": "majmou",
          "¤": "omla"
        },
        az: {},
        ca: {
          "∆": "delta",
          "∞": "infinit",
          "♥": "amor",
          "&": "i",
          "|": "o",
          "<": "menys que",
          ">": "mes que",
          "∑": "suma dels",
          "¤": "moneda"
        },
        cs: {
          "∆": "delta",
          "∞": "nekonecno",
          "♥": "laska",
          "&": "a",
          "|": "nebo",
          "<": "mensi nez",
          ">": "vetsi nez",
          "∑": "soucet",
          "¤": "mena"
        },
        de: {
          "∆": "delta",
          "∞": "unendlich",
          "♥": "Liebe",
          "&": "und",
          "|": "oder",
          "<": "kleiner als",
          ">": "groesser als",
          "∑": "Summe von",
          "¤": "Waehrung"
        },
        dv: {
          "∆": "delta",
          "∞": "kolunulaa",
          "♥": "loabi",
          "&": "aai",
          "|": "noonee",
          "<": "ah vure kuda",
          ">": "ah vure bodu",
          "∑": "jumula",
          "¤": "faisaa"
        },
        en: {
          "∆": "delta",
          "∞": "infinity",
          "♥": "love",
          "&": "and",
          "|": "or",
          "<": "less than",
          ">": "greater than",
          "∑": "sum",
          "¤": "currency"
        },
        es: {
          "∆": "delta",
          "∞": "infinito",
          "♥": "amor",
          "&": "y",
          "|": "u",
          "<": "menos que",
          ">": "mas que",
          "∑": "suma de los",
          "¤": "moneda"
        },
        fa: {
          "∆": "delta",
          "∞": "bi-nahayat",
          "♥": "eshgh",
          "&": "va",
          "|": "ya",
          "<": "kamtar-az",
          ">": "bishtar-az",
          "∑": "majmooe",
          "¤": "vahed"
        },
        fi: {
          "∆": "delta",
          "∞": "aarettomyys",
          "♥": "rakkaus",
          "&": "ja",
          "|": "tai",
          "<": "pienempi kuin",
          ">": "suurempi kuin",
          "∑": "summa",
          "¤": "valuutta"
        },
        fr: {
          "∆": "delta",
          "∞": "infiniment",
          "♥": "Amour",
          "&": "et",
          "|": "ou",
          "<": "moins que",
          ">": "superieure a",
          "∑": "somme des",
          "¤": "monnaie"
        },
        ge: {
          "∆": "delta",
          "∞": "usasruloba",
          "♥": "siqvaruli",
          "&": "da",
          "|": "an",
          "<": "naklebi",
          ">": "meti",
          "∑": "jami",
          "¤": "valuta"
        },
        gr: {},
        hu: {
          "∆": "delta",
          "∞": "vegtelen",
          "♥": "szerelem",
          "&": "es",
          "|": "vagy",
          "<": "kisebb mint",
          ">": "nagyobb mint",
          "∑": "szumma",
          "¤": "penznem"
        },
        it: {
          "∆": "delta",
          "∞": "infinito",
          "♥": "amore",
          "&": "e",
          "|": "o",
          "<": "minore di",
          ">": "maggiore di",
          "∑": "somma",
          "¤": "moneta"
        },
        lt: {
          "∆": "delta",
          "∞": "begalybe",
          "♥": "meile",
          "&": "ir",
          "|": "ar",
          "<": "maziau nei",
          ">": "daugiau nei",
          "∑": "suma",
          "¤": "valiuta"
        },
        lv: {
          "∆": "delta",
          "∞": "bezgaliba",
          "♥": "milestiba",
          "&": "un",
          "|": "vai",
          "<": "mazak neka",
          ">": "lielaks neka",
          "∑": "summa",
          "¤": "valuta"
        },
        my: {
          "∆": "kwahkhyaet",
          "∞": "asaonasme",
          "♥": "akhyait",
          "&": "nhin",
          "|": "tho",
          "<": "ngethaw",
          ">": "kyithaw",
          "∑": "paungld",
          "¤": "ngwekye"
        },
        mk: {},
        nl: {
          "∆": "delta",
          "∞": "oneindig",
          "♥": "liefde",
          "&": "en",
          "|": "of",
          "<": "kleiner dan",
          ">": "groter dan",
          "∑": "som",
          "¤": "valuta"
        },
        pl: {
          "∆": "delta",
          "∞": "nieskonczonosc",
          "♥": "milosc",
          "&": "i",
          "|": "lub",
          "<": "mniejsze niz",
          ">": "wieksze niz",
          "∑": "suma",
          "¤": "waluta"
        },
        pt: {
          "∆": "delta",
          "∞": "infinito",
          "♥": "amor",
          "&": "e",
          "|": "ou",
          "<": "menor que",
          ">": "maior que",
          "∑": "soma",
          "¤": "moeda"
        },
        ro: {
          "∆": "delta",
          "∞": "infinit",
          "♥": "dragoste",
          "&": "si",
          "|": "sau",
          "<": "mai mic ca",
          ">": "mai mare ca",
          "∑": "suma",
          "¤": "valuta"
        },
        ru: {
          "∆": "delta",
          "∞": "beskonechno",
          "♥": "lubov",
          "&": "i",
          "|": "ili",
          "<": "menshe",
          ">": "bolshe",
          "∑": "summa",
          "¤": "valjuta"
        },
        sk: {
          "∆": "delta",
          "∞": "nekonecno",
          "♥": "laska",
          "&": "a",
          "|": "alebo",
          "<": "menej ako",
          ">": "viac ako",
          "∑": "sucet",
          "¤": "mena"
        },
        sr: {},
        tr: {
          "∆": "delta",
          "∞": "sonsuzluk",
          "♥": "ask",
          "&": "ve",
          "|": "veya",
          "<": "kucuktur",
          ">": "buyuktur",
          "∑": "toplam",
          "¤": "para birimi"
        },
        uk: {
          "∆": "delta",
          "∞": "bezkinechnist",
          "♥": "lubov",
          "&": "i",
          "|": "abo",
          "<": "menshe",
          ">": "bilshe",
          "∑": "suma",
          "¤": "valjuta"
        },
        vn: {
          "∆": "delta",
          "∞": "vo cuc",
          "♥": "yeu",
          "&": "va",
          "|": "hoac",
          "<": "nho hon",
          ">": "lon hon",
          "∑": "tong",
          "¤": "tien te"
        }
      }, a = [";", "?", ":", "@", "&", "=", "+", "$", ",", "/"].join(""), _ = [";", "?", ":", "@", "&", "=", "+", "$", ","].join(""), m = [".", "!", "~", "*", "'", "(", ")"].join(""), f = function(E, h) {
        var T = "-", S = "", V = "", fe = !0, N = {}, I, _e, L, O, y, k, U, F, Q, B, A, K, b, ee, W = "";
        if (typeof E != "string")
          return "";
        if (typeof h == "string" && (T = h), U = i.en, F = s.en, typeof h == "object") {
          I = h.maintainCase || !1, N = h.custom && typeof h.custom == "object" ? h.custom : N, L = +h.truncate > 1 && h.truncate || !1, O = h.uric || !1, y = h.uricNoSlash || !1, k = h.mark || !1, fe = !(h.symbols === !1 || h.lang === !1), T = h.separator || T, O && (W += a), y && (W += _), k && (W += m), U = h.lang && i[h.lang] && fe ? i[h.lang] : fe ? i.en : {}, F = h.lang && s[h.lang] ? s[h.lang] : h.lang === !1 || h.lang === !0 ? {} : s.en, h.titleCase && typeof h.titleCase.length == "number" && Array.prototype.toString.call(h.titleCase) ? (h.titleCase.forEach(function(M) {
            N[M + ""] = M + "";
          }), _e = !0) : _e = !!h.titleCase, h.custom && typeof h.custom.length == "number" && Array.prototype.toString.call(h.custom) && h.custom.forEach(function(M) {
            N[M + ""] = M + "";
          }), Object.keys(N).forEach(function(M) {
            var de;
            M.length > 1 ? de = new RegExp("\\b" + c(M) + "\\b", "gi") : de = new RegExp(c(M), "gi"), E = E.replace(de, N[M]);
          });
          for (A in N)
            W += A;
        }
        for (W += T, W = c(W), E = E.replace(/(^\s+|\s+$)/g, ""), b = !1, ee = !1, B = 0, K = E.length; B < K; B++)
          A = E[B], d(A, N) ? b = !1 : F[A] ? (A = b && F[A].match(/[A-Za-z0-9]/) ? " " + F[A] : F[A], b = !1) : A in r ? (B + 1 < K && o.indexOf(E[B + 1]) >= 0 ? (V += A, A = "") : ee === !0 ? (A = u[V] + r[A], V = "") : A = b && r[A].match(/[A-Za-z0-9]/) ? " " + r[A] : r[A], b = !1, ee = !1) : A in u ? (V += A, A = "", B === K - 1 && (A = u[V]), ee = !0) : /* process symbol chars */ U[A] && !(O && a.indexOf(A) !== -1) && !(y && _.indexOf(A) !== -1) ? (A = b || S.substr(-1).match(/[A-Za-z0-9]/) ? T + U[A] : U[A], A += E[B + 1] !== void 0 && E[B + 1].match(/[A-Za-z0-9]/) ? T : "", b = !0) : (ee === !0 ? (A = u[V] + A, V = "", ee = !1) : b && (/[A-Za-z0-9]/.test(A) || S.substr(-1).match(/A-Za-z0-9]/)) && (A = " " + A), b = !1), S += A.replace(new RegExp("[^\\w\\s" + W + "_-]", "g"), T);
        return _e && (S = S.replace(/(\w)(\S*)/g, function(M, de, pt) {
          var Ue = de.toUpperCase() + (pt !== null ? pt : "");
          return Object.keys(N).indexOf(Ue.toLowerCase()) < 0 ? Ue : Ue.toLowerCase();
        })), S = S.replace(/\s+/g, T).replace(new RegExp("\\" + T + "+", "g"), T).replace(new RegExp("(^\\" + T + "+|\\" + T + "+$)", "g"), ""), L && S.length > L && (Q = S.charAt(L) === T, S = S.slice(0, L), Q || (S = S.slice(0, S.lastIndexOf(T)))), !I && !_e && (S = S.toLowerCase()), S;
      }, g = function(E) {
        return function(T) {
          return f(T, E);
        };
      }, c = function(E) {
        return E.replace(/[-\\^$*+?.()|[\]{}\/]/g, "\\$&");
      }, d = function(v, E) {
        for (var h in E)
          if (E[h] === v)
            return !0;
      };
      if (typeof t < "u" && t.exports)
        t.exports = f, t.exports.createSlug = g;
      else if (typeof define < "u" && define.amd)
        define([], function() {
          return f;
        });
      else
        try {
          if (n.getSlug || n.createSlug)
            throw "speakingurl: globals exists /(getSlug|createSlug)/";
          n.getSlug = f, n.createSlug = g;
        } catch {
        }
    })(e);
  }
}), oo = xn({
  "../../node_modules/.pnpm/speakingurl@14.0.1/node_modules/speakingurl/index.js"(e, t) {
    l(), t.exports = ro();
  }
});
l();
l();
l();
l();
l();
l();
l();
l();
function uo(e) {
  var t;
  const n = e.name || e._componentTag || e.__VUE_DEVTOOLS_COMPONENT_GUSSED_NAME__ || e.__name;
  return n === "index" && ((t = e.__file) != null && t.endsWith("index.vue")) ? "" : n;
}
function so(e) {
  const t = e.__file;
  if (t)
    return $r(Hr(t, ".vue"));
}
function gt(e, t) {
  return e.type.__VUE_DEVTOOLS_COMPONENT_GUSSED_NAME__ = t, t;
}
function tt(e) {
  if (e.__VUE_DEVTOOLS_NEXT_APP_RECORD__)
    return e.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
  if (e.root)
    return e.appContext.app.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
}
function Nn(e) {
  var t, n;
  const r = (t = e.subTree) == null ? void 0 : t.type, o = tt(e);
  return o ? ((n = o == null ? void 0 : o.types) == null ? void 0 : n.Fragment) === r : !1;
}
function Pe(e) {
  var t, n, r;
  const o = uo((e == null ? void 0 : e.type) || {});
  if (o)
    return o;
  if ((e == null ? void 0 : e.root) === e)
    return "Root";
  for (const s in (n = (t = e.parent) == null ? void 0 : t.type) == null ? void 0 : n.components)
    if (e.parent.type.components[s] === (e == null ? void 0 : e.type))
      return gt(e, s);
  for (const s in (r = e.appContext) == null ? void 0 : r.components)
    if (e.appContext.components[s] === (e == null ? void 0 : e.type))
      return gt(e, s);
  const u = so((e == null ? void 0 : e.type) || {});
  return u || "Anonymous Component";
}
function io(e) {
  var t, n, r;
  const o = (r = (n = (t = e == null ? void 0 : e.appContext) == null ? void 0 : t.app) == null ? void 0 : n.__VUE_DEVTOOLS_NEXT_APP_RECORD_ID__) != null ? r : 0, u = e === (e == null ? void 0 : e.root) ? "root" : e.uid;
  return `${o}:${u}`;
}
function He(e, t) {
  return t = t || `${e.id}:root`, e.instanceMap.get(t) || e.instanceMap.get(":root");
}
function ao() {
  const e = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    get width() {
      return e.right - e.left;
    },
    get height() {
      return e.bottom - e.top;
    }
  };
  return e;
}
var Se;
function lo(e) {
  return Se || (Se = document.createRange()), Se.selectNode(e), Se.getBoundingClientRect();
}
function co(e) {
  const t = ao();
  if (!e.children)
    return t;
  for (let n = 0, r = e.children.length; n < r; n++) {
    const o = e.children[n];
    let u;
    if (o.component)
      u = J(o.component);
    else if (o.el) {
      const s = o.el;
      s.nodeType === 1 || s.getBoundingClientRect ? u = s.getBoundingClientRect() : s.nodeType === 3 && s.data.trim() && (u = lo(s));
    }
    u && fo(t, u);
  }
  return t;
}
function fo(e, t) {
  return (!e.top || t.top < e.top) && (e.top = t.top), (!e.bottom || t.bottom > e.bottom) && (e.bottom = t.bottom), (!e.left || t.left < e.left) && (e.left = t.left), (!e.right || t.right > e.right) && (e.right = t.right), e;
}
var mt = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0
};
function J(e) {
  const t = e.subTree.el;
  return typeof window > "u" ? mt : Nn(e) ? co(e.subTree) : (t == null ? void 0 : t.nodeType) === 1 ? t == null ? void 0 : t.getBoundingClientRect() : e.subTree.component ? J(e.subTree.component) : mt;
}
l();
function nt(e) {
  return Nn(e) ? _o(e.subTree) : e.subTree ? [e.subTree.el] : [];
}
function _o(e) {
  if (!e.children)
    return [];
  const t = [];
  return e.children.forEach((n) => {
    n.component ? t.push(...nt(n.component)) : n != null && n.el && t.push(n.el);
  }), t;
}
var Un = "__vue-devtools-component-inspector__", Fn = "__vue-devtools-component-inspector__card__", Ln = "__vue-devtools-component-inspector__name__", Bn = "__vue-devtools-component-inspector__indicator__", Mn = {
  display: "block",
  zIndex: 2147483640,
  position: "fixed",
  backgroundColor: "#42b88325",
  border: "1px solid #42b88350",
  borderRadius: "5px",
  transition: "all 0.1s ease-in",
  pointerEvents: "none"
}, po = {
  fontFamily: "Arial, Helvetica, sans-serif",
  padding: "5px 8px",
  borderRadius: "4px",
  textAlign: "left",
  position: "absolute",
  left: 0,
  color: "#e9e9e9",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "24px",
  backgroundColor: "#42b883",
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)"
}, Eo = {
  display: "inline-block",
  fontWeight: 400,
  fontStyle: "normal",
  fontSize: "12px",
  opacity: 0.7
};
function le() {
  return document.getElementById(Un);
}
function ho() {
  return document.getElementById(Fn);
}
function go() {
  return document.getElementById(Bn);
}
function mo() {
  return document.getElementById(Ln);
}
function rt(e) {
  return {
    left: `${Math.round(e.left * 100) / 100}px`,
    top: `${Math.round(e.top * 100) / 100}px`,
    width: `${Math.round(e.width * 100) / 100}px`,
    height: `${Math.round(e.height * 100) / 100}px`
  };
}
function ot(e) {
  var t;
  const n = document.createElement("div");
  n.id = (t = e.elementId) != null ? t : Un, Object.assign(n.style, {
    ...Mn,
    ...rt(e.bounds),
    ...e.style
  });
  const r = document.createElement("span");
  r.id = Fn, Object.assign(r.style, {
    ...po,
    top: e.bounds.top < 35 ? 0 : "-35px"
  });
  const o = document.createElement("span");
  o.id = Ln, o.innerHTML = `&lt;${e.name}&gt;&nbsp;&nbsp;`;
  const u = document.createElement("i");
  return u.id = Bn, u.innerHTML = `${Math.round(e.bounds.width * 100) / 100} x ${Math.round(e.bounds.height * 100) / 100}`, Object.assign(u.style, Eo), r.appendChild(o), r.appendChild(u), n.appendChild(r), document.body.appendChild(n), n;
}
function ut(e) {
  const t = le(), n = ho(), r = mo(), o = go();
  t && (Object.assign(t.style, {
    ...Mn,
    ...rt(e.bounds)
  }), Object.assign(n.style, {
    top: e.bounds.top < 35 ? 0 : "-35px"
  }), r.innerHTML = `&lt;${e.name}&gt;&nbsp;&nbsp;`, o.innerHTML = `${Math.round(e.bounds.width * 100) / 100} x ${Math.round(e.bounds.height * 100) / 100}`);
}
function vo(e) {
  const t = J(e);
  if (!t.width && !t.height)
    return;
  const n = Pe(e);
  le() ? ut({ bounds: t, name: n }) : ot({ bounds: t, name: n });
}
function $n() {
  const e = le();
  e && (e.style.display = "none");
}
var Ke = null;
function je(e) {
  const t = e.target;
  if (t) {
    const n = t.__vueParentComponent;
    if (n && (Ke = n, n.vnode.el)) {
      const o = J(n), u = Pe(n);
      le() ? ut({ bounds: o, name: u }) : ot({ bounds: o, name: u });
    }
  }
}
function yo(e, t) {
  if (e.preventDefault(), e.stopPropagation(), Ke) {
    const n = io(Ke);
    t(n);
  }
}
var ke = null;
function Ao() {
  $n(), window.removeEventListener("mouseover", je), window.removeEventListener("click", ke, !0), ke = null;
}
function Oo() {
  return window.addEventListener("mouseover", je), new Promise((e) => {
    function t(n) {
      n.preventDefault(), n.stopPropagation(), yo(n, (r) => {
        window.removeEventListener("click", t, !0), ke = null, window.removeEventListener("mouseover", je);
        const o = le();
        o && (o.style.display = "none"), e(JSON.stringify({ id: r }));
      });
    }
    ke = t, window.addEventListener("click", t, !0);
  });
}
function So(e) {
  const t = He(P.value, e.id);
  if (t) {
    const [n] = nt(t);
    if (typeof n.scrollIntoView == "function")
      n.scrollIntoView({
        behavior: "smooth"
      });
    else {
      const r = J(t), o = document.createElement("div"), u = {
        ...rt(r),
        position: "absolute"
      };
      Object.assign(o.style, u), document.body.appendChild(o), o.scrollIntoView({
        behavior: "smooth"
      }), setTimeout(() => {
        document.body.removeChild(o);
      }, 2e3);
    }
    setTimeout(() => {
      const r = J(t);
      if (r.width || r.height) {
        const o = Pe(t), u = le();
        u ? ut({ ...e, name: o, bounds: r }) : ot({ ...e, name: o, bounds: r }), setTimeout(() => {
          u && (u.style.display = "none");
        }, 1500);
      }
    }, 1200);
  }
}
l();
var vt, yt;
(yt = (vt = p).__VUE_DEVTOOLS_COMPONENT_INSPECTOR_ENABLED__) != null || (vt.__VUE_DEVTOOLS_COMPONENT_INSPECTOR_ENABLED__ = !0);
function To(e) {
  let t = 0;
  const n = setInterval(() => {
    p.__VUE_INSPECTOR__ && (clearInterval(n), t += 30, e()), t >= /* 5s */
    5e3 && clearInterval(n);
  }, 30);
}
function Co() {
  const e = p.__VUE_INSPECTOR__, t = e.openInEditor;
  e.openInEditor = async (...n) => {
    e.disable(), t(...n);
  };
}
function bo() {
  return new Promise((e) => {
    function t() {
      Co(), e(p.__VUE_INSPECTOR__);
    }
    p.__VUE_INSPECTOR__ ? t() : To(() => {
      t();
    });
  });
}
l();
l();
function Do(e) {
  return !!(e && e.__v_isReadonly);
}
function Hn(e) {
  return Do(e) ? Hn(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Le(e) {
  return !!(e && e.__v_isRef === !0);
}
function pe(e) {
  const t = e && e.__v_raw;
  return t ? pe(t) : e;
}
var Io = class {
  constructor() {
    this.refEditor = new wo();
  }
  set(e, t, n, r) {
    const o = Array.isArray(t) ? t : t.split(".");
    for (; o.length > 1; ) {
      const i = o.shift();
      e instanceof Map ? e = e.get(i) : e instanceof Set ? e = Array.from(e.values())[i] : e = e[i], this.refEditor.isRef(e) && (e = this.refEditor.get(e));
    }
    const u = o[0], s = this.refEditor.get(e)[u];
    r ? r(e, u, n) : this.refEditor.isRef(s) ? this.refEditor.set(s, n) : e[u] = n;
  }
  get(e, t) {
    const n = Array.isArray(t) ? t : t.split(".");
    for (let r = 0; r < n.length; r++)
      if (e instanceof Map ? e = e.get(n[r]) : e = e[n[r]], this.refEditor.isRef(e) && (e = this.refEditor.get(e)), !e)
        return;
    return e;
  }
  has(e, t, n = !1) {
    if (typeof e > "u")
      return !1;
    const r = Array.isArray(t) ? t.slice() : t.split("."), o = n ? 2 : 1;
    for (; e && r.length > o; ) {
      const u = r.shift();
      e = e[u], this.refEditor.isRef(e) && (e = this.refEditor.get(e));
    }
    return e != null && Object.prototype.hasOwnProperty.call(e, r[0]);
  }
  createDefaultSetCallback(e) {
    return (t, n, r) => {
      if ((e.remove || e.newKey) && (Array.isArray(t) ? t.splice(n, 1) : pe(t) instanceof Map ? t.delete(n) : pe(t) instanceof Set ? t.delete(Array.from(t.values())[n]) : Reflect.deleteProperty(t, n)), !e.remove) {
        const o = t[e.newKey || n];
        this.refEditor.isRef(o) ? this.refEditor.set(o, r) : pe(t) instanceof Map ? t.set(e.newKey || n, r) : pe(t) instanceof Set ? t.add(r) : t[e.newKey || n] = r;
      }
    };
  }
}, wo = class {
  set(e, t) {
    if (Le(e))
      e.value = t;
    else {
      if (e instanceof Set && Array.isArray(t)) {
        e.clear(), t.forEach((o) => e.add(o));
        return;
      }
      const n = Object.keys(t);
      if (e instanceof Map) {
        const o = new Set(e.keys());
        n.forEach((u) => {
          e.set(u, Reflect.get(t, u)), o.delete(u);
        }), o.forEach((u) => e.delete(u));
        return;
      }
      const r = new Set(Object.keys(e));
      n.forEach((o) => {
        Reflect.set(e, o, Reflect.get(t, o)), r.delete(o);
      }), r.forEach((o) => Reflect.deleteProperty(e, o));
    }
  }
  get(e) {
    return Le(e) ? e.value : e;
  }
  isRef(e) {
    return Le(e) || Hn(e);
  }
};
l();
l();
l();
var ko = "__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS_STATE__";
function Ro() {
  if (typeof window > "u" || !kn || typeof localStorage > "u" || localStorage === null)
    return {
      recordingState: !1,
      mouseEventEnabled: !1,
      keyboardEventEnabled: !1,
      componentEventEnabled: !1,
      performanceEventEnabled: !1,
      selected: ""
    };
  const e = typeof localStorage.getItem < "u" ? localStorage.getItem(ko) : null;
  return e ? JSON.parse(e) : {
    recordingState: !1,
    mouseEventEnabled: !1,
    keyboardEventEnabled: !1,
    componentEventEnabled: !1,
    performanceEventEnabled: !1,
    selected: ""
  };
}
l();
l();
l();
var At, Ot;
(Ot = (At = p).__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS) != null || (At.__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS = []);
var Po = new Proxy(p.__VUE_DEVTOOLS_KIT_TIMELINE_LAYERS, {
  get(e, t, n) {
    return Reflect.get(e, t, n);
  }
});
function Vo(e, t) {
  D.timelineLayersState[t.id] = !1, Po.push({
    ...e,
    descriptorId: t.id,
    appRecord: tt(t.app)
  });
}
var St, Tt;
(Tt = (St = p).__VUE_DEVTOOLS_KIT_INSPECTOR__) != null || (St.__VUE_DEVTOOLS_KIT_INSPECTOR__ = []);
var st = new Proxy(p.__VUE_DEVTOOLS_KIT_INSPECTOR__, {
  get(e, t, n) {
    return Reflect.get(e, t, n);
  }
}), Kn = se(() => {
  ce.hooks.callHook("sendInspectorToClient", jn());
});
function xo(e, t) {
  var n, r;
  st.push({
    options: e,
    descriptor: t,
    treeFilterPlaceholder: (n = e.treeFilterPlaceholder) != null ? n : "Search tree...",
    stateFilterPlaceholder: (r = e.stateFilterPlaceholder) != null ? r : "Search state...",
    treeFilter: "",
    selectedNodeId: "",
    appRecord: tt(t.app)
  }), Kn();
}
function jn() {
  return st.filter((e) => e.descriptor.app === P.value.app).filter((e) => e.descriptor.id !== "components").map((e) => {
    var t;
    const n = e.descriptor, r = e.options;
    return {
      id: r.id,
      label: r.label,
      logo: n.logo,
      icon: `custom-ic-baseline-${(t = r == null ? void 0 : r.icon) == null ? void 0 : t.replace(/_/g, "-")}`,
      packageName: n.packageName,
      homepage: n.homepage,
      pluginId: n.id
    };
  });
}
function Te(e, t) {
  return st.find((n) => n.options.id === e && (t ? n.descriptor.app === t : !0));
}
function No() {
  const e = Pn();
  e.hook("addInspector", ({ inspector: r, plugin: o }) => {
    xo(r, o.descriptor);
  });
  const t = se(async ({ inspectorId: r, plugin: o }) => {
    var u;
    if (!r || !((u = o == null ? void 0 : o.descriptor) != null && u.app) || D.highPerfModeEnabled)
      return;
    const s = Te(r, o.descriptor.app), i = {
      app: o.descriptor.app,
      inspectorId: r,
      filter: (s == null ? void 0 : s.treeFilter) || "",
      rootNodes: []
    };
    await new Promise((a) => {
      e.callHookWith(
        async (_) => {
          await Promise.all(_.map((m) => m(i))), a();
        },
        "getInspectorTree"
        /* GET_INSPECTOR_TREE */
      );
    }), e.callHookWith(
      async (a) => {
        await Promise.all(a.map((_) => _({
          inspectorId: r,
          rootNodes: i.rootNodes
        })));
      },
      "sendInspectorTreeToClient"
      /* SEND_INSPECTOR_TREE_TO_CLIENT */
    );
  }, 120);
  e.hook("sendInspectorTree", t);
  const n = se(async ({ inspectorId: r, plugin: o }) => {
    var u;
    if (!r || !((u = o == null ? void 0 : o.descriptor) != null && u.app) || D.highPerfModeEnabled)
      return;
    const s = Te(r, o.descriptor.app), i = {
      app: o.descriptor.app,
      inspectorId: r,
      nodeId: (s == null ? void 0 : s.selectedNodeId) || "",
      state: null
    }, a = {
      currentTab: `custom-inspector:${r}`
    };
    i.nodeId && await new Promise((_) => {
      e.callHookWith(
        async (m) => {
          await Promise.all(m.map((f) => f(i, a))), _();
        },
        "getInspectorState"
        /* GET_INSPECTOR_STATE */
      );
    }), e.callHookWith(
      async (_) => {
        await Promise.all(_.map((m) => m({
          inspectorId: r,
          nodeId: i.nodeId,
          state: i.state
        })));
      },
      "sendInspectorStateToClient"
      /* SEND_INSPECTOR_STATE_TO_CLIENT */
    );
  }, 120);
  return e.hook("sendInspectorState", n), e.hook("customInspectorSelectNode", ({ inspectorId: r, nodeId: o, plugin: u }) => {
    const s = Te(r, u.descriptor.app);
    s && (s.selectedNodeId = o);
  }), e.hook("timelineLayerAdded", ({ options: r, plugin: o }) => {
    Vo(r, o.descriptor);
  }), e.hook("timelineEventAdded", ({ options: r, plugin: o }) => {
    var u;
    const s = ["performance", "component-event", "keyboard", "mouse"];
    D.highPerfModeEnabled || !((u = D.timelineLayersState) != null && u[o.descriptor.id]) && !s.includes(r.layerId) || e.callHookWith(
      async (i) => {
        await Promise.all(i.map((a) => a(r)));
      },
      "sendTimelineEventToClient"
      /* SEND_TIMELINE_EVENT_TO_CLIENT */
    );
  }), e.hook("getComponentInstances", async ({ app: r }) => {
    const o = r.__VUE_DEVTOOLS_NEXT_APP_RECORD__;
    if (!o)
      return null;
    const u = o.id.toString();
    return [...o.instanceMap].filter(([i]) => i.split(":")[0] === u).map(([, i]) => i);
  }), e.hook("getComponentBounds", async ({ instance: r }) => J(r)), e.hook("getComponentName", ({ instance: r }) => Pe(r)), e.hook("componentHighlight", ({ uid: r }) => {
    const o = P.value.instanceMap.get(r);
    o && vo(o);
  }), e.hook("componentUnhighlight", () => {
    $n();
  }), e;
}
var Ct, bt;
(bt = (Ct = p).__VUE_DEVTOOLS_KIT_APP_RECORDS__) != null || (Ct.__VUE_DEVTOOLS_KIT_APP_RECORDS__ = []);
var Dt, It;
(It = (Dt = p).__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__) != null || (Dt.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__ = {});
var wt, kt;
(kt = (wt = p).__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__) != null || (wt.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__ = "");
var Rt, Pt;
(Pt = (Rt = p).__VUE_DEVTOOLS_KIT_CUSTOM_TABS__) != null || (Rt.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__ = []);
var Vt, xt;
(xt = (Vt = p).__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__) != null || (Vt.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__ = []);
var X = "__VUE_DEVTOOLS_KIT_GLOBAL_STATE__";
function Uo() {
  return {
    connected: !1,
    clientConnected: !1,
    vitePluginDetected: !0,
    appRecords: [],
    activeAppRecordId: "",
    tabs: [],
    commands: [],
    highPerfModeEnabled: !0,
    devtoolsClientDetected: {},
    perfUniqueGroupId: 0,
    timelineLayersState: Ro()
  };
}
var Nt, Ut;
(Ut = (Nt = p)[X]) != null || (Nt[X] = Uo());
var Fo = se((e) => {
  ce.hooks.callHook("devtoolsStateUpdated", { state: e });
});
se((e, t) => {
  ce.hooks.callHook("devtoolsConnectedUpdated", { state: e, oldState: t });
});
var Ve = new Proxy(p.__VUE_DEVTOOLS_KIT_APP_RECORDS__, {
  get(e, t, n) {
    return t === "value" ? p.__VUE_DEVTOOLS_KIT_APP_RECORDS__ : p.__VUE_DEVTOOLS_KIT_APP_RECORDS__[t];
  }
}), P = new Proxy(p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__, {
  get(e, t, n) {
    return t === "value" ? p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__ : t === "id" ? p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__ : p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__[t];
  }
});
function zn() {
  Fo({
    ...p[X],
    appRecords: Ve.value,
    activeAppRecordId: P.id,
    tabs: p.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__,
    commands: p.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__
  });
}
function Lo(e) {
  p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD__ = e, zn();
}
function Bo(e) {
  p.__VUE_DEVTOOLS_KIT_ACTIVE_APP_RECORD_ID__ = e, zn();
}
var D = new Proxy(p[X], {
  get(e, t) {
    return t === "appRecords" ? Ve : t === "activeAppRecordId" ? P.id : t === "tabs" ? p.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__ : t === "commands" ? p.__VUE_DEVTOOLS_KIT_CUSTOM_COMMANDS__ : p[X][t];
  },
  deleteProperty(e, t) {
    return delete e[t], !0;
  },
  set(e, t, n) {
    return { ...p[X] }, e[t] = n, p[X][t] = n, !0;
  }
});
function Mo(e = {}) {
  var t, n, r;
  const { file: o, host: u, baseUrl: s = window.location.origin, line: i = 0, column: a = 0 } = e;
  if (o) {
    if (u === "chrome-extension") {
      const _ = o.replace(/\\/g, "\\\\"), m = (n = (t = window.VUE_DEVTOOLS_CONFIG) == null ? void 0 : t.openInEditorHost) != null ? n : "/";
      fetch(`${m}__open-in-editor?file=${encodeURI(o)}`).then((f) => {
        if (!f.ok) {
          const g = `Opening component ${_} failed`;
          console.log(`%c${g}`, "color:red");
        }
      });
    } else if (D.vitePluginDetected) {
      const _ = (r = p.__VUE_DEVTOOLS_OPEN_IN_EDITOR_BASE_URL__) != null ? r : s;
      p.__VUE_INSPECTOR__.openInEditor(_, o, i, a);
    }
  }
}
l();
l();
l();
l();
l();
var Ft, Lt;
(Lt = (Ft = p).__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__) != null || (Ft.__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__ = []);
var it = new Proxy(p.__VUE_DEVTOOLS_KIT_PLUGIN_BUFFER__, {
  get(e, t, n) {
    return Reflect.get(e, t, n);
  }
});
function ze(e) {
  const t = {};
  return Object.keys(e).forEach((n) => {
    t[n] = e[n].defaultValue;
  }), t;
}
function at(e) {
  return `__VUE_DEVTOOLS_NEXT_PLUGIN_SETTINGS__${e}__`;
}
function $o(e) {
  var t, n, r;
  const o = (n = (t = it.find((u) => {
    var s;
    return u[0].id === e && !!((s = u[0]) != null && s.settings);
  })) == null ? void 0 : t[0]) != null ? n : null;
  return (r = o == null ? void 0 : o.settings) != null ? r : null;
}
function Gn(e, t) {
  var n, r, o;
  const u = at(e);
  if (u) {
    const s = localStorage.getItem(u);
    if (s)
      return JSON.parse(s);
  }
  if (e) {
    const s = (r = (n = it.find((i) => i[0].id === e)) == null ? void 0 : n[0]) != null ? r : null;
    return ze((o = s == null ? void 0 : s.settings) != null ? o : {});
  }
  return ze(t);
}
function Ho(e, t) {
  const n = at(e);
  localStorage.getItem(n) || localStorage.setItem(n, JSON.stringify(ze(t)));
}
function Ko(e, t, n) {
  const r = at(e), o = localStorage.getItem(r), u = JSON.parse(o || "{}"), s = {
    ...u,
    [t]: n
  };
  localStorage.setItem(r, JSON.stringify(s)), ce.hooks.callHookWith(
    (i) => {
      i.forEach((a) => a({
        pluginId: e,
        key: t,
        oldValue: u[t],
        newValue: n,
        settings: s
      }));
    },
    "setPluginSettings"
    /* SET_PLUGIN_SETTINGS */
  );
}
l();
var Bt, Mt, x = (Mt = (Bt = p).__VUE_DEVTOOLS_HOOK) != null ? Mt : Bt.__VUE_DEVTOOLS_HOOK = Pn(), jo = {
  vueAppInit(e) {
    x.hook("app:init", e);
  },
  vueAppUnmount(e) {
    x.hook("app:unmount", e);
  },
  vueAppConnected(e) {
    x.hook("app:connected", e);
  },
  componentAdded(e) {
    return x.hook("component:added", e);
  },
  componentEmit(e) {
    return x.hook("component:emit", e);
  },
  componentUpdated(e) {
    return x.hook("component:updated", e);
  },
  componentRemoved(e) {
    return x.hook("component:removed", e);
  },
  setupDevtoolsPlugin(e) {
    x.hook("devtools-plugin:setup", e);
  },
  perfStart(e) {
    return x.hook("perf:start", e);
  },
  perfEnd(e) {
    return x.hook("perf:end", e);
  }
}, Wn = {
  on: jo,
  setupDevToolsPlugin(e, t) {
    return x.callHook("devtools-plugin:setup", e, t);
  }
}, zo = class {
  constructor({ plugin: e, ctx: t }) {
    this.hooks = t.hooks, this.plugin = e;
  }
  get on() {
    return {
      // component inspector
      visitComponentTree: (e) => {
        this.hooks.hook("visitComponentTree", e);
      },
      inspectComponent: (e) => {
        this.hooks.hook("inspectComponent", e);
      },
      editComponentState: (e) => {
        this.hooks.hook("editComponentState", e);
      },
      // custom inspector
      getInspectorTree: (e) => {
        this.hooks.hook("getInspectorTree", e);
      },
      getInspectorState: (e) => {
        this.hooks.hook("getInspectorState", e);
      },
      editInspectorState: (e) => {
        this.hooks.hook("editInspectorState", e);
      },
      // timeline
      inspectTimelineEvent: (e) => {
        this.hooks.hook("inspectTimelineEvent", e);
      },
      timelineCleared: (e) => {
        this.hooks.hook("timelineCleared", e);
      },
      // settings
      setPluginSettings: (e) => {
        this.hooks.hook("setPluginSettings", e);
      }
    };
  }
  // component inspector
  notifyComponentUpdate(e) {
    var t;
    if (D.highPerfModeEnabled)
      return;
    const n = jn().find((r) => r.packageName === this.plugin.descriptor.packageName);
    if (n != null && n.id) {
      if (e) {
        const r = [
          e.appContext.app,
          e.uid,
          (t = e.parent) == null ? void 0 : t.uid,
          e
        ];
        x.callHook("component:updated", ...r);
      } else
        x.callHook(
          "component:updated"
          /* COMPONENT_UPDATED */
        );
      this.hooks.callHook("sendInspectorState", { inspectorId: n.id, plugin: this.plugin });
    }
  }
  // custom inspector
  addInspector(e) {
    this.hooks.callHook("addInspector", { inspector: e, plugin: this.plugin }), this.plugin.descriptor.settings && Ho(e.id, this.plugin.descriptor.settings);
  }
  sendInspectorTree(e) {
    D.highPerfModeEnabled || this.hooks.callHook("sendInspectorTree", { inspectorId: e, plugin: this.plugin });
  }
  sendInspectorState(e) {
    D.highPerfModeEnabled || this.hooks.callHook("sendInspectorState", { inspectorId: e, plugin: this.plugin });
  }
  selectInspectorNode(e, t) {
    this.hooks.callHook("customInspectorSelectNode", { inspectorId: e, nodeId: t, plugin: this.plugin });
  }
  visitComponentTree(e) {
    return this.hooks.callHook("visitComponentTree", e);
  }
  // timeline
  now() {
    return D.highPerfModeEnabled ? 0 : Date.now();
  }
  addTimelineLayer(e) {
    this.hooks.callHook("timelineLayerAdded", { options: e, plugin: this.plugin });
  }
  addTimelineEvent(e) {
    D.highPerfModeEnabled || this.hooks.callHook("timelineEventAdded", { options: e, plugin: this.plugin });
  }
  // settings
  getSettings(e) {
    return Gn(e ?? this.plugin.descriptor.id, this.plugin.descriptor.settings);
  }
  // utilities
  getComponentInstances(e) {
    return this.hooks.callHook("getComponentInstances", { app: e });
  }
  getComponentBounds(e) {
    return this.hooks.callHook("getComponentBounds", { instance: e });
  }
  getComponentName(e) {
    return this.hooks.callHook("getComponentName", { instance: e });
  }
  highlightElement(e) {
    const t = e.__VUE_DEVTOOLS_NEXT_UID__;
    return this.hooks.callHook("componentHighlight", { uid: t });
  }
  unhighlightElement() {
    return this.hooks.callHook(
      "componentUnhighlight"
      /* COMPONENT_UNHIGHLIGHT */
    );
  }
}, Go = zo;
l();
l();
l();
l();
var Wo = "__vue_devtool_undefined__", Yo = "__vue_devtool_infinity__", qo = "__vue_devtool_negative_infinity__", Zo = "__vue_devtool_nan__";
l();
l();
var Xo = {
  [Wo]: "undefined",
  [Zo]: "NaN",
  [Yo]: "Infinity",
  [qo]: "-Infinity"
};
Object.entries(Xo).reduce((e, [t, n]) => (e[n] = t, e), {});
l();
l();
l();
l();
l();
var $t, Ht;
(Ht = ($t = p).__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__) != null || ($t.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__ = /* @__PURE__ */ new Set());
function Yn(e, t) {
  return Wn.setupDevToolsPlugin(e, t);
}
function Jo(e, t) {
  const [n, r] = e;
  if (n.app !== t)
    return;
  const o = new Go({
    plugin: {
      setupFn: r,
      descriptor: n
    },
    ctx: ce
  });
  n.packageName === "vuex" && o.on.editInspectorState((u) => {
    o.sendInspectorState(u.inspectorId);
  }), r(o);
}
function qn(e, t) {
  p.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__.has(e) || D.highPerfModeEnabled && !(t != null && t.inspectingComponent) || (p.__VUE_DEVTOOLS_KIT__REGISTERED_PLUGIN_APPS__.add(e), it.forEach((n) => {
    Jo(n, e);
  }));
}
l();
l();
var me = "__VUE_DEVTOOLS_ROUTER__", ie = "__VUE_DEVTOOLS_ROUTER_INFO__", Kt, jt;
(jt = (Kt = p)[ie]) != null || (Kt[ie] = {
  currentRoute: null,
  routes: []
});
var zt, Gt;
(Gt = (zt = p)[me]) != null || (zt[me] = {});
new Proxy(p[ie], {
  get(e, t) {
    return p[ie][t];
  }
});
new Proxy(p[me], {
  get(e, t) {
    if (t === "value")
      return p[me];
  }
});
function Qo(e) {
  const t = /* @__PURE__ */ new Map();
  return ((e == null ? void 0 : e.getRoutes()) || []).filter((n) => !t.has(n.path) && t.set(n.path, 1));
}
function lt(e) {
  return e.map((t) => {
    let { path: n, name: r, children: o, meta: u } = t;
    return o != null && o.length && (o = lt(o)), {
      path: n,
      name: r,
      children: o,
      meta: u
    };
  });
}
function eu(e) {
  if (e) {
    const { fullPath: t, hash: n, href: r, path: o, name: u, matched: s, params: i, query: a } = e;
    return {
      fullPath: t,
      hash: n,
      href: r,
      path: o,
      name: u,
      params: i,
      query: a,
      matched: lt(s)
    };
  }
  return e;
}
function tu(e, t) {
  function n() {
    var r;
    const o = (r = e.app) == null ? void 0 : r.config.globalProperties.$router, u = eu(o == null ? void 0 : o.currentRoute.value), s = lt(Qo(o)), i = console.warn;
    console.warn = () => {
    }, p[ie] = {
      currentRoute: u ? ht(u) : {},
      routes: ht(s)
    }, p[me] = o, console.warn = i;
  }
  n(), Wn.on.componentUpdated(se(() => {
    var r;
    ((r = t.value) == null ? void 0 : r.app) === e.app && (n(), !D.highPerfModeEnabled && ce.hooks.callHook("routerInfoUpdated", { state: p[ie] }));
  }, 200));
}
function nu(e) {
  return {
    // get inspector tree
    async getInspectorTree(t) {
      const n = {
        ...t,
        app: P.value.app,
        rootNodes: []
      };
      return await new Promise((r) => {
        e.callHookWith(
          async (o) => {
            await Promise.all(o.map((u) => u(n))), r();
          },
          "getInspectorTree"
          /* GET_INSPECTOR_TREE */
        );
      }), n.rootNodes;
    },
    // get inspector state
    async getInspectorState(t) {
      const n = {
        ...t,
        app: P.value.app,
        state: null
      }, r = {
        currentTab: `custom-inspector:${t.inspectorId}`
      };
      return await new Promise((o) => {
        e.callHookWith(
          async (u) => {
            await Promise.all(u.map((s) => s(n, r))), o();
          },
          "getInspectorState"
          /* GET_INSPECTOR_STATE */
        );
      }), n.state;
    },
    // edit inspector state
    editInspectorState(t) {
      const n = new Io(), r = {
        ...t,
        app: P.value.app,
        set: (o, u = t.path, s = t.state.value, i) => {
          n.set(o, u, s, i || n.createDefaultSetCallback(t.state));
        }
      };
      e.callHookWith(
        (o) => {
          o.forEach((u) => u(r));
        },
        "editInspectorState"
        /* EDIT_INSPECTOR_STATE */
      );
    },
    // send inspector state
    sendInspectorState(t) {
      const n = Te(t);
      e.callHook("sendInspectorState", { inspectorId: t, plugin: {
        descriptor: n.descriptor,
        setupFn: () => ({})
      } });
    },
    // inspect component inspector
    inspectComponentInspector() {
      return Oo();
    },
    // cancel inspect component inspector
    cancelInspectComponentInspector() {
      return Ao();
    },
    // get component render code
    getComponentRenderCode(t) {
      const n = He(P.value, t);
      if (n)
        return typeof (n == null ? void 0 : n.type) != "function" ? n.render.toString() : n.type.toString();
    },
    // scroll to component
    scrollToComponent(t) {
      return So({ id: t });
    },
    // open in editor
    openInEditor: Mo,
    // get vue inspector
    getVueInspector: bo,
    // toggle app
    toggleApp(t, n) {
      const r = Ve.value.find((o) => o.id === t);
      r && (Bo(t), Lo(r), tu(r, P), Kn(), qn(r.app, n));
    },
    // inspect dom
    inspectDOM(t) {
      const n = He(P.value, t);
      if (n) {
        const [r] = nt(n);
        r && (p.__VUE_DEVTOOLS_INSPECT_DOM_TARGET__ = r);
      }
    },
    updatePluginSettings(t, n, r) {
      Ko(t, n, r);
    },
    getPluginSettings(t) {
      return {
        options: $o(t),
        values: Gn(t)
      };
    }
  };
}
l();
var Wt, Yt;
(Yt = (Wt = p).__VUE_DEVTOOLS_ENV__) != null || (Wt.__VUE_DEVTOOLS_ENV__ = {
  vitePluginDetected: !1
});
var qt = No(), Zt, Xt;
(Xt = (Zt = p).__VUE_DEVTOOLS_KIT_CONTEXT__) != null || (Zt.__VUE_DEVTOOLS_KIT_CONTEXT__ = {
  hooks: qt,
  get state() {
    return {
      ...D,
      activeAppRecordId: P.id,
      activeAppRecord: P.value,
      appRecords: Ve.value
    };
  },
  api: nu(qt)
});
var ce = p.__VUE_DEVTOOLS_KIT_CONTEXT__;
l();
no(oo());
var Jt, Qt;
(Qt = (Jt = p).__VUE_DEVTOOLS_NEXT_APP_RECORD_INFO__) != null || (Jt.__VUE_DEVTOOLS_NEXT_APP_RECORD_INFO__ = {
  id: 0,
  appIds: /* @__PURE__ */ new Set()
});
l();
l();
function ru(e) {
  D.highPerfModeEnabled = e ?? !D.highPerfModeEnabled, !e && P.value && qn(P.value.app);
}
l();
l();
l();
function ou(e) {
  D.devtoolsClientDetected = {
    ...D.devtoolsClientDetected,
    ...e
  };
  const t = Object.values(D.devtoolsClientDetected).some(Boolean);
  ru(!t);
}
var en, tn;
(tn = (en = p).__VUE_DEVTOOLS_UPDATE_CLIENT_DETECTED__) != null || (en.__VUE_DEVTOOLS_UPDATE_CLIENT_DETECTED__ = ou);
l();
l();
l();
l();
l();
l();
var uu = class {
  constructor() {
    this.keyToValue = /* @__PURE__ */ new Map(), this.valueToKey = /* @__PURE__ */ new Map();
  }
  set(e, t) {
    this.keyToValue.set(e, t), this.valueToKey.set(t, e);
  }
  getByKey(e) {
    return this.keyToValue.get(e);
  }
  getByValue(e) {
    return this.valueToKey.get(e);
  }
  clear() {
    this.keyToValue.clear(), this.valueToKey.clear();
  }
}, Zn = class {
  constructor(e) {
    this.generateIdentifier = e, this.kv = new uu();
  }
  register(e, t) {
    this.kv.getByValue(e) || (t || (t = this.generateIdentifier(e)), this.kv.set(t, e));
  }
  clear() {
    this.kv.clear();
  }
  getIdentifier(e) {
    return this.kv.getByValue(e);
  }
  getValue(e) {
    return this.kv.getByKey(e);
  }
}, su = class extends Zn {
  constructor() {
    super((e) => e.name), this.classToAllowedProps = /* @__PURE__ */ new Map();
  }
  register(e, t) {
    typeof t == "object" ? (t.allowProps && this.classToAllowedProps.set(e, t.allowProps), super.register(e, t.identifier)) : super.register(e, t);
  }
  getAllowedProps(e) {
    return this.classToAllowedProps.get(e);
  }
};
l();
l();
function iu(e) {
  if ("values" in Object)
    return Object.values(e);
  const t = [];
  for (const n in e)
    e.hasOwnProperty(n) && t.push(e[n]);
  return t;
}
function au(e, t) {
  const n = iu(e);
  if ("find" in n)
    return n.find(t);
  const r = n;
  for (let o = 0; o < r.length; o++) {
    const u = r[o];
    if (t(u))
      return u;
  }
}
function ae(e, t) {
  Object.entries(e).forEach(([n, r]) => t(r, n));
}
function Ce(e, t) {
  return e.indexOf(t) !== -1;
}
function nn(e, t) {
  for (let n = 0; n < e.length; n++) {
    const r = e[n];
    if (t(r))
      return r;
  }
}
var lu = class {
  constructor() {
    this.transfomers = {};
  }
  register(e) {
    this.transfomers[e.name] = e;
  }
  findApplicable(e) {
    return au(this.transfomers, (t) => t.isApplicable(e));
  }
  findByName(e) {
    return this.transfomers[e];
  }
};
l();
l();
var cu = (e) => Object.prototype.toString.call(e).slice(8, -1), Xn = (e) => typeof e > "u", fu = (e) => e === null, ve = (e) => typeof e != "object" || e === null || e === Object.prototype ? !1 : Object.getPrototypeOf(e) === null ? !0 : Object.getPrototypeOf(e) === Object.prototype, Ge = (e) => ve(e) && Object.keys(e).length === 0, q = (e) => Array.isArray(e), _u = (e) => typeof e == "string", du = (e) => typeof e == "number" && !isNaN(e), pu = (e) => typeof e == "boolean", Eu = (e) => e instanceof RegExp, ye = (e) => e instanceof Map, Ae = (e) => e instanceof Set, Jn = (e) => cu(e) === "Symbol", hu = (e) => e instanceof Date && !isNaN(e.valueOf()), gu = (e) => e instanceof Error, rn = (e) => typeof e == "number" && isNaN(e), mu = (e) => pu(e) || fu(e) || Xn(e) || du(e) || _u(e) || Jn(e), vu = (e) => typeof e == "bigint", yu = (e) => e === 1 / 0 || e === -1 / 0, Au = (e) => ArrayBuffer.isView(e) && !(e instanceof DataView), Ou = (e) => e instanceof URL;
l();
var Qn = (e) => e.replace(/\./g, "\\."), Be = (e) => e.map(String).map(Qn).join("."), Ee = (e) => {
  const t = [];
  let n = "";
  for (let o = 0; o < e.length; o++) {
    let u = e.charAt(o);
    if (u === "\\" && e.charAt(o + 1) === ".") {
      n += ".", o++;
      continue;
    }
    if (u === ".") {
      t.push(n), n = "";
      continue;
    }
    n += u;
  }
  const r = n;
  return t.push(r), t;
};
l();
function j(e, t, n, r) {
  return {
    isApplicable: e,
    annotation: t,
    transform: n,
    untransform: r
  };
}
var er = [
  j(Xn, "undefined", () => null, () => {
  }),
  j(vu, "bigint", (e) => e.toString(), (e) => typeof BigInt < "u" ? BigInt(e) : (console.error("Please add a BigInt polyfill."), e)),
  j(hu, "Date", (e) => e.toISOString(), (e) => new Date(e)),
  j(gu, "Error", (e, t) => {
    const n = {
      name: e.name,
      message: e.message
    };
    return t.allowedErrorProps.forEach((r) => {
      n[r] = e[r];
    }), n;
  }, (e, t) => {
    const n = new Error(e.message);
    return n.name = e.name, n.stack = e.stack, t.allowedErrorProps.forEach((r) => {
      n[r] = e[r];
    }), n;
  }),
  j(Eu, "regexp", (e) => "" + e, (e) => {
    const t = e.slice(1, e.lastIndexOf("/")), n = e.slice(e.lastIndexOf("/") + 1);
    return new RegExp(t, n);
  }),
  j(
    Ae,
    "set",
    // (sets only exist in es6+)
    // eslint-disable-next-line es5/no-es6-methods
    (e) => [...e.values()],
    (e) => new Set(e)
  ),
  j(ye, "map", (e) => [...e.entries()], (e) => new Map(e)),
  j((e) => rn(e) || yu(e), "number", (e) => rn(e) ? "NaN" : e > 0 ? "Infinity" : "-Infinity", Number),
  j((e) => e === 0 && 1 / e === -1 / 0, "number", () => "-0", Number),
  j(Ou, "URL", (e) => e.toString(), (e) => new URL(e))
];
function xe(e, t, n, r) {
  return {
    isApplicable: e,
    annotation: t,
    transform: n,
    untransform: r
  };
}
var tr = xe((e, t) => Jn(e) ? !!t.symbolRegistry.getIdentifier(e) : !1, (e, t) => ["symbol", t.symbolRegistry.getIdentifier(e)], (e) => e.description, (e, t, n) => {
  const r = n.symbolRegistry.getValue(t[1]);
  if (!r)
    throw new Error("Trying to deserialize unknown symbol");
  return r;
}), Su = [
  Int8Array,
  Uint8Array,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  Uint8ClampedArray
].reduce((e, t) => (e[t.name] = t, e), {}), nr = xe(Au, (e) => ["typed-array", e.constructor.name], (e) => [...e], (e, t) => {
  const n = Su[t[1]];
  if (!n)
    throw new Error("Trying to deserialize unknown typed array");
  return new n(e);
});
function rr(e, t) {
  return e != null && e.constructor ? !!t.classRegistry.getIdentifier(e.constructor) : !1;
}
var or = xe(rr, (e, t) => ["class", t.classRegistry.getIdentifier(e.constructor)], (e, t) => {
  const n = t.classRegistry.getAllowedProps(e.constructor);
  if (!n)
    return { ...e };
  const r = {};
  return n.forEach((o) => {
    r[o] = e[o];
  }), r;
}, (e, t, n) => {
  const r = n.classRegistry.getValue(t[1]);
  if (!r)
    throw new Error(`Trying to deserialize unknown class '${t[1]}' - check https://github.com/blitz-js/superjson/issues/116#issuecomment-773996564`);
  return Object.assign(Object.create(r.prototype), e);
}), ur = xe((e, t) => !!t.customTransformerRegistry.findApplicable(e), (e, t) => ["custom", t.customTransformerRegistry.findApplicable(e).name], (e, t) => t.customTransformerRegistry.findApplicable(e).serialize(e), (e, t, n) => {
  const r = n.customTransformerRegistry.findByName(t[1]);
  if (!r)
    throw new Error("Trying to deserialize unknown custom value");
  return r.deserialize(e);
}), Tu = [or, tr, ur, nr], on = (e, t) => {
  const n = nn(Tu, (o) => o.isApplicable(e, t));
  if (n)
    return {
      value: n.transform(e, t),
      type: n.annotation(e, t)
    };
  const r = nn(er, (o) => o.isApplicable(e, t));
  if (r)
    return {
      value: r.transform(e, t),
      type: r.annotation
    };
}, sr = {};
er.forEach((e) => {
  sr[e.annotation] = e;
});
var Cu = (e, t, n) => {
  if (q(t))
    switch (t[0]) {
      case "symbol":
        return tr.untransform(e, t, n);
      case "class":
        return or.untransform(e, t, n);
      case "custom":
        return ur.untransform(e, t, n);
      case "typed-array":
        return nr.untransform(e, t, n);
      default:
        throw new Error("Unknown transformation: " + t);
    }
  else {
    const r = sr[t];
    if (!r)
      throw new Error("Unknown transformation: " + t);
    return r.untransform(e, n);
  }
};
l();
var ne = (e, t) => {
  if (t > e.size)
    throw new Error("index out of bounds");
  const n = e.keys();
  for (; t > 0; )
    n.next(), t--;
  return n.next().value;
};
function ir(e) {
  if (Ce(e, "__proto__"))
    throw new Error("__proto__ is not allowed as a property");
  if (Ce(e, "prototype"))
    throw new Error("prototype is not allowed as a property");
  if (Ce(e, "constructor"))
    throw new Error("constructor is not allowed as a property");
}
var bu = (e, t) => {
  ir(t);
  for (let n = 0; n < t.length; n++) {
    const r = t[n];
    if (Ae(e))
      e = ne(e, +r);
    else if (ye(e)) {
      const o = +r, u = +t[++n] == 0 ? "key" : "value", s = ne(e, o);
      switch (u) {
        case "key":
          e = s;
          break;
        case "value":
          e = e.get(s);
          break;
      }
    } else
      e = e[r];
  }
  return e;
}, We = (e, t, n) => {
  if (ir(t), t.length === 0)
    return n(e);
  let r = e;
  for (let u = 0; u < t.length - 1; u++) {
    const s = t[u];
    if (q(r)) {
      const i = +s;
      r = r[i];
    } else if (ve(r))
      r = r[s];
    else if (Ae(r)) {
      const i = +s;
      r = ne(r, i);
    } else if (ye(r)) {
      if (u === t.length - 2)
        break;
      const a = +s, _ = +t[++u] == 0 ? "key" : "value", m = ne(r, a);
      switch (_) {
        case "key":
          r = m;
          break;
        case "value":
          r = r.get(m);
          break;
      }
    }
  }
  const o = t[t.length - 1];
  if (q(r) ? r[+o] = n(r[+o]) : ve(r) && (r[o] = n(r[o])), Ae(r)) {
    const u = ne(r, +o), s = n(u);
    u !== s && (r.delete(u), r.add(s));
  }
  if (ye(r)) {
    const u = +t[t.length - 2], s = ne(r, u);
    switch (+o == 0 ? "key" : "value") {
      case "key": {
        const a = n(s);
        r.set(a, r.get(s)), a !== s && r.delete(s);
        break;
      }
      case "value": {
        r.set(s, n(r.get(s)));
        break;
      }
    }
  }
  return e;
};
function Ye(e, t, n = []) {
  if (!e)
    return;
  if (!q(e)) {
    ae(e, (u, s) => Ye(u, t, [...n, ...Ee(s)]));
    return;
  }
  const [r, o] = e;
  o && ae(o, (u, s) => {
    Ye(u, t, [...n, ...Ee(s)]);
  }), t(r, n);
}
function Du(e, t, n) {
  return Ye(t, (r, o) => {
    e = We(e, o, (u) => Cu(u, r, n));
  }), e;
}
function Iu(e, t) {
  function n(r, o) {
    const u = bu(e, Ee(o));
    r.map(Ee).forEach((s) => {
      e = We(e, s, () => u);
    });
  }
  if (q(t)) {
    const [r, o] = t;
    r.forEach((u) => {
      e = We(e, Ee(u), () => e);
    }), o && ae(o, n);
  } else
    ae(t, n);
  return e;
}
var wu = (e, t) => ve(e) || q(e) || ye(e) || Ae(e) || rr(e, t);
function ku(e, t, n) {
  const r = n.get(e);
  r ? r.push(t) : n.set(e, [t]);
}
function Ru(e, t) {
  const n = {};
  let r;
  return e.forEach((o) => {
    if (o.length <= 1)
      return;
    t || (o = o.map((i) => i.map(String)).sort((i, a) => i.length - a.length));
    const [u, ...s] = o;
    u.length === 0 ? r = s.map(Be) : n[Be(u)] = s.map(Be);
  }), r ? Ge(n) ? [r] : [r, n] : Ge(n) ? void 0 : n;
}
var ar = (e, t, n, r, o = [], u = [], s = /* @__PURE__ */ new Map()) => {
  var i;
  const a = mu(e);
  if (!a) {
    ku(e, o, t);
    const d = s.get(e);
    if (d)
      return r ? {
        transformedValue: null
      } : d;
  }
  if (!wu(e, n)) {
    const d = on(e, n), v = d ? {
      transformedValue: d.value,
      annotations: [d.type]
    } : {
      transformedValue: e
    };
    return a || s.set(e, v), v;
  }
  if (Ce(u, e))
    return {
      transformedValue: null
    };
  const _ = on(e, n), m = (i = _ == null ? void 0 : _.value) != null ? i : e, f = q(m) ? [] : {}, g = {};
  ae(m, (d, v) => {
    if (v === "__proto__" || v === "constructor" || v === "prototype")
      throw new Error(`Detected property ${v}. This is a prototype pollution risk, please remove it from your object.`);
    const E = ar(d, t, n, r, [...o, v], [...u, e], s);
    f[v] = E.transformedValue, q(E.annotations) ? g[v] = E.annotations : ve(E.annotations) && ae(E.annotations, (h, T) => {
      g[Qn(v) + "." + T] = h;
    });
  });
  const c = Ge(g) ? {
    transformedValue: f,
    annotations: _ ? [_.type] : void 0
  } : {
    transformedValue: f,
    annotations: _ ? [_.type, g] : g
  };
  return a || s.set(e, c), c;
};
l();
l();
function lr(e) {
  return Object.prototype.toString.call(e).slice(8, -1);
}
function un(e) {
  return lr(e) === "Array";
}
function Pu(e) {
  if (lr(e) !== "Object")
    return !1;
  const t = Object.getPrototypeOf(e);
  return !!t && t.constructor === Object && t === Object.prototype;
}
function Vu(e, t, n, r, o) {
  const u = {}.propertyIsEnumerable.call(r, t) ? "enumerable" : "nonenumerable";
  u === "enumerable" && (e[t] = n), o && u === "nonenumerable" && Object.defineProperty(e, t, {
    value: n,
    enumerable: !1,
    writable: !0,
    configurable: !0
  });
}
function qe(e, t = {}) {
  if (un(e))
    return e.map((o) => qe(o, t));
  if (!Pu(e))
    return e;
  const n = Object.getOwnPropertyNames(e), r = Object.getOwnPropertySymbols(e);
  return [...n, ...r].reduce((o, u) => {
    if (un(t.props) && !t.props.includes(u))
      return o;
    const s = e[u], i = qe(s, t);
    return Vu(o, u, i, e, t.nonenumerable), o;
  }, {});
}
var C = class {
  /**
   * @param dedupeReferentialEqualities  If true, SuperJSON will make sure only one instance of referentially equal objects are serialized and the rest are replaced with `null`.
   */
  constructor({ dedupe: e = !1 } = {}) {
    this.classRegistry = new su(), this.symbolRegistry = new Zn((t) => {
      var n;
      return (n = t.description) != null ? n : "";
    }), this.customTransformerRegistry = new lu(), this.allowedErrorProps = [], this.dedupe = e;
  }
  serialize(e) {
    const t = /* @__PURE__ */ new Map(), n = ar(e, t, this, this.dedupe), r = {
      json: n.transformedValue
    };
    n.annotations && (r.meta = {
      ...r.meta,
      values: n.annotations
    });
    const o = Ru(t, this.dedupe);
    return o && (r.meta = {
      ...r.meta,
      referentialEqualities: o
    }), r;
  }
  deserialize(e) {
    const { json: t, meta: n } = e;
    let r = qe(t);
    return n != null && n.values && (r = Du(r, n.values, this)), n != null && n.referentialEqualities && (r = Iu(r, n.referentialEqualities)), r;
  }
  stringify(e) {
    return JSON.stringify(this.serialize(e));
  }
  parse(e) {
    return this.deserialize(JSON.parse(e));
  }
  registerClass(e, t) {
    this.classRegistry.register(e, t);
  }
  registerSymbol(e, t) {
    this.symbolRegistry.register(e, t);
  }
  registerCustom(e, t) {
    this.customTransformerRegistry.register({
      name: t,
      ...e
    });
  }
  allowErrorProps(...e) {
    this.allowedErrorProps.push(...e);
  }
};
C.defaultInstance = new C();
C.serialize = C.defaultInstance.serialize.bind(C.defaultInstance);
C.deserialize = C.defaultInstance.deserialize.bind(C.defaultInstance);
C.stringify = C.defaultInstance.stringify.bind(C.defaultInstance);
C.parse = C.defaultInstance.parse.bind(C.defaultInstance);
C.registerClass = C.defaultInstance.registerClass.bind(C.defaultInstance);
C.registerSymbol = C.defaultInstance.registerSymbol.bind(C.defaultInstance);
C.registerCustom = C.defaultInstance.registerCustom.bind(C.defaultInstance);
C.allowErrorProps = C.defaultInstance.allowErrorProps.bind(C.defaultInstance);
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
l();
var sn, an;
(an = (sn = p).__VUE_DEVTOOLS_KIT_MESSAGE_CHANNELS__) != null || (sn.__VUE_DEVTOOLS_KIT_MESSAGE_CHANNELS__ = []);
var ln, cn;
(cn = (ln = p).__VUE_DEVTOOLS_KIT_RPC_CLIENT__) != null || (ln.__VUE_DEVTOOLS_KIT_RPC_CLIENT__ = null);
var fn, _n;
(_n = (fn = p).__VUE_DEVTOOLS_KIT_RPC_SERVER__) != null || (fn.__VUE_DEVTOOLS_KIT_RPC_SERVER__ = null);
var dn, pn;
(pn = (dn = p).__VUE_DEVTOOLS_KIT_VITE_RPC_CLIENT__) != null || (dn.__VUE_DEVTOOLS_KIT_VITE_RPC_CLIENT__ = null);
var En, hn;
(hn = (En = p).__VUE_DEVTOOLS_KIT_VITE_RPC_SERVER__) != null || (En.__VUE_DEVTOOLS_KIT_VITE_RPC_SERVER__ = null);
var gn, mn;
(mn = (gn = p).__VUE_DEVTOOLS_KIT_BROADCAST_RPC_SERVER__) != null || (gn.__VUE_DEVTOOLS_KIT_BROADCAST_RPC_SERVER__ = null);
l();
l();
l();
l();
/*!
 * pinia v3.0.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
const oe = typeof window < "u";
let ct;
const Ne = (e) => ct = e, rs = () => Sn() && Tn(ft) || ct, ft = (
  /* istanbul ignore next */
  Symbol()
);
function Ze(e) {
  return e && typeof e == "object" && Object.prototype.toString.call(e) === "[object Object]" && typeof e.toJSON != "function";
}
var z;
(function(e) {
  e.direct = "direct", e.patchObject = "patch object", e.patchFunction = "patch function";
})(z || (z = {}));
const vn = typeof window == "object" && window.window === window ? window : typeof self == "object" && self.self === self ? self : typeof global == "object" && global.global === global ? global : typeof globalThis == "object" ? globalThis : { HTMLElement: null };
function xu(e, { autoBom: t = !1 } = {}) {
  return t && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type) ? new Blob(["\uFEFF", e], { type: e.type }) : e;
}
function _t(e, t, n) {
  const r = new XMLHttpRequest();
  r.open("GET", e), r.responseType = "blob", r.onload = function() {
    _r(r.response, t, n);
  }, r.onerror = function() {
    console.error("could not download file");
  }, r.send();
}
function cr(e) {
  const t = new XMLHttpRequest();
  t.open("HEAD", e, !1);
  try {
    t.send();
  } catch {
  }
  return t.status >= 200 && t.status <= 299;
}
function be(e) {
  try {
    e.dispatchEvent(new MouseEvent("click"));
  } catch {
    const n = new MouseEvent("click", {
      bubbles: !0,
      cancelable: !0,
      view: window,
      detail: 0,
      screenX: 80,
      screenY: 20,
      clientX: 80,
      clientY: 20,
      ctrlKey: !1,
      altKey: !1,
      shiftKey: !1,
      metaKey: !1,
      button: 0,
      relatedTarget: null
    });
    e.dispatchEvent(n);
  }
}
const De = typeof navigator == "object" ? navigator : { userAgent: "" }, fr = /Macintosh/.test(De.userAgent) && /AppleWebKit/.test(De.userAgent) && !/Safari/.test(De.userAgent), _r = oe ? (
  // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
  typeof HTMLAnchorElement < "u" && "download" in HTMLAnchorElement.prototype && !fr ? Nu : (
    // Use msSaveOrOpenBlob as a second approach
    "msSaveOrOpenBlob" in De ? Uu : (
      // Fallback to using FileReader and a popup
      Fu
    )
  )
) : () => {
};
function Nu(e, t = "download", n) {
  const r = document.createElement("a");
  r.download = t, r.rel = "noopener", typeof e == "string" ? (r.href = e, r.origin !== location.origin ? cr(r.href) ? _t(e, t, n) : (r.target = "_blank", be(r)) : be(r)) : (r.href = URL.createObjectURL(e), setTimeout(function() {
    URL.revokeObjectURL(r.href);
  }, 4e4), setTimeout(function() {
    be(r);
  }, 0));
}
function Uu(e, t = "download", n) {
  if (typeof e == "string")
    if (cr(e))
      _t(e, t, n);
    else {
      const r = document.createElement("a");
      r.href = e, r.target = "_blank", setTimeout(function() {
        be(r);
      });
    }
  else
    navigator.msSaveOrOpenBlob(xu(e, n), t);
}
function Fu(e, t, n, r) {
  if (r = r || open("", "_blank"), r && (r.document.title = r.document.body.innerText = "downloading..."), typeof e == "string")
    return _t(e, t, n);
  const o = e.type === "application/octet-stream", u = /constructor/i.test(String(vn.HTMLElement)) || "safari" in vn, s = /CriOS\/[\d]+/.test(navigator.userAgent);
  if ((s || o && u || fr) && typeof FileReader < "u") {
    const i = new FileReader();
    i.onloadend = function() {
      let a = i.result;
      if (typeof a != "string")
        throw r = null, new Error("Wrong reader.result type");
      a = s ? a : a.replace(/^data:[^;]*;/, "data:attachment/file;"), r ? r.location.href = a : location.assign(a), r = null;
    }, i.readAsDataURL(e);
  } else {
    const i = URL.createObjectURL(e);
    r ? r.location.assign(i) : location.href = i, r = null, setTimeout(function() {
      URL.revokeObjectURL(i);
    }, 4e4);
  }
}
function w(e, t) {
  const n = "🍍 " + e;
  typeof __VUE_DEVTOOLS_TOAST__ == "function" ? __VUE_DEVTOOLS_TOAST__(n, t) : t === "error" ? console.error(n) : t === "warn" ? console.warn(n) : console.log(n);
}
function dt(e) {
  return "_a" in e && "install" in e;
}
function dr() {
  if (!("clipboard" in navigator))
    return w("Your browser doesn't support the Clipboard API", "error"), !0;
}
function pr(e) {
  return e instanceof Error && e.message.toLowerCase().includes("document is not focused") ? (w('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn"), !0) : !1;
}
async function Lu(e) {
  if (!dr())
    try {
      await navigator.clipboard.writeText(JSON.stringify(e.state.value)), w("Global state copied to clipboard.");
    } catch (t) {
      if (pr(t))
        return;
      w("Failed to serialize the state. Check the console for more details.", "error"), console.error(t);
    }
}
async function Bu(e) {
  if (!dr())
    try {
      Er(e, JSON.parse(await navigator.clipboard.readText())), w("Global state pasted from clipboard.");
    } catch (t) {
      if (pr(t))
        return;
      w("Failed to deserialize the state from clipboard. Check the console for more details.", "error"), console.error(t);
    }
}
async function Mu(e) {
  try {
    _r(new Blob([JSON.stringify(e.state.value)], {
      type: "text/plain;charset=utf-8"
    }), "pinia-state.json");
  } catch (t) {
    w("Failed to export the state as JSON. Check the console for more details.", "error"), console.error(t);
  }
}
let G;
function $u() {
  G || (G = document.createElement("input"), G.type = "file", G.accept = ".json");
  function e() {
    return new Promise((t, n) => {
      G.onchange = async () => {
        const r = G.files;
        if (!r)
          return t(null);
        const o = r.item(0);
        return t(o ? { text: await o.text(), file: o } : null);
      }, G.oncancel = () => t(null), G.onerror = n, G.click();
    });
  }
  return e;
}
async function Hu(e) {
  try {
    const n = await $u()();
    if (!n)
      return;
    const { text: r, file: o } = n;
    Er(e, JSON.parse(r)), w(`Global state imported from "${o.name}".`);
  } catch (t) {
    w("Failed to import the state from JSON. Check the console for more details.", "error"), console.error(t);
  }
}
function Er(e, t) {
  for (const n in t) {
    const r = e.state.value[n];
    r ? Object.assign(r, t[n]) : e.state.value[n] = t[n];
  }
}
function H(e) {
  return {
    _custom: {
      display: e
    }
  };
}
const hr = "🍍 Pinia (root)", Ie = "_root";
function Ku(e) {
  return dt(e) ? {
    id: Ie,
    label: hr
  } : {
    id: e.$id,
    label: e.$id
  };
}
function ju(e) {
  if (dt(e)) {
    const n = Array.from(e._s.keys()), r = e._s;
    return {
      state: n.map((u) => ({
        editable: !0,
        key: u,
        value: e.state.value[u]
      })),
      getters: n.filter((u) => r.get(u)._getters).map((u) => {
        const s = r.get(u);
        return {
          editable: !1,
          key: u,
          value: s._getters.reduce((i, a) => (i[a] = s[a], i), {})
        };
      })
    };
  }
  const t = {
    state: Object.keys(e.$state).map((n) => ({
      editable: !0,
      key: n,
      value: e.$state[n]
    }))
  };
  return e._getters && e._getters.length && (t.getters = e._getters.map((n) => ({
    editable: !1,
    key: n,
    value: e[n]
  }))), e._customProperties.size && (t.customProperties = Array.from(e._customProperties).map((n) => ({
    editable: !0,
    key: n,
    value: e[n]
  }))), t;
}
function zu(e) {
  return e ? Array.isArray(e) ? e.reduce((t, n) => (t.keys.push(n.key), t.operations.push(n.type), t.oldValue[n.key] = n.oldValue, t.newValue[n.key] = n.newValue, t), {
    oldValue: {},
    keys: [],
    operations: [],
    newValue: {}
  }) : {
    operation: H(e.type),
    key: H(e.key),
    oldValue: e.oldValue,
    newValue: e.newValue
  } : {};
}
function Gu(e) {
  switch (e) {
    case z.direct:
      return "mutation";
    case z.patchFunction:
      return "$patch";
    case z.patchObject:
      return "$patch";
    default:
      return "unknown";
  }
}
let re = !0;
const we = [], Z = "pinia:mutations", R = "pinia", { assign: Wu } = Object, Re = (e) => "🍍 " + e;
function Yu(e, t) {
  Yn({
    id: "dev.esm.pinia",
    label: "Pinia 🍍",
    logo: "https://pinia.vuejs.org/logo.svg",
    packageName: "pinia",
    homepage: "https://pinia.vuejs.org",
    componentStateTypes: we,
    app: e
  }, (n) => {
    typeof n.now != "function" && w("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html."), n.addTimelineLayer({
      id: Z,
      label: "Pinia 🍍",
      color: 15064968
    }), n.addInspector({
      id: R,
      label: "Pinia 🍍",
      icon: "storage",
      treeFilterPlaceholder: "Search stores",
      actions: [
        {
          icon: "content_copy",
          action: () => {
            Lu(t);
          },
          tooltip: "Serialize and copy the state"
        },
        {
          icon: "content_paste",
          action: async () => {
            await Bu(t), n.sendInspectorTree(R), n.sendInspectorState(R);
          },
          tooltip: "Replace the state with the content of your clipboard"
        },
        {
          icon: "save",
          action: () => {
            Mu(t);
          },
          tooltip: "Save the state as a JSON file"
        },
        {
          icon: "folder_open",
          action: async () => {
            await Hu(t), n.sendInspectorTree(R), n.sendInspectorState(R);
          },
          tooltip: "Import the state from a JSON file"
        }
      ],
      nodeActions: [
        {
          icon: "restore",
          tooltip: 'Reset the state (with "$reset")',
          action: (r) => {
            const o = t._s.get(r);
            o ? typeof o.$reset != "function" ? w(`Cannot reset "${r}" store because it doesn't have a "$reset" method implemented.`, "warn") : (o.$reset(), w(`Store "${r}" reset.`)) : w(`Cannot reset "${r}" store because it wasn't found.`, "warn");
          }
        }
      ]
    }), n.on.inspectComponent((r) => {
      const o = r.componentInstance && r.componentInstance.proxy;
      if (o && o._pStores) {
        const u = r.componentInstance.proxy._pStores;
        Object.values(u).forEach((s) => {
          r.instanceData.state.push({
            type: Re(s.$id),
            key: "state",
            editable: !0,
            value: s._isOptionsAPI ? {
              _custom: {
                value: ue(s.$state),
                actions: [
                  {
                    icon: "restore",
                    tooltip: "Reset the state of this store",
                    action: () => s.$reset()
                  }
                ]
              }
            } : (
              // NOTE: workaround to unwrap transferred refs
              Object.keys(s.$state).reduce((i, a) => (i[a] = s.$state[a], i), {})
            )
          }), s._getters && s._getters.length && r.instanceData.state.push({
            type: Re(s.$id),
            key: "getters",
            editable: !1,
            value: s._getters.reduce((i, a) => {
              try {
                i[a] = s[a];
              } catch (_) {
                i[a] = _;
              }
              return i;
            }, {})
          });
        });
      }
    }), n.on.getInspectorTree((r) => {
      if (r.app === e && r.inspectorId === R) {
        let o = [t];
        o = o.concat(Array.from(t._s.values())), r.rootNodes = (r.filter ? o.filter((u) => "$id" in u ? u.$id.toLowerCase().includes(r.filter.toLowerCase()) : hr.toLowerCase().includes(r.filter.toLowerCase())) : o).map(Ku);
      }
    }), globalThis.$pinia = t, n.on.getInspectorState((r) => {
      if (r.app === e && r.inspectorId === R) {
        const o = r.nodeId === Ie ? t : t._s.get(r.nodeId);
        if (!o)
          return;
        o && (r.nodeId !== Ie && (globalThis.$store = ue(o)), r.state = ju(o));
      }
    }), n.on.editInspectorState((r) => {
      if (r.app === e && r.inspectorId === R) {
        const o = r.nodeId === Ie ? t : t._s.get(r.nodeId);
        if (!o)
          return w(`store "${r.nodeId}" not found`, "error");
        const { path: u } = r;
        dt(o) ? u.unshift("state") : (u.length !== 1 || !o._customProperties.has(u[0]) || u[0] in o.$state) && u.unshift("$state"), re = !1, r.set(o, u, r.state.value), re = !0;
      }
    }), n.on.editComponentState((r) => {
      if (r.type.startsWith("🍍")) {
        const o = r.type.replace(/^🍍\s*/, ""), u = t._s.get(o);
        if (!u)
          return w(`store "${o}" not found`, "error");
        const { path: s } = r;
        if (s[0] !== "state")
          return w(`Invalid path for store "${o}":
${s}
Only state can be modified.`);
        s[0] = "$state", re = !1, r.set(u, s, r.state.value), re = !0;
      }
    });
  });
}
function qu(e, t) {
  we.includes(Re(t.$id)) || we.push(Re(t.$id)), Yn({
    id: "dev.esm.pinia",
    label: "Pinia 🍍",
    logo: "https://pinia.vuejs.org/logo.svg",
    packageName: "pinia",
    homepage: "https://pinia.vuejs.org",
    componentStateTypes: we,
    app: e,
    settings: {
      logStoreChanges: {
        label: "Notify about new/deleted stores",
        type: "boolean",
        defaultValue: !0
      }
      // useEmojis: {
      //   label: 'Use emojis in messages ⚡️',
      //   type: 'boolean',
      //   defaultValue: true,
      // },
    }
  }, (n) => {
    const r = typeof n.now == "function" ? n.now.bind(n) : Date.now;
    t.$onAction(({ after: s, onError: i, name: a, args: _ }) => {
      const m = gr++;
      n.addTimelineEvent({
        layerId: Z,
        event: {
          time: r(),
          title: "🛫 " + a,
          subtitle: "start",
          data: {
            store: H(t.$id),
            action: H(a),
            args: _
          },
          groupId: m
        }
      }), s((f) => {
        Y = void 0, n.addTimelineEvent({
          layerId: Z,
          event: {
            time: r(),
            title: "🛬 " + a,
            subtitle: "end",
            data: {
              store: H(t.$id),
              action: H(a),
              args: _,
              result: f
            },
            groupId: m
          }
        });
      }), i((f) => {
        Y = void 0, n.addTimelineEvent({
          layerId: Z,
          event: {
            time: r(),
            logType: "error",
            title: "💥 " + a,
            subtitle: "end",
            data: {
              store: H(t.$id),
              action: H(a),
              args: _,
              error: f
            },
            groupId: m
          }
        });
      });
    }, !0), t._customProperties.forEach((s) => {
      In(() => Tr(t[s]), (i, a) => {
        n.notifyComponentUpdate(), n.sendInspectorState(R), re && n.addTimelineEvent({
          layerId: Z,
          event: {
            time: r(),
            title: "Change",
            subtitle: s,
            data: {
              newValue: i,
              oldValue: a
            },
            groupId: Y
          }
        });
      }, { deep: !0 });
    }), t.$subscribe(({ events: s, type: i }, a) => {
      if (n.notifyComponentUpdate(), n.sendInspectorState(R), !re)
        return;
      const _ = {
        time: r(),
        title: Gu(i),
        data: Wu({ store: H(t.$id) }, zu(s)),
        groupId: Y
      };
      i === z.patchFunction ? _.subtitle = "⤵️" : i === z.patchObject ? _.subtitle = "🧩" : s && !Array.isArray(s) && (_.subtitle = s.type), s && (_.data["rawEvent(s)"] = {
        _custom: {
          display: "DebuggerEvent",
          type: "object",
          tooltip: "raw DebuggerEvent[]",
          value: s
        }
      }), n.addTimelineEvent({
        layerId: Z,
        event: _
      });
    }, { detached: !0, flush: "sync" });
    const o = t._hotUpdate;
    t._hotUpdate = he((s) => {
      o(s), n.addTimelineEvent({
        layerId: Z,
        event: {
          time: r(),
          title: "🔥 " + t.$id,
          subtitle: "HMR update",
          data: {
            store: H(t.$id),
            info: H("HMR update")
          }
        }
      }), n.notifyComponentUpdate(), n.sendInspectorTree(R), n.sendInspectorState(R);
    });
    const { $dispose: u } = t;
    t.$dispose = () => {
      u(), n.notifyComponentUpdate(), n.sendInspectorTree(R), n.sendInspectorState(R), n.getSettings().logStoreChanges && w(`Disposed "${t.$id}" store 🗑`);
    }, n.notifyComponentUpdate(), n.sendInspectorTree(R), n.sendInspectorState(R), n.getSettings().logStoreChanges && w(`"${t.$id}" store installed 🆕`);
  });
}
let gr = 0, Y;
function yn(e, t, n) {
  const r = t.reduce((o, u) => (o[u] = ue(e)[u], o), {});
  for (const o in r)
    e[o] = function() {
      const u = gr, s = n ? new Proxy(e, {
        get(...a) {
          return Y = u, Reflect.get(...a);
        },
        set(...a) {
          return Y = u, Reflect.set(...a);
        }
      }) : e;
      Y = u;
      const i = r[o].apply(s, arguments);
      return Y = void 0, i;
    };
}
function Zu({ app: e, store: t, options: n }) {
  if (!t.$id.startsWith("__hot:")) {
    if (t._isOptionsAPI = !!n.state, !t._p._testing) {
      yn(t, Object.keys(n.actions), t._isOptionsAPI);
      const r = t._hotUpdate;
      ue(t)._hotUpdate = function(o) {
        r.apply(this, arguments), yn(t, Object.keys(o._hmrPayload.actions), !!t._isOptionsAPI);
      };
    }
    qu(
      e,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      t
    );
  }
}
function os() {
  const e = Cn(!0), t = e.run(() => bn({}));
  let n = [], r = [];
  const o = he({
    install(u) {
      Ne(o), o._a = u, u.provide(ft, o), u.config.globalProperties.$pinia = o, typeof __VUE_PROD_DEVTOOLS__ < "u" && __VUE_PROD_DEVTOOLS__ && oe && Yu(u, o), r.forEach((s) => n.push(s)), r = [];
    },
    use(u) {
      return this._a ? n.push(u) : r.push(u), this;
    },
    _p: n,
    // it's actually undefined here
    // @ts-expect-error
    _a: null,
    _e: e,
    _s: /* @__PURE__ */ new Map(),
    state: t
  });
  return typeof __VUE_PROD_DEVTOOLS__ < "u" && __VUE_PROD_DEVTOOLS__ && oe && typeof Proxy < "u" && o.use(Zu), o;
}
function us(e) {
  e._e.stop(), e._s.clear(), e._p.splice(0), e.state.value = {}, e._a = null;
}
function ss(e, t) {
  return () => {
  };
}
const mr = () => {
};
function An(e, t, n, r = mr) {
  e.add(t);
  const o = () => {
    e.delete(t) && r();
  };
  return !n && Cr() && br(o), o;
}
function te(e, ...t) {
  e.forEach((n) => {
    n(...t);
  });
}
const Xu = (e) => e(), On = Symbol(), Me = Symbol();
function Xe(e, t) {
  e instanceof Map && t instanceof Map ? t.forEach((n, r) => e.set(r, n)) : e instanceof Set && t instanceof Set && t.forEach(e.add, e);
  for (const n in t) {
    if (!t.hasOwnProperty(n))
      continue;
    const r = t[n], o = e[n];
    Ze(o) && Ze(r) && e.hasOwnProperty(n) && !ge(r) && !Je(r) ? e[n] = Xe(o, r) : e[n] = r;
  }
  return e;
}
const vr = (
  /* istanbul ignore next */
  Symbol()
);
function is(e) {
  return Object.defineProperty(e, vr, {});
}
function Ju(e) {
  return !Ze(e) || !Object.prototype.hasOwnProperty.call(e, vr);
}
const { assign: $ } = Object;
function Qu(e) {
  return !!(ge(e) && e.effect);
}
function es(e, t, n, r) {
  const { state: o, actions: u, getters: s } = t, i = n.state.value[e];
  let a;
  function _() {
    i || (n.state.value[e] = o ? o() : {});
    const m = Ir(n.state.value[e]);
    return $(m, u, Object.keys(s || {}).reduce((f, g) => (f[g] = he(Dn(() => {
      Ne(n);
      const c = n._s.get(e);
      return s[g].call(c, c);
    })), f), {}));
  }
  return a = yr(e, _, t, n, r, !0), a;
}
function yr(e, t, n = {}, r, o, u) {
  let s;
  const i = $({ actions: {} }, n), a = { deep: !0 };
  let _, m, f = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Set(), c;
  const d = r.state.value[e];
  !u && !d && (r.state.value[e] = {});
  const v = bn({});
  let E;
  function h(O) {
    let y;
    _ = m = !1, typeof O == "function" ? (O(r.state.value[e]), y = {
      type: z.patchFunction,
      storeId: e,
      events: c
    }) : (Xe(r.state.value[e], O), y = {
      type: z.patchObject,
      payload: O,
      storeId: e,
      events: c
    });
    const k = E = Symbol();
    Dr().then(() => {
      E === k && (_ = !0);
    }), m = !0, te(f, y, r.state.value[e]);
  }
  const T = u ? function() {
    const { state: y } = n, k = y ? y() : {};
    this.$patch((U) => {
      $(U, k);
    });
  } : (
    /* istanbul ignore next */
    mr
  );
  function S() {
    s.stop(), f.clear(), g.clear(), r._s.delete(e);
  }
  const V = (O, y = "") => {
    if (On in O)
      return O[Me] = y, O;
    const k = function() {
      Ne(r);
      const U = Array.from(arguments), F = /* @__PURE__ */ new Set(), Q = /* @__PURE__ */ new Set();
      function B(b) {
        F.add(b);
      }
      function A(b) {
        Q.add(b);
      }
      te(g, {
        args: U,
        name: k[Me],
        store: I,
        after: B,
        onError: A
      });
      let K;
      try {
        K = O.apply(this && this.$id === e ? this : I, U);
      } catch (b) {
        throw te(Q, b), b;
      }
      return K instanceof Promise ? K.then((b) => (te(F, b), b)).catch((b) => (te(Q, b), Promise.reject(b))) : (te(F, K), K);
    };
    return k[On] = !0, k[Me] = y, k;
  }, fe = /* @__PURE__ */ he({
    actions: {},
    getters: {},
    state: [],
    hotState: v
  }), N = {
    _p: r,
    // _s: scope,
    $id: e,
    $onAction: An.bind(null, g),
    $patch: h,
    $reset: T,
    $subscribe(O, y = {}) {
      const k = An(f, O, y.detached, () => U()), U = s.run(() => In(() => r.state.value[e], (F) => {
        (y.flush === "sync" ? m : _) && O({
          storeId: e,
          type: z.direct,
          events: c
        }, F);
      }, $({}, a, y)));
      return k;
    },
    $dispose: S
  }, I = Sr(typeof __VUE_PROD_DEVTOOLS__ < "u" && __VUE_PROD_DEVTOOLS__ && oe ? $(
    {
      _hmrPayload: fe,
      _customProperties: he(/* @__PURE__ */ new Set())
      // devtools custom properties
    },
    N
    // must be added later
    // setupStore
  ) : N);
  r._s.set(e, I);
  const L = (r._a && r._a.runWithContext || Xu)(() => r._e.run(() => (s = Cn()).run(() => t({ action: V }))));
  for (const O in L) {
    const y = L[O];
    if (ge(y) && !Qu(y) || Je(y))
      u || (d && Ju(y) && (ge(y) ? y.value = d[O] : Xe(y, d[O])), r.state.value[e][O] = y);
    else if (typeof y == "function") {
      const k = V(y, O);
      L[O] = k, i.actions[O] = y;
    }
  }
  if ($(I, L), $(ue(I), L), Object.defineProperty(I, "$state", {
    get: () => r.state.value[e],
    set: (O) => {
      h((y) => {
        $(y, O);
      });
    }
  }), typeof __VUE_PROD_DEVTOOLS__ < "u" && __VUE_PROD_DEVTOOLS__ && oe) {
    const O = {
      writable: !0,
      configurable: !0,
      // avoid warning on devtools trying to display this property
      enumerable: !1
    };
    ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((y) => {
      Object.defineProperty(I, y, $({ value: I[y] }, O));
    });
  }
  return r._p.forEach((O) => {
    if (typeof __VUE_PROD_DEVTOOLS__ < "u" && __VUE_PROD_DEVTOOLS__ && oe) {
      const y = s.run(() => O({
        store: I,
        app: r._a,
        pinia: r,
        options: i
      }));
      Object.keys(y || {}).forEach((k) => I._customProperties.add(k)), $(I, y);
    } else
      $(I, s.run(() => O({
        store: I,
        app: r._a,
        pinia: r,
        options: i
      })));
  }), d && u && n.hydrate && n.hydrate(I.$state, d), _ = !0, m = !0, I;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function as(e, t, n) {
  let r;
  const o = typeof t == "function";
  r = o ? n : t;
  function u(s, i) {
    const a = Sn();
    return s = // in test mode, ignore the argument provided as we can always retrieve a
    // pinia instance with getActivePinia()
    s || (a ? Tn(ft, null) : null), s && Ne(s), s = ct, s._s.has(e) || (o ? yr(e, t, r, s) : es(e, r, s)), s._s.get(e);
  }
  return u.$id = e, u;
}
let Ar = "Store";
function ls(e) {
  Ar = e;
}
function cs(...e) {
  return e.reduce((t, n) => (t[n.$id + Ar] = function() {
    return n(this.$pinia);
  }, t), {});
}
function ts(e, t) {
  return Array.isArray(t) ? t.reduce((n, r) => (n[r] = function() {
    return e(this.$pinia)[r];
  }, n), {}) : Object.keys(t).reduce((n, r) => (n[r] = function() {
    const o = e(this.$pinia), u = t[r];
    return typeof u == "function" ? u.call(this, o) : (
      // @ts-expect-error: FIXME: should work?
      o[u]
    );
  }, n), {});
}
const fs = ts;
function _s(e, t) {
  return Array.isArray(t) ? t.reduce((n, r) => (n[r] = function(...o) {
    return e(this.$pinia)[r](...o);
  }, n), {}) : Object.keys(t).reduce((n, r) => (n[r] = function(...o) {
    return e(this.$pinia)[t[r]](...o);
  }, n), {});
}
function ds(e, t) {
  return Array.isArray(t) ? t.reduce((n, r) => (n[r] = {
    get() {
      return e(this.$pinia)[r];
    },
    set(o) {
      return e(this.$pinia)[r] = o;
    }
  }, n), {}) : Object.keys(t).reduce((n, r) => (n[r] = {
    get() {
      return e(this.$pinia)[t[r]];
    },
    set(o) {
      return e(this.$pinia)[t[r]] = o;
    }
  }, n), {});
}
function ps(e) {
  const t = ue(e), n = {};
  for (const r in t) {
    const o = t[r];
    o.effect ? n[r] = // ...
    Dn({
      get: () => e[r],
      set(u) {
        e[r] = u;
      }
    }) : (ge(o) || Je(o)) && (n[r] = // ---
    Or(e, r));
  }
  return n;
}
export {
  z as MutationType,
  ss as acceptHMRUpdate,
  os as createPinia,
  as as defineStore,
  us as disposePinia,
  rs as getActivePinia,
  _s as mapActions,
  fs as mapGetters,
  ts as mapState,
  cs as mapStores,
  ds as mapWritableState,
  Ne as setActivePinia,
  ls as setMapStoreSuffix,
  Ju as shouldHydrate,
  is as skipHydrate,
  ps as storeToRefs
};
