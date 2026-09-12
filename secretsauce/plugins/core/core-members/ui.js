import { ref as p, defineComponent as A, inject as I, openBlock as u, createElementBlock as d, unref as g, normalizeStyle as $, toDisplayString as b, createCommentVNode as h, createElementVNode as t, Fragment as S, renderList as C, withDirectives as y, vModelText as M } from "vue";
import { defineStore as R } from "pinia";
const U = R("member", () => {
  const l = p([]), n = p(null);
  function a(s) {
    l.value = s;
    const o = localStorage.getItem("ss-current-member");
    o ? n.value = s.find((v) => v.id === o) || s[0] || null : s.length > 0 && (n.value = s[0], localStorage.setItem("ss-current-member", s[0].id));
  }
  function c(s) {
    const o = l.value.find((v) => v.id === s);
    o && (n.value = o, localStorage.setItem("ss-current-member", s));
  }
  async function m(s) {
    try {
      const o = await s.get("/api/members");
      a(o.items || []);
    } catch {
    }
  }
  function f(s) {
    l.value.push(s), n.value || (n.value = s);
  }
  function i(s) {
    var o;
    l.value = l.value.filter((v) => v.id !== s), ((o = n.value) == null ? void 0 : o.id) === s && (n.value = l.value[0] || null);
  }
  return { members: l, currentMember: n, setMembers: a, setCurrentMember: c, addMember: f, removeMember: i, fetchMembers: m };
}), B = { class: "ss-member-picker" }, H = ["value"], L = ["value"], P = /* @__PURE__ */ A({
  __name: "MemberPicker",
  setup(l) {
    const n = U(), a = I("__SS_API__");
    function c(m) {
      const i = m.target.value;
      i && (n.setCurrentMember(i), localStorage.setItem("secretsauce:current_member_id", i), a && typeof a.setDefaultHeader == "function" && a.setDefaultHeader("x-actor-member", i));
    }
    return (m, f) => {
      var i;
      return u(), d("div", B, [
        g(n).currentMember ? (u(), d(
          "div",
          {
            key: 0,
            class: "member-avatar",
            style: $({ backgroundColor: g(n).currentMember.avatar_color || "#0284c7" })
          },
          b(g(n).currentMember.name ? g(n).currentMember.name.slice(0, 1).toUpperCase() : "?"),
          5
          /* TEXT, STYLE */
        )) : h("v-if", !0),
        t("select", {
          class: "member-select",
          value: (i = g(n).currentMember) == null ? void 0 : i.id,
          onChange: c
        }, [
          (u(!0), d(
            S,
            null,
            C(g(n).members, (s) => (u(), d("option", {
              key: s.id,
              value: s.id
            }, b(s.name), 9, L))),
            128
            /* KEYED_FRAGMENT */
          ))
        ], 40, H)
      ]);
    };
  }
}), V = (l, n) => {
  const a = l.__vccOpts || l;
  for (const [c, m] of n)
    a[c] = m;
  return a;
}, E = /* @__PURE__ */ V(P, [["__scopeId", "data-v-301436c6"]]), j = { class: "ss-member-settings" }, z = { class: "header-row" }, F = { class: "members-grid" }, O = { class: "member-card-header" }, T = { class: "subtext" }, q = ["onClick"], G = {
  key: 0,
  class: "tags"
}, J = {
  key: 0,
  class: "modal-backdrop"
}, K = { class: "modal" }, Q = { class: "form-group" }, W = { class: "form-row" }, X = { class: "form-group" }, Y = { class: "form-group" }, Z = { class: "form-group" }, ee = { class: "form-group" }, te = { class: "form-group" }, re = { class: "modal-actions" }, se = /* @__PURE__ */ A({
  __name: "MemberSettings",
  setup(l) {
    const n = U(), a = I("__SS_API__"), c = p(!1), m = p(""), f = p("en"), i = p("#0284c7"), s = p(1), o = p(""), v = p("");
    async function D() {
      if (!m.value.trim() || !a) return;
      const k = {
        name: m.value.trim(),
        preferred_language: f.value,
        avatar_color: i.value,
        serving_ratio: Number(s.value) || 1,
        dietary_restrictions: o.value.split(",").map((r) => r.trim()).filter(Boolean),
        allergies: v.value.split(",").map((r) => r.trim()).filter(Boolean)
      }, e = await a.post("/api/members", k);
      n.addMember(e), m.value = "", o.value = "", v.value = "", c.value = !1;
    }
    async function N(k, e) {
      !confirm("Are you sure you want to remove this member?") || !a || (await a.delete(`/api/members/${k}?revision=${e}`), n.removeMember(k));
    }
    return (k, e) => (u(), d("div", j, [
      t("div", z, [
        e[8] || (e[8] = t(
          "p",
          { class: "description" },
          "Manage profiles, preferences, and dietary restrictions for household members.",
          -1
          /* CACHED */
        )),
        t("button", {
          class: "btn-primary",
          onClick: e[0] || (e[0] = (r) => c.value = !0)
        }, "+ Add Member")
      ]),
      t("div", F, [
        (u(!0), d(
          S,
          null,
          C(g(n).members, (r) => {
            var w, x;
            return u(), d("div", {
              key: r.id,
              class: "member-card"
            }, [
              t("div", O, [
                t(
                  "div",
                  {
                    class: "avatar",
                    style: $({ backgroundColor: r.avatar_color || "#0284c7" })
                  },
                  b(r.name ? r.name.slice(0, 1).toUpperCase() : "?"),
                  5
                  /* TEXT, STYLE */
                ),
                t("div", null, [
                  t(
                    "strong",
                    null,
                    b(r.name),
                    1
                    /* TEXT */
                  ),
                  t(
                    "div",
                    T,
                    "Lang: " + b(r.preferred_language) + " · Ratio: " + b(r.serving_ratio) + "x",
                    1
                    /* TEXT */
                  )
                ]),
                t("button", {
                  class: "btn-danger",
                  onClick: (_) => N(r.id, r.revision)
                }, "Delete", 8, q)
              ]),
              (w = r.dietary_restrictions) != null && w.length || (x = r.allergies) != null && x.length ? (u(), d("div", G, [
                (u(!0), d(
                  S,
                  null,
                  C(r.dietary_restrictions, (_) => (u(), d(
                    "span",
                    {
                      key: _,
                      class: "tag tag-dietary"
                    },
                    b(_),
                    1
                    /* TEXT */
                  ))),
                  128
                  /* KEYED_FRAGMENT */
                )),
                (u(!0), d(
                  S,
                  null,
                  C(r.allergies, (_) => (u(), d(
                    "span",
                    {
                      key: _,
                      class: "tag tag-allergy"
                    },
                    "Allergy: " + b(_),
                    1
                    /* TEXT */
                  ))),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : h("v-if", !0)
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      c.value ? (u(), d("div", J, [
        t("div", K, [
          e[15] || (e[15] = t(
            "h3",
            null,
            "Add Household Member",
            -1
            /* CACHED */
          )),
          t("div", Q, [
            e[9] || (e[9] = t(
              "label",
              null,
              "Name",
              -1
              /* CACHED */
            )),
            y(t(
              "input",
              {
                "onUpdate:modelValue": e[1] || (e[1] = (r) => m.value = r),
                type: "text",
                placeholder: "Name",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, m.value]
            ])
          ]),
          t("div", W, [
            t("div", X, [
              e[10] || (e[10] = t(
                "label",
                null,
                "Language",
                -1
                /* CACHED */
              )),
              y(t(
                "input",
                {
                  "onUpdate:modelValue": e[2] || (e[2] = (r) => f.value = r),
                  type: "text",
                  placeholder: "en, de, etc.",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [M, f.value]
              ])
            ]),
            t("div", Y, [
              e[11] || (e[11] = t(
                "label",
                null,
                "Serving Ratio",
                -1
                /* CACHED */
              )),
              y(t(
                "input",
                {
                  "onUpdate:modelValue": e[3] || (e[3] = (r) => s.value = r),
                  type: "number",
                  step: "0.1",
                  min: "0.1",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [M, s.value]
              ])
            ])
          ]),
          t("div", Z, [
            e[12] || (e[12] = t(
              "label",
              null,
              "Avatar Color",
              -1
              /* CACHED */
            )),
            y(t(
              "input",
              {
                "onUpdate:modelValue": e[4] || (e[4] = (r) => i.value = r),
                type: "color",
                class: "color-picker"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, i.value]
            ])
          ]),
          t("div", ee, [
            e[13] || (e[13] = t(
              "label",
              null,
              "Dietary Restrictions (comma-separated)",
              -1
              /* CACHED */
            )),
            y(t(
              "input",
              {
                "onUpdate:modelValue": e[5] || (e[5] = (r) => o.value = r),
                type: "text",
                placeholder: "vegetarian, gluten-free",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, o.value]
            ])
          ]),
          t("div", te, [
            e[14] || (e[14] = t(
              "label",
              null,
              "Allergies (comma-separated)",
              -1
              /* CACHED */
            )),
            y(t(
              "input",
              {
                "onUpdate:modelValue": e[6] || (e[6] = (r) => v.value = r),
                type: "text",
                placeholder: "nuts, dairy",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, v.value]
            ])
          ]),
          t("div", re, [
            t("button", {
              class: "btn-secondary",
              onClick: e[7] || (e[7] = (r) => c.value = !1)
            }, "Cancel"),
            t("button", {
              class: "btn-primary",
              onClick: D
            }, "Save Member")
          ])
        ])
      ])) : h("v-if", !0)
    ]));
  }
}), ne = /* @__PURE__ */ V(se, [["__scopeId", "data-v-fc0cca3a"]]);
function ae(l) {
  l.slot("shell.header.right", E, { order: 10 }), l.settings.section({
    id: "members",
    title: "Household Members",
    component: ne
  });
}
export {
  ae as default
};
