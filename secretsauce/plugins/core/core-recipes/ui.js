import { ref as v, defineComponent as le, resolveComponent as A, openBlock as r, createElementBlock as f, createCommentVNode as x, createElementVNode as l, createVNode as m, withModifiers as me, unref as G, createTextVNode as X, toDisplayString as P, normalizeClass as fe, Fragment as H, renderList as ee, createBlock as Q, onBeforeUnmount as pe, onMounted as ve, watch as ie, computed as Z, withCtx as ae, withKeys as Ae } from "vue";
import { Slot as te, useSecretSauce as ue, IntentTrigger as ge } from "@secretsauce/ui";
const ce = v(null);
function $e(u) {
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
function Ue(u) {
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
const Re = {
  key: 0,
  class: "cover-image"
}, xe = ["src", "alt"], Le = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, Ne = { class: "card-body" }, Pe = { class: "card-header" }, De = { class: "meta" }, Be = { key: 0 }, Oe = { key: 1 }, ze = {
  key: 0,
  class: "source-meta"
}, Me = { class: "tags" }, Ee = /* @__PURE__ */ le({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(u, { emit: p }) {
    const e = u, g = p;
    return (n, i) => {
      var y;
      const a = A("Button"), c = A("Tag");
      return r(), f("article", {
        class: "recipe-card",
        onClick: i[2] || (i[2] = (h) => g("select", e.recipe.id))
      }, [
        e.showCover ? (r(), f("div", Re, [
          e.recipe.cover_asset_id ? (r(), f("img", {
            key: 0,
            src: e.recipe.cover_url || `/api/assets/${e.recipe.cover_asset_id}/file`,
            alt: e.recipe.title
          }, null, 8, xe)) : (r(), f("i", Le))
        ])) : x("v-if", !0),
        l("div", Ne, [
          l("div", Pe, [
            l("h3", null, [
              m(a, {
                label: e.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: i[0] || (i[0] = me((h) => g("select", e.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            l("div", {
              class: "actions",
              onClick: i[1] || (i[1] = me(() => {
              }, ["stop"]))
            }, [
              m(G(te), {
                name: "recipe.card.actions",
                context: { recipe: e.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          l("div", De, [
            e.recipe.prep_time_minutes ? (r(), f("span", Be, [
              i[3] || (i[3] = l(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              X(
                " " + P(e.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : x("v-if", !0),
            e.recipe.cook_time_minutes ? (r(), f(
              "span",
              Oe,
              P(e.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : x("v-if", !0)
          ]),
          (y = e.recipe.source) != null && y.name ? (r(), f("div", ze, [
            l(
              "i",
              {
                class: fe(G($e)(e.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            l(
              "span",
              null,
              P(e.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : x("v-if", !0),
          l("div", Me, [
            (r(!0), f(
              H,
              null,
              ee(e.recipe.tags, (h) => (r(), Q(c, {
                key: h,
                value: h,
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
}), ne = (u, p) => {
  const e = u.__vccOpts || u;
  for (const [g, n] of p)
    e[g] = n;
  return e;
}, qe = /* @__PURE__ */ ne(Ee, [["__scopeId", "data-v-3caa626b"]]);
async function ye(u, p) {
  var e;
  if (!p) return null;
  try {
    return ((e = (await u.get("/api/assets", { entity_type: "recipe", entity_id: p })).filter((n) => n.slot === "cover").at(-1)) == null ? void 0 : e.id) || null;
  } catch {
    return null;
  }
}
const we = "secretsauce:recipe_tag_prefs", Fe = 8;
function _e() {
  return {
    showAll: !1,
    visibleCount: Fe,
    pinnedTags: []
  };
}
function Ve(u) {
  const p = _e();
  if (!u || typeof u != "object") return p;
  const e = u, g = typeof e.showAll == "boolean" ? e.showAll : p.showAll;
  let n = p.visibleCount;
  typeof e.visibleCount == "number" && Number.isInteger(e.visibleCount) && e.visibleCount >= 0 && (n = e.visibleCount);
  const i = /* @__PURE__ */ new Set(), a = [];
  if (Array.isArray(e.pinnedTags))
    for (const c of e.pinnedTags)
      typeof c == "string" && c.trim() && !i.has(c) && (i.add(c), a.push(c));
  return { showAll: g, visibleCount: n, pinnedTags: a };
}
function de() {
  try {
    const u = localStorage.getItem(we);
    return u ? Ve(JSON.parse(u)) : _e();
  } catch {
    return _e();
  }
}
function Je(u) {
  const p = Ve(u);
  try {
    localStorage.setItem(we, JSON.stringify(p));
  } catch {
  }
  return p;
}
function je(u, p) {
  const e = u.filter((c) => c.count > 0 && c.name.trim() !== ""), g = new Map(e.map((c) => [c.name, c])), n = /* @__PURE__ */ new Set(), i = [];
  for (const c of p) {
    const y = g.get(c);
    y && !n.has(c) && (n.add(c), i.push(y));
  }
  const a = e.filter((c) => !n.has(c.name)).sort((c, y) => y.count !== c.count ? y.count - c.count : c.name.localeCompare(y.name, void 0, { sensitivity: "base" }));
  return [...i, ...a];
}
function Ge(u, p, e, g) {
  const n = je(u, p.pinnedTags);
  if (p.showAll)
    return { visible: n, hiddenCount: 0, showToggle: !1 };
  const i = new Set(p.pinnedTags), a = n.filter((w) => i.has(w.name)), c = n.filter((w) => !i.has(w.name)), y = c.slice(0, p.visibleCount), h = [...a, ...y], b = new Set(h.map((w) => w.name)), U = g && !b.has(g) ? n.find((w) => w.name === g) ?? null : null, R = U ? [...h, U] : h, C = Math.max(0, n.length - R.length);
  return e ? {
    visible: n,
    hiddenCount: 0,
    showToggle: c.length > p.visibleCount
  } : {
    visible: R,
    hiddenCount: C,
    showToggle: C > 0
  };
}
const Ke = { class: "recipe-list-page" }, We = { class: "intent-header-bar" }, Ye = { class: "filter-sort-bar" }, He = {
  key: 1,
  class: "recipes-grid"
}, Qe = {
  key: 2,
  class: "empty-state"
}, Ze = /* @__PURE__ */ le({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(u, { emit: p }) {
    const e = p, g = ue(), n = v([]), i = v(""), a = v(null), c = v("title"), y = v(""), h = v([]), b = v([]), U = v([]), R = v(de()), C = v(!1), w = v(!1), B = v(/* @__PURE__ */ new Set());
    function L() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const E = v(L());
    let $ = 0;
    async function K() {
      try {
        const I = await g.api.get("/api/x/core-shortlist");
        B.value = new Set(I.map((k) => k.recipe_id));
      } catch {
      }
    }
    async function W() {
      try {
        const I = await g.api.get("/api/recipes/sources");
        Array.isArray(I) ? b.value = I : I && Array.isArray(I.items) && (b.value = I.items);
      } catch {
      }
    }
    async function V() {
      try {
        const I = await g.api.get("/api/recipes/tags"), k = Array.isArray(I) ? I : I && Array.isArray(I.items) ? I.items : [];
        U.value = k, a.value && !k.some((D) => D.name === a.value) && (a.value = null);
      } catch {
      }
    }
    async function d() {
      w.value = !w.value, w.value && await K();
    }
    async function t() {
      const I = ++$;
      y.value = "";
      try {
        const k = { q: i.value.trim() };
        h.value.length > 0 && (k.source = h.value), a.value && (k.tag = a.value);
        const D = await g.api.get("/api/recipes", k);
        if (I !== $ || (n.value = D.items, !E.value)) return;
        const se = await Promise.all(D.items.map(async (_) => {
          const o = await ye(g.api, _.group_id);
          return { ..._, cover_asset_id: o, cover_url: o ? g.url(`/api/assets/${o}/file`) : null };
        }));
        I === $ && (n.value = se);
      } catch (k) {
        I === $ && (y.value = (k == null ? void 0 : k.message) || "Could not load recipes");
      }
    }
    function s(I) {
      var k;
      e("openRecipe", I), (k = g.navigate) == null || k.call(g, `/recipes/${I}`);
    }
    function T() {
      t(), W(), V();
    }
    const q = g.on("recipe:created", T), S = g.on("recipe:updated", T), F = g.on("recipe:deleted", T);
    pe(() => {
      typeof q == "function" && q(), typeof S == "function" && S(), typeof F == "function" && F();
    }), ve(() => {
      E.value = L(), R.value = de(), ce.value && (h.value = [...ce.value], ce.value = null), t(), K(), W(), V();
    }), ie([i, h, a], t);
    const z = Z(() => {
      const I = [
        { value: "none", label: "No source" }
      ], k = /* @__PURE__ */ new Set(["none"]);
      for (const D of b.value)
        !D.name || k.has(D.name) || (k.add(D.name), I.push({
          value: D.name,
          label: D.author ? `${D.name} (${D.author})` : D.name
        }));
      for (const D of h.value)
        k.has(D) || (k.add(D), I.push({ value: D, label: D }));
      return I;
    }), O = Z(
      () => Ge(U.value, R.value, C.value, a.value)
    ), Y = Z(() => {
      let I = n.value.map((k) => ({ ...k, is_shortlisted: B.value.has(k.id) }));
      return w.value && (I = I.filter((k) => B.value.has(k.id))), I.sort(c.value === "title" ? (k, D) => k.title.localeCompare(D.title) : (k, D) => (k.prep_time_minutes || 0) - (D.prep_time_minutes || 0));
    });
    return (I, k) => {
      const D = A("InputIcon"), se = A("InputText"), _ = A("IconField"), o = A("MultiSelect"), N = A("Button"), M = A("Select"), oe = A("Message");
      return r(), f("div", Ke, [
        k[5] || (k[5] = l(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        l("div", We, [
          m(_, { class: "search-box" }, {
            default: ae(() => [
              m(D, { class: "pi pi-search" }),
              m(se, {
                modelValue: i.value,
                "onUpdate:modelValue": k[0] || (k[0] = (j) => i.value = j),
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
          m(G(ge), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        l("div", Ye, [
          m(G(te), {
            name: "recipe.list.filters",
            context: { active: w.value, toggle: d }
          }, null, 8, ["context"]),
          m(o, {
            modelValue: h.value,
            "onUpdate:modelValue": k[1] || (k[1] = (j) => h.value = j),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: z.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (r(!0), f(
            H,
            null,
            ee(O.value.visible, (j) => (r(), Q(N, {
              key: j.name,
              class: "tag-filter-btn",
              label: `${j.name} (${j.count})`,
              size: "small",
              outlined: a.value !== j.name,
              "aria-pressed": a.value === j.name,
              onClick: (re) => a.value = a.value === j.name ? null : j.name
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          O.value.showToggle ? (r(), Q(N, {
            key: 0,
            class: "tag-more-btn",
            label: C.value ? "Less" : `More (${O.value.hiddenCount})`,
            size: "small",
            text: "",
            "aria-expanded": C.value,
            onClick: k[2] || (k[2] = (j) => C.value = !C.value)
          }, null, 8, ["label", "aria-expanded"])) : x("v-if", !0),
          m(M, {
            modelValue: c.value,
            "onUpdate:modelValue": k[3] || (k[3] = (j) => c.value = j),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        y.value ? (r(), Q(oe, {
          key: 0,
          severity: "error"
        }, {
          default: ae(() => [
            X(
              P(y.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        Y.value.length ? (r(), f("div", He, [
          (r(!0), f(
            H,
            null,
            ee(Y.value, (j) => (r(), Q(qe, {
              key: j.id,
              recipe: j,
              "show-cover": E.value,
              onSelect: s
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (r(), f("div", Qe, [
          k[4] || (k[4] = l(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          m(G(ge), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), Xe = /* @__PURE__ */ ne(Ze, [["__scopeId", "data-v-f464e100"]]);
function et(u) {
  const p = (u.title || "").trim() || "this recipe", e = Array.isArray(u.languages) ? u.languages.filter(Boolean) : [];
  return `${e.length > 1 ? `Delete '${p}' and all ${e.length} language versions (${e.map((n) => n.toUpperCase()).join(", ")})?` : `Delete '${p}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function Ce(u) {
  if (u.group_id) return u.group_id;
  if (u.id) {
    const p = u.id.indexOf("_");
    return p === -1 ? u.id : u.id.slice(0, p);
  }
  return "";
}
function Se(u, p) {
  const e = u == null ? void 0 : u.entity_id;
  return !e || !p ? !1 : p.id && e === p.id ? !0 : p.group_id ? e === p.group_id || e.startsWith(`${p.group_id}_`) : !1;
}
async function Ie(u, p) {
  var n;
  const e = Ce(p);
  return !e || !await u.confirm({
    header: "Delete recipe",
    message: et(p),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await u.api.delete(`/api/recipes/${e}`), u.notify({ level: "success", message: "Recipe deleted" }), (n = u.navigate) == null || n.call(u, "/recipes"), !0);
}
const tt = { class: "recipe-detail-page" }, lt = {
  key: 0,
  class: "lang-bar"
}, nt = { class: "detail-header" }, ot = {
  key: 0,
  class: "recipe-source-attribution"
}, it = {
  key: 0,
  class: "source-locator"
}, at = {
  key: 1,
  class: "source-author"
}, st = ["href"], ut = {
  key: 3,
  class: "source-notes"
}, rt = { key: 1 }, ct = { class: "detail-actions" }, dt = ["src", "alt"], pt = { class: "scaler-card" }, vt = { class: "servings-value" }, mt = {
  key: 2,
  class: "content-grid"
}, ft = { class: "ingredient-checklist" }, gt = ["for"], _t = {
  key: 0,
  class: "notes"
}, yt = { class: "steps-list" }, bt = /* @__PURE__ */ le({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(u, { emit: p }) {
    const e = u, g = p, n = ue(), i = v(null), a = v(2), c = v({}), y = v(""), h = v(!1), b = v(null), U = v(!1), R = Z(() => e.id || e.recipeId || ""), C = v(null), w = v(!1);
    let B = 0;
    const L = n.on("recipe:deleted", (d) => {
      var t;
      w.value || !i.value || Se(d, i.value) && (n.notify({ level: "info", message: "This recipe was deleted" }), (t = n.navigate) == null || t.call(n, "/recipes"));
    });
    pe(() => {
      typeof L == "function" && L();
    }), ie(R, async (d) => {
      if (!d) return;
      const t = ++B;
      y.value = "", C.value = null, b.value = null, U.value = !1;
      try {
        const s = await n.api.get(`/api/recipes/${d}`);
        if (t !== B) return;
        i.value = s, a.value = s.servings || 2, c.value = {}, h.value = !1;
        const T = await ye(n.api, s.group_id);
        if (t !== B) return;
        C.value = T;
        try {
          const q = await n.api.get("/api/x/core-shortlist");
          t === B && (h.value = q.some((S) => S.recipe_id === d));
        } catch {
        }
      } catch (s) {
        t === B && (i.value = null, y.value = (s == null ? void 0 : s.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function E(d) {
      var t;
      g("switchLanguage", d), (t = n.navigate) == null || t.call(n, `/recipes/${d}`);
    }
    const $ = Z(() => {
      var t, s;
      const d = ((t = b.value) == null ? void 0 : t.source) ?? ((s = i.value) == null ? void 0 : s.source);
      return d && d.name ? d : null;
    });
    function K(d) {
      var t;
      ce.value = [d], (t = n.navigate) == null || t.call(n, "/recipes");
    }
    function W(d) {
      var s;
      if (d == null) return "";
      const t = d * a.value / (((s = i.value) == null ? void 0 : s.servings) || 1);
      return Number.isInteger(t) ? String(t) : t.toFixed(1);
    }
    const V = Z(() => ({
      recipe: i.value,
      customizedRecipe: b.value,
      customizeOpen: U.value,
      currentServings: a.value,
      checkedIngredients: c.value,
      setCustomizeOpen: (d) => {
        U.value = d;
      },
      applyCustomization: (d) => {
        b.value = d, c.value = {}, d != null && d.servings && (a.value = d.servings);
      },
      resetCustomization: () => {
        b.value = null, c.value = {}, i.value && (a.value = i.value.servings || 2);
      },
      onRecipeUpdated: (d) => {
        i.value = d, b.value = null, U.value = !1, c.value = {}, a.value = d.servings || 2;
      },
      setCheckedIngredients: (d) => {
        c.value = d;
      }
    }));
    return (d, t) => {
      var F, z;
      const s = A("Button"), T = A("Message"), q = A("Checkbox"), S = A("Tag");
      return r(), f("div", tt, [
        m(s, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: t[0] || (t[0] = (O) => {
            var Y, I;
            return (I = (Y = G(n)).navigate) == null ? void 0 : I.call(Y, "/recipes");
          })
        }),
        y.value ? (r(), Q(T, {
          key: 0,
          severity: "error"
        }, {
          default: ae(() => [
            X(
              P(y.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        i.value ? (r(), f(
          H,
          { key: 1 },
          [
            ((F = i.value.languages) == null ? void 0 : F.length) > 1 ? (r(), f("div", lt, [
              t[4] || (t[4] = l(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (r(!0), f(
                H,
                null,
                ee(i.value.languages, (O) => (r(), Q(s, {
                  key: O,
                  label: O.toUpperCase(),
                  size: "small",
                  outlined: O !== i.value.language,
                  onClick: (Y) => E(`${i.value.group_id}_${O}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : x("v-if", !0),
            l("div", nt, [
              l("div", null, [
                l(
                  "h1",
                  null,
                  P(((z = b.value) == null ? void 0 : z.title) || i.value.title),
                  1
                  /* TEXT */
                ),
                $.value ? (r(), f("div", ot, [
                  l(
                    "i",
                    {
                      class: fe(G($e)($.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  t[6] || (t[6] = l(
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
                      onClick: t[1] || (t[1] = (O) => K($.value.name))
                    },
                    P($.value.name),
                    1
                    /* TEXT */
                  ),
                  $.value.type === "cookbook" && $.value.page ? (r(), f(
                    "span",
                    it,
                    ", p. " + P($.value.page),
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  $.value.author ? (r(), f(
                    "span",
                    at,
                    " by " + P($.value.author),
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  $.value.url ? (r(), f("a", {
                    key: 2,
                    href: $.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...t[5] || (t[5] = [
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
                  ])], 8, st)) : x("v-if", !0),
                  $.value.notes ? (r(), f(
                    "span",
                    ut,
                    " — " + P($.value.notes),
                    1
                    /* TEXT */
                  )) : x("v-if", !0)
                ])) : x("v-if", !0),
                !b.value && i.value.description ? (r(), f(
                  "p",
                  rt,
                  P(i.value.description),
                  1
                  /* TEXT */
                )) : x("v-if", !0)
              ]),
              l("div", ct, [
                m(G(te), {
                  name: "recipe.detail.actions",
                  context: V.value
                }, null, 8, ["context"]),
                m(G(te), {
                  name: "recipe.card.actions",
                  context: { recipe: i.value, isShortlisted: h.value }
                }, null, 8, ["context"]),
                m(G(ge), {
                  hub: "recipe:actions",
                  context: { recipe: i.value, onBeforeDelete: () => {
                    w.value = !0;
                  }, onDeleteAborted: () => {
                    w.value = !1;
                  } },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            C.value ? (r(), f("img", {
              key: 1,
              src: G(n).url(`/api/assets/${C.value}/file`),
              alt: i.value.title,
              class: "recipe-cover"
            }, null, 8, dt)) : x("v-if", !0),
            l("div", pt, [
              t[7] || (t[7] = l(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              m(s, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: a.value <= 1,
                onClick: t[2] || (t[2] = (O) => a.value--)
              }, null, 8, ["disabled"]),
              l(
                "span",
                vt,
                P(a.value),
                1
                /* TEXT */
              ),
              m(s, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: t[3] || (t[3] = (O) => a.value++)
              })
            ]),
            m(G(te), {
              name: "recipe.detail.customize",
              context: V.value
            }, null, 8, ["context"]),
            b.value ? x("v-if", !0) : (r(), f("div", mt, [
              l("section", null, [
                t[8] || (t[8] = l(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                l("ul", ft, [
                  (r(!0), f(
                    H,
                    null,
                    ee(i.value.ingredients, (O, Y) => (r(), f("li", {
                      key: Y,
                      class: "ingredient-item"
                    }, [
                      m(q, {
                        inputId: `ingredient-${Y}`,
                        modelValue: c.value[Y],
                        "onUpdate:modelValue": (I) => c.value[Y] = I,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      l("label", {
                        for: `ingredient-${Y}`,
                        class: fe({ struck: c.value[Y] })
                      }, [
                        l(
                          "strong",
                          null,
                          P(W(O.quantity)),
                          1
                          /* TEXT */
                        ),
                        X(
                          " " + P(O.unit) + " " + P(O.name),
                          1
                          /* TEXT */
                        ),
                        O.notes ? (r(), f(
                          "span",
                          _t,
                          " (" + P(O.notes) + ")",
                          1
                          /* TEXT */
                        )) : x("v-if", !0)
                      ], 10, gt)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              l("section", null, [
                t[9] || (t[9] = l(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                l("ol", yt, [
                  (r(!0), f(
                    H,
                    null,
                    ee(i.value.steps, (O) => (r(), f("li", {
                      key: O.id
                    }, [
                      l(
                        "p",
                        null,
                        P(O.instruction),
                        1
                        /* TEXT */
                      ),
                      O.timer_minutes ? (r(), Q(S, {
                        key: 0,
                        value: `${O.timer_minutes} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : x("v-if", !0)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ])
            ])),
            m(G(te), {
              name: "recipe.detail.sidebar",
              context: { recipe: i.value }
            }, null, 8, ["context"]),
            m(G(te), {
              name: "recipe.detail.footer",
              context: { recipe: i.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : x("v-if", !0)
      ]);
    };
  }
}), ht = /* @__PURE__ */ ne(bt, [["__scopeId", "data-v-678e2974"]]), kt = { class: "ingredient-row-list" }, $t = { class: "reorder-btns" }, wt = /* @__PURE__ */ le({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: p }) {
    const e = u, g = p, n = v(JSON.parse(JSON.stringify(e.modelValue || [])));
    ie(() => e.modelValue, (b) => {
      n.value = JSON.parse(JSON.stringify(b || []));
    }, { deep: !0 });
    const i = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((b) => ({ id: b, label: b || "(none)" }));
    function a() {
      g("update:modelValue", n.value);
    }
    function c() {
      n.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), a();
    }
    function y(b) {
      n.value.splice(b, 1), a();
    }
    function h(b, U) {
      const R = b + U;
      R < 0 || R >= n.value.length || (n.value.splice(R, 0, n.value.splice(b, 1)[0]), a());
    }
    return (b, U) => {
      const R = A("Button"), C = A("InputNumber"), w = A("Select"), B = A("InputText");
      return r(), f("div", kt, [
        (r(!0), f(
          H,
          null,
          ee(n.value, (L, E) => (r(), f("div", {
            key: L.id,
            class: "ingredient-row"
          }, [
            l("div", $t, [
              m(R, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: E === 0,
                onClick: ($) => h(E, -1)
              }, null, 8, ["disabled", "onClick"]),
              m(R, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: E === n.value.length - 1,
                onClick: ($) => h(E, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            m(C, {
              modelValue: L.quantity,
              "onUpdate:modelValue": [($) => L.quantity = $, a],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${E + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            m(w, {
              modelValue: L.unit,
              "onUpdate:modelValue": [($) => L.unit = $, a],
              options: G(i),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${E + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            m(B, {
              modelValue: L.name,
              "onUpdate:modelValue": ($) => L.name = $,
              class: "input-name",
              "aria-label": `Ingredient ${E + 1} name`,
              placeholder: "Ingredient name",
              onInput: a
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            m(B, {
              modelValue: L.notes,
              "onUpdate:modelValue": ($) => L.notes = $,
              class: "input-notes",
              "aria-label": `Ingredient ${E + 1} notes`,
              placeholder: "Notes",
              onInput: a
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            m(R, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: ($) => y(E)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        m(R, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: c
        })
      ]);
    };
  }
}), Vt = /* @__PURE__ */ ne(wt, [["__scopeId", "data-v-6a40d29c"]]), Ct = { class: "step-list" }, St = { class: "step-inputs" }, It = { class: "timer-row" }, Tt = ["for"], At = /* @__PURE__ */ le({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: p }) {
    const e = u, g = p, n = v(JSON.parse(JSON.stringify(e.modelValue || [])));
    ie(() => e.modelValue, (y) => {
      n.value = JSON.parse(JSON.stringify(y || []));
    }, { deep: !0 });
    function i() {
      g("update:modelValue", n.value);
    }
    function a() {
      n.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), i();
    }
    function c(y) {
      n.value.splice(y, 1), i();
    }
    return (y, h) => {
      const b = A("Tag"), U = A("Textarea"), R = A("InputNumber"), C = A("Button");
      return r(), f("div", Ct, [
        (r(!0), f(
          H,
          null,
          ee(n.value, (w, B) => (r(), f("div", {
            key: w.id,
            class: "step-row"
          }, [
            m(b, {
              value: String(B + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            l("div", St, [
              m(U, {
                modelValue: w.instruction,
                "onUpdate:modelValue": (L) => w.instruction = L,
                class: "textarea-instruction",
                "aria-label": `Step ${B + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: i
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              l("div", It, [
                l("label", {
                  for: `timer-${w.id}`
                }, "Timer (min)", 8, Tt),
                m(R, {
                  inputId: `timer-${w.id}`,
                  modelValue: w.timer_minutes,
                  "onUpdate:modelValue": [(L) => w.timer_minutes = L, i],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            m(C, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (L) => c(B)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        m(C, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: a
        })
      ]);
    };
  }
}), Ut = /* @__PURE__ */ ne(At, [["__scopeId", "data-v-4c4135f0"]]), Rt = { class: "source-editor" }, xt = { class: "source-header" }, Lt = { class: "source-grid" }, Nt = { class: "form-group" }, Pt = { class: "form-group source-name-field" }, Dt = { class: "source-suggestion" }, Bt = { class: "suggestion-name" }, Ot = { class: "suggestion-meta" }, zt = {
  key: 0,
  class: "form-group"
}, Mt = {
  key: 1,
  class: "form-group"
}, Et = {
  key: 2,
  class: "form-group source-url-field"
}, qt = {
  key: 3,
  class: "form-group source-notes-field"
}, Ft = /* @__PURE__ */ le({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(u, { emit: p }) {
    const e = u, g = p, n = ue(), i = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], a = v("cookbook"), c = v(""), y = v(""), h = v(""), b = v(""), U = v(""), R = v([]), C = v([]);
    let w = !1;
    function B(t) {
      w = !0, t && t.name ? (a.value = t.type || "other", c.value = t.name || "", y.value = t.author || "", h.value = t.page || "", b.value = t.url || "", U.value = t.notes || "") : (c.value = "", y.value = "", h.value = "", b.value = "", U.value = ""), w = !1;
    }
    ie(() => e.modelValue, B, { immediate: !0, deep: !0 });
    function L() {
      if (w) return;
      const t = c.value.trim();
      if (!t) {
        g("update:modelValue", null);
        return;
      }
      const s = {
        type: a.value,
        name: t
      }, T = y.value.trim(), q = h.value.trim(), S = b.value.trim(), F = U.value.trim();
      T && (s.author = T), a.value === "cookbook" && q && (s.page = q), (a.value === "website" || a.value === "other") && S && (s.url = S), F && (s.notes = F), g("update:modelValue", s);
    }
    ie([a, c, y, h, b, U], L), ve(async () => {
      var t, s;
      try {
        const T = await ((s = (t = n.api) == null ? void 0 : t.get) == null ? void 0 : s.call(t, "/api/recipes/sources"));
        Array.isArray(T) ? R.value = T : T && Array.isArray(T.items) && (R.value = T.items);
      } catch {
      }
    });
    function E(t) {
      const s = (t.query || "").trim().toLowerCase();
      if (!s) {
        C.value = [...R.value];
        return;
      }
      C.value = R.value.filter(
        (T) => T.name.toLowerCase().includes(s) || T.author && T.author.toLowerCase().includes(s)
      );
    }
    function $(t) {
      t && typeof t == "object" ? (c.value = t.name || "", t.type && (a.value = t.type), (t.author && !y.value.trim() || t.author) && (y.value = t.author)) : c.value = typeof t == "string" ? t : "";
    }
    function K(t) {
      const s = t == null ? void 0 : t.value;
      s && (c.value = s.name, s.type && (a.value = s.type), s.author && (y.value = s.author));
    }
    function W() {
      c.value = "", y.value = "", h.value = "", b.value = "", U.value = "", g("update:modelValue", null);
    }
    const V = Z(
      () => !!(c.value.trim() || y.value.trim() || h.value.trim() || b.value.trim() || U.value.trim())
    ), d = Z(() => {
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
    return (t, s) => {
      const T = A("Button"), q = A("Select"), S = A("AutoComplete"), F = A("InputText");
      return r(), f("fieldset", Rt, [
        l("div", xt, [
          s[5] || (s[5] = l(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          V.value ? (r(), Q(T, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: W
          })) : x("v-if", !0)
        ]),
        l("div", Lt, [
          l("div", Nt, [
            s[6] || (s[6] = l(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            m(q, {
              inputId: "recipe-source-type",
              modelValue: a.value,
              "onUpdate:modelValue": s[0] || (s[0] = (z) => a.value = z),
              options: i,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", Pt, [
            s[7] || (s[7] = l(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            m(S, {
              inputId: "recipe-source-name",
              modelValue: c.value,
              suggestions: C.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: d.value,
              fluid: "",
              "onUpdate:modelValue": $,
              onComplete: E,
              onItemSelect: K
            }, {
              option: ae(({ option: z }) => [
                l("div", Dt, [
                  l(
                    "span",
                    Bt,
                    P(z.name),
                    1
                    /* TEXT */
                  ),
                  l("small", Ot, [
                    X(
                      P(G(Ue)(z.type)),
                      1
                      /* TEXT */
                    ),
                    z.author ? (r(), f(
                      H,
                      { key: 0 },
                      [
                        X(
                          " · " + P(z.author),
                          1
                          /* TEXT */
                        )
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : x("v-if", !0)
                  ])
                ])
              ]),
              _: 1
              /* STABLE */
            }, 8, ["modelValue", "suggestions", "placeholder"])
          ]),
          a.value !== "person" ? (r(), f("div", zt, [
            s[8] || (s[8] = l(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            m(F, {
              id: "recipe-source-author",
              modelValue: y.value,
              "onUpdate:modelValue": s[1] || (s[1] = (z) => y.value = z),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          a.value === "cookbook" ? (r(), f("div", Mt, [
            s[9] || (s[9] = l(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            m(F, {
              id: "recipe-source-page",
              modelValue: h.value,
              "onUpdate:modelValue": s[2] || (s[2] = (z) => h.value = z),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          a.value === "website" || a.value === "other" ? (r(), f("div", Et, [
            s[10] || (s[10] = l(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            m(F, {
              id: "recipe-source-url",
              modelValue: b.value,
              "onUpdate:modelValue": s[3] || (s[3] = (z) => b.value = z),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          a.value === "person" || a.value === "other" ? (r(), f("div", qt, [
            s[11] || (s[11] = l(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            m(F, {
              id: "recipe-source-notes",
              modelValue: U.value,
              "onUpdate:modelValue": s[4] || (s[4] = (z) => U.value = z),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0)
        ])
      ]);
    };
  }
}), Jt = /* @__PURE__ */ ne(Ft, [["__scopeId", "data-v-267c9e36"]]), jt = { class: "edit-top-bar" }, Gt = { class: "edit-top-actions" }, Kt = { class: "form-group" }, Wt = { class: "form-group" }, Yt = { class: "form-row" }, Ht = { class: "form-group" }, Qt = { class: "form-group" }, Zt = { class: "form-group" }, Xt = { class: "form-group" }, el = { class: "form-group" }, tl = { class: "form-group" }, ll = ["disabled"], nl = { key: 0 }, ol = { key: 1 }, il = ["src"], al = { class: "actions-row" }, sl = /* @__PURE__ */ le({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(u, { emit: p }) {
    var se;
    const e = u, g = p, n = ue(), i = Z(() => e.id || e.recipeId || ""), a = v(""), c = v(""), y = v(((se = n.store.household.value) == null ? void 0 : se.languages.primary) || "en"), h = v(2), b = v(""), U = v(null), R = v(null), C = v([]), w = v(null), B = v([]), L = v([]), E = v(null), $ = v(null), K = v([]), W = v([]), V = v(1), d = v([]), t = v(!1), s = v(!1), T = v(!1), q = v(""), S = n.on("recipe:deleted", (_) => {
      s.value || !i.value || Se(_, { id: i.value, group_id: b.value }) && (T.value = !0);
    });
    pe(() => {
      typeof S == "function" && S();
    }), ve(async () => {
      var _, o;
      try {
        const N = await ((o = (_ = n.api) == null ? void 0 : _.get) == null ? void 0 : o.call(_, "/api/recipes/tags"));
        Array.isArray(N) ? B.value = N : N && Array.isArray(N.items) && (B.value = N.items);
      } catch {
      }
    });
    function F(_) {
      const o = (_.query || "").trim().toLowerCase(), N = new Set(C.value);
      L.value = B.value.map((M) => M.name).filter((M) => !N.has(M) && (!o || M.toLowerCase().includes(o)));
    }
    function z(_) {
      var M, oe;
      const o = _.target;
      if (!o || o.tagName !== "INPUT" || o.getAttribute("aria-activedescendant")) return;
      const N = o.value.trim();
      N && (_.preventDefault(), _.stopPropagation(), C.value.includes(N) || (C.value = [...C.value, N]), o.value = "", L.value = [], (oe = (M = E.value) == null ? void 0 : M.hide) == null || oe.call(M));
    }
    ie(i, async (_) => {
      if (T.value = !1, !!_)
        try {
          const o = await n.api.get(`/api/recipes/${_}`);
          a.value = o.title, c.value = o.description || "", y.value = o.language, h.value = o.servings, U.value = o.prep_time_minutes, R.value = o.cook_time_minutes, C.value = [...o.tags], $.value = o.source || null, K.value = o.ingredients, W.value = o.steps, V.value = o.revision, d.value = o.languages || [], w.value = await ye(n.api, o.group_id), b.value = o.group_id;
        } catch (o) {
          q.value = (o == null ? void 0 : o.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function O(_) {
      var N;
      const o = (N = _.target.files) == null ? void 0 : N[0];
      if (!(!o || t.value || !b.value)) {
        t.value = !0, q.value = "";
        try {
          const M = new FormData();
          M.append("file", o), M.append("entity_type", "recipe"), M.append("entity_id", b.value), M.append("slot", "cover"), w.value = (await n.api.upload("/api/assets", M)).id, n.notify({ level: "success", message: "Cover image saved" });
        } catch (M) {
          q.value = (M == null ? void 0 : M.message) || "Could not upload image";
        } finally {
          t.value = !1;
        }
      }
    }
    async function Y() {
      var o;
      if (!a.value.trim() || t.value || T.value) return;
      t.value = !0, q.value = "";
      const _ = {
        title: a.value.trim(),
        description: c.value.trim(),
        language: y.value,
        servings: h.value,
        prep_time_minutes: U.value,
        cook_time_minutes: R.value,
        tags: C.value,
        ingredients: K.value,
        steps: W.value
      };
      ($.value !== null || i.value) && (_.source = $.value);
      try {
        const N = i.value ? await n.api.patch(`/api/recipes/${i.value}`, { ..._, revision: V.value }) : await n.api.post("/api/recipes", _);
        g("saved", N), n.notify({ level: "success", message: "Recipe saved" }), (o = n.navigate) == null || o.call(n, `/recipes/${N.id}`);
      } catch (N) {
        q.value = (N == null ? void 0 : N.message) || "Could not save recipe";
      } finally {
        t.value = !1;
      }
    }
    async function I() {
      if (!(!i.value || t.value || T.value)) {
        t.value = !0, s.value = !0, q.value = "";
        try {
          await Ie(n, {
            id: i.value,
            group_id: b.value || void 0,
            title: a.value.trim() || "this recipe",
            languages: d.value
          }) || (s.value = !1);
        } catch (_) {
          s.value = !1, q.value = (_ == null ? void 0 : _.message) || "Could not delete recipe";
        } finally {
          t.value = !1;
        }
      }
    }
    function k(_) {
      _.title && (a.value = _.title), _.description !== void 0 && (c.value = _.description || ""), _.servings && (h.value = _.servings), _.prep_time_minutes !== void 0 && (U.value = _.prep_time_minutes), _.cook_time_minutes !== void 0 && (R.value = _.cook_time_minutes), _.tags && (C.value = [..._.tags]), _.source !== void 0 && ($.value = _.source || null), _.ingredients && (K.value = [..._.ingredients]), _.steps && (W.value = [..._.steps]);
    }
    const D = Z(() => ({
      targetId: i.value,
      recipe: {
        id: i.value,
        title: a.value,
        description: c.value,
        language: y.value,
        servings: h.value,
        prep_time_minutes: U.value,
        cook_time_minutes: R.value,
        tags: C.value,
        source: $.value,
        ingredients: K.value,
        steps: W.value
      },
      applyAdaptation: k
    }));
    return (_, o) => {
      const N = A("Button"), M = A("Message"), oe = A("InputText"), j = A("Textarea"), re = A("InputNumber"), Te = A("AutoComplete");
      return r(), f(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: me(Y, ["prevent"])
        },
        [
          l("div", jt, [
            l(
              "h2",
              null,
              P(i.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            l("div", Gt, [
              m(G(te), {
                name: "recipe.edit.actions",
                context: D.value
              }, null, 8, ["context"]),
              m(N, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: t.value,
                onClick: o[0] || (o[0] = (J) => {
                  var be, he;
                  return (he = (be = G(n)).navigate) == null ? void 0 : he.call(be, i.value ? `/recipes/${i.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          T.value ? (r(), Q(M, {
            key: 0,
            severity: "warn"
          }, {
            default: ae(() => [...o[11] || (o[11] = [
              X(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : x("v-if", !0),
          q.value ? (r(), Q(M, {
            key: 1,
            severity: "error"
          }, {
            default: ae(() => [
              X(
                P(q.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : x("v-if", !0),
          l("div", Kt, [
            o[12] || (o[12] = l(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            m(oe, {
              id: "recipe-title",
              modelValue: a.value,
              "onUpdate:modelValue": o[1] || (o[1] = (J) => a.value = J),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", Wt, [
            o[13] || (o[13] = l(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            m(j, {
              id: "recipe-description",
              modelValue: c.value,
              "onUpdate:modelValue": o[2] || (o[2] = (J) => c.value = J),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          l("div", Yt, [
            l("div", Ht, [
              o[14] || (o[14] = l(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              m(oe, {
                id: "recipe-language",
                modelValue: y.value,
                "onUpdate:modelValue": o[3] || (o[3] = (J) => y.value = J),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Qt, [
              o[15] || (o[15] = l(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              m(re, {
                inputId: "recipe-servings",
                modelValue: h.value,
                "onUpdate:modelValue": o[4] || (o[4] = (J) => h.value = J),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Zt, [
              o[16] || (o[16] = l(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              m(re, {
                inputId: "recipe-prep",
                modelValue: U.value,
                "onUpdate:modelValue": o[5] || (o[5] = (J) => U.value = J),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            l("div", Xt, [
              o[17] || (o[17] = l(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              m(re, {
                inputId: "recipe-cook",
                modelValue: R.value,
                "onUpdate:modelValue": o[6] || (o[6] = (J) => R.value = J),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          l("div", el, [
            o[18] || (o[18] = l(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            m(Te, {
              ref_key: "tagAutoComplete",
              ref: E,
              inputId: "recipe-tags",
              modelValue: C.value,
              "onUpdate:modelValue": o[7] || (o[7] = (J) => C.value = J),
              multiple: "",
              suggestions: L.value,
              delay: 0,
              onComplete: F,
              onKeydown: Ae(z, ["enter"]),
              fluid: ""
            }, null, 8, ["modelValue", "suggestions"])
          ]),
          m(Jt, {
            modelValue: $.value,
            "onUpdate:modelValue": o[8] || (o[8] = (J) => $.value = J)
          }, null, 8, ["modelValue"]),
          l("div", tl, [
            o[19] || (o[19] = l(
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
              disabled: t.value || !b.value,
              onChange: O
            }, null, 40, ll),
            i.value ? (r(), f("small", ol, "Cover uploads are saved immediately, separately from recipe edits.")) : (r(), f("small", nl, "Save your recipe first to add a cover image.")),
            w.value ? (r(), f("img", {
              key: 2,
              src: G(n).url(`/api/assets/${w.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, il)) : x("v-if", !0)
          ]),
          l("section", null, [
            o[20] || (o[20] = l(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            m(Vt, {
              modelValue: K.value,
              "onUpdate:modelValue": o[9] || (o[9] = (J) => K.value = J)
            }, null, 8, ["modelValue"])
          ]),
          l("section", null, [
            o[21] || (o[21] = l(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            m(Ut, {
              modelValue: W.value,
              "onUpdate:modelValue": o[10] || (o[10] = (J) => W.value = J)
            }, null, 8, ["modelValue"])
          ]),
          l("div", al, [
            i.value ? (r(), Q(N, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: s.value && t.value,
              disabled: t.value || T.value,
              onClick: I
            }, null, 8, ["loading", "disabled"])) : x("v-if", !0),
            m(N, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: t.value && !s.value,
              disabled: !a.value.trim() || t.value || T.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ke = /* @__PURE__ */ ne(sl, [["__scopeId", "data-v-c798b480"]]), ul = { class: "ss-recipe-tag-settings" }, rl = { class: "tag-settings-group" }, cl = { class: "device-toggle" }, dl = { class: "limit-field" }, pl = {
  key: 0,
  class: "pinned-list"
}, vl = { class: "tag-list" }, ml = ["data-pinned-tag"], fl = { class: "tag-row-label" }, gl = {
  key: 1,
  class: "muted"
}, _l = { class: "tag-row-actions" }, yl = { class: "tag-settings-group" }, bl = {
  key: 1,
  class: "muted"
}, hl = {
  key: 2,
  class: "tag-list"
}, kl = ["data-tag-name"], $l = { class: "tag-row-label" }, wl = { class: "tag-row-actions" }, Vl = /* @__PURE__ */ le({
  __name: "RecipeTagSettings",
  setup(u) {
    var $, K, W;
    const p = ue(), e = v(de()), g = v(String(e.value.visibleCount)), n = v([]), i = v(!1), a = v(""), c = Z(() => new Set(e.value.pinnedTags)), y = Z(() => new Map(n.value.map((V) => [V.name, V.count])));
    function h(V) {
      e.value = Je(V), g.value = String(e.value.visibleCount);
    }
    function b(V) {
      h({ ...e.value, showAll: V });
    }
    function U() {
      const V = String(g.value ?? "").trim(), d = V === "" ? Number.NaN : Number(V);
      if (!Number.isInteger(d) || d < 0) {
        g.value = String(e.value.visibleCount);
        return;
      }
      h({ ...e.value, visibleCount: d });
    }
    function R(V) {
      const d = c.value.has(V) ? e.value.pinnedTags.filter((t) => t !== V) : [...e.value.pinnedTags, V];
      h({ ...e.value, pinnedTags: d });
    }
    function C(V, d) {
      const t = [...e.value.pinnedTags], s = V + d;
      s < 0 || s >= t.length || ([t[V], t[s]] = [t[s], t[V]], h({ ...e.value, pinnedTags: t }));
    }
    async function w() {
      i.value = !0, a.value = "";
      try {
        const V = await p.api.get("/api/recipes/tags");
        n.value = Array.isArray(V) ? V : V && Array.isArray(V.items) ? V.items : [];
      } catch (V) {
        a.value = (V == null ? void 0 : V.message) || "Could not load recipe tags";
      } finally {
        i.value = !1;
      }
    }
    const B = ($ = p.on) == null ? void 0 : $.call(p, "recipe:created", w), L = (K = p.on) == null ? void 0 : K.call(p, "recipe:updated", w), E = (W = p.on) == null ? void 0 : W.call(p, "recipe:deleted", w);
    return pe(() => {
      typeof B == "function" && B(), typeof L == "function" && L(), typeof E == "function" && E();
    }), ve(() => {
      e.value = de(), g.value = String(e.value.visibleCount), w();
    }), (V, d) => {
      const t = A("ToggleSwitch"), s = A("InputText"), T = A("Button"), q = A("Message");
      return r(), f("div", ul, [
        l("section", rl, [
          d[5] || (d[5] = l(
            "h3",
            null,
            "Display on this device",
            -1
            /* CACHED */
          )),
          d[6] || (d[6] = l(
            "p",
            { class: "section-help" },
            " These display preferences apply only to this device. Pinned tags always appear first on the Recipes overview, followed by your top unpinned tags. ",
            -1
            /* CACHED */
          )),
          l("div", cl, [
            m(t, {
              inputId: "tag-show-all",
              "aria-label": "Show all tags",
              modelValue: e.value.showAll,
              "onUpdate:modelValue": b
            }, null, 8, ["modelValue"]),
            d[1] || (d[1] = l(
              "label",
              { for: "tag-show-all" },
              "Show all tags",
              -1
              /* CACHED */
            ))
          ]),
          l("div", dl, [
            d[2] || (d[2] = l(
              "label",
              { for: "tag-visible-count" },
              "Top tags to show",
              -1
              /* CACHED */
            )),
            m(s, {
              id: "tag-visible-count",
              modelValue: g.value,
              "onUpdate:modelValue": d[0] || (d[0] = (S) => g.value = S),
              type: "number",
              min: "0",
              step: "1",
              disabled: e.value.showAll,
              onChange: U
            }, null, 8, ["modelValue", "disabled"]),
            d[3] || (d[3] = l(
              "small",
              { class: "field-help" },
              "Set to 0 to show only pinned tags until you click More.",
              -1
              /* CACHED */
            ))
          ]),
          e.value.pinnedTags.length ? (r(), f("div", pl, [
            d[4] || (d[4] = l(
              "h4",
              null,
              "Pinned order (this device)",
              -1
              /* CACHED */
            )),
            l("ul", vl, [
              (r(!0), f(
                H,
                null,
                ee(e.value.pinnedTags, (S, F) => (r(), f("li", {
                  key: S,
                  class: "tag-row",
                  "data-pinned-tag": S
                }, [
                  l("span", fl, [
                    X(
                      P(S) + " ",
                      1
                      /* TEXT */
                    ),
                    y.value.has(S) ? (r(), f(
                      H,
                      { key: 0 },
                      [
                        X(
                          " (" + P(y.value.get(S)) + ")",
                          1
                          /* TEXT */
                        )
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : (r(), f("small", gl, " (0 recipes — hidden on overview)"))
                  ]),
                  l("div", _l, [
                    m(T, {
                      icon: "pi pi-arrow-up",
                      size: "small",
                      text: "",
                      "aria-label": `Move ${S} up`,
                      disabled: F === 0,
                      onClick: (z) => C(F, -1)
                    }, null, 8, ["aria-label", "disabled", "onClick"]),
                    m(T, {
                      icon: "pi pi-arrow-down",
                      size: "small",
                      text: "",
                      "aria-label": `Move ${S} down`,
                      disabled: F === e.value.pinnedTags.length - 1,
                      onClick: (z) => C(F, 1)
                    }, null, 8, ["aria-label", "disabled", "onClick"]),
                    m(T, {
                      label: "Unpin",
                      size: "small",
                      text: "",
                      "aria-label": `Unpin ${S}`,
                      onClick: (z) => R(S)
                    }, null, 8, ["aria-label", "onClick"])
                  ])
                ], 8, ml))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])) : x("v-if", !0)
        ]),
        l("section", yl, [
          d[7] || (d[7] = l(
            "h3",
            null,
            "Household tags",
            -1
            /* CACHED */
          )),
          d[8] || (d[8] = l(
            "p",
            { class: "section-help" },
            " Tags aggregated across all Recipes in your household. Pinning affects only this device. ",
            -1
            /* CACHED */
          )),
          a.value ? (r(), Q(q, {
            key: 0,
            severity: "error"
          }, {
            default: ae(() => [
              X(
                P(a.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : !i.value && !n.value.length ? (r(), f("p", bl, "No tags in your household recipes yet.")) : (r(), f("ul", hl, [
            (r(!0), f(
              H,
              null,
              ee(n.value, (S) => (r(), f("li", {
                key: S.name,
                class: "tag-row",
                "data-tag-name": S.name
              }, [
                l(
                  "span",
                  $l,
                  P(S.name) + " (" + P(S.count) + ")",
                  1
                  /* TEXT */
                ),
                l("div", wl, [
                  m(T, {
                    label: c.value.has(S.name) ? "Unpin" : "Pin",
                    size: "small",
                    outlined: !c.value.has(S.name),
                    "aria-label": `${c.value.has(S.name) ? "Unpin" : "Pin"} ${S.name}`,
                    onClick: (F) => R(S.name)
                  }, null, 8, ["label", "outlined", "aria-label", "onClick"])
                ])
              ], 8, kl))),
              128
              /* KEYED_FRAGMENT */
            ))
          ]))
        ])
      ]);
    };
  }
}), Cl = /* @__PURE__ */ ne(Vl, [["__scopeId", "data-v-3d8da4bb"]]);
function Tl(u) {
  var p;
  u.route({ path: "/recipes", component: Xe, nav: { label: "Recipes", icon: "book", order: 10 } }), u.route({ path: "/recipes/new", component: ke }), u.route({ path: "/recipes/:id", component: ht }), u.route({ path: "/recipes/:id/edit", component: ke }), (p = u.settings) != null && p.section && u.settings.section({
    id: "recipe-tags",
    title: "Recipe Tags",
    order: 30,
    component: Cl
  }), u.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), u.intent.provider({
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
    execute: (e) => {
      var g;
      (g = e == null ? void 0 : e.recipe) != null && g.id && (u.navigate ? u.navigate(`/recipes/${e.recipe.id}/edit`) : window.location.href = u.url ? u.url(`/recipes/${e.recipe.id}/edit`) : `/recipes/${e.recipe.id}/edit`);
    }
  }), u.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (e) => !!Ce((e == null ? void 0 : e.recipe) || {}),
    execute: async (e) => {
      var g, n, i;
      if (!(e != null && e.recipe)) return !1;
      (g = e.onBeforeDelete) == null || g.call(e);
      try {
        const a = await Ie(u, e.recipe);
        return a || (n = e.onDeleteAborted) == null || n.call(e), a;
      } catch (a) {
        throw (i = e.onDeleteAborted) == null || i.call(e), a;
      }
    }
  });
}
export {
  Tl as default
};
