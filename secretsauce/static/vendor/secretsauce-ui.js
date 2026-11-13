var H = Object.defineProperty;
var L = (t, s, n) => s in t ? H(t, s, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[s] = n;
var p = (t, s, n) => L(t, typeof s != "symbol" ? s + "" : s, n);
import { inject as I, defineComponent as P, computed as C, openBlock as m, createElementBlock as h, Fragment as M, renderList as j, createBlock as w, resolveDynamicComponent as O, ref as d, shallowRef as z, resolveComponent as y, resolveDirective as K, renderSlot as J, withDirectives as R, createVNode as E, withCtx as k, mergeProps as Q, normalizeClass as W, createCommentVNode as b, createElementVNode as X, toDisplayString as D, createTextVNode as Z } from "vue";
const ae = 1;
class B extends Error {
  constructor(n, l, u, r) {
    super(u);
    p(this, "status");
    p(this, "code");
    p(this, "details");
    this.name = "ApiError", this.status = n, this.code = l, this.details = r;
  }
}
class le extends B {
  constructor(n, l) {
    super(409, "conflict", n, { current: l });
    p(this, "current");
    this.name = "ConflictError", this.current = l;
  }
}
class ie extends B {
  constructor(s = "Network unavailable") {
    super(0, "offline", s), this.name = "OfflineError";
  }
}
const ee = "__SS_UI__";
function re() {
  const t = I(ee);
  if (!t) throw new Error("useSecretSauce() requires a registered plugin component");
  return t;
}
const ce = /* @__PURE__ */ P({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(t) {
    const s = t, n = I("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), l = C(() => [...n.getContributions(s.name) || []].sort((r, a) => (r.order ?? 50) - (a.order ?? 50)));
    return (u, r) => (m(!0), h(
      M,
      null,
      j(l.value, (a) => (m(), w(O(a.component), {
        key: a.id,
        context: s.context || {}
      }, null, 8, ["context"]))),
      128
      /* KEYED_FRAGMENT */
    ));
  }
}), te = /* @__PURE__ */ P({
  __name: "IntentTrigger",
  props: {
    hub: {},
    context: {},
    label: {}
  },
  emits: ["resolve", "cancel"],
  setup(t, { emit: s }) {
    const n = t, l = s, u = I("__SS_INTENT_REGISTRY__", { getProviders: () => [] }), r = d(), a = z(null), c = d(!1), _ = d(""), i = C(() => u.getProviders(n.hub).filter((e) => !e.isAvailable || e.isAvailable(n.context)).slice().sort((e, o) => e.order - o.order));
    function f(e) {
      var o;
      return ((o = e.disabledReason) == null ? void 0 : o.call(e, n.context)) || "";
    }
    function x(e) {
      var o;
      return ((o = e.titleFor) == null ? void 0 : o.call(e, n.context)) || e.title;
    }
    function U(e) {
      var o;
      return ((o = e.iconFor) == null ? void 0 : o.call(e, n.context)) || e.icon;
    }
    const V = C(() => i.value.map((e) => {
      const o = U(e);
      return {
        label: x(e),
        icon: o ? `pi pi-${o}` : void 0,
        disabled: !!f(e),
        reason: f(e),
        command: () => A(e)
      };
    }));
    async function T(e) {
      var o;
      c.value || (_.value = "", i.value.length === 1 ? await A(i.value[0]) : (o = r.value) == null || o.toggle(e));
    }
    async function A(e) {
      var o;
      if (!(c.value || f(e))) {
        if ((o = r.value) == null || o.hide(), _.value = "", e.kind === "ui") {
          a.value = e;
          return;
        }
        c.value = !0;
        try {
          l("resolve", await e.execute(n.context));
        } catch (g) {
          _.value = (g == null ? void 0 : g.message) || "Action failed";
        } finally {
          c.value = !1;
        }
      }
    }
    function F(e) {
      a.value = null, l("resolve", e);
    }
    function S() {
      a.value && (a.value = null, l("cancel"));
    }
    return (e, o) => {
      const g = y("Button"), $ = y("Menu"), Y = y("Message"), q = y("Dialog"), N = K("tooltip");
      return i.value.length ? (m(), h(
        M,
        { key: 0 },
        [
          J(e.$slots, "default", { open: T }, () => [
            R((m(), h("span", null, [
              E(g, {
                class: "ss-intent-trigger",
                label: t.label || x(i.value[0]),
                loading: c.value,
                disabled: c.value || i.value.length === 1 && !!f(i.value[0]),
                icon: i.value.length > 1 ? "pi pi-chevron-down" : i.value[0].icon ? `pi pi-${i.value[0].icon}` : void 0,
                iconPos: i.value.length > 1 ? "right" : "left",
                "aria-haspopup": i.value.length > 1 ? "menu" : void 0,
                onClick: T
              }, null, 8, ["label", "loading", "disabled", "icon", "iconPos", "aria-haspopup"])
            ])), [
              [N, i.value.length === 1 ? f(i.value[0]) : ""]
            ])
          ], !0),
          E($, {
            ref_key: "menu",
            ref: r,
            model: V.value,
            popup: ""
          }, {
            item: k(({ item: v, props: G }) => [
              R((m(), h(
                "a",
                Q(G.action, { class: "ss-intent-item" }),
                [
                  v.icon ? (m(), h(
                    "span",
                    {
                      key: 0,
                      class: W(v.icon),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  )) : b("v-if", !0),
                  X(
                    "span",
                    null,
                    D(v.label),
                    1
                    /* TEXT */
                  )
                ],
                16
                /* FULL_PROPS */
              )), [
                [N, v.reason]
              ])
            ]),
            _: 1
            /* STABLE */
          }, 8, ["model"]),
          _.value ? (m(), w(Y, {
            key: 0,
            severity: "error"
          }, {
            default: k(() => [
              Z(
                D(_.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : b("v-if", !0),
          E(q, {
            visible: !!a.value,
            header: a.value ? x(a.value) : "",
            modal: "",
            style: { width: "min(52rem, 95vw)" },
            "onUpdate:visible": o[0] || (o[0] = (v) => {
              v || S();
            }),
            onHide: S
          }, {
            default: k(() => [
              a.value ? (m(), w(O(a.value.component), {
                key: 0,
                context: t.context,
                onResolve: F,
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
}), ne = (t, s) => {
  const n = t.__vccOpts || t;
  for (const [l, u] of s)
    n[l] = u;
  return n;
}, ue = /* @__PURE__ */ ne(te, [["__scopeId", "data-v-2287d676"]]);
function de(t = "test-plugin") {
  const s = d({
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
  }), n = d([s.value]), l = d({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric",
    event_retention_days: 60
  }), u = d(!0), r = {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    put: async () => ({}),
    delete: async () => {
    },
    upload: async () => ({})
  }, a = {
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
    store: { currentMember: s, members: n, household: l, online: u },
    outbox: a,
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
  ae as API_VERSION,
  B as ApiError,
  le as ConflictError,
  ue as IntentTrigger,
  ie as OfflineError,
  ee as SECRET_SAUCE_UI_KEY,
  ce as Slot,
  de as createFakeSecretSauceUI,
  re as useSecretSauce
};
