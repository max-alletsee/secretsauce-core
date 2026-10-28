import { defineComponent as Y, ref as i, computed as R, watch as z, onBeforeUnmount as te, resolveComponent as b, openBlock as u, createElementBlock as x, createElementVNode as r, createTextVNode as A, createVNode as f, createBlock as D, createCommentVNode as k, withCtx as E, toDisplayString as L, Fragment as H, renderList as ae } from "vue";
import { useSecretSauce as J } from "@secretsauce/ui";
const ne = { class: "meal-planner-widget" }, oe = {
  key: 0,
  class: "planner-form"
}, se = { class: "actions" }, ie = {
  key: 2,
  class: "suggestions-pool"
}, ue = { class: "actions" }, de = { key: 0 }, re = {
  key: 3,
  class: "suggestion-actions"
}, ce = ["for"], pe = { class: "actions" }, ve = /* @__PURE__ */ Y({
  __name: "MealPlannerWidget",
  emits: ["scheduled"],
  setup(_, { emit: h }) {
    const v = h, o = J(), m = i(5), d = i(""), g = i(""), S = i(!0), I = i(!1), y = i(null), t = i(""), n = i([]), s = i({}), c = i({}), F = i({});
    function T(l) {
      var e;
      return (c.value[l] || ((e = o.store.household.value) == null ? void 0 : e.meal_types) || []).filter((p) => !p.skipped);
    }
    const N = R(() => T(B()));
    let w = 0, C = !1;
    async function P() {
      const l = ++w, e = /* @__PURE__ */ new Date(`${B()}T12:00:00`);
      e.setDate(e.getDate() + 31);
      try {
        const p = await o.api.get("/api/x/core-timeline/slots", { from: B(), to: e.toLocaleDateString("en-CA") });
        l === w && !C && (c.value = { ...c.value, ...p.days });
      } catch {
        l === w && !C && (c.value = {});
      }
    }
    const M = /* @__PURE__ */ new Map();
    async function U(l) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(l) || c.value[l]) return;
      if (M.has(l)) return M.get(l);
      const e = (async () => {
        try {
          const p = await o.api.get("/api/x/core-timeline/slots", { from: l, to: l });
          C || (c.value = { ...c.value, ...p.days });
        } catch {
        } finally {
          M.delete(l);
        }
      })();
      return M.set(l, e), e;
    }
    z(s, (l) => {
      for (const e of new Set(Object.values(l))) U(e);
    }, { deep: !0 }), z(() => o.store.household.value.meal_types, P, { immediate: !0 });
    const q = o.on("core-timeline:slots-changed", () => {
      c.value = {}, P();
      for (const l of new Set(Object.values(s.value))) U(l);
    });
    te(() => {
      C = !0, ++w, typeof q == "function" && q();
    }), z(N, (l) => {
      var e, p;
      l.some((V) => V.id === d.value) || (d.value = ((e = l.find((V) => V.id === "dinner")) == null ? void 0 : e.id) || ((p = l[0]) == null ? void 0 : p.id) || "");
    }, { immediate: !0 });
    const X = R(() => n.value.filter((l) => l.status === "suggested"));
    function B() {
      const l = /* @__PURE__ */ new Date();
      return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, "0")}-${String(l.getDate()).padStart(2, "0")}`;
    }
    async function Z() {
      if (!(I.value || !d.value)) {
        I.value = !0, t.value = "";
        try {
          const l = await o.api.post("/api/x/core-meal-planner-ai/generate", { days: m.value, prompt: g.value.trim() || void 0, meal_types: [d.value] });
          n.value = l.suggestions, S.value = !1;
          for (const e of l.suggestions)
            s.value[e.id] = e.suggested_date || B(), F.value[e.id] = d.value;
        } catch (l) {
          t.value = (l == null ? void 0 : l.message) || "Failed to generate meal suggestions";
        } finally {
          I.value = !1;
        }
      }
    }
    async function K(l) {
      if (!y.value) {
        y.value = l.id, t.value = "";
        try {
          const e = s.value[l.id] || B();
          await U(e);
          const p = T(e), V = F.value[l.id] || d.value, j = p.find((G) => G.id === V) || p[0];
          if (!j) throw new Error("No available meal slots on this day");
          const $ = await o.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/accept`, { date: e, meal_type: j.id });
          Object.assign(l, $), o.notify({ level: "success", message: `Scheduled ${l.recipe_title} for ${e}` }), v("scheduled", $);
        } catch (e) {
          t.value = (e == null ? void 0 : e.message) || "Failed to schedule meal";
        } finally {
          y.value = null;
        }
      }
    }
    async function ee(l) {
      if (!y.value) {
        y.value = l.id, t.value = "";
        try {
          Object.assign(l, await o.api.post(`/api/x/core-meal-planner-ai/suggestions/${l.id}/dismiss`));
        } catch (e) {
          t.value = (e == null ? void 0 : e.message) || "Failed to dismiss suggestion";
        } finally {
          y.value = null;
        }
      }
    }
    return (l, e) => {
      const p = b("InputNumber"), V = b("Select"), j = b("InputText"), $ = b("Button"), G = b("Message"), W = b("Tag"), le = b("Card");
      return u(), x("section", ne, [
        e[8] || (e[8] = r(
          "h3",
          null,
          [
            r("i", {
              class: "pi pi-sparkles",
              "aria-hidden": "true"
            }),
            A(" AI meal suggestions")
          ],
          -1
          /* CACHED */
        )),
        S.value || !n.value.length ? (u(), x("div", oe, [
          e[5] || (e[5] = r(
            "label",
            { for: "planner-days" },
            "Days to plan",
            -1
            /* CACHED */
          )),
          f(p, {
            inputId: "planner-days",
            modelValue: m.value,
            "onUpdate:modelValue": e[0] || (e[0] = (a) => m.value = a),
            min: 1,
            max: 14,
            fluid: ""
          }, null, 8, ["modelValue"]),
          e[6] || (e[6] = r(
            "label",
            { for: "planner-slot" },
            "Meal slot",
            -1
            /* CACHED */
          )),
          f(V, {
            inputId: "planner-slot",
            "aria-label": "Meal slot",
            modelValue: d.value,
            "onUpdate:modelValue": e[1] || (e[1] = (a) => d.value = a),
            options: N.value,
            optionLabel: "label",
            optionValue: "id",
            fluid: ""
          }, null, 8, ["modelValue", "options"]),
          e[7] || (e[7] = r(
            "label",
            { for: "planner-prompt" },
            "Dietary focus / notes",
            -1
            /* CACHED */
          )),
          f(j, {
            id: "planner-prompt",
            modelValue: g.value,
            "onUpdate:modelValue": e[2] || (e[2] = (a) => g.value = a),
            placeholder: "Fast weeknight meals…",
            fluid: ""
          }, null, 8, ["modelValue"]),
          r("div", se, [
            n.value.length ? (u(), D($, {
              key: 0,
              label: "Cancel",
              severity: "secondary",
              onClick: e[3] || (e[3] = (a) => S.value = !1)
            })) : k("v-if", !0),
            f($, {
              label: "Generate suggestions",
              icon: "pi pi-sparkles",
              loading: I.value,
              disabled: !d.value,
              onClick: Z
            }, null, 8, ["loading", "disabled"])
          ])
        ])) : k("v-if", !0),
        t.value ? (u(), D(G, {
          key: 1,
          severity: "error"
        }, {
          default: E(() => [
            A(
              L(t.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : k("v-if", !0),
        n.value.length ? (u(), x("div", ie, [
          r("div", ue, [
            r(
              "span",
              null,
              L(X.value.length) + " suggestions",
              1
              /* TEXT */
            ),
            f($, {
              label: S.value ? "Close form" : "Generate more",
              text: "",
              onClick: e[4] || (e[4] = (a) => S.value = !S.value)
            }, null, 8, ["label"])
          ]),
          (u(!0), x(
            H,
            null,
            ae(n.value, (a) => (u(), D(
              le,
              {
                key: a.id,
                class: "sug-card"
              },
              {
                title: E(() => [
                  A(
                    L(a.recipe_title),
                    1
                    /* TEXT */
                  )
                ]),
                content: E(() => [
                  a.reasoning ? (u(), x(
                    "p",
                    de,
                    L(a.reasoning),
                    1
                    /* TEXT */
                  )) : k("v-if", !0),
                  a.status === "accepted" ? (u(), D(W, {
                    key: 1,
                    value: "Scheduled",
                    severity: "success",
                    icon: "pi pi-check"
                  })) : a.status === "dismissed" ? (u(), D(W, {
                    key: 2,
                    value: "Dismissed",
                    severity: "secondary"
                  })) : (u(), x("div", re, [
                    a.confidence ? (u(), D(W, {
                      key: 0,
                      value: `${Math.round(a.confidence * 100)}% match`,
                      severity: "secondary"
                    }, null, 8, ["value"])) : k("v-if", !0),
                    r("label", {
                      for: `schedule-${a.id}`
                    }, "Schedule date", 8, ce),
                    f(j, {
                      id: `schedule-${a.id}`,
                      modelValue: s.value[a.id],
                      "onUpdate:modelValue": (O) => s.value[a.id] = O,
                      type: "date",
                      fluid: ""
                    }, null, 8, ["id", "modelValue", "onUpdate:modelValue"]),
                    f(V, {
                      inputId: `schedule-slot-${a.id}`,
                      "aria-label": "Schedule meal slot",
                      modelValue: F.value[a.id],
                      "onUpdate:modelValue": (O) => F.value[a.id] = O,
                      options: T(s.value[a.id] || B()),
                      optionLabel: "label",
                      optionValue: "id",
                      fluid: ""
                    }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue", "options"]),
                    r("div", pe, [
                      f($, {
                        label: "Dismiss",
                        size: "small",
                        severity: "secondary",
                        disabled: !!y.value,
                        onClick: (O) => ee(a)
                      }, null, 8, ["disabled", "onClick"]),
                      f($, {
                        label: "Add to schedule",
                        size: "small",
                        loading: y.value === a.id,
                        disabled: !!y.value || !d.value,
                        onClick: (O) => K(a)
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
        ])) : k("v-if", !0)
      ]);
    };
  }
}), Q = (_, h) => {
  const v = _.__vccOpts || _;
  for (const [o, m] of h)
    v[o] = m;
  return v;
}, me = /* @__PURE__ */ Q(ve, [["__scopeId", "data-v-920c2f56"]]), fe = {
  key: 0,
  class: "plugin-inline-settings"
}, ge = { class: "settings-grid" }, ye = { class: "settings-actions" }, _e = /* @__PURE__ */ Y({
  inheritAttrs: !1,
  __name: "MealPlannerPluginSettings",
  props: {
    context: {}
  },
  setup(_) {
    const h = J(), v = i(!1), o = i(!1), m = i(""), d = i(["default"]), g = i({
      generate_model_key: "default"
    });
    function S(t) {
      const n = d.value.length ? d.value : ["default"], s = n.map((c) => ({ value: c, label: c }));
      return t && !n.includes(t) && s.unshift({ value: t, label: `${t} (missing — uses default)` }), s;
    }
    async function I() {
      m.value = "";
      try {
        const [t, n] = await Promise.all([
          h.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          h.api.get("/api/plugins/core-meal-planner-ai/config")
        ]), s = t != null && t.models && typeof t.models == "object" ? Object.keys(t.models) : ["default"];
        d.value = s.length ? s : ["default"], g.value = {
          generate_model_key: (n == null ? void 0 : n.generate_model_key) || "default"
        };
      } catch (t) {
        m.value = (t == null ? void 0 : t.message) || "Failed to load meal planner settings";
      }
    }
    z(v, (t) => {
      t && I();
    });
    async function y() {
      if (!o.value) {
        o.value = !0, m.value = "";
        try {
          const t = await h.api.put("/api/plugins/core-meal-planner-ai/config", { ...g.value });
          g.value = {
            generate_model_key: (t == null ? void 0 : t.generate_model_key) || g.value.generate_model_key
          }, h.notify({ level: "success", message: "Meal planner settings updated." });
        } catch (t) {
          m.value = (t == null ? void 0 : t.message) || "Failed to save meal planner settings";
        } finally {
          o.value = !1;
        }
      }
    }
    return (t, n) => {
      var T, N, w, C, P, M;
      const s = b("Button"), c = b("Message"), F = b("Select");
      return ((N = (T = _.context) == null ? void 0 : T.plugin) == null ? void 0 : N.id) === "core-meal-planner-ai" ? (u(), x(
        H,
        { key: 0 },
        [
          f(s, {
            label: v.value ? "Close Settings" : "Settings",
            icon: v.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !v.value,
            disabled: ((C = (w = _.context) == null ? void 0 : w.plugin) == null ? void 0 : C.state) !== "active",
            class: "btn-planner-settings-toggle",
            onClick: n[0] || (n[0] = (U) => v.value = !v.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          v.value && ((M = (P = _.context) == null ? void 0 : P.plugin) == null ? void 0 : M.state) === "active" ? (u(), x("div", fe, [
            m.value ? (u(), D(c, {
              key: 0,
              severity: "error"
            }, {
              default: E(() => [
                A(
                  L(m.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : k("v-if", !0),
            r("div", ge, [
              r("div", null, [
                n[2] || (n[2] = r(
                  "label",
                  { for: "planner-generate-model-key" },
                  "Meal plan generation model key",
                  -1
                  /* CACHED */
                )),
                f(F, {
                  inputId: "planner-generate-model-key",
                  "aria-label": "Meal plan generation model key",
                  modelValue: g.value.generate_model_key,
                  "onUpdate:modelValue": n[1] || (n[1] = (U) => g.value.generate_model_key = U),
                  options: S(g.value.generate_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ])
            ]),
            r("div", ye, [
              f(s, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: o.value,
                onClick: y
              }, null, 8, ["loading"])
            ])
          ])) : k("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : k("v-if", !0);
    };
  }
}), be = /* @__PURE__ */ Q(_e, [["__scopeId", "data-v-87aeed6a"]]);
function Se(_) {
  _.slot("timeline.sidebar", me, { order: 10 }), _.slot("plugin_manager.plugin.actions", be, { order: 10 });
}
export {
  be as MealPlannerPluginSettings,
  me as MealPlannerWidget,
  Se as default
};
