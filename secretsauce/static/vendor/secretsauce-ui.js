var D = Object.defineProperty;
var N = (n, e, t) => e in n ? D(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var v = (n, e, t) => N(n, typeof e != "symbol" ? e + "" : e, t);
import { defineComponent as b, inject as x, computed as k, openBlock as a, createElementBlock as m, Fragment as g, renderList as C, createBlock as E, resolveDynamicComponent as S, ref as c, createElementVNode as p, toDisplayString as y, createCommentVNode as f } from "vue";
const L = 1;
class I extends Error {
  constructor(t, s, u, o) {
    super(u);
    v(this, "status");
    v(this, "code");
    v(this, "details");
    this.name = "ApiError", this.status = t, this.code = s, this.details = o;
  }
}
class M extends I {
  constructor(t, s) {
    super(409, "conflict", t, { current: s });
    v(this, "current");
    this.name = "ConflictError", this.current = s;
  }
}
class Y extends I {
  constructor(e = "Network unavailable") {
    super(0, "offline", e), this.name = "OfflineError";
  }
}
const $ = /* @__PURE__ */ b({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(n) {
    const e = n, t = x("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), s = k(() => [...t.getContributions(e.name) || []].sort((o, r) => (o.order ?? 50) - (r.order ?? 50)));
    return (u, o) => (a(!0), m(
      g,
      null,
      C(s.value, (r) => (a(), E(S(r.component), {
        key: r.id,
        context: e.context || {}
      }, null, 8, ["context"]))),
      128
      /* KEYED_FRAGMENT */
    ));
  }
}), O = {
  key: 0,
  class: "ss-intent-menu"
}, P = ["onClick"], w = {
  key: 1,
  class: "ss-intent-modal-overlay"
}, B = { class: "ss-intent-modal" }, j = /* @__PURE__ */ b({
  __name: "IntentTrigger",
  props: {
    hub: {},
    context: {},
    label: {}
  },
  emits: ["resolve", "cancel"],
  setup(n, { emit: e }) {
    const t = n, s = e, u = x("__SS_INTENT_REGISTRY__", {
      getProviders: () => []
    }), o = c(null), r = c(!1), l = k(() => (u.getProviders(t.hub) || []).filter((d) => d.isAvailable ? d.isAvailable(t.context) : !0).sort((d, _) => d.order - _.order));
    async function T() {
      l.value.length === 1 ? await h(l.value[0]) : l.value.length > 1 && (r.value = !r.value);
    }
    async function h(i) {
      if (r.value = !1, i.kind === "headless" && i.execute) {
        const d = await i.execute(t.context);
        s("resolve", d);
      } else i.kind === "ui" && i.component && (o.value = i);
    }
    function A(i) {
      o.value = null, s("resolve", i);
    }
    function R() {
      o.value = null, s("cancel");
    }
    return (i, d) => l.value.length > 0 ? (a(), m(
      g,
      { key: 0 },
      [
        p(
          "button",
          {
            type: "button",
            class: "ss-intent-trigger",
            onClick: T
          },
          y(t.label || l.value[0].title),
          1
          /* TEXT */
        ),
        r.value && l.value.length > 1 ? (a(), m("div", O, [
          (a(!0), m(
            g,
            null,
            C(l.value, (_) => (a(), m("button", {
              key: _.id,
              type: "button",
              onClick: (V) => h(_)
            }, y(_.title), 9, P))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : f("v-if", !0),
        o.value ? (a(), m("div", w, [
          p("div", B, [
            (a(), E(S(o.value.component), {
              context: t.context,
              onResolve: A,
              onCancel: R
            }, null, 40, ["context"]))
          ])
        ])) : f("v-if", !0)
      ],
      64
      /* STABLE_FRAGMENT */
    )) : f("v-if", !0);
  }
});
function q(n = "test-plugin") {
  const e = c({
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
  }), t = c([e.value]), s = c({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric"
  }), u = c(!0), o = {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    put: async () => ({}),
    delete: async () => {
    },
    upload: async () => ({})
  }, r = {
    pending: c(0),
    failed: c([]),
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
    api: o,
    url: (l) => l,
    store: { currentMember: e, members: t, household: s, online: u },
    outbox: r,
    i18n: { add: () => {
    } },
    t: (l) => l,
    theme: { register: () => {
    } },
    notify: () => {
    }
  };
}
export {
  L as API_VERSION,
  I as ApiError,
  M as ConflictError,
  j as IntentTrigger,
  Y as OfflineError,
  $ as Slot,
  q as createFakeSecretSauceUI
};
