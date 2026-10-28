import { defineComponent as D, ref as m, resolveComponent as _, openBlock as S, createElementBlock as I, createElementVNode as u, toDisplayString as $, createVNode as g, createBlock as A, withCtx as F, createTextVNode as M, createCommentVNode as w, watch as U, Fragment as j } from "vue";
import { useSecretSauce as N } from "@secretsauce/ui";
const z = { class: "translate-dialog" }, E = { class: "dialog-actions" }, L = /* @__PURE__ */ D({
  inheritAttrs: !1,
  __name: "TranslateDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(s, { emit: i }) {
    var v, V, h;
    const t = s, d = i, n = N(), p = (v = n.store.currentMember.value) == null ? void 0 : v.preferred_language, a = m(p && p !== t.context.recipe.language ? p : ((h = (V = n.store.household.value) == null ? void 0 : V.languages.translations) == null ? void 0 : h[0]) || "de"), C = [{ id: "en", label: "English" }, { id: "de", label: "German" }, { id: "es", label: "Spanish" }, { id: "fr", label: "French" }, { id: "it", label: "Italian" }, { id: "pt", label: "Portuguese" }, { id: "nl", label: "Dutch" }, { id: "ja", label: "Japanese" }, { id: "zh", label: "Chinese" }], b = m(!1), f = m(""), e = m(!1);
    async function l() {
      b.value = !0, f.value = "", e.value = !1;
      try {
        const o = await n.api.post("/api/x/core-translator/translate", { recipe_id: t.context.recipe.id, target_language: a.value });
        n.notify({ level: "success", message: "Recipe translated" }), d("resolve", o), n.navigate(`/recipes/${o.id}`);
      } catch (o) {
        e.value = (o == null ? void 0 : o.code) === "unavailable", f.value = (o == null ? void 0 : o.message) || "Translation failed";
      } finally {
        b.value = !1;
      }
    }
    function c() {
      d("cancel"), n.navigate("/settings?section=core-ai-provider");
    }
    return (o, r) => {
      const B = _("Select"), y = _("Button"), x = _("Message");
      return S(), I("div", z, [
        u(
          "p",
          null,
          $(s.context.recipe.title),
          1
          /* TEXT */
        ),
        r[3] || (r[3] = u(
          "label",
          { for: "target-language" },
          "Target language",
          -1
          /* CACHED */
        )),
        g(B, {
          "aria-label": "Target language",
          inputId: "target-language",
          modelValue: a.value,
          "onUpdate:modelValue": r[0] || (r[0] = (T) => a.value = T),
          options: C,
          optionLabel: "label",
          optionValue: "id",
          fluid: ""
        }, null, 8, ["modelValue"]),
        e.value ? (S(), A(x, {
          key: 0,
          severity: "warn"
        }, {
          default: F(() => [
            r[2] || (r[2] = M(
              "AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            g(y, {
              label: "Open AI settings",
              severity: "secondary",
              onClick: c
            })
          ]),
          _: 1
          /* STABLE */
        })) : f.value ? (S(), A(x, {
          key: 1,
          severity: "error"
        }, {
          default: F(() => [
            M(
              $(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : w("v-if", !0),
        u("div", E, [
          g(y, {
            label: "Cancel",
            severity: "secondary",
            disabled: b.value,
            onClick: r[1] || (r[1] = (T) => d("cancel"))
          }, null, 8, ["disabled"]),
          g(y, {
            label: "Translate recipe",
            icon: "pi pi-language",
            loading: b.value,
            disabled: !a.value,
            onClick: l
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), P = (s, i) => {
  const t = s.__vccOpts || s;
  for (const [d, n] of i)
    t[d] = n;
  return t;
}, O = /* @__PURE__ */ P(L, [["__scopeId", "data-v-c3854657"]]), G = {
  key: 0,
  class: "plugin-inline-settings"
}, J = { class: "settings-grid" }, R = { class: "toggle-row" }, q = { class: "settings-actions" }, H = /* @__PURE__ */ D({
  inheritAttrs: !1,
  __name: "TranslatorPluginSettings",
  props: {
    context: {}
  },
  setup(s) {
    const i = N(), t = m(!1), d = m(!1), n = m(""), p = m(["default"]), a = m({
      auto_translate_members: !1,
      translate_model_key: "default",
      translate_all_model_key: "default"
    });
    function C(e) {
      const l = p.value.length ? p.value : ["default"], c = l.map((v) => ({ value: v, label: v }));
      return e && !l.includes(e) && c.unshift({ value: e, label: `${e} (missing — uses default)` }), c;
    }
    async function b() {
      n.value = "";
      try {
        const [e, l] = await Promise.all([
          i.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          i.api.get("/api/plugins/core-translator/config")
        ]), c = e != null && e.models && typeof e.models == "object" ? Object.keys(e.models) : ["default"];
        p.value = c.length ? c : ["default"], a.value = {
          auto_translate_members: !!(l != null && l.auto_translate_members),
          translate_model_key: (l == null ? void 0 : l.translate_model_key) || "default",
          translate_all_model_key: (l == null ? void 0 : l.translate_all_model_key) || "default"
        };
      } catch (e) {
        n.value = (e == null ? void 0 : e.message) || "Failed to load translator settings";
      }
    }
    U(t, (e) => {
      e && b();
    });
    async function f() {
      if (!d.value) {
        d.value = !0, n.value = "";
        try {
          const e = await i.api.put("/api/plugins/core-translator/config", { ...a.value });
          a.value = {
            auto_translate_members: !!(e != null && e.auto_translate_members),
            translate_model_key: (e == null ? void 0 : e.translate_model_key) || a.value.translate_model_key,
            translate_all_model_key: (e == null ? void 0 : e.translate_all_model_key) || a.value.translate_all_model_key
          }, i.notify({ level: "success", message: "Translator settings updated." });
        } catch (e) {
          n.value = (e == null ? void 0 : e.message) || "Failed to save translator settings";
        } finally {
          d.value = !1;
        }
      }
    }
    return (e, l) => {
      var o, r, B, y, x, T;
      const c = _("Button"), v = _("Message"), V = _("Select"), h = _("ToggleSwitch");
      return ((r = (o = s.context) == null ? void 0 : o.plugin) == null ? void 0 : r.id) === "core-translator" ? (S(), I(
        j,
        { key: 0 },
        [
          g(c, {
            label: t.value ? "Close Settings" : "Settings",
            icon: t.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !t.value,
            disabled: ((y = (B = s.context) == null ? void 0 : B.plugin) == null ? void 0 : y.state) !== "active",
            class: "btn-translator-settings-toggle",
            onClick: l[0] || (l[0] = (k) => t.value = !t.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          t.value && ((T = (x = s.context) == null ? void 0 : x.plugin) == null ? void 0 : T.state) === "active" ? (S(), I("div", G, [
            n.value ? (S(), A(v, {
              key: 0,
              severity: "error"
            }, {
              default: F(() => [
                M(
                  $(n.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : w("v-if", !0),
            u("div", J, [
              u("div", null, [
                l[4] || (l[4] = u(
                  "label",
                  { for: "translator-single-model-key" },
                  "Single recipe translation model key",
                  -1
                  /* CACHED */
                )),
                g(V, {
                  inputId: "translator-single-model-key",
                  "aria-label": "Single recipe translation model key",
                  modelValue: a.value.translate_model_key,
                  "onUpdate:modelValue": l[1] || (l[1] = (k) => a.value.translate_model_key = k),
                  options: C(a.value.translate_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              u("div", null, [
                l[5] || (l[5] = u(
                  "label",
                  { for: "translator-bulk-model-key" },
                  "Bulk translation model key",
                  -1
                  /* CACHED */
                )),
                g(V, {
                  inputId: "translator-bulk-model-key",
                  "aria-label": "Bulk translation model key",
                  modelValue: a.value.translate_all_model_key,
                  "onUpdate:modelValue": l[2] || (l[2] = (k) => a.value.translate_all_model_key = k),
                  options: C(a.value.translate_all_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              u("div", R, [
                g(h, {
                  inputId: "translator-auto-members",
                  modelValue: a.value.auto_translate_members,
                  "onUpdate:modelValue": l[3] || (l[3] = (k) => a.value.auto_translate_members = k)
                }, null, 8, ["modelValue"]),
                l[6] || (l[6] = u(
                  "label",
                  { for: "translator-auto-members" },
                  "Auto-translate for member languages",
                  -1
                  /* CACHED */
                ))
              ])
            ]),
            u("div", q, [
              g(c, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: d.value,
                onClick: f
              }, null, 8, ["loading"])
            ])
          ])) : w("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : w("v-if", !0);
    };
  }
}), Q = /* @__PURE__ */ P(H, [["__scopeId", "data-v-2328a609"]]);
function Y(s) {
  s.intent.provider({
    hub: "recipe:actions",
    id: "ai-translate",
    title: "Translate…",
    kind: "ui",
    icon: "language",
    order: 30,
    component: O,
    isAvailable: (i) => {
      var t;
      return !!((t = i == null ? void 0 : i.recipe) != null && t.id);
    }
  }), s.slot("plugin_manager.plugin.actions", Q, { order: 10 });
}
export {
  O as TranslateDialog,
  Q as TranslatorPluginSettings,
  Y as default
};
