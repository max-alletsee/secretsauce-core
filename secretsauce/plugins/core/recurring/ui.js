import { defineComponent as k, ref as f, onMounted as h, openBlock as e, createElementBlock as t, createElementVNode as s, createVNode as p, unref as y, Fragment as w, renderList as b, toDisplayString as l } from "vue";
import m from "primevue/button";
const M = { class: "p-4 space-y-4" }, S = { class: "flex items-center justify-between" }, N = {
  key: 0,
  class: "text-surface-500"
}, R = {
  key: 1,
  class: "text-surface-500"
}, z = {
  key: 2,
  class: "space-y-2"
}, C = { class: "font-medium text-surface-800 dark:text-surface-100" }, E = { class: "ml-2 text-sm text-surface-500" }, B = { class: "ml-1 text-sm font-semibold" }, D = /* @__PURE__ */ k({
  __name: "RecurringSettings",
  props: {
    ss: {}
  },
  setup(r) {
    const a = r, o = f([]), c = f(!0), g = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    function _(n) {
      return g[n] || `Day ${n}`;
    }
    async function u() {
      c.value = !0;
      try {
        o.value = await a.ss.api.get("/api/x/recurring/rules");
      } finally {
        c.value = !1;
      }
    }
    async function v(n) {
      await a.ss.api.delete(`/api/x/recurring/rules/${n}`), await u();
    }
    async function x() {
      a.ss.notify({ level: "info", message: "Materializing recurring meals..." }), await a.ss.api.post("/api/x/recurring/materialize", {}), a.ss.notify({ level: "success", message: "Schedule updated." });
    }
    return h(() => {
      u();
    }), (n, d) => (e(), t("div", M, [
      s("div", S, [
        d[0] || (d[0] = s(
          "h3",
          { class: "text-lg font-semibold text-surface-900 dark:text-surface-0" },
          "Recurring Meals",
          -1
          /* CACHED */
        )),
        p(y(m), {
          label: "Materialize Now",
          icon: "pi pi-refresh",
          severity: "secondary",
          onClick: x
        })
      ]),
      c.value ? (e(), t("div", N, "Loading rules...")) : o.value.length === 0 ? (e(), t("div", R, "No recurring rules configured.")) : (e(), t("div", z, [
        (e(!0), t(
          w,
          null,
          b(o.value, (i) => (e(), t("div", {
            key: i.id,
            class: "flex items-center justify-between p-3 border rounded border-surface-200 dark:border-surface-700"
          }, [
            s("div", null, [
              s(
                "span",
                C,
                l(_(i.weekday)),
                1
                /* TEXT */
              ),
              s(
                "span",
                E,
                l(i.meal_type) + ":",
                1
                /* TEXT */
              ),
              s(
                "span",
                B,
                l(i.recipe_title),
                1
                /* TEXT */
              )
            ]),
            p(y(m), {
              icon: "pi pi-trash",
              severity: "danger",
              text: "",
              onClick: ($) => v(i.id)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]))
    ]));
  }
});
function L(r) {
  r.settings.section({
    id: "recurring",
    title: "Recurring Meals",
    component: D
  });
}
export {
  L as default
};
