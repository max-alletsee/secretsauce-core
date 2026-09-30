import { defineComponent as B, ref as b, watch as j, resolveComponent as w, resolveDirective as D, openBlock as _, createElementBlock as g, withDirectives as C, createVNode as M, unref as f, createElementVNode as N, toDisplayString as V, createBlock as S, withCtx as I, createTextVNode as R, createCommentVNode as $ } from "vue";
import { useSecretSauce as q } from "@secretsauce/ui";
const z = { class: "vote-rating" }, E = {
  class: "net-score",
  "aria-live": "polite"
}, O = /* @__PURE__ */ B({
  __name: "VoteRating",
  props: {
    context: {}
  },
  setup(i) {
    const v = i, e = q(), u = b(0), r = b(null), m = b(!1), p = b("");
    let y = 0;
    async function x() {
      var s, n, l, c;
      const o = (n = (s = v.context) == null ? void 0 : s.entry) == null ? void 0 : n.id, t = (l = e.store.currentMember.value) == null ? void 0 : l.id, a = ++y;
      if (r.value = null, !!o)
        try {
          const d = await e.api.get("/api/x/core-ratings", { journal_id: o });
          if (a !== y) return;
          u.value = d.net_score, r.value = ((c = d.scores.find((k) => k.member_id === t)) == null ? void 0 : c.score) ?? null;
        } catch (d) {
          a === y && (p.value = (d == null ? void 0 : d.message) || "Could not load ratings");
        }
    }
    j(() => {
      var o, t, a;
      return [(t = (o = v.context) == null ? void 0 : o.entry) == null ? void 0 : t.id, (a = e.store.currentMember.value) == null ? void 0 : a.id];
    }, x, { immediate: !0 });
    async function h(o) {
      var s, n, l;
      const t = (n = (s = v.context) == null ? void 0 : s.entry) == null ? void 0 : n.id, a = (l = e.store.currentMember.value) == null ? void 0 : l.id;
      if (!(!t || !a || m.value)) {
        m.value = !0, p.value = "";
        try {
          r.value === o ? await e.api.delete("/api/x/core-ratings", { journal_id: t, member_id: a }) : await e.api.put("/api/x/core-ratings", { journal_id: t, member_id: a, score: o }), await x();
        } catch (c) {
          p.value = (c == null ? void 0 : c.message) || "Could not save rating";
        } finally {
          m.value = !1;
        }
      }
    }
    return (o, t) => {
      const a = w("Button"), s = w("Message"), n = D("tooltip");
      return _(), g("div", z, [
        C((_(), g("span", null, [
          M(a, {
            class: "upvote-btn",
            icon: "pi pi-thumbs-up",
            "aria-label": "Upvote",
            "aria-pressed": r.value === 1,
            outlined: r.value !== 1,
            size: "small",
            disabled: m.value || !f(e).store.currentMember.value,
            onClick: t[0] || (t[0] = (l) => h(1))
          }, null, 8, ["aria-pressed", "outlined", "disabled"])
        ])), [
          [n, f(e).store.currentMember.value ? "" : "Choose a member to rate this meal"]
        ]),
        N(
          "span",
          E,
          V(u.value > 0 ? `+${u.value}` : u.value),
          1
          /* TEXT */
        ),
        C((_(), g("span", null, [
          M(a, {
            class: "downvote-btn",
            icon: "pi pi-thumbs-down",
            "aria-label": "Downvote",
            "aria-pressed": r.value === -1,
            outlined: r.value !== -1,
            severity: "secondary",
            size: "small",
            disabled: m.value || !f(e).store.currentMember.value,
            onClick: t[1] || (t[1] = (l) => h(-1))
          }, null, 8, ["aria-pressed", "outlined", "disabled"])
        ])), [
          [n, f(e).store.currentMember.value ? "" : "Choose a member to rate this meal"]
        ]),
        p.value ? (_(), S(s, {
          key: 0,
          severity: "error"
        }, {
          default: I(() => [
            R(
              V(p.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : $("v-if", !0)
      ]);
    };
  }
}), T = (i, v) => {
  const e = i.__vccOpts || i;
  for (const [u, r] of v)
    e[u] = r;
  return e;
}, U = /* @__PURE__ */ T(O, [["__scopeId", "data-v-9b5a6e58"]]);
function G(i) {
  i.slot("journal.entry.footer", U, { order: 10 });
}
export {
  G as default
};
