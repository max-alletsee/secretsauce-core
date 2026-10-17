import { defineComponent as P, resolveComponent as f, openBlock as u, createElementBlock as d, createElementVNode as t, createVNode as s, withModifiers as H, unref as L, createTextVNode as z, toDisplayString as N, createCommentVNode as q, Fragment as M, renderList as O, createBlock as D, ref as m, onMounted as ne, watch as E, computed as Q, withCtx as Z, normalizeClass as ae } from "vue";
import { Slot as F, useSecretSauce as W, IntentTrigger as K } from "@secretsauce/ui";
const oe = { class: "cover-image" }, se = ["src", "alt"], ue = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, re = { class: "card-body" }, ce = { class: "card-header" }, pe = { class: "meta" }, de = { key: 0 }, ve = { key: 1 }, me = { class: "tags" }, _e = /* @__PURE__ */ P({
  __name: "RecipeCard",
  props: {
    recipe: {}
  },
  emits: ["select"],
  setup(c, { emit: $ }) {
    const r = c, h = $;
    return (l, n) => {
      const p = f("Button"), C = f("Tag");
      return u(), d("article", {
        class: "recipe-card",
        onClick: n[2] || (n[2] = (g) => h("select", r.recipe.id))
      }, [
        t("div", oe, [
          r.recipe.cover_asset_id ? (u(), d("img", {
            key: 0,
            src: r.recipe.cover_url || `/api/assets/${r.recipe.cover_asset_id}/file`,
            alt: r.recipe.title
          }, null, 8, se)) : (u(), d("i", ue))
        ]),
        t("div", re, [
          t("div", ce, [
            t("h3", null, [
              s(p, {
                label: r.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: n[0] || (n[0] = H((g) => h("select", r.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: n[1] || (n[1] = H(() => {
              }, ["stop"]))
            }, [
              s(L(F), {
                name: "recipe.card.actions",
                context: { recipe: r.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", pe, [
            r.recipe.prep_time_minutes ? (u(), d("span", de, [
              n[3] || (n[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              z(
                " " + N(r.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : q("v-if", !0),
            r.recipe.cook_time_minutes ? (u(), d(
              "span",
              ve,
              N(r.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : q("v-if", !0)
          ]),
          t("div", me, [
            (u(!0), d(
              M,
              null,
              O(r.recipe.tags, (g) => (u(), D(C, {
                key: g,
                value: g,
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
}), J = (c, $) => {
  const r = c.__vccOpts || c;
  for (const [h, l] of $)
    r[h] = l;
  return r;
}, ge = /* @__PURE__ */ J(_e, [["__scopeId", "data-v-d73374e4"]]);
async function X(c, $) {
  var r;
  if (!$) return null;
  try {
    return ((r = (await c.get("/api/assets", { entity_type: "recipe", entity_id: $ })).filter((l) => l.slot === "cover").at(-1)) == null ? void 0 : r.id) || null;
  } catch {
    return null;
  }
}
const fe = { class: "recipe-list-page" }, be = { class: "intent-header-bar" }, ye = { class: "filter-sort-bar" }, Ve = {
  key: 1,
  class: "recipes-grid"
}, $e = {
  key: 2,
  class: "empty-state"
}, ke = /* @__PURE__ */ P({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(c, { emit: $ }) {
    const r = $, h = W(), l = m([]), n = m(""), p = m(null), C = m("title"), g = m(""), U = m(!1), k = m(/* @__PURE__ */ new Set());
    let w = 0;
    async function y() {
      try {
        const o = await h.api.get("/api/x/core-shortlist");
        k.value = new Set(o.map((a) => a.recipe_id));
      } catch {
      }
    }
    async function B() {
      U.value = !U.value, U.value && await y();
    }
    async function S() {
      const o = ++w;
      g.value = "";
      try {
        const a = await h.api.get("/api/recipes", { q: n.value.trim() });
        if (o !== w) return;
        l.value = a.items;
        const x = await Promise.all(a.items.map(async (A) => {
          const _ = await X(h.api, A.group_id);
          return { ...A, cover_asset_id: _, cover_url: _ ? h.url(`/api/assets/${_}/file`) : null };
        }));
        o === w && (l.value = x);
      } catch (a) {
        o === w && (g.value = (a == null ? void 0 : a.message) || "Could not load recipes");
      }
    }
    function V(o) {
      var a;
      r("openRecipe", o), (a = h.navigate) == null || a.call(h, `/recipes/${o}`);
    }
    ne(() => {
      S(), y();
    }), E(n, S);
    const i = Q(() => [...new Set(l.value.flatMap((o) => o.tags || []))]), v = Q(() => {
      let o = l.value.map((a) => ({ ...a, is_shortlisted: k.value.has(a.id) }));
      return U.value && (o = o.filter((a) => k.value.has(a.id))), p.value && (o = o.filter((a) => {
        var x;
        return (x = a.tags) == null ? void 0 : x.includes(p.value);
      })), o.sort(C.value === "title" ? (a, x) => a.title.localeCompare(x.title) : (a, x) => (a.prep_time_minutes || 0) - (x.prep_time_minutes || 0));
    });
    return (o, a) => {
      const x = f("InputIcon"), A = f("InputText"), _ = f("IconField"), I = f("Button"), e = f("Select"), T = f("Message");
      return u(), d("div", fe, [
        a[3] || (a[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", be, [
          s(_, { class: "search-box" }, {
            default: Z(() => [
              s(x, { class: "pi pi-search" }),
              s(A, {
                modelValue: n.value,
                "onUpdate:modelValue": a[0] || (a[0] = (b) => n.value = b),
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
          s(L(K), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", ye, [
          s(L(F), {
            name: "recipe.list.filters",
            context: { active: U.value, toggle: B }
          }, null, 8, ["context"]),
          (u(!0), d(
            M,
            null,
            O(i.value, (b) => (u(), D(I, {
              key: b,
              label: b,
              size: "small",
              outlined: p.value !== b,
              "aria-pressed": p.value === b,
              onClick: (j) => p.value = p.value === b ? null : b
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          s(e, {
            modelValue: C.value,
            "onUpdate:modelValue": a[1] || (a[1] = (b) => C.value = b),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        g.value ? (u(), D(T, {
          key: 0,
          severity: "error"
        }, {
          default: Z(() => [
            z(
              N(g.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : q("v-if", !0),
        v.value.length ? (u(), d("div", Ve, [
          (u(!0), d(
            M,
            null,
            O(v.value, (b) => (u(), D(ge, {
              key: b.id,
              recipe: b,
              onSelect: V
            }, null, 8, ["recipe"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (u(), d("div", $e, [
          a[2] || (a[2] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          s(L(K), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), he = /* @__PURE__ */ J(ke, [["__scopeId", "data-v-edfe0742"]]), Ie = { class: "recipe-detail-page" }, Ce = {
  key: 0,
  class: "lang-bar"
}, we = { class: "detail-header" }, Se = { key: 0 }, Ue = { class: "detail-actions" }, Re = ["src", "alt"], xe = { class: "scaler-card" }, Te = { class: "servings-value" }, Ne = { class: "content-grid" }, Be = { class: "ingredient-checklist" }, Le = ["for"], qe = {
  key: 0,
  class: "notes"
}, Ae = { class: "steps-list" }, Me = /* @__PURE__ */ P({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(c, { emit: $ }) {
    const r = c, h = $, l = W(), n = m(null), p = m(2), C = m({}), g = m(""), U = m(!1), k = Q(() => r.id || r.recipeId || ""), w = m(null);
    let y = 0;
    E(k, async (V) => {
      if (!V) return;
      const i = ++y;
      g.value = "", w.value = null;
      try {
        const v = await l.api.get(`/api/recipes/${V}`);
        if (i !== y) return;
        n.value = v, p.value = v.servings || 2, C.value = {}, U.value = !1;
        const o = await X(l.api, v.group_id);
        if (i !== y) return;
        w.value = o;
        try {
          const a = await l.api.get("/api/x/core-shortlist");
          i === y && (U.value = a.some((x) => x.recipe_id === V));
        } catch {
        }
      } catch (v) {
        i === y && (n.value = null, g.value = (v == null ? void 0 : v.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function B(V) {
      var i;
      h("switchLanguage", V), (i = l.navigate) == null || i.call(l, `/recipes/${V}`);
    }
    function S(V) {
      var v;
      if (V == null) return "";
      const i = V * p.value / (((v = n.value) == null ? void 0 : v.servings) || 1);
      return Number.isInteger(i) ? String(i) : i.toFixed(1);
    }
    return (V, i) => {
      var A;
      const v = f("Button"), o = f("Message"), a = f("Checkbox"), x = f("Tag");
      return u(), d("div", Ie, [
        s(v, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: i[0] || (i[0] = (_) => {
            var I, e;
            return (e = (I = L(l)).navigate) == null ? void 0 : e.call(I, "/recipes");
          })
        }),
        g.value ? (u(), D(o, {
          key: 0,
          severity: "error"
        }, {
          default: Z(() => [
            z(
              N(g.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : q("v-if", !0),
        n.value ? (u(), d(
          M,
          { key: 1 },
          [
            ((A = n.value.languages) == null ? void 0 : A.length) > 1 ? (u(), d("div", Ce, [
              i[3] || (i[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (u(!0), d(
                M,
                null,
                O(n.value.languages, (_) => (u(), D(v, {
                  key: _,
                  label: _.toUpperCase(),
                  size: "small",
                  outlined: _ !== n.value.language,
                  onClick: (I) => B(`${n.value.group_id}_${_}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : q("v-if", !0),
            t("div", we, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  N(n.value.title),
                  1
                  /* TEXT */
                ),
                n.value.description ? (u(), d(
                  "p",
                  Se,
                  N(n.value.description),
                  1
                  /* TEXT */
                )) : q("v-if", !0)
              ]),
              t("div", Ue, [
                s(L(F), {
                  name: "recipe.card.actions",
                  context: { recipe: n.value, isShortlisted: U.value }
                }, null, 8, ["context"]),
                s(L(K), {
                  hub: "recipe:actions",
                  context: { recipe: n.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            w.value ? (u(), d("img", {
              key: 1,
              src: L(l).url(`/api/assets/${w.value}/file`),
              alt: n.value.title,
              class: "recipe-cover"
            }, null, 8, Re)) : q("v-if", !0),
            t("div", xe, [
              i[4] || (i[4] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              s(v, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: p.value <= 1,
                onClick: i[1] || (i[1] = (_) => p.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Te,
                N(p.value),
                1
                /* TEXT */
              ),
              s(v, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: i[2] || (i[2] = (_) => p.value++)
              })
            ]),
            t("div", Ne, [
              t("section", null, [
                i[5] || (i[5] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", Be, [
                  (u(!0), d(
                    M,
                    null,
                    O(n.value.ingredients, (_, I) => (u(), d("li", {
                      key: I,
                      class: "ingredient-item"
                    }, [
                      s(a, {
                        inputId: `ingredient-${I}`,
                        modelValue: C.value[I],
                        "onUpdate:modelValue": (e) => C.value[I] = e,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${I}`,
                        class: ae({ struck: C.value[I] })
                      }, [
                        t(
                          "strong",
                          null,
                          N(S(_.quantity)),
                          1
                          /* TEXT */
                        ),
                        z(
                          " " + N(_.unit) + " " + N(_.name),
                          1
                          /* TEXT */
                        ),
                        _.notes ? (u(), d(
                          "span",
                          qe,
                          " (" + N(_.notes) + ")",
                          1
                          /* TEXT */
                        )) : q("v-if", !0)
                      ], 10, Le)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                i[6] || (i[6] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", Ae, [
                  (u(!0), d(
                    M,
                    null,
                    O(n.value.steps, (_) => (u(), d("li", {
                      key: _.id
                    }, [
                      t(
                        "p",
                        null,
                        N(_.instruction),
                        1
                        /* TEXT */
                      ),
                      _.timer_minutes ? (u(), D(x, {
                        key: 0,
                        value: `${_.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : q("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ]),
            s(L(F), {
              name: "recipe.detail.sidebar",
              context: { recipe: n.value }
            }, null, 8, ["context"]),
            s(L(F), {
              name: "recipe.detail.footer",
              context: { recipe: n.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : q("v-if", !0)
      ]);
    };
  }
}), Oe = /* @__PURE__ */ J(Me, [["__scopeId", "data-v-10a15bc6"]]), De = { class: "ingredient-row-list" }, Pe = { class: "reorder-btns" }, Je = /* @__PURE__ */ P({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(c, { emit: $ }) {
    const r = c, h = $, l = m(JSON.parse(JSON.stringify(r.modelValue || [])));
    E(() => r.modelValue, (k) => {
      l.value = JSON.parse(JSON.stringify(k || []));
    }, { deep: !0 });
    const n = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((k) => ({ id: k, label: k || "(none)" }));
    function p() {
      h("update:modelValue", l.value);
    }
    function C() {
      l.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), p();
    }
    function g(k) {
      l.value.splice(k, 1), p();
    }
    function U(k, w) {
      const y = k + w;
      y < 0 || y >= l.value.length || (l.value.splice(y, 0, l.value.splice(k, 1)[0]), p());
    }
    return (k, w) => {
      const y = f("Button"), B = f("InputNumber"), S = f("Select"), V = f("InputText");
      return u(), d("div", De, [
        (u(!0), d(
          M,
          null,
          O(l.value, (i, v) => (u(), d("div", {
            key: i.id,
            class: "ingredient-row"
          }, [
            t("div", Pe, [
              s(y, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: v === 0,
                onClick: (o) => U(v, -1)
              }, null, 8, ["disabled", "onClick"]),
              s(y, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: v === l.value.length - 1,
                onClick: (o) => U(v, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            s(B, {
              modelValue: i.quantity,
              "onUpdate:modelValue": [(o) => i.quantity = o, p],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${v + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(S, {
              modelValue: i.unit,
              "onUpdate:modelValue": [(o) => i.unit = o, p],
              options: L(n),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${v + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            s(V, {
              modelValue: i.name,
              "onUpdate:modelValue": (o) => i.name = o,
              class: "input-name",
              "aria-label": `Ingredient ${v + 1} name`,
              placeholder: "Ingredient name",
              onInput: p
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(V, {
              modelValue: i.notes,
              "onUpdate:modelValue": (o) => i.notes = o,
              class: "input-notes",
              "aria-label": `Ingredient ${v + 1} notes`,
              placeholder: "Notes",
              onInput: p
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(y, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (o) => g(v)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        s(y, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: C
        })
      ]);
    };
  }
}), Fe = /* @__PURE__ */ J(Je, [["__scopeId", "data-v-2ffdf2db"]]), ze = { class: "step-list" }, Ee = { class: "step-inputs" }, Qe = { class: "timer-row" }, Ze = ["for"], je = /* @__PURE__ */ P({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(c, { emit: $ }) {
    const r = c, h = $, l = m(JSON.parse(JSON.stringify(r.modelValue || [])));
    E(() => r.modelValue, (g) => {
      l.value = JSON.parse(JSON.stringify(g || []));
    }, { deep: !0 });
    function n() {
      h("update:modelValue", l.value);
    }
    function p() {
      l.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), n();
    }
    function C(g) {
      l.value.splice(g, 1), n();
    }
    return (g, U) => {
      const k = f("Tag"), w = f("Textarea"), y = f("InputNumber"), B = f("Button");
      return u(), d("div", ze, [
        (u(!0), d(
          M,
          null,
          O(l.value, (S, V) => (u(), d("div", {
            key: S.id,
            class: "step-row"
          }, [
            s(k, {
              value: String(V + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Ee, [
              s(w, {
                modelValue: S.instruction,
                "onUpdate:modelValue": (i) => S.instruction = i,
                class: "textarea-instruction",
                "aria-label": `Step ${V + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: n
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", Qe, [
                t("label", {
                  for: `timer-${S.id}`
                }, "Timer (min)", 8, Ze),
                s(y, {
                  inputId: `timer-${S.id}`,
                  modelValue: S.timer_minutes,
                  "onUpdate:modelValue": [(i) => S.timer_minutes = i, n],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            s(B, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (i) => C(V)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        s(B, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: p
        })
      ]);
    };
  }
}), Ge = /* @__PURE__ */ J(je, [["__scopeId", "data-v-5fad147a"]]), He = { class: "edit-top-bar" }, Ke = { class: "form-group" }, We = { class: "form-group" }, Xe = { class: "form-row" }, Ye = { class: "form-group" }, et = { class: "form-group" }, tt = { class: "form-group" }, lt = { class: "form-group" }, it = { class: "form-group" }, nt = { class: "form-group" }, at = ["disabled"], ot = { key: 0 }, st = { key: 1 }, ut = ["src"], rt = { class: "actions-row" }, ct = /* @__PURE__ */ P({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(c, { emit: $ }) {
    var _;
    const r = c, h = $, l = W(), n = Q(() => r.id || r.recipeId || ""), p = m(""), C = m(""), g = m(((_ = l.store.household.value) == null ? void 0 : _.languages.primary) || "en"), U = m(2), k = m(""), w = m(null), y = m(null), B = m([]), S = m(null), V = m([]), i = m([]), v = m(1), o = m(!1), a = m("");
    E(n, async (I) => {
      if (I)
        try {
          const e = await l.api.get(`/api/recipes/${I}`);
          p.value = e.title, C.value = e.description || "", g.value = e.language, U.value = e.servings, w.value = e.prep_time_minutes, y.value = e.cook_time_minutes, B.value = [...e.tags], V.value = e.ingredients, i.value = e.steps, v.value = e.revision, S.value = await X(l.api, e.group_id), k.value = e.group_id;
        } catch (e) {
          a.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function x(I) {
      var T;
      const e = (T = I.target.files) == null ? void 0 : T[0];
      if (!(!e || o.value || !k.value)) {
        o.value = !0, a.value = "";
        try {
          const b = new FormData();
          b.append("file", e), b.append("entity_type", "recipe"), b.append("entity_id", k.value), b.append("slot", "cover"), S.value = (await l.api.upload("/api/assets", b)).id, l.notify({ level: "success", message: "Cover image saved" });
        } catch (b) {
          a.value = (b == null ? void 0 : b.message) || "Could not upload image";
        } finally {
          o.value = !1;
        }
      }
    }
    async function A() {
      var e;
      if (!p.value.trim() || o.value) return;
      o.value = !0, a.value = "";
      const I = { title: p.value.trim(), description: C.value.trim(), language: g.value, servings: U.value, prep_time_minutes: w.value, cook_time_minutes: y.value, tags: B.value, ingredients: V.value, steps: i.value };
      try {
        const T = n.value ? await l.api.patch(`/api/recipes/${n.value}`, { ...I, revision: v.value }) : await l.api.post("/api/recipes", I);
        h("saved", T), l.notify({ level: "success", message: "Recipe saved" }), (e = l.navigate) == null || e.call(l, `/recipes/${T.id}`);
      } catch (T) {
        a.value = (T == null ? void 0 : T.message) || "Could not save recipe";
      } finally {
        o.value = !1;
      }
    }
    return (I, e) => {
      const T = f("Button"), b = f("Message"), j = f("InputText"), le = f("Textarea"), G = f("InputNumber"), ie = f("AutoComplete");
      return u(), d(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: H(A, ["prevent"])
        },
        [
          t("div", He, [
            t(
              "h2",
              null,
              N(n.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            s(T, {
              label: "Cancel",
              class: "btn-cancel",
              severity: "secondary",
              disabled: o.value,
              onClick: e[0] || (e[0] = (R) => {
                var Y, ee;
                return (ee = (Y = L(l)).navigate) == null ? void 0 : ee.call(Y, n.value ? `/recipes/${n.value}` : "/recipes");
              })
            }, null, 8, ["disabled"])
          ]),
          a.value ? (u(), D(b, {
            key: 0,
            severity: "error"
          }, {
            default: Z(() => [
              z(
                N(a.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : q("v-if", !0),
          t("div", Ke, [
            e[10] || (e[10] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            s(j, {
              id: "recipe-title",
              modelValue: p.value,
              "onUpdate:modelValue": e[1] || (e[1] = (R) => p.value = R),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", We, [
            e[11] || (e[11] = t(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            s(le, {
              id: "recipe-description",
              modelValue: C.value,
              "onUpdate:modelValue": e[2] || (e[2] = (R) => C.value = R),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Xe, [
            t("div", Ye, [
              e[12] || (e[12] = t(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              s(j, {
                id: "recipe-language",
                modelValue: g.value,
                "onUpdate:modelValue": e[3] || (e[3] = (R) => g.value = R),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", et, [
              e[13] || (e[13] = t(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              s(G, {
                inputId: "recipe-servings",
                modelValue: U.value,
                "onUpdate:modelValue": e[4] || (e[4] = (R) => U.value = R),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", tt, [
              e[14] || (e[14] = t(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              s(G, {
                inputId: "recipe-prep",
                modelValue: w.value,
                "onUpdate:modelValue": e[5] || (e[5] = (R) => w.value = R),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", lt, [
              e[15] || (e[15] = t(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              s(G, {
                inputId: "recipe-cook",
                modelValue: y.value,
                "onUpdate:modelValue": e[6] || (e[6] = (R) => y.value = R),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          t("div", it, [
            e[16] || (e[16] = t(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            s(ie, {
              inputId: "recipe-tags",
              modelValue: B.value,
              "onUpdate:modelValue": e[7] || (e[7] = (R) => B.value = R),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", nt, [
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
              disabled: o.value || !k.value,
              onChange: x
            }, null, 40, at),
            n.value ? (u(), d("small", st, "Cover uploads are saved immediately, separately from recipe edits.")) : (u(), d("small", ot, "Save your recipe first to add a cover image.")),
            S.value ? (u(), d("img", {
              key: 2,
              src: L(l).url(`/api/assets/${S.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, ut)) : q("v-if", !0)
          ]),
          t("section", null, [
            e[18] || (e[18] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            s(Fe, {
              modelValue: V.value,
              "onUpdate:modelValue": e[8] || (e[8] = (R) => V.value = R)
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
            s(Ge, {
              modelValue: i.value,
              "onUpdate:modelValue": e[9] || (e[9] = (R) => i.value = R)
            }, null, 8, ["modelValue"])
          ]),
          t("div", rt, [
            s(T, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: o.value,
              disabled: !p.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), te = /* @__PURE__ */ J(ct, [["__scopeId", "data-v-6c8a1df8"]]);
function vt(c) {
  c.route({ path: "/recipes", component: he, nav: { label: "Recipes", icon: "book", order: 10 } }), c.route({ path: "/recipes/new", component: te }), c.route({ path: "/recipes/:id", component: Oe }), c.route({ path: "/recipes/:id/edit", component: te }), c.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), c.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      c.navigate ? c.navigate("/recipes/new") : window.location.href = c.url ? c.url("/recipes/new") : "/recipes/new";
    }
  }), c.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), c.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: ($) => {
      var r;
      (r = $ == null ? void 0 : $.recipe) != null && r.id && (c.navigate ? c.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = c.url ? c.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  vt as default
};
