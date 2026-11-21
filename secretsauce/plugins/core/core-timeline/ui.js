import { defineComponent as ee, resolveComponent as k, openBlock as o, createBlock as B, createCommentVNode as P, computed as X, ref as y, watch as me, createElementBlock as w, createElementVNode as f, toDisplayString as Y, withCtx as V, createTextVNode as H, createVNode as c, Fragment as Q, renderList as Z, normalizeClass as _e, unref as J, resolveDirective as we, withDirectives as Te, withModifiers as Se, inject as De, onMounted as Me, onBeforeUnmount as Ae, resolveDynamicComponent as Ie, nextTick as Le } from "vue";
import { useSecretSauce as le, Slot as ie, IntentTrigger as Pe } from "@secretsauce/ui";
const Ve = /* @__PURE__ */ ee({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(t) {
    return (d, e) => {
      var i, l;
      const a = k("Tag");
      return ((l = (i = t.context) == null ? void 0 : i.entry) == null ? void 0 : l.status) === "cooked" ? (o(), B(a, {
        key: 0,
        value: "Cooked",
        icon: "pi pi-check",
        severity: "success",
        title: "Cooked"
      })) : P("v-if", !0);
    };
  }
});
function ne() {
  const t = /* @__PURE__ */ new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function O(t, d) {
  const e = /* @__PURE__ */ new Date(`${t}T12:00:00`);
  return e.setDate(e.getDate() + d), `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Ne(t, d, e, a) {
  const i = [];
  for (let l = t.from; l <= t.to; l = O(l, 1)) {
    const m = (d[l] || []).map((v) => ({ ...v, entries: [] }));
    for (const v of e.filter((u) => u.date === l)) {
      const u = v.meal_type.toLowerCase();
      let h = m.find(($) => $.id.toLowerCase() === u) || m.find(($) => $.label.toLowerCase() === u);
      h || (h = { id: v.meal_type, label: v.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, ($) => $.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, m.push(h)), h.entries.push(v), h.skipped = !1;
    }
    i.push({ date: l, isPast: l < a, isToday: l === a, slots: m });
  }
  return i;
}
const Ue = { class: "move-meal-dialog" }, Be = { class: "move-meal-subtitle" }, Ee = { class: "move-meal-grid" }, Re = { class: "move-date-col" }, ze = { class: "move-slot-col" }, Fe = {
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
  setup(t, { emit: d }) {
    const e = t, a = d, i = le();
    function l(S) {
      const [p, x, D] = S.split("-").map(Number);
      return new Date(p, x - 1, D, 12, 0, 0);
    }
    function m(S) {
      return `${S.getFullYear()}-${String(S.getMonth() + 1).padStart(2, "0")}-${String(S.getDate()).padStart(2, "0")}`;
    }
    function v(S) {
      return S === e.context.entry.date ? e.context.entry.status === "cooked" : S < ne();
    }
    const u = X(() => e.context.mealType || e.context.entry.meal_type), h = y(l(e.context.entry.date)), $ = X(() => m(h.value || l(e.context.entry.date))), s = y(u.value), n = y(v(e.context.entry.date)), g = y(!1), E = y(!1), M = y(""), N = y([]), U = y([]);
    let T = 0;
    async function r(S) {
      var x, D, q;
      const p = ++T;
      g.value = !0, M.value = "";
      try {
        const F = { from: S, to: S }, [b, C] = await Promise.all([
          i.api.get("/api/x/core-timeline/slots", F),
          i.api.get("/api/timeline", F)
        ]);
        if (p !== T) return;
        const _ = ((x = b == null ? void 0 : b.days) == null ? void 0 : x[S]) || [];
        N.value = _, U.value = Array.isArray(C) ? C : [];
        const A = s.value || u.value, j = A.toLowerCase(), G = _.find((W) => W.id === A) || _.find((W) => W.id.toLowerCase() === j) || _.find((W) => W.label.toLowerCase() === j);
        G ? s.value = G.id : s.value = ((D = _.find((W) => !W.skipped)) == null ? void 0 : D.id) || ((q = _[0]) == null ? void 0 : q.id) || "";
      } catch (F) {
        p === T && (M.value = (F == null ? void 0 : F.message) || "Could not load target day", N.value = [], U.value = []);
      } finally {
        p === T && (g.value = !1);
      }
    }
    me(
      $,
      (S) => {
        n.value = v(S), r(S);
      },
      { immediate: !0 }
    );
    const R = X(() => {
      const S = U.value.filter((D) => D.id !== e.context.entry.id), p = N.value, x = /* @__PURE__ */ new Map();
      for (const D of p) x.set(D.id, []);
      for (const D of S) {
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
    }), L = X(() => $.value === e.context.entry.date && s.value.toLowerCase() === u.value.toLowerCase()), z = X(() => {
      var S;
      return ((S = e.context.entry.recipe) == null ? void 0 : S.title) || e.context.entry.title || "Meal";
    });
    async function K() {
      var S;
      if (!(E.value || g.value || !s.value || L.value)) {
        E.value = !0, M.value = "";
        try {
          const p = e.context.entry, x = R.value.find((C) => C.id === s.value), D = n.value ? "cooked" : "planned", q = D === "cooked" && (p.cooked_by_member_id || p.assigned_cook_id || ((S = i.store.currentMember.value) == null ? void 0 : S.id)) || null, F = await i.api.patch(`/api/timeline/${p.id}`, {
            revision: p.revision,
            date: $.value,
            meal_type: s.value,
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
            message: `Moved to ${b} · ${(x == null ? void 0 : x.label) || s.value}`
          }), a("resolve", F);
        } catch (p) {
          M.value = (p == null ? void 0 : p.message) || "Could not move meal";
        } finally {
          E.value = !1;
        }
      }
    }
    return (S, p) => {
      const x = k("Message"), D = k("DatePicker"), q = k("ProgressSpinner"), F = k("ToggleSwitch"), b = k("Button");
      return o(), w("div", Ue, [
        f(
          "p",
          Be,
          Y(z.value),
          1
          /* TEXT */
        ),
        M.value ? (o(), B(x, {
          key: 0,
          severity: "error"
        }, {
          default: V(() => [
            H(
              Y(M.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : P("v-if", !0),
        f("div", Ee, [
          f("div", Re, [
            p[3] || (p[3] = f(
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
          f("div", ze, [
            p[5] || (p[5] = f(
              "span",
              { class: "field-label" },
              "Meal slot",
              -1
              /* CACHED */
            )),
            g.value ? (o(), w("div", Fe, [
              c(q, { style: { width: "1.5rem", height: "1.5rem" } })
            ])) : (o(), w("div", qe, [
              (o(!0), w(
                Q,
                null,
                Z(R.value, (C) => (o(), w("button", {
                  key: C.id,
                  type: "button",
                  class: _e(["slot-option", { "is-selected": s.value === C.id, "is-skipped": C.skipped }]),
                  "data-move-slot": C.id,
                  "data-slot-occupied": String(C.occupied),
                  role: "radio",
                  "aria-checked": s.value === C.id,
                  onClick: (_) => s.value = C.id
                }, [
                  f("span", je, [
                    H(
                      Y(C.label),
                      1
                      /* TEXT */
                    ),
                    C.skipped ? (o(), w("span", Oe, " (skipped)")) : P("v-if", !0)
                  ]),
                  C.occupied ? (o(), w("span", He)) : P("v-if", !0)
                ], 10, Ye))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])),
            f("div", Ge, [
              c(F, {
                inputId: "move-cooked-toggle",
                modelValue: n.value,
                "onUpdate:modelValue": p[1] || (p[1] = (C) => n.value = C)
              }, null, 8, ["modelValue"]),
              p[4] || (p[4] = f(
                "label",
                { for: "move-cooked-toggle" },
                "Mark as cooked",
                -1
                /* CACHED */
              ))
            ])
          ])
        ]),
        f("div", We, [
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
            disabled: E.value || g.value || !s.value || L.value,
            onClick: K
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), te = (t, d) => {
  const e = t.__vccOpts || t;
  for (const [a, i] of d)
    e[a] = i;
  return e;
}, Qe = /* @__PURE__ */ te(Xe, [["__scopeId", "data-v-a7a6faf6"]]), Ce = 2, pe = 0, ye = 30, xe = 7, fe = 1, ge = 60;
function ke() {
  return {
    default_past_days: Ce,
    default_planning_days: xe
  };
}
function he(t, d, e, a) {
  return typeof t != "number" || !Number.isInteger(t) ? d : Math.max(e, Math.min(a, t));
}
function ve(t) {
  const d = ke();
  if (!t || typeof t != "object") return d;
  const e = t;
  return {
    default_past_days: he(e.default_past_days, d.default_past_days, pe, ye),
    default_planning_days: he(
      e.default_planning_days,
      d.default_planning_days,
      fe,
      ge
    )
  };
}
function ce(t, d) {
  return {
    from: O(t, -d.default_past_days),
    to: O(t, d.default_planning_days - 1)
  };
}
async function be(t) {
  try {
    const d = await t.api.get("/api/x/core-timeline/settings");
    return ve(d);
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
    const d = le(), e = y(!1), a = y(!1), i = y(!1), l = y(""), m = y(String(Ce)), v = y(String(xe));
    function u(s, n, g, E) {
      const M = String(s ?? "").trim();
      if (!/^-?\d+$/.test(M))
        throw new Error(`${n} must be a whole number between ${g} and ${E}.`);
      const N = Number(M);
      if (!Number.isInteger(N) || N < g || N > E)
        throw new Error(`${n} must be between ${g} and ${E}.`);
      return N;
    }
    async function h() {
      a.value = !0, l.value = "";
      try {
        const s = ve(await d.api.get("/api/x/core-timeline/settings"));
        m.value = String(s.default_past_days), v.value = String(s.default_planning_days);
      } catch (s) {
        l.value = (s == null ? void 0 : s.message) || "Failed to load timeline settings";
      } finally {
        a.value = !1;
      }
    }
    me(e, (s) => {
      s && h();
    });
    async function $() {
      if (i.value) return;
      l.value = "";
      let s, n;
      try {
        s = u(m.value, "Default past days", pe, ye), n = u(
          v.value,
          "Default planning days (including Today)",
          fe,
          ge
        );
      } catch (g) {
        l.value = g.message;
        return;
      }
      i.value = !0;
      try {
        const g = ve(
          await d.api.put("/api/x/core-timeline/settings", {
            default_past_days: s,
            default_planning_days: n
          })
        );
        m.value = String(g.default_past_days), v.value = String(g.default_planning_days), d.notify({ level: "success", message: "Timeline settings updated." });
      } catch (g) {
        l.value = (g == null ? void 0 : g.message) || "Failed to save timeline settings";
      } finally {
        i.value = !1;
      }
    }
    return (s, n) => {
      var N, U, T, r, R, L;
      const g = k("Button"), E = k("Message"), M = k("InputText");
      return ((U = (N = t.context) == null ? void 0 : N.plugin) == null ? void 0 : U.id) === "core-timeline" ? (o(), w(
        Q,
        { key: 0 },
        [
          c(g, {
            label: e.value ? "Close Settings" : "Settings",
            icon: e.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !e.value,
            disabled: ((r = (T = t.context) == null ? void 0 : T.plugin) == null ? void 0 : r.state) !== "active",
            class: "btn-timeline-settings-toggle",
            onClick: n[0] || (n[0] = (z) => e.value = !e.value)
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          e.value && ((L = (R = t.context) == null ? void 0 : R.plugin) == null ? void 0 : L.state) === "active" ? (o(), w("div", Je, [
            l.value ? (o(), B(E, {
              key: 0,
              severity: "error"
            }, {
              default: V(() => [
                H(
                  Y(l.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : P("v-if", !0),
            f("div", Ke, [
              f("div", null, [
                n[3] || (n[3] = f(
                  "label",
                  { for: "timeline-default-past-days" },
                  "Default past days",
                  -1
                  /* CACHED */
                )),
                c(M, {
                  id: "timeline-default-past-days",
                  modelValue: m.value,
                  "onUpdate:modelValue": n[1] || (n[1] = (z) => m.value = z),
                  type: "number",
                  min: J(pe),
                  max: J(ye),
                  step: "1",
                  disabled: a.value || i.value,
                  fluid: ""
                }, null, 8, ["modelValue", "min", "max", "disabled"]),
                n[4] || (n[4] = f(
                  "small",
                  null,
                  "Collapsed past days shown above Today (0–30).",
                  -1
                  /* CACHED */
                ))
              ]),
              f("div", null, [
                n[5] || (n[5] = f(
                  "label",
                  { for: "timeline-default-planning-days" },
                  "Default planning days (including Today)",
                  -1
                  /* CACHED */
                )),
                c(M, {
                  id: "timeline-default-planning-days",
                  modelValue: v.value,
                  "onUpdate:modelValue": n[2] || (n[2] = (z) => v.value = z),
                  type: "number",
                  min: J(fe),
                  max: J(ge),
                  step: "1",
                  disabled: a.value || i.value,
                  fluid: ""
                }, null, 8, ["modelValue", "min", "max", "disabled"]),
                n[6] || (n[6] = f(
                  "small",
                  null,
                  "Today plus upcoming days shown by default (1–60).",
                  -1
                  /* CACHED */
                ))
              ])
            ]),
            f("div", Ze, [
              c(g, {
                label: "Save Settings",
                icon: "pi pi-check",
                size: "small",
                loading: i.value,
                disabled: a.value,
                onClick: $
              }, null, 8, ["loading", "disabled"])
            ])
          ])) : P("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : P("v-if", !0);
    };
  }
}), tt = /* @__PURE__ */ te(et, [["__scopeId", "data-v-e5e51827"]]), at = {
  type: "button",
  class: "timeline-card-main"
}, nt = { class: "card-header" }, lt = { class: "card-title" }, it = {
  key: 0,
  class: "pi pi-book recipe-entry-icon",
  "aria-hidden": "true"
}, ot = ["aria-label"], st = {
  key: 0,
  class: "card-servings"
}, dt = {
  key: 1,
  class: "card-note"
}, rt = /* @__PURE__ */ ee({
  __name: "TimelineCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: d }) {
    function e(i) {
      return (/* @__PURE__ */ new Date(`${i}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const a = d;
    return (i, l) => {
      var v;
      const m = we("tooltip");
      return o(), w("div", {
        class: "timeline-card",
        onClick: l[1] || (l[1] = (u) => a("interact", u))
      }, [
        f("button", at, [
          f("div", nt, [
            f("span", lt, [
              t.entry.recipe_id ? (o(), w("i", it)) : P("v-if", !0),
              H(
                Y(((v = t.entry.recipe) == null ? void 0 : v.title) || t.entry.title || "Planned Meal"),
                1
                /* TEXT */
              )
            ]),
            t.entry.origin === "plugin:core-recurring" ? Te((o(), w("i", {
              key: 0,
              class: "pi pi-replay recurring-entry-icon",
              "aria-label": `Repeats every ${e(t.entry.date)}`
            }, null, 8, ot)), [
              [m, `Repeats every ${e(t.entry.date)}`]
            ]) : P("v-if", !0),
            c(J(ie), {
              name: "timeline.entry.badge",
              context: { entry: t.entry }
            }, null, 8, ["context"])
          ]),
          t.entry.servings_override ? (o(), w(
            "div",
            st,
            Y(t.entry.servings_override) + " servings",
            1
            /* TEXT */
          )) : P("v-if", !0),
          t.entry.note ? (o(), w(
            "div",
            dt,
            Y(t.entry.note),
            1
            /* TEXT */
          )) : P("v-if", !0)
        ]),
        t.entry.status === "cooked" ? (o(), w("div", {
          key: 0,
          class: "card-footer",
          onClick: l[0] || (l[0] = Se(() => {
          }, ["stop"]))
        }, [
          c(J(ie), {
            name: "timeline.entry.footer",
            context: { entry: t.entry }
          }, null, 8, ["context"])
        ])) : P("v-if", !0)
      ]);
    };
  }
}), ut = /* @__PURE__ */ te(rt, [["__scopeId", "data-v-c1b8a1f1"]]), ct = ["data-slot-id"], vt = {
  key: 0,
  class: "pi pi-calendar-plus extra-slot-icon",
  "aria-label": "Only on this day"
}, mt = { class: "slot-body" }, pt = {
  key: 0,
  class: "skipped-row"
}, yt = { class: "slot-actions" }, ft = /* @__PURE__ */ ee({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: d }) {
    const e = t, a = d, i = le(), l = y(), m = y(""), v = y(!1);
    function u() {
      a("add", { date: e.date, mealType: e.slot.id });
    }
    async function h(s) {
      if (!v.value) {
        v.value = !0, m.value = "";
        try {
          if (s === "remove" && e.slot.entries.length && !await i.confirm({ header: "Remove slot", message: `Remove ${e.slot.label} and its ${e.slot.entries.length} planned meal${e.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const n = `/api/x/core-timeline/days/${e.date}/slots/${encodeURIComponent(e.slot.id)}`;
          s === "skip" ? await i.api.put(n, { kind: "skip" }) : await i.api.delete(n, s === "remove" ? { with_entries: "true" } : void 0), a("changed");
        } catch (n) {
          m.value = n.message || "Could not change slot";
        } finally {
          v.value = !1;
        }
      }
    }
    const $ = X(() => [{ label: "Add another meal", icon: "pi pi-plus", command: u }, ...e.slot.kind === "default" && !e.slot.entries.length ? [{ label: "Skip on this day", command: () => h("skip") }] : [], ...e.slot.kind === "extra" && !e.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => h("remove") }] : []]);
    return (s, n) => {
      const g = k("Button"), E = k("Menu"), M = k("Message"), N = we("tooltip");
      return o(), w("div", {
        class: "meal-slot",
        "data-slot-id": t.slot.id
      }, [
        f(
          "span",
          {
            class: _e(["slot-name", { skipped: t.slot.skipped }])
          },
          [
            H(
              Y(t.slot.label),
              1
              /* TEXT */
            ),
            t.slot.kind === "extra" ? Te((o(), w(
              "i",
              vt,
              null,
              512
              /* NEED_PATCH */
            )), [
              [N, "Only on this day"]
            ]) : P("v-if", !0)
          ],
          2
          /* CLASS */
        ),
        f("div", mt, [
          t.slot.skipped ? (o(), w("div", pt, [
            n[3] || (n[3] = f(
              "span",
              null,
              "Skipped this day",
              -1
              /* CACHED */
            )),
            c(g, {
              label: "Undo",
              size: "small",
              text: "",
              loading: v.value,
              onClick: n[0] || (n[0] = (U) => h("undo"))
            }, null, 8, ["loading"])
          ])) : (o(), w(
            Q,
            { key: 1 },
            [
              (o(!0), w(
                Q,
                null,
                Z(t.slot.entries, (U) => (o(), B(J(Pe), {
                  key: U.id,
                  hub: "entry:interact",
                  context: { entry: U, mealType: t.slot.id },
                  onResolve: n[1] || (n[1] = (T) => a("changed"))
                }, {
                  default: V(({ open: T }) => [
                    c(ut, {
                      entry: U,
                      onInteract: T
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
              t.slot.entries.length ? P("v-if", !0) : (o(), B(g, {
                key: 0,
                class: "empty-slot-btn",
                icon: "pi pi-plus",
                size: "small",
                text: "",
                "aria-label": "Add meal",
                onClick: u
              }))
            ],
            64
            /* STABLE_FRAGMENT */
          ))
        ]),
        f("div", yt, [
          t.slot.skipped ? P("v-if", !0) : (o(), B(g, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: v.value,
            onClick: n[2] || (n[2] = (U) => l.value.toggle(U))
          }, null, 8, ["disabled"])),
          c(E, {
            ref_key: "menu",
            ref: l,
            model: $.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        m.value ? (o(), B(M, {
          key: 0,
          class: "slot-error",
          severity: "error"
        }, {
          default: V(() => [
            H(
              Y(m.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : P("v-if", !0)
      ], 8, ct);
    };
  }
}), gt = /* @__PURE__ */ te(ft, [["__scopeId", "data-v-f0110dd8"]]);
function bt(t, d) {
  const e = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", a = new Set(d);
  let i = e.slice(0, 64).replace(/-+$/g, "");
  for (let l = 2; a.has(i); l++) {
    const m = `-${l}`;
    i = e.slice(0, 64 - m.length).replace(/-+$/g, "") + m;
  }
  return i;
}
const _t = /* @__PURE__ */ ee({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(t, { emit: d }) {
    const e = t, a = d, i = le(), l = y(""), m = y(null), v = y(!1), u = y(""), h = X(() => [{ label: "At the end", value: null }, ...e.slots.filter((s) => s.kind === "default").map((s) => ({ label: `Before ${s.label}`, value: s.id }))]);
    me(() => e.visible, (s) => {
      s && (l.value = "", m.value = null, u.value = "");
    });
    async function $() {
      if (!(!l.value.trim() || v.value)) {
        v.value = !0, u.value = "";
        try {
          const s = bt(l.value, [...e.slots.map((n) => n.id), ...i.store.household.value.meal_types.map((n) => n.id)]);
          await i.api.put(`/api/x/core-timeline/days/${e.date}/slots/${s}`, { kind: "extra", label: l.value.trim(), before: m.value }), a("changed"), a("update:visible", !1);
        } catch (s) {
          u.value = s.message || "Could not add slot";
        } finally {
          v.value = !1;
        }
      }
    }
    return (s, n) => {
      const g = k("Message"), E = k("InputText"), M = k("Select"), N = k("Button"), U = k("Dialog");
      return o(), B(U, {
        visible: t.visible,
        "onUpdate:visible": n[2] || (n[2] = (T) => a("update:visible", T)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: V(() => [
          f(
            "form",
            {
              onSubmit: Se($, ["prevent"])
            },
            [
              u.value ? (o(), B(g, {
                key: 0,
                severity: "error"
              }, {
                default: V(() => [
                  H(
                    Y(u.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : P("v-if", !0),
              n[3] || (n[3] = f(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              c(E, {
                id: "extra-slot-name",
                modelValue: l.value,
                "onUpdate:modelValue": n[0] || (n[0] = (T) => l.value = T),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              n[4] || (n[4] = f(
                "label",
                { for: "extra-slot-position" },
                "Position",
                -1
                /* CACHED */
              )),
              c(M, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: m.value,
                "onUpdate:modelValue": n[1] || (n[1] = (T) => m.value = T),
                options: h.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              c(N, {
                label: "Add slot",
                type: "submit",
                loading: v.value,
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
}), kt = /* @__PURE__ */ te(_t, [["__scopeId", "data-v-8c53feab"]]), ht = ["data-timeline-date"], $t = /* @__PURE__ */ ee({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: d }) {
    const e = d, a = y(), i = y(!1), l = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      i.value = !0;
    } }];
    function m(v) {
      return (/* @__PURE__ */ new Date(`${v}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (v, u) => {
      const h = k("Tag"), $ = k("Button"), s = k("Menu");
      return o(), w("section", {
        class: _e(["day-card", { "is-today": t.day.isToday }]),
        "data-timeline-date": t.day.date
      }, [
        f("header", null, [
          f(
            "h3",
            null,
            Y(m(t.day.date)),
            1
            /* TEXT */
          ),
          t.day.isToday ? (o(), B(h, {
            key: 0,
            value: "Today"
          })) : P("v-if", !0),
          c($, {
            icon: "pi pi-ellipsis-v",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: u[0] || (u[0] = (n) => a.value.toggle(n))
          }),
          c(
            s,
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
        (o(!0), w(
          Q,
          null,
          Z(t.day.slots, (n) => (o(), B(gt, {
            key: n.id,
            slot: n,
            date: t.day.date,
            onAdd: u[1] || (u[1] = (g) => e("add", g)),
            onChanged: u[2] || (u[2] = (g) => e("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        c(J(ie), {
          name: "timeline.day.footer",
          context: { date: t.day.date }
        }, null, 8, ["context"]),
        c(kt, {
          visible: i.value,
          "onUpdate:visible": u[3] || (u[3] = (n) => i.value = n),
          date: t.day.date,
          slots: t.day.slots,
          onChanged: u[4] || (u[4] = (n) => e("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, ht);
    };
  }
}), $e = /* @__PURE__ */ te($t, [["__scopeId", "data-v-041fc1dc"]]), wt = { class: "add-entry" }, Tt = { key: 0 }, St = { class: "quick-notes" }, Ct = /* @__PURE__ */ ee({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(t, { emit: d }) {
    const e = t, a = d, i = ["Dining out", "Leftovers", "Takeout", "Quick meal"], l = le(), m = y("recipes"), v = y(""), u = y([]), h = y([]), $ = y(""), s = y(2), n = y(!1), g = y(""), E = X(() => {
      var L, z;
      const r = (((L = l.store.household.value) == null ? void 0 : L.meal_types) || []).find(
        (K) => {
          var S, p, x, D;
          return K.id === e.mealType || ((S = K.id) == null ? void 0 : S.toLowerCase()) === ((p = e.mealType) == null ? void 0 : p.toLowerCase()) || ((x = K.label) == null ? void 0 : x.toLowerCase()) === ((D = e.mealType) == null ? void 0 : D.toLowerCase());
        }
      );
      if (r && Array.isArray(r.predefined_notes))
        return r.predefined_notes;
      const R = (z = l.store.household.value) == null ? void 0 : z.predefined_notes;
      return Array.isArray(R) ? R : i;
    });
    let M = 0;
    async function N() {
      const T = ++M;
      try {
        const r = await l.api.get("/api/recipes", { q: v.value });
        T === M && (u.value = r.items);
      } catch (r) {
        T === M && (g.value = r.message);
      }
    }
    me(() => e.visible, async (T) => {
      if (!T) {
        ++M;
        return;
      }
      m.value = "recipes", v.value = "", $.value = "", s.value = 2, g.value = "", u.value = [], await N();
      try {
        h.value = await l.api.get("/api/x/core-shortlist");
      } catch {
        h.value = [];
      }
    });
    async function U(T) {
      var L;
      if (n.value || !T && !$.value.trim()) return;
      n.value = !0, g.value = "";
      const r = e.date < ne(), R = r ? "cooked" : "planned";
      try {
        const z = await l.api.post("/api/timeline", { date: e.date, meal_type: e.mealType, entry_type: T ? "recipe" : "note", ...T ? { recipe_id: T } : { title: $.value }, servings_override: s.value, status: R, ...r && ((L = l.store.currentMember.value) != null && L.id) ? { cooked_by_member_id: l.store.currentMember.value.id } : {} });
        a("created", z), a("update:visible", !1);
      } catch (z) {
        g.value = z.message || "Could not add meal";
      } finally {
        n.value = !1;
      }
    }
    return (T, r) => {
      const R = k("Message"), L = k("InputNumber"), z = k("Tab"), K = k("TabList"), S = k("InputText"), p = k("Button"), x = k("TabPanel"), D = k("TabPanels"), q = k("Tabs"), F = k("Dialog");
      return o(), B(F, {
        visible: t.visible,
        "onUpdate:visible": r[5] || (r[5] = (b) => a("update:visible", b)),
        header: `Add meal · ${t.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: V(() => [
          f("div", wt, [
            g.value ? (o(), B(R, {
              key: 0,
              severity: "error"
            }, {
              default: V(() => [
                H(
                  Y(g.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : P("v-if", !0),
            r[11] || (r[11] = f(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            c(L, {
              inputId: "entry-servings",
              modelValue: s.value,
              "onUpdate:modelValue": r[0] || (r[0] = (b) => s.value = b),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            c(q, {
              value: m.value,
              "onUpdate:value": r[4] || (r[4] = (b) => m.value = b)
            }, {
              default: V(() => [
                c(K, null, {
                  default: V(() => [
                    c(z, { value: "recipes" }, {
                      default: V(() => [...r[6] || (r[6] = [
                        H(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    c(z, { value: "shortlist" }, {
                      default: V(() => [...r[7] || (r[7] = [
                        H(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    c(z, { value: "note" }, {
                      default: V(() => [...r[8] || (r[8] = [
                        H(
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
                  default: V(() => [
                    c(x, { value: "recipes" }, {
                      default: V(() => [
                        r[9] || (r[9] = f(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        c(S, {
                          id: "entry-recipe-search",
                          modelValue: v.value,
                          "onUpdate:modelValue": r[1] || (r[1] = (b) => v.value = b),
                          onInput: N,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (o(!0), w(
                          Q,
                          null,
                          Z(u.value, (b) => (o(), w("div", {
                            key: b.id,
                            class: "recipe-result"
                          }, [
                            f(
                              "span",
                              null,
                              Y(b.title),
                              1
                              /* TEXT */
                            ),
                            c(p, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (C) => U(b.id)
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
                      default: V(() => [
                        h.value.length ? P("v-if", !0) : (o(), w("p", Tt, "No recipes in shortlist")),
                        (o(!0), w(
                          Q,
                          null,
                          Z(h.value, (b) => (o(), w("div", {
                            key: b.recipe_id,
                            class: "recipe-result"
                          }, [
                            f(
                              "span",
                              null,
                              Y(b.recipe_title),
                              1
                              /* TEXT */
                            ),
                            c(p, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (C) => U(b.recipe_id)
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
                      default: V(() => [
                        r[10] || (r[10] = f(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        c(S, {
                          id: "entry-note",
                          modelValue: $.value,
                          "onUpdate:modelValue": r[2] || (r[2] = (b) => $.value = b),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        f("div", St, [
                          (o(!0), w(
                            Q,
                            null,
                            Z(E.value, (b) => (o(), B(p, {
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
                          onClick: r[3] || (r[3] = (b) => U())
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
}), xt = /* @__PURE__ */ te(Ct, [["__scopeId", "data-v-23ac8af0"]]), Dt = { class: "timeline-page" }, Mt = { class: "timeline-toolbar" }, At = { class: "timeline-container" }, It = { class: "timeline-sidebar-wrapper" }, Lt = { class: "timeline-feed" }, Pt = {
  key: 0,
  class: "past-days"
}, Vt = ["data-timeline-date"], Nt = /* @__PURE__ */ ee({
  __name: "TimelinePage",
  setup(t) {
    const d = le(), e = y(ne()), a = y(ke()), i = y(ce(e.value, a.value)), l = y(!1), m = y([]), v = y({}), u = y(""), h = y(/* @__PURE__ */ new Set()), $ = y(null), s = y(window.innerWidth < 1024), n = y([]), g = De("__SS_SLOT_REGISTRY__"), E = X(() => (g == null ? void 0 : g.getContributions("timeline.sidebar")) || []), M = X(() => Ne(i.value, v.value, m.value, e.value)), N = X(() => M.value.filter((_) => _.isPast)), U = X(() => M.value.filter((_) => !_.isPast));
    let T = 0, r, R = !1;
    async function L() {
      clearTimeout(r);
      const _ = ++T, { from: A, to: j } = i.value;
      u.value = "";
      try {
        const G = [], W = {};
        for (let ae = A; ae <= j; ) {
          const oe = O(ae, 62) < j ? O(ae, 62) : j, se = { from: ae, to: oe }, [de, re] = await Promise.all([d.api.get("/api/timeline", se), d.api.get("/api/x/core-timeline/slots", se)]);
          if (_ !== T || R) return;
          G.push(...de), Object.assign(W, re.days), ae = O(oe, 1);
        }
        m.value = G, v.value = W;
      } catch (G) {
        _ === T && !R && (u.value = G.message || "Could not load Timeline");
      }
    }
    function z() {
      clearTimeout(r), r = setTimeout(L, 300);
    }
    const K = [
      ...["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:slots-changed", "recipe:deleted"].map((_) => d.on(_, z)),
      d.on("core-timeline:settings-changed", (_) => {
        const A = ve((_ == null ? void 0 : _.data) ?? _);
        a.value = A, !l.value && !R && (e.value = ne(), i.value = ce(e.value, A), L());
      })
    ];
    function S() {
      s.value = window.innerWidth < 1024;
    }
    function p() {
      l.value = !0, i.value = { ...i.value, from: O(i.value.from, -4) }, L();
    }
    function x() {
      l.value = !0, i.value = { ...i.value, to: O(i.value.to, 5) }, L();
    }
    async function D() {
      var _, A;
      l.value = !1, e.value = ne(), a.value = await be(d), !R && (i.value = ce(e.value, a.value), h.value.clear(), await L(), await Le(), (A = (_ = document.querySelector(".day-card.is-today")) == null ? void 0 : _.scrollIntoView) == null || A.call(_, { block: "start", behavior: "smooth" }));
    }
    function q(_) {
      h.value.has(_) ? h.value.delete(_) : h.value.add(_);
    }
    function F(_) {
      return (/* @__PURE__ */ new Date(`${_}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function b(_) {
      return _.slots.flatMap((A) => A.entries.map((j) => {
        var G;
        return `${j.status === "cooked" ? "✓ " : ""}${A.label.toUpperCase()} ${((G = j.recipe) == null ? void 0 : G.title) || j.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    async function C() {
      a.value = await be(d), !R && (e.value = ne(), i.value = ce(e.value, a.value), await L());
    }
    return Me(() => {
      C(), window.addEventListener("resize", S);
    }), Ae(() => {
      R = !0, ++T, clearTimeout(r), K.forEach((_) => {
        typeof _ == "function" && _();
      }), window.removeEventListener("resize", S);
    }), (_, A) => {
      var de, re;
      const j = k("Button"), G = k("Message"), W = k("AccordionHeader"), ae = k("AccordionContent"), oe = k("AccordionPanel"), se = k("Accordion");
      return o(), w("div", Dt, [
        f("div", Mt, [
          A[4] || (A[4] = f(
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
        u.value ? (o(), B(G, {
          key: 0,
          severity: "error"
        }, {
          default: V(() => [
            H(
              Y(u.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : P("v-if", !0),
        f("div", At, [
          f("aside", It, [
            s.value ? (o(), B(se, {
              key: 0,
              value: n.value,
              "onUpdate:value": A[0] || (A[0] = (I) => n.value = I),
              multiple: ""
            }, {
              default: V(() => [
                (o(!0), w(
                  Q,
                  null,
                  Z(E.value, (I) => (o(), B(oe, {
                    key: I.id,
                    value: I.id
                  }, {
                    default: V(() => [
                      c(
                        W,
                        null,
                        {
                          default: V(() => [
                            H(
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
                          default: V(() => [
                            (o(), B(Ie(I.component), { context: i.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (o(), B(J(ie), {
              key: 1,
              name: "timeline.sidebar",
              context: i.value
            }, null, 8, ["context"]))
          ]),
          f("div", Lt, [
            c(j, {
              label: "Show 4 earlier days",
              size: "small",
              text: "",
              onClick: p
            }),
            N.value.length ? (o(), w("div", Pt, [
              (o(!0), w(
                Q,
                null,
                Z(N.value, (I) => (o(), w("div", {
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
                  h.value.has(I.date) ? (o(), B($e, {
                    key: 0,
                    day: I,
                    onAdd: A[1] || (A[1] = (ue) => $.value = ue),
                    onChanged: L
                  }, null, 8, ["day"])) : P("v-if", !0)
                ], 8, Vt))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])) : P("v-if", !0),
            (o(!0), w(
              Q,
              null,
              Z(U.value, (I) => (o(), B($e, {
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
        c(xt, {
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
}), Ut = /* @__PURE__ */ te(Nt, [["__scopeId", "data-v-edf8945b"]]);
function Rt(t) {
  t.route({ path: "/timeline", component: Ut, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.slot("timeline.entry.badge", Ve, { order: 10 }), t.slot("plugin_manager.plugin.actions", tt, { order: 10 }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
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
  const d = async () => {
    try {
      const e = ne(), a = await be(t), i = O(e, -a.default_past_days), l = O(e, Math.max(a.default_planning_days - 1, 14));
      for (let m = i; m <= l; ) {
        const v = O(m, 62) < l ? O(m, 62) : l, u = await t.api.get(`/api/timeline?from=${m}&to=${v}`);
        for (const h of u) h.recipe_id && t.api.get(`/api/recipes/${h.recipe_id}`).catch(() => {
        });
        m = O(v, 1);
      }
    } catch {
    }
  };
  d();
  for (const e of ["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:settings-changed"]) t.on(e, d);
}
export {
  Rt as default
};
