import { defineComponent as K, ref as _, computed as q, onMounted as H, resolveComponent as m, openBlock as c, createElementBlock as y, createBlock as J, withCtx as Q, createTextVNode as W, toDisplayString as b, createCommentVNode as T, createElementVNode as l, createVNode as s, Fragment as N, renderList as O } from "vue";
import { useSecretSauce as X } from "@secretsauce/ui";
const Y = { class: "ai-settings" }, Z = { class: "fields" }, ee = { class: "api-key" }, le = { class: "models-section" }, oe = { class: "models-header" }, te = { class: "model-rows" }, ne = { class: "model-row default-row" }, ae = { class: "budget-toggle" }, se = { class: "actions" }, ie = { class: "usage-header" }, de = { class: "stats" }, ue = {
  key: 1,
  class: "usage-list"
}, re = /* @__PURE__ */ K({
  __name: "AiSettings",
  setup(g) {
    const u = X(), p = _(!1), i = _(""), n = _({
      provider: "gemini",
      model: "gemini-3.8-flash",
      models: { default: "gemini-3.8-flash" },
      gemini_api_key: "",
      openai_api_key: "",
      openrouter_api_key: "",
      enforce_budget: !1,
      monthly_budget: 10
    }), V = _("gemini-3.8-flash"), k = _([]);
    let h = 1;
    const R = [
      { id: "gemini", label: "Google Gemini" },
      { id: "openai", label: "OpenAI" },
      { id: "openrouter", label: "OpenRouter" }
    ], w = q(() => `${n.value.provider}_api_key`), v = _({
      total_cost_usd: 0,
      month_cost_usd: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      breakdown_by_plugin: []
    });
    function $(o) {
      const e = o != null && o.models && typeof o.models == "object" ? o.models : { default: (o == null ? void 0 : o.model) || "gemini-3.8-flash" };
      V.value = e.default || (o == null ? void 0 : o.model) || "gemini-3.8-flash", k.value = Object.entries(e).filter(([a]) => a !== "default").map(([a, d]) => ({ id: h++, key: a, value: String(d) }));
    }
    function B() {
      k.value.push({ id: h++, key: "", value: "" });
    }
    function D(o) {
      k.value.splice(o, 1);
    }
    async function L() {
      try {
        const o = await u.api.get("/api/x/core-ai-provider/settings");
        Object.assign(n.value, o), $(o);
      } catch (o) {
        i.value = (o == null ? void 0 : o.message) || "Failed to load AI settings";
      }
    }
    async function M() {
      try {
        v.value = await u.api.get("/api/x/core-ai-provider/usage");
      } catch (o) {
        i.value = (o == null ? void 0 : o.message) || "Failed to load AI usage";
      }
    }
    async function j() {
      if (p.value) return;
      i.value = "";
      const o = V.value.trim();
      if (!o) {
        i.value = "The default fallback model name must not be empty";
        return;
      }
      const e = { default: o };
      for (const a of k.value) {
        const d = a.key.trim(), r = a.value.trim();
        if (!d || !r) {
          i.value = "All model keys and model names must be non-empty";
          return;
        }
        if (d in e) {
          i.value = `Duplicate model key: ${d}`;
          return;
        }
        e[d] = r;
      }
      p.value = !0;
      try {
        const a = { ...n.value, model: e.default, models: e }, d = await u.api.put("/api/x/core-ai-provider/settings", a);
        Object.assign(n.value, d), $(d), u.notify({ level: "success", message: "AI settings updated successfully." });
      } catch (a) {
        i.value = (a == null ? void 0 : a.message) || "Failed to update AI settings";
      } finally {
        p.value = !1;
      }
    }
    return H(() => {
      L(), M();
    }), (o, e) => {
      var x, A, U, F, C;
      const a = m("Message"), d = m("Select"), r = m("InputText"), S = m("Button"), P = m("ToggleSwitch"), E = m("InputNumber"), G = m("Divider"), z = m("Tag");
      return c(), y("div", Y, [
        i.value ? (c(), J(a, {
          key: 0,
          severity: "error"
        }, {
          default: Q(() => [
            W(
              b(i.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : T("v-if", !0),
        l("div", Z, [
          l("div", null, [
            e[5] || (e[5] = l(
              "label",
              { for: "ai-provider" },
              "Provider engine",
              -1
              /* CACHED */
            )),
            s(d, {
              inputId: "ai-provider",
              "aria-label": "Provider engine",
              modelValue: n.value.provider,
              "onUpdate:modelValue": e[0] || (e[0] = (t) => n.value.provider = t),
              options: R,
              optionLabel: "label",
              optionValue: "id",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", ee, [
            e[6] || (e[6] = l(
              "label",
              { for: "ai-key" },
              "API key",
              -1
              /* CACHED */
            )),
            s(r, {
              id: "ai-key",
              modelValue: n.value[w.value],
              "onUpdate:modelValue": e[1] || (e[1] = (t) => n.value[w.value] = t),
              type: "password",
              autocomplete: "new-password",
              fluid: ""
            }, null, 8, ["modelValue"]),
            e[7] || (e[7] = l(
              "small",
              null,
              "Stored keys are masked. Leave the mask unchanged to keep the saved key.",
              -1
              /* CACHED */
            ))
          ]),
          l("div", le, [
            l("div", oe, [
              e[8] || (e[8] = l(
                "span",
                { class: "models-title" },
                "Model definitions (key / provider model)",
                -1
                /* CACHED */
              )),
              s(S, {
                label: "Add model",
                icon: "pi pi-plus",
                size: "small",
                outlined: "",
                class: "btn-add-model",
                onClick: B
              })
            ]),
            l("div", te, [
              l("div", ne, [
                s(r, {
                  id: "ai-model-key-default",
                  modelValue: "default",
                  "aria-label": "Fallback model key",
                  disabled: "",
                  readonly: "",
                  fluid: ""
                }),
                s(r, {
                  id: "ai-model",
                  "aria-label": "Model name",
                  modelValue: V.value,
                  "onUpdate:modelValue": e[2] || (e[2] = (t) => V.value = t),
                  class: "model-input",
                  fluid: ""
                }, null, 8, ["modelValue"]),
                e[9] || (e[9] = l(
                  "span",
                  {
                    class: "row-spacer",
                    "aria-hidden": "true"
                  },
                  null,
                  -1
                  /* CACHED */
                ))
              ]),
              (c(!0), y(
                N,
                null,
                O(k.value, (t, f) => (c(), y("div", {
                  key: t.id,
                  class: "model-row"
                }, [
                  s(r, {
                    id: `ai-model-key-${f}`,
                    "aria-label": `Model key ${f + 1}`,
                    modelValue: t.key,
                    "onUpdate:modelValue": (I) => t.key = I,
                    class: "model-key-input",
                    placeholder: "Key (e.g. fast)",
                    fluid: ""
                  }, null, 8, ["id", "aria-label", "modelValue", "onUpdate:modelValue"]),
                  s(r, {
                    id: `ai-model-value-${f}`,
                    "aria-label": `Model name ${f + 1}`,
                    modelValue: t.value,
                    "onUpdate:modelValue": (I) => t.value = I,
                    class: "model-value-input",
                    placeholder: "Provider model name",
                    fluid: ""
                  }, null, 8, ["id", "aria-label", "modelValue", "onUpdate:modelValue"]),
                  s(S, {
                    icon: "pi pi-trash",
                    severity: "danger",
                    text: "",
                    rounded: "",
                    "aria-label": `Remove model ${t.key || f + 1}`,
                    class: "btn-remove-model",
                    onClick: (I) => D(f)
                  }, null, 8, ["aria-label", "onClick"])
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          l("div", ae, [
            s(P, {
              inputId: "enforce-budget",
              modelValue: n.value.enforce_budget,
              "onUpdate:modelValue": e[3] || (e[3] = (t) => n.value.enforce_budget = t)
            }, null, 8, ["modelValue"]),
            e[10] || (e[10] = l(
              "label",
              { for: "enforce-budget" },
              "Enforce monthly budget limit",
              -1
              /* CACHED */
            ))
          ]),
          l("div", null, [
            e[11] || (e[11] = l(
              "label",
              { for: "ai-budget" },
              "Monthly budget limit ($)",
              -1
              /* CACHED */
            )),
            s(E, {
              inputId: "ai-budget",
              modelValue: n.value.monthly_budget,
              "onUpdate:modelValue": e[4] || (e[4] = (t) => n.value.monthly_budget = t),
              min: 0,
              step: 0.5,
              maxFractionDigits: 2,
              fluid: ""
            }, null, 8, ["modelValue"])
          ])
        ]),
        l("div", se, [
          s(S, {
            label: "Save Settings",
            class: "save-btn",
            icon: "pi pi-check",
            loading: p.value,
            onClick: j
          }, null, 8, ["loading"])
        ]),
        s(G),
        l("div", ie, [
          e[12] || (e[12] = l(
            "h4",
            null,
            "Usage & cost",
            -1
            /* CACHED */
          )),
          s(S, {
            label: "Refresh",
            icon: "pi pi-refresh",
            text: "",
            onClick: M
          })
        ]),
        l("div", de, [
          l("div", null, [
            e[13] || (e[13] = l(
              "span",
              null,
              "Month spend",
              -1
              /* CACHED */
            )),
            l(
              "strong",
              null,
              "$" + b(((x = v.value.month_cost_usd) == null ? void 0 : x.toFixed(4)) || "0.0000"),
              1
              /* TEXT */
            )
          ]),
          l("div", null, [
            e[14] || (e[14] = l(
              "span",
              null,
              "All-time spend",
              -1
              /* CACHED */
            )),
            l(
              "strong",
              null,
              "$" + b(((A = v.value.total_cost_usd) == null ? void 0 : A.toFixed(4)) || "0.0000"),
              1
              /* TEXT */
            )
          ]),
          l("div", null, [
            e[15] || (e[15] = l(
              "span",
              null,
              "Input tokens",
              -1
              /* CACHED */
            )),
            l(
              "strong",
              null,
              b(((U = v.value.total_input_tokens) == null ? void 0 : U.toLocaleString()) || "0"),
              1
              /* TEXT */
            )
          ]),
          l("div", null, [
            e[16] || (e[16] = l(
              "span",
              null,
              "Output tokens",
              -1
              /* CACHED */
            )),
            l(
              "strong",
              null,
              b(((F = v.value.total_output_tokens) == null ? void 0 : F.toLocaleString()) || "0"),
              1
              /* TEXT */
            )
          ])
        ]),
        (C = v.value.breakdown_by_plugin) != null && C.length ? (c(), y("ul", ue, [
          (c(!0), y(
            N,
            null,
            O(v.value.breakdown_by_plugin, (t) => (c(), y("li", {
              key: t.calling_plugin
            }, [
              l(
                "span",
                null,
                b(t.calling_plugin),
                1
                /* TEXT */
              ),
              s(z, {
                value: `$${t.cost.toFixed(4)} (${t.call_count} calls)`,
                severity: "secondary"
              }, null, 8, ["value"])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : T("v-if", !0)
      ]);
    };
  }
}), me = (g, u) => {
  const p = g.__vccOpts || g;
  for (const [i, n] of u)
    p[i] = n;
  return p;
}, pe = /* @__PURE__ */ me(re, [["__scopeId", "data-v-56d5ced1"]]);
function ge(g) {
  var u;
  (u = g.settings) != null && u.section && g.settings.section({
    id: "core-ai-provider",
    title: "AI & Budget",
    component: pe,
    order: 80
  });
}
export {
  ge as default
};
