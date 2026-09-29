import { hasInjectionContext as V, inject as B, effectScope as J, ref as q, markRaw as z, toRaw as G, computed as Q, isRef as x, isReactive as W, toRef as ot, reactive as st, getCurrentScope as ct, onScopeDispose as rt, watch as ut, nextTick as it, toRefs as ft } from "vue";
/*!
 * pinia v3.0.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
let H;
const A = (t) => H = t, yt = () => V() && B(L) || H, L = (
  /* istanbul ignore next */
  Symbol()
);
function I(t) {
  return t && typeof t == "object" && Object.prototype.toString.call(t) === "[object Object]" && typeof t.toJSON != "function";
}
var p;
(function(t) {
  t.direct = "direct", t.patchObject = "patch object", t.patchFunction = "patch function";
})(p || (p = {}));
function _t() {
  const t = J(!0), o = t.run(() => q({}));
  let n = [], e = [];
  const s = z({
    install(u) {
      A(s), s._a = u, u.provide(L, s), u.config.globalProperties.$pinia = s, e.forEach((i) => n.push(i)), e = [];
    },
    use(u) {
      return this._a ? n.push(u) : e.push(u), this;
    },
    _p: n,
    // it's actually undefined here
    // @ts-expect-error
    _a: null,
    _e: t,
    _s: /* @__PURE__ */ new Map(),
    state: o
  });
  return s;
}
function jt(t) {
  t._e.stop(), t._s.clear(), t._p.splice(0), t.state.value = {}, t._a = null;
}
function dt(t, o) {
  return () => {
  };
}
const X = () => {
};
function K(t, o, n, e = X) {
  t.add(o);
  const s = () => {
    t.delete(o) && e();
  };
  return !n && ct() && rt(s), s;
}
function P(t, ...o) {
  t.forEach((n) => {
    n(...o);
  });
}
const at = (t) => t(), U = Symbol(), $ = Symbol();
function O(t, o) {
  t instanceof Map && o instanceof Map ? o.forEach((n, e) => t.set(e, n)) : t instanceof Set && o instanceof Set && o.forEach(t.add, t);
  for (const n in o) {
    if (!o.hasOwnProperty(n))
      continue;
    const e = o[n], s = t[n];
    I(s) && I(e) && t.hasOwnProperty(n) && !x(e) && !W(e) ? t[n] = O(s, e) : t[n] = e;
  }
  return t;
}
const Y = (
  /* istanbul ignore next */
  Symbol()
);
function Pt(t) {
  return Object.defineProperty(t, Y, {});
}
function lt(t) {
  return !I(t) || !Object.prototype.hasOwnProperty.call(t, Y);
}
const { assign: h } = Object;
function ht(t) {
  return !!(x(t) && t.effect);
}
function bt(t, o, n, e) {
  const { state: s, actions: u, getters: i } = o, w = n.state.value[t];
  let S;
  function b() {
    w || (n.state.value[t] = s ? s() : {});
    const v = ft(n.state.value[t]);
    return h(v, u, Object.keys(i || {}).reduce((m, y) => (m[y] = z(Q(() => {
      A(n);
      const _ = n._s.get(t);
      return i[y].call(_, _);
    })), m), {}));
  }
  return S = Z(t, b, o, n, e, !0), S;
}
function Z(t, o, n = {}, e, s, u) {
  let i;
  const w = h({ actions: {} }, n), S = { deep: !0 };
  let b, v, m = /* @__PURE__ */ new Set(), y = /* @__PURE__ */ new Set(), _;
  const j = e.state.value[t];
  !u && !j && (e.state.value[t] = {}), q({});
  let N;
  function D(r) {
    let c;
    b = v = !1, typeof r == "function" ? (r(e.state.value[t]), c = {
      type: p.patchFunction,
      storeId: t,
      events: _
    }) : (O(e.state.value[t], r), c = {
      type: p.patchObject,
      payload: r,
      storeId: t,
      events: _
    });
    const f = N = Symbol();
    it().then(() => {
      N === f && (b = !0);
    }), v = !0, P(m, c, e.state.value[t]);
  }
  const k = u ? function() {
    const { state: c } = n, f = c ? c() : {};
    this.$patch((d) => {
      h(d, f);
    });
  } : (
    /* istanbul ignore next */
    X
  );
  function M() {
    i.stop(), m.clear(), y.clear(), e._s.delete(t);
  }
  const F = (r, c = "") => {
    if (U in r)
      return r[$] = c, r;
    const f = function() {
      A(e);
      const d = Array.from(arguments), C = /* @__PURE__ */ new Set(), E = /* @__PURE__ */ new Set();
      function et(a) {
        C.add(a);
      }
      function nt(a) {
        E.add(a);
      }
      P(y, {
        args: d,
        name: f[$],
        store: l,
        after: et,
        onError: nt
      });
      let R;
      try {
        R = r.apply(this && this.$id === t ? this : l, d);
      } catch (a) {
        throw P(E, a), a;
      }
      return R instanceof Promise ? R.then((a) => (P(C, a), a)).catch((a) => (P(E, a), Promise.reject(a))) : (P(C, R), R);
    };
    return f[U] = !0, f[$] = c, f;
  }, tt = {
    _p: e,
    // _s: scope,
    $id: t,
    $onAction: K.bind(null, y),
    $patch: D,
    $reset: k,
    $subscribe(r, c = {}) {
      const f = K(m, r, c.detached, () => d()), d = i.run(() => ut(() => e.state.value[t], (C) => {
        (c.flush === "sync" ? v : b) && r({
          storeId: t,
          type: p.direct,
          events: _
        }, C);
      }, h({}, S, c)));
      return f;
    },
    $dispose: M
  }, l = st(tt);
  e._s.set(t, l);
  const g = (e._a && e._a.runWithContext || at)(() => e._e.run(() => (i = J()).run(() => o({ action: F }))));
  for (const r in g) {
    const c = g[r];
    if (x(c) && !ht(c) || W(c))
      u || (j && lt(c) && (x(c) ? c.value = j[r] : O(c, j[r])), e.state.value[t][r] = c);
    else if (typeof c == "function") {
      const f = F(c, r);
      g[r] = f, w.actions[r] = c;
    }
  }
  return h(l, g), h(G(l), g), Object.defineProperty(l, "$state", {
    get: () => e.state.value[t],
    set: (r) => {
      D((c) => {
        h(c, r);
      });
    }
  }), e._p.forEach((r) => {
    h(l, i.run(() => r({
      store: l,
      app: e._a,
      pinia: e,
      options: w
    })));
  }), j && u && n.hydrate && n.hydrate(l.$state, j), b = !0, v = !0, l;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function wt(t, o, n) {
  let e;
  const s = typeof o == "function";
  e = s ? n : o;
  function u(i, w) {
    const S = V();
    return i = // in test mode, ignore the argument provided as we can always retrieve a
    // pinia instance with getActivePinia()
    i || (S ? B(L, null) : null), i && A(i), i = H, i._s.has(t) || (s ? Z(t, o, e, i) : bt(t, e, i)), i._s.get(t);
  }
  return u.$id = t, u;
}
let T = "Store";
function gt(t) {
  T = t;
}
function Ct(...t) {
  return t.reduce((o, n) => (o[n.$id + T] = function() {
    return n(this.$pinia);
  }, o), {});
}
function St(t, o) {
  return Array.isArray(o) ? o.reduce((n, e) => (n[e] = function() {
    return t(this.$pinia)[e];
  }, n), {}) : Object.keys(o).reduce((n, e) => (n[e] = function() {
    const s = t(this.$pinia), u = o[e];
    return typeof u == "function" ? u.call(this, s) : (
      // @ts-expect-error: FIXME: should work?
      s[u]
    );
  }, n), {});
}
const Rt = St;
function pt(t, o) {
  return Array.isArray(o) ? o.reduce((n, e) => (n[e] = function(...s) {
    return t(this.$pinia)[e](...s);
  }, n), {}) : Object.keys(o).reduce((n, e) => (n[e] = function(...s) {
    return t(this.$pinia)[o[e]](...s);
  }, n), {});
}
function xt(t, o) {
  return Array.isArray(o) ? o.reduce((n, e) => (n[e] = {
    get() {
      return t(this.$pinia)[e];
    },
    set(s) {
      return t(this.$pinia)[e] = s;
    }
  }, n), {}) : Object.keys(o).reduce((n, e) => (n[e] = {
    get() {
      return t(this.$pinia)[o[e]];
    },
    set(s) {
      return t(this.$pinia)[o[e]] = s;
    }
  }, n), {});
}
function At(t) {
  const o = G(t), n = {};
  for (const e in o) {
    const s = o[e];
    s.effect ? n[e] = // ...
    Q({
      get: () => t[e],
      set(u) {
        t[e] = u;
      }
    }) : (x(s) || W(s)) && (n[e] = // ---
    ot(t, e));
  }
  return n;
}
export {
  p as MutationType,
  dt as acceptHMRUpdate,
  _t as createPinia,
  wt as defineStore,
  jt as disposePinia,
  yt as getActivePinia,
  pt as mapActions,
  Rt as mapGetters,
  St as mapState,
  Ct as mapStores,
  xt as mapWritableState,
  A as setActivePinia,
  gt as setMapStoreSuffix,
  lt as shouldHydrate,
  Pt as skipHydrate,
  At as storeToRefs
};
