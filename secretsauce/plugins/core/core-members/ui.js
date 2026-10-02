import { defineComponent as B, computed as z, resolveComponent as s, openBlock as i, createElementBlock as w, unref as A, createBlock as M, createCommentVNode as I, createVNode as o, ref as c, createElementVNode as r, withCtx as y, createTextVNode as L, toDisplayString as k, Fragment as x, renderList as S, withModifiers as G, withDirectives as H, vModelText as J } from "vue";
import { useSecretSauce as R } from "@secretsauce/ui";
const K = { class: "ss-member-picker" }, Q = /* @__PURE__ */ B({
  __name: "MemberPicker",
  setup(v) {
    const l = R(), n = z(() => [{ id: "", name: "All members" }, ...l.store.members.value]);
    function u(m) {
      l.store.currentMember.value = l.store.members.value.find((f) => f.id === m) || null;
      try {
        m ? localStorage.setItem("ss-current-member", m) : localStorage.removeItem("ss-current-member");
      } catch {
      }
    }
    return (m, f) => {
      var b;
      const V = s("Avatar"), g = s("Select");
      return i(), w("div", K, [
        A(l).store.currentMember.value ? (i(), M(V, {
          key: 0,
          class: "member-avatar",
          label: A(l).store.currentMember.value.name.slice(0, 1).toUpperCase(),
          shape: "circle"
        }, null, 8, ["label"])) : I("v-if", !0),
        o(g, {
          class: "member-select",
          "aria-label": "Current member",
          modelValue: ((b = A(l).store.currentMember.value) == null ? void 0 : b.id) || "",
          options: n.value,
          optionLabel: "name",
          optionValue: "id",
          "onUpdate:modelValue": u
        }, null, 8, ["modelValue", "options"])
      ]);
    };
  }
}), P = (v, l) => {
  const n = v.__vccOpts || v;
  for (const [u, m] of l)
    n[u] = m;
  return n;
}, W = /* @__PURE__ */ P(Q, [["__scopeId", "data-v-d16fc73d"]]), X = { class: "ss-member-settings" }, Y = { class: "header-row" }, Z = { class: "members-grid" }, ee = { class: "member-card-header" }, le = { class: "tags" }, te = { class: "actions" }, re = /* @__PURE__ */ B({
  __name: "MemberSettings",
  setup(v) {
    const l = R(), n = c(!1), u = c(""), m = c("en"), f = c(1), V = c("#0284c7"), g = c([]), b = c([]), C = c(!1), p = c("");
    async function h() {
      if (!(!u.value.trim() || C.value)) {
        C.value = !0, p.value = "";
        try {
          const a = await l.api.post("/api/members", { name: u.value.trim(), preferred_language: m.value, avatar_color: V.value, serving_ratio: f.value, dietary_restrictions: g.value, allergies: b.value });
          l.store.members.value.push(a), l.store.currentMember.value || (l.store.currentMember.value = a), u.value = "", g.value = [], b.value = [], n.value = !1;
        } catch (a) {
          p.value = (a == null ? void 0 : a.message) || "Could not add member";
        } finally {
          C.value = !1;
        }
      }
    }
    async function E(a) {
      var e;
      if (await l.confirm({ header: "Remove member", message: `Remove ${a.name}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }))
        try {
          await l.api.delete(`/api/members/${a.id}`, { revision: a.revision }), l.store.members.value = l.store.members.value.filter((d) => d.id !== a.id), ((e = l.store.currentMember.value) == null ? void 0 : e.id) === a.id && (l.store.currentMember.value = l.store.members.value[0] || null);
        } catch (d) {
          p.value = (d == null ? void 0 : d.message) || "Could not remove member";
        }
    }
    return (a, e) => {
      const d = s("Button"), U = s("Message"), F = s("Avatar"), N = s("Tag"), j = s("Card"), $ = s("InputText"), q = s("InputNumber"), D = s("AutoComplete"), O = s("Dialog");
      return i(), w("div", X, [
        r("div", Y, [
          e[9] || (e[9] = r(
            "p",
            null,
            "Manage household profiles, preferences and dietary restrictions.",
            -1
            /* CACHED */
          )),
          o(d, {
            class: "btn-primary",
            label: "Add Member",
            icon: "pi pi-plus",
            onClick: e[0] || (e[0] = (t) => {
              n.value = !0, p.value = "";
            })
          })
        ]),
        p.value && !n.value ? (i(), M(U, {
          key: 0,
          severity: "error"
        }, {
          default: y(() => [
            L(
              k(p.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : I("v-if", !0),
        r("div", Z, [
          (i(!0), w(
            x,
            null,
            S(A(l).store.members.value, (t) => (i(), M(
              j,
              {
                key: t.id,
                class: "member-card"
              },
              {
                title: y(() => [
                  r("div", ee, [
                    o(F, {
                      label: t.name.slice(0, 1).toUpperCase(),
                      shape: "circle"
                    }, null, 8, ["label"]),
                    r(
                      "span",
                      null,
                      k(t.name),
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                content: y(() => [
                  r(
                    "p",
                    null,
                    k(t.preferred_language) + " · Portion " + k(t.serving_ratio) + "×",
                    1
                    /* TEXT */
                  ),
                  r("div", le, [
                    (i(!0), w(
                      x,
                      null,
                      S(t.dietary_restrictions, (_) => (i(), M(N, {
                        key: _,
                        value: _,
                        severity: "info"
                      }, null, 8, ["value"]))),
                      128
                      /* KEYED_FRAGMENT */
                    )),
                    (i(!0), w(
                      x,
                      null,
                      S(t.allergies, (_) => (i(), M(N, {
                        key: _,
                        value: `Allergy: ${_}`,
                        severity: "danger",
                        icon: "pi pi-exclamation-triangle"
                      }, null, 8, ["value"]))),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ]),
                footer: y(() => [
                  o(d, {
                    label: "Delete",
                    icon: "pi pi-trash",
                    severity: "danger",
                    text: "",
                    onClick: (_) => E(t)
                  }, null, 8, ["onClick"])
                ]),
                _: 2
                /* DYNAMIC */
              },
              1024
              /* DYNAMIC_SLOTS */
            ))),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        o(O, {
          visible: n.value,
          "onUpdate:visible": e[8] || (e[8] = (t) => n.value = t),
          header: "Add household member",
          modal: "",
          style: { width: "min(30rem, 95vw)" }
        }, {
          default: y(() => [
            r(
              "form",
              {
                class: "member-form",
                onSubmit: G(h, ["prevent"])
              },
              [
                p.value ? (i(), M(U, {
                  key: 0,
                  severity: "error"
                }, {
                  default: y(() => [
                    L(
                      k(p.value),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                })) : I("v-if", !0),
                e[10] || (e[10] = r(
                  "label",
                  { for: "member-name" },
                  "Name",
                  -1
                  /* CACHED */
                )),
                o($, {
                  id: "member-name",
                  modelValue: u.value,
                  "onUpdate:modelValue": e[1] || (e[1] = (t) => u.value = t),
                  required: "",
                  fluid: ""
                }, null, 8, ["modelValue"]),
                e[11] || (e[11] = r(
                  "label",
                  { for: "member-language" },
                  "Language",
                  -1
                  /* CACHED */
                )),
                o($, {
                  id: "member-language",
                  modelValue: m.value,
                  "onUpdate:modelValue": e[2] || (e[2] = (t) => m.value = t),
                  fluid: ""
                }, null, 8, ["modelValue"]),
                e[12] || (e[12] = r(
                  "label",
                  { for: "member-serving" },
                  "Serving ratio",
                  -1
                  /* CACHED */
                )),
                o(q, {
                  inputId: "member-serving",
                  modelValue: f.value,
                  "onUpdate:modelValue": e[3] || (e[3] = (t) => f.value = t),
                  min: 0.25,
                  max: 10,
                  step: 0.25,
                  maxFractionDigits: 2,
                  fluid: ""
                }, null, 8, ["modelValue"]),
                e[13] || (e[13] = r(
                  "label",
                  { for: "member-color" },
                  "Avatar color",
                  -1
                  /* CACHED */
                )),
                H(r(
                  "input",
                  {
                    id: "member-color",
                    "onUpdate:modelValue": e[4] || (e[4] = (t) => V.value = t),
                    type: "color"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [J, V.value]
                ]),
                e[14] || (e[14] = r(
                  "label",
                  { for: "member-dietary" },
                  "Dietary restrictions",
                  -1
                  /* CACHED */
                )),
                o(D, {
                  inputId: "member-dietary",
                  modelValue: g.value,
                  "onUpdate:modelValue": e[5] || (e[5] = (t) => g.value = t),
                  multiple: "",
                  typeahead: !1,
                  fluid: ""
                }, null, 8, ["modelValue"]),
                e[15] || (e[15] = r(
                  "label",
                  { for: "member-allergies" },
                  "Allergies",
                  -1
                  /* CACHED */
                )),
                o(D, {
                  inputId: "member-allergies",
                  modelValue: b.value,
                  "onUpdate:modelValue": e[6] || (e[6] = (t) => b.value = t),
                  multiple: "",
                  typeahead: !1,
                  fluid: ""
                }, null, 8, ["modelValue"]),
                r("div", te, [
                  o(d, {
                    label: "Cancel",
                    severity: "secondary",
                    disabled: C.value,
                    onClick: e[7] || (e[7] = (t) => n.value = !1)
                  }, null, 8, ["disabled"]),
                  o(d, {
                    type: "submit",
                    label: "Save Member",
                    loading: C.value,
                    disabled: !u.value.trim()
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
}), T = /* @__PURE__ */ P(re, [["__scopeId", "data-v-9a3d05a5"]]);
function ne(v) {
  var l;
  v.slot("shell.header.right", W, { order: 10 }), (l = v.settings) != null && l.section ? v.settings.section({
    id: "members",
    title: "Members",
    order: 10,
    component: T
  }) : v.slot("settings.content", T, { order: 10 });
}
export {
  ne as default
};
