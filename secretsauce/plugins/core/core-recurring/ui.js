import { ref as m, defineComponent as X, computed as J, watch as re, resolveComponent as C, openBlock as f, createBlock as q, withCtx as L, createElementVNode as k, withModifiers as ve, createTextVNode as I, toDisplayString as M, createCommentVNode as U, createVNode as v, unref as pe, createElementBlock as x, Fragment as Q, renderList as Z, onMounted as fe, onBeforeUnmount as ie } from "vue";
import { useSecretSauce as Y } from "@secretsauce/ui";
const ne = /* @__PURE__ */ new WeakMap();
function K(c, p) {
  const g = /* @__PURE__ */ new Date(`${c}T12:00:00Z`);
  return g.setUTCDate(g.getUTCDate() + p), g.toISOString().slice(0, 10);
}
function ee(c) {
  const p = c.api || c, g = ne.get(p);
  if (g) return g;
  const l = m([]), s = /* @__PURE__ */ new Map();
  let n = !1, _ = 0;
  async function S() {
    n = !1;
    const o = Array.from(s.keys()).sort();
    if (!o.length) {
      l.value = [];
      return;
    }
    const d = o[0], t = o[o.length - 1], h = ++_;
    try {
      const R = [];
      for (let i = d; i <= t; ) {
        const w = K(i, 90) < t ? K(i, 90) : t, V = await c.api.get("/api/x/core-recurring/suggestions", {
          from: i,
          to: w
        });
        if (h !== _) return;
        Array.isArray(V) && R.push(...V), i = K(w, 1);
      }
      h === _ && (l.value = R);
    } catch {
    }
  }
  function b() {
    n || (n = !0, queueMicrotask(S));
  }
  function $(o) {
    return /^\d{4}-\d{2}-\d{2}$/.test(o) ? (s.set(o, (s.get(o) || 0) + 1), b(), () => {
      const d = (s.get(o) || 1) - 1;
      d <= 0 ? s.delete(o) : s.set(o, d);
    }) : () => {
    };
  }
  function a(o, d) {
    l.value = l.value.filter(
      (t) => !(t.rule_id === o && t.date === d)
    );
  }
  c.on("core-recurring:changed", () => b()), c.on("core-timeline:slots-changed", () => b());
  const u = {
    suggestions: l,
    registerDate: $,
    refreshSuggestions: S,
    removeSuggestion: a
  };
  return ne.set(p, u), u;
}
function ae(c) {
  var l;
  const p = ((l = c.store.members) == null ? void 0 : l.value) || [];
  if (!p.length) return 2;
  const g = p.reduce((s, n) => s + (Number(n == null ? void 0 : n.serving_ratio) || 1), 0);
  return g > 0 ? Math.round(g * 100) / 100 : 2;
}
const ge = {
  key: 0,
  class: "selected-recipe"
}, ye = { key: 0 }, me = { class: "quick-notes" }, _e = /* @__PURE__ */ X({
  __name: "RecurringRuleDialog",
  props: {
    visible: { type: Boolean },
    rule: {}
  },
  emits: ["update:visible", "saved"],
  setup(c, { emit: p }) {
    const g = ["Dining out", "Leftovers", "Takeout", "Quick meal"], l = c, s = p, n = Y(), _ = ee(n), S = m(0), b = m(""), $ = m(2), a = m("recipes"), u = m(""), o = m([]), d = m([]), t = m(null), h = m(""), R = m(!1), i = m(""), w = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
      (y, e) => ({ label: y, value: e })
    ), V = J(() => {
      var y;
      return ((y = n.store.household.value) == null ? void 0 : y.meal_types) || [];
    }), E = J(() => {
      var N, W;
      const e = (((N = n.store.household.value) == null ? void 0 : N.meal_types) || []).find(
        (A) => {
          var G, O, B, F;
          return A.id === b.value || ((G = A.id) == null ? void 0 : G.toLowerCase()) === ((O = b.value) == null ? void 0 : O.toLowerCase()) || ((B = A.label) == null ? void 0 : B.toLowerCase()) === ((F = b.value) == null ? void 0 : F.toLowerCase());
        }
      );
      if (e && Array.isArray(e.predefined_notes))
        return e.predefined_notes;
      const D = (W = n.store.household.value) == null ? void 0 : W.predefined_notes;
      return Array.isArray(D) ? D : g;
    }), z = J(() => {
      var y;
      return R.value || !b.value || !$.value || $.value <= 0 ? !1 : a.value === "note" ? !!h.value.trim() : !!((y = t.value) != null && y.id);
    });
    let T = 0;
    async function j() {
      const y = ++T;
      try {
        const e = await n.api.get("/api/recipes", { q: u.value });
        y === T && l.visible && (o.value = (e == null ? void 0 : e.items) || []);
      } catch (e) {
        y === T && l.visible && (i.value = (e == null ? void 0 : e.message) || "Could not search recipes");
      }
    }
    re(
      () => l.visible,
      async (y) => {
        var D, N;
        if (++T, !y) return;
        i.value = "", u.value = "", o.value = [];
        const e = ((D = V.value.find((W) => W.id === "dinner")) == null ? void 0 : D.id) || ((N = V.value[0]) == null ? void 0 : N.id) || "";
        l.rule ? (S.value = l.rule.weekday, b.value = l.rule.meal_type || e, $.value = l.rule.servings || ae(n), l.rule.entry_type === "note" ? (a.value = "note", h.value = l.rule.title || "", t.value = null) : (a.value = "recipes", h.value = "", t.value = l.rule.recipe_id ? { id: l.rule.recipe_id, title: l.rule.recipe_title || l.rule.title || "" } : null)) : (S.value = 0, b.value = e, $.value = ae(n), a.value = "recipes", t.value = null, h.value = ""), await j();
        try {
          d.value = await n.api.get("/api/x/core-shortlist");
        } catch {
          d.value = [];
        }
      }
    );
    function le(y) {
      t.value = { id: y.id, title: y.title };
    }
    async function se() {
      if (!z.value) return;
      R.value = !0, i.value = "";
      const y = a.value === "note", e = {
        weekday: S.value,
        meal_type: b.value,
        entry_type: y ? "note" : "recipe",
        ...y ? { title: h.value.trim() } : { recipe_id: t.value.id },
        servings: $.value
      };
      try {
        const D = l.rule ? await n.api.put(`/api/x/core-recurring/rules/${l.rule.id}`, e) : await n.api.post("/api/x/core-recurring/rules", e);
        await _.refreshSuggestions(), s("saved", D), s("update:visible", !1);
      } catch (D) {
        i.value = (D == null ? void 0 : D.message) || "Could not save recurring meal";
      } finally {
        R.value = !1;
      }
    }
    return (y, e) => {
      const D = C("Message"), N = C("Select"), W = C("InputNumber"), A = C("Tab"), G = C("TabList"), O = C("InputText"), B = C("Button"), F = C("TabPanel"), oe = C("TabPanels"), ue = C("Tabs"), ce = C("Dialog");
      return f(), q(ce, {
        visible: c.visible,
        "onUpdate:visible": e[6] || (e[6] = (r) => s("update:visible", r)),
        header: c.rule ? "Edit recurring meal" : "Add recurring meal",
        modal: "",
        style: { width: "34rem", maxWidth: "95vw" }
      }, {
        default: L(() => [
          k(
            "form",
            {
              class: "recurring-rule-form",
              onSubmit: ve(se, ["prevent"])
            },
            [
              i.value ? (f(), q(D, {
                key: 0,
                severity: "error"
              }, {
                default: L(() => [
                  I(
                    M(i.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : U("v-if", !0),
              e[13] || (e[13] = k(
                "label",
                { for: "recurring-weekday" },
                "Weekday",
                -1
                /* CACHED */
              )),
              v(N, {
                inputId: "recurring-weekday",
                "aria-label": "Weekday",
                modelValue: S.value,
                "onUpdate:modelValue": e[0] || (e[0] = (r) => S.value = r),
                options: pe(w),
                optionLabel: "label",
                optionValue: "value",
                fluid: ""
              }, null, 8, ["modelValue", "options"]),
              e[14] || (e[14] = k(
                "label",
                { for: "recurring-slot" },
                "Meal slot",
                -1
                /* CACHED */
              )),
              v(N, {
                inputId: "recurring-slot",
                "aria-label": "Meal slot",
                modelValue: b.value,
                "onUpdate:modelValue": e[1] || (e[1] = (r) => b.value = r),
                options: V.value,
                optionLabel: "label",
                optionValue: "id",
                fluid: ""
              }, null, 8, ["modelValue", "options"]),
              e[15] || (e[15] = k(
                "label",
                { for: "recurring-servings" },
                "Servings",
                -1
                /* CACHED */
              )),
              v(W, {
                inputId: "recurring-servings",
                "aria-label": "Servings",
                modelValue: $.value,
                "onUpdate:modelValue": e[2] || (e[2] = (r) => $.value = r),
                min: 0.25,
                maxFractionDigits: 2,
                fluid: ""
              }, null, 8, ["modelValue"]),
              v(ue, {
                value: a.value,
                "onUpdate:value": e[5] || (e[5] = (r) => a.value = r)
              }, {
                default: L(() => [
                  v(G, null, {
                    default: L(() => [
                      v(A, { value: "recipes" }, {
                        default: L(() => [...e[7] || (e[7] = [
                          I(
                            "Recipes",
                            -1
                            /* CACHED */
                          )
                        ])]),
                        _: 1
                        /* STABLE */
                      }),
                      v(A, { value: "shortlist" }, {
                        default: L(() => [...e[8] || (e[8] = [
                          I(
                            "Shortlist",
                            -1
                            /* CACHED */
                          )
                        ])]),
                        _: 1
                        /* STABLE */
                      }),
                      v(A, { value: "note" }, {
                        default: L(() => [...e[9] || (e[9] = [
                          I(
                            "Note",
                            -1
                            /* CACHED */
                          )
                        ])]),
                        _: 1
                        /* STABLE */
                      })
                    ]),
                    _: 1
                    /* STABLE */
                  }),
                  v(oe, null, {
                    default: L(() => [
                      v(F, { value: "recipes" }, {
                        default: L(() => [
                          e[11] || (e[11] = k(
                            "label",
                            { for: "recurring-recipe" },
                            "Search recipes",
                            -1
                            /* CACHED */
                          )),
                          v(O, {
                            id: "recurring-recipe",
                            modelValue: u.value,
                            "onUpdate:modelValue": e[3] || (e[3] = (r) => u.value = r),
                            onInput: j,
                            fluid: ""
                          }, null, 8, ["modelValue"]),
                          t.value ? (f(), x("div", ge, [
                            k("span", null, [
                              e[10] || (e[10] = I(
                                "Selected: ",
                                -1
                                /* CACHED */
                              )),
                              k(
                                "strong",
                                null,
                                M(t.value.title),
                                1
                                /* TEXT */
                              )
                            ])
                          ])) : U("v-if", !0),
                          (f(!0), x(
                            Q,
                            null,
                            Z(o.value, (r) => {
                              var P, H;
                              return f(), x("div", {
                                key: r.id,
                                class: "recipe-result"
                              }, [
                                k(
                                  "span",
                                  null,
                                  M(r.title),
                                  1
                                  /* TEXT */
                                ),
                                v(B, {
                                  label: ((P = t.value) == null ? void 0 : P.id) === r.id ? "Selected" : "Select",
                                  severity: ((H = t.value) == null ? void 0 : H.id) === r.id ? "success" : "secondary",
                                  size: "small",
                                  type: "button",
                                  onClick: (de) => le({ id: r.id, title: r.title })
                                }, null, 8, ["label", "severity", "onClick"])
                              ]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      v(F, { value: "shortlist" }, {
                        default: L(() => [
                          d.value.length ? U("v-if", !0) : (f(), x("p", ye, "No recipes in shortlist")),
                          (f(!0), x(
                            Q,
                            null,
                            Z(d.value, (r) => {
                              var P, H;
                              return f(), x("div", {
                                key: r.recipe_id,
                                class: "recipe-result"
                              }, [
                                k(
                                  "span",
                                  null,
                                  M(r.recipe_title),
                                  1
                                  /* TEXT */
                                ),
                                v(B, {
                                  label: ((P = t.value) == null ? void 0 : P.id) === r.recipe_id ? "Selected" : "Select",
                                  severity: ((H = t.value) == null ? void 0 : H.id) === r.recipe_id ? "success" : "secondary",
                                  size: "small",
                                  type: "button",
                                  onClick: (de) => le({ id: r.recipe_id, title: r.recipe_title })
                                }, null, 8, ["label", "severity", "onClick"])
                              ]);
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        _: 1
                        /* STABLE */
                      }),
                      v(F, { value: "note" }, {
                        default: L(() => [
                          e[12] || (e[12] = k(
                            "label",
                            { for: "recurring-note" },
                            "Note title",
                            -1
                            /* CACHED */
                          )),
                          v(O, {
                            id: "recurring-note",
                            modelValue: h.value,
                            "onUpdate:modelValue": e[4] || (e[4] = (r) => h.value = r),
                            fluid: ""
                          }, null, 8, ["modelValue"]),
                          k("div", me, [
                            (f(!0), x(
                              Q,
                              null,
                              Z(E.value, (r) => (f(), q(B, {
                                key: r,
                                label: r,
                                outlined: "",
                                size: "small",
                                type: "button",
                                onClick: (P) => h.value = r
                              }, null, 8, ["label", "onClick"]))),
                              128
                              /* KEYED_FRAGMENT */
                            ))
                          ])
                        ]),
                        _: 1
                        /* STABLE */
                      })
                    ]),
                    _: 1
                    /* STABLE */
                  })
                ]),
                _: 1
                /* STABLE */
              }, 8, ["value"]),
              v(B, {
                label: c.rule ? "Save recurring meal" : "Add recurring meal",
                type: "submit",
                loading: R.value,
                disabled: !z.value
              }, null, 8, ["label", "loading", "disabled"])
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
}), te = (c, p) => {
  const g = c.__vccOpts || c;
  for (const [l, s] of p)
    g[l] = s;
  return g;
}, be = /* @__PURE__ */ te(_e, [["__scopeId", "data-v-96027c37"]]), ke = { class: "recurring-meals-widget" }, he = { key: 2 }, Se = {
  key: 3,
  class: "recurring-rule-list"
}, we = { class: "rule-summary" }, Ce = { class: "rule-actions" }, xe = /* @__PURE__ */ X({
  __name: "RecurringMealsWidget",
  setup(c) {
    const p = Y(), g = ee(p), l = m([]), s = m(!0), n = m(!1), _ = m(""), S = m(!1), b = m(null), $ = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    function a(i) {
      var w, V, E;
      return ((E = (V = (w = p.store.household.value) == null ? void 0 : w.meal_types) == null ? void 0 : V.find((z) => z.id === i)) == null ? void 0 : E.label) || i;
    }
    function u(i) {
      return i.title || i.recipe_title || "Recurring meal";
    }
    async function o() {
      s.value = !0;
      try {
        l.value = await p.api.get("/api/x/core-recurring/rules");
      } catch (i) {
        _.value = (i == null ? void 0 : i.message) || "Could not load recurring rules";
      } finally {
        s.value = !1;
      }
    }
    function d() {
      b.value = null, S.value = !0;
    }
    function t(i) {
      b.value = i, S.value = !0;
    }
    async function h(i) {
      if (!n.value) {
        n.value = !0, _.value = "";
        try {
          await p.api.delete(`/api/x/core-recurring/rules/${i}`), await o(), await g.refreshSuggestions();
        } catch (w) {
          _.value = (w == null ? void 0 : w.message) || "Could not delete rule";
        } finally {
          n.value = !1;
        }
      }
    }
    const R = p.on("core-recurring:changed", () => {
      o();
    });
    return fe(o), ie(() => {
      typeof R == "function" && R();
    }), (i, w) => {
      const V = C("Button"), E = C("Message"), z = C("ProgressSpinner");
      return f(), x("section", ke, [
        w[1] || (w[1] = k(
          "h3",
          null,
          [
            k("i", {
              class: "pi pi-replay",
              "aria-hidden": "true"
            }),
            I(" Recurring meals")
          ],
          -1
          /* CACHED */
        )),
        v(V, {
          label: "Add recurring meal",
          icon: "pi pi-plus",
          size: "small",
          disabled: n.value,
          onClick: d
        }, null, 8, ["disabled"]),
        _.value ? (f(), q(E, {
          key: 0,
          severity: "error"
        }, {
          default: L(() => [
            I(
              M(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        s.value ? (f(), q(z, {
          key: 1,
          "aria-label": "Loading recurring rules"
        })) : l.value.length ? (f(), x("ul", Se, [
          (f(!0), x(
            Q,
            null,
            Z(l.value, (T) => (f(), x("li", {
              key: T.id,
              class: "recurring-rule-item"
            }, [
              k(
                "span",
                we,
                " Every " + M($[T.weekday] || `Day ${T.weekday}`) + " · " + M(a(T.meal_type)) + " · " + M(u(T)) + " (" + M(T.servings) + " servings) ",
                1
                /* TEXT */
              ),
              k("div", Ce, [
                v(V, {
                  label: "Edit",
                  icon: "pi pi-pencil",
                  text: "",
                  size: "small",
                  disabled: n.value,
                  onClick: (j) => t(T)
                }, null, 8, ["disabled", "onClick"]),
                v(V, {
                  label: "Delete",
                  icon: "pi pi-trash",
                  text: "",
                  severity: "danger",
                  size: "small",
                  disabled: n.value,
                  onClick: (j) => h(T.id)
                }, null, 8, ["disabled", "onClick"])
              ])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : (f(), x("p", he, "No recurring rules configured.")),
        v(be, {
          visible: S.value,
          "onUpdate:visible": w[0] || (w[0] = (T) => S.value = T),
          rule: b.value,
          onSaved: o
        }, null, 8, ["visible", "rule"])
      ]);
    };
  }
}), Te = /* @__PURE__ */ te(xe, [["__scopeId", "data-v-6007a6a7"]]), $e = {
  key: 0,
  class: "recurring-slot-suggestions"
}, Re = ["data-rule-id"], Ve = { class: "ghost-info" }, De = { class: "ghost-title" }, Le = {
  key: 0,
  class: "ghost-servings"
}, Me = { class: "ghost-actions" }, Ne = /* @__PURE__ */ X({
  __name: "RecurringSlotSuggestions",
  props: {
    context: {}
  },
  setup(c) {
    const p = c, g = Y(), l = ee(g), s = m(null), n = m("");
    let _ = null;
    re(
      () => {
        var a;
        return (a = p.context) == null ? void 0 : a.date;
      },
      (a) => {
        _ && (_(), _ = null), a && (_ = l.registerDate(a));
      },
      { immediate: !0 }
    ), ie(() => {
      _ && (_(), _ = null);
    });
    const S = J(() => {
      var t, h;
      const a = (t = p.context) == null ? void 0 : t.date, u = (h = p.context) == null ? void 0 : h.slot;
      if (!a || !u || u.skipped) return [];
      const o = (u.id || "").toLowerCase(), d = (u.label || "").toLowerCase();
      return l.suggestions.value.filter((R) => {
        if (R.date !== a) return !1;
        const i = (R.meal_type || "").toLowerCase();
        return i === o || d && i === d;
      });
    });
    async function b(a) {
      var u, o;
      if (!s.value) {
        s.value = a.rule_id, n.value = "";
        try {
          await g.api.post(`/api/x/core-recurring/rules/${a.rule_id}/approve`, {
            date: a.date
          }), l.removeSuggestion(a.rule_id, a.date), (o = (u = p.context) == null ? void 0 : u.onChanged) == null || o.call(u);
        } catch (d) {
          n.value = (d == null ? void 0 : d.message) || "Could not approve recurring meal";
        } finally {
          s.value = null;
        }
      }
    }
    async function $(a) {
      if (!s.value) {
        s.value = a.rule_id, n.value = "";
        try {
          await g.api.post(`/api/x/core-recurring/rules/${a.rule_id}/dismiss`, {
            date: a.date
          }), l.removeSuggestion(a.rule_id, a.date);
        } catch (u) {
          n.value = (u == null ? void 0 : u.message) || "Could not dismiss recurring meal";
        } finally {
          s.value = null;
        }
      }
    }
    return (a, u) => {
      const o = C("Message"), d = C("Button");
      return S.value.length || n.value ? (f(), x("div", $e, [
        n.value ? (f(), q(o, {
          key: 0,
          severity: "error"
        }, {
          default: L(() => [
            I(
              M(n.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : U("v-if", !0),
        (f(!0), x(
          Q,
          null,
          Z(S.value, (t) => (f(), x("div", {
            key: `${t.rule_id}-${t.date}`,
            class: "recurring-ghost-card",
            "data-rule-id": t.rule_id
          }, [
            k("div", Ve, [
              u[0] || (u[0] = k(
                "i",
                {
                  class: "pi pi-replay",
                  "aria-hidden": "true"
                },
                null,
                -1
                /* CACHED */
              )),
              k(
                "span",
                De,
                M(t.title || t.recipe_title || "Recurring meal"),
                1
                /* TEXT */
              ),
              t.servings ? (f(), x(
                "span",
                Le,
                M(t.servings) + " servings",
                1
                /* TEXT */
              )) : U("v-if", !0)
            ]),
            k("div", Me, [
              v(d, {
                label: "Approve",
                icon: "pi pi-check",
                size: "small",
                text: "",
                severity: "success",
                loading: s.value === t.rule_id,
                disabled: !!s.value,
                onClick: (h) => b(t)
              }, null, 8, ["loading", "disabled", "onClick"]),
              v(d, {
                label: "Dismiss",
                icon: "pi pi-times",
                size: "small",
                text: "",
                severity: "secondary",
                loading: s.value === t.rule_id,
                disabled: !!s.value,
                onClick: (h) => $(t)
              }, null, 8, ["loading", "disabled", "onClick"])
            ])
          ], 8, Re))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : U("v-if", !0);
    };
  }
}), Ie = /* @__PURE__ */ te(Ne, [["__scopeId", "data-v-2eb8b51a"]]);
function Ue(c) {
  c.slot("timeline.sidebar", Te, { order: 20 }), c.slot("timeline.slot.suggestions", Ie, { order: 10 });
}
export {
  Te as RecurringMealsWidget,
  Ie as RecurringSlotSuggestions,
  Ue as default
};
