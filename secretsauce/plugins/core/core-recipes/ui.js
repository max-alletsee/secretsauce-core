import { defineComponent as E, resolveComponent as V, openBlock as o, createElementBlock as d, createCommentVNode as O, createElementVNode as t, createVNode as a, withModifiers as W, unref as z, createTextVNode as Z, toDisplayString as L, Fragment as M, renderList as P, createBlock as J, ref as m, onMounted as oe, watch as j, computed as F, withCtx as G, normalizeClass as se } from "vue";
import { Slot as D, useSecretSauce as Y, IntentTrigger as X } from "@secretsauce/ui";
const ue = {
  key: 0,
  class: "cover-image"
}, re = ["src", "alt"], ce = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, pe = { class: "card-body" }, de = { class: "card-header" }, ve = { class: "meta" }, me = { key: 0 }, _e = { key: 1 }, ge = { class: "tags" }, fe = /* @__PURE__ */ E({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(v, { emit: $ }) {
    const u = v, w = $;
    return (i, l) => {
      const s = V("Button"), y = V("Tag");
      return o(), d("article", {
        class: "recipe-card",
        onClick: l[2] || (l[2] = (b) => w("select", u.recipe.id))
      }, [
        u.showCover ? (o(), d("div", ue, [
          u.recipe.cover_asset_id ? (o(), d("img", {
            key: 0,
            src: u.recipe.cover_url || `/api/assets/${u.recipe.cover_asset_id}/file`,
            alt: u.recipe.title
          }, null, 8, re)) : (o(), d("i", ce))
        ])) : O("v-if", !0),
        t("div", pe, [
          t("div", de, [
            t("h3", null, [
              a(s, {
                label: u.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: l[0] || (l[0] = W((b) => w("select", u.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: l[1] || (l[1] = W(() => {
              }, ["stop"]))
            }, [
              a(z(D), {
                name: "recipe.card.actions",
                context: { recipe: u.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", ve, [
            u.recipe.prep_time_minutes ? (o(), d("span", me, [
              l[3] || (l[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Z(
                " " + L(u.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : O("v-if", !0),
            u.recipe.cook_time_minutes ? (o(), d(
              "span",
              _e,
              L(u.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : O("v-if", !0)
          ]),
          t("div", ge, [
            (o(!0), d(
              M,
              null,
              P(u.recipe.tags, (b) => (o(), J(y, {
                key: b,
                value: b,
                class: "tag",
                severity: "secondary"
              }, null, 8, ["value"]))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ]);
    };
  }
}), Q = (v, $) => {
  const u = v.__vccOpts || v;
  for (const [w, i] of $)
    u[w] = i;
  return u;
}, be = /* @__PURE__ */ Q(fe, [["__scopeId", "data-v-f16d0b4f"]]);
async function ee(v, $) {
  var u;
  if (!$) return null;
  try {
    return ((u = (await v.get("/api/assets", { entity_type: "recipe", entity_id: $ })).filter((i) => i.slot === "cover").at(-1)) == null ? void 0 : u.id) || null;
  } catch {
    return null;
  }
}
const ye = { class: "recipe-list-page" }, ke = { class: "intent-header-bar" }, Ve = { class: "filter-sort-bar" }, he = {
  key: 1,
  class: "recipes-grid"
}, $e = {
  key: 2,
  class: "empty-state"
}, Ie = /* @__PURE__ */ E({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(v, { emit: $ }) {
    const u = $, w = Y(), i = m([]), l = m(""), s = m(null), y = m("title"), b = m(""), x = m(!1), _ = m(/* @__PURE__ */ new Set());
    function U() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const I = m(U());
    let S = 0;
    async function C() {
      try {
        const p = await w.api.get("/api/x/core-shortlist");
        _.value = new Set(p.map((c) => c.recipe_id));
      } catch {
      }
    }
    async function T() {
      x.value = !x.value, x.value && await C();
    }
    async function k() {
      const p = ++S;
      b.value = "";
      try {
        const c = await w.api.get("/api/recipes", { q: l.value.trim() });
        if (p !== S || (i.value = c.items, !I.value)) return;
        const B = await Promise.all(c.items.map(async (q) => {
          const A = await ee(w.api, q.group_id);
          return { ...q, cover_asset_id: A, cover_url: A ? w.url(`/api/assets/${A}/file`) : null };
        }));
        p === S && (i.value = B);
      } catch (c) {
        p === S && (b.value = (c == null ? void 0 : c.message) || "Could not load recipes");
      }
    }
    function N(p) {
      var c;
      u("openRecipe", p), (c = w.navigate) == null || c.call(w, `/recipes/${p}`);
    }
    oe(() => {
      I.value = U(), k(), C();
    }), j(l, k);
    const n = F(() => [...new Set(i.value.flatMap((p) => p.tags || []))]), r = F(() => {
      let p = i.value.map((c) => ({ ...c, is_shortlisted: _.value.has(c.id) }));
      return x.value && (p = p.filter((c) => _.value.has(c.id))), s.value && (p = p.filter((c) => {
        var B;
        return (B = c.tags) == null ? void 0 : B.includes(s.value);
      })), p.sort(y.value === "title" ? (c, B) => c.title.localeCompare(B.title) : (c, B) => (c.prep_time_minutes || 0) - (B.prep_time_minutes || 0));
    });
    return (p, c) => {
      const B = V("InputIcon"), q = V("InputText"), A = V("IconField"), g = V("Button"), e = V("Select"), h = V("Message");
      return o(), d("div", ye, [
        c[3] || (c[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", ke, [
          a(A, { class: "search-box" }, {
            default: G(() => [
              a(B, { class: "pi pi-search" }),
              a(q, {
                modelValue: l.value,
                "onUpdate:modelValue": c[0] || (c[0] = (f) => l.value = f),
                "aria-label": "Search recipes",
                type: "search",
                placeholder: "Search recipes…",
                class: "input-search",
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            _: 1
            /* STABLE */
          }),
          a(z(X), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", Ve, [
          a(z(D), {
            name: "recipe.list.filters",
            context: { active: x.value, toggle: T }
          }, null, 8, ["context"]),
          (o(!0), d(
            M,
            null,
            P(n.value, (f) => (o(), J(g, {
              key: f,
              label: f,
              size: "small",
              outlined: s.value !== f,
              "aria-pressed": s.value === f,
              onClick: (H) => s.value = s.value === f ? null : f
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          a(e, {
            modelValue: y.value,
            "onUpdate:modelValue": c[1] || (c[1] = (f) => y.value = f),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        b.value ? (o(), J(h, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Z(
              L(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : O("v-if", !0),
        r.value.length ? (o(), d("div", he, [
          (o(!0), d(
            M,
            null,
            P(r.value, (f) => (o(), J(be, {
              key: f.id,
              recipe: f,
              "show-cover": I.value,
              onSelect: N
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (o(), d("div", $e, [
          c[2] || (c[2] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          a(z(X), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Ce = /* @__PURE__ */ Q(Ie, [["__scopeId", "data-v-ee2f0a61"]]), we = { class: "recipe-detail-page" }, Se = {
  key: 0,
  class: "lang-bar"
}, xe = { class: "detail-header" }, Ue = { key: 0 }, Re = { class: "detail-actions" }, Te = ["src", "alt"], Ne = { class: "scaler-card" }, Be = { class: "servings-value" }, ze = {
  key: 2,
  class: "content-grid"
}, Le = { class: "ingredient-checklist" }, Oe = ["for"], Ae = {
  key: 0,
  class: "notes"
}, qe = { class: "steps-list" }, Me = /* @__PURE__ */ E({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(v, { emit: $ }) {
    const u = v, w = $, i = Y(), l = m(null), s = m(2), y = m({}), b = m(""), x = m(!1), _ = m(null), U = m(!1), I = F(() => u.id || u.recipeId || ""), S = m(null);
    let C = 0;
    j(I, async (n) => {
      if (!n) return;
      const r = ++C;
      b.value = "", S.value = null, _.value = null, U.value = !1;
      try {
        const p = await i.api.get(`/api/recipes/${n}`);
        if (r !== C) return;
        l.value = p, s.value = p.servings || 2, y.value = {}, x.value = !1;
        const c = await ee(i.api, p.group_id);
        if (r !== C) return;
        S.value = c;
        try {
          const B = await i.api.get("/api/x/core-shortlist");
          r === C && (x.value = B.some((q) => q.recipe_id === n));
        } catch {
        }
      } catch (p) {
        r === C && (l.value = null, b.value = (p == null ? void 0 : p.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function T(n) {
      var r;
      w("switchLanguage", n), (r = i.navigate) == null || r.call(i, `/recipes/${n}`);
    }
    function k(n) {
      var p;
      if (n == null) return "";
      const r = n * s.value / (((p = l.value) == null ? void 0 : p.servings) || 1);
      return Number.isInteger(r) ? String(r) : r.toFixed(1);
    }
    const N = F(() => ({
      recipe: l.value,
      customizedRecipe: _.value,
      customizeOpen: U.value,
      currentServings: s.value,
      checkedIngredients: y.value,
      setCustomizeOpen: (n) => {
        U.value = n;
      },
      applyCustomization: (n) => {
        _.value = n, y.value = {}, n != null && n.servings && (s.value = n.servings);
      },
      resetCustomization: () => {
        _.value = null, y.value = {}, l.value && (s.value = l.value.servings || 2);
      },
      onRecipeUpdated: (n) => {
        l.value = n, _.value = null, U.value = !1, y.value = {}, s.value = n.servings || 2;
      },
      setCheckedIngredients: (n) => {
        y.value = n;
      }
    }));
    return (n, r) => {
      var A, g;
      const p = V("Button"), c = V("Message"), B = V("Checkbox"), q = V("Tag");
      return o(), d("div", we, [
        a(p, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: r[0] || (r[0] = (e) => {
            var h, f;
            return (f = (h = z(i)).navigate) == null ? void 0 : f.call(h, "/recipes");
          })
        }),
        b.value ? (o(), J(c, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Z(
              L(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : O("v-if", !0),
        l.value ? (o(), d(
          M,
          { key: 1 },
          [
            ((A = l.value.languages) == null ? void 0 : A.length) > 1 ? (o(), d("div", Se, [
              r[3] || (r[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (o(!0), d(
                M,
                null,
                P(l.value.languages, (e) => (o(), J(p, {
                  key: e,
                  label: e.toUpperCase(),
                  size: "small",
                  outlined: e !== l.value.language,
                  onClick: (h) => T(`${l.value.group_id}_${e}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : O("v-if", !0),
            t("div", xe, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  L(((g = _.value) == null ? void 0 : g.title) || l.value.title),
                  1
                  /* TEXT */
                ),
                !_.value && l.value.description ? (o(), d(
                  "p",
                  Ue,
                  L(l.value.description),
                  1
                  /* TEXT */
                )) : O("v-if", !0)
              ]),
              t("div", Re, [
                a(z(D), {
                  name: "recipe.detail.actions",
                  context: N.value
                }, null, 8, ["context"]),
                a(z(D), {
                  name: "recipe.card.actions",
                  context: { recipe: l.value, isShortlisted: x.value }
                }, null, 8, ["context"]),
                a(z(X), {
                  hub: "recipe:actions",
                  context: { recipe: l.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            S.value ? (o(), d("img", {
              key: 1,
              src: z(i).url(`/api/assets/${S.value}/file`),
              alt: l.value.title,
              class: "recipe-cover"
            }, null, 8, Te)) : O("v-if", !0),
            t("div", Ne, [
              r[4] || (r[4] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              a(p, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: s.value <= 1,
                onClick: r[1] || (r[1] = (e) => s.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Be,
                L(s.value),
                1
                /* TEXT */
              ),
              a(p, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: r[2] || (r[2] = (e) => s.value++)
              })
            ]),
            a(z(D), {
              name: "recipe.detail.customize",
              context: N.value
            }, null, 8, ["context"]),
            _.value ? O("v-if", !0) : (o(), d("div", ze, [
              t("section", null, [
                r[5] || (r[5] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", Le, [
                  (o(!0), d(
                    M,
                    null,
                    P(l.value.ingredients, (e, h) => (o(), d("li", {
                      key: h,
                      class: "ingredient-item"
                    }, [
                      a(B, {
                        inputId: `ingredient-${h}`,
                        modelValue: y.value[h],
                        "onUpdate:modelValue": (f) => y.value[h] = f,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${h}`,
                        class: se({ struck: y.value[h] })
                      }, [
                        t(
                          "strong",
                          null,
                          L(k(e.quantity)),
                          1
                          /* TEXT */
                        ),
                        Z(
                          " " + L(e.unit) + " " + L(e.name),
                          1
                          /* TEXT */
                        ),
                        e.notes ? (o(), d(
                          "span",
                          Ae,
                          " (" + L(e.notes) + ")",
                          1
                          /* TEXT */
                        )) : O("v-if", !0)
                      ], 10, Oe)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                r[6] || (r[6] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", qe, [
                  (o(!0), d(
                    M,
                    null,
                    P(l.value.steps, (e) => (o(), d("li", {
                      key: e.id
                    }, [
                      t(
                        "p",
                        null,
                        L(e.instruction),
                        1
                        /* TEXT */
                      ),
                      e.timer_minutes ? (o(), J(q, {
                        key: 0,
                        value: `${e.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : O("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ])),
            a(z(D), {
              name: "recipe.detail.sidebar",
              context: { recipe: l.value }
            }, null, 8, ["context"]),
            a(z(D), {
              name: "recipe.detail.footer",
              context: { recipe: l.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : O("v-if", !0)
      ]);
    };
  }
}), De = /* @__PURE__ */ Q(Me, [["__scopeId", "data-v-e11bb6c8"]]), Pe = { class: "ingredient-row-list" }, Je = { class: "reorder-btns" }, Fe = /* @__PURE__ */ E({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(v, { emit: $ }) {
    const u = v, w = $, i = m(JSON.parse(JSON.stringify(u.modelValue || [])));
    j(() => u.modelValue, (_) => {
      i.value = JSON.parse(JSON.stringify(_ || []));
    }, { deep: !0 });
    const l = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((_) => ({ id: _, label: _ || "(none)" }));
    function s() {
      w("update:modelValue", i.value);
    }
    function y() {
      i.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), s();
    }
    function b(_) {
      i.value.splice(_, 1), s();
    }
    function x(_, U) {
      const I = _ + U;
      I < 0 || I >= i.value.length || (i.value.splice(I, 0, i.value.splice(_, 1)[0]), s());
    }
    return (_, U) => {
      const I = V("Button"), S = V("InputNumber"), C = V("Select"), T = V("InputText");
      return o(), d("div", Pe, [
        (o(!0), d(
          M,
          null,
          P(i.value, (k, N) => (o(), d("div", {
            key: k.id,
            class: "ingredient-row"
          }, [
            t("div", Je, [
              a(I, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: N === 0,
                onClick: (n) => x(N, -1)
              }, null, 8, ["disabled", "onClick"]),
              a(I, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: N === i.value.length - 1,
                onClick: (n) => x(N, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            a(S, {
              modelValue: k.quantity,
              "onUpdate:modelValue": [(n) => k.quantity = n, s],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${N + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(C, {
              modelValue: k.unit,
              "onUpdate:modelValue": [(n) => k.unit = n, s],
              options: z(l),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${N + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            a(T, {
              modelValue: k.name,
              "onUpdate:modelValue": (n) => k.name = n,
              class: "input-name",
              "aria-label": `Ingredient ${N + 1} name`,
              placeholder: "Ingredient name",
              onInput: s
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(T, {
              modelValue: k.notes,
              "onUpdate:modelValue": (n) => k.notes = n,
              class: "input-notes",
              "aria-label": `Ingredient ${N + 1} notes`,
              placeholder: "Notes",
              onInput: s
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(I, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (n) => b(N)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        a(I, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: y
        })
      ]);
    };
  }
}), Ee = /* @__PURE__ */ Q(Fe, [["__scopeId", "data-v-6a40d29c"]]), Qe = { class: "step-list" }, Ze = { class: "step-inputs" }, je = { class: "timer-row" }, Ge = ["for"], He = /* @__PURE__ */ E({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(v, { emit: $ }) {
    const u = v, w = $, i = m(JSON.parse(JSON.stringify(u.modelValue || [])));
    j(() => u.modelValue, (b) => {
      i.value = JSON.parse(JSON.stringify(b || []));
    }, { deep: !0 });
    function l() {
      w("update:modelValue", i.value);
    }
    function s() {
      i.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), l();
    }
    function y(b) {
      i.value.splice(b, 1), l();
    }
    return (b, x) => {
      const _ = V("Tag"), U = V("Textarea"), I = V("InputNumber"), S = V("Button");
      return o(), d("div", Qe, [
        (o(!0), d(
          M,
          null,
          P(i.value, (C, T) => (o(), d("div", {
            key: C.id,
            class: "step-row"
          }, [
            a(_, {
              value: String(T + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Ze, [
              a(U, {
                modelValue: C.instruction,
                "onUpdate:modelValue": (k) => C.instruction = k,
                class: "textarea-instruction",
                "aria-label": `Step ${T + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: l
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", je, [
                t("label", {
                  for: `timer-${C.id}`
                }, "Timer (min)", 8, Ge),
                a(I, {
                  inputId: `timer-${C.id}`,
                  modelValue: C.timer_minutes,
                  "onUpdate:modelValue": [(k) => C.timer_minutes = k, l],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            a(S, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (k) => y(T)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        a(S, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: s
        })
      ]);
    };
  }
}), Ke = /* @__PURE__ */ Q(He, [["__scopeId", "data-v-4c4135f0"]]), We = { class: "edit-top-bar" }, Xe = { class: "edit-top-actions" }, Ye = { class: "form-group" }, et = { class: "form-group" }, tt = { class: "form-row" }, lt = { class: "form-group" }, it = { class: "form-group" }, nt = { class: "form-group" }, at = { class: "form-group" }, ot = { class: "form-group" }, st = { class: "form-group" }, ut = ["disabled"], rt = { key: 0 }, ct = { key: 1 }, pt = ["src"], dt = { class: "actions-row" }, vt = /* @__PURE__ */ E({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(v, { emit: $ }) {
    var A;
    const u = v, w = $, i = Y(), l = F(() => u.id || u.recipeId || ""), s = m(""), y = m(""), b = m(((A = i.store.household.value) == null ? void 0 : A.languages.primary) || "en"), x = m(2), _ = m(""), U = m(null), I = m(null), S = m([]), C = m(null), T = m([]), k = m([]), N = m(1), n = m(!1), r = m("");
    j(l, async (g) => {
      if (g)
        try {
          const e = await i.api.get(`/api/recipes/${g}`);
          s.value = e.title, y.value = e.description || "", b.value = e.language, x.value = e.servings, U.value = e.prep_time_minutes, I.value = e.cook_time_minutes, S.value = [...e.tags], T.value = e.ingredients, k.value = e.steps, N.value = e.revision, C.value = await ee(i.api, e.group_id), _.value = e.group_id;
        } catch (e) {
          r.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function p(g) {
      var h;
      const e = (h = g.target.files) == null ? void 0 : h[0];
      if (!(!e || n.value || !_.value)) {
        n.value = !0, r.value = "";
        try {
          const f = new FormData();
          f.append("file", e), f.append("entity_type", "recipe"), f.append("entity_id", _.value), f.append("slot", "cover"), C.value = (await i.api.upload("/api/assets", f)).id, i.notify({ level: "success", message: "Cover image saved" });
        } catch (f) {
          r.value = (f == null ? void 0 : f.message) || "Could not upload image";
        } finally {
          n.value = !1;
        }
      }
    }
    async function c() {
      var e;
      if (!s.value.trim() || n.value) return;
      n.value = !0, r.value = "";
      const g = { title: s.value.trim(), description: y.value.trim(), language: b.value, servings: x.value, prep_time_minutes: U.value, cook_time_minutes: I.value, tags: S.value, ingredients: T.value, steps: k.value };
      try {
        const h = l.value ? await i.api.patch(`/api/recipes/${l.value}`, { ...g, revision: N.value }) : await i.api.post("/api/recipes", g);
        w("saved", h), i.notify({ level: "success", message: "Recipe saved" }), (e = i.navigate) == null || e.call(i, `/recipes/${h.id}`);
      } catch (h) {
        r.value = (h == null ? void 0 : h.message) || "Could not save recipe";
      } finally {
        n.value = !1;
      }
    }
    function B(g) {
      g.title && (s.value = g.title), g.description !== void 0 && (y.value = g.description || ""), g.servings && (x.value = g.servings), g.prep_time_minutes !== void 0 && (U.value = g.prep_time_minutes), g.cook_time_minutes !== void 0 && (I.value = g.cook_time_minutes), g.tags && (S.value = [...g.tags]), g.ingredients && (T.value = [...g.ingredients]), g.steps && (k.value = [...g.steps]);
    }
    const q = F(() => ({
      targetId: l.value,
      recipe: {
        id: l.value,
        title: s.value,
        description: y.value,
        language: b.value,
        servings: x.value,
        prep_time_minutes: U.value,
        cook_time_minutes: I.value,
        tags: S.value,
        ingredients: T.value,
        steps: k.value
      },
      applyAdaptation: B
    }));
    return (g, e) => {
      const h = V("Button"), f = V("Message"), H = V("InputText"), ne = V("Textarea"), K = V("InputNumber"), ae = V("AutoComplete");
      return o(), d(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: W(c, ["prevent"])
        },
        [
          t("div", We, [
            t(
              "h2",
              null,
              L(l.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            t("div", Xe, [
              a(z(D), {
                name: "recipe.edit.actions",
                context: q.value
              }, null, 8, ["context"]),
              a(h, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: n.value,
                onClick: e[0] || (e[0] = (R) => {
                  var te, le;
                  return (le = (te = z(i)).navigate) == null ? void 0 : le.call(te, l.value ? `/recipes/${l.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          r.value ? (o(), J(f, {
            key: 0,
            severity: "error"
          }, {
            default: G(() => [
              Z(
                L(r.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : O("v-if", !0),
          t("div", Ye, [
            e[10] || (e[10] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            a(H, {
              id: "recipe-title",
              modelValue: s.value,
              "onUpdate:modelValue": e[1] || (e[1] = (R) => s.value = R),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", et, [
            e[11] || (e[11] = t(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            a(ne, {
              id: "recipe-description",
              modelValue: y.value,
              "onUpdate:modelValue": e[2] || (e[2] = (R) => y.value = R),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", tt, [
            t("div", lt, [
              e[12] || (e[12] = t(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              a(H, {
                id: "recipe-language",
                modelValue: b.value,
                "onUpdate:modelValue": e[3] || (e[3] = (R) => b.value = R),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", it, [
              e[13] || (e[13] = t(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              a(K, {
                inputId: "recipe-servings",
                modelValue: x.value,
                "onUpdate:modelValue": e[4] || (e[4] = (R) => x.value = R),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", nt, [
              e[14] || (e[14] = t(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              a(K, {
                inputId: "recipe-prep",
                modelValue: U.value,
                "onUpdate:modelValue": e[5] || (e[5] = (R) => U.value = R),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", at, [
              e[15] || (e[15] = t(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              a(K, {
                inputId: "recipe-cook",
                modelValue: I.value,
                "onUpdate:modelValue": e[6] || (e[6] = (R) => I.value = R),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          t("div", ot, [
            e[16] || (e[16] = t(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            a(ae, {
              inputId: "recipe-tags",
              modelValue: S.value,
              "onUpdate:modelValue": e[7] || (e[7] = (R) => S.value = R),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", st, [
            e[17] || (e[17] = t(
              "label",
              { for: "recipe-cover" },
              "Cover image",
              -1
              /* CACHED */
            )),
            t("input", {
              id: "recipe-cover",
              type: "file",
              accept: "image/*",
              disabled: n.value || !_.value,
              onChange: p
            }, null, 40, ut),
            l.value ? (o(), d("small", ct, "Cover uploads are saved immediately, separately from recipe edits.")) : (o(), d("small", rt, "Save your recipe first to add a cover image.")),
            C.value ? (o(), d("img", {
              key: 2,
              src: z(i).url(`/api/assets/${C.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, pt)) : O("v-if", !0)
          ]),
          t("section", null, [
            e[18] || (e[18] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            a(Ee, {
              modelValue: T.value,
              "onUpdate:modelValue": e[8] || (e[8] = (R) => T.value = R)
            }, null, 8, ["modelValue"])
          ]),
          t("section", null, [
            e[19] || (e[19] = t(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            a(Ke, {
              modelValue: k.value,
              "onUpdate:modelValue": e[9] || (e[9] = (R) => k.value = R)
            }, null, 8, ["modelValue"])
          ]),
          t("div", dt, [
            a(h, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: n.value,
              disabled: !s.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ie = /* @__PURE__ */ Q(vt, [["__scopeId", "data-v-721514f8"]]);
function gt(v) {
  v.route({ path: "/recipes", component: Ce, nav: { label: "Recipes", icon: "book", order: 10 } }), v.route({ path: "/recipes/new", component: ie }), v.route({ path: "/recipes/:id", component: De }), v.route({ path: "/recipes/:id/edit", component: ie }), v.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), v.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      v.navigate ? v.navigate("/recipes/new") : window.location.href = v.url ? v.url("/recipes/new") : "/recipes/new";
    }
  }), v.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), v.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: ($) => {
      var u;
      (u = $ == null ? void 0 : $.recipe) != null && u.id && (v.navigate ? v.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = v.url ? v.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  gt as default
};
