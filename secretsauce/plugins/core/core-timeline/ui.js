import { defineComponent as N, openBlock as s, createElementBlock as l, createElementVNode as t, toDisplayString as p, createVNode as M, unref as x, createCommentVNode as y, normalizeClass as T, Fragment as k, renderList as D, createBlock as Q, inject as U, ref as b, onMounted as j, withModifiers as q, withDirectives as B, vModelText as O, createTextVNode as F, computed as A } from "vue";
import { Slot as V } from "@secretsauce/ui";
const z = { class: "card-header" }, Y = { class: "card-title" }, G = {
  key: 0,
  class: "card-servings"
}, H = {
  key: 1,
  class: "card-note"
}, J = /* @__PURE__ */ N({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(e, { emit: v }) {
    const a = v;
    return (r, o) => {
      var i;
      return s(), l("div", {
        class: "schedule-card",
        onClick: o[0] || (o[0] = (m) => a("interact", e.entry))
      }, [
        t("div", z, [
          t(
            "span",
            Y,
            p(((i = e.entry.recipe) == null ? void 0 : i.title) || e.entry.title || "Planned Meal"),
            1
            /* TEXT */
          ),
          M(x(V), {
            name: "timeline.entry.badge",
            context: { entry: e.entry }
          }, null, 8, ["context"])
        ]),
        e.entry.servings_override ? (s(), l(
          "div",
          G,
          p(e.entry.servings_override) + " servings ",
          1
          /* TEXT */
        )) : y("v-if", !0),
        e.entry.note ? (s(), l(
          "div",
          H,
          p(e.entry.note),
          1
          /* TEXT */
        )) : y("v-if", !0)
      ]);
    };
  }
}), P = (e, v) => {
  const a = e.__vccOpts || e;
  for (const [r, o] of v)
    a[r] = o;
  return a;
}, K = /* @__PURE__ */ P(J, [["__scopeId", "data-v-77c6af5a"]]), W = { class: "slot-header" }, X = { class: "slot-name" }, Z = { class: "entries-list" }, ee = {
  key: 0,
  class: "empty-slot"
}, te = /* @__PURE__ */ N({
  __name: "MealSlot",
  props: {
    mealType: {},
    date: {},
    entries: {},
    compact: { type: Boolean }
  },
  emits: ["add", "interact"],
  setup(e, { emit: v }) {
    const a = v;
    return (r, o) => (s(), l(
      "div",
      {
        class: T(["meal-slot", { "is-compact": e.compact }])
      },
      [
        t("div", W, [
          t(
            "span",
            X,
            p(e.mealType),
            1
            /* TEXT */
          ),
          e.compact ? y("v-if", !0) : (s(), l("button", {
            key: 0,
            class: "add-btn",
            title: "Add meal",
            onClick: o[0] || (o[0] = (i) => a("add", { date: e.date, mealType: e.mealType }))
          }, " + "))
        ]),
        t("div", Z, [
          (s(!0), l(
            k,
            null,
            D(e.entries, (i) => (s(), Q(K, {
              key: i.id,
              entry: i,
              onInteract: o[1] || (o[1] = (m) => a("interact", m))
            }, null, 8, ["entry"]))),
            128
            /* KEYED_FRAGMENT */
          )),
          !e.entries.length && !e.compact ? (s(), l("div", ee, [
            t("button", {
              class: "empty-add-link",
              onClick: o[2] || (o[2] = (i) => a("add", { date: e.date, mealType: e.mealType }))
            }, " + Add ")
          ])) : y("v-if", !0)
        ])
      ],
      2
      /* CLASS */
    ));
  }
}), ne = /* @__PURE__ */ P(te, [["__scopeId", "data-v-678d52a3"]]), ae = { class: "modal-dialog" }, ie = { class: "modal-header" }, oe = { class: "modal-tabs" }, se = { class: "modal-body" }, le = {
  key: 0,
  class: "tab-pane"
}, re = { class: "search-box" }, ce = {
  key: 0,
  class: "recipe-results"
}, de = ["onClick"], ue = {
  key: 1,
  class: "empty-hint"
}, ve = { class: "tab-pane" }, me = {
  key: 0,
  class: "recipe-results"
}, ye = ["onClick"], pe = {
  key: 1,
  class: "empty-hint"
}, he = { class: "tab-pane" }, fe = { class: "category-chips" }, _e = ["onClick"], be = ["disabled"], ge = /* @__PURE__ */ N({
  __name: "AddEntryModal",
  props: {
    date: {},
    mealType: {}
  },
  emits: ["close", "created"],
  setup(e, { emit: v }) {
    const a = e, r = v, o = U("__SS_API__", null), i = b("search"), m = b(""), h = b([]), g = b([]), f = b(""), S = b("Dinner"), C = b(2);
    async function w() {
      if (!o || !m.value.trim()) {
        h.value = [];
        return;
      }
      try {
        const _ = await o.get(`/api/recipes?q=${encodeURIComponent(m.value.trim())}`);
        h.value = _.items || _ || [];
      } catch {
        h.value = [];
      }
    }
    async function E() {
      if (o)
        try {
          g.value = await o.get("/api/x/core-shortlist");
        } catch {
          g.value = [];
        }
    }
    async function I(_) {
      if (!o) return;
      const c = crypto.randomUUID();
      await o.post("/api/schedule", {
        id: c,
        date: a.date,
        meal_type: a.mealType || "dinner",
        entry_type: "recipe",
        recipe_id: _.id,
        servings_override: C.value
      }), r("created"), r("close");
    }
    async function R() {
      if (!o || !f.value.trim()) return;
      const _ = crypto.randomUUID();
      await o.post("/api/schedule", {
        id: _,
        date: a.date,
        meal_type: a.mealType || "dinner",
        entry_type: "note",
        title: `[${S.value}] ${f.value.trim()}`,
        servings_override: C.value
      }), r("created"), r("close");
    }
    return j(() => {
      E();
    }), (_, c) => (s(), l("div", {
      class: "modal-backdrop",
      onClick: c[7] || (c[7] = q((n) => r("close"), ["self"]))
    }, [
      t("div", ae, [
        t("div", ie, [
          t(
            "h3",
            null,
            "Add Meal — " + p(e.date) + " (" + p(e.mealType) + ")",
            1
            /* TEXT */
          ),
          t("button", {
            class: "close-btn",
            onClick: c[0] || (c[0] = (n) => r("close"))
          }, "×")
        ]),
        t("div", oe, [
          t(
            "button",
            {
              class: T({ active: i.value === "search" }),
              onClick: c[1] || (c[1] = (n) => i.value = "search")
            },
            " Recipe Search ",
            2
            /* CLASS */
          ),
          t(
            "button",
            {
              class: T({ active: i.value === "shortlist" }),
              onClick: c[2] || (c[2] = (n) => i.value = "shortlist")
            },
            " Shortlist ",
            2
            /* CLASS */
          ),
          t(
            "button",
            {
              class: T({ active: i.value === "ai" }),
              onClick: c[3] || (c[3] = (n) => i.value = "ai")
            },
            " AI Suggestions ",
            2
            /* CLASS */
          ),
          t(
            "button",
            {
              class: T({ active: i.value === "custom" }),
              onClick: c[4] || (c[4] = (n) => i.value = "custom")
            },
            " Custom Note ",
            2
            /* CLASS */
          )
        ]),
        t("div", se, [
          y(" 1. Search Tab "),
          i.value === "search" ? (s(), l("div", le, [
            t("div", re, [
              B(t(
                "input",
                {
                  "onUpdate:modelValue": c[5] || (c[5] = (n) => m.value = n),
                  placeholder: "Search recipes...",
                  onInput: w
                },
                null,
                544
                /* NEED_HYDRATION, NEED_PATCH */
              ), [
                [O, m.value]
              ])
            ]),
            h.value.length ? (s(), l("ul", ce, [
              (s(!0), l(
                k,
                null,
                D(h.value, (n) => (s(), l("li", {
                  key: n.id
                }, [
                  t(
                    "span",
                    null,
                    p(n.title),
                    1
                    /* TEXT */
                  ),
                  t("button", {
                    class: "select-btn",
                    onClick: (u) => I(n)
                  }, "Schedule", 8, de)
                ]))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : m.value.trim() ? (s(), l("p", ue, "No recipes found.")) : y("v-if", !0)
          ])) : i.value === "shortlist" ? (s(), l(
            k,
            { key: 1 },
            [
              y(" 2. Shortlist Tab "),
              t("div", ve, [
                g.value.length ? (s(), l("ul", me, [
                  (s(!0), l(
                    k,
                    null,
                    D(g.value, (n) => (s(), l("li", {
                      key: n.id
                    }, [
                      t(
                        "span",
                        null,
                        p(n.recipe_title || "Recipe"),
                        1
                        /* TEXT */
                      ),
                      t("button", {
                        class: "select-btn",
                        onClick: (u) => I({ id: n.recipe_id, title: n.recipe_title })
                      }, " Schedule ", 8, ye)
                    ]))),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : (s(), l("p", pe, "No favorites in shortlist."))
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : i.value === "ai" ? (s(), l(
            k,
            { key: 2 },
            [
              y(" 3. AI Suggestions Tab "),
              c[8] || (c[8] = t(
                "div",
                { class: "tab-pane" },
                [
                  t("div", { class: "ai-info-card" }, [
                    t("h4", null, "AI Meal Planner"),
                    t("p", null, [
                      F("Automated suggestions become active when the "),
                      t("code", null, "meal-planner"),
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
          )) : i.value === "custom" ? (s(), l(
            k,
            { key: 3 },
            [
              y(" 4. Custom Note Tab "),
              t("div", he, [
                t("div", fe, [
                  (s(), l(
                    k,
                    null,
                    D(["Dining Out", "Leftovers", "Takeout", "Quick Meal"], (n) => t("button", {
                      key: n,
                      class: T({ active: S.value === n }),
                      onClick: (u) => S.value = n
                    }, p(n), 11, _e)),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ]),
                B(t(
                  "textarea",
                  {
                    "onUpdate:modelValue": c[6] || (c[6] = (n) => f.value = n),
                    placeholder: "Enter meal details or notes...",
                    rows: "3"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [O, f.value]
                ]),
                t("button", {
                  class: "primary-btn",
                  disabled: !f.value.trim(),
                  onClick: R
                }, " Save Note ", 8, be)
              ])
            ],
            2112
            /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
          )) : y("v-if", !0)
        ])
      ])
    ]));
  }
}), $e = /* @__PURE__ */ P(ge, [["__scopeId", "data-v-fcc49ba9"]]), ke = { class: "timeline-page" }, Se = { class: "timeline-toolbar" }, Te = { class: "nav-controls" }, Ce = { class: "range-display" }, we = { class: "timeline-container" }, De = { class: "timeline-grid" }, Ie = { class: "day-header" }, Ae = { class: "day-label" }, Me = {
  key: 0,
  class: "today-badge"
}, Ne = { class: "day-slots" }, Pe = { class: "day-footer" }, Ee = { class: "timeline-sidebar-wrapper" }, Re = /* @__PURE__ */ N({
  __name: "TimelinePage",
  setup(e) {
    const v = U("__SS_API__", null), a = U("__SS_INTENT__", null), r = b(/* @__PURE__ */ new Date()), o = b([]), i = b(null), m = ["Dinner"];
    function h(n) {
      const u = n.getFullYear(), d = String(n.getMonth() + 1).padStart(2, "0"), $ = String(n.getDate()).padStart(2, "0");
      return `${u}-${d}-${$}`;
    }
    const g = A(() => h(/* @__PURE__ */ new Date())), f = A(() => {
      const n = [], u = new Date(r.value);
      for (let d = -2; d <= 6; d++) {
        const $ = new Date(u);
        $.setDate(u.getDate() + d);
        const L = h($);
        n.push({
          date: L,
          isPast: d < 0,
          isToday: L === g.value,
          label: $.toLocaleDateString(void 0, { weekday: "short", month: "short", day: "numeric" })
        });
      }
      return n;
    }), S = A(() => f.value[0].date), C = A(() => f.value[f.value.length - 1].date);
    async function w() {
      if (v)
        try {
          const n = await v.get(`/api/schedule?from=${S.value}&to=${C.value}`);
          o.value = Array.isArray(n) ? n : [];
        } catch {
          o.value = [];
        }
    }
    function E(n, u) {
      return o.value.filter(
        (d) => d.date === n && String(d.meal_type).toLowerCase() === u.toLowerCase()
      );
    }
    function I(n) {
      const u = new Date(r.value);
      u.setDate(u.getDate() + n), r.value = u, w();
    }
    function R() {
      r.value = /* @__PURE__ */ new Date(), w();
    }
    function _(n) {
      a ? a("entry:create", n).catch(() => {
        i.value = n;
      }) : i.value = n;
    }
    function c(n) {
      a && a("entry:interact", { entry: n });
    }
    return j(() => {
      w();
    }), (n, u) => (s(), l("div", ke, [
      t("div", Se, [
        t("div", Te, [
          t("button", {
            class: "btn",
            onClick: u[0] || (u[0] = (d) => I(-7))
          }, "◀ Prev"),
          t("button", {
            class: "btn today-btn",
            onClick: R
          }, "Today"),
          t("button", {
            class: "btn",
            onClick: u[1] || (u[1] = (d) => I(7))
          }, "Next ▶")
        ]),
        t(
          "span",
          Ce,
          p(S.value) + " — " + p(C.value),
          1
          /* TEXT */
        )
      ]),
      t("div", we, [
        t("div", De, [
          (s(!0), l(
            k,
            null,
            D(f.value, (d) => (s(), l(
              "div",
              {
                key: d.date,
                class: T(["timeline-day-column", { "is-past": d.isPast, "is-today": d.isToday }])
              },
              [
                t("div", Ie, [
                  t(
                    "span",
                    Ae,
                    p(d.label),
                    1
                    /* TEXT */
                  ),
                  d.isToday ? (s(), l("span", Me, "Today")) : y("v-if", !0)
                ]),
                t("div", Ne, [
                  (s(), l(
                    k,
                    null,
                    D(m, ($) => M(ne, {
                      key: $,
                      "meal-type": $,
                      date: d.date,
                      entries: E(d.date, $),
                      compact: d.isPast,
                      onAdd: _,
                      onInteract: c
                    }, null, 8, ["meal-type", "date", "entries", "compact"])),
                    64
                    /* STABLE_FRAGMENT */
                  ))
                ]),
                t("div", Pe, [
                  M(x(V), {
                    name: "timeline.day.footer",
                    context: { date: d.date }
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
        t("div", Ee, [
          M(x(V), {
            name: "timeline.sidebar",
            context: { from: S.value, to: C.value }
          }, null, 8, ["context"])
        ])
      ]),
      i.value ? (s(), Q($e, {
        key: 0,
        date: i.value.date,
        "meal-type": i.value.mealType,
        onClose: u[2] || (u[2] = (d) => i.value = null),
        onCreated: w
      }, null, 8, ["date", "meal-type"])) : y("v-if", !0)
    ]));
  }
}), xe = /* @__PURE__ */ P(Re, [["__scopeId", "data-v-ee77abe4"]]);
function Le(e) {
  e.route({
    path: "/timeline",
    component: xe,
    nav: { label: "Timeline", icon: "calendar", order: 5 }
  }), typeof e.nav == "function" && e.nav({ label: "Timeline", icon: "calendar", path: "/timeline", order: 5 }), e.intent && (e.intent.hub({ id: "entry:create", title: "Add Entry to Timeline" }), e.intent.hub({ id: "entry:interact", title: "Meal Slot Interaction" }), e.intent.hub({ id: "timeline:assist", title: "Timeline Planning Assistance" }), e.intent.provider({
    hub: "entry:interact",
    id: "view-recipe",
    title: "View Recipe",
    order: 10,
    kind: "headless",
    execute: (a) => {
      var r;
      (r = a == null ? void 0 : a.entry) != null && r.recipe_id && (e.navigate ? e.navigate(`/recipes/${a.entry.recipe_id}`) : window.location.href = e.url ? e.url(`/recipes/${a.entry.recipe_id}`) : `/recipes/${a.entry.recipe_id}`);
    }
  }), e.intent.provider({
    hub: "entry:interact",
    id: "remove",
    title: "Remove from Plan",
    order: 999,
    kind: "headless",
    execute: async (a) => {
      var r;
      (r = a == null ? void 0 : a.entry) != null && r.id && confirm("Remove this meal from timeline?") && (await e.api.delete(`/api/schedule/${a.entry.id}?revision=${a.entry.revision || 1}`), window.location.reload());
    }
  })), typeof e.hub == "function" && (e.hub("entry:create", {
    defaultProvider: {
      id: "manual-add",
      order: 100,
      run: async () => {
      }
    }
  }), e.hub("entry:interact", { providers: [] }), e.hub("timeline:assist", { providers: [] }));
  const v = async () => {
    try {
      if (!e.api) return;
      const a = /* @__PURE__ */ new Date(), r = new Date(a);
      r.setDate(r.getDate() - 2);
      const o = new Date(a);
      o.setDate(o.getDate() + 14);
      const i = r.toISOString().slice(0, 10), m = o.toISOString().slice(0, 10), h = await e.api.get(`/api/schedule?from=${i}&to=${m}`);
      for (const g of h || [])
        g.recipe_id && e.api.get(`/api/recipes/${g.recipe_id}`).catch(() => {
        });
    } catch {
    }
  };
  v(), typeof e.on == "function" && (e.on("schedule:created", v), e.on("schedule:updated", v), e.on("schedule:deleted", v));
}
export {
  Le as default
};
