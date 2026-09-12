import { defineComponent as d, inject as f, ref as x, watch as g, openBlock as n, createElementBlock as c, normalizeClass as S, onMounted as y, createElementVNode as m, toDisplayString as v, Fragment as b, renderList as k } from "vue";
const $ = ["title"], A = /* @__PURE__ */ d({
  __name: "ShortlistAction",
  props: {
    context: {}
  },
  emits: ["change"],
  setup(o, { emit: s }) {
    var p;
    const t = o, a = s, i = f("__SS_API__"), e = x(!!((p = t.context) != null && p.isShortlisted));
    g(() => {
      var r;
      return (r = t.context) == null ? void 0 : r.isShortlisted;
    }, (r) => {
      e.value = !!r;
    });
    async function _(r) {
      var u;
      if (r.stopPropagation(), !((u = t.context) != null && u.recipe) || !i) return;
      const l = !e.value;
      e.value = l;
      try {
        l ? await i.post("/api/x/shortlist", { recipe_id: t.context.recipe.id }) : await i.delete(`/api/x/shortlist/${t.context.recipe.id}`), a("change", l);
      } catch {
        e.value = !l;
      }
    }
    return (r, l) => (n(), c("button", {
      type: "button",
      class: S(["btn-shortlist", { active: e.value }]),
      title: e.value ? "Remove from shortlist" : "Add to shortlist",
      onClick: _
    }, " ★ ", 10, $));
  }
}), h = (o, s) => {
  const t = o.__vccOpts || o;
  for (const [a, i] of s)
    t[a] = i;
  return t;
}, I = /* @__PURE__ */ h(A, [["__scopeId", "data-v-44c8490b"]]), w = /* @__PURE__ */ d({
  __name: "ShortlistFilter",
  props: {
    context: {}
  },
  emits: ["toggle"],
  setup(o, { emit: s }) {
    const t = o, a = s;
    return (i, e) => {
      var _;
      return n(), c(
        "button",
        {
          type: "button",
          class: S(["shortlist-filter-chip", { active: (_ = t.context) == null ? void 0 : _.active }]),
          onClick: e[0] || (e[0] = (p) => a("toggle"))
        },
        " ★ Shortlist ",
        2
        /* CLASS */
      );
    };
  }
}), B = /* @__PURE__ */ h(w, [["__scopeId", "data-v-8165a361"]]), C = { class: "shortlist-sidebar" }, F = {
  key: 0,
  class: "sidebar-list"
}, P = ["href"], E = {
  key: 1,
  class: "empty-hint"
}, N = /* @__PURE__ */ d({
  __name: "ShortlistSidebar",
  props: {
    context: {}
  },
  setup(o) {
    const s = f("__SS_API__"), t = x([]);
    return y(async () => {
      if (s)
        try {
          t.value = await s.get("/api/x/shortlist");
        } catch {
        }
    }), (a, i) => (n(), c("div", C, [
      m(
        "h4",
        null,
        "Shortlist (" + v(t.value.length) + ")",
        1
        /* TEXT */
      ),
      t.value.length ? (n(), c("ul", F, [
        (n(!0), c(
          b,
          null,
          k(t.value, (e) => (n(), c("li", {
            key: e.id
          }, [
            m("a", {
              href: `#/recipes/${e.recipe_id}`
            }, v(e.recipe_title || "Recipe"), 9, P)
          ]))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : (n(), c("p", E, "No shortlisted recipes."))
    ]));
  }
}), R = /* @__PURE__ */ h(N, [["__scopeId", "data-v-9ef50431"]]);
function D(o) {
  o.slot("recipe.card.actions", I, { order: 10 }), o.slot("recipe.list.filters", B, { order: 10 }), o.slot("timeline.sidebar", R, { order: 20 });
}
export {
  D as default
};
