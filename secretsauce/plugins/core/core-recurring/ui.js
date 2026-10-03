import { defineComponent as B, ref as p, computed as E, watch as q, resolveComponent as b, openBlock as y, createBlock as D, withCtx as T, createElementVNode as k, withModifiers as P, createTextVNode as x, toDisplayString as V, createCommentVNode as A, createVNode as _, unref as O, onMounted as j, createElementBlock as S, Fragment as z, renderList as G } from "vue";
import { useSecretSauce as N } from "@secretsauce/ui";
const H = /* @__PURE__ */ B({
  __name: "RecurringRuleDialog",
  props: {
    visible: { type: Boolean }
  },
  emits: ["update:visible", "saved"],
  setup(r, { emit: t }) {
    const a = r, u = t, i = N(), o = p(0), s = p(""), d = p(null), w = p([]), m = p(!1), g = p(""), c = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((l, e) => ({ label: l, value: e })), n = E(() => i.store.household.value.meal_types);
    let v = 0;
    q(() => a.visible, (l) => {
      var e, f;
      ++v, l && (o.value = 0, s.value = ((e = n.value.find((h) => h.id === "dinner")) == null ? void 0 : e.id) || ((f = n.value[0]) == null ? void 0 : f.id) || "", d.value = null, w.value = [], g.value = "");
    });
    async function M(l) {
      const e = ++v;
      try {
        const f = await i.api.get("/api/recipes", { q: l.query });
        e === v && a.visible && (w.value = f.items);
      } catch (f) {
        e === v && a.visible && (g.value = f.message || "Could not search recipes");
      }
    }
    async function L() {
      var l;
      if (!(m.value || !((l = d.value) != null && l.id) || !s.value)) {
        m.value = !0, g.value = "";
        try {
          const e = await i.api.post("/api/x/core-recurring/rules", { weekday: o.value, meal_type: s.value, recipe_id: d.value.id });
          u("saved", e), u("update:visible", !1);
        } catch (e) {
          g.value = e.message || "Could not save recurring meal";
        } finally {
          m.value = !1;
        }
      }
    }
    return (l, e) => {
      const f = b("Message"), h = b("Select"), I = b("AutoComplete"), U = b("Button"), F = b("Dialog");
      return y(), D(F, {
        visible: r.visible,
        "onUpdate:visible": e[3] || (e[3] = (R) => u("update:visible", R)),
        header: "Add recurring meal",
        modal: "",
        style: { width: "30rem", maxWidth: "95vw" }
      }, {
        default: T(() => {
          var R;
          return [
            k(
              "form",
              {
                class: "recurring-rule-form",
                onSubmit: P(L, ["prevent"])
              },
              [
                g.value ? (y(), D(f, {
                  key: 0,
                  severity: "error"
                }, {
                  default: T(() => [
                    x(
                      V(g.value),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })) : A("v-if", !0),
                e[4] || (e[4] = k(
                  "label",
                  { for: "recurring-weekday" },
                  "Weekday",
                  -1
                  /* CACHED */
                )),
                _(h, {
                  inputId: "recurring-weekday",
                  "aria-label": "Weekday",
                  modelValue: o.value,
                  "onUpdate:modelValue": e[0] || (e[0] = (C) => o.value = C),
                  options: O(c),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"]),
                e[5] || (e[5] = k(
                  "label",
                  { for: "recurring-slot" },
                  "Meal slot",
                  -1
                  /* CACHED */
                )),
                _(h, {
                  inputId: "recurring-slot",
                  "aria-label": "Meal slot",
                  modelValue: s.value,
                  "onUpdate:modelValue": e[1] || (e[1] = (C) => s.value = C),
                  options: n.value,
                  optionLabel: "label",
                  optionValue: "id",
                  fluid: ""
                }, null, 8, ["modelValue", "options"]),
                e[6] || (e[6] = k(
                  "label",
                  { for: "recurring-recipe" },
                  "Recipe",
                  -1
                  /* CACHED */
                )),
                _(I, {
                  inputId: "recurring-recipe",
                  modelValue: d.value,
                  "onUpdate:modelValue": e[2] || (e[2] = (C) => d.value = C),
                  suggestions: w.value,
                  optionLabel: "title",
                  forceSelection: "",
                  onComplete: M,
                  fluid: ""
                }, null, 8, ["modelValue", "suggestions"]),
                _(U, {
                  label: "Add recurring meal",
                  type: "submit",
                  loading: m.value,
                  disabled: !((R = d.value) != null && R.id) || !s.value
                }, null, 8, ["loading", "disabled"])
              ],
              32
              /* NEED_HYDRATION */
            )
          ];
        }),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), W = (r, t) => {
  const a = r.__vccOpts || r;
  for (const [u, i] of t)
    a[u] = i;
  return a;
}, J = /* @__PURE__ */ W(H, [["__scopeId", "data-v-35d222c5"]]), K = { class: "recurring-settings" }, Q = { key: 2 }, X = { key: 3 }, Y = /* @__PURE__ */ B({
  __name: "RecurringSettings",
  setup(r) {
    const t = N(), a = p([]), u = p(!0), i = p(!1), o = p(""), s = p(!1);
    function d(c) {
      var n;
      return ((n = t.store.household.value.meal_types.find((v) => v.id === c)) == null ? void 0 : n.label) || c;
    }
    const w = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    async function m() {
      u.value = !0;
      try {
        a.value = await t.api.get("/api/x/core-recurring/rules");
      } catch (c) {
        o.value = (c == null ? void 0 : c.message) || "Could not load recurring rules";
      } finally {
        u.value = !1;
      }
    }
    async function g(c) {
      if (!i.value) {
        i.value = !0, o.value = "";
        try {
          await t.api.delete(`/api/x/core-recurring/rules/${c}`), await m();
        } catch (n) {
          o.value = (n == null ? void 0 : n.message) || "Could not delete rule";
        } finally {
          i.value = !1;
        }
      }
    }
    return j(m), (c, n) => {
      const v = b("Button"), M = b("Message"), L = b("ProgressSpinner");
      return y(), S("div", K, [
        n[2] || (n[2] = k(
          "p",
          null,
          "A recurring meal is planned automatically on the same weekday every week, 14 days ahead.",
          -1
          /* CACHED */
        )),
        _(v, {
          label: "Add recurring meal",
          icon: "pi pi-plus",
          disabled: i.value,
          onClick: n[0] || (n[0] = (l) => s.value = !0)
        }, null, 8, ["disabled"]),
        o.value ? (y(), D(M, {
          key: 0,
          severity: "error"
        }, {
          default: T(() => [
            x(
              V(o.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        u.value ? (y(), D(L, {
          key: 1,
          "aria-label": "Loading recurring rules"
        })) : a.value.length ? (y(), S("ul", X, [
          (y(!0), S(
            z,
            null,
            G(a.value, (l) => (y(), S("li", {
              key: l.id
            }, [
              k(
                "span",
                null,
                "Every " + V(w[l.weekday] || `Day ${l.weekday}`) + " · " + V(d(l.meal_type)) + " · " + V(l.recipe_title),
                1
                /* TEXT */
              ),
              _(v, {
                label: "Delete",
                icon: "pi pi-trash",
                text: "",
                severity: "danger",
                disabled: i.value,
                onClick: (e) => g(l.id)
              }, null, 8, ["disabled", "onClick"])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (y(), S("p", Q, "No recurring rules configured.")),
        _(J, {
          visible: s.value,
          "onUpdate:visible": n[1] || (n[1] = (l) => s.value = l),
          onSaved: m
        }, null, 8, ["visible"])
      ]);
    };
  }
}), Z = /* @__PURE__ */ W(Y, [["__scopeId", "data-v-7326780d"]]);
function ee(r) {
  return (r + 6) % 7;
}
function $(r) {
  return (/* @__PURE__ */ new Date(`${r}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
}
function te(r) {
  r.settings.section({
    id: "core-recurring",
    title: "Recurring Meals",
    order: 20,
    component: Z
  }), r.intent.provider({
    hub: "entry:interact",
    id: "repeat-weekly",
    kind: "headless",
    title: "Repeat weekly",
    titleFor: (t) => `Repeat every ${$(t.entry.date)}`,
    icon: "replay",
    order: 50,
    isAvailable: (t) => {
      var a;
      return !!((a = t == null ? void 0 : t.entry) != null && a.recipe_id) && t.entry.origin !== "plugin:core-recurring";
    },
    execute: async (t) => {
      const a = t.entry, u = r.store.household.value.meal_types, i = a.meal_type.toLowerCase(), o = u.find((d) => d.id.toLowerCase() === i) || u.find((d) => d.label.toLowerCase() === i), s = await r.api.post("/api/x/core-recurring/rules", {
        weekday: ee((/* @__PURE__ */ new Date(`${a.date}T12:00:00`)).getDay()),
        meal_type: t.mealType || (o == null ? void 0 : o.id) || a.meal_type,
        recipe_id: a.recipe_id
      });
      return r.notify({ level: "success", message: `Repeating every ${$(a.date)}` }), s;
    }
  });
}
export {
  te as default
};
