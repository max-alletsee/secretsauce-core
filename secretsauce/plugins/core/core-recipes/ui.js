import { defineComponent as D, openBlock as o, createElementBlock as a, createElementVNode as e, toDisplayString as S, withModifiers as Z, createVNode as x, unref as O, createCommentVNode as A, Fragment as T, renderList as L, inject as P, ref as b, onMounted as F, computed as J, withDirectives as C, vModelText as U, normalizeClass as B, vModelSelect as Q, createBlock as H, watch as z, vModelCheckbox as K } from "vue";
import { Slot as M, IntentTrigger as q } from "@secretsauce/ui";
const X = { class: "cover-image" }, Y = ["src"], ee = {
  key: 1,
  class: "placeholder-cover"
}, te = { class: "card-body" }, ie = { class: "card-header" }, ne = { class: "title" }, le = { class: "meta" }, se = {
  key: 0,
  class: "meta-item"
}, oe = {
  key: 1,
  class: "meta-item"
}, ae = {
  key: 0,
  class: "tags"
}, ue = /* @__PURE__ */ D({
  __name: "RecipeCard",
  props: {
    recipe: {}
  },
  emits: ["select"],
  setup(r, { emit: $ }) {
    const l = r, k = $;
    return (s, _) => {
      var n;
      return o(), a("div", {
        class: "recipe-card",
        onClick: _[1] || (_[1] = (p) => k("select", l.recipe.id))
      }, [
        e("div", X, [
          l.recipe.cover_asset_id ? (o(), a("img", {
            key: 0,
            src: `/api/assets/${l.recipe.cover_asset_id}/file`,
            alt: "Cover"
          }, null, 8, Y)) : (o(), a("div", ee, "🍲"))
        ]),
        e("div", te, [
          e("div", ie, [
            e(
              "h3",
              ne,
              S(l.recipe.title),
              1
              /* TEXT */
            ),
            e("div", {
              class: "actions",
              onClick: _[0] || (_[0] = Z(() => {
              }, ["stop"]))
            }, [
              x(O(M), {
                name: "recipe.card.actions",
                context: { recipe: l.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          e("div", le, [
            l.recipe.prep_time_minutes ? (o(), a(
              "span",
              se,
              "⏱ " + S(l.recipe.prep_time_minutes) + "m prep",
              1
              /* TEXT */
            )) : A("v-if", !0),
            l.recipe.cook_time_minutes ? (o(), a(
              "span",
              oe,
              "🍳 " + S(l.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          (n = l.recipe.tags) != null && n.length ? (o(), a("div", ae, [
            (o(!0), a(
              T,
              null,
              L(l.recipe.tags, (p) => (o(), a(
                "span",
                {
                  key: p,
                  class: "tag"
                },
                S(p),
                1
                /* TEXT */
              ))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : A("v-if", !0)
        ])
      ]);
    };
  }
}), E = (r, $) => {
  const l = r.__vccOpts || r;
  for (const [k, s] of $)
    l[k] = s;
  return l;
}, re = /* @__PURE__ */ E(ue, [["__scopeId", "data-v-ae9aec13"]]), ce = { class: "recipe-list-page" }, de = { class: "intent-header-bar" }, pe = { class: "search-box" }, ve = { class: "intent-area" }, me = { class: "filter-sort-bar" }, _e = {
  key: 0,
  class: "tag-chips"
}, ge = ["onClick"], fe = {
  key: 0,
  class: "recipes-grid"
}, be = {
  key: 1,
  class: "empty-banner"
}, he = /* @__PURE__ */ D({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(r, { emit: $ }) {
    const l = $, k = P("__SS_NAVIGATE__", (m) => {
      window.location.href = m;
    }), s = P("__SS_API__"), _ = b([]), n = b(""), p = b(null), g = b("title");
    function I(m) {
      l("openRecipe", m), k(`/recipes/${m}`);
    }
    const h = b(!1), c = b(/* @__PURE__ */ new Set());
    async function y() {
      if (s)
        try {
          const m = await s.get("/api/x/shortlist"), u = /* @__PURE__ */ new Set();
          if (Array.isArray(m))
            for (const i of m)
              i.recipe_id && u.add(i.recipe_id);
          c.value = u;
        } catch {
        }
    }
    async function V() {
      h.value = !h.value, h.value && await y();
    }
    async function R() {
      if (s)
        try {
          const m = await s.get("/api/recipes", { params: { q: n.value || void 0 } });
          _.value = m.items || [];
        } catch {
        }
    }
    F(() => {
      R(), y();
    });
    const f = J(() => {
      const m = /* @__PURE__ */ new Set();
      for (const u of _.value)
        for (const i of u.tags || []) m.add(i);
      return Array.from(m);
    }), N = J(() => {
      let m = _.value.map((u) => ({
        ...u,
        is_shortlisted: c.value.has(u.id)
      }));
      return h.value && (m = m.filter((u) => c.value.has(u.id))), p.value && (m = m.filter((u) => {
        var i;
        return (i = u.tags) == null ? void 0 : i.includes(p.value);
      })), g.value === "title" ? m.sort((u, i) => u.title.localeCompare(i.title)) : g.value === "prep" && m.sort((u, i) => (u.prep_time_minutes || 0) - (i.prep_time_minutes || 0)), m;
    });
    return (m, u) => (o(), a("div", ce, [
      u[5] || (u[5] = e(
        "h1",
        { class: "page-title" },
        "Recipes",
        -1
        /* CACHED */
      )),
      e("div", de, [
        e("div", pe, [
          C(e(
            "input",
            {
              "onUpdate:modelValue": u[0] || (u[0] = (i) => n.value = i),
              type: "search",
              placeholder: "Search recipes (trigram FTS)...",
              class: "input-search",
              onInput: R
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [U, n.value]
          ])
        ]),
        e("div", ve, [
          x(O(q), {
            hub: "recipe:create",
            label: "+ Add / Import Recipe"
          })
        ])
      ]),
      e("div", me, [
        x(O(M), {
          name: "recipe.list.filters",
          context: { active: h.value, toggle: V }
        }, null, 8, ["context"]),
        f.value.length ? (o(), a("div", _e, [
          (o(!0), a(
            T,
            null,
            L(f.value, (i) => (o(), a("button", {
              key: i,
              class: B(["tag-chip", { active: p.value === i }]),
              onClick: (w) => p.value = p.value === i ? null : i
            }, S(i), 11, ge))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : A("v-if", !0),
        C(e(
          "select",
          {
            "onUpdate:modelValue": u[1] || (u[1] = (i) => g.value = i),
            class: "select-sort"
          },
          [...u[2] || (u[2] = [
            e(
              "option",
              { value: "title" },
              "Title (A-Z)",
              -1
              /* CACHED */
            ),
            e(
              "option",
              { value: "prep" },
              "Prep time",
              -1
              /* CACHED */
            )
          ])],
          512
          /* NEED_PATCH */
        ), [
          [Q, g.value]
        ])
      ]),
      N.value.length ? (o(), a("div", fe, [
        (o(!0), a(
          T,
          null,
          L(N.value, (i) => (o(), H(re, {
            key: i.id,
            recipe: i,
            onSelect: I
          }, null, 8, ["recipe"]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (o(), a("div", be, [
        u[3] || (u[3] = e(
          "h3",
          null,
          "No recipes found",
          -1
          /* CACHED */
        )),
        u[4] || (u[4] = e(
          "p",
          null,
          "Start your household cookbook by adding your first recipe!",
          -1
          /* CACHED */
        )),
        x(O(q), {
          hub: "recipe:create",
          label: "+ Add / Import Recipe"
        })
      ]))
    ]));
  }
}), ye = /* @__PURE__ */ E(he, [["__scopeId", "data-v-6e5e9801"]]), $e = {
  key: 0,
  class: "recipe-detail-page"
}, ke = {
  key: 0,
  class: "lang-bar"
}, we = ["onClick"], Ve = { class: "detail-header" }, Se = { class: "recipe-title" }, Ie = {
  key: 0,
  class: "description"
}, Ce = { class: "detail-actions" }, Re = { class: "scaler-card" }, Ue = { class: "servings-value" }, Ae = { class: "content-grid" }, xe = { class: "ingredients-section" }, Ne = { class: "ingredient-checklist" }, Te = ["onUpdate:modelValue"], Le = { key: 0 }, Oe = {
  key: 1,
  class: "notes"
}, Pe = { class: "steps-section" }, De = { class: "steps-list" }, Ee = { class: "step-text" }, Me = {
  key: 0,
  class: "timer-badge"
}, Je = /* @__PURE__ */ D({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage", "addTranslation"],
  setup(r, { emit: $ }) {
    const l = r, k = $, s = P("__SS_NAVIGATE__", (i) => {
      window.location.href = i;
    }), _ = P("__SS_API__"), n = b(null), p = b(2), g = b({}), I = J(() => {
      if (l.id) return l.id;
      if (l.recipeId) return l.recipeId;
      if (typeof window < "u" && window.location.pathname.startsWith("/recipes/")) {
        const i = window.location.pathname.split("/");
        return i[i.length - 1] || "";
      }
      return "";
    }), h = b(!1);
    async function c() {
      if (!(!_ || !I.value))
        try {
          const i = await _.get("/api/x/shortlist");
          Array.isArray(i) && (h.value = i.some((w) => w.recipe_id === I.value));
        } catch {
        }
    }
    async function y() {
      var i;
      !_ || !I.value || (n.value = await _.get(`/api/recipes/${I.value}`), p.value = ((i = n.value) == null ? void 0 : i.servings) || 2, await c());
    }
    F(y), z(I, () => {
      y();
    });
    function V(i) {
      k("switchLanguage", i), s(`/recipes/${i}`);
    }
    function R() {
      s("/recipes");
    }
    const f = J(() => !n.value || !n.value.servings ? 1 : p.value / n.value.servings);
    function N(i) {
      if (i == null) return "";
      const w = i * f.value;
      return Number.isInteger(w) ? String(w) : w.toFixed(1);
    }
    function m() {
      p.value > 1 && (p.value -= 1);
    }
    function u() {
      p.value += 1;
    }
    return (i, w) => {
      var d;
      return n.value ? (o(), a("div", $e, [
        e("div", { class: "nav-back-bar" }, [
          e("button", {
            type: "button",
            class: "btn-back",
            onClick: R
          }, "← All Recipes")
        ]),
        ((d = n.value.languages) == null ? void 0 : d.length) > 1 ? (o(), a("div", ke, [
          w[1] || (w[1] = e(
            "span",
            { class: "lang-label" },
            "Languages:",
            -1
            /* CACHED */
          )),
          (o(!0), a(
            T,
            null,
            L(n.value.languages, (t) => (o(), a("button", {
              key: t,
              class: B(["lang-tab", { active: t === n.value.language }]),
              onClick: (v) => V(`${n.value.group_id}_${t}`)
            }, S(t.toUpperCase()), 11, we))),
            128
            /* KEYED_FRAGMENT */
          )),
          e("button", {
            class: "btn-add-translation",
            onClick: w[0] || (w[0] = (t) => k("addTranslation", n.value))
          }, "+ Add Translation")
        ])) : A("v-if", !0),
        e("div", Ve, [
          e("div", null, [
            e(
              "h1",
              Se,
              S(n.value.title),
              1
              /* TEXT */
            ),
            n.value.description ? (o(), a(
              "p",
              Ie,
              S(n.value.description),
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          e("div", Ce, [
            x(O(M), {
              name: "recipe.card.actions",
              context: { recipe: n.value, isShortlisted: h.value }
            }, null, 8, ["context"]),
            x(O(q), {
              hub: "recipe:actions",
              context: { recipe: n.value },
              label: "Actions"
            }, null, 8, ["context"])
          ])
        ]),
        e("div", Re, [
          w[2] || (w[2] = e(
            "span",
            { class: "scaler-label" },
            "Servings:",
            -1
            /* CACHED */
          )),
          e("button", {
            type: "button",
            class: "btn-scaler btn-scaler-minus",
            onClick: m
          }, "−"),
          e(
            "span",
            Ue,
            S(p.value),
            1
            /* TEXT */
          ),
          e("button", {
            type: "button",
            class: "btn-scaler btn-scaler-plus",
            onClick: u
          }, "+")
        ]),
        e("div", Ae, [
          e("div", xe, [
            w[3] || (w[3] = e(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            e("ul", Ne, [
              (o(!0), a(
                T,
                null,
                L(n.value.ingredients, (t) => (o(), a("li", {
                  key: t.id,
                  class: "ingredient-item"
                }, [
                  e("label", null, [
                    C(e("input", {
                      type: "checkbox",
                      "onUpdate:modelValue": (v) => g.value[t.id] = v
                    }, null, 8, Te), [
                      [K, g.value[t.id]]
                    ]),
                    e(
                      "span",
                      {
                        class: B({ struck: g.value[t.id] })
                      },
                      [
                        e(
                          "strong",
                          null,
                          S(N(t.quantity)),
                          1
                          /* TEXT */
                        ),
                        t.unit ? (o(), a(
                          "span",
                          Le,
                          S(t.unit),
                          1
                          /* TEXT */
                        )) : A("v-if", !0),
                        e(
                          "span",
                          null,
                          S(t.name),
                          1
                          /* TEXT */
                        ),
                        t.notes ? (o(), a(
                          "span",
                          Oe,
                          " (" + S(t.notes) + ")",
                          1
                          /* TEXT */
                        )) : A("v-if", !0)
                      ],
                      2
                      /* CLASS */
                    )
                  ])
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          e("div", Pe, [
            w[4] || (w[4] = e(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            e("ol", De, [
              (o(!0), a(
                T,
                null,
                L(n.value.steps, (t) => (o(), a("li", {
                  key: t.id,
                  class: "step-item"
                }, [
                  e(
                    "div",
                    Ee,
                    S(t.instruction),
                    1
                    /* TEXT */
                  ),
                  t.timer_minutes ? (o(), a(
                    "div",
                    Me,
                    "⏱ " + S(t.timer_minutes) + " min",
                    1
                    /* TEXT */
                  )) : A("v-if", !0)
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ]),
        x(O(M), {
          name: "recipe.detail.sidebar",
          context: { recipe: n.value }
        }, null, 8, ["context"]),
        x(O(M), {
          name: "recipe.detail.footer",
          context: { recipe: n.value }
        }, null, 8, ["context"])
      ])) : A("v-if", !0);
    };
  }
}), Be = /* @__PURE__ */ E(Je, [["__scopeId", "data-v-fd8900e8"]]), qe = { class: "ingredient-row-list" }, Fe = { class: "rows-container" }, ze = { class: "reorder-btns" }, Ge = ["disabled", "onClick"], je = ["disabled", "onClick"], Qe = ["onUpdate:modelValue"], We = ["onUpdate:modelValue"], Ze = ["value"], He = ["onUpdate:modelValue"], Ke = ["onUpdate:modelValue"], Xe = ["onClick"], Ye = /* @__PURE__ */ D({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(r, { emit: $ }) {
    const l = r, k = $, s = b(l.modelValue ? JSON.parse(JSON.stringify(l.modelValue)) : []);
    z(
      () => l.modelValue,
      (c) => {
        s.value = c ? JSON.parse(JSON.stringify(c)) : [];
      },
      { deep: !0 }
    );
    const _ = [
      { id: "", label: "(none)" },
      { id: "g", label: "g" },
      { id: "kg", label: "kg" },
      { id: "ml", label: "ml" },
      { id: "l", label: "l" },
      { id: "tsp", label: "tsp" },
      { id: "tbsp", label: "tbsp" },
      { id: "cup", label: "cup" },
      { id: "oz", label: "oz" },
      { id: "lb", label: "lb" },
      { id: "piece", label: "piece" },
      { id: "clove", label: "clove" },
      { id: "pinch", label: "pinch" },
      { id: "can", label: "can" }
    ];
    function n() {
      const c = {
        id: String(Date.now() + Math.random()),
        quantity: 1,
        unit: "g",
        name: "",
        notes: ""
      };
      s.value.push(c), k("update:modelValue", s.value);
    }
    function p(c) {
      s.value.splice(c, 1), k("update:modelValue", s.value);
    }
    function g() {
      k("update:modelValue", s.value);
    }
    function I(c) {
      if (c <= 0) return;
      const y = s.value.splice(c, 1)[0];
      s.value.splice(c - 1, 0, y), k("update:modelValue", s.value);
    }
    function h(c) {
      if (c >= s.value.length - 1) return;
      const y = s.value.splice(c, 1)[0];
      s.value.splice(c + 1, 0, y), k("update:modelValue", s.value);
    }
    return (c, y) => (o(), a("div", qe, [
      e("div", Fe, [
        (o(!0), a(
          T,
          null,
          L(s.value, (V, R) => (o(), a("div", {
            key: V.id,
            class: "ingredient-row"
          }, [
            e("div", ze, [
              e("button", {
                type: "button",
                class: "btn-arrow",
                disabled: R === 0,
                onClick: (f) => I(R)
              }, "▲", 8, Ge),
              e("button", {
                type: "button",
                class: "btn-arrow",
                disabled: R === s.value.length - 1,
                onClick: (f) => h(R)
              }, "▼", 8, je)
            ]),
            C(e("input", {
              "onUpdate:modelValue": (f) => V.quantity = f,
              type: "number",
              step: "any",
              min: "0",
              placeholder: "Qty",
              class: "input input-qty",
              onInput: g
            }, null, 40, Qe), [
              [
                U,
                V.quantity,
                void 0,
                { number: !0 }
              ]
            ]),
            C(e("select", {
              "onUpdate:modelValue": (f) => V.unit = f,
              class: "select-unit",
              onChange: g
            }, [
              (o(), a(
                T,
                null,
                L(_, (f) => e("option", {
                  key: f.id,
                  value: f.id || null
                }, S(f.label), 9, Ze)),
                64
                /* STABLE_FRAGMENT */
              ))
            ], 40, We), [
              [Q, V.unit]
            ]),
            C(e("input", {
              "onUpdate:modelValue": (f) => V.name = f,
              type: "text",
              placeholder: "Ingredient name (e.g. Flour)",
              class: "input input-name",
              onInput: g
            }, null, 40, He), [
              [U, V.name]
            ]),
            C(e("input", {
              "onUpdate:modelValue": (f) => V.notes = f,
              type: "text",
              placeholder: "Notes (e.g. sifted)",
              class: "input input-notes",
              onInput: g
            }, null, 40, Ke), [
              [U, V.notes]
            ]),
            e("button", {
              type: "button",
              class: "btn-remove",
              onClick: (f) => p(R),
              title: "Remove ingredient"
            }, "✕", 8, Xe)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      e("button", {
        type: "button",
        class: "btn-add-ingredient",
        onClick: n
      }, "+ Add Ingredient")
    ]));
  }
}), et = /* @__PURE__ */ E(Ye, [["__scopeId", "data-v-127646c1"]]), tt = { class: "step-list" }, it = { class: "steps-container" }, nt = { class: "step-num" }, lt = { class: "step-inputs" }, st = ["onUpdate:modelValue"], ot = { class: "timer-row" }, at = ["onUpdate:modelValue"], ut = ["onClick"], rt = /* @__PURE__ */ D({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(r, { emit: $ }) {
    const l = r, k = $, s = b(l.modelValue ? JSON.parse(JSON.stringify(l.modelValue)) : []);
    z(
      () => l.modelValue,
      (g) => {
        s.value = g ? JSON.parse(JSON.stringify(g)) : [];
      },
      { deep: !0 }
    );
    function _() {
      s.value.push({
        id: String(Date.now() + Math.random()),
        instruction: "",
        timer_minutes: null
      }), k("update:modelValue", s.value);
    }
    function n(g) {
      s.value.splice(g, 1), k("update:modelValue", s.value);
    }
    function p() {
      k("update:modelValue", s.value);
    }
    return (g, I) => (o(), a("div", tt, [
      e("div", it, [
        (o(!0), a(
          T,
          null,
          L(s.value, (h, c) => (o(), a("div", {
            key: h.id,
            class: "step-row"
          }, [
            e(
              "div",
              nt,
              S(c + 1),
              1
              /* TEXT */
            ),
            e("div", lt, [
              C(e("textarea", {
                "onUpdate:modelValue": (y) => h.instruction = y,
                rows: "2",
                placeholder: "Instruction details...",
                class: "textarea-instruction",
                onInput: p
              }, null, 40, st), [
                [U, h.instruction]
              ]),
              e("div", ot, [
                I[0] || (I[0] = e(
                  "label",
                  null,
                  "Timer (min):",
                  -1
                  /* CACHED */
                )),
                C(e("input", {
                  "onUpdate:modelValue": (y) => h.timer_minutes = y,
                  type: "number",
                  min: "0",
                  placeholder: "Optional",
                  class: "input-timer",
                  onInput: p
                }, null, 40, at), [
                  [
                    U,
                    h.timer_minutes,
                    void 0,
                    { number: !0 }
                  ]
                ])
              ])
            ]),
            e("button", {
              type: "button",
              class: "btn-remove",
              onClick: (y) => n(c)
            }, "✕", 8, ut)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      e("button", {
        type: "button",
        class: "btn-add-step",
        onClick: _
      }, "+ Add Step")
    ]));
  }
}), ct = /* @__PURE__ */ E(rt, [["__scopeId", "data-v-1a9cf01e"]]), dt = { class: "recipe-edit-page" }, pt = { class: "edit-top-bar" }, vt = { class: "form-section" }, mt = { class: "form-group" }, _t = { class: "form-group" }, gt = { class: "form-row" }, ft = { class: "form-group" }, bt = { class: "form-group" }, ht = { class: "form-group" }, yt = { class: "form-group" }, $t = { class: "form-group" }, kt = { class: "form-group" }, wt = { class: "editor-section" }, Vt = { class: "editor-section" }, St = /* @__PURE__ */ D({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(r, { emit: $ }) {
    const l = r, k = $, s = P("__SS_NAVIGATE__", (d) => {
      window.location.href = d;
    }), _ = P("__SS_API__"), n = J(() => {
      if (l.id) return l.id;
      if (l.recipeId) return l.recipeId;
      if (typeof window < "u" && window.location.pathname.startsWith("/recipes/")) {
        const d = window.location.pathname.split("/");
        if (d.length >= 3 && d[d.length - 1] === "edit")
          return d[d.length - 2];
      }
      return "";
    }), p = b(""), g = b(""), I = b("en"), h = b(2), c = b(null), y = b(null), V = b(""), R = b(null), f = b([]), N = b([]), m = b(1);
    F(async () => {
      if (n.value && _)
        try {
          const d = await _.get(`/api/recipes/${n.value}`);
          p.value = d.title || "", g.value = d.description || "", I.value = d.language || "en", h.value = d.servings || 2, c.value = d.prep_time_minutes || null, y.value = d.cook_time_minutes || null, V.value = (d.tags || []).join(", "), R.value = d.cover_asset_id || null, f.value = d.ingredients || [], N.value = d.steps || [], m.value = d.revision || 1;
        } catch {
        }
    });
    async function u(d) {
      var G;
      const t = (G = d.target.files) == null ? void 0 : G[0];
      if (!t || !_) return;
      const v = new FormData();
      v.append("file", t), v.append("entity_type", "recipe"), v.append("slot", "cover");
      const W = await _.upload("/api/assets", v);
      R.value = W.id;
    }
    async function i() {
      if (!p.value.trim() || !_) return;
      const d = {
        title: p.value.trim(),
        description: g.value.trim(),
        language: I.value,
        servings: Number(h.value) || 2,
        prep_time_minutes: c.value ? Number(c.value) : null,
        cook_time_minutes: y.value ? Number(y.value) : null,
        tags: V.value.split(",").map((v) => v.trim()).filter(Boolean),
        cover_asset_id: R.value,
        ingredients: f.value,
        steps: N.value
      };
      let t;
      n.value ? t = await _.patch(`/api/recipes/${n.value}`, { ...d, revision: m.value }) : t = await _.post("/api/recipes", d), k("saved", t), t != null && t.id && s(`/recipes/${t.id}`);
    }
    function w() {
      s(n.value ? `/recipes/${n.value}` : "/recipes");
    }
    return (d, t) => (o(), a("div", dt, [
      e("div", pt, [
        e(
          "h2",
          null,
          S(n.value ? "Edit Recipe" : "New Recipe"),
          1
          /* TEXT */
        ),
        e("button", {
          type: "button",
          class: "btn-cancel",
          onClick: w
        }, "Cancel")
      ]),
      e("div", vt, [
        e("div", mt, [
          t[9] || (t[9] = e(
            "label",
            null,
            "Title",
            -1
            /* CACHED */
          )),
          C(e(
            "input",
            {
              "onUpdate:modelValue": t[0] || (t[0] = (v) => p.value = v),
              type: "text",
              placeholder: "Recipe Title",
              class: "input input-title"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [U, p.value]
          ])
        ]),
        e("div", _t, [
          t[10] || (t[10] = e(
            "label",
            null,
            "Description",
            -1
            /* CACHED */
          )),
          C(e(
            "textarea",
            {
              "onUpdate:modelValue": t[1] || (t[1] = (v) => g.value = v),
              rows: "2",
              placeholder: "Brief description...",
              class: "textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [U, g.value]
          ])
        ]),
        e("div", gt, [
          e("div", ft, [
            t[11] || (t[11] = e(
              "label",
              null,
              "Language",
              -1
              /* CACHED */
            )),
            C(e(
              "input",
              {
                "onUpdate:modelValue": t[2] || (t[2] = (v) => I.value = v),
                type: "text",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [U, I.value]
            ])
          ]),
          e("div", bt, [
            t[12] || (t[12] = e(
              "label",
              null,
              "Servings",
              -1
              /* CACHED */
            )),
            C(e(
              "input",
              {
                "onUpdate:modelValue": t[3] || (t[3] = (v) => h.value = v),
                type: "number",
                min: "1",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                U,
                h.value,
                void 0,
                { number: !0 }
              ]
            ])
          ]),
          e("div", ht, [
            t[13] || (t[13] = e(
              "label",
              null,
              "Prep Time (m)",
              -1
              /* CACHED */
            )),
            C(e(
              "input",
              {
                "onUpdate:modelValue": t[4] || (t[4] = (v) => c.value = v),
                type: "number",
                min: "0",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                U,
                c.value,
                void 0,
                { number: !0 }
              ]
            ])
          ]),
          e("div", yt, [
            t[14] || (t[14] = e(
              "label",
              null,
              "Cook Time (m)",
              -1
              /* CACHED */
            )),
            C(e(
              "input",
              {
                "onUpdate:modelValue": t[5] || (t[5] = (v) => y.value = v),
                type: "number",
                min: "0",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                U,
                y.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        e("div", $t, [
          t[15] || (t[15] = e(
            "label",
            null,
            "Tags (comma-separated)",
            -1
            /* CACHED */
          )),
          C(e(
            "input",
            {
              "onUpdate:modelValue": t[6] || (t[6] = (v) => V.value = v),
              type: "text",
              placeholder: "dinner, quick, italian",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [U, V.value]
          ])
        ]),
        e("div", kt, [
          t[16] || (t[16] = e(
            "label",
            null,
            "Cover Image",
            -1
            /* CACHED */
          )),
          e(
            "input",
            {
              type: "file",
              accept: "image/*",
              onChange: u
            },
            null,
            32
            /* NEED_HYDRATION */
          )
        ])
      ]),
      e("div", wt, [
        t[17] || (t[17] = e(
          "h3",
          null,
          "Ingredients",
          -1
          /* CACHED */
        )),
        x(et, {
          modelValue: f.value,
          "onUpdate:modelValue": t[7] || (t[7] = (v) => f.value = v)
        }, null, 8, ["modelValue"])
      ]),
      e("div", Vt, [
        t[18] || (t[18] = e(
          "h3",
          null,
          "Instructions",
          -1
          /* CACHED */
        )),
        x(ct, {
          modelValue: N.value,
          "onUpdate:modelValue": t[8] || (t[8] = (v) => N.value = v)
        }, null, 8, ["modelValue"])
      ]),
      e("div", { class: "actions-row" }, [
        e("button", {
          class: "btn-primary",
          onClick: i
        }, "Save Recipe")
      ])
    ]));
  }
}), j = /* @__PURE__ */ E(St, [["__scopeId", "data-v-d40adcf4"]]);
function Rt(r) {
  r.route({ path: "/recipes", component: ye, nav: { label: "Recipes", icon: "book", order: 10 } }), r.route({ path: "/recipes/new", component: j }), r.route({ path: "/recipes/:id", component: Be }), r.route({ path: "/recipes/:id/edit", component: j }), r.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), r.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Manual Recipe",
    order: 100,
    kind: "headless",
    execute: () => {
      r.navigate ? r.navigate("/recipes/new") : window.location.href = r.url ? r.url("/recipes/new") : "/recipes/new";
    }
  }), r.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), r.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: ($) => {
      var l;
      (l = $ == null ? void 0 : $.recipe) != null && l.id && (r.navigate ? r.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = r.url ? r.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  Rt as default
};
