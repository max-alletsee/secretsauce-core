import { defineComponent as w, ref as d, onMounted as x, resolveComponent as y, openBlock as r, createElementBlock as c, createVNode as _, createBlock as m, withCtx as b, createTextVNode as M, toDisplayString as g, createCommentVNode as N, Fragment as B, renderList as R, createElementVNode as z } from "vue";
import { useSecretSauce as V } from "@secretsauce/ui";
const D = { class: "recurring-settings" }, T = { key: 2 }, $ = { key: 3 }, E = /* @__PURE__ */ w({
  __name: "RecurringSettings",
  setup(s) {
    const n = V(), o = d([]), i = d(!0), e = d(!1), a = d(""), f = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    async function p() {
      i.value = !0;
      try {
        o.value = await n.api.get("/api/x/core-recurring/rules");
      } catch (t) {
        a.value = (t == null ? void 0 : t.message) || "Could not load recurring rules";
      } finally {
        i.value = !1;
      }
    }
    async function k(t) {
      if (!e.value) {
        e.value = !0, a.value = "";
        try {
          await n.api.delete(`/api/x/core-recurring/rules/${t}`), await p();
        } catch (u) {
          a.value = (u == null ? void 0 : u.message) || "Could not delete rule";
        } finally {
          e.value = !1;
        }
      }
    }
    async function h() {
      if (!e.value) {
        e.value = !0, a.value = "";
        try {
          await n.api.post("/api/x/core-recurring/materialize", {}), n.notify({ level: "success", message: "Schedule updated." });
        } catch (t) {
          a.value = (t == null ? void 0 : t.message) || "Could not materialize recurring meals";
        } finally {
          e.value = !1;
        }
      }
    }
    return x(p), (t, u) => {
      const v = y("Button"), C = y("Message"), S = y("ProgressSpinner");
      return r(), c("div", D, [
        _(v, {
          label: "Materialize Now",
          severity: "secondary",
          outlined: "",
          loading: e.value,
          onClick: h
        }, null, 8, ["loading"]),
        a.value ? (r(), m(C, {
          key: 0,
          severity: "error"
        }, {
          default: b(() => [
            M(
              g(a.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : N("v-if", !0),
        i.value ? (r(), m(S, {
          key: 1,
          "aria-label": "Loading recurring rules"
        })) : o.value.length ? (r(), c("ul", $, [
          (r(!0), c(
            B,
            null,
            R(o.value, (l) => (r(), c("li", {
              key: l.id
            }, [
              z(
                "span",
                null,
                g(f[l.weekday] || `Day ${l.weekday}`) + " · " + g(l.meal_type) + " · " + g(l.recipe_title),
                1
                /* TEXT */
              ),
              _(v, {
                label: "Delete",
                icon: "pi pi-trash",
                text: "",
                severity: "danger",
                disabled: e.value,
                onClick: (P) => k(l.id)
              }, null, 8, ["disabled", "onClick"])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (r(), c("p", T, "No recurring rules configured."))
      ]);
    };
  }
}), F = (s, n) => {
  const o = s.__vccOpts || s;
  for (const [i, e] of n)
    o[i] = e;
  return o;
}, L = /* @__PURE__ */ F(E, [["__scopeId", "data-v-0d279ab5"]]);
function W(s) {
  s.settings.section({
    id: "core-recurring",
    title: "Recurring Meals",
    order: 20,
    component: L
  });
}
export {
  W as default
};
