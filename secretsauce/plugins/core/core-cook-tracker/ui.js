import { defineComponent as f, openBlock as l, createElementBlock as u, createCommentVNode as m, inject as k, ref as g, onMounted as h, createElementVNode as d, Fragment as b, renderList as j, toDisplayString as p, createVNode as S, unref as C } from "vue";
import { Slot as D } from "@secretsauce/ui";
const $ = {
  key: 0,
  class: "cooked-checkmark",
  title: "Cooked"
}, x = /* @__PURE__ */ f({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(e) {
    return (i, o) => {
      var t, s;
      return (s = (t = e.context) == null ? void 0 : t.entry) != null && s.is_cooked ? (l(), u("span", $, " ✓ ")) : m("v-if", !0);
    };
  }
}), v = (e, i) => {
  const o = e.__vccOpts || e;
  for (const [t, s] of i)
    o[t] = s;
  return o;
}, J = /* @__PURE__ */ v(x, [["__scopeId", "data-v-3947505b"]]), M = { class: "journal-page" }, w = {
  key: 0,
  class: "journal-list"
}, I = { class: "entry-header" }, B = { class: "entry-date" }, L = { class: "entry-servings" }, N = { class: "entry-body" }, P = { class: "recipe-title" }, A = {
  key: 0,
  class: "entry-notes"
}, V = { class: "entry-footer" }, q = {
  key: 1,
  class: "empty-hint"
}, E = /* @__PURE__ */ f({
  __name: "JournalPage",
  setup(e) {
    const i = k("__SS_API__", null), o = g([]);
    function t(r) {
      const a = r.getFullYear(), n = String(r.getMonth() + 1).padStart(2, "0"), c = String(r.getDate()).padStart(2, "0");
      return `${a}-${n}-${c}`;
    }
    async function s() {
      if (i)
        try {
          const r = /* @__PURE__ */ new Date(), a = /* @__PURE__ */ new Date();
          a.setDate(r.getDate() - 30);
          const n = await i.get(`/api/journal?from=${t(a)}&to=${t(r)}`);
          o.value = Array.isArray(n) ? n : [];
        } catch {
          o.value = [];
        }
    }
    return h(() => {
      s();
    }), (r, a) => (l(), u("div", M, [
      a[0] || (a[0] = d(
        "h2",
        null,
        "Cooking Journal",
        -1
        /* CACHED */
      )),
      o.value.length ? (l(), u("div", w, [
        (l(!0), u(
          b,
          null,
          j(o.value, (n) => {
            var c;
            return l(), u("div", {
              key: n.id,
              class: "journal-entry-card"
            }, [
              d("div", I, [
                d(
                  "span",
                  B,
                  p(n.date) + " (" + p(n.meal_type || "meal") + ")",
                  1
                  /* TEXT */
                ),
                d(
                  "span",
                  L,
                  p(n.servings) + " servings",
                  1
                  /* TEXT */
                )
              ]),
              d("div", N, [
                d(
                  "h4",
                  P,
                  p(((c = n.recipe) == null ? void 0 : c.title) || n.title || "Cooked meal"),
                  1
                  /* TEXT */
                ),
                n.notes ? (l(), u(
                  "p",
                  A,
                  p(n.notes),
                  1
                  /* TEXT */
                )) : m("v-if", !0)
              ]),
              d("div", V, [
                S(C(D), {
                  name: "journal.entry.footer",
                  context: { entry: n }
                }, null, 8, ["context"])
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (l(), u("p", q, "No meals recorded in journal yet."))
    ]));
  }
}), F = /* @__PURE__ */ v(E, [["__scopeId", "data-v-077ff918"]]);
function T(e) {
  var i;
  e.route({
    path: "/journal",
    component: F,
    nav: { label: "Journal", icon: "book-open", order: 15 }
  }), typeof e.nav == "function" && e.nav({ label: "Journal", icon: "book-open", path: "/journal", order: 15 }), e.slot("timeline.entry.badge", J, { order: 10 }), (i = e.intent) != null && i.provider && (e.intent.provider({
    hub: "entry:interact",
    id: "mark-cooked",
    title: "Mark as Cooked",
    order: 20,
    kind: "headless",
    execute: async (o) => {
      var n, c, _, y;
      const t = o == null ? void 0 : o.entry;
      if (!t) return;
      const s = crypto.randomUUID(), r = (c = (n = e.store) == null ? void 0 : n.currentMember) == null ? void 0 : c.value, a = {
        id: s,
        date: t.date,
        meal_type: t.meal_type,
        recipe_id: t.recipe_id,
        servings: t.servings_override || 2,
        assigned_cook_id: t.assigned_cook_id || (r == null ? void 0 : r.id),
        schedule_entry_id: t.id
      };
      (_ = e.outbox) != null && _.enqueue ? await e.outbox.enqueue({
        method: "POST",
        url: "/api/journal",
        body: a
      }) : (y = e.api) != null && y.post && await e.api.post("/api/journal", a), t.is_cooked = !0, typeof e.notify == "function" && e.notify({ level: "success", message: "Meal marked as cooked!" });
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
