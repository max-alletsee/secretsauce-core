import { ref as m, defineComponent as Q, resolveComponent as S, openBlock as s, createElementBlock as c, createCommentVNode as U, createElementVNode as l, createVNode as r, withModifiers as le, unref as P, createTextVNode as G, toDisplayString as B, normalizeClass as oe, Fragment as F, renderList as j, createBlock as J, onMounted as re, watch as K, computed as D, withCtx as H } from "vue";
import { Slot as W, useSecretSauce as ee, IntentTrigger as ie } from "@secretsauce/ui";
const X = m(null);
function ce(h) {
  switch (h) {
    case "cookbook":
      return "pi pi-book";
    case "website":
      return "pi pi-globe";
    case "person":
      return "pi pi-user";
    default:
      return "pi pi-bookmark";
  }
}
function pe(h) {
  switch (h) {
    case "cookbook":
      return "Cookbook";
    case "website":
      return "Website";
    case "person":
      return "Person";
    default:
      return "Other";
  }
}
const de = {
  key: 0,
  class: "cover-image"
}, ve = ["src", "alt"], me = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, fe = { class: "card-body" }, ge = { class: "card-header" }, _e = { class: "meta" }, be = { key: 0 }, ye = { key: 1 }, he = {
  key: 0,
  class: "source-meta"
}, ke = { class: "tags" }, Ve = /* @__PURE__ */ Q({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(h, { emit: R }) {
    const g = h, x = R;
    return (u, n) => {
      var k;
      const a = S("Button"), V = S("Tag");
      return s(), c("article", {
        class: "recipe-card",
        onClick: n[2] || (n[2] = ($) => x("select", g.recipe.id))
      }, [
        g.showCover ? (s(), c("div", de, [
          g.recipe.cover_asset_id ? (s(), c("img", {
            key: 0,
            src: g.recipe.cover_url || `/api/assets/${g.recipe.cover_asset_id}/file`,
            alt: g.recipe.title
          }, null, 8, ve)) : (s(), c("i", me))
        ])) : U("v-if", !0),
        l("div", fe, [
          l("div", ge, [
            l("h3", null, [
              r(a, {
                label: g.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: n[0] || (n[0] = le(($) => x("select", g.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            l("div", {
              class: "actions",
              onClick: n[1] || (n[1] = le(() => {
              }, ["stop"]))
            }, [
              r(P(W), {
                name: "recipe.card.actions",
                context: { recipe: g.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          l("div", _e, [
            g.recipe.prep_time_minutes ? (s(), c("span", be, [
              n[3] || (n[3] = l(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              G(
                " " + B(g.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : U("v-if", !0),
            g.recipe.cook_time_minutes ? (s(), c(
              "span",
              ye,
              B(g.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : U("v-if", !0)
          ]),
          (k = g.recipe.source) != null && k.name ? (s(), c("div", he, [
            l(
              "i",
              {
                class: oe(P(ce)(g.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            l(
              "span",
              null,
              B(g.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : U("v-if", !0),
          l("div", ke, [
            (s(!0), c(
              F,
              null,
              j(g.recipe.tags, ($) => (s(), J(V, {
                key: $,
                value: $,
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
}), Y = (h, R) => {
  const g = h.__vccOpts || h;
  for (const [x, u] of R)
    g[x] = u;
  return g;
}, $e = /* @__PURE__ */ Y(Ve, [["__scopeId", "data-v-3caa626b"]]);
async function ne(h, R) {
  var g;
  if (!R) return null;
  try {
    return ((g = (await h.get("/api/assets", { entity_type: "recipe", entity_id: R })).filter((u) => u.slot === "cover").at(-1)) == null ? void 0 : g.id) || null;
  } catch {
    return null;
  }
}
const Ie = { class: "recipe-list-page" }, Se = { class: "intent-header-bar" }, Ce = { class: "filter-sort-bar" }, we = {
  key: 1,
  class: "recipes-grid"
}, xe = {
  key: 2,
  class: "empty-state"
}, Ue = /* @__PURE__ */ Q({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(h, { emit: R }) {
    const g = R, x = ee(), u = m([]), n = m(""), a = m(null), V = m("title"), k = m(""), $ = m([]), b = m([]), I = m(!1), C = m(/* @__PURE__ */ new Set());
    function N() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const w = m(N());
    let A = 0;
    async function y() {
      try {
        const e = await x.api.get("/api/x/core-shortlist");
        C.value = new Set(e.map((i) => i.recipe_id));
      } catch {
      }
    }
    async function L() {
      try {
        const e = await x.api.get("/api/recipes/sources");
        Array.isArray(e) ? b.value = e : e && Array.isArray(e.items) && (b.value = e.items);
      } catch {
      }
    }
    async function z() {
      I.value = !I.value, I.value && await y();
    }
    async function q() {
      const e = ++A;
      k.value = "";
      try {
        const i = { q: n.value.trim() };
        $.value.length > 0 && (i.source = $.value);
        const o = await x.api.get("/api/recipes", i);
        if (e !== A || (u.value = o.items, !w.value)) return;
        const t = await Promise.all(o.items.map(async (p) => {
          const f = await ne(x.api, p.group_id);
          return { ...p, cover_asset_id: f, cover_url: f ? x.url(`/api/assets/${f}/file`) : null };
        }));
        e === A && (u.value = t);
      } catch (i) {
        e === A && (k.value = (i == null ? void 0 : i.message) || "Could not load recipes");
      }
    }
    function _(e) {
      var i;
      g("openRecipe", e), (i = x.navigate) == null || i.call(x, `/recipes/${e}`);
    }
    re(() => {
      w.value = N(), X.value && ($.value = [...X.value], X.value = null), q(), y(), L();
    }), K([n, $], q);
    const d = D(() => {
      const e = [
        { value: "none", label: "No source" }
      ], i = /* @__PURE__ */ new Set(["none"]);
      for (const o of b.value)
        !o.name || i.has(o.name) || (i.add(o.name), e.push({
          value: o.name,
          label: o.author ? `${o.name} (${o.author})` : o.name
        }));
      for (const o of $.value)
        i.has(o) || (i.add(o), e.push({ value: o, label: o }));
      return e;
    }), T = D(() => [...new Set(u.value.flatMap((e) => e.tags || []))]), v = D(() => {
      let e = u.value.map((i) => ({ ...i, is_shortlisted: C.value.has(i.id) }));
      return I.value && (e = e.filter((i) => C.value.has(i.id))), a.value && (e = e.filter((i) => {
        var o;
        return (o = i.tags) == null ? void 0 : o.includes(a.value);
      })), e.sort(V.value === "title" ? (i, o) => i.title.localeCompare(o.title) : (i, o) => (i.prep_time_minutes || 0) - (o.prep_time_minutes || 0));
    });
    return (e, i) => {
      const o = S("InputIcon"), t = S("InputText"), p = S("IconField"), f = S("MultiSelect"), E = S("Button"), te = S("Select"), Z = S("Message");
      return s(), c("div", Ie, [
        i[4] || (i[4] = l(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        l("div", Se, [
          r(p, { class: "search-box" }, {
            default: H(() => [
              r(o, { class: "pi pi-search" }),
              r(t, {
                modelValue: n.value,
                "onUpdate:modelValue": i[0] || (i[0] = (M) => n.value = M),
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
          r(P(ie), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        l("div", Ce, [
          r(P(W), {
            name: "recipe.list.filters",
            context: { active: I.value, toggle: z }
          }, null, 8, ["context"]),
          r(f, {
            modelValue: $.value,
            "onUpdate:modelValue": i[1] || (i[1] = (M) => $.value = M),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: d.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (s(!0), c(
            F,
            null,
            j(T.value, (M) => (s(), J(E, {
              key: M,
              label: M,
              size: "small",
              outlined: a.value !== M,
              "aria-pressed": a.value === M,
              onClick: (O) => a.value = a.value === M ? null : M
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          r(te, {
            modelValue: V.value,
            "onUpdate:modelValue": i[2] || (i[2] = (M) => V.value = M),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        k.value ? (s(), J(Z, {
          key: 0,
          severity: "error"
        }, {
          default: H(() => [
            G(
              B(k.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        v.value.length ? (s(), c("div", we, [
          (s(!0), c(
            F,
            null,
            j(v.value, (M) => (s(), J($e, {
              key: M.id,
              recipe: M,
              "show-cover": w.value,
              onSelect: _
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (s(), c("div", xe, [
          i[3] || (i[3] = l(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          r(P(ie), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Re = /* @__PURE__ */ Y(Ue, [["__scopeId", "data-v-8882c8ff"]]), Te = { class: "recipe-detail-page" }, Ne = {
  key: 0,
  class: "lang-bar"
}, Ae = { class: "detail-header" }, Le = {
  key: 0,
  class: "recipe-source-attribution"
}, Be = {
  key: 0,
  class: "source-locator"
}, Oe = {
  key: 1,
  class: "source-author"
}, ze = ["href"], Pe = {
  key: 3,
  class: "source-notes"
}, qe = { key: 1 }, Me = { class: "detail-actions" }, Fe = ["src", "alt"], De = { class: "scaler-card" }, Ee = { class: "servings-value" }, Je = {
  key: 2,
  class: "content-grid"
}, We = { class: "ingredient-checklist" }, je = ["for"], Ge = {
  key: 0,
  class: "notes"
}, Ke = { class: "steps-list" }, Qe = /* @__PURE__ */ Q({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(h, { emit: R }) {
    const g = h, x = R, u = ee(), n = m(null), a = m(2), V = m({}), k = m(""), $ = m(!1), b = m(null), I = m(!1), C = D(() => g.id || g.recipeId || ""), N = m(null);
    let w = 0;
    K(C, async (_) => {
      if (!_) return;
      const d = ++w;
      k.value = "", N.value = null, b.value = null, I.value = !1;
      try {
        const T = await u.api.get(`/api/recipes/${_}`);
        if (d !== w) return;
        n.value = T, a.value = T.servings || 2, V.value = {}, $.value = !1;
        const v = await ne(u.api, T.group_id);
        if (d !== w) return;
        N.value = v;
        try {
          const e = await u.api.get("/api/x/core-shortlist");
          d === w && ($.value = e.some((i) => i.recipe_id === _));
        } catch {
        }
      } catch (T) {
        d === w && (n.value = null, k.value = (T == null ? void 0 : T.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function A(_) {
      var d;
      x("switchLanguage", _), (d = u.navigate) == null || d.call(u, `/recipes/${_}`);
    }
    const y = D(() => {
      var d, T;
      const _ = ((d = b.value) == null ? void 0 : d.source) ?? ((T = n.value) == null ? void 0 : T.source);
      return _ && _.name ? _ : null;
    });
    function L(_) {
      var d;
      X.value = [_], (d = u.navigate) == null || d.call(u, "/recipes");
    }
    function z(_) {
      var T;
      if (_ == null) return "";
      const d = _ * a.value / (((T = n.value) == null ? void 0 : T.servings) || 1);
      return Number.isInteger(d) ? String(d) : d.toFixed(1);
    }
    const q = D(() => ({
      recipe: n.value,
      customizedRecipe: b.value,
      customizeOpen: I.value,
      currentServings: a.value,
      checkedIngredients: V.value,
      setCustomizeOpen: (_) => {
        I.value = _;
      },
      applyCustomization: (_) => {
        b.value = _, V.value = {}, _ != null && _.servings && (a.value = _.servings);
      },
      resetCustomization: () => {
        b.value = null, V.value = {}, n.value && (a.value = n.value.servings || 2);
      },
      onRecipeUpdated: (_) => {
        n.value = _, b.value = null, I.value = !1, V.value = {}, a.value = _.servings || 2;
      },
      setCheckedIngredients: (_) => {
        V.value = _;
      }
    }));
    return (_, d) => {
      var o, t;
      const T = S("Button"), v = S("Message"), e = S("Checkbox"), i = S("Tag");
      return s(), c("div", Te, [
        r(T, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: d[0] || (d[0] = (p) => {
            var f, E;
            return (E = (f = P(u)).navigate) == null ? void 0 : E.call(f, "/recipes");
          })
        }),
        k.value ? (s(), J(v, {
          key: 0,
          severity: "error"
        }, {
          default: H(() => [
            G(
              B(k.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        n.value ? (s(), c(
          F,
          { key: 1 },
          [
            ((o = n.value.languages) == null ? void 0 : o.length) > 1 ? (s(), c("div", Ne, [
              d[4] || (d[4] = l(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (s(!0), c(
                F,
                null,
                j(n.value.languages, (p) => (s(), J(T, {
                  key: p,
                  label: p.toUpperCase(),
                  size: "small",
                  outlined: p !== n.value.language,
                  onClick: (f) => A(`${n.value.group_id}_${p}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : U("v-if", !0),
            l("div", Ae, [
              l("div", null, [
                l(
                  "h1",
                  null,
                  B(((t = b.value) == null ? void 0 : t.title) || n.value.title),
                  1
                  /* TEXT */
                ),
                y.value ? (s(), c("div", Le, [
                  l(
                    "i",
                    {
                      class: oe(P(ce)(y.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  d[6] || (d[6] = l(
                    "span",
                    { class: "source-prefix" },
                    "From: ",
                    -1
                    /* CACHED */
                  )),
                  l(
                    "button",
                    {
                      type: "button",
                      class: "source-filter-link",
                      onClick: d[1] || (d[1] = (p) => L(y.value.name))
                    },
                    B(y.value.name),
                    1
                    /* TEXT */
                  ),
                  y.value.type === "cookbook" && y.value.page ? (s(), c(
                    "span",
                    Be,
                    ", p. " + B(y.value.page),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  y.value.author ? (s(), c(
                    "span",
                    Oe,
                    " by " + B(y.value.author),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  y.value.url ? (s(), c("a", {
                    key: 2,
                    href: y.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...d[5] || (d[5] = [
                    l(
                      "i",
                      {
                        class: "pi pi-external-link",
                        "aria-hidden": "true"
                      },
                      null,
                      -1
                      /* CACHED */
                    )
                  ])], 8, ze)) : U("v-if", !0),
                  y.value.notes ? (s(), c(
                    "span",
                    Pe,
                    " — " + B(y.value.notes),
                    1
                    /* TEXT */
                  )) : U("v-if", !0)
                ])) : U("v-if", !0),
                !b.value && n.value.description ? (s(), c(
                  "p",
                  qe,
                  B(n.value.description),
                  1
                  /* TEXT */
                )) : U("v-if", !0)
              ]),
              l("div", Me, [
                r(P(W), {
                  name: "recipe.detail.actions",
                  context: q.value
                }, null, 8, ["context"]),
                r(P(W), {
                  name: "recipe.card.actions",
                  context: { recipe: n.value, isShortlisted: $.value }
                }, null, 8, ["context"]),
                r(P(ie), {
                  hub: "recipe:actions",
                  context: { recipe: n.value },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            N.value ? (s(), c("img", {
              key: 1,
              src: P(u).url(`/api/assets/${N.value}/file`),
              alt: n.value.title,
              class: "recipe-cover"
            }, null, 8, Fe)) : U("v-if", !0),
            l("div", De, [
              d[7] || (d[7] = l(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              r(T, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: a.value <= 1,
                onClick: d[2] || (d[2] = (p) => a.value--)
              }, null, 8, ["disabled"]),
              l(
                "span",
                Ee,
                B(a.value),
                1
                /* TEXT */
              ),
              r(T, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: d[3] || (d[3] = (p) => a.value++)
              })
            ]),
            r(P(W), {
              name: "recipe.detail.customize",
              context: q.value
            }, null, 8, ["context"]),
            b.value ? U("v-if", !0) : (s(), c("div", Je, [
              l("section", null, [
                d[8] || (d[8] = l(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                l("ul", We, [
                  (s(!0), c(
                    F,
                    null,
                    j(n.value.ingredients, (p, f) => (s(), c("li", {
                      key: f,
                      class: "ingredient-item"
                    }, [
                      r(e, {
                        inputId: `ingredient-${f}`,
                        modelValue: V.value[f],
                        "onUpdate:modelValue": (E) => V.value[f] = E,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      l("label", {
                        for: `ingredient-${f}`,
                        class: oe({ struck: V.value[f] })
                      }, [
                        l(
                          "strong",
                          null,
                          B(z(p.quantity)),
                          1
                          /* TEXT */
                        ),
                        G(
                          " " + B(p.unit) + " " + B(p.name),
                          1
                          /* TEXT */
                        ),
                        p.notes ? (s(), c(
                          "span",
                          Ge,
                          " (" + B(p.notes) + ")",
                          1
                          /* TEXT */
                        )) : U("v-if", !0)
                      ], 10, je)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              l("section", null, [
                d[9] || (d[9] = l(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                l("ol", Ke, [
                  (s(!0), c(
                    F,
                    null,
                    j(n.value.steps, (p) => (s(), c("li", {
                      key: p.id
                    }, [
                      l(
                        "p",
                        null,
                        B(p.instruction),
                        1
                        /* TEXT */
                      ),
                      p.timer_minutes ? (s(), J(i, {
                        key: 0,
                        value: `${p.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : U("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ])),
            r(P(W), {
              name: "recipe.detail.sidebar",
              context: { recipe: n.value }
            }, null, 8, ["context"]),
            r(P(W), {
              name: "recipe.detail.footer",
              context: { recipe: n.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : U("v-if", !0)
      ]);
    };
  }
}), Ye = /* @__PURE__ */ Y(Qe, [["__scopeId", "data-v-b1fd46ed"]]), Ze = { class: "ingredient-row-list" }, He = { class: "reorder-btns" }, Xe = /* @__PURE__ */ Q({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(h, { emit: R }) {
    const g = h, x = R, u = m(JSON.parse(JSON.stringify(g.modelValue || [])));
    K(() => g.modelValue, (b) => {
      u.value = JSON.parse(JSON.stringify(b || []));
    }, { deep: !0 });
    const n = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((b) => ({ id: b, label: b || "(none)" }));
    function a() {
      x("update:modelValue", u.value);
    }
    function V() {
      u.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), a();
    }
    function k(b) {
      u.value.splice(b, 1), a();
    }
    function $(b, I) {
      const C = b + I;
      C < 0 || C >= u.value.length || (u.value.splice(C, 0, u.value.splice(b, 1)[0]), a());
    }
    return (b, I) => {
      const C = S("Button"), N = S("InputNumber"), w = S("Select"), A = S("InputText");
      return s(), c("div", Ze, [
        (s(!0), c(
          F,
          null,
          j(u.value, (y, L) => (s(), c("div", {
            key: y.id,
            class: "ingredient-row"
          }, [
            l("div", He, [
              r(C, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: L === 0,
                onClick: (z) => $(L, -1)
              }, null, 8, ["disabled", "onClick"]),
              r(C, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: L === u.value.length - 1,
                onClick: (z) => $(L, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            r(N, {
              modelValue: y.quantity,
              "onUpdate:modelValue": [(z) => y.quantity = z, a],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${L + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            r(w, {
              modelValue: y.unit,
              "onUpdate:modelValue": [(z) => y.unit = z, a],
              options: P(n),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${L + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            r(A, {
              modelValue: y.name,
              "onUpdate:modelValue": (z) => y.name = z,
              class: "input-name",
              "aria-label": `Ingredient ${L + 1} name`,
              placeholder: "Ingredient name",
              onInput: a
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            r(A, {
              modelValue: y.notes,
              "onUpdate:modelValue": (z) => y.notes = z,
              class: "input-notes",
              "aria-label": `Ingredient ${L + 1} notes`,
              placeholder: "Notes",
              onInput: a
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            r(C, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (z) => k(L)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        r(C, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: V
        })
      ]);
    };
  }
}), et = /* @__PURE__ */ Y(Xe, [["__scopeId", "data-v-6a40d29c"]]), tt = { class: "step-list" }, lt = { class: "step-inputs" }, ot = { class: "timer-row" }, it = ["for"], nt = /* @__PURE__ */ Q({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(h, { emit: R }) {
    const g = h, x = R, u = m(JSON.parse(JSON.stringify(g.modelValue || [])));
    K(() => g.modelValue, (k) => {
      u.value = JSON.parse(JSON.stringify(k || []));
    }, { deep: !0 });
    function n() {
      x("update:modelValue", u.value);
    }
    function a() {
      u.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), n();
    }
    function V(k) {
      u.value.splice(k, 1), n();
    }
    return (k, $) => {
      const b = S("Tag"), I = S("Textarea"), C = S("InputNumber"), N = S("Button");
      return s(), c("div", tt, [
        (s(!0), c(
          F,
          null,
          j(u.value, (w, A) => (s(), c("div", {
            key: w.id,
            class: "step-row"
          }, [
            r(b, {
              value: String(A + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            l("div", lt, [
              r(I, {
                modelValue: w.instruction,
                "onUpdate:modelValue": (y) => w.instruction = y,
                class: "textarea-instruction",
                "aria-label": `Step ${A + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: n
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              l("div", ot, [
                l("label", {
                  for: `timer-${w.id}`
                }, "Timer (min)", 8, it),
                r(C, {
                  inputId: `timer-${w.id}`,
                  modelValue: w.timer_minutes,
                  "onUpdate:modelValue": [(y) => w.timer_minutes = y, n],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            r(N, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (y) => V(A)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        r(N, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: a
        })
      ]);
    };
  }
}), at = /* @__PURE__ */ Y(nt, [["__scopeId", "data-v-4c4135f0"]]), st = { class: "source-editor" }, ut = { class: "source-header" }, rt = { class: "source-grid" }, ct = { class: "form-group" }, pt = { class: "form-group source-name-field" }, dt = { class: "source-suggestion" }, vt = { class: "suggestion-name" }, mt = { class: "suggestion-meta" }, ft = {
  key: 0,
  class: "form-group"
}, gt = {
  key: 1,
  class: "form-group"
}, _t = {
  key: 2,
  class: "form-group source-url-field"
}, bt = {
  key: 3,
  class: "form-group source-notes-field"
}, yt = /* @__PURE__ */ Q({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(h, { emit: R }) {
    const g = h, x = R, u = ee(), n = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], a = m("cookbook"), V = m(""), k = m(""), $ = m(""), b = m(""), I = m(""), C = m([]), N = m([]);
    let w = !1;
    function A(v) {
      w = !0, v && v.name ? (a.value = v.type || "other", V.value = v.name || "", k.value = v.author || "", $.value = v.page || "", b.value = v.url || "", I.value = v.notes || "") : (V.value = "", k.value = "", $.value = "", b.value = "", I.value = ""), w = !1;
    }
    K(() => g.modelValue, A, { immediate: !0, deep: !0 });
    function y() {
      if (w) return;
      const v = V.value.trim();
      if (!v) {
        x("update:modelValue", null);
        return;
      }
      const e = {
        type: a.value,
        name: v
      }, i = k.value.trim(), o = $.value.trim(), t = b.value.trim(), p = I.value.trim();
      i && (e.author = i), a.value === "cookbook" && o && (e.page = o), (a.value === "website" || a.value === "other") && t && (e.url = t), p && (e.notes = p), x("update:modelValue", e);
    }
    K([a, V, k, $, b, I], y), re(async () => {
      var v, e;
      try {
        const i = await ((e = (v = u.api) == null ? void 0 : v.get) == null ? void 0 : e.call(v, "/api/recipes/sources"));
        Array.isArray(i) ? C.value = i : i && Array.isArray(i.items) && (C.value = i.items);
      } catch {
      }
    });
    function L(v) {
      const e = (v.query || "").trim().toLowerCase();
      if (!e) {
        N.value = [...C.value];
        return;
      }
      N.value = C.value.filter(
        (i) => i.name.toLowerCase().includes(e) || i.author && i.author.toLowerCase().includes(e)
      );
    }
    function z(v) {
      v && typeof v == "object" ? (V.value = v.name || "", v.type && (a.value = v.type), (v.author && !k.value.trim() || v.author) && (k.value = v.author)) : V.value = typeof v == "string" ? v : "";
    }
    function q(v) {
      const e = v == null ? void 0 : v.value;
      e && (V.value = e.name, e.type && (a.value = e.type), e.author && (k.value = e.author));
    }
    function _() {
      V.value = "", k.value = "", $.value = "", b.value = "", I.value = "", x("update:modelValue", null);
    }
    const d = D(
      () => !!(V.value.trim() || k.value.trim() || $.value.trim() || b.value.trim() || I.value.trim())
    ), T = D(() => {
      switch (a.value) {
        case "cookbook":
          return "e.g. Simple";
        case "website":
          return "e.g. Smitten Kitchen";
        case "person":
          return "e.g. Grandma Rose";
        default:
          return "Source name";
      }
    });
    return (v, e) => {
      const i = S("Button"), o = S("Select"), t = S("AutoComplete"), p = S("InputText");
      return s(), c("fieldset", st, [
        l("div", ut, [
          e[5] || (e[5] = l(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          d.value ? (s(), J(i, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: _
          })) : U("v-if", !0)
        ]),
        l("div", rt, [
          l("div", ct, [
            e[6] || (e[6] = l(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            r(o, {
              inputId: "recipe-source-type",
              modelValue: a.value,
              "onUpdate:modelValue": e[0] || (e[0] = (f) => a.value = f),
              options: n,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", pt, [
            e[7] || (e[7] = l(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            r(t, {
              inputId: "recipe-source-name",
              modelValue: V.value,
              suggestions: N.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: T.value,
              fluid: "",
              "onUpdate:modelValue": z,
              onComplete: L,
              onItemSelect: q
            }, {
              option: H(({ option: f }) => [
                l("div", dt, [
                  l(
                    "span",
                    vt,
                    B(f.name),
                    1
                    /* TEXT */
                  ),
                  l("small", mt, [
                    G(
                      B(P(pe)(f.type)),
                      1
                      /* TEXT */
                    ),
                    f.author ? (s(), c(
                      F,
                      { key: 0 },
                      [
                        G(
                          " · " + B(f.author),
                          1
                          /* TEXT */
                        )
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : U("v-if", !0)
                  ])
                ])
              ]),
              _: 1
              /* STABLE */
            }, 8, ["modelValue", "suggestions", "placeholder"])
          ]),
          a.value !== "person" ? (s(), c("div", ft, [
            e[8] || (e[8] = l(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            r(p, {
              id: "recipe-source-author",
              modelValue: k.value,
              "onUpdate:modelValue": e[1] || (e[1] = (f) => k.value = f),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          a.value === "cookbook" ? (s(), c("div", gt, [
            e[9] || (e[9] = l(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            r(p, {
              id: "recipe-source-page",
              modelValue: $.value,
              "onUpdate:modelValue": e[2] || (e[2] = (f) => $.value = f),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          a.value === "website" || a.value === "other" ? (s(), c("div", _t, [
            e[10] || (e[10] = l(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            r(p, {
              id: "recipe-source-url",
              modelValue: b.value,
              "onUpdate:modelValue": e[3] || (e[3] = (f) => b.value = f),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          a.value === "person" || a.value === "other" ? (s(), c("div", bt, [
            e[11] || (e[11] = l(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            r(p, {
              id: "recipe-source-notes",
              modelValue: I.value,
              "onUpdate:modelValue": e[4] || (e[4] = (f) => I.value = f),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0)
        ])
      ]);
    };
  }
}), ht = /* @__PURE__ */ Y(yt, [["__scopeId", "data-v-267c9e36"]]), kt = { class: "edit-top-bar" }, Vt = { class: "edit-top-actions" }, $t = { class: "form-group" }, It = { class: "form-group" }, St = { class: "form-row" }, Ct = { class: "form-group" }, wt = { class: "form-group" }, xt = { class: "form-group" }, Ut = { class: "form-group" }, Rt = { class: "form-group" }, Tt = { class: "form-group" }, Nt = ["disabled"], At = { key: 0 }, Lt = { key: 1 }, Bt = ["src"], Ot = { class: "actions-row" }, zt = /* @__PURE__ */ Q({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(h, { emit: R }) {
    var i;
    const g = h, x = R, u = ee(), n = D(() => g.id || g.recipeId || ""), a = m(""), V = m(""), k = m(((i = u.store.household.value) == null ? void 0 : i.languages.primary) || "en"), $ = m(2), b = m(""), I = m(null), C = m(null), N = m([]), w = m(null), A = m(null), y = m([]), L = m([]), z = m(1), q = m(!1), _ = m("");
    K(n, async (o) => {
      if (o)
        try {
          const t = await u.api.get(`/api/recipes/${o}`);
          a.value = t.title, V.value = t.description || "", k.value = t.language, $.value = t.servings, I.value = t.prep_time_minutes, C.value = t.cook_time_minutes, N.value = [...t.tags], A.value = t.source || null, y.value = t.ingredients, L.value = t.steps, z.value = t.revision, w.value = await ne(u.api, t.group_id), b.value = t.group_id;
        } catch (t) {
          _.value = (t == null ? void 0 : t.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function d(o) {
      var p;
      const t = (p = o.target.files) == null ? void 0 : p[0];
      if (!(!t || q.value || !b.value)) {
        q.value = !0, _.value = "";
        try {
          const f = new FormData();
          f.append("file", t), f.append("entity_type", "recipe"), f.append("entity_id", b.value), f.append("slot", "cover"), w.value = (await u.api.upload("/api/assets", f)).id, u.notify({ level: "success", message: "Cover image saved" });
        } catch (f) {
          _.value = (f == null ? void 0 : f.message) || "Could not upload image";
        } finally {
          q.value = !1;
        }
      }
    }
    async function T() {
      var t;
      if (!a.value.trim() || q.value) return;
      q.value = !0, _.value = "";
      const o = {
        title: a.value.trim(),
        description: V.value.trim(),
        language: k.value,
        servings: $.value,
        prep_time_minutes: I.value,
        cook_time_minutes: C.value,
        tags: N.value,
        ingredients: y.value,
        steps: L.value
      };
      (A.value !== null || n.value) && (o.source = A.value);
      try {
        const p = n.value ? await u.api.patch(`/api/recipes/${n.value}`, { ...o, revision: z.value }) : await u.api.post("/api/recipes", o);
        x("saved", p), u.notify({ level: "success", message: "Recipe saved" }), (t = u.navigate) == null || t.call(u, `/recipes/${p.id}`);
      } catch (p) {
        _.value = (p == null ? void 0 : p.message) || "Could not save recipe";
      } finally {
        q.value = !1;
      }
    }
    function v(o) {
      o.title && (a.value = o.title), o.description !== void 0 && (V.value = o.description || ""), o.servings && ($.value = o.servings), o.prep_time_minutes !== void 0 && (I.value = o.prep_time_minutes), o.cook_time_minutes !== void 0 && (C.value = o.cook_time_minutes), o.tags && (N.value = [...o.tags]), o.source !== void 0 && (A.value = o.source || null), o.ingredients && (y.value = [...o.ingredients]), o.steps && (L.value = [...o.steps]);
    }
    const e = D(() => ({
      targetId: n.value,
      recipe: {
        id: n.value,
        title: a.value,
        description: V.value,
        language: k.value,
        servings: $.value,
        prep_time_minutes: I.value,
        cook_time_minutes: C.value,
        tags: N.value,
        source: A.value,
        ingredients: y.value,
        steps: L.value
      },
      applyAdaptation: v
    }));
    return (o, t) => {
      const p = S("Button"), f = S("Message"), E = S("InputText"), te = S("Textarea"), Z = S("InputNumber"), M = S("AutoComplete");
      return s(), c(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: le(T, ["prevent"])
        },
        [
          l("div", kt, [
            l(
              "h2",
              null,
              B(n.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            l("div", Vt, [
              r(P(W), {
                name: "recipe.edit.actions",
                context: e.value
              }, null, 8, ["context"]),
              r(p, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: q.value,
                onClick: t[0] || (t[0] = (O) => {
                  var ae, se;
                  return (se = (ae = P(u)).navigate) == null ? void 0 : se.call(ae, n.value ? `/recipes/${n.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          _.value ? (s(), J(f, {
            key: 0,
            severity: "error"
          }, {
            default: H(() => [
              G(
                B(_.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : U("v-if", !0),
          l("div", $t, [
            t[11] || (t[11] = l(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            r(E, {
              id: "recipe-title",
              modelValue: a.value,
              "onUpdate:modelValue": t[1] || (t[1] = (O) => a.value = O),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", It, [
            t[12] || (t[12] = l(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            r(te, {
              id: "recipe-description",
              modelValue: V.value,
              "onUpdate:modelValue": t[2] || (t[2] = (O) => V.value = O),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", St, [
            l("div", Ct, [
              t[13] || (t[13] = l(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              r(E, {
                id: "recipe-language",
                modelValue: k.value,
                "onUpdate:modelValue": t[3] || (t[3] = (O) => k.value = O),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", wt, [
              t[14] || (t[14] = l(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              r(Z, {
                inputId: "recipe-servings",
                modelValue: $.value,
                "onUpdate:modelValue": t[4] || (t[4] = (O) => $.value = O),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", xt, [
              t[15] || (t[15] = l(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              r(Z, {
                inputId: "recipe-prep",
                modelValue: I.value,
                "onUpdate:modelValue": t[5] || (t[5] = (O) => I.value = O),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Ut, [
              t[16] || (t[16] = l(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              r(Z, {
                inputId: "recipe-cook",
                modelValue: C.value,
                "onUpdate:modelValue": t[6] || (t[6] = (O) => C.value = O),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          l("div", Rt, [
            t[17] || (t[17] = l(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            r(M, {
              inputId: "recipe-tags",
              modelValue: N.value,
              "onUpdate:modelValue": t[7] || (t[7] = (O) => N.value = O),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          r(ht, {
            modelValue: A.value,
            "onUpdate:modelValue": t[8] || (t[8] = (O) => A.value = O)
          }, null, 8, ["modelValue"]),
          l("div", Tt, [
            t[18] || (t[18] = l(
              "label",
              { for: "recipe-cover" },
              "Cover image",
              -1
              /* CACHED */
            )),
            l("input", {
              id: "recipe-cover",
              type: "file",
              accept: "image/*",
              disabled: q.value || !b.value,
              onChange: d
            }, null, 40, Nt),
            n.value ? (s(), c("small", Lt, "Cover uploads are saved immediately, separately from recipe edits.")) : (s(), c("small", At, "Save your recipe first to add a cover image.")),
            w.value ? (s(), c("img", {
              key: 2,
              src: P(u).url(`/api/assets/${w.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, Bt)) : U("v-if", !0)
          ]),
          l("section", null, [
            t[19] || (t[19] = l(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            r(et, {
              modelValue: y.value,
              "onUpdate:modelValue": t[9] || (t[9] = (O) => y.value = O)
            }, null, 8, ["modelValue"])
          ]),
          l("section", null, [
            t[20] || (t[20] = l(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            r(at, {
              modelValue: L.value,
              "onUpdate:modelValue": t[10] || (t[10] = (O) => L.value = O)
            }, null, 8, ["modelValue"])
          ]),
          l("div", Ot, [
            r(p, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: q.value,
              disabled: !a.value.trim()
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ue = /* @__PURE__ */ Y(zt, [["__scopeId", "data-v-4b9c453a"]]);
function Mt(h) {
  h.route({ path: "/recipes", component: Re, nav: { label: "Recipes", icon: "book", order: 10 } }), h.route({ path: "/recipes/new", component: ue }), h.route({ path: "/recipes/:id", component: Ye }), h.route({ path: "/recipes/:id/edit", component: ue }), h.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), h.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      h.navigate ? h.navigate("/recipes/new") : window.location.href = h.url ? h.url("/recipes/new") : "/recipes/new";
    }
  }), h.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), h.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (R) => {
      var g;
      (g = R == null ? void 0 : R.recipe) != null && g.id && (h.navigate ? h.navigate(`/recipes/${R.recipe.id}/edit`) : window.location.href = h.url ? h.url(`/recipes/${R.recipe.id}/edit`) : `/recipes/${R.recipe.id}/edit`);
    }
  });
}
export {
  Mt as default
};
