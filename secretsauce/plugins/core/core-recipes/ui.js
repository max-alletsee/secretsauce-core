import { defineComponent as J, resolveComponent as y, openBlock as s, createElementBlock as m, createElementVNode as t, createVNode as n, withModifiers as G, unref as q, createTextVNode as z, toDisplayString as N, createCommentVNode as A, Fragment as M, renderList as O, createBlock as D, ref as g, onMounted as le, watch as E, computed as Q, withCtx as Z, normalizeClass as ie } from "vue";
import { Slot as F, useSecretSauce as K, IntentTrigger as H } from "@secretsauce/ui";
const ne = { class: "cover-image" }, ae = ["src", "alt"], oe = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, se = { class: "card-body" }, ue = { class: "card-header" }, re = { class: "meta" }, ce = { key: 0 }, pe = { key: 1 }, de = { class: "tags" }, ve = /* @__PURE__ */ J({
  __name: "RecipeCard",
  props: {
    recipe: {}
  },
  emits: ["select"],
  setup(d, { emit: $ }) {
    const c = d, h = $;
    return (i, l) => {
      const p = y("Button"), I = y("Tag");
      return s(), m("article", {
        class: "recipe-card",
        onClick: l[2] || (l[2] = (f) => h("select", c.recipe.id))
      }, [
        t("div", ne, [
          c.recipe.cover_asset_id ? (s(), m("img", {
            key: 0,
            src: `/api/assets/${c.recipe.cover_asset_id}/file`,
            alt: c.recipe.title
          }, null, 8, ae)) : (s(), m("i", oe))
        ]),
        t("div", se, [
          t("div", ue, [
            t("h3", null, [
              n(p, {
                label: c.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: l[0] || (l[0] = G((f) => h("select", c.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: l[1] || (l[1] = G(() => {
              }, ["stop"]))
            }, [
              n(q(F), {
                name: "recipe.card.actions",
                context: { recipe: c.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", re, [
            c.recipe.prep_time_minutes ? (s(), m("span", ce, [
              l[3] || (l[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              z(
                " " + N(c.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : A("v-if", !0),
            c.recipe.cook_time_minutes ? (s(), m(
              "span",
              pe,
              N(c.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          t("div", de, [
            (s(!0), m(
              M,
              null,
              O(c.recipe.tags, (f) => (s(), D(I, {
                key: f,
                value: f,
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
}), P = (d, $) => {
  const c = d.__vccOpts || d;
  for (const [h, i] of $)
    c[h] = i;
  return c;
}, me = /* @__PURE__ */ P(ve, [["__scopeId", "data-v-60cbd2e6"]]), _e = { class: "recipe-list-page" }, ge = { class: "intent-header-bar" }, fe = { class: "filter-sort-bar" }, be = {
  key: 1,
  class: "recipes-grid"
}, ye = {
  key: 2,
  class: "empty-state"
}, Ve = /* @__PURE__ */ J({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(d, { emit: $ }) {
    const c = $, h = K(), i = g([]), l = g(""), p = g(null), I = g("title"), f = g(""), C = g(!1), V = g(/* @__PURE__ */ new Set());
    let w = 0;
    async function k() {
      try {
        const o = await h.api.get("/api/x/core-shortlist");
        V.value = new Set(o.map((r) => r.recipe_id));
      } catch {
      }
    }
    async function R() {
      C.value = !C.value, C.value && await k();
    }
    async function _() {
      const o = ++w;
      f.value = "";
      try {
        const r = await h.api.get("/api/recipes", { q: l.value.trim() });
        o === w && (i.value = r.items);
      } catch (r) {
        o === w && (f.value = (r == null ? void 0 : r.message) || "Could not load recipes");
      }
    }
    function a(o) {
      var r;
      c("openRecipe", o), (r = h.navigate) == null || r.call(h, `/recipes/${o}`);
    }
    le(() => {
      _(), k();
    }), E(l, _);
    const u = Q(() => [...new Set(i.value.flatMap((o) => o.tags || []))]), b = Q(() => {
      let o = i.value.map((r) => ({ ...r, is_shortlisted: V.value.has(r.id) }));
      return C.value && (o = o.filter((r) => V.value.has(r.id))), p.value && (o = o.filter((r) => {
        var B;
        return (B = r.tags) == null ? void 0 : B.includes(p.value);
      })), o.sort(I.value === "title" ? (r, B) => r.title.localeCompare(B.title) : (r, B) => (r.prep_time_minutes || 0) - (B.prep_time_minutes || 0));
    });
    return (o, r) => {
      const B = y("InputIcon"), v = y("InputText"), x = y("IconField"), e = y("Button"), T = y("Select"), L = y("Message");
      return s(), m("div", _e, [
        r[3] || (r[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", ge, [
          n(x, { class: "search-box" }, {
            default: Z(() => [
              n(B, { class: "pi pi-search" }),
              n(v, {
                modelValue: l.value,
                "onUpdate:modelValue": r[0] || (r[0] = (U) => l.value = U),
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
          n(q(H), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", fe, [
          n(q(F), {
            name: "recipe.list.filters",
            context: { active: C.value, toggle: R }
          }, null, 8, ["context"]),
          (s(!0), m(
            M,
            null,
            O(u.value, (U) => (s(), D(e, {
              key: U,
              label: U,
              size: "small",
              outlined: p.value !== U,
              "aria-pressed": p.value === U,
              onClick: (W) => p.value = p.value === U ? null : U
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          n(T, {
            modelValue: I.value,
            "onUpdate:modelValue": r[1] || (r[1] = (U) => I.value = U),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        f.value ? (s(), D(L, {
          key: 0,
          severity: "error"
        }, {
          default: Z(() => [
            z(
              N(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        b.value.length ? (s(), m("div", be, [
          (s(!0), m(
            M,
            null,
            O(b.value, (U) => (s(), D(me, {
              key: U.id,
              recipe: U,
              onSelect: a
            }, null, 8, ["recipe"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (s(), m("div", ye, [
          r[2] || (r[2] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          n(q(H), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), $e = /* @__PURE__ */ P(Ve, [["__scopeId", "data-v-c62b50e6"]]), ke = { class: "recipe-detail-page" }, Ie = {
  key: 0,
  class: "lang-bar"
}, he = { class: "detail-header" }, Ce = { key: 0 }, we = { class: "detail-actions" }, Se = { class: "scaler-card" }, xe = { class: "servings-value" }, Ue = { class: "content-grid" }, Re = { class: "ingredient-checklist" }, Te = ["for"], Ne = {
  key: 0,
  class: "notes"
}, Be = { class: "steps-list" }, Le = /* @__PURE__ */ J({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(d, { emit: $ }) {
    const c = d, h = $, i = K(), l = g(null), p = g(2), I = g({}), f = g(""), C = g(!1), V = Q(() => c.id || c.recipeId || "");
    let w = 0;
    E(V, async (_) => {
      if (!_) return;
      const a = ++w;
      f.value = "";
      try {
        const u = await i.api.get(`/api/recipes/${_}`);
        if (a !== w) return;
        l.value = u, p.value = u.servings || 2, I.value = {}, C.value = !1;
        try {
          const b = await i.api.get("/api/x/core-shortlist");
          a === w && (C.value = b.some((o) => o.recipe_id === _));
        } catch {
        }
      } catch (u) {
        a === w && (l.value = null, f.value = (u == null ? void 0 : u.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function k(_) {
      var a;
      h("switchLanguage", _), (a = i.navigate) == null || a.call(i, `/recipes/${_}`);
    }
    function R(_) {
      var u;
      if (_ == null) return "";
      const a = _ * p.value / (((u = l.value) == null ? void 0 : u.servings) || 1);
      return Number.isInteger(a) ? String(a) : a.toFixed(1);
    }
    return (_, a) => {
      var B;
      const u = y("Button"), b = y("Message"), o = y("Checkbox"), r = y("Tag");
      return s(), m("div", ke, [
        n(u, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: a[0] || (a[0] = (v) => {
            var x, e;
            return (e = (x = q(i)).navigate) == null ? void 0 : e.call(x, "/recipes");
          })
        }),
        f.value ? (s(), D(b, {
          key: 0,
          severity: "error"
        }, {
          default: Z(() => [
            z(
              N(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        l.value ? (s(), m(
          M,
          { key: 1 },
          [
            ((B = l.value.languages) == null ? void 0 : B.length) > 1 ? (s(), m("div", Ie, [
              a[3] || (a[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (s(!0), m(
                M,
                null,
                O(l.value.languages, (v) => (s(), D(u, {
                  key: v,
                  label: v.toUpperCase(),
                  size: "small",
                  outlined: v !== l.value.language,
                  onClick: (x) => k(`${l.value.group_id}_${v}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : A("v-if", !0),
            t("div", he, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  N(l.value.title),
                  1
                  /* TEXT */
                ),
                l.value.description ? (s(), m(
                  "p",
                  Ce,
                  N(l.value.description),
                  1
                  /* TEXT */
                )) : A("v-if", !0)
              ]),
              t("div", we, [
                n(q(F), {
                  name: "recipe.card.actions",
                  context: { recipe: l.value, isShortlisted: C.value }
                }, null, 8, ["context"]),
                n(q(H), {
                  hub: "recipe:actions",
                  context: { recipe: l.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            t("div", Se, [
              a[4] || (a[4] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              n(u, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: p.value <= 1,
                onClick: a[1] || (a[1] = (v) => p.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                xe,
                N(p.value),
                1
                /* TEXT */
              ),
              n(u, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: a[2] || (a[2] = (v) => p.value++)
              })
            ]),
            t("div", Ue, [
              t("section", null, [
                a[5] || (a[5] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", Re, [
                  (s(!0), m(
                    M,
                    null,
                    O(l.value.ingredients, (v) => (s(), m("li", {
                      key: v.id,
                      class: "ingredient-item"
                    }, [
                      n(o, {
                        inputId: `ingredient-${v.id}`,
                        modelValue: I.value[v.id],
                        "onUpdate:modelValue": (x) => I.value[v.id] = x,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${v.id}`,
                        class: ie({ struck: I.value[v.id] })
                      }, [
                        t(
                          "strong",
                          null,
                          N(R(v.quantity)),
                          1
                          /* TEXT */
                        ),
                        z(
                          " " + N(v.unit) + " " + N(v.name),
                          1
                          /* TEXT */
                        ),
                        v.notes ? (s(), m(
                          "span",
                          Ne,
                          " (" + N(v.notes) + ")",
                          1
                          /* TEXT */
                        )) : A("v-if", !0)
                      ], 10, Te)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                a[6] || (a[6] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", Be, [
                  (s(!0), m(
                    M,
                    null,
                    O(l.value.steps, (v) => (s(), m("li", {
                      key: v.id
                    }, [
                      t(
                        "p",
                        null,
                        N(v.instruction),
                        1
                        /* TEXT */
                      ),
                      v.timer_minutes ? (s(), D(r, {
                        key: 0,
                        value: `${v.timer_minutes} min`,
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
            n(q(F), {
              name: "recipe.detail.sidebar",
              context: { recipe: l.value }
            }, null, 8, ["context"]),
            n(q(F), {
              name: "recipe.detail.footer",
              context: { recipe: l.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : A("v-if", !0)
      ]);
    };
  }
}), qe = /* @__PURE__ */ P(Le, [["__scopeId", "data-v-e76b0892"]]), Ae = { class: "ingredient-row-list" }, Me = { class: "reorder-btns" }, Oe = /* @__PURE__ */ J({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(d, { emit: $ }) {
    const c = d, h = $, i = g(JSON.parse(JSON.stringify(c.modelValue || [])));
    E(() => c.modelValue, (V) => {
      i.value = JSON.parse(JSON.stringify(V || []));
    }, { deep: !0 });
    const l = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((V) => ({ id: V, label: V || "(none)" }));
    function p() {
      h("update:modelValue", i.value);
    }
    function I() {
      i.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), p();
    }
    function f(V) {
      i.value.splice(V, 1), p();
    }
    function C(V, w) {
      const k = V + w;
      k < 0 || k >= i.value.length || (i.value.splice(k, 0, i.value.splice(V, 1)[0]), p());
    }
    return (V, w) => {
      const k = y("Button"), R = y("InputNumber"), _ = y("Select"), a = y("InputText");
      return s(), m("div", Ae, [
        (s(!0), m(
          M,
          null,
          O(i.value, (u, b) => (s(), m("div", {
            key: u.id,
            class: "ingredient-row"
          }, [
            t("div", Me, [
              n(k, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: b === 0,
                onClick: (o) => C(b, -1)
              }, null, 8, ["disabled", "onClick"]),
              n(k, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: b === i.value.length - 1,
                onClick: (o) => C(b, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            n(R, {
              modelValue: u.quantity,
              "onUpdate:modelValue": [(o) => u.quantity = o, p],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${b + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            n(_, {
              modelValue: u.unit,
              "onUpdate:modelValue": [(o) => u.unit = o, p],
              options: q(l),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${b + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            n(a, {
              modelValue: u.name,
              "onUpdate:modelValue": (o) => u.name = o,
              class: "input-name",
              "aria-label": `Ingredient ${b + 1} name`,
              placeholder: "Ingredient name",
              onInput: p
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            n(a, {
              modelValue: u.notes,
              "onUpdate:modelValue": (o) => u.notes = o,
              class: "input-notes",
              "aria-label": `Ingredient ${b + 1} notes`,
              placeholder: "Notes",
              onInput: p
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            n(k, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (o) => f(b)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        n(k, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: I
        })
      ]);
    };
  }
}), De = /* @__PURE__ */ P(Oe, [["__scopeId", "data-v-8bdce0ca"]]), Je = { class: "step-list" }, Pe = { class: "step-inputs" }, Fe = { class: "timer-row" }, ze = ["for"], Ee = /* @__PURE__ */ J({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(d, { emit: $ }) {
    const c = d, h = $, i = g(JSON.parse(JSON.stringify(c.modelValue || [])));
    E(() => c.modelValue, (f) => {
      i.value = JSON.parse(JSON.stringify(f || []));
    }, { deep: !0 });
    function l() {
      h("update:modelValue", i.value);
    }
    function p() {
      i.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), l();
    }
    function I(f) {
      i.value.splice(f, 1), l();
    }
    return (f, C) => {
      const V = y("Tag"), w = y("Textarea"), k = y("InputNumber"), R = y("Button");
      return s(), m("div", Je, [
        (s(!0), m(
          M,
          null,
          O(i.value, (_, a) => (s(), m("div", {
            key: _.id,
            class: "step-row"
          }, [
            n(V, {
              value: String(a + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Pe, [
              n(w, {
                modelValue: _.instruction,
                "onUpdate:modelValue": (u) => _.instruction = u,
                class: "textarea-instruction",
                "aria-label": `Step ${a + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: l
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", Fe, [
                t("label", {
                  for: `timer-${_.id}`
                }, "Timer (min)", 8, ze),
                n(k, {
                  inputId: `timer-${_.id}`,
                  modelValue: _.timer_minutes,
                  "onUpdate:modelValue": [(u) => _.timer_minutes = u, l],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            n(R, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (u) => I(a)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        n(R, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: p
        })
      ]);
    };
  }
}), Qe = /* @__PURE__ */ P(Ee, [["__scopeId", "data-v-24edd28a"]]), Ze = { class: "edit-top-bar" }, je = { class: "form-group" }, Ge = { class: "form-group" }, He = { class: "form-row" }, Ke = { class: "form-group" }, We = { class: "form-group" }, Xe = { class: "form-group" }, Ye = { class: "form-group" }, et = { class: "form-group" }, tt = { class: "form-group" }, lt = ["disabled"], it = ["src"], nt = { class: "actions-row" }, at = /* @__PURE__ */ J({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(d, { emit: $ }) {
    var v;
    const c = d, h = $, i = K(), l = Q(() => c.id || c.recipeId || ""), p = g(""), I = g(""), f = g(((v = i.store.household.value) == null ? void 0 : v.languages.primary) || "en"), C = g(2), V = g(null), w = g(null), k = g([]), R = g(null), _ = g([]), a = g([]), u = g(1), b = g(!1), o = g("");
    E(l, async (x) => {
      if (x)
        try {
          const e = await i.api.get(`/api/recipes/${x}`);
          p.value = e.title, I.value = e.description || "", f.value = e.language, C.value = e.servings, V.value = e.prep_time_minutes, w.value = e.cook_time_minutes, k.value = [...e.tags], R.value = e.cover_asset_id || null, _.value = e.ingredients, a.value = e.steps, u.value = e.revision;
        } catch (e) {
          o.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function r(x) {
      var T;
      const e = (T = x.target.files) == null ? void 0 : T[0];
      if (!(!e || b.value)) {
        b.value = !0, o.value = "";
        try {
          const L = new FormData();
          L.append("file", e), L.append("entity_type", "recipe"), L.append("slot", "cover"), R.value = (await i.api.upload("/api/assets", L)).id;
        } catch (L) {
          o.value = (L == null ? void 0 : L.message) || "Could not upload image";
        } finally {
          b.value = !1;
        }
      }
    }
    async function B() {
      var e;
      if (!p.value.trim() || b.value) return;
      b.value = !0, o.value = "";
      const x = { title: p.value.trim(), description: I.value.trim(), language: f.value, servings: C.value, prep_time_minutes: V.value, cook_time_minutes: w.value, tags: k.value, cover_asset_id: R.value, ingredients: _.value, steps: a.value };
      try {
        const T = l.value ? await i.api.patch(`/api/recipes/${l.value}`, { ...x, revision: u.value }) : await i.api.post("/api/recipes", x);
        h("saved", T), i.notify({ level: "success", message: "Recipe saved" }), (e = i.navigate) == null || e.call(i, `/recipes/${T.id}`);
      } catch (T) {
        o.value = (T == null ? void 0 : T.message) || "Could not save recipe";
      } finally {
        b.value = !1;
      }
    }
    return (x, e) => {
      const T = y("Button"), L = y("Message"), U = y("InputText"), W = y("Textarea"), j = y("InputNumber"), te = y("AutoComplete");
      return s(), m(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: G(B, ["prevent"])
        },
        [
          t("div", Ze, [
            t(
              "h2",
              null,
              N(l.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            n(T, {
              label: "Cancel",
              class: "btn-cancel",
              severity: "secondary",
              disabled: b.value,
              onClick: e[0] || (e[0] = (S) => {
                var X, Y;
                return (Y = (X = q(i)).navigate) == null ? void 0 : Y.call(X, l.value ? `/recipes/${l.value}` : "/recipes");
              })
            }, null, 8, ["disabled"])
          ]),
          o.value ? (s(), D(L, {
            key: 0,
            severity: "error"
          }, {
            default: Z(() => [
              z(
                N(o.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          t("div", je, [
            e[10] || (e[10] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            n(U, {
              id: "recipe-title",
              modelValue: p.value,
              "onUpdate:modelValue": e[1] || (e[1] = (S) => p.value = S),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Ge, [
            e[11] || (e[11] = t(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            n(W, {
              id: "recipe-description",
              modelValue: I.value,
              "onUpdate:modelValue": e[2] || (e[2] = (S) => I.value = S),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", He, [
            t("div", Ke, [
              e[12] || (e[12] = t(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              n(U, {
                id: "recipe-language",
                modelValue: f.value,
                "onUpdate:modelValue": e[3] || (e[3] = (S) => f.value = S),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", We, [
              e[13] || (e[13] = t(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              n(j, {
                inputId: "recipe-servings",
                modelValue: C.value,
                "onUpdate:modelValue": e[4] || (e[4] = (S) => C.value = S),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", Xe, [
              e[14] || (e[14] = t(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              n(j, {
                inputId: "recipe-prep",
                modelValue: V.value,
                "onUpdate:modelValue": e[5] || (e[5] = (S) => V.value = S),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", Ye, [
              e[15] || (e[15] = t(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              n(j, {
                inputId: "recipe-cook",
                modelValue: w.value,
                "onUpdate:modelValue": e[6] || (e[6] = (S) => w.value = S),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          t("div", et, [
            e[16] || (e[16] = t(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            n(te, {
              inputId: "recipe-tags",
              modelValue: k.value,
              "onUpdate:modelValue": e[7] || (e[7] = (S) => k.value = S),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", tt, [
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
              disabled: b.value,
              onChange: r
            }, null, 40, lt),
            R.value ? (s(), m("img", {
              key: 0,
              src: q(i).url(`/api/assets/${R.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, it)) : A("v-if", !0)
          ]),
          t("section", null, [
            e[18] || (e[18] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            n(De, {
              modelValue: _.value,
              "onUpdate:modelValue": e[8] || (e[8] = (S) => _.value = S)
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
            n(Qe, {
              modelValue: a.value,
              "onUpdate:modelValue": e[9] || (e[9] = (S) => a.value = S)
            }, null, 8, ["modelValue"])
          ]),
          t("div", nt, [
            n(T, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: b.value,
              disabled: !p.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ee = /* @__PURE__ */ P(at, [["__scopeId", "data-v-69013996"]]);
function ut(d) {
  d.route({ path: "/recipes", component: $e, nav: { label: "Recipes", icon: "book", order: 10 } }), d.route({ path: "/recipes/new", component: ee }), d.route({ path: "/recipes/:id", component: qe }), d.route({ path: "/recipes/:id/edit", component: ee }), d.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), d.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      d.navigate ? d.navigate("/recipes/new") : window.location.href = d.url ? d.url("/recipes/new") : "/recipes/new";
    }
  }), d.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), d.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: ($) => {
      var c;
      (c = $ == null ? void 0 : $.recipe) != null && c.id && (d.navigate ? d.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = d.url ? d.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  ut as default
};
