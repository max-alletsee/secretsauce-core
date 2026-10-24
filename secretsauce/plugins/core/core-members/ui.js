import { defineComponent as N, ref as y, computed as q, resolveComponent as g, openBlock as c, createElementBlock as h, createVNode as _, withCtx as $, unref as M, createBlock as k, normalizeStyle as z, createCommentVNode as B, createElementVNode as m, toDisplayString as I, watch as K, withModifiers as Q, createTextVNode as j, Fragment as w, renderList as A } from "vue";
import { useSecretSauce as T } from "@secretsauce/ui";
const R = ["blue", "emerald", "violet", "rose", "amber", "cyan", "indigo", "teal"];
function O(p) {
  let l = 0;
  for (const u of p) l = Math.imul(l, 31) + u.charCodeAt(0) >>> 0;
  return `var(--p-${R[l % R.length]}-700)`;
}
const X = { class: "ss-member-picker" }, Y = /* @__PURE__ */ N({
  __name: "MemberPicker",
  setup(p) {
    const l = T(), u = y();
    function r(i) {
      l.store.currentMember.value = l.store.members.value.find((d) => d.id === i) || null;
      try {
        i ? localStorage.setItem("ss-current-member", i) : localStorage.removeItem("ss-current-member");
      } catch {
      }
    }
    const f = q(() => [{ label: "All members", command: () => r("") }, ...l.store.members.value.map((i) => ({ label: i.name, command: () => r(i.id) }))]);
    return (i, d) => {
      const C = g("Avatar"), n = g("Button"), x = g("Menu");
      return c(), h("div", X, [
        _(n, {
          class: "member-select",
          "aria-label": "Current member",
          text: "",
          onClick: d[0] || (d[0] = (a) => u.value.toggle(a))
        }, {
          default: $(() => {
            var a;
            return [
              M(l).store.currentMember.value ? (c(), k(C, {
                key: 0,
                class: "member-avatar",
                label: M(l).store.currentMember.value.name.slice(0, 1).toUpperCase(),
                shape: "circle",
                style: z({ background: M(O)(M(l).store.currentMember.value.id), color: "var(--p-surface-0)" })
              }, null, 8, ["label", "style"])) : B("v-if", !0),
              m(
                "span",
                null,
                I(((a = M(l).store.currentMember.value) == null ? void 0 : a.name) || "All members"),
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
        _(x, {
          ref_key: "menu",
          ref: u,
          model: f.value,
          popup: ""
        }, null, 8, ["model"])
      ]);
    };
  }
}), P = (p, l) => {
  const u = p.__vccOpts || p;
  for (const [r, f] of l)
    u[r] = f;
  return u;
}, Z = /* @__PURE__ */ P(Y, [["__scopeId", "data-v-1a9f45d2"]]), ee = ["for"], te = { class: "actions" }, le = /* @__PURE__ */ N({
  __name: "MemberDialog",
  props: {
    visible: { type: Boolean },
    member: {}
  },
  emits: ["update:visible", "saved"],
  setup(p, { emit: l }) {
    const u = T(), r = p, f = l, i = y(!1), d = y("");
    function C(t) {
      return {
        name: (t == null ? void 0 : t.name) || "",
        preferred_language: (t == null ? void 0 : t.preferred_language) || u.store.household.value.languages.primary,
        serving_ratio: (t == null ? void 0 : t.serving_ratio) ?? 1,
        dietary_restrictions: [...(t == null ? void 0 : t.dietary_restrictions) || []],
        allergies: [...(t == null ? void 0 : t.allergies) || []],
        disliked_ingredients: [...(t == null ? void 0 : t.disliked_ingredients) || []],
        favorite_cuisines: [...(t == null ? void 0 : t.favorite_cuisines) || []]
      };
    }
    const n = y(C()), x = y(1);
    K(() => [r.visible, r.member], () => {
      var t;
      r.visible && (n.value = C(r.member), x.value = ((t = r.member) == null ? void 0 : t.revision) || 1, d.value = "");
    }, { immediate: !0 });
    const a = q(() => {
      var t;
      return [.../* @__PURE__ */ new Set([u.store.household.value.languages.primary, ...u.store.household.value.languages.translations || [], ...(t = r.member) != null && t.preferred_language ? [r.member.preferred_language] : [], "en", "de", "fr", "es", "it", "nl"])];
    }), v = [
      { key: "dietary_restrictions", id: "dietary", label: "Dietary restrictions", suggestions: ["vegetarian", "vegan", "gluten-free", "dairy-free"] },
      { key: "allergies", id: "allergies", label: "Allergies", suggestions: ["peanut", "tree nut", "milk", "egg", "shellfish"] },
      { key: "disliked_ingredients", id: "dislikes", label: "Disliked ingredients", suggestions: ["mushroom", "olive", "coriander"] },
      { key: "favorite_cuisines", id: "cuisines", label: "Favourite cuisines", suggestions: ["Italian", "Indian", "Mexican", "Thai"] }
    ], b = y({});
    function D(t, e) {
      b.value[t.key] = t.suggestions.filter((s) => s.toLowerCase().includes(e.toLowerCase()));
    }
    function U() {
      for (const t of v) {
        const e = document.getElementById(`member-${t.id}`);
        if (e && e.value && e.value.trim()) {
          const s = e.value.split(",").map((S) => S.trim()).filter(Boolean);
          for (const S of s)
            n.value[t.key].includes(S) || (n.value[t.key] = [...n.value[t.key], S]);
          e.value = "";
        }
      }
    }
    async function V() {
      var t;
      if (U(), !(i.value || !n.value.name.trim() || n.value.serving_ratio == null || n.value.serving_ratio < 0.25 || n.value.serving_ratio > 10)) {
        i.value = !0, d.value = "";
        try {
          const e = { ...n.value, name: n.value.name.trim() }, s = r.member ? await u.api.patch(`/api/members/${r.member.id}`, { ...e, revision: x.value }) : await u.api.post("/api/members", e);
          f("saved", s), f("update:visible", !1);
        } catch (e) {
          const s = ((t = e.details) == null ? void 0 : t.current) || e.current;
          e.status === 409 && r.member && s ? (n.value = C(s), x.value = s.revision, d.value = "Someone else changed this member. The latest profile has been reloaded.") : d.value = e.message || "Could not save member";
        } finally {
          i.value = !1;
        }
      }
    }
    return (t, e) => {
      const s = g("Message"), S = g("InputText"), W = g("Select"), G = g("InputNumber"), H = g("AutoComplete"), E = g("Button"), J = g("Dialog");
      return c(), k(J, {
        visible: p.visible,
        "onUpdate:visible": e[4] || (e[4] = (o) => f("update:visible", o)),
        header: p.member ? "Edit household member" : "Add household member",
        modal: "",
        style: { width: "32rem", maxWidth: "95vw" }
      }, {
        default: $(() => [
          m(
            "form",
            {
              class: "member-form",
              onSubmit: Q(V, ["prevent"])
            },
            [
              d.value ? (c(), k(s, {
                key: 0,
                severity: "error"
              }, {
                default: $(() => [
                  j(
                    I(d.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : B("v-if", !0),
              e[5] || (e[5] = m(
                "label",
                { for: "member-name" },
                "Name",
                -1
                /* CACHED */
              )),
              _(S, {
                id: "member-name",
                modelValue: n.value.name,
                "onUpdate:modelValue": e[0] || (e[0] = (o) => n.value.name = o),
                required: "",
                fluid: ""
              }, null, 8, ["modelValue"]),
              e[6] || (e[6] = m(
                "label",
                { for: "member-language" },
                "Language",
                -1
                /* CACHED */
              )),
              _(W, {
                inputId: "member-language",
                "aria-label": "Language",
                modelValue: n.value.preferred_language,
                "onUpdate:modelValue": e[1] || (e[1] = (o) => n.value.preferred_language = o),
                options: a.value,
                fluid: ""
              }, null, 8, ["modelValue", "options"]),
              e[7] || (e[7] = m(
                "label",
                { for: "member-serving" },
                "Portion size",
                -1
                /* CACHED */
              )),
              _(G, {
                inputId: "member-serving",
                modelValue: n.value.serving_ratio,
                "onUpdate:modelValue": e[2] || (e[2] = (o) => n.value.serving_ratio = o),
                min: 0.25,
                max: 10,
                step: 0.25,
                maxFractionDigits: 2,
                showButtons: "",
                fluid: ""
              }, null, 8, ["modelValue"]),
              e[8] || (e[8] = m(
                "small",
                null,
                "Relative to one adult portion",
                -1
                /* CACHED */
              )),
              (c(), h(
                w,
                null,
                A(v, (o) => (c(), h(
                  w,
                  {
                    key: o.key
                  },
                  [
                    m("label", {
                      for: `member-${o.id}`
                    }, I(o.label), 9, ee),
                    _(H, {
                      inputId: `member-${o.id}`,
                      "aria-label": o.label,
                      modelValue: n.value[o.key],
                      "onUpdate:modelValue": (L) => n.value[o.key] = L,
                      multiple: "",
                      typeahead: !1,
                      dropdown: "",
                      suggestions: b.value[o.key] || [],
                      onComplete: (L) => D(o, L.query),
                      fluid: ""
                    }, null, 8, ["inputId", "aria-label", "modelValue", "onUpdate:modelValue", "suggestions", "onComplete"])
                  ],
                  64
                  /* STABLE_FRAGMENT */
                ))),
                64
                /* STABLE_FRAGMENT */
              )),
              m("div", te, [
                _(E, {
                  label: "Cancel",
                  severity: "secondary",
                  text: "",
                  disabled: i.value,
                  onClick: e[3] || (e[3] = (o) => f("update:visible", !1))
                }, null, 8, ["disabled"]),
                _(E, {
                  type: "submit",
                  label: "Save Member",
                  loading: i.value,
                  disabled: !n.value.name.trim()
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
}), ae = /* @__PURE__ */ P(le, [["__scopeId", "data-v-89c975ec"]]), ne = { class: "ss-member-settings" }, se = { class: "header-row" }, re = { class: "members-grid" }, ie = { class: "member-card-header" }, oe = { class: "tags" }, ue = /* @__PURE__ */ N({
  __name: "MemberSettings",
  setup(p) {
    const l = T(), u = y(!1), r = y(null), f = y(""), i = y(/* @__PURE__ */ new Set());
    function d(a) {
      r.value = a, u.value = !0, f.value = "";
    }
    function C(a) {
      const v = l.store.members.value.findIndex((b) => b.id === a.id);
      v < 0 ? l.store.members.value.push(a) : l.store.members.value.splice(v, 1, a), (!l.store.currentMember.value || l.store.currentMember.value.id === a.id) && (l.store.currentMember.value = a);
    }
    function n(a) {
      return ![a.dietary_restrictions, a.allergies, a.disliked_ingredients, a.favorite_cuisines].some((v) => v.length);
    }
    async function x(a) {
      var v;
      if (!(l.store.members.value.length <= 1 || i.value.has(a.id))) {
        i.value.add(a.id);
        try {
          if (!await l.confirm({ header: "Remove member", message: `Remove ${a.name}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          if (await l.api.delete(`/api/members/${a.id}`, { revision: a.revision }), l.store.members.value = l.store.members.value.filter((b) => b.id !== a.id), ((v = l.store.currentMember.value) == null ? void 0 : v.id) === a.id) {
            l.store.currentMember.value = l.store.members.value[0] || null;
            try {
              l.store.currentMember.value ? localStorage.setItem("ss-current-member", l.store.currentMember.value.id) : localStorage.removeItem("ss-current-member");
            } catch {
            }
          }
        } catch (b) {
          f.value = b.message || "Could not remove member";
        } finally {
          i.value.delete(a.id);
        }
      }
    }
    return (a, v) => {
      const b = g("Button"), D = g("Message"), U = g("Avatar"), V = g("Tag"), t = g("Card");
      return c(), h("div", ne, [
        m("div", se, [
          v[2] || (v[2] = m(
            "p",
            null,
            "Manage household profiles, preferences and dietary restrictions.",
            -1
            /* CACHED */
          )),
          _(b, {
            label: "Add Member",
            icon: "pi pi-plus",
            onClick: v[0] || (v[0] = (e) => d(null))
          })
        ]),
        f.value ? (c(), k(D, {
          key: 0,
          severity: "error"
        }, {
          default: $(() => [
            j(
              I(f.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : B("v-if", !0),
        m("div", re, [
          (c(!0), h(
            w,
            null,
            A(M(l).store.members.value, (e) => (c(), k(t, {
              key: e.id,
              "data-member-id": e.id,
              class: "member-card"
            }, {
              title: $(() => [
                m("div", ie, [
                  _(U, {
                    label: e.name.slice(0, 1).toUpperCase(),
                    shape: "circle",
                    style: z({ background: M(O)(e.id), color: "var(--p-surface-0)" })
                  }, null, 8, ["label", "style"]),
                  m(
                    "span",
                    null,
                    I(e.name),
                    1
                    /* TEXT */
                  )
                ])
              ]),
              content: $(() => [
                m(
                  "p",
                  null,
                  I(e.preferred_language) + " · Portion " + I(e.serving_ratio) + "×",
                  1
                  /* TEXT */
                ),
                m("div", oe, [
                  (c(!0), h(
                    w,
                    null,
                    A(e.dietary_restrictions, (s) => (c(), k(V, {
                      key: s,
                      value: s,
                      severity: "info"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  (c(!0), h(
                    w,
                    null,
                    A(e.allergies, (s) => (c(), k(V, {
                      key: s,
                      value: `Allergy: ${s}`,
                      severity: "danger",
                      icon: "pi pi-exclamation-triangle"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  )),
                  (c(!0), h(
                    w,
                    null,
                    A(e.disliked_ingredients, (s) => (c(), k(V, {
                      key: s,
                      value: `Dislikes: ${s}`,
                      severity: "secondary"
                    }, null, 8, ["value"]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]),
                n(e) ? (c(), k(b, {
                  key: 0,
                  label: "Add dietary preferences",
                  text: "",
                  onClick: (s) => d(e)
                }, null, 8, ["onClick"])) : B("v-if", !0)
              ]),
              footer: $(() => [
                _(b, {
                  icon: "pi pi-pencil",
                  "aria-label": `Edit ${e.name}`,
                  rounded: "",
                  text: "",
                  onClick: (s) => d(e)
                }, null, 8, ["aria-label", "onClick"]),
                _(b, {
                  icon: "pi pi-trash",
                  "aria-label": `Delete ${e.name}`,
                  severity: "danger",
                  rounded: "",
                  text: "",
                  disabled: M(l).store.members.value.length <= 1 || i.value.has(e.id),
                  onClick: (s) => x(e)
                }, null, 8, ["aria-label", "disabled", "onClick"])
              ]),
              _: 2
              /* DYNAMIC */
            }, 1032, ["data-member-id"]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        _(ae, {
          visible: u.value,
          "onUpdate:visible": v[1] || (v[1] = (e) => u.value = e),
          member: r.value,
          onSaved: C
        }, null, 8, ["visible", "member"])
      ]);
    };
  }
}), F = /* @__PURE__ */ P(ue, [["__scopeId", "data-v-bd63d5fb"]]);
function ce(p) {
  var l;
  p.slot("shell.header.right", Z, { order: 10 }), (l = p.settings) != null && l.section ? p.settings.section({
    id: "members",
    title: "Members",
    order: 10,
    component: F
  }) : p.slot("settings.content", F, { order: 10 });
}
export {
  ce as default
};
