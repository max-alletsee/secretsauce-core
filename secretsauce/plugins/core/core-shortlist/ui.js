import { defineComponent as g, ref as h, watch as b, resolveComponent as x, openBlock as n, createBlock as S, normalizeClass as B, onMounted as w, createElementBlock as _, createElementVNode as k, toDisplayString as f, withCtx as $, createTextVNode as A, createCommentVNode as M, Fragment as N, renderList as R, withModifiers as V, unref as y } from "vue";
import { useSecretSauce as C } from "@secretsauce/ui";
const z = /* @__PURE__ */ g({
  __name: "ShortlistAction",
  props: {
    context: {}
  },
  emits: ["change"],
  setup(i, { emit: r }) {
    var d, a;
    const e = i, l = r, o = C(), c = h(!1), t = h(!!(((d = e.context) == null ? void 0 : d.isShortlisted) ?? ((a = e.context) == null ? void 0 : a.recipe.is_shortlisted)));
    b(() => {
      var s, p;
      return ((s = e.context) == null ? void 0 : s.isShortlisted) ?? ((p = e.context) == null ? void 0 : p.recipe.is_shortlisted);
    }, (s) => {
      s !== void 0 && (t.value = !!s);
    });
    async function u(s) {
      var v;
      s.stopPropagation();
      const p = (v = e.context) == null ? void 0 : v.recipe;
      if (!(!p || c.value)) {
        c.value = !0;
        try {
          t.value ? await o.api.delete(`/api/x/core-shortlist/${p.id}`) : await o.api.post("/api/x/core-shortlist", { recipe_id: p.id }), t.value = !t.value, l("change", t.value);
        } catch (m) {
          o.notify({ level: "error", message: (m == null ? void 0 : m.message) || "Could not update shortlist" });
        } finally {
          c.value = !1;
        }
      }
    }
    return (s, p) => {
      const v = x("Button");
      return n(), S(v, {
        class: B(["btn-shortlist", { active: t.value }]),
        icon: t.value ? "pi pi-star-fill" : "pi pi-star",
        "aria-label": t.value ? "Remove from shortlist" : "Add to shortlist",
        title: t.value ? "Remove from shortlist" : "Add to shortlist",
        "aria-pressed": t.value,
        text: "",
        rounded: "",
        loading: c.value,
        onClick: u
      }, null, 8, ["class", "icon", "aria-label", "title", "aria-pressed", "loading"]);
    };
  }
}), E = /* @__PURE__ */ g({
  __name: "ShortlistFilter",
  props: {
    context: {}
  },
  emits: ["toggle"],
  setup(i, { emit: r }) {
    const e = i, l = r, o = h(!1);
    function c() {
      var t;
      l("toggle"), (t = e.context) != null && t.toggle ? e.context.toggle() : o.value = !o.value;
    }
    return (t, u) => {
      var a, s;
      const d = x("Button");
      return n(), S(d, {
        class: "shortlist-filter-chip",
        label: "Shortlist",
        icon: "pi pi-star",
        "aria-pressed": ((a = e.context) == null ? void 0 : a.active) ?? o.value,
        outlined: !(((s = e.context) == null ? void 0 : s.active) ?? o.value),
        size: "small",
        onClick: c
      }, null, 8, ["aria-pressed", "outlined"]);
    };
  }
}), F = { class: "shortlist-sidebar" }, T = { key: 1 }, D = ["href", "onClick"], I = { key: 2 }, L = /* @__PURE__ */ g({
  __name: "ShortlistSidebar",
  setup(i) {
    const r = C(), e = h([]), l = h("");
    return w(async () => {
      try {
        e.value = await r.api.get("/api/x/core-shortlist");
      } catch (o) {
        l.value = (o == null ? void 0 : o.message) || "Could not load shortlist";
      }
    }), (o, c) => {
      const t = x("Message");
      return n(), _("section", F, [
        k(
          "h3",
          null,
          "Shortlist (" + f(e.value.length) + ")",
          1
          /* TEXT */
        ),
        l.value ? (n(), S(t, {
          key: 0,
          severity: "error"
        }, {
          default: $(() => [
            A(
              f(l.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : M("v-if", !0),
        e.value.length ? (n(), _("ul", T, [
          (n(!0), _(
            N,
            null,
            R(e.value, (u) => (n(), _("li", {
              key: u.id
            }, [
              k("a", {
                href: y(r).url(`/recipes/${u.recipe_id}`),
                onClick: V((d) => {
                  var a, s;
                  return (s = (a = y(r)).navigate) == null ? void 0 : s.call(a, `/recipes/${u.recipe_id}`);
                }, ["prevent"])
              }, f(u.recipe_title || "Recipe"), 9, D)
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (n(), _("p", I, "No shortlisted recipes."))
      ]);
    };
  }
}), O = (i, r) => {
  const e = i.__vccOpts || i;
  for (const [l, o] of r)
    e[l] = o;
  return e;
}, P = /* @__PURE__ */ O(L, [["__scopeId", "data-v-94e1d99e"]]);
function G(i) {
  i.slot("recipe.card.actions", z, { order: 10 }), i.slot("recipe.list.filters", E, { order: 10 }), i.slot("timeline.sidebar", P, { order: 20 });
}
export {
  G as default
};
