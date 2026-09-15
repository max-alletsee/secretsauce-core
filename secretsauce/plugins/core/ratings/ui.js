import { defineComponent as g, inject as f, ref as m, onMounted as b, openBlock as R, createElementBlock as S, createElementVNode as d, normalizeClass as y, toDisplayString as V } from "vue";
const $ = { class: "vote-rating" }, j = { class: "net-score" }, k = /* @__PURE__ */ g({
  __name: "VoteRating",
  props: {
    context: {}
  },
  setup(c) {
    const i = c, n = f("__SS_API__"), a = f("__SS_CURRENT_MEMBER__"), o = m(0), s = m(null);
    async function x() {
      var t, e, l;
      if (!(!n || !((e = (t = i.context) == null ? void 0 : t.entry) != null && e.id)))
        try {
          const r = await n.get(`/api/x/ratings?journal_id=${i.context.entry.id}`);
          o.value = r.net_score ?? 0;
          const u = (l = a == null ? void 0 : a.value) == null ? void 0 : l.id;
          if (u && Array.isArray(r.scores)) {
            const _ = r.scores.find((v) => v.member_id === u);
            _ && (s.value = _.score);
          }
        } catch {
        }
    }
    async function p(t) {
      var l, r, u;
      if (!n || !((r = (l = i.context) == null ? void 0 : l.entry) != null && r.id)) return;
      const e = ((u = a == null ? void 0 : a.value) == null ? void 0 : u.id) || "anonymous";
      if (s.value === t)
        n.delete && await n.delete(`/api/x/ratings?journal_id=${i.context.entry.id}&member_id=${e}`), s.value = null, o.value -= t;
      else {
        const _ = s.value, v = await n.put("/api/x/ratings", {
          journal_id: i.context.entry.id,
          member_id: e,
          score: t
        });
        s.value = t, v && v.net_score !== void 0 ? o.value = v.net_score : o.value += _ ? t * 2 : t;
      }
    }
    return b(() => {
      x();
    }), (t, e) => (R(), S("div", $, [
      d(
        "button",
        {
          class: y(["vote-btn upvote-btn", { active: s.value === 1 }]),
          title: "Upvote",
          onClick: e[0] || (e[0] = (l) => p(1))
        },
        " 👍 ",
        2
        /* CLASS */
      ),
      d(
        "span",
        j,
        V(o.value > 0 ? `+${o.value}` : o.value),
        1
        /* TEXT */
      ),
      d(
        "button",
        {
          class: y(["vote-btn downvote-btn", { active: s.value === -1 }]),
          title: "Downvote",
          onClick: e[1] || (e[1] = (l) => p(-1))
        },
        " 👎 ",
        2
        /* CLASS */
      )
    ]));
  }
}), w = (c, i) => {
  const n = c.__vccOpts || c;
  for (const [a, o] of i)
    n[a] = o;
  return n;
}, C = /* @__PURE__ */ w(k, [["__scopeId", "data-v-3c5085a6"]]);
function I(c) {
  c.slot("journal.entry.footer", C, { order: 10 });
}
export {
  I as default
};
