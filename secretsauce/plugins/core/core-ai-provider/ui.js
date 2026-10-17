import { defineComponent as O, ref as m, computed as L, onMounted as D, resolveComponent as u, openBlock as v, createElementBlock as c, createBlock as E, withCtx as P, createTextVNode as j, toDisplayString as g, createCommentVNode as A, createElementVNode as t, createVNode as i, Fragment as G, renderList as R } from "vue";
import { useSecretSauce as h } from "@secretsauce/ui";
const q = { class: "ai-settings" }, z = { class: "fields" }, H = { class: "api-key" }, J = { class: "budget-toggle" }, K = { class: "actions" }, Q = { class: "usage-header" }, W = { class: "stats" }, X = {
  key: 1,
  class: "usage-list"
}, Y = /* @__PURE__ */ O({
  __name: "AiSettings",
  setup(p) {
    const a = h(), d = m(!1), s = m(""), l = m({ provider: "gemini", model: "gemini-3.8-flash", gemini_api_key: "", openai_api_key: "", openrouter_api_key: "", enforce_budget: !1, monthly_budget: 10 }), w = [{ id: "gemini", label: "Google Gemini" }, { id: "openai", label: "OpenAI" }, { id: "openrouter", label: "OpenRouter" }], _ = L(() => `${l.value.provider}_api_key`), r = m({ total_cost_usd: 0, month_cost_usd: 0, total_input_tokens: 0, total_output_tokens: 0, breakdown_by_plugin: [] });
    async function F() {
      try {
        Object.assign(l.value, await a.api.get("/api/x/core-ai-provider/settings"));
      } catch (n) {
        s.value = (n == null ? void 0 : n.message) || "Failed to load AI settings";
      }
    }
    async function f() {
      try {
        r.value = await a.api.get("/api/x/core-ai-provider/usage");
      } catch (n) {
        s.value = (n == null ? void 0 : n.message) || "Failed to load AI usage";
      }
    }
    async function N() {
      if (!d.value) {
        d.value = !0, s.value = "";
        try {
          Object.assign(l.value, await a.api.put("/api/x/core-ai-provider/settings", l.value)), a.notify({ level: "success", message: "AI settings updated successfully." });
        } catch (n) {
          s.value = (n == null ? void 0 : n.message) || "Failed to update AI settings";
        } finally {
          d.value = !1;
        }
      }
    }
    return D(() => {
      F(), f();
    }), (n, e) => {
      var k, V, I, S, x;
      const T = u("Message"), U = u("Select"), b = u("InputText"), $ = u("ToggleSwitch"), B = u("InputNumber"), y = u("Button"), C = u("Divider"), M = u("Tag");
      return v(), c("div", q, [
        s.value ? (v(), E(T, {
          key: 0,
          severity: "error"
        }, {
          default: P(() => [
            j(
              g(s.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        t("div", z, [
          t("div", null, [
            e[5] || (e[5] = t(
              "label",
              { for: "ai-provider" },
              "Provider engine",
              -1
              /* CACHED */
            )),
            i(U, {
              inputId: "ai-provider",
              "aria-label": "Provider engine",
              modelValue: l.value.provider,
              "onUpdate:modelValue": e[0] || (e[0] = (o) => l.value.provider = o),
              options: w,
              optionLabel: "label",
              optionValue: "id",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", null, [
            e[6] || (e[6] = t(
              "label",
              { for: "ai-model" },
              "Model name",
              -1
              /* CACHED */
            )),
            i(b, {
              id: "ai-model",
              modelValue: l.value.model,
              "onUpdate:modelValue": e[1] || (e[1] = (o) => l.value.model = o),
              class: "model-input",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", H, [
            e[7] || (e[7] = t(
              "label",
              { for: "ai-key" },
              "API key",
              -1
              /* CACHED */
            )),
            i(b, {
              id: "ai-key",
              modelValue: l.value[_.value],
              "onUpdate:modelValue": e[2] || (e[2] = (o) => l.value[_.value] = o),
              type: "password",
              autocomplete: "new-password",
              fluid: ""
            }, null, 8, ["modelValue"]),
            e[8] || (e[8] = t(
              "small",
              null,
              "Stored keys are masked. Leave the mask unchanged to keep the saved key.",
              -1
              /* CACHED */
            ))
          ]),
          t("div", J, [
            i($, {
              inputId: "enforce-budget",
              modelValue: l.value.enforce_budget,
              "onUpdate:modelValue": e[3] || (e[3] = (o) => l.value.enforce_budget = o)
            }, null, 8, ["modelValue"]),
            e[9] || (e[9] = t(
              "label",
              { for: "enforce-budget" },
              "Enforce monthly budget limit",
              -1
              /* CACHED */
            ))
          ]),
          t("div", null, [
            e[10] || (e[10] = t(
              "label",
              { for: "ai-budget" },
              "Monthly budget limit ($)",
              -1
              /* CACHED */
            )),
            i(B, {
              inputId: "ai-budget",
              modelValue: l.value.monthly_budget,
              "onUpdate:modelValue": e[4] || (e[4] = (o) => l.value.monthly_budget = o),
              min: 0,
              step: 0.5,
              maxFractionDigits: 2,
              fluid: ""
            }, null, 8, ["modelValue"])
          ])
        ]),
        t("div", K, [
          i(y, {
            label: "Save Settings",
            class: "save-btn",
            icon: "pi pi-check",
            loading: d.value,
            onClick: N
          }, null, 8, ["loading"])
        ]),
        i(C),
        t("div", Q, [
          e[11] || (e[11] = t(
            "h4",
            null,
            "Usage & cost",
            -1
            /* CACHED */
          )),
          i(y, {
            label: "Refresh",
            icon: "pi pi-refresh",
            text: "",
            onClick: f
          })
        ]),
        t("div", W, [
          t("div", null, [
            e[12] || (e[12] = t(
              "span",
              null,
              "Month spend",
              -1
              /* CACHED */
            )),
            t(
              "strong",
              null,
              "$" + g(((k = r.value.month_cost_usd) == null ? void 0 : k.toFixed(4)) || "0.0000"),
              1
              /* TEXT */
            )
          ]),
          t("div", null, [
            e[13] || (e[13] = t(
              "span",
              null,
              "All-time spend",
              -1
              /* CACHED */
            )),
            t(
              "strong",
              null,
              "$" + g(((V = r.value.total_cost_usd) == null ? void 0 : V.toFixed(4)) || "0.0000"),
              1
              /* TEXT */
            )
          ]),
          t("div", null, [
            e[14] || (e[14] = t(
              "span",
              null,
              "Input tokens",
              -1
              /* CACHED */
            )),
            t(
              "strong",
              null,
              g(((I = r.value.total_input_tokens) == null ? void 0 : I.toLocaleString()) || "0"),
              1
              /* TEXT */
            )
          ]),
          t("div", null, [
            e[15] || (e[15] = t(
              "span",
              null,
              "Output tokens",
              -1
              /* CACHED */
            )),
            t(
              "strong",
              null,
              g(((S = r.value.total_output_tokens) == null ? void 0 : S.toLocaleString()) || "0"),
              1
              /* TEXT */
            )
          ])
        ]),
        (x = r.value.breakdown_by_plugin) != null && x.length ? (v(), c("ul", X, [
          (v(!0), c(
            G,
            null,
            R(r.value.breakdown_by_plugin, (o) => (v(), c("li", {
              key: o.calling_plugin
            }, [
              t(
                "span",
                null,
                g(o.calling_plugin),
                1
                /* TEXT */
              ),
              i(M, {
                value: `$${o.cost.toFixed(4)} (${o.call_count} calls)`,
                severity: "secondary"
              }, null, 8, ["value"])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : A("v-if", !0)
      ]);
    };
  }
}), Z = (p, a) => {
  const d = p.__vccOpts || p;
  for (const [s, l] of a)
    d[s] = l;
  return d;
}, ee = /* @__PURE__ */ Z(Y, [["__scopeId", "data-v-984332b5"]]);
function oe(p) {
  var a;
  (a = p.settings) != null && a.section && p.settings.section({
    id: "core-ai-provider",
    title: "AI & Budget",
    component: ee,
    order: 80
  });
}
export {
  oe as default
};
