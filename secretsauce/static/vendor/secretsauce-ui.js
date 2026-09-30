var G = Object.defineProperty;
var H = (t, n, o) => n in t ? G(t, n, { enumerable: !0, configurable: !0, writable: !0, value: o }) : t[n] = o;
var g = (t, n, o) => H(t, typeof n != "symbol" ? n + "" : n, o);
import { inject as w, defineComponent as P, computed as k, openBlock as v, createElementBlock as h, Fragment as M, renderList as L, createBlock as C, resolveDynamicComponent as O, ref as d, shallowRef as j, resolveComponent as y, resolveDirective as z, renderSlot as K, withDirectives as D, createVNode as S, withCtx as E, mergeProps as J, normalizeClass as Q, createCommentVNode as b, createElementVNode as W, toDisplayString as N, createTextVNode as X } from "vue";
const se = 1;
class B extends Error {
  constructor(o, l, u, i) {
    super(u);
    g(this, "status");
    g(this, "code");
    g(this, "details");
    this.name = "ApiError", this.status = o, this.code = l, this.details = i;
  }
}
class le extends B {
  constructor(o, l) {
    super(409, "conflict", o, { current: l });
    g(this, "current");
    this.name = "ConflictError", this.current = l;
  }
}
class ae extends B {
  constructor(n = "Network unavailable") {
    super(0, "offline", n), this.name = "OfflineError";
  }
}
const Z = "__SS_UI__";
function re() {
  const t = w(Z);
  if (!t) throw new Error("useSecretSauce() requires a registered plugin component");
  return t;
}
const ie = /* @__PURE__ */ P({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(t) {
    const n = t, o = w("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), l = k(() => [...o.getContributions(n.name) || []].sort((i, s) => (i.order ?? 50) - (s.order ?? 50)));
    return (u, i) => (v(!0), h(
      M,
      null,
      L(l.value, (s) => (v(), C(O(s.component), {
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
    const o = t, l = n, u = w("__SS_INTENT_REGISTRY__", { getProviders: () => [] }), i = d(), s = j(null), c = d(!1), p = d(""), a = k(() => u.getProviders(o.hub).filter((e) => !e.isAvailable || e.isAvailable(o.context)).slice().sort((e, r) => e.order - r.order));
    function f(e) {
      var r;
      return ((r = e.disabledReason) == null ? void 0 : r.call(e, o.context)) || "";
    }
    const U = k(() => a.value.map((e) => ({
      label: e.title,
      icon: e.icon ? `pi pi-${e.icon}` : void 0,
      disabled: !!f(e),
      reason: f(e),
      command: () => T(e)
    })));
    async function I(e) {
      var r;
      c.value || (p.value = "", a.value.length === 1 ? await T(a.value[0]) : (r = i.value) == null || r.toggle(e));
    }
    async function T(e) {
      var r;
      if (!(c.value || f(e))) {
        if ((r = i.value) == null || r.hide(), p.value = "", e.kind === "ui") {
          s.value = e;
          return;
        }
        c.value = !0;
        try {
          l("resolve", await e.execute(o.context));
        } catch (_) {
          p.value = (_ == null ? void 0 : _.message) || "Action failed";
        } finally {
          c.value = !1;
        }
      }
    }
    function V(e) {
      s.value = null, l("resolve", e);
    }
    function x() {
      s.value && (s.value = null, l("cancel"));
    }
    return (e, r) => {
      var R;
      const _ = y("Button"), $ = y("Menu"), Y = y("Message"), q = y("Dialog"), A = z("tooltip");
      return a.value.length ? (v(), h(
        M,
        { key: 0 },
        [
          K(e.$slots, "default", { open: I }, () => [
            D((v(), h("span", null, [
              S(_, {
                class: "ss-intent-trigger",
                label: t.label || a.value[0].title,
                loading: c.value,
                disabled: c.value || a.value.length === 1 && !!f(a.value[0]),
                icon: a.value.length > 1 ? "pi pi-chevron-down" : a.value[0].icon ? `pi pi-${a.value[0].icon}` : void 0,
                iconPos: a.value.length > 1 ? "right" : "left",
                "aria-haspopup": a.value.length > 1 ? "menu" : void 0,
                onClick: I
              }, null, 8, ["label", "loading", "disabled", "icon", "iconPos", "aria-haspopup"])
            ])), [
              [A, a.value.length === 1 ? f(a.value[0]) : ""]
            ])
          ], !0),
          S($, {
            ref_key: "menu",
            ref: i,
            model: U.value,
            popup: ""
          }, {
            item: E(({ item: m, props: F }) => [
              D((v(), h(
                "a",
                J(F.action, { class: "ss-intent-item" }),
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
                [A, m.reason]
              ])
            ]),
            _: 1
            /* STABLE */
          }, 8, ["model"]),
          p.value ? (v(), C(Y, {
            key: 0,
            severity: "error"
          }, {
            default: E(() => [
              X(
                N(p.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : b("v-if", !0),
          S(q, {
            visible: !!s.value,
            header: (R = s.value) == null ? void 0 : R.title,
            modal: "",
            style: { width: "min(52rem, 95vw)" },
            "onUpdate:visible": r[0] || (r[0] = (m) => {
              m || x();
            }),
            onHide: x
          }, {
            default: E(() => [
              s.value ? (v(), C(O(s.value.component), {
                key: 0,
                context: t.context,
                onResolve: V,
                onCancel: x
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
  for (const [l, u] of n)
    o[l] = u;
  return o;
}, ce = /* @__PURE__ */ te(ee, [["__scopeId", "data-v-349fb160"]]);
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
  }), o = d([n.value]), l = d({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric"
  }), u = d(!0), i = {
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
    api: i,
    url: (c) => c,
    store: { currentMember: n, members: o, household: l, online: u },
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
  ie as Slot,
  ue as createFakeSecretSauceUI,
  re as useSecretSauce
};
