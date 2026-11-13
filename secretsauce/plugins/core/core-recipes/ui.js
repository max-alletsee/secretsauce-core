import { ref as f, defineComponent as H, resolveComponent as C, openBlock as c, createElementBlock as g, createCommentVNode as A, createElementVNode as t, createVNode as p, withModifiers as ae, unref as M, createTextVNode as Y, toDisplayString as O, normalizeClass as ne, Fragment as W, renderList as Q, createBlock as J, onBeforeUnmount as ue, onMounted as ve, watch as Z, computed as G, withCtx as ee } from "vue";
import { Slot as K, useSecretSauce as le, IntentTrigger as se } from "@secretsauce/ui";
const te = f(null);
function me(n) {
  switch (n) {
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
function he(n) {
  switch (n) {
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
const ke = {
  key: 0,
  class: "cover-image"
}, Ve = ["src", "alt"], $e = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, Ie = { class: "card-body" }, we = { class: "card-header" }, Ce = { class: "meta" }, Se = { key: 0 }, Ue = { key: 1 }, Re = {
  key: 0,
  class: "source-meta"
}, Te = { class: "tags" }, Ae = /* @__PURE__ */ H({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(n, { emit: s }) {
    const u = n, $ = s;
    return (a, o) => {
      var b;
      const r = C("Button"), h = C("Tag");
      return c(), g("article", {
        class: "recipe-card",
        onClick: o[2] || (o[2] = (k) => $("select", u.recipe.id))
      }, [
        u.showCover ? (c(), g("div", ke, [
          u.recipe.cover_asset_id ? (c(), g("img", {
            key: 0,
            src: u.recipe.cover_url || `/api/assets/${u.recipe.cover_asset_id}/file`,
            alt: u.recipe.title
          }, null, 8, Ve)) : (c(), g("i", $e))
        ])) : A("v-if", !0),
        t("div", Ie, [
          t("div", we, [
            t("h3", null, [
              p(r, {
                label: u.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: o[0] || (o[0] = ae((k) => $("select", u.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: o[1] || (o[1] = ae(() => {
              }, ["stop"]))
            }, [
              p(M(K), {
                name: "recipe.card.actions",
                context: { recipe: u.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", Ce, [
            u.recipe.prep_time_minutes ? (c(), g("span", Se, [
              o[3] || (o[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Y(
                " " + O(u.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : A("v-if", !0),
            u.recipe.cook_time_minutes ? (c(), g(
              "span",
              Ue,
              O(u.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          (b = u.recipe.source) != null && b.name ? (c(), g("div", Re, [
            t(
              "i",
              {
                class: ne(M(me)(u.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            t(
              "span",
              null,
              O(u.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : A("v-if", !0),
          t("div", Te, [
            (c(!0), g(
              W,
              null,
              Q(u.recipe.tags, (k) => (c(), J(h, {
                key: k,
                value: k,
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
}), X = (n, s) => {
  const u = n.__vccOpts || n;
  for (const [$, a] of s)
    u[$] = a;
  return u;
}, Le = /* @__PURE__ */ X(Ae, [["__scopeId", "data-v-3caa626b"]]);
async function re(n, s) {
  var u;
  if (!s) return null;
  try {
    return ((u = (await n.get("/api/assets", { entity_type: "recipe", entity_id: s })).filter((a) => a.slot === "cover").at(-1)) == null ? void 0 : u.id) || null;
  } catch {
    return null;
  }
}
const Ne = { class: "recipe-list-page" }, xe = { class: "intent-header-bar" }, Be = { class: "filter-sort-bar" }, De = {
  key: 1,
  class: "recipes-grid"
}, Oe = {
  key: 2,
  class: "empty-state"
}, ze = /* @__PURE__ */ H({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(n, { emit: s }) {
    const u = s, $ = le(), a = f([]), o = f(""), r = f(null), h = f("title"), b = f(""), k = f([]), y = f([]), I = f(!1), U = f(/* @__PURE__ */ new Set());
    function B() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const N = f(B());
    let L = 0;
    async function S() {
      try {
        const v = await $.api.get("/api/x/core-shortlist");
        U.value = new Set(v.map((d) => d.recipe_id));
      } catch {
      }
    }
    async function D() {
      try {
        const v = await $.api.get("/api/recipes/sources");
        Array.isArray(v) ? y.value = v : v && Array.isArray(v.items) && (y.value = v.items);
      } catch {
      }
    }
    async function w() {
      I.value = !I.value, I.value && await S();
    }
    async function j() {
      const v = ++L;
      b.value = "";
      try {
        const d = { q: o.value.trim() };
        k.value.length > 0 && (d.source = k.value);
        const V = await $.api.get("/api/recipes", d);
        if (v !== L || (a.value = V.items, !N.value)) return;
        const q = await Promise.all(V.items.map(async (x) => {
          const R = await re($.api, x.group_id);
          return { ...x, cover_asset_id: R, cover_url: R ? $.url(`/api/assets/${R}/file`) : null };
        }));
        v === L && (a.value = q);
      } catch (d) {
        v === L && (b.value = (d == null ? void 0 : d.message) || "Could not load recipes");
      }
    }
    function z(v) {
      var d;
      u("openRecipe", v), (d = $.navigate) == null || d.call($, `/recipes/${v}`);
    }
    const E = $.on("recipe:deleted", () => {
      j(), D();
    });
    ue(() => {
      typeof E == "function" && E();
    }), ve(() => {
      N.value = B(), te.value && (k.value = [...te.value], te.value = null), j(), S(), D();
    }), Z([o, k], j);
    const _ = G(() => {
      const v = [
        { value: "none", label: "No source" }
      ], d = /* @__PURE__ */ new Set(["none"]);
      for (const V of y.value)
        !V.name || d.has(V.name) || (d.add(V.name), v.push({
          value: V.name,
          label: V.author ? `${V.name} (${V.author})` : V.name
        }));
      for (const V of k.value)
        d.has(V) || (d.add(V), v.push({ value: V, label: V }));
      return v;
    }), e = G(() => [...new Set(a.value.flatMap((v) => v.tags || []))]), i = G(() => {
      let v = a.value.map((d) => ({ ...d, is_shortlisted: U.value.has(d.id) }));
      return I.value && (v = v.filter((d) => U.value.has(d.id))), r.value && (v = v.filter((d) => {
        var V;
        return (V = d.tags) == null ? void 0 : V.includes(r.value);
      })), v.sort(h.value === "title" ? (d, V) => d.title.localeCompare(V.title) : (d, V) => (d.prep_time_minutes || 0) - (V.prep_time_minutes || 0));
    });
    return (v, d) => {
      const V = C("InputIcon"), q = C("InputText"), x = C("IconField"), R = C("MultiSelect"), m = C("Button"), l = C("Select"), F = C("Message");
      return c(), g("div", Ne, [
        d[4] || (d[4] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", xe, [
          p(x, { class: "search-box" }, {
            default: ee(() => [
              p(V, { class: "pi pi-search" }),
              p(q, {
                modelValue: o.value,
                "onUpdate:modelValue": d[0] || (d[0] = (T) => o.value = T),
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
          p(M(se), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", Be, [
          p(M(K), {
            name: "recipe.list.filters",
            context: { active: I.value, toggle: w }
          }, null, 8, ["context"]),
          p(R, {
            modelValue: k.value,
            "onUpdate:modelValue": d[1] || (d[1] = (T) => k.value = T),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: _.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (c(!0), g(
            W,
            null,
            Q(e.value, (T) => (c(), J(m, {
              key: T,
              label: T,
              size: "small",
              outlined: r.value !== T,
              "aria-pressed": r.value === T,
              onClick: (oe) => r.value = r.value === T ? null : T
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          p(l, {
            modelValue: h.value,
            "onUpdate:modelValue": d[2] || (d[2] = (T) => h.value = T),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        b.value ? (c(), J(F, {
          key: 0,
          severity: "error"
        }, {
          default: ee(() => [
            Y(
              O(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        i.value.length ? (c(), g("div", De, [
          (c(!0), g(
            W,
            null,
            Q(i.value, (T) => (c(), J(Le, {
              key: T.id,
              recipe: T,
              "show-cover": N.value,
              onSelect: z
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (c(), g("div", Oe, [
          d[3] || (d[3] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          p(M(se), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Pe = /* @__PURE__ */ X(ze, [["__scopeId", "data-v-f0385184"]]);
function Me(n) {
  const s = (n.title || "").trim() || "this recipe", u = Array.isArray(n.languages) ? n.languages.filter(Boolean) : [];
  return `${u.length > 1 ? `Delete '${s}' and all ${u.length} language versions (${u.map((a) => a.toUpperCase()).join(", ")})?` : `Delete '${s}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function fe(n) {
  if (n.group_id) return n.group_id;
  if (n.id) {
    const s = n.id.indexOf("_");
    return s === -1 ? n.id : n.id.slice(0, s);
  }
  return "";
}
function ge(n, s) {
  const u = n == null ? void 0 : n.entity_id;
  return !u || !s ? !1 : s.id && u === s.id ? !0 : s.group_id ? u === s.group_id || u.startsWith(`${s.group_id}_`) : !1;
}
async function _e(n, s) {
  var a;
  const u = fe(s);
  return !u || !await n.confirm({
    header: "Delete recipe",
    message: Me(s),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await n.api.delete(`/api/recipes/${u}`), n.notify({ level: "success", message: "Recipe deleted" }), (a = n.navigate) == null || a.call(n, "/recipes"), !0);
}
const qe = { class: "recipe-detail-page" }, Fe = {
  key: 0,
  class: "lang-bar"
}, Ee = { class: "detail-header" }, Je = {
  key: 0,
  class: "recipe-source-attribution"
}, je = {
  key: 0,
  class: "source-locator"
}, We = {
  key: 1,
  class: "source-author"
}, Ge = ["href"], Ke = {
  key: 3,
  class: "source-notes"
}, Qe = { key: 1 }, Ye = { class: "detail-actions" }, Ze = ["src", "alt"], He = { class: "scaler-card" }, Xe = { class: "servings-value" }, et = {
  key: 2,
  class: "content-grid"
}, tt = { class: "ingredient-checklist" }, lt = ["for"], ot = {
  key: 0,
  class: "notes"
}, it = { class: "steps-list" }, at = /* @__PURE__ */ H({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(n, { emit: s }) {
    const u = n, $ = s, a = le(), o = f(null), r = f(2), h = f({}), b = f(""), k = f(!1), y = f(null), I = f(!1), U = G(() => u.id || u.recipeId || ""), B = f(null), N = f(!1);
    let L = 0;
    const S = a.on("recipe:deleted", (_) => {
      var e;
      N.value || !o.value || ge(_, o.value) && (a.notify({ level: "info", message: "This recipe was deleted" }), (e = a.navigate) == null || e.call(a, "/recipes"));
    });
    ue(() => {
      typeof S == "function" && S();
    }), Z(U, async (_) => {
      if (!_) return;
      const e = ++L;
      b.value = "", B.value = null, y.value = null, I.value = !1;
      try {
        const i = await a.api.get(`/api/recipes/${_}`);
        if (e !== L) return;
        o.value = i, r.value = i.servings || 2, h.value = {}, k.value = !1;
        const v = await re(a.api, i.group_id);
        if (e !== L) return;
        B.value = v;
        try {
          const d = await a.api.get("/api/x/core-shortlist");
          e === L && (k.value = d.some((V) => V.recipe_id === _));
        } catch {
        }
      } catch (i) {
        e === L && (o.value = null, b.value = (i == null ? void 0 : i.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function D(_) {
      var e;
      $("switchLanguage", _), (e = a.navigate) == null || e.call(a, `/recipes/${_}`);
    }
    const w = G(() => {
      var e, i;
      const _ = ((e = y.value) == null ? void 0 : e.source) ?? ((i = o.value) == null ? void 0 : i.source);
      return _ && _.name ? _ : null;
    });
    function j(_) {
      var e;
      te.value = [_], (e = a.navigate) == null || e.call(a, "/recipes");
    }
    function z(_) {
      var i;
      if (_ == null) return "";
      const e = _ * r.value / (((i = o.value) == null ? void 0 : i.servings) || 1);
      return Number.isInteger(e) ? String(e) : e.toFixed(1);
    }
    const E = G(() => ({
      recipe: o.value,
      customizedRecipe: y.value,
      customizeOpen: I.value,
      currentServings: r.value,
      checkedIngredients: h.value,
      setCustomizeOpen: (_) => {
        I.value = _;
      },
      applyCustomization: (_) => {
        y.value = _, h.value = {}, _ != null && _.servings && (r.value = _.servings);
      },
      resetCustomization: () => {
        y.value = null, h.value = {}, o.value && (r.value = o.value.servings || 2);
      },
      onRecipeUpdated: (_) => {
        o.value = _, y.value = null, I.value = !1, h.value = {}, r.value = _.servings || 2;
      },
      setCheckedIngredients: (_) => {
        h.value = _;
      }
    }));
    return (_, e) => {
      var q, x;
      const i = C("Button"), v = C("Message"), d = C("Checkbox"), V = C("Tag");
      return c(), g("div", qe, [
        p(i, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: e[0] || (e[0] = (R) => {
            var m, l;
            return (l = (m = M(a)).navigate) == null ? void 0 : l.call(m, "/recipes");
          })
        }),
        b.value ? (c(), J(v, {
          key: 0,
          severity: "error"
        }, {
          default: ee(() => [
            Y(
              O(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        o.value ? (c(), g(
          W,
          { key: 1 },
          [
            ((q = o.value.languages) == null ? void 0 : q.length) > 1 ? (c(), g("div", Fe, [
              e[4] || (e[4] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (c(!0), g(
                W,
                null,
                Q(o.value.languages, (R) => (c(), J(i, {
                  key: R,
                  label: R.toUpperCase(),
                  size: "small",
                  outlined: R !== o.value.language,
                  onClick: (m) => D(`${o.value.group_id}_${R}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : A("v-if", !0),
            t("div", Ee, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  O(((x = y.value) == null ? void 0 : x.title) || o.value.title),
                  1
                  /* TEXT */
                ),
                w.value ? (c(), g("div", Je, [
                  t(
                    "i",
                    {
                      class: ne(M(me)(w.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  e[6] || (e[6] = t(
                    "span",
                    { class: "source-prefix" },
                    "From: ",
                    -1
                    /* CACHED */
                  )),
                  t(
                    "button",
                    {
                      type: "button",
                      class: "source-filter-link",
                      onClick: e[1] || (e[1] = (R) => j(w.value.name))
                    },
                    O(w.value.name),
                    1
                    /* TEXT */
                  ),
                  w.value.type === "cookbook" && w.value.page ? (c(), g(
                    "span",
                    je,
                    ", p. " + O(w.value.page),
                    1
                    /* TEXT */
                  )) : A("v-if", !0),
                  w.value.author ? (c(), g(
                    "span",
                    We,
                    " by " + O(w.value.author),
                    1
                    /* TEXT */
                  )) : A("v-if", !0),
                  w.value.url ? (c(), g("a", {
                    key: 2,
                    href: w.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...e[5] || (e[5] = [
                    t(
                      "i",
                      {
                        class: "pi pi-external-link",
                        "aria-hidden": "true"
                      },
                      null,
                      -1
                      /* CACHED */
                    )
                  ])], 8, Ge)) : A("v-if", !0),
                  w.value.notes ? (c(), g(
                    "span",
                    Ke,
                    " — " + O(w.value.notes),
                    1
                    /* TEXT */
                  )) : A("v-if", !0)
                ])) : A("v-if", !0),
                !y.value && o.value.description ? (c(), g(
                  "p",
                  Qe,
                  O(o.value.description),
                  1
                  /* TEXT */
                )) : A("v-if", !0)
              ]),
              t("div", Ye, [
                p(M(K), {
                  name: "recipe.detail.actions",
                  context: E.value
                }, null, 8, ["context"]),
                p(M(K), {
                  name: "recipe.card.actions",
                  context: { recipe: o.value, isShortlisted: k.value }
                }, null, 8, ["context"]),
                p(M(se), {
                  hub: "recipe:actions",
                  context: { recipe: o.value, onBeforeDelete: () => {
                    N.value = !0;
                  }, onDeleteAborted: () => {
                    N.value = !1;
                  } },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            B.value ? (c(), g("img", {
              key: 1,
              src: M(a).url(`/api/assets/${B.value}/file`),
              alt: o.value.title,
              class: "recipe-cover"
            }, null, 8, Ze)) : A("v-if", !0),
            t("div", He, [
              e[7] || (e[7] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              p(i, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: r.value <= 1,
                onClick: e[2] || (e[2] = (R) => r.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                Xe,
                O(r.value),
                1
                /* TEXT */
              ),
              p(i, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: e[3] || (e[3] = (R) => r.value++)
              })
            ]),
            p(M(K), {
              name: "recipe.detail.customize",
              context: E.value
            }, null, 8, ["context"]),
            y.value ? A("v-if", !0) : (c(), g("div", et, [
              t("section", null, [
                e[8] || (e[8] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", tt, [
                  (c(!0), g(
                    W,
                    null,
                    Q(o.value.ingredients, (R, m) => (c(), g("li", {
                      key: m,
                      class: "ingredient-item"
                    }, [
                      p(d, {
                        inputId: `ingredient-${m}`,
                        modelValue: h.value[m],
                        "onUpdate:modelValue": (l) => h.value[m] = l,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${m}`,
                        class: ne({ struck: h.value[m] })
                      }, [
                        t(
                          "strong",
                          null,
                          O(z(R.quantity)),
                          1
                          /* TEXT */
                        ),
                        Y(
                          " " + O(R.unit) + " " + O(R.name),
                          1
                          /* TEXT */
                        ),
                        R.notes ? (c(), g(
                          "span",
                          ot,
                          " (" + O(R.notes) + ")",
                          1
                          /* TEXT */
                        )) : A("v-if", !0)
                      ], 10, lt)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                e[9] || (e[9] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", it, [
                  (c(!0), g(
                    W,
                    null,
                    Q(o.value.steps, (R) => (c(), g("li", {
                      key: R.id
                    }, [
                      t(
                        "p",
                        null,
                        O(R.instruction),
                        1
                        /* TEXT */
                      ),
                      R.timer_minutes ? (c(), J(V, {
                        key: 0,
                        value: `${R.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : A("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ])),
            p(M(K), {
              name: "recipe.detail.sidebar",
              context: { recipe: o.value }
            }, null, 8, ["context"]),
            p(M(K), {
              name: "recipe.detail.footer",
              context: { recipe: o.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : A("v-if", !0)
      ]);
    };
  }
}), nt = /* @__PURE__ */ X(at, [["__scopeId", "data-v-678e2974"]]), st = { class: "ingredient-row-list" }, ut = { class: "reorder-btns" }, rt = /* @__PURE__ */ H({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(n, { emit: s }) {
    const u = n, $ = s, a = f(JSON.parse(JSON.stringify(u.modelValue || [])));
    Z(() => u.modelValue, (y) => {
      a.value = JSON.parse(JSON.stringify(y || []));
    }, { deep: !0 });
    const o = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((y) => ({ id: y, label: y || "(none)" }));
    function r() {
      $("update:modelValue", a.value);
    }
    function h() {
      a.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), r();
    }
    function b(y) {
      a.value.splice(y, 1), r();
    }
    function k(y, I) {
      const U = y + I;
      U < 0 || U >= a.value.length || (a.value.splice(U, 0, a.value.splice(y, 1)[0]), r());
    }
    return (y, I) => {
      const U = C("Button"), B = C("InputNumber"), N = C("Select"), L = C("InputText");
      return c(), g("div", st, [
        (c(!0), g(
          W,
          null,
          Q(a.value, (S, D) => (c(), g("div", {
            key: S.id,
            class: "ingredient-row"
          }, [
            t("div", ut, [
              p(U, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: D === 0,
                onClick: (w) => k(D, -1)
              }, null, 8, ["disabled", "onClick"]),
              p(U, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: D === a.value.length - 1,
                onClick: (w) => k(D, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            p(B, {
              modelValue: S.quantity,
              "onUpdate:modelValue": [(w) => S.quantity = w, r],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${D + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            p(N, {
              modelValue: S.unit,
              "onUpdate:modelValue": [(w) => S.unit = w, r],
              options: M(o),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${D + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            p(L, {
              modelValue: S.name,
              "onUpdate:modelValue": (w) => S.name = w,
              class: "input-name",
              "aria-label": `Ingredient ${D + 1} name`,
              placeholder: "Ingredient name",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            p(L, {
              modelValue: S.notes,
              "onUpdate:modelValue": (w) => S.notes = w,
              class: "input-notes",
              "aria-label": `Ingredient ${D + 1} notes`,
              placeholder: "Notes",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            p(U, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (w) => b(D)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        p(U, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: h
        })
      ]);
    };
  }
}), ct = /* @__PURE__ */ X(rt, [["__scopeId", "data-v-6a40d29c"]]), pt = { class: "step-list" }, dt = { class: "step-inputs" }, vt = { class: "timer-row" }, mt = ["for"], ft = /* @__PURE__ */ H({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(n, { emit: s }) {
    const u = n, $ = s, a = f(JSON.parse(JSON.stringify(u.modelValue || [])));
    Z(() => u.modelValue, (b) => {
      a.value = JSON.parse(JSON.stringify(b || []));
    }, { deep: !0 });
    function o() {
      $("update:modelValue", a.value);
    }
    function r() {
      a.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), o();
    }
    function h(b) {
      a.value.splice(b, 1), o();
    }
    return (b, k) => {
      const y = C("Tag"), I = C("Textarea"), U = C("InputNumber"), B = C("Button");
      return c(), g("div", pt, [
        (c(!0), g(
          W,
          null,
          Q(a.value, (N, L) => (c(), g("div", {
            key: N.id,
            class: "step-row"
          }, [
            p(y, {
              value: String(L + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", dt, [
              p(I, {
                modelValue: N.instruction,
                "onUpdate:modelValue": (S) => N.instruction = S,
                class: "textarea-instruction",
                "aria-label": `Step ${L + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: o
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", vt, [
                t("label", {
                  for: `timer-${N.id}`
                }, "Timer (min)", 8, mt),
                p(U, {
                  inputId: `timer-${N.id}`,
                  modelValue: N.timer_minutes,
                  "onUpdate:modelValue": [(S) => N.timer_minutes = S, o],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            p(B, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (S) => h(L)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        p(B, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: r
        })
      ]);
    };
  }
}), gt = /* @__PURE__ */ X(ft, [["__scopeId", "data-v-4c4135f0"]]), _t = { class: "source-editor" }, yt = { class: "source-header" }, bt = { class: "source-grid" }, ht = { class: "form-group" }, kt = { class: "form-group source-name-field" }, Vt = { class: "source-suggestion" }, $t = { class: "suggestion-name" }, It = { class: "suggestion-meta" }, wt = {
  key: 0,
  class: "form-group"
}, Ct = {
  key: 1,
  class: "form-group"
}, St = {
  key: 2,
  class: "form-group source-url-field"
}, Ut = {
  key: 3,
  class: "form-group source-notes-field"
}, Rt = /* @__PURE__ */ H({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(n, { emit: s }) {
    const u = n, $ = s, a = le(), o = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], r = f("cookbook"), h = f(""), b = f(""), k = f(""), y = f(""), I = f(""), U = f([]), B = f([]);
    let N = !1;
    function L(e) {
      N = !0, e && e.name ? (r.value = e.type || "other", h.value = e.name || "", b.value = e.author || "", k.value = e.page || "", y.value = e.url || "", I.value = e.notes || "") : (h.value = "", b.value = "", k.value = "", y.value = "", I.value = ""), N = !1;
    }
    Z(() => u.modelValue, L, { immediate: !0, deep: !0 });
    function S() {
      if (N) return;
      const e = h.value.trim();
      if (!e) {
        $("update:modelValue", null);
        return;
      }
      const i = {
        type: r.value,
        name: e
      }, v = b.value.trim(), d = k.value.trim(), V = y.value.trim(), q = I.value.trim();
      v && (i.author = v), r.value === "cookbook" && d && (i.page = d), (r.value === "website" || r.value === "other") && V && (i.url = V), q && (i.notes = q), $("update:modelValue", i);
    }
    Z([r, h, b, k, y, I], S), ve(async () => {
      var e, i;
      try {
        const v = await ((i = (e = a.api) == null ? void 0 : e.get) == null ? void 0 : i.call(e, "/api/recipes/sources"));
        Array.isArray(v) ? U.value = v : v && Array.isArray(v.items) && (U.value = v.items);
      } catch {
      }
    });
    function D(e) {
      const i = (e.query || "").trim().toLowerCase();
      if (!i) {
        B.value = [...U.value];
        return;
      }
      B.value = U.value.filter(
        (v) => v.name.toLowerCase().includes(i) || v.author && v.author.toLowerCase().includes(i)
      );
    }
    function w(e) {
      e && typeof e == "object" ? (h.value = e.name || "", e.type && (r.value = e.type), (e.author && !b.value.trim() || e.author) && (b.value = e.author)) : h.value = typeof e == "string" ? e : "";
    }
    function j(e) {
      const i = e == null ? void 0 : e.value;
      i && (h.value = i.name, i.type && (r.value = i.type), i.author && (b.value = i.author));
    }
    function z() {
      h.value = "", b.value = "", k.value = "", y.value = "", I.value = "", $("update:modelValue", null);
    }
    const E = G(
      () => !!(h.value.trim() || b.value.trim() || k.value.trim() || y.value.trim() || I.value.trim())
    ), _ = G(() => {
      switch (r.value) {
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
    return (e, i) => {
      const v = C("Button"), d = C("Select"), V = C("AutoComplete"), q = C("InputText");
      return c(), g("fieldset", _t, [
        t("div", yt, [
          i[5] || (i[5] = t(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          E.value ? (c(), J(v, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: z
          })) : A("v-if", !0)
        ]),
        t("div", bt, [
          t("div", ht, [
            i[6] || (i[6] = t(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            p(d, {
              inputId: "recipe-source-type",
              modelValue: r.value,
              "onUpdate:modelValue": i[0] || (i[0] = (x) => r.value = x),
              options: o,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", kt, [
            i[7] || (i[7] = t(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            p(V, {
              inputId: "recipe-source-name",
              modelValue: h.value,
              suggestions: B.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: _.value,
              fluid: "",
              "onUpdate:modelValue": w,
              onComplete: D,
              onItemSelect: j
            }, {
              option: ee(({ option: x }) => [
                t("div", Vt, [
                  t(
                    "span",
                    $t,
                    O(x.name),
                    1
                    /* TEXT */
                  ),
                  t("small", It, [
                    Y(
                      O(M(he)(x.type)),
                      1
                      /* TEXT */
                    ),
                    x.author ? (c(), g(
                      W,
                      { key: 0 },
                      [
                        Y(
                          " · " + O(x.author),
                          1
                          /* TEXT */
                        )
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : A("v-if", !0)
                  ])
                ])
              ]),
              _: 1
              /* STABLE */
            }, 8, ["modelValue", "suggestions", "placeholder"])
          ]),
          r.value !== "person" ? (c(), g("div", wt, [
            i[8] || (i[8] = t(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            p(q, {
              id: "recipe-source-author",
              modelValue: b.value,
              "onUpdate:modelValue": i[1] || (i[1] = (x) => b.value = x),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          r.value === "cookbook" ? (c(), g("div", Ct, [
            i[9] || (i[9] = t(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            p(q, {
              id: "recipe-source-page",
              modelValue: k.value,
              "onUpdate:modelValue": i[2] || (i[2] = (x) => k.value = x),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          r.value === "website" || r.value === "other" ? (c(), g("div", St, [
            i[10] || (i[10] = t(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            p(q, {
              id: "recipe-source-url",
              modelValue: y.value,
              "onUpdate:modelValue": i[3] || (i[3] = (x) => y.value = x),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          r.value === "person" || r.value === "other" ? (c(), g("div", Ut, [
            i[11] || (i[11] = t(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            p(q, {
              id: "recipe-source-notes",
              modelValue: I.value,
              "onUpdate:modelValue": i[4] || (i[4] = (x) => I.value = x),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0)
        ])
      ]);
    };
  }
}), Tt = /* @__PURE__ */ X(Rt, [["__scopeId", "data-v-267c9e36"]]), At = { class: "edit-top-bar" }, Lt = { class: "edit-top-actions" }, Nt = { class: "form-group" }, xt = { class: "form-group" }, Bt = { class: "form-row" }, Dt = { class: "form-group" }, Ot = { class: "form-group" }, zt = { class: "form-group" }, Pt = { class: "form-group" }, Mt = { class: "form-group" }, qt = { class: "form-group" }, Ft = ["disabled"], Et = { key: 0 }, Jt = { key: 1 }, jt = ["src"], Wt = { class: "actions-row" }, Gt = /* @__PURE__ */ H({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(n, { emit: s }) {
    var R;
    const u = n, $ = s, a = le(), o = G(() => u.id || u.recipeId || ""), r = f(""), h = f(""), b = f(((R = a.store.household.value) == null ? void 0 : R.languages.primary) || "en"), k = f(2), y = f(""), I = f(null), U = f(null), B = f([]), N = f(null), L = f(null), S = f([]), D = f([]), w = f(1), j = f([]), z = f(!1), E = f(!1), _ = f(!1), e = f(""), i = a.on("recipe:deleted", (m) => {
      E.value || !o.value || ge(m, { id: o.value, group_id: y.value }) && (_.value = !0);
    });
    ue(() => {
      typeof i == "function" && i();
    }), Z(o, async (m) => {
      if (_.value = !1, !!m)
        try {
          const l = await a.api.get(`/api/recipes/${m}`);
          r.value = l.title, h.value = l.description || "", b.value = l.language, k.value = l.servings, I.value = l.prep_time_minutes, U.value = l.cook_time_minutes, B.value = [...l.tags], L.value = l.source || null, S.value = l.ingredients, D.value = l.steps, w.value = l.revision, j.value = l.languages || [], N.value = await re(a.api, l.group_id), y.value = l.group_id;
        } catch (l) {
          e.value = (l == null ? void 0 : l.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function v(m) {
      var F;
      const l = (F = m.target.files) == null ? void 0 : F[0];
      if (!(!l || z.value || !y.value)) {
        z.value = !0, e.value = "";
        try {
          const T = new FormData();
          T.append("file", l), T.append("entity_type", "recipe"), T.append("entity_id", y.value), T.append("slot", "cover"), N.value = (await a.api.upload("/api/assets", T)).id, a.notify({ level: "success", message: "Cover image saved" });
        } catch (T) {
          e.value = (T == null ? void 0 : T.message) || "Could not upload image";
        } finally {
          z.value = !1;
        }
      }
    }
    async function d() {
      var l;
      if (!r.value.trim() || z.value || _.value) return;
      z.value = !0, e.value = "";
      const m = {
        title: r.value.trim(),
        description: h.value.trim(),
        language: b.value,
        servings: k.value,
        prep_time_minutes: I.value,
        cook_time_minutes: U.value,
        tags: B.value,
        ingredients: S.value,
        steps: D.value
      };
      (L.value !== null || o.value) && (m.source = L.value);
      try {
        const F = o.value ? await a.api.patch(`/api/recipes/${o.value}`, { ...m, revision: w.value }) : await a.api.post("/api/recipes", m);
        $("saved", F), a.notify({ level: "success", message: "Recipe saved" }), (l = a.navigate) == null || l.call(a, `/recipes/${F.id}`);
      } catch (F) {
        e.value = (F == null ? void 0 : F.message) || "Could not save recipe";
      } finally {
        z.value = !1;
      }
    }
    async function V() {
      if (!(!o.value || z.value || _.value)) {
        z.value = !0, E.value = !0, e.value = "";
        try {
          await _e(a, {
            id: o.value,
            group_id: y.value || void 0,
            title: r.value.trim() || "this recipe",
            languages: j.value
          }) || (E.value = !1);
        } catch (m) {
          E.value = !1, e.value = (m == null ? void 0 : m.message) || "Could not delete recipe";
        } finally {
          z.value = !1;
        }
      }
    }
    function q(m) {
      m.title && (r.value = m.title), m.description !== void 0 && (h.value = m.description || ""), m.servings && (k.value = m.servings), m.prep_time_minutes !== void 0 && (I.value = m.prep_time_minutes), m.cook_time_minutes !== void 0 && (U.value = m.cook_time_minutes), m.tags && (B.value = [...m.tags]), m.source !== void 0 && (L.value = m.source || null), m.ingredients && (S.value = [...m.ingredients]), m.steps && (D.value = [...m.steps]);
    }
    const x = G(() => ({
      targetId: o.value,
      recipe: {
        id: o.value,
        title: r.value,
        description: h.value,
        language: b.value,
        servings: k.value,
        prep_time_minutes: I.value,
        cook_time_minutes: U.value,
        tags: B.value,
        source: L.value,
        ingredients: S.value,
        steps: D.value
      },
      applyAdaptation: q
    }));
    return (m, l) => {
      const F = C("Button"), T = C("Message"), oe = C("InputText"), ye = C("Textarea"), ie = C("InputNumber"), be = C("AutoComplete");
      return c(), g(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: ae(d, ["prevent"])
        },
        [
          t("div", At, [
            t(
              "h2",
              null,
              O(o.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            t("div", Lt, [
              p(M(K), {
                name: "recipe.edit.actions",
                context: x.value
              }, null, 8, ["context"]),
              p(F, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: z.value,
                onClick: l[0] || (l[0] = (P) => {
                  var ce, pe;
                  return (pe = (ce = M(a)).navigate) == null ? void 0 : pe.call(ce, o.value ? `/recipes/${o.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          _.value ? (c(), J(T, {
            key: 0,
            severity: "warn"
          }, {
            default: ee(() => [...l[11] || (l[11] = [
              Y(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          e.value ? (c(), J(T, {
            key: 1,
            severity: "error"
          }, {
            default: ee(() => [
              Y(
                O(e.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          t("div", Nt, [
            l[12] || (l[12] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            p(oe, {
              id: "recipe-title",
              modelValue: r.value,
              "onUpdate:modelValue": l[1] || (l[1] = (P) => r.value = P),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", xt, [
            l[13] || (l[13] = t(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            p(ye, {
              id: "recipe-description",
              modelValue: h.value,
              "onUpdate:modelValue": l[2] || (l[2] = (P) => h.value = P),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Bt, [
            t("div", Dt, [
              l[14] || (l[14] = t(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              p(oe, {
                id: "recipe-language",
                modelValue: b.value,
                "onUpdate:modelValue": l[3] || (l[3] = (P) => b.value = P),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", Ot, [
              l[15] || (l[15] = t(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              p(ie, {
                inputId: "recipe-servings",
                modelValue: k.value,
                "onUpdate:modelValue": l[4] || (l[4] = (P) => k.value = P),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", zt, [
              l[16] || (l[16] = t(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              p(ie, {
                inputId: "recipe-prep",
                modelValue: I.value,
                "onUpdate:modelValue": l[5] || (l[5] = (P) => I.value = P),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", Pt, [
              l[17] || (l[17] = t(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              p(ie, {
                inputId: "recipe-cook",
                modelValue: U.value,
                "onUpdate:modelValue": l[6] || (l[6] = (P) => U.value = P),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          t("div", Mt, [
            l[18] || (l[18] = t(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            p(be, {
              inputId: "recipe-tags",
              modelValue: B.value,
              "onUpdate:modelValue": l[7] || (l[7] = (P) => B.value = P),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          p(Tt, {
            modelValue: L.value,
            "onUpdate:modelValue": l[8] || (l[8] = (P) => L.value = P)
          }, null, 8, ["modelValue"]),
          t("div", qt, [
            l[19] || (l[19] = t(
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
              disabled: z.value || !y.value,
              onChange: v
            }, null, 40, Ft),
            o.value ? (c(), g("small", Jt, "Cover uploads are saved immediately, separately from recipe edits.")) : (c(), g("small", Et, "Save your recipe first to add a cover image.")),
            N.value ? (c(), g("img", {
              key: 2,
              src: M(a).url(`/api/assets/${N.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, jt)) : A("v-if", !0)
          ]),
          t("section", null, [
            l[20] || (l[20] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            p(ct, {
              modelValue: S.value,
              "onUpdate:modelValue": l[9] || (l[9] = (P) => S.value = P)
            }, null, 8, ["modelValue"])
          ]),
          t("section", null, [
            l[21] || (l[21] = t(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            p(gt, {
              modelValue: D.value,
              "onUpdate:modelValue": l[10] || (l[10] = (P) => D.value = P)
            }, null, 8, ["modelValue"])
          ]),
          t("div", Wt, [
            o.value ? (c(), J(F, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: E.value && z.value,
              disabled: z.value || _.value,
              onClick: V
            }, null, 8, ["loading", "disabled"])) : A("v-if", !0),
            p(F, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: z.value && !E.value,
              disabled: !r.value.trim() || z.value || _.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), de = /* @__PURE__ */ X(Gt, [["__scopeId", "data-v-cfa964a9"]]);
function Yt(n) {
  n.route({ path: "/recipes", component: Pe, nav: { label: "Recipes", icon: "book", order: 10 } }), n.route({ path: "/recipes/new", component: de }), n.route({ path: "/recipes/:id", component: nt }), n.route({ path: "/recipes/:id/edit", component: de }), n.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), n.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      n.navigate ? n.navigate("/recipes/new") : window.location.href = n.url ? n.url("/recipes/new") : "/recipes/new";
    }
  }), n.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), n.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (s) => {
      var u;
      (u = s == null ? void 0 : s.recipe) != null && u.id && (n.navigate ? n.navigate(`/recipes/${s.recipe.id}/edit`) : window.location.href = n.url ? n.url(`/recipes/${s.recipe.id}/edit`) : `/recipes/${s.recipe.id}/edit`);
    }
  }), n.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (s) => !!fe((s == null ? void 0 : s.recipe) || {}),
    execute: async (s) => {
      var u, $, a;
      if (!(s != null && s.recipe)) return !1;
      (u = s.onBeforeDelete) == null || u.call(s);
      try {
        const o = await _e(n, s.recipe);
        return o || ($ = s.onDeleteAborted) == null || $.call(s), o;
      } catch (o) {
        throw (a = s.onDeleteAborted) == null || a.call(s), o;
      }
    }
  });
}
export {
  Yt as default
};
