var L = Object.defineProperty;
var j = (n, l, o) => l in n ? L(n, l, { enumerable: !0, configurable: !0, writable: !0, value: o }) : n[l] = o;
var h = (n, l, o) => j(n, typeof l != "symbol" ? l + "" : l, o);
import { inject as T, defineComponent as O, computed as S, openBlock as d, createElementBlock as y, Fragment as B, renderList as K, createBlock as I, resolveDynamicComponent as U, ref as u, shallowRef as J, resolveComponent as b, resolveDirective as Q, renderSlot as W, withDirectives as M, createVNode as C, withCtx as w, mergeProps as X, normalizeClass as Z, createCommentVNode as x, createElementVNode as ee, toDisplayString as P, createTextVNode as te } from "vue";
const ie = 1;
class V extends Error {
  constructor(o, s, v, c) {
    super(v);
    h(this, "status");
    h(this, "code");
    h(this, "details");
    this.name = "ApiError", this.status = o, this.code = s, this.details = c;
  }
}
class re extends V {
  constructor(o, s) {
    super(409, "conflict", o, { current: s });
    h(this, "current");
    this.name = "ConflictError", this.current = s;
  }
}
class ce extends V {
  constructor(l = "Network unavailable") {
    super(0, "offline", l), this.name = "OfflineError";
  }
}
const ne = "__SS_UI__";
function ue() {
  const n = T(ne);
  if (!n) throw new Error("useSecretSauce() requires a registered plugin component");
  return n;
}
const ve = /* @__PURE__ */ O({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(n) {
    const l = n, o = T("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), s = S(() => [...o.getContributions(l.name) || []].sort((c, r) => (c.order ?? 50) - (r.order ?? 50)));
    return (v, c) => (d(!0), y(
      B,
      null,
      K(s.value, (r) => (d(), I(U(r.component), {
        key: r.id,
        context: l.context || {}
      }, null, 8, ["context"]))),
      128
      /* KEYED_FRAGMENT */
    ));
  }
}), oe = /* @__PURE__ */ O({
  __name: "IntentTrigger",
  props: {
    hub: {},
    context: {},
    label: {}
  },
  emits: ["resolve", "cancel"],
  setup(n, { emit: l }) {
    const o = n, s = l, v = T("__SS_INTENT_REGISTRY__", { getProviders: () => [] }), c = u(), r = u(null), i = J(null), f = u(!1), _ = u(""), a = S(() => v.getProviders(o.hub).filter((e) => !e.isAvailable || e.isAvailable(o.context)).slice().sort((e, t) => e.order - t.order));
    function g(e) {
      var t;
      return ((t = e.disabledReason) == null ? void 0 : t.call(e, o.context)) || "";
    }
    function E(e) {
      var t;
      return ((t = e.titleFor) == null ? void 0 : t.call(e, o.context)) || e.title;
    }
    function $(e) {
      var t;
      return ((t = e.iconFor) == null ? void 0 : t.call(e, o.context)) || e.icon;
    }
    const A = S(() => a.value.map((e) => {
      const t = $(e);
      return {
        label: E(e),
        icon: t ? `pi pi-${t}` : void 0,
        disabled: !!g(e),
        reason: g(e),
        command: () => R(e)
      };
    })), F = S(() => r.value || A.value);
    async function N(e) {
      var t;
      f.value || (_.value = "", a.value.length === 1 ? await R(a.value[0]) : (r.value = A.value, (t = c.value) == null || t.toggle(e)));
    }
    async function R(e) {
      var t;
      if (!(f.value || g(e))) {
        if (r.value = null, (t = c.value) == null || t.hide(), _.value = "", e.kind === "ui") {
          i.value = e;
          return;
        }
        f.value = !0;
        try {
          s("resolve", await e.execute(o.context));
        } catch (p) {
          _.value = (p == null ? void 0 : p.message) || "Action failed";
        } finally {
          f.value = !1;
        }
      }
    }
    function H(e) {
      i.value = null, s("resolve", e);
    }
    function k() {
      i.value && (i.value = null, s("cancel"));
    }
    return (e, t) => {
      const p = b("Button"), Y = b("Menu"), q = b("Message"), z = b("Dialog"), D = Q("tooltip");
      return a.value.length ? (d(), y(
        B,
        { key: 0 },
        [
          W(e.$slots, "default", { open: N }, () => [
            M((d(), y("span", null, [
              C(p, {
                class: "ss-intent-trigger",
                label: n.label || E(a.value[0]),
                loading: f.value,
                disabled: f.value || a.value.length === 1 && !!g(a.value[0]),
                icon: a.value.length > 1 ? "pi pi-chevron-down" : a.value[0].icon ? `pi pi-${a.value[0].icon}` : void 0,
                iconPos: a.value.length > 1 ? "right" : "left",
                "aria-haspopup": a.value.length > 1 ? "menu" : void 0,
                onClick: N
              }, null, 8, ["label", "loading", "disabled", "icon", "iconPos", "aria-haspopup"])
            ])), [
              [D, a.value.length === 1 ? g(a.value[0]) : ""]
            ])
          ], !0),
          C(Y, {
            ref_key: "menu",
            ref: c,
            model: F.value,
            popup: "",
            onHide: t[0] || (t[0] = (m) => r.value = null)
          }, {
            item: w(({ item: m, props: G }) => [
              M((d(), y(
                "a",
                X(G.action, { class: "ss-intent-item" }),
                [
                  m.icon ? (d(), y(
                    "span",
                    {
                      key: 0,
                      class: Z(m.icon),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  )) : x("v-if", !0),
                  ee(
                    "span",
                    null,
                    P(m.label),
                    1
                    /* TEXT */
                  )
                ],
                16
                /* FULL_PROPS */
              )), [
                [D, m.reason]
              ])
            ]),
            _: 1
            /* STABLE */
          }, 8, ["model"]),
          _.value ? (d(), I(q, {
            key: 0,
            severity: "error"
          }, {
            default: w(() => [
              te(
                P(_.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : x("v-if", !0),
          C(z, {
            visible: !!i.value,
            header: i.value ? E(i.value) : "",
            modal: "",
            style: { width: "min(52rem, 95vw)" },
            "onUpdate:visible": t[1] || (t[1] = (m) => {
              m || k();
            }),
            onHide: k
          }, {
            default: w(() => [
              i.value ? (d(), I(U(i.value.component), {
                key: 0,
                context: n.context,
                onResolve: H,
                onCancel: k
              }, null, 40, ["context"])) : x("v-if", !0)
            ]),
            _: 1
            /* STABLE */
          }, 8, ["visible", "header"])
        ],
        64
        /* STABLE_FRAGMENT */
      )) : x("v-if", !0);
    };
  }
}), le = (n, l) => {
  const o = n.__vccOpts || n;
  for (const [s, v] of l)
    o[s] = v;
  return o;
}, de = /* @__PURE__ */ le(oe, [["__scopeId", "data-v-c6f67741"]]);
function me(n = "test-plugin") {
  const l = u({
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
  }), o = u([l.value]), s = u({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric",
    event_retention_days: 60
  }), v = u(!0), c = {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    put: async () => ({}),
    delete: async () => {
    },
    upload: async () => ({})
  }, r = {
    pending: u(0),
    failed: u([]),
    enqueue: async () => "outbox-id-1",
    discard: async () => {
    },
    on: () => {
    }
  };
  return {
    pluginId: n,
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
    api: c,
    url: (i) => i,
    store: { currentMember: l, members: o, household: s, online: v },
    outbox: r,
    i18n: { add: () => {
    } },
    t: (i) => i,
    theme: { register: () => {
    } },
    notify: () => {
    },
    confirm: async () => !1
  };
}
export {
  ie as API_VERSION,
  V as ApiError,
  re as ConflictError,
  de as IntentTrigger,
  ce as OfflineError,
  ne as SECRET_SAUCE_UI_KEY,
  ve as Slot,
  me as createFakeSecretSauceUI,
  ue as useSecretSauce
};
