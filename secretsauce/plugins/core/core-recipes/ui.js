import { ref as f, defineComponent as X, resolveComponent as w, openBlock as d, createElementBlock as g, createCommentVNode as U, createElementVNode as l, createVNode as v, withModifiers as se, unref as O, createTextVNode as Z, toDisplayString as x, normalizeClass as ue, Fragment as W, renderList as Y, createBlock as j, onBeforeUnmount as ce, onMounted as fe, watch as H, computed as K, withCtx as te } from "vue";
import { Slot as Q, useSecretSauce as ae, IntentTrigger as re } from "@secretsauce/ui";
const ie = f(null);
function ge(u) {
  switch (u) {
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
function he(u) {
  switch (u) {
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
}, Ae = { class: "tags" }, Te = /* @__PURE__ */ X({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(u, { emit: c }) {
    const p = u, V = c;
    return (n, i) => {
      var b;
      const r = w("Button"), h = w("Tag");
      return d(), g("article", {
        class: "recipe-card",
        onClick: i[2] || (i[2] = (k) => V("select", p.recipe.id))
      }, [
        p.showCover ? (d(), g("div", ke, [
          p.recipe.cover_asset_id ? (d(), g("img", {
            key: 0,
            src: p.recipe.cover_url || `/api/assets/${p.recipe.cover_asset_id}/file`,
            alt: p.recipe.title
          }, null, 8, Ve)) : (d(), g("i", $e))
        ])) : U("v-if", !0),
        l("div", Ie, [
          l("div", we, [
            l("h3", null, [
              v(r, {
                label: p.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: i[0] || (i[0] = se((k) => V("select", p.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            l("div", {
              class: "actions",
              onClick: i[1] || (i[1] = se(() => {
              }, ["stop"]))
            }, [
              v(O(Q), {
                name: "recipe.card.actions",
                context: { recipe: p.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          l("div", Ce, [
            p.recipe.prep_time_minutes ? (d(), g("span", Se, [
              i[3] || (i[3] = l(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Z(
                " " + x(p.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : U("v-if", !0),
            p.recipe.cook_time_minutes ? (d(), g(
              "span",
              Ue,
              x(p.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : U("v-if", !0)
          ]),
          (b = p.recipe.source) != null && b.name ? (d(), g("div", Re, [
            l(
              "i",
              {
                class: ue(O(ge)(p.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            l(
              "span",
              null,
              x(p.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : U("v-if", !0),
          l("div", Ae, [
            (d(!0), g(
              W,
              null,
              Y(p.recipe.tags, (k) => (d(), j(h, {
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
}), ee = (u, c) => {
  const p = u.__vccOpts || u;
  for (const [V, n] of c)
    p[V] = n;
  return p;
}, Le = /* @__PURE__ */ ee(Te, [["__scopeId", "data-v-3caa626b"]]);
async function pe(u, c) {
  var p;
  if (!c) return null;
  try {
    return ((p = (await u.get("/api/assets", { entity_type: "recipe", entity_id: c })).filter((n) => n.slot === "cover").at(-1)) == null ? void 0 : p.id) || null;
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
}, ze = /* @__PURE__ */ X({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(u, { emit: c }) {
    const p = c, V = ae(), n = f([]), i = f(""), r = f(null), h = f("title"), b = f(""), k = f([]), y = f([]), S = f([]), C = f(!1), T = f(/* @__PURE__ */ new Set());
    function A() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const R = f(A());
    let I = 0;
    async function L() {
      try {
        const m = await V.api.get("/api/x/core-shortlist");
        T.value = new Set(m.map((s) => s.recipe_id));
      } catch {
      }
    }
    async function $() {
      try {
        const m = await V.api.get("/api/recipes/sources");
        Array.isArray(m) ? y.value = m : m && Array.isArray(m.items) && (y.value = m.items);
      } catch {
      }
    }
    async function G() {
      try {
        const m = await V.api.get("/api/recipes/tags"), s = Array.isArray(m) ? m : m && Array.isArray(m.items) ? m.items : [];
        S.value = s, r.value && !s.some((o) => o.name === r.value) && (r.value = null);
      } catch {
      }
    }
    async function B() {
      C.value = !C.value, C.value && await L();
    }
    async function M() {
      const m = ++I;
      b.value = "";
      try {
        const s = { q: i.value.trim() };
        k.value.length > 0 && (s.source = k.value), r.value && (s.tag = r.value);
        const o = await V.api.get("/api/recipes", s);
        if (m !== I || (n.value = o.items, !R.value)) return;
        const t = await Promise.all(o.items.map(async (z) => {
          const P = await pe(V.api, z.group_id);
          return { ...z, cover_asset_id: P, cover_url: P ? V.url(`/api/assets/${P}/file`) : null };
        }));
        m === I && (n.value = t);
      } catch (s) {
        m === I && (b.value = (s == null ? void 0 : s.message) || "Could not load recipes");
      }
    }
    function _(m) {
      var s;
      p("openRecipe", m), (s = V.navigate) == null || s.call(V, `/recipes/${m}`);
    }
    function e() {
      M(), $(), G();
    }
    const a = V.on("recipe:created", e), N = V.on("recipe:updated", e), E = V.on("recipe:deleted", e);
    ce(() => {
      typeof a == "function" && a(), typeof N == "function" && N(), typeof E == "function" && E();
    }), fe(() => {
      R.value = A(), ie.value && (k.value = [...ie.value], ie.value = null), M(), L(), $(), G();
    }), H([i, k, r], M);
    const J = K(() => {
      const m = [
        { value: "none", label: "No source" }
      ], s = /* @__PURE__ */ new Set(["none"]);
      for (const o of y.value)
        !o.name || s.has(o.name) || (s.add(o.name), m.push({
          value: o.name,
          label: o.author ? `${o.name} (${o.author})` : o.name
        }));
      for (const o of k.value)
        s.has(o) || (s.add(o), m.push({ value: o, label: o }));
      return m;
    }), F = K(() => {
      let m = n.value.map((s) => ({ ...s, is_shortlisted: T.value.has(s.id) }));
      return C.value && (m = m.filter((s) => T.value.has(s.id))), m.sort(h.value === "title" ? (s, o) => s.title.localeCompare(o.title) : (s, o) => (s.prep_time_minutes || 0) - (o.prep_time_minutes || 0));
    });
    return (m, s) => {
      const o = w("InputIcon"), t = w("InputText"), z = w("IconField"), P = w("MultiSelect"), oe = w("Button"), ne = w("Select"), le = w("Message");
      return d(), g("div", Ne, [
        s[4] || (s[4] = l(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        l("div", xe, [
          v(z, { class: "search-box" }, {
            default: te(() => [
              v(o, { class: "pi pi-search" }),
              v(t, {
                modelValue: i.value,
                "onUpdate:modelValue": s[0] || (s[0] = (q) => i.value = q),
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
          v(O(re), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        l("div", Be, [
          v(O(Q), {
            name: "recipe.list.filters",
            context: { active: C.value, toggle: B }
          }, null, 8, ["context"]),
          v(P, {
            modelValue: k.value,
            "onUpdate:modelValue": s[1] || (s[1] = (q) => k.value = q),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: J.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (d(!0), g(
            W,
            null,
            Y(S.value, (q) => (d(), j(oe, {
              key: q.name,
              class: "tag-filter-btn",
              label: `${q.name} (${q.count})`,
              size: "small",
              outlined: r.value !== q.name,
              "aria-pressed": r.value === q.name,
              onClick: (D) => r.value = r.value === q.name ? null : q.name
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          v(ne, {
            modelValue: h.value,
            "onUpdate:modelValue": s[2] || (s[2] = (q) => h.value = q),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        b.value ? (d(), j(le, {
          key: 0,
          severity: "error"
        }, {
          default: te(() => [
            Z(
              x(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        F.value.length ? (d(), g("div", De, [
          (d(!0), g(
            W,
            null,
            Y(F.value, (q) => (d(), j(Le, {
              key: q.id,
              recipe: q,
              "show-cover": R.value,
              onSelect: _
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (d(), g("div", Oe, [
          s[3] || (s[3] = l(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          v(O(re), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Pe = /* @__PURE__ */ ee(ze, [["__scopeId", "data-v-80c7d74c"]]);
function qe(u) {
  const c = (u.title || "").trim() || "this recipe", p = Array.isArray(u.languages) ? u.languages.filter(Boolean) : [];
  return `${p.length > 1 ? `Delete '${c}' and all ${p.length} language versions (${p.map((n) => n.toUpperCase()).join(", ")})?` : `Delete '${c}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function _e(u) {
  if (u.group_id) return u.group_id;
  if (u.id) {
    const c = u.id.indexOf("_");
    return c === -1 ? u.id : u.id.slice(0, c);
  }
  return "";
}
function ye(u, c) {
  const p = u == null ? void 0 : u.entity_id;
  return !p || !c ? !1 : c.id && p === c.id ? !0 : c.group_id ? p === c.group_id || p.startsWith(`${c.group_id}_`) : !1;
}
async function be(u, c) {
  var n;
  const p = _e(c);
  return !p || !await u.confirm({
    header: "Delete recipe",
    message: qe(c),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await u.api.delete(`/api/recipes/${p}`), u.notify({ level: "success", message: "Recipe deleted" }), (n = u.navigate) == null || n.call(u, "/recipes"), !0);
}
const Me = { class: "recipe-detail-page" }, Fe = {
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
}, it = { class: "steps-list" }, at = /* @__PURE__ */ X({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(u, { emit: c }) {
    const p = u, V = c, n = ae(), i = f(null), r = f(2), h = f({}), b = f(""), k = f(!1), y = f(null), S = f(!1), C = K(() => p.id || p.recipeId || ""), T = f(null), A = f(!1);
    let R = 0;
    const I = n.on("recipe:deleted", (_) => {
      var e;
      A.value || !i.value || ye(_, i.value) && (n.notify({ level: "info", message: "This recipe was deleted" }), (e = n.navigate) == null || e.call(n, "/recipes"));
    });
    ce(() => {
      typeof I == "function" && I();
    }), H(C, async (_) => {
      if (!_) return;
      const e = ++R;
      b.value = "", T.value = null, y.value = null, S.value = !1;
      try {
        const a = await n.api.get(`/api/recipes/${_}`);
        if (e !== R) return;
        i.value = a, r.value = a.servings || 2, h.value = {}, k.value = !1;
        const N = await pe(n.api, a.group_id);
        if (e !== R) return;
        T.value = N;
        try {
          const E = await n.api.get("/api/x/core-shortlist");
          e === R && (k.value = E.some((J) => J.recipe_id === _));
        } catch {
        }
      } catch (a) {
        e === R && (i.value = null, b.value = (a == null ? void 0 : a.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function L(_) {
      var e;
      V("switchLanguage", _), (e = n.navigate) == null || e.call(n, `/recipes/${_}`);
    }
    const $ = K(() => {
      var e, a;
      const _ = ((e = y.value) == null ? void 0 : e.source) ?? ((a = i.value) == null ? void 0 : a.source);
      return _ && _.name ? _ : null;
    });
    function G(_) {
      var e;
      ie.value = [_], (e = n.navigate) == null || e.call(n, "/recipes");
    }
    function B(_) {
      var a;
      if (_ == null) return "";
      const e = _ * r.value / (((a = i.value) == null ? void 0 : a.servings) || 1);
      return Number.isInteger(e) ? String(e) : e.toFixed(1);
    }
    const M = K(() => ({
      recipe: i.value,
      customizedRecipe: y.value,
      customizeOpen: S.value,
      currentServings: r.value,
      checkedIngredients: h.value,
      setCustomizeOpen: (_) => {
        S.value = _;
      },
      applyCustomization: (_) => {
        y.value = _, h.value = {}, _ != null && _.servings && (r.value = _.servings);
      },
      resetCustomization: () => {
        y.value = null, h.value = {}, i.value && (r.value = i.value.servings || 2);
      },
      onRecipeUpdated: (_) => {
        i.value = _, y.value = null, S.value = !1, h.value = {}, r.value = _.servings || 2;
      },
      setCheckedIngredients: (_) => {
        h.value = _;
      }
    }));
    return (_, e) => {
      var F, m;
      const a = w("Button"), N = w("Message"), E = w("Checkbox"), J = w("Tag");
      return d(), g("div", Me, [
        v(a, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: e[0] || (e[0] = (s) => {
            var o, t;
            return (t = (o = O(n)).navigate) == null ? void 0 : t.call(o, "/recipes");
          })
        }),
        b.value ? (d(), j(N, {
          key: 0,
          severity: "error"
        }, {
          default: te(() => [
            Z(
              x(b.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        i.value ? (d(), g(
          W,
          { key: 1 },
          [
            ((F = i.value.languages) == null ? void 0 : F.length) > 1 ? (d(), g("div", Fe, [
              e[4] || (e[4] = l(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (d(!0), g(
                W,
                null,
                Y(i.value.languages, (s) => (d(), j(a, {
                  key: s,
                  label: s.toUpperCase(),
                  size: "small",
                  outlined: s !== i.value.language,
                  onClick: (o) => L(`${i.value.group_id}_${s}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : U("v-if", !0),
            l("div", Ee, [
              l("div", null, [
                l(
                  "h1",
                  null,
                  x(((m = y.value) == null ? void 0 : m.title) || i.value.title),
                  1
                  /* TEXT */
                ),
                $.value ? (d(), g("div", Je, [
                  l(
                    "i",
                    {
                      class: ue(O(ge)($.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  e[6] || (e[6] = l(
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
                      onClick: e[1] || (e[1] = (s) => G($.value.name))
                    },
                    x($.value.name),
                    1
                    /* TEXT */
                  ),
                  $.value.type === "cookbook" && $.value.page ? (d(), g(
                    "span",
                    je,
                    ", p. " + x($.value.page),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  $.value.author ? (d(), g(
                    "span",
                    We,
                    " by " + x($.value.author),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  $.value.url ? (d(), g("a", {
                    key: 2,
                    href: $.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...e[5] || (e[5] = [
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
                  ])], 8, Ge)) : U("v-if", !0),
                  $.value.notes ? (d(), g(
                    "span",
                    Ke,
                    " — " + x($.value.notes),
                    1
                    /* TEXT */
                  )) : U("v-if", !0)
                ])) : U("v-if", !0),
                !y.value && i.value.description ? (d(), g(
                  "p",
                  Qe,
                  x(i.value.description),
                  1
                  /* TEXT */
                )) : U("v-if", !0)
              ]),
              l("div", Ye, [
                v(O(Q), {
                  name: "recipe.detail.actions",
                  context: M.value
                }, null, 8, ["context"]),
                v(O(Q), {
                  name: "recipe.card.actions",
                  context: { recipe: i.value, isShortlisted: k.value }
                }, null, 8, ["context"]),
                v(O(re), {
                  hub: "recipe:actions",
                  context: { recipe: i.value, onBeforeDelete: () => {
                    A.value = !0;
                  }, onDeleteAborted: () => {
                    A.value = !1;
                  } },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            T.value ? (d(), g("img", {
              key: 1,
              src: O(n).url(`/api/assets/${T.value}/file`),
              alt: i.value.title,
              class: "recipe-cover"
            }, null, 8, Ze)) : U("v-if", !0),
            l("div", He, [
              e[7] || (e[7] = l(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              v(a, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: r.value <= 1,
                onClick: e[2] || (e[2] = (s) => r.value--)
              }, null, 8, ["disabled"]),
              l(
                "span",
                Xe,
                x(r.value),
                1
                /* TEXT */
              ),
              v(a, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: e[3] || (e[3] = (s) => r.value++)
              })
            ]),
            v(O(Q), {
              name: "recipe.detail.customize",
              context: M.value
            }, null, 8, ["context"]),
            y.value ? U("v-if", !0) : (d(), g("div", et, [
              l("section", null, [
                e[8] || (e[8] = l(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                l("ul", tt, [
                  (d(!0), g(
                    W,
                    null,
                    Y(i.value.ingredients, (s, o) => (d(), g("li", {
                      key: o,
                      class: "ingredient-item"
                    }, [
                      v(E, {
                        inputId: `ingredient-${o}`,
                        modelValue: h.value[o],
                        "onUpdate:modelValue": (t) => h.value[o] = t,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      l("label", {
                        for: `ingredient-${o}`,
                        class: ue({ struck: h.value[o] })
                      }, [
                        l(
                          "strong",
                          null,
                          x(B(s.quantity)),
                          1
                          /* TEXT */
                        ),
                        Z(
                          " " + x(s.unit) + " " + x(s.name),
                          1
                          /* TEXT */
                        ),
                        s.notes ? (d(), g(
                          "span",
                          ot,
                          " (" + x(s.notes) + ")",
                          1
                          /* TEXT */
                        )) : U("v-if", !0)
                      ], 10, lt)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              l("section", null, [
                e[9] || (e[9] = l(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                l("ol", it, [
                  (d(!0), g(
                    W,
                    null,
                    Y(i.value.steps, (s) => (d(), g("li", {
                      key: s.id
                    }, [
                      l(
                        "p",
                        null,
                        x(s.instruction),
                        1
                        /* TEXT */
                      ),
                      s.timer_minutes ? (d(), j(J, {
                        key: 0,
                        value: `${s.timer_minutes} min`,
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
            v(O(Q), {
              name: "recipe.detail.sidebar",
              context: { recipe: i.value }
            }, null, 8, ["context"]),
            v(O(Q), {
              name: "recipe.detail.footer",
              context: { recipe: i.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : U("v-if", !0)
      ]);
    };
  }
}), nt = /* @__PURE__ */ ee(at, [["__scopeId", "data-v-678e2974"]]), st = { class: "ingredient-row-list" }, ut = { class: "reorder-btns" }, rt = /* @__PURE__ */ X({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: c }) {
    const p = u, V = c, n = f(JSON.parse(JSON.stringify(p.modelValue || [])));
    H(() => p.modelValue, (y) => {
      n.value = JSON.parse(JSON.stringify(y || []));
    }, { deep: !0 });
    const i = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((y) => ({ id: y, label: y || "(none)" }));
    function r() {
      V("update:modelValue", n.value);
    }
    function h() {
      n.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), r();
    }
    function b(y) {
      n.value.splice(y, 1), r();
    }
    function k(y, S) {
      const C = y + S;
      C < 0 || C >= n.value.length || (n.value.splice(C, 0, n.value.splice(y, 1)[0]), r());
    }
    return (y, S) => {
      const C = w("Button"), T = w("InputNumber"), A = w("Select"), R = w("InputText");
      return d(), g("div", st, [
        (d(!0), g(
          W,
          null,
          Y(n.value, (I, L) => (d(), g("div", {
            key: I.id,
            class: "ingredient-row"
          }, [
            l("div", ut, [
              v(C, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: L === 0,
                onClick: ($) => k(L, -1)
              }, null, 8, ["disabled", "onClick"]),
              v(C, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: L === n.value.length - 1,
                onClick: ($) => k(L, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            v(T, {
              modelValue: I.quantity,
              "onUpdate:modelValue": [($) => I.quantity = $, r],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${L + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(A, {
              modelValue: I.unit,
              "onUpdate:modelValue": [($) => I.unit = $, r],
              options: O(i),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${L + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            v(R, {
              modelValue: I.name,
              "onUpdate:modelValue": ($) => I.name = $,
              class: "input-name",
              "aria-label": `Ingredient ${L + 1} name`,
              placeholder: "Ingredient name",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(R, {
              modelValue: I.notes,
              "onUpdate:modelValue": ($) => I.notes = $,
              class: "input-notes",
              "aria-label": `Ingredient ${L + 1} notes`,
              placeholder: "Notes",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(C, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: ($) => b(L)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        v(C, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: h
        })
      ]);
    };
  }
}), ct = /* @__PURE__ */ ee(rt, [["__scopeId", "data-v-6a40d29c"]]), pt = { class: "step-list" }, dt = { class: "step-inputs" }, vt = { class: "timer-row" }, mt = ["for"], ft = /* @__PURE__ */ X({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: c }) {
    const p = u, V = c, n = f(JSON.parse(JSON.stringify(p.modelValue || [])));
    H(() => p.modelValue, (b) => {
      n.value = JSON.parse(JSON.stringify(b || []));
    }, { deep: !0 });
    function i() {
      V("update:modelValue", n.value);
    }
    function r() {
      n.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), i();
    }
    function h(b) {
      n.value.splice(b, 1), i();
    }
    return (b, k) => {
      const y = w("Tag"), S = w("Textarea"), C = w("InputNumber"), T = w("Button");
      return d(), g("div", pt, [
        (d(!0), g(
          W,
          null,
          Y(n.value, (A, R) => (d(), g("div", {
            key: A.id,
            class: "step-row"
          }, [
            v(y, {
              value: String(R + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            l("div", dt, [
              v(S, {
                modelValue: A.instruction,
                "onUpdate:modelValue": (I) => A.instruction = I,
                class: "textarea-instruction",
                "aria-label": `Step ${R + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: i
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              l("div", vt, [
                l("label", {
                  for: `timer-${A.id}`
                }, "Timer (min)", 8, mt),
                v(C, {
                  inputId: `timer-${A.id}`,
                  modelValue: A.timer_minutes,
                  "onUpdate:modelValue": [(I) => A.timer_minutes = I, i],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            v(T, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (I) => h(R)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        v(T, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: r
        })
      ]);
    };
  }
}), gt = /* @__PURE__ */ ee(ft, [["__scopeId", "data-v-4c4135f0"]]), _t = { class: "source-editor" }, yt = { class: "source-header" }, bt = { class: "source-grid" }, ht = { class: "form-group" }, kt = { class: "form-group source-name-field" }, Vt = { class: "source-suggestion" }, $t = { class: "suggestion-name" }, It = { class: "suggestion-meta" }, wt = {
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
}, Rt = /* @__PURE__ */ X({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: c }) {
    const p = u, V = c, n = ae(), i = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], r = f("cookbook"), h = f(""), b = f(""), k = f(""), y = f(""), S = f(""), C = f([]), T = f([]);
    let A = !1;
    function R(e) {
      A = !0, e && e.name ? (r.value = e.type || "other", h.value = e.name || "", b.value = e.author || "", k.value = e.page || "", y.value = e.url || "", S.value = e.notes || "") : (h.value = "", b.value = "", k.value = "", y.value = "", S.value = ""), A = !1;
    }
    H(() => p.modelValue, R, { immediate: !0, deep: !0 });
    function I() {
      if (A) return;
      const e = h.value.trim();
      if (!e) {
        V("update:modelValue", null);
        return;
      }
      const a = {
        type: r.value,
        name: e
      }, N = b.value.trim(), E = k.value.trim(), J = y.value.trim(), F = S.value.trim();
      N && (a.author = N), r.value === "cookbook" && E && (a.page = E), (r.value === "website" || r.value === "other") && J && (a.url = J), F && (a.notes = F), V("update:modelValue", a);
    }
    H([r, h, b, k, y, S], I), fe(async () => {
      var e, a;
      try {
        const N = await ((a = (e = n.api) == null ? void 0 : e.get) == null ? void 0 : a.call(e, "/api/recipes/sources"));
        Array.isArray(N) ? C.value = N : N && Array.isArray(N.items) && (C.value = N.items);
      } catch {
      }
    });
    function L(e) {
      const a = (e.query || "").trim().toLowerCase();
      if (!a) {
        T.value = [...C.value];
        return;
      }
      T.value = C.value.filter(
        (N) => N.name.toLowerCase().includes(a) || N.author && N.author.toLowerCase().includes(a)
      );
    }
    function $(e) {
      e && typeof e == "object" ? (h.value = e.name || "", e.type && (r.value = e.type), (e.author && !b.value.trim() || e.author) && (b.value = e.author)) : h.value = typeof e == "string" ? e : "";
    }
    function G(e) {
      const a = e == null ? void 0 : e.value;
      a && (h.value = a.name, a.type && (r.value = a.type), a.author && (b.value = a.author));
    }
    function B() {
      h.value = "", b.value = "", k.value = "", y.value = "", S.value = "", V("update:modelValue", null);
    }
    const M = K(
      () => !!(h.value.trim() || b.value.trim() || k.value.trim() || y.value.trim() || S.value.trim())
    ), _ = K(() => {
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
    return (e, a) => {
      const N = w("Button"), E = w("Select"), J = w("AutoComplete"), F = w("InputText");
      return d(), g("fieldset", _t, [
        l("div", yt, [
          a[5] || (a[5] = l(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          M.value ? (d(), j(N, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: B
          })) : U("v-if", !0)
        ]),
        l("div", bt, [
          l("div", ht, [
            a[6] || (a[6] = l(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            v(E, {
              inputId: "recipe-source-type",
              modelValue: r.value,
              "onUpdate:modelValue": a[0] || (a[0] = (m) => r.value = m),
              options: i,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", kt, [
            a[7] || (a[7] = l(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            v(J, {
              inputId: "recipe-source-name",
              modelValue: h.value,
              suggestions: T.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: _.value,
              fluid: "",
              "onUpdate:modelValue": $,
              onComplete: L,
              onItemSelect: G
            }, {
              option: te(({ option: m }) => [
                l("div", Vt, [
                  l(
                    "span",
                    $t,
                    x(m.name),
                    1
                    /* TEXT */
                  ),
                  l("small", It, [
                    Z(
                      x(O(he)(m.type)),
                      1
                      /* TEXT */
                    ),
                    m.author ? (d(), g(
                      W,
                      { key: 0 },
                      [
                        Z(
                          " · " + x(m.author),
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
          r.value !== "person" ? (d(), g("div", wt, [
            a[8] || (a[8] = l(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            v(F, {
              id: "recipe-source-author",
              modelValue: b.value,
              "onUpdate:modelValue": a[1] || (a[1] = (m) => b.value = m),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "cookbook" ? (d(), g("div", Ct, [
            a[9] || (a[9] = l(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            v(F, {
              id: "recipe-source-page",
              modelValue: k.value,
              "onUpdate:modelValue": a[2] || (a[2] = (m) => k.value = m),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "website" || r.value === "other" ? (d(), g("div", St, [
            a[10] || (a[10] = l(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            v(F, {
              id: "recipe-source-url",
              modelValue: y.value,
              "onUpdate:modelValue": a[3] || (a[3] = (m) => y.value = m),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "person" || r.value === "other" ? (d(), g("div", Ut, [
            a[11] || (a[11] = l(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            v(F, {
              id: "recipe-source-notes",
              modelValue: S.value,
              "onUpdate:modelValue": a[4] || (a[4] = (m) => S.value = m),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0)
        ])
      ]);
    };
  }
}), At = /* @__PURE__ */ ee(Rt, [["__scopeId", "data-v-267c9e36"]]), Tt = { class: "edit-top-bar" }, Lt = { class: "edit-top-actions" }, Nt = { class: "form-group" }, xt = { class: "form-group" }, Bt = { class: "form-row" }, Dt = { class: "form-group" }, Ot = { class: "form-group" }, zt = { class: "form-group" }, Pt = { class: "form-group" }, qt = { class: "form-group" }, Mt = { class: "form-group" }, Ft = ["disabled"], Et = { key: 0 }, Jt = { key: 1 }, jt = ["src"], Wt = { class: "actions-row" }, Gt = /* @__PURE__ */ X({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(u, { emit: c }) {
    var s;
    const p = u, V = c, n = ae(), i = K(() => p.id || p.recipeId || ""), r = f(""), h = f(""), b = f(((s = n.store.household.value) == null ? void 0 : s.languages.primary) || "en"), k = f(2), y = f(""), S = f(null), C = f(null), T = f([]), A = f(null), R = f(null), I = f([]), L = f([]), $ = f(1), G = f([]), B = f(!1), M = f(!1), _ = f(!1), e = f(""), a = n.on("recipe:deleted", (o) => {
      M.value || !i.value || ye(o, { id: i.value, group_id: y.value }) && (_.value = !0);
    });
    ce(() => {
      typeof a == "function" && a();
    }), H(i, async (o) => {
      if (_.value = !1, !!o)
        try {
          const t = await n.api.get(`/api/recipes/${o}`);
          r.value = t.title, h.value = t.description || "", b.value = t.language, k.value = t.servings, S.value = t.prep_time_minutes, C.value = t.cook_time_minutes, T.value = [...t.tags], R.value = t.source || null, I.value = t.ingredients, L.value = t.steps, $.value = t.revision, G.value = t.languages || [], A.value = await pe(n.api, t.group_id), y.value = t.group_id;
        } catch (t) {
          e.value = (t == null ? void 0 : t.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function N(o) {
      var z;
      const t = (z = o.target.files) == null ? void 0 : z[0];
      if (!(!t || B.value || !y.value)) {
        B.value = !0, e.value = "";
        try {
          const P = new FormData();
          P.append("file", t), P.append("entity_type", "recipe"), P.append("entity_id", y.value), P.append("slot", "cover"), A.value = (await n.api.upload("/api/assets", P)).id, n.notify({ level: "success", message: "Cover image saved" });
        } catch (P) {
          e.value = (P == null ? void 0 : P.message) || "Could not upload image";
        } finally {
          B.value = !1;
        }
      }
    }
    async function E() {
      var t;
      if (!r.value.trim() || B.value || _.value) return;
      B.value = !0, e.value = "";
      const o = {
        title: r.value.trim(),
        description: h.value.trim(),
        language: b.value,
        servings: k.value,
        prep_time_minutes: S.value,
        cook_time_minutes: C.value,
        tags: T.value,
        ingredients: I.value,
        steps: L.value
      };
      (R.value !== null || i.value) && (o.source = R.value);
      try {
        const z = i.value ? await n.api.patch(`/api/recipes/${i.value}`, { ...o, revision: $.value }) : await n.api.post("/api/recipes", o);
        V("saved", z), n.notify({ level: "success", message: "Recipe saved" }), (t = n.navigate) == null || t.call(n, `/recipes/${z.id}`);
      } catch (z) {
        e.value = (z == null ? void 0 : z.message) || "Could not save recipe";
      } finally {
        B.value = !1;
      }
    }
    async function J() {
      if (!(!i.value || B.value || _.value)) {
        B.value = !0, M.value = !0, e.value = "";
        try {
          await be(n, {
            id: i.value,
            group_id: y.value || void 0,
            title: r.value.trim() || "this recipe",
            languages: G.value
          }) || (M.value = !1);
        } catch (o) {
          M.value = !1, e.value = (o == null ? void 0 : o.message) || "Could not delete recipe";
        } finally {
          B.value = !1;
        }
      }
    }
    function F(o) {
      o.title && (r.value = o.title), o.description !== void 0 && (h.value = o.description || ""), o.servings && (k.value = o.servings), o.prep_time_minutes !== void 0 && (S.value = o.prep_time_minutes), o.cook_time_minutes !== void 0 && (C.value = o.cook_time_minutes), o.tags && (T.value = [...o.tags]), o.source !== void 0 && (R.value = o.source || null), o.ingredients && (I.value = [...o.ingredients]), o.steps && (L.value = [...o.steps]);
    }
    const m = K(() => ({
      targetId: i.value,
      recipe: {
        id: i.value,
        title: r.value,
        description: h.value,
        language: b.value,
        servings: k.value,
        prep_time_minutes: S.value,
        cook_time_minutes: C.value,
        tags: T.value,
        source: R.value,
        ingredients: I.value,
        steps: L.value
      },
      applyAdaptation: F
    }));
    return (o, t) => {
      const z = w("Button"), P = w("Message"), oe = w("InputText"), ne = w("Textarea"), le = w("InputNumber"), q = w("AutoComplete");
      return d(), g(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: se(E, ["prevent"])
        },
        [
          l("div", Tt, [
            l(
              "h2",
              null,
              x(i.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            l("div", Lt, [
              v(O(Q), {
                name: "recipe.edit.actions",
                context: m.value
              }, null, 8, ["context"]),
              v(z, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: B.value,
                onClick: t[0] || (t[0] = (D) => {
                  var de, ve;
                  return (ve = (de = O(n)).navigate) == null ? void 0 : ve.call(de, i.value ? `/recipes/${i.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          _.value ? (d(), j(P, {
            key: 0,
            severity: "warn"
          }, {
            default: te(() => [...t[11] || (t[11] = [
              Z(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : U("v-if", !0),
          e.value ? (d(), j(P, {
            key: 1,
            severity: "error"
          }, {
            default: te(() => [
              Z(
                x(e.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : U("v-if", !0),
          l("div", Nt, [
            t[12] || (t[12] = l(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            v(oe, {
              id: "recipe-title",
              modelValue: r.value,
              "onUpdate:modelValue": t[1] || (t[1] = (D) => r.value = D),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", xt, [
            t[13] || (t[13] = l(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            v(ne, {
              id: "recipe-description",
              modelValue: h.value,
              "onUpdate:modelValue": t[2] || (t[2] = (D) => h.value = D),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", Bt, [
            l("div", Dt, [
              t[14] || (t[14] = l(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              v(oe, {
                id: "recipe-language",
                modelValue: b.value,
                "onUpdate:modelValue": t[3] || (t[3] = (D) => b.value = D),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Ot, [
              t[15] || (t[15] = l(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              v(le, {
                inputId: "recipe-servings",
                modelValue: k.value,
                "onUpdate:modelValue": t[4] || (t[4] = (D) => k.value = D),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", zt, [
              t[16] || (t[16] = l(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              v(le, {
                inputId: "recipe-prep",
                modelValue: S.value,
                "onUpdate:modelValue": t[5] || (t[5] = (D) => S.value = D),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Pt, [
              t[17] || (t[17] = l(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              v(le, {
                inputId: "recipe-cook",
                modelValue: C.value,
                "onUpdate:modelValue": t[6] || (t[6] = (D) => C.value = D),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          l("div", qt, [
            t[18] || (t[18] = l(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            v(q, {
              inputId: "recipe-tags",
              modelValue: T.value,
              "onUpdate:modelValue": t[7] || (t[7] = (D) => T.value = D),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          v(At, {
            modelValue: R.value,
            "onUpdate:modelValue": t[8] || (t[8] = (D) => R.value = D)
          }, null, 8, ["modelValue"]),
          l("div", Mt, [
            t[19] || (t[19] = l(
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
              disabled: B.value || !y.value,
              onChange: N
            }, null, 40, Ft),
            i.value ? (d(), g("small", Jt, "Cover uploads are saved immediately, separately from recipe edits.")) : (d(), g("small", Et, "Save your recipe first to add a cover image.")),
            A.value ? (d(), g("img", {
              key: 2,
              src: O(n).url(`/api/assets/${A.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, jt)) : U("v-if", !0)
          ]),
          l("section", null, [
            t[20] || (t[20] = l(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            v(ct, {
              modelValue: I.value,
              "onUpdate:modelValue": t[9] || (t[9] = (D) => I.value = D)
            }, null, 8, ["modelValue"])
          ]),
          l("section", null, [
            t[21] || (t[21] = l(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            v(gt, {
              modelValue: L.value,
              "onUpdate:modelValue": t[10] || (t[10] = (D) => L.value = D)
            }, null, 8, ["modelValue"])
          ]),
          l("div", Wt, [
            i.value ? (d(), j(z, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: M.value && B.value,
              disabled: B.value || _.value,
              onClick: J
            }, null, 8, ["loading", "disabled"])) : U("v-if", !0),
            v(z, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: B.value && !M.value,
              disabled: !r.value.trim() || B.value || _.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), me = /* @__PURE__ */ ee(Gt, [["__scopeId", "data-v-cfa964a9"]]);
function Yt(u) {
  u.route({ path: "/recipes", component: Pe, nav: { label: "Recipes", icon: "book", order: 10 } }), u.route({ path: "/recipes/new", component: me }), u.route({ path: "/recipes/:id", component: nt }), u.route({ path: "/recipes/:id/edit", component: me }), u.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), u.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      u.navigate ? u.navigate("/recipes/new") : window.location.href = u.url ? u.url("/recipes/new") : "/recipes/new";
    }
  }), u.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), u.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (c) => {
      var p;
      (p = c == null ? void 0 : c.recipe) != null && p.id && (u.navigate ? u.navigate(`/recipes/${c.recipe.id}/edit`) : window.location.href = u.url ? u.url(`/recipes/${c.recipe.id}/edit`) : `/recipes/${c.recipe.id}/edit`);
    }
  }), u.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (c) => !!_e((c == null ? void 0 : c.recipe) || {}),
    execute: async (c) => {
      var p, V, n;
      if (!(c != null && c.recipe)) return !1;
      (p = c.onBeforeDelete) == null || p.call(c);
      try {
        const i = await be(u, c.recipe);
        return i || (V = c.onDeleteAborted) == null || V.call(c), i;
      } catch (i) {
        throw (n = c.onDeleteAborted) == null || n.call(c), i;
      }
    }
  });
}
export {
  Yt as default
};
