import { ref as f, defineComponent as oe, resolveComponent as R, openBlock as p, createElementBlock as _, createCommentVNode as x, createElementVNode as t, createVNode as g, withModifiers as pe, unref as J, createTextVNode as Q, toDisplayString as D, normalizeClass as fe, Fragment as te, renderList as ne, createBlock as X, onBeforeUnmount as ve, onMounted as me, watch as se, computed as Z, withCtx as le, withKeys as Re } from "vue";
import { Slot as ae, useSecretSauce as re, IntentTrigger as ge } from "@secretsauce/ui";
const de = f(null);
function we(s) {
  switch (s) {
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
function Ue(s) {
  switch (s) {
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
const xe = {
  key: 0,
  class: "cover-image"
}, De = ["src", "alt"], Le = {
  key: 1,
  class: "pi pi-book placeholder-cover",
  "aria-hidden": "true"
}, Ne = { class: "card-body" }, Pe = { class: "card-header" }, Be = { class: "meta" }, Oe = { key: 0 }, ze = { key: 1 }, Me = {
  key: 0,
  class: "source-meta"
}, Ee = { class: "tags" }, qe = /* @__PURE__ */ oe({
  __name: "RecipeCard",
  props: {
    recipe: {},
    showCover: { type: Boolean, default: !0 }
  },
  emits: ["select"],
  setup(s, { emit: c }) {
    const e = s, y = c;
    return (a, u) => {
      var h;
      const o = R("Button"), v = R("Tag");
      return p(), _("article", {
        class: "recipe-card",
        onClick: u[2] || (u[2] = ($) => y("select", e.recipe.id))
      }, [
        e.showCover ? (p(), _("div", xe, [
          e.recipe.cover_asset_id ? (p(), _("img", {
            key: 0,
            src: e.recipe.cover_url || `/api/assets/${e.recipe.cover_asset_id}/file`,
            alt: e.recipe.title
          }, null, 8, De)) : (p(), _("i", Le))
        ])) : x("v-if", !0),
        t("div", Ne, [
          t("div", Pe, [
            t("h3", null, [
              g(o, {
                label: e.recipe.title,
                text: "",
                class: "recipe-title",
                onClick: u[0] || (u[0] = pe(($) => y("select", e.recipe.id), ["stop"]))
              }, null, 8, ["label"])
            ]),
            t("div", {
              class: "actions",
              onClick: u[1] || (u[1] = pe(() => {
              }, ["stop"]))
            }, [
              g(J(ae), {
                name: "recipe.card.actions",
                context: { recipe: e.recipe }
              }, null, 8, ["context"])
            ])
          ]),
          t("div", Be, [
            e.recipe.prep_time_minutes ? (p(), _("span", Oe, [
              u[3] || (u[3] = t(
                "i",
                { class: "pi pi-clock" },
                null,
                -1
                /* CACHED */
              )),
              Q(
                " " + D(e.recipe.prep_time_minutes) + "m prep",
                1
                /* TEXT */
              )
            ])) : x("v-if", !0),
            e.recipe.cook_time_minutes ? (p(), _(
              "span",
              ze,
              D(e.recipe.cook_time_minutes) + "m cook",
              1
              /* TEXT */
            )) : x("v-if", !0)
          ]),
          (h = e.recipe.source) != null && h.name ? (p(), _("div", Me, [
            t(
              "i",
              {
                class: fe(J(we)(e.recipe.source.type)),
                "aria-hidden": "true"
              },
              null,
              2
              /* CLASS */
            ),
            t(
              "span",
              null,
              D(e.recipe.source.name),
              1
              /* TEXT */
            )
          ])) : x("v-if", !0),
          t("div", Ee, [
            (p(!0), _(
              te,
              null,
              ne(e.recipe.tags, ($) => (p(), X(v, {
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
}), ie = (s, c) => {
  const e = s.__vccOpts || s;
  for (const [y, a] of c)
    e[y] = a;
  return e;
}, Fe = /* @__PURE__ */ ie(qe, [["__scopeId", "data-v-3caa626b"]]);
async function _e(s, c) {
  var e;
  if (!c) return null;
  try {
    return ((e = (await s.get("/api/assets", { entity_type: "recipe", entity_id: c })).filter((a) => a.slot === "cover").at(-1)) == null ? void 0 : e.id) || null;
  } catch {
    return null;
  }
}
const Ce = "secretsauce:recipe_tag_prefs", Je = 8;
function ye() {
  return {
    showAll: !1,
    visibleCount: Je,
    pinnedTags: []
  };
}
function Ve(s) {
  const c = ye();
  if (!s || typeof s != "object") return c;
  const e = s, y = typeof e.showAll == "boolean" ? e.showAll : c.showAll;
  let a = c.visibleCount;
  typeof e.visibleCount == "number" && Number.isInteger(e.visibleCount) && e.visibleCount >= 0 && (a = e.visibleCount);
  const u = /* @__PURE__ */ new Set(), o = [];
  if (Array.isArray(e.pinnedTags))
    for (const v of e.pinnedTags)
      typeof v == "string" && v.trim() && !u.has(v) && (u.add(v), o.push(v));
  return { showAll: y, visibleCount: a, pinnedTags: o };
}
function ue() {
  try {
    const s = localStorage.getItem(Ce);
    return s ? Ve(JSON.parse(s)) : ye();
  } catch {
    return ye();
  }
}
function be(s) {
  const c = Ve(s);
  try {
    localStorage.setItem(Ce, JSON.stringify(c));
  } catch {
  }
  return c;
}
function je(s, c) {
  const e = ue();
  if (!e.pinnedTags.includes(s)) return e;
  const y = /* @__PURE__ */ new Set(), a = [];
  for (const u of e.pinnedTags) {
    const o = u === s ? c : u;
    o.trim() && !y.has(o) && (y.add(o), a.push(o));
  }
  return be({ ...e, pinnedTags: a });
}
function Ge(s) {
  const c = ue();
  return c.pinnedTags.includes(s) ? be({
    ...c,
    pinnedTags: c.pinnedTags.filter((e) => e !== s)
  }) : c;
}
function Ke(s, c) {
  const e = s.filter((v) => v.count > 0 && v.name.trim() !== ""), y = new Map(e.map((v) => [v.name, v])), a = /* @__PURE__ */ new Set(), u = [];
  for (const v of c) {
    const h = y.get(v);
    h && !a.has(v) && (a.add(v), u.push(h));
  }
  const o = e.filter((v) => !a.has(v.name)).sort((v, h) => h.count !== v.count ? h.count - v.count : v.name.localeCompare(h.name, void 0, { sensitivity: "base" }));
  return [...u, ...o];
}
function We(s, c, e, y) {
  const a = Ke(s, c.pinnedTags);
  if (c.showAll)
    return { visible: a, hiddenCount: 0, showToggle: !1 };
  const u = new Set(c.pinnedTags), o = a.filter((w) => u.has(w.name)), v = a.filter((w) => !u.has(w.name)), h = v.slice(0, c.visibleCount), $ = [...o, ...h], k = new Set($.map((w) => w.name)), I = y && !k.has(y) ? a.find((w) => w.name === y) ?? null : null, U = I ? [...$, I] : $, T = Math.max(0, a.length - U.length);
  return e ? {
    visible: a,
    hiddenCount: 0,
    showToggle: v.length > c.visibleCount
  } : {
    visible: U,
    hiddenCount: T,
    showToggle: T > 0
  };
}
const Ye = { class: "recipe-list-page" }, He = { class: "intent-header-bar" }, Qe = { class: "filter-sort-bar" }, Ze = {
  key: 1,
  class: "recipes-grid"
}, Xe = {
  key: 2,
  class: "empty-state"
}, et = /* @__PURE__ */ oe({
  __name: "RecipeListPage",
  emits: ["openRecipe"],
  setup(s, { emit: c }) {
    const e = c, y = re(), a = f([]), u = f(""), o = f(null), v = f("title"), h = f(""), $ = f([]), k = f([]), I = f([]), U = f(ue()), T = f(!1), w = f(!1), B = f(/* @__PURE__ */ new Set());
    function N() {
      try {
        return localStorage.getItem("secretsauce:show_recipe_images") !== "false";
      } catch {
        return !0;
      }
    }
    const O = f(N());
    let C = 0;
    async function Y() {
      try {
        const r = await y.api.get("/api/x/core-shortlist");
        B.value = new Set(r.map((i) => i.recipe_id));
      } catch {
      }
    }
    async function W() {
      try {
        const r = await y.api.get("/api/recipes/sources");
        Array.isArray(r) ? k.value = r : r && Array.isArray(r.items) && (k.value = r.items);
      } catch {
      }
    }
    async function ee() {
      try {
        const r = await y.api.get("/api/recipes/tags"), i = Array.isArray(r) ? r : r && Array.isArray(r.items) ? r.items : [];
        I.value = i, o.value && !i.some((S) => S.name === o.value) && (o.value = null);
      } catch {
      }
    }
    async function V() {
      w.value = !w.value, w.value && await Y();
    }
    async function l() {
      const r = ++C;
      h.value = "";
      try {
        const i = { q: u.value.trim() };
        $.value.length > 0 && (i.source = $.value), o.value && (i.tag = o.value);
        const S = await y.api.get("/api/recipes", i);
        if (r !== C || (a.value = S.items, !O.value)) return;
        const q = await Promise.all(S.items.map(async (m) => {
          const n = await _e(y.api, m.group_id);
          return { ...m, cover_asset_id: n, cover_url: n ? y.url(`/api/assets/${n}/file`) : null };
        }));
        r === C && (a.value = q);
      } catch (i) {
        r === C && (h.value = (i == null ? void 0 : i.message) || "Could not load recipes");
      }
    }
    function d(r) {
      var i;
      e("openRecipe", r), (i = y.navigate) == null || i.call(y, `/recipes/${r}`);
    }
    function A() {
      l(), W(), ee();
    }
    const z = y.on("recipe:created", A), K = y.on("recipe:updated", A), j = y.on("recipe:deleted", A);
    ve(() => {
      typeof z == "function" && z(), typeof K == "function" && K(), typeof j == "function" && j();
    }), me(() => {
      O.value = N(), U.value = ue(), de.value && ($.value = [...de.value], de.value = null), l(), Y(), W(), ee();
    }), se([u, $, o], l);
    const M = Z(() => {
      const r = [
        { value: "none", label: "No source" }
      ], i = /* @__PURE__ */ new Set(["none"]);
      for (const S of k.value)
        !S.name || i.has(S.name) || (i.add(S.name), r.push({
          value: S.name,
          label: S.author ? `${S.name} (${S.author})` : S.name
        }));
      for (const S of $.value)
        i.has(S) || (i.add(S), r.push({ value: S, label: S }));
      return r;
    }), P = Z(
      () => We(I.value, U.value, T.value, o.value)
    ), G = Z(() => {
      let r = a.value.map((i) => ({ ...i, is_shortlisted: B.value.has(i.id) }));
      return w.value && (r = r.filter((i) => B.value.has(i.id))), r.sort(v.value === "title" ? (i, S) => i.title.localeCompare(S.title) : (i, S) => (i.prep_time_minutes || 0) - (S.prep_time_minutes || 0));
    });
    return (r, i) => {
      const S = R("InputIcon"), q = R("InputText"), m = R("IconField"), n = R("MultiSelect"), L = R("Button"), b = R("Select"), H = R("Message");
      return p(), _("div", Ye, [
        i[5] || (i[5] = t(
          "h1",
          null,
          "Recipes",
          -1
          /* CACHED */
        )),
        t("div", He, [
          g(m, { class: "search-box" }, {
            default: le(() => [
              g(S, { class: "pi pi-search" }),
              g(q, {
                modelValue: u.value,
                "onUpdate:modelValue": i[0] || (i[0] = (E) => u.value = E),
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
          g(J(ge), {
            hub: "recipe:create",
            label: "New recipe"
          })
        ]),
        t("div", Qe, [
          g(J(ae), {
            name: "recipe.list.filters",
            context: { active: w.value, toggle: V }
          }, null, 8, ["context"]),
          g(n, {
            modelValue: $.value,
            "onUpdate:modelValue": i[1] || (i[1] = (E) => $.value = E),
            class: "source-filter-select",
            "aria-label": "Filter by source",
            options: M.value,
            optionLabel: "label",
            optionValue: "value",
            filter: "",
            placeholder: "All sources",
            selectedItemsLabel: "{0} sources",
            maxSelectedLabels: 1,
            showToggleAll: !1
          }, null, 8, ["modelValue", "options"]),
          (p(!0), _(
            te,
            null,
            ne(P.value.visible, (E) => (p(), X(L, {
              key: E.name,
              class: "tag-filter-btn",
              label: `${E.name} (${E.count})`,
              size: "small",
              outlined: o.value !== E.name,
              "aria-pressed": o.value === E.name,
              onClick: (ce) => o.value = o.value === E.name ? null : E.name
            }, null, 8, ["label", "outlined", "aria-pressed", "onClick"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          P.value.showToggle ? (p(), X(L, {
            key: 0,
            class: "tag-more-btn",
            label: T.value ? "Less" : `More (${P.value.hiddenCount})`,
            size: "small",
            text: "",
            "aria-expanded": T.value,
            onClick: i[2] || (i[2] = (E) => T.value = !T.value)
          }, null, 8, ["label", "aria-expanded"])) : x("v-if", !0),
          g(b, {
            modelValue: v.value,
            "onUpdate:modelValue": i[3] || (i[3] = (E) => v.value = E),
            "aria-label": "Sort recipes",
            options: [{ id: "title", label: "Title (A–Z)" }, { id: "prep", label: "Prep time" }],
            optionLabel: "label",
            optionValue: "id"
          }, null, 8, ["modelValue"])
        ]),
        h.value ? (p(), X(H, {
          key: 0,
          severity: "error"
        }, {
          default: le(() => [
            Q(
              D(h.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        G.value.length ? (p(), _("div", Ze, [
          (p(!0), _(
            te,
            null,
            ne(G.value, (E) => (p(), X(Fe, {
              key: E.id,
              recipe: E,
              "show-cover": O.value,
              onSelect: d
            }, null, 8, ["recipe", "show-cover"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (p(), _("div", Xe, [
          i[4] || (i[4] = t(
            "p",
            null,
            "No recipes found.",
            -1
            /* CACHED */
          )),
          g(J(ge), {
            hub: "recipe:create",
            label: "Add your first recipe"
          })
        ]))
      ]);
    };
  }
}), tt = /* @__PURE__ */ ie(et, [["__scopeId", "data-v-f464e100"]]);
function lt(s) {
  const c = (s.title || "").trim() || "this recipe", e = Array.isArray(s.languages) ? s.languages.filter(Boolean) : [];
  return `${e.length > 1 ? `Delete '${c}' and all ${e.length} language versions (${e.map((a) => a.toUpperCase()).join(", ")})?` : `Delete '${c}'?`} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`;
}
function Se(s) {
  if (s.group_id) return s.group_id;
  if (s.id) {
    const c = s.id.indexOf("_");
    return c === -1 ? s.id : s.id.slice(0, c);
  }
  return "";
}
function Ie(s, c) {
  const e = s == null ? void 0 : s.entity_id;
  return !e || !c ? !1 : c.id && e === c.id ? !0 : c.group_id ? e === c.group_id || e.startsWith(`${c.group_id}_`) : !1;
}
async function Te(s, c) {
  var a;
  const e = Se(c);
  return !e || !await s.confirm({
    header: "Delete recipe",
    message: lt(c),
    acceptLabel: "Delete",
    rejectLabel: "Cancel",
    severity: "danger"
  }) ? !1 : (await s.api.delete(`/api/recipes/${e}`), s.notify({ level: "success", message: "Recipe deleted" }), (a = s.navigate) == null || a.call(s, "/recipes"), !0);
}
const nt = { class: "recipe-detail-page" }, at = {
  key: 0,
  class: "lang-bar"
}, ot = { class: "detail-header" }, it = {
  key: 0,
  class: "recipe-source-attribution"
}, st = {
  key: 0,
  class: "source-locator"
}, ut = {
  key: 1,
  class: "source-author"
}, rt = ["href"], ct = {
  key: 3,
  class: "source-notes"
}, dt = { key: 1 }, pt = { class: "detail-actions" }, vt = ["src", "alt"], mt = { class: "scaler-card" }, ft = { class: "servings-value" }, gt = {
  key: 2,
  class: "content-grid"
}, yt = { class: "ingredient-checklist" }, _t = ["for"], bt = {
  key: 0,
  class: "notes"
}, ht = { class: "steps-list" }, kt = /* @__PURE__ */ oe({
  __name: "RecipeDetailPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["switchLanguage"],
  setup(s, { emit: c }) {
    const e = s, y = c, a = re(), u = f(null), o = f(2), v = f({}), h = f(""), $ = f(!1), k = f(null), I = f(!1), U = Z(() => e.id || e.recipeId || ""), T = f(null), w = f(!1);
    let B = 0;
    const N = a.on("recipe:deleted", (V) => {
      var l;
      w.value || !u.value || Ie(V, u.value) && (a.notify({ level: "info", message: "This recipe was deleted" }), (l = a.navigate) == null || l.call(a, "/recipes"));
    });
    ve(() => {
      typeof N == "function" && N();
    }), se(U, async (V) => {
      if (!V) return;
      const l = ++B;
      h.value = "", T.value = null, k.value = null, I.value = !1;
      try {
        const d = await a.api.get(`/api/recipes/${V}`);
        if (l !== B) return;
        u.value = d, o.value = d.servings || 2, v.value = {}, $.value = !1;
        const A = await _e(a.api, d.group_id);
        if (l !== B) return;
        T.value = A;
        try {
          const z = await a.api.get("/api/x/core-shortlist");
          l === B && ($.value = z.some((K) => K.recipe_id === V));
        } catch {
        }
      } catch (d) {
        l === B && (u.value = null, h.value = (d == null ? void 0 : d.message) || "Could not load recipe");
      }
    }, { immediate: !0 });
    function O(V) {
      var l;
      y("switchLanguage", V), (l = a.navigate) == null || l.call(a, `/recipes/${V}`);
    }
    const C = Z(() => {
      var l, d;
      const V = ((l = k.value) == null ? void 0 : l.source) ?? ((d = u.value) == null ? void 0 : d.source);
      return V && V.name ? V : null;
    });
    function Y(V) {
      var l;
      de.value = [V], (l = a.navigate) == null || l.call(a, "/recipes");
    }
    function W(V) {
      var d;
      if (V == null) return "";
      const l = V * o.value / (((d = u.value) == null ? void 0 : d.servings) || 1);
      return Number.isInteger(l) ? String(l) : l.toFixed(1);
    }
    const ee = Z(() => ({
      recipe: u.value,
      customizedRecipe: k.value,
      customizeOpen: I.value,
      currentServings: o.value,
      checkedIngredients: v.value,
      setCustomizeOpen: (V) => {
        I.value = V;
      },
      applyCustomization: (V) => {
        k.value = V, v.value = {}, V != null && V.servings && (o.value = V.servings);
      },
      resetCustomization: () => {
        k.value = null, v.value = {}, u.value && (o.value = u.value.servings || 2);
      },
      onRecipeUpdated: (V) => {
        u.value = V, k.value = null, I.value = !1, v.value = {}, o.value = V.servings || 2;
      },
      setCheckedIngredients: (V) => {
        v.value = V;
      }
    }));
    return (V, l) => {
      var j, M;
      const d = R("Button"), A = R("Message"), z = R("Checkbox"), K = R("Tag");
      return p(), _("div", nt, [
        g(d, {
          label: "All recipes",
          class: "btn-back",
          icon: "pi pi-arrow-left",
          text: "",
          onClick: l[0] || (l[0] = (P) => {
            var G, r;
            return (r = (G = J(a)).navigate) == null ? void 0 : r.call(G, "/recipes");
          })
        }),
        h.value ? (p(), X(A, {
          key: 0,
          severity: "error"
        }, {
          default: le(() => [
            Q(
              D(h.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        u.value ? (p(), _(
          te,
          { key: 1 },
          [
            ((j = u.value.languages) == null ? void 0 : j.length) > 1 ? (p(), _("div", at, [
              l[4] || (l[4] = t(
                "span",
                null,
                "Languages:",
                -1
                /* CACHED */
              )),
              (p(!0), _(
                te,
                null,
                ne(u.value.languages, (P) => (p(), X(d, {
                  key: P,
                  label: P.toUpperCase(),
                  size: "small",
                  outlined: P !== u.value.language,
                  onClick: (G) => O(`${u.value.group_id}_${P}`)
                }, null, 8, ["label", "outlined", "onClick"]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : x("v-if", !0),
            t("div", ot, [
              t("div", null, [
                t(
                  "h1",
                  null,
                  D(((M = k.value) == null ? void 0 : M.title) || u.value.title),
                  1
                  /* TEXT */
                ),
                C.value ? (p(), _("div", it, [
                  t(
                    "i",
                    {
                      class: fe(J(we)(C.value.type)),
                      "aria-hidden": "true"
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  l[6] || (l[6] = t(
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
                      onClick: l[1] || (l[1] = (P) => Y(C.value.name))
                    },
                    D(C.value.name),
                    1
                    /* TEXT */
                  ),
                  C.value.type === "cookbook" && C.value.page ? (p(), _(
                    "span",
                    st,
                    ", p. " + D(C.value.page),
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  C.value.author ? (p(), _(
                    "span",
                    ut,
                    " by " + D(C.value.author),
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  C.value.url ? (p(), _("a", {
                    key: 2,
                    href: C.value.url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    class: "source-external-link",
                    "aria-label": "Open source URL"
                  }, [...l[5] || (l[5] = [
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
                  ])], 8, rt)) : x("v-if", !0),
                  C.value.notes ? (p(), _(
                    "span",
                    ct,
                    " — " + D(C.value.notes),
                    1
                    /* TEXT */
                  )) : x("v-if", !0)
                ])) : x("v-if", !0),
                !k.value && u.value.description ? (p(), _(
                  "p",
                  dt,
                  D(u.value.description),
                  1
                  /* TEXT */
                )) : x("v-if", !0)
              ]),
              t("div", pt, [
                g(J(ae), {
                  name: "recipe.detail.actions",
                  context: ee.value
                }, null, 8, ["context"]),
                g(J(ae), {
                  name: "recipe.card.actions",
                  context: { recipe: u.value, isShortlisted: $.value }
                }, null, 8, ["context"]),
                g(J(ge), {
                  hub: "recipe:actions",
                  context: { recipe: u.value, onBeforeDelete: () => {
                    w.value = !0;
                  }, onDeleteAborted: () => {
                    w.value = !1;
                  } },
                  label: "Actions"
                }, null, 8, ["context"])
              ])
            ]),
            T.value ? (p(), _("img", {
              key: 1,
              src: J(a).url(`/api/assets/${T.value}/file`),
              alt: u.value.title,
              class: "recipe-cover"
            }, null, 8, vt)) : x("v-if", !0),
            t("div", mt, [
              l[7] || (l[7] = t(
                "span",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              g(d, {
                class: "btn-scaler-minus",
                icon: "pi pi-minus",
                "aria-label": "Decrease servings",
                rounded: "",
                outlined: "",
                disabled: o.value <= 1,
                onClick: l[2] || (l[2] = (P) => o.value--)
              }, null, 8, ["disabled"]),
              t(
                "span",
                ft,
                D(o.value),
                1
                /* TEXT */
              ),
              g(d, {
                class: "btn-scaler-plus",
                icon: "pi pi-plus",
                "aria-label": "Increase servings",
                rounded: "",
                outlined: "",
                onClick: l[3] || (l[3] = (P) => o.value++)
              })
            ]),
            g(J(ae), {
              name: "recipe.detail.customize",
              context: ee.value
            }, null, 8, ["context"]),
            k.value ? x("v-if", !0) : (p(), _("div", gt, [
              t("section", null, [
                l[8] || (l[8] = t(
                  "h3",
                  null,
                  "Ingredients",
                  -1
                  /* CACHED */
                )),
                t("ul", yt, [
                  (p(!0), _(
                    te,
                    null,
                    ne(u.value.ingredients, (P, G) => (p(), _("li", {
                      key: G,
                      class: "ingredient-item"
                    }, [
                      g(z, {
                        inputId: `ingredient-${G}`,
                        modelValue: v.value[G],
                        "onUpdate:modelValue": (r) => v.value[G] = r,
                        binary: ""
                      }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"]),
                      t("label", {
                        for: `ingredient-${G}`,
                        class: fe({ struck: v.value[G] })
                      }, [
                        t(
                          "strong",
                          null,
                          D(W(P.quantity)),
                          1
                          /* TEXT */
                        ),
                        Q(
                          " " + D(P.unit) + " " + D(P.name),
                          1
                          /* TEXT */
                        ),
                        P.notes ? (p(), _(
                          "span",
                          bt,
                          " (" + D(P.notes) + ")",
                          1
                          /* TEXT */
                        )) : x("v-if", !0)
                      ], 10, _t)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])
              ]),
              t("section", null, [
                l[9] || (l[9] = t(
                  "h3",
                  null,
                  "Instructions",
                  -1
                  /* CACHED */
                )),
                t("ol", ht, [
                  (p(!0), _(
                    te,
                    null,
                    ne(u.value.steps, (P) => (p(), _("li", {
                      key: P.id
                    }, [
                      t(
                        "p",
                        null,
                        D(P.instruction),
                        1
                        /* TEXT */
                      ),
                      P.timer_minutes ? (p(), X(K, {
                        key: 0,
                        value: `${P.timer_minutes} min`,
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
            g(J(ae), {
              name: "recipe.detail.sidebar",
              context: { recipe: u.value }
            }, null, 8, ["context"]),
            g(J(ae), {
              name: "recipe.detail.footer",
              context: { recipe: u.value }
            }, null, 8, ["context"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : x("v-if", !0)
      ]);
    };
  }
}), $t = /* @__PURE__ */ ie(kt, [["__scopeId", "data-v-678e2974"]]), wt = { class: "ingredient-row-list" }, Ct = { class: "reorder-btns" }, Vt = /* @__PURE__ */ oe({
  __name: "IngredientRowList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(s, { emit: c }) {
    const e = s, y = c, a = f(JSON.parse(JSON.stringify(e.modelValue || [])));
    se(() => e.modelValue, (k) => {
      a.value = JSON.parse(JSON.stringify(k || []));
    }, { deep: !0 });
    const u = [null, "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "clove", "pinch", "can"].map((k) => ({ id: k, label: k || "(none)" }));
    function o() {
      y("update:modelValue", a.value);
    }
    function v() {
      a.value.push({ id: crypto.randomUUID(), quantity: 1, unit: "g", name: "", notes: "" }), o();
    }
    function h(k) {
      a.value.splice(k, 1), o();
    }
    function $(k, I) {
      const U = k + I;
      U < 0 || U >= a.value.length || (a.value.splice(U, 0, a.value.splice(k, 1)[0]), o());
    }
    return (k, I) => {
      const U = R("Button"), T = R("InputNumber"), w = R("Select"), B = R("InputText");
      return p(), _("div", wt, [
        (p(!0), _(
          te,
          null,
          ne(a.value, (N, O) => (p(), _("div", {
            key: N.id,
            class: "ingredient-row"
          }, [
            t("div", Ct, [
              g(U, {
                icon: "pi pi-angle-up",
                "aria-label": "Move ingredient up",
                text: "",
                size: "small",
                disabled: O === 0,
                onClick: (C) => $(O, -1)
              }, null, 8, ["disabled", "onClick"]),
              g(U, {
                icon: "pi pi-angle-down",
                "aria-label": "Move ingredient down",
                text: "",
                size: "small",
                disabled: O === a.value.length - 1,
                onClick: (C) => $(O, 1)
              }, null, 8, ["disabled", "onClick"])
            ]),
            g(T, {
              modelValue: N.quantity,
              "onUpdate:modelValue": [(C) => N.quantity = C, o],
              inputClass: "input-qty",
              "aria-label": `Ingredient ${O + 1} quantity`,
              min: 0,
              maxFractionDigits: 3
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            g(w, {
              modelValue: N.unit,
              "onUpdate:modelValue": [(C) => N.unit = C, o],
              options: J(u),
              optionLabel: "label",
              optionValue: "id",
              class: "select-unit",
              "aria-label": `Ingredient ${O + 1} unit`
            }, null, 8, ["modelValue", "onUpdate:modelValue", "options", "aria-label"]),
            g(B, {
              modelValue: N.name,
              "onUpdate:modelValue": (C) => N.name = C,
              class: "input-name",
              "aria-label": `Ingredient ${O + 1} name`,
              placeholder: "Ingredient name",
              onInput: o
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            g(B, {
              modelValue: N.notes,
              "onUpdate:modelValue": (C) => N.notes = C,
              class: "input-notes",
              "aria-label": `Ingredient ${O + 1} notes`,
              placeholder: "Notes",
              onInput: o
            }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
            g(U, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove ingredient",
              text: "",
              severity: "danger",
              onClick: (C) => h(O)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        g(U, {
          label: "Add Ingredient",
          class: "btn-add-ingredient",
          icon: "pi pi-plus",
          outlined: "",
          onClick: v
        })
      ]);
    };
  }
}), St = /* @__PURE__ */ ie(Vt, [["__scopeId", "data-v-6a40d29c"]]), It = { class: "step-list" }, Tt = { class: "step-inputs" }, At = { class: "timer-row" }, Rt = ["for"], Ut = /* @__PURE__ */ oe({
  __name: "StepList",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(s, { emit: c }) {
    const e = s, y = c, a = f(JSON.parse(JSON.stringify(e.modelValue || [])));
    se(() => e.modelValue, (h) => {
      a.value = JSON.parse(JSON.stringify(h || []));
    }, { deep: !0 });
    function u() {
      y("update:modelValue", a.value);
    }
    function o() {
      a.value.push({ id: crypto.randomUUID(), instruction: "", timer_minutes: null }), u();
    }
    function v(h) {
      a.value.splice(h, 1), u();
    }
    return (h, $) => {
      const k = R("Tag"), I = R("Textarea"), U = R("InputNumber"), T = R("Button");
      return p(), _("div", It, [
        (p(!0), _(
          te,
          null,
          ne(a.value, (w, B) => (p(), _("div", {
            key: w.id,
            class: "step-row"
          }, [
            g(k, {
              value: String(B + 1),
              severity: "secondary"
            }, null, 8, ["value"]),
            t("div", Tt, [
              g(I, {
                modelValue: w.instruction,
                "onUpdate:modelValue": (N) => w.instruction = N,
                class: "textarea-instruction",
                "aria-label": `Step ${B + 1} instruction`,
                rows: "3",
                fluid: "",
                onInput: u
              }, null, 8, ["modelValue", "onUpdate:modelValue", "aria-label"]),
              t("div", At, [
                t("label", {
                  for: `timer-${w.id}`
                }, "Timer (min)", 8, Rt),
                g(U, {
                  inputId: `timer-${w.id}`,
                  modelValue: w.timer_minutes,
                  "onUpdate:modelValue": [(N) => w.timer_minutes = N, u],
                  min: 0,
                  inputClass: "input-timer"
                }, null, 8, ["inputId", "modelValue", "onUpdate:modelValue"])
              ])
            ]),
            g(T, {
              icon: "pi pi-times",
              class: "btn-remove",
              "aria-label": "Remove step",
              severity: "danger",
              text: "",
              onClick: (N) => v(B)
            }, null, 8, ["onClick"])
          ]))),
          128
          /* KEYED_FRAGMENT */
        )),
        g(T, {
          label: "Add Step",
          class: "btn-add-step",
          icon: "pi pi-plus",
          outlined: "",
          onClick: o
        })
      ]);
    };
  }
}), xt = /* @__PURE__ */ ie(Ut, [["__scopeId", "data-v-4c4135f0"]]), Dt = { class: "source-editor" }, Lt = { class: "source-header" }, Nt = { class: "source-grid" }, Pt = { class: "form-group" }, Bt = { class: "form-group source-name-field" }, Ot = { class: "source-suggestion" }, zt = { class: "suggestion-name" }, Mt = { class: "suggestion-meta" }, Et = {
  key: 0,
  class: "form-group"
}, qt = {
  key: 1,
  class: "form-group"
}, Ft = {
  key: 2,
  class: "form-group source-url-field"
}, Jt = {
  key: 3,
  class: "form-group source-notes-field"
}, jt = /* @__PURE__ */ oe({
  __name: "SourceEditor",
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(s, { emit: c }) {
    const e = s, y = c, a = re(), u = [
      { value: "cookbook", label: "Cookbook" },
      { value: "website", label: "Website" },
      { value: "person", label: "Person" },
      { value: "other", label: "Other" }
    ], o = f("cookbook"), v = f(""), h = f(""), $ = f(""), k = f(""), I = f(""), U = f([]), T = f([]);
    let w = !1;
    function B(l) {
      w = !0, l && l.name ? (o.value = l.type || "other", v.value = l.name || "", h.value = l.author || "", $.value = l.page || "", k.value = l.url || "", I.value = l.notes || "") : (v.value = "", h.value = "", $.value = "", k.value = "", I.value = ""), w = !1;
    }
    se(() => e.modelValue, B, { immediate: !0, deep: !0 });
    function N() {
      if (w) return;
      const l = v.value.trim();
      if (!l) {
        y("update:modelValue", null);
        return;
      }
      const d = {
        type: o.value,
        name: l
      }, A = h.value.trim(), z = $.value.trim(), K = k.value.trim(), j = I.value.trim();
      A && (d.author = A), o.value === "cookbook" && z && (d.page = z), (o.value === "website" || o.value === "other") && K && (d.url = K), j && (d.notes = j), y("update:modelValue", d);
    }
    se([o, v, h, $, k, I], N), me(async () => {
      var l, d;
      try {
        const A = await ((d = (l = a.api) == null ? void 0 : l.get) == null ? void 0 : d.call(l, "/api/recipes/sources"));
        Array.isArray(A) ? U.value = A : A && Array.isArray(A.items) && (U.value = A.items);
      } catch {
      }
    });
    function O(l) {
      const d = (l.query || "").trim().toLowerCase();
      if (!d) {
        T.value = [...U.value];
        return;
      }
      T.value = U.value.filter(
        (A) => A.name.toLowerCase().includes(d) || A.author && A.author.toLowerCase().includes(d)
      );
    }
    function C(l) {
      l && typeof l == "object" ? (v.value = l.name || "", l.type && (o.value = l.type), (l.author && !h.value.trim() || l.author) && (h.value = l.author)) : v.value = typeof l == "string" ? l : "";
    }
    function Y(l) {
      const d = l == null ? void 0 : l.value;
      d && (v.value = d.name, d.type && (o.value = d.type), d.author && (h.value = d.author));
    }
    function W() {
      v.value = "", h.value = "", $.value = "", k.value = "", I.value = "", y("update:modelValue", null);
    }
    const ee = Z(
      () => !!(v.value.trim() || h.value.trim() || $.value.trim() || k.value.trim() || I.value.trim())
    ), V = Z(() => {
      switch (o.value) {
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
    return (l, d) => {
      const A = R("Button"), z = R("Select"), K = R("AutoComplete"), j = R("InputText");
      return p(), _("fieldset", Dt, [
        t("div", Lt, [
          d[5] || (d[5] = t(
            "legend",
            null,
            "Source",
            -1
            /* CACHED */
          )),
          ee.value ? (p(), X(A, {
            key: 0,
            type: "button",
            label: "Clear",
            size: "small",
            text: "",
            severity: "secondary",
            onClick: W
          })) : x("v-if", !0)
        ]),
        t("div", Nt, [
          t("div", Pt, [
            d[6] || (d[6] = t(
              "label",
              { for: "recipe-source-type" },
              "Source type",
              -1
              /* CACHED */
            )),
            g(z, {
              inputId: "recipe-source-type",
              modelValue: o.value,
              "onUpdate:modelValue": d[0] || (d[0] = (M) => o.value = M),
              options: u,
              optionLabel: "label",
              optionValue: "value",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Bt, [
            d[7] || (d[7] = t(
              "label",
              { for: "recipe-source-name" },
              "Source name",
              -1
              /* CACHED */
            )),
            g(K, {
              inputId: "recipe-source-name",
              modelValue: v.value,
              suggestions: T.value,
              optionLabel: "name",
              completeOnFocus: !0,
              placeholder: V.value,
              fluid: "",
              "onUpdate:modelValue": C,
              onComplete: O,
              onItemSelect: Y
            }, {
              option: le(({ option: M }) => [
                t("div", Ot, [
                  t(
                    "span",
                    zt,
                    D(M.name),
                    1
                    /* TEXT */
                  ),
                  t("small", Mt, [
                    Q(
                      D(J(Ue)(M.type)),
                      1
                      /* TEXT */
                    ),
                    M.author ? (p(), _(
                      te,
                      { key: 0 },
                      [
                        Q(
                          " · " + D(M.author),
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
          o.value !== "person" ? (p(), _("div", Et, [
            d[8] || (d[8] = t(
              "label",
              { for: "recipe-source-author" },
              "Author",
              -1
              /* CACHED */
            )),
            g(j, {
              id: "recipe-source-author",
              modelValue: h.value,
              "onUpdate:modelValue": d[1] || (d[1] = (M) => h.value = M),
              placeholder: "e.g. Yotam Ottolenghi",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          o.value === "cookbook" ? (p(), _("div", qt, [
            d[9] || (d[9] = t(
              "label",
              { for: "recipe-source-page" },
              "Page #",
              -1
              /* CACHED */
            )),
            g(j, {
              id: "recipe-source-page",
              modelValue: $.value,
              "onUpdate:modelValue": d[2] || (d[2] = (M) => $.value = M),
              placeholder: "e.g. 142",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          o.value === "website" || o.value === "other" ? (p(), _("div", Ft, [
            d[10] || (d[10] = t(
              "label",
              { for: "recipe-source-url" },
              "URL",
              -1
              /* CACHED */
            )),
            g(j, {
              id: "recipe-source-url",
              modelValue: k.value,
              "onUpdate:modelValue": d[3] || (d[3] = (M) => k.value = M),
              type: "url",
              placeholder: "https://…",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0),
          o.value === "person" || o.value === "other" ? (p(), _("div", Jt, [
            d[11] || (d[11] = t(
              "label",
              { for: "recipe-source-notes" },
              "Source notes",
              -1
              /* CACHED */
            )),
            g(j, {
              id: "recipe-source-notes",
              modelValue: I.value,
              "onUpdate:modelValue": d[4] || (d[4] = (M) => I.value = M),
              placeholder: "Optional context or adaptation notes",
              fluid: ""
            }, null, 8, ["modelValue"])
          ])) : x("v-if", !0)
        ])
      ]);
    };
  }
}), Gt = /* @__PURE__ */ ie(jt, [["__scopeId", "data-v-267c9e36"]]), Kt = { class: "edit-top-bar" }, Wt = { class: "edit-top-actions" }, Yt = { class: "form-group" }, Ht = { class: "form-group" }, Qt = { class: "form-row" }, Zt = { class: "form-group" }, Xt = { class: "form-group" }, el = { class: "form-group" }, tl = { class: "form-group" }, ll = { class: "form-group" }, nl = { class: "form-group" }, al = ["disabled"], ol = { key: 0 }, il = { key: 1 }, sl = ["src"], ul = { class: "actions-row" }, rl = /* @__PURE__ */ oe({
  __name: "RecipeEditPage",
  props: {
    recipeId: {},
    id: {}
  },
  emits: ["saved"],
  setup(s, { emit: c }) {
    var q;
    const e = s, y = c, a = re(), u = Z(() => e.id || e.recipeId || ""), o = f(""), v = f(""), h = f(((q = a.store.household.value) == null ? void 0 : q.languages.primary) || "en"), $ = f(2), k = f(""), I = f(null), U = f(null), T = f([]), w = f(null), B = f([]), N = f([]), O = f(null), C = f(null), Y = f([]), W = f([]), ee = f(1), V = f([]), l = f(!1), d = f(!1), A = f(!1), z = f(""), K = a.on("recipe:deleted", (m) => {
      d.value || !u.value || Ie(m, { id: u.value, group_id: k.value }) && (A.value = !0);
    });
    ve(() => {
      typeof K == "function" && K();
    }), me(async () => {
      var m, n;
      try {
        const L = await ((n = (m = a.api) == null ? void 0 : m.get) == null ? void 0 : n.call(m, "/api/recipes/tags"));
        Array.isArray(L) ? B.value = L : L && Array.isArray(L.items) && (B.value = L.items);
      } catch {
      }
    });
    function j(m) {
      const n = (m.query || "").trim().toLowerCase(), L = new Set(T.value);
      N.value = B.value.map((b) => b.name).filter((b) => !L.has(b) && (!n || b.toLowerCase().includes(n)));
    }
    function M(m) {
      var b, H;
      const n = m.target;
      if (!n || n.tagName !== "INPUT" || n.getAttribute("aria-activedescendant")) return;
      const L = n.value.trim();
      L && (m.preventDefault(), m.stopPropagation(), T.value.includes(L) || (T.value = [...T.value, L]), n.value = "", N.value = [], (H = (b = O.value) == null ? void 0 : b.hide) == null || H.call(b));
    }
    se(u, async (m) => {
      if (A.value = !1, !!m)
        try {
          const n = await a.api.get(`/api/recipes/${m}`);
          o.value = n.title, v.value = n.description || "", h.value = n.language, $.value = n.servings, I.value = n.prep_time_minutes, U.value = n.cook_time_minutes, T.value = [...n.tags], C.value = n.source || null, Y.value = n.ingredients, W.value = n.steps, ee.value = n.revision, V.value = n.languages || [], w.value = await _e(a.api, n.group_id), k.value = n.group_id;
        } catch (n) {
          z.value = (n == null ? void 0 : n.message) || "Could not load recipe";
        }
    }, { immediate: !0 });
    async function P(m) {
      var L;
      const n = (L = m.target.files) == null ? void 0 : L[0];
      if (!(!n || l.value || !k.value)) {
        l.value = !0, z.value = "";
        try {
          const b = new FormData();
          b.append("file", n), b.append("entity_type", "recipe"), b.append("entity_id", k.value), b.append("slot", "cover"), w.value = (await a.api.upload("/api/assets", b)).id, a.notify({ level: "success", message: "Cover image saved" });
        } catch (b) {
          z.value = (b == null ? void 0 : b.message) || "Could not upload image";
        } finally {
          l.value = !1;
        }
      }
    }
    async function G() {
      var n;
      if (!o.value.trim() || l.value || A.value) return;
      l.value = !0, z.value = "";
      const m = {
        title: o.value.trim(),
        description: v.value.trim(),
        language: h.value,
        servings: $.value,
        prep_time_minutes: I.value,
        cook_time_minutes: U.value,
        tags: T.value,
        ingredients: Y.value,
        steps: W.value
      };
      (C.value !== null || u.value) && (m.source = C.value);
      try {
        const L = u.value ? await a.api.patch(`/api/recipes/${u.value}`, { ...m, revision: ee.value }) : await a.api.post("/api/recipes", m);
        y("saved", L), a.notify({ level: "success", message: "Recipe saved" }), (n = a.navigate) == null || n.call(a, `/recipes/${L.id}`);
      } catch (L) {
        z.value = (L == null ? void 0 : L.message) || "Could not save recipe";
      } finally {
        l.value = !1;
      }
    }
    async function r() {
      if (!(!u.value || l.value || A.value)) {
        l.value = !0, d.value = !0, z.value = "";
        try {
          await Te(a, {
            id: u.value,
            group_id: k.value || void 0,
            title: o.value.trim() || "this recipe",
            languages: V.value
          }) || (d.value = !1);
        } catch (m) {
          d.value = !1, z.value = (m == null ? void 0 : m.message) || "Could not delete recipe";
        } finally {
          l.value = !1;
        }
      }
    }
    function i(m) {
      m.title && (o.value = m.title), m.description !== void 0 && (v.value = m.description || ""), m.servings && ($.value = m.servings), m.prep_time_minutes !== void 0 && (I.value = m.prep_time_minutes), m.cook_time_minutes !== void 0 && (U.value = m.cook_time_minutes), m.tags && (T.value = [...m.tags]), m.source !== void 0 && (C.value = m.source || null), m.ingredients && (Y.value = [...m.ingredients]), m.steps && (W.value = [...m.steps]);
    }
    const S = Z(() => ({
      targetId: u.value,
      recipe: {
        id: u.value,
        title: o.value,
        description: v.value,
        language: h.value,
        servings: $.value,
        prep_time_minutes: I.value,
        cook_time_minutes: U.value,
        tags: T.value,
        source: C.value,
        ingredients: Y.value,
        steps: W.value
      },
      applyAdaptation: i
    }));
    return (m, n) => {
      const L = R("Button"), b = R("Message"), H = R("InputText"), E = R("Textarea"), ce = R("InputNumber"), Ae = R("AutoComplete");
      return p(), _(
        "form",
        {
          class: "recipe-edit-page",
          onSubmit: pe(G, ["prevent"])
        },
        [
          t("div", Kt, [
            t(
              "h2",
              null,
              D(u.value ? "Edit Recipe" : "New Recipe"),
              1
              /* TEXT */
            ),
            t("div", Wt, [
              g(J(ae), {
                name: "recipe.edit.actions",
                context: S.value
              }, null, 8, ["context"]),
              g(L, {
                label: "Cancel",
                class: "btn-cancel",
                severity: "secondary",
                disabled: l.value,
                onClick: n[0] || (n[0] = (F) => {
                  var he, ke;
                  return (ke = (he = J(a)).navigate) == null ? void 0 : ke.call(he, u.value ? `/recipes/${u.value}` : "/recipes");
                })
              }, null, 8, ["disabled"])
            ])
          ]),
          A.value ? (p(), X(b, {
            key: 0,
            severity: "warn"
          }, {
            default: le(() => [...n[11] || (n[11] = [
              Q(
                "This recipe was deleted in another session. Saving is disabled, or you can copy your changes before leaving.",
                -1
                /* CACHED */
              )
            ])]),
            _: 1
            /* STABLE */
          })) : x("v-if", !0),
          z.value ? (p(), X(b, {
            key: 1,
            severity: "error"
          }, {
            default: le(() => [
              Q(
                D(z.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : x("v-if", !0),
          t("div", Yt, [
            n[12] || (n[12] = t(
              "label",
              { for: "recipe-title" },
              "Title",
              -1
              /* CACHED */
            )),
            g(H, {
              id: "recipe-title",
              modelValue: o.value,
              "onUpdate:modelValue": n[1] || (n[1] = (F) => o.value = F),
              class: "input-title",
              required: "",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Ht, [
            n[13] || (n[13] = t(
              "label",
              { for: "recipe-description" },
              "Description",
              -1
              /* CACHED */
            )),
            g(E, {
              id: "recipe-description",
              modelValue: v.value,
              "onUpdate:modelValue": n[2] || (n[2] = (F) => v.value = F),
              class: "textarea",
              rows: "3",
              fluid: ""
            }, null, 8, ["modelValue"])
          ]),
          t("div", Qt, [
            t("div", Zt, [
              n[14] || (n[14] = t(
                "label",
                { for: "recipe-language" },
                "Language",
                -1
                /* CACHED */
              )),
              g(H, {
                id: "recipe-language",
                modelValue: h.value,
                "onUpdate:modelValue": n[3] || (n[3] = (F) => h.value = F),
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", Xt, [
              n[15] || (n[15] = t(
                "label",
                { for: "recipe-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              g(ce, {
                inputId: "recipe-servings",
                modelValue: $.value,
                "onUpdate:modelValue": n[4] || (n[4] = (F) => $.value = F),
                min: 1,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", el, [
              n[16] || (n[16] = t(
                "label",
                { for: "recipe-prep" },
                "Prep time (min)",
                -1
                /* CACHED */
              )),
              g(ce, {
                inputId: "recipe-prep",
                modelValue: I.value,
                "onUpdate:modelValue": n[5] || (n[5] = (F) => I.value = F),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ]),
            t("div", tl, [
              n[17] || (n[17] = t(
                "label",
                { for: "recipe-cook" },
                "Cook time (min)",
                -1
                /* CACHED */
              )),
              g(ce, {
                inputId: "recipe-cook",
                modelValue: U.value,
                "onUpdate:modelValue": n[6] || (n[6] = (F) => U.value = F),
                min: 0,
                fluid: ""
              }, null, 8, ["modelValue"])
            ])
          ]),
          t("div", ll, [
            n[18] || (n[18] = t(
              "label",
              { for: "recipe-tags" },
              "Tags",
              -1
              /* CACHED */
            )),
            g(Ae, {
              ref_key: "tagAutoComplete",
              ref: O,
              inputId: "recipe-tags",
              modelValue: T.value,
              "onUpdate:modelValue": n[7] || (n[7] = (F) => T.value = F),
              multiple: "",
              suggestions: N.value,
              delay: 0,
              onComplete: j,
              onKeydown: Re(M, ["enter"]),
              fluid: ""
            }, null, 8, ["modelValue", "suggestions"])
          ]),
          g(Gt, {
            modelValue: C.value,
            "onUpdate:modelValue": n[8] || (n[8] = (F) => C.value = F)
          }, null, 8, ["modelValue"]),
          t("div", nl, [
            n[19] || (n[19] = t(
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
              disabled: l.value || !k.value,
              onChange: P
            }, null, 40, al),
            u.value ? (p(), _("small", il, "Cover uploads are saved immediately, separately from recipe edits.")) : (p(), _("small", ol, "Save your recipe first to add a cover image.")),
            w.value ? (p(), _("img", {
              key: 2,
              src: J(a).url(`/api/assets/${w.value}/file`),
              alt: "Recipe cover",
              class: "cover-preview"
            }, null, 8, sl)) : x("v-if", !0)
          ]),
          t("section", null, [
            n[20] || (n[20] = t(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            g(St, {
              modelValue: Y.value,
              "onUpdate:modelValue": n[9] || (n[9] = (F) => Y.value = F)
            }, null, 8, ["modelValue"])
          ]),
          t("section", null, [
            n[21] || (n[21] = t(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            g(xt, {
              modelValue: W.value,
              "onUpdate:modelValue": n[10] || (n[10] = (F) => W.value = F)
            }, null, 8, ["modelValue"])
          ]),
          t("div", ul, [
            u.value ? (p(), X(L, {
              key: 0,
              type: "button",
              label: "Delete Recipe",
              class: "btn-delete-recipe",
              icon: "pi pi-trash",
              severity: "danger",
              outlined: "",
              loading: d.value && l.value,
              disabled: l.value || A.value,
              onClick: r
            }, null, 8, ["loading", "disabled"])) : x("v-if", !0),
            g(L, {
              type: "submit",
              label: "Save Recipe",
              class: "btn-primary",
              icon: "pi pi-check",
              loading: l.value && !d.value,
              disabled: !o.value.trim() || l.value || A.value
            }, null, 8, ["loading", "disabled"])
          ])
        ],
        32
        /* NEED_HYDRATION */
      );
    };
  }
}), $e = /* @__PURE__ */ ie(rl, [["__scopeId", "data-v-c798b480"]]), cl = { class: "ss-recipe-tag-settings" }, dl = { class: "tag-settings-group" }, pl = { class: "device-toggle" }, vl = { class: "limit-field" }, ml = {
  key: 0,
  class: "pinned-list"
}, fl = { class: "tag-list" }, gl = ["data-pinned-tag"], yl = { class: "tag-row-label" }, _l = {
  key: 1,
  class: "muted"
}, bl = { class: "tag-row-actions" }, hl = { class: "tag-settings-group" }, kl = {
  key: 1,
  class: "muted"
}, $l = {
  key: 2,
  class: "tag-list"
}, wl = ["data-tag-name"], Cl = { class: "tag-row-label" }, Vl = { class: "tag-row-actions" }, Sl = { class: "section-help" }, Il = { class: "limit-field rename-field" }, Tl = { class: "rename-actions" }, Al = /* @__PURE__ */ oe({
  __name: "RecipeTagSettings",
  setup(s) {
    var M, P, G;
    const c = re(), e = f(ue()), y = f(String(e.value.visibleCount)), a = f([]), u = f(!1), o = f(!1), v = f(""), h = f(!1), $ = f(""), k = f(""), I = f(""), U = Z(() => new Set(e.value.pinnedTags)), T = Z(() => new Map(a.value.map((r) => [r.name, r.count]))), w = Z(() => k.value.trim()), B = Z(
      () => w.value !== "" && w.value !== $.value && T.value.has(w.value)
    ), N = Z(
      () => !o.value && w.value !== "" && w.value !== $.value
    );
    function O(r) {
      e.value = be(r), y.value = String(e.value.visibleCount);
    }
    function C(r) {
      O({ ...e.value, showAll: r });
    }
    function Y() {
      const r = String(y.value ?? "").trim(), i = r === "" ? Number.NaN : Number(r);
      if (!Number.isInteger(i) || i < 0) {
        y.value = String(e.value.visibleCount);
        return;
      }
      O({ ...e.value, visibleCount: i });
    }
    function W(r) {
      const i = U.value.has(r) ? e.value.pinnedTags.filter((S) => S !== r) : [...e.value.pinnedTags, r];
      O({ ...e.value, pinnedTags: i });
    }
    function ee(r, i) {
      const S = [...e.value.pinnedTags], q = r + i;
      q < 0 || q >= S.length || ([S[r], S[q]] = [S[q], S[r]], O({ ...e.value, pinnedTags: S }));
    }
    function V(r) {
      $.value = r.name, k.value = r.name, I.value = "", h.value = !0;
    }
    async function l() {
      var q;
      if (!N.value) return;
      const r = $.value, i = w.value, S = B.value;
      o.value = !0, I.value = "";
      try {
        await c.api.post("/api/recipes/tags/rename", {
          from_name: r,
          to_name: i
        }), e.value = je(r, i), h.value = !1, await A(), (q = c.notify) == null || q.call(c, {
          level: "success",
          message: S ? `Merged '${r}' into '${i}'` : `Renamed '${r}' to '${i}'`
        });
      } catch (m) {
        I.value = (m == null ? void 0 : m.message) || "Could not rename tag";
      } finally {
        o.value = !1;
      }
    }
    async function d(r) {
      var q;
      if (o.value) return;
      const i = r.count === 1 ? "recipe" : "recipes";
      if (await c.confirm({
        header: "Delete tag",
        message: `Remove tag '${r.name}' from ${r.count} ${i} across your household?`,
        acceptLabel: "Delete",
        rejectLabel: "Cancel",
        severity: "danger"
      })) {
        o.value = !0, v.value = "";
        try {
          await c.api.post("/api/recipes/tags/delete", { name: r.name }), e.value = Ge(r.name), await A(), (q = c.notify) == null || q.call(c, { level: "success", message: `Deleted tag '${r.name}'` });
        } catch (m) {
          v.value = (m == null ? void 0 : m.message) || "Could not delete tag";
        } finally {
          o.value = !1;
        }
      }
    }
    async function A() {
      u.value = !0, v.value = "";
      try {
        const r = await c.api.get("/api/recipes/tags");
        a.value = Array.isArray(r) ? r : r && Array.isArray(r.items) ? r.items : [];
      } catch (r) {
        v.value = (r == null ? void 0 : r.message) || "Could not load recipe tags";
      } finally {
        u.value = !1;
      }
    }
    const z = (M = c.on) == null ? void 0 : M.call(c, "recipe:created", A), K = (P = c.on) == null ? void 0 : P.call(c, "recipe:updated", A), j = (G = c.on) == null ? void 0 : G.call(c, "recipe:deleted", A);
    return ve(() => {
      typeof z == "function" && z(), typeof K == "function" && K(), typeof j == "function" && j();
    }), me(() => {
      e.value = ue(), y.value = String(e.value.visibleCount), A();
    }), (r, i) => {
      const S = R("ToggleSwitch"), q = R("InputText"), m = R("Button"), n = R("Message"), L = R("Dialog");
      return p(), _("div", cl, [
        t("section", dl, [
          i[8] || (i[8] = t(
            "h3",
            null,
            "Display on this device",
            -1
            /* CACHED */
          )),
          i[9] || (i[9] = t(
            "p",
            { class: "section-help" },
            " These display preferences apply only to this device. Pinned tags always appear first on the Recipes overview, followed by your top unpinned tags. ",
            -1
            /* CACHED */
          )),
          t("div", pl, [
            g(S, {
              inputId: "tag-show-all",
              "aria-label": "Show all tags",
              modelValue: e.value.showAll,
              "onUpdate:modelValue": C
            }, null, 8, ["modelValue"]),
            i[4] || (i[4] = t(
              "label",
              { for: "tag-show-all" },
              "Show all tags",
              -1
              /* CACHED */
            ))
          ]),
          t("div", vl, [
            i[5] || (i[5] = t(
              "label",
              { for: "tag-visible-count" },
              "Top tags to show",
              -1
              /* CACHED */
            )),
            g(q, {
              id: "tag-visible-count",
              modelValue: y.value,
              "onUpdate:modelValue": i[0] || (i[0] = (b) => y.value = b),
              type: "number",
              min: "0",
              step: "1",
              disabled: e.value.showAll,
              onChange: Y
            }, null, 8, ["modelValue", "disabled"]),
            i[6] || (i[6] = t(
              "small",
              { class: "field-help" },
              "Set to 0 to show only pinned tags until you click More.",
              -1
              /* CACHED */
            ))
          ]),
          e.value.pinnedTags.length ? (p(), _("div", ml, [
            i[7] || (i[7] = t(
              "h4",
              null,
              "Pinned order (this device)",
              -1
              /* CACHED */
            )),
            t("ul", fl, [
              (p(!0), _(
                te,
                null,
                ne(e.value.pinnedTags, (b, H) => (p(), _("li", {
                  key: b,
                  class: "tag-row",
                  "data-pinned-tag": b
                }, [
                  t("span", yl, [
                    Q(
                      D(b) + " ",
                      1
                      /* TEXT */
                    ),
                    T.value.has(b) ? (p(), _(
                      te,
                      { key: 0 },
                      [
                        Q(
                          " (" + D(T.value.get(b)) + ")",
                          1
                          /* TEXT */
                        )
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    )) : (p(), _("small", _l, " (0 recipes — hidden on overview)"))
                  ]),
                  t("div", bl, [
                    g(m, {
                      icon: "pi pi-arrow-up",
                      size: "small",
                      text: "",
                      "aria-label": `Move ${b} up`,
                      disabled: H === 0,
                      onClick: (E) => ee(H, -1)
                    }, null, 8, ["aria-label", "disabled", "onClick"]),
                    g(m, {
                      icon: "pi pi-arrow-down",
                      size: "small",
                      text: "",
                      "aria-label": `Move ${b} down`,
                      disabled: H === e.value.pinnedTags.length - 1,
                      onClick: (E) => ee(H, 1)
                    }, null, 8, ["aria-label", "disabled", "onClick"]),
                    g(m, {
                      label: "Unpin",
                      size: "small",
                      text: "",
                      "aria-label": `Unpin ${b}`,
                      onClick: (E) => W(b)
                    }, null, 8, ["aria-label", "onClick"])
                  ])
                ], 8, gl))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])) : x("v-if", !0)
        ]),
        t("section", hl, [
          i[10] || (i[10] = t(
            "h3",
            null,
            "Household tags",
            -1
            /* CACHED */
          )),
          i[11] || (i[11] = t(
            "p",
            { class: "section-help" },
            " Tags aggregated across all Recipes in your household. Pinning applies only to this device; renaming, merging, or deleting updates Recipes for everyone in your household. ",
            -1
            /* CACHED */
          )),
          v.value ? (p(), X(n, {
            key: 0,
            severity: "error"
          }, {
            default: le(() => [
              Q(
                D(v.value),
                1
                /* TEXT */
              )
            ]),
            _: 1
            /* STABLE */
          })) : !u.value && !a.value.length ? (p(), _("p", kl, "No tags in your household recipes yet.")) : (p(), _("ul", $l, [
            (p(!0), _(
              te,
              null,
              ne(a.value, (b) => (p(), _("li", {
                key: b.name,
                class: "tag-row",
                "data-tag-name": b.name
              }, [
                t(
                  "span",
                  Cl,
                  D(b.name) + " (" + D(b.count) + ")",
                  1
                  /* TEXT */
                ),
                t("div", Vl, [
                  g(m, {
                    label: U.value.has(b.name) ? "Unpin" : "Pin",
                    size: "small",
                    outlined: !U.value.has(b.name),
                    "aria-label": `${U.value.has(b.name) ? "Unpin" : "Pin"} ${b.name}`,
                    onClick: (H) => W(b.name)
                  }, null, 8, ["label", "outlined", "aria-label", "onClick"]),
                  g(m, {
                    label: "Rename",
                    size: "small",
                    text: "",
                    disabled: o.value,
                    "aria-label": `Rename ${b.name}`,
                    onClick: (H) => V(b)
                  }, null, 8, ["disabled", "aria-label", "onClick"]),
                  g(m, {
                    label: "Delete",
                    size: "small",
                    text: "",
                    severity: "danger",
                    disabled: o.value,
                    "aria-label": `Delete ${b.name}`,
                    onClick: (H) => d(b)
                  }, null, 8, ["disabled", "aria-label", "onClick"])
                ])
              ], 8, wl))),
              128
              /* KEYED_FRAGMENT */
            ))
          ]))
        ]),
        g(L, {
          visible: h.value,
          "onUpdate:visible": i[3] || (i[3] = (b) => h.value = b),
          modal: "",
          header: "Rename or merge tag",
          style: { width: "min(26rem, 92vw)" }
        }, {
          default: le(() => [
            t(
              "form",
              {
                class: "rename-form",
                onSubmit: pe(l, ["prevent"])
              },
              [
                I.value ? (p(), X(n, {
                  key: 0,
                  severity: "error"
                }, {
                  default: le(() => [
                    Q(
                      D(I.value),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })) : x("v-if", !0),
                t("p", Sl, [
                  i[12] || (i[12] = Q(
                    " Renaming ",
                    -1
                    /* CACHED */
                  )),
                  t(
                    "strong",
                    null,
                    D($.value),
                    1
                    /* TEXT */
                  ),
                  i[13] || (i[13] = Q(
                    " updates every matching Recipe across the household. ",
                    -1
                    /* CACHED */
                  ))
                ]),
                t("div", Il, [
                  i[14] || (i[14] = t(
                    "label",
                    { for: "tag-rename-input" },
                    "New tag name",
                    -1
                    /* CACHED */
                  )),
                  g(q, {
                    id: "tag-rename-input",
                    modelValue: k.value,
                    "onUpdate:modelValue": i[1] || (i[1] = (b) => k.value = b),
                    required: "",
                    fluid: ""
                  }, null, 8, ["modelValue"])
                ]),
                B.value ? (p(), X(n, {
                  key: 1,
                  severity: "info"
                }, {
                  default: le(() => [
                    Q(
                      " Tag '" + D(w.value) + "' already exists — saving will merge '" + D($.value) + "' into '" + D(w.value) + "' without duplicates. ",
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })) : x("v-if", !0),
                t("div", Tl, [
                  g(m, {
                    type: "button",
                    label: "Cancel",
                    severity: "secondary",
                    text: "",
                    disabled: o.value,
                    onClick: i[2] || (i[2] = (b) => h.value = !1)
                  }, null, 8, ["disabled"]),
                  g(m, {
                    type: "submit",
                    label: "Save rename",
                    loading: o.value,
                    disabled: !N.value
                  }, null, 8, ["loading", "disabled"])
                ])
              ],
              32
              /* NEED_HYDRATION */
            )
          ]),
          _: 1
          /* STABLE */
        }, 8, ["visible"])
      ]);
    };
  }
}), Rl = /* @__PURE__ */ ie(Al, [["__scopeId", "data-v-83507393"]]);
function Dl(s) {
  var c;
  s.route({ path: "/recipes", component: tt, nav: { label: "Recipes", icon: "book", order: 10 } }), s.route({ path: "/recipes/new", component: $e }), s.route({ path: "/recipes/:id", component: $t }), s.route({ path: "/recipes/:id/edit", component: $e }), (c = s.settings) != null && c.section && s.settings.section({
    id: "recipe-tags",
    title: "Recipe Tags",
    order: 30,
    component: Rl
  }), s.intent.hub({ id: "recipe:create", title: "Add or Import Recipe" }), s.intent.provider({
    hub: "recipe:create",
    id: "manual",
    title: "Blank recipe",
    icon: "plus",
    order: 100,
    kind: "headless",
    execute: () => {
      s.navigate ? s.navigate("/recipes/new") : window.location.href = s.url ? s.url("/recipes/new") : "/recipes/new";
    }
  }), s.intent.hub({ id: "recipe:actions", title: "Recipe Actions" }), s.intent.provider({
    hub: "recipe:actions",
    id: "edit",
    title: "Edit",
    order: 10,
    kind: "headless",
    execute: (e) => {
      var y;
      (y = e == null ? void 0 : e.recipe) != null && y.id && (s.navigate ? s.navigate(`/recipes/${e.recipe.id}/edit`) : window.location.href = s.url ? s.url(`/recipes/${e.recipe.id}/edit`) : `/recipes/${e.recipe.id}/edit`);
    }
  }), s.intent.provider({
    hub: "recipe:actions",
    id: "delete",
    title: "Delete",
    icon: "trash",
    order: 999,
    kind: "headless",
    isAvailable: (e) => !!Se((e == null ? void 0 : e.recipe) || {}),
    execute: async (e) => {
      var y, a, u;
      if (!(e != null && e.recipe)) return !1;
      (y = e.onBeforeDelete) == null || y.call(e);
      try {
        const o = await Te(s, e.recipe);
        return o || (a = e.onDeleteAborted) == null || a.call(e), o;
      } catch (o) {
        throw (u = e.onDeleteAborted) == null || u.call(e), o;
      }
    }
  });
}
export {
  Dl as default
};
