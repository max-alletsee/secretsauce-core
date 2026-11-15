import { defineComponent as ee, resolveComponent as k, openBlock as s, createBlock as U, createCommentVNode as V, computed as W, ref as y, watch as me, createElementBlock as S, createElementVNode as g, toDisplayString as Y, withCtx as P, createTextVNode as X, createVNode as c, Fragment as Q, renderList as Z, normalizeClass as _e, unref as J, resolveDirective as we, withDirectives as Te, withModifiers as Se, inject as De, onMounted as Me, onBeforeUnmount as Ae, resolveDynamicComponent as Ie, nextTick as Le } from "vue";
import { useSecretSauce as le, Slot as ie, IntentTrigger as Pe } from "@secretsauce/ui";
const Ve = /* @__PURE__ */ ee({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(t) {
    return (r, e) => {
      var i, l;
      const a = k("Tag");
      return ((l = (i = t.context) == null ? void 0 : i.entry) == null ? void 0 : l.status) === "cooked" ? (s(), U(a, {
        key: 0,
        value: "Cooked",
        icon: "pi pi-check",
        severity: "success",
        title: "Cooked"
      })) : V("v-if", !0);
    };
  }
});
function ne() {
  const t = /* @__PURE__ */ new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function O(t, r) {
  const e = /* @__PURE__ */ new Date(`${t}T12:00:00`);
  return e.setDate(e.getDate() + r), `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Ne(t, r, e, a) {
  const i = [];
  for (let l = t.from; l <= t.to; l = O(l, 1)) {
    const v = (r[l] || []).map((m) => ({ ...m, entries: [] }));
    for (const m of e.filter((d) => d.date === l)) {
      const d = m.meal_type.toLowerCase();
      let h = v.find(($) => $.id.toLowerCase() === d) || v.find(($) => $.label.toLowerCase() === d);
      h || (h = { id: m.meal_type, label: m.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, ($) => $.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, v.push(h)), h.entries.push(m), h.skipped = !1;
    }
    i.push({ date: l, isPast: l < a, isToday: l === a, slots: v });
  }
  return i;
}
const Be = { class: "move-meal-dialog" }, Ue = { class: "move-meal-subtitle" }, Ee = { class: "move-meal-grid" }, Re = { class: "move-date-col" }, ze = { class: "move-slot-col" }, Fe = {
  key: 0,
  class: "slot-loading"
}, qe = {
  key: 1,
  class: "slot-list",
  role: "radiogroup",
  "aria-label": "Meal slot"
}, Ye = ["data-move-slot", "data-slot-occupied", "aria-checked", "onClick"], je = { class: "slot-option-label" }, Oe = {
  key: 0,
  class: "slot-skipped-note"
}, He = {
  key: 0,
  class: "slot-occupied-dot",
  "aria-label": "Has planned meal",
  title: "Already has a meal"
}, Ge = { class: "cooked-row" }, We = { class: "dialog-actions" }, Xe = /* @__PURE__ */ ee({
  inheritAttrs: !1,
  __name: "MoveMealDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(t, { emit: r }) {
    const e = t, a = r, i = le();
    function l(T) {
      const [p, x, D] = T.split("-").map(Number);
      return new Date(p, x - 1, D, 12, 0, 0);
    }
    function v(T) {
      return `${T.getFullYear()}-${String(T.getMonth() + 1).padStart(2, "0")}-${String(T.getDate()).padStart(2, "0")}`;
    }
    function m(T) {
      return T === e.context.entry.date ? e.context.entry.status === "cooked" : T < ne();
    }
    const d = W(() => e.context.mealType || e.context.entry.meal_type), h = y(l(e.context.entry.date)), $ = W(() => v(h.value || l(e.context.entry.date))), o = y(d.value), n = y(m(e.context.entry.date)), f = y(!1), E = y(!1), M = y(""), N = y([]), B = y([]);
    let w = 0;
    async function u(T) {
      var x, D, q;
      const p = ++w;
      f.value = !0, M.value = "";
      try {
        const F = { from: T, to: T }, [b, C] = await Promise.all([
          i.api.get("/api/x/core-timeline/slots", F),
          i.api.get("/api/timeline", F)
        ]);
        if (p !== w) return;
        const _ = ((x = b == null ? void 0 : b.days) == null ? void 0 : x[T]) || [];
        N.value = _, B.value = Array.isArray(C) ? C : [];
        const A = o.value || d.value, j = A.toLowerCase(), H = _.find((G) => G.id === A) || _.find((G) => G.id.toLowerCase() === j) || _.find((G) => G.label.toLowerCase() === j);
        H ? o.value = H.id : o.value = ((D = _.find((G) => !G.skipped)) == null ? void 0 : D.id) || ((q = _[0]) == null ? void 0 : q.id) || "";
      } catch (F) {
        p === w && (M.value = (F == null ? void 0 : F.message) || "Could not load target day", N.value = [], B.value = []);
      } finally {
        p === w && (f.value = !1);
      }
    }
    me(
      $,
      (T) => {
        n.value = m(T), u(T);
      },
      { immediate: !0 }
    );
    const R = W(() => {
      const T = B.value.filter((D) => D.id !== e.context.entry.id), p = N.value, x = /* @__PURE__ */ new Map();
      for (const D of p) x.set(D.id, []);
      for (const D of T) {
        const q = String(D.meal_type || "").toLowerCase(), F = p.find((b) => b.id.toLowerCase() === q) || p.find((b) => b.label.toLowerCase() === q);
        F && x.get(F.id).push(D);
      }
      return p.map((D) => {
        const q = x.get(D.id) || [], F = q.length ? q.reduce((b, C) => Math.max(b, Number(C.position ?? 0)), 0) + 1 : 0;
        return {
          ...D,
          occupied: q.length > 0,
          nextPosition: F
        };
      });
    }), L = W(() => $.value === e.context.entry.date && o.value.toLowerCase() === d.value.toLowerCase()), z = W(() => {
      var T;
      return ((T = e.context.entry.recipe) == null ? void 0 : T.title) || e.context.entry.title || "Meal";
    });
    async function K() {
      var T;
      if (!(E.value || f.value || !o.value || L.value)) {
        E.value = !0, M.value = "";
        try {
          const p = e.context.entry, x = R.value.find((C) => C.id === o.value), D = n.value ? "cooked" : "planned", q = D === "cooked" && (p.cooked_by_member_id || p.assigned_cook_id || ((T = i.store.currentMember.value) == null ? void 0 : T.id)) || null, F = await i.api.patch(`/api/timeline/${p.id}`, {
            revision: p.revision,
            date: $.value,
            meal_type: o.value,
            position: (x == null ? void 0 : x.nextPosition) ?? 0,
            status: D,
            cooked_by_member_id: q
          });
          if (x != null && x.skipped)
            try {
              await i.api.delete(`/api/x/core-timeline/days/${$.value}/slots/${encodeURIComponent(x.id)}`);
            } catch (C) {
              if ((C == null ? void 0 : C.status) !== 404) throw C;
            }
          const b = (/* @__PURE__ */ new Date(`${$.value}T12:00:00`)).toLocaleDateString(void 0, {
            weekday: "short",
            day: "numeric",
            month: "short"
          });
          i.notify({
            level: "success",
            message: `Moved to ${b} · ${(x == null ? void 0 : x.label) || o.value}`
          }), a("resolve", F);
        } catch (p) {
          M.value = (p == null ? void 0 : p.message) || "Could not move meal";
        } finally {
          E.value = !1;
        }
      }
    }
    return (T, p) => {
      const x = k("Message"), D = k("DatePicker"), q = k("ProgressSpinner"), F = k("ToggleSwitch"), b = k("Button");
      return s(), S("div", Be, [
        g(
          "p",
          Ue,
          Y(z.value),
          1
          /* TEXT */
        ),
        M.value ? (s(), U(x, {
          key: 0,
          severity: "error"
        }, {
          default: P(() => [
            X(
              Y(M.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        g("div", Ee, [
          g("div", Re, [
            p[3] || (p[3] = g(
              "span",
              { class: "field-label" },
              "Day",
              -1
              /* CACHED */
            )),
            c(D, {
              modelValue: h.value,
              "onUpdate:modelValue": p[0] || (p[0] = (C) => h.value = C),
              inline: ""
            }, null, 8, ["modelValue"])
          ]),
          g("div", ze, [
            p[5] || (p[5] = g(
              "span",
              { class: "field-label" },
              "Meal slot",
              -1
              /* CACHED */
            )),
            f.value ? (s(), S("div", Fe, [
              c(q, { style: { width: "1.5rem", height: "1.5rem" } })
            ])) : (s(), S("div", qe, [
              (s(!0), S(
                Q,
                null,
                Z(R.value, (C) => (s(), S("button", {
                  key: C.id,
                  type: "button",
                  class: _e(["slot-option", { "is-selected": o.value === C.id, "is-skipped": C.skipped }]),
                  "data-move-slot": C.id,
                  "data-slot-occupied": String(C.occupied),
                  role: "radio",
                  "aria-checked": o.value === C.id,
                  onClick: (_) => o.value = C.id
                }, [
                  g("span", je, [
                    X(
                      Y(C.label),
                      1
                      /* TEXT */
                    ),
                    C.skipped ? (s(), S("span", Oe, " (skipped)")) : V("v-if", !0)
                  ]),
                  C.occupied ? (s(), S("span", He)) : V("v-if", !0)
                ], 10, Ye))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])),
            g("div", Ge, [
              c(F, {
                inputId: "move-cooked-toggle",
                modelValue: n.value,
                "onUpdate:modelValue": p[1] || (p[1] = (C) => n.value = C)
              }, null, 8, ["modelValue"]),
              p[4] || (p[4] = g(
                "label",
                { for: "move-cooked-toggle" },
                "Mark as cooked",
                -1
                /* CACHED */
              ))
            ])
          ])
        ]),
        g("div", We, [
          c(b, {
            label: "Cancel",
            severity: "secondary",
            disabled: E.value,
            onClick: p[2] || (p[2] = (C) => a("cancel"))
          }, null, 8, ["disabled"]),
          c(b, {
            label: "Move",
            icon: "pi pi-arrow-right-arrow-left",
            loading: E.value,
            disabled: E.value || f.value || !o.value || L.value,
            onClick: K
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), te = (t, r) => {
  const e = t.__vccOpts || t;
  for (const [a, i] of r)
    e[a] = i;
  return e;
}, Qe = /* @__PURE__ */ te(Xe, [["__scopeId", "data-v-a7a6faf6"]]), Ce = 2, pe = 0, ye = 30, xe = 7, fe = 1, ge = 60;
function ke() {
  return {
    default_past_days: Ce,
    default_planning_days: xe
  };
}
function he(t, r, e, a) {
  return typeof t != "number" || !Number.isInteger(t) ? r : Math.max(e, Math.min(a, t));
}
function ve(t) {
  const r = ke();
  if (!t || typeof t != "object") return r;
  const e = t;
  return {
    default_past_days: he(e.default_past_days, r.default_past_days, pe, ye),
    default_planning_days: he(
      e.default_planning_days,
      r.default_planning_days,
      fe,
      ge
    )
  };
}
function ce(t, r) {
  return {
    from: O(t, -r.default_past_days),
    to: O(t, r.default_planning_days - 1)
  };
}
async function be(t) {
  try {
    const r = await t.api.get("/api/x/core-timeline/settings");
    return ve(r);
  } catch {
    return ke();
  }
}
const Je = {
  key: 0,
  class: "plugin-inline-settings"
}, Ke = { class: "settings-grid" }, Ze = { class: "settings-actions" }, et = /* @__PURE__ */ ee({
  inheritAttrs: !1,
  __name: "TimelinePluginSettings",
  props: {
    context: {}
  },
  setup(t) {
    const r = le(), e = y(!1), a = y(!1), i = y(!1), l = y(""), v = y(String(Ce)), m = y(String(xe));
    function d(o, n, f, E) {
      const M = String(o ?? "").trim();
      if (!/^-?\d+$/.test(M))
        throw new Error(`${n} must be a whole number between ${f} and ${E}.`);
      const N = Number(M);
      if (!Number.isInteger(N) || N < f || N > E)
        throw new Error(`${n} must be between ${f} and ${E}.`);
      return N;
    }
    async function h() {
      a.value = !0, l.value = "";
      try {
        const o = ve(await r.api.get("/api/x/core-timeline/settings"));
        v.value = String(o.default_past_days), m.value = String(o.default_planning_days);
      } catch (o) {
        l.value = (o == null ? void 0 : o.message) || "Failed to load timeline settings";
      } finally {
        a.value = !1;
      }
    }
    me(e, (o) => {
      o && h();
    });
    async function $() {
      if (i.value) return;
      l.value = "";
      let o, n;
      try {
        o = d(v.value, "Default past days", pe, ye), n = d(
          m.value,
          "Default planning days (including Today)",
          fe,
          ge
        );
      } catch (f) {
        l.value = f.message;
        return;
      }
      i.value = !0;
      try {
        const f = ve(
          await r.api.put("/api/x/core-timeline/settings", {
            default_past_days: o,
            default_planning_days: n
          })
        );
        v.value = String(f.default_past_days), m.value = String(f.default_planning_days), r.notify({ level: "success", message: "Timeline settings updated." });
      } catch (f) {
        l.value = (f == null ? void 0 : f.message) || "Failed to save timeline settings";
      } finally {
        i.value = !1;
      }
    }
    return (o, n) => {
      var N, B, w, u, R, L;
      const f = k("Button"), E = k("Message"), M = k("InputText");
      return ((B = (N = t.context) == null ? void 0 : N.plugin) == null ? void 0 : B.id) === "core-timeline" ? (s(), S(
        Q,
        { key: 0 },
        [
          c(f, {
            label: e.value ? "Close Settings" : "Settings",
            icon: e.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !e.value,
            disabled: ((u = (w = t.context) == null ? void 0 : w.plugin) == null ? void 0 : u.state) !== "active",
            class: "btn-timeline-settings-toggle",
            onClick: n[0] || (n[0] = (z) => e.value = !e.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          e.value && ((L = (R = t.context) == null ? void 0 : R.plugin) == null ? void 0 : L.state) === "active" ? (s(), S("div", Je, [
            l.value ? (s(), U(E, {
              key: 0,
              severity: "error"
            }, {
              default: P(() => [
                X(
                  Y(l.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : V("v-if", !0),
            g("div", Ke, [
              g("div", null, [
                n[3] || (n[3] = g(
                  "label",
                  { for: "timeline-default-past-days" },
                  "Default past days",
                  -1
                  /* CACHED */
                )),
                c(M, {
                  id: "timeline-default-past-days",
                  modelValue: v.value,
                  "onUpdate:modelValue": n[1] || (n[1] = (z) => v.value = z),
                  type: "number",
                  min: J(pe),
                  max: J(ye),
                  step: "1",
                  disabled: a.value || i.value,
                  fluid: ""
                }, null, 8, ["modelValue", "min", "max", "disabled"]),
                n[4] || (n[4] = g(
                  "small",
                  null,
                  "Collapsed past days shown above Today (0–30).",
                  -1
                  /* CACHED */
                ))
              ]),
              g("div", null, [
                n[5] || (n[5] = g(
                  "label",
                  { for: "timeline-default-planning-days" },
                  "Default planning days (including Today)",
                  -1
                  /* CACHED */
                )),
                c(M, {
                  id: "timeline-default-planning-days",
                  modelValue: m.value,
                  "onUpdate:modelValue": n[2] || (n[2] = (z) => m.value = z),
                  type: "number",
                  min: J(fe),
                  max: J(ge),
                  step: "1",
                  disabled: a.value || i.value,
                  fluid: ""
                }, null, 8, ["modelValue", "min", "max", "disabled"]),
                n[6] || (n[6] = g(
                  "small",
                  null,
                  "Today plus upcoming days shown by default (1–60).",
                  -1
                  /* CACHED */
                ))
              ])
            ]),
            g("div", Ze, [
              c(f, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: i.value,
                disabled: a.value,
                onClick: $
              }, null, 8, ["loading", "disabled"])
            ])
          ])) : V("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : V("v-if", !0);
    };
  }
}), tt = /* @__PURE__ */ te(et, [["__scopeId", "data-v-e5e51827"]]), at = { class: "card-header" }, nt = { class: "card-title" }, lt = ["aria-label"], it = {
  key: 0,
  class: "card-servings"
}, ot = {
  key: 1,
  class: "card-note"
}, st = /* @__PURE__ */ ee({
  __name: "TimelineCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: r }) {
    function e(i) {
      return (/* @__PURE__ */ new Date(`${i}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const a = r;
    return (i, l) => {
      const v = k("Button"), m = we("tooltip");
      return s(), S("div", {
        class: "timeline-card",
        onClick: l[1] || (l[1] = (d) => a("interact", d))
      }, [
        c(v, {
          class: "timeline-card-main",
          variant: "text"
        }, {
          default: P(() => {
            var d;
            return [
              g("div", at, [
                g(
                  "span",
                  nt,
                  Y(((d = t.entry.recipe) == null ? void 0 : d.title) || t.entry.title || "Planned Meal"),
                  1
                  /* TEXT */
                ),
                t.entry.origin === "plugin:core-recurring" ? Te((s(), S("i", {
                  key: 0,
                  class: "pi pi-replay",
                  "aria-label": `Repeats every ${e(t.entry.date)}`
                }, null, 8, lt)), [
                  [m, `Repeats every ${e(t.entry.date)}`]
                ]) : V("v-if", !0),
                c(J(ie), {
                  name: "timeline.entry.badge",
                  context: { entry: t.entry }
                }, null, 8, ["context"])
              ]),
              t.entry.servings_override ? (s(), S(
                "div",
                it,
                Y(t.entry.servings_override) + " servings",
                1
                /* TEXT */
              )) : V("v-if", !0),
              t.entry.note ? (s(), S(
                "div",
                ot,
                Y(t.entry.note),
                1
                /* TEXT */
              )) : V("v-if", !0)
            ];
          }),
          _: 1
          /* STABLE */
        }),
        t.entry.status === "cooked" ? (s(), S("div", {
          key: 0,
          class: "card-footer",
          onClick: l[0] || (l[0] = Se(() => {
          }, ["stop"]))
        }, [
          c(J(ie), {
            name: "timeline.entry.footer",
            context: { entry: t.entry }
          }, null, 8, ["context"])
        ])) : V("v-if", !0)
      ]);
    };
  }
}), dt = /* @__PURE__ */ te(st, [["__scopeId", "data-v-e23d9a02"]]), rt = ["data-slot-id"], ut = { class: "slot-header" }, ct = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, vt = {
  key: 1,
  class: "skipped-row"
}, mt = /* @__PURE__ */ ee({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: r }) {
    const e = t, a = r, i = le(), l = y(), v = y(""), m = y(!1);
    function d() {
      a("add", { date: e.date, mealType: e.slot.id });
    }
    async function h(o) {
      if (!m.value) {
        m.value = !0, v.value = "";
        try {
          if (o === "remove" && e.slot.entries.length && !await i.confirm({ header: "Remove slot", message: `Remove ${e.slot.label} and its ${e.slot.entries.length} planned meal${e.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const n = `/api/x/core-timeline/days/${e.date}/slots/${encodeURIComponent(e.slot.id)}`;
          o === "skip" ? await i.api.put(n, { kind: "skip" }) : await i.api.delete(n, o === "remove" ? { with_entries: "true" } : void 0), a("changed");
        } catch (n) {
          v.value = n.message || "Could not change slot";
        } finally {
          m.value = !1;
        }
      }
    }
    const $ = W(() => [{ label: "Add another meal", icon: "pi pi-plus", command: d }, ...e.slot.kind === "default" && !e.slot.entries.length ? [{ label: "Skip on this day", command: () => h("skip") }] : [], ...e.slot.kind === "extra" && !e.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => h("remove") }] : []]);
    return (o, n) => {
      const f = k("Button"), E = k("Menu"), M = k("Message"), N = we("tooltip");
      return s(), S("div", {
        class: "meal-slot",
        "data-slot-id": t.slot.id
      }, [
        g("div", ut, [
          g(
            "span",
            {
              class: _e(["slot-name", { skipped: t.slot.skipped }])
            },
            [
              X(
                Y(t.slot.label) + " ",
                1
                /* TEXT */
              ),
              t.slot.kind === "extra" ? Te((s(), S(
                "i",
                ct,
                null,
                512
                /* NEED_PATCH */
              )), [
                [N, "Only on this day"]
              ]) : V("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          t.slot.skipped ? V("v-if", !0) : (s(), U(f, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: m.value,
            onClick: n[0] || (n[0] = (B) => l.value.toggle(B))
          }, null, 8, ["disabled"])),
          c(E, {
            ref_key: "menu",
            ref: l,
            model: $.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        v.value ? (s(), U(M, {
          key: 0,
          severity: "error"
        }, {
          default: P(() => [
            X(
              Y(v.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        t.slot.skipped ? (s(), S("div", vt, [
          n[3] || (n[3] = g(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          c(f, {
            label: "Undo",
            size: "small",
            text: "",
            loading: m.value,
            onClick: n[1] || (n[1] = (B) => h("undo"))
          }, null, 8, ["loading"])
        ])) : (s(), S(
          Q,
          { key: 2 },
          [
            (s(!0), S(
              Q,
              null,
              Z(t.slot.entries, (B) => (s(), U(J(Pe), {
                key: B.id,
                hub: "entry:interact",
                context: { entry: B, mealType: t.slot.id },
                onResolve: n[2] || (n[2] = (w) => a("changed"))
              }, {
                default: P(({ open: w }) => [
                  c(dt, {
                    entry: B,
                    onInteract: w
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            c(J(ie), {
              name: "timeline.slot.suggestions",
              context: { date: t.date, slot: t.slot, onChanged: () => a("changed") }
            }, null, 8, ["context"]),
            t.slot.entries.length ? V("v-if", !0) : (s(), U(f, {
              key: 0,
              class: "empty-slot-btn",
              icon: "pi pi-plus",
              size: "small",
              text: "",
              "aria-label": "Add meal",
              onClick: d
            }))
          ],
          64
          /* STABLE_FRAGMENT */
        ))
      ], 8, rt);
    };
  }
}), pt = /* @__PURE__ */ te(mt, [["__scopeId", "data-v-7bb29b64"]]);
function yt(t, r) {
  const e = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", a = new Set(r);
  let i = e.slice(0, 64).replace(/-+$/g, "");
  for (let l = 2; a.has(i); l++) {
    const v = `-${l}`;
    i = e.slice(0, 64 - v.length).replace(/-+$/g, "") + v;
  }
  return i;
}
const ft = /* @__PURE__ */ ee({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(t, { emit: r }) {
    const e = t, a = r, i = le(), l = y(""), v = y(null), m = y(!1), d = y(""), h = W(() => [{ label: "At the end", value: null }, ...e.slots.filter((o) => o.kind === "default").map((o) => ({ label: `Before ${o.label}`, value: o.id }))]);
    me(() => e.visible, (o) => {
      o && (l.value = "", v.value = null, d.value = "");
    });
    async function $() {
      if (!(!l.value.trim() || m.value)) {
        m.value = !0, d.value = "";
        try {
          const o = yt(l.value, [...e.slots.map((n) => n.id), ...i.store.household.value.meal_types.map((n) => n.id)]);
          await i.api.put(`/api/x/core-timeline/days/${e.date}/slots/${o}`, { kind: "extra", label: l.value.trim(), before: v.value }), a("changed"), a("update:visible", !1);
        } catch (o) {
          d.value = o.message || "Could not add slot";
        } finally {
          m.value = !1;
        }
      }
    }
    return (o, n) => {
      const f = k("Message"), E = k("InputText"), M = k("Select"), N = k("Button"), B = k("Dialog");
      return s(), U(B, {
        visible: t.visible,
        "onUpdate:visible": n[2] || (n[2] = (w) => a("update:visible", w)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: P(() => [
          g(
            "form",
            {
              onSubmit: Se($, ["prevent"])
            },
            [
              d.value ? (s(), U(f, {
                key: 0,
                severity: "error"
              }, {
                default: P(() => [
                  X(
                    Y(d.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : V("v-if", !0),
              n[3] || (n[3] = g(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              c(E, {
                id: "extra-slot-name",
                modelValue: l.value,
                "onUpdate:modelValue": n[0] || (n[0] = (w) => l.value = w),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              n[4] || (n[4] = g(
                "label",
                { for: "extra-slot-position" },
                "Position",
                -1
                /* CACHED */
              )),
              c(M, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: v.value,
                "onUpdate:modelValue": n[1] || (n[1] = (w) => v.value = w),
                options: h.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              c(N, {
                label: "Add slot",
                type: "submit",
                loading: m.value,
                disabled: !l.value.trim()
              }, null, 8, ["loading", "disabled"])
            ],
            32
            /* NEED_HYDRATION */
          )
        ]),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), gt = /* @__PURE__ */ te(ft, [["__scopeId", "data-v-8c53feab"]]), bt = ["data-timeline-date"], _t = /* @__PURE__ */ ee({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: r }) {
    const e = r, a = y(), i = y(!1), l = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      i.value = !0;
    } }];
    function v(m) {
      return (/* @__PURE__ */ new Date(`${m}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (m, d) => {
      const h = k("Tag"), $ = k("Button"), o = k("Menu");
      return s(), S("section", {
        class: _e(["day-card", { "is-today": t.day.isToday }]),
        "data-timeline-date": t.day.date
      }, [
        g("header", null, [
          g(
            "h3",
            null,
            Y(v(t.day.date)),
            1
            /* TEXT */
          ),
          t.day.isToday ? (s(), U(h, {
            key: 0,
            value: "Today"
          })) : V("v-if", !0),
          c($, {
            icon: "pi pi-ellipsis-v",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: d[0] || (d[0] = (n) => a.value.toggle(n))
          }),
          c(
            o,
            {
              ref_key: "menu",
              ref: a,
              model: l,
              popup: ""
            },
            null,
            512
            /* NEED_PATCH */
          )
        ]),
        (s(!0), S(
          Q,
          null,
          Z(t.day.slots, (n) => (s(), U(pt, {
            key: n.id,
            slot: n,
            date: t.day.date,
            onAdd: d[1] || (d[1] = (f) => e("add", f)),
            onChanged: d[2] || (d[2] = (f) => e("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        c(J(ie), {
          name: "timeline.day.footer",
          context: { date: t.day.date }
        }, null, 8, ["context"]),
        c(gt, {
          visible: i.value,
          "onUpdate:visible": d[3] || (d[3] = (n) => i.value = n),
          date: t.day.date,
          slots: t.day.slots,
          onChanged: d[4] || (d[4] = (n) => e("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, bt);
    };
  }
}), $e = /* @__PURE__ */ te(_t, [["__scopeId", "data-v-1b485257"]]), kt = { class: "add-entry" }, ht = { key: 0 }, $t = { class: "quick-notes" }, wt = /* @__PURE__ */ ee({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(t, { emit: r }) {
    const e = t, a = r, i = ["Dining out", "Leftovers", "Takeout", "Quick meal"], l = le(), v = y("recipes"), m = y(""), d = y([]), h = y([]), $ = y(""), o = y(2), n = y(!1), f = y(""), E = W(() => {
      var L, z;
      const u = (((L = l.store.household.value) == null ? void 0 : L.meal_types) || []).find(
        (K) => {
          var T, p, x, D;
          return K.id === e.mealType || ((T = K.id) == null ? void 0 : T.toLowerCase()) === ((p = e.mealType) == null ? void 0 : p.toLowerCase()) || ((x = K.label) == null ? void 0 : x.toLowerCase()) === ((D = e.mealType) == null ? void 0 : D.toLowerCase());
        }
      );
      if (u && Array.isArray(u.predefined_notes))
        return u.predefined_notes;
      const R = (z = l.store.household.value) == null ? void 0 : z.predefined_notes;
      return Array.isArray(R) ? R : i;
    });
    let M = 0;
    async function N() {
      const w = ++M;
      try {
        const u = await l.api.get("/api/recipes", { q: m.value });
        w === M && (d.value = u.items);
      } catch (u) {
        w === M && (f.value = u.message);
      }
    }
    me(() => e.visible, async (w) => {
      if (!w) {
        ++M;
        return;
      }
      v.value = "recipes", m.value = "", $.value = "", o.value = 2, f.value = "", d.value = [], await N();
      try {
        h.value = await l.api.get("/api/x/core-shortlist");
      } catch {
        h.value = [];
      }
    });
    async function B(w) {
      var L;
      if (n.value || !w && !$.value.trim()) return;
      n.value = !0, f.value = "";
      const u = e.date < ne(), R = u ? "cooked" : "planned";
      try {
        const z = await l.api.post("/api/timeline", { date: e.date, meal_type: e.mealType, entry_type: w ? "recipe" : "note", ...w ? { recipe_id: w } : { title: $.value }, servings_override: o.value, status: R, ...u && ((L = l.store.currentMember.value) != null && L.id) ? { cooked_by_member_id: l.store.currentMember.value.id } : {} });
        a("created", z), a("update:visible", !1);
      } catch (z) {
        f.value = z.message || "Could not add meal";
      } finally {
        n.value = !1;
      }
    }
    return (w, u) => {
      const R = k("Message"), L = k("InputNumber"), z = k("Tab"), K = k("TabList"), T = k("InputText"), p = k("Button"), x = k("TabPanel"), D = k("TabPanels"), q = k("Tabs"), F = k("Dialog");
      return s(), U(F, {
        visible: t.visible,
        "onUpdate:visible": u[5] || (u[5] = (b) => a("update:visible", b)),
        header: `Add meal · ${t.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: P(() => [
          g("div", kt, [
            f.value ? (s(), U(R, {
              key: 0,
              severity: "error"
            }, {
              default: P(() => [
                X(
                  Y(f.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : V("v-if", !0),
            u[11] || (u[11] = g(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            c(L, {
              inputId: "entry-servings",
              modelValue: o.value,
              "onUpdate:modelValue": u[0] || (u[0] = (b) => o.value = b),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            c(q, {
              value: v.value,
              "onUpdate:value": u[4] || (u[4] = (b) => v.value = b)
            }, {
              default: P(() => [
                c(K, null, {
                  default: P(() => [
                    c(z, { value: "recipes" }, {
                      default: P(() => [...u[6] || (u[6] = [
                        X(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    c(z, { value: "shortlist" }, {
                      default: P(() => [...u[7] || (u[7] = [
                        X(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    c(z, { value: "note" }, {
                      default: P(() => [...u[8] || (u[8] = [
                        X(
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
                c(D, null, {
                  default: P(() => [
                    c(x, { value: "recipes" }, {
                      default: P(() => [
                        u[9] || (u[9] = g(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        c(T, {
                          id: "entry-recipe-search",
                          modelValue: m.value,
                          "onUpdate:modelValue": u[1] || (u[1] = (b) => m.value = b),
                          onInput: N,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (s(!0), S(
                          Q,
                          null,
                          Z(d.value, (b) => (s(), S("div", {
                            key: b.id,
                            class: "recipe-result"
                          }, [
                            g(
                              "span",
                              null,
                              Y(b.title),
                              1
                              /* TEXT */
                            ),
                            c(p, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (C) => B(b.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    c(x, { value: "shortlist" }, {
                      default: P(() => [
                        h.value.length ? V("v-if", !0) : (s(), S("p", ht, "No recipes in shortlist")),
                        (s(!0), S(
                          Q,
                          null,
                          Z(h.value, (b) => (s(), S("div", {
                            key: b.recipe_id,
                            class: "recipe-result"
                          }, [
                            g(
                              "span",
                              null,
                              Y(b.recipe_title),
                              1
                              /* TEXT */
                            ),
                            c(p, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (C) => B(b.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    c(x, { value: "note" }, {
                      default: P(() => [
                        u[10] || (u[10] = g(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        c(T, {
                          id: "entry-note",
                          modelValue: $.value,
                          "onUpdate:modelValue": u[2] || (u[2] = (b) => $.value = b),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        g("div", $t, [
                          (s(!0), S(
                            Q,
                            null,
                            Z(E.value, (b) => (s(), U(p, {
                              key: b,
                              label: b,
                              outlined: "",
                              size: "small",
                              onClick: (C) => $.value = b
                            }, null, 8, ["label", "onClick"]))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        c(p, {
                          label: "Add meal",
                          loading: n.value,
                          disabled: !$.value.trim(),
                          onClick: u[3] || (u[3] = (b) => B())
                        }, null, 8, ["loading", "disabled"])
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
          ])
        ]),
        _: 1
        /* STABLE */
      }, 8, ["visible", "header"]);
    };
  }
}), Tt = /* @__PURE__ */ te(wt, [["__scopeId", "data-v-23ac8af0"]]), St = { class: "timeline-page" }, Ct = { class: "timeline-toolbar" }, xt = { class: "timeline-container" }, Dt = { class: "timeline-sidebar-wrapper" }, Mt = { class: "timeline-feed" }, At = {
  key: 0,
  class: "past-days"
}, It = ["data-timeline-date"], Lt = /* @__PURE__ */ ee({
  __name: "TimelinePage",
  setup(t) {
    const r = le(), e = y(ne()), a = y(ke()), i = y(ce(e.value, a.value)), l = y(!1), v = y([]), m = y({}), d = y(""), h = y(/* @__PURE__ */ new Set()), $ = y(null), o = y(window.innerWidth < 768), n = y([]), f = De("__SS_SLOT_REGISTRY__"), E = W(() => (f == null ? void 0 : f.getContributions("timeline.sidebar")) || []), M = W(() => Ne(i.value, m.value, v.value, e.value)), N = W(() => M.value.filter((_) => _.isPast)), B = W(() => M.value.filter((_) => !_.isPast));
    let w = 0, u, R = !1;
    async function L() {
      clearTimeout(u);
      const _ = ++w, { from: A, to: j } = i.value;
      d.value = "";
      try {
        const H = [], G = {};
        for (let ae = A; ae <= j; ) {
          const oe = O(ae, 62) < j ? O(ae, 62) : j, se = { from: ae, to: oe }, [de, re] = await Promise.all([r.api.get("/api/timeline", se), r.api.get("/api/x/core-timeline/slots", se)]);
          if (_ !== w || R) return;
          H.push(...de), Object.assign(G, re.days), ae = O(oe, 1);
        }
        v.value = H, m.value = G;
      } catch (H) {
        _ === w && !R && (d.value = H.message || "Could not load Timeline");
      }
    }
    function z() {
      clearTimeout(u), u = setTimeout(L, 300);
    }
    const K = [
      ...["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:slots-changed", "recipe:deleted"].map((_) => r.on(_, z)),
      r.on("core-timeline:settings-changed", (_) => {
        const A = ve((_ == null ? void 0 : _.data) ?? _);
        a.value = A, !l.value && !R && (e.value = ne(), i.value = ce(e.value, A), L());
      })
    ];
    function T() {
      o.value = window.innerWidth < 768;
    }
    function p() {
      l.value = !0, i.value = { ...i.value, from: O(i.value.from, -4) }, L();
    }
    function x() {
      l.value = !0, i.value = { ...i.value, to: O(i.value.to, 5) }, L();
    }
    async function D() {
      var _, A;
      l.value = !1, e.value = ne(), a.value = await be(r), !R && (i.value = ce(e.value, a.value), h.value.clear(), await L(), await Le(), (A = (_ = document.querySelector(".day-card.is-today")) == null ? void 0 : _.scrollIntoView) == null || A.call(_, { block: "start", behavior: "smooth" }));
    }
    function q(_) {
      h.value.has(_) ? h.value.delete(_) : h.value.add(_);
    }
    function F(_) {
      return (/* @__PURE__ */ new Date(`${_}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function b(_) {
      return _.slots.flatMap((A) => A.entries.map((j) => {
        var H;
        return `${j.status === "cooked" ? "✓ " : ""}${A.label.toUpperCase()} ${((H = j.recipe) == null ? void 0 : H.title) || j.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    async function C() {
      a.value = await be(r), !R && (e.value = ne(), i.value = ce(e.value, a.value), await L());
    }
    return Me(() => {
      C(), window.addEventListener("resize", T);
    }), Ae(() => {
      R = !0, ++w, clearTimeout(u), K.forEach((_) => {
        typeof _ == "function" && _();
      }), window.removeEventListener("resize", T);
    }), (_, A) => {
      var de, re;
      const j = k("Button"), H = k("Message"), G = k("AccordionHeader"), ae = k("AccordionContent"), oe = k("AccordionPanel"), se = k("Accordion");
      return s(), S("div", St, [
        g("div", Ct, [
          A[4] || (A[4] = g(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          c(j, {
            label: "Today",
            icon: "pi pi-calendar",
            size: "small",
            outlined: "",
            onClick: D
          })
        ]),
        d.value ? (s(), U(H, {
          key: 0,
          severity: "error"
        }, {
          default: P(() => [
            X(
              Y(d.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        g("div", xt, [
          g("aside", Dt, [
            o.value ? (s(), U(se, {
              key: 0,
              value: n.value,
              "onUpdate:value": A[0] || (A[0] = (I) => n.value = I),
              multiple: ""
            }, {
              default: P(() => [
                (s(!0), S(
                  Q,
                  null,
                  Z(E.value, (I) => (s(), U(oe, {
                    key: I.id,
                    value: I.id
                  }, {
                    default: P(() => [
                      c(
                        G,
                        null,
                        {
                          default: P(() => [
                            X(
                              Y(I.pluginId === "core-shortlist" ? "Shortlist" : I.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : I.pluginId === "core-recurring" ? "Recurring meals" : I.pluginId),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 2
                          /* DYNAMIC */
                        },
                        1024
                        /* DYNAMIC_SLOTS */
                      ),
                      c(
                        ae,
                        null,
                        {
                          default: P(() => [
                            (s(), U(Ie(I.component), { context: i.value }, null, 8, ["context"]))
                          ]),
                          _: 2
                          /* DYNAMIC */
                        },
                        1024
                        /* DYNAMIC_SLOTS */
                      )
                    ]),
                    _: 2
                    /* DYNAMIC */
                  }, 1032, ["value"]))),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ]),
              _: 1
              /* STABLE */
            }, 8, ["value"])) : (s(), U(J(ie), {
              key: 1,
              name: "timeline.sidebar",
              context: i.value
            }, null, 8, ["context"]))
          ]),
          g("div", Mt, [
            c(j, {
              label: "Show 4 earlier days",
              size: "small",
              text: "",
              onClick: p
            }),
            N.value.length ? (s(), S("div", At, [
              (s(!0), S(
                Q,
                null,
                Z(N.value, (I) => (s(), S("div", {
                  key: I.date,
                  "data-timeline-date": h.value.has(I.date) ? void 0 : I.date
                }, [
                  c(j, {
                    class: "past-day-line",
                    label: `${F(I.date)} · ${b(I)}`,
                    size: "small",
                    text: "",
                    "aria-expanded": h.value.has(I.date),
                    onClick: (ue) => q(I.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  h.value.has(I.date) ? (s(), U($e, {
                    key: 0,
                    day: I,
                    onAdd: A[1] || (A[1] = (ue) => $.value = ue),
                    onChanged: L
                  }, null, 8, ["day"])) : V("v-if", !0)
                ], 8, It))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : V("v-if", !0),
            (s(!0), S(
              Q,
              null,
              Z(B.value, (I) => (s(), U($e, {
                key: I.date,
                day: I,
                onAdd: A[2] || (A[2] = (ue) => $.value = ue),
                onChanged: L
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            c(j, {
              label: "Show 5 more days",
              size: "small",
              outlined: "",
              onClick: x
            })
          ])
        ]),
        c(Tt, {
          visible: !!$.value,
          date: ((de = $.value) == null ? void 0 : de.date) || e.value,
          mealType: ((re = $.value) == null ? void 0 : re.mealType) || "",
          "onUpdate:visible": A[3] || (A[3] = (I) => {
            I || ($.value = null);
          }),
          onCreated: L
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Pt = /* @__PURE__ */ te(Lt, [["__scopeId", "data-v-708c3315"]]);
function Bt(t) {
  t.route({ path: "/timeline", component: Pt, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.slot("timeline.entry.badge", Ve, { order: 10 }), t.slot("plugin_manager.plugin.actions", tt, { order: 10 }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
    hub: "entry:interact",
    id: "view-recipe",
    title: "View recipe",
    icon: "book",
    order: 10,
    kind: "headless",
    isAvailable: (e) => {
      var a;
      return !!((a = e == null ? void 0 : e.entry) != null && a.recipe_id);
    },
    execute: (e) => t.navigate(`/recipes/${e.entry.recipe_id}`)
  }), t.intent.provider({
    hub: "entry:interact",
    id: "toggle-cooked",
    title: "Mark as cooked",
    titleFor: (e) => {
      var a;
      return ((a = e == null ? void 0 : e.entry) == null ? void 0 : a.status) === "cooked" ? "Unmark as cooked" : "Mark as cooked";
    },
    icon: "check",
    iconFor: (e) => {
      var a;
      return ((a = e == null ? void 0 : e.entry) == null ? void 0 : a.status) === "cooked" ? "undo" : "check";
    },
    order: 20,
    kind: "headless",
    isAvailable: (e) => !!(e != null && e.entry),
    execute: async (e) => {
      var i;
      const a = e.entry;
      if (a.status === "cooked")
        await t.outbox.enqueue({
          method: "PATCH",
          path: `/api/timeline/${a.id}`,
          body: { revision: a.revision, status: "planned", cooked_by_member_id: null }
        }), a.status = "planned", a.cooked_by_member_id = null, a.revision = (a.revision || 1) + 1, t.notify({ level: "info", message: "Meal unmarked as cooked" });
      else {
        const l = a.assigned_cook_id || ((i = t.store.currentMember.value) == null ? void 0 : i.id) || null;
        await t.outbox.enqueue({
          method: "PATCH",
          path: `/api/timeline/${a.id}`,
          body: { revision: a.revision, status: "cooked", cooked_by_member_id: l }
        }), a.status = "cooked", a.cooked_by_member_id = l, a.revision = (a.revision || 1) + 1, t.notify({ level: "success", message: "Meal marked as cooked!" });
      }
    }
  }), t.intent.provider({
    hub: "entry:interact",
    id: "move",
    title: "Move meal",
    icon: "arrow-right-arrow-left",
    order: 30,
    kind: "ui",
    component: Qe,
    isAvailable: (e) => !!(e != null && e.entry)
  }), t.intent.provider({
    hub: "entry:interact",
    id: "remove",
    title: "Remove from plan",
    icon: "trash",
    order: 999,
    kind: "headless",
    execute: async (e) => {
      const a = e == null ? void 0 : e.entry;
      !a || !await t.confirm({ header: "Remove meal", message: "Remove this meal from the plan?", acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }) || (await t.api.delete(`/api/timeline/${a.id}?revision=${a.revision}`), t.notify({ level: "success", message: "Meal removed from plan" }));
    }
  });
  const r = async () => {
    try {
      const e = ne(), a = await be(t), i = O(e, -a.default_past_days), l = O(e, Math.max(a.default_planning_days - 1, 14));
      for (let v = i; v <= l; ) {
        const m = O(v, 62) < l ? O(v, 62) : l, d = await t.api.get(`/api/timeline?from=${v}&to=${m}`);
        for (const h of d) h.recipe_id && t.api.get(`/api/recipes/${h.recipe_id}`).catch(() => {
        });
        v = O(m, 1);
      }
    } catch {
    }
  };
  r();
  for (const e of ["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:settings-changed"]) t.on(e, r);
}
export {
  Bt as default
};
