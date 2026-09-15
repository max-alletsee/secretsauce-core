import { defineComponent as u, inject as S, ref as f, watch as y, openBlock as n, createElementBlock as l, normalizeClass as b, onMounted as k, createElementVNode as x, toDisplayString as g, Fragment as A, renderList as I } from "vue";
const $ = ["title"], w = /* @__PURE__ */ u({
  __name: "ShortlistAction",
  props: {
    context: {}
  },
  emits: ["change"],
  setup(o, { emit: s }) {
    var h, p, m;
    const t = o, a = s, i = S("__SS_API__"), e = f(!!((h = t.context) != null && h.isShortlisted || (m = (p = t.context) == null ? void 0 : p.recipe) != null && m.is_shortlisted));
    y(() => {
      var c, r, d;
      return ((c = t.context) == null ? void 0 : c.isShortlisted) ?? ((d = (r = t.context) == null ? void 0 : r.recipe) == null ? void 0 : d.is_shortlisted);
    }, (c) => {
      c !== void 0 && (e.value = !!c);
    });
    async function _(c) {
      var d;
      if (c.stopPropagation(), !((d = t.context) != null && d.recipe) || !i) return;
      const r = !e.value;
      e.value = r;
      try {
        r ? await i.post("/api/x/shortlist", { recipe_id: t.context.recipe.id }) : await i.delete(`/api/x/shortlist/${t.context.recipe.id}`), a("change", r);
      } catch {
        e.value = !r;
      }
    }
    return (c, r) => (n(), l("button", {
      type: "button",
      class: b(["btn-shortlist", { active: e.value }]),
      title: e.value ? "Remove from shortlist" : "Add to shortlist",
      onClick: _
    }, " ★ ", 10, $));
  }
}), v = (o, s) => {
  const t = o.__vccOpts || o;
  for (const [a, i] of s)
    t[a] = i;
  return t;
}, B = /* @__PURE__ */ v(w, [["__scopeId", "data-v-b46835af"]]), C = /* @__PURE__ */ u({
  __name: "ShortlistFilter",
  props: {
    context: {}
  },
  emits: ["toggle"],
  setup(o, { emit: s }) {
    const t = o, a = s, i = f(!1);
    function e() {
      var _;
      a("toggle"), (_ = t.context) != null && _.toggle ? t.context.toggle() : i.value = !i.value;
    }
    return (_, h) => {
      var p;
      return n(), l(
        "button",
        {
          type: "button",
          class: b(["shortlist-filter-chip", { active: ((p = t.context) == null ? void 0 : p.active) ?? i.value }]),
          onClick: e
        },
        " ★ Shortlist ",
        2
        /* CLASS */
      );
    };
  }
}), F = /* @__PURE__ */ v(C, [["__scopeId", "data-v-387e17b7"]]), P = { class: "shortlist-sidebar" }, E = {
  key: 0,
  class: "sidebar-list"
}, N = ["href"], R = {
  key: 1,
  class: "empty-hint"
}, j = /* @__PURE__ */ u({
  __name: "ShortlistSidebar",
  props: {
    context: {}
  },
  setup(o) {
    const s = S("__SS_API__"), t = f([]);
    return k(async () => {
      if (s)
        try {
          t.value = await s.get("/api/x/shortlist");
        } catch {
        }
    }), (a, i) => (n(), l("div", P, [
      x(
        "h4",
        null,
        "Shortlist (" + g(t.value.length) + ")",
        1
        /* TEXT */
      ),
      t.value.length ? (n(), l("ul", E, [
        (n(!0), l(
          A,
          null,
          I(t.value, (e) => (n(), l("li", {
            key: e.id
          }, [
            x("a", {
              href: `#/recipes/${e.recipe_id}`
            }, g(e.recipe_title || "Recipe"), 9, N)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (n(), l("p", R, "No shortlisted recipes."))
    ]));
  }
}), z = /* @__PURE__ */ v(j, [["__scopeId", "data-v-4df3f96d"]]);
function M(o) {
  o.slot("recipe.card.actions", B, { order: 10 }), o.slot("recipe.list.filters", F, { order: 10 }), o.slot("timeline.sidebar", z, { order: 20 });
}
export {
  M as default
};
