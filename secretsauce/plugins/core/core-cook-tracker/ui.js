import { defineComponent as h, resolveComponent as m, openBlock as s, createBlock as k, createCommentVNode as _, ref as y, onMounted as S, createElementBlock as p, createElementVNode as f, withCtx as c, createTextVNode as v, toDisplayString as u, Fragment as j, renderList as M, createVNode as D, unref as w } from "vue";
import { useSecretSauce as T, Slot as N } from "@secretsauce/ui";
const $ = /* @__PURE__ */ h({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(o) {
    return (t, e) => {
      var a, n;
      const r = m("Tag");
      return (n = (a = o.context) == null ? void 0 : a.entry) != null && n.is_cooked ? (s(), k(r, {
        key: 0,
        value: "Cooked",
        icon: "pi pi-check",
        severity: "success",
        title: "Cooked"
      })) : _("v-if", !0);
    };
  }
}), B = { class: "journal-page" }, J = { class: "journal-list" }, V = { key: 1 }, L = {
  key: 1,
  class: "empty-hint"
}, P = /* @__PURE__ */ h({
  __name: "JournalPage",
  setup(o) {
    const t = T(), e = y([]), r = y("");
    function a(n) {
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    }
    return S(async () => {
      const n = /* @__PURE__ */ new Date(), l = /* @__PURE__ */ new Date();
      l.setDate(n.getDate() - 30);
      try {
        e.value = await t.api.get("/api/journal", { from: a(l), to: a(n) });
      } catch (d) {
        r.value = (d == null ? void 0 : d.message) || "Could not load cooking journal";
      }
    }), (n, l) => {
      const d = m("Message"), b = m("Tag"), C = m("Card");
      return s(), p("div", B, [
        l[0] || (l[0] = f(
          "h2",
          null,
          "Cooking Journal",
          -1
          /* CACHED */
        )),
        r.value ? (s(), k(d, {
          key: 0,
          severity: "error"
        }, {
          default: c(() => [
            v(
              u(r.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : _("v-if", !0),
        f("div", J, [
          (s(!0), p(
            j,
            null,
            M(e.value, (i) => (s(), k(
              C,
              {
                key: i.id,
                class: "journal-entry-card"
              },
              {
                title: c(() => {
                  var g;
                  return [
                    v(
                      u(((g = i.recipe) == null ? void 0 : g.title) || i.title || "Cooked meal"),
                      1
                      /* TEXT */
                    )
                  ];
                }),
                subtitle: c(() => [
                  v(
                    u(i.date) + " · " + u(i.meal_type || "Meal"),
                    1
                    /* TEXT */
                  )
                ]),
                content: c(() => [
                  i.servings_cooked != null ? (s(), k(b, {
                    key: 0,
                    value: `${i.servings_cooked} servings`,
                    severity: "secondary"
                  }, null, 8, ["value"])) : _("v-if", !0),
                  i.notes ? (s(), p(
                    "p",
                    V,
                    u(i.notes),
                    1
                    /* TEXT */
                  )) : _("v-if", !0)
                ]),
                footer: c(() => [
                  D(w(N), {
                    name: "journal.entry.footer",
                    context: { entry: i }
                  }, null, 8, ["context"])
                ]),
                _: 2
                /* DYNAMIC */
              },
              1024
              /* DYNAMIC_SLOTS */
            ))),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        !e.value.length && !r.value ? (s(), p("p", L, "No meals recorded in journal yet.")) : _("v-if", !0)
      ]);
    };
  }
}), x = (o, t) => {
  const e = o.__vccOpts || o;
  for (const [r, a] of t)
    e[r] = a;
  return e;
}, A = /* @__PURE__ */ x(P, [["__scopeId", "data-v-d418e423"]]);
function I(o) {
  o.route({ path: "/journal", component: A, nav: { label: "Journal", icon: "history", order: 15 } }), o.slot("timeline.entry.badge", $, { order: 10 }), o.intent.provider({
    hub: "entry:interact",
    id: "mark-cooked",
    title: "Mark as cooked",
    icon: "check",
    order: 20,
    kind: "headless",
    isAvailable: (t) => !!(t != null && t.entry),
    isDisabled: (t) => {
      var e;
      return (e = t == null ? void 0 : t.entry) != null && e.is_cooked ? "Already marked as cooked" : !1;
    },
    execute: async (t) => {
      var r, a;
      const e = t.entry;
      await o.outbox.enqueue({ method: "POST", path: "/api/journal", body: {
        id: crypto.randomUUID(),
        date: e.date,
        meal_type: e.meal_type,
        recipe_id: e.recipe_id,
        title: ((r = e.recipe) == null ? void 0 : r.title) || e.title,
        servings_cooked: e.servings_override || 2,
        cooked_by_member_id: e.assigned_cook_id || ((a = o.store.currentMember.value) == null ? void 0 : a.id),
        schedule_entry_id: e.id,
        status: "cooked"
      } }), e.is_cooked = !0, o.notify({ level: "success", message: "Meal marked as cooked!" });
    }
  }), o.intent.provider({
    hub: "entry:interact",
    id: "skip",
    title: "Skip meal",
    icon: "forward",
    order: 30,
    kind: "headless",
    execute: (t) => {
      t != null && t.entry && (t.entry.is_skipped = !0), o.notify({ level: "info", message: "Meal marked as skipped." });
    }
  }), o.intent.provider({
    hub: "entry:interact",
    id: "log-leftover",
    title: "Log leftovers",
    icon: "box",
    order: 40,
    kind: "headless",
    execute: () => o.notify({ level: "info", message: "Leftovers recorded for upcoming meals." })
  });
}
export {
  I as default
};
