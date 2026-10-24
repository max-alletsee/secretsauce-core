import { defineComponent as z, resolveComponent as k, openBlock as u, createElementBlock as d, createElementVNode as t, createVNode as s, withModifiers as K, unref as B, createTextVNode as Q, toDisplayString as N, createCommentVNode as A, Fragment as D, renderList as P, createBlock as J, ref as m, onMounted as oe, watch as j, computed as Z, withCtx as G, normalizeClass as se } from "vue";
import { Slot as F, useSecretSauce as X, IntentTrigger as W } from "@secretsauce/ui";
const ue = { class: "cover-image" }, re = ["src", "alt"], ce = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, pe = { class: "card-body" }, de = { class: "card-header" }, ve = { class: "meta" }, me = { key: 0 }, _e = { key: 1 }, ge = { class: "tags" }, fe = /* @__PURE__ */ z({
  __name: "RecipeCard",
  props: {
    recipe: {}
  },
  emits: ["select"],
  setup(p, { emit: V }) {
    const r = p, h = V;
    return (n, i) => {
      const c = k("Button"), I = k("Tag");
      return u(), d("article", {
        class: "recipe-card",
        onClick: i[2] || (i[2] = (_) => h("select", r.recipe.id))
      }, [
        t("div", ue, [
          r.recipe.cover_asset_id ? (u(), d("img", {
            key: 0,
            src: r.recipe.cover_url || `/api/assets/${r.recipe.cover_asset_id}/file`,
            alt: r.recipe.title
          }, null, 8, re)) : (u(), d("i", ce))
        ]),
        t("div", pe, [
          t("div", de, [
            t("h3", null, [
              s(c, {
                label: r.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: i[0] || (i[0] = K((_) => h("select", r.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: i[1] || (i[1] = K(() => {
              }, ["stop"]))
            }, [
              s(B(F), {
                name: "recipe.card.actions",
                context: { recipe: r.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", ve, [
            r.recipe.prep_time_minutes ? (u(), d("span", me, [
              i[3] || (i[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Q(
                " " + N(r.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : A("v-if", !0),
            r.recipe.cook_time_minutes ? (u(), d(
              "span",
              _e,
              N(r.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          t("div", ge, [
            (u(!0), d(
              D,
              null,
              P(r.recipe.tags, (_) => (u(), J(I, {
                key: _,
                value: _,
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
}), E = (p, V) => {
  const r = p.__vccOpts || p;
  for (const [h, n] of V)
    r[h] = n;
  return r;
}, be = /* @__PURE__ */ E(fe, [["__scopeId", "data-v-6ff66378"]]);
async function Y(p, V) {
  var r;
  if (!V) return null;
  try {
    return ((r = (await p.get("/api/assets", { entity_type: "recipe", entity_id: V })).filter((n) => n.slot === "cover").at(-1)) == null ? void 0 : r.id) || null;
  } catch {
    return null;
  }
}
const ye = { class: "recipe-list-page" }, ke = { class: "intent-header-bar" }, Ve = { class: "filter-sort-bar" }, $e = {
  key: 1,
  class: "recipes-grid"
}, he = {
  key: 2,
  class: "empty-state"
}, Ie = /* @__PURE__ */ z({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(p, { emit: V }) {
    const r = V, h = X(), n = m([]), i = m(""), c = m(null), I = m("title"), _ = m(""), w = m(!1), $ = m(/* @__PURE__ */ new Set());
    let C = 0;
    async function f() {
      try {
        const o = await h.api.get("/api/x/core-shortlist");
        $.value = new Set(o.map((a) => a.recipe_id));
      } catch {
      }
    }
    async function R() {
      w.value = !w.value, w.value && await f();
    }
    async function S() {
      const o = ++C;
      _.value = "";
      try {
        const a = await h.api.get("/api/recipes", { q: i.value.trim() });
        if (o !== C) return;
        n.value = a.items;
        const x = await Promise.all(a.items.map(async (M) => {
          const y = await Y(h.api, M.group_id);
          return { ...M, cover_asset_id: y, cover_url: y ? h.url(`/api/assets/${y}/file`) : null };
        }));
        o === C && (n.value = x);
      } catch (a) {
        o === C && (_.value = (a == null ? void 0 : a.message) || "Could not load recipes");
      }
    }
    function b(o) {
      var a;
      r("openRecipe", o), (a = h.navigate) == null || a.call(h, `/recipes/${o}`);
    }
    oe(() => {
      S(), f();
    }), j(i, S);
    const l = Z(() => [...new Set(n.value.flatMap((o) => o.tags || []))]), v = Z(() => {
      let o = n.value.map((a) => ({ ...a, is_shortlisted: $.value.has(a.id) }));
      return w.value && (o = o.filter((a) => $.value.has(a.id))), c.value && (o = o.filter((a) => {
        var x;
        return (x = a.tags) == null ? void 0 : x.includes(c.value);
      })), o.sort(I.value === "title" ? (a, x) => a.title.localeCompare(x.title) : (a, x) => (a.prep_time_minutes || 0) - (x.prep_time_minutes || 0));
    });
    return (o, a) => {
      const x = k("InputIcon"), M = k("InputText"), y = k("IconField"), T = k("Button"), O = k("Select"), g = k("Message");
      return u(), d("div", ye, [
        a[3] || (a[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", ke, [
          s(y, { class: "search-box" }, {
            default: G(() => [
              s(x, { class: "pi pi-search" }),
              s(M, {
                modelValue: i.value,
                "onUpdate:modelValue": a[0] || (a[0] = (e) => i.value = e),
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
          s(B(W), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", Ve, [
          s(B(F), {
            name: "recipe.list.filters",
            context: { active: w.value, toggle: R }
          }, null, 8, ["context"]),
          (u(!0), d(
            D,
            null,
            P(l.value, (e) => (u(), J(T, {
              key: e,
              label: e,
              size: "small",
              outlined: c.value !== e,
              "aria-pressed": c.value === e,
              onClick: (L) => c.value = c.value === e ? null : e
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          s(O, {
            modelValue: I.value,
            "onUpdate:modelValue": a[1] || (a[1] = (e) => I.value = e),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        _.value ? (u(), J(g, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Q(
              N(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        v.value.length ? (u(), d("div", $e, [
          (u(!0), d(
            D,
            null,
            P(v.value, (e) => (u(), J(be, {
              key: e.id,
              recipe: e,
              onSelect: b
            }, null, 8, ["recipe"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (u(), d("div", he, [
          a[2] || (a[2] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          s(B(W), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Ce = /* @__PURE__ */ E(Ie, [["__scopeId", "data-v-1480bd84"]]), we = { class: "recipe-detail-page" }, Se = {
  key: 0,
  class: "lang-bar"
}, Ue = { class: "detail-header" }, xe = { key: 0 }, Re = { class: "detail-actions" }, Te = ["src", "alt"], Ne = { class: "scaler-card" }, Be = { class: "servings-value" }, Le = { class: "content-grid" }, Ae = { class: "ingredient-checklist" }, qe = ["for"], Me = {
  key: 0,
  class: "notes"
}, Oe = { class: "steps-list" }, De = /* @__PURE__ */ z({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(p, { emit: V }) {
    const r = p, h = V, n = X(), i = m(null), c = m(2), I = m({}), _ = m(""), w = m(!1), $ = Z(() => r.id || r.recipeId || ""), C = m(null);
    let f = 0;
    j($, async (b) => {
      if (!b) return;
      const l = ++f;
      _.value = "", C.value = null;
      try {
        const v = await n.api.get(`/api/recipes/${b}`);
        if (l !== f) return;
        i.value = v, c.value = v.servings || 2, I.value = {}, w.value = !1;
        const o = await Y(n.api, v.group_id);
        if (l !== f) return;
        C.value = o;
        try {
          const a = await n.api.get("/api/x/core-shortlist");
          l === f && (w.value = a.some((x) => x.recipe_id === b));
        } catch {
        }
      } catch (v) {
        l === f && (i.value = null, _.value = (v == null ? void 0 : v.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function R(b) {
      var l;
      h("switchLanguage", b), (l = n.navigate) == null || l.call(n, `/recipes/${b}`);
    }
    function S(b) {
      var v;
      if (b == null) return "";
      const l = b * c.value / (((v = i.value) == null ? void 0 : v.servings) || 1);
      return Number.isInteger(l) ? String(l) : l.toFixed(1);
    }
    return (b, l) => {
      var M;
      const v = k("Button"), o = k("Message"), a = k("Checkbox"), x = k("Tag");
      return u(), d("div", we, [
        s(v, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: l[0] || (l[0] = (y) => {
            var T, O;
            return (O = (T = B(n)).navigate) == null ? void 0 : O.call(T, "/recipes");
          })
        }),
        _.value ? (u(), J(o, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Q(
              N(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        i.value ? (u(), d(
          D,
          { key: 1 },
          [
            ((M = i.value.languages) == null ? void 0 : M.length) > 1 ? (u(), d("div", Se, [
              l[3] || (l[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (u(!0), d(
                D,
                null,
                P(i.value.languages, (y) => (u(), J(v, {
                  key: y,
                  label: y.toUpperCase(),
                  size: "small",
                  outlined: y !== i.value.language,
                  onClick: (T) => R(`${i.value.group_id}_${y}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : A("v-if", !0),
            t("div", Ue, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  N(i.value.title),
                  1
                  /* TEXT */
                ),
                i.value.description ? (u(), d(
                  "p",
                  xe,
                  N(i.value.description),
                  1
                  /* TEXT */
                )) : A("v-if", !0)
              ]),
              t("div", Re, [
                s(B(F), {
                  name: "recipe.card.actions",
                  context: { recipe: i.value, isShortlisted: w.value }
                }, null, 8, ["context"]),
                s(B(W), {
                  hub: "recipe:actions",
                  context: { recipe: i.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            C.value ? (u(), d("img", {
              key: 1,
              src: B(n).url(`/api/assets/${C.value}/file`),
              alt: i.value.title,
              class: "recipe-cover"
            }, null, 8, Te)) : A("v-if", !0),
            t("div", Ne, [
              l[4] || (l[4] = t(
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
                disabled: c.value <= 1,
                onClick: l[1] || (l[1] = (y) => c.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Be,
                N(c.value),
                1
                /* TEXT */
              ),
              s(v, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: l[2] || (l[2] = (y) => c.value++)
              })
            ]),
            t("div", Le, [
              t("section", null, [
                l[5] || (l[5] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", Ae, [
                  (u(!0), d(
                    D,
                    null,
                    P(i.value.ingredients, (y, T) => (u(), d("li", {
                      key: T,
                      class: "ingredient-item"
                    }, [
                      s(a, {
                        inputId: `ingredient-${T}`,
                        modelValue: I.value[T],
                        "onUpdate:modelValue": (O) => I.value[T] = O,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${T}`,
                        class: se({ struck: I.value[T] })
                      }, [
                        t(
                          "strong",
                          null,
                          N(S(y.quantity)),
                          1
                          /* TEXT */
                        ),
                        Q(
                          " " + N(y.unit) + " " + N(y.name),
                          1
                          /* TEXT */
                        ),
                        y.notes ? (u(), d(
                          "span",
                          Me,
                          " (" + N(y.notes) + ")",
                          1
                          /* TEXT */
                        )) : A("v-if", !0)
                      ], 10, qe)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                l[6] || (l[6] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", Oe, [
                  (u(!0), d(
                    D,
                    null,
                    P(i.value.steps, (y) => (u(), d("li", {
                      key: y.id
                    }, [
                      t(
                        "p",
                        null,
                        N(y.instruction),
                        1
                        /* TEXT */
                      ),
                      y.timer_minutes ? (u(), J(x, {
                        key: 0,
                        value: `${y.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : A("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ]),
            s(B(F), {
              name: "recipe.detail.sidebar",
              context: { recipe: i.value }
            }, null, 8, ["context"]),
            s(B(F), {
              name: "recipe.detail.footer",
              context: { recipe: i.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : A("v-if", !0)
      ]);
    };
  }
}), Pe = /* @__PURE__ */ E(De, [["__scopeId", "data-v-405081f0"]]), Je = { class: "ingredient-row-list" }, Fe = { class: "reorder-btns" }, ze = /* @__PURE__ */ z({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(p, { emit: V }) {
    const r = p, h = V, n = m(JSON.parse(JSON.stringify(r.modelValue || [])));
    j(() => r.modelValue, ($) => {
      n.value = JSON.parse(JSON.stringify($ || []));
    }, { deep: !0 });
    const i = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map(($) => ({ id: $, label: $ || "(none)" }));
    function c() {
      h("update:modelValue", n.value);
    }
    function I() {
      n.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), c();
    }
    function _($) {
      n.value.splice($, 1), c();
    }
    function w($, C) {
      const f = $ + C;
      f < 0 || f >= n.value.length || (n.value.splice(f, 0, n.value.splice($, 1)[0]), c());
    }
    return ($, C) => {
      const f = k("Button"), R = k("InputNumber"), S = k("Select"), b = k("InputText");
      return u(), d("div", Je, [
        (u(!0), d(
          D,
          null,
          P(n.value, (l, v) => (u(), d("div", {
            key: l.id,
            class: "ingredient-row"
          }, [
            t("div", Fe, [
              s(f, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: v === 0,
                onClick: (o) => w(v, -1)
              }, null, 8, ["disabled", "onClick"]),
              s(f, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: v === n.value.length - 1,
                onClick: (o) => w(v, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            s(R, {
              modelValue: l.quantity,
              "onUpdate:modelValue": [(o) => l.quantity = o, c],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${v + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(S, {
              modelValue: l.unit,
              "onUpdate:modelValue": [(o) => l.unit = o, c],
              options: B(i),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${v + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            s(b, {
              modelValue: l.name,
              "onUpdate:modelValue": (o) => l.name = o,
              class: "input-name",
              "aria-label": `Ingredient ${v + 1} name`,
              placeholder: "Ingredient name",
              onInput: c
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(b, {
              modelValue: l.notes,
              "onUpdate:modelValue": (o) => l.notes = o,
              class: "input-notes",
              "aria-label": `Ingredient ${v + 1} notes`,
              placeholder: "Notes",
              onInput: c
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(f, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (o) => _(v)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        s(f, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: I
        })
      ]);
    };
  }
}), Ee = /* @__PURE__ */ E(ze, [["__scopeId", "data-v-6a40d29c"]]), Qe = { class: "step-list" }, Ze = { class: "step-inputs" }, je = { class: "timer-row" }, Ge = ["for"], He = /* @__PURE__ */ z({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(p, { emit: V }) {
    const r = p, h = V, n = m(JSON.parse(JSON.stringify(r.modelValue || [])));
    j(() => r.modelValue, (_) => {
      n.value = JSON.parse(JSON.stringify(_ || []));
    }, { deep: !0 });
    function i() {
      h("update:modelValue", n.value);
    }
    function c() {
      n.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), i();
    }
    function I(_) {
      n.value.splice(_, 1), i();
    }
    return (_, w) => {
      const $ = k("Tag"), C = k("Textarea"), f = k("InputNumber"), R = k("Button");
      return u(), d("div", Qe, [
        (u(!0), d(
          D,
          null,
          P(n.value, (S, b) => (u(), d("div", {
            key: S.id,
            class: "step-row"
          }, [
            s($, {
              value: String(b + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Ze, [
              s(C, {
                modelValue: S.instruction,
                "onUpdate:modelValue": (l) => S.instruction = l,
                class: "textarea-instruction",
                "aria-label": `Step ${b + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: i
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", je, [
                t("label", {
                  for: `timer-${S.id}`
                }, "Timer (min)", 8, Ge),
                s(f, {
                  inputId: `timer-${S.id}`,
                  modelValue: S.timer_minutes,
                  "onUpdate:modelValue": [(l) => S.timer_minutes = l, i],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            s(R, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (l) => I(b)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        s(R, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: c
        })
      ]);
    };
  }
}), Ke = /* @__PURE__ */ E(He, [["__scopeId", "data-v-4c4135f0"]]), We = { class: "edit-top-bar" }, Xe = { class: "edit-top-actions" }, Ye = { class: "form-group" }, et = { class: "form-group" }, tt = { class: "form-row" }, lt = { class: "form-group" }, it = { class: "form-group" }, nt = { class: "form-group" }, at = { class: "form-group" }, ot = { class: "form-group" }, st = { class: "form-group" }, ut = ["disabled"], rt = { key: 0 }, ct = { key: 1 }, pt = ["src"], dt = { class: "actions-row" }, vt = /* @__PURE__ */ z({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(p, { emit: V }) {
    var O;
    const r = p, h = V, n = X(), i = Z(() => r.id || r.recipeId || ""), c = m(""), I = m(""), _ = m(((O = n.store.household.value) == null ? void 0 : O.languages.primary) || "en"), w = m(2), $ = m(""), C = m(null), f = m(null), R = m([]), S = m(null), b = m([]), l = m([]), v = m(1), o = m(!1), a = m("");
    j(i, async (g) => {
      if (g)
        try {
          const e = await n.api.get(`/api/recipes/${g}`);
          c.value = e.title, I.value = e.description || "", _.value = e.language, w.value = e.servings, C.value = e.prep_time_minutes, f.value = e.cook_time_minutes, R.value = [...e.tags], b.value = e.ingredients, l.value = e.steps, v.value = e.revision, S.value = await Y(n.api, e.group_id), $.value = e.group_id;
        } catch (e) {
          a.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function x(g) {
      var L;
      const e = (L = g.target.files) == null ? void 0 : L[0];
      if (!(!e || o.value || !$.value)) {
        o.value = !0, a.value = "";
        try {
          const q = new FormData();
          q.append("file", e), q.append("entity_type", "recipe"), q.append("entity_id", $.value), q.append("slot", "cover"), S.value = (await n.api.upload("/api/assets", q)).id, n.notify({ level: "success", message: "Cover image saved" });
        } catch (q) {
          a.value = (q == null ? void 0 : q.message) || "Could not upload image";
        } finally {
          o.value = !1;
        }
      }
    }
    async function M() {
      var e;
      if (!c.value.trim() || o.value) return;
      o.value = !0, a.value = "";
      const g = { title: c.value.trim(), description: I.value.trim(), language: _.value, servings: w.value, prep_time_minutes: C.value, cook_time_minutes: f.value, tags: R.value, ingredients: b.value, steps: l.value };
      try {
        const L = i.value ? await n.api.patch(`/api/recipes/${i.value}`, { ...g, revision: v.value }) : await n.api.post("/api/recipes", g);
        h("saved", L), n.notify({ level: "success", message: "Recipe saved" }), (e = n.navigate) == null || e.call(n, `/recipes/${L.id}`);
      } catch (L) {
        a.value = (L == null ? void 0 : L.message) || "Could not save recipe";
      } finally {
        o.value = !1;
      }
    }
    function y(g) {
      g.title && (c.value = g.title), g.description !== void 0 && (I.value = g.description || ""), g.servings && (w.value = g.servings), g.prep_time_minutes !== void 0 && (C.value = g.prep_time_minutes), g.cook_time_minutes !== void 0 && (f.value = g.cook_time_minutes), g.tags && (R.value = [...g.tags]), g.ingredients && (b.value = [...g.ingredients]), g.steps && (l.value = [...g.steps]);
    }
    const T = Z(() => ({
      targetId: i.value,
      recipe: {
        id: i.value,
        title: c.value,
        description: I.value,
        language: _.value,
        servings: w.value,
        prep_time_minutes: C.value,
        cook_time_minutes: f.value,
        tags: R.value,
        ingredients: b.value,
        steps: l.value
      },
      applyAdaptation: y
    }));
    return (g, e) => {
      const L = k("Button"), q = k("Message"), ee = k("InputText"), ne = k("Textarea"), H = k("InputNumber"), ae = k("AutoComplete");
      return u(), d(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: K(M, ["prevent"])
        },
        [
          t("div", We, [
            t(
              "h2",
              null,
              N(i.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            t("div", Xe, [
              s(B(F), {
                name: "recipe.edit.actions",
                context: T.value
              }, null, 8, ["context"]),
              s(L, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: o.value,
                onClick: e[0] || (e[0] = (U) => {
                  var te, le;
                  return (le = (te = B(n)).navigate) == null ? void 0 : le.call(te, i.value ? `/recipes/${i.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          a.value ? (u(), J(q, {
            key: 0,
            severity: "error"
          }, {
            default: G(() => [
              Q(
                N(a.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          t("div", Ye, [
            e[10] || (e[10] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            s(ee, {
              id: "recipe-title",
              modelValue: c.value,
              "onUpdate:modelValue": e[1] || (e[1] = (U) => c.value = U),
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
            s(ne, {
              id: "recipe-description",
              modelValue: I.value,
              "onUpdate:modelValue": e[2] || (e[2] = (U) => I.value = U),
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
              s(ee, {
                id: "recipe-language",
                modelValue: _.value,
                "onUpdate:modelValue": e[3] || (e[3] = (U) => _.value = U),
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
              s(H, {
                inputId: "recipe-servings",
                modelValue: w.value,
                "onUpdate:modelValue": e[4] || (e[4] = (U) => w.value = U),
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
              s(H, {
                inputId: "recipe-prep",
                modelValue: C.value,
                "onUpdate:modelValue": e[5] || (e[5] = (U) => C.value = U),
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
              s(H, {
                inputId: "recipe-cook",
                modelValue: f.value,
                "onUpdate:modelValue": e[6] || (e[6] = (U) => f.value = U),
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
            s(ae, {
              inputId: "recipe-tags",
              modelValue: R.value,
              "onUpdate:modelValue": e[7] || (e[7] = (U) => R.value = U),
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
              disabled: o.value || !$.value,
              onChange: x
            }, null, 40, ut),
            i.value ? (u(), d("small", ct, "Cover uploads are saved immediately, separately from recipe edits.")) : (u(), d("small", rt, "Save your recipe first to add a cover image.")),
            S.value ? (u(), d("img", {
              key: 2,
              src: B(n).url(`/api/assets/${S.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, pt)) : A("v-if", !0)
          ]),
          t("section", null, [
            e[18] || (e[18] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            s(Ee, {
              modelValue: b.value,
              "onUpdate:modelValue": e[8] || (e[8] = (U) => b.value = U)
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
            s(Ke, {
              modelValue: l.value,
              "onUpdate:modelValue": e[9] || (e[9] = (U) => l.value = U)
            }, null, 8, ["modelValue"])
          ]),
          t("div", dt, [
            s(L, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: o.value,
              disabled: !c.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ie = /* @__PURE__ */ E(vt, [["__scopeId", "data-v-721514f8"]]);
function gt(p) {
  p.route({ path: "/recipes", component: Ce, nav: { label: "Recipes", icon: "book", order: 10 } }), p.route({ path: "/recipes/new", component: ie }), p.route({ path: "/recipes/:id", component: Pe }), p.route({ path: "/recipes/:id/edit", component: ie }), p.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), p.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      p.navigate ? p.navigate("/recipes/new") : window.location.href = p.url ? p.url("/recipes/new") : "/recipes/new";
    }
  }), p.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), p.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (V) => {
      var r;
      (r = V == null ? void 0 : V.recipe) != null && r.id && (p.navigate ? p.navigate(`/recipes/${V.recipe.id}/edit`) : window.location.href = p.url ? p.url(`/recipes/${V.recipe.id}/edit`) : `/recipes/${V.recipe.id}/edit`);
    }
  });
}
export {
  gt as default
};
