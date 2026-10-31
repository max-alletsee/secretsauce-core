import { defineComponent as G, resolveComponent as m, openBlock as i, createBlock as w, createCommentVNode as A, resolveDirective as de, createElementBlock as h, createVNode as u, withCtx as T, createElementVNode as _, toDisplayString as I, withDirectives as ue, unref as J, withModifiers as ce, ref as f, computed as Y, normalizeClass as ve, createTextVNode as z, Fragment as E, renderList as F, watch as me, inject as pe, onMounted as ye, onBeforeUnmount as fe, resolveDynamicComponent as be, nextTick as ge } from "vue";
import { Slot as X, useSecretSauce as ie, IntentTrigger as ke } from "@secretsauce/ui";
const _e = /* @__PURE__ */ G({
  __name: "CookedBadge",
  props: {
    context: {}
  },
  setup(t) {
    return (b, e) => {
      var d, l;
      const a = m("Tag");
      return ((l = (d = t.context) == null ? void 0 : d.entry) == null ? void 0 : l.status) === "cooked" ? (i(), w(a, {
        key: 0,
        value: "Cooked",
        icon: "pi pi-check",
        severity: "success",
        title: "Cooked"
      })) : A("v-if", !0);
    };
  }
}), he = { class: "card-header" }, $e = { class: "card-title" }, Ce = ["aria-label"], Te = {
  key: 0,
  class: "card-servings"
}, we = {
  key: 1,
  class: "card-note"
}, Se = /* @__PURE__ */ G({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: b }) {
    function e(d) {
      return (/* @__PURE__ */ new Date(`${d}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const a = b;
    return (d, l) => {
      const v = m("Button"), c = de("tooltip");
      return i(), h("div", {
        class: "schedule-card",
        onClick: l[1] || (l[1] = (r) => a("interact", r))
      }, [
        u(v, {
          class: "schedule-card-main",
          variant: "text"
        }, {
          default: T(() => {
            var r;
            return [
              _("div", he, [
                _(
                  "span",
                  $e,
                  I(((r = t.entry.recipe) == null ? void 0 : r.title) || t.entry.title || "Planned Meal"),
                  1
                  /* TEXT */
                ),
                t.entry.origin === "plugin:core-recurring" ? ue((i(), h("i", {
                  key: 0,
                  class: "pi pi-replay",
                  "aria-label": `Repeats every ${e(t.entry.date)}`
                }, null, 8, Ce)), [
                  [c, `Repeats every ${e(t.entry.date)}`]
                ]) : A("v-if", !0),
                u(J(X), {
                  name: "timeline.entry.badge",
                  context: { entry: t.entry }
                }, null, 8, ["context"])
              ]),
              t.entry.servings_override ? (i(), h(
                "div",
                Te,
                I(t.entry.servings_override) + " servings",
                1
                /* TEXT */
              )) : A("v-if", !0),
              t.entry.note ? (i(), h(
                "div",
                we,
                I(t.entry.note),
                1
                /* TEXT */
              )) : A("v-if", !0)
            ];
          }),
          _: 1
          /* STABLE */
        }),
        t.entry.status === "cooked" ? (i(), h("div", {
          key: 0,
          class: "card-footer",
          onClick: l[0] || (l[0] = ce(() => {
          }, ["stop"]))
        }, [
          u(J(X), {
            name: "timeline.entry.footer",
            context: { entry: t.entry }
          }, null, 8, ["context"])
        ])) : A("v-if", !0)
      ]);
    };
  }
}), K = (t, b) => {
  const e = t.__vccOpts || t;
  for (const [a, d] of b)
    e[a] = d;
  return e;
}, xe = /* @__PURE__ */ K(Se, [["__scopeId", "data-v-f5fb2957"]]), De = ["data-slot-id"], Ae = { class: "slot-header" }, Me = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Le = {
  key: 1,
  class: "skipped-row"
}, Ie = /* @__PURE__ */ G({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: b }) {
    const e = t, a = b, d = ie(), l = f(), v = f(""), c = f(!1);
    function r() {
      a("add", { date: e.date, mealType: e.slot.id });
    }
    async function C(p) {
      if (!c.value) {
        c.value = !0, v.value = "";
        try {
          if (p === "remove" && e.slot.entries.length && !await d.confirm({ header: "Remove slot", message: `Remove ${e.slot.label} and its ${e.slot.entries.length} planned meal${e.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const n = `/api/x/core-timeline/days/${e.date}/slots/${encodeURIComponent(e.slot.id)}`;
          p === "skip" ? await d.api.put(n, { kind: "skip" }) : await d.api.delete(n, p === "remove" ? { with_entries: "true" } : void 0), a("changed");
        } catch (n) {
          v.value = n.message || "Could not change slot";
        } finally {
          c.value = !1;
        }
      }
    }
    const $ = Y(() => [{ label: "Add another meal", icon: "pi pi-plus", command: r }, ...e.slot.kind === "default" && !e.slot.entries.length ? [{ label: "Skip on this day", command: () => C("skip") }] : [], ...e.slot.kind === "extra" && !e.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => C("remove") }] : []]);
    return (p, n) => {
      const S = m("Button"), O = m("Menu"), B = m("Message"), V = de("tooltip");
      return i(), h("div", {
        class: "meal-slot",
        "data-slot-id": t.slot.id
      }, [
        _("div", Ae, [
          _(
            "span",
            {
              class: ve(["slot-name", { skipped: t.slot.skipped }])
            },
            [
              z(
                I(t.slot.label) + " ",
                1
                /* TEXT */
              ),
              t.slot.kind === "extra" ? ue((i(), h(
                "i",
                Me,
                null,
                512
                /* NEED_PATCH */
              )), [
                [V, "Only on this day"]
              ]) : A("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          t.slot.skipped ? A("v-if", !0) : (i(), w(S, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: c.value,
            onClick: n[0] || (n[0] = (x) => l.value.toggle(x))
          }, null, 8, ["disabled"])),
          u(O, {
            ref_key: "menu",
            ref: l,
            model: $.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        v.value ? (i(), w(B, {
          key: 0,
          severity: "error"
        }, {
          default: T(() => [
            z(
              I(v.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        t.slot.skipped ? (i(), h("div", Le, [
          n[3] || (n[3] = _(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          u(S, {
            label: "Undo",
            size: "small",
            text: "",
            loading: c.value,
            onClick: n[1] || (n[1] = (x) => C("undo"))
          }, null, 8, ["loading"])
        ])) : (i(), h(
          E,
          { key: 2 },
          [
            (i(!0), h(
              E,
              null,
              F(t.slot.entries, (x) => (i(), w(J(ke), {
                key: x.id,
                hub: "entry:interact",
                context: { entry: x, mealType: t.slot.id },
                onResolve: n[2] || (n[2] = (g) => a("changed"))
              }, {
                default: T(({ open: g }) => [
                  u(xe, {
                    entry: x,
                    onInteract: g
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            u(J(X), {
              name: "timeline.slot.suggestions",
              context: { date: t.date, slot: t.slot, onChanged: () => a("changed") }
            }, null, 8, ["context"]),
            t.slot.entries.length ? A("v-if", !0) : (i(), w(S, {
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
      ], 8, De);
    };
  }
}), Ve = /* @__PURE__ */ K(Ie, [["__scopeId", "data-v-c6b8aadf"]]);
function Be(t, b) {
  const e = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", a = new Set(b);
  let d = e.slice(0, 64).replace(/-+$/g, "");
  for (let l = 2; a.has(d); l++) {
    const v = `-${l}`;
    d = e.slice(0, 64 - v.length).replace(/-+$/g, "") + v;
  }
  return d;
}
const Pe = /* @__PURE__ */ G({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(t, { emit: b }) {
    const e = t, a = b, d = ie(), l = f(""), v = f(null), c = f(!1), r = f(""), C = Y(() => [{ label: "At the end", value: null }, ...e.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    me(() => e.visible, (p) => {
      p && (l.value = "", v.value = null, r.value = "");
    });
    async function $() {
      if (!(!l.value.trim() || c.value)) {
        c.value = !0, r.value = "";
        try {
          const p = Be(l.value, [...e.slots.map((n) => n.id), ...d.store.household.value.meal_types.map((n) => n.id)]);
          await d.api.put(`/api/x/core-timeline/days/${e.date}/slots/${p}`, { kind: "extra", label: l.value.trim(), before: v.value }), a("changed"), a("update:visible", !1);
        } catch (p) {
          r.value = p.message || "Could not add slot";
        } finally {
          c.value = !1;
        }
      }
    }
    return (p, n) => {
      const S = m("Message"), O = m("InputText"), B = m("Select"), V = m("Button"), x = m("Dialog");
      return i(), w(x, {
        visible: t.visible,
        "onUpdate:visible": n[2] || (n[2] = (g) => a("update:visible", g)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: T(() => [
          _(
            "form",
            {
              onSubmit: ce($, ["prevent"])
            },
            [
              r.value ? (i(), w(S, {
                key: 0,
                severity: "error"
              }, {
                default: T(() => [
                  z(
                    I(r.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : A("v-if", !0),
              n[3] || (n[3] = _(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              u(O, {
                id: "extra-slot-name",
                modelValue: l.value,
                "onUpdate:modelValue": n[0] || (n[0] = (g) => l.value = g),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              n[4] || (n[4] = _(
                "label",
                { for: "extra-slot-position" },
                "Position",
                -1
                /* CACHED */
              )),
              u(B, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: v.value,
                "onUpdate:modelValue": n[1] || (n[1] = (g) => v.value = g),
                options: C.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              u(V, {
                label: "Add slot",
                type: "submit",
                loading: c.value,
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
}), Re = /* @__PURE__ */ K(Pe, [["__scopeId", "data-v-8c53feab"]]), Ue = ["data-timeline-date"], ze = /* @__PURE__ */ G({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: b }) {
    const e = b, a = f(), d = f(!1), l = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      d.value = !0;
    } }];
    function v(c) {
      return (/* @__PURE__ */ new Date(`${c}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (c, r) => {
      const C = m("Tag"), $ = m("Button"), p = m("Menu");
      return i(), h("section", {
        class: ve(["day-card", { "is-today": t.day.isToday }]),
        "data-timeline-date": t.day.date
      }, [
        _("header", null, [
          _(
            "h3",
            null,
            I(v(t.day.date)),
            1
            /* TEXT */
          ),
          t.day.isToday ? (i(), w(C, {
            key: 0,
            value: "Today"
          })) : A("v-if", !0),
          u($, {
            icon: "pi pi-ellipsis-v",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: r[0] || (r[0] = (n) => a.value.toggle(n))
          }),
          u(
            p,
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
        (i(!0), h(
          E,
          null,
          F(t.day.slots, (n) => (i(), w(Ve, {
            key: n.id,
            slot: n,
            date: t.day.date,
            onAdd: r[1] || (r[1] = (S) => e("add", S)),
            onChanged: r[2] || (r[2] = (S) => e("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        u(J(X), {
          name: "timeline.day.footer",
          context: { date: t.day.date }
        }, null, 8, ["context"]),
        u(Re, {
          visible: d.value,
          "onUpdate:visible": r[3] || (r[3] = (n) => d.value = n),
          date: t.day.date,
          slots: t.day.slots,
          onChanged: r[4] || (r[4] = (n) => e("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), re = /* @__PURE__ */ K(ze, [["__scopeId", "data-v-1b485257"]]);
function oe() {
  const t = /* @__PURE__ */ new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function L(t, b) {
  const e = /* @__PURE__ */ new Date(`${t}T12:00:00`);
  return e.setDate(e.getDate() + b), `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Ee(t, b, e, a) {
  const d = [];
  for (let l = t.from; l <= t.to; l = L(l, 1)) {
    const v = (b[l] || []).map((c) => ({ ...c, entries: [] }));
    for (const c of e.filter((r) => r.date === l)) {
      const r = c.meal_type.toLowerCase();
      let C = v.find(($) => $.id.toLowerCase() === r) || v.find(($) => $.label.toLowerCase() === r);
      C || (C = { id: c.meal_type, label: c.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, ($) => $.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, v.push(C)), C.entries.push(c), C.skipped = !1;
    }
    d.push({ date: l, isPast: l < a, isToday: l === a, slots: v });
  }
  return d;
}
const Ne = { class: "add-entry" }, qe = { key: 0 }, Fe = { class: "quick-notes" }, Oe = /* @__PURE__ */ G({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(t, { emit: b }) {
    const e = t, a = b, d = ["Dining out", "Leftovers", "Takeout", "Quick meal"], l = ie(), v = f("recipes"), c = f(""), r = f([]), C = f([]), $ = f(""), p = f(2), n = f(!1), S = f(""), O = Y(() => {
      var P, M;
      const o = (((P = l.store.household.value) == null ? void 0 : P.meal_types) || []).find(
        (j) => {
          var H, R, q, Q;
          return j.id === e.mealType || ((H = j.id) == null ? void 0 : H.toLowerCase()) === ((R = e.mealType) == null ? void 0 : R.toLowerCase()) || ((q = j.label) == null ? void 0 : q.toLowerCase()) === ((Q = e.mealType) == null ? void 0 : Q.toLowerCase());
        }
      );
      if (o && Array.isArray(o.predefined_notes))
        return o.predefined_notes;
      const N = (M = l.store.household.value) == null ? void 0 : M.predefined_notes;
      return Array.isArray(N) ? N : d;
    });
    let B = 0;
    async function V() {
      const g = ++B;
      try {
        const o = await l.api.get("/api/recipes", { q: c.value });
        g === B && (r.value = o.items);
      } catch (o) {
        g === B && (S.value = o.message);
      }
    }
    me(() => e.visible, async (g) => {
      if (!g) {
        ++B;
        return;
      }
      v.value = "recipes", c.value = "", $.value = "", p.value = 2, S.value = "", r.value = [], await V();
      try {
        C.value = await l.api.get("/api/x/core-shortlist");
      } catch {
        C.value = [];
      }
    });
    async function x(g) {
      var P;
      if (n.value || !g && !$.value.trim()) return;
      n.value = !0, S.value = "";
      const o = e.date < oe(), N = o ? "cooked" : "planned";
      try {
        const M = await l.api.post("/api/timeline", { date: e.date, meal_type: e.mealType, entry_type: g ? "recipe" : "note", ...g ? { recipe_id: g } : { title: $.value }, servings_override: p.value, status: N, ...o && ((P = l.store.currentMember.value) != null && P.id) ? { cooked_by_member_id: l.store.currentMember.value.id } : {} });
        a("created", M), a("update:visible", !1);
      } catch (M) {
        S.value = M.message || "Could not add meal";
      } finally {
        n.value = !1;
      }
    }
    return (g, o) => {
      const N = m("Message"), P = m("InputNumber"), M = m("Tab"), j = m("TabList"), H = m("InputText"), R = m("Button"), q = m("TabPanel"), Q = m("TabPanels"), se = m("Tabs"), y = m("Dialog");
      return i(), w(y, {
        visible: t.visible,
        "onUpdate:visible": o[5] || (o[5] = (s) => a("update:visible", s)),
        header: `Add meal · ${t.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: T(() => [
          _("div", Ne, [
            S.value ? (i(), w(N, {
              key: 0,
              severity: "error"
            }, {
              default: T(() => [
                z(
                  I(S.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : A("v-if", !0),
            o[11] || (o[11] = _(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            u(P, {
              inputId: "entry-servings",
              modelValue: p.value,
              "onUpdate:modelValue": o[0] || (o[0] = (s) => p.value = s),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            u(se, {
              value: v.value,
              "onUpdate:value": o[4] || (o[4] = (s) => v.value = s)
            }, {
              default: T(() => [
                u(j, null, {
                  default: T(() => [
                    u(M, { value: "recipes" }, {
                      default: T(() => [...o[6] || (o[6] = [
                        z(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    u(M, { value: "shortlist" }, {
                      default: T(() => [...o[7] || (o[7] = [
                        z(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    u(M, { value: "note" }, {
                      default: T(() => [...o[8] || (o[8] = [
                        z(
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
                u(Q, null, {
                  default: T(() => [
                    u(q, { value: "recipes" }, {
                      default: T(() => [
                        o[9] || (o[9] = _(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        u(H, {
                          id: "entry-recipe-search",
                          modelValue: c.value,
                          "onUpdate:modelValue": o[1] || (o[1] = (s) => c.value = s),
                          onInput: V,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (i(!0), h(
                          E,
                          null,
                          F(r.value, (s) => (i(), h("div", {
                            key: s.id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              I(s.title),
                              1
                              /* TEXT */
                            ),
                            u(R, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (D) => x(s.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(q, { value: "shortlist" }, {
                      default: T(() => [
                        C.value.length ? A("v-if", !0) : (i(), h("p", qe, "No recipes in shortlist")),
                        (i(!0), h(
                          E,
                          null,
                          F(C.value, (s) => (i(), h("div", {
                            key: s.recipe_id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              I(s.recipe_title),
                              1
                              /* TEXT */
                            ),
                            u(R, {
                              label: "Schedule",
                              loading: n.value,
                              onClick: (D) => x(s.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(q, { value: "note" }, {
                      default: T(() => [
                        o[10] || (o[10] = _(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        u(H, {
                          id: "entry-note",
                          modelValue: $.value,
                          "onUpdate:modelValue": o[2] || (o[2] = (s) => $.value = s),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        _("div", Fe, [
                          (i(!0), h(
                            E,
                            null,
                            F(O.value, (s) => (i(), w(R, {
                              key: s,
                              label: s,
                              outlined: "",
                              size: "small",
                              onClick: (D) => $.value = s
                            }, null, 8, ["label", "onClick"]))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        u(R, {
                          label: "Add meal",
                          loading: n.value,
                          disabled: !$.value.trim(),
                          onClick: o[3] || (o[3] = (s) => x())
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
}), je = /* @__PURE__ */ K(Oe, [["__scopeId", "data-v-23ac8af0"]]), He = { class: "timeline-page" }, We = { class: "timeline-toolbar" }, Ye = { class: "timeline-container" }, Ge = { class: "timeline-sidebar-wrapper" }, Qe = { class: "timeline-feed" }, Je = { class: "past-days" }, Ke = ["data-timeline-date"], Xe = /* @__PURE__ */ G({
  __name: "TimelinePage",
  setup(t) {
    const b = ie(), e = f(oe()), a = f({ from: L(e.value, -2), to: L(e.value, 6) }), d = f([]), l = f({}), v = f(""), c = f(/* @__PURE__ */ new Set()), r = f(null), C = f(window.innerWidth < 768), $ = f([]), p = pe("__SS_SLOT_REGISTRY__"), n = Y(() => (p == null ? void 0 : p.getContributions("timeline.sidebar")) || []), S = Y(() => Ee(a.value, l.value, d.value, e.value)), O = Y(() => S.value.filter((y) => y.isPast)), B = Y(() => S.value.filter((y) => !y.isPast));
    let V = 0, x, g = !1;
    async function o() {
      const y = ++V, { from: s, to: D } = a.value;
      v.value = "";
      try {
        const U = [], Z = {};
        for (let W = s; W <= D; ) {
          const ee = L(W, 62) < D ? L(W, 62) : D, te = { from: W, to: ee }, [ae, le] = await Promise.all([b.api.get("/api/timeline", te), b.api.get("/api/x/core-timeline/slots", te)]);
          if (y !== V || g) return;
          U.push(...ae), Object.assign(Z, le.days), W = L(ee, 1);
        }
        d.value = U, l.value = Z;
      } catch (U) {
        y === V && !g && (v.value = U.message || "Could not load Timeline");
      }
    }
    function N() {
      clearTimeout(x), x = setTimeout(o, 300);
    }
    const P = ["timeline:created", "timeline:updated", "timeline:deleted", "core-timeline:slots-changed"].map((y) => b.on(y, N));
    function M() {
      C.value = window.innerWidth < 768;
    }
    function j() {
      a.value = { ...a.value, from: L(a.value.from, -4) }, o();
    }
    function H() {
      a.value = { ...a.value, to: L(a.value.to, 5) }, o();
    }
    async function R() {
      var y, s;
      e.value = oe(), a.value = { from: L(e.value, -2), to: L(e.value, 6) }, c.value.clear(), await o(), await ge(), (s = (y = document.querySelector(".day-card.is-today")) == null ? void 0 : y.scrollIntoView) == null || s.call(y, { block: "start", behavior: "smooth" });
    }
    function q(y) {
      c.value.has(y) ? c.value.delete(y) : c.value.add(y);
    }
    function Q(y) {
      return (/* @__PURE__ */ new Date(`${y}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function se(y) {
      return y.slots.flatMap((s) => s.entries.map((D) => {
        var U;
        return `${D.status === "cooked" ? "✓ " : ""}${s.label.toUpperCase()} ${((U = D.recipe) == null ? void 0 : U.title) || D.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    return ye(() => {
      o(), window.addEventListener("resize", M);
    }), fe(() => {
      g = !0, ++V, clearTimeout(x), P.forEach((y) => {
        typeof y == "function" && y();
      }), window.removeEventListener("resize", M);
    }), (y, s) => {
      var ae, le;
      const D = m("Button"), U = m("Message"), Z = m("AccordionHeader"), W = m("AccordionContent"), ee = m("AccordionPanel"), te = m("Accordion");
      return i(), h("div", He, [
        _("div", We, [
          s[4] || (s[4] = _(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          u(D, {
            label: "Today",
            icon: "pi pi-calendar",
            size: "small",
            outlined: "",
            onClick: R
          })
        ]),
        v.value ? (i(), w(U, {
          key: 0,
          severity: "error"
        }, {
          default: T(() => [
            z(
              I(v.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : A("v-if", !0),
        _("div", Ye, [
          _("aside", Ge, [
            C.value ? (i(), w(te, {
              key: 0,
              value: $.value,
              "onUpdate:value": s[0] || (s[0] = (k) => $.value = k),
              multiple: ""
            }, {
              default: T(() => [
                (i(!0), h(
                  E,
                  null,
                  F(n.value, (k) => (i(), w(ee, {
                    key: k.id,
                    value: k.id
                  }, {
                    default: T(() => [
                      u(
                        Z,
                        null,
                        {
                          default: T(() => [
                            z(
                              I(k.pluginId === "core-shortlist" ? "Shortlist" : k.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : k.pluginId === "core-recurring" ? "Recurring meals" : k.pluginId),
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
                      u(
                        W,
                        null,
                        {
                          default: T(() => [
                            (i(), w(be(k.component), { context: a.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (i(), w(J(X), {
              key: 1,
              name: "timeline.sidebar",
              context: a.value
            }, null, 8, ["context"]))
          ]),
          _("div", Qe, [
            u(D, {
              label: "Show 4 earlier days",
              size: "small",
              text: "",
              onClick: j
            }),
            _("div", Je, [
              (i(!0), h(
                E,
                null,
                F(O.value, (k) => (i(), h("div", {
                  key: k.date,
                  "data-timeline-date": c.value.has(k.date) ? void 0 : k.date
                }, [
                  u(D, {
                    class: "past-day-line",
                    label: `${Q(k.date)} · ${se(k)}`,
                    size: "small",
                    text: "",
                    "aria-expanded": c.value.has(k.date),
                    onClick: (ne) => q(k.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  c.value.has(k.date) ? (i(), w(re, {
                    key: 0,
                    day: k,
                    onAdd: s[1] || (s[1] = (ne) => r.value = ne),
                    onChanged: o
                  }, null, 8, ["day"])) : A("v-if", !0)
                ], 8, Ke))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (i(!0), h(
              E,
              null,
              F(B.value, (k) => (i(), w(re, {
                key: k.date,
                day: k,
                onAdd: s[2] || (s[2] = (ne) => r.value = ne),
                onChanged: o
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            u(D, {
              label: "Show 5 more days",
              size: "small",
              outlined: "",
              onClick: H
            })
          ])
        ]),
        u(je, {
          visible: !!r.value,
          date: ((ae = r.value) == null ? void 0 : ae.date) || e.value,
          mealType: ((le = r.value) == null ? void 0 : le.mealType) || "",
          "onUpdate:visible": s[3] || (s[3] = (k) => {
            k || (r.value = null);
          }),
          onCreated: o
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Ze = /* @__PURE__ */ K(Xe, [["__scopeId", "data-v-c40a2a54"]]);
function at(t) {
  t.route({ path: "/timeline", component: Ze, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.slot("timeline.entry.badge", _e, { order: 10 }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
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
        const l = a.assigned_cook_id || ((d = t.store.currentMember.value) == null ? void 0 : d.id) || null;
        await t.outbox.enqueue({
          method: "PATCH",
          path: `/api/timeline/${a.id}`,
          body: { revision: a.revision, status: "cooked", cooked_by_member_id: l }
        }), a.status = "cooked", a.cooked_by_member_id = l, a.revision = (a.revision || 1) + 1, t.notify({ level: "success", message: "Meal marked as cooked!" });
      }
    }
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
  const b = async () => {
    try {
      const e = oe(), a = await t.api.get(`/api/timeline?from=${L(e, -2)}&to=${L(e, 14)}`);
      for (const d of a) d.recipe_id && t.api.get(`/api/recipes/${d.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  b();
  for (const e of ["timeline:created", "timeline:updated", "timeline:deleted"]) t.on(e, b);
}
export {
  at as default
};
