import { defineComponent as T, openBlock as u, createElementBlock as r, createElementVNode as e, toDisplayString as k, withModifiers as Q, createVNode as R, unref as N, createCommentVNode as C, Fragment as U, renderList as x, inject as J, ref as h, onMounted as q, computed as D, withDirectives as I, vModelText as w, normalizeClass as O, vModelSelect as F, createBlock as Z, vModelCheckbox as G, watch as z } from "vue";
import { Slot as P, IntentTrigger as M } from "@secretsauce/ui";
const H = { class: "cover-image" }, K = ["src"], W = {
  key: 1,
  class: "placeholder-cover"
}, X = { class: "card-body" }, Y = { class: "card-header" }, ee = { class: "title" }, te = { class: "meta" }, ne = {
  key: 0,
  class: "meta-item"
}, se = {
  key: 1,
  class: "meta-item"
}, ie = {
  key: 0,
  class: "tags"
}, le = /* @__PURE__ */ T({
  __name: "RecipeCard",
  props: {
    recipe: {}
  },
  emits: ["select"],
  setup(m, { emit: y }) {
    const o = m, g = y;
    return (s, i) => {
      var d;
      return u(), r("div", {
        class: "recipe-card",
        onClick: i[1] || (i[1] = (_) => g("select", o.recipe.id))
      }, [
        e("div", H, [
          o.recipe.cover_asset_id ? (u(), r("img", {
            key: 0,
            src: `/api/assets/${o.recipe.cover_asset_id}/file`,
            alt: "Cover"
          }, null, 8, K)) : (u(), r("div", W, "🍲"))
        ]),
        e("div", X, [
          e("div", Y, [
            e(
              "h3",
              ee,
              k(o.recipe.title),
              1
              /* TEXT */
            ),
            e("div", {
              class: "actions",
              onClick: i[0] || (i[0] = Q(() => {
              }, ["stop"]))
            }, [
              R(N(P), {
                name: "recipe.card.actions",
                context: { recipe: o.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          e("div", te, [
            o.recipe.prep_time_minutes ? (u(), r(
              "span",
              ne,
              "⏱ " + k(o.recipe.prep_time_minutes) + "m prep",
              1
              /* TEXT */
            )) : C("v-if", !0),
            o.recipe.cook_time_minutes ? (u(), r(
              "span",
              se,
              "🍳 " + k(o.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : C("v-if", !0)
          ]),
          (d = o.recipe.tags) != null && d.length ? (u(), r("div", ie, [
            (u(!0), r(
              U,
              null,
              x(o.recipe.tags, (_) => (u(), r(
                "span",
                {
                  key: _,
                  class: "tag"
                },
                k(_),
                1
                /* TEXT */
              ))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : C("v-if", !0)
        ])
      ]);
    };
  }
}), A = (m, y) => {
  const o = m.__vccOpts || m;
  for (const [g, s] of y)
    o[g] = s;
  return o;
}, oe = /* @__PURE__ */ A(le, [["__scopeId", "data-v-ae9aec13"]]), ae = { class: "recipe-list-page" }, ue = { class: "intent-header-bar" }, re = { class: "search-box" }, ce = { class: "intent-area" }, de = { class: "filter-sort-bar" }, pe = {
  key: 0,
  class: "tag-chips"
}, ve = ["onClick"], me = {
  key: 0,
  class: "recipes-grid"
}, _e = {
  key: 1,
  class: "empty-banner"
}, ge = /* @__PURE__ */ T({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(m, { emit: y }) {
    const o = y, g = J("__SS_API__"), s = h([]), i = h(""), d = h(null), _ = h("title");
    async function b() {
      if (g)
        try {
          const l = await g.get("/api/recipes", { params: { q: i.value || void 0 } });
          s.value = l.items || [];
        } catch {
        }
    }
    q(b);
    const S = D(() => {
      const l = /* @__PURE__ */ new Set();
      for (const a of s.value)
        for (const n of a.tags || []) l.add(n);
      return Array.from(l);
    }), $ = D(() => {
      let l = [...s.value];
      return d.value && (l = l.filter((a) => {
        var n;
        return (n = a.tags) == null ? void 0 : n.includes(d.value);
      })), _.value === "title" ? l.sort((a, n) => a.title.localeCompare(n.title)) : _.value === "prep" && l.sort((a, n) => (a.prep_time_minutes || 0) - (n.prep_time_minutes || 0)), l;
    });
    return (l, a) => (u(), r("div", ae, [
      e("div", ue, [
        e("div", re, [
          I(e(
            "input",
            {
              "onUpdate:modelValue": a[0] || (a[0] = (n) => i.value = n),
              type: "search",
              placeholder: "Search recipes (trigram FTS)...",
              class: "input-search",
              onInput: b
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [w, i.value]
          ])
        ]),
        e("div", ce, [
          R(N(M), {
            hub: "recipe:create",
            label: "+ Add / Import Recipe"
          })
        ])
      ]),
      e("div", de, [
        R(N(P), { name: "recipe.list.filters" }),
        S.value.length ? (u(), r("div", pe, [
          (u(!0), r(
            U,
            null,
            x(S.value, (n) => (u(), r("button", {
              key: n,
              class: O(["tag-chip", { active: d.value === n }]),
              onClick: (c) => d.value = d.value === n ? null : n
            }, k(n), 11, ve))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : C("v-if", !0),
        I(e(
          "select",
          {
            "onUpdate:modelValue": a[1] || (a[1] = (n) => _.value = n),
            class: "select-sort"
          },
          [...a[3] || (a[3] = [
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
          [F, _.value]
        ])
      ]),
      $.value.length ? (u(), r("div", me, [
        (u(!0), r(
          U,
          null,
          x($.value, (n) => (u(), Z(oe, {
            key: n.id,
            recipe: n,
            onSelect: a[2] || (a[2] = (c) => o("openRecipe", c))
          }, null, 8, ["recipe"]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (u(), r("div", _e, [
        a[4] || (a[4] = e(
          "h3",
          null,
          "No recipes found",
          -1
          /* CACHED */
        )),
        a[5] || (a[5] = e(
          "p",
          null,
          "Start your household cookbook by adding your first recipe!",
          -1
          /* CACHED */
        )),
        R(N(M), {
          hub: "recipe:create",
          label: "+ Add / Import Recipe"
        })
      ]))
    ]));
  }
}), be = /* @__PURE__ */ A(ge, [["__scopeId", "data-v-7ec01d2b"]]), fe = {
  key: 0,
  class: "recipe-detail-page"
}, he = {
  key: 0,
  class: "lang-bar"
}, ye = ["onClick"], $e = { class: "detail-header" }, ke = { class: "recipe-title" }, Ve = {
  key: 0,
  class: "description"
}, Ie = { class: "detail-actions" }, Se = { class: "scaler-card" }, we = { class: "servings-value" }, Ce = { class: "content-grid" }, Re = { class: "ingredients-section" }, Ue = { class: "ingredient-checklist" }, xe = ["onUpdate:modelValue"], Ne = { key: 0 }, Te = {
  key: 1,
  class: "notes"
}, Ae = { class: "steps-section" }, Le = { class: "steps-list" }, Pe = { class: "step-text" }, De = {
  key: 0,
  class: "timer-badge"
}, Oe = /* @__PURE__ */ T({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {}
  },
  emits: ["switchLanguage", "addTranslation"],
  setup(m, { emit: y }) {
    const o = m, g = y, s = J("__SS_API__"), i = h(null), d = h(2), _ = h({});
    async function b() {
      var n;
      !s || !o.recipeId || (i.value = await s.get(`/api/recipes/${o.recipeId}`), d.value = ((n = i.value) == null ? void 0 : n.servings) || 2);
    }
    q(b);
    const S = D(() => !i.value || !i.value.servings ? 1 : d.value / i.value.servings);
    function $(n) {
      if (n == null) return "";
      const c = n * S.value;
      return Number.isInteger(c) ? String(c) : c.toFixed(1);
    }
    function l() {
      d.value > 1 && (d.value -= 1);
    }
    function a() {
      d.value += 1;
    }
    return (n, c) => {
      var f;
      return i.value ? (u(), r("div", fe, [
        ((f = i.value.languages) == null ? void 0 : f.length) > 1 ? (u(), r("div", he, [
          c[1] || (c[1] = e(
            "span",
            { class: "lang-label" },
            "Languages:",
            -1
            /* CACHED */
          )),
          (u(!0), r(
            U,
            null,
            x(i.value.languages, (v) => (u(), r("button", {
              key: v,
              class: O(["lang-tab", { active: v === i.value.language }]),
              onClick: (L) => g("switchLanguage", `${i.value.group_id}_${v}`)
            }, k(v.toUpperCase()), 11, ye))),
            128
            /* KEYED_FRAGMENT */
          )),
          e("button", {
            class: "btn-add-translation",
            onClick: c[0] || (c[0] = (v) => g("addTranslation", i.value))
          }, "+ Add Translation")
        ])) : C("v-if", !0),
        e("div", $e, [
          e("div", null, [
            e(
              "h1",
              ke,
              k(i.value.title),
              1
              /* TEXT */
            ),
            i.value.description ? (u(), r(
              "p",
              Ve,
              k(i.value.description),
              1
              /* TEXT */
            )) : C("v-if", !0)
          ]),
          e("div", Ie, [
            R(N(M), {
              hub: "recipe:actions",
              context: { recipe: i.value },
              label: "Actions"
            }, null, 8, ["context"])
          ])
        ]),
        e("div", Se, [
          c[2] || (c[2] = e(
            "span",
            { class: "scaler-label" },
            "Servings:",
            -1
            /* CACHED */
          )),
          e("button", {
            type: "button",
            class: "btn-scaler btn-scaler-minus",
            onClick: l
          }, "−"),
          e(
            "span",
            we,
            k(d.value),
            1
            /* TEXT */
          ),
          e("button", {
            type: "button",
            class: "btn-scaler btn-scaler-plus",
            onClick: a
          }, "+")
        ]),
        e("div", Ce, [
          e("div", Re, [
            c[3] || (c[3] = e(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            e("ul", Ue, [
              (u(!0), r(
                U,
                null,
                x(i.value.ingredients, (v) => (u(), r("li", {
                  key: v.id,
                  class: "ingredient-item"
                }, [
                  e("label", null, [
                    I(e("input", {
                      type: "checkbox",
                      "onUpdate:modelValue": (L) => _.value[v.id] = L
                    }, null, 8, xe), [
                      [G, _.value[v.id]]
                    ]),
                    e(
                      "span",
                      {
                        class: O({ struck: _.value[v.id] })
                      },
                      [
                        e(
                          "strong",
                          null,
                          k($(v.quantity)),
                          1
                          /* TEXT */
                        ),
                        v.unit ? (u(), r(
                          "span",
                          Ne,
                          k(v.unit),
                          1
                          /* TEXT */
                        )) : C("v-if", !0),
                        e(
                          "span",
                          null,
                          k(v.name),
                          1
                          /* TEXT */
                        ),
                        v.notes ? (u(), r(
                          "span",
                          Te,
                          " (" + k(v.notes) + ")",
                          1
                          /* TEXT */
                        )) : C("v-if", !0)
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
          e("div", Ae, [
            c[4] || (c[4] = e(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            e("ol", Le, [
              (u(!0), r(
                U,
                null,
                x(i.value.steps, (v) => (u(), r("li", {
                  key: v.id,
                  class: "step-item"
                }, [
                  e(
                    "div",
                    Pe,
                    k(v.instruction),
                    1
                    /* TEXT */
                  ),
                  v.timer_minutes ? (u(), r(
                    "div",
                    De,
                    "⏱ " + k(v.timer_minutes) + " min",
                    1
                    /* TEXT */
                  )) : C("v-if", !0)
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ]),
        R(N(P), {
          name: "recipe.detail.sidebar",
          context: { recipe: i.value }
        }, null, 8, ["context"]),
        R(N(P), {
          name: "recipe.detail.footer",
          context: { recipe: i.value }
        }, null, 8, ["context"])
      ])) : C("v-if", !0);
    };
  }
}), Me = /* @__PURE__ */ A(Oe, [["__scopeId", "data-v-da205b9f"]]), Je = { class: "ingredient-row-list" }, qe = { class: "rows-container" }, Be = { class: "reorder-btns" }, Ee = ["disabled", "onClick"], Fe = ["disabled", "onClick"], ze = ["onUpdate:modelValue"], je = ["onUpdate:modelValue"], Qe = ["value"], Ze = ["onUpdate:modelValue"], Ge = ["onUpdate:modelValue"], He = ["onClick"], Ke = /* @__PURE__ */ T({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(m, { emit: y }) {
    const o = m, g = y, s = h(o.modelValue ? JSON.parse(JSON.stringify(o.modelValue)) : []);
    z(
      () => o.modelValue,
      (l) => {
        s.value = l ? JSON.parse(JSON.stringify(l)) : [];
      },
      { deep: !0 }
    );
    const i = [
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
    function d() {
      const l = {
        id: String(Date.now() + Math.random()),
        quantity: 1,
        unit: "g",
        name: "",
        notes: ""
      };
      s.value.push(l), g("update:modelValue", s.value);
    }
    function _(l) {
      s.value.splice(l, 1), g("update:modelValue", s.value);
    }
    function b() {
      g("update:modelValue", s.value);
    }
    function S(l) {
      if (l <= 0) return;
      const a = s.value.splice(l, 1)[0];
      s.value.splice(l - 1, 0, a), g("update:modelValue", s.value);
    }
    function $(l) {
      if (l >= s.value.length - 1) return;
      const a = s.value.splice(l, 1)[0];
      s.value.splice(l + 1, 0, a), g("update:modelValue", s.value);
    }
    return (l, a) => (u(), r("div", Je, [
      e("div", qe, [
        (u(!0), r(
          U,
          null,
          x(s.value, (n, c) => (u(), r("div", {
            key: n.id,
            class: "ingredient-row"
          }, [
            e("div", Be, [
              e("button", {
                type: "button",
                class: "btn-arrow",
                disabled: c === 0,
                onClick: (f) => S(c)
              }, "▲", 8, Ee),
              e("button", {
                type: "button",
                class: "btn-arrow",
                disabled: c === s.value.length - 1,
                onClick: (f) => $(c)
              }, "▼", 8, Fe)
            ]),
            I(e("input", {
              "onUpdate:modelValue": (f) => n.quantity = f,
              type: "number",
              step: "any",
              min: "0",
              placeholder: "Qty",
              class: "input input-qty",
              onInput: b
            }, null, 40, ze), [
              [
                w,
                n.quantity,
                void 0,
                { number: !0 }
              ]
            ]),
            I(e("select", {
              "onUpdate:modelValue": (f) => n.unit = f,
              class: "select-unit",
              onChange: b
            }, [
              (u(), r(
                U,
                null,
                x(i, (f) => e("option", {
                  key: f.id,
                  value: f.id || null
                }, k(f.label), 9, Qe)),
                64
                /* STABLE_FRAGMENT */
              ))
            ], 40, je), [
              [F, n.unit]
            ]),
            I(e("input", {
              "onUpdate:modelValue": (f) => n.name = f,
              type: "text",
              placeholder: "Ingredient name (e.g. Flour)",
              class: "input input-name",
              onInput: b
            }, null, 40, Ze), [
              [w, n.name]
            ]),
            I(e("input", {
              "onUpdate:modelValue": (f) => n.notes = f,
              type: "text",
              placeholder: "Notes (e.g. sifted)",
              class: "input input-notes",
              onInput: b
            }, null, 40, Ge), [
              [w, n.notes]
            ]),
            e("button", {
              type: "button",
              class: "btn-remove",
              onClick: (f) => _(c),
              title: "Remove ingredient"
            }, "✕", 8, He)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      e("button", {
        type: "button",
        class: "btn-add-ingredient",
        onClick: d
      }, "+ Add Ingredient")
    ]));
  }
}), We = /* @__PURE__ */ A(Ke, [["__scopeId", "data-v-127646c1"]]), Xe = { class: "step-list" }, Ye = { class: "steps-container" }, et = { class: "step-num" }, tt = { class: "step-inputs" }, nt = ["onUpdate:modelValue"], st = { class: "timer-row" }, it = ["onUpdate:modelValue"], lt = ["onClick"], ot = /* @__PURE__ */ T({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(m, { emit: y }) {
    const o = m, g = y, s = h(o.modelValue ? JSON.parse(JSON.stringify(o.modelValue)) : []);
    z(
      () => o.modelValue,
      (b) => {
        s.value = b ? JSON.parse(JSON.stringify(b)) : [];
      },
      { deep: !0 }
    );
    function i() {
      s.value.push({
        id: String(Date.now() + Math.random()),
        instruction: "",
        timer_minutes: null
      }), g("update:modelValue", s.value);
    }
    function d(b) {
      s.value.splice(b, 1), g("update:modelValue", s.value);
    }
    function _() {
      g("update:modelValue", s.value);
    }
    return (b, S) => (u(), r("div", Xe, [
      e("div", Ye, [
        (u(!0), r(
          U,
          null,
          x(s.value, ($, l) => (u(), r("div", {
            key: $.id,
            class: "step-row"
          }, [
            e(
              "div",
              et,
              k(l + 1),
              1
              /* TEXT */
            ),
            e("div", tt, [
              I(e("textarea", {
                "onUpdate:modelValue": (a) => $.instruction = a,
                rows: "2",
                placeholder: "Instruction details...",
                class: "textarea-instruction",
                onInput: _
              }, null, 40, nt), [
                [w, $.instruction]
              ]),
              e("div", st, [
                S[0] || (S[0] = e(
                  "label",
                  null,
                  "Timer (min):",
                  -1
                  /* CACHED */
                )),
                I(e("input", {
                  "onUpdate:modelValue": (a) => $.timer_minutes = a,
                  type: "number",
                  min: "0",
                  placeholder: "Optional",
                  class: "input-timer",
                  onInput: _
                }, null, 40, it), [
                  [
                    w,
                    $.timer_minutes,
                    void 0,
                    { number: !0 }
                  ]
                ])
              ])
            ]),
            e("button", {
              type: "button",
              class: "btn-remove",
              onClick: (a) => d(l)
            }, "✕", 8, lt)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      e("button", {
        type: "button",
        class: "btn-add-step",
        onClick: i
      }, "+ Add Step")
    ]));
  }
}), at = /* @__PURE__ */ A(ot, [["__scopeId", "data-v-1a9cf01e"]]), ut = { class: "recipe-edit-page" }, rt = { class: "form-section" }, ct = { class: "form-group" }, dt = { class: "form-group" }, pt = { class: "form-row" }, vt = { class: "form-group" }, mt = { class: "form-group" }, _t = { class: "form-group" }, gt = { class: "form-group" }, bt = { class: "form-group" }, ft = { class: "form-group" }, ht = { class: "editor-section" }, yt = { class: "editor-section" }, $t = /* @__PURE__ */ T({
  __name: "RecipeEditPage",
  props: {
    recipeId: {}
  },
  emits: ["saved"],
  setup(m, { emit: y }) {
    const o = m, g = y, s = J("__SS_API__"), i = h(""), d = h(""), _ = h("en"), b = h(2), S = h(null), $ = h(null), l = h(""), a = h(null), n = h([]), c = h([]), f = h(1);
    q(async () => {
      if (o.recipeId && s)
        try {
          const V = await s.get(`/api/recipes/${o.recipeId}`);
          i.value = V.title || "", d.value = V.description || "", _.value = V.language || "en", b.value = V.servings || 2, S.value = V.prep_time_minutes || null, $.value = V.cook_time_minutes || null, l.value = (V.tags || []).join(", "), a.value = V.cover_asset_id || null, n.value = V.ingredients || [], c.value = V.steps || [], f.value = V.revision || 1;
        } catch {
        }
    });
    async function v(V) {
      var B;
      const t = (B = V.target.files) == null ? void 0 : B[0];
      if (!t || !s) return;
      const p = new FormData();
      p.append("file", t), p.append("entity_type", "recipe"), p.append("slot", "cover");
      const j = await s.upload("/api/assets", p);
      a.value = j.id;
    }
    async function L() {
      if (!i.value.trim() || !s) return;
      const V = {
        title: i.value.trim(),
        description: d.value.trim(),
        language: _.value,
        servings: Number(b.value) || 2,
        prep_time_minutes: S.value ? Number(S.value) : null,
        cook_time_minutes: $.value ? Number($.value) : null,
        tags: l.value.split(",").map((p) => p.trim()).filter(Boolean),
        cover_asset_id: a.value,
        ingredients: n.value,
        steps: c.value
      };
      let t;
      o.recipeId ? t = await s.patch(`/api/recipes/${o.recipeId}`, { ...V, revision: f.value }) : t = await s.post("/api/recipes", V), g("saved", t);
    }
    return (V, t) => (u(), r("div", ut, [
      e(
        "h2",
        null,
        k(o.recipeId ? "Edit Recipe" : "New Recipe"),
        1
        /* TEXT */
      ),
      e("div", rt, [
        e("div", ct, [
          t[9] || (t[9] = e(
            "label",
            null,
            "Title",
            -1
            /* CACHED */
          )),
          I(e(
            "input",
            {
              "onUpdate:modelValue": t[0] || (t[0] = (p) => i.value = p),
              type: "text",
              placeholder: "Recipe Title",
              class: "input input-title"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [w, i.value]
          ])
        ]),
        e("div", dt, [
          t[10] || (t[10] = e(
            "label",
            null,
            "Description",
            -1
            /* CACHED */
          )),
          I(e(
            "textarea",
            {
              "onUpdate:modelValue": t[1] || (t[1] = (p) => d.value = p),
              rows: "2",
              placeholder: "Brief description...",
              class: "textarea"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [w, d.value]
          ])
        ]),
        e("div", pt, [
          e("div", vt, [
            t[11] || (t[11] = e(
              "label",
              null,
              "Language",
              -1
              /* CACHED */
            )),
            I(e(
              "input",
              {
                "onUpdate:modelValue": t[2] || (t[2] = (p) => _.value = p),
                type: "text",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [w, _.value]
            ])
          ]),
          e("div", mt, [
            t[12] || (t[12] = e(
              "label",
              null,
              "Servings",
              -1
              /* CACHED */
            )),
            I(e(
              "input",
              {
                "onUpdate:modelValue": t[3] || (t[3] = (p) => b.value = p),
                type: "number",
                min: "1",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                w,
                b.value,
                void 0,
                { number: !0 }
              ]
            ])
          ]),
          e("div", _t, [
            t[13] || (t[13] = e(
              "label",
              null,
              "Prep Time (m)",
              -1
              /* CACHED */
            )),
            I(e(
              "input",
              {
                "onUpdate:modelValue": t[4] || (t[4] = (p) => S.value = p),
                type: "number",
                min: "0",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                w,
                S.value,
                void 0,
                { number: !0 }
              ]
            ])
          ]),
          e("div", gt, [
            t[14] || (t[14] = e(
              "label",
              null,
              "Cook Time (m)",
              -1
              /* CACHED */
            )),
            I(e(
              "input",
              {
                "onUpdate:modelValue": t[5] || (t[5] = (p) => $.value = p),
                type: "number",
                min: "0",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                w,
                $.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        e("div", bt, [
          t[15] || (t[15] = e(
            "label",
            null,
            "Tags (comma-separated)",
            -1
            /* CACHED */
          )),
          I(e(
            "input",
            {
              "onUpdate:modelValue": t[6] || (t[6] = (p) => l.value = p),
              type: "text",
              placeholder: "dinner, quick, italian",
              class: "input"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [w, l.value]
          ])
        ]),
        e("div", ft, [
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
              onChange: v
            },
            null,
            32
            /* NEED_HYDRATION */
          )
        ])
      ]),
      e("div", ht, [
        t[17] || (t[17] = e(
          "h3",
          null,
          "Ingredients",
          -1
          /* CACHED */
        )),
        R(We, {
          modelValue: n.value,
          "onUpdate:modelValue": t[7] || (t[7] = (p) => n.value = p)
        }, null, 8, ["modelValue"])
      ]),
      e("div", yt, [
        t[18] || (t[18] = e(
          "h3",
          null,
          "Instructions",
          -1
          /* CACHED */
        )),
        R(at, {
          modelValue: c.value,
          "onUpdate:modelValue": t[8] || (t[8] = (p) => c.value = p)
        }, null, 8, ["modelValue"])
      ]),
      e("div", { class: "actions-row" }, [
        e("button", {
          class: "btn-primary",
          onClick: L
        }, "Save Recipe")
      ])
    ]));
  }
}), E = /* @__PURE__ */ A($t, [["__scopeId", "data-v-babaecd9"]]);
function It(m) {
  m.route({ path: "/recipes", component: be, nav: { label: "Recipes", icon: "book", order: 10 } }), m.route({ path: "/recipes/new", component: E }), m.route({ path: "/recipes/:id", component: Me }), m.route({ path: "/recipes/:id/edit", component: E }), m.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), m.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Manual Recipe",
    order: 100,
    kind: "headless",
    execute: () => {
      window.location.hash = "#/recipes/new";
    }
  }), m.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), m.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (y) => {
      var o;
      (o = y == null ? void 0 : y.recipe) != null && o.id && (window.location.hash = `#/recipes/${y.recipe.id}/edit`);
    }
  });
}
export {
  It as default
};
