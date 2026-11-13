import { defineComponent as J, ref as n, computed as re, watch as Q, resolveComponent as g, openBlock as d, createElementBlock as _, createVNode as u, withCtx as f, createTextVNode as O, createElementVNode as a, createCommentVNode as b, createBlock as F, toDisplayString as I, Fragment as j, renderList as H } from "vue";
import { useSecretSauce as X } from "@secretsauce/ui";
const se = { class: "import-recipe-dialog" }, de = ["src"], pe = { key: 0 }, ve = { class: "import-source-editor" }, me = { class: "import-source-grid" }, ce = { key: 0 }, fe = { key: 1 }, ge = {
  key: 2,
  class: "import-source-full"
}, ye = { class: "dialog-actions" }, ke = /* @__PURE__ */ J({
  inheritAttrs: !1,
  __name: "ImportRecipeDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(x, { emit: T }) {
    const m = T, y = X(), s = n("url"), U = n(""), r = n(""), R = n(""), N = n("image/jpeg"), h = n(""), l = n(null), t = n(!1), p = n(!1), c = n(""), V = n(!1), v = n("website"), L = n(""), S = n(""), C = n(""), w = n(""), $ = n(""), P = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], z = re(() => s.value === "url" ? !!U.value.trim() : s.value === "text" ? !!r.value.trim() : !!R.value);
    function W(o) {
      o && o.name ? (v.value = ["website", "cookbook", "person", "other"].includes(o.type) ? o.type : "other", L.value = o.name || "", S.value = o.author || "", C.value = o.page || "", w.value = o.url || "", $.value = o.notes || "") : (v.value = s.value === "url" ? "website" : "cookbook", L.value = "", S.value = "", C.value = "", w.value = "", $.value = "");
    }
    Q(s, () => {
      l.value = null, c.value = "", V.value = !1, W(null);
    });
    function Z(o) {
      var A;
      R.value = "", h.value = "", l.value = null, c.value = "", V.value = !1;
      const e = (A = o.target.files) == null ? void 0 : A[0];
      if (!e) return;
      if (!e.type.startsWith("image/")) {
        c.value = "Choose an image file";
        return;
      }
      N.value = e.type;
      const k = new FileReader();
      k.onload = () => {
        h.value = String(k.result), R.value = h.value.split(",")[1];
      }, k.onerror = () => {
        c.value = "Could not read the photo";
      }, k.readAsDataURL(e);
    }
    function q(o) {
      V.value = (o == null ? void 0 : o.code) === "unavailable" || (o == null ? void 0 : o.status) === 503, c.value = (o == null ? void 0 : o.message) || "Could not import the recipe";
    }
    async function K() {
      var o;
      if (!(!z.value || t.value)) {
        t.value = !0, l.value = null, c.value = "", V.value = !1;
        try {
          const e = s.value === "photo" ? "image" : s.value, k = e === "url" ? { url: U.value.trim() } : e === "text" ? { text: r.value.trim() } : { image_base64: R.value, mime_type: N.value };
          l.value = await y.api.post(`/api/x/core-recipe-importer/parse-${e}`, { ...k, auto_save: !1 }), W((o = l.value) == null ? void 0 : o.source);
        } catch (e) {
          q(e);
        } finally {
          t.value = !1;
        }
      }
    }
    function ee() {
      const o = L.value.trim();
      if (!o) return null;
      const e = { type: v.value, name: o };
      return S.value.trim() && (e.author = S.value.trim()), v.value === "cookbook" && C.value.trim() && (e.page = C.value.trim()), (v.value === "website" || v.value === "other") && w.value.trim() && (e.url = w.value.trim()), $.value.trim() && (e.notes = $.value.trim()), e;
    }
    async function le() {
      var o;
      if (!(!l.value || p.value)) {
        p.value = !0, c.value = "";
        try {
          const e = ee(), k = { ...l.value, language: l.value.language || ((o = y.store.household.value) == null ? void 0 : o.languages.primary) || "en" };
          (e !== null || l.value.source !== void 0) && (k.source = e);
          const A = await y.api.post("/api/recipes", k);
          y.notify({ level: "success", message: "Recipe imported" }), m("resolve", A), y.navigate(`/recipes/${A.id}`);
        } catch (e) {
          q(e);
        } finally {
          p.value = !1;
        }
      }
    }
    function te() {
      m("cancel"), y.navigate("/settings?section=core-ai-provider");
    }
    return (o, e) => {
      const k = g("Tab"), A = g("TabList"), B = g("InputText"), E = g("TabPanel"), oe = g("Textarea"), ae = g("TabPanels"), ue = g("Tabs"), D = g("Button"), G = g("Message"), ie = g("Select"), ne = g("Card");
      return d(), _("div", se, [
        u(ue, {
          value: s.value,
          "onUpdate:value": e[2] || (e[2] = (i) => s.value = i)
        }, {
          default: f(() => [
            u(A, null, {
              default: f(() => [
                u(k, { value: "url" }, {
                  default: f(() => [...e[9] || (e[9] = [
                    O(
                      "URL",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                u(k, { value: "text" }, {
                  default: f(() => [...e[10] || (e[10] = [
                    O(
                      "Paste text",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                u(k, { value: "photo" }, {
                  default: f(() => [...e[11] || (e[11] = [
                    O(
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
            u(ae, null, {
              default: f(() => [
                u(E, { value: "url" }, {
                  default: f(() => [
                    e[12] || (e[12] = a(
                      "label",
                      { for: "import-url" },
                      "Recipe URL",
                      -1
                      /* CACHED */
                    )),
                    u(B, {
                      id: "import-url",
                      modelValue: U.value,
                      "onUpdate:modelValue": e[0] || (e[0] = (i) => U.value = i),
                      type: "url",
                      fluid: "",
                      placeholder: "https://…"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                u(E, { value: "text" }, {
                  default: f(() => [
                    e[13] || (e[13] = a(
                      "label",
                      { for: "import-text" },
                      "Recipe text",
                      -1
                      /* CACHED */
                    )),
                    u(oe, {
                      id: "import-text",
                      modelValue: r.value,
                      "onUpdate:modelValue": e[1] || (e[1] = (i) => r.value = i),
                      rows: "6",
                      fluid: ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                u(E, { value: "photo" }, {
                  default: f(() => [
                    e[14] || (e[14] = a(
                      "label",
                      { for: "import-photo" },
                      "Recipe photo",
                      -1
                      /* CACHED */
                    )),
                    a(
                      "input",
                      {
                        id: "import-photo",
                        type: "file",
                        accept: "image/*",
                        onChange: Z
                      },
                      null,
                      32
                      /* NEED_HYDRATION */
                    ),
                    h.value ? (d(), _("img", {
                      key: 0,
                      src: h.value,
                      alt: "Selected recipe photo",
                      class: "photo-preview"
                    }, null, 8, de)) : b("v-if", !0)
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
        V.value ? (d(), F(G, {
          key: 0,
          severity: "warn"
        }, {
          default: f(() => [
            e[15] || (e[15] = O(
              "AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            u(D, {
              label: "Open AI settings",
              severity: "secondary",
              onClick: te
            })
          ]),
          _: 1
          /* STABLE */
        })) : c.value ? (d(), F(G, {
          key: 1,
          severity: "error"
        }, {
          default: f(() => [
            O(
              I(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : b("v-if", !0),
        u(D, {
          label: "Extract recipe",
          icon: "pi pi-sparkles",
          loading: t.value,
          disabled: !z.value || p.value,
          onClick: K
        }, null, 8, ["loading", "disabled"]),
        l.value ? (d(), F(ne, {
          key: 2,
          class: "draft-preview"
        }, {
          title: f(() => [
            O(
              I(l.value.title),
              1
              /* TEXT */
            )
          ]),
          content: f(() => [
            l.value.description ? (d(), _(
              "p",
              pe,
              I(l.value.description),
              1
              /* TEXT */
            )) : b("v-if", !0),
            a(
              "p",
              null,
              "Serves " + I(l.value.servings),
              1
              /* TEXT */
            ),
            a("fieldset", ve, [
              e[21] || (e[21] = a(
                "legend",
                null,
                "Source (optional)",
                -1
                /* CACHED */
              )),
              a("div", me, [
                a("div", null, [
                  e[16] || (e[16] = a(
                    "label",
                    { for: "import-source-type" },
                    "Type",
                    -1
                    /* CACHED */
                  )),
                  u(ie, {
                    inputId: "import-source-type",
                    modelValue: v.value,
                    "onUpdate:modelValue": e[3] || (e[3] = (i) => v.value = i),
                    options: P,
                    optionLabel: "label",
                    optionValue: "value",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ]),
                a("div", null, [
                  e[17] || (e[17] = a(
                    "label",
                    { for: "import-source-name" },
                    "Source name",
                    -1
                    /* CACHED */
                  )),
                  u(B, {
                    id: "import-source-name",
                    modelValue: L.value,
                    "onUpdate:modelValue": e[4] || (e[4] = (i) => L.value = i),
                    placeholder: "e.g. Simple, Smitten Kitchen",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ]),
                v.value !== "person" ? (d(), _("div", ce, [
                  e[18] || (e[18] = a(
                    "label",
                    { for: "import-source-author" },
                    "Author",
                    -1
                    /* CACHED */
                  )),
                  u(B, {
                    id: "import-source-author",
                    modelValue: S.value,
                    "onUpdate:modelValue": e[5] || (e[5] = (i) => S.value = i),
                    placeholder: "Optional",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ])) : b("v-if", !0),
                v.value === "cookbook" ? (d(), _("div", fe, [
                  e[19] || (e[19] = a(
                    "label",
                    { for: "import-source-page" },
                    "Page #",
                    -1
                    /* CACHED */
                  )),
                  u(B, {
                    id: "import-source-page",
                    modelValue: C.value,
                    "onUpdate:modelValue": e[6] || (e[6] = (i) => C.value = i),
                    placeholder: "e.g. 142",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ])) : b("v-if", !0),
                v.value === "website" || v.value === "other" ? (d(), _("div", ge, [
                  e[20] || (e[20] = a(
                    "label",
                    { for: "import-source-url" },
                    "URL",
                    -1
                    /* CACHED */
                  )),
                  u(B, {
                    id: "import-source-url",
                    modelValue: w.value,
                    "onUpdate:modelValue": e[7] || (e[7] = (i) => w.value = i),
                    type: "url",
                    placeholder: "https://…",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ])) : b("v-if", !0)
              ])
            ]),
            e[22] || (e[22] = a(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            a("ul", null, [
              (d(!0), _(
                j,
                null,
                H(l.value.ingredients, (i, M) => (d(), _(
                  "li",
                  { key: M },
                  I(i.quantity) + " " + I(i.unit) + " " + I(i.name),
                  1
                  /* TEXT */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            e[23] || (e[23] = a(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            a("ol", null, [
              (d(!0), _(
                j,
                null,
                H(l.value.steps, (i, M) => (d(), _(
                  "li",
                  { key: M },
                  I(i.instruction || i.text),
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
        })) : b("v-if", !0),
        a("div", ye, [
          u(D, {
            label: "Cancel",
            severity: "secondary",
            disabled: p.value,
            onClick: e[8] || (e[8] = (i) => m("cancel"))
          }, null, 8, ["disabled"]),
          l.value ? (d(), F(D, {
            key: 0,
            label: "Save recipe",
            icon: "pi pi-check",
            loading: p.value,
            onClick: le
          }, null, 8, ["loading"])) : b("v-if", !0)
        ])
      ]);
    };
  }
}), Y = (x, T) => {
  const m = x.__vccOpts || x;
  for (const [y, s] of T)
    m[y] = s;
  return m;
}, _e = /* @__PURE__ */ Y(ke, [["__scopeId", "data-v-7df02437"]]), be = {
  key: 0,
  class: "plugin-inline-settings"
}, xe = { class: "settings-grid" }, Ve = { class: "settings-actions" }, Se = /* @__PURE__ */ J({
  inheritAttrs: !1,
  __name: "ImporterPluginSettings",
  props: {
    context: {}
  },
  setup(x) {
    const T = X(), m = n(!1), y = n(!1), s = n(""), U = n(["default"]), r = n({
      url_model_key: "default",
      text_model_key: "default",
      image_model_key: "default"
    });
    function R(l) {
      const t = U.value.length ? U.value : ["default"], p = t.map((c) => ({ value: c, label: c }));
      return l && !t.includes(l) && p.unshift({ value: l, label: `${l} (missing — uses default)` }), p;
    }
    async function N() {
      s.value = "";
      try {
        const [l, t] = await Promise.all([
          T.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          T.api.get("/api/plugins/core-recipe-importer/config")
        ]), p = l != null && l.models && typeof l.models == "object" ? Object.keys(l.models) : ["default"];
        U.value = p.length ? p : ["default"], r.value = {
          url_model_key: (t == null ? void 0 : t.url_model_key) || "default",
          text_model_key: (t == null ? void 0 : t.text_model_key) || "default",
          image_model_key: (t == null ? void 0 : t.image_model_key) || "default"
        };
      } catch (l) {
        s.value = (l == null ? void 0 : l.message) || "Failed to load importer settings";
      }
    }
    Q(m, (l) => {
      l && N();
    });
    async function h() {
      if (!y.value) {
        y.value = !0, s.value = "";
        try {
          const l = await T.api.put("/api/plugins/core-recipe-importer/config", { ...r.value });
          r.value = {
            url_model_key: (l == null ? void 0 : l.url_model_key) || r.value.url_model_key,
            text_model_key: (l == null ? void 0 : l.text_model_key) || r.value.text_model_key,
            image_model_key: (l == null ? void 0 : l.image_model_key) || r.value.image_model_key
          }, T.notify({ level: "success", message: "Recipe importer settings updated." });
        } catch (l) {
          s.value = (l == null ? void 0 : l.message) || "Failed to save importer settings";
        } finally {
          y.value = !1;
        }
      }
    }
    return (l, t) => {
      var v, L, S, C, w, $;
      const p = g("Button"), c = g("Message"), V = g("Select");
      return ((L = (v = x.context) == null ? void 0 : v.plugin) == null ? void 0 : L.id) === "core-recipe-importer" ? (d(), _(
        j,
        { key: 0 },
        [
          u(p, {
            label: m.value ? "Close Settings" : "Settings",
            icon: m.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !m.value,
            disabled: ((C = (S = x.context) == null ? void 0 : S.plugin) == null ? void 0 : C.state) !== "active",
            class: "btn-importer-settings-toggle",
            onClick: t[0] || (t[0] = (P) => m.value = !m.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          m.value && (($ = (w = x.context) == null ? void 0 : w.plugin) == null ? void 0 : $.state) === "active" ? (d(), _("div", be, [
            s.value ? (d(), F(c, {
              key: 0,
              severity: "error"
            }, {
              default: f(() => [
                O(
                  I(s.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : b("v-if", !0),
            a("div", xe, [
              a("div", null, [
                t[4] || (t[4] = a(
                  "label",
                  { for: "importer-url-model-key" },
                  "URL import model key",
                  -1
                  /* CACHED */
                )),
                u(V, {
                  inputId: "importer-url-model-key",
                  "aria-label": "URL import model key",
                  modelValue: r.value.url_model_key,
                  "onUpdate:modelValue": t[1] || (t[1] = (P) => r.value.url_model_key = P),
                  options: R(r.value.url_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              a("div", null, [
                t[5] || (t[5] = a(
                  "label",
                  { for: "importer-text-model-key" },
                  "Text import model key",
                  -1
                  /* CACHED */
                )),
                u(V, {
                  inputId: "importer-text-model-key",
                  "aria-label": "Text import model key",
                  modelValue: r.value.text_model_key,
                  "onUpdate:modelValue": t[2] || (t[2] = (P) => r.value.text_model_key = P),
                  options: R(r.value.text_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ]),
              a("div", null, [
                t[6] || (t[6] = a(
                  "label",
                  { for: "importer-image-model-key" },
                  "Image / OCR import model key",
                  -1
                  /* CACHED */
                )),
                u(V, {
                  inputId: "importer-image-model-key",
                  "aria-label": "Image / OCR import model key",
                  modelValue: r.value.image_model_key,
                  "onUpdate:modelValue": t[3] || (t[3] = (P) => r.value.image_model_key = P),
                  options: R(r.value.image_model_key),
                  optionLabel: "label",
                  optionValue: "value",
                  fluid: ""
                }, null, 8, ["modelValue", "options"])
              ])
            ]),
            a("div", Ve, [
              u(p, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: y.value,
                onClick: h
              }, null, 8, ["loading"])
            ])
          ])) : b("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : b("v-if", !0);
    };
  }
}), Ce = /* @__PURE__ */ Y(Se, [["__scopeId", "data-v-3b1f8aba"]]);
function Te(x) {
  x.intent.provider({
    hub: "recipe:create",
    id: "ai-import",
    kind: "ui",
    title: "Import with AI…",
    icon: "sparkles",
    order: 15,
    component: _e
  }), x.slot("plugin_manager.plugin.actions", Ce, { order: 10 });
}
export {
  _e as ImportRecipeDialog,
  Ce as ImporterPluginSettings,
  Te as default
};
