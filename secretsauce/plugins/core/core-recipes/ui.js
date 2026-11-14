import { ref as m, defineComponent as ee, resolveComponent as I, openBlock as p, createElementBlock as _, createCommentVNode as A, createElementVNode as n, createVNode as v, withModifiers as re, unref as M, createTextVNode as H, toDisplayString as O, normalizeClass as ce, Fragment as G, renderList as Z, createBlock as j, onBeforeUnmount as ve, onMounted as _e, watch as X, computed as W, withCtx as ne } from "vue";
import { Slot as Q, useSecretSauce as ue, IntentTrigger as pe } from "@secretsauce/ui";
const se = m(null);
function ye(i) {
  switch (i) {
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
function Ve(i) {
  switch (i) {
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
const $e = {
  key: 0,
  class: "cover-image"
}, we = ["src", "alt"], Ce = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, Ie = { class: "card-body" }, Se = { class: "card-header" }, Te = { class: "meta" }, Ue = { key: 0 }, Ae = { key: 1 }, Re = {
  key: 0,
  class: "source-meta"
}, xe = { class: "tags" }, Le = /* @__PURE__ */ ee({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(i, { emit: a }) {
    const s = i, b = a;
    return (l, o) => {
      var g;
      const u = I("Button"), c = I("Tag");
      return p(), _("article", {
        class: "recipe-card",
        onClick: o[2] || (o[2] = (k) => b("select", s.recipe.id))
      }, [
        s.showCover ? (p(), _("div", $e, [
          s.recipe.cover_asset_id ? (p(), _("img", {
            key: 0,
            src: s.recipe.cover_url || `/api/assets/${s.recipe.cover_asset_id}/file`,
            alt: s.recipe.title
          }, null, 8, we)) : (p(), _("i", Ce))
        ])) : A("v-if", !0),
        n("div", Ie, [
          n("div", Se, [
            n("h3", null, [
              v(u, {
                label: s.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: o[0] || (o[0] = re((k) => b("select", s.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            n("div", {
              class: "actions",
              onClick: o[1] || (o[1] = re(() => {
              }, ["stop"]))
            }, [
              v(M(Q), {
                name: "recipe.card.actions",
                context: { recipe: s.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          n("div", Te, [
            s.recipe.prep_time_minutes ? (p(), _("span", Ue, [
              o[3] || (o[3] = n(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              H(
                " " + O(s.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : A("v-if", !0),
            s.recipe.cook_time_minutes ? (p(), _(
              "span",
              Ae,
              O(s.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : A("v-if", !0)
          ]),
          (g = s.recipe.source) != null && g.name ? (p(), _("div", Re, [
            n(
              "i",
              {
                class: ce(M(ye)(s.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            n(
              "span",
              null,
              O(s.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : A("v-if", !0),
          n("div", xe, [
            (p(!0), _(
              G,
              null,
              Z(s.recipe.tags, (k) => (p(), j(c, {
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
}), te = (i, a) => {
  const s = i.__vccOpts || i;
  for (const [b, l] of a)
    s[b] = l;
  return s;
}, Ne = /* @__PURE__ */ te(Le, [["__scopeId", "data-v-3caa626b"]]);
async function me(i, a) {
  var s;
  if (!a) return null;
  try {
    return ((s = (await i.get("/api/assets", { entity_type: "recipe", entity_id: a })).filter((l) => l.slot === "cover").at(-1)) == null ? void 0 : s.id) || null;
  } catch {
    return null;
  }
}
const De = "secretsauce:recipe_tag_prefs", Be = 8;
function de() {
  return {
    showAll: !1,
    visibleCount: Be,
    pinnedTags: []
  };
}
function Oe(i) {
  const a = de();
  if (!i || typeof i != "object") return a;
  const s = i, b = typeof s.showAll == "boolean" ? s.showAll : a.showAll;
  let l = a.visibleCount;
  typeof s.visibleCount == "number" && Number.isInteger(s.visibleCount) && s.visibleCount >= 0 && (l = s.visibleCount);
  const o = /* @__PURE__ */ new Set(), u = [];
  if (Array.isArray(s.pinnedTags))
    for (const c of s.pinnedTags)
      typeof c == "string" && c.trim() && !o.has(c) && (o.add(c), u.push(c));
  return { showAll: b, visibleCount: l, pinnedTags: u };
}
function fe() {
  try {
    const i = localStorage.getItem(De);
    return i ? Oe(JSON.parse(i)) : de();
  } catch {
    return de();
  }
}
function Pe(i, a) {
  const s = i.filter((c) => c.count > 0 && c.name.trim() !== ""), b = new Map(s.map((c) => [c.name, c])), l = /* @__PURE__ */ new Set(), o = [];
  for (const c of a) {
    const g = b.get(c);
    g && !l.has(c) && (l.add(c), o.push(g));
  }
  const u = s.filter((c) => !l.has(c.name)).sort((c, g) => g.count !== c.count ? g.count - c.count : c.name.localeCompare(g.name, void 0, { sensitivity: "base" }));
  return [...o, ...u];
}
function ze(i, a, s, b) {
  const l = Pe(i, a.pinnedTags);
  if (a.showAll)
    return { visible: l, hiddenCount: 0, showToggle: !1 };
  const o = new Set(a.pinnedTags), u = l.filter(($) => o.has($.name)), c = l.filter(($) => !o.has($.name)), g = c.slice(0, a.visibleCount), k = [...u, ...g], y = new Set(k.map(($) => $.name)), C = b && !y.has(b) ? l.find(($) => $.name === b) ?? null : null, S = C ? [...k, C] : k, T = Math.max(0, l.length - S.length);
  return s ? {
    visible: l,
    hiddenCount: 0,
    showToggle: c.length > a.visibleCount
  } : {
    visible: S,
    hiddenCount: T,
    showToggle: T > 0
  };
}
const Me = { class: "recipe-list-page" }, Ee = { class: "intent-header-bar" }, Fe = { class: "filter-sort-bar" }, qe = {
  key: 1,
  class: "recipes-grid"
}, Je = {
  key: 2,
  class: "empty-state"
}, je = /* @__PURE__ */ ee({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(i, { emit: a }) {
    const s = a, b = ue(), l = m([]), o = m(""), u = m(null), c = m("title"), g = m(""), k = m([]), y = m([]), C = m([]), S = m(fe()), T = m(!1), $ = m(!1), R = m(/* @__PURE__ */ new Set());
    function U() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const L = m(U());
    let w = 0;
    async function K() {
      try {
        const e = await b.api.get("/api/x/core-shortlist");
        R.value = new Set(e.map((d) => d.recipe_id));
      } catch {
      }
    }
    async function D() {
      try {
        const e = await b.api.get("/api/recipes/sources");
        Array.isArray(e) ? y.value = e : e && Array.isArray(e.items) && (y.value = e.items);
      } catch {
      }
    }
    async function F() {
      try {
        const e = await b.api.get("/api/recipes/tags"), d = Array.isArray(e) ? e : e && Array.isArray(e.items) ? e.items : [];
        C.value = d, u.value && !d.some((V) => V.name === u.value) && (u.value = null);
      } catch {
      }
    }
    async function h() {
      $.value = !$.value, $.value && await K();
    }
    async function t() {
      const e = ++w;
      g.value = "";
      try {
        const d = { q: o.value.trim() };
        k.value.length > 0 && (d.source = k.value), u.value && (d.tag = u.value);
        const V = await b.api.get("/api/recipes", d);
        if (e !== w || (l.value = V.items, !L.value)) return;
        const le = await Promise.all(V.items.map(async (oe) => {
          const Y = await me(b.api, oe.group_id);
          return { ...oe, cover_asset_id: Y, cover_url: Y ? b.url(`/api/assets/${Y}/file`) : null };
        }));
        e === w && (l.value = le);
      } catch (d) {
        e === w && (g.value = (d == null ? void 0 : d.message) || "Could not load recipes");
      }
    }
    function r(e) {
      var d;
      s("openRecipe", e), (d = b.navigate) == null || d.call(b, `/recipes/${e}`);
    }
    function N() {
      t(), D(), F();
    }
    const q = b.on("recipe:created", N), J = b.on("recipe:updated", N), E = b.on("recipe:deleted", N);
    ve(() => {
      typeof q == "function" && q(), typeof J == "function" && J(), typeof E == "function" && E();
    }), _e(() => {
      L.value = U(), S.value = fe(), se.value && (k.value = [...se.value], se.value = null), t(), K(), D(), F();
    }), X([o, k, u], t);
    const P = W(() => {
      const e = [
        { value: "none", label: "No source" }
      ], d = /* @__PURE__ */ new Set(["none"]);
      for (const V of y.value)
        !V.name || d.has(V.name) || (d.add(V.name), e.push({
          value: V.name,
          label: V.author ? `${V.name} (${V.author})` : V.name
        }));
      for (const V of k.value)
        d.has(V) || (d.add(V), e.push({ value: V, label: V }));
      return e;
    }), x = W(
      () => ze(C.value, S.value, T.value, u.value)
    ), f = W(() => {
      let e = l.value.map((d) => ({ ...d, is_shortlisted: R.value.has(d.id) }));
      return $.value && (e = e.filter((d) => R.value.has(d.id))), e.sort(c.value === "title" ? (d, V) => d.title.localeCompare(V.title) : (d, V) => (d.prep_time_minutes || 0) - (V.prep_time_minutes || 0));
    });
    return (e, d) => {
      const V = I("InputIcon"), le = I("InputText"), oe = I("IconField"), Y = I("MultiSelect"), ie = I("Button"), B = I("Select"), ae = I("Message");
      return p(), _("div", Me, [
        d[5] || (d[5] = n(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        n("div", Ee, [
          v(oe, { class: "search-box" }, {
            default: ne(() => [
              v(V, { class: "pi pi-search" }),
              v(le, {
                modelValue: o.value,
                "onUpdate:modelValue": d[0] || (d[0] = (z) => o.value = z),
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
          v(M(pe), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        n("div", Fe, [
          v(M(Q), {
            name: "recipe.list.filters",
            context: { active: $.value, toggle: h }
          }, null, 8, ["context"]),
          v(Y, {
            modelValue: k.value,
            "onUpdate:modelValue": d[1] || (d[1] = (z) => k.value = z),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: P.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (p(!0), _(
            G,
            null,
            Z(x.value.visible, (z) => (p(), j(ie, {
              key: z.name,
              class: "tag-filter-btn",
              label: `${z.name} (${z.count})`,
              size: "small",
              outlined: u.value !== z.name,
              "aria-pressed": u.value === z.name,
              onClick: (tl) => u.value = u.value === z.name ? null : z.name
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          x.value.showToggle ? (p(), j(ie, {
            key: 0,
            class: "tag-more-btn",
            label: T.value ? "Less" : `More (${x.value.hiddenCount})`,
            size: "small",
            text: "",
            "aria-expanded": T.value,
            onClick: d[2] || (d[2] = (z) => T.value = !T.value)
          }, null, 8, ["label", "aria-expanded"])) : A("v-if", !0),
          v(B, {
            modelValue: c.value,
            "onUpdate:modelValue": d[3] || (d[3] = (z) => c.value = z),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        g.value ? (p(), j(ae, {
          key: 0,
          severity: "error"
        }, {
          default: ne(() => [
            H(
              O(g.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        f.value.length ? (p(), _("div", qe, [
          (p(!0), _(
            G,
            null,
            Z(f.value, (z) => (p(), j(Ne, {
              key: z.id,
              recipe: z,
              "show-cover": L.value,
              onSelect: r
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (p(), _("div", Je, [
          d[4] || (d[4] = n(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          v(M(pe), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Ge = /* @__PURE__ */ te(je, [["__scopeId", "data-v-f464e100"]]);
function We(i) {
  const a = (i.title || "").trim() || "this recipe", s = Array.isArray(i.languages) ? i.languages.filter(Boolean) : [];
  return `${s.length > 1 ? `Delete '${a}' and all ${s.length} language versions (${s.map((l) => l.toUpperCase()).join(", ")})?` : `Delete '${a}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function be(i) {
  if (i.group_id) return i.group_id;
  if (i.id) {
    const a = i.id.indexOf("_");
    return a === -1 ? i.id : i.id.slice(0, a);
  }
  return "";
}
function he(i, a) {
  const s = i == null ? void 0 : i.entity_id;
  return !s || !a ? !1 : a.id && s === a.id ? !0 : a.group_id ? s === a.group_id || s.startsWith(`${a.group_id}_`) : !1;
}
async function ke(i, a) {
  var l;
  const s = be(a);
  return !s || !await i.confirm({
    header: "Delete recipe",
    message: We(a),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await i.api.delete(`/api/recipes/${s}`), i.notify({ level: "success", message: "Recipe deleted" }), (l = i.navigate) == null || l.call(i, "/recipes"), !0);
}
const Ke = { class: "recipe-detail-page" }, Ye = {
  key: 0,
  class: "lang-bar"
}, Qe = { class: "detail-header" }, Ze = {
  key: 0,
  class: "recipe-source-attribution"
}, He = {
  key: 0,
  class: "source-locator"
}, Xe = {
  key: 1,
  class: "source-author"
}, et = ["href"], tt = {
  key: 3,
  class: "source-notes"
}, lt = { key: 1 }, ot = { class: "detail-actions" }, nt = ["src", "alt"], it = { class: "scaler-card" }, at = { class: "servings-value" }, st = {
  key: 2,
  class: "content-grid"
}, ut = { class: "ingredient-checklist" }, rt = ["for"], ct = {
  key: 0,
  class: "notes"
}, pt = { class: "steps-list" }, dt = /* @__PURE__ */ ee({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(i, { emit: a }) {
    const s = i, b = a, l = ue(), o = m(null), u = m(2), c = m({}), g = m(""), k = m(!1), y = m(null), C = m(!1), S = W(() => s.id || s.recipeId || ""), T = m(null), $ = m(!1);
    let R = 0;
    const U = l.on("recipe:deleted", (h) => {
      var t;
      $.value || !o.value || he(h, o.value) && (l.notify({ level: "info", message: "This recipe was deleted" }), (t = l.navigate) == null || t.call(l, "/recipes"));
    });
    ve(() => {
      typeof U == "function" && U();
    }), X(S, async (h) => {
      if (!h) return;
      const t = ++R;
      g.value = "", T.value = null, y.value = null, C.value = !1;
      try {
        const r = await l.api.get(`/api/recipes/${h}`);
        if (t !== R) return;
        o.value = r, u.value = r.servings || 2, c.value = {}, k.value = !1;
        const N = await me(l.api, r.group_id);
        if (t !== R) return;
        T.value = N;
        try {
          const q = await l.api.get("/api/x/core-shortlist");
          t === R && (k.value = q.some((J) => J.recipe_id === h));
        } catch {
        }
      } catch (r) {
        t === R && (o.value = null, g.value = (r == null ? void 0 : r.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function L(h) {
      var t;
      b("switchLanguage", h), (t = l.navigate) == null || t.call(l, `/recipes/${h}`);
    }
    const w = W(() => {
      var t, r;
      const h = ((t = y.value) == null ? void 0 : t.source) ?? ((r = o.value) == null ? void 0 : r.source);
      return h && h.name ? h : null;
    });
    function K(h) {
      var t;
      se.value = [h], (t = l.navigate) == null || t.call(l, "/recipes");
    }
    function D(h) {
      var r;
      if (h == null) return "";
      const t = h * u.value / (((r = o.value) == null ? void 0 : r.servings) || 1);
      return Number.isInteger(t) ? String(t) : t.toFixed(1);
    }
    const F = W(() => ({
      recipe: o.value,
      customizedRecipe: y.value,
      customizeOpen: C.value,
      currentServings: u.value,
      checkedIngredients: c.value,
      setCustomizeOpen: (h) => {
        C.value = h;
      },
      applyCustomization: (h) => {
        y.value = h, c.value = {}, h != null && h.servings && (u.value = h.servings);
      },
      resetCustomization: () => {
        y.value = null, c.value = {}, o.value && (u.value = o.value.servings || 2);
      },
      onRecipeUpdated: (h) => {
        o.value = h, y.value = null, C.value = !1, c.value = {}, u.value = h.servings || 2;
      },
      setCheckedIngredients: (h) => {
        c.value = h;
      }
    }));
    return (h, t) => {
      var E, P;
      const r = I("Button"), N = I("Message"), q = I("Checkbox"), J = I("Tag");
      return p(), _("div", Ke, [
        v(r, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: t[0] || (t[0] = (x) => {
            var f, e;
            return (e = (f = M(l)).navigate) == null ? void 0 : e.call(f, "/recipes");
          })
        }),
        g.value ? (p(), j(N, {
          key: 0,
          severity: "error"
        }, {
          default: ne(() => [
            H(
              O(g.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        o.value ? (p(), _(
          G,
          { key: 1 },
          [
            ((E = o.value.languages) == null ? void 0 : E.length) > 1 ? (p(), _("div", Ye, [
              t[4] || (t[4] = n(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (p(!0), _(
                G,
                null,
                Z(o.value.languages, (x) => (p(), j(r, {
                  key: x,
                  label: x.toUpperCase(),
                  size: "small",
                  outlined: x !== o.value.language,
                  onClick: (f) => L(`${o.value.group_id}_${x}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : A("v-if", !0),
            n("div", Qe, [
              n("div", null, [
                n(
                  "h1",
                  null,
                  O(((P = y.value) == null ? void 0 : P.title) || o.value.title),
                  1
                  /* TEXT */
                ),
                w.value ? (p(), _("div", Ze, [
                  n(
                    "i",
                    {
                      class: ce(M(ye)(w.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  t[6] || (t[6] = n(
                    "span",
                    { class: "source-prefix" },
                    "From: ",
                    -1
                    /* CACHED */
                  )),
                  n(
                    "button",
                    {
                      type: "button",
                      class: "source-filter-link",
                      onClick: t[1] || (t[1] = (x) => K(w.value.name))
                    },
                    O(w.value.name),
                    1
                    /* TEXT */
                  ),
                  w.value.type === "cookbook" && w.value.page ? (p(), _(
                    "span",
                    He,
                    ", p. " + O(w.value.page),
                    1
                    /* TEXT */
                  )) : A("v-if", !0),
                  w.value.author ? (p(), _(
                    "span",
                    Xe,
                    " by " + O(w.value.author),
                    1
                    /* TEXT */
                  )) : A("v-if", !0),
                  w.value.url ? (p(), _("a", {
                    key: 2,
                    href: w.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...t[5] || (t[5] = [
                    n(
                      "i",
                      {
                        class: "pi pi-external-link",
                        "aria-hidden": "true"
                      },
                      null,
                      -1
                      /* CACHED */
                    )
                  ])], 8, et)) : A("v-if", !0),
                  w.value.notes ? (p(), _(
                    "span",
                    tt,
                    " — " + O(w.value.notes),
                    1
                    /* TEXT */
                  )) : A("v-if", !0)
                ])) : A("v-if", !0),
                !y.value && o.value.description ? (p(), _(
                  "p",
                  lt,
                  O(o.value.description),
                  1
                  /* TEXT */
                )) : A("v-if", !0)
              ]),
              n("div", ot, [
                v(M(Q), {
                  name: "recipe.detail.actions",
                  context: F.value
                }, null, 8, ["context"]),
                v(M(Q), {
                  name: "recipe.card.actions",
                  context: { recipe: o.value, isShortlisted: k.value }
                }, null, 8, ["context"]),
                v(M(pe), {
                  hub: "recipe:actions",
                  context: { recipe: o.value, onBeforeDelete: () => {
                    $.value = !0;
                  }, onDeleteAborted: () => {
                    $.value = !1;
                  } },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            T.value ? (p(), _("img", {
              key: 1,
              src: M(l).url(`/api/assets/${T.value}/file`),
              alt: o.value.title,
              class: "recipe-cover"
            }, null, 8, nt)) : A("v-if", !0),
            n("div", it, [
              t[7] || (t[7] = n(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              v(r, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: u.value <= 1,
                onClick: t[2] || (t[2] = (x) => u.value--)
              }, null, 8, ["disabled"]),
              n(
                "span",
                at,
                O(u.value),
                1
                /* TEXT */
              ),
              v(r, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: t[3] || (t[3] = (x) => u.value++)
              })
            ]),
            v(M(Q), {
              name: "recipe.detail.customize",
              context: F.value
            }, null, 8, ["context"]),
            y.value ? A("v-if", !0) : (p(), _("div", st, [
              n("section", null, [
                t[8] || (t[8] = n(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                n("ul", ut, [
                  (p(!0), _(
                    G,
                    null,
                    Z(o.value.ingredients, (x, f) => (p(), _("li", {
                      key: f,
                      class: "ingredient-item"
                    }, [
                      v(q, {
                        inputId: `ingredient-${f}`,
                        modelValue: c.value[f],
                        "onUpdate:modelValue": (e) => c.value[f] = e,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      n("label", {
                        for: `ingredient-${f}`,
                        class: ce({ struck: c.value[f] })
                      }, [
                        n(
                          "strong",
                          null,
                          O(D(x.quantity)),
                          1
                          /* TEXT */
                        ),
                        H(
                          " " + O(x.unit) + " " + O(x.name),
                          1
                          /* TEXT */
                        ),
                        x.notes ? (p(), _(
                          "span",
                          ct,
                          " (" + O(x.notes) + ")",
                          1
                          /* TEXT */
                        )) : A("v-if", !0)
                      ], 10, rt)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              n("section", null, [
                t[9] || (t[9] = n(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                n("ol", pt, [
                  (p(!0), _(
                    G,
                    null,
                    Z(o.value.steps, (x) => (p(), _("li", {
                      key: x.id
                    }, [
                      n(
                        "p",
                        null,
                        O(x.instruction),
                        1
                        /* TEXT */
                      ),
                      x.timer_minutes ? (p(), j(J, {
                        key: 0,
                        value: `${x.timer_minutes} min`,
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
            v(M(Q), {
              name: "recipe.detail.sidebar",
              context: { recipe: o.value }
            }, null, 8, ["context"]),
            v(M(Q), {
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
}), vt = /* @__PURE__ */ te(dt, [["__scopeId", "data-v-678e2974"]]), mt = { class: "ingredient-row-list" }, ft = { class: "reorder-btns" }, gt = /* @__PURE__ */ ee({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: a }) {
    const s = i, b = a, l = m(JSON.parse(JSON.stringify(s.modelValue || [])));
    X(() => s.modelValue, (y) => {
      l.value = JSON.parse(JSON.stringify(y || []));
    }, { deep: !0 });
    const o = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((y) => ({ id: y, label: y || "(none)" }));
    function u() {
      b("update:modelValue", l.value);
    }
    function c() {
      l.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), u();
    }
    function g(y) {
      l.value.splice(y, 1), u();
    }
    function k(y, C) {
      const S = y + C;
      S < 0 || S >= l.value.length || (l.value.splice(S, 0, l.value.splice(y, 1)[0]), u());
    }
    return (y, C) => {
      const S = I("Button"), T = I("InputNumber"), $ = I("Select"), R = I("InputText");
      return p(), _("div", mt, [
        (p(!0), _(
          G,
          null,
          Z(l.value, (U, L) => (p(), _("div", {
            key: U.id,
            class: "ingredient-row"
          }, [
            n("div", ft, [
              v(S, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: L === 0,
                onClick: (w) => k(L, -1)
              }, null, 8, ["disabled", "onClick"]),
              v(S, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: L === l.value.length - 1,
                onClick: (w) => k(L, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            v(T, {
              modelValue: U.quantity,
              "onUpdate:modelValue": [(w) => U.quantity = w, u],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${L + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v($, {
              modelValue: U.unit,
              "onUpdate:modelValue": [(w) => U.unit = w, u],
              options: M(o),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${L + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            v(R, {
              modelValue: U.name,
              "onUpdate:modelValue": (w) => U.name = w,
              class: "input-name",
              "aria-label": `Ingredient ${L + 1} name`,
              placeholder: "Ingredient name",
              onInput: u
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(R, {
              modelValue: U.notes,
              "onUpdate:modelValue": (w) => U.notes = w,
              class: "input-notes",
              "aria-label": `Ingredient ${L + 1} notes`,
              placeholder: "Notes",
              onInput: u
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(S, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (w) => g(L)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        v(S, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: c
        })
      ]);
    };
  }
}), _t = /* @__PURE__ */ te(gt, [["__scopeId", "data-v-6a40d29c"]]), yt = { class: "step-list" }, bt = { class: "step-inputs" }, ht = { class: "timer-row" }, kt = ["for"], Vt = /* @__PURE__ */ ee({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: a }) {
    const s = i, b = a, l = m(JSON.parse(JSON.stringify(s.modelValue || [])));
    X(() => s.modelValue, (g) => {
      l.value = JSON.parse(JSON.stringify(g || []));
    }, { deep: !0 });
    function o() {
      b("update:modelValue", l.value);
    }
    function u() {
      l.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), o();
    }
    function c(g) {
      l.value.splice(g, 1), o();
    }
    return (g, k) => {
      const y = I("Tag"), C = I("Textarea"), S = I("InputNumber"), T = I("Button");
      return p(), _("div", yt, [
        (p(!0), _(
          G,
          null,
          Z(l.value, ($, R) => (p(), _("div", {
            key: $.id,
            class: "step-row"
          }, [
            v(y, {
              value: String(R + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            n("div", bt, [
              v(C, {
                modelValue: $.instruction,
                "onUpdate:modelValue": (U) => $.instruction = U,
                class: "textarea-instruction",
                "aria-label": `Step ${R + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: o
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              n("div", ht, [
                n("label", {
                  for: `timer-${$.id}`
                }, "Timer (min)", 8, kt),
                v(S, {
                  inputId: `timer-${$.id}`,
                  modelValue: $.timer_minutes,
                  "onUpdate:modelValue": [(U) => $.timer_minutes = U, o],
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
              onClick: (U) => c(R)
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
          onClick: u
        })
      ]);
    };
  }
}), $t = /* @__PURE__ */ te(Vt, [["__scopeId", "data-v-4c4135f0"]]), wt = { class: "source-editor" }, Ct = { class: "source-header" }, It = { class: "source-grid" }, St = { class: "form-group" }, Tt = { class: "form-group source-name-field" }, Ut = { class: "source-suggestion" }, At = { class: "suggestion-name" }, Rt = { class: "suggestion-meta" }, xt = {
  key: 0,
  class: "form-group"
}, Lt = {
  key: 1,
  class: "form-group"
}, Nt = {
  key: 2,
  class: "form-group source-url-field"
}, Dt = {
  key: 3,
  class: "form-group source-notes-field"
}, Bt = /* @__PURE__ */ ee({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: a }) {
    const s = i, b = a, l = ue(), o = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], u = m("cookbook"), c = m(""), g = m(""), k = m(""), y = m(""), C = m(""), S = m([]), T = m([]);
    let $ = !1;
    function R(t) {
      $ = !0, t && t.name ? (u.value = t.type || "other", c.value = t.name || "", g.value = t.author || "", k.value = t.page || "", y.value = t.url || "", C.value = t.notes || "") : (c.value = "", g.value = "", k.value = "", y.value = "", C.value = ""), $ = !1;
    }
    X(() => s.modelValue, R, { immediate: !0, deep: !0 });
    function U() {
      if ($) return;
      const t = c.value.trim();
      if (!t) {
        b("update:modelValue", null);
        return;
      }
      const r = {
        type: u.value,
        name: t
      }, N = g.value.trim(), q = k.value.trim(), J = y.value.trim(), E = C.value.trim();
      N && (r.author = N), u.value === "cookbook" && q && (r.page = q), (u.value === "website" || u.value === "other") && J && (r.url = J), E && (r.notes = E), b("update:modelValue", r);
    }
    X([u, c, g, k, y, C], U), _e(async () => {
      var t, r;
      try {
        const N = await ((r = (t = l.api) == null ? void 0 : t.get) == null ? void 0 : r.call(t, "/api/recipes/sources"));
        Array.isArray(N) ? S.value = N : N && Array.isArray(N.items) && (S.value = N.items);
      } catch {
      }
    });
    function L(t) {
      const r = (t.query || "").trim().toLowerCase();
      if (!r) {
        T.value = [...S.value];
        return;
      }
      T.value = S.value.filter(
        (N) => N.name.toLowerCase().includes(r) || N.author && N.author.toLowerCase().includes(r)
      );
    }
    function w(t) {
      t && typeof t == "object" ? (c.value = t.name || "", t.type && (u.value = t.type), (t.author && !g.value.trim() || t.author) && (g.value = t.author)) : c.value = typeof t == "string" ? t : "";
    }
    function K(t) {
      const r = t == null ? void 0 : t.value;
      r && (c.value = r.name, r.type && (u.value = r.type), r.author && (g.value = r.author));
    }
    function D() {
      c.value = "", g.value = "", k.value = "", y.value = "", C.value = "", b("update:modelValue", null);
    }
    const F = W(
      () => !!(c.value.trim() || g.value.trim() || k.value.trim() || y.value.trim() || C.value.trim())
    ), h = W(() => {
      switch (u.value) {
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
    return (t, r) => {
      const N = I("Button"), q = I("Select"), J = I("AutoComplete"), E = I("InputText");
      return p(), _("fieldset", wt, [
        n("div", Ct, [
          r[5] || (r[5] = n(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          F.value ? (p(), j(N, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: D
          })) : A("v-if", !0)
        ]),
        n("div", It, [
          n("div", St, [
            r[6] || (r[6] = n(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            v(q, {
              inputId: "recipe-source-type",
              modelValue: u.value,
              "onUpdate:modelValue": r[0] || (r[0] = (P) => u.value = P),
              options: o,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Tt, [
            r[7] || (r[7] = n(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            v(J, {
              inputId: "recipe-source-name",
              modelValue: c.value,
              suggestions: T.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: h.value,
              fluid: "",
              "onUpdate:modelValue": w,
              onComplete: L,
              onItemSelect: K
            }, {
              option: ne(({ option: P }) => [
                n("div", Ut, [
                  n(
                    "span",
                    At,
                    O(P.name),
                    1
                    /* TEXT */
                  ),
                  n("small", Rt, [
                    H(
                      O(M(Ve)(P.type)),
                      1
                      /* TEXT */
                    ),
                    P.author ? (p(), _(
                      G,
                      { key: 0 },
                      [
                        H(
                          " · " + O(P.author),
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
          u.value !== "person" ? (p(), _("div", xt, [
            r[8] || (r[8] = n(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            v(E, {
              id: "recipe-source-author",
              modelValue: g.value,
              "onUpdate:modelValue": r[1] || (r[1] = (P) => g.value = P),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          u.value === "cookbook" ? (p(), _("div", Lt, [
            r[9] || (r[9] = n(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            v(E, {
              id: "recipe-source-page",
              modelValue: k.value,
              "onUpdate:modelValue": r[2] || (r[2] = (P) => k.value = P),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          u.value === "website" || u.value === "other" ? (p(), _("div", Nt, [
            r[10] || (r[10] = n(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            v(E, {
              id: "recipe-source-url",
              modelValue: y.value,
              "onUpdate:modelValue": r[3] || (r[3] = (P) => y.value = P),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0),
          u.value === "person" || u.value === "other" ? (p(), _("div", Dt, [
            r[11] || (r[11] = n(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            v(E, {
              id: "recipe-source-notes",
              modelValue: C.value,
              "onUpdate:modelValue": r[4] || (r[4] = (P) => C.value = P),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : A("v-if", !0)
        ])
      ]);
    };
  }
}), Ot = /* @__PURE__ */ te(Bt, [["__scopeId", "data-v-267c9e36"]]), Pt = { class: "edit-top-bar" }, zt = { class: "edit-top-actions" }, Mt = { class: "form-group" }, Et = { class: "form-group" }, Ft = { class: "form-row" }, qt = { class: "form-group" }, Jt = { class: "form-group" }, jt = { class: "form-group" }, Gt = { class: "form-group" }, Wt = { class: "form-group" }, Kt = { class: "form-group" }, Yt = ["disabled"], Qt = { key: 0 }, Zt = { key: 1 }, Ht = ["src"], Xt = { class: "actions-row" }, el = /* @__PURE__ */ ee({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(i, { emit: a }) {
    var x;
    const s = i, b = a, l = ue(), o = W(() => s.id || s.recipeId || ""), u = m(""), c = m(""), g = m(((x = l.store.household.value) == null ? void 0 : x.languages.primary) || "en"), k = m(2), y = m(""), C = m(null), S = m(null), T = m([]), $ = m(null), R = m(null), U = m([]), L = m([]), w = m(1), K = m([]), D = m(!1), F = m(!1), h = m(!1), t = m(""), r = l.on("recipe:deleted", (f) => {
      F.value || !o.value || he(f, { id: o.value, group_id: y.value }) && (h.value = !0);
    });
    ve(() => {
      typeof r == "function" && r();
    }), X(o, async (f) => {
      if (h.value = !1, !!f)
        try {
          const e = await l.api.get(`/api/recipes/${f}`);
          u.value = e.title, c.value = e.description || "", g.value = e.language, k.value = e.servings, C.value = e.prep_time_minutes, S.value = e.cook_time_minutes, T.value = [...e.tags], R.value = e.source || null, U.value = e.ingredients, L.value = e.steps, w.value = e.revision, K.value = e.languages || [], $.value = await me(l.api, e.group_id), y.value = e.group_id;
        } catch (e) {
          t.value = (e == null ? void 0 : e.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function N(f) {
      var d;
      const e = (d = f.target.files) == null ? void 0 : d[0];
      if (!(!e || D.value || !y.value)) {
        D.value = !0, t.value = "";
        try {
          const V = new FormData();
          V.append("file", e), V.append("entity_type", "recipe"), V.append("entity_id", y.value), V.append("slot", "cover"), $.value = (await l.api.upload("/api/assets", V)).id, l.notify({ level: "success", message: "Cover image saved" });
        } catch (V) {
          t.value = (V == null ? void 0 : V.message) || "Could not upload image";
        } finally {
          D.value = !1;
        }
      }
    }
    async function q() {
      var e;
      if (!u.value.trim() || D.value || h.value) return;
      D.value = !0, t.value = "";
      const f = {
        title: u.value.trim(),
        description: c.value.trim(),
        language: g.value,
        servings: k.value,
        prep_time_minutes: C.value,
        cook_time_minutes: S.value,
        tags: T.value,
        ingredients: U.value,
        steps: L.value
      };
      (R.value !== null || o.value) && (f.source = R.value);
      try {
        const d = o.value ? await l.api.patch(`/api/recipes/${o.value}`, { ...f, revision: w.value }) : await l.api.post("/api/recipes", f);
        b("saved", d), l.notify({ level: "success", message: "Recipe saved" }), (e = l.navigate) == null || e.call(l, `/recipes/${d.id}`);
      } catch (d) {
        t.value = (d == null ? void 0 : d.message) || "Could not save recipe";
      } finally {
        D.value = !1;
      }
    }
    async function J() {
      if (!(!o.value || D.value || h.value)) {
        D.value = !0, F.value = !0, t.value = "";
        try {
          await ke(l, {
            id: o.value,
            group_id: y.value || void 0,
            title: u.value.trim() || "this recipe",
            languages: K.value
          }) || (F.value = !1);
        } catch (f) {
          F.value = !1, t.value = (f == null ? void 0 : f.message) || "Could not delete recipe";
        } finally {
          D.value = !1;
        }
      }
    }
    function E(f) {
      f.title && (u.value = f.title), f.description !== void 0 && (c.value = f.description || ""), f.servings && (k.value = f.servings), f.prep_time_minutes !== void 0 && (C.value = f.prep_time_minutes), f.cook_time_minutes !== void 0 && (S.value = f.cook_time_minutes), f.tags && (T.value = [...f.tags]), f.source !== void 0 && (R.value = f.source || null), f.ingredients && (U.value = [...f.ingredients]), f.steps && (L.value = [...f.steps]);
    }
    const P = W(() => ({
      targetId: o.value,
      recipe: {
        id: o.value,
        title: u.value,
        description: c.value,
        language: g.value,
        servings: k.value,
        prep_time_minutes: C.value,
        cook_time_minutes: S.value,
        tags: T.value,
        source: R.value,
        ingredients: U.value,
        steps: L.value
      },
      applyAdaptation: E
    }));
    return (f, e) => {
      const d = I("Button"), V = I("Message"), le = I("InputText"), oe = I("Textarea"), Y = I("InputNumber"), ie = I("AutoComplete");
      return p(), _(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: re(q, ["prevent"])
        },
        [
          n("div", Pt, [
            n(
              "h2",
              null,
              O(o.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            n("div", zt, [
              v(M(Q), {
                name: "recipe.edit.actions",
                context: P.value
              }, null, 8, ["context"]),
              v(d, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: D.value,
                onClick: e[0] || (e[0] = (B) => {
                  var ae, z;
                  return (z = (ae = M(l)).navigate) == null ? void 0 : z.call(ae, o.value ? `/recipes/${o.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          h.value ? (p(), j(V, {
            key: 0,
            severity: "warn"
          }, {
            default: ne(() => [...e[11] || (e[11] = [
              H(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          t.value ? (p(), j(V, {
            key: 1,
            severity: "error"
          }, {
            default: ne(() => [
              H(
                O(t.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : A("v-if", !0),
          n("div", Mt, [
            e[12] || (e[12] = n(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            v(le, {
              id: "recipe-title",
              modelValue: u.value,
              "onUpdate:modelValue": e[1] || (e[1] = (B) => u.value = B),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Et, [
            e[13] || (e[13] = n(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            v(oe, {
              id: "recipe-description",
              modelValue: c.value,
              "onUpdate:modelValue": e[2] || (e[2] = (B) => c.value = B),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Ft, [
            n("div", qt, [
              e[14] || (e[14] = n(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              v(le, {
                id: "recipe-language",
                modelValue: g.value,
                "onUpdate:modelValue": e[3] || (e[3] = (B) => g.value = B),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", Jt, [
              e[15] || (e[15] = n(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              v(Y, {
                inputId: "recipe-servings",
                modelValue: k.value,
                "onUpdate:modelValue": e[4] || (e[4] = (B) => k.value = B),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", jt, [
              e[16] || (e[16] = n(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              v(Y, {
                inputId: "recipe-prep",
                modelValue: C.value,
                "onUpdate:modelValue": e[5] || (e[5] = (B) => C.value = B),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", Gt, [
              e[17] || (e[17] = n(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              v(Y, {
                inputId: "recipe-cook",
                modelValue: S.value,
                "onUpdate:modelValue": e[6] || (e[6] = (B) => S.value = B),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          n("div", Wt, [
            e[18] || (e[18] = n(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            v(ie, {
              inputId: "recipe-tags",
              modelValue: T.value,
              "onUpdate:modelValue": e[7] || (e[7] = (B) => T.value = B),
              multiple: "",
              typeahead: !1,
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          v(Ot, {
            modelValue: R.value,
            "onUpdate:modelValue": e[8] || (e[8] = (B) => R.value = B)
          }, null, 8, ["modelValue"]),
          n("div", Kt, [
            e[19] || (e[19] = n(
              "label",
              { for: "recipe-cover" },
              "Cover image",
              -1
              /* CACHED */
            )),
            n("input", {
              id: "recipe-cover",
              type: "file",
              accept: "image/*",
              disabled: D.value || !y.value,
              onChange: N
            }, null, 40, Yt),
            o.value ? (p(), _("small", Zt, "Cover uploads are saved immediately, separately from recipe edits.")) : (p(), _("small", Qt, "Save your recipe first to add a cover image.")),
            $.value ? (p(), _("img", {
              key: 2,
              src: M(l).url(`/api/assets/${$.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, Ht)) : A("v-if", !0)
          ]),
          n("section", null, [
            e[20] || (e[20] = n(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            v(_t, {
              modelValue: U.value,
              "onUpdate:modelValue": e[9] || (e[9] = (B) => U.value = B)
            }, null, 8, ["modelValue"])
          ]),
          n("section", null, [
            e[21] || (e[21] = n(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            v($t, {
              modelValue: L.value,
              "onUpdate:modelValue": e[10] || (e[10] = (B) => L.value = B)
            }, null, 8, ["modelValue"])
          ]),
          n("div", Xt, [
            o.value ? (p(), j(d, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: F.value && D.value,
              disabled: D.value || h.value,
              onClick: J
            }, null, 8, ["loading", "disabled"])) : A("v-if", !0),
            v(d, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: D.value && !F.value,
              disabled: !u.value.trim() || D.value || h.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ge = /* @__PURE__ */ te(el, [["__scopeId", "data-v-cfa964a9"]]);
function nl(i) {
  i.route({ path: "/recipes", component: Ge, nav: { label: "Recipes", icon: "book", order: 10 } }), i.route({ path: "/recipes/new", component: ge }), i.route({ path: "/recipes/:id", component: vt }), i.route({ path: "/recipes/:id/edit", component: ge }), i.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), i.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      i.navigate ? i.navigate("/recipes/new") : window.location.href = i.url ? i.url("/recipes/new") : "/recipes/new";
    }
  }), i.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), i.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (a) => {
      var s;
      (s = a == null ? void 0 : a.recipe) != null && s.id && (i.navigate ? i.navigate(`/recipes/${a.recipe.id}/edit`) : window.location.href = i.url ? i.url(`/recipes/${a.recipe.id}/edit`) : `/recipes/${a.recipe.id}/edit`);
    }
  }), i.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (a) => !!be((a == null ? void 0 : a.recipe) || {}),
    execute: async (a) => {
      var s, b, l;
      if (!(a != null && a.recipe)) return !1;
      (s = a.onBeforeDelete) == null || s.call(a);
      try {
        const o = await ke(i, a.recipe);
        return o || (b = a.onDeleteAborted) == null || b.call(a), o;
      } catch (o) {
        throw (l = a.onDeleteAborted) == null || l.call(a), o;
      }
    }
  });
}
export {
  nl as default
};
