import { defineComponent as z, resolveComponent as k, openBlock as o, createElementBlock as c, createCommentVNode as O, createElementVNode as t, createVNode as a, withModifiers as W, unref as q, createTextVNode as Q, toDisplayString as A, Fragment as D, renderList as P, createBlock as J, ref as m, onMounted as oe, watch as j, computed as Z, withCtx as G, normalizeClass as se } from "vue";
import { Slot as F, useSecretSauce as Y, IntentTrigger as X } from "@secretsauce/ui";
const ue = {
  key: 0,
  class: "cover-image"
}, re = ["src", "alt"], ce = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, pe = { class: "card-body" }, de = { class: "card-header" }, ve = { class: "meta" }, me = { key: 0 }, _e = { key: 1 }, ge = { class: "tags" }, fe = /* @__PURE__ */ z({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(p, { emit: $ }) {
    const s = p, w = $;
    return (n, i) => {
      const r = k("Button"), C = k("Tag");
      return o(), c("article", {
        class: "recipe-card",
        onClick: i[2] || (i[2] = (_) => w("select", s.recipe.id))
      }, [
        s.showCover ? (o(), c("div", ue, [
          s.recipe.cover_asset_id ? (o(), c("img", {
            key: 0,
            src: s.recipe.cover_url || `/api/assets/${s.recipe.cover_asset_id}/file`,
            alt: s.recipe.title
          }, null, 8, re)) : (o(), c("i", ce))
        ])) : O("v-if", !0),
        t("div", pe, [
          t("div", de, [
            t("h3", null, [
              a(r, {
                label: s.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: i[0] || (i[0] = W((_) => w("select", s.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: i[1] || (i[1] = W(() => {
              }, ["stop"]))
            }, [
              a(q(F), {
                name: "recipe.card.actions",
                context: { recipe: s.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", ve, [
            s.recipe.prep_time_minutes ? (o(), c("span", me, [
              i[3] || (i[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Q(
                " " + A(s.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : O("v-if", !0),
            s.recipe.cook_time_minutes ? (o(), c(
              "span",
              _e,
              A(s.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : O("v-if", !0)
          ]),
          t("div", ge, [
            (o(!0), c(
              D,
              null,
              P(s.recipe.tags, (_) => (o(), J(C, {
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
}), E = (p, $) => {
  const s = p.__vccOpts || p;
  for (const [w, n] of $)
    s[w] = n;
  return s;
}, be = /* @__PURE__ */ E(fe, [["__scopeId", "data-v-f16d0b4f"]]);
async function ee(p, $) {
  var s;
  if (!$) return null;
  try {
    return ((s = (await p.get("/api/assets", { entity_type: "recipe", entity_id: $ })).filter((n) => n.slot === "cover").at(-1)) == null ? void 0 : s.id) || null;
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
  setup(p, { emit: $ }) {
    const s = $, w = Y(), n = m([]), i = m(""), r = m(null), C = m("title"), _ = m(""), S = m(!1), h = m(/* @__PURE__ */ new Set());
    function U() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const g = m(U());
    let R = 0;
    async function x() {
      try {
        const I = await w.api.get("/api/x/core-shortlist");
        h.value = new Set(I.map((u) => u.recipe_id));
      } catch {
      }
    }
    async function b() {
      S.value = !S.value, S.value && await x();
    }
    async function l() {
      const I = ++R;
      _.value = "";
      try {
        const u = await w.api.get("/api/recipes", { q: i.value.trim() });
        if (I !== R || (n.value = u.items, !g.value)) return;
        const d = await Promise.all(u.items.map(async (N) => {
          const M = await ee(w.api, N.group_id);
          return { ...N, cover_asset_id: M, cover_url: M ? w.url(`/api/assets/${M}/file`) : null };
        }));
        I === R && (n.value = d);
      } catch (u) {
        I === R && (_.value = (u == null ? void 0 : u.message) || "Could not load recipes");
      }
    }
    function v(I) {
      var u;
      s("openRecipe", I), (u = w.navigate) == null || u.call(w, `/recipes/${I}`);
    }
    oe(() => {
      g.value = U(), l(), x();
    }), j(i, l);
    const y = Z(() => [...new Set(n.value.flatMap((I) => I.tags || []))]), B = Z(() => {
      let I = n.value.map((u) => ({ ...u, is_shortlisted: h.value.has(u.id) }));
      return S.value && (I = I.filter((u) => h.value.has(u.id))), r.value && (I = I.filter((u) => {
        var d;
        return (d = u.tags) == null ? void 0 : d.includes(r.value);
      })), I.sort(C.value === "title" ? (u, d) => u.title.localeCompare(d.title) : (u, d) => (u.prep_time_minutes || 0) - (d.prep_time_minutes || 0));
    });
    return (I, u) => {
      const d = k("InputIcon"), N = k("InputText"), M = k("IconField"), f = k("Button"), e = k("Select"), L = k("Message");
      return o(), c("div", ye, [
        u[3] || (u[3] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", ke, [
          a(M, { class: "search-box" }, {
            default: G(() => [
              a(d, { class: "pi pi-search" }),
              a(N, {
                modelValue: i.value,
                "onUpdate:modelValue": u[0] || (u[0] = (V) => i.value = V),
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
          a(q(X), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", Ve, [
          a(q(F), {
            name: "recipe.list.filters",
            context: { active: S.value, toggle: b }
          }, null, 8, ["context"]),
          (o(!0), c(
            D,
            null,
            P(y.value, (V) => (o(), J(f, {
              key: V,
              label: V,
              size: "small",
              outlined: r.value !== V,
              "aria-pressed": r.value === V,
              onClick: (H) => r.value = r.value === V ? null : V
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          a(e, {
            modelValue: C.value,
            "onUpdate:modelValue": u[1] || (u[1] = (V) => C.value = V),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        _.value ? (o(), J(L, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Q(
              A(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : O("v-if", !0),
        B.value.length ? (o(), c("div", $e, [
          (o(!0), c(
            D,
            null,
            P(B.value, (V) => (o(), J(be, {
              key: V.id,
              recipe: V,
              "show-cover": g.value,
              onSelect: v
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (o(), c("div", he, [
          u[2] || (u[2] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          a(q(X), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), we = /* @__PURE__ */ E(Ie, [["__scopeId", "data-v-ee2f0a61"]]), Ce = { class: "recipe-detail-page" }, Se = {
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
  setup(p, { emit: $ }) {
    const s = p, w = $, n = Y(), i = m(null), r = m(2), C = m({}), _ = m(""), S = m(!1), h = Z(() => s.id || s.recipeId || ""), U = m(null);
    let g = 0;
    j(h, async (b) => {
      if (!b) return;
      const l = ++g;
      _.value = "", U.value = null;
      try {
        const v = await n.api.get(`/api/recipes/${b}`);
        if (l !== g) return;
        i.value = v, r.value = v.servings || 2, C.value = {}, S.value = !1;
        const y = await ee(n.api, v.group_id);
        if (l !== g) return;
        U.value = y;
        try {
          const B = await n.api.get("/api/x/core-shortlist");
          l === g && (S.value = B.some((I) => I.recipe_id === b));
        } catch {
        }
      } catch (v) {
        l === g && (i.value = null, _.value = (v == null ? void 0 : v.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function R(b) {
      var l;
      w("switchLanguage", b), (l = n.navigate) == null || l.call(n, `/recipes/${b}`);
    }
    function x(b) {
      var v;
      if (b == null) return "";
      const l = b * r.value / (((v = i.value) == null ? void 0 : v.servings) || 1);
      return Number.isInteger(l) ? String(l) : l.toFixed(1);
    }
    return (b, l) => {
      var u;
      const v = k("Button"), y = k("Message"), B = k("Checkbox"), I = k("Tag");
      return o(), c("div", Ce, [
        a(v, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: l[0] || (l[0] = (d) => {
            var N, M;
            return (M = (N = q(n)).navigate) == null ? void 0 : M.call(N, "/recipes");
          })
        }),
        _.value ? (o(), J(y, {
          key: 0,
          severity: "error"
        }, {
          default: G(() => [
            Q(
              A(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : O("v-if", !0),
        i.value ? (o(), c(
          D,
          { key: 1 },
          [
            ((u = i.value.languages) == null ? void 0 : u.length) > 1 ? (o(), c("div", Se, [
              l[3] || (l[3] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (o(!0), c(
                D,
                null,
                P(i.value.languages, (d) => (o(), J(v, {
                  key: d,
                  label: d.toUpperCase(),
                  size: "small",
                  outlined: d !== i.value.language,
                  onClick: (N) => R(`${i.value.group_id}_${d}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : O("v-if", !0),
            t("div", Ue, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  A(i.value.title),
                  1
                  /* TEXT */
                ),
                i.value.description ? (o(), c(
                  "p",
                  xe,
                  A(i.value.description),
                  1
                  /* TEXT */
                )) : O("v-if", !0)
              ]),
              t("div", Re, [
                a(q(F), {
                  name: "recipe.card.actions",
                  context: { recipe: i.value, isShortlisted: S.value }
                }, null, 8, ["context"]),
                a(q(X), {
                  hub: "recipe:actions",
                  context: { recipe: i.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            U.value ? (o(), c("img", {
              key: 1,
              src: q(n).url(`/api/assets/${U.value}/file`),
              alt: i.value.title,
              class: "recipe-cover"
            }, null, 8, Te)) : O("v-if", !0),
            t("div", Ne, [
              l[4] || (l[4] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              a(v, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: r.value <= 1,
                onClick: l[1] || (l[1] = (d) => r.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Be,
                A(r.value),
                1
                /* TEXT */
              ),
              a(v, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: l[2] || (l[2] = (d) => r.value++)
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
                  (o(!0), c(
                    D,
                    null,
                    P(i.value.ingredients, (d, N) => (o(), c("li", {
                      key: N,
                      class: "ingredient-item"
                    }, [
                      a(B, {
                        inputId: `ingredient-${N}`,
                        modelValue: C.value[N],
                        "onUpdate:modelValue": (M) => C.value[N] = M,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${N}`,
                        class: se({ struck: C.value[N] })
                      }, [
                        t(
                          "strong",
                          null,
                          A(x(d.quantity)),
                          1
                          /* TEXT */
                        ),
                        Q(
                          " " + A(d.unit) + " " + A(d.name),
                          1
                          /* TEXT */
                        ),
                        d.notes ? (o(), c(
                          "span",
                          Me,
                          " (" + A(d.notes) + ")",
                          1
                          /* TEXT */
                        )) : O("v-if", !0)
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
                  (o(!0), c(
                    D,
                    null,
                    P(i.value.steps, (d) => (o(), c("li", {
                      key: d.id
                    }, [
                      t(
                        "p",
                        null,
                        A(d.instruction),
                        1
                        /* TEXT */
                      ),
                      d.timer_minutes ? (o(), J(I, {
                        key: 0,
                        value: `${d.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : O("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ]),
            a(q(F), {
              name: "recipe.detail.sidebar",
              context: { recipe: i.value }
            }, null, 8, ["context"]),
            a(q(F), {
              name: "recipe.detail.footer",
              context: { recipe: i.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : O("v-if", !0)
      ]);
    };
  }
}), Pe = /* @__PURE__ */ E(De, [["__scopeId", "data-v-405081f0"]]), Je = { class: "ingredient-row-list" }, Fe = { class: "reorder-btns" }, ze = /* @__PURE__ */ z({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(p, { emit: $ }) {
    const s = p, w = $, n = m(JSON.parse(JSON.stringify(s.modelValue || [])));
    j(() => s.modelValue, (h) => {
      n.value = JSON.parse(JSON.stringify(h || []));
    }, { deep: !0 });
    const i = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((h) => ({ id: h, label: h || "(none)" }));
    function r() {
      w("update:modelValue", n.value);
    }
    function C() {
      n.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), r();
    }
    function _(h) {
      n.value.splice(h, 1), r();
    }
    function S(h, U) {
      const g = h + U;
      g < 0 || g >= n.value.length || (n.value.splice(g, 0, n.value.splice(h, 1)[0]), r());
    }
    return (h, U) => {
      const g = k("Button"), R = k("InputNumber"), x = k("Select"), b = k("InputText");
      return o(), c("div", Je, [
        (o(!0), c(
          D,
          null,
          P(n.value, (l, v) => (o(), c("div", {
            key: l.id,
            class: "ingredient-row"
          }, [
            t("div", Fe, [
              a(g, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: v === 0,
                onClick: (y) => S(v, -1)
              }, null, 8, ["disabled", "onClick"]),
              a(g, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: v === n.value.length - 1,
                onClick: (y) => S(v, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            a(R, {
              modelValue: l.quantity,
              "onUpdate:modelValue": [(y) => l.quantity = y, r],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${v + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(x, {
              modelValue: l.unit,
              "onUpdate:modelValue": [(y) => l.unit = y, r],
              options: q(i),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${v + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            a(b, {
              modelValue: l.name,
              "onUpdate:modelValue": (y) => l.name = y,
              class: "input-name",
              "aria-label": `Ingredient ${v + 1} name`,
              placeholder: "Ingredient name",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(b, {
              modelValue: l.notes,
              "onUpdate:modelValue": (y) => l.notes = y,
              class: "input-notes",
              "aria-label": `Ingredient ${v + 1} notes`,
              placeholder: "Notes",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            a(g, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (y) => _(v)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        a(g, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: C
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
  setup(p, { emit: $ }) {
    const s = p, w = $, n = m(JSON.parse(JSON.stringify(s.modelValue || [])));
    j(() => s.modelValue, (_) => {
      n.value = JSON.parse(JSON.stringify(_ || []));
    }, { deep: !0 });
    function i() {
      w("update:modelValue", n.value);
    }
    function r() {
      n.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), i();
    }
    function C(_) {
      n.value.splice(_, 1), i();
    }
    return (_, S) => {
      const h = k("Tag"), U = k("Textarea"), g = k("InputNumber"), R = k("Button");
      return o(), c("div", Qe, [
        (o(!0), c(
          D,
          null,
          P(n.value, (x, b) => (o(), c("div", {
            key: x.id,
            class: "step-row"
          }, [
            a(h, {
              value: String(b + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Ze, [
              a(U, {
                modelValue: x.instruction,
                "onUpdate:modelValue": (l) => x.instruction = l,
                class: "textarea-instruction",
                "aria-label": `Step ${b + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: i
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", je, [
                t("label", {
                  for: `timer-${x.id}`
                }, "Timer (min)", 8, Ge),
                a(g, {
                  inputId: `timer-${x.id}`,
                  modelValue: x.timer_minutes,
                  "onUpdate:modelValue": [(l) => x.timer_minutes = l, i],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            a(R, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (l) => C(b)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        a(R, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: r
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
  setup(p, { emit: $ }) {
    var M;
    const s = p, w = $, n = Y(), i = Z(() => s.id || s.recipeId || ""), r = m(""), C = m(""), _ = m(((M = n.store.household.value) == null ? void 0 : M.languages.primary) || "en"), S = m(2), h = m(""), U = m(null), g = m(null), R = m([]), x = m(null), b = m([]), l = m([]), v = m(1), y = m(!1), B = m("");
    j(i, async (f) => {
      if (f)
        try {
          const e = await n.api.get(`/api/recipes/${f}`);
          r.value = e.title, C.value = e.description || "", _.value = e.language, S.value = e.servings, U.value = e.prep_time_minutes, g.value = e.cook_time_minutes, R.value = [...e.tags], b.value = e.ingredients, l.value = e.steps, v.value = e.revision, x.value = await ee(n.api, e.group_id), h.value = e.group_id;
        } catch (e) {
          B.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function I(f) {
      var L;
      const e = (L = f.target.files) == null ? void 0 : L[0];
      if (!(!e || y.value || !h.value)) {
        y.value = !0, B.value = "";
        try {
          const V = new FormData();
          V.append("file", e), V.append("entity_type", "recipe"), V.append("entity_id", h.value), V.append("slot", "cover"), x.value = (await n.api.upload("/api/assets", V)).id, n.notify({ level: "success", message: "Cover image saved" });
        } catch (V) {
          B.value = (V == null ? void 0 : V.message) || "Could not upload image";
        } finally {
          y.value = !1;
        }
      }
    }
    async function u() {
      var e;
      if (!r.value.trim() || y.value) return;
      y.value = !0, B.value = "";
      const f = { title: r.value.trim(), description: C.value.trim(), language: _.value, servings: S.value, prep_time_minutes: U.value, cook_time_minutes: g.value, tags: R.value, ingredients: b.value, steps: l.value };
      try {
        const L = i.value ? await n.api.patch(`/api/recipes/${i.value}`, { ...f, revision: v.value }) : await n.api.post("/api/recipes", f);
        w("saved", L), n.notify({ level: "success", message: "Recipe saved" }), (e = n.navigate) == null || e.call(n, `/recipes/${L.id}`);
      } catch (L) {
        B.value = (L == null ? void 0 : L.message) || "Could not save recipe";
      } finally {
        y.value = !1;
      }
    }
    function d(f) {
      f.title && (r.value = f.title), f.description !== void 0 && (C.value = f.description || ""), f.servings && (S.value = f.servings), f.prep_time_minutes !== void 0 && (U.value = f.prep_time_minutes), f.cook_time_minutes !== void 0 && (g.value = f.cook_time_minutes), f.tags && (R.value = [...f.tags]), f.ingredients && (b.value = [...f.ingredients]), f.steps && (l.value = [...f.steps]);
    }
    const N = Z(() => ({
      targetId: i.value,
      recipe: {
        id: i.value,
        title: r.value,
        description: C.value,
        language: _.value,
        servings: S.value,
        prep_time_minutes: U.value,
        cook_time_minutes: g.value,
        tags: R.value,
        ingredients: b.value,
        steps: l.value
      },
      applyAdaptation: d
    }));
    return (f, e) => {
      const L = k("Button"), V = k("Message"), H = k("InputText"), ne = k("Textarea"), K = k("InputNumber"), ae = k("AutoComplete");
      return o(), c(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: W(u, ["prevent"])
        },
        [
          t("div", We, [
            t(
              "h2",
              null,
              A(i.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            t("div", Xe, [
              a(q(F), {
                name: "recipe.edit.actions",
                context: N.value
              }, null, 8, ["context"]),
              a(L, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: y.value,
                onClick: e[0] || (e[0] = (T) => {
                  var te, le;
                  return (le = (te = q(n)).navigate) == null ? void 0 : le.call(te, i.value ? `/recipes/${i.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          B.value ? (o(), J(V, {
            key: 0,
            severity: "error"
          }, {
            default: G(() => [
              Q(
                A(B.value),
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
              modelValue: r.value,
              "onUpdate:modelValue": e[1] || (e[1] = (T) => r.value = T),
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
              modelValue: C.value,
              "onUpdate:modelValue": e[2] || (e[2] = (T) => C.value = T),
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
                modelValue: _.value,
                "onUpdate:modelValue": e[3] || (e[3] = (T) => _.value = T),
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
                modelValue: S.value,
                "onUpdate:modelValue": e[4] || (e[4] = (T) => S.value = T),
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
                "onUpdate:modelValue": e[5] || (e[5] = (T) => U.value = T),
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
                modelValue: g.value,
                "onUpdate:modelValue": e[6] || (e[6] = (T) => g.value = T),
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
              modelValue: R.value,
              "onUpdate:modelValue": e[7] || (e[7] = (T) => R.value = T),
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
              disabled: y.value || !h.value,
              onChange: I
            }, null, 40, ut),
            i.value ? (o(), c("small", ct, "Cover uploads are saved immediately, separately from recipe edits.")) : (o(), c("small", rt, "Save your recipe first to add a cover image.")),
            x.value ? (o(), c("img", {
              key: 2,
              src: q(n).url(`/api/assets/${x.value}/file`),
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
              modelValue: b.value,
              "onUpdate:modelValue": e[8] || (e[8] = (T) => b.value = T)
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
              modelValue: l.value,
              "onUpdate:modelValue": e[9] || (e[9] = (T) => l.value = T)
            }, null, 8, ["modelValue"])
          ]),
          t("div", dt, [
            a(L, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: y.value,
              disabled: !r.value.trim()
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
  p.route({ path: "/recipes", component: we, nav: { label: "Recipes", icon: "book", order: 10 } }), p.route({ path: "/recipes/new", component: ie }), p.route({ path: "/recipes/:id", component: Pe }), p.route({ path: "/recipes/:id/edit", component: ie }), p.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), p.intent.provider({
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
      var s;
      (s = $ == null ? void 0 : $.recipe) != null && s.id && (p.navigate ? p.navigate(`/recipes/${$.recipe.id}/edit`) : window.location.href = p.url ? p.url(`/recipes/${$.recipe.id}/edit`) : `/recipes/${$.recipe.id}/edit`);
    }
  });
}
export {
  gt as default
};
