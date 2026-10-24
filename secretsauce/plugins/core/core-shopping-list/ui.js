import { defineComponent as ie, ref as u, computed as se, watch as de, onMounted as pe, resolveComponent as s, openBlock as i, createElementBlock as v, createElementVNode as t, createBlock as T, withCtx as m, createTextVNode as C, toDisplayString as f, createCommentVNode as S, createVNode as n, withModifiers as W, Fragment as O, renderList as Q, normalizeClass as re, nextTick as ve, unref as X } from "vue";
import { useSecretSauce as me } from "@secretsauce/ui";
const fe = { class: "shopping-list-page" }, ye = { class: "date-controls" }, ge = ["for"], ce = { key: 0 }, be = { key: 0 }, ke = { class: "checkbox-label" }, Ve = { class: "staple-list" }, we = /* @__PURE__ */ ie({
  __name: "ShoppingListPage",
  setup(x) {
    const r = me(), c = u("list"), b = u(!1), d = u(!1), y = u("");
    function R(a) {
      return `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, "0")}-${String(a.getDate()).padStart(2, "0")}`;
    }
    const P = /* @__PURE__ */ new Date();
    P.setDate(P.getDate() + 7);
    const M = u(R(/* @__PURE__ */ new Date())), N = u(R(P)), L = u([]), j = u([]), k = u(""), U = u(null), I = u(""), V = u(""), q = u(1), $ = u(""), A = u(!0), Z = se(() => {
      var e;
      const a = {};
      for (const p of L.value) (a[e = p.category || "Other"] || (a[e] = [])).push(p);
      return a;
    });
    let D = 0;
    async function g() {
      const a = ++D;
      b.value = !0, y.value = "";
      try {
        const e = await r.api.get("/api/x/core-shopping-list", { from_date: M.value, to_date: N.value });
        a === D && (L.value = e.items);
      } catch (e) {
        a === D && (y.value = (e == null ? void 0 : e.message) || "Failed to load shopping list");
      } finally {
        a === D && (b.value = !1);
      }
    }
    async function B() {
      try {
        j.value = await r.api.get("/api/x/core-shopping-list/staples");
      } catch (a) {
        y.value = (a == null ? void 0 : a.message) || "Failed to load staples";
      }
    }
    de(c, (a) => {
      a === "staples" && B();
    });
    async function _(a, e) {
      if (d.value) return !1;
      d.value = !0, y.value = "";
      try {
        return await a(), await e(), !0;
      } catch (p) {
        return y.value = (p == null ? void 0 : p.message) || "Could not update shopping list", !1;
      } finally {
        d.value = !1;
      }
    }
    async function ee(a) {
      if (d.value) return;
      const e = a.checked;
      a.checked = !e, await ve(), await _(() => r.api.post("/api/x/core-shopping-list/toggle", { key: a.key, checked: !e }), g) || (a.checked = e);
    }
    async function le() {
      k.value.trim() && await _(async () => {
        await r.api.post("/api/x/core-shopping-list/items", { name: k.value.trim(), quantity: U.value, unit: I.value.trim() || void 0, category: "Other" }), k.value = "", U.value = null, I.value = "";
      }, g);
    }
    async function te() {
      V.value.trim() && await _(async () => {
        await r.api.post("/api/x/core-shopping-list/staples", { name: V.value.trim(), default_quantity: q.value ?? 1, unit: $.value.trim() || void 0, always_include: A.value }), V.value = "", q.value = 1, $.value = "";
      }, B);
    }
    return pe(g), (a, e) => {
      const p = s("Message"), z = s("Tab"), ae = s("TabList"), w = s("InputText"), h = s("Button"), Y = s("InputNumber"), ne = s("ProgressSpinner"), G = s("Tag"), H = s("Checkbox"), J = s("TabPanel"), oe = s("TabPanels"), ue = s("Tabs");
      return i(), v("div", fe, [
        e[23] || (e[23] = t(
          "h1",
          null,
          "Shopping list",
          -1
          /* CACHED */
        )),
        y.value ? (i(), T(p, {
          key: 0,
          severity: "error"
        }, {
          default: m(() => [
            C(
              f(y.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : S("v-if", !0),
        n(ue, {
          value: c.value,
          "onUpdate:value": e[9] || (e[9] = (l) => c.value = l)
        }, {
          default: m(() => [
            n(ae, null, {
              default: m(() => [
                n(z, { value: "list" }, {
                  default: m(() => [...e[10] || (e[10] = [
                    C(
                      "Shopping list",
                      -1
                      /* CACHED */
                    )
                  ])]),
                  _: 1
                  /* STABLE */
                }),
                n(z, { value: "staples" }, {
                  default: m(() => [...e[11] || (e[11] = [
                    C(
                      "Pantry staples",
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
            n(oe, null, {
              default: m(() => [
                n(J, { value: "list" }, {
                  default: m(() => [
                    t("div", ye, [
                      e[12] || (e[12] = t(
                        "label",
                        { for: "shopping-from" },
                        "Meals from",
                        -1
                        /* CACHED */
                      )),
                      n(w, {
                        id: "shopping-from",
                        modelValue: M.value,
                        "onUpdate:modelValue": e[0] || (e[0] = (l) => M.value = l),
                        type: "date",
                        onChange: g
                      }, null, 8, ["modelValue"]),
                      e[13] || (e[13] = t(
                        "label",
                        { for: "shopping-to" },
                        "To",
                        -1
                        /* CACHED */
                      )),
                      n(w, {
                        id: "shopping-to",
                        modelValue: N.value,
                        "onUpdate:modelValue": e[1] || (e[1] = (l) => N.value = l),
                        type: "date",
                        onChange: g
                      }, null, 8, ["modelValue"]),
                      n(h, {
                        label: "Refresh",
                        icon: "pi pi-refresh",
                        outlined: "",
                        loading: b.value,
                        onClick: g
                      }, null, 8, ["loading"])
                    ]),
                    t(
                      "form",
                      {
                        class: "add-form",
                        onSubmit: W(le, ["prevent"])
                      },
                      [
                        t("div", null, [
                          e[14] || (e[14] = t(
                            "label",
                            { for: "extra-name" },
                            "Extra item name",
                            -1
                            /* CACHED */
                          )),
                          n(w, {
                            id: "extra-name",
                            modelValue: k.value,
                            "onUpdate:modelValue": e[2] || (e[2] = (l) => k.value = l),
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        t("div", null, [
                          e[15] || (e[15] = t(
                            "label",
                            { for: "extra-quantity" },
                            "Quantity",
                            -1
                            /* CACHED */
                          )),
                          n(Y, {
                            inputId: "extra-quantity",
                            modelValue: U.value,
                            "onUpdate:modelValue": e[3] || (e[3] = (l) => U.value = l),
                            min: 0,
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        t("div", null, [
                          e[16] || (e[16] = t(
                            "label",
                            { for: "extra-unit" },
                            "Unit",
                            -1
                            /* CACHED */
                          )),
                          n(w, {
                            id: "extra-unit",
                            modelValue: I.value,
                            "onUpdate:modelValue": e[4] || (e[4] = (l) => I.value = l),
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        n(h, {
                          type: "submit",
                          label: "Add item",
                          icon: "pi pi-plus",
                          disabled: !k.value.trim(),
                          loading: d.value
                        }, null, 8, ["disabled", "loading"])
                      ],
                      32
                      /* NEED_HYDRATION */
                    ),
                    b.value ? (i(), T(ne, {
                      key: 0,
                      "aria-label": "Loading shopping list"
                    })) : L.value.length ? S("v-if", !0) : (i(), T(p, {
                      key: 1,
                      severity: "secondary"
                    }, {
                      default: m(() => [...e[17] || (e[17] = [
                        C(
                          "Shopping list is empty. Schedule meals or add pantry staples to generate your list.",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    })),
                    (i(!0), v(
                      O,
                      null,
                      Q(Z.value, (l, F) => (i(), v("section", {
                        key: F,
                        class: "category-card"
                      }, [
                        t("h3", null, [
                          C(
                            f(F) + " ",
                            1
                            /* TEXT */
                          ),
                          n(G, {
                            value: `${l.filter((o) => o.checked).length}/${l.length}`,
                            severity: "secondary"
                          }, null, 8, ["value"])
                        ]),
                        t("ul", null, [
                          (i(!0), v(
                            O,
                            null,
                            Q(l, (o) => {
                              var K;
                              return i(), v(
                                "li",
                                {
                                  key: o.key,
                                  class: re(["shopping-item", { checked: o.checked }])
                                },
                                [
                                  n(H, {
                                    inputId: `item-${o.key}`,
                                    modelValue: o.checked,
                                    binary: "",
                                    disabled: d.value,
                                    "onUpdate:modelValue": (E) => ee(o)
                                  }, null, 8, ["inputId", "modelValue", "disabled", "onUpdate:modelValue"]),
                                  t("label", {
                                    for: `item-${o.key}`
                                  }, [
                                    t(
                                      "span",
                                      null,
                                      f(o.name),
                                      1
                                      /* TEXT */
                                    ),
                                    (K = o.sources) != null && K.length ? (i(), v(
                                      "small",
                                      ce,
                                      f(o.sources.map((E) => E.recipe_title || "Meal").join(", ")),
                                      1
                                      /* TEXT */
                                    )) : S("v-if", !0)
                                  ], 8, ge),
                                  o.quantity != null ? (i(), v(
                                    "span",
                                    be,
                                    f(o.quantity) + " " + f(o.unit || ""),
                                    1
                                    /* TEXT */
                                  )) : S("v-if", !0),
                                  o.source_type === "manual" ? (i(), T(h, {
                                    key: 1,
                                    icon: "pi pi-times",
                                    "aria-label": "Remove manual item",
                                    text: "",
                                    severity: "danger",
                                    disabled: d.value,
                                    onClick: (E) => _(() => X(r).api.delete(`/api/x/core-shopping-list/items/${o.id}`), g)
                                  }, null, 8, ["disabled", "onClick"])) : S("v-if", !0)
                                ],
                                2
                                /* CLASS */
                              );
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])
                      ]))),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]),
                  _: 1
                  /* STABLE */
                }),
                n(J, { value: "staples" }, {
                  default: m(() => [
                    e[22] || (e[22] = t(
                      "h3",
                      null,
                      "Add pantry staple",
                      -1
                      /* CACHED */
                    )),
                    t(
                      "form",
                      {
                        class: "add-form",
                        onSubmit: W(te, ["prevent"])
                      },
                      [
                        t("div", null, [
                          e[18] || (e[18] = t(
                            "label",
                            { for: "staple-name" },
                            "Staple name",
                            -1
                            /* CACHED */
                          )),
                          n(w, {
                            id: "staple-name",
                            modelValue: V.value,
                            "onUpdate:modelValue": e[5] || (e[5] = (l) => V.value = l),
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        t("div", null, [
                          e[19] || (e[19] = t(
                            "label",
                            { for: "staple-quantity" },
                            "Default quantity",
                            -1
                            /* CACHED */
                          )),
                          n(Y, {
                            inputId: "staple-quantity",
                            modelValue: q.value,
                            "onUpdate:modelValue": e[6] || (e[6] = (l) => q.value = l),
                            min: 0,
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        t("div", null, [
                          e[20] || (e[20] = t(
                            "label",
                            { for: "staple-unit" },
                            "Staple unit",
                            -1
                            /* CACHED */
                          )),
                          n(w, {
                            id: "staple-unit",
                            modelValue: $.value,
                            "onUpdate:modelValue": e[7] || (e[7] = (l) => $.value = l),
                            fluid: ""
                          }, null, 8, ["modelValue"])
                        ]),
                        t("div", ke, [
                          n(H, {
                            inputId: "staple-always",
                            modelValue: A.value,
                            "onUpdate:modelValue": e[8] || (e[8] = (l) => A.value = l),
                            binary: ""
                          }, null, 8, ["modelValue"]),
                          e[21] || (e[21] = t(
                            "label",
                            { for: "staple-always" },
                            "Always include in every shopping list",
                            -1
                            /* CACHED */
                          ))
                        ]),
                        n(h, {
                          type: "submit",
                          label: "Save staple",
                          disabled: !V.value.trim(),
                          loading: d.value
                        }, null, 8, ["disabled", "loading"])
                      ],
                      32
                      /* NEED_HYDRATION */
                    ),
                    t("ul", Ve, [
                      (i(!0), v(
                        O,
                        null,
                        Q(j.value, (l) => (i(), v("li", {
                          key: l.id,
                          class: "staple-row"
                        }, [
                          t(
                            "span",
                            null,
                            f(l.name) + " · " + f(l.default_quantity) + " " + f(l.unit),
                            1
                            /* TEXT */
                          ),
                          l.always_include ? (i(), T(G, {
                            key: 0,
                            value: "Always included",
                            severity: "info"
                          })) : S("v-if", !0),
                          n(h, {
                            label: "Delete",
                            text: "",
                            severity: "danger",
                            disabled: d.value,
                            onClick: (F) => _(() => X(r).api.delete(`/api/x/core-shopping-list/staples/${l.id}`), B)
                          }, null, 8, ["disabled", "onClick"])
                        ]))),
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
        }, 8, ["value"])
      ]);
    };
  }
}), Se = (x, r) => {
  const c = x.__vccOpts || x;
  for (const [b, d] of r)
    c[b] = d;
  return c;
}, xe = /* @__PURE__ */ Se(we, [["__scopeId", "data-v-0d18343a"]]);
function Te(x) {
  x.route({
    path: "/shopping-list",
    component: xe,
    nav: { label: "Shopping list", icon: "shopping-cart", order: 30 }
  });
}
export {
  xe as ShoppingListPage,
  Te as default
};
