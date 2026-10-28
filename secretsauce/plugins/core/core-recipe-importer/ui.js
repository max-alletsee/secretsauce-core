import { defineComponent as z, ref as s, computed as K, watch as q, resolveComponent as c, openBlock as d, createElementBlock as f, createVNode as n, withCtx as v, createTextVNode as R, createElementVNode as i, createCommentVNode as x, createBlock as P, toDisplayString as b, Fragment as M, renderList as j } from "vue";
import { useSecretSauce as W } from "@secretsauce/ui";
const ee = { class: "import-recipe-dialog" }, te = ["src"], le = {
  key: 2,
  role: "status"
}, oe = { key: 0 }, ae = { class: "dialog-actions" }, ne = /* @__PURE__ */ z({
  inheritAttrs: !1,
  __name: "ImportRecipeDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(y, { emit: V }) {
    const p = V, g = W(), u = s("url"), C = s(""), a = s(""), I = s(""), L = s("image/jpeg"), T = s(""), e = s(null), l = s(!1), r = s(!1), m = s(""), k = s(!1), w = K(() => u.value === "url" ? !!C.value.trim() : u.value === "text" ? !!a.value.trim() : !!I.value);
    q(u, () => {
      e.value = null, m.value = "", k.value = !1;
    });
    function U(o) {
      var F;
      I.value = "", T.value = "", e.value = null, m.value = "", k.value = !1;
      const t = (F = o.target.files) == null ? void 0 : F[0];
      if (!t) return;
      if (!t.type.startsWith("image/")) {
        m.value = "Choose an image file";
        return;
      }
      L.value = t.type;
      const S = new FileReader();
      S.onload = () => {
        T.value = String(S.result), I.value = T.value.split(",")[1];
      }, S.onerror = () => {
        m.value = "Could not read the photo";
      }, S.readAsDataURL(t);
    }
    function h(o) {
      k.value = (o == null ? void 0 : o.code) === "unavailable" || (o == null ? void 0 : o.status) === 503, m.value = (o == null ? void 0 : o.message) || "Could not import the recipe";
    }
    async function $() {
      if (!(!w.value || l.value)) {
        l.value = !0, e.value = null, m.value = "", k.value = !1;
        try {
          const o = u.value === "photo" ? "image" : u.value, t = o === "url" ? { url: C.value.trim() } : o === "text" ? { text: a.value.trim() } : { image_base64: I.value, mime_type: L.value };
          e.value = await g.api.post(`/api/x/core-recipe-importer/parse-${o}`, { ...t, auto_save: !1 });
        } catch (o) {
          h(o);
        } finally {
          l.value = !1;
        }
      }
    }
    async function B() {
      var o;
      if (!(!e.value || r.value)) {
        r.value = !0, m.value = "";
        try {
          const t = await g.api.post("/api/recipes", { ...e.value, language: e.value.language || ((o = g.store.household.value) == null ? void 0 : o.languages.primary) || "en" });
          g.notify({ level: "success", message: "Recipe imported" }), p("resolve", t), g.navigate(`/recipes/${t.id}`);
        } catch (t) {
          h(t);
        } finally {
          r.value = !1;
        }
      }
    }
    function A() {
      p("cancel"), g.navigate("/settings?section=core-ai-provider");
    }
    return (o, t) => {
      const S = c("Tab"), F = c("TabList"), H = c("InputText"), D = c("TabPanel"), J = c("Textarea"), Q = c("TabPanels"), X = c("Tabs"), O = c("Button"), N = c("Message"), Y = c("ProgressSpinner"), Z = c("Card");
      return d(), f("div", ee, [
        n(X, {
          value: u.value,
          "onUpdate:value": t[2] || (t[2] = (_) => u.value = _)
        }, {
          default: v(() => [
            n(F, null, {
              default: v(() => [
                n(S, { value: "url" }, {
                  default: v(() => [...t[4] || (t[4] = [
                    R(
                      "URL",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                n(S, { value: "text" }, {
                  default: v(() => [...t[5] || (t[5] = [
                    R(
                      "Paste text",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                n(S, { value: "photo" }, {
                  default: v(() => [...t[6] || (t[6] = [
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
              default: v(() => [
                n(D, { value: "url" }, {
                  default: v(() => [
                    t[7] || (t[7] = i(
                      "label",
                      { for: "import-url" },
                      "Recipe URL",
                      -1
                      /* CACHED */
                    )),
                    n(H, {
                      id: "import-url",
                      modelValue: C.value,
                      "onUpdate:modelValue": t[0] || (t[0] = (_) => C.value = _),
                      type: "url",
                      fluid: "",
                      placeholder: "https://…"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                n(D, { value: "text" }, {
                  default: v(() => [
                    t[8] || (t[8] = i(
                      "label",
                      { for: "import-text" },
                      "Recipe text",
                      -1
                      /* CACHED */
                    )),
                    n(J, {
                      id: "import-text",
                      modelValue: a.value,
                      "onUpdate:modelValue": t[1] || (t[1] = (_) => a.value = _),
                      rows: "6",
                      fluid: ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                n(D, { value: "photo" }, {
                  default: v(() => [
                    t[9] || (t[9] = i(
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
                        onChange: U
                      },
                      null,
                      32
                      /* NEED_HYDRATION */
                    ),
                    T.value ? (d(), f("img", {
                      key: 0,
                      src: T.value,
                      alt: "Selected recipe photo",
                      class: "photo-preview"
                    }, null, 8, te)) : x("v-if", !0)
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
        k.value ? (d(), P(N, {
          key: 0,
          severity: "warn"
        }, {
          default: v(() => [
            t[10] || (t[10] = R(
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
        })) : m.value ? (d(), P(N, {
          key: 1,
          severity: "error"
        }, {
          default: v(() => [
            R(
              b(m.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        n(O, {
          label: "Extract recipe",
          icon: "pi pi-sparkles",
          loading: l.value,
          disabled: !w.value || r.value,
          onClick: $
        }, null, 8, ["loading", "disabled"]),
        l.value ? (d(), f("div", le, [
          n(Y, { "aria-label": "Extracting recipe" })
        ])) : x("v-if", !0),
        e.value ? (d(), P(Z, {
          key: 3,
          class: "draft-preview"
        }, {
          title: v(() => [
            R(
              b(e.value.title),
              1
              /* TEXT */
            )
          ]),
          content: v(() => [
            e.value.description ? (d(), f(
              "p",
              oe,
              b(e.value.description),
              1
              /* TEXT */
            )) : x("v-if", !0),
            i(
              "p",
              null,
              "Serves " + b(e.value.servings),
              1
              /* TEXT */
            ),
            t[11] || (t[11] = i(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            i("ul", null, [
              (d(!0), f(
                M,
                null,
                j(e.value.ingredients, (_, E) => (d(), f(
                  "li",
                  { key: E },
                  b(_.quantity) + " " + b(_.unit) + " " + b(_.name),
                  1
                  /* TEXT */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            t[12] || (t[12] = i(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            i("ol", null, [
              (d(!0), f(
                M,
                null,
                j(e.value.steps, (_, E) => (d(), f(
                  "li",
                  { key: E },
                  b(_.instruction || _.text),
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
        })) : x("v-if", !0),
        i("div", ae, [
          n(O, {
            label: "Cancel",
            severity: "secondary",
            disabled: r.value,
            onClick: t[3] || (t[3] = (_) => p("cancel"))
          }, null, 8, ["disabled"]),
          e.value ? (d(), P(O, {
            key: 0,
            label: "Save recipe",
            icon: "pi pi-check",
            loading: r.value,
            onClick: B
          }, null, 8, ["loading"])) : x("v-if", !0)
        ])
      ]);
    };
  }
}), G = (y, V) => {
  const p = y.__vccOpts || y;
  for (const [g, u] of V)
    p[g] = u;
  return p;
}, ie = /* @__PURE__ */ G(ne, [["__scopeId", "data-v-e37051b4"]]), ue = {
  key: 0,
  class: "plugin-inline-settings"
}, se = { class: "settings-grid" }, re = { class: "settings-actions" }, de = /* @__PURE__ */ z({
  inheritAttrs: !1,
  __name: "ImporterPluginSettings",
  props: {
    context: {}
  },
  setup(y) {
    const V = W(), p = s(!1), g = s(!1), u = s(""), C = s(["default"]), a = s({
      url_model_key: "default",
      text_model_key: "default",
      image_model_key: "default"
    });
    function I(e) {
      const l = C.value.length ? C.value : ["default"], r = l.map((m) => ({ value: m, label: m }));
      return e && !l.includes(e) && r.unshift({ value: e, label: `${e} (missing — uses default)` }), r;
    }
    async function L() {
      u.value = "";
      try {
        const [e, l] = await Promise.all([
          V.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          V.api.get("/api/plugins/core-recipe-importer/config")
        ]), r = e != null && e.models && typeof e.models == "object" ? Object.keys(e.models) : ["default"];
        C.value = r.length ? r : ["default"], a.value = {
          url_model_key: (l == null ? void 0 : l.url_model_key) || "default",
          text_model_key: (l == null ? void 0 : l.text_model_key) || "default",
          image_model_key: (l == null ? void 0 : l.image_model_key) || "default"
        };
      } catch (e) {
        u.value = (e == null ? void 0 : e.message) || "Failed to load importer settings";
      }
    }
    q(p, (e) => {
      e && L();
    });
    async function T() {
      if (!g.value) {
        g.value = !0, u.value = "";
        try {
          const e = await V.api.put("/api/plugins/core-recipe-importer/config", { ...a.value });
          a.value = {
            url_model_key: (e == null ? void 0 : e.url_model_key) || a.value.url_model_key,
            text_model_key: (e == null ? void 0 : e.text_model_key) || a.value.text_model_key,
            image_model_key: (e == null ? void 0 : e.image_model_key) || a.value.image_model_key
          }, V.notify({ level: "success", message: "Recipe importer settings updated." });
        } catch (e) {
          u.value = (e == null ? void 0 : e.message) || "Failed to save importer settings";
        } finally {
          g.value = !1;
        }
      }
    }
    return (e, l) => {
      var w, U, h, $, B, A;
      const r = c("Button"), m = c("Message"), k = c("Select");
      return ((U = (w = y.context) == null ? void 0 : w.plugin) == null ? void 0 : U.id) === "core-recipe-importer" ? (d(), f(
        M,
        { key: 0 },
        [
          n(r, {
            label: p.value ? "Close Settings" : "Settings",
            icon: p.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !p.value,
            disabled: (($ = (h = y.context) == null ? void 0 : h.plugin) == null ? void 0 : $.state) !== "active",
            class: "btn-importer-settings-toggle",
            onClick: l[0] || (l[0] = (o) => p.value = !p.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          p.value && ((A = (B = y.context) == null ? void 0 : B.plugin) == null ? void 0 : A.state) === "active" ? (d(), f("div", ue, [
            u.value ? (d(), P(m, {
              key: 0,
              severity: "error"
            }, {
              default: v(() => [
                R(
                  b(u.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : x("v-if", !0),
            i("div", se, [
              i("div", null, [
                l[4] || (l[4] = i(
                  "label",
                  { for: "importer-url-model-key" },
                  "URL import model key",
                  -1
                  /* CACHED */
                )),
                n(k, {
                  inputId: "importer-url-model-key",
                  "aria-label": "URL import model key",
                  modelValue: a.value.url_model_key,
                  "onUpdate:modelValue": l[1] || (l[1] = (o) => a.value.url_model_key = o),
                  options: I(a.value.url_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              i("div", null, [
                l[5] || (l[5] = i(
                  "label",
                  { for: "importer-text-model-key" },
                  "Text import model key",
                  -1
                  /* CACHED */
                )),
                n(k, {
                  inputId: "importer-text-model-key",
                  "aria-label": "Text import model key",
                  modelValue: a.value.text_model_key,
                  "onUpdate:modelValue": l[2] || (l[2] = (o) => a.value.text_model_key = o),
                  options: I(a.value.text_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              i("div", null, [
                l[6] || (l[6] = i(
                  "label",
                  { for: "importer-image-model-key" },
                  "Image / OCR import model key",
                  -1
                  /* CACHED */
                )),
                n(k, {
                  inputId: "importer-image-model-key",
                  "aria-label": "Image / OCR import model key",
                  modelValue: a.value.image_model_key,
                  "onUpdate:modelValue": l[3] || (l[3] = (o) => a.value.image_model_key = o),
                  options: I(a.value.image_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ])
            ]),
            i("div", re, [
              n(r, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: g.value,
                onClick: T
              }, null, 8, ["loading"])
            ])
          ])) : x("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : x("v-if", !0);
    };
  }
}), pe = /* @__PURE__ */ G(de, [["__scopeId", "data-v-3b1f8aba"]]);
function ce(y) {
  y.intent.provider({
    hub: "recipe:create",
    id: "ai-import",
    kind: "ui",
    title: "Import with AI…",
    icon: "sparkles",
    order: 15,
    component: ie
  }), y.slot("plugin_manager.plugin.actions", pe, { order: 10 });
}
export {
  ie as ImportRecipeDialog,
  pe as ImporterPluginSettings,
  ce as default
};
