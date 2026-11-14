import { ref as d, defineComponent as ne, resolveComponent as S, openBlock as p, createElementBlock as g, createCommentVNode as U, createElementVNode as n, createVNode as v, withModifiers as pe, unref as F, createTextVNode as te, toDisplayString as O, normalizeClass as de, Fragment as Z, renderList as ee, createBlock as Y, onBeforeUnmount as fe, onMounted as ge, watch as oe, computed as H, withCtx as se, withKeys as Se } from "vue";
import { Slot as X, useSecretSauce as ce, IntentTrigger as ve } from "@secretsauce/ui";
const re = d(null);
function Ve(i) {
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
function Ae(i) {
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
const Te = {
  key: 0,
  class: "cover-image"
}, Ue = ["src", "alt"], Re = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, xe = { class: "card-body" }, Le = { class: "card-header" }, Ne = { class: "meta" }, De = { key: 0 }, Be = { key: 1 }, Oe = {
  key: 0,
  class: "source-meta"
}, Pe = { class: "tags" }, ze = /* @__PURE__ */ ne({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(i, { emit: s }) {
    const u = i, b = s;
    return (l, o) => {
      var f;
      const r = S("Button"), c = S("Tag");
      return p(), g("article", {
        class: "recipe-card",
        onClick: o[2] || (o[2] = (h) => b("select", u.recipe.id))
      }, [
        u.showCover ? (p(), g("div", Te, [
          u.recipe.cover_asset_id ? (p(), g("img", {
            key: 0,
            src: u.recipe.cover_url || `/api/assets/${u.recipe.cover_asset_id}/file`,
            alt: u.recipe.title
          }, null, 8, Ue)) : (p(), g("i", Re))
        ])) : U("v-if", !0),
        n("div", xe, [
          n("div", Le, [
            n("h3", null, [
              v(r, {
                label: u.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: o[0] || (o[0] = pe((h) => b("select", u.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            n("div", {
              class: "actions",
              onClick: o[1] || (o[1] = pe(() => {
              }, ["stop"]))
            }, [
              v(F(X), {
                name: "recipe.card.actions",
                context: { recipe: u.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          n("div", Ne, [
            u.recipe.prep_time_minutes ? (p(), g("span", De, [
              o[3] || (o[3] = n(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              te(
                " " + O(u.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : U("v-if", !0),
            u.recipe.cook_time_minutes ? (p(), g(
              "span",
              Be,
              O(u.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : U("v-if", !0)
          ]),
          (f = u.recipe.source) != null && f.name ? (p(), g("div", Oe, [
            n(
              "i",
              {
                class: de(F(Ve)(u.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            n(
              "span",
              null,
              O(u.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : U("v-if", !0),
          n("div", Pe, [
            (p(!0), g(
              Z,
              null,
              ee(u.recipe.tags, (h) => (p(), Y(c, {
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
}), ie = (i, s) => {
  const u = i.__vccOpts || i;
  for (const [b, l] of s)
    u[b] = l;
  return u;
}, Ee = /* @__PURE__ */ ie(ze, [["__scopeId", "data-v-3caa626b"]]);
async function _e(i, s) {
  var u;
  if (!s) return null;
  try {
    return ((u = (await i.get("/api/assets", { entity_type: "recipe", entity_id: s })).filter((l) => l.slot === "cover").at(-1)) == null ? void 0 : u.id) || null;
  } catch {
    return null;
  }
}
const Me = "secretsauce:recipe_tag_prefs", qe = 8;
function me() {
  return {
    showAll: !1,
    visibleCount: qe,
    pinnedTags: []
  };
}
function Fe(i) {
  const s = me();
  if (!i || typeof i != "object") return s;
  const u = i, b = typeof u.showAll == "boolean" ? u.showAll : s.showAll;
  let l = s.visibleCount;
  typeof u.visibleCount == "number" && Number.isInteger(u.visibleCount) && u.visibleCount >= 0 && (l = u.visibleCount);
  const o = /* @__PURE__ */ new Set(), r = [];
  if (Array.isArray(u.pinnedTags))
    for (const c of u.pinnedTags)
      typeof c == "string" && c.trim() && !o.has(c) && (o.add(c), r.push(c));
  return { showAll: b, visibleCount: l, pinnedTags: r };
}
function he() {
  try {
    const i = localStorage.getItem(Me);
    return i ? Fe(JSON.parse(i)) : me();
  } catch {
    return me();
  }
}
function Je(i, s) {
  const u = i.filter((c) => c.count > 0 && c.name.trim() !== ""), b = new Map(u.map((c) => [c.name, c])), l = /* @__PURE__ */ new Set(), o = [];
  for (const c of s) {
    const f = b.get(c);
    f && !l.has(c) && (l.add(c), o.push(f));
  }
  const r = u.filter((c) => !l.has(c.name)).sort((c, f) => f.count !== c.count ? f.count - c.count : c.name.localeCompare(f.name, void 0, { sensitivity: "base" }));
  return [...o, ...r];
}
function je(i, s, u, b) {
  const l = Je(i, s.pinnedTags);
  if (s.showAll)
    return { visible: l, hiddenCount: 0, showToggle: !1 };
  const o = new Set(s.pinnedTags), r = l.filter(($) => o.has($.name)), c = l.filter(($) => !o.has($.name)), f = c.slice(0, s.visibleCount), h = [...r, ...f], _ = new Set(h.map(($) => $.name)), I = b && !_.has(b) ? l.find(($) => $.name === b) ?? null : null, A = I ? [...h, I] : h, C = Math.max(0, l.length - A.length);
  return u ? {
    visible: l,
    hiddenCount: 0,
    showToggle: c.length > s.visibleCount
  } : {
    visible: A,
    hiddenCount: C,
    showToggle: C > 0
  };
}
const Ge = { class: "recipe-list-page" }, Ke = { class: "intent-header-bar" }, We = { class: "filter-sort-bar" }, Ye = {
  key: 1,
  class: "recipes-grid"
}, Qe = {
  key: 2,
  class: "empty-state"
}, Ze = /* @__PURE__ */ ne({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(i, { emit: s }) {
    const u = s, b = ce(), l = d([]), o = d(""), r = d(null), c = d("title"), f = d(""), h = d([]), _ = d([]), I = d([]), A = d(he()), C = d(!1), $ = d(!1), B = d(/* @__PURE__ */ new Set());
    function x() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const E = d(x());
    let k = 0;
    async function K() {
      try {
        const w = await b.api.get("/api/x/core-shortlist");
        B.value = new Set(w.map((y) => y.recipe_id));
      } catch {
      }
    }
    async function W() {
      try {
        const w = await b.api.get("/api/recipes/sources");
        Array.isArray(w) ? _.value = w : w && Array.isArray(w.items) && (_.value = w.items);
      } catch {
      }
    }
    async function Q() {
      try {
        const w = await b.api.get("/api/recipes/tags"), y = Array.isArray(w) ? w : w && Array.isArray(w.items) ? w.items : [];
        I.value = y, r.value && !y.some((L) => L.name === r.value) && (r.value = null);
      } catch {
      }
    }
    async function V() {
      $.value = !$.value, $.value && await K();
    }
    async function e() {
      const w = ++k;
      f.value = "";
      try {
        const y = { q: o.value.trim() };
        h.value.length > 0 && (y.source = h.value), r.value && (y.tag = r.value);
        const L = await b.api.get("/api/recipes", y);
        if (w !== k || (l.value = L.items, !E.value)) return;
        const ae = await Promise.all(L.items.map(async (m) => {
          const t = await _e(b.api, m.group_id);
          return { ...m, cover_asset_id: t, cover_url: t ? b.url(`/api/assets/${t}/file`) : null };
        }));
        w === k && (l.value = ae);
      } catch (y) {
        w === k && (f.value = (y == null ? void 0 : y.message) || "Could not load recipes");
      }
    }
    function a(w) {
      var y;
      u("openRecipe", w), (y = b.navigate) == null || y.call(b, `/recipes/${w}`);
    }
    function T() {
      e(), W(), Q();
    }
    const P = b.on("recipe:created", T), G = b.on("recipe:updated", T), J = b.on("recipe:deleted", T);
    fe(() => {
      typeof P == "function" && P(), typeof G == "function" && G(), typeof J == "function" && J();
    }), ge(() => {
      E.value = x(), A.value = he(), re.value && (h.value = [...re.value], re.value = null), e(), K(), W(), Q();
    }), oe([o, h, r], e);
    const z = H(() => {
      const w = [
        { value: "none", label: "No source" }
      ], y = /* @__PURE__ */ new Set(["none"]);
      for (const L of _.value)
        !L.name || y.has(L.name) || (y.add(L.name), w.push({
          value: L.name,
          label: L.author ? `${L.name} (${L.author})` : L.name
        }));
      for (const L of h.value)
        y.has(L) || (y.add(L), w.push({ value: L, label: L }));
      return w;
    }), N = H(
      () => je(I.value, A.value, C.value, r.value)
    ), j = H(() => {
      let w = l.value.map((y) => ({ ...y, is_shortlisted: B.value.has(y.id) }));
      return $.value && (w = w.filter((y) => B.value.has(y.id))), w.sort(c.value === "title" ? (y, L) => y.title.localeCompare(L.title) : (y, L) => (y.prep_time_minutes || 0) - (L.prep_time_minutes || 0));
    });
    return (w, y) => {
      const L = S("InputIcon"), ae = S("InputText"), m = S("IconField"), t = S("MultiSelect"), R = S("Button"), D = S("Select"), le = S("Message");
      return p(), g("div", Ge, [
        y[5] || (y[5] = n(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        n("div", Ke, [
          v(m, { class: "search-box" }, {
            default: se(() => [
              v(L, { class: "pi pi-search" }),
              v(ae, {
                modelValue: o.value,
                "onUpdate:modelValue": y[0] || (y[0] = (q) => o.value = q),
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
          v(F(ve), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        n("div", We, [
          v(F(X), {
            name: "recipe.list.filters",
            context: { active: $.value, toggle: V }
          }, null, 8, ["context"]),
          v(t, {
            modelValue: h.value,
            "onUpdate:modelValue": y[1] || (y[1] = (q) => h.value = q),
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
          (p(!0), g(
            Z,
            null,
            ee(N.value.visible, (q) => (p(), Y(R, {
              key: q.name,
              class: "tag-filter-btn",
              label: `${q.name} (${q.count})`,
              size: "small",
              outlined: r.value !== q.name,
              "aria-pressed": r.value === q.name,
              onClick: (ue) => r.value = r.value === q.name ? null : q.name
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          N.value.showToggle ? (p(), Y(R, {
            key: 0,
            class: "tag-more-btn",
            label: C.value ? "Less" : `More (${N.value.hiddenCount})`,
            size: "small",
            text: "",
            "aria-expanded": C.value,
            onClick: y[2] || (y[2] = (q) => C.value = !C.value)
          }, null, 8, ["label", "aria-expanded"])) : U("v-if", !0),
          v(D, {
            modelValue: c.value,
            "onUpdate:modelValue": y[3] || (y[3] = (q) => c.value = q),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        f.value ? (p(), Y(le, {
          key: 0,
          severity: "error"
        }, {
          default: se(() => [
            te(
              O(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        j.value.length ? (p(), g("div", Ye, [
          (p(!0), g(
            Z,
            null,
            ee(j.value, (q) => (p(), Y(Ee, {
              key: q.id,
              recipe: q,
              "show-cover": E.value,
              onSelect: a
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (p(), g("div", Qe, [
          y[4] || (y[4] = n(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          v(F(ve), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), He = /* @__PURE__ */ ie(Ze, [["__scopeId", "data-v-f464e100"]]);
function Xe(i) {
  const s = (i.title || "").trim() || "this recipe", u = Array.isArray(i.languages) ? i.languages.filter(Boolean) : [];
  return `${u.length > 1 ? `Delete '${s}' and all ${u.length} language versions (${u.map((l) => l.toUpperCase()).join(", ")})?` : `Delete '${s}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function $e(i) {
  if (i.group_id) return i.group_id;
  if (i.id) {
    const s = i.id.indexOf("_");
    return s === -1 ? i.id : i.id.slice(0, s);
  }
  return "";
}
function we(i, s) {
  const u = i == null ? void 0 : i.entity_id;
  return !u || !s ? !1 : s.id && u === s.id ? !0 : s.group_id ? u === s.group_id || u.startsWith(`${s.group_id}_`) : !1;
}
async function Ce(i, s) {
  var l;
  const u = $e(s);
  return !u || !await i.confirm({
    header: "Delete recipe",
    message: Xe(s),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await i.api.delete(`/api/recipes/${u}`), i.notify({ level: "success", message: "Recipe deleted" }), (l = i.navigate) == null || l.call(i, "/recipes"), !0);
}
const et = { class: "recipe-detail-page" }, tt = {
  key: 0,
  class: "lang-bar"
}, lt = { class: "detail-header" }, ot = {
  key: 0,
  class: "recipe-source-attribution"
}, nt = {
  key: 0,
  class: "source-locator"
}, it = {
  key: 1,
  class: "source-author"
}, at = ["href"], st = {
  key: 3,
  class: "source-notes"
}, ut = { key: 1 }, rt = { class: "detail-actions" }, ct = ["src", "alt"], pt = { class: "scaler-card" }, dt = { class: "servings-value" }, vt = {
  key: 2,
  class: "content-grid"
}, mt = { class: "ingredient-checklist" }, ft = ["for"], gt = {
  key: 0,
  class: "notes"
}, _t = { class: "steps-list" }, yt = /* @__PURE__ */ ne({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(i, { emit: s }) {
    const u = i, b = s, l = ce(), o = d(null), r = d(2), c = d({}), f = d(""), h = d(!1), _ = d(null), I = d(!1), A = H(() => u.id || u.recipeId || ""), C = d(null), $ = d(!1);
    let B = 0;
    const x = l.on("recipe:deleted", (V) => {
      var e;
      $.value || !o.value || we(V, o.value) && (l.notify({ level: "info", message: "This recipe was deleted" }), (e = l.navigate) == null || e.call(l, "/recipes"));
    });
    fe(() => {
      typeof x == "function" && x();
    }), oe(A, async (V) => {
      if (!V) return;
      const e = ++B;
      f.value = "", C.value = null, _.value = null, I.value = !1;
      try {
        const a = await l.api.get(`/api/recipes/${V}`);
        if (e !== B) return;
        o.value = a, r.value = a.servings || 2, c.value = {}, h.value = !1;
        const T = await _e(l.api, a.group_id);
        if (e !== B) return;
        C.value = T;
        try {
          const P = await l.api.get("/api/x/core-shortlist");
          e === B && (h.value = P.some((G) => G.recipe_id === V));
        } catch {
        }
      } catch (a) {
        e === B && (o.value = null, f.value = (a == null ? void 0 : a.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function E(V) {
      var e;
      b("switchLanguage", V), (e = l.navigate) == null || e.call(l, `/recipes/${V}`);
    }
    const k = H(() => {
      var e, a;
      const V = ((e = _.value) == null ? void 0 : e.source) ?? ((a = o.value) == null ? void 0 : a.source);
      return V && V.name ? V : null;
    });
    function K(V) {
      var e;
      re.value = [V], (e = l.navigate) == null || e.call(l, "/recipes");
    }
    function W(V) {
      var a;
      if (V == null) return "";
      const e = V * r.value / (((a = o.value) == null ? void 0 : a.servings) || 1);
      return Number.isInteger(e) ? String(e) : e.toFixed(1);
    }
    const Q = H(() => ({
      recipe: o.value,
      customizedRecipe: _.value,
      customizeOpen: I.value,
      currentServings: r.value,
      checkedIngredients: c.value,
      setCustomizeOpen: (V) => {
        I.value = V;
      },
      applyCustomization: (V) => {
        _.value = V, c.value = {}, V != null && V.servings && (r.value = V.servings);
      },
      resetCustomization: () => {
        _.value = null, c.value = {}, o.value && (r.value = o.value.servings || 2);
      },
      onRecipeUpdated: (V) => {
        o.value = V, _.value = null, I.value = !1, c.value = {}, r.value = V.servings || 2;
      },
      setCheckedIngredients: (V) => {
        c.value = V;
      }
    }));
    return (V, e) => {
      var J, z;
      const a = S("Button"), T = S("Message"), P = S("Checkbox"), G = S("Tag");
      return p(), g("div", et, [
        v(a, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: e[0] || (e[0] = (N) => {
            var j, w;
            return (w = (j = F(l)).navigate) == null ? void 0 : w.call(j, "/recipes");
          })
        }),
        f.value ? (p(), Y(T, {
          key: 0,
          severity: "error"
        }, {
          default: se(() => [
            te(
              O(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        o.value ? (p(), g(
          Z,
          { key: 1 },
          [
            ((J = o.value.languages) == null ? void 0 : J.length) > 1 ? (p(), g("div", tt, [
              e[4] || (e[4] = n(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (p(!0), g(
                Z,
                null,
                ee(o.value.languages, (N) => (p(), Y(a, {
                  key: N,
                  label: N.toUpperCase(),
                  size: "small",
                  outlined: N !== o.value.language,
                  onClick: (j) => E(`${o.value.group_id}_${N}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : U("v-if", !0),
            n("div", lt, [
              n("div", null, [
                n(
                  "h1",
                  null,
                  O(((z = _.value) == null ? void 0 : z.title) || o.value.title),
                  1
                  /* TEXT */
                ),
                k.value ? (p(), g("div", ot, [
                  n(
                    "i",
                    {
                      class: de(F(Ve)(k.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  e[6] || (e[6] = n(
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
                      onClick: e[1] || (e[1] = (N) => K(k.value.name))
                    },
                    O(k.value.name),
                    1
                    /* TEXT */
                  ),
                  k.value.type === "cookbook" && k.value.page ? (p(), g(
                    "span",
                    nt,
                    ", p. " + O(k.value.page),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  k.value.author ? (p(), g(
                    "span",
                    it,
                    " by " + O(k.value.author),
                    1
                    /* TEXT */
                  )) : U("v-if", !0),
                  k.value.url ? (p(), g("a", {
                    key: 2,
                    href: k.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...e[5] || (e[5] = [
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
                  ])], 8, at)) : U("v-if", !0),
                  k.value.notes ? (p(), g(
                    "span",
                    st,
                    " — " + O(k.value.notes),
                    1
                    /* TEXT */
                  )) : U("v-if", !0)
                ])) : U("v-if", !0),
                !_.value && o.value.description ? (p(), g(
                  "p",
                  ut,
                  O(o.value.description),
                  1
                  /* TEXT */
                )) : U("v-if", !0)
              ]),
              n("div", rt, [
                v(F(X), {
                  name: "recipe.detail.actions",
                  context: Q.value
                }, null, 8, ["context"]),
                v(F(X), {
                  name: "recipe.card.actions",
                  context: { recipe: o.value, isShortlisted: h.value }
                }, null, 8, ["context"]),
                v(F(ve), {
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
            C.value ? (p(), g("img", {
              key: 1,
              src: F(l).url(`/api/assets/${C.value}/file`),
              alt: o.value.title,
              class: "recipe-cover"
            }, null, 8, ct)) : U("v-if", !0),
            n("div", pt, [
              e[7] || (e[7] = n(
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
                onClick: e[2] || (e[2] = (N) => r.value--)
              }, null, 8, ["disabled"]),
              n(
                "span",
                dt,
                O(r.value),
                1
                /* TEXT */
              ),
              v(a, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: e[3] || (e[3] = (N) => r.value++)
              })
            ]),
            v(F(X), {
              name: "recipe.detail.customize",
              context: Q.value
            }, null, 8, ["context"]),
            _.value ? U("v-if", !0) : (p(), g("div", vt, [
              n("section", null, [
                e[8] || (e[8] = n(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                n("ul", mt, [
                  (p(!0), g(
                    Z,
                    null,
                    ee(o.value.ingredients, (N, j) => (p(), g("li", {
                      key: j,
                      class: "ingredient-item"
                    }, [
                      v(P, {
                        inputId: `ingredient-${j}`,
                        modelValue: c.value[j],
                        "onUpdate:modelValue": (w) => c.value[j] = w,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      n("label", {
                        for: `ingredient-${j}`,
                        class: de({ struck: c.value[j] })
                      }, [
                        n(
                          "strong",
                          null,
                          O(W(N.quantity)),
                          1
                          /* TEXT */
                        ),
                        te(
                          " " + O(N.unit) + " " + O(N.name),
                          1
                          /* TEXT */
                        ),
                        N.notes ? (p(), g(
                          "span",
                          gt,
                          " (" + O(N.notes) + ")",
                          1
                          /* TEXT */
                        )) : U("v-if", !0)
                      ], 10, ft)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              n("section", null, [
                e[9] || (e[9] = n(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                n("ol", _t, [
                  (p(!0), g(
                    Z,
                    null,
                    ee(o.value.steps, (N) => (p(), g("li", {
                      key: N.id
                    }, [
                      n(
                        "p",
                        null,
                        O(N.instruction),
                        1
                        /* TEXT */
                      ),
                      N.timer_minutes ? (p(), Y(G, {
                        key: 0,
                        value: `${N.timer_minutes} min`,
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
            v(F(X), {
              name: "recipe.detail.sidebar",
              context: { recipe: o.value }
            }, null, 8, ["context"]),
            v(F(X), {
              name: "recipe.detail.footer",
              context: { recipe: o.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : U("v-if", !0)
      ]);
    };
  }
}), bt = /* @__PURE__ */ ie(yt, [["__scopeId", "data-v-678e2974"]]), ht = { class: "ingredient-row-list" }, kt = { class: "reorder-btns" }, Vt = /* @__PURE__ */ ne({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: s }) {
    const u = i, b = s, l = d(JSON.parse(JSON.stringify(u.modelValue || [])));
    oe(() => u.modelValue, (_) => {
      l.value = JSON.parse(JSON.stringify(_ || []));
    }, { deep: !0 });
    const o = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((_) => ({ id: _, label: _ || "(none)" }));
    function r() {
      b("update:modelValue", l.value);
    }
    function c() {
      l.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), r();
    }
    function f(_) {
      l.value.splice(_, 1), r();
    }
    function h(_, I) {
      const A = _ + I;
      A < 0 || A >= l.value.length || (l.value.splice(A, 0, l.value.splice(_, 1)[0]), r());
    }
    return (_, I) => {
      const A = S("Button"), C = S("InputNumber"), $ = S("Select"), B = S("InputText");
      return p(), g("div", ht, [
        (p(!0), g(
          Z,
          null,
          ee(l.value, (x, E) => (p(), g("div", {
            key: x.id,
            class: "ingredient-row"
          }, [
            n("div", kt, [
              v(A, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: E === 0,
                onClick: (k) => h(E, -1)
              }, null, 8, ["disabled", "onClick"]),
              v(A, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: E === l.value.length - 1,
                onClick: (k) => h(E, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            v(C, {
              modelValue: x.quantity,
              "onUpdate:modelValue": [(k) => x.quantity = k, r],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${E + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v($, {
              modelValue: x.unit,
              "onUpdate:modelValue": [(k) => x.unit = k, r],
              options: F(o),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${E + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            v(B, {
              modelValue: x.name,
              "onUpdate:modelValue": (k) => x.name = k,
              class: "input-name",
              "aria-label": `Ingredient ${E + 1} name`,
              placeholder: "Ingredient name",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(B, {
              modelValue: x.notes,
              "onUpdate:modelValue": (k) => x.notes = k,
              class: "input-notes",
              "aria-label": `Ingredient ${E + 1} notes`,
              placeholder: "Notes",
              onInput: r
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            v(A, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (k) => f(E)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        v(A, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: c
        })
      ]);
    };
  }
}), $t = /* @__PURE__ */ ie(Vt, [["__scopeId", "data-v-6a40d29c"]]), wt = { class: "step-list" }, Ct = { class: "step-inputs" }, It = { class: "timer-row" }, St = ["for"], At = /* @__PURE__ */ ne({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: s }) {
    const u = i, b = s, l = d(JSON.parse(JSON.stringify(u.modelValue || [])));
    oe(() => u.modelValue, (f) => {
      l.value = JSON.parse(JSON.stringify(f || []));
    }, { deep: !0 });
    function o() {
      b("update:modelValue", l.value);
    }
    function r() {
      l.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), o();
    }
    function c(f) {
      l.value.splice(f, 1), o();
    }
    return (f, h) => {
      const _ = S("Tag"), I = S("Textarea"), A = S("InputNumber"), C = S("Button");
      return p(), g("div", wt, [
        (p(!0), g(
          Z,
          null,
          ee(l.value, ($, B) => (p(), g("div", {
            key: $.id,
            class: "step-row"
          }, [
            v(_, {
              value: String(B + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            n("div", Ct, [
              v(I, {
                modelValue: $.instruction,
                "onUpdate:modelValue": (x) => $.instruction = x,
                class: "textarea-instruction",
                "aria-label": `Step ${B + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: o
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              n("div", It, [
                n("label", {
                  for: `timer-${$.id}`
                }, "Timer (min)", 8, St),
                v(A, {
                  inputId: `timer-${$.id}`,
                  modelValue: $.timer_minutes,
                  "onUpdate:modelValue": [(x) => $.timer_minutes = x, o],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            v(C, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (x) => c(B)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        v(C, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: r
        })
      ]);
    };
  }
}), Tt = /* @__PURE__ */ ie(At, [["__scopeId", "data-v-4c4135f0"]]), Ut = { class: "source-editor" }, Rt = { class: "source-header" }, xt = { class: "source-grid" }, Lt = { class: "form-group" }, Nt = { class: "form-group source-name-field" }, Dt = { class: "source-suggestion" }, Bt = { class: "suggestion-name" }, Ot = { class: "suggestion-meta" }, Pt = {
  key: 0,
  class: "form-group"
}, zt = {
  key: 1,
  class: "form-group"
}, Et = {
  key: 2,
  class: "form-group source-url-field"
}, Mt = {
  key: 3,
  class: "form-group source-notes-field"
}, qt = /* @__PURE__ */ ne({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(i, { emit: s }) {
    const u = i, b = s, l = ce(), o = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], r = d("cookbook"), c = d(""), f = d(""), h = d(""), _ = d(""), I = d(""), A = d([]), C = d([]);
    let $ = !1;
    function B(e) {
      $ = !0, e && e.name ? (r.value = e.type || "other", c.value = e.name || "", f.value = e.author || "", h.value = e.page || "", _.value = e.url || "", I.value = e.notes || "") : (c.value = "", f.value = "", h.value = "", _.value = "", I.value = ""), $ = !1;
    }
    oe(() => u.modelValue, B, { immediate: !0, deep: !0 });
    function x() {
      if ($) return;
      const e = c.value.trim();
      if (!e) {
        b("update:modelValue", null);
        return;
      }
      const a = {
        type: r.value,
        name: e
      }, T = f.value.trim(), P = h.value.trim(), G = _.value.trim(), J = I.value.trim();
      T && (a.author = T), r.value === "cookbook" && P && (a.page = P), (r.value === "website" || r.value === "other") && G && (a.url = G), J && (a.notes = J), b("update:modelValue", a);
    }
    oe([r, c, f, h, _, I], x), ge(async () => {
      var e, a;
      try {
        const T = await ((a = (e = l.api) == null ? void 0 : e.get) == null ? void 0 : a.call(e, "/api/recipes/sources"));
        Array.isArray(T) ? A.value = T : T && Array.isArray(T.items) && (A.value = T.items);
      } catch {
      }
    });
    function E(e) {
      const a = (e.query || "").trim().toLowerCase();
      if (!a) {
        C.value = [...A.value];
        return;
      }
      C.value = A.value.filter(
        (T) => T.name.toLowerCase().includes(a) || T.author && T.author.toLowerCase().includes(a)
      );
    }
    function k(e) {
      e && typeof e == "object" ? (c.value = e.name || "", e.type && (r.value = e.type), (e.author && !f.value.trim() || e.author) && (f.value = e.author)) : c.value = typeof e == "string" ? e : "";
    }
    function K(e) {
      const a = e == null ? void 0 : e.value;
      a && (c.value = a.name, a.type && (r.value = a.type), a.author && (f.value = a.author));
    }
    function W() {
      c.value = "", f.value = "", h.value = "", _.value = "", I.value = "", b("update:modelValue", null);
    }
    const Q = H(
      () => !!(c.value.trim() || f.value.trim() || h.value.trim() || _.value.trim() || I.value.trim())
    ), V = H(() => {
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
      const T = S("Button"), P = S("Select"), G = S("AutoComplete"), J = S("InputText");
      return p(), g("fieldset", Ut, [
        n("div", Rt, [
          a[5] || (a[5] = n(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          Q.value ? (p(), Y(T, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: W
          })) : U("v-if", !0)
        ]),
        n("div", xt, [
          n("div", Lt, [
            a[6] || (a[6] = n(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            v(P, {
              inputId: "recipe-source-type",
              modelValue: r.value,
              "onUpdate:modelValue": a[0] || (a[0] = (z) => r.value = z),
              options: o,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Nt, [
            a[7] || (a[7] = n(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            v(G, {
              inputId: "recipe-source-name",
              modelValue: c.value,
              suggestions: C.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: V.value,
              fluid: "",
              "onUpdate:modelValue": k,
              onComplete: E,
              onItemSelect: K
            }, {
              option: se(({ option: z }) => [
                n("div", Dt, [
                  n(
                    "span",
                    Bt,
                    O(z.name),
                    1
                    /* TEXT */
                  ),
                  n("small", Ot, [
                    te(
                      O(F(Ae)(z.type)),
                      1
                      /* TEXT */
                    ),
                    z.author ? (p(), g(
                      Z,
                      { key: 0 },
                      [
                        te(
                          " · " + O(z.author),
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
          r.value !== "person" ? (p(), g("div", Pt, [
            a[8] || (a[8] = n(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            v(J, {
              id: "recipe-source-author",
              modelValue: f.value,
              "onUpdate:modelValue": a[1] || (a[1] = (z) => f.value = z),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "cookbook" ? (p(), g("div", zt, [
            a[9] || (a[9] = n(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            v(J, {
              id: "recipe-source-page",
              modelValue: h.value,
              "onUpdate:modelValue": a[2] || (a[2] = (z) => h.value = z),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "website" || r.value === "other" ? (p(), g("div", Et, [
            a[10] || (a[10] = n(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            v(J, {
              id: "recipe-source-url",
              modelValue: _.value,
              "onUpdate:modelValue": a[3] || (a[3] = (z) => _.value = z),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0),
          r.value === "person" || r.value === "other" ? (p(), g("div", Mt, [
            a[11] || (a[11] = n(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            v(J, {
              id: "recipe-source-notes",
              modelValue: I.value,
              "onUpdate:modelValue": a[4] || (a[4] = (z) => I.value = z),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : U("v-if", !0)
        ])
      ]);
    };
  }
}), Ft = /* @__PURE__ */ ie(qt, [["__scopeId", "data-v-267c9e36"]]), Jt = { class: "edit-top-bar" }, jt = { class: "edit-top-actions" }, Gt = { class: "form-group" }, Kt = { class: "form-group" }, Wt = { class: "form-row" }, Yt = { class: "form-group" }, Qt = { class: "form-group" }, Zt = { class: "form-group" }, Ht = { class: "form-group" }, Xt = { class: "form-group" }, el = { class: "form-group" }, tl = ["disabled"], ll = { key: 0 }, ol = { key: 1 }, nl = ["src"], il = { class: "actions-row" }, al = /* @__PURE__ */ ne({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(i, { emit: s }) {
    var ae;
    const u = i, b = s, l = ce(), o = H(() => u.id || u.recipeId || ""), r = d(""), c = d(""), f = d(((ae = l.store.household.value) == null ? void 0 : ae.languages.primary) || "en"), h = d(2), _ = d(""), I = d(null), A = d(null), C = d([]), $ = d(null), B = d([]), x = d([]), E = d(null), k = d(null), K = d([]), W = d([]), Q = d(1), V = d([]), e = d(!1), a = d(!1), T = d(!1), P = d(""), G = l.on("recipe:deleted", (m) => {
      a.value || !o.value || we(m, { id: o.value, group_id: _.value }) && (T.value = !0);
    });
    fe(() => {
      typeof G == "function" && G();
    }), ge(async () => {
      var m, t;
      try {
        const R = await ((t = (m = l.api) == null ? void 0 : m.get) == null ? void 0 : t.call(m, "/api/recipes/tags"));
        Array.isArray(R) ? B.value = R : R && Array.isArray(R.items) && (B.value = R.items);
      } catch {
      }
    });
    function J(m) {
      const t = (m.query || "").trim().toLowerCase(), R = new Set(C.value);
      x.value = B.value.map((D) => D.name).filter((D) => !R.has(D) && (!t || D.toLowerCase().includes(t)));
    }
    function z(m) {
      var D, le;
      const t = m.target;
      if (!t || t.tagName !== "INPUT" || t.getAttribute("aria-activedescendant")) return;
      const R = t.value.trim();
      R && (m.preventDefault(), m.stopPropagation(), C.value.includes(R) || (C.value = [...C.value, R]), t.value = "", x.value = [], (le = (D = E.value) == null ? void 0 : D.hide) == null || le.call(D));
    }
    oe(o, async (m) => {
      if (T.value = !1, !!m)
        try {
          const t = await l.api.get(`/api/recipes/${m}`);
          r.value = t.title, c.value = t.description || "", f.value = t.language, h.value = t.servings, I.value = t.prep_time_minutes, A.value = t.cook_time_minutes, C.value = [...t.tags], k.value = t.source || null, K.value = t.ingredients, W.value = t.steps, Q.value = t.revision, V.value = t.languages || [], $.value = await _e(l.api, t.group_id), _.value = t.group_id;
        } catch (t) {
          P.value = (t == null ? void 0 : t.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function N(m) {
      var R;
      const t = (R = m.target.files) == null ? void 0 : R[0];
      if (!(!t || e.value || !_.value)) {
        e.value = !0, P.value = "";
        try {
          const D = new FormData();
          D.append("file", t), D.append("entity_type", "recipe"), D.append("entity_id", _.value), D.append("slot", "cover"), $.value = (await l.api.upload("/api/assets", D)).id, l.notify({ level: "success", message: "Cover image saved" });
        } catch (D) {
          P.value = (D == null ? void 0 : D.message) || "Could not upload image";
        } finally {
          e.value = !1;
        }
      }
    }
    async function j() {
      var t;
      if (!r.value.trim() || e.value || T.value) return;
      e.value = !0, P.value = "";
      const m = {
        title: r.value.trim(),
        description: c.value.trim(),
        language: f.value,
        servings: h.value,
        prep_time_minutes: I.value,
        cook_time_minutes: A.value,
        tags: C.value,
        ingredients: K.value,
        steps: W.value
      };
      (k.value !== null || o.value) && (m.source = k.value);
      try {
        const R = o.value ? await l.api.patch(`/api/recipes/${o.value}`, { ...m, revision: Q.value }) : await l.api.post("/api/recipes", m);
        b("saved", R), l.notify({ level: "success", message: "Recipe saved" }), (t = l.navigate) == null || t.call(l, `/recipes/${R.id}`);
      } catch (R) {
        P.value = (R == null ? void 0 : R.message) || "Could not save recipe";
      } finally {
        e.value = !1;
      }
    }
    async function w() {
      if (!(!o.value || e.value || T.value)) {
        e.value = !0, a.value = !0, P.value = "";
        try {
          await Ce(l, {
            id: o.value,
            group_id: _.value || void 0,
            title: r.value.trim() || "this recipe",
            languages: V.value
          }) || (a.value = !1);
        } catch (m) {
          a.value = !1, P.value = (m == null ? void 0 : m.message) || "Could not delete recipe";
        } finally {
          e.value = !1;
        }
      }
    }
    function y(m) {
      m.title && (r.value = m.title), m.description !== void 0 && (c.value = m.description || ""), m.servings && (h.value = m.servings), m.prep_time_minutes !== void 0 && (I.value = m.prep_time_minutes), m.cook_time_minutes !== void 0 && (A.value = m.cook_time_minutes), m.tags && (C.value = [...m.tags]), m.source !== void 0 && (k.value = m.source || null), m.ingredients && (K.value = [...m.ingredients]), m.steps && (W.value = [...m.steps]);
    }
    const L = H(() => ({
      targetId: o.value,
      recipe: {
        id: o.value,
        title: r.value,
        description: c.value,
        language: f.value,
        servings: h.value,
        prep_time_minutes: I.value,
        cook_time_minutes: A.value,
        tags: C.value,
        source: k.value,
        ingredients: K.value,
        steps: W.value
      },
      applyAdaptation: y
    }));
    return (m, t) => {
      const R = S("Button"), D = S("Message"), le = S("InputText"), q = S("Textarea"), ue = S("InputNumber"), Ie = S("AutoComplete");
      return p(), g(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: pe(j, ["prevent"])
        },
        [
          n("div", Jt, [
            n(
              "h2",
              null,
              O(o.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            n("div", jt, [
              v(F(X), {
                name: "recipe.edit.actions",
                context: L.value
              }, null, 8, ["context"]),
              v(R, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: e.value,
                onClick: t[0] || (t[0] = (M) => {
                  var ye, be;
                  return (be = (ye = F(l)).navigate) == null ? void 0 : be.call(ye, o.value ? `/recipes/${o.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          T.value ? (p(), Y(D, {
            key: 0,
            severity: "warn"
          }, {
            default: se(() => [...t[11] || (t[11] = [
              te(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : U("v-if", !0),
          P.value ? (p(), Y(D, {
            key: 1,
            severity: "error"
          }, {
            default: se(() => [
              te(
                O(P.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : U("v-if", !0),
          n("div", Gt, [
            t[12] || (t[12] = n(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            v(le, {
              id: "recipe-title",
              modelValue: r.value,
              "onUpdate:modelValue": t[1] || (t[1] = (M) => r.value = M),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Kt, [
            t[13] || (t[13] = n(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            v(q, {
              id: "recipe-description",
              modelValue: c.value,
              "onUpdate:modelValue": t[2] || (t[2] = (M) => c.value = M),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          n("div", Wt, [
            n("div", Yt, [
              t[14] || (t[14] = n(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              v(le, {
                id: "recipe-language",
                modelValue: f.value,
                "onUpdate:modelValue": t[3] || (t[3] = (M) => f.value = M),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", Qt, [
              t[15] || (t[15] = n(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              v(ue, {
                inputId: "recipe-servings",
                modelValue: h.value,
                "onUpdate:modelValue": t[4] || (t[4] = (M) => h.value = M),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", Zt, [
              t[16] || (t[16] = n(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              v(ue, {
                inputId: "recipe-prep",
                modelValue: I.value,
                "onUpdate:modelValue": t[5] || (t[5] = (M) => I.value = M),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            n("div", Ht, [
              t[17] || (t[17] = n(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              v(ue, {
                inputId: "recipe-cook",
                modelValue: A.value,
                "onUpdate:modelValue": t[6] || (t[6] = (M) => A.value = M),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          n("div", Xt, [
            t[18] || (t[18] = n(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            v(Ie, {
              ref_key: "tagAutoComplete",
              ref: E,
              inputId: "recipe-tags",
              modelValue: C.value,
              "onUpdate:modelValue": t[7] || (t[7] = (M) => C.value = M),
              multiple: "",
              suggestions: x.value,
              delay: 0,
              onComplete: J,
              onKeydown: Se(z, ["enter"]),
              fluid: ""
            }, null, 8, ["modelValue", "suggestions"])
          ]),
          v(Ft, {
            modelValue: k.value,
            "onUpdate:modelValue": t[8] || (t[8] = (M) => k.value = M)
          }, null, 8, ["modelValue"]),
          n("div", el, [
            t[19] || (t[19] = n(
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
              disabled: e.value || !_.value,
              onChange: N
            }, null, 40, tl),
            o.value ? (p(), g("small", ol, "Cover uploads are saved immediately, separately from recipe edits.")) : (p(), g("small", ll, "Save your recipe first to add a cover image.")),
            $.value ? (p(), g("img", {
              key: 2,
              src: F(l).url(`/api/assets/${$.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, nl)) : U("v-if", !0)
          ]),
          n("section", null, [
            t[20] || (t[20] = n(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            v($t, {
              modelValue: K.value,
              "onUpdate:modelValue": t[9] || (t[9] = (M) => K.value = M)
            }, null, 8, ["modelValue"])
          ]),
          n("section", null, [
            t[21] || (t[21] = n(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            v(Tt, {
              modelValue: W.value,
              "onUpdate:modelValue": t[10] || (t[10] = (M) => W.value = M)
            }, null, 8, ["modelValue"])
          ]),
          n("div", il, [
            o.value ? (p(), Y(R, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: a.value && e.value,
              disabled: e.value || T.value,
              onClick: w
            }, null, 8, ["loading", "disabled"])) : U("v-if", !0),
            v(R, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: e.value && !a.value,
              disabled: !r.value.trim() || e.value || T.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), ke = /* @__PURE__ */ ie(al, [["__scopeId", "data-v-c798b480"]]);
function rl(i) {
  i.route({ path: "/recipes", component: He, nav: { label: "Recipes", icon: "book", order: 10 } }), i.route({ path: "/recipes/new", component: ke }), i.route({ path: "/recipes/:id", component: bt }), i.route({ path: "/recipes/:id/edit", component: ke }), i.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), i.intent.provider({
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
    execute: (s) => {
      var u;
      (u = s == null ? void 0 : s.recipe) != null && u.id && (i.navigate ? i.navigate(`/recipes/${s.recipe.id}/edit`) : window.location.href = i.url ? i.url(`/recipes/${s.recipe.id}/edit`) : `/recipes/${s.recipe.id}/edit`);
    }
  }), i.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (s) => !!$e((s == null ? void 0 : s.recipe) || {}),
    execute: async (s) => {
      var u, b, l;
      if (!(s != null && s.recipe)) return !1;
      (u = s.onBeforeDelete) == null || u.call(s);
      try {
        const o = await Ce(i, s.recipe);
        return o || (b = s.onDeleteAborted) == null || b.call(s), o;
      } catch (o) {
        throw (l = s.onDeleteAborted) == null || l.call(s), o;
      }
    }
  });
}
export {
  rl as default
};
