import { ref as p, defineComponent as I, inject as $, openBlock as u, createElementBlock as d, unref as f, normalizeStyle as U, toDisplayString as b, createCommentVNode as h, createElementVNode as t, Fragment as S, renderList as C, withDirectives as y, vModelText as M } from "vue";
import { defineStore as B } from "pinia";
const V = B("member", () => {
  const l = p([]), s = p(null);
  function a(n) {
    l.value = n;
    const o = localStorage.getItem("ss-current-member");
    o ? s.value = n.find((v) => v.id === o) || n[0] || null : n.length > 0 && (s.value = n[0], localStorage.setItem("ss-current-member", n[0].id));
  }
  function m(n) {
    const o = l.value.find((v) => v.id === n);
    o && (s.value = o, localStorage.setItem("ss-current-member", n));
  }
  async function c(n) {
    try {
      const o = await n.get("/api/members");
      a(o.items || []);
    } catch {
    }
  }
  function g(n) {
    l.value.push(n), s.value || (s.value = n);
  }
  function i(n) {
    var o;
    l.value = l.value.filter((v) => v.id !== n), ((o = s.value) == null ? void 0 : o.id) === n && (s.value = l.value[0] || null);
  }
  return { members: l, currentMember: s, setMembers: a, setCurrentMember: m, addMember: g, removeMember: i, fetchMembers: c };
}), H = { class: "ss-member-picker" }, L = ["value"], P = ["value"], E = /* @__PURE__ */ I({
  __name: "MemberPicker",
  setup(l) {
    const s = V(), a = $("__SS_API__");
    function m(c) {
      const i = c.target.value;
      i && (s.setCurrentMember(i), localStorage.setItem("secretsauce:current_member_id", i), a && typeof a.setDefaultHeader == "function" && a.setDefaultHeader("x-actor-member", i));
    }
    return (c, g) => {
      var i;
      return u(), d("div", H, [
        f(s).currentMember ? (u(), d(
          "div",
          {
            key: 0,
            class: "member-avatar",
            style: U({ backgroundColor: f(s).currentMember.avatar_color || "#0284c7" })
          },
          b(f(s).currentMember.name ? f(s).currentMember.name.slice(0, 1).toUpperCase() : "?"),
          5
          /* TEXT, STYLE */
        )) : h("v-if", !0),
        t("select", {
          class: "member-select",
          value: (i = f(s).currentMember) == null ? void 0 : i.id,
          onChange: m
        }, [
          (u(!0), d(
            S,
            null,
            C(f(s).members, (n) => (u(), d("option", {
              key: n.id,
              value: n.id
            }, b(n.name), 9, P))),
            128
            /* KEYED_FRAGMENT */
          ))
        ], 40, L)
      ]);
    };
  }
}), D = (l, s) => {
  const a = l.__vccOpts || l;
  for (const [m, c] of s)
    a[m] = c;
  return a;
}, j = /* @__PURE__ */ D(E, [["__scopeId", "data-v-301436c6"]]), z = { class: "ss-member-settings" }, F = { class: "header-row" }, O = { class: "members-grid" }, T = { class: "member-card-header" }, q = { class: "subtext" }, G = ["onClick"], J = {
  key: 0,
  class: "tags"
}, K = {
  key: 0,
  class: "modal-backdrop"
}, Q = { class: "modal" }, W = { class: "form-group" }, X = { class: "form-row" }, Y = { class: "form-group" }, Z = { class: "form-group" }, ee = { class: "form-group" }, te = { class: "form-group" }, re = { class: "form-group" }, se = { class: "modal-actions" }, ne = /* @__PURE__ */ I({
  __name: "MemberSettings",
  setup(l) {
    const s = V(), a = $("__SS_API__"), m = p(!1), c = p(""), g = p("en"), i = p("#0284c7"), n = p(1), o = p(""), v = p("");
    async function N() {
      if (!c.value.trim() || !a) return;
      const k = {
        name: c.value.trim(),
        preferred_language: g.value,
        avatar_color: i.value,
        serving_ratio: Number(n.value) || 1,
        dietary_restrictions: o.value.split(",").map((r) => r.trim()).filter(Boolean),
        allergies: v.value.split(",").map((r) => r.trim()).filter(Boolean)
      }, e = await a.post("/api/members", k);
      s.addMember(e), c.value = "", o.value = "", v.value = "", m.value = !1;
    }
    async function R(k, e) {
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
          onClick: e[0] || (e[0] = (r) => m.value = !0)
        }, "+ Add Member")
      ]),
      t("div", O, [
        (u(!0), d(
          S,
          null,
          C(f(s).members, (r) => {
            var w, x;
            return u(), d("div", {
              key: r.id,
              class: "member-card"
            }, [
              t("div", T, [
                t(
                  "div",
                  {
                    class: "avatar",
                    style: U({ backgroundColor: r.avatar_color || "#0284c7" })
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
                    q,
                    "Lang: " + b(r.preferred_language) + " · Ratio: " + b(r.serving_ratio) + "x",
                    1
                    /* TEXT */
                  )
                ]),
                t("button", {
                  class: "btn-danger",
                  onClick: (_) => R(r.id, r.revision)
                }, "Delete", 8, G)
              ]),
              (w = r.dietary_restrictions) != null && w.length || (x = r.allergies) != null && x.length ? (u(), d("div", J, [
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
      m.value ? (u(), d("div", K, [
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
                "onUpdate:modelValue": e[1] || (e[1] = (r) => c.value = r),
                type: "text",
                placeholder: "Name",
                class: "input"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [M, c.value]
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
                  "onUpdate:modelValue": e[2] || (e[2] = (r) => g.value = r),
                  type: "text",
                  placeholder: "en, de, etc.",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [M, g.value]
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
          t("div", se, [
            t("button", {
              class: "btn-secondary",
              onClick: e[7] || (e[7] = (r) => m.value = !1)
            }, "Cancel"),
            t("button", {
              class: "btn-primary",
              onClick: N
            }, "Save Member")
          ])
        ])
      ])) : h("v-if", !0)
    ]));
  }
}), A = /* @__PURE__ */ D(ne, [["__scopeId", "data-v-fc0cca3a"]]);
function ae(l) {
  var s;
  l.slot("shell.header.right", j, { order: 10 }), (s = l.settings) != null && s.section ? l.settings.section({
    id: "members",
    title: "Household Members",
    component: A
  }) : l.slot("settings.content", A, { order: 10 });
}
export {
  ae as default
};
