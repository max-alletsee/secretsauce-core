import { defineComponent as j, resolveComponent as q, openBlock as s, createBlock as E, withCtx as Q, createElementVNode as e, toDisplayString as h, createVNode as I, unref as U, createElementBlock as d, createCommentVNode as y, normalizeClass as w, Fragment as k, renderList as A, inject as G, ref as g, onMounted as Y, withModifiers as H, withDirectives as O, vModelText as z, createTextVNode as F, computed as B, onBeforeUnmount as J } from "vue";
import { Slot as V, IntentTrigger as K, useSecretSauce as W } from "@secretsauce/ui";
const X = { class: "card-header" }, Z = { class: "card-title" }, ee = {
  key: 0,
  class: "card-servings"
}, te = {
  key: 1,
  class: "card-note"
}, ne = /* @__PURE__ */ j({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: p }) {
    const n = p;
    return (i, a) => {
      const u = q("Button");
      return s(), E(u, {
        class: "schedule-card",
        variant: "text",
        onClick: a[0] || (a[0] = (o) => n("interact", o))
      }, {
        default: Q(() => {
          var o;
          return [
            e("div", X, [
              e(
                "span",
                Z,
                h(((o = t.entry.recipe) == null ? void 0 : o.title) || t.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              I(U(V), {
                name: "timeline.entry.badge",
                context: { entry: t.entry }
              }, null, 8, ["context"])
            ]),
            t.entry.servings_override ? (s(), d(
              "div",
              ee,
              h(t.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : y("v-if", !0),
            t.entry.note ? (s(), d(
              "div",
              te,
              h(t.entry.note),
              1
              /* TEXT */
            )) : y("v-if", !0)
          ];
        }),
        _: 1
        /* STABLE */
      });
    };
  }
}), L = (t, p) => {
  const n = t.__vccOpts || t;
  for (const [i, a] of p)
    n[i] = a;
  return n;
}, ae = /* @__PURE__ */ L(ne, [["__scopeId", "data-v-6dd69cdc"]]), se = { class: "slot-header" }, ie = { class: "slot-name" }, oe = { class: "entries-list" }, le = {
  key: 0,
  class: "empty-slot"
}, ce = /* @__PURE__ */ j({
  __name: "MealSlot",
  props: {
    mealType: {},
    date: {},
    entries: {},
    compact: { type: Boolean }
  },
  emits: ["add", "changed"],
  setup(t, { emit: p }) {
    const n = p;
    return (i, a) => {
      const u = q("Button");
      return s(), d(
        "div",
        {
          class: w(["meal-slot", { "is-compact": t.compact }])
        },
        [
          e("div", se, [
            e(
              "span",
              ie,
              h(t.mealType),
              1
              /* TEXT */
            ),
            t.compact ? y("v-if", !0) : (s(), E(u, {
              key: 0,
              class: "add-btn",
              icon: "pi pi-plus",
              "aria-label": "Add meal",
              title: "Add meal",
              variant: "text",
              size: "small",
              onClick: a[0] || (a[0] = (o) => n("add", { date: t.date, mealType: t.mealType }))
            }))
          ]),
          e("div", oe, [
            (s(!0), d(
              k,
              null,
              A(t.entries, (o) => (s(), E(U(K), {
                key: o.id,
                hub: "entry:interact",
                context: { entry: o },
                onResolve: a[1] || (a[1] = (f) => n("changed"))
              }, {
                default: Q(({ open: f }) => [
                  I(ae, {
                    entry: o,
                    onInteract: f
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            !t.entries.length && !t.compact ? (s(), d("div", le, [
              I(u, {
                class: "empty-add-link",
                label: "Add",
                icon: "pi pi-plus",
                variant: "text",
                size: "small",
                onClick: a[2] || (a[2] = (o) => n("add", { date: t.date, mealType: t.mealType }))
              })
            ])) : y("v-if", !0)
          ])
        ],
        2
        /* CLASS */
      );
    };
  }
}), re = /* @__PURE__ */ L(ce, [["__scopeId", "data-v-c585dd10"]]), de = { class: "modal-dialog" }, ue = { class: "modal-header" }, ve = { class: "modal-tabs" }, me = { class: "modal-body" }, pe = {
  key: 0,
  class: "tab-pane"
}, ye = { class: "search-box" }, he = {
  key: 0,
  class: "recipe-results"
}, _e = ["onClick"], fe = {
  key: 1,
  class: "empty-hint"
}, be = { class: "tab-pane" }, ge = {
  key: 0,
  class: "recipe-results"
}, ke = ["onClick"], $e = {
  key: 1,
  class: "empty-hint"
}, Ce = { class: "tab-pane" }, Se = { class: "category-chips" }, Te = ["onClick"], we = ["disabled"], De = /* @__PURE__ */ j({
  __name: "AddEntryModal",
  props: {
    date: {},
    mealType: {}
  },
  emits: ["close", "created"],
  setup(t, { emit: p }) {
    const n = t, i = p, a = G("__SS_API__", null), u = g("search"), o = g(""), f = g([]), S = g([]), T = g(""), $ = g("Dinner"), D = g(2);
    async function M() {
      if (!a || !o.value.trim()) {
        f.value = [];
        return;
      }
      try {
        const b = await a.get(`/api/recipes?q=${encodeURIComponent(o.value.trim())}`);
        f.value = b.items || b || [];
      } catch {
        f.value = [];
      }
    }
    async function C() {
      if (a)
        try {
          S.value = await a.get("/api/x/core-shortlist");
        } catch {
          S.value = [];
        }
    }
    async function R(b) {
      if (!a) return;
      const v = crypto.randomUUID();
      await a.post("/api/schedule", {
        id: v,
        date: n.date,
        meal_type: n.mealType || "dinner",
        entry_type: "recipe",
        recipe_id: b.id,
        servings_override: D.value
      }), i("created"), i("close");
    }
    async function N() {
      if (!a || !T.value.trim()) return;
      const b = crypto.randomUUID();
      await a.post("/api/schedule", {
        id: b,
        date: n.date,
        meal_type: n.mealType || "dinner",
        entry_type: "note",
        title: `[${$.value}] ${T.value.trim()}`,
        servings_override: D.value
      }), i("created"), i("close");
    }
    return Y(() => {
      C();
    }), (b, v) => (s(), d("div", {
      class: "modal-backdrop",
      onClick: v[7] || (v[7] = H((l) => i("close"), ["self"]))
    }, [
      e("div", de, [
        e("div", ue, [
          e(
            "h3",
            null,
            "Add Meal — " + h(t.date) + " (" + h(t.mealType) + ")",
            1
            /* TEXT */
          ),
          e("button", {
            class: "close-btn",
            onClick: v[0] || (v[0] = (l) => i("close"))
          }, "×")
        ]),
        e("div", ve, [
          e(
            "button",
            {
              class: w({ active: u.value === "search" }),
              onClick: v[1] || (v[1] = (l) => u.value = "search")
            },
            " Recipe Search ",
            2
            /* CLASS */
          ),
          e(
            "button",
            {
              class: w({ active: u.value === "shortlist" }),
              onClick: v[2] || (v[2] = (l) => u.value = "shortlist")
            },
            " Shortlist ",
            2
            /* CLASS */
          ),
          e(
            "button",
            {
              class: w({ active: u.value === "ai" }),
              onClick: v[3] || (v[3] = (l) => u.value = "ai")
            },
            " AI Suggestions ",
            2
            /* CLASS */
          ),
          e(
            "button",
            {
              class: w({ active: u.value === "custom" }),
              onClick: v[4] || (v[4] = (l) => u.value = "custom")
            },
            " Custom Note ",
            2
            /* CLASS */
          )
        ]),
        e("div", me, [
          y(" 1. Search Tab "),
          u.value === "search" ? (s(), d("div", pe, [
            e("div", ye, [
              O(e(
                "input",
                {
                  "onUpdate:modelValue": v[5] || (v[5] = (l) => o.value = l),
                  placeholder: "Search recipes...",
                  onInput: M
                },
                null,
                544
                /* NEED_HYDRATION, NEED_PATCH */
              ), [
                [z, o.value]
              ])
            ]),
            f.value.length ? (s(), d("ul", he, [
              (s(!0), d(
                k,
                null,
                A(f.value, (l) => (s(), d("li", {
                  key: l.id
                }, [
                  e(
                    "span",
                    null,
                    h(l.title),
                    1
                    /* TEXT */
                  ),
                  e("button", {
                    class: "select-btn",
                    onClick: (c) => R(l)
                  }, "Schedule", 8, _e)
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : o.value.trim() ? (s(), d("p", fe, "No recipes found.")) : y("v-if", !0)
          ])) : u.value === "shortlist" ? (s(), d(
            k,
            { key: 1 },
            [
              y(" 2. Shortlist Tab "),
              e("div", be, [
                S.value.length ? (s(), d("ul", ge, [
                  (s(!0), d(
                    k,
                    null,
                    A(S.value, (l) => (s(), d("li", {
                      key: l.id
                    }, [
                      e(
                        "span",
                        null,
                        h(l.recipe_title || "Recipe"),
                        1
                        /* TEXT */
                      ),
                      e("button", {
                        class: "select-btn",
                        onClick: (c) => R({ id: l.recipe_id, title: l.recipe_title })
                      }, " Schedule ", 8, ke)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : (s(), d("p", $e, "No favorites in shortlist."))
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : u.value === "ai" ? (s(), d(
            k,
            { key: 2 },
            [
              y(" 3. AI Suggestions Tab "),
              v[8] || (v[8] = e(
                "div",
                { class: "tab-pane" },
                [
                  e("div", { class: "ai-info-card" }, [
                    e("h4", null, "AI Meal Planner"),
                    e("p", null, [
                      F("Automated suggestions become active when the "),
                      e("code", null, "meal-planner"),
                      F(" plugin is enabled.")
                    ])
                  ])
                ],
                -1
                /* CACHED */
              ))
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : u.value === "custom" ? (s(), d(
            k,
            { key: 3 },
            [
              y(" 4. Custom Note Tab "),
              e("div", Ce, [
                e("div", Se, [
                  (s(), d(
                    k,
                    null,
                    A(["Dining Out", "Leftovers", "Takeout", "Quick Meal"], (l) => e("button", {
                      key: l,
                      class: w({ active: $.value === l }),
                      onClick: (c) => $.value = l
                    }, h(l), 11, Te)),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ]),
                O(e(
                  "textarea",
                  {
                    "onUpdate:modelValue": v[6] || (v[6] = (l) => T.value = l),
                    placeholder: "Enter meal details or notes...",
                    rows: "3"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [z, T.value]
                ]),
                e("button", {
                  class: "primary-btn",
                  disabled: !T.value.trim(),
                  onClick: N
                }, " Save Note ", 8, we)
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : y("v-if", !0)
        ])
      ])
    ]));
  }
}), xe = /* @__PURE__ */ L(De, [["__scopeId", "data-v-fcc49ba9"]]), Ie = { class: "timeline-page" }, Ae = { class: "timeline-toolbar" }, Me = { class: "nav-controls" }, Re = { class: "range-display" }, Ne = { class: "timeline-container" }, Pe = { class: "timeline-grid" }, Be = { class: "day-header" }, Ee = { class: "day-label" }, Ue = {
  key: 0,
  class: "today-badge"
}, je = { class: "day-slots" }, Le = { class: "day-footer" }, Ve = { class: "timeline-sidebar-wrapper" }, Oe = /* @__PURE__ */ j({
  __name: "TimelinePage",
  setup(t) {
    const p = W(), n = p.api;
    let i = 0;
    const a = g(/* @__PURE__ */ new Date()), u = g([]), o = g(null), f = ["Dinner"];
    function S(c) {
      const m = c.getFullYear(), r = String(c.getMonth() + 1).padStart(2, "0"), _ = String(c.getDate()).padStart(2, "0");
      return `${m}-${r}-${_}`;
    }
    const T = B(() => S(/* @__PURE__ */ new Date())), $ = B(() => {
      const c = [], m = new Date(a.value);
      for (let r = -2; r <= 6; r++) {
        const _ = new Date(m);
        _.setDate(m.getDate() + r);
        const P = S(_);
        c.push({
          date: P,
          isPast: r < 0,
          isToday: P === T.value,
          label: _.toLocaleDateString(void 0, { weekday: "short", month: "short", day: "numeric" })
        });
      }
      return c;
    }), D = B(() => $.value[0].date), M = B(() => $.value[$.value.length - 1].date);
    async function C() {
      const c = ++i;
      try {
        const m = `?from=${D.value}&to=${M.value}`, [r, _] = await Promise.all([n.get(`/api/schedule${m}`), n.get(`/api/journal${m}`)]);
        if (c !== i) return;
        const P = new Set(_.filter((x) => x.status === "cooked").map((x) => x.schedule_entry_id));
        u.value = r.map((x) => ({ ...x, is_cooked: P.has(x.id) }));
      } catch {
        c === i && (u.value = []);
      }
    }
    function R(c, m) {
      return u.value.filter(
        (r) => r.date === c && String(r.meal_type).toLowerCase() === m.toLowerCase()
      );
    }
    function N(c) {
      const m = new Date(a.value);
      m.setDate(m.getDate() + c), a.value = m, C();
    }
    function b() {
      a.value = /* @__PURE__ */ new Date(), C();
    }
    function v(c) {
      o.value = c;
    }
    const l = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted"].map((c) => p.on(c, C));
    return Y(C), J(() => {
      ++i, l.forEach((c) => {
        typeof c == "function" && c();
      });
    }), (c, m) => (s(), d("div", Ie, [
      e("div", Ae, [
        e("div", Me, [
          e("button", {
            class: "btn",
            onClick: m[0] || (m[0] = (r) => N(-7))
          }, "◀ Prev"),
          e("button", {
            class: "btn today-btn",
            onClick: b
          }, "Today"),
          e("button", {
            class: "btn",
            onClick: m[1] || (m[1] = (r) => N(7))
          }, "Next ▶")
        ]),
        e(
          "span",
          Re,
          h(D.value) + " — " + h(M.value),
          1
          /* TEXT */
        )
      ]),
      e("div", Ne, [
        e("div", Pe, [
          (s(!0), d(
            k,
            null,
            A($.value, (r) => (s(), d(
              "div",
              {
                key: r.date,
                class: w(["timeline-day-column", { "is-past": r.isPast, "is-today": r.isToday }])
              },
              [
                e("div", Be, [
                  e(
                    "span",
                    Ee,
                    h(r.label),
                    1
                    /* TEXT */
                  ),
                  r.isToday ? (s(), d("span", Ue, "Today")) : y("v-if", !0)
                ]),
                e("div", je, [
                  (s(), d(
                    k,
                    null,
                    A(f, (_) => I(re, {
                      key: _,
                      "meal-type": _,
                      date: r.date,
                      entries: R(r.date, _),
                      compact: r.isPast,
                      onAdd: v,
                      onChanged: C
                    }, null, 8, ["meal-type", "date", "entries", "compact"])),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ]),
                e("div", Le, [
                  I(U(V), {
                    name: "timeline.day.footer",
                    context: { date: r.date }
                  }, null, 8, ["context"])
                ])
              ],
              2
              /* CLASS */
            ))),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        e("div", Ve, [
          I(U(V), {
            name: "timeline.sidebar",
            context: { from: D.value, to: M.value }
          }, null, 8, ["context"])
        ])
      ]),
      o.value ? (s(), E(xe, {
        key: 0,
        date: o.value.date,
        "meal-type": o.value.mealType,
        onClose: m[2] || (m[2] = (r) => o.value = null),
        onCreated: C
      }, null, 8, ["date", "meal-type"])) : y("v-if", !0)
    ]));
  }
}), ze = /* @__PURE__ */ L(Oe, [["__scopeId", "data-v-5bdcd938"]]);
function Qe(t) {
  t.route({ path: "/timeline", component: ze, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
    hub: "entry:interact",
    id: "view-recipe",
    title: "View recipe",
    icon: "book",
    order: 10,
    kind: "headless",
    isAvailable: (n) => {
      var i;
      return !!((i = n == null ? void 0 : n.entry) != null && i.recipe_id);
    },
    execute: (n) => t.navigate(`/recipes/${n.entry.recipe_id}`)
  }), t.intent.provider({
    hub: "entry:interact",
    id: "remove",
    title: "Remove from plan",
    icon: "trash",
    order: 999,
    kind: "headless",
    execute: async (n) => {
      const i = n == null ? void 0 : n.entry;
      !i || !await t.confirm({ header: "Remove meal", message: "Remove this meal from the plan?", acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }) || (await t.api.delete(`/api/schedule/${i.id}?revision=${i.revision}`), t.notify({ level: "success", message: "Meal removed from plan" }));
    }
  });
  const p = async () => {
    try {
      const n = /* @__PURE__ */ new Date(), i = new Date(n), a = new Date(n);
      i.setDate(i.getDate() - 2), a.setDate(a.getDate() + 14);
      const u = await t.api.get(`/api/schedule?from=${i.toISOString().slice(0, 10)}&to=${a.toISOString().slice(0, 10)}`);
      for (const o of u) o.recipe_id && t.api.get(`/api/recipes/${o.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  p();
  for (const n of ["schedule:created", "schedule:updated", "schedule:deleted"]) t.on(n, p);
}
export {
  Qe as default
};
