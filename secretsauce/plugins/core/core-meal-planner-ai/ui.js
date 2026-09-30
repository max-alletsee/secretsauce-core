import { defineComponent as L, ref as i, computed as U, watch as P, resolveComponent as p, openBlock as t, createElementBlock as f, createElementVNode as n, createTextVNode as I, createVNode as u, createBlock as y, createCommentVNode as _, withCtx as T, toDisplayString as $, Fragment as W, renderList as Y } from "vue";
import { useSecretSauce as q } from "@secretsauce/ui";
const H = { class: "meal-planner-widget" }, J = {
  key: 0,
  class: "planner-form"
}, K = { class: "actions" }, Q = {
  key: 2,
  class: "suggestions-pool"
}, R = { class: "actions" }, X = { key: 0 }, Z = {
  key: 3,
  class: "suggestion-actions"
}, ee = ["for"], le = { class: "actions" }, ae = /* @__PURE__ */ L({
  __name: "MealPlannerWidget",
  emits: ["scheduled"],
  setup(g, { emit: x }) {
    const V = x, r = q(), k = i(5), s = i(""), w = i(""), v = i(!0), C = i(!1), o = i(null), d = i(""), m = i([]), S = i({}), F = U(() => {
      var l;
      return ((l = r.store.household.value) == null ? void 0 : l.meal_types) || [];
    });
    P(F, (l) => {
      var e, c;
      l.some((b) => b.id === s.value) || (s.value = ((e = l.find((b) => b.id === "dinner")) == null ? void 0 : e.id) || ((c = l[0]) == null ? void 0 : c.id) || "");
    }, { immediate: !0 });
    const O = U(() => m.value.filter((l) => l.status === "suggested"));
    function N() {
      const l = /* @__PURE__ */ new Date();
      return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, "0")}-${String(l.getDate()).padStart(2, "0")}`;
    }
    async function j() {
      if (!(C.value || !s.value)) {
        C.value = !0, d.value = "";
        try {
          const l = await r.api.post("/api/x/core-meal-planner-ai/generate", { days: k.value, prompt: w.value.trim() || void 0, meal_types: [s.value] });
          m.value = l.suggestions, v.value = !1;
          for (const e of l.suggestions) S.value[e.id] = e.suggested_date || N();
        } catch (l) {
          d.value = (l == null ? void 0 : l.message) || "Failed to generate meal suggestions";
        } finally {
          C.value = !1;
        }
      }
    }
    async function z(l) {
      if (!o.value) {
        o.value = l.id, d.value = "";
        try {
          const e = S.value[l.id] || N(), c = await r.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/accept`, { date: e, meal_type: s.value });
          Object.assign(l, c), r.notify({ level: "success", message: `Scheduled ${l.recipe_title} for ${e}` }), V("scheduled", c);
        } catch (e) {
          d.value = (e == null ? void 0 : e.message) || "Failed to schedule meal";
        } finally {
          o.value = null;
        }
      }
    }
    async function A(l) {
      if (!o.value) {
        o.value = l.id, d.value = "";
        try {
          Object.assign(l, await r.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/dismiss`));
        } catch (e) {
          d.value = (e == null ? void 0 : e.message) || "Failed to dismiss suggestion";
        } finally {
          o.value = null;
        }
      }
    }
    return (l, e) => {
      const c = p("InputNumber"), b = p("Select"), B = p("InputText"), h = p("Button"), E = p("Message"), M = p("Tag"), G = p("Card");
      return t(), f("section", H, [
        e[8] || (e[8] = n(
          "h3",
          null,
          [
            n("i", {
              class: "pi pi-sparkles",
              "aria-hidden": "true"
            }),
            I(" AI meal suggestions")
          ],
          -1
          /* CACHED */
        )),
        v.value || !m.value.length ? (t(), f("div", J, [
          e[5] || (e[5] = n(
            "label",
            { for: "planner-days" },
            "Days to plan",
            -1
            /* CACHED */
          )),
          u(c, {
            inputId: "planner-days",
            modelValue: k.value,
            "onUpdate:modelValue": e[0] || (e[0] = (a) => k.value = a),
            min: 1,
            max: 14,
            fluid: ""
          }, null, 8, ["modelValue"]),
          e[6] || (e[6] = n(
            "label",
            { for: "planner-slot" },
            "Meal slot",
            -1
            /* CACHED */
          )),
          u(b, {
            inputId: "planner-slot",
            "aria-label": "Meal slot",
            modelValue: s.value,
            "onUpdate:modelValue": e[1] || (e[1] = (a) => s.value = a),
            options: F.value,
            optionLabel: "label",
            optionValue: "id",
            fluid: ""
          }, null, 8, ["modelValue", "options"]),
          e[7] || (e[7] = n(
            "label",
            { for: "planner-prompt" },
            "Dietary focus / notes",
            -1
            /* CACHED */
          )),
          u(B, {
            id: "planner-prompt",
            modelValue: w.value,
            "onUpdate:modelValue": e[2] || (e[2] = (a) => w.value = a),
            placeholder: "Fast weeknight meals…",
            fluid: ""
          }, null, 8, ["modelValue"]),
          n("div", K, [
            m.value.length ? (t(), y(h, {
              key: 0,
              label: "Cancel",
              severity: "secondary",
              onClick: e[3] || (e[3] = (a) => v.value = !1)
            })) : _("v-if", !0),
            u(h, {
              label: "Generate suggestions",
              icon: "pi pi-sparkles",
              loading: C.value,
              disabled: !s.value,
              onClick: j
            }, null, 8, ["loading", "disabled"])
          ])
        ])) : _("v-if", !0),
        d.value ? (t(), y(E, {
          key: 1,
          severity: "error"
        }, {
          default: T(() => [
            I(
              $(d.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : _("v-if", !0),
        m.value.length ? (t(), f("div", Q, [
          n("div", R, [
            n(
              "span",
              null,
              $(O.value.length) + " suggestions",
              1
              /* TEXT */
            ),
            u(h, {
              label: v.value ? "Close form" : "Generate more",
              text: "",
              onClick: e[4] || (e[4] = (a) => v.value = !v.value)
            }, null, 8, ["label"])
          ]),
          (t(!0), f(
            W,
            null,
            Y(m.value, (a) => (t(), y(
              G,
              {
                key: a.id,
                class: "sug-card"
              },
              {
                title: T(() => [
                  I(
                    $(a.recipe_title),
                    1
                    /* TEXT */
                  )
                ]),
                content: T(() => [
                  a.reasoning ? (t(), f(
                    "p",
                    X,
                    $(a.reasoning),
                    1
                    /* TEXT */
                  )) : _("v-if", !0),
                  a.status === "accepted" ? (t(), y(M, {
                    key: 1,
                    value: "Scheduled",
                    severity: "success",
                    icon: "pi pi-check"
                  })) : a.status === "dismissed" ? (t(), y(M, {
                    key: 2,
                    value: "Dismissed",
                    severity: "secondary"
                  })) : (t(), f("div", Z, [
                    a.confidence ? (t(), y(M, {
                      key: 0,
                      value: `${Math.round(a.confidence * 100)}% match`,
                      severity: "secondary"
                    }, null, 8, ["value"])) : _("v-if", !0),
                    n("label", {
                      for: `schedule-${a.id}`
                    }, "Schedule date", 8, ee),
                    u(B, {
                      id: `schedule-${a.id}`,
                      modelValue: S.value[a.id],
                      "onUpdate:modelValue": (D) => S.value[a.id] = D,
                      type: "date",
                      fluid: ""
                    }, null, 8, ["id", "modelValue", "onUpdate:modelValue"]),
                    n("div", le, [
                      u(h, {
                        label: "Dismiss",
                        size: "small",
                        severity: "secondary",
                        disabled: !!o.value,
                        onClick: (D) => A(a)
                      }, null, 8, ["disabled", "onClick"]),
                      u(h, {
                        label: "Add to schedule",
                        size: "small",
                        loading: o.value === a.id,
                        disabled: !!o.value || !s.value,
                        onClick: (D) => z(a)
                      }, null, 8, ["loading", "disabled", "onClick"])
                    ])
                  ]))
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
        ])) : _("v-if", !0)
      ]);
    };
  }
}), te = (g, x) => {
  const V = g.__vccOpts || g;
  for (const [r, k] of x)
    V[r] = k;
  return V;
}, ne = /* @__PURE__ */ te(ae, [["__scopeId", "data-v-0ce7eea9"]]);
function ie(g) {
  g.slot("timeline.sidebar", ne, { order: 10 });
}
export {
  ne as MealPlannerWidget,
  ie as default
};
