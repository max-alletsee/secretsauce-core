import { defineComponent as P, resolveComponent as f, openBlock as u, createElementBlock as v, createElementVNode as t, createVNode as s, withModifiers as H, unref as L, createTextVNode as z, toDisplayString as N, createCommentVNode as q, Fragment as M, renderList as O, createBlock as D, ref as _, onMounted as ne, watch as E, computed as Q, withCtx as Z, normalizeClass as ae } from "vue";
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
  setup(p, { emit: $ }) {
    const r = p, h = $;
    return (l, n) => {
      const d = f("Button"), I = f("Tag");
      return u(), v("article", {
        class: "recipe-card",
        onClick: n[2] || (n[2] = (g) => h("select", r.recipe.id))
      }, [
        t("div", oe, [
          r.recipe.cover_asset_id ? (u(), v("img", {
            key: 0,
            src: r.recipe.cover_url || `/api/assets/${r.recipe.cover_asset_id}/file`,
            alt: r.recipe.title
          }, null, 8, se)) : (u(), v("i", ue))
        ]),
        t("div", re, [
          t("div", ce, [
            t("h3", null, [
              s(d, {
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
            r.recipe.prep_time_minutes ? (u(), v("span", de, [
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
            r.recipe.cook_time_minutes ? (u(), v(
              "span",
              ve,
              N(r.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : q("v-if", !0)
          ]),
          t("div", me, [
            (u(!0), v(
              M,
              null,
              O(r.recipe.tags, (g) => (u(), D(I, {
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
}), J = (p, $) => {
  const r = p.__vccOpts || p;
  for (const [h, l] of $)
    r[h] = l;
  return r;
}, ge = /* @__PURE__ */ J(_e, [["__scopeId", "data-v-9f869dc2"]]);
async function X(p, $) {
  var r;
  if (!$) return null;
  try {
    return ((r = (await p.get("/api/assets", { entity_type: "recipe", entity_id: $ })).filter((l) => l.slot === "cover").at(-1)) == null ? void 0 : r.id) || null;
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
  setup(p, { emit: $ }) {
    const r = $, h = W(), l = _([]), n = _(""), d = _(null), I = _("title"), g = _(""), S = _(!1), k = _(/* @__PURE__ */ new Set());
    let C = 0;
    async function y() {
      try {
        const o = await h.api.get("/api/x/core-shortlist");
        k.value = new Set(o.map((a) => a.recipe_id));
      } catch {
      }
    }
    async function B() {
      S.value = !S.value, S.value && await y();
    }
    async function w() {
      const o = ++C;
      g.value = "";
      try {
        const a = await h.api.get("/api/recipes", { q: n.value.trim() });
        if (o !== C) return;
        l.value = a.items;
        const U = await Promise.all(a.items.map(async (A) => {
          const c = await X(h.api, A.group_id);
          return { ...A, cover_asset_id: c, cover_url: c ? h.url(`/api/assets/${c}/file`) : null };
        }));
        o === C && (l.value = U);
      } catch (a) {
        o === C && (g.value = (a == null ? void 0 : a.message) || "Could not load recipes");
      }
    }
    function V(o) {
      var a;
      r("openRecipe", o), (a = h.navigate) == null || a.call(h, `/recipes/${o}`);
    }
    ne(() => {
      w(), y();
    }), E(n, w);
    const i = Q(() => [...new Set(l.value.flatMap((o) => o.tags || []))]), m = Q(() => {
      let o = l.value.map((a) => ({ ...a, is_shortlisted: k.value.has(a.id) }));
      return S.value && (o = o.filter((a) => k.value.has(a.id))), d.value && (o = o.filter((a) => {
        var U;
        return (U = a.tags) == null ? void 0 : U.includes(d.value);
      })), o.sort(I.value === "title" ? (a, U) => a.title.localeCompare(U.title) : (a, U) => (a.prep_time_minutes || 0) - (U.prep_time_minutes || 0));
    });
    return (o, a) => {
      const U = f("InputIcon"), A = f("InputText"), c = f("IconField"), R = f("Button"), e = f("Select"), T = f("Message");
      return u(), v("div", fe, [
        a[3] || (a[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", be, [
          s(c, { class: "search-box" }, {
            default: Z(() => [
              s(U, { class: "pi pi-search" }),
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
            context: { active: S.value, toggle: B }
          }, null, 8, ["context"]),
          (u(!0), v(
            M,
            null,
            O(i.value, (b) => (u(), D(R, {
              key: b,
              label: b,
              size: "small",
              outlined: d.value !== b,
              "aria-pressed": d.value === b,
              onClick: (j) => d.value = d.value === b ? null : b
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          s(e, {
            modelValue: I.value,
            "onUpdate:modelValue": a[1] || (a[1] = (b) => I.value = b),
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
        m.value.length ? (u(), v("div", Ve, [
          (u(!0), v(
            M,
            null,
            O(m.value, (b) => (u(), D(ge, {
              key: b.id,
              recipe: b,
              onSelect: V
            }, null, 8, ["recipe"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (u(), v("div", $e, [
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
}), he = /* @__PURE__ */ J(ke, [["__scopeId", "data-v-bf3b992c"]]), Ie = { class: "recipe-detail-page" }, Ce = {
  key: 0,
  class: "lang-bar"
}, we = { class: "detail-header" }, Se = { key: 0 }, xe = { class: "detail-actions" }, Ue = ["src", "alt"], Re = { class: "scaler-card" }, Te = { class: "servings-value" }, Ne = { class: "content-grid" }, Be = { class: "ingredient-checklist" }, Le = ["for"], qe = {
  key: 0,
  class: "notes"
}, Ae = { class: "steps-list" }, Me = /* @__PURE__ */ P({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(p, { emit: $ }) {
    const r = p, h = $, l = W(), n = _(null), d = _(2), I = _({}), g = _(""), S = _(!1), k = Q(() => r.id || r.recipeId || ""), C = _(null);
    let y = 0;
    E(k, async (V) => {
      if (!V) return;
      const i = ++y;
      g.value = "", C.value = null;
      try {
        const m = await l.api.get(`/api/recipes/${V}`);
        if (i !== y) return;
        n.value = m, d.value = m.servings || 2, I.value = {}, S.value = !1;
        const o = await X(l.api, m.group_id);
        if (i !== y) return;
        C.value = o;
        try {
          const a = await l.api.get("/api/x/core-shortlist");
          i === y && (S.value = a.some((U) => U.recipe_id === V));
        } catch {
        }
      } catch (m) {
        i === y && (n.value = null, g.value = (m == null ? void 0 : m.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function B(V) {
      var i;
      h("switchLanguage", V), (i = l.navigate) == null || i.call(l, `/recipes/${V}`);
    }
    function w(V) {
      var m;
      if (V == null) return "";
      const i = V * d.value / (((m = n.value) == null ? void 0 : m.servings) || 1);
      return Number.isInteger(i) ? String(i) : i.toFixed(1);
    }
    return (V, i) => {
      var A;
      const m = f("Button"), o = f("Message"), a = f("Checkbox"), U = f("Tag");
      return u(), v("div", Ie, [
        s(m, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: i[0] || (i[0] = (c) => {
            var R, e;
            return (e = (R = L(l)).navigate) == null ? void 0 : e.call(R, "/recipes");
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
        n.value ? (u(), v(
          M,
          { key: 1 },
          [
            ((A = n.value.languages) == null ? void 0 : A.length) > 1 ? (u(), v("div", Ce, [
              i[3] || (i[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (u(!0), v(
                M,
                null,
                O(n.value.languages, (c) => (u(), D(m, {
                  key: c,
                  label: c.toUpperCase(),
                  size: "small",
                  outlined: c !== n.value.language,
                  onClick: (R) => B(`${n.value.group_id}_${c}`)
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
                n.value.description ? (u(), v(
                  "p",
                  Se,
                  N(n.value.description),
                  1
                  /* TEXT */
                )) : q("v-if", !0)
              ]),
              t("div", xe, [
                s(L(F), {
                  name: "recipe.card.actions",
                  context: { recipe: n.value, isShortlisted: S.value }
                }, null, 8, ["context"]),
                s(L(K), {
                  hub: "recipe:actions",
                  context: { recipe: n.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            C.value ? (u(), v("img", {
              key: 1,
              src: L(l).url(`/api/assets/${C.value}/file`),
              alt: n.value.title,
              class: "recipe-cover"
            }, null, 8, Ue)) : q("v-if", !0),
            t("div", Re, [
              i[4] || (i[4] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              s(m, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: d.value <= 1,
                onClick: i[1] || (i[1] = (c) => d.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Te,
                N(d.value),
                1
                /* TEXT */
              ),
              s(m, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: i[2] || (i[2] = (c) => d.value++)
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
                  (u(!0), v(
                    M,
                    null,
                    O(n.value.ingredients, (c) => (u(), v("li", {
                      key: c.id,
                      class: "ingredient-item"
                    }, [
                      s(a, {
                        inputId: `ingredient-${c.id}`,
                        modelValue: I.value[c.id],
                        "onUpdate:modelValue": (R) => I.value[c.id] = R,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${c.id}`,
                        class: ae({ struck: I.value[c.id] })
                      }, [
                        t(
                          "strong",
                          null,
                          N(w(c.quantity)),
                          1
                          /* TEXT */
                        ),
                        z(
                          " " + N(c.unit) + " " + N(c.name),
                          1
                          /* TEXT */
                        ),
                        c.notes ? (u(), v(
                          "span",
                          qe,
                          " (" + N(c.notes) + ")",
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
                  (u(!0), v(
                    M,
                    null,
                    O(n.value.steps, (c) => (u(), v("li", {
                      key: c.id
                    }, [
                      t(
                        "p",
                        null,
                        N(c.instruction),
                        1
                        /* TEXT */
                      ),
                      c.timer_minutes ? (u(), D(U, {
                        key: 0,
                        value: `${c.timer_minutes} min`,
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
}), Oe = /* @__PURE__ */ J(Me, [["__scopeId", "data-v-4fd21f7b"]]), De = { class: "ingredient-row-list" }, Pe = { class: "reorder-btns" }, Je = /* @__PURE__ */ P({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(p, { emit: $ }) {
    const r = p, h = $, l = _(JSON.parse(JSON.stringify(r.modelValue || [])));
    E(() => r.modelValue, (k) => {
      l.value = JSON.parse(JSON.stringify(k || []));
    }, { deep: !0 });
    const n = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((k) => ({ id: k, label: k || "(none)" }));
    function d() {
      h("update:modelValue", l.value);
    }
    function I() {
      l.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), d();
    }
    function g(k) {
      l.value.splice(k, 1), d();
    }
    function S(k, C) {
      const y = k + C;
      y < 0 || y >= l.value.length || (l.value.splice(y, 0, l.value.splice(k, 1)[0]), d());
    }
    return (k, C) => {
      const y = f("Button"), B = f("InputNumber"), w = f("Select"), V = f("InputText");
      return u(), v("div", De, [
        (u(!0), v(
          M,
          null,
          O(l.value, (i, m) => (u(), v("div", {
            key: i.id,
            class: "ingredient-row"
          }, [
            t("div", Pe, [
              s(y, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: m === 0,
                onClick: (o) => S(m, -1)
              }, null, 8, ["disabled", "onClick"]),
              s(y, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: m === l.value.length - 1,
                onClick: (o) => S(m, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            s(B, {
              modelValue: i.quantity,
              "onUpdate:modelValue": [(o) => i.quantity = o, d],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${m + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(w, {
              modelValue: i.unit,
              "onUpdate:modelValue": [(o) => i.unit = o, d],
              options: L(n),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${m + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            s(V, {
              modelValue: i.name,
              "onUpdate:modelValue": (o) => i.name = o,
              class: "input-name",
              "aria-label": `Ingredient ${m + 1} name`,
              placeholder: "Ingredient name",
              onInput: d
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(V, {
              modelValue: i.notes,
              "onUpdate:modelValue": (o) => i.notes = o,
              class: "input-notes",
              "aria-label": `Ingredient ${m + 1} notes`,
              placeholder: "Notes",
              onInput: d
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            s(y, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (o) => g(m)
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
          onClick: I
        })
      ]);
    };
  }
}), Fe = /* @__PURE__ */ J(Je, [["__scopeId", "data-v-8bdce0ca"]]), ze = { class: "step-list" }, Ee = { class: "step-inputs" }, Qe = { class: "timer-row" }, Ze = ["for"], je = /* @__PURE__ */ P({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(p, { emit: $ }) {
    const r = p, h = $, l = _(JSON.parse(JSON.stringify(r.modelValue || [])));
    E(() => r.modelValue, (g) => {
      l.value = JSON.parse(JSON.stringify(g || []));
    }, { deep: !0 });
    function n() {
      h("update:modelValue", l.value);
    }
    function d() {
      l.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), n();
    }
    function I(g) {
      l.value.splice(g, 1), n();
    }
    return (g, S) => {
      const k = f("Tag"), C = f("Textarea"), y = f("InputNumber"), B = f("Button");
      return u(), v("div", ze, [
        (u(!0), v(
          M,
          null,
          O(l.value, (w, V) => (u(), v("div", {
            key: w.id,
            class: "step-row"
          }, [
            s(k, {
              value: String(V + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Ee, [
              s(C, {
                modelValue: w.instruction,
                "onUpdate:modelValue": (i) => w.instruction = i,
                class: "textarea-instruction",
                "aria-label": `Step ${V + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: n
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", Qe, [
                t("label", {
                  for: `timer-${w.id}`
                }, "Timer (min)", 8, Ze),
                s(y, {
                  inputId: `timer-${w.id}`,
                  modelValue: w.timer_minutes,
                  "onUpdate:modelValue": [(i) => w.timer_minutes = i, n],
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
              onClick: (i) => I(V)
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
          onClick: d
        })
      ]);
    };
  }
}), Ge = /* @__PURE__ */ J(je, [["__scopeId", "data-v-24edd28a"]]), He = { class: "edit-top-bar" }, Ke = { class: "form-group" }, We = { class: "form-group" }, Xe = { class: "form-row" }, Ye = { class: "form-group" }, et = { class: "form-group" }, tt = { class: "form-group" }, lt = { class: "form-group" }, it = { class: "form-group" }, nt = { class: "form-group" }, at = ["disabled"], ot = { key: 0 }, st = { key: 1 }, ut = ["src"], rt = { class: "actions-row" }, ct = /* @__PURE__ */ P({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(p, { emit: $ }) {
    var c;
    const r = p, h = $, l = W(), n = Q(() => r.id || r.recipeId || ""), d = _(""), I = _(""), g = _(((c = l.store.household.value) == null ? void 0 : c.languages.primary) || "en"), S = _(2), k = _(""), C = _(null), y = _(null), B = _([]), w = _(null), V = _([]), i = _([]), m = _(1), o = _(!1), a = _("");
    E(n, async (R) => {
      if (R)
        try {
          const e = await l.api.get(`/api/recipes/${R}`);
          d.value = e.title, I.value = e.description || "", g.value = e.language, S.value = e.servings, C.value = e.prep_time_minutes, y.value = e.cook_time_minutes, B.value = [...e.tags], V.value = e.ingredients, i.value = e.steps, m.value = e.revision, w.value = await X(l.api, e.group_id), k.value = e.group_id;
        } catch (e) {
          a.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function U(R) {
      var T;
      const e = (T = R.target.files) == null ? void 0 : T[0];
      if (!(!e || o.value || !k.value)) {
        o.value = !0, a.value = "";
        try {
          const b = new FormData();
          b.append("file", e), b.append("entity_type", "recipe"), b.append("entity_id", k.value), b.append("slot", "cover"), w.value = (await l.api.upload("/api/assets", b)).id, l.notify({ level: "success", message: "Cover image saved" });
        } catch (b) {
          a.value = (b == null ? void 0 : b.message) || "Could not upload image";
        } finally {
          o.value = !1;
        }
      }
    }
    async function A() {
      var e;
      if (!d.value.trim() || o.value) return;
      o.value = !0, a.value = "";
      const R = { title: d.value.trim(), description: I.value.trim(), language: g.value, servings: S.value, prep_time_minutes: C.value, cook_time_minutes: y.value, tags: B.value, ingredients: V.value, steps: i.value };
      try {
        const T = n.value ? await l.api.patch(`/api/recipes/${n.value}`, { ...R, revision: m.value }) : await l.api.post("/api/recipes", R);
        h("saved", T), l.notify({ level: "success", message: "Recipe saved" }), (e = l.navigate) == null || e.call(l, `/recipes/${T.id}`);
      } catch (T) {
        a.value = (T == null ? void 0 : T.message) || "Could not save recipe";
      } finally {
        o.value = !1;
      }
    }
    return (R, e) => {
      const T = f("Button"), b = f("Message"), j = f("InputText"), le = f("Textarea"), G = f("InputNumber"), ie = f("AutoComplete");
      return u(), v(
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
              onClick: e[0] || (e[0] = (x) => {
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
              modelValue: d.value,
              "onUpdate:modelValue": e[1] || (e[1] = (x) => d.value = x),
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
              modelValue: I.value,
              "onUpdate:modelValue": e[2] || (e[2] = (x) => I.value = x),
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
                "onUpdate:modelValue": e[3] || (e[3] = (x) => g.value = x),
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
                modelValue: S.value,
                "onUpdate:modelValue": e[4] || (e[4] = (x) => S.value = x),
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
                modelValue: C.value,
                "onUpdate:modelValue": e[5] || (e[5] = (x) => C.value = x),
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
                "onUpdate:modelValue": e[6] || (e[6] = (x) => y.value = x),
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
              "onUpdate:modelValue": e[7] || (e[7] = (x) => B.value = x),
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
              onChange: U
            }, null, 40, at),
            n.value ? (u(), v("small", st, "Cover uploads are saved immediately, separately from recipe edits.")) : (u(), v("small", ot, "Save your recipe first to add a cover image.")),
            w.value ? (u(), v("img", {
              key: 2,
              src: L(l).url(`/api/assets/${w.value}/file`),
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
              "onUpdate:modelValue": e[8] || (e[8] = (x) => V.value = x)
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
              "onUpdate:modelValue": e[9] || (e[9] = (x) => i.value = x)
            }, null, 8, ["modelValue"])
          ]),
          t("div", rt, [
            s(T, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: o.value,
              disabled: !d.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), te = /* @__PURE__ */ J(ct, [["__scopeId", "data-v-db0c1b59"]]);
function vt(p) {
  p.route({ path: "/recipes", component: he, nav: { label: "Recipes", icon: "book", order: 10 } }), p.route({ path: "/recipes/new", component: te }), p.route({ path: "/recipes/:id", component: Oe }), p.route({ path: "/recipes/:id/edit", component: te }), p.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), p.intent.provider({
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
    execute: ($) => {
      var r;
      (r = $ == null ? void 0 : $.recipe) != null && r.id && (p.navigate ? p.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = p.url ? p.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  vt as default
};
