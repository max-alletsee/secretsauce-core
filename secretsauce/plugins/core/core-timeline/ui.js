import { defineComponent as K, resolveComponent as f, openBlock as o, createBlock as I, createCommentVNode as V, computed as j, ref as g, watch as re, createElementBlock as $, createElementVNode as b, toDisplayString as N, withCtx as A, createTextVNode as W, createVNode as m, Fragment as G, renderList as J, normalizeClass as de, resolveDirective as ce, withDirectives as ve, unref as te, withModifiers as me, inject as pe, onMounted as ye, onBeforeUnmount as fe, resolveDynamicComponent as ge, nextTick as be } from "vue";
import { useSecretSauce as ne, Slot as ae, IntentTrigger as ke } from "@secretsauce/ui";
const _e = /* @__PURE__ */ K({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(t) {
    return (T, e) => {
      var d, i;
      const a = f("Tag");
      return ((i = (d = t.context) == null ? void 0 : d.entry) == null ? void 0 : i.status) === "cooked" ? (o(), I(a, {
        key: 0,
        value: "Cooked",
        icon: "pi pi-check",
        severity: "success",
        title: "Cooked"
      })) : V("v-if", !0);
    };
  }
});
function le() {
  const t = /* @__PURE__ */ new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function O(t, T) {
  const e = /* @__PURE__ */ new Date(`${t}T12:00:00`);
  return e.setDate(e.getDate() + T), `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function he(t, T, e, a) {
  const d = [];
  for (let i = t.from; i <= t.to; i = O(i, 1)) {
    const k = (T[i] || []).map((y) => ({ ...y, entries: [] }));
    for (const y of e.filter((r) => r.date === i)) {
      const r = y.meal_type.toLowerCase();
      let S = k.find((C) => C.id.toLowerCase() === r) || k.find((C) => C.label.toLowerCase() === r);
      S || (S = { id: y.meal_type, label: y.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (C) => C.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, k.push(S)), S.entries.push(y), S.skipped = !1;
    }
    d.push({ date: i, isPast: i < a, isToday: i === a, slots: k });
  }
  return d;
}
const $e = { class: "move-meal-dialog" }, we = { class: "move-meal-subtitle" }, Ce = { class: "move-meal-grid" }, Te = { class: "move-date-col" }, xe = { class: "move-slot-col" }, Se = {
  key: 0,
  class: "slot-loading"
}, De = {
  key: 1,
  class: "slot-list",
  role: "radiogroup",
  "aria-label": "Meal slot"
}, Me = ["data-move-slot", "data-slot-occupied", "aria-checked", "onClick"], Ae = { class: "slot-option-label" }, Le = {
  key: 0,
  class: "slot-skipped-note"
}, Ie = {
  key: 0,
  class: "slot-occupied-dot",
  "aria-label": "Has planned meal",
  title: "Already has a meal"
}, Ve = { class: "cooked-row" }, Pe = { class: "dialog-actions" }, Be = /* @__PURE__ */ K({
  inheritAttrs: !1,
  __name: "MoveMealDialog",
  props: {
    context: {}
  },
  emits: ["resolve", "cancel"],
  setup(t, { emit: T }) {
    const e = t, a = T, d = ne();
    function i(_) {
      const [v, h, x] = _.split("-").map(Number);
      return new Date(v, h - 1, x, 12, 0, 0);
    }
    function k(_) {
      return `${_.getFullYear()}-${String(_.getMonth() + 1).padStart(2, "0")}-${String(_.getDate()).padStart(2, "0")}`;
    }
    function y(_) {
      return _ === e.context.entry.date ? e.context.entry.status === "cooked" : _ < le();
    }
    const r = j(() => e.context.mealType || e.context.entry.meal_type), S = g(i(e.context.entry.date)), C = j(() => k(S.value || i(e.context.entry.date))), p = g(r.value), n = g(y(e.context.entry.date)), D = g(!1), z = g(!1), P = g(""), R = g([]), L = g([]);
    let w = 0;
    async function s(_) {
      var h, x, B;
      const v = ++w;
      D.value = !0, P.value = "";
      try {
        const u = { from: _, to: _ }, [l, c] = await Promise.all([
          d.api.get("/api/x/core-timeline/slots", u),
          d.api.get("/api/timeline", u)
        ]);
        if (v !== w) return;
        const U = ((h = l == null ? void 0 : l.days) == null ? void 0 : h[_]) || [];
        R.value = U, L.value = Array.isArray(c) ? c : [];
        const X = p.value || r.value, Y = X.toLowerCase(), Z = U.find((F) => F.id === X) || U.find((F) => F.id.toLowerCase() === Y) || U.find((F) => F.label.toLowerCase() === Y);
        Z ? p.value = Z.id : p.value = ((x = U.find((F) => !F.skipped)) == null ? void 0 : x.id) || ((B = U[0]) == null ? void 0 : B.id) || "";
      } catch (u) {
        v === w && (P.value = (u == null ? void 0 : u.message) || "Could not load target day", R.value = [], L.value = []);
      } finally {
        v === w && (D.value = !1);
      }
    }
    re(
      C,
      (_) => {
        n.value = y(_), s(_);
      },
      { immediate: !0 }
    );
    const H = j(() => {
      const _ = L.value.filter((x) => x.id !== e.context.entry.id), v = R.value, h = /* @__PURE__ */ new Map();
      for (const x of v) h.set(x.id, []);
      for (const x of _) {
        const B = String(x.meal_type || "").toLowerCase(), u = v.find((l) => l.id.toLowerCase() === B) || v.find((l) => l.label.toLowerCase() === B);
        u && h.get(u.id).push(x);
      }
      return v.map((x) => {
        const B = h.get(x.id) || [], u = B.length ? B.reduce((l, c) => Math.max(l, Number(c.position ?? 0)), 0) + 1 : 0;
        return {
          ...x,
          occupied: B.length > 0,
          nextPosition: u
        };
      });
    }), q = j(() => C.value === e.context.entry.date && p.value.toLowerCase() === r.value.toLowerCase()), E = j(() => {
      var _;
      return ((_ = e.context.entry.recipe) == null ? void 0 : _.title) || e.context.entry.title || "Meal";
    });
    async function Q() {
      var _;
      if (!(z.value || D.value || !p.value || q.value)) {
        z.value = !0, P.value = "";
        try {
          const v = e.context.entry, h = H.value.find((c) => c.id === p.value), x = n.value ? "cooked" : "planned", B = x === "cooked" && (v.cooked_by_member_id || v.assigned_cook_id || ((_ = d.store.currentMember.value) == null ? void 0 : _.id)) || null, u = await d.api.patch(`/api/timeline/${v.id}`, {
            revision: v.revision,
            date: C.value,
            meal_type: p.value,
            position: (h == null ? void 0 : h.nextPosition) ?? 0,
            status: x,
            cooked_by_member_id: B
          });
          if (h != null && h.skipped)
            try {
              await d.api.delete(`/api/x/core-timeline/days/${C.value}/slots/${encodeURIComponent(h.id)}`);
            } catch (c) {
              if ((c == null ? void 0 : c.status) !== 404) throw c;
            }
          const l = (/* @__PURE__ */ new Date(`${C.value}T12:00:00`)).toLocaleDateString(void 0, {
            weekday: "short",
            day: "numeric",
            month: "short"
          });
          d.notify({
            level: "success",
            message: `Moved to ${l} · ${(h == null ? void 0 : h.label) || p.value}`
          }), a("resolve", u);
        } catch (v) {
          P.value = (v == null ? void 0 : v.message) || "Could not move meal";
        } finally {
          z.value = !1;
        }
      }
    }
    return (_, v) => {
      const h = f("Message"), x = f("DatePicker"), B = f("ProgressSpinner"), u = f("ToggleSwitch"), l = f("Button");
      return o(), $("div", $e, [
        b(
          "p",
          we,
          N(E.value),
          1
          /* TEXT */
        ),
        P.value ? (o(), I(h, {
          key: 0,
          severity: "error"
        }, {
          default: A(() => [
            W(
              N(P.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        b("div", Ce, [
          b("div", Te, [
            v[3] || (v[3] = b(
              "span",
              { class: "field-label" },
              "Day",
              -1
              /* CACHED */
            )),
            m(x, {
              modelValue: S.value,
              "onUpdate:modelValue": v[0] || (v[0] = (c) => S.value = c),
              inline: ""
            }, null, 8, ["modelValue"])
          ]),
          b("div", xe, [
            v[5] || (v[5] = b(
              "span",
              { class: "field-label" },
              "Meal slot",
              -1
              /* CACHED */
            )),
            D.value ? (o(), $("div", Se, [
              m(B, { style: { width: "1.5rem", height: "1.5rem" } })
            ])) : (o(), $("div", De, [
              (o(!0), $(
                G,
                null,
                J(H.value, (c) => (o(), $("button", {
                  key: c.id,
                  type: "button",
                  class: de(["slot-option", { "is-selected": p.value === c.id, "is-skipped": c.skipped }]),
                  "data-move-slot": c.id,
                  "data-slot-occupied": String(c.occupied),
                  role: "radio",
                  "aria-checked": p.value === c.id,
                  onClick: (U) => p.value = c.id
                }, [
                  b("span", Ae, [
                    W(
                      N(c.label),
                      1
                      /* TEXT */
                    ),
                    c.skipped ? (o(), $("span", Le, " (skipped)")) : V("v-if", !0)
                  ]),
                  c.occupied ? (o(), $("span", Ie)) : V("v-if", !0)
                ], 10, Me))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])),
            b("div", Ve, [
              m(u, {
                inputId: "move-cooked-toggle",
                modelValue: n.value,
                "onUpdate:modelValue": v[1] || (v[1] = (c) => n.value = c)
              }, null, 8, ["modelValue"]),
              v[4] || (v[4] = b(
                "label",
                { for: "move-cooked-toggle" },
                "Mark as cooked",
                -1
                /* CACHED */
              ))
            ])
          ])
        ]),
        b("div", Pe, [
          m(l, {
            label: "Cancel",
            severity: "secondary",
            disabled: z.value,
            onClick: v[2] || (v[2] = (c) => a("cancel"))
          }, null, 8, ["disabled"]),
          m(l, {
            label: "Move",
            icon: "pi pi-arrow-right-arrow-left",
            loading: z.value,
            disabled: z.value || D.value || !p.value || q.value,
            onClick: Q
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), ee = (t, T) => {
  const e = t.__vccOpts || t;
  for (const [a, d] of T)
    e[a] = d;
  return e;
}, Ue = /* @__PURE__ */ ee(Be, [["__scopeId", "data-v-a7a6faf6"]]), Re = { class: "card-header" }, Ee = { class: "card-title" }, Ne = ["aria-label"], ze = {
  key: 0,
  class: "card-servings"
}, qe = {
  key: 1,
  class: "card-note"
}, Fe = /* @__PURE__ */ K({
  __name: "TimelineCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: T }) {
    function e(d) {
      return (/* @__PURE__ */ new Date(`${d}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const a = T;
    return (d, i) => {
      const k = f("Button"), y = ce("tooltip");
      return o(), $("div", {
        class: "timeline-card",
        onClick: i[1] || (i[1] = (r) => a("interact", r))
      }, [
        m(k, {
          class: "timeline-card-main",
          variant: "text"
        }, {
          default: A(() => {
            var r;
            return [
              b("div", Re, [
                b(
                  "span",
                  Ee,
                  N(((r = t.entry.recipe) == null ? void 0 : r.title) || t.entry.title || "Planned Meal"),
                  1
                  /* TEXT */
                ),
                t.entry.origin === "plugin:core-recurring" ? ve((o(), $("i", {
                  key: 0,
                  class: "pi pi-replay",
                  "aria-label": `Repeats every ${e(t.entry.date)}`
                }, null, 8, Ne)), [
                  [y, `Repeats every ${e(t.entry.date)}`]
                ]) : V("v-if", !0),
                m(te(ae), {
                  name: "timeline.entry.badge",
                  context: { entry: t.entry }
                }, null, 8, ["context"])
              ]),
              t.entry.servings_override ? (o(), $(
                "div",
                ze,
                N(t.entry.servings_override) + " servings",
                1
                /* TEXT */
              )) : V("v-if", !0),
              t.entry.note ? (o(), $(
                "div",
                qe,
                N(t.entry.note),
                1
                /* TEXT */
              )) : V("v-if", !0)
            ];
          }),
          _: 1
          /* STABLE */
        }),
        t.entry.status === "cooked" ? (o(), $("div", {
          key: 0,
          class: "card-footer",
          onClick: i[0] || (i[0] = me(() => {
          }, ["stop"]))
        }, [
          m(te(ae), {
            name: "timeline.entry.footer",
            context: { entry: t.entry }
          }, null, 8, ["context"])
        ])) : V("v-if", !0)
      ]);
    };
  }
}), Oe = /* @__PURE__ */ ee(Fe, [["__scopeId", "data-v-e23d9a02"]]), je = ["data-slot-id"], He = { class: "slot-header" }, We = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Ye = {
  key: 1,
  class: "skipped-row"
}, Ge = /* @__PURE__ */ K({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: T }) {
    const e = t, a = T, d = ne(), i = g(), k = g(""), y = g(!1);
    function r() {
      a("add", { date: e.date, mealType: e.slot.id });
    }
    async function S(p) {
      if (!y.value) {
        y.value = !0, k.value = "";
        try {
          if (p === "remove" && e.slot.entries.length && !await d.confirm({ header: "Remove slot", message: `Remove ${e.slot.label} and its ${e.slot.entries.length} planned meal${e.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const n = `/api/x/core-timeline/days/${e.date}/slots/${encodeURIComponent(e.slot.id)}`;
          p === "skip" ? await d.api.put(n, { kind: "skip" }) : await d.api.delete(n, p === "remove" ? { with_entries: "true" } : void 0), a("changed");
        } catch (n) {
          k.value = n.message || "Could not change slot";
        } finally {
          y.value = !1;
        }
      }
    }
    const C = j(() => [{ label: "Add another meal", icon: "pi pi-plus", command: r }, ...e.slot.kind === "default" && !e.slot.entries.length ? [{ label: "Skip on this day", command: () => S("skip") }] : [], ...e.slot.kind === "extra" && !e.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => S("remove") }] : []]);
    return (p, n) => {
      const D = f("Button"), z = f("Menu"), P = f("Message"), R = ce("tooltip");
      return o(), $("div", {
        class: "meal-slot",
        "data-slot-id": t.slot.id
      }, [
        b("div", He, [
          b(
            "span",
            {
              class: de(["slot-name", { skipped: t.slot.skipped }])
            },
            [
              W(
                N(t.slot.label) + " ",
                1
                /* TEXT */
              ),
              t.slot.kind === "extra" ? ve((o(), $(
                "i",
                We,
                null,
                512
                /* NEED_PATCH */
              )), [
                [R, "Only on this day"]
              ]) : V("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          t.slot.skipped ? V("v-if", !0) : (o(), I(D, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: y.value,
            onClick: n[0] || (n[0] = (L) => i.value.toggle(L))
          }, null, 8, ["disabled"])),
          m(z, {
            ref_key: "menu",
            ref: i,
            model: C.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        k.value ? (o(), I(P, {
          key: 0,
          severity: "error"
        }, {
          default: A(() => [
            W(
              N(k.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        t.slot.skipped ? (o(), $("div", Ye, [
          n[3] || (n[3] = b(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          m(D, {
            label: "Undo",
            size: "small",
            text: "",
            loading: y.value,
            onClick: n[1] || (n[1] = (L) => S("undo"))
          }, null, 8, ["loading"])
        ])) : (o(), $(
          G,
          { key: 2 },
          [
            (o(!0), $(
              G,
              null,
              J(t.slot.entries, (L) => (o(), I(te(ke), {
                key: L.id,
                hub: "entry:interact",
                context: { entry: L, mealType: t.slot.id },
                onResolve: n[2] || (n[2] = (w) => a("changed"))
              }, {
                default: A(({ open: w }) => [
                  m(Oe, {
                    entry: L,
                    onInteract: w
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            m(te(ae), {
              name: "timeline.slot.suggestions",
              context: { date: t.date, slot: t.slot, onChanged: () => a("changed") }
            }, null, 8, ["context"]),
            t.slot.entries.length ? V("v-if", !0) : (o(), I(D, {
              key: 0,
              class: "empty-slot-btn",
              icon: "pi pi-plus",
              size: "small",
              text: "",
              "aria-label": "Add meal",
              onClick: r
            }))
          ],
          64
          /* STABLE_FRAGMENT */
        ))
      ], 8, je);
    };
  }
}), Qe = /* @__PURE__ */ ee(Ge, [["__scopeId", "data-v-7bb29b64"]]);
function Je(t, T) {
  const e = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", a = new Set(T);
  let d = e.slice(0, 64).replace(/-+$/g, "");
  for (let i = 2; a.has(d); i++) {
    const k = `-${i}`;
    d = e.slice(0, 64 - k.length).replace(/-+$/g, "") + k;
  }
  return d;
}
const Ke = /* @__PURE__ */ K({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(t, { emit: T }) {
    const e = t, a = T, d = ne(), i = g(""), k = g(null), y = g(!1), r = g(""), S = j(() => [{ label: "At the end", value: null }, ...e.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    re(() => e.visible, (p) => {
      p && (i.value = "", k.value = null, r.value = "");
    });
    async function C() {
      if (!(!i.value.trim() || y.value)) {
        y.value = !0, r.value = "";
        try {
          const p = Je(i.value, [...e.slots.map((n) => n.id), ...d.store.household.value.meal_types.map((n) => n.id)]);
          await d.api.put(`/api/x/core-timeline/days/${e.date}/slots/${p}`, { kind: "extra", label: i.value.trim(), before: k.value }), a("changed"), a("update:visible", !1);
        } catch (p) {
          r.value = p.message || "Could not add slot";
        } finally {
          y.value = !1;
        }
      }
    }
    return (p, n) => {
      const D = f("Message"), z = f("InputText"), P = f("Select"), R = f("Button"), L = f("Dialog");
      return o(), I(L, {
        visible: t.visible,
        "onUpdate:visible": n[2] || (n[2] = (w) => a("update:visible", w)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: A(() => [
          b(
            "form",
            {
              onSubmit: me(C, ["prevent"])
            },
            [
              r.value ? (o(), I(D, {
                key: 0,
                severity: "error"
              }, {
                default: A(() => [
                  W(
                    N(r.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : V("v-if", !0),
              n[3] || (n[3] = b(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              m(z, {
                id: "extra-slot-name",
                modelValue: i.value,
                "onUpdate:modelValue": n[0] || (n[0] = (w) => i.value = w),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              n[4] || (n[4] = b(
                "label",
                { for: "extra-slot-position" },
                "Position",
                -1
                /* CACHED */
              )),
              m(P, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: k.value,
                "onUpdate:modelValue": n[1] || (n[1] = (w) => k.value = w),
                options: S.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              m(R, {
                label: "Add slot",
                type: "submit",
                loading: y.value,
                disabled: !i.value.trim()
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
}), Xe = /* @__PURE__ */ ee(Ke, [["__scopeId", "data-v-8c53feab"]]), Ze = ["data-timeline-date"], et = /* @__PURE__ */ K({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: T }) {
    const e = T, a = g(), d = g(!1), i = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      d.value = !0;
    } }];
    function k(y) {
      return (/* @__PURE__ */ new Date(`${y}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (y, r) => {
      const S = f("Tag"), C = f("Button"), p = f("Menu");
      return o(), $("section", {
        class: de(["day-card", { "is-today": t.day.isToday }]),
        "data-timeline-date": t.day.date
      }, [
        b("header", null, [
          b(
            "h3",
            null,
            N(k(t.day.date)),
            1
            /* TEXT */
          ),
          t.day.isToday ? (o(), I(S, {
            key: 0,
            value: "Today"
          })) : V("v-if", !0),
          m(C, {
            icon: "pi pi-ellipsis-v",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: r[0] || (r[0] = (n) => a.value.toggle(n))
          }),
          m(
            p,
            {
              ref_key: "menu",
              ref: a,
              model: i,
              popup: ""
            },
            null,
            512
            /* NEED_PATCH */
          )
        ]),
        (o(!0), $(
          G,
          null,
          J(t.day.slots, (n) => (o(), I(Qe, {
            key: n.id,
            slot: n,
            date: t.day.date,
            onAdd: r[1] || (r[1] = (D) => e("add", D)),
            onChanged: r[2] || (r[2] = (D) => e("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        m(te(ae), {
          name: "timeline.day.footer",
          context: { date: t.day.date }
        }, null, 8, ["context"]),
        m(Xe, {
          visible: d.value,
          "onUpdate:visible": r[3] || (r[3] = (n) => d.value = n),
          date: t.day.date,
          slots: t.day.slots,
          onChanged: r[4] || (r[4] = (n) => e("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ze);
    };
  }
}), ue = /* @__PURE__ */ ee(et, [["__scopeId", "data-v-1b485257"]]), tt = { class: "add-entry" }, at = { key: 0 }, lt = { class: "quick-notes" }, nt = /* @__PURE__ */ K({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(t, { emit: T }) {
    const e = t, a = T, d = ["Dining out", "Leftovers", "Takeout", "Quick meal"], i = ne(), k = g("recipes"), y = g(""), r = g([]), S = g([]), C = g(""), p = g(2), n = g(!1), D = g(""), z = j(() => {
      var q, E;
      const s = (((q = i.store.household.value) == null ? void 0 : q.meal_types) || []).find(
        (Q) => {
          var _, v, h, x;
          return Q.id === e.mealType || ((_ = Q.id) == null ? void 0 : _.toLowerCase()) === ((v = e.mealType) == null ? void 0 : v.toLowerCase()) || ((h = Q.label) == null ? void 0 : h.toLowerCase()) === ((x = e.mealType) == null ? void 0 : x.toLowerCase());
        }
      );
      if (s && Array.isArray(s.predefined_notes))
        return s.predefined_notes;
      const H = (E = i.store.household.value) == null ? void 0 : E.predefined_notes;
      return Array.isArray(H) ? H : d;
    });
    let P = 0;
    async function R() {
      const w = ++P;
      try {
        const s = await i.api.get("/api/recipes", { q: y.value });
        w === P && (r.value = s.items);
      } catch (s) {
        w === P && (D.value = s.message);
      }
    }
    re(() => e.visible, async (w) => {
      if (!w) {
        ++P;
        return;
      }
      k.value = "recipes", y.value = "", C.value = "", p.value = 2, D.value = "", r.value = [], await R();
      try {
        S.value = await i.api.get("/api/x/core-shortlist");
      } catch {
        S.value = [];
      }
    });
    async function L(w) {
      var q;
      if (n.value || !w && !C.value.trim()) return;
      n.value = !0, D.value = "";
      const s = e.date < le(), H = s ? "cooked" : "planned";
      try {
        const E = await i.api.post("/api/timeline", { date: e.date, meal_type: e.mealType, entry_type: w ? "recipe" : "note", ...w ? { recipe_id: w } : { title: C.value }, servings_override: p.value, status: H, ...s && ((q = i.store.currentMember.value) != null && q.id) ? { cooked_by_member_id: i.store.currentMember.value.id } : {} });
        a("created", E), a("update:visible", !1);
      } catch (E) {
        D.value = E.message || "Could not add meal";
      } finally {
        n.value = !1;
      }
    }
    return (w, s) => {
      const H = f("Message"), q = f("InputNumber"), E = f("Tab"), Q = f("TabList"), _ = f("InputText"), v = f("Button"), h = f("TabPanel"), x = f("TabPanels"), B = f("Tabs"), u = f("Dialog");
      return o(), I(u, {
        visible: t.visible,
        "onUpdate:visible": s[5] || (s[5] = (l) => a("update:visible", l)),
        header: `Add meal · ${t.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: A(() => [
          b("div", tt, [
            D.value ? (o(), I(H, {
              key: 0,
              severity: "error"
            }, {
              default: A(() => [
                W(
                  N(D.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : V("v-if", !0),
            s[11] || (s[11] = b(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            m(q, {
              inputId: "entry-servings",
              modelValue: p.value,
              "onUpdate:modelValue": s[0] || (s[0] = (l) => p.value = l),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            m(B, {
              value: k.value,
              "onUpdate:value": s[4] || (s[4] = (l) => k.value = l)
            }, {
              default: A(() => [
                m(Q, null, {
                  default: A(() => [
                    m(E, { value: "recipes" }, {
                      default: A(() => [...s[6] || (s[6] = [
                        W(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    m(E, { value: "shortlist" }, {
                      default: A(() => [...s[7] || (s[7] = [
                        W(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    m(E, { value: "note" }, {
                      default: A(() => [...s[8] || (s[8] = [
                        W(
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
                m(x, null, {
                  default: A(() => [
                    m(h, { value: "recipes" }, {
                      default: A(() => [
                        s[9] || (s[9] = b(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        m(_, {
                          id: "entry-recipe-search",
                          modelValue: y.value,
                          "onUpdate:modelValue": s[1] || (s[1] = (l) => y.value = l),
                          onInput: R,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (o(!0), $(
                          G,
                          null,
                          J(r.value, (l) => (o(), $("div", {
                            key: l.id,
                            class: "recipe-result"
                          }, [
                            b(
                              "span",
                              null,
                              N(l.title),
                              1
                              /* TEXT */
                            ),
                            m(v, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (c) => L(l.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    m(h, { value: "shortlist" }, {
                      default: A(() => [
                        S.value.length ? V("v-if", !0) : (o(), $("p", at, "No recipes in shortlist")),
                        (o(!0), $(
                          G,
                          null,
                          J(S.value, (l) => (o(), $("div", {
                            key: l.recipe_id,
                            class: "recipe-result"
                          }, [
                            b(
                              "span",
                              null,
                              N(l.recipe_title),
                              1
                              /* TEXT */
                            ),
                            m(v, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (c) => L(l.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    m(h, { value: "note" }, {
                      default: A(() => [
                        s[10] || (s[10] = b(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        m(_, {
                          id: "entry-note",
                          modelValue: C.value,
                          "onUpdate:modelValue": s[2] || (s[2] = (l) => C.value = l),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        b("div", lt, [
                          (o(!0), $(
                            G,
                            null,
                            J(z.value, (l) => (o(), I(v, {
                              key: l,
                              label: l,
                              outlined: "",
                              size: "small",
                              onClick: (c) => C.value = l
                            }, null, 8, ["label", "onClick"]))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        m(v, {
                          label: "Add meal",
                          loading: n.value,
                          disabled: !C.value.trim(),
                          onClick: s[3] || (s[3] = (l) => L())
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
}), ot = /* @__PURE__ */ ee(nt, [["__scopeId", "data-v-23ac8af0"]]), it = { class: "timeline-page" }, st = { class: "timeline-toolbar" }, rt = { class: "timeline-container" }, dt = { class: "timeline-sidebar-wrapper" }, ut = { class: "timeline-feed" }, ct = { class: "past-days" }, vt = ["data-timeline-date"], mt = /* @__PURE__ */ K({
  __name: "TimelinePage",
  setup(t) {
    const T = ne(), e = g(le()), a = g({ from: O(e.value, -2), to: O(e.value, 6) }), d = g([]), i = g({}), k = g(""), y = g(/* @__PURE__ */ new Set()), r = g(null), S = g(window.innerWidth < 768), C = g([]), p = pe("__SS_SLOT_REGISTRY__"), n = j(() => (p == null ? void 0 : p.getContributions("timeline.sidebar")) || []), D = j(() => he(a.value, i.value, d.value, e.value)), z = j(() => D.value.filter((u) => u.isPast)), P = j(() => D.value.filter((u) => !u.isPast));
    let R = 0, L, w = !1;
    async function s() {
      clearTimeout(L);
      const u = ++R, { from: l, to: c } = a.value;
      k.value = "";
      try {
        const U = [], X = {};
        for (let Y = l; Y <= c; ) {
          const Z = O(Y, 62) < c ? O(Y, 62) : c, F = { from: Y, to: Z }, [oe, ie] = await Promise.all([T.api.get("/api/timeline", F), T.api.get("/api/x/core-timeline/slots", F)]);
          if (u !== R || w) return;
          U.push(...oe), Object.assign(X, ie.days), Y = O(Z, 1);
        }
        d.value = U, i.value = X;
      } catch (U) {
        u === R && !w && (k.value = U.message || "Could not load Timeline");
      }
    }
    function H() {
      clearTimeout(L), L = setTimeout(s, 300);
    }
    const q = ["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:slots-changed", "recipe:deleted"].map((u) => T.on(u, H));
    function E() {
      S.value = window.innerWidth < 768;
    }
    function Q() {
      a.value = { ...a.value, from: O(a.value.from, -4) }, s();
    }
    function _() {
      a.value = { ...a.value, to: O(a.value.to, 5) }, s();
    }
    async function v() {
      var u, l;
      e.value = le(), a.value = { from: O(e.value, -2), to: O(e.value, 6) }, y.value.clear(), await s(), await be(), (l = (u = document.querySelector(".day-card.is-today")) == null ? void 0 : u.scrollIntoView) == null || l.call(u, { block: "start", behavior: "smooth" });
    }
    function h(u) {
      y.value.has(u) ? y.value.delete(u) : y.value.add(u);
    }
    function x(u) {
      return (/* @__PURE__ */ new Date(`${u}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function B(u) {
      return u.slots.flatMap((l) => l.entries.map((c) => {
        var U;
        return `${c.status === "cooked" ? "✓ " : ""}${l.label.toUpperCase()} ${((U = c.recipe) == null ? void 0 : U.title) || c.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    return ye(() => {
      s(), window.addEventListener("resize", E);
    }), fe(() => {
      w = !0, ++R, clearTimeout(L), q.forEach((u) => {
        typeof u == "function" && u();
      }), window.removeEventListener("resize", E);
    }), (u, l) => {
      var oe, ie;
      const c = f("Button"), U = f("Message"), X = f("AccordionHeader"), Y = f("AccordionContent"), Z = f("AccordionPanel"), F = f("Accordion");
      return o(), $("div", it, [
        b("div", st, [
          l[4] || (l[4] = b(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          m(c, {
            label: "Today",
            icon: "pi pi-calendar",
            size: "small",
            outlined: "",
            onClick: v
          })
        ]),
        k.value ? (o(), I(U, {
          key: 0,
          severity: "error"
        }, {
          default: A(() => [
            W(
              N(k.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : V("v-if", !0),
        b("div", rt, [
          b("aside", dt, [
            S.value ? (o(), I(F, {
              key: 0,
              value: C.value,
              "onUpdate:value": l[0] || (l[0] = (M) => C.value = M),
              multiple: ""
            }, {
              default: A(() => [
                (o(!0), $(
                  G,
                  null,
                  J(n.value, (M) => (o(), I(Z, {
                    key: M.id,
                    value: M.id
                  }, {
                    default: A(() => [
                      m(
                        X,
                        null,
                        {
                          default: A(() => [
                            W(
                              N(M.pluginId === "core-shortlist" ? "Shortlist" : M.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : M.pluginId === "core-recurring" ? "Recurring meals" : M.pluginId),
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
                      m(
                        Y,
                        null,
                        {
                          default: A(() => [
                            (o(), I(ge(M.component), { context: a.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (o(), I(te(ae), {
              key: 1,
              name: "timeline.sidebar",
              context: a.value
            }, null, 8, ["context"]))
          ]),
          b("div", ut, [
            m(c, {
              label: "Show 4 earlier days",
              size: "small",
              text: "",
              onClick: Q
            }),
            b("div", ct, [
              (o(!0), $(
                G,
                null,
                J(z.value, (M) => (o(), $("div", {
                  key: M.date,
                  "data-timeline-date": y.value.has(M.date) ? void 0 : M.date
                }, [
                  m(c, {
                    class: "past-day-line",
                    label: `${x(M.date)} · ${B(M)}`,
                    size: "small",
                    text: "",
                    "aria-expanded": y.value.has(M.date),
                    onClick: (se) => h(M.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  y.value.has(M.date) ? (o(), I(ue, {
                    key: 0,
                    day: M,
                    onAdd: l[1] || (l[1] = (se) => r.value = se),
                    onChanged: s
                  }, null, 8, ["day"])) : V("v-if", !0)
                ], 8, vt))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (o(!0), $(
              G,
              null,
              J(P.value, (M) => (o(), I(ue, {
                key: M.date,
                day: M,
                onAdd: l[2] || (l[2] = (se) => r.value = se),
                onChanged: s
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            m(c, {
              label: "Show 5 more days",
              size: "small",
              outlined: "",
              onClick: _
            })
          ])
        ]),
        m(ot, {
          visible: !!r.value,
          date: ((oe = r.value) == null ? void 0 : oe.date) || e.value,
          mealType: ((ie = r.value) == null ? void 0 : ie.mealType) || "",
          "onUpdate:visible": l[3] || (l[3] = (M) => {
            M || (r.value = null);
          }),
          onCreated: s
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), pt = /* @__PURE__ */ ee(mt, [["__scopeId", "data-v-964f9676"]]);
function gt(t) {
  t.route({ path: "/timeline", component: pt, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.slot("timeline.entry.badge", _e, { order: 10 }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
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
      var d;
      const a = e.entry;
      if (a.status === "cooked")
        await t.outbox.enqueue({
          method: "PATCH",
          path: `/api/timeline/${a.id}`,
          body: { revision: a.revision, status: "planned", cooked_by_member_id: null }
        }), a.status = "planned", a.cooked_by_member_id = null, a.revision = (a.revision || 1) + 1, t.notify({ level: "info", message: "Meal unmarked as cooked" });
      else {
        const i = a.assigned_cook_id || ((d = t.store.currentMember.value) == null ? void 0 : d.id) || null;
        await t.outbox.enqueue({
          method: "PATCH",
          path: `/api/timeline/${a.id}`,
          body: { revision: a.revision, status: "cooked", cooked_by_member_id: i }
        }), a.status = "cooked", a.cooked_by_member_id = i, a.revision = (a.revision || 1) + 1, t.notify({ level: "success", message: "Meal marked as cooked!" });
      }
    }
  }), t.intent.provider({
    hub: "entry:interact",
    id: "move",
    title: "Move meal",
    icon: "arrow-right-arrow-left",
    order: 30,
    kind: "ui",
    component: Ue,
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
  const T = async () => {
    try {
      const e = le(), a = await t.api.get(`/api/timeline?from=${O(e, -2)}&to=${O(e, 14)}`);
      for (const d of a) d.recipe_id && t.api.get(`/api/recipes/${d.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  T();
  for (const e of ["timeline:created", "timeline:updated", "timeline:deleted"]) t.on(e, T);
}
export {
  gt as default
};
