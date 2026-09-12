import { inject as M, onUnmounted as wt, onDeactivated as Nt, onActivated as St, watch as Xe, defineComponent as Ze, reactive as Tt, computed as G, h as $e, unref as J, provide as ve, ref as xt, shallowRef as kt, getCurrentInstance as Dt, watchEffect as Lt, shallowReactive as Vt, nextTick as Gt } from "vue";
function Bt() {
  return et().__VUE_DEVTOOLS_GLOBAL_HOOK__;
}
function et() {
  return typeof navigator < "u" && typeof window < "u" ? window : typeof globalThis < "u" ? globalThis : {};
}
const Ut = typeof Proxy == "function", Mt = "devtools-plugin:setup", jt = "plugin:settings:set";
let Y, Ae;
function Ht() {
  var e;
  return Y !== void 0 || (typeof window < "u" && window.performance ? (Y = !0, Ae = window.performance) : typeof globalThis < "u" && (!((e = globalThis.perf_hooks) === null || e === void 0) && e.performance) ? (Y = !0, Ae = globalThis.perf_hooks.performance) : Y = !1), Y;
}
function Kt() {
  return Ht() ? Ae.now() : Date.now();
}
class qt {
  constructor(t, n) {
    this.target = null, this.targetQueue = [], this.onQueue = [], this.plugin = t, this.hook = n;
    const r = {};
    if (t.settings)
      for (const d in t.settings) {
        const u = t.settings[d];
        r[d] = u.defaultValue;
      }
    const o = `__vue-devtools-plugin-settings__${t.id}`;
    let f = Object.assign({}, r);
    try {
      const d = localStorage.getItem(o), u = JSON.parse(d);
      Object.assign(f, u);
    } catch {
    }
    this.fallbacks = {
      getSettings() {
        return f;
      },
      setSettings(d) {
        try {
          localStorage.setItem(o, JSON.stringify(d));
        } catch {
        }
        f = d;
      },
      now() {
        return Kt();
      }
    }, n && n.on(jt, (d, u) => {
      d === this.plugin.id && this.fallbacks.setSettings(u);
    }), this.proxiedOn = new Proxy({}, {
      get: (d, u) => this.target ? this.target.on[u] : (...s) => {
        this.onQueue.push({
          method: u,
          args: s
        });
      }
    }), this.proxiedTarget = new Proxy({}, {
      get: (d, u) => this.target ? this.target[u] : u === "on" ? this.proxiedOn : Object.keys(this.fallbacks).includes(u) ? (...s) => (this.targetQueue.push({
        method: u,
        args: s,
        resolve: () => {
        }
      }), this.fallbacks[u](...s)) : (...s) => new Promise((h) => {
        this.targetQueue.push({
          method: u,
          args: s,
          resolve: h
        });
      })
    });
  }
  async setRealTarget(t) {
    this.target = t;
    for (const n of this.onQueue)
      this.target.on[n.method](...n.args);
    for (const n of this.targetQueue)
      n.resolve(await this.target[n.method](...n.args));
  }
}
function Qt(e, t) {
  const n = e, r = et(), o = Bt(), f = Ut && n.enableEarlyProxy;
  if (o && (r.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !f))
    o.emit(Mt, e, t);
  else {
    const d = f ? new qt(n, o) : null;
    (r.__VUE_DEVTOOLS_PLUGINS__ = r.__VUE_DEVTOOLS_PLUGINS__ || []).push({
      pluginDescriptor: n,
      setupFn: t,
      proxy: d
    }), d && t(d.proxiedTarget);
  }
}
/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
const U = typeof document < "u";
function tt(e) {
  return typeof e == "object" || "displayName" in e || "props" in e || "__vccOpts" in e;
}
function nt(e) {
  return e.__esModule || e[Symbol.toStringTag] === "Module" || e.default && tt(e.default);
}
const C = Object.assign;
function _e(e, t) {
  const n = {};
  for (const r in t) {
    const o = t[r];
    n[r] = D(o) ? o.map(e) : e(o);
  }
  return n;
}
const re = () => {
}, D = Array.isArray;
function Le(e, t) {
  const n = {};
  for (const r in e) n[r] = r in t ? t[r] : e[r];
  return n;
}
function Wt(e) {
  const t = Array.from(arguments).slice(1);
  console.warn.apply(console, ["[Vue Router warn]: " + e].concat(t));
}
const rt = /#/g, Ft = /&/g, zt = /\//g, Yt = /=/g, Jt = /\?/g, ot = /\+/g, Xt = /%5B/g, Zt = /%5D/g, st = /%5E/g, $t = /%60/g, it = /%7B/g, en = /%7C/g, at = /%7D/g, tn = /%20/g;
function be(e) {
  return e == null ? "" : encodeURI("" + e).replace(en, "|").replace(Xt, "[").replace(Zt, "]");
}
function nn(e) {
  return be(e).replace(it, "{").replace(at, "}").replace(st, "^");
}
function Oe(e) {
  return be(e).replace(ot, "%2B").replace(tn, "+").replace(rt, "%23").replace(Ft, "%26").replace($t, "`").replace(it, "{").replace(at, "}").replace(st, "^");
}
function rn(e) {
  return Oe(e).replace(Yt, "%3D");
}
function on(e) {
  return be(e).replace(rt, "%23").replace(Jt, "%3F");
}
function sn(e) {
  return on(e).replace(zt, "%2F");
}
function X(e) {
  if (e == null) return null;
  try {
    return decodeURIComponent("" + e);
  } catch {
  }
  return "" + e;
}
const an = /\/$/, cn = (e) => e.replace(an, "");
function Ee(e, t, n = "/") {
  let r, o = {}, f = "", d = "";
  const u = t.indexOf("#");
  let s = t.indexOf("?");
  return s = u >= 0 && s > u ? -1 : s, s >= 0 && (r = t.slice(0, s), f = t.slice(s, u > 0 ? u : t.length), o = e(f.slice(1))), u >= 0 && (r = r || t.slice(0, u), d = t.slice(u, t.length)), r = dn(r ?? t, n), {
    fullPath: r + f + d,
    path: r,
    query: o,
    hash: X(d)
  };
}
function ln(e, t) {
  const n = t.query ? e(t.query) : "";
  return t.path + (n && "?") + n + (t.hash || "");
}
function Ve(e, t) {
  return !t || !e.toLowerCase().startsWith(t.toLowerCase()) ? e : e.slice(t.length) || "/";
}
function un(e, t, n) {
  const r = t.matched.length - 1, o = n.matched.length - 1;
  return r > -1 && r === o && q(t.matched[r], n.matched[o]) && ct(t.params, n.params) && e(t.query) === e(n.query) && t.hash === n.hash;
}
function q(e, t) {
  return (e.aliasOf || e) === (t.aliasOf || t);
}
function ct(e, t) {
  if (Object.keys(e).length !== Object.keys(t).length) return !1;
  for (var n in e) if (!fn(e[n], t[n])) return !1;
  return !0;
}
function fn(e, t) {
  return D(e) ? Ge(e, t) : D(t) ? Ge(t, e) : (e == null ? void 0 : e.valueOf()) === (t == null ? void 0 : t.valueOf());
}
function Ge(e, t) {
  return D(t) ? e.length === t.length && e.every((n, r) => n === t[r]) : e.length === 1 && e[0] === t;
}
function dn(e, t) {
  if (e.startsWith("/")) return e;
  if (!e) return t;
  const n = t.split("/"), r = e.split("/"), o = r[r.length - 1];
  (o === ".." || o === ".") && r.push("");
  let f = n.length - 1, d, u;
  for (d = 0; d < r.length; d++)
    if (u = r[d], u !== ".")
      if (u === "..")
        f > 1 && f--;
      else break;
  return n.slice(0, f).join("/") + "/" + r.slice(d).join("/");
}
const H = {
  path: "/",
  name: void 0,
  params: {},
  query: {},
  hash: "",
  fullPath: "/",
  matched: [],
  meta: {},
  redirectedFrom: void 0
};
let ce = /* @__PURE__ */ (function(e) {
  return e.pop = "pop", e.push = "push", e;
})({}), oe = /* @__PURE__ */ (function(e) {
  return e.back = "back", e.forward = "forward", e.unknown = "", e;
})({});
const Re = "";
function lt(e) {
  if (!e) if (U) {
    const t = document.querySelector("base");
    e = t && t.getAttribute("href") || "/", e = e.replace(/^\w+:\/\/[^\/]+/, "");
  } else e = "/";
  return e[0] !== "/" && e[0] !== "#" && (e = "/" + e), cn(e);
}
const hn = /^[^#]+#/;
function ut(e, t) {
  return e.replace(hn, "#") + t;
}
function pn(e, t) {
  const n = document.documentElement.getBoundingClientRect(), r = e.getBoundingClientRect();
  return {
    behavior: t.behavior,
    left: r.left - n.left - (t.left || 0),
    top: r.top - n.top - (t.top || 0)
  };
}
const le = () => ({
  left: window.scrollX,
  top: window.scrollY
});
function mn(e) {
  let t;
  if ("el" in e) {
    const n = e.el, r = typeof n == "string" && n.startsWith("#"), o = typeof n == "string" ? r ? document.getElementById(n.slice(1)) : document.querySelector(n) : n;
    if (!o)
      return;
    t = pn(o, e);
  } else t = e;
  "scrollBehavior" in document.documentElement.style ? window.scrollTo(t) : window.scrollTo(t.left != null ? t.left : window.scrollX, t.top != null ? t.top : window.scrollY);
}
function Be(e, t) {
  return (history.state ? history.state.position - t : -1) + e;
}
const Ce = /* @__PURE__ */ new Map();
function gn(e, t) {
  Ce.set(e, t);
}
function vn(e) {
  const t = Ce.get(e);
  return Ce.delete(e), t;
}
function ft(e) {
  return typeof e == "string" || e && typeof e == "object";
}
function dt(e) {
  return typeof e == "string" || typeof e == "symbol";
}
let w = /* @__PURE__ */ (function(e) {
  return e[e.MATCHER_NOT_FOUND = 1] = "MATCHER_NOT_FOUND", e[e.NAVIGATION_GUARD_REDIRECT = 2] = "NAVIGATION_GUARD_REDIRECT", e[e.NAVIGATION_ABORTED = 4] = "NAVIGATION_ABORTED", e[e.NAVIGATION_CANCELLED = 8] = "NAVIGATION_CANCELLED", e[e.NAVIGATION_DUPLICATED = 16] = "NAVIGATION_DUPLICATED", e;
})({});
const ht = Symbol("");
let ir = /* @__PURE__ */ (function(e) {
  return e[e.aborted = 4] = "aborted", e[e.cancelled = 8] = "cancelled", e[e.duplicated = 16] = "duplicated", e;
})({});
w.MATCHER_NOT_FOUND + "", w.NAVIGATION_GUARD_REDIRECT + "", w.NAVIGATION_ABORTED + "", w.NAVIGATION_CANCELLED + "", w.NAVIGATION_DUPLICATED + "";
function Z(e, t) {
  return C(/* @__PURE__ */ new Error(), {
    type: e,
    [ht]: !0
  }, t);
}
function B(e, t) {
  return e instanceof Error && ht in e && (t == null || !!(e.type & t));
}
const _n = [
  "params",
  "query",
  "hash"
];
function En(e) {
  if (typeof e == "string") return e;
  if (e.path != null) return e.path;
  const t = {};
  for (const n of _n) n in e && (t[n] = e[n]);
  return JSON.stringify(t, null, 2);
}
function Rn(e) {
  const t = {};
  if (e === "" || e === "?") return t;
  const n = (e[0] === "?" ? e.slice(1) : e).split("&");
  for (let r = 0; r < n.length; ++r) {
    const o = n[r].replace(ot, " "), f = o.indexOf("="), d = X(f < 0 ? o : o.slice(0, f)), u = f < 0 ? null : X(o.slice(f + 1));
    if (d in t) {
      let s = t[d];
      D(s) || (s = t[d] = [s]), s.push(u);
    } else t[d] = u;
  }
  return t;
}
function Ue(e) {
  let t = "";
  for (let n in e) {
    const r = e[n];
    if (n = rn(n), r == null) {
      r !== void 0 && (t += (t.length ? "&" : "") + n);
      continue;
    }
    (D(r) ? r.map((o) => o && Oe(o)) : [r && Oe(r)]).forEach((o) => {
      o !== void 0 && (t += (t.length ? "&" : "") + n, o != null && (t += "=" + o));
    });
  }
  return t;
}
function yn(e) {
  const t = {};
  for (const n in e) {
    const r = e[n];
    r !== void 0 && (t[n] = D(r) ? r.map((o) => o == null ? null : "" + o) : r == null ? r : "" + r);
  }
  return t;
}
const we = Symbol(""), Me = Symbol(""), ue = Symbol(""), Ne = Symbol(""), Ie = Symbol("");
function te() {
  let e = [];
  function t(r) {
    return e.push(r), () => {
      const o = e.indexOf(r);
      o > -1 && e.splice(o, 1);
    };
  }
  function n() {
    e = [];
  }
  return {
    add: t,
    list: () => e.slice(),
    reset: n
  };
}
function pt(e, t, n) {
  const r = () => {
    e[t].delete(n);
  };
  wt(r), Nt(r), St(() => {
    e[t].add(n);
  }), e[t].add(n);
}
function ar(e) {
  const t = M(we, {}).value;
  t && pt(t, "leaveGuards", e);
}
function cr(e) {
  const t = M(we, {}).value;
  t && pt(t, "updateGuards", e);
}
function K(e, t, n, r, o, f = (d) => d()) {
  const d = r && (r.enterCallbacks[o] = r.enterCallbacks[o] || []);
  return () => new Promise((u, s) => {
    const h = (a) => {
      a === !1 ? s(Z(w.NAVIGATION_ABORTED, {
        from: n,
        to: t
      })) : a instanceof Error ? s(a) : ft(a) ? s(Z(w.NAVIGATION_GUARD_REDIRECT, {
        from: t,
        to: a
      })) : (d && r.enterCallbacks[o] === d && typeof a == "function" && d.push(a), u());
    }, l = f(() => e.call(r && r.instances[o], t, n, h));
    let i = Promise.resolve(l);
    e.length < 3 && (i = i.then(h)), i.catch((a) => s(a));
  });
}
function ye(e, t, n, r, o = (f) => f()) {
  const f = [];
  for (const d of e)
    for (const u in d.components) {
      let s = d.components[u];
      if (!(t !== "beforeRouteEnter" && !d.instances[u]))
        if (tt(s)) {
          const h = (s.__vccOpts || s)[t];
          h && f.push(K(h, n, r, d, u, o));
        } else {
          let h = s();
          f.push(() => h.then((l) => {
            if (!l) throw new Error(`Couldn't resolve component "${u}" at "${d.path}"`);
            const i = nt(l) ? l.default : l;
            d.mods[u] = l, d.components[u] = i;
            const a = (i.__vccOpts || i)[t];
            return a && K(a, n, r, d, u, o)();
          }));
        }
    }
  return f;
}
function lr(e) {
  return e.matched.every((t) => t.redirect) ? Promise.reject(/* @__PURE__ */ new Error("Cannot load a route that redirects.")) : Promise.all(e.matched.map((t) => t.components && Promise.all(Object.keys(t.components).reduce((n, r) => {
    const o = t.components[r];
    return typeof o == "function" && !("displayName" in o) && n.push(o().then((f) => {
      if (!f) return Promise.reject(/* @__PURE__ */ new Error(`Couldn't resolve component "${r}" at "${t.path}". Ensure you passed a function that returns a promise.`));
      const d = nt(f) ? f.default : f;
      t.mods[r] = f, t.components[r] = d;
    })), n;
  }, [])))).then(() => e);
}
function An(e, t) {
  const n = [], r = [], o = [], f = Math.max(t.matched.length, e.matched.length);
  for (let d = 0; d < f; d++) {
    const u = t.matched[d];
    u && (e.matched.find((h) => q(h, u)) ? r.push(u) : n.push(u));
    const s = e.matched[d];
    s && (t.matched.find((h) => q(h, s)) || o.push(s));
  }
  return [
    n,
    r,
    o
  ];
}
function ne(e, t) {
  const n = C({}, e, { matched: e.matched.map((r) => kn(r, [
    "instances",
    "children",
    "aliasOf"
  ])) });
  return { _custom: {
    type: null,
    readOnly: !0,
    display: e.fullPath,
    tooltip: t,
    value: n
  } };
}
function ae(e) {
  return { _custom: { display: e } };
}
let On = 0;
function Cn(e, t, n) {
  if (t.__hasDevtools) return;
  t.__hasDevtools = !0;
  const r = On++;
  Qt({
    id: "org.vuejs.router" + (r ? "." + r : ""),
    label: "Vue Router",
    packageName: "vue-router",
    homepage: "https://router.vuejs.org",
    logo: "https://router.vuejs.org/logo.png",
    componentStateTypes: ["Routing"],
    app: e
  }, (o) => {
    typeof o.now != "function" && Wt("[Vue Router]: You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html."), o.on.inspectComponent((l, i) => {
      l.instanceData && l.instanceData.state.push({
        type: "Routing",
        key: "$route",
        editable: !1,
        value: ne(t.currentRoute.value, "Current Route")
      });
    }), o.on.visitComponentTree(({ treeNode: l, componentInstance: i }) => {
      if (i.__vrv_devtools) {
        const a = i.__vrv_devtools;
        l.tags.push({
          label: (a.name ? `${a.name.toString()}: ` : "") + a.path,
          textColor: 0,
          tooltip: "This component is rendered by &lt;router-view&gt;",
          backgroundColor: mt
        });
      }
      D(i.__vrl_devtools) && (i.__devtoolsApi = o, i.__vrl_devtools.forEach((a) => {
        let p = a.route.path, R = _t, O = "", I = 0;
        a.error ? (p = a.error, R = Nn, I = Sn) : a.isExactActive ? (R = vt, O = "This is exactly active") : a.isActive && (R = gt, O = "This link is active"), l.tags.push({
          label: p,
          textColor: I,
          tooltip: O,
          backgroundColor: R
        });
      }));
    }), Xe(t.currentRoute, () => {
      s(), o.notifyComponentUpdate(), o.sendInspectorTree(u), o.sendInspectorState(u);
    });
    const f = "router:navigations:" + r;
    o.addTimelineLayer({
      id: f,
      label: `Router${r ? " " + r : ""} Navigations`,
      color: 4237508
    }), t.onError((l, i) => {
      o.addTimelineEvent({
        layerId: f,
        event: {
          title: "Error during Navigation",
          subtitle: i.fullPath,
          logType: "error",
          time: o.now(),
          data: { error: l },
          groupId: i.meta.__navigationId
        }
      });
    });
    let d = 0;
    t.beforeEach((l, i) => {
      const a = {
        guard: ae("beforeEach"),
        from: ne(i, "Current Location during this navigation"),
        to: ne(l, "Target location")
      };
      Object.defineProperty(l.meta, "__navigationId", { value: d++ }), o.addTimelineEvent({
        layerId: f,
        event: {
          time: o.now(),
          title: "Start of navigation",
          subtitle: l.fullPath,
          data: a,
          groupId: l.meta.__navigationId
        }
      });
    }), t.afterEach((l, i, a) => {
      const p = { guard: ae("afterEach") };
      a ? (p.failure = { _custom: {
        type: Error,
        readOnly: !0,
        display: a ? a.message : "",
        tooltip: "Navigation Failure",
        value: a
      } }, p.status = ae("❌")) : p.status = ae("✅"), p.from = ne(i, "Current Location during this navigation"), p.to = ne(l, "Target location"), o.addTimelineEvent({
        layerId: f,
        event: {
          title: "End of navigation",
          subtitle: l.fullPath,
          time: o.now(),
          data: p,
          logType: a ? "warning" : "default",
          groupId: l.meta.__navigationId
        }
      });
    });
    const u = "router-inspector:" + r;
    o.addInspector({
      id: u,
      label: "Routes" + (r ? " " + r : ""),
      icon: "book",
      treeFilterPlaceholder: "Search routes"
    });
    function s() {
      if (!h) return;
      const l = h;
      let i = n.getRoutes().filter((a) => !a.parent || !a.parent.record.components);
      i.forEach(yt), l.filter && (i = i.filter((a) => Pe(a, l.filter.toLowerCase()))), i.forEach((a) => Rt(a, t.currentRoute.value)), l.rootNodes = i.map(Et);
    }
    let h;
    o.on.getInspectorTree((l) => {
      h = l, l.app === e && l.inspectorId === u && s();
    }), o.on.getInspectorState((l) => {
      if (l.app === e && l.inspectorId === u) {
        const i = n.getRoutes().find((a) => a.record.__vd_id === l.nodeId);
        i && (l.state = { options: Pn(i) });
      }
    }), o.sendInspectorTree(u), o.sendInspectorState(u);
  });
}
function In(e) {
  return e.optional ? e.repeatable ? "*" : "?" : e.repeatable ? "+" : "";
}
function Pn(e) {
  const { record: t } = e, n = [{
    editable: !1,
    key: "path",
    value: t.path
  }];
  return t.name != null && n.push({
    editable: !1,
    key: "name",
    value: t.name
  }), n.push({
    editable: !1,
    key: "regexp",
    value: e.re
  }), e.keys.length && n.push({
    editable: !1,
    key: "keys",
    value: { _custom: {
      type: null,
      readOnly: !0,
      display: e.keys.map((r) => `${r.name}${In(r)}`).join(" "),
      tooltip: "Param keys",
      value: e.keys
    } }
  }), t.redirect != null && n.push({
    editable: !1,
    key: "redirect",
    value: t.redirect
  }), e.alias.length && n.push({
    editable: !1,
    key: "aliases",
    value: e.alias.map((r) => r.record.path)
  }), Object.keys(e.record.meta).length && n.push({
    editable: !1,
    key: "meta",
    value: e.record.meta
  }), n.push({
    key: "score",
    editable: !1,
    value: { _custom: {
      type: null,
      readOnly: !0,
      display: e.score.map((r) => r.join(", ")).join(" | "),
      tooltip: "Score used to sort routes",
      value: e.score
    } }
  }), n;
}
const mt = 15485081, gt = 2450411, vt = 8702998, bn = 2282478, _t = 16486972, wn = 6710886, Nn = 16704226, Sn = 12131356;
function Et(e) {
  const t = [], { record: n } = e;
  n.name != null && t.push({
    label: String(n.name),
    textColor: 0,
    backgroundColor: bn
  }), n.aliasOf && t.push({
    label: "alias",
    textColor: 0,
    backgroundColor: _t
  }), e.__vd_match && t.push({
    label: "matches",
    textColor: 0,
    backgroundColor: mt
  }), e.__vd_exactActive && t.push({
    label: "exact",
    textColor: 0,
    backgroundColor: vt
  }), e.__vd_active && t.push({
    label: "active",
    textColor: 0,
    backgroundColor: gt
  }), n.redirect && t.push({
    label: typeof n.redirect == "string" ? `redirect: ${n.redirect}` : "redirects",
    textColor: 16777215,
    backgroundColor: wn
  });
  let r = n.__vd_id;
  return r == null && (r = String(Tn++), n.__vd_id = r), {
    id: r,
    label: n.path,
    tags: t,
    children: e.children.map(Et)
  };
}
let Tn = 0;
const xn = /^\/(.*)\/([a-z]*)$/;
function Rt(e, t) {
  const n = t.matched.length && q(t.matched[t.matched.length - 1], e.record);
  e.__vd_exactActive = e.__vd_active = n, n || (e.__vd_active = t.matched.some((r) => q(r, e.record))), e.children.forEach((r) => Rt(r, t));
}
function yt(e) {
  e.__vd_match = !1, e.children.forEach(yt);
}
function Pe(e, t) {
  const n = String(e.re).match(xn);
  if (e.__vd_match = !1, !n || n.length < 3) return !1;
  if (new RegExp(n[1].replace(/\$$/, ""), n[2]).test(t))
    return e.children.forEach((f) => Pe(f, t)), e.record.path !== "/" || t === "/" ? (e.__vd_match = e.re.test(t), !0) : !1;
  const r = e.record.path.toLowerCase(), o = X(r);
  return !t.startsWith("/") && (o.includes(t) || r.includes(t)) || o.startsWith(t) || r.startsWith(t) || e.record.name && String(e.record.name).includes(t) ? !0 : e.children.some((f) => Pe(f, t));
}
function kn(e, t) {
  const n = {};
  for (const r in e) t.includes(r) || (n[r] = e[r]);
  return n;
}
/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
let Dn = () => location.protocol + "//" + location.host;
function At(e, t) {
  const { pathname: n, search: r, hash: o } = t, f = e.indexOf("#");
  if (f > -1) {
    let d = o.includes(e.slice(f)) ? e.slice(f).length : 1, u = o.slice(d);
    return u[0] !== "/" && (u = "/" + u), Ve(u, "");
  }
  return Ve(n, e) + r + o;
}
function Ln(e, t, n, r) {
  let o = [], f = [], d = null;
  const u = ({ state: a }) => {
    const p = At(e, location), R = n.value, O = t.value;
    let I = 0;
    if (a) {
      if (n.value = p, t.value = a, d && d === R) {
        d = null;
        return;
      }
      I = O ? a.position - O.position : 0;
    } else r(p);
    o.forEach((b) => {
      b(n.value, R, {
        delta: I,
        type: ce.pop,
        direction: I ? I > 0 ? oe.forward : oe.back : oe.unknown
      });
    });
  };
  function s() {
    d = n.value;
  }
  function h(a) {
    o.push(a);
    const p = () => {
      const R = o.indexOf(a);
      R > -1 && o.splice(R, 1);
    };
    return f.push(p), p;
  }
  function l() {
    if (document.visibilityState === "hidden") {
      const { history: a } = window;
      if (!a.state) return;
      a.replaceState(C({}, a.state, { scroll: le() }), "");
    }
  }
  function i() {
    for (const a of f) a();
    f = [], window.removeEventListener("popstate", u), window.removeEventListener("pagehide", l), document.removeEventListener("visibilitychange", l);
  }
  return window.addEventListener("popstate", u), window.addEventListener("pagehide", l), document.addEventListener("visibilitychange", l), {
    pauseListeners: s,
    listen: h,
    destroy: i
  };
}
function je(e, t, n, r = !1, o = !1) {
  return {
    back: e,
    current: t,
    forward: n,
    replaced: r,
    position: window.history.length,
    scroll: o ? le() : null
  };
}
function Vn(e) {
  const { history: t, location: n } = window, r = { value: At(e, n) }, o = { value: t.state };
  o.value || f(r.value, {
    back: null,
    current: r.value,
    forward: null,
    position: t.length - 1,
    replaced: !0,
    scroll: null
  }, !0);
  function f(s, h, l) {
    const i = e.indexOf("#"), a = i > -1 ? (n.host && document.querySelector("base") ? e : e.slice(i)) + s : Dn() + e + s;
    try {
      t[l ? "replaceState" : "pushState"](h, "", a), o.value = h;
    } catch (p) {
      console.error(p), n[l ? "replace" : "assign"](a);
    }
  }
  function d(s, h) {
    f(s, C({}, t.state, je(o.value.back, s, o.value.forward, !0), h, { position: o.value.position }), !0), r.value = s;
  }
  function u(s, h) {
    const l = C({}, o.value, t.state, {
      forward: s,
      scroll: le()
    });
    f(l.current, l, !0), f(s, C({}, je(r.value, s, null), { position: l.position + 1 }, h), !1), r.value = s;
  }
  return {
    location: r,
    state: o,
    push: u,
    replace: d
  };
}
function Gn(e) {
  e = lt(e);
  const t = Vn(e), n = Ln(e, t.state, t.location, t.replace);
  function r(f, d = !0) {
    d || n.pauseListeners(), history.go(f);
  }
  const o = C({
    location: "",
    base: e,
    go: r,
    createHref: ut.bind(null, e)
  }, t, n);
  return Object.defineProperty(o, "location", {
    enumerable: !0,
    get: () => t.location.value
  }), Object.defineProperty(o, "state", {
    enumerable: !0,
    get: () => t.state.value
  }), o;
}
function ur(e = "") {
  let t = [], n = [[Re, {}]], r = 0;
  e = lt(e);
  function o(u, s = {}) {
    r++, r !== n.length && n.splice(r), n.push([u, s]);
  }
  function f(u, s, { direction: h, delta: l }) {
    const i = {
      direction: h,
      delta: l,
      type: ce.pop
    };
    for (const a of t) a(u, s, i);
  }
  const d = {
    location: Re,
    state: {},
    base: e,
    createHref: ut.bind(null, e),
    replace(u, s) {
      n.splice(r--, 1), o(u, s);
    },
    push(u, s) {
      o(u, s);
    },
    listen(u) {
      return t.push(u), () => {
        const s = t.indexOf(u);
        s > -1 && t.splice(s, 1);
      };
    },
    destroy() {
      t = [], n = [[Re, {}]], r = 0;
    },
    go(u, s = !0) {
      const h = this.location, l = u < 0 ? oe.back : oe.forward;
      r = Math.max(0, Math.min(r + u, n.length - 1)), s && f(this.location, h, {
        direction: l,
        delta: u
      });
    }
  };
  return Object.defineProperty(d, "location", {
    enumerable: !0,
    get: () => n[r][0]
  }), Object.defineProperty(d, "state", {
    enumerable: !0,
    get: () => n[r][1]
  }), d;
}
function fr(e) {
  return e = location.host ? e || location.pathname + location.search : "", e.includes("#") || (e += "#"), Gn(e);
}
let W = /* @__PURE__ */ (function(e) {
  return e[e.Static = 0] = "Static", e[e.Param = 1] = "Param", e[e.Group = 2] = "Group", e;
})({});
var T = /* @__PURE__ */ (function(e) {
  return e[e.Static = 0] = "Static", e[e.Param = 1] = "Param", e[e.ParamRegExp = 2] = "ParamRegExp", e[e.ParamRegExpEnd = 3] = "ParamRegExpEnd", e[e.EscapeNext = 4] = "EscapeNext", e;
})(T || {});
const Bn = {
  type: W.Static,
  value: ""
}, Un = /[a-zA-Z0-9_]/;
function Mn(e) {
  if (!e) return [[]];
  if (e === "/") return [[Bn]];
  if (!e.startsWith("/")) throw new Error(`Invalid path "${e}"`);
  function t(p) {
    throw new Error(`ERR (${n})/"${h}": ${p}`);
  }
  let n = T.Static, r = n;
  const o = [];
  let f;
  function d() {
    f && o.push(f), f = [];
  }
  let u = 0, s, h = "", l = "";
  function i() {
    h && (n === T.Static ? f.push({
      type: W.Static,
      value: h
    }) : n === T.Param || n === T.ParamRegExp || n === T.ParamRegExpEnd ? (f.length > 1 && (s === "*" || s === "+") && t(`A repeatable param (${h}) must be alone in its segment. eg: '/:ids+.`), f.push({
      type: W.Param,
      value: h,
      regexp: l,
      repeatable: s === "*" || s === "+",
      optional: s === "*" || s === "?"
    })) : t("Invalid state to consume buffer"), h = "");
  }
  function a() {
    h += s;
  }
  for (; u < e.length; ) {
    if (s = e[u++], s === "\\" && n !== T.ParamRegExp) {
      r = n, n = T.EscapeNext;
      continue;
    }
    switch (n) {
      case T.Static:
        s === "/" ? (h && i(), d()) : s === ":" ? (i(), n = T.Param) : a();
        break;
      case T.EscapeNext:
        a(), n = r;
        break;
      case T.Param:
        s === "(" ? n = T.ParamRegExp : Un.test(s) ? a() : (i(), n = T.Static, s !== "*" && s !== "?" && s !== "+" && u--);
        break;
      case T.ParamRegExp:
        s === ")" ? l[l.length - 1] == "\\" ? l = l.slice(0, -1) + s : n = T.ParamRegExpEnd : l += s;
        break;
      case T.ParamRegExpEnd:
        i(), n = T.Static, s !== "*" && s !== "?" && s !== "+" && u--, l = "";
        break;
      default:
        t("Unknown state");
        break;
    }
  }
  return n === T.ParamRegExp && t(`Unfinished custom RegExp for param "${h}"`), i(), d(), o;
}
const He = "[^/]+?", jn = {
  sensitive: !1,
  strict: !1,
  start: !0,
  end: !0
};
var x = /* @__PURE__ */ (function(e) {
  return e[e._multiplier = 10] = "_multiplier", e[e.Root = 90] = "Root", e[e.Segment = 40] = "Segment", e[e.SubSegment = 30] = "SubSegment", e[e.Static = 40] = "Static", e[e.Dynamic = 20] = "Dynamic", e[e.BonusCustomRegExp = 10] = "BonusCustomRegExp", e[e.BonusWildcard = -50] = "BonusWildcard", e[e.BonusRepeatable = -20] = "BonusRepeatable", e[e.BonusOptional = -8] = "BonusOptional", e[e.BonusStrict = 0.7000000000000001] = "BonusStrict", e[e.BonusCaseSensitive = 0.25] = "BonusCaseSensitive", e;
})(x || {});
const Hn = /[.+*?^${}()[\]/\\]/g;
function Kn(e, t) {
  const n = C({}, jn, t), r = [];
  let o = n.start ? "^" : "";
  const f = [];
  for (const h of e) {
    const l = h.length ? [] : [x.Root];
    n.strict && !h.length && (o += "/");
    for (let i = 0; i < h.length; i++) {
      const a = h[i];
      let p = x.Segment + (n.sensitive ? x.BonusCaseSensitive : 0);
      if (a.type === W.Static)
        i || (o += "/"), o += a.value.replace(Hn, "\\$&"), p += x.Static;
      else if (a.type === W.Param) {
        const { value: R, repeatable: O, optional: I, regexp: b } = a;
        f.push({
          name: R,
          repeatable: O,
          optional: I
        });
        const E = b || He;
        if (E !== He) {
          p += x.BonusCustomRegExp;
          try {
            `${E}`;
          } catch (V) {
            throw new Error(`Invalid custom RegExp for param "${R}" (${E}): ` + V.message);
          }
        }
        let P = O ? `((?:${E})(?:/(?:${E}))*)` : `(${E})`;
        i || (P = I && h.length < 2 ? `(?:/${P})` : "/" + P), I && (P += "?"), o += P, p += x.Dynamic, I && (p += x.BonusOptional), O && (p += x.BonusRepeatable), E === ".*" && (p += x.BonusWildcard);
      }
      l.push(p);
    }
    r.push(l);
  }
  if (n.strict && n.end) {
    const h = r.length - 1;
    r[h][r[h].length - 1] += x.BonusStrict;
  }
  n.strict || (o += "/?"), n.end ? o += "$" : n.strict && !o.endsWith("/") && (o += "(?:/|$)");
  const d = new RegExp(o, n.sensitive ? "" : "i");
  function u(h) {
    const l = h.match(d), i = {};
    if (!l) return null;
    for (let a = 1; a < l.length; a++) {
      const p = l[a] || "", R = f[a - 1];
      i[R.name] = p && R.repeatable ? p.split("/") : p;
    }
    return i;
  }
  function s(h) {
    let l = "", i = !1;
    for (const a of e) {
      (!i || !l.endsWith("/")) && (l += "/"), i = !1;
      for (const p of a) if (p.type === W.Static) l += p.value;
      else if (p.type === W.Param) {
        const { value: R, repeatable: O, optional: I } = p, b = R in h ? h[R] : "";
        if (D(b) && !O) throw new Error(`Provided param "${R}" is an array but it is not repeatable (* or + modifiers)`);
        const E = D(b) ? b.join("/") : b;
        if (!E) if (I)
          a.length < 2 && (l.endsWith("/") ? l = l.slice(0, -1) : i = !0);
        else throw new Error(`Missing required param "${R}"`);
        l += E;
      }
    }
    return l || "/";
  }
  return {
    re: d,
    score: r,
    keys: f,
    parse: u,
    stringify: s
  };
}
function qn(e, t) {
  let n = 0;
  for (; n < e.length && n < t.length; ) {
    const r = t[n] - e[n];
    if (r) return r;
    n++;
  }
  return e.length < t.length ? e.length === 1 && e[0] === x.Static + x.Segment ? -1 : 1 : e.length > t.length ? t.length === 1 && t[0] === x.Static + x.Segment ? 1 : -1 : 0;
}
function Ot(e, t) {
  let n = 0;
  const r = e.score, o = t.score;
  for (; n < r.length && n < o.length; ) {
    const f = qn(r[n], o[n]);
    if (f) return f;
    n++;
  }
  if (Math.abs(o.length - r.length) === 1) {
    if (Ke(r)) return 1;
    if (Ke(o)) return -1;
  }
  return o.length - r.length;
}
function Ke(e) {
  const t = e[e.length - 1];
  return e.length > 0 && t[t.length - 1] < 0;
}
const Qn = {
  strict: !1,
  end: !0,
  sensitive: !1
};
function Wn(e, t, n) {
  const r = Kn(Mn(e.path), n), o = C(r, {
    record: e,
    parent: t,
    children: [],
    alias: []
  });
  return t && !o.record.aliasOf == !t.record.aliasOf && t.children.push(o), o;
}
function Fn(e, t) {
  const n = [], r = /* @__PURE__ */ new Map();
  t = Le(Qn, t);
  function o(i) {
    return r.get(i);
  }
  function f(i, a, p) {
    const R = !p, O = Qe(i);
    O.aliasOf = p && p.record;
    const I = Le(t, i), b = [O];
    if ("alias" in i) {
      const V = typeof i.alias == "string" ? [i.alias] : i.alias;
      for (const Q of V) b.push(Qe(C({}, O, {
        components: p ? p.record.components : O.components,
        path: Q,
        aliasOf: p ? p.record : O
      })));
    }
    let E, P;
    for (const V of b) {
      const { path: Q } = V;
      if (a && Q[0] !== "/") {
        const j = a.record.path, L = j[j.length - 1] === "/" ? "" : "/";
        V.path = a.record.path + (Q && L + Q);
      }
      if (E = Wn(V, a, I), p ? p.alias.push(E) : (P = P || E, P !== E && P.alias.push(E), R && i.name && !We(E) && d(i.name)), Ct(E) && s(E), O.children) {
        const j = O.children;
        for (let L = 0; L < j.length; L++) f(j[L], E, p && p.children[L]);
      }
      p = p || E;
    }
    return P ? () => {
      d(P);
    } : re;
  }
  function d(i) {
    if (dt(i)) {
      const a = r.get(i);
      a && (r.delete(i), n.splice(n.indexOf(a), 1), a.children.forEach(d), a.alias.forEach(d));
    } else {
      const a = n.indexOf(i);
      a > -1 && (n.splice(a, 1), i.record.name && r.delete(i.record.name), i.children.forEach(d), i.alias.forEach(d));
    }
  }
  function u() {
    return n;
  }
  function s(i) {
    const a = Jn(i, n);
    n.splice(a, 0, i), i.record.name && !We(i) && r.set(i.record.name, i);
  }
  function h(i, a) {
    let p, R = {}, O, I;
    if ("name" in i && i.name) {
      if (p = r.get(i.name), !p) throw Z(w.MATCHER_NOT_FOUND, { location: i });
      I = p.record.name, R = C(qe(a.params, p.keys.filter((P) => !P.optional).concat(p.parent ? p.parent.keys.filter((P) => P.optional) : []).map((P) => P.name)), i.params && qe(i.params, p.keys.map((P) => P.name))), O = p.stringify(R);
    } else if (i.path != null)
      O = i.path, p = n.find((P) => P.re.test(O)), p && (R = p.parse(O), I = p.record.name);
    else {
      if (p = a.name ? r.get(a.name) : n.find((P) => P.re.test(a.path)), !p) throw Z(w.MATCHER_NOT_FOUND, {
        location: i,
        currentLocation: a
      });
      I = p.record.name, R = C({}, a.params, i.params), O = p.stringify(R);
    }
    const b = [];
    let E = p;
    for (; E; )
      b.unshift(E.record), E = E.parent;
    return {
      name: I,
      path: O,
      params: R,
      matched: b,
      meta: Yn(b)
    };
  }
  e.forEach((i) => f(i));
  function l() {
    n.length = 0, r.clear();
  }
  return {
    addRoute: f,
    resolve: h,
    removeRoute: d,
    clearRoutes: l,
    getRoutes: u,
    getRecordMatcher: o
  };
}
function qe(e, t) {
  const n = {};
  for (const r of t) r in e && (n[r] = e[r]);
  return n;
}
function Qe(e) {
  const t = {
    path: e.path,
    redirect: e.redirect,
    name: e.name,
    meta: e.meta || {},
    aliasOf: e.aliasOf,
    beforeEnter: e.beforeEnter,
    props: zn(e),
    children: e.children || [],
    instances: {},
    leaveGuards: /* @__PURE__ */ new Set(),
    updateGuards: /* @__PURE__ */ new Set(),
    enterCallbacks: {},
    components: "components" in e ? e.components || null : e.component && { default: e.component }
  };
  return Object.defineProperty(t, "mods", { value: {} }), t;
}
function zn(e) {
  const t = {}, n = e.props || !1;
  if ("component" in e) t.default = n;
  else for (const r in e.components) t[r] = typeof n == "object" ? n[r] : n;
  return t;
}
function We(e) {
  for (; e; ) {
    if (e.record.aliasOf) return !0;
    e = e.parent;
  }
  return !1;
}
function Yn(e) {
  return e.reduce((t, n) => C(t, n.meta), {});
}
function Jn(e, t) {
  let n = 0, r = t.length;
  for (; n !== r; ) {
    const f = n + r >> 1;
    Ot(e, t[f]) < 0 ? r = f : n = f + 1;
  }
  const o = Xn(e);
  return o && (r = t.lastIndexOf(o, r - 1)), r;
}
function Xn(e) {
  let t = e;
  for (; t = t.parent; ) if (Ct(t) && Ot(e, t) === 0) return t;
}
function Ct({ record: e }) {
  return !!(e.name || e.components && Object.keys(e.components).length || e.redirect);
}
function Fe(e) {
  const t = M(ue), n = M(Ne), r = G(() => {
    const s = J(e.to);
    return t.resolve(s);
  }), o = G(() => {
    const { matched: s } = r.value, { length: h } = s, l = s[h - 1], i = n.matched;
    if (!l || !i.length) return -1;
    const a = i.findIndex(q.bind(null, l));
    if (a > -1) return a;
    const p = ze(s[h - 2]);
    return h > 1 && ze(l) === p && i[i.length - 1].path !== p ? i.findIndex(q.bind(null, s[h - 2])) : a;
  }), f = G(() => o.value > -1 && nr(n.params, r.value.params)), d = G(() => o.value > -1 && o.value === n.matched.length - 1 && ct(n.params, r.value.params));
  function u(s = {}) {
    if (tr(s)) {
      const h = t[J(e.replace) ? "replace" : "push"](J(e.to)).catch(re);
      return e.viewTransition && typeof document < "u" && "startViewTransition" in document && document.startViewTransition(() => h), h;
    }
    return Promise.resolve();
  }
  if (__VUE_PROD_DEVTOOLS__ && U) {
    const s = Dt();
    if (s) {
      const h = {
        route: r.value,
        isActive: f.value,
        isExactActive: d.value,
        error: null
      };
      s.__vrl_devtools = s.__vrl_devtools || [], s.__vrl_devtools.push(h), Lt(() => {
        h.route = r.value, h.isActive = f.value, h.isExactActive = d.value, h.error = ft(J(e.to)) ? null : 'Invalid "to" value';
      }, { flush: "post" });
    }
  }
  return {
    route: r,
    href: G(() => r.value.href),
    isActive: f,
    isExactActive: d,
    navigate: u
  };
}
function Zn(e) {
  return e.length === 1 ? e[0] : e;
}
const $n = /* @__PURE__ */ Ze({
  name: "RouterLink",
  compatConfig: { MODE: 3 },
  props: {
    to: {
      type: [String, Object],
      required: !0
    },
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
    custom: Boolean,
    ariaCurrentValue: {
      type: String,
      default: "page"
    },
    viewTransition: Boolean
  },
  useLink: Fe,
  setup(e, { slots: t }) {
    const n = Tt(Fe(e)), { options: r } = M(ue), o = G(() => ({
      [Ye(e.activeClass, r.linkActiveClass, "router-link-active")]: n.isActive,
      [Ye(e.exactActiveClass, r.linkExactActiveClass, "router-link-exact-active")]: n.isExactActive
    }));
    return () => {
      const f = t.default && Zn(t.default(n));
      return e.custom ? f : $e("a", {
        "aria-current": n.isExactActive ? e.ariaCurrentValue : null,
        href: n.href,
        onClick: n.navigate,
        class: o.value
      }, f);
    };
  }
}), er = $n;
function tr(e) {
  if (!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && !e.defaultPrevented && !(e.button !== void 0 && e.button !== 0)) {
    if (e.currentTarget && e.currentTarget.getAttribute) {
      const t = e.currentTarget.getAttribute("target");
      if (/\b_blank\b/i.test(t)) return;
    }
    return e.preventDefault && e.preventDefault(), !0;
  }
}
function nr(e, t) {
  for (const n in t) {
    const r = t[n], o = e[n];
    if (typeof r == "string") {
      if (r !== o) return !1;
    } else if (!D(o) || o.length !== r.length || r.some((f, d) => f.valueOf() !== o[d].valueOf())) return !1;
  }
  return !0;
}
function ze(e) {
  return e ? e.aliasOf ? e.aliasOf.path : e.path : "";
}
const Ye = (e, t, n) => e ?? t ?? n, rr = /* @__PURE__ */ Ze({
  name: "RouterView",
  inheritAttrs: !1,
  props: {
    name: {
      type: String,
      default: "default"
    },
    route: Object
  },
  compatConfig: { MODE: 3 },
  setup(e, { attrs: t, slots: n }) {
    const r = M(Ie), o = G(() => e.route || r.value), f = M(Me, 0), d = G(() => {
      let h = J(f);
      const { matched: l } = o.value;
      let i;
      for (; (i = l[h]) && !i.components; ) h++;
      return h;
    }), u = G(() => o.value.matched[d.value]);
    ve(Me, G(() => d.value + 1)), ve(we, u), ve(Ie, o);
    const s = xt();
    return Xe(() => [
      s.value,
      u.value,
      e.name
    ], ([h, l, i], [a, p, R]) => {
      l && (l.instances[i] = h, p && p !== l && h && h === a && (l.leaveGuards.size || (l.leaveGuards = p.leaveGuards), l.updateGuards.size || (l.updateGuards = p.updateGuards))), h && l && (!p || !q(l, p) || !a) && (l.enterCallbacks[i] || []).forEach((O) => O(h));
    }, { flush: "post" }), () => {
      const h = o.value, l = e.name, i = u.value, a = i && i.components[l];
      if (!a) return Je(n.default, {
        Component: a,
        route: h
      });
      const p = i.props[l], R = p ? p === !0 ? h.params : typeof p == "function" ? p(h) : p : null, I = $e(a, C({}, R, t, {
        onVnodeUnmounted: (b) => {
          b.component.isUnmounted && (i.instances[l] = null);
        },
        ref: s
      }));
      if (__VUE_PROD_DEVTOOLS__ && U && I.ref) {
        const b = {
          depth: d.value,
          name: i.name,
          path: i.path,
          meta: i.meta
        };
        (D(I.ref) ? I.ref.map((E) => E.i) : [I.ref.i]).forEach((E) => {
          E.__vrv_devtools = b;
        });
      }
      return Je(n.default, {
        Component: I,
        route: h
      }) || I;
    };
  }
});
function Je(e, t) {
  if (!e) return null;
  const n = e(t);
  return n.length === 1 ? n[0] : n;
}
const or = rr;
function dr(e) {
  const t = Fn(e.routes, e), n = e.parseQuery || Rn, r = e.stringifyQuery || Ue, o = e.history, f = te(), d = te(), u = te(), s = kt(H);
  let h = H;
  U && e.scrollBehavior && "scrollRestoration" in history && (history.scrollRestoration = "manual");
  const l = _e.bind(null, (c) => "" + c), i = _e.bind(null, sn), a = _e.bind(null, X);
  function p(c, g) {
    let m, v;
    return dt(c) ? (m = t.getRecordMatcher(c), v = g) : v = c, t.addRoute(v, m);
  }
  function R(c) {
    const g = t.getRecordMatcher(c);
    g && t.removeRoute(g);
  }
  function O() {
    return t.getRoutes().map((c) => c.record);
  }
  function I(c) {
    return !!t.getRecordMatcher(c);
  }
  function b(c, g) {
    if (g = C({}, g || s.value), typeof c == "string") {
      const _ = Ee(n, c, g.path), S = t.resolve({ path: _.path }, g), ee = o.createHref(_.fullPath);
      return C(_, S, {
        params: a(S.params),
        hash: X(_.hash),
        redirectedFrom: void 0,
        href: ee
      });
    }
    let m;
    if (c.path != null)
      m = C({}, c, { path: Ee(n, c.path, g.path).path });
    else {
      const _ = C({}, c.params);
      for (const S in _) _[S] == null && delete _[S];
      m = C({}, c, { params: i(_) }), g.params = i(g.params);
    }
    const v = t.resolve(m, g), A = c.hash || "";
    v.params = l(a(v.params));
    const N = ln(r, C({}, c, {
      hash: nn(A),
      path: v.path
    })), y = o.createHref(N);
    return C({
      fullPath: N,
      hash: A,
      query: r === Ue ? yn(c.query) : c.query || {}
    }, v, {
      redirectedFrom: void 0,
      href: y
    });
  }
  function E(c) {
    return typeof c == "string" ? Ee(n, c, s.value.path) : C({}, c);
  }
  function P(c, g) {
    if (h !== c) return Z(w.NAVIGATION_CANCELLED, {
      from: g,
      to: c
    });
  }
  function V(c) {
    return L(c);
  }
  function Q(c) {
    return V(C(E(c), { replace: !0 }));
  }
  function j(c, g) {
    const m = c.matched[c.matched.length - 1];
    if (m && m.redirect) {
      const { redirect: v } = m;
      let A = typeof v == "function" ? v(c, g) : v;
      return typeof A == "string" && (A = A.includes("?") || A.includes("#") ? A = E(A) : { path: A }, A.params = {}), C({
        query: c.query,
        hash: c.hash,
        params: A.path != null ? {} : c.params
      }, A);
    }
  }
  function L(c, g) {
    const m = h = b(c), v = s.value, A = c.state, N = c.force, y = c.replace === !0, _ = j(m, v);
    if (_) return L(C(E(_), {
      state: typeof _ == "object" ? C({}, A, _.state) : A,
      force: N,
      replace: y
    }), g || m);
    const S = m;
    S.redirectedFrom = g;
    let ee;
    return !N && un(r, v, m) && (ee = Z(w.NAVIGATION_DUPLICATED, {
      to: S,
      from: v
    }), De(v, v, !0, !1)), (ee ? Promise.resolve(ee) : Se(S, v)).catch((k) => B(k) ? B(k, w.NAVIGATION_GUARD_REDIRECT) ? k : pe(k) : he(k, S, v)).then((k) => {
      if (k) {
        if (B(k, w.NAVIGATION_GUARD_REDIRECT))
          return L(C({ replace: y }, E(k.to), {
            state: typeof k.to == "object" ? C({}, A, k.to.state) : A,
            force: N
          }), g || S);
      } else k = xe(S, v, !0, y, A);
      return Te(S, v, k), k;
    });
  }
  function It(c, g) {
    const m = P(c, g);
    return m ? Promise.reject(m) : Promise.resolve();
  }
  function fe(c) {
    const g = ie.values().next().value;
    return g && typeof g.runWithContext == "function" ? g.runWithContext(c) : c();
  }
  function Se(c, g) {
    let m;
    const [v, A, N] = An(c, g);
    m = ye(v.reverse(), "beforeRouteLeave", c, g);
    for (const _ of v) _.leaveGuards.forEach((S) => {
      m.push(K(S, c, g));
    });
    const y = It.bind(null, c, g);
    return m.push(y), z(m).then(() => {
      m = [];
      for (const _ of f.list()) m.push(K(_, c, g));
      return m.push(y), z(m);
    }).then(() => {
      m = ye(A, "beforeRouteUpdate", c, g);
      for (const _ of A) _.updateGuards.forEach((S) => {
        m.push(K(S, c, g));
      });
      return m.push(y), z(m);
    }).then(() => {
      m = [];
      for (const _ of N) if (_.beforeEnter) if (D(_.beforeEnter)) for (const S of _.beforeEnter) m.push(K(S, c, g));
      else m.push(K(_.beforeEnter, c, g));
      return m.push(y), z(m);
    }).then(() => (c.matched.forEach((_) => _.enterCallbacks = {}), m = ye(N, "beforeRouteEnter", c, g, fe), m.push(y), z(m))).then(() => {
      m = [];
      for (const _ of d.list()) m.push(K(_, c, g));
      return m.push(y), z(m);
    }).catch((_) => B(_, w.NAVIGATION_CANCELLED) ? _ : Promise.reject(_));
  }
  function Te(c, g, m) {
    u.list().forEach((v) => fe(() => v(c, g, m)));
  }
  function xe(c, g, m, v, A) {
    const N = P(c, g);
    if (N) return N;
    const y = g === H, _ = U ? history.state : {};
    m && (v || y ? o.replace(c.fullPath, C({ scroll: y && _ && _.scroll }, A)) : o.push(c.fullPath, A)), s.value = c, De(c, g, m, y), pe();
  }
  let $;
  function Pt() {
    $ || ($ = o.listen((c, g, m) => {
      if (!F.listening) return;
      const v = b(c), A = j(v, F.currentRoute.value);
      if (A) {
        L(C(A, {
          replace: !0,
          force: !0
        }), v).catch(re);
        return;
      }
      h = v;
      const N = s.value;
      U && gn(Be(N.fullPath, m.delta), le()), Se(v, N).catch((y) => B(y, w.NAVIGATION_ABORTED | w.NAVIGATION_CANCELLED) ? y : B(y, w.NAVIGATION_GUARD_REDIRECT) ? (L(C(E(y.to), { force: !0 }), v).then((_) => {
        B(_, w.NAVIGATION_ABORTED | w.NAVIGATION_DUPLICATED) && !m.delta && m.type === ce.pop && o.go(-1, !1);
      }).catch(re), Promise.reject()) : (m.delta && o.go(-m.delta, !1), he(y, v, N))).then((y) => {
        y = y || xe(v, N, !1), y && (m.delta && !B(y, w.NAVIGATION_CANCELLED) ? o.go(-m.delta, !1) : m.type === ce.pop && B(y, w.NAVIGATION_ABORTED | w.NAVIGATION_DUPLICATED) && o.go(-1, !1)), Te(v, N, y);
      }).catch(re);
    }));
  }
  let de = te(), ke = te(), se;
  function he(c, g, m) {
    pe(c);
    const v = ke.list();
    return v.length ? v.forEach((A) => A(c, g, m)) : console.error(c), Promise.reject(c);
  }
  function bt() {
    return se && s.value !== H ? Promise.resolve() : new Promise((c, g) => {
      de.add([c, g]);
    });
  }
  function pe(c) {
    return se || (se = !c, Pt(), de.list().forEach(([g, m]) => c ? m(c) : g()), de.reset()), c;
  }
  function De(c, g, m, v) {
    const { scrollBehavior: A } = e;
    if (!U || !A) return Promise.resolve();
    const N = !m && vn(Be(c.fullPath, 0)) || (v || !m) && history.state && history.state.scroll || null;
    return Gt().then(() => A(c, g, N)).then((y) => y && mn(y)).catch((y) => he(y, c, g));
  }
  const me = (c) => o.go(c);
  let ge;
  const ie = /* @__PURE__ */ new Set(), F = {
    currentRoute: s,
    listening: !0,
    addRoute: p,
    removeRoute: R,
    clearRoutes: t.clearRoutes,
    hasRoute: I,
    getRoutes: O,
    resolve: b,
    options: e,
    push: V,
    replace: Q,
    go: me,
    back: () => me(-1),
    forward: () => me(1),
    beforeEach: f.add,
    beforeResolve: d.add,
    afterEach: u.add,
    onError: ke.add,
    isReady: bt,
    install(c) {
      c.component("RouterLink", er), c.component("RouterView", or), c.config.globalProperties.$router = F, Object.defineProperty(c.config.globalProperties, "$route", {
        enumerable: !0,
        get: () => J(s)
      }), U && !ge && s.value === H && (ge = !0, V(o.location).catch((v) => {
      }));
      const g = {};
      for (const v in H) Object.defineProperty(g, v, {
        get: () => s.value[v],
        enumerable: !0
      });
      c.provide(ue, F), c.provide(Ne, Vt(g)), c.provide(Ie, s);
      const m = c.unmount;
      ie.add(c), c.unmount = function() {
        ie.delete(c), ie.size < 1 && (h = H, $ && $(), $ = null, s.value = H, ge = !1, se = !1), m();
      }, __VUE_PROD_DEVTOOLS__ && U && Cn(c, F, t);
    }
  };
  function z(c) {
    return c.reduce((g, m) => g.then(() => fe(m)), Promise.resolve());
  }
  return F;
}
function hr() {
  return M(ue);
}
function pr(e) {
  return M(Ne);
}
export {
  ir as NavigationFailureType,
  er as RouterLink,
  or as RouterView,
  H as START_LOCATION,
  ur as createMemoryHistory,
  dr as createRouter,
  Fn as createRouterMatcher,
  fr as createWebHashHistory,
  Gn as createWebHistory,
  B as isNavigationFailure,
  lr as loadRouteLocation,
  we as matchedRouteKey,
  ar as onBeforeRouteLeave,
  cr as onBeforeRouteUpdate,
  Rn as parseQuery,
  Ne as routeLocationKey,
  ue as routerKey,
  Ie as routerViewLocationKey,
  Ue as stringifyQuery,
  Fe as useLink,
  pr as useRoute,
  hr as useRouter,
  Me as viewDepthKey
};
