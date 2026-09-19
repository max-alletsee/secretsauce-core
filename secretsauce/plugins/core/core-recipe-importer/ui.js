import { defineComponent as D, inject as E, ref as u, computed as N, openBlock as i, createElementBlock as n, createElementVNode as t, createCommentVNode as s, normalizeClass as C, withDirectives as M, vModelText as P, toDisplayString as c, Fragment as L, renderList as T } from "vue";
const q = {
  key: 0,
  class: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
}, z = { class: "bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" }, G = { class: "flex border-b border-stone-200 bg-stone-50 text-sm" }, H = { class: "p-4 flex-1 overflow-y-auto space-y-4" }, W = {
  key: 0,
  class: "space-y-2"
}, Y = {
  key: 1,
  class: "space-y-2"
}, J = {
  key: 2,
  class: "space-y-2"
}, K = {
  key: 0,
  class: "mt-2 max-h-48 overflow-hidden rounded border border-stone-200"
}, Q = ["src"], X = {
  key: 3,
  class: "pt-2"
}, Z = ["disabled"], ee = {
  key: 4,
  class: "py-8 text-center space-y-2"
}, te = {
  key: 5,
  class: "p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs"
}, se = {
  key: 6,
  class: "extracted-preview space-y-3 pt-2 border-t border-stone-200"
}, oe = { class: "flex items-center justify-between" }, le = { class: "font-bold text-stone-900" }, ae = { class: "text-xs text-stone-500" }, ie = {
  key: 0,
  class: "text-xs text-stone-600 italic"
}, ne = { class: "grid grid-cols-2 gap-3 text-xs" }, re = { class: "font-semibold text-stone-700" }, de = { class: "list-disc pl-4 mt-1 space-y-0.5 text-stone-600" }, ue = { class: "font-semibold text-stone-700" }, ce = { class: "list-decimal pl-4 mt-1 space-y-0.5 text-stone-600" }, pe = { class: "p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50" }, ve = ["disabled"], me = /* @__PURE__ */ D({
  __name: "ImportRecipeModal",
  props: {
    isOpen: { type: Boolean },
    ss: {}
  },
  emits: ["close", "saved"],
  setup(p, { emit: b }) {
    var j, A;
    const v = p, S = b, g = ((j = v.ss) == null ? void 0 : j.api) || E("__SS_API__", null), B = ((A = v.ss) == null ? void 0 : A.notify) || E("__SS_NOTIFY__", null), a = u("url"), y = u(""), _ = u(""), k = u(""), F = u("image/jpeg"), I = u(""), h = u(!1), w = u(!1), x = u(""), o = u(null), U = N(() => a.value === "url" ? !!y.value.trim() : a.value === "text" ? !!_.value.trim() : a.value === "image" ? !!k.value : !1);
    function $(r) {
      var l;
      const d = (l = r.target.files) == null ? void 0 : l[0];
      if (!d) return;
      F.value = d.type || "image/jpeg";
      const f = new FileReader();
      f.onload = () => {
        const m = f.result;
        I.value = m, k.value = m.split(",")[1] || m;
      }, f.readAsDataURL(d);
    }
    async function O() {
      if (!(!g || !U.value)) {
        h.value = !0, x.value = "", o.value = null;
        try {
          let r = "", e = {};
          a.value === "url" ? (r = "/api/x/core-recipe-importer/parse-url", e = { url: y.value.trim(), auto_save: !1 }) : a.value === "text" ? (r = "/api/x/core-recipe-importer/parse-text", e = { text: _.value.trim(), auto_save: !1 }) : a.value === "image" && (r = "/api/x/core-recipe-importer/parse-image", e = { image_base64: k.value, mime_type: F.value, auto_save: !1 });
          const d = await g.post(r, e);
          o.value = d;
        } catch (r) {
          x.value = (r == null ? void 0 : r.message) || "Failed to extract recipe with AI";
        } finally {
          h.value = !1;
        }
      }
    }
    async function V() {
      var r;
      if (!(!g || !o.value)) {
        w.value = !0;
        try {
          const e = await g.post("/api/recipes", o.value), d = (e == null ? void 0 : e.id) || ((r = e == null ? void 0 : e.data) == null ? void 0 : r.id);
          B && B({ level: "success", message: "Recipe imported successfully!" }), S("saved", d), R();
        } catch (e) {
          x.value = (e == null ? void 0 : e.message) || "Failed to save recipe";
        } finally {
          w.value = !1;
        }
      }
    }
    function R() {
      o.value = null, x.value = "", S("close");
    }
    return (r, e) => {
      var d, f;
      return p.isOpen ? (i(), n("div", q, [
        t("div", z, [
          s(" Header "),
          t("div", { class: "flex items-center justify-between p-4 border-b border-stone-200" }, [
            e[5] || (e[5] = t(
              "h3",
              { class: "font-semibold text-stone-900 text-lg" },
              "Import Recipe with AI",
              -1
              /* CACHED */
            )),
            t("button", {
              class: "text-stone-400 hover:text-stone-600 font-bold text-lg",
              onClick: R
            }, "×")
          ]),
          s(" Mode Tabs "),
          t("div", G, [
            t(
              "button",
              {
                class: C(["flex-1 py-2.5 font-medium border-b-2 transition", a.value === "url" ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-stone-600 hover:text-stone-900"]),
                onClick: e[0] || (e[0] = (l) => a.value = "url")
              },
              " 🌐 From URL ",
              2
              /* CLASS */
            ),
            t(
              "button",
              {
                class: C(["flex-1 py-2.5 font-medium border-b-2 transition", a.value === "text" ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-stone-600 hover:text-stone-900"]),
                onClick: e[1] || (e[1] = (l) => a.value = "text")
              },
              " 📝 Raw Text / Paste ",
              2
              /* CLASS */
            ),
            t(
              "button",
              {
                class: C(["flex-1 py-2.5 font-medium border-b-2 transition", a.value === "image" ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-stone-600 hover:text-stone-900"]),
                onClick: e[2] || (e[2] = (l) => a.value = "image")
              },
              " 📷 Photo / OCR ",
              2
              /* CLASS */
            )
          ]),
          s(" Body / Form Area "),
          t("div", H, [
            s(" URL Input "),
            a.value === "url" ? (i(), n("div", W, [
              e[6] || (e[6] = t(
                "label",
                { class: "block text-xs font-semibold uppercase text-stone-600" },
                "Recipe Webpage URL",
                -1
                /* CACHED */
              )),
              M(t(
                "input",
                {
                  "onUpdate:modelValue": e[3] || (e[3] = (l) => y.value = l),
                  type: "url",
                  placeholder: "https://www.seriouseats.com/...",
                  class: "input-url w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [P, y.value]
              ])
            ])) : s("v-if", !0),
            s(" Text Input "),
            a.value === "text" ? (i(), n("div", Y, [
              e[7] || (e[7] = t(
                "label",
                { class: "block text-xs font-semibold uppercase text-stone-600" },
                "Paste Recipe or Ingredients",
                -1
                /* CACHED */
              )),
              M(t(
                "textarea",
                {
                  "onUpdate:modelValue": e[4] || (e[4] = (l) => _.value = l),
                  rows: "6",
                  placeholder: "Grandma's secret sauce: 2 cans crushed tomatoes, 4 cloves garlic, 1 tbsp oregano...",
                  class: "textarea-text w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono text-xs"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [P, _.value]
              ])
            ])) : s("v-if", !0),
            s(" Image Input "),
            a.value === "image" ? (i(), n("div", J, [
              e[8] || (e[8] = t(
                "label",
                { class: "block text-xs font-semibold uppercase text-stone-600" },
                "Upload Recipe Image",
                -1
                /* CACHED */
              )),
              t(
                "input",
                {
                  type: "file",
                  accept: "image/*",
                  class: "file-input block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100",
                  onChange: $
                },
                null,
                32
                /* NEED_HYDRATION */
              ),
              I.value ? (i(), n("div", K, [
                t("img", {
                  src: I.value,
                  class: "object-contain max-h-48 mx-auto"
                }, null, 8, Q)
              ])) : s("v-if", !0)
            ])) : s("v-if", !0),
            s(" Extract Button "),
            !o.value && !h.value ? (i(), n("div", X, [
              t("button", {
                class: "btn-extract w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition",
                disabled: !U.value,
                onClick: O
              }, " Extract Recipe ", 8, Z)
            ])) : s("v-if", !0),
            s(" Loading State "),
            h.value ? (i(), n("div", ee, [...e[9] || (e[9] = [
              t(
                "div",
                { class: "inline-block animate-spin text-2xl" },
                "⏳",
                -1
                /* CACHED */
              ),
              t(
                "div",
                { class: "text-sm font-medium text-stone-700" },
                "Extracting recipe with AI...",
                -1
                /* CACHED */
              ),
              t(
                "div",
                { class: "text-xs text-stone-400" },
                "Parsing ingredients, quantities, and steps",
                -1
                /* CACHED */
              )
            ])])) : s("v-if", !0),
            s(" Error State "),
            x.value ? (i(), n(
              "div",
              te,
              c(x.value),
              1
              /* TEXT */
            )) : s("v-if", !0),
            s(" Preview Extracted Recipe "),
            o.value ? (i(), n("div", se, [
              t("div", oe, [
                t(
                  "h4",
                  le,
                  c(o.value.title),
                  1
                  /* TEXT */
                ),
                t(
                  "span",
                  ae,
                  c(o.value.servings || 4) + " servings",
                  1
                  /* TEXT */
                )
              ]),
              o.value.description ? (i(), n(
                "p",
                ie,
                c(o.value.description),
                1
                /* TEXT */
              )) : s("v-if", !0),
              t("div", ne, [
                t("div", null, [
                  t(
                    "span",
                    re,
                    "Ingredients (" + c(((d = o.value.ingredients) == null ? void 0 : d.length) || 0) + "):",
                    1
                    /* TEXT */
                  ),
                  t("ul", de, [
                    (i(!0), n(
                      L,
                      null,
                      T(o.value.ingredients, (l, m) => (i(), n(
                        "li",
                        { key: m },
                        c(l.raw_text || `${l.quantity || ""} ${l.unit || ""} ${l.name}`.trim()),
                        1
                        /* TEXT */
                      ))),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ]),
                t("div", null, [
                  t(
                    "span",
                    ue,
                    "Steps (" + c(((f = o.value.steps) == null ? void 0 : f.length) || 0) + "):",
                    1
                    /* TEXT */
                  ),
                  t("ol", ce, [
                    (i(!0), n(
                      L,
                      null,
                      T(o.value.steps, (l, m) => (i(), n(
                        "li",
                        { key: m },
                        c(l.instruction),
                        1
                        /* TEXT */
                      ))),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ])
              ])
            ])) : s("v-if", !0)
          ]),
          s(" Footer Actions "),
          t("div", pe, [
            t("button", {
              class: "btn-cancel px-4 py-2 border border-stone-300 rounded text-sm text-stone-700 hover:bg-stone-100",
              onClick: R
            }, " Cancel "),
            o.value ? (i(), n("button", {
              key: 0,
              class: "btn-save px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition",
              disabled: w.value,
              onClick: V
            }, c(w.value ? "Saving..." : "Save to Recipes"), 9, ve)) : s("v-if", !0)
          ])
        ])
      ])) : s("v-if", !0);
    };
  }
});
function fe(p) {
  var b;
  (b = p.intent) != null && b.provider && p.intent.provider({
    hub: "recipe:create",
    id: "ai-import",
    title: "Import with AI (URL, Photo, Text)",
    order: 15,
    execute: (v) => {
      v != null && v.openImportModal && v.openImportModal();
    }
  }), p.slot && p.slot("recipe.list.actions", me, { order: 20 });
}
export {
  me as ImportRecipeModal,
  fe as default
};
