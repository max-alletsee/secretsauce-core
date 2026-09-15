import { ref as b, defineComponent as I, inject as $, openBlock as u, createElementBlock as d, unref as g, normalizeStyle as D, toDisplayString as f, createCommentVNode as w, createElementVNode as t, Fragment as S, renderList as C, withDirectives as y, vModelText as M } from "vue";
import { defineStore as R } from "pinia";
const U = R("member", () => {
  const o = b([]), s = b(null);
  function a(n) {
    o.value = n;
    const l = localStorage.getItem("ss-current-member");
    l ? s.value = n.find((c) => c.id === l) || n[0] || null : n.length > 0 && (s.value = n[0], localStorage.setItem("ss-current-member", n[0].id));
  }
  function v(n) {
    const l = o.value.find((c) => c.id === n);
    l && (s.value = l, localStorage.setItem("ss-current-member", n));
  }
  async function m(n) {
    try {
      const l = await n.get("/api/members"), c = Array.isArray(l) ? l : (l == null ? void 0 : l.items) || [];
      a(c);
    } catch {
    }
  }
  function p(n) {
    o.value.push(n), s.value || (s.value = n);
  }
  function i(n) {
    var l;
    o.value = o.value.filter((c) => c.id !== n), ((l = s.value) == null ? void 0 : l.id) === n && (s.value = o.value[0] || null);
  }
  return { members: o, currentMember: s, setMembers: a, setCurrentMember: v, addMember: p, removeMember: i, fetchMembers: m };
}), B = { class: "ss-member-picker" }, L = ["value"], P = ["value"], E = /* @__PURE__ */ I({
  __name: "MemberPicker",
  setup(o) {
    const s = U(), a = $("__SS_API__");
    function v(m) {
      const i = m.target.value;
      if (!i) {
        s.setCurrentMember(null), localStorage.removeItem("secretsauce:current_member_id"), a && typeof a.setDefaultHeader == "function" && a.setDefaultHeader("x-actor-member", null);
        return;
      }
      s.setCurrentMember(i), localStorage.setItem("secretsauce:current_member_id", i), a && typeof a.setDefaultHeader == "function" && a.setDefaultHeader("x-actor-member", i);
    }
    return (m, p) => {
      var i;
      return u(), d("div", B, [
        g(s).currentMember ? (u(), d(
          "div",
          {
            key: 0,
            class: "member-avatar",
            style: D({ backgroundColor: g(s).currentMember.avatar_color || "#0284c7" })
          },
          f(g(s).currentMember.name ? g(s).currentMember.name.slice(0, 1).toUpperCase() : "?"),
          5
          /* TEXT, STYLE */
        )) : w("v-if", !0),
        t("select", {
          class: "member-select",
          value: ((i = g(s).currentMember) == null ? void 0 : i.id) || "",
          onChange: v
        }, [
          p[0] || (p[0] = t(
            "option",
            { value: "" },
            "All Members",
            -1
            /* CACHED */
          )),
          (u(!0), d(
            S,
            null,
            C(g(s).members, (n) => (u(), d("option", {
              key: n.id,
              value: n.id
            }, f(n.name), 9, P))),
            128
            /* KEYED_FRAGMENT */
          ))
        ], 40, L)
      ]);
    };
  }
}), V = (o, s) => {
  const a = o.__vccOpts || o;
  for (const [v, m] of s)
    a[v] = m;
  return a;
}, j = /* @__PURE__ */ V(E, [["__scopeId", "data-v-00866ebb"]]), z = { class: "ss-member-settings" }, F = { class: "header-row" }, O = { class: "members-grid" }, T = { class: "member-card-header" }, q = { class: "subtext" }, G = ["onClick"], J = {
  key: 0,
  class: "tags"
}, K = {
  key: 0,
  class: "modal-backdrop"
}, Q = { class: "modal" }, W = { class: "form-group" }, X = { class: "form-row" }, Y = { class: "form-group" }, Z = { class: "form-group" }, ee = { class: "form-group" }, te = { class: "form-group" }, re = { class: "form-group" }, se = { class: "modal-actions" }, ne = /* @__PURE__ */ I({
  __name: "MemberSettings",
  setup(o) {
    const s = U(), a = $("__SS_API__"), v = b(!1), m = b(""), p = b("en"), i = b("#0284c7"), n = b(1), l = b(""), c = b("");
    async function H() {
      if (!m.value.trim() || !a) return;
      const k = {
        name: m.value.trim(),
        preferred_language: p.value,
        avatar_color: i.value,
        serving_ratio: Number(n.value) || 1,
        dietary_restrictions: l.value.split(",").map((r) => r.trim()).filter(Boolean),
        allergies: c.value.split(",").map((r) => r.trim()).filter(Boolean)
      }, e = await a.post("/api/members", k);
      s.addMember(e), m.value = "", l.value = "", c.value = "", v.value = !1;
    }
    async function N(k, e) {
      !confirm("Are you sure you want to remove this member?") || !a || (await a.delete(`/api/members/${k}?revision=${e}`), s.removeMember(k));
    }
    return (k, e) => (u(), d("div", z, [
      t("div", F, [
        e[8] || (e[8] = t(
          "p",
          { class: "description" },
          "Manage profiles, preferences, and dietary restrictions for household members.",
          -1
          /* CACHED */
        )),
        t("button", {
          class: "btn-primary",
          onClick: e[0] || (e[0] = (r) => v.value = !0)
        }, "+ Add Member")
      ]),
      t("div", O, [
        (u(!0), d(
          S,
          null,
          C(g(s).members, (r) => {
            var h, x;
            return u(), d("div", {
              key: r.id,
              class: "member-card"
            }, [
              t("div", T, [
                t(
                  "div",
                  {
                    class: "avatar",
                    style: D({ backgroundColor: r.avatar_color || "#0284c7" })
                  },
                  f(r.name ? r.name.slice(0, 1).toUpperCase() : "?"),
                  5
                  /* TEXT, STYLE */
                ),
                t("div", null, [
                  t(
                    "strong",
                    null,
                    f(r.name),
                    1
                    /* TEXT */
                  ),
                  t(
                    "div",
                    q,
                    "Lang: " + f(r.preferred_language) + " · Ratio: " + f(r.serving_ratio) + "x",
                    1
                    /* TEXT */
                  )
                ]),
                t("button", {
                  class: "btn-danger",
                  onClick: (_) => N(r.id, r.revision)
                }, "Delete", 8, G)
              ]),
              (h = r.dietary_restrictions) != null && h.length || (x = r.allergies) != null && x.length ? (u(), d("div", J, [
                (u(!0), d(
                  S,
                  null,
                  C(r.dietary_restrictions, (_) => (u(), d(
                    "span",
                    {
                      key: _,
                      class: "tag tag-dietary"
                    },
                    f(_),
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
                    "Allergy: " + f(_),
                    1
                    /* TEXT */
                  ))),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])) : w("v-if", !0)
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ]),
      v.value ? (u(), d("div", K, [
        t("div", Q, [
          e[15] || (e[15] = t(
            "h3",
            null,
            "Add Household Member",
            -1
            /* CACHED */
          )),
          t("div", W, [
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
          t("div", X, [
            t("div", Y, [
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
                  "onUpdate:modelValue": e[2] || (e[2] = (r) => p.value = r),
                  type: "text",
                  placeholder: "en, de, etc.",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [M, p.value]
              ])
            ]),
            t("div", Z, [
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
                  "onUpdate:modelValue": e[3] || (e[3] = (r) => n.value = r),
                  type: "number",
                  step: "0.1",
                  min: "0.1",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [M, n.value]
              ])
            ])
          ]),
          t("div", ee, [
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
          t("div", te, [
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
                "onUpdate:modelValue": e[5] || (e[5] = (r) => l.value = r),
                type: "text",
                placeholder: "vegetarian, gluten-free",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, l.value]
            ])
          ]),
          t("div", re, [
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
                "onUpdate:modelValue": e[6] || (e[6] = (r) => c.value = r),
                type: "text",
                placeholder: "nuts, dairy",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, c.value]
            ])
          ]),
          t("div", se, [
            t("button", {
              class: "btn-secondary",
              onClick: e[7] || (e[7] = (r) => v.value = !1)
            }, "Cancel"),
            t("button", {
              class: "btn-primary",
              onClick: H
            }, "Save Member")
          ])
        ])
      ])) : w("v-if", !0)
    ]));
  }
}), A = /* @__PURE__ */ V(ne, [["__scopeId", "data-v-15c8a3d9"]]);
function ae(o) {
  var s;
  o.slot("shell.header.right", j, { order: 10 }), (s = o.settings) != null && s.section ? o.settings.section({
    id: "members",
    title: "Household Members",
    component: A
  }) : o.slot("settings.content", A, { order: 10 });
}
export {
  ae as default
};
