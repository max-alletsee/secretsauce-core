var G = Object.defineProperty;
var H = (t, n, o) => n in t ? G(t, n, { enumerable: !0, configurable: !0, writable: !0, value: o }) : t[n] = o;
var g = (t, n, o) => H(t, typeof n != "symbol" ? n + "" : n, o);
import { inject as I, defineComponent as P, computed as C, openBlock as v, createElementBlock as h, Fragment as M, renderList as L, createBlock as w, resolveDynamicComponent as O, ref as d, shallowRef as j, resolveComponent as y, resolveDirective as z, renderSlot as K, withDirectives as D, createVNode as E, withCtx as k, mergeProps as J, normalizeClass as Q, createCommentVNode as b, createElementVNode as W, toDisplayString as N, createTextVNode as X } from "vue";
const se = 1;
class B extends Error {
  constructor(o, a, u, r) {
    super(u);
    g(this, "status");
    g(this, "code");
    g(this, "details");
    this.name = "ApiError", this.status = o, this.code = a, this.details = r;
  }
}
class le extends B {
  constructor(o, a) {
    super(409, "conflict", o, { current: a });
    g(this, "current");
    this.name = "ConflictError", this.current = a;
  }
}
class ae extends B {
  constructor(n = "Network unavailable") {
    super(0, "offline", n), this.name = "OfflineError";
  }
}
const Z = "__SS_UI__";
function ie() {
  const t = I(Z);
  if (!t) throw new Error("useSecretSauce() requires a registered plugin component");
  return t;
}
const re = /* @__PURE__ */ P({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(t) {
    const n = t, o = I("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), a = C(() => [...o.getContributions(n.name) || []].sort((r, s) => (r.order ?? 50) - (s.order ?? 50)));
    return (u, r) => (v(!0), h(
      M,
      null,
      L(a.value, (s) => (v(), w(O(s.component), {
        key: s.id,
        context: n.context || {}
      }, null, 8, ["context"]))),
      128
      /* KEYED_FRAGMENT */
    ));
  }
}), ee = /* @__PURE__ */ P({
  __name: "IntentTrigger",
  props: {
    hub: {},
    context: {},
    label: {}
  },
  emits: ["resolve", "cancel"],
  setup(t, { emit: n }) {
    const o = t, a = n, u = I("__SS_INTENT_REGISTRY__", { getProviders: () => [] }), r = d(), s = j(null), c = d(!1), f = d(""), i = C(() => u.getProviders(o.hub).filter((e) => !e.isAvailable || e.isAvailable(o.context)).slice().sort((e, l) => e.order - l.order));
    function _(e) {
      var l;
      return ((l = e.disabledReason) == null ? void 0 : l.call(e, o.context)) || "";
    }
    function x(e) {
      var l;
      return ((l = e.titleFor) == null ? void 0 : l.call(e, o.context)) || e.title;
    }
    const U = C(() => i.value.map((e) => ({
      label: x(e),
      icon: e.icon ? `pi pi-${e.icon}` : void 0,
      disabled: !!_(e),
      reason: _(e),
      command: () => A(e)
    })));
    async function T(e) {
      var l;
      c.value || (f.value = "", i.value.length === 1 ? await A(i.value[0]) : (l = r.value) == null || l.toggle(e));
    }
    async function A(e) {
      var l;
      if (!(c.value || _(e))) {
        if ((l = r.value) == null || l.hide(), f.value = "", e.kind === "ui") {
          s.value = e;
          return;
        }
        c.value = !0;
        try {
          a("resolve", await e.execute(o.context));
        } catch (p) {
          f.value = (p == null ? void 0 : p.message) || "Action failed";
        } finally {
          c.value = !1;
        }
      }
    }
    function V(e) {
      s.value = null, a("resolve", e);
    }
    function S() {
      s.value && (s.value = null, a("cancel"));
    }
    return (e, l) => {
      const p = y("Button"), $ = y("Menu"), F = y("Message"), Y = y("Dialog"), R = z("tooltip");
      return i.value.length ? (v(), h(
        M,
        { key: 0 },
        [
          K(e.$slots, "default", { open: T }, () => [
            D((v(), h("span", null, [
              E(p, {
                class: "ss-intent-trigger",
                label: t.label || x(i.value[0]),
                loading: c.value,
                disabled: c.value || i.value.length === 1 && !!_(i.value[0]),
                icon: i.value.length > 1 ? "pi pi-chevron-down" : i.value[0].icon ? `pi pi-${i.value[0].icon}` : void 0,
                iconPos: i.value.length > 1 ? "right" : "left",
                "aria-haspopup": i.value.length > 1 ? "menu" : void 0,
                onClick: T
              }, null, 8, ["label", "loading", "disabled", "icon", "iconPos", "aria-haspopup"])
            ])), [
              [R, i.value.length === 1 ? _(i.value[0]) : ""]
            ])
          ], !0),
          E($, {
            ref_key: "menu",
            ref: r,
            model: U.value,
            popup: ""
          }, {
            item: k(({ item: m, props: q }) => [
              D((v(), h(
                "a",
                J(q.action, { class: "ss-intent-item" }),
                [
                  m.icon ? (v(), h(
                    "span",
                    {
                      key: 0,
                      class: Q(m.icon),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  )) : b("v-if", !0),
                  W(
                    "span",
                    null,
                    N(m.label),
                    1
                    /* TEXT */
                  )
                ],
                16
                /* FULL_PROPS */
              )), [
                [R, m.reason]
              ])
            ]),
            _: 1
            /* STABLE */
          }, 8, ["model"]),
          f.value ? (v(), w(F, {
            key: 0,
            severity: "error"
          }, {
            default: k(() => [
              X(
                N(f.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : b("v-if", !0),
          E(Y, {
            visible: !!s.value,
            header: s.value ? x(s.value) : "",
            modal: "",
            style: { width: "min(52rem, 95vw)" },
            "onUpdate:visible": l[0] || (l[0] = (m) => {
              m || S();
            }),
            onHide: S
          }, {
            default: k(() => [
              s.value ? (v(), w(O(s.value.component), {
                key: 0,
                context: t.context,
                onResolve: V,
                onCancel: S
              }, null, 40, ["context"])) : b("v-if", !0)
            ]),
            _: 1
            /* STABLE */
          }, 8, ["visible", "header"])
        ],
        64
        /* STABLE_FRAGMENT */
      )) : b("v-if", !0);
    };
  }
}), te = (t, n) => {
  const o = t.__vccOpts || t;
  for (const [a, u] of n)
    o[a] = u;
  return o;
}, ce = /* @__PURE__ */ te(ee, [["__scopeId", "data-v-d14d4df4"]]);
function ue(t = "test-plugin") {
  const n = d({
    id: "m1",
    revision: 1,
    name: "Alice",
    avatar_color: null,
    serving_ratio: 1,
    dietary_restrictions: [],
    allergies: [],
    disliked_ingredients: [],
    favorite_cuisines: [],
    preferred_language: "en"
  }), o = d([n.value]), a = d({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric"
  }), u = d(!0), r = {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    put: async () => ({}),
    delete: async () => {
    },
    upload: async () => ({})
  }, s = {
    pending: d(0),
    failed: d([]),
    enqueue: async () => "outbox-id-1",
    discard: async () => {
    },
    on: () => {
    }
  };
  return {
    pluginId: t,
    route: () => {
    },
    slot: () => {
    },
    intent: { hub: () => {
    }, provider: () => {
    } },
    settings: { section: () => {
    } },
    on: () => {
    },
    api: r,
    url: (c) => c,
    store: { currentMember: n, members: o, household: a, online: u },
    outbox: s,
    i18n: { add: () => {
    } },
    t: (c) => c,
    theme: { register: () => {
    } },
    notify: () => {
    },
    confirm: async () => !1
  };
}
export {
  se as API_VERSION,
  B as ApiError,
  le as ConflictError,
  ce as IntentTrigger,
  ae as OfflineError,
  Z as SECRET_SAUCE_UI_KEY,
  re as Slot,
  ue as createFakeSecretSauceUI,
  ie as useSecretSauce
};
