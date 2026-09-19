import { defineComponent as V, inject as I, ref as x, onMounted as B, openBlock as r, createElementBlock as a, createElementVNode as e, toDisplayString as l, createCommentVNode as i, withDirectives as u, vModelSelect as C, vModelText as m, vModelCheckbox as F, Fragment as M, renderList as j } from "vue";
const O = { class: "ai-settings p-4 space-y-6" }, N = { class: "header flex items-center justify-between" }, T = ["disabled"], D = { class: "settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4" }, E = { class: "grid grid-cols-1 md:grid-cols-2 gap-4" }, K = { class: "space-y-3 pt-2" }, L = { key: 0 }, $ = { key: 1 }, G = { key: 2 }, R = { class: "settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4" }, z = { class: "flex items-center gap-3" }, Y = { class: "w-48" }, q = { class: "settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4" }, H = { class: "grid grid-cols-2 md:grid-cols-4 gap-4" }, J = { class: "stat-box p-3 bg-stone-50 rounded border border-stone-200" }, Q = { class: "text-lg font-bold text-stone-900 month-spend-val" }, W = { class: "stat-box p-3 bg-stone-50 rounded border border-stone-200" }, X = { class: "text-lg font-bold text-stone-900" }, Z = { class: "stat-box p-3 bg-stone-50 rounded border border-stone-200" }, ee = { class: "text-lg font-bold text-stone-900" }, te = { class: "stat-box p-3 bg-stone-50 rounded border border-stone-200" }, oe = { class: "text-lg font-bold text-stone-900" }, se = {
  key: 0,
  class: "mt-4"
}, ne = { class: "space-y-1" }, le = { class: "font-mono text-stone-700" }, ie = { class: "font-medium text-stone-900" }, de = /* @__PURE__ */ V({
  __name: "AiSettings",
  props: {
    ss: {},
    context: {}
  },
  setup(c) {
    var _, y;
    const b = c, p = ((_ = b.ss) == null ? void 0 : _.api) || I("__SS_API__", null), g = ((y = b.ss) == null ? void 0 : y.notify) || I("__SS_NOTIFY__", null), o = x({
      provider: "gemini",
      model: "gemini-3.8-flash",
      gemini_api_key: "",
      openai_api_key: "",
      openrouter_api_key: "",
      enforce_budget: !1,
      monthly_budget: 10
    }), d = x({
      total_cost_usd: 0,
      month_cost_usd: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      breakdown_by_plugin: []
    }), v = x(!1);
    async function P() {
      if (p)
        try {
          const s = await p.get("/api/x/core-ai-provider/settings");
          s && (o.value = {
            provider: s.provider || "gemini",
            model: s.model || "gemini-3.8-flash",
            gemini_api_key: s.gemini_api_key || "",
            openai_api_key: s.openai_api_key || "",
            openrouter_api_key: s.openrouter_api_key || "",
            enforce_budget: !!s.enforce_budget,
            monthly_budget: Number(s.monthly_budget ?? 10)
          });
        } catch (s) {
          console.error("Failed to load AI settings", s);
        }
    }
    async function f() {
      if (p)
        try {
          const s = await p.get("/api/x/core-ai-provider/usage");
          s && (d.value = s);
        } catch (s) {
          console.error("Failed to load AI usage", s);
        }
    }
    async function U() {
      if (p) {
        v.value = !0;
        try {
          const s = await p.put("/api/x/core-ai-provider/settings", o.value);
          s && (o.value = { ...o.value, ...s }), g && g({ level: "success", message: "AI settings updated successfully." });
        } catch {
          g && g({ level: "error", message: "Failed to update AI settings." });
        } finally {
          v.value = !1;
        }
      }
    }
    return B(() => {
      P(), f();
    }), (s, t) => {
      var k, h, w, S, A;
      return r(), a("div", O, [
        e("div", N, [
          t[7] || (t[7] = e(
            "h3",
            { class: "text-lg font-semibold text-stone-900" },
            "AI Provider & Budget Settings",
            -1
            /* CACHED */
          )),
          e("button", {
            class: "save-btn px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition",
            disabled: v.value,
            onClick: U
          }, l(v.value ? "Saving..." : "Save Settings"), 9, T)
        ]),
        i(" Provider Configuration "),
        e("div", D, [
          t[14] || (t[14] = e(
            "h4",
            { class: "font-medium text-stone-800" },
            "Active Provider",
            -1
            /* CACHED */
          )),
          e("div", E, [
            e("div", null, [
              t[9] || (t[9] = e(
                "label",
                { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
                "Provider Engine",
                -1
                /* CACHED */
              )),
              u(e(
                "select",
                {
                  "onUpdate:modelValue": t[0] || (t[0] = (n) => o.value.provider = n),
                  class: "provider-select w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
                },
                [...t[8] || (t[8] = [
                  e(
                    "option",
                    { value: "gemini" },
                    "Google Gemini",
                    -1
                    /* CACHED */
                  ),
                  e(
                    "option",
                    { value: "openai" },
                    "OpenAI",
                    -1
                    /* CACHED */
                  ),
                  e(
                    "option",
                    { value: "openrouter" },
                    "OpenRouter",
                    -1
                    /* CACHED */
                  )
                ])],
                512
                /* NEED_PATCH */
              ), [
                [C, o.value.provider]
              ])
            ]),
            e("div", null, [
              t[10] || (t[10] = e(
                "label",
                { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
                "Model Name",
                -1
                /* CACHED */
              )),
              u(e(
                "input",
                {
                  "onUpdate:modelValue": t[1] || (t[1] = (n) => o.value.model = n),
                  type: "text",
                  placeholder: "e.g. gemini-3.8-flash",
                  class: "model-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [m, o.value.model]
              ])
            ])
          ]),
          i(" API Keys "),
          e("div", K, [
            o.value.provider === "gemini" ? (r(), a("div", L, [
              t[11] || (t[11] = e(
                "label",
                { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
                "Gemini API Key",
                -1
                /* CACHED */
              )),
              u(e(
                "input",
                {
                  "onUpdate:modelValue": t[2] || (t[2] = (n) => o.value.gemini_api_key = n),
                  type: "password",
                  placeholder: "AIzaSy...",
                  class: "gemini-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [m, o.value.gemini_api_key]
              ])
            ])) : i("v-if", !0),
            o.value.provider === "openai" ? (r(), a("div", $, [
              t[12] || (t[12] = e(
                "label",
                { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
                "OpenAI API Key",
                -1
                /* CACHED */
              )),
              u(e(
                "input",
                {
                  "onUpdate:modelValue": t[3] || (t[3] = (n) => o.value.openai_api_key = n),
                  type: "password",
                  placeholder: "sk-proj-...",
                  class: "openai-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [m, o.value.openai_api_key]
              ])
            ])) : i("v-if", !0),
            o.value.provider === "openrouter" ? (r(), a("div", G, [
              t[13] || (t[13] = e(
                "label",
                { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
                "OpenRouter API Key",
                -1
                /* CACHED */
              )),
              u(e(
                "input",
                {
                  "onUpdate:modelValue": t[4] || (t[4] = (n) => o.value.openrouter_api_key = n),
                  type: "password",
                  placeholder: "sk-or-v1-...",
                  class: "openrouter-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [m, o.value.openrouter_api_key]
              ])
            ])) : i("v-if", !0)
          ])
        ]),
        i(" Budget Controls "),
        e("div", R, [
          t[17] || (t[17] = e(
            "h4",
            { class: "font-medium text-stone-800" },
            "Monthly Budget & Safeguards",
            -1
            /* CACHED */
          )),
          e("div", z, [
            u(e(
              "input",
              {
                id: "enforce_budget_checkbox",
                "onUpdate:modelValue": t[5] || (t[5] = (n) => o.value.enforce_budget = n),
                type: "checkbox",
                class: "budget-checkbox rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [F, o.value.enforce_budget]
            ]),
            t[15] || (t[15] = e(
              "label",
              {
                for: "enforce_budget_checkbox",
                class: "text-sm font-medium text-stone-700"
              },
              " Enforce monthly budget limit (reject calls when exceeded) ",
              -1
              /* CACHED */
            ))
          ]),
          e("div", Y, [
            t[16] || (t[16] = e(
              "label",
              { class: "block text-xs font-semibold text-stone-600 uppercase mb-1" },
              "Monthly Budget Limit ($)",
              -1
              /* CACHED */
            )),
            u(e(
              "input",
              {
                "onUpdate:modelValue": t[6] || (t[6] = (n) => o.value.monthly_budget = n),
                type: "number",
                step: "0.5",
                min: "0",
                class: "budget-limit-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                m,
                o.value.monthly_budget,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        i(" Usage Dashboard "),
        e("div", q, [
          e("div", { class: "flex items-center justify-between" }, [
            t[18] || (t[18] = e(
              "h4",
              { class: "font-medium text-stone-800" },
              "Usage & Cost Dashboard",
              -1
              /* CACHED */
            )),
            e("button", {
              class: "refresh-btn text-xs text-emerald-600 hover:text-emerald-700 font-medium",
              onClick: f
            }, " Refresh ")
          ]),
          e("div", H, [
            e("div", J, [
              t[19] || (t[19] = e(
                "div",
                { class: "text-xs text-stone-500 font-semibold uppercase" },
                "Month Spend",
                -1
                /* CACHED */
              )),
              e(
                "div",
                Q,
                "$" + l(((k = d.value.month_cost_usd) == null ? void 0 : k.toFixed(4)) || "0.0000"),
                1
                /* TEXT */
              )
            ]),
            e("div", W, [
              t[20] || (t[20] = e(
                "div",
                { class: "text-xs text-stone-500 font-semibold uppercase" },
                "All-Time Spend",
                -1
                /* CACHED */
              )),
              e(
                "div",
                X,
                "$" + l(((h = d.value.total_cost_usd) == null ? void 0 : h.toFixed(4)) || "0.0000"),
                1
                /* TEXT */
              )
            ]),
            e("div", Z, [
              t[21] || (t[21] = e(
                "div",
                { class: "text-xs text-stone-500 font-semibold uppercase" },
                "Input Tokens",
                -1
                /* CACHED */
              )),
              e(
                "div",
                ee,
                l(((w = d.value.total_input_tokens) == null ? void 0 : w.toLocaleString()) || "0"),
                1
                /* TEXT */
              )
            ]),
            e("div", te, [
              t[22] || (t[22] = e(
                "div",
                { class: "text-xs text-stone-500 font-semibold uppercase" },
                "Output Tokens",
                -1
                /* CACHED */
              )),
              e(
                "div",
                oe,
                l(((S = d.value.total_output_tokens) == null ? void 0 : S.toLocaleString()) || "0"),
                1
                /* TEXT */
              )
            ])
          ]),
          (A = d.value.breakdown_by_plugin) != null && A.length ? (r(), a("div", se, [
            t[23] || (t[23] = e(
              "h5",
              { class: "text-xs font-semibold text-stone-600 uppercase mb-2" },
              "Spend by Plugin",
              -1
              /* CACHED */
            )),
            e("div", ne, [
              (r(!0), a(
                M,
                null,
                j(d.value.breakdown_by_plugin, (n) => (r(), a("div", {
                  key: n.calling_plugin,
                  class: "flex items-center justify-between text-xs py-1 px-2 rounded bg-stone-50 border border-stone-100"
                }, [
                  e(
                    "span",
                    le,
                    l(n.calling_plugin),
                    1
                    /* TEXT */
                  ),
                  e(
                    "span",
                    ie,
                    "$" + l(n.cost.toFixed(4)) + " (" + l(n.call_count) + " calls)",
                    1
                    /* TEXT */
                  )
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])) : i("v-if", !0)
        ])
      ]);
    };
  }
});
function ae(c) {
  var b;
  (b = c.settings) != null && b.section && c.settings.section({
    id: "core-ai-provider",
    title: "AI & Budget",
    component: de,
    order: 80
  });
}
export {
  ae as default
};
