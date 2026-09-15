import { defineComponent as f, openBlock as s, createElementBlock as d, createCommentVNode as v, inject as m, ref as h, onMounted as g, createElementVNode as i, Fragment as b, renderList as j, toDisplayString as u, createVNode as C, unref as x } from "vue";
import { Slot as J } from "@secretsauce/ui";
const S = {
  key: 0,
  class: "cooked-checkmark",
  title: "Cooked"
}, I = /* @__PURE__ */ f({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(e) {
    return (a, o) => {
      var t, r;
      return (r = (t = e.context) == null ? void 0 : t.entry) != null && r.is_cooked ? (s(), d("span", S, " ✓ ")) : v("v-if", !0);
    };
  }
}), k = (e, a) => {
  const o = e.__vccOpts || e;
  for (const [t, r] of a)
    o[t] = r;
  return o;
}, M = /* @__PURE__ */ k(I, [["__scopeId", "data-v-3947505b"]]), B = { class: "journal-page" }, L = {
  key: 0,
  class: "journal-list"
}, N = { class: "entry-header" }, P = { class: "entry-date" }, w = { class: "entry-servings" }, A = { class: "entry-body" }, V = { class: "recipe-title" }, q = {
  key: 0,
  class: "entry-notes"
}, D = { class: "entry-footer" }, E = {
  key: 1,
  class: "empty-hint"
}, O = /* @__PURE__ */ f({
  __name: "JournalPage",
  setup(e) {
    const a = m("__SS_API__"), o = h([]);
    async function t() {
      if (a)
        try {
          const r = await a.get("/api/journal");
          o.value = Array.isArray(r) ? r : [];
        } catch {
          o.value = [];
        }
    }
    return g(() => {
      t();
    }), (r, c) => (s(), d("div", B, [
      c[0] || (c[0] = i(
        "h2",
        null,
        "Cooking Journal",
        -1
        /* CACHED */
      )),
      o.value.length ? (s(), d("div", L, [
        (s(!0), d(
          b,
          null,
          j(o.value, (n) => {
            var l;
            return s(), d("div", {
              key: n.id,
              class: "journal-entry-card"
            }, [
              i("div", N, [
                i(
                  "span",
                  P,
                  u(n.date) + " (" + u(n.meal_type || "meal") + ")",
                  1
                  /* TEXT */
                ),
                i(
                  "span",
                  w,
                  u(n.servings) + " servings",
                  1
                  /* TEXT */
                )
              ]),
              i("div", A, [
                i(
                  "h4",
                  V,
                  u(((l = n.recipe) == null ? void 0 : l.title) || n.title || "Cooked meal"),
                  1
                  /* TEXT */
                ),
                n.notes ? (s(), d(
                  "p",
                  q,
                  u(n.notes),
                  1
                  /* TEXT */
                )) : v("v-if", !0)
              ]),
              i("div", D, [
                C(x(J), {
                  name: "journal.entry.footer",
                  context: { entry: n }
                }, null, 8, ["context"])
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (s(), d("p", E, "No meals recorded in journal yet."))
    ]));
  }
}), U = /* @__PURE__ */ k(O, [["__scopeId", "data-v-b4d1203e"]]);
function T(e) {
  var a;
  e.route({
    path: "/journal",
    component: U,
    nav: { label: "Journal", icon: "book-open", order: 15 }
  }), typeof e.nav == "function" && e.nav({ label: "Journal", icon: "book-open", path: "/journal", order: 15 }), e.slot("timeline.entry.badge", M, { order: 10 }), (a = e.intent) != null && a.provider && (e.intent.provider({
    hub: "entry:interact",
    id: "mark-cooked",
    title: "Mark as Cooked",
    order: 20,
    kind: "headless",
    execute: async (o) => {
      var l, _, p, y;
      const t = o == null ? void 0 : o.entry;
      if (!t) return;
      const r = crypto.randomUUID(), c = (_ = (l = e.store) == null ? void 0 : l.currentMember) == null ? void 0 : _.value, n = {
        id: r,
        date: t.date,
        meal_type: t.meal_type,
        recipe_id: t.recipe_id,
        servings: t.servings_override || 2,
        assigned_cook_id: t.assigned_cook_id || (c == null ? void 0 : c.id),
        schedule_entry_id: t.id
      };
      (p = e.outbox) != null && p.enqueue ? await e.outbox.enqueue({
        method: "POST",
        url: "/api/journal",
        body: n
      }) : (y = e.api) != null && y.post && await e.api.post("/api/journal", n), t.is_cooked = !0, typeof e.notify == "function" && e.notify({ level: "success", message: "Meal marked as cooked!" });
    }
  }), e.intent.provider({
    hub: "entry:interact",
    id: "skip",
    title: "Skip Meal",
    order: 30,
    kind: "headless",
    execute: async (o) => {
      const t = o == null ? void 0 : o.entry;
      t && (t.is_skipped = !0, typeof e.notify == "function" && e.notify({ level: "info", message: "Meal marked as skipped." }));
    }
  }), e.intent.provider({
    hub: "entry:interact",
    id: "log-leftover",
    title: "Log Leftovers",
    order: 40,
    kind: "headless",
    execute: async (o) => {
      typeof e.notify == "function" && e.notify({ level: "info", message: "Leftovers recorded for upcoming meals." });
    }
  }));
}
export {
  T as default
};
