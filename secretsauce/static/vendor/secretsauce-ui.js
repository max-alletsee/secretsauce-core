var w = Object.defineProperty;
var D = (n, e, t) => e in n ? w(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var f = (n, e, t) => D(n, typeof e != "symbol" ? e + "" : e, t);
import { inject as p, defineComponent as x, computed as S, openBlock as c, createElementBlock as _, Fragment as g, renderList as k, createBlock as E, resolveDynamicComponent as C, ref as a, createElementVNode as y, toDisplayString as b, createCommentVNode as v } from "vue";
const F = 1;
class I extends Error {
  constructor(t, s, u, o) {
    super(u);
    f(this, "status");
    f(this, "code");
    f(this, "details");
    this.name = "ApiError", this.status = t, this.code = s, this.details = o;
  }
}
class G extends I {
  constructor(t, s) {
    super(409, "conflict", t, { current: s });
    f(this, "current");
    this.name = "ConflictError", this.current = s;
  }
}
class L extends I {
  constructor(e = "Network unavailable") {
    super(0, "offline", e), this.name = "OfflineError";
  }
}
const N = "__SS_UI__";
function M() {
  const n = p(N);
  if (!n) throw new Error("useSecretSauce() requires a registered plugin component");
  return n;
}
const $ = /* @__PURE__ */ x({
  __name: "Slot",
  props: {
    name: {},
    context: {}
  },
  setup(n) {
    const e = n, t = p("__SS_SLOT_REGISTRY__", {
      getContributions: () => []
    }), s = S(() => [...t.getContributions(e.name) || []].sort((o, r) => (o.order ?? 50) - (r.order ?? 50)));
    return (u, o) => (c(!0), _(
      g,
      null,
      k(s.value, (r) => (c(), E(C(r.component), {
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
}, P = ["onClick"], U = {
  key: 1,
  class: "ss-intent-modal-overlay"
}, B = { class: "ss-intent-modal" }, j = /* @__PURE__ */ x({
  __name: "IntentTrigger",
  props: {
    hub: {},
    context: {},
    label: {}
  },
  emits: ["resolve", "cancel"],
  setup(n, { emit: e }) {
    const t = n, s = e, u = p("__SS_INTENT_REGISTRY__", {
      getProviders: () => []
    }), o = a(null), r = a(!1), i = S(() => (u.getProviders(t.hub) || []).filter((d) => d.isAvailable ? d.isAvailable(t.context) : !0).sort((d, m) => d.order - m.order));
    async function T() {
      i.value.length === 1 ? await h(i.value[0]) : i.value.length > 1 && (r.value = !r.value);
    }
    async function h(l) {
      if (r.value = !1, l.kind === "headless" && l.execute) {
        const d = await l.execute(t.context);
        s("resolve", d);
      } else l.kind === "ui" && l.component && (o.value = l);
    }
    function A(l) {
      o.value = null, s("resolve", l);
    }
    function R() {
      o.value = null, s("cancel");
    }
    return (l, d) => i.value.length > 0 ? (c(), _(
      g,
      { key: 0 },
      [
        y(
          "button",
          {
            type: "button",
            class: "ss-intent-trigger",
            onClick: T
          },
          b(t.label || i.value[0].title),
          1
          /* TEXT */
        ),
        r.value && i.value.length > 1 ? (c(), _("div", O, [
          (c(!0), _(
            g,
            null,
            k(i.value, (m) => (c(), _("button", {
              key: m.id,
              type: "button",
              onClick: (V) => h(m)
            }, b(m.title), 9, P))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : v("v-if", !0),
        o.value ? (c(), _("div", U, [
          y("div", B, [
            (c(), E(C(o.value.component), {
              context: t.context,
              onResolve: A,
              onCancel: R
            }, null, 40, ["context"]))
          ])
        ])) : v("v-if", !0)
      ],
      64
      /* STABLE_FRAGMENT */
    )) : v("v-if", !0);
  }
});
function H(n = "test-plugin") {
  const e = a({
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
  }), t = a([e.value]), s = a({
    household_name: "Test House",
    meal_types: [{ id: "dinner", label: "Dinner" }],
    languages: { primary: "en" },
    units: "metric"
  }), u = a(!0), o = {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    put: async () => ({}),
    delete: async () => {
    },
    upload: async () => ({})
  }, r = {
    pending: a(0),
    failed: a([]),
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
    url: (i) => i,
    store: { currentMember: e, members: t, household: s, online: u },
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
  F as API_VERSION,
  I as ApiError,
  G as ConflictError,
  j as IntentTrigger,
  L as OfflineError,
  N as SECRET_SAUCE_UI_KEY,
  $ as Slot,
  H as createFakeSecretSauceUI,
  M as useSecretSauce
};
