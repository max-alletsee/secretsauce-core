import { defineComponent as q, ref as w, watch as J, computed as G, resolveComponent as h, openBlock as v, createBlock as F, withCtx as U, createElementVNode as t, createCommentVNode as A, createElementBlock as f, Fragment as B, renderList as D, normalizeClass as j, toDisplayString as S, createTextVNode as W, createVNode as u, onMounted as Q } from "vue";
import { useSecretSauce as H } from "@secretsauce/ui";
function E(_) {
  return (_ || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function X(_ = [], r = []) {
  const l = /* @__PURE__ */ new Map();
  _.forEach((s) => {
    l.set(E(s.name), s);
  });
  const y = /* @__PURE__ */ new Map();
  r.forEach((s) => {
    y.set(E(s.name), s);
  });
  const c = [], p = [], g = [], d = [];
  for (const s of r) {
    const V = E(s.name), a = l.get(V);
    a ? a.quantity !== s.quantity || a.unit !== s.unit || (a.notes || "") !== (s.notes || "") ? g.push(s) : d.push(s) : c.push(s);
  }
  for (const s of _) {
    const V = E(s.name);
    y.has(V) || p.push(s);
  }
  return { added: c, removed: p, modified: g, unchanged: d };
}
const Y = { class: "dialog-content" }, K = { class: "action-picker" }, ee = { class: "action-grid" }, te = ["disabled", "onClick"], le = { key: 0 }, ae = {
  key: 2,
  class: "loading-state"
}, ne = { class: "preview-area" }, oe = { class: "adaptation-summary" }, ie = { class: "meta-row" }, se = { class: "form-group" }, de = { class: "form-group" }, ue = { class: "form-group" }, ce = { class: "form-group" }, re = { class: "diff-grid" }, pe = { class: "diff-pane original-pane" }, ve = { class: "diff-pane adapted-pane" }, me = { class: "ing-edit-row" }, ge = { class: "steps-preview" }, fe = { class: "dialog-actions" }, _e = {
  key: 0,
  class: "commit-actions"
}, ye = /* @__PURE__ */ q({
  inheritAttrs: !1,
  __name: "MagicWandDialog",
  props: {
    visible: { type: Boolean },
    context: {}
  },
  emits: ["update:visible", "resolved"],
  setup(_, { emit: r }) {
    const l = _, y = r, c = H(), p = w([]), g = w(""), d = w(!1), s = w(""), V = w(!1), a = w(null);
    J(
      () => l.visible,
      async (o) => {
        if (o) {
          s.value = "", V.value = !1, a.value = null, g.value = "";
          try {
            p.value = await c.api.get("/api/x/core-recipe-magic/actions");
          } catch (e) {
            s.value = (e == null ? void 0 : e.message) || "Failed to load actions";
          }
        }
      },
      { immediate: !0 }
    );
    const M = G(() => {
      var o, e;
      return a.value ? X(
        ((o = l.context.recipe) == null ? void 0 : o.ingredients) || [],
        ((e = a.value) == null ? void 0 : e.ingredients) || []
      ) : { added: [], removed: [], modified: [], unchanged: [] };
    });
    async function O(o) {
      g.value = o.id, d.value = !0, s.value = "", V.value = !1, a.value = null;
      try {
        const e = {
          action_id: o.id,
          recipe: l.context.recipe
        }, b = await c.api.post("/api/x/core-recipe-magic/adapt", e);
        a.value = b;
      } catch (e) {
        (e == null ? void 0 : e.code) === "unavailable" || (e == null ? void 0 : e.status) === 503 ? V.value = !0 : s.value = (e == null ? void 0 : e.message) || "Adaptation failed";
      } finally {
        d.value = !1;
      }
    }
    function Z() {
      var o;
      z(), (o = c.navigate) == null || o.call(c, "/settings?section=core-ai-provider");
    }
    function z() {
      y("update:visible", !1);
    }
    function n() {
      a.value && (l.context.applyAdaptation(a.value), c.notify({ level: "success", message: "Recipe adapted" }), y("resolved", a.value), z());
    }
    async function m() {
      var o, e;
      if (!(!a.value || d.value)) {
        d.value = !0, s.value = "";
        try {
          const b = {
            ...a.value,
            language: ((o = l.context.recipe) == null ? void 0 : o.language) || "en"
          };
          delete b.id, delete b.adaptation_summary;
          const $ = await c.api.post("/api/recipes", b);
          c.notify({ level: "success", message: "Saved as new recipe variation" }), y("resolved", $), z(), (e = c.navigate) == null || e.call(c, `/recipes/${$.id}`);
        } catch (b) {
          s.value = (b == null ? void 0 : b.message) || "Failed to save new recipe";
        } finally {
          d.value = !1;
        }
      }
    }
    return (o, e) => {
      const b = h("Button"), $ = h("Message"), N = h("ProgressSpinner"), P = h("InputText"), k = h("InputNumber"), I = h("Textarea"), C = h("Dialog");
      return v(), F(C, {
        visible: l.visible,
        modal: "",
        "append-to": "self",
        class: "magic-wand-dialog",
        style: { width: "min(54rem, 95vw)" },
        "onUpdate:visible": e[4] || (e[4] = (R) => y("update:visible", R))
      }, {
        header: U(() => [...e[5] || (e[5] = [
          t(
            "div",
            { class: "dialog-header" },
            [
              t("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "wand-icon",
                "aria-hidden": "true"
              }, [
                t("path", { d: "m19 2 2 2-2 2-2-2Z" }),
                t("path", { d: "m5 17 2 2-2 2-2-2Z" }),
                t("path", { d: "m15 4 5 5L7 22l-5-5Z" })
              ]),
              t("span", null, "Make it Magic: Adapt Recipe")
            ],
            -1
            /* CACHED */
          )
        ])]),
        footer: U(() => [
          t("div", fe, [
            u(b, {
              label: "Cancel",
              severity: "secondary",
              disabled: d.value,
              onClick: z
            }, null, 8, ["disabled"]),
            a.value ? (v(), f("div", _e, [
              u(b, {
                label: "Save as New Recipe",
                icon: "pi pi-copy",
                class: "btn-save-fork",
                outlined: "",
                loading: d.value,
                onClick: m
              }, null, 8, ["loading"]),
              u(b, {
                label: "Apply to Editor",
                icon: "pi pi-check",
                class: "btn-apply-editor",
                loading: d.value,
                onClick: n
              }, null, 8, ["loading"])
            ])) : A("v-if", !0)
          ])
        ]),
        default: U(() => {
          var R;
          return [
            t("div", Y, [
              A(" Action Selection "),
              t("div", K, [
                e[6] || (e[6] = t(
                  "label",
                  null,
                  "Select Transformation",
                  -1
                  /* CACHED */
                )),
                t("div", ee, [
                  (v(!0), f(
                    B,
                    null,
                    D(p.value, (i) => (v(), f("button", {
                      key: i.id,
                      type: "button",
                      class: j(["action-chip", { active: g.value === i.id }]),
                      disabled: d.value,
                      onClick: (T) => O(i)
                    }, [
                      t(
                        "strong",
                        null,
                        S(i.title),
                        1
                        /* TEXT */
                      ),
                      i.description ? (v(), f(
                        "small",
                        le,
                        S(i.description),
                        1
                        /* TEXT */
                      )) : A("v-if", !0)
                    ], 10, te))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              V.value ? (v(), F($, {
                key: 0,
                severity: "warn"
              }, {
                default: U(() => [
                  e[7] || (e[7] = W(
                    " AI isn’t set up yet. ",
                    -1
                    /* CACHED */
                  )),
                  u(b, {
                    label: "Open AI settings",
                    severity: "secondary",
                    size: "small",
                    onClick: Z
                  })
                ]),
                _: 1
                /* STABLE */
              })) : s.value ? (v(), F($, {
                key: 1,
                severity: "error"
              }, {
                default: U(() => [
                  W(
                    S(s.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : A("v-if", !0),
              A(" Loading State "),
              d.value ? (v(), f("div", ae, [
                u(N, { style: { width: "2.5rem", height: "2.5rem" } }),
                e[8] || (e[8] = t(
                  "p",
                  null,
                  "Adapting recipe with AI…",
                  -1
                  /* CACHED */
                ))
              ])) : a.value ? (v(), f(
                B,
                { key: 3 },
                [
                  A(" Transformed Result & Diff "),
                  t("div", ne, [
                    t("div", oe, [
                      e[10] || (e[10] = t(
                        "i",
                        {
                          class: "pi pi-sparkles",
                          "aria-hidden": "true"
                        },
                        null,
                        -1
                        /* CACHED */
                      )),
                      t("div", null, [
                        e[9] || (e[9] = t(
                          "strong",
                          null,
                          "AI Adaptation Summary:",
                          -1
                          /* CACHED */
                        )),
                        t(
                          "p",
                          null,
                          S(a.value.adaptation_summary),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    t("div", ie, [
                      t("div", se, [
                        e[11] || (e[11] = t(
                          "label",
                          null,
                          "Title",
                          -1
                          /* CACHED */
                        )),
                        u(P, {
                          modelValue: a.value.title,
                          "onUpdate:modelValue": e[0] || (e[0] = (i) => a.value.title = i),
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ]),
                      t("div", de, [
                        e[12] || (e[12] = t(
                          "label",
                          null,
                          "Servings",
                          -1
                          /* CACHED */
                        )),
                        u(k, {
                          modelValue: a.value.servings,
                          "onUpdate:modelValue": e[1] || (e[1] = (i) => a.value.servings = i),
                          min: 1,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ]),
                      t("div", ue, [
                        e[13] || (e[13] = t(
                          "label",
                          null,
                          "Prep (min)",
                          -1
                          /* CACHED */
                        )),
                        u(k, {
                          modelValue: a.value.prep_time_minutes,
                          "onUpdate:modelValue": e[2] || (e[2] = (i) => a.value.prep_time_minutes = i),
                          min: 0,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ]),
                      t("div", ce, [
                        e[14] || (e[14] = t(
                          "label",
                          null,
                          "Cook (min)",
                          -1
                          /* CACHED */
                        )),
                        u(k, {
                          modelValue: a.value.cook_time_minutes,
                          "onUpdate:modelValue": e[3] || (e[3] = (i) => a.value.cook_time_minutes = i),
                          min: 0,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ])
                    ]),
                    A(" Diff Split "),
                    t("div", re, [
                      t("div", pe, [
                        e[15] || (e[15] = t(
                          "h4",
                          null,
                          "Original Ingredients",
                          -1
                          /* CACHED */
                        )),
                        t("ul", null, [
                          (v(!0), f(
                            B,
                            null,
                            D(((R = l.context.recipe) == null ? void 0 : R.ingredients) || [], (i, T) => (v(), f(
                              "li",
                              {
                                key: T,
                                class: j({ removed: M.value.removed.some((x) => x.name === i.name) })
                              },
                              [
                                t(
                                  "span",
                                  null,
                                  S(i.quantity) + " " + S(i.unit) + " " + S(i.name),
                                  1
                                  /* TEXT */
                                )
                              ],
                              2
                              /* CLASS */
                            ))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])
                      ]),
                      t("div", ve, [
                        e[16] || (e[16] = t(
                          "h4",
                          null,
                          "Adapted Ingredients",
                          -1
                          /* CACHED */
                        )),
                        t("ul", null, [
                          (v(!0), f(
                            B,
                            null,
                            D(a.value.ingredients || [], (i, T) => (v(), f(
                              "li",
                              {
                                key: T,
                                class: j({
                                  added: M.value.added.some((x) => x.name === i.name),
                                  modified: M.value.modified.some((x) => x.name === i.name)
                                })
                              },
                              [
                                t("div", me, [
                                  u(k, {
                                    modelValue: i.quantity,
                                    "onUpdate:modelValue": (x) => i.quantity = x,
                                    min: 0,
                                    class: "ing-qty"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  u(P, {
                                    modelValue: i.unit,
                                    "onUpdate:modelValue": (x) => i.unit = x,
                                    class: "ing-unit",
                                    placeholder: "unit"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  u(P, {
                                    modelValue: i.name,
                                    "onUpdate:modelValue": (x) => i.name = x,
                                    class: "ing-name",
                                    placeholder: "ingredient",
                                    fluid: ""
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                ])
                              ],
                              2
                              /* CLASS */
                            ))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])
                      ])
                    ]),
                    A(" Steps preview "),
                    t("div", ge, [
                      e[17] || (e[17] = t(
                        "h4",
                        null,
                        "Adapted Steps",
                        -1
                        /* CACHED */
                      )),
                      t("ol", null, [
                        (v(!0), f(
                          B,
                          null,
                          D(a.value.steps || [], (i, T) => (v(), f("li", { key: T }, [
                            u(I, {
                              modelValue: i.instruction,
                              "onUpdate:modelValue": (x) => i.instruction = x,
                              rows: "2",
                              fluid: ""
                            }, null, 8, ["modelValue", "onUpdate:modelValue"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ])
                    ])
                  ])
                ],
                2112
                /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
              )) : A("v-if", !0)
            ])
          ];
        }),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), L = (_, r) => {
  const l = _.__vccOpts || _;
  for (const [y, c] of r)
    l[y] = c;
  return l;
}, be = /* @__PURE__ */ L(ye, [["__scopeId", "data-v-56cd1e93"]]), he = { class: "magic-wand-trigger-container" }, ke = /* @__PURE__ */ q({
  __name: "MagicWandButton",
  props: {
    context: {}
  },
  setup(_) {
    const r = _, l = w(!1), y = G(() => {
      var p, g;
      const c = (p = r.context) == null ? void 0 : p.recipe;
      return !!(c && ((g = c.title) != null && g.trim() || c.ingredients && c.ingredients.length > 0));
    });
    return (c, p) => {
      const g = h("Button");
      return v(), f("div", he, [
        u(g, {
          label: "Make it Magic",
          class: "btn-make-it-magic",
          outlined: "",
          disabled: !y.value,
          onClick: p[0] || (p[0] = (d) => l.value = !0)
        }, {
          icon: U(() => [...p[2] || (p[2] = [
            t(
              "svg",
              {
                width: "15",
                height: "15",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "wand-icon",
                "aria-hidden": "true"
              },
              [
                t("path", { d: "m19 2 2 2-2 2-2-2Z" }),
                t("path", { d: "m5 17 2 2-2 2-2-2Z" }),
                t("path", { d: "m15 4 5 5L7 22l-5-5Z" })
              ],
              -1
              /* CACHED */
            )
          ])]),
          _: 1
          /* STABLE */
        }, 8, ["disabled"]),
        u(be, {
          visible: l.value,
          "onUpdate:visible": p[1] || (p[1] = (d) => l.value = d),
          context: r.context
        }, null, 8, ["visible", "context"])
      ]);
    };
  }
}), we = /* @__PURE__ */ L(ke, [["__scopeId", "data-v-62945de9"]]), Ve = { class: "magic-settings" }, xe = { class: "settings-header" }, Ae = { class: "header-actions" }, Ce = { class: "model-key-row" }, Me = {
  key: 1,
  class: "loading-state"
}, Se = {
  key: 2,
  class: "actions-list"
}, Ie = { class: "card-header" }, $e = { class: "card-title-group" }, Ue = { class: "index-badge" }, Be = { class: "card-tools" }, ze = { class: "card-body" }, Te = { class: "form-group" }, Pe = { class: "form-group" }, De = { class: "footer-actions" }, Ne = /* @__PURE__ */ q({
  __name: "MagicSettings",
  setup(_) {
    const r = H(), l = w([]), y = w("default"), c = w(["default"]), p = w(!1), g = w(!1), d = w("");
    function s(n) {
      const m = c.value.length ? c.value : ["default"], o = m.map((e) => ({ value: e, label: e }));
      return n && !m.includes(n) && o.unshift({ value: n, label: `${n} (missing — uses default)` }), o;
    }
    async function V() {
      p.value = !0, d.value = "";
      try {
        const [n, m, o] = await Promise.all([
          r.api.get("/api/x/core-recipe-magic/actions"),
          r.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          r.api.get("/api/plugins/core-recipe-magic/config").catch(() => ({ adapt_model_key: "default" }))
        ]);
        l.value = Array.isArray(n) ? n : [];
        const e = m != null && m.models && typeof m.models == "object" ? Object.keys(m.models) : ["default"];
        c.value = e.length ? e : ["default"], y.value = (o == null ? void 0 : o.adapt_model_key) || "default";
      } catch (n) {
        d.value = (n == null ? void 0 : n.message) || "Failed to load actions";
      } finally {
        p.value = !1;
      }
    }
    function a(n, m) {
      const o = n + m;
      if (o < 0 || o >= l.value.length) return;
      const e = l.value.splice(n, 1)[0];
      l.value.splice(o, 0, e);
    }
    function M(n) {
      l.value.splice(n, 1);
    }
    function O() {
      const n = `custom_${Date.now()}`;
      l.value.push({
        id: n,
        title: "New Custom Action",
        description: "Custom adaptation rule",
        prompt: "Adapt this recipe to..."
      });
    }
    async function Z() {
      g.value = !0, d.value = "";
      try {
        const [n] = await Promise.all([
          r.api.put("/api/x/core-recipe-magic/actions", l.value),
          r.api.put("/api/plugins/core-recipe-magic/config", {
            actions: l.value,
            adapt_model_key: y.value
          })
        ]);
        Array.isArray(n) && (l.value = n), r.notify({ level: "success", message: "Magic actions saved" });
      } catch (n) {
        d.value = (n == null ? void 0 : n.message) || "Failed to save actions";
      } finally {
        g.value = !1;
      }
    }
    async function z() {
      g.value = !0, d.value = "";
      try {
        l.value = await r.api.post("/api/x/core-recipe-magic/actions/reset"), r.notify({ level: "success", message: "Reset actions to Ottolenghi SIMPLE defaults" });
      } catch (n) {
        d.value = (n == null ? void 0 : n.message) || "Failed to reset actions";
      } finally {
        g.value = !1;
      }
    }
    return Q(() => {
      V();
    }), (n, m) => {
      const o = h("Button"), e = h("Message"), b = h("Select"), $ = h("ProgressSpinner"), N = h("InputText"), P = h("Textarea");
      return v(), f("div", Ve, [
        t("div", xe, [
          m[1] || (m[1] = t(
            "div",
            null,
            [
              t("h4", { class: "settings-title" }, "Magic Actions & Prompts"),
              t("p", { class: "subtitle" }, "Configure Ottolenghi SIMPLE actions or create custom recipe transformation prompts.")
            ],
            -1
            /* CACHED */
          )),
          t("div", Ae, [
            u(o, {
              label: "Reset to Defaults",
              icon: "pi pi-refresh",
              severity: "secondary",
              size: "small",
              outlined: "",
              class: "btn-reset-actions",
              disabled: p.value || g.value,
              onClick: z
            }, null, 8, ["disabled"]),
            u(o, {
              label: "Add Action",
              icon: "pi pi-plus",
              size: "small",
              class: "btn-add-action",
              disabled: p.value || g.value,
              onClick: O
            }, null, 8, ["disabled"])
          ])
        ]),
        d.value ? (v(), F(e, {
          key: 0,
          severity: "error"
        }, {
          default: U(() => [
            W(
              S(d.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        t("div", Ce, [
          m[2] || (m[2] = t(
            "label",
            { for: "magic-adapt-model-key" },
            "Recipe adaptation model key",
            -1
            /* CACHED */
          )),
          u(b, {
            id: "magic-adapt-model-key",
            inputId: "magic-adapt-model-key",
            "aria-label": "Recipe adaptation model key",
            modelValue: y.value,
            "onUpdate:modelValue": m[0] || (m[0] = (k) => y.value = k),
            options: s(y.value),
            optionLabel: "label",
            optionValue: "value",
            fluid: ""
          }, null, 8, ["modelValue", "options"])
        ]),
        p.value ? (v(), f("div", Me, [
          u($, { style: { width: "2rem", height: "2rem" } })
        ])) : (v(), f("div", Se, [
          (v(!0), f(
            B,
            null,
            D(l.value, (k, I) => (v(), f("div", {
              key: k.id,
              class: "action-card"
            }, [
              t("div", Ie, [
                t("div", $e, [
                  t(
                    "span",
                    Ue,
                    "#" + S(I + 1),
                    1
                    /* TEXT */
                  ),
                  u(N, {
                    modelValue: k.title,
                    "onUpdate:modelValue": (C) => k.title = C,
                    placeholder: "Action Title",
                    class: "title-input",
                    size: "small",
                    fluid: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", Be, [
                  u(o, {
                    icon: "pi pi-arrow-up",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-up",
                    "aria-label": "Move up",
                    disabled: I === 0,
                    onClick: (C) => a(I, -1)
                  }, null, 8, ["disabled", "onClick"]),
                  u(o, {
                    icon: "pi pi-arrow-down",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-down",
                    "aria-label": "Move down",
                    disabled: I === l.value.length - 1,
                    onClick: (C) => a(I, 1)
                  }, null, 8, ["disabled", "onClick"]),
                  u(o, {
                    icon: "pi pi-trash",
                    text: "",
                    rounded: "",
                    size: "small",
                    severity: "danger",
                    class: "btn-remove-action",
                    "aria-label": "Remove action",
                    disabled: l.value.length <= 1,
                    onClick: (C) => M(I)
                  }, null, 8, ["disabled", "onClick"])
                ])
              ]),
              t("div", ze, [
                t("div", Te, [
                  m[3] || (m[3] = t(
                    "label",
                    null,
                    "Description",
                    -1
                    /* CACHED */
                  )),
                  u(N, {
                    modelValue: k.description,
                    "onUpdate:modelValue": (C) => k.description = C,
                    placeholder: "Brief explanation shown on card",
                    fluid: "",
                    size: "small"
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", Pe, [
                  m[4] || (m[4] = t(
                    "label",
                    null,
                    "AI Prompt Instructions",
                    -1
                    /* CACHED */
                  )),
                  u(P, {
                    modelValue: k.prompt,
                    "onUpdate:modelValue": (C) => k.prompt = C,
                    placeholder: "Instruction given to AI...",
                    rows: "3",
                    fluid: "",
                    autoResize: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ])
              ])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])),
        t("div", De, [
          u(o, {
            label: "Save Actions",
            icon: "pi pi-check",
            size: "small",
            class: "btn-save-settings",
            loading: g.value,
            disabled: p.value || !l.value.length,
            onClick: Z
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), Re = /* @__PURE__ */ L(Ne, [["__scopeId", "data-v-a75cef13"]]), Ee = {
  key: 0,
  class: "magic-inline-settings"
}, Fe = /* @__PURE__ */ q({
  inheritAttrs: !1,
  __name: "MagicPluginSettings",
  props: {
    context: {}
  },
  setup(_) {
    const r = w(!1);
    function l() {
      r.value = !r.value;
    }
    return (y, c) => {
      var g, d, s, V, a, M;
      const p = h("Button");
      return ((d = (g = _.context) == null ? void 0 : g.plugin) == null ? void 0 : d.id) === "core-recipe-magic" ? (v(), f(
        B,
        { key: 0 },
        [
          u(p, {
            label: r.value ? "Close Settings" : "Settings",
            icon: r.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !r.value,
            disabled: ((V = (s = _.context) == null ? void 0 : s.plugin) == null ? void 0 : V.state) !== "active",
            class: "btn-magic-settings-toggle",
            onClick: l
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          r.value && ((M = (a = _.context) == null ? void 0 : a.plugin) == null ? void 0 : M.state) === "active" ? (v(), f("div", Ee, [
            u(Re)
          ])) : A("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : A("v-if", !0);
    };
  }
}), qe = /* @__PURE__ */ L(Fe, [["__scopeId", "data-v-7fee8a14"]]);
function Ze(_) {
  _.slot("recipe.edit.actions", we, { order: 10 }), _.slot("plugin_manager.plugin.actions", qe, { order: 10 });
}
export {
  qe as MagicPluginSettings,
  Re as MagicSettings,
  we as MagicWandButton,
  Ze as default
};
