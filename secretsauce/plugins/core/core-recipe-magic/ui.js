import { defineComponent as L, ref as V, watch as J, computed as W, resolveComponent as k, openBlock as r, createBlock as E, withCtx as S, createElementVNode as t, createCommentVNode as I, createElementBlock as m, Fragment as B, renderList as D, normalizeClass as F, toDisplayString as M, createTextVNode as Z, createVNode as s, onMounted as K } from "vue";
import { useSecretSauce as j } from "@secretsauce/ui";
function R(f) {
  return (f || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function Q(f = [], _ = []) {
  const n = /* @__PURE__ */ new Map();
  f.forEach((i) => {
    n.set(R(i.name), i);
  });
  const v = /* @__PURE__ */ new Map();
  _.forEach((i) => {
    v.set(R(i.name), i);
  });
  const o = [], d = [], b = [], p = [];
  for (const i of _) {
    const x = R(i.name), a = n.get(x);
    a ? a.quantity !== i.quantity || a.unit !== i.unit || (a.notes || "") !== (i.notes || "") ? b.push(i) : p.push(i) : o.push(i);
  }
  for (const i of f) {
    const x = R(i.name);
    v.has(x) || d.push(i);
  }
  return { added: o, removed: d, modified: b, unchanged: p };
}
const X = { class: "dialog-content" }, Y = { class: "action-picker" }, ee = { class: "action-grid" }, te = ["disabled", "onClick"], ne = { key: 0 }, le = {
  key: 2,
  class: "loading-state"
}, oe = { class: "preview-area" }, ae = { class: "adaptation-summary" }, ie = { class: "meta-row" }, se = { class: "form-group" }, de = { class: "form-group" }, ue = { class: "form-group" }, re = { class: "form-group" }, ce = { class: "diff-grid" }, pe = { class: "diff-pane original-pane" }, ve = { class: "diff-pane adapted-pane" }, me = { class: "ing-edit-row" }, ge = { class: "steps-preview" }, fe = { class: "dialog-actions" }, _e = {
  key: 0,
  class: "commit-actions"
}, ye = /* @__PURE__ */ L({
  inheritAttrs: !1,
  __name: "MagicWandDialog",
  props: {
    visible: { type: Boolean },
    context: {}
  },
  emits: ["update:visible", "resolved"],
  setup(f, { emit: _ }) {
    const n = f, v = _, o = j(), d = V([]), b = V(""), p = V(!1), i = V(""), x = V(!1), a = V(null);
    J(
      () => n.visible,
      async (g) => {
        if (g) {
          i.value = "", x.value = !1, a.value = null, b.value = "";
          try {
            d.value = await o.api.get("/api/x/core-recipe-magic/actions");
          } catch (e) {
            i.value = (e == null ? void 0 : e.message) || "Failed to load actions";
          }
        }
      },
      { immediate: !0 }
    );
    const $ = W(() => {
      var g, e;
      return a.value ? Q(
        ((g = n.context.recipe) == null ? void 0 : g.ingredients) || [],
        ((e = a.value) == null ? void 0 : e.ingredients) || []
      ) : { added: [], removed: [], modified: [], unchanged: [] };
    });
    async function c(g) {
      b.value = g.id, p.value = !0, i.value = "", x.value = !1, a.value = null;
      try {
        const e = {
          action_id: g.id,
          recipe: n.context.recipe
        }, u = await o.api.post("/api/x/core-recipe-magic/adapt", e);
        a.value = u;
      } catch (e) {
        (e == null ? void 0 : e.code) === "unavailable" || (e == null ? void 0 : e.status) === 503 ? x.value = !0 : i.value = (e == null ? void 0 : e.message) || "Adaptation failed";
      } finally {
        p.value = !1;
      }
    }
    function A() {
      var g;
      y(), (g = o.navigate) == null || g.call(o, "/settings?section=core-ai-provider");
    }
    function y() {
      v("update:visible", !1);
    }
    function T() {
      a.value && (n.context.applyAdaptation(a.value), o.notify({ level: "success", message: "Recipe adapted" }), v("resolved", a.value), y());
    }
    async function z() {
      var g, e;
      if (!(!a.value || p.value)) {
        p.value = !0, i.value = "";
        try {
          const u = {
            ...a.value,
            language: ((g = n.context.recipe) == null ? void 0 : g.language) || "en"
          };
          delete u.id, delete u.adaptation_summary;
          const w = await o.api.post("/api/recipes", u);
          o.notify({ level: "success", message: "Saved as new recipe variation" }), v("resolved", w), y(), (e = o.navigate) == null || e.call(o, `/recipes/${w.id}`);
        } catch (u) {
          i.value = (u == null ? void 0 : u.message) || "Failed to save new recipe";
        } finally {
          p.value = !1;
        }
      }
    }
    return (g, e) => {
      const u = k("Button"), w = k("Message"), C = k("ProgressSpinner"), q = k("InputText"), N = k("InputNumber"), G = k("Textarea"), H = k("Dialog");
      return r(), E(H, {
        visible: n.visible,
        modal: "",
        "append-to": "self",
        class: "magic-wand-dialog",
        style: { width: "min(54rem, 95vw)" },
        "onUpdate:visible": e[4] || (e[4] = (P) => v("update:visible", P))
      }, {
        header: S(() => [...e[5] || (e[5] = [
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
        footer: S(() => [
          t("div", fe, [
            s(u, {
              label: "Cancel",
              severity: "secondary",
              disabled: p.value,
              onClick: y
            }, null, 8, ["disabled"]),
            a.value ? (r(), m("div", _e, [
              s(u, {
                label: "Save as New Recipe",
                icon: "pi pi-copy",
                class: "btn-save-fork",
                outlined: "",
                loading: p.value,
                onClick: z
              }, null, 8, ["loading"]),
              s(u, {
                label: "Apply to Editor",
                icon: "pi pi-check",
                class: "btn-apply-editor",
                loading: p.value,
                onClick: T
              }, null, 8, ["loading"])
            ])) : I("v-if", !0)
          ])
        ]),
        default: S(() => {
          var P;
          return [
            t("div", X, [
              I(" Action Selection "),
              t("div", Y, [
                e[6] || (e[6] = t(
                  "label",
                  null,
                  "Select Transformation",
                  -1
                  /* CACHED */
                )),
                t("div", ee, [
                  (r(!0), m(
                    B,
                    null,
                    D(d.value, (l) => (r(), m("button", {
                      key: l.id,
                      type: "button",
                      class: F(["action-chip", { active: b.value === l.id }]),
                      disabled: p.value,
                      onClick: (U) => c(l)
                    }, [
                      t(
                        "strong",
                        null,
                        M(l.title),
                        1
                        /* TEXT */
                      ),
                      l.description ? (r(), m(
                        "small",
                        ne,
                        M(l.description),
                        1
                        /* TEXT */
                      )) : I("v-if", !0)
                    ], 10, te))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              x.value ? (r(), E(w, {
                key: 0,
                severity: "warn"
              }, {
                default: S(() => [
                  e[7] || (e[7] = Z(
                    " AI isn’t set up yet. ",
                    -1
                    /* CACHED */
                  )),
                  s(u, {
                    label: "Open AI settings",
                    severity: "secondary",
                    size: "small",
                    onClick: A
                  })
                ]),
                _: 1
                /* STABLE */
              })) : i.value ? (r(), E(w, {
                key: 1,
                severity: "error"
              }, {
                default: S(() => [
                  Z(
                    M(i.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : I("v-if", !0),
              I(" Loading State "),
              p.value ? (r(), m("div", le, [
                s(C, { style: { width: "2.5rem", height: "2.5rem" } }),
                e[8] || (e[8] = t(
                  "p",
                  null,
                  "Adapting recipe with AI…",
                  -1
                  /* CACHED */
                ))
              ])) : a.value ? (r(), m(
                B,
                { key: 3 },
                [
                  I(" Transformed Result & Diff "),
                  t("div", oe, [
                    t("div", ae, [
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
                          M(a.value.adaptation_summary),
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
                        s(q, {
                          modelValue: a.value.title,
                          "onUpdate:modelValue": e[0] || (e[0] = (l) => a.value.title = l),
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
                        s(N, {
                          modelValue: a.value.servings,
                          "onUpdate:modelValue": e[1] || (e[1] = (l) => a.value.servings = l),
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
                        s(N, {
                          modelValue: a.value.prep_time_minutes,
                          "onUpdate:modelValue": e[2] || (e[2] = (l) => a.value.prep_time_minutes = l),
                          min: 0,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ]),
                      t("div", re, [
                        e[14] || (e[14] = t(
                          "label",
                          null,
                          "Cook (min)",
                          -1
                          /* CACHED */
                        )),
                        s(N, {
                          modelValue: a.value.cook_time_minutes,
                          "onUpdate:modelValue": e[3] || (e[3] = (l) => a.value.cook_time_minutes = l),
                          min: 0,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ])
                    ]),
                    I(" Diff Split "),
                    t("div", ce, [
                      t("div", pe, [
                        e[15] || (e[15] = t(
                          "h4",
                          null,
                          "Original Ingredients",
                          -1
                          /* CACHED */
                        )),
                        t("ul", null, [
                          (r(!0), m(
                            B,
                            null,
                            D(((P = n.context.recipe) == null ? void 0 : P.ingredients) || [], (l, U) => (r(), m(
                              "li",
                              {
                                key: U,
                                class: F({ removed: $.value.removed.some((h) => h.name === l.name) })
                              },
                              [
                                t(
                                  "span",
                                  null,
                                  M(l.quantity) + " " + M(l.unit) + " " + M(l.name),
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
                          (r(!0), m(
                            B,
                            null,
                            D(a.value.ingredients || [], (l, U) => (r(), m(
                              "li",
                              {
                                key: U,
                                class: F({
                                  added: $.value.added.some((h) => h.name === l.name),
                                  modified: $.value.modified.some((h) => h.name === l.name)
                                })
                              },
                              [
                                t("div", me, [
                                  s(N, {
                                    modelValue: l.quantity,
                                    "onUpdate:modelValue": (h) => l.quantity = h,
                                    min: 0,
                                    class: "ing-qty"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  s(q, {
                                    modelValue: l.unit,
                                    "onUpdate:modelValue": (h) => l.unit = h,
                                    class: "ing-unit",
                                    placeholder: "unit"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  s(q, {
                                    modelValue: l.name,
                                    "onUpdate:modelValue": (h) => l.name = h,
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
                    I(" Steps preview "),
                    t("div", ge, [
                      e[17] || (e[17] = t(
                        "h4",
                        null,
                        "Adapted Steps",
                        -1
                        /* CACHED */
                      )),
                      t("ol", null, [
                        (r(!0), m(
                          B,
                          null,
                          D(a.value.steps || [], (l, U) => (r(), m("li", { key: U }, [
                            s(G, {
                              modelValue: l.instruction,
                              "onUpdate:modelValue": (h) => l.instruction = h,
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
              )) : I("v-if", !0)
            ])
          ];
        }),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), O = (f, _) => {
  const n = f.__vccOpts || f;
  for (const [v, o] of _)
    n[v] = o;
  return n;
}, be = /* @__PURE__ */ O(ye, [["__scopeId", "data-v-038b39bf"]]), he = { class: "magic-wand-trigger-container" }, ke = /* @__PURE__ */ L({
  __name: "MagicWandButton",
  props: {
    context: {}
  },
  setup(f) {
    const _ = f, n = V(!1), v = W(() => {
      var d, b;
      const o = (d = _.context) == null ? void 0 : d.recipe;
      return !!(o && ((b = o.title) != null && b.trim() || o.ingredients && o.ingredients.length > 0));
    });
    return (o, d) => {
      const b = k("Button");
      return r(), m("div", he, [
        s(b, {
          label: "Make it Magic",
          class: "btn-make-it-magic",
          outlined: "",
          disabled: !v.value,
          onClick: d[0] || (d[0] = (p) => n.value = !0)
        }, {
          icon: S(() => [...d[2] || (d[2] = [
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
        s(be, {
          visible: n.value,
          "onUpdate:visible": d[1] || (d[1] = (p) => n.value = p),
          context: _.context
        }, null, 8, ["visible", "context"])
      ]);
    };
  }
}), we = /* @__PURE__ */ O(ke, [["__scopeId", "data-v-62945de9"]]), Ve = { class: "magic-settings" }, xe = { class: "settings-header" }, Ae = { class: "header-actions" }, Ce = {
  key: 1,
  class: "loading-state"
}, Ie = {
  key: 2,
  class: "actions-list"
}, Me = { class: "card-header" }, Se = { class: "card-title-group" }, $e = { class: "index-badge" }, Ue = { class: "card-tools" }, Be = { class: "card-body" }, Te = { class: "form-group" }, De = { class: "form-group" }, Ne = { class: "footer-actions" }, Pe = /* @__PURE__ */ L({
  __name: "MagicSettings",
  setup(f) {
    const _ = j(), n = V([]), v = V(!1), o = V(!1), d = V("");
    async function b() {
      v.value = !0, d.value = "";
      try {
        n.value = await _.api.get("/api/x/core-recipe-magic/actions");
      } catch (c) {
        d.value = (c == null ? void 0 : c.message) || "Failed to load actions";
      } finally {
        v.value = !1;
      }
    }
    function p(c, A) {
      const y = c + A;
      if (y < 0 || y >= n.value.length) return;
      const T = n.value.splice(c, 1)[0];
      n.value.splice(y, 0, T);
    }
    function i(c) {
      n.value.splice(c, 1);
    }
    function x() {
      const c = `custom_${Date.now()}`;
      n.value.push({
        id: c,
        title: "New Custom Action",
        description: "Custom adaptation rule",
        prompt: "Adapt this recipe to..."
      });
    }
    async function a() {
      o.value = !0, d.value = "";
      try {
        n.value = await _.api.put("/api/x/core-recipe-magic/actions", n.value), _.notify({ level: "success", message: "Magic actions saved" });
      } catch (c) {
        d.value = (c == null ? void 0 : c.message) || "Failed to save actions";
      } finally {
        o.value = !1;
      }
    }
    async function $() {
      o.value = !0, d.value = "";
      try {
        n.value = await _.api.post("/api/x/core-recipe-magic/actions/reset"), _.notify({ level: "success", message: "Reset actions to Ottolenghi SIMPLE defaults" });
      } catch (c) {
        d.value = (c == null ? void 0 : c.message) || "Failed to reset actions";
      } finally {
        o.value = !1;
      }
    }
    return K(() => {
      b();
    }), (c, A) => {
      const y = k("Button"), T = k("Message"), z = k("ProgressSpinner"), g = k("InputText"), e = k("Textarea");
      return r(), m("div", Ve, [
        t("div", xe, [
          A[0] || (A[0] = t(
            "div",
            null,
            [
              t("h3", null, "Magic Actions & Prompts"),
              t("p", { class: "subtitle" }, "Configure Ottolenghi SIMPLE actions or create custom recipe transformation prompts.")
            ],
            -1
            /* CACHED */
          )),
          t("div", Ae, [
            s(y, {
              label: "Reset to Defaults",
              icon: "pi pi-refresh",
              severity: "secondary",
              class: "btn-reset-actions",
              disabled: v.value || o.value,
              onClick: $
            }, null, 8, ["disabled"]),
            s(y, {
              label: "Add Action",
              icon: "pi pi-plus",
              class: "btn-add-action",
              disabled: v.value || o.value,
              onClick: x
            }, null, 8, ["disabled"])
          ])
        ]),
        d.value ? (r(), E(T, {
          key: 0,
          severity: "error"
        }, {
          default: S(() => [
            Z(
              M(d.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : I("v-if", !0),
        v.value ? (r(), m("div", Ce, [
          s(z, { style: { width: "2rem", height: "2rem" } })
        ])) : (r(), m("div", Ie, [
          (r(!0), m(
            B,
            null,
            D(n.value, (u, w) => (r(), m("div", {
              key: u.id,
              class: "action-card"
            }, [
              t("div", Me, [
                t("div", Se, [
                  t(
                    "span",
                    $e,
                    "#" + M(w + 1),
                    1
                    /* TEXT */
                  ),
                  s(g, {
                    modelValue: u.title,
                    "onUpdate:modelValue": (C) => u.title = C,
                    placeholder: "Action Title",
                    class: "title-input"
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", Ue, [
                  s(y, {
                    icon: "pi pi-arrow-up",
                    text: "",
                    size: "small",
                    class: "btn-move-up",
                    disabled: w === 0,
                    onClick: (C) => p(w, -1)
                  }, null, 8, ["disabled", "onClick"]),
                  s(y, {
                    icon: "pi pi-arrow-down",
                    text: "",
                    size: "small",
                    class: "btn-move-down",
                    disabled: w === n.value.length - 1,
                    onClick: (C) => p(w, 1)
                  }, null, 8, ["disabled", "onClick"]),
                  s(y, {
                    icon: "pi pi-trash",
                    text: "",
                    size: "small",
                    severity: "danger",
                    class: "btn-remove-action",
                    disabled: n.value.length <= 1,
                    onClick: (C) => i(w)
                  }, null, 8, ["disabled", "onClick"])
                ])
              ]),
              t("div", Be, [
                t("div", Te, [
                  A[1] || (A[1] = t(
                    "label",
                    null,
                    "Description",
                    -1
                    /* CACHED */
                  )),
                  s(g, {
                    modelValue: u.description,
                    "onUpdate:modelValue": (C) => u.description = C,
                    placeholder: "Brief explanation shown on card",
                    fluid: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", De, [
                  A[2] || (A[2] = t(
                    "label",
                    null,
                    "AI Prompt Instructions",
                    -1
                    /* CACHED */
                  )),
                  s(e, {
                    modelValue: u.prompt,
                    "onUpdate:modelValue": (C) => u.prompt = C,
                    placeholder: "Instruction given to AI...",
                    rows: "3",
                    fluid: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ])
              ])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])),
        t("div", Ne, [
          s(y, {
            label: "Save Actions",
            icon: "pi pi-check",
            class: "btn-save-settings",
            loading: o.value,
            disabled: v.value || !n.value.length,
            onClick: a
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), Re = /* @__PURE__ */ O(Pe, [["__scopeId", "data-v-b0f56a1c"]]);
function qe(f) {
  f.slot("recipe.edit.actions", we, { order: 10 }), f.settings.section({
    id: "core-recipe-magic",
    title: "Recipe Magic",
    component: Re
  });
}
export {
  Re as MagicSettings,
  we as MagicWandButton,
  qe as default
};
