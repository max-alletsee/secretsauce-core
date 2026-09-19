import { defineComponent as A, inject as $, ref as r, computed as G, openBlock as o, createElementBlock as a, createElementVNode as s, createCommentVNode as l, withDirectives as g, vModelText as w, vModelSelect as N, toDisplayString as u, Fragment as U, renderList as I, normalizeClass as B } from "vue";
const E = { class: "meal-planner-widget bg-white border border-stone-200 rounded-lg p-4 space-y-4 shadow-sm" }, L = { class: "flex items-center justify-between border-b pb-2" }, O = {
  key: 0,
  class: "space-y-3 bg-stone-50 p-3 rounded border border-stone-200 text-xs"
}, W = { class: "grid grid-cols-2 gap-2" }, z = { class: "flex justify-end gap-2 pt-1" }, Y = ["disabled"], q = {
  key: 0,
  class: "animate-spin text-xs"
}, H = {
  key: 1,
  class: "text-xs text-red-600 bg-red-50 p-2 rounded"
}, J = {
  key: 2,
  class: "suggestions-pool space-y-3"
}, K = { class: "flex items-center justify-between text-xs text-stone-500" }, Q = { class: "flex items-start justify-between gap-2" }, R = { class: "font-bold text-stone-900 text-xs" }, X = {
  key: 0,
  class: "text-stone-600 text-[11px] mt-0.5"
}, Z = {
  key: 0,
  class: "badge-accepted bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
}, ee = {
  key: 1,
  class: "text-[10px] text-stone-400 font-medium"
}, te = {
  key: 2,
  class: "bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
}, se = {
  key: 0,
  class: "flex items-center justify-between pt-1 gap-2 border-t border-stone-100"
}, ne = { class: "flex items-center gap-1.5" }, oe = ["onUpdate:modelValue"], ae = { class: "flex items-center gap-1" }, le = ["onClick"], ie = ["onClick"], de = /* @__PURE__ */ A({
  __name: "MealPlannerWidget",
  props: {
    ss: {}
  },
  emits: ["scheduled"],
  setup(c, { emit: f }) {
    var D, M;
    const y = c, F = f, p = ((D = y.ss) == null ? void 0 : D.api) || $("__SS_API__", null), S = ((M = y.ss) == null ? void 0 : M.notify) || $("__SS_NOTIFY__", null), h = r(5), _ = r("dinner"), k = r(""), i = r(!0), x = r(!1), m = r(""), d = r([]), b = r({}), P = G(() => d.value.filter((n) => n.status === "suggested"));
    function C() {
      return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    }
    async function T() {
      if (p) {
        x.value = !0, m.value = "";
        try {
          const n = await p.post("/api/x/core-meal-planner-ai/generate", {
            days: h.value,
            prompt: k.value.trim() || void 0,
            meal_types: [_.value]
          }), t = (n == null ? void 0 : n.suggestions) || [];
          d.value = t, i.value = !1;
          const e = C();
          for (const v of t)
            b.value[v.id] = v.suggested_date || e;
        } catch (n) {
          m.value = (n == null ? void 0 : n.message) || "Failed to generate meal plan candidates";
        } finally {
          x.value = !1;
        }
      }
    }
    async function V(n) {
      if (!p) return;
      const t = b.value[n.id] || C();
      try {
        const e = await p.post(`/api/x/core-meal-planner-ai/suggestions/${n.id}/accept`, {
          date: t,
          meal_type: n.meal_type || "dinner"
        });
        n.status = "accepted", n.schedule_entry_id = e == null ? void 0 : e.schedule_entry_id, S && S({ level: "success", message: `Scheduled ${n.recipe_title} for ${t}` }), F("scheduled", e);
      } catch (e) {
        m.value = (e == null ? void 0 : e.message) || "Failed to schedule meal";
      }
    }
    async function j(n) {
      if (p)
        try {
          await p.post(`/api/x/core-meal-planner-ai/suggestions/${n}/dismiss`);
          const t = d.value.find((e) => e.id === n);
          t && (t.status = "dismissed");
        } catch (t) {
          m.value = (t == null ? void 0 : t.message) || "Failed to dismiss suggestion";
        }
    }
    return (n, t) => (o(), a("div", E, [
      s("div", L, [
        t[6] || (t[6] = s(
          "div",
          { class: "flex items-center gap-2" },
          [
            s("span", { class: "text-base" }, "✨"),
            s("h3", { class: "font-semibold text-stone-900 text-sm" }, "AI Meal Suggestions")
          ],
          -1
          /* CACHED */
        )),
        !i.value && !d.value.length ? (o(), a("button", {
          key: 0,
          class: "text-xs text-emerald-600 hover:text-emerald-700 font-medium",
          onClick: t[0] || (t[0] = (e) => i.value = !0)
        }, " + New Plan ")) : l("v-if", !0)
      ]),
      l(" Generator Form "),
      i.value || !d.value.length ? (o(), a("div", O, [
        s("div", W, [
          s("div", null, [
            t[7] || (t[7] = s(
              "label",
              { class: "block font-medium text-stone-700 mb-1" },
              "Days to plan",
              -1
              /* CACHED */
            )),
            g(s(
              "input",
              {
                "onUpdate:modelValue": t[1] || (t[1] = (e) => h.value = e),
                type: "number",
                min: "1",
                max: "14",
                class: "input-days w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [
                w,
                h.value,
                void 0,
                { number: !0 }
              ]
            ])
          ]),
          s("div", null, [
            t[9] || (t[9] = s(
              "label",
              { class: "block font-medium text-stone-700 mb-1" },
              "Meal Types",
              -1
              /* CACHED */
            )),
            g(s(
              "select",
              {
                "onUpdate:modelValue": t[2] || (t[2] = (e) => _.value = e),
                class: "select-meal-type w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
              },
              [...t[8] || (t[8] = [
                s(
                  "option",
                  { value: "dinner" },
                  "Dinner",
                  -1
                  /* CACHED */
                ),
                s(
                  "option",
                  { value: "lunch" },
                  "Lunch",
                  -1
                  /* CACHED */
                ),
                s(
                  "option",
                  { value: "breakfast" },
                  "Breakfast",
                  -1
                  /* CACHED */
                )
              ])],
              512
              /* NEED_PATCH */
            ), [
              [N, _.value]
            ])
          ])
        ]),
        s("div", null, [
          t[10] || (t[10] = s(
            "label",
            { class: "block font-medium text-stone-700 mb-1" },
            "Dietary Focus / Notes",
            -1
            /* CACHED */
          )),
          g(s(
            "input",
            {
              "onUpdate:modelValue": t[3] || (t[3] = (e) => k.value = e),
              type: "text",
              placeholder: "e.g. high-protein, fast weeknight, comfort food",
              class: "input-prompt w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
            },
            null,
            512
            /* NEED_PATCH */
          ), [
            [w, k.value]
          ])
        ]),
        s("div", z, [
          d.value.length ? (o(), a("button", {
            key: 0,
            type: "button",
            class: "px-2.5 py-1 text-stone-600 hover:text-stone-800",
            onClick: t[4] || (t[4] = (e) => i.value = !1)
          }, " Cancel ")) : l("v-if", !0),
          s("button", {
            type: "button",
            class: "btn-generate px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition flex items-center gap-1.5",
            disabled: x.value,
            onClick: T
          }, [
            x.value ? (o(), a("span", q, "⏳")) : l("v-if", !0),
            s(
              "span",
              null,
              u(x.value ? "Generating..." : "Generate Pool"),
              1
              /* TEXT */
            )
          ], 8, Y)
        ])
      ])) : l("v-if", !0),
      l(" Error message "),
      m.value ? (o(), a(
        "div",
        H,
        u(m.value),
        1
        /* TEXT */
      )) : l("v-if", !0),
      l(" Suggestion Pool "),
      d.value.length ? (o(), a("div", J, [
        s("div", K, [
          s(
            "span",
            null,
            "Candidate Suggestions (" + u(P.value.length) + ")",
            1
            /* TEXT */
          ),
          s(
            "button",
            {
              class: "text-stone-400 hover:text-stone-600 underline",
              onClick: t[5] || (t[5] = (e) => i.value = !i.value)
            },
            u(i.value ? "Close form" : "Generate more"),
            1
            /* TEXT */
          )
        ]),
        (o(!0), a(
          U,
          null,
          I(d.value, (e) => (o(), a(
            "div",
            {
              key: e.id,
              class: B(["sug-card p-3 rounded border transition text-xs space-y-2", {
                "border-stone-200 bg-white": e.status === "suggested",
                "border-emerald-200 bg-emerald-50/50": e.status === "accepted",
                "opacity-40 line-through": e.status === "dismissed"
              }])
            },
            [
              s("div", Q, [
                s("div", null, [
                  s(
                    "h4",
                    R,
                    u(e.recipe_title),
                    1
                    /* TEXT */
                  ),
                  e.reasoning ? (o(), a(
                    "p",
                    X,
                    u(e.reasoning),
                    1
                    /* TEXT */
                  )) : l("v-if", !0)
                ]),
                e.status === "accepted" ? (o(), a("span", Z, " ✓ Scheduled ")) : e.status === "dismissed" ? (o(), a("span", ee, " Dismissed ")) : e.confidence ? (o(), a(
                  "span",
                  te,
                  u(Math.round(e.confidence * 100)) + "% match ",
                  1
                  /* TEXT */
                )) : l("v-if", !0)
              ]),
              l(" Action Controls for unassigned candidates "),
              e.status === "suggested" ? (o(), a("div", se, [
                s("div", ne, [
                  g(s("input", {
                    "onUpdate:modelValue": (v) => b.value[e.id] = v,
                    type: "date",
                    class: "input-sched-date border border-stone-300 rounded px-1.5 py-0.5 text-[11px] bg-white focus:outline-none"
                  }, null, 8, oe), [
                    [w, b.value[e.id]]
                  ])
                ]),
                s("div", ae, [
                  s("button", {
                    class: "btn-dismiss px-2 py-0.5 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded text-[11px]",
                    onClick: (v) => j(e.id)
                  }, " Dismiss ", 8, le),
                  s("button", {
                    class: "btn-accept px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[11px] transition",
                    onClick: (v) => V(e)
                  }, " Add to Schedule ", 8, ie)
                ])
              ])) : l("v-if", !0)
            ],
            2
            /* CLASS */
          ))),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : l("v-if", !0)
    ]));
  }
});
function ue(c) {
  var f;
  c.slot && c.slot("schedule.sidebar", de, { order: 10 }), (f = c.intent) != null && f.provider && c.intent.provider({
    hub: "meal:plan",
    id: "ai-planner",
    title: "Generate Meal Plan (AI)",
    order: 10,
    execute: (y) => {
    }
  });
}
export {
  de as MealPlannerWidget,
  ue as default
};
