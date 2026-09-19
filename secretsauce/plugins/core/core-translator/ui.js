import { defineComponent as A, computed as D, inject as k, ref as x, openBlock as r, createElementBlock as d, createElementVNode as t, createCommentVNode as u, createTextVNode as C, toDisplayString as b, withDirectives as N, createStaticVNode as V, vModelSelect as E } from "vue";
const F = { class: "translator-widget inline-flex items-center gap-2" }, M = { key: 0 }, P = ["title"], R = {
  key: 1,
  class: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
}, z = { class: "bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3" }, B = { class: "text-xs text-stone-600" }, L = { class: "space-y-1" }, U = ["disabled"], $ = {
  key: 0,
  class: "text-xs text-red-600 bg-red-50 p-2 rounded"
}, G = { class: "flex justify-end gap-2 pt-2 border-t" }, J = ["disabled"], O = ["disabled"], Y = {
  key: 0,
  class: "animate-spin"
}, S = /* @__PURE__ */ A({
  __name: "TranslateAction",
  props: {
    context: {},
    recipe: {},
    ss: {}
  },
  emits: ["translated"],
  setup(s, { emit: p }) {
    var _, y;
    const a = s, I = p, c = D(() => {
      var n;
      return a.recipe || ((n = a.context) == null ? void 0 : n.recipe);
    }), g = ((_ = a.ss) == null ? void 0 : _.api) || k("__SS_API__", null), m = ((y = a.ss) == null ? void 0 : y.notify) || k("__SS_NOTIFY__", null), v = x(!1), l = x("es"), o = x(!1), i = x("");
    function f() {
      v.value = !1, i.value = "";
    }
    async function j() {
      var n;
      if (!(!g || !((n = c.value) != null && n.id))) {
        o.value = !0, i.value = "";
        try {
          const e = await g.post("/api/x/core-translator/translate", {
            recipe_id: c.value.id,
            target_language: l.value
          });
          m && m({ level: "success", message: `Recipe translated to ${l.value.toUpperCase()}!` }), I("translated", e), f();
        } catch (e) {
          i.value = (e == null ? void 0 : e.message) || "Translation failed";
        } finally {
          o.value = !1;
        }
      }
    }
    return (n, e) => {
      var h, w;
      return r(), d("div", F, [
        v.value ? u("v-if", !0) : (r(), d("div", M, [
          t("button", {
            type: "button",
            class: "btn-open-translate text-xs px-2.5 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 shadow-sm transition",
            title: "Translate " + (((h = c.value) == null ? void 0 : h.title) || "recipe"),
            onClick: e[0] || (e[0] = (T) => v.value = !0)
          }, [...e[2] || (e[2] = [
            t(
              "span",
              null,
              "🌐",
              -1
              /* CACHED */
            ),
            t(
              "span",
              { class: "font-medium" },
              "Translate",
              -1
              /* CACHED */
            )
          ])], 8, P)
        ])),
        u(" Modal Dialog "),
        v.value ? (r(), d("div", R, [
          t("div", z, [
            t("div", { class: "flex items-center justify-between border-b pb-2" }, [
              e[3] || (e[3] = t(
                "h4",
                { class: "font-semibold text-stone-900 text-sm" },
                "Translate Recipe",
                -1
                /* CACHED */
              )),
              t("button", {
                class: "text-stone-400 hover:text-stone-600 font-bold",
                onClick: f
              }, "✕")
            ]),
            t("p", B, [
              e[4] || (e[4] = C(
                " Translate ",
                -1
                /* CACHED */
              )),
              t(
                "strong",
                null,
                b((w = c.value) == null ? void 0 : w.title),
                1
                /* TEXT */
              ),
              e[5] || (e[5] = C(
                " to another language using AI. ",
                -1
                /* CACHED */
              ))
            ]),
            t("div", L, [
              e[7] || (e[7] = t(
                "label",
                { class: "block text-xs font-medium text-stone-700" },
                "Target Language",
                -1
                /* CACHED */
              )),
              N(t("select", {
                "onUpdate:modelValue": e[1] || (e[1] = (T) => l.value = T),
                class: "select-target-lang w-full border border-stone-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500",
                disabled: o.value
              }, [...e[6] || (e[6] = [
                V('<option value="es">Spanish (Español)</option><option value="fr">French (Français)</option><option value="de">German (Deutsch)</option><option value="it">Italian (Italiano)</option><option value="pt">Portuguese (Português)</option><option value="ja">Japanese (日本語)</option><option value="zh">Chinese (中文)</option><option value="en">English</option>', 8)
              ])], 8, U), [
                [E, l.value]
              ])
            ]),
            i.value ? (r(), d(
              "div",
              $,
              b(i.value),
              1
              /* TEXT */
            )) : u("v-if", !0),
            t("div", G, [
              t("button", {
                type: "button",
                class: "px-3 py-1.5 text-xs border border-stone-300 rounded text-stone-600 hover:bg-stone-50",
                disabled: o.value,
                onClick: f
              }, " Cancel ", 8, J),
              t("button", {
                type: "button",
                class: "btn-do-translate px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition flex items-center gap-1",
                disabled: o.value || !l.value,
                onClick: j
              }, [
                o.value ? (r(), d("span", Y, "⏳")) : u("v-if", !0),
                t(
                  "span",
                  null,
                  b(o.value ? "Translating..." : "Translate"),
                  1
                  /* TEXT */
                )
              ], 8, O)
            ])
          ])
        ])) : u("v-if", !0)
      ]);
    };
  }
});
function H(s) {
  var p;
  s.slot && (s.slot("recipe.card.actions", S, { order: 30 }), s.slot("recipe.detail.sidebar", S, { order: 30 })), (p = s.intent) != null && p.provider && s.intent.provider({
    hub: "recipe:actions",
    id: "ai-translate",
    title: "Translate Recipe (AI)",
    order: 30,
    execute: (a) => {
    }
  });
}
export {
  S as TranslateAction,
  H as default
};
