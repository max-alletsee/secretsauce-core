import { defineComponent as E, ref as C, watch as J, computed as W, resolveComponent as h, openBlock as u, createBlock as R, withCtx as $, createElementVNode as t, createCommentVNode as x, createElementBlock as m, Fragment as U, renderList as T, normalizeClass as L, toDisplayString as I, createTextVNode as O, createVNode as s, onMounted as K } from "vue";
import { useSecretSauce as j } from "@secretsauce/ui";
function P(g) {
  return (g || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function Q(g = [], c = []) {
  const n = /* @__PURE__ */ new Map();
  g.forEach((i) => {
    n.set(P(i.name), i);
  });
  const f = /* @__PURE__ */ new Map();
  c.forEach((i) => {
    f.set(P(i.name), i);
  });
  const a = [], d = [], y = [], r = [];
  for (const i of c) {
    const k = P(i.name), l = n.get(k);
    l ? l.quantity !== i.quantity || l.unit !== i.unit || (l.notes || "") !== (i.notes || "") ? y.push(i) : r.push(i) : a.push(i);
  }
  for (const i of g) {
    const k = P(i.name);
    f.has(k) || d.push(i);
  }
  return { added: a, removed: d, modified: y, unchanged: r };
}
const X = { class: "dialog-content" }, Y = { class: "action-picker" }, ee = { class: "action-grid" }, te = ["disabled", "onClick"], ne = { key: 0 }, le = {
  key: 2,
  class: "loading-state"
}, ae = { class: "preview-area" }, oe = { class: "adaptation-summary" }, ie = { class: "meta-row" }, se = { class: "form-group" }, de = { class: "form-group" }, ue = { class: "form-group" }, ce = { class: "form-group" }, re = { class: "diff-grid" }, pe = { class: "diff-pane original-pane" }, ve = { class: "diff-pane adapted-pane" }, me = { class: "ing-edit-row" }, ge = { class: "steps-preview" }, fe = { class: "dialog-actions" }, _e = {
  key: 0,
  class: "commit-actions"
}, ye = /* @__PURE__ */ E({
  inheritAttrs: !1,
  __name: "MagicWandDialog",
  props: {
    visible: { type: Boolean },
    context: {}
  },
  emits: ["update:visible", "resolved"],
  setup(g, { emit: c }) {
    const n = g, f = c, a = j(), d = C([]), y = C(""), r = C(!1), i = C(""), k = C(!1), l = C(null);
    J(
      () => n.visible,
      async (_) => {
        if (_) {
          i.value = "", k.value = !1, l.value = null, y.value = "";
          try {
            d.value = await a.api.get("/api/x/core-recipe-magic/actions");
          } catch (e) {
            i.value = (e == null ? void 0 : e.message) || "Failed to load actions";
          }
        }
      },
      { immediate: !0 }
    );
    const S = W(() => {
      var _, e;
      return l.value ? Q(
        ((_ = n.context.recipe) == null ? void 0 : _.ingredients) || [],
        ((e = l.value) == null ? void 0 : e.ingredients) || []
      ) : { added: [], removed: [], modified: [], unchanged: [] };
    });
    async function v(_) {
      y.value = _.id, r.value = !0, i.value = "", k.value = !1, l.value = null;
      try {
        const e = {
          action_id: _.id,
          recipe: n.context.recipe
        }, p = await a.api.post("/api/x/core-recipe-magic/adapt", e);
        l.value = p;
      } catch (e) {
        (e == null ? void 0 : e.code) === "unavailable" || (e == null ? void 0 : e.status) === 503 ? k.value = !0 : i.value = (e == null ? void 0 : e.message) || "Adaptation failed";
      } finally {
        r.value = !1;
      }
    }
    function A() {
      var _;
      b(), (_ = a.navigate) == null || _.call(a, "/settings?section=core-ai-provider");
    }
    function b() {
      f("update:visible", !1);
    }
    function z() {
      l.value && (n.context.applyAdaptation(l.value), a.notify({ level: "success", message: "Recipe adapted" }), f("resolved", l.value), b());
    }
    async function F() {
      var _, e;
      if (!(!l.value || r.value)) {
        r.value = !0, i.value = "";
        try {
          const p = {
            ...l.value,
            language: ((_ = n.context.recipe) == null ? void 0 : _.language) || "en"
          };
          delete p.id, delete p.adaptation_summary;
          const V = await a.api.post("/api/recipes", p);
          a.notify({ level: "success", message: "Saved as new recipe variation" }), f("resolved", V), b(), (e = a.navigate) == null || e.call(a, `/recipes/${V.id}`);
        } catch (p) {
          i.value = (p == null ? void 0 : p.message) || "Failed to save new recipe";
        } finally {
          r.value = !1;
        }
      }
    }
    return (_, e) => {
      const p = h("Button"), V = h("Message"), M = h("ProgressSpinner"), Z = h("InputText"), D = h("InputNumber"), G = h("Textarea"), H = h("Dialog");
      return u(), R(H, {
        visible: n.visible,
        modal: "",
        "append-to": "self",
        class: "magic-wand-dialog",
        style: { width: "min(54rem, 95vw)" },
        "onUpdate:visible": e[4] || (e[4] = (N) => f("update:visible", N))
      }, {
        header: $(() => [...e[5] || (e[5] = [
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
        footer: $(() => [
          t("div", fe, [
            s(p, {
              label: "Cancel",
              severity: "secondary",
              disabled: r.value,
              onClick: b
            }, null, 8, ["disabled"]),
            l.value ? (u(), m("div", _e, [
              s(p, {
                label: "Save as New Recipe",
                icon: "pi pi-copy",
                class: "btn-save-fork",
                outlined: "",
                loading: r.value,
                onClick: F
              }, null, 8, ["loading"]),
              s(p, {
                label: "Apply to Editor",
                icon: "pi pi-check",
                class: "btn-apply-editor",
                loading: r.value,
                onClick: z
              }, null, 8, ["loading"])
            ])) : x("v-if", !0)
          ])
        ]),
        default: $(() => {
          var N;
          return [
            t("div", X, [
              x(" Action Selection "),
              t("div", Y, [
                e[6] || (e[6] = t(
                  "label",
                  null,
                  "Select Transformation",
                  -1
                  /* CACHED */
                )),
                t("div", ee, [
                  (u(!0), m(
                    U,
                    null,
                    T(d.value, (o) => (u(), m("button", {
                      key: o.id,
                      type: "button",
                      class: L(["action-chip", { active: y.value === o.id }]),
                      disabled: r.value,
                      onClick: (B) => v(o)
                    }, [
                      t(
                        "strong",
                        null,
                        I(o.title),
                        1
                        /* TEXT */
                      ),
                      o.description ? (u(), m(
                        "small",
                        ne,
                        I(o.description),
                        1
                        /* TEXT */
                      )) : x("v-if", !0)
                    ], 10, te))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              k.value ? (u(), R(V, {
                key: 0,
                severity: "warn"
              }, {
                default: $(() => [
                  e[7] || (e[7] = O(
                    " AI isn’t set up yet. ",
                    -1
                    /* CACHED */
                  )),
                  s(p, {
                    label: "Open AI settings",
                    severity: "secondary",
                    size: "small",
                    onClick: A
                  })
                ]),
                _: 1
                /* STABLE */
              })) : i.value ? (u(), R(V, {
                key: 1,
                severity: "error"
              }, {
                default: $(() => [
                  O(
                    I(i.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : x("v-if", !0),
              x(" Loading State "),
              r.value ? (u(), m("div", le, [
                s(M, { style: { width: "2.5rem", height: "2.5rem" } }),
                e[8] || (e[8] = t(
                  "p",
                  null,
                  "Adapting recipe with AI…",
                  -1
                  /* CACHED */
                ))
              ])) : l.value ? (u(), m(
                U,
                { key: 3 },
                [
                  x(" Transformed Result & Diff "),
                  t("div", ae, [
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
                          I(l.value.adaptation_summary),
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
                        s(Z, {
                          modelValue: l.value.title,
                          "onUpdate:modelValue": e[0] || (e[0] = (o) => l.value.title = o),
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
                        s(D, {
                          modelValue: l.value.servings,
                          "onUpdate:modelValue": e[1] || (e[1] = (o) => l.value.servings = o),
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
                        s(D, {
                          modelValue: l.value.prep_time_minutes,
                          "onUpdate:modelValue": e[2] || (e[2] = (o) => l.value.prep_time_minutes = o),
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
                        s(D, {
                          modelValue: l.value.cook_time_minutes,
                          "onUpdate:modelValue": e[3] || (e[3] = (o) => l.value.cook_time_minutes = o),
                          min: 0,
                          fluid: ""
                        }, null, 8, ["modelValue"])
                      ])
                    ]),
                    x(" Diff Split "),
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
                          (u(!0), m(
                            U,
                            null,
                            T(((N = n.context.recipe) == null ? void 0 : N.ingredients) || [], (o, B) => (u(), m(
                              "li",
                              {
                                key: B,
                                class: L({ removed: S.value.removed.some((w) => w.name === o.name) })
                              },
                              [
                                t(
                                  "span",
                                  null,
                                  I(o.quantity) + " " + I(o.unit) + " " + I(o.name),
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
                          (u(!0), m(
                            U,
                            null,
                            T(l.value.ingredients || [], (o, B) => (u(), m(
                              "li",
                              {
                                key: B,
                                class: L({
                                  added: S.value.added.some((w) => w.name === o.name),
                                  modified: S.value.modified.some((w) => w.name === o.name)
                                })
                              },
                              [
                                t("div", me, [
                                  s(D, {
                                    modelValue: o.quantity,
                                    "onUpdate:modelValue": (w) => o.quantity = w,
                                    min: 0,
                                    class: "ing-qty"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  s(Z, {
                                    modelValue: o.unit,
                                    "onUpdate:modelValue": (w) => o.unit = w,
                                    class: "ing-unit",
                                    placeholder: "unit"
                                  }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                                  s(Z, {
                                    modelValue: o.name,
                                    "onUpdate:modelValue": (w) => o.name = w,
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
                    x(" Steps preview "),
                    t("div", ge, [
                      e[17] || (e[17] = t(
                        "h4",
                        null,
                        "Adapted Steps",
                        -1
                        /* CACHED */
                      )),
                      t("ol", null, [
                        (u(!0), m(
                          U,
                          null,
                          T(l.value.steps || [], (o, B) => (u(), m("li", { key: B }, [
                            s(G, {
                              modelValue: o.instruction,
                              "onUpdate:modelValue": (w) => o.instruction = w,
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
              )) : x("v-if", !0)
            ])
          ];
        }),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), q = (g, c) => {
  const n = g.__vccOpts || g;
  for (const [f, a] of c)
    n[f] = a;
  return n;
}, be = /* @__PURE__ */ q(ye, [["__scopeId", "data-v-56cd1e93"]]), he = { class: "magic-wand-trigger-container" }, ke = /* @__PURE__ */ E({
  __name: "MagicWandButton",
  props: {
    context: {}
  },
  setup(g) {
    const c = g, n = C(!1), f = W(() => {
      var d, y;
      const a = (d = c.context) == null ? void 0 : d.recipe;
      return !!(a && ((y = a.title) != null && y.trim() || a.ingredients && a.ingredients.length > 0));
    });
    return (a, d) => {
      const y = h("Button");
      return u(), m("div", he, [
        s(y, {
          label: "Make it Magic",
          class: "btn-make-it-magic",
          outlined: "",
          disabled: !f.value,
          onClick: d[0] || (d[0] = (r) => n.value = !0)
        }, {
          icon: $(() => [...d[2] || (d[2] = [
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
          "onUpdate:visible": d[1] || (d[1] = (r) => n.value = r),
          context: c.context
        }, null, 8, ["visible", "context"])
      ]);
    };
  }
}), we = /* @__PURE__ */ q(ke, [["__scopeId", "data-v-62945de9"]]), Ve = { class: "magic-settings" }, xe = { class: "settings-header" }, Ce = { class: "header-actions" }, Ae = {
  key: 1,
  class: "loading-state"
}, Me = {
  key: 2,
  class: "actions-list"
}, Se = { class: "card-header" }, Ie = { class: "card-title-group" }, $e = { class: "index-badge" }, Ue = { class: "card-tools" }, Be = { class: "card-body" }, ze = { class: "form-group" }, Te = { class: "form-group" }, De = { class: "footer-actions" }, Ne = /* @__PURE__ */ E({
  __name: "MagicSettings",
  setup(g) {
    const c = j(), n = C([]), f = C(!1), a = C(!1), d = C("");
    async function y() {
      f.value = !0, d.value = "";
      try {
        n.value = await c.api.get("/api/x/core-recipe-magic/actions");
      } catch (v) {
        d.value = (v == null ? void 0 : v.message) || "Failed to load actions";
      } finally {
        f.value = !1;
      }
    }
    function r(v, A) {
      const b = v + A;
      if (b < 0 || b >= n.value.length) return;
      const z = n.value.splice(v, 1)[0];
      n.value.splice(b, 0, z);
    }
    function i(v) {
      n.value.splice(v, 1);
    }
    function k() {
      const v = `custom_${Date.now()}`;
      n.value.push({
        id: v,
        title: "New Custom Action",
        description: "Custom adaptation rule",
        prompt: "Adapt this recipe to..."
      });
    }
    async function l() {
      a.value = !0, d.value = "";
      try {
        n.value = await c.api.put("/api/x/core-recipe-magic/actions", n.value), c.notify({ level: "success", message: "Magic actions saved" });
      } catch (v) {
        d.value = (v == null ? void 0 : v.message) || "Failed to save actions";
      } finally {
        a.value = !1;
      }
    }
    async function S() {
      a.value = !0, d.value = "";
      try {
        n.value = await c.api.post("/api/x/core-recipe-magic/actions/reset"), c.notify({ level: "success", message: "Reset actions to Ottolenghi SIMPLE defaults" });
      } catch (v) {
        d.value = (v == null ? void 0 : v.message) || "Failed to reset actions";
      } finally {
        a.value = !1;
      }
    }
    return K(() => {
      y();
    }), (v, A) => {
      const b = h("Button"), z = h("Message"), F = h("ProgressSpinner"), _ = h("InputText"), e = h("Textarea");
      return u(), m("div", Ve, [
        t("div", xe, [
          A[0] || (A[0] = t(
            "div",
            null,
            [
              t("h4", { class: "settings-title" }, "Magic Actions & Prompts"),
              t("p", { class: "subtitle" }, "Configure Ottolenghi SIMPLE actions or create custom recipe transformation prompts.")
            ],
            -1
            /* CACHED */
          )),
          t("div", Ce, [
            s(b, {
              label: "Reset to Defaults",
              icon: "pi pi-refresh",
              severity: "secondary",
              size: "small",
              outlined: "",
              class: "btn-reset-actions",
              disabled: f.value || a.value,
              onClick: S
            }, null, 8, ["disabled"]),
            s(b, {
              label: "Add Action",
              icon: "pi pi-plus",
              size: "small",
              class: "btn-add-action",
              disabled: f.value || a.value,
              onClick: k
            }, null, 8, ["disabled"])
          ])
        ]),
        d.value ? (u(), R(z, {
          key: 0,
          severity: "error"
        }, {
          default: $(() => [
            O(
              I(d.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        f.value ? (u(), m("div", Ae, [
          s(F, { style: { width: "2rem", height: "2rem" } })
        ])) : (u(), m("div", Me, [
          (u(!0), m(
            U,
            null,
            T(n.value, (p, V) => (u(), m("div", {
              key: p.id,
              class: "action-card"
            }, [
              t("div", Se, [
                t("div", Ie, [
                  t(
                    "span",
                    $e,
                    "#" + I(V + 1),
                    1
                    /* TEXT */
                  ),
                  s(_, {
                    modelValue: p.title,
                    "onUpdate:modelValue": (M) => p.title = M,
                    placeholder: "Action Title",
                    class: "title-input",
                    size: "small",
                    fluid: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", Ue, [
                  s(b, {
                    icon: "pi pi-arrow-up",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-up",
                    "aria-label": "Move up",
                    disabled: V === 0,
                    onClick: (M) => r(V, -1)
                  }, null, 8, ["disabled", "onClick"]),
                  s(b, {
                    icon: "pi pi-arrow-down",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-down",
                    "aria-label": "Move down",
                    disabled: V === n.value.length - 1,
                    onClick: (M) => r(V, 1)
                  }, null, 8, ["disabled", "onClick"]),
                  s(b, {
                    icon: "pi pi-trash",
                    text: "",
                    rounded: "",
                    size: "small",
                    severity: "danger",
                    class: "btn-remove-action",
                    "aria-label": "Remove action",
                    disabled: n.value.length <= 1,
                    onClick: (M) => i(V)
                  }, null, 8, ["disabled", "onClick"])
                ])
              ]),
              t("div", Be, [
                t("div", ze, [
                  A[1] || (A[1] = t(
                    "label",
                    null,
                    "Description",
                    -1
                    /* CACHED */
                  )),
                  s(_, {
                    modelValue: p.description,
                    "onUpdate:modelValue": (M) => p.description = M,
                    placeholder: "Brief explanation shown on card",
                    fluid: "",
                    size: "small"
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                t("div", Te, [
                  A[2] || (A[2] = t(
                    "label",
                    null,
                    "AI Prompt Instructions",
                    -1
                    /* CACHED */
                  )),
                  s(e, {
                    modelValue: p.prompt,
                    "onUpdate:modelValue": (M) => p.prompt = M,
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
          s(b, {
            label: "Save Actions",
            icon: "pi pi-check",
            size: "small",
            class: "btn-save-settings",
            loading: a.value,
            disabled: f.value || !n.value.length,
            onClick: l
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), Pe = /* @__PURE__ */ q(Ne, [["__scopeId", "data-v-556db475"]]), Re = {
  key: 0,
  class: "magic-inline-settings"
}, Ee = /* @__PURE__ */ E({
  __name: "MagicPluginSettings",
  props: {
    context: {}
  },
  setup(g) {
    const c = C(!1);
    function n() {
      c.value = !c.value;
    }
    return (f, a) => {
      var y, r, i, k, l, S;
      const d = h("Button");
      return ((r = (y = g.context) == null ? void 0 : y.plugin) == null ? void 0 : r.id) === "core-recipe-magic" ? (u(), m(
        U,
        { key: 0 },
        [
          s(d, {
            label: c.value ? "Close Settings" : "Settings",
            icon: c.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !c.value,
            disabled: ((k = (i = g.context) == null ? void 0 : i.plugin) == null ? void 0 : k.state) !== "active",
            class: "btn-magic-settings-toggle",
            onClick: n
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          c.value && ((S = (l = g.context) == null ? void 0 : l.plugin) == null ? void 0 : S.state) === "active" ? (u(), m("div", Re, [
            s(Pe)
          ])) : x("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : x("v-if", !0);
    };
  }
}), qe = /* @__PURE__ */ q(Ee, [["__scopeId", "data-v-3957efc7"]]);
function Le(g) {
  g.slot("recipe.edit.actions", we, { order: 10 }), g.slot("plugin_manager.plugin.actions", qe, { order: 10 });
}
export {
  qe as MagicPluginSettings,
  Pe as MagicSettings,
  we as MagicWandButton,
  Le as default
};
