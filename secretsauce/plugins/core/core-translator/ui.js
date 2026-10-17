import { defineComponent as N, ref as u, resolveComponent as b, openBlock as m, createElementBlock as w, createElementVNode as f, toDisplayString as V, createVNode as d, createBlock as h, withCtx as S, createTextVNode as x, createCommentVNode as E } from "vue";
import { useSecretSauce as M } from "@secretsauce/ui";
const O = { class: "translate-dialog" }, $ = { class: "dialog-actions" }, j = /* @__PURE__ */ N({
  inheritAttrs: !1,
  __name: "TranslateDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(n, { emit: o }) {
    var _, y, k;
    const a = n, i = o, t = M(), p = (_ = t.store.currentMember.value) == null ? void 0 : _.preferred_language, s = u(p && p !== a.context.recipe.language ? p : ((k = (y = t.store.household.value) == null ? void 0 : y.languages.translations) == null ? void 0 : k[0]) || "de"), B = [{ id: "en", label: "English" }, { id: "de", label: "German" }, { id: "es", label: "Spanish" }, { id: "fr", label: "French" }, { id: "it", label: "Italian" }, { id: "pt", label: "Portuguese" }, { id: "nl", label: "Dutch" }, { id: "ja", label: "Japanese" }, { id: "zh", label: "Chinese" }], r = u(!1), c = u(""), g = u(!1);
    async function I() {
      r.value = !0, c.value = "", g.value = !1;
      try {
        const e = await t.api.post("/api/x/core-translator/translate", { recipe_id: a.context.recipe.id, target_language: s.value });
        t.notify({ level: "success", message: "Recipe translated" }), i("resolve", e), t.navigate(`/recipes/${e.id}`);
      } catch (e) {
        g.value = (e == null ? void 0 : e.code) === "unavailable", c.value = (e == null ? void 0 : e.message) || "Translation failed";
      } finally {
        r.value = !1;
      }
    }
    function A() {
      i("cancel"), t.navigate("/settings?section=core-ai-provider");
    }
    return (e, l) => {
      const D = b("Select"), v = b("Button"), C = b("Message");
      return m(), w("div", O, [
        f(
          "p",
          null,
          V(n.context.recipe.title),
          1
          /* TEXT */
        ),
        l[3] || (l[3] = f(
          "label",
          { for: "target-language" },
          "Target language",
          -1
          /* CACHED */
        )),
        d(D, {
          "aria-label": "Target language",
          inputId: "target-language",
          modelValue: s.value,
          "onUpdate:modelValue": l[0] || (l[0] = (T) => s.value = T),
          options: B,
          optionLabel: "label",
          optionValue: "id",
          fluid: ""
        }, null, 8, ["modelValue"]),
        g.value ? (m(), h(C, {
          key: 0,
          severity: "warn"
        }, {
          default: S(() => [
            l[2] || (l[2] = x(
              "AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            d(v, {
              label: "Open AI settings",
              severity: "secondary",
              onClick: A
            })
          ]),
          _: 1
          /* STABLE */
        })) : c.value ? (m(), h(C, {
          key: 1,
          severity: "error"
        }, {
          default: S(() => [
            x(
              V(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : E("v-if", !0),
        f("div", $, [
          d(v, {
            label: "Cancel",
            severity: "secondary",
            disabled: r.value,
            onClick: l[1] || (l[1] = (T) => i("cancel"))
          }, null, 8, ["disabled"]),
          d(v, {
            label: "Translate recipe",
            icon: "pi pi-language",
            loading: r.value,
            disabled: !s.value,
            onClick: I
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), z = (n, o) => {
  const a = n.__vccOpts || n;
  for (const [i, t] of o)
    a[i] = t;
  return a;
}, F = /* @__PURE__ */ z(j, [["__scopeId", "data-v-c3854657"]]);
function L(n) {
  n.intent.provider({
    hub: "recipe:actions",
    id: "ai-translate",
    title: "Translate…",
    kind: "ui",
    icon: "language",
    order: 30,
    component: F,
    isAvailable: (o) => {
      var a;
      return !!((a = o == null ? void 0 : o.recipe) != null && a.id);
    }
  });
}
export {
  F as TranslateDialog,
  L as default
};
