import { defineComponent as K, ref as i, computed as Q, watch as X, resolveComponent as r, openBlock as u, createElementBlock as m, createVNode as a, withCtx as n, createTextVNode as y, createElementVNode as s, createCommentVNode as b, createBlock as V, toDisplayString as f, Fragment as N, renderList as F } from "vue";
import { useSecretSauce as Y } from "@secretsauce/ui";
const Z = { class: "import-recipe-dialog" }, ee = ["src"], te = {
  key: 2,
  role: "status"
}, le = { key: 0 }, ae = { class: "dialog-actions" }, oe = /* @__PURE__ */ K({
  inheritAttrs: !1,
  __name: "ImportRecipeDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(x, { emit: P }) {
    const g = P, c = Y(), v = i("url"), h = i(""), w = i(""), I = i(""), A = i("image/jpeg"), k = i(""), l = i(null), C = i(!1), _ = i(!1), p = i(""), T = i(!1), B = Q(() => v.value === "url" ? !!h.value.trim() : v.value === "text" ? !!w.value.trim() : !!I.value);
    X(v, () => {
      l.value = null, p.value = "", T.value = !1;
    });
    function $(t) {
      var R;
      I.value = "", k.value = "", l.value = null, p.value = "", T.value = !1;
      const e = (R = t.target.files) == null ? void 0 : R[0];
      if (!e) return;
      if (!e.type.startsWith("image/")) {
        p.value = "Choose an image file";
        return;
      }
      A.value = e.type;
      const d = new FileReader();
      d.onload = () => {
        k.value = String(d.result), I.value = k.value.split(",")[1];
      }, d.onerror = () => {
        p.value = "Could not read the photo";
      }, d.readAsDataURL(e);
    }
    function D(t) {
      T.value = (t == null ? void 0 : t.code) === "unavailable" || (t == null ? void 0 : t.status) === 503, p.value = (t == null ? void 0 : t.message) || "Could not import the recipe";
    }
    async function M() {
      if (!(!B.value || C.value)) {
        C.value = !0, l.value = null, p.value = "", T.value = !1;
        try {
          const t = v.value === "photo" ? "image" : v.value, e = t === "url" ? { url: h.value.trim() } : t === "text" ? { text: w.value.trim() } : { image_base64: I.value, mime_type: A.value };
          l.value = await c.api.post(`/api/x/core-recipe-importer/parse-${t}`, { ...e, auto_save: !1 });
        } catch (t) {
          D(t);
        } finally {
          C.value = !1;
        }
      }
    }
    async function O() {
      var t;
      if (!(!l.value || _.value)) {
        _.value = !0, p.value = "";
        try {
          const e = await c.api.post("/api/recipes", { ...l.value, language: l.value.language || ((t = c.store.household.value) == null ? void 0 : t.languages.primary) || "en" });
          c.notify({ level: "success", message: "Recipe imported" }), g("resolve", e), c.navigate(`/recipes/${e.id}`);
        } catch (e) {
          D(e);
        } finally {
          _.value = !1;
        }
      }
    }
    function j() {
      g("cancel"), c.navigate("/settings?section=core-ai-provider");
    }
    return (t, e) => {
      const d = r("Tab"), R = r("TabList"), q = r("InputText"), L = r("TabPanel"), W = r("Textarea"), z = r("TabPanels"), G = r("Tabs"), S = r("Button"), E = r("Message"), H = r("ProgressSpinner"), J = r("Card");
      return u(), m("div", Z, [
        a(G, {
          value: v.value,
          "onUpdate:value": e[2] || (e[2] = (o) => v.value = o)
        }, {
          default: n(() => [
            a(R, null, {
              default: n(() => [
                a(d, { value: "url" }, {
                  default: n(() => [...e[4] || (e[4] = [
                    y(
                      "URL",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                a(d, { value: "text" }, {
                  default: n(() => [...e[5] || (e[5] = [
                    y(
                      "Paste text",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                a(d, { value: "photo" }, {
                  default: n(() => [...e[6] || (e[6] = [
                    y(
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
            a(z, null, {
              default: n(() => [
                a(L, { value: "url" }, {
                  default: n(() => [
                    e[7] || (e[7] = s(
                      "label",
                      { for: "import-url" },
                      "Recipe URL",
                      -1
                      /* CACHED */
                    )),
                    a(q, {
                      id: "import-url",
                      modelValue: h.value,
                      "onUpdate:modelValue": e[0] || (e[0] = (o) => h.value = o),
                      type: "url",
                      fluid: "",
                      placeholder: "https://…"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                a(L, { value: "text" }, {
                  default: n(() => [
                    e[8] || (e[8] = s(
                      "label",
                      { for: "import-text" },
                      "Recipe text",
                      -1
                      /* CACHED */
                    )),
                    a(W, {
                      id: "import-text",
                      modelValue: w.value,
                      "onUpdate:modelValue": e[1] || (e[1] = (o) => w.value = o),
                      rows: "6",
                      fluid: ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                  /* STABLE */
                }),
                a(L, { value: "photo" }, {
                  default: n(() => [
                    e[9] || (e[9] = s(
                      "label",
                      { for: "import-photo" },
                      "Recipe photo",
                      -1
                      /* CACHED */
                    )),
                    s(
                      "input",
                      {
                        id: "import-photo",
                        type: "file",
                        accept: "image/*",
                        onChange: $
                      },
                      null,
                      32
                      /* NEED_HYDRATION */
                    ),
                    k.value ? (u(), m("img", {
                      key: 0,
                      src: k.value,
                      alt: "Selected recipe photo",
                      class: "photo-preview"
                    }, null, 8, ee)) : b("v-if", !0)
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
        T.value ? (u(), V(E, {
          key: 0,
          severity: "warn"
        }, {
          default: n(() => [
            e[10] || (e[10] = y(
              "AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            a(S, {
              label: "Open AI settings",
              severity: "secondary",
              onClick: j
            })
          ]),
          _: 1
          /* STABLE */
        })) : p.value ? (u(), V(E, {
          key: 1,
          severity: "error"
        }, {
          default: n(() => [
            y(
              f(p.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : b("v-if", !0),
        a(S, {
          label: "Extract recipe",
          icon: "pi pi-sparkles",
          loading: C.value,
          disabled: !B.value || _.value,
          onClick: M
        }, null, 8, ["loading", "disabled"]),
        C.value ? (u(), m("div", te, [
          a(H, { "aria-label": "Extracting recipe" })
        ])) : b("v-if", !0),
        l.value ? (u(), V(J, {
          key: 3,
          class: "draft-preview"
        }, {
          title: n(() => [
            y(
              f(l.value.title),
              1
              /* TEXT */
            )
          ]),
          content: n(() => [
            l.value.description ? (u(), m(
              "p",
              le,
              f(l.value.description),
              1
              /* TEXT */
            )) : b("v-if", !0),
            s(
              "p",
              null,
              "Serves " + f(l.value.servings),
              1
              /* TEXT */
            ),
            e[11] || (e[11] = s(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            s("ul", null, [
              (u(!0), m(
                N,
                null,
                F(l.value.ingredients, (o, U) => (u(), m(
                  "li",
                  { key: U },
                  f(o.quantity) + " " + f(o.unit) + " " + f(o.name),
                  1
                  /* TEXT */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            e[12] || (e[12] = s(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            s("ol", null, [
              (u(!0), m(
                N,
                null,
                F(l.value.steps, (o, U) => (u(), m(
                  "li",
                  { key: U },
                  f(o.instruction || o.text),
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
        s("div", ae, [
          a(S, {
            label: "Cancel",
            severity: "secondary",
            disabled: _.value,
            onClick: e[3] || (e[3] = (o) => g("cancel"))
          }, null, 8, ["disabled"]),
          l.value ? (u(), V(S, {
            key: 0,
            label: "Save recipe",
            icon: "pi pi-check",
            loading: _.value,
            onClick: O
          }, null, 8, ["loading"])) : b("v-if", !0)
        ])
      ]);
    };
  }
}), ne = (x, P) => {
  const g = x.__vccOpts || x;
  for (const [c, v] of P)
    g[c] = v;
  return g;
}, ue = /* @__PURE__ */ ne(oe, [["__scopeId", "data-v-33ea47b3"]]);
function se(x) {
  x.intent.provider({
    hub: "recipe:create",
    id: "ai-import",
    kind: "ui",
    title: "Import with AI…",
    icon: "sparkles",
    order: 15,
    component: ue
  });
}
export {
  ue as ImportRecipeDialog,
  se as default
};
