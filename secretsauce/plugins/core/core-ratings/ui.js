import { defineComponent as N, computed as S, ref as b, watch as I, resolveComponent as k, resolveDirective as R, openBlock as f, createElementBlock as x, withDirectives as w, createVNode as M, unref as y, createElementVNode as $, toDisplayString as V, createBlock as q, withCtx as z, createTextVNode as E, createCommentVNode as B } from "vue";
import { useSecretSauce as O } from "@secretsauce/ui";
const T = {
  key: 0,
  class: "vote-rating"
}, U = {
  class: "net-score",
  "aria-live": "polite"
}, j = /* @__PURE__ */ N({
  __name: "VoteRating",
  props: {
    context: {}
  },
  setup(u) {
    const s = u, t = O(), m = S(() => {
      var r, e;
      return ((e = (r = s.context) == null ? void 0 : r.entry) == null ? void 0 : e.status) === "cooked";
    }), c = b(0), i = b(null), p = b(!1), _ = b("");
    let g = 0;
    async function C() {
      var n, a, l, d;
      const r = (a = (n = s.context) == null ? void 0 : n.entry) == null ? void 0 : a.id, e = (l = t.store.currentMember.value) == null ? void 0 : l.id, o = ++g;
      if (i.value = null, !(!r || !m.value))
        try {
          const v = await t.api.get("/api/x/core-ratings", { timeline_entry_id: r });
          if (o !== g) return;
          c.value = v.net_score, i.value = ((d = v.scores.find((D) => D.member_id === e)) == null ? void 0 : d.score) ?? null;
        } catch (v) {
          o === g && (_.value = (v == null ? void 0 : v.message) || "Could not load ratings");
        }
    }
    I(() => {
      var r, e, o, n, a;
      return [(e = (r = s.context) == null ? void 0 : r.entry) == null ? void 0 : e.id, (n = (o = s.context) == null ? void 0 : o.entry) == null ? void 0 : n.status, (a = t.store.currentMember.value) == null ? void 0 : a.id];
    }, C, { immediate: !0 });
    async function h(r) {
      var n, a, l;
      const e = (a = (n = s.context) == null ? void 0 : n.entry) == null ? void 0 : a.id, o = (l = t.store.currentMember.value) == null ? void 0 : l.id;
      if (!(!e || !m.value || !o || p.value)) {
        p.value = !0, _.value = "";
        try {
          i.value === r ? await t.api.delete("/api/x/core-ratings", { timeline_entry_id: e, member_id: o }) : await t.api.put("/api/x/core-ratings", { timeline_entry_id: e, member_id: o, score: r }), await C();
        } catch (d) {
          _.value = (d == null ? void 0 : d.message) || "Could not save rating";
        } finally {
          p.value = !1;
        }
      }
    }
    return (r, e) => {
      const o = k("Button"), n = k("Message"), a = R("tooltip");
      return m.value ? (f(), x("div", T, [
        w((f(), x("span", null, [
          M(o, {
            class: "upvote-btn",
            icon: "pi pi-thumbs-up",
            "aria-label": "Upvote",
            "aria-pressed": i.value === 1,
            outlined: i.value !== 1,
            size: "small",
            disabled: p.value || !y(t).store.currentMember.value,
            onClick: e[0] || (e[0] = (l) => h(1))
          }, null, 8, ["aria-pressed", "outlined", "disabled"])
        ])), [
          [a, y(t).store.currentMember.value ? "" : "Choose a member to rate this meal"]
        ]),
        $(
          "span",
          U,
          V(c.value > 0 ? `+${c.value}` : c.value),
          1
          /* TEXT */
        ),
        w((f(), x("span", null, [
          M(o, {
            class: "downvote-btn",
            icon: "pi pi-thumbs-down",
            "aria-label": "Downvote",
            "aria-pressed": i.value === -1,
            outlined: i.value !== -1,
            severity: "secondary",
            size: "small",
            disabled: p.value || !y(t).store.currentMember.value,
            onClick: e[1] || (e[1] = (l) => h(-1))
          }, null, 8, ["aria-pressed", "outlined", "disabled"])
        ])), [
          [a, y(t).store.currentMember.value ? "" : "Choose a member to rate this meal"]
        ]),
        _.value ? (f(), q(n, {
          key: 0,
          severity: "error"
        }, {
          default: z(() => [
            E(
              V(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : B("v-if", !0)
      ])) : B("v-if", !0);
    };
  }
}), A = (u, s) => {
  const t = u.__vccOpts || u;
  for (const [m, c] of s)
    t[m] = c;
  return t;
}, F = /* @__PURE__ */ A(j, [["__scopeId", "data-v-5069883d"]]);
function J(u) {
  u.slot("timeline.entry.footer", F, { order: 10 });
}
export {
  J as default
};
