import { defineComponent as X, ref as s, computed as R, watch as E, onBeforeUnmount as Z, resolveComponent as y, openBlock as n, createElementBlock as b, createElementVNode as u, createTextVNode as z, createVNode as r, createBlock as k, createCommentVNode as S, withCtx as G, toDisplayString as U, Fragment as ee, renderList as le } from "vue";
import { useSecretSauce as te } from "@secretsauce/ui";
const ae = { class: "meal-planner-widget" }, ne = {
  key: 0,
  class: "planner-form"
}, oe = { class: "actions" }, se = {
  key: 2,
  class: "suggestions-pool"
}, ie = { class: "actions" }, ue = { key: 0 }, de = {
  key: 3,
  class: "suggestion-actions"
}, re = ["for"], ce = { class: "actions" }, pe = /* @__PURE__ */ X({
  __name: "MealPlannerWidget",
  emits: ["scheduled"],
  setup(V, { emit: N }) {
    const x = N, o = te(), w = s(5), i = s(""), B = s(""), _ = s(!0), D = s(!1), d = s(null), c = s(""), h = s([]), f = s({}), p = s({}), M = s({});
    function O(l) {
      var e;
      return (p.value[l] || ((e = o.store.household.value) == null ? void 0 : e.meal_types) || []).filter((a) => !a.skipped);
    }
    const P = R(() => O(g()));
    let I = 0, T = !1;
    async function W() {
      const l = ++I, e = /* @__PURE__ */ new Date(`${g()}T12:00:00`);
      e.setDate(e.getDate() + 31);
      try {
        const a = await o.api.get("/api/x/core-timeline/slots", { from: g(), to: e.toLocaleDateString("en-CA") });
        l === I && !T && (p.value = { ...p.value, ...a.days });
      } catch {
        l === I && !T && (p.value = {});
      }
    }
    const F = /* @__PURE__ */ new Map();
    async function j(l) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(l) || p.value[l]) return;
      if (F.has(l)) return F.get(l);
      const e = (async () => {
        try {
          const a = await o.api.get("/api/x/core-timeline/slots", { from: l, to: l });
          T || (p.value = { ...p.value, ...a.days });
        } catch {
        } finally {
          F.delete(l);
        }
      })();
      return F.set(l, e), e;
    }
    E(f, (l) => {
      for (const e of new Set(Object.values(l))) j(e);
    }, { deep: !0 }), E(() => o.store.household.value.meal_types, W, { immediate: !0 });
    const q = o.on("core-timeline:slots-changed", () => {
      p.value = {}, W();
      for (const l of new Set(Object.values(f.value))) j(l);
    });
    Z(() => {
      T = !0, ++I, typeof q == "function" && q();
    }), E(P, (l) => {
      var e, a;
      l.some((v) => v.id === i.value) || (i.value = ((e = l.find((v) => v.id === "dinner")) == null ? void 0 : e.id) || ((a = l[0]) == null ? void 0 : a.id) || "");
    }, { immediate: !0 });
    const Y = R(() => h.value.filter((l) => l.status === "suggested"));
    function g() {
      const l = /* @__PURE__ */ new Date();
      return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, "0")}-${String(l.getDate()).padStart(2, "0")}`;
    }
    async function H() {
      if (!(D.value || !i.value)) {
        D.value = !0, c.value = "";
        try {
          const l = await o.api.post("/api/x/core-meal-planner-ai/generate", { days: w.value, prompt: B.value.trim() || void 0, meal_types: [i.value] });
          h.value = l.suggestions, _.value = !1;
          for (const e of l.suggestions)
            f.value[e.id] = e.suggested_date || g(), M.value[e.id] = i.value;
        } catch (l) {
          c.value = (l == null ? void 0 : l.message) || "Failed to generate meal suggestions";
        } finally {
          D.value = !1;
        }
      }
    }
    async function J(l) {
      if (!d.value) {
        d.value = l.id, c.value = "";
        try {
          const e = f.value[l.id] || g();
          await j(e);
          const a = O(e), v = M.value[l.id] || i.value, C = a.find((L) => L.id === v) || a[0];
          if (!C) throw new Error("No available meal slots on this day");
          const m = await o.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/accept`, { date: e, meal_type: C.id });
          Object.assign(l, m), o.notify({ level: "success", message: `Scheduled ${l.recipe_title} for ${e}` }), x("scheduled", m);
        } catch (e) {
          c.value = (e == null ? void 0 : e.message) || "Failed to schedule meal";
        } finally {
          d.value = null;
        }
      }
    }
    async function K(l) {
      if (!d.value) {
        d.value = l.id, c.value = "";
        try {
          Object.assign(l, await o.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/dismiss`));
        } catch (e) {
          c.value = (e == null ? void 0 : e.message) || "Failed to dismiss suggestion";
        } finally {
          d.value = null;
        }
      }
    }
    return (l, e) => {
      const a = y("InputNumber"), v = y("Select"), C = y("InputText"), m = y("Button"), L = y("Message"), A = y("Tag"), Q = y("Card");
      return n(), b("section", ae, [
        e[8] || (e[8] = u(
          "h3",
          null,
          [
            u("i", {
              class: "pi pi-sparkles",
              "aria-hidden": "true"
            }),
            z(" AI meal suggestions")
          ],
          -1
          /* CACHED */
        )),
        _.value || !h.value.length ? (n(), b("div", ne, [
          e[5] || (e[5] = u(
            "label",
            { for: "planner-days" },
            "Days to plan",
            -1
            /* CACHED */
          )),
          r(a, {
            inputId: "planner-days",
            modelValue: w.value,
            "onUpdate:modelValue": e[0] || (e[0] = (t) => w.value = t),
            min: 1,
            max: 14,
            fluid: ""
          }, null, 8, ["modelValue"]),
          e[6] || (e[6] = u(
            "label",
            { for: "planner-slot" },
            "Meal slot",
            -1
            /* CACHED */
          )),
          r(v, {
            inputId: "planner-slot",
            "aria-label": "Meal slot",
            modelValue: i.value,
            "onUpdate:modelValue": e[1] || (e[1] = (t) => i.value = t),
            options: P.value,
            optionLabel: "label",
            optionValue: "id",
            fluid: ""
          }, null, 8, ["modelValue", "options"]),
          e[7] || (e[7] = u(
            "label",
            { for: "planner-prompt" },
            "Dietary focus / notes",
            -1
            /* CACHED */
          )),
          r(C, {
            id: "planner-prompt",
            modelValue: B.value,
            "onUpdate:modelValue": e[2] || (e[2] = (t) => B.value = t),
            placeholder: "Fast weeknight meals…",
            fluid: ""
          }, null, 8, ["modelValue"]),
          u("div", oe, [
            h.value.length ? (n(), k(m, {
              key: 0,
              label: "Cancel",
              severity: "secondary",
              onClick: e[3] || (e[3] = (t) => _.value = !1)
            })) : S("v-if", !0),
            r(m, {
              label: "Generate suggestions",
              icon: "pi pi-sparkles",
              loading: D.value,
              disabled: !i.value,
              onClick: H
            }, null, 8, ["loading", "disabled"])
          ])
        ])) : S("v-if", !0),
        c.value ? (n(), k(L, {
          key: 1,
          severity: "error"
        }, {
          default: G(() => [
            z(
              U(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : S("v-if", !0),
        h.value.length ? (n(), b("div", se, [
          u("div", ie, [
            u(
              "span",
              null,
              U(Y.value.length) + " suggestions",
              1
              /* TEXT */
            ),
            r(m, {
              label: _.value ? "Close form" : "Generate more",
              text: "",
              onClick: e[4] || (e[4] = (t) => _.value = !_.value)
            }, null, 8, ["label"])
          ]),
          (n(!0), b(
            ee,
            null,
            le(h.value, (t) => (n(), k(
              Q,
              {
                key: t.id,
                class: "sug-card"
              },
              {
                title: G(() => [
                  z(
                    U(t.recipe_title),
                    1
                    /* TEXT */
                  )
                ]),
                content: G(() => [
                  t.reasoning ? (n(), b(
                    "p",
                    ue,
                    U(t.reasoning),
                    1
                    /* TEXT */
                  )) : S("v-if", !0),
                  t.status === "accepted" ? (n(), k(A, {
                    key: 1,
                    value: "Scheduled",
                    severity: "success",
                    icon: "pi pi-check"
                  })) : t.status === "dismissed" ? (n(), k(A, {
                    key: 2,
                    value: "Dismissed",
                    severity: "secondary"
                  })) : (n(), b("div", de, [
                    t.confidence ? (n(), k(A, {
                      key: 0,
                      value: `${Math.round(t.confidence * 100)}% match`,
                      severity: "secondary"
                    }, null, 8, ["value"])) : S("v-if", !0),
                    u("label", {
                      for: `schedule-${t.id}`
                    }, "Schedule date", 8, re),
                    r(C, {
                      id: `schedule-${t.id}`,
                      modelValue: f.value[t.id],
                      "onUpdate:modelValue": ($) => f.value[t.id] = $,
                      type: "date",
                      fluid: ""
                    }, null, 8, ["id", "modelValue", "onUpdate:modelValue"]),
                    r(v, {
                      inputId: `schedule-slot-${t.id}`,
                      "aria-label": "Schedule meal slot",
                      modelValue: M.value[t.id],
                      "onUpdate:modelValue": ($) => M.value[t.id] = $,
                      options: O(f.value[t.id] || g()),
                      optionLabel: "label",
                      optionValue: "id",
                      fluid: ""
                    }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue", "options"]),
                    u("div", ce, [
                      r(m, {
                        label: "Dismiss",
                        size: "small",
                        severity: "secondary",
                        disabled: !!d.value,
                        onClick: ($) => K(t)
                      }, null, 8, ["disabled", "onClick"]),
                      r(m, {
                        label: "Add to schedule",
                        size: "small",
                        loading: d.value === t.id,
                        disabled: !!d.value || !i.value,
                        onClick: ($) => J(t)
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
        ])) : S("v-if", !0)
      ]);
    };
  }
}), ve = (V, N) => {
  const x = V.__vccOpts || V;
  for (const [o, w] of N)
    x[o] = w;
  return x;
}, me = /* @__PURE__ */ ve(pe, [["__scopeId", "data-v-c96c8267"]]);
function _e(V) {
  V.slot("timeline.sidebar", me, { order: 10 });
}
export {
  me as MealPlannerWidget,
  _e as default
};
