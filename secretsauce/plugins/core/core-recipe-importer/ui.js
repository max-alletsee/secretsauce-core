import { defineComponent as z, ref as s, computed as Z, watch as q, resolveComponent as _, openBlock as v, createElementBlock as b, createVNode as n, withCtx as m, createTextVNode as R, createElementVNode as i, createCommentVNode as S, createBlock as L, toDisplayString as k, Fragment as N, renderList as E } from "vue";
import { useSecretSauce as W } from "@secretsauce/ui";
const K = { class: "import-recipe-dialog" }, ee = ["src"], le = { key: 0 }, te = { class: "dialog-actions" }, oe = /* @__PURE__ */ z({
  inheritAttrs: !1,
  __name: "ImportRecipeDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(y, { emit: x }) {
    const d = x, c = W(), u = s("url"), V = s(""), a = s(""), C = s(""), U = s("image/jpeg"), T = s(""), e = s(null), t = s(!1), r = s(!1), p = s(""), f = s(!1), w = Z(() => u.value === "url" ? !!V.value.trim() : u.value === "text" ? !!a.value.trim() : !!C.value);
    q(u, () => {
      e.value = null, p.value = "", f.value = !1;
    });
    function P(o) {
      var F;
      C.value = "", T.value = "", e.value = null, p.value = "", f.value = !1;
      const l = (F = o.target.files) == null ? void 0 : F[0];
      if (!l) return;
      if (!l.type.startsWith("image/")) {
        p.value = "Choose an image file";
        return;
      }
      U.value = l.type;
      const I = new FileReader();
      I.onload = () => {
        T.value = String(I.result), C.value = T.value.split(",")[1];
      }, I.onerror = () => {
        p.value = "Could not read the photo";
      }, I.readAsDataURL(l);
    }
    function h(o) {
      f.value = (o == null ? void 0 : o.code) === "unavailable" || (o == null ? void 0 : o.status) === 503, p.value = (o == null ? void 0 : o.message) || "Could not import the recipe";
    }
    async function $() {
      if (!(!w.value || t.value)) {
        t.value = !0, e.value = null, p.value = "", f.value = !1;
        try {
          const o = u.value === "photo" ? "image" : u.value, l = o === "url" ? { url: V.value.trim() } : o === "text" ? { text: a.value.trim() } : { image_base64: C.value, mime_type: U.value };
          e.value = await c.api.post(`/api/x/core-recipe-importer/parse-${o}`, { ...l, auto_save: !1 });
        } catch (o) {
          h(o);
        } finally {
          t.value = !1;
        }
      }
    }
    async function B() {
      var o;
      if (!(!e.value || r.value)) {
        r.value = !0, p.value = "";
        try {
          const l = await c.api.post("/api/recipes", { ...e.value, language: e.value.language || ((o = c.store.household.value) == null ? void 0 : o.languages.primary) || "en" });
          c.notify({ level: "success", message: "Recipe imported" }), d("resolve", l), c.navigate(`/recipes/${l.id}`);
        } catch (l) {
          h(l);
        } finally {
          r.value = !1;
        }
      }
    }
    function A() {
      d("cancel"), c.navigate("/settings?section=core-ai-provider");
    }
    return (o, l) => {
      const I = _("Tab"), F = _("TabList"), H = _("InputText"), D = _("TabPanel"), J = _("Textarea"), Q = _("TabPanels"), X = _("Tabs"), O = _("Button"), j = _("Message"), Y = _("Card");
      return v(), b("div", K, [
        n(X, {
          value: u.value,
          "onUpdate:value": l[2] || (l[2] = (g) => u.value = g)
        }, {
          default: m(() => [
            n(F, null, {
              default: m(() => [
                n(I, { value: "url" }, {
                  default: m(() => [...l[4] || (l[4] = [
                    R(
                      "URL",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                n(I, { value: "text" }, {
                  default: m(() => [...l[5] || (l[5] = [
                    R(
                      "Paste text",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                n(I, { value: "photo" }, {
                  default: m(() => [...l[6] || (l[6] = [
                    R(
                      "Photo",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                })
              ]),
              _: 1
              /* STABLE */
            }),
            n(Q, null, {
              default: m(() => [
                n(D, { value: "url" }, {
                  default: m(() => [
                    l[7] || (l[7] = i(
                      "label",
                      { for: "import-url" },
                      "Recipe URL",
                      -1
                      /* CACHED */
                    )),
                    n(H, {
                      id: "import-url",
                      modelValue: V.value,
                      "onUpdate:modelValue": l[0] || (l[0] = (g) => V.value = g),
                      type: "url",
                      fluid: "",
                      placeholder: "https://…"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                n(D, { value: "text" }, {
                  default: m(() => [
                    l[8] || (l[8] = i(
                      "label",
                      { for: "import-text" },
                      "Recipe text",
                      -1
                      /* CACHED */
                    )),
                    n(J, {
                      id: "import-text",
                      modelValue: a.value,
                      "onUpdate:modelValue": l[1] || (l[1] = (g) => a.value = g),
                      rows: "6",
                      fluid: ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                n(D, { value: "photo" }, {
                  default: m(() => [
                    l[9] || (l[9] = i(
                      "label",
                      { for: "import-photo" },
                      "Recipe photo",
                      -1
                      /* CACHED */
                    )),
                    i(
                      "input",
                      {
                        id: "import-photo",
                        type: "file",
                        accept: "image/*",
                        onChange: P
                      },
                      null,
                      32
                      /* NEED_HYDRATION */
                    ),
                    T.value ? (v(), b("img", {
                      key: 0,
                      src: T.value,
                      alt: "Selected recipe photo",
                      class: "photo-preview"
                    }, null, 8, ee)) : S("v-if", !0)
                  ]),
                  _: 1
                  /* STABLE */
                })
              ]),
              _: 1
              /* STABLE */
            })
          ]),
          _: 1
          /* STABLE */
        }, 8, ["value"]),
        f.value ? (v(), L(j, {
          key: 0,
          severity: "warn"
        }, {
          default: m(() => [
            l[10] || (l[10] = R(
              "AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            n(O, {
              label: "Open AI settings",
              severity: "secondary",
              onClick: A
            })
          ]),
          _: 1
          /* STABLE */
        })) : p.value ? (v(), L(j, {
          key: 1,
          severity: "error"
        }, {
          default: m(() => [
            R(
              k(p.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : S("v-if", !0),
        n(O, {
          label: "Extract recipe",
          icon: "pi pi-sparkles",
          loading: t.value,
          disabled: !w.value || r.value,
          onClick: $
        }, null, 8, ["loading", "disabled"]),
        e.value ? (v(), L(Y, {
          key: 2,
          class: "draft-preview"
        }, {
          title: m(() => [
            R(
              k(e.value.title),
              1
              /* TEXT */
            )
          ]),
          content: m(() => [
            e.value.description ? (v(), b(
              "p",
              le,
              k(e.value.description),
              1
              /* TEXT */
            )) : S("v-if", !0),
            i(
              "p",
              null,
              "Serves " + k(e.value.servings),
              1
              /* TEXT */
            ),
            l[11] || (l[11] = i(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            i("ul", null, [
              (v(!0), b(
                N,
                null,
                E(e.value.ingredients, (g, M) => (v(), b(
                  "li",
                  { key: M },
                  k(g.quantity) + " " + k(g.unit) + " " + k(g.name),
                  1
                  /* TEXT */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            l[12] || (l[12] = i(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            i("ol", null, [
              (v(!0), b(
                N,
                null,
                E(e.value.steps, (g, M) => (v(), b(
                  "li",
                  { key: M },
                  k(g.instruction || g.text),
                  1
                  /* TEXT */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          _: 1
          /* STABLE */
        })) : S("v-if", !0),
        i("div", te, [
          n(O, {
            label: "Cancel",
            severity: "secondary",
            disabled: r.value,
            onClick: l[3] || (l[3] = (g) => d("cancel"))
          }, null, 8, ["disabled"]),
          e.value ? (v(), L(O, {
            key: 0,
            label: "Save recipe",
            icon: "pi pi-check",
            loading: r.value,
            onClick: B
          }, null, 8, ["loading"])) : S("v-if", !0)
        ])
      ]);
    };
  }
}), G = (y, x) => {
  const d = y.__vccOpts || y;
  for (const [c, u] of x)
    d[c] = u;
  return d;
}, ae = /* @__PURE__ */ G(oe, [["__scopeId", "data-v-6355976a"]]), ne = {
  key: 0,
  class: "plugin-inline-settings"
}, ie = { class: "settings-grid" }, ue = { class: "settings-actions" }, se = /* @__PURE__ */ z({
  inheritAttrs: !1,
  __name: "ImporterPluginSettings",
  props: {
    context: {}
  },
  setup(y) {
    const x = W(), d = s(!1), c = s(!1), u = s(""), V = s(["default"]), a = s({
      url_model_key: "default",
      text_model_key: "default",
      image_model_key: "default"
    });
    function C(e) {
      const t = V.value.length ? V.value : ["default"], r = t.map((p) => ({ value: p, label: p }));
      return e && !t.includes(e) && r.unshift({ value: e, label: `${e} (missing — uses default)` }), r;
    }
    async function U() {
      u.value = "";
      try {
        const [e, t] = await Promise.all([
          x.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          x.api.get("/api/plugins/core-recipe-importer/config")
        ]), r = e != null && e.models && typeof e.models == "object" ? Object.keys(e.models) : ["default"];
        V.value = r.length ? r : ["default"], a.value = {
          url_model_key: (t == null ? void 0 : t.url_model_key) || "default",
          text_model_key: (t == null ? void 0 : t.text_model_key) || "default",
          image_model_key: (t == null ? void 0 : t.image_model_key) || "default"
        };
      } catch (e) {
        u.value = (e == null ? void 0 : e.message) || "Failed to load importer settings";
      }
    }
    q(d, (e) => {
      e && U();
    });
    async function T() {
      if (!c.value) {
        c.value = !0, u.value = "";
        try {
          const e = await x.api.put("/api/plugins/core-recipe-importer/config", { ...a.value });
          a.value = {
            url_model_key: (e == null ? void 0 : e.url_model_key) || a.value.url_model_key,
            text_model_key: (e == null ? void 0 : e.text_model_key) || a.value.text_model_key,
            image_model_key: (e == null ? void 0 : e.image_model_key) || a.value.image_model_key
          }, x.notify({ level: "success", message: "Recipe importer settings updated." });
        } catch (e) {
          u.value = (e == null ? void 0 : e.message) || "Failed to save importer settings";
        } finally {
          c.value = !1;
        }
      }
    }
    return (e, t) => {
      var w, P, h, $, B, A;
      const r = _("Button"), p = _("Message"), f = _("Select");
      return ((P = (w = y.context) == null ? void 0 : w.plugin) == null ? void 0 : P.id) === "core-recipe-importer" ? (v(), b(
        N,
        { key: 0 },
        [
          n(r, {
            label: d.value ? "Close Settings" : "Settings",
            icon: d.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !d.value,
            disabled: (($ = (h = y.context) == null ? void 0 : h.plugin) == null ? void 0 : $.state) !== "active",
            class: "btn-importer-settings-toggle",
            onClick: t[0] || (t[0] = (o) => d.value = !d.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          d.value && ((A = (B = y.context) == null ? void 0 : B.plugin) == null ? void 0 : A.state) === "active" ? (v(), b("div", ne, [
            u.value ? (v(), L(p, {
              key: 0,
              severity: "error"
            }, {
              default: m(() => [
                R(
                  k(u.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : S("v-if", !0),
            i("div", ie, [
              i("div", null, [
                t[4] || (t[4] = i(
                  "label",
                  { for: "importer-url-model-key" },
                  "URL import model key",
                  -1
                  /* CACHED */
                )),
                n(f, {
                  inputId: "importer-url-model-key",
                  "aria-label": "URL import model key",
                  modelValue: a.value.url_model_key,
                  "onUpdate:modelValue": t[1] || (t[1] = (o) => a.value.url_model_key = o),
                  options: C(a.value.url_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              i("div", null, [
                t[5] || (t[5] = i(
                  "label",
                  { for: "importer-text-model-key" },
                  "Text import model key",
                  -1
                  /* CACHED */
                )),
                n(f, {
                  inputId: "importer-text-model-key",
                  "aria-label": "Text import model key",
                  modelValue: a.value.text_model_key,
                  "onUpdate:modelValue": t[2] || (t[2] = (o) => a.value.text_model_key = o),
                  options: C(a.value.text_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              i("div", null, [
                t[6] || (t[6] = i(
                  "label",
                  { for: "importer-image-model-key" },
                  "Image / OCR import model key",
                  -1
                  /* CACHED */
                )),
                n(f, {
                  inputId: "importer-image-model-key",
                  "aria-label": "Image / OCR import model key",
                  modelValue: a.value.image_model_key,
                  "onUpdate:modelValue": t[3] || (t[3] = (o) => a.value.image_model_key = o),
                  options: C(a.value.image_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ])
            ]),
            i("div", ue, [
              n(r, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: c.value,
                onClick: T
              }, null, 8, ["loading"])
            ])
          ])) : S("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : S("v-if", !0);
    };
  }
}), re = /* @__PURE__ */ G(se, [["__scopeId", "data-v-3b1f8aba"]]);
function me(y) {
  y.intent.provider({
    hub: "recipe:create",
    id: "ai-import",
    kind: "ui",
    title: "Import with AI…",
    icon: "sparkles",
    order: 15,
    component: ae
  }), y.slot("plugin_manager.plugin.actions", re, { order: 10 });
}
export {
  ae as ImportRecipeDialog,
  re as ImporterPluginSettings,
  me as default
};
