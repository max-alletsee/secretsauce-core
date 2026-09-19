import { defineComponent as K, inject as Q, ref as d, computed as X, onMounted as Z, openBlock as l, createElementBlock as a, createCommentVNode as r, createElementVNode as e, normalizeClass as S, withDirectives as c, vModelText as x, withModifiers as E, Fragment as C, renderList as j, toDisplayString as u, vModelCheckbox as ee } from "vue";
const te = { class: "shopping-list-page p-4 max-w-3xl mx-auto space-y-4" }, se = { class: "flex items-center justify-between border-b pb-3" }, oe = { class: "flex gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium" }, ne = {
  key: 0,
  class: "space-y-4"
}, le = { class: "flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs" }, ae = { class: "flex items-center gap-2" }, ie = ["disabled"], re = {
  key: 0,
  class: "py-8 text-center text-xs text-stone-500"
}, de = {
  key: 1,
  class: "empty-state py-8 text-center space-y-1 bg-stone-50 rounded-lg border border-dashed border-stone-200"
}, pe = { class: "space-y-4" }, ue = { class: "bg-stone-50 px-3 py-2 border-b border-stone-200 flex items-center justify-between" }, ce = { class: "text-xs font-bold text-stone-800 uppercase tracking-wider" }, xe = { class: "text-[11px] text-stone-500" }, ve = { class: "divide-y divide-stone-100 text-xs" }, me = { class: "flex items-center gap-2.5 cursor-pointer flex-1 select-none" }, be = ["checked", "onChange"], fe = { class: "flex flex-col" }, ge = {
  key: 0,
  class: "text-[10px] text-stone-400"
}, he = { class: "flex items-center gap-2 text-stone-600" }, ye = {
  key: 0,
  class: "item-qty font-semibold"
}, we = ["onClick"], _e = {
  key: 1,
  class: "space-y-4"
}, ke = { class: "bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-3" }, Se = { class: "flex gap-1" }, Ce = { class: "col-span-2 flex items-center gap-2 cursor-pointer pt-1" }, Le = { class: "col-span-2 flex justify-end" }, Ae = ["disabled"], Ie = { class: "bg-white border border-stone-200 rounded-lg overflow-hidden" }, Ue = { class: "px-3 py-2 bg-stone-50 border-b font-bold text-xs text-stone-800" }, Ve = { class: "divide-y divide-stone-100 text-xs" }, De = { class: "font-medium text-stone-900" }, Te = {
  key: 0,
  class: "text-stone-500 ml-1"
}, Me = {
  key: 1,
  class: "ml-2 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded"
}, Pe = ["onClick"], je = /* @__PURE__ */ K({
  __name: "ShoppingListPage",
  props: {
    ss: {}
  },
  setup(v) {
    var O, $;
    const h = v, n = ((O = h.ss) == null ? void 0 : O.api) || Q("__SS_API__", null), p = (($ = h.ss) == null ? void 0 : $.notify) || Q("__SS_NOTIFY__", null), m = d("list"), L = d(!1);
    function q(o) {
      return o.toISOString().split("T")[0];
    }
    const F = /* @__PURE__ */ new Date(), N = /* @__PURE__ */ new Date();
    N.setDate(F.getDate() + 7);
    const A = d(q(F)), I = d(q(N)), U = d([]), V = d([]), b = d(""), y = d(null), w = d(""), f = d(""), _ = d(1), k = d(""), D = d(!0), R = X(() => {
      const o = {};
      for (const t of U.value) {
        const s = t.category || "Other";
        o[s] || (o[s] = []), o[s].push(t);
      }
      return o;
    });
    async function g() {
      if (n) {
        L.value = !0;
        try {
          const o = await n.get("/api/x/core-shopping-list", {
            params: { from_date: A.value, to_date: I.value }
          });
          U.value = (o == null ? void 0 : o.items) || [];
        } catch {
          p && p({ level: "error", message: "Failed to load shopping list" });
        } finally {
          L.value = !1;
        }
      }
    }
    async function z(o) {
      if (o.checked = !o.checked, !!n)
        try {
          await n.post("/api/x/core-shopping-list/toggle", {
            key: o.key,
            checked: o.checked
          });
        } catch {
          o.checked = !o.checked;
        }
    }
    async function H() {
      if (!(!n || !b.value.trim()))
        try {
          await n.post("/api/x/core-shopping-list/items", {
            name: b.value.trim(),
            quantity: y.value,
            unit: w.value.trim() || void 0,
            category: "Other"
          }), b.value = "", y.value = null, w.value = "", await g();
        } catch {
          p && p({ level: "error", message: "Failed to add manual item" });
        }
    }
    async function Y(o) {
      if (!(!n || !o))
        try {
          await n.delete(`/api/x/core-shopping-list/items/${o}`), await g();
        } catch {
          p && p({ level: "error", message: "Failed to delete item" });
        }
    }
    async function G() {
      m.value = "staples", await T();
    }
    async function T() {
      if (n)
        try {
          const o = await n.get("/api/x/core-shopping-list/staples");
          V.value = o || [];
        } catch {
          p && p({ level: "error", message: "Failed to load staples" });
        }
    }
    async function W() {
      if (!(!n || !f.value.trim()))
        try {
          await n.post("/api/x/core-shopping-list/staples", {
            name: f.value.trim(),
            default_quantity: _.value || 1,
            unit: k.value.trim() || void 0,
            always_include: D.value
          }), f.value = "", _.value = 1, k.value = "", await T();
        } catch {
          p && p({ level: "error", message: "Failed to save staple" });
        }
    }
    async function J(o) {
      if (!(!n || !o))
        try {
          await n.delete(`/api/x/core-shopping-list/staples/${o}`), await T();
        } catch {
          p && p({ level: "error", message: "Failed to delete staple" });
        }
    }
    return Z(() => {
      g();
    }), (o, t) => (l(), a("div", te, [
      r(" Header "),
      e("div", se, [
        t[10] || (t[10] = e(
          "div",
          { class: "flex items-center gap-2" },
          [
            e("span", { class: "text-2xl" }, "🛒"),
            e("h1", { class: "text-xl font-bold text-stone-900" }, "Shopping List")
          ],
          -1
          /* CACHED */
        )),
        r(" Tabs "),
        e("div", oe, [
          e(
            "button",
            {
              class: S(["px-3 py-1.5 rounded transition tab-list", m.value === "list" ? "bg-white shadow text-emerald-700" : "text-stone-600 hover:text-stone-900"]),
              onClick: t[0] || (t[0] = (s) => m.value = "list")
            },
            " Shopping List ",
            2
            /* CLASS */
          ),
          e(
            "button",
            {
              class: S(["px-3 py-1.5 rounded transition tab-staples", m.value === "staples" ? "bg-white shadow text-emerald-700" : "text-stone-600 hover:text-stone-900"]),
              onClick: G
            },
            " Pantry Staples ",
            2
            /* CLASS */
          )
        ])
      ]),
      r(" MAIN SHOPPING LIST TAB "),
      m.value === "list" ? (l(), a("div", ne, [
        r(" Date Range Controls "),
        e("div", le, [
          e("div", ae, [
            t[11] || (t[11] = e(
              "span",
              { class: "font-medium text-stone-700" },
              "Meals from:",
              -1
              /* CACHED */
            )),
            c(e(
              "input",
              {
                "onUpdate:modelValue": t[1] || (t[1] = (s) => A.value = s),
                type: "date",
                class: "input-from-date border border-stone-300 rounded px-2 py-1 bg-white focus:outline-none",
                onChange: g
              },
              null,
              544
              /* NEED_HYDRATION, NEED_PATCH */
            ), [
              [x, A.value]
            ]),
            t[12] || (t[12] = e(
              "span",
              { class: "text-stone-400" },
              "to",
              -1
              /* CACHED */
            )),
            c(e(
              "input",
              {
                "onUpdate:modelValue": t[2] || (t[2] = (s) => I.value = s),
                type: "date",
                class: "input-to-date border border-stone-300 rounded px-2 py-1 bg-white focus:outline-none",
                onChange: g
              },
              null,
              544
              /* NEED_HYDRATION, NEED_PATCH */
            ), [
              [x, I.value]
            ])
          ]),
          e("button", {
            class: "btn-refresh text-xs text-stone-600 hover:text-stone-900 border border-stone-300 px-2.5 py-1 rounded bg-white",
            onClick: g
          }, " 🔄 Refresh ")
        ]),
        r(" Quick Add Item Bar "),
        e(
          "form",
          {
            class: "flex items-center gap-2",
            onSubmit: E(H, ["prevent"])
          },
          [
            c(e(
              "input",
              {
                "onUpdate:modelValue": t[3] || (t[3] = (s) => b.value = s),
                type: "text",
                placeholder: "Add extra item (e.g. coffee beans)...",
                class: "input-new-item flex-1 border border-stone-300 rounded px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [x, b.value]
            ]),
            c(e(
              "input",
              {
                "onUpdate:modelValue": t[4] || (t[4] = (s) => y.value = s),
                type: "number",
                step: "any",
                placeholder: "Qty",
                class: "input-new-qty w-16 border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                x,
                y.value,
                void 0,
                { number: !0 }
              ]
            ]),
            c(e(
              "input",
              {
                "onUpdate:modelValue": t[5] || (t[5] = (s) => w.value = s),
                type: "text",
                placeholder: "Unit",
                class: "input-new-unit w-16 border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [x, w.value]
            ]),
            e("button", {
              type: "submit",
              class: "btn-add-item px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition",
              disabled: !b.value.trim()
            }, " + Add ", 8, ie)
          ],
          32
          /* NEED_HYDRATION */
        ),
        r(" Loading / Empty States "),
        L.value ? (l(), a("div", re, " Loading shopping list... ")) : U.value.length ? (l(), a(
          C,
          { key: 2 },
          [
            r(" Categorized Items "),
            e("div", pe, [
              (l(!0), a(
                C,
                null,
                j(R.value, (s, M) => (l(), a("div", {
                  key: M,
                  class: "category-card bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm"
                }, [
                  e("div", ue, [
                    e(
                      "h3",
                      ce,
                      u(M),
                      1
                      /* TEXT */
                    ),
                    e(
                      "span",
                      xe,
                      u(s.filter((i) => i.checked).length) + "/" + u(s.length),
                      1
                      /* TEXT */
                    )
                  ]),
                  e("ul", ve, [
                    (l(!0), a(
                      C,
                      null,
                      j(s, (i) => {
                        var B;
                        return l(), a(
                          "li",
                          {
                            key: i.key,
                            class: S(["shopping-item px-3 py-2 flex items-center justify-between hover:bg-stone-50/50 transition", { "bg-stone-50/30 opacity-50": i.checked }])
                          },
                          [
                            e("label", me, [
                              e("input", {
                                type: "checkbox",
                                checked: i.checked,
                                class: "item-checkbox rounded border-stone-300 text-emerald-600 focus:ring-0 cursor-pointer",
                                onChange: (P) => z(i)
                              }, null, 40, be),
                              e("div", fe, [
                                e(
                                  "span",
                                  {
                                    class: S(["item-name font-medium", { "line-through text-stone-400": i.checked, "text-stone-800": !i.checked }])
                                  },
                                  u(i.name),
                                  3
                                  /* TEXT, CLASS */
                                ),
                                (B = i.sources) != null && B.length ? (l(), a(
                                  "span",
                                  ge,
                                  u(i.sources.map((P) => P.recipe_title || "Meal").join(", ")),
                                  1
                                  /* TEXT */
                                )) : r("v-if", !0)
                              ])
                            ]),
                            e("div", he, [
                              i.quantity != null ? (l(), a(
                                "span",
                                ye,
                                u(i.quantity) + " " + u(i.unit || ""),
                                1
                                /* TEXT */
                              )) : r("v-if", !0),
                              i.source_type === "manual" ? (l(), a("button", {
                                key: 1,
                                class: "btn-delete-item text-stone-300 hover:text-red-600 font-bold px-1",
                                title: "Remove manual item",
                                onClick: (P) => Y(i.id)
                              }, " ✕ ", 8, we)) : r("v-if", !0)
                            ])
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
            ])
          ],
          2112
          /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
        )) : (l(), a("div", de, [...t[13] || (t[13] = [
          e(
            "p",
            { class: "text-sm font-medium text-stone-700" },
            "Shopping list is empty",
            -1
            /* CACHED */
          ),
          e(
            "p",
            { class: "text-xs text-stone-400" },
            "Schedule meals or add pantry staples to generate your list.",
            -1
            /* CACHED */
          )
        ])]))
      ])) : r("v-if", !0),
      r(" PANTRY STAPLES TAB "),
      m.value === "staples" ? (l(), a("div", _e, [
        e("div", ke, [
          t[15] || (t[15] = e(
            "h3",
            { class: "font-bold text-stone-800" },
            "Add Pantry Staple",
            -1
            /* CACHED */
          )),
          e(
            "form",
            {
              class: "grid grid-cols-2 gap-2",
              onSubmit: E(W, ["prevent"])
            },
            [
              c(e(
                "input",
                {
                  "onUpdate:modelValue": t[6] || (t[6] = (s) => f.value = s),
                  type: "text",
                  placeholder: "Staple name (e.g. Olive oil)",
                  class: "input-staple-name border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [x, f.value]
              ]),
              e("div", Se, [
                c(e(
                  "input",
                  {
                    "onUpdate:modelValue": t[7] || (t[7] = (s) => _.value = s),
                    type: "number",
                    step: "any",
                    placeholder: "Qty",
                    class: "w-16 border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [
                    x,
                    _.value,
                    void 0,
                    { number: !0 }
                  ]
                ]),
                c(e(
                  "input",
                  {
                    "onUpdate:modelValue": t[8] || (t[8] = (s) => k.value = s),
                    type: "text",
                    placeholder: "Unit",
                    class: "w-16 border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [x, k.value]
                ])
              ]),
              e("label", Ce, [
                c(e(
                  "input",
                  {
                    "onUpdate:modelValue": t[9] || (t[9] = (s) => D.value = s),
                    type: "checkbox",
                    class: "rounded text-emerald-600"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [ee, D.value]
                ]),
                t[14] || (t[14] = e(
                  "span",
                  { class: "text-stone-700" },
                  "Always include in every shopping list",
                  -1
                  /* CACHED */
                ))
              ]),
              e("div", Le, [
                e("button", {
                  type: "submit",
                  class: "btn-save-staple px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium",
                  disabled: !f.value.trim()
                }, " Save Staple ", 8, Ae)
              ])
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        r(" Staples List "),
        e("div", Ie, [
          e(
            "div",
            Ue,
            " Configured Staples (" + u(V.value.length) + ") ",
            1
            /* TEXT */
          ),
          e("ul", Ve, [
            (l(!0), a(
              C,
              null,
              j(V.value, (s) => (l(), a("li", {
                key: s.id,
                class: "staple-row p-3 flex items-center justify-between"
              }, [
                e("div", null, [
                  e(
                    "span",
                    De,
                    u(s.name),
                    1
                    /* TEXT */
                  ),
                  s.default_quantity ? (l(), a(
                    "span",
                    Te,
                    " (" + u(s.default_quantity) + " " + u(s.unit || "") + ") ",
                    1
                    /* TEXT */
                  )) : r("v-if", !0),
                  s.always_include ? (l(), a("span", Me, " Always included ")) : r("v-if", !0)
                ]),
                e("button", {
                  class: "btn-delete-staple text-stone-300 hover:text-red-600 text-xs px-2",
                  onClick: (M) => J(s.id)
                }, " Delete ", 8, Pe)
              ]))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ])) : r("v-if", !0)
    ]));
  }
});
function Fe(v) {
  var h;
  v.route && v.route({
    path: "/shopping-list",
    name: "shopping-list",
    component: je,
    meta: {
      title: "Shopping List",
      nav: {
        label: "Shopping List",
        icon: "🛒",
        order: 35
      }
    }
  }), (h = v.intent) != null && h.provider && v.intent.provider({
    hub: "shopping:view",
    id: "core-shopping-list",
    title: "View Shopping List",
    order: 10,
    execute: (n) => {
      n != null && n.router && n.router.push("/shopping-list");
    }
  });
}
export {
  je as ShoppingListPage,
  Fe as default
};
