import { defineComponent as L, ref as k, computed as F, resolveComponent as g, openBlock as v, createElementBlock as M, createVNode as y, withCtx as I, unref as C, createBlock as h, normalizeStyle as q, createCommentVNode as A, createElementVNode as m, toDisplayString as S, watch as J, withModifiers as K, createTextVNode as z, Fragment as w, renderList as V } from "vue";
import { useSecretSauce as N } from "@secretsauce/ui";
const E = ["blue", "emerald", "violet", "rose", "amber", "cyan", "indigo", "teal"];
function j(p) {
  let t = 0;
  for (const u of p) t = Math.imul(t, 31) + u.charCodeAt(0) >>> 0;
  return `var(--p-${E[t % E.length]}-700)`;
}
const Q = { class: "ss-member-picker" }, X = /* @__PURE__ */ L({
  __name: "MemberPicker",
  setup(p) {
    const t = N(), u = k();
    function r(i) {
      t.store.currentMember.value = t.store.members.value.find((d) => d.id === i) || null;
      try {
        i ? localStorage.setItem("ss-current-member", i) : localStorage.removeItem("ss-current-member");
      } catch {
      }
    }
    const f = F(() => [{ label: "All members", command: () => r("") }, ...t.store.members.value.map((i) => ({ label: i.name, command: () => r(i.id) }))]);
    return (i, d) => {
      const x = g("Avatar"), s = g("Button"), $ = g("Menu");
      return v(), M("div", Q, [
        y(s, {
          class: "member-select",
          "aria-label": "Current member",
          text: "",
          onClick: d[0] || (d[0] = (n) => u.value.toggle(n))
        }, {
          default: I(() => {
            var n;
            return [
              C(t).store.currentMember.value ? (v(), h(x, {
                key: 0,
                class: "member-avatar",
                label: C(t).store.currentMember.value.name.slice(0, 1).toUpperCase(),
                shape: "circle",
                style: q({ background: C(j)(C(t).store.currentMember.value.id), color: "var(--p-surface-0)" })
              }, null, 8, ["label", "style"])) : A("v-if", !0),
              m(
                "span",
                null,
                S(((n = C(t).store.currentMember.value) == null ? void 0 : n.name) || "All members"),
                1
                /* TEXT */
              ),
              d[1] || (d[1] = m(
                "i",
                {
                  class: "pi pi-chevron-down",
                  "aria-hidden": "true"
                },
                null,
                -1
                /* CACHED */
              ))
            ];
          }),
          _: 1
          /* STABLE */
        }),
        y($, {
          ref_key: "menu",
          ref: u,
          model: f.value,
          popup: ""
        }, null, 8, ["model"])
      ]);
    };
  }
}), T = (p, t) => {
  const u = p.__vccOpts || p;
  for (const [r, f] of t)
    u[r] = f;
  return u;
}, Y = /* @__PURE__ */ T(X, [["__scopeId", "data-v-1d9dd551"]]), Z = ["for"], ee = { class: "actions" }, te = /* @__PURE__ */ L({
  __name: "MemberDialog",
  props: {
    visible: { type: Boolean },
    member: {}
  },
  emits: ["update:visible", "saved"],
  setup(p, { emit: t }) {
    const u = N(), r = p, f = t, i = k(!1), d = k("");
    function x(e) {
      return {
        name: (e == null ? void 0 : e.name) || "",
        preferred_language: (e == null ? void 0 : e.preferred_language) || u.store.household.value.languages.primary,
        serving_ratio: (e == null ? void 0 : e.serving_ratio) ?? 1,
        dietary_restrictions: [...(e == null ? void 0 : e.dietary_restrictions) || []],
        allergies: [...(e == null ? void 0 : e.allergies) || []],
        disliked_ingredients: [...(e == null ? void 0 : e.disliked_ingredients) || []],
        favorite_cuisines: [...(e == null ? void 0 : e.favorite_cuisines) || []]
      };
    }
    const s = k(x()), $ = k(1);
    J(() => [r.visible, r.member], () => {
      var e;
      r.visible && (s.value = x(r.member), $.value = ((e = r.member) == null ? void 0 : e.revision) || 1, d.value = "");
    }, { immediate: !0 });
    const n = F(() => {
      var e;
      return [.../* @__PURE__ */ new Set([u.store.household.value.languages.primary, ...u.store.household.value.languages.translations || [], ...(e = r.member) != null && e.preferred_language ? [r.member.preferred_language] : [], "en", "de", "fr", "es", "it", "nl"])];
    }), c = [
      { key: "dietary_restrictions", id: "dietary", label: "Dietary restrictions", suggestions: ["vegetarian", "vegan", "gluten-free", "dairy-free"] },
      { key: "allergies", id: "allergies", label: "Allergies", suggestions: ["peanut", "tree nut", "milk", "egg", "shellfish"] },
      { key: "disliked_ingredients", id: "dislikes", label: "Disliked ingredients", suggestions: ["mushroom", "olive", "coriander"] },
      { key: "favorite_cuisines", id: "cuisines", label: "Favourite cuisines", suggestions: ["Italian", "Indian", "Mexican", "Thai"] }
    ], b = k({});
    function B(e, l) {
      b.value[e.key] = e.suggestions.filter((a) => a.toLowerCase().includes(l.toLowerCase()));
    }
    async function D() {
      var e;
      if (!(i.value || !s.value.name.trim() || s.value.serving_ratio == null || s.value.serving_ratio < 0.25 || s.value.serving_ratio > 10)) {
        i.value = !0, d.value = "";
        try {
          const l = { ...s.value, name: s.value.name.trim() }, a = r.member ? await u.api.patch(`/api/members/${r.member.id}`, { ...l, revision: $.value }) : await u.api.post("/api/members", l);
          f("saved", a), f("update:visible", !1);
        } catch (l) {
          const a = ((e = l.details) == null ? void 0 : e.current) || l.current;
          l.status === 409 && r.member && a ? (s.value = x(a), $.value = a.revision, d.value = "Someone else changed this member. The latest profile has been reloaded.") : d.value = l.message || "Could not save member";
        } finally {
          i.value = !1;
        }
      }
    }
    return (e, l) => {
      const a = g("Message"), _ = g("InputText"), O = g("Select"), W = g("InputNumber"), G = g("AutoComplete"), P = g("Button"), H = g("Dialog");
      return v(), h(H, {
        visible: p.visible,
        "onUpdate:visible": l[4] || (l[4] = (o) => f("update:visible", o)),
        header: p.member ? "Edit household member" : "Add household member",
        modal: "",
        style: { width: "32rem", maxWidth: "95vw" }
      }, {
        default: I(() => [
          m(
            "form",
            {
              class: "member-form",
              onSubmit: K(D, ["prevent"])
            },
            [
              d.value ? (v(), h(a, {
                key: 0,
                severity: "error"
              }, {
                default: I(() => [
                  z(
                    S(d.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : A("v-if", !0),
              l[5] || (l[5] = m(
                "label",
                { for: "member-name" },
                "Name",
                -1
                /* CACHED */
              )),
              y(_, {
                id: "member-name",
                modelValue: s.value.name,
                "onUpdate:modelValue": l[0] || (l[0] = (o) => s.value.name = o),
                required: "",
                fluid: ""
              }, null, 8, ["modelValue"]),
              l[6] || (l[6] = m(
                "label",
                { for: "member-language" },
                "Language",
                -1
                /* CACHED */
              )),
              y(O, {
                inputId: "member-language",
                "aria-label": "Language",
                modelValue: s.value.preferred_language,
                "onUpdate:modelValue": l[1] || (l[1] = (o) => s.value.preferred_language = o),
                options: n.value,
                fluid: ""
              }, null, 8, ["modelValue", "options"]),
              l[7] || (l[7] = m(
                "label",
                { for: "member-serving" },
                "Portion size",
                -1
                /* CACHED */
              )),
              y(W, {
                inputId: "member-serving",
                modelValue: s.value.serving_ratio,
                "onUpdate:modelValue": l[2] || (l[2] = (o) => s.value.serving_ratio = o),
                min: 0.25,
                max: 10,
                step: 0.25,
                maxFractionDigits: 2,
                showButtons: "",
                fluid: ""
              }, null, 8, ["modelValue"]),
              l[8] || (l[8] = m(
                "small",
                null,
                "Relative to one adult portion",
                -1
                /* CACHED */
              )),
              (v(), M(
                w,
                null,
                V(c, (o) => (v(), M(
                  w,
                  {
                    key: o.key
                  },
                  [
                    m("label", {
                      for: `member-${o.id}`
                    }, S(o.label), 9, Z),
                    y(G, {
                      inputId: `member-${o.id}`,
                      "aria-label": o.label,
                      modelValue: s.value[o.key],
                      "onUpdate:modelValue": (U) => s.value[o.key] = U,
                      multiple: "",
                      typeahead: !1,
                      dropdown: "",
                      suggestions: b.value[o.key] || [],
                      onComplete: (U) => B(o, U.query),
                      fluid: ""
                    }, null, 8, ["inputId", "aria-label", "modelValue", "onUpdate:modelValue", "suggestions", "onComplete"])
                  ],
                  64
                  /* STABLE_FRAGMENT */
                ))),
                64
                /* STABLE_FRAGMENT */
              )),
              m("div", ee, [
                y(P, {
                  label: "Cancel",
                  severity: "secondary",
                  text: "",
                  disabled: i.value,
                  onClick: l[3] || (l[3] = (o) => f("update:visible", !1))
                }, null, 8, ["disabled"]),
                y(P, {
                  type: "submit",
                  label: "Save Member",
                  loading: i.value,
                  disabled: !s.value.name.trim()
                }, null, 8, ["loading", "disabled"])
              ])
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        _: 1
        /* STABLE */
      }, 8, ["visible", "header"]);
    };
  }
}), le = /* @__PURE__ */ T(te, [["__scopeId", "data-v-59fafb91"]]), ae = { class: "ss-member-settings" }, ne = { class: "header-row" }, se = { class: "members-grid" }, re = { class: "member-card-header" }, ie = { class: "tags" }, oe = /* @__PURE__ */ L({
  __name: "MemberSettings",
  setup(p) {
    const t = N(), u = k(!1), r = k(null), f = k(""), i = k(/* @__PURE__ */ new Set());
    function d(n) {
      r.value = n, u.value = !0, f.value = "";
    }
    function x(n) {
      const c = t.store.members.value.findIndex((b) => b.id === n.id);
      c < 0 ? t.store.members.value.push(n) : t.store.members.value.splice(c, 1, n), (!t.store.currentMember.value || t.store.currentMember.value.id === n.id) && (t.store.currentMember.value = n);
    }
    function s(n) {
      return ![n.dietary_restrictions, n.allergies, n.disliked_ingredients, n.favorite_cuisines].some((c) => c.length);
    }
    async function $(n) {
      var c;
      if (!(t.store.members.value.length <= 1 || i.value.has(n.id))) {
        i.value.add(n.id);
        try {
          if (!await t.confirm({ header: "Remove member", message: `Remove ${n.name}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          if (await t.api.delete(`/api/members/${n.id}`, { revision: n.revision }), t.store.members.value = t.store.members.value.filter((b) => b.id !== n.id), ((c = t.store.currentMember.value) == null ? void 0 : c.id) === n.id) {
            t.store.currentMember.value = t.store.members.value[0] || null;
            try {
              t.store.currentMember.value ? localStorage.setItem("ss-current-member", t.store.currentMember.value.id) : localStorage.removeItem("ss-current-member");
            } catch {
            }
          }
        } catch (b) {
          f.value = b.message || "Could not remove member";
        } finally {
          i.value.delete(n.id);
        }
      }
    }
    return (n, c) => {
      const b = g("Button"), B = g("Message"), D = g("Avatar"), e = g("Tag"), l = g("Card");
      return v(), M("div", ae, [
        m("div", ne, [
          c[2] || (c[2] = m(
            "p",
            null,
            "Manage household profiles, preferences and dietary restrictions.",
            -1
            /* CACHED */
          )),
          y(b, {
            label: "Add Member",
            icon: "pi pi-plus",
            onClick: c[0] || (c[0] = (a) => d(null))
          })
        ]),
        f.value ? (v(), h(B, {
          key: 0,
          severity: "error"
        }, {
          default: I(() => [
            z(
              S(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        m("div", se, [
          (v(!0), M(
            w,
            null,
            V(C(t).store.members.value, (a) => (v(), h(l, {
              key: a.id,
              "data-member-id": a.id,
              class: "member-card"
            }, {
              title: I(() => [
                m("div", re, [
                  y(D, {
                    label: a.name.slice(0, 1).toUpperCase(),
                    shape: "circle",
                    style: q({ background: C(j)(a.id), color: "var(--p-surface-0)" })
                  }, null, 8, ["label", "style"]),
                  m(
                    "span",
                    null,
                    S(a.name),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              content: I(() => [
                m(
                  "p",
                  null,
                  S(a.preferred_language) + " · Portion " + S(a.serving_ratio) + "×",
                  1
                  /* TEXT */
                ),
                m("div", ie, [
                  (v(!0), M(
                    w,
                    null,
                    V(a.dietary_restrictions, (_) => (v(), h(e, {
                      key: _,
                      value: _,
                      severity: "info"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  (v(!0), M(
                    w,
                    null,
                    V(a.allergies, (_) => (v(), h(e, {
                      key: _,
                      value: `Allergy: ${_}`,
                      severity: "danger",
                      icon: "pi pi-exclamation-triangle"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  (v(!0), M(
                    w,
                    null,
                    V(a.disliked_ingredients, (_) => (v(), h(e, {
                      key: _,
                      value: `Dislikes: ${_}`,
                      severity: "secondary"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                s(a) ? (v(), h(b, {
                  key: 0,
                  label: "Add dietary preferences",
                  text: "",
                  onClick: (_) => d(a)
                }, null, 8, ["onClick"])) : A("v-if", !0)
              ]),
              footer: I(() => [
                y(b, {
                  icon: "pi pi-pencil",
                  "aria-label": `Edit ${a.name}`,
                  rounded: "",
                  text: "",
                  onClick: (_) => d(a)
                }, null, 8, ["aria-label", "onClick"]),
                y(b, {
                  icon: "pi pi-trash",
                  "aria-label": `Delete ${a.name}`,
                  severity: "danger",
                  rounded: "",
                  text: "",
                  disabled: C(t).store.members.value.length <= 1 || i.value.has(a.id),
                  onClick: (_) => $(a)
                }, null, 8, ["aria-label", "disabled", "onClick"])
              ]),
              _: 2
              /* DYNAMIC */
            }, 1032, ["data-member-id"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        y(le, {
          visible: u.value,
          "onUpdate:visible": c[1] || (c[1] = (a) => u.value = a),
          member: r.value,
          onSaved: x
        }, null, 8, ["visible", "member"])
      ]);
    };
  }
}), R = /* @__PURE__ */ T(oe, [["__scopeId", "data-v-7b1d0e0b"]]);
function ve(p) {
  var t;
  p.slot("shell.header.right", Y, { order: 10 }), (t = p.settings) != null && t.section ? p.settings.section({
    id: "members",
    title: "Members",
    order: 10,
    component: R
  }) : p.slot("settings.content", R, { order: 10 });
}
export {
  ve as default
};
