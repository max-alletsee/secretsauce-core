import { defineComponent as _, ref as f, onMounted as v, openBlock as t, createElementBlock as s, createElementVNode as e, Fragment as x, renderList as k, toDisplayString as l } from "vue";
const b = { class: "p-4 space-y-4" }, h = {
  key: 0,
  class: "text-surface-500"
}, w = {
  key: 1,
  class: "text-surface-500"
}, M = {
  key: 2,
  class: "space-y-2"
}, S = { class: "font-medium text-surface-800 dark:text-surface-100" }, R = { class: "ml-2 text-sm text-surface-500" }, z = { class: "ml-1 text-sm font-semibold" }, C = ["onClick"], D = /* @__PURE__ */ _({
  __name: "RecurringSettings",
  props: {
    ss: {}
  },
  setup(i) {
    const a = i, c = f([]), o = f(!0), p = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    function y(n) {
      return p[n] || `Day ${n}`;
    }
    async function u() {
      o.value = !0;
      try {
        c.value = await a.ss.api.get("/api/x/core-recurring/rules");
      } finally {
        o.value = !1;
      }
    }
    async function g(n) {
      await a.ss.api.delete(`/api/x/core-recurring/rules/${n}`), await u();
    }
    async function m() {
      a.ss.notify({ level: "info", message: "Materializing recurring meals..." }), await a.ss.api.post("/api/x/core-recurring/materialize", {}), a.ss.notify({ level: "success", message: "Schedule updated." });
    }
    return v(() => {
      u();
    }), (n, d) => (t(), s("div", b, [
      e("div", { class: "flex items-center justify-between" }, [
        d[0] || (d[0] = e(
          "h3",
          { class: "text-lg font-semibold text-surface-900 dark:text-surface-0" },
          "Recurring Meals",
          -1
          /* CACHED */
        )),
        e("button", {
          class: "btn btn-secondary",
          onClick: m
        }, "Materialize Now")
      ]),
      o.value ? (t(), s("div", h, "Loading rules...")) : c.value.length === 0 ? (t(), s("div", w, "No recurring rules configured.")) : (t(), s("div", M, [
        (t(!0), s(
          x,
          null,
          k(c.value, (r) => (t(), s("div", {
            key: r.id,
            class: "flex items-center justify-between p-3 border rounded border-surface-200 dark:border-surface-700"
          }, [
            e("div", null, [
              e(
                "span",
                S,
                l(y(r.weekday)),
                1
                /* TEXT */
              ),
              e(
                "span",
                R,
                l(r.meal_type) + ":",
                1
                /* TEXT */
              ),
              e(
                "span",
                z,
                l(r.recipe_title),
                1
                /* TEXT */
              )
            ]),
            e("button", {
              class: "btn btn-danger",
              onClick: (E) => g(r.id)
            }, "Delete", 8, C)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]))
    ]));
  }
});
function $(i) {
  i.settings.section({
    id: "core-recurring",
    title: "Recurring Meals",
    component: D
  });
}
export {
  $ as default
};
