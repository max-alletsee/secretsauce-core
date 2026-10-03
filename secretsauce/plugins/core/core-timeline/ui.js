import { defineComponent as W, resolveComponent as f, resolveDirective as re, openBlock as s, createBlock as S, withCtx as k, createElementVNode as _, toDisplayString as V, withDirectives as ue, createElementBlock as $, createCommentVNode as I, createVNode as r, unref as ee, ref as y, computed as F, normalizeClass as ce, createTextVNode as j, Fragment as N, renderList as E, watch as ve, withModifiers as pe, inject as fe, onMounted as ye, onBeforeUnmount as ge, resolveDynamicComponent as be, nextTick as he } from "vue";
import { Slot as se, useSecretSauce as te, IntentTrigger as _e } from "@secretsauce/ui";
const ke = { class: "card-header" }, $e = { class: "card-title" }, we = ["aria-label"], Ce = {
  key: 0,
  class: "card-servings"
}, Se = {
  key: 1,
  class: "card-note"
}, Te = /* @__PURE__ */ W({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(e, { emit: g }) {
    function t(o) {
      return (/* @__PURE__ */ new Date(`${o}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const n = g;
    return (o, d) => {
      const u = f("Button"), c = re("tooltip");
      return s(), S(u, {
        class: "schedule-card",
        variant: "text",
        onClick: d[0] || (d[0] = (i) => n("interact", i))
      }, {
        default: k(() => {
          var i;
          return [
            _("div", ke, [
              _(
                "span",
                $e,
                V(((i = e.entry.recipe) == null ? void 0 : i.title) || e.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              e.entry.origin === "plugin:core-recurring" ? ue((s(), $("i", {
                key: 0,
                class: "pi pi-replay",
                "aria-label": `Repeats every ${t(e.entry.date)}`
              }, null, 8, we)), [
                [c, `Repeats every ${t(e.entry.date)}`]
              ]) : I("v-if", !0),
              r(ee(se), {
                name: "timeline.entry.badge",
                context: { entry: e.entry }
              }, null, 8, ["context"])
            ]),
            e.entry.servings_override ? (s(), $(
              "div",
              Ce,
              V(e.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : I("v-if", !0),
            e.entry.note ? (s(), $(
              "div",
              Se,
              V(e.entry.note),
              1
              /* TEXT */
            )) : I("v-if", !0)
          ];
        }),
        _: 1
        /* STABLE */
      });
    };
  }
}), Y = (e, g) => {
  const t = e.__vccOpts || e;
  for (const [n, o] of g)
    t[n] = o;
  return t;
}, xe = /* @__PURE__ */ Y(Te, [["__scopeId", "data-v-c4318b17"]]), De = ["data-slot-id"], Ae = { class: "slot-header" }, Ie = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Me = {
  key: 1,
  class: "skipped-row"
}, Ve = /* @__PURE__ */ W({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = e, n = g, o = te(), d = y(), u = y(""), c = y(!1);
    function i() {
      n("add", { date: t.date, mealType: t.slot.id });
    }
    async function m(p) {
      if (!c.value) {
        c.value = !0, u.value = "";
        try {
          if (p === "remove" && t.slot.entries.length && !await o.confirm({ header: "Remove slot", message: `Remove ${t.slot.label} and its ${t.slot.entries.length} planned meal${t.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const l = `/api/x/core-timeline/days/${t.date}/slots/${encodeURIComponent(t.slot.id)}`;
          p === "skip" ? await o.api.put(l, { kind: "skip" }) : await o.api.delete(l, p === "remove" ? { with_entries: "true" } : void 0), n("changed");
        } catch (l) {
          u.value = l.message || "Could not change slot";
        } finally {
          c.value = !1;
        }
      }
    }
    const w = F(() => [{ label: "Add another meal", icon: "pi pi-plus", command: i }, ...t.slot.kind === "default" && !t.slot.entries.length ? [{ label: "Skip on this day", command: () => m("skip") }] : [], ...t.slot.kind === "extra" && !t.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => m("remove") }] : []]);
    return (p, l) => {
      const x = f("Button"), P = f("Menu"), R = f("Message"), T = re("tooltip");
      return s(), $("div", {
        class: "meal-slot",
        "data-slot-id": e.slot.id
      }, [
        _("div", Ae, [
          _(
            "span",
            {
              class: ce(["slot-name", { skipped: e.slot.skipped }])
            },
            [
              j(
                V(e.slot.label) + " ",
                1
                /* TEXT */
              ),
              e.slot.kind === "extra" ? ue((s(), $(
                "i",
                Ie,
                null,
                512
                /* NEED_PATCH */
              )), [
                [T, "Only on this day"]
              ]) : I("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          e.slot.skipped ? I("v-if", !0) : (s(), S(x, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: c.value,
            onClick: l[0] || (l[0] = (a) => d.value.toggle(a))
          }, null, 8, ["disabled"])),
          r(P, {
            ref_key: "menu",
            ref: d,
            model: w.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        u.value ? (s(), S(R, {
          key: 0,
          severity: "error"
        }, {
          default: k(() => [
            j(
              V(u.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : I("v-if", !0),
        e.slot.skipped ? (s(), $("div", Me, [
          l[3] || (l[3] = _(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          r(x, {
            label: "Undo",
            text: "",
            loading: c.value,
            onClick: l[1] || (l[1] = (a) => m("undo"))
          }, null, 8, ["loading"])
        ])) : (s(), $(
          N,
          { key: 2 },
          [
            (s(!0), $(
              N,
              null,
              E(e.slot.entries, (a) => (s(), S(ee(_e), {
                key: a.id,
                hub: "entry:interact",
                context: { entry: a, mealType: e.slot.id },
                onResolve: l[2] || (l[2] = (D) => n("changed"))
              }, {
                default: k(({ open: D }) => [
                  r(xe, {
                    entry: a,
                    onInteract: D
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            e.slot.entries.length ? I("v-if", !0) : (s(), S(x, {
              key: 0,
              label: "Add meal",
              icon: "pi pi-plus",
              text: "",
              onClick: i
            }))
          ],
          64
          /* STABLE_FRAGMENT */
        ))
      ], 8, De);
    };
  }
}), Le = /* @__PURE__ */ Y(Ve, [["__scopeId", "data-v-6e4186b8"]]);
function Be(e, g) {
  const t = e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", n = new Set(g);
  let o = t.slice(0, 64).replace(/-+$/g, "");
  for (let d = 2; n.has(o); d++) {
    const u = `-${d}`;
    o = t.slice(0, 64 - u.length).replace(/-+$/g, "") + u;
  }
  return o;
}
const Pe = /* @__PURE__ */ W({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(e, { emit: g }) {
    const t = e, n = g, o = te(), d = y(""), u = y(null), c = y(!1), i = y(""), m = F(() => [{ label: "At the end", value: null }, ...t.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    ve(() => t.visible, (p) => {
      p && (d.value = "", u.value = null, i.value = "");
    });
    async function w() {
      if (!(!d.value.trim() || c.value)) {
        c.value = !0, i.value = "";
        try {
          const p = Be(d.value, [...t.slots.map((l) => l.id), ...o.store.household.value.meal_types.map((l) => l.id)]);
          await o.api.put(`/api/x/core-timeline/days/${t.date}/slots/${p}`, { kind: "extra", label: d.value.trim(), before: u.value }), n("changed"), n("update:visible", !1);
        } catch (p) {
          i.value = p.message || "Could not add slot";
        } finally {
          c.value = !1;
        }
      }
    }
    return (p, l) => {
      const x = f("Message"), P = f("InputText"), R = f("Select"), T = f("Button"), a = f("Dialog");
      return s(), S(a, {
        visible: e.visible,
        "onUpdate:visible": l[2] || (l[2] = (D) => n("update:visible", D)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: k(() => [
          _(
            "form",
            {
              onSubmit: pe(w, ["prevent"])
            },
            [
              i.value ? (s(), S(x, {
                key: 0,
                severity: "error"
              }, {
                default: k(() => [
                  j(
                    V(i.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : I("v-if", !0),
              l[3] || (l[3] = _(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              r(P, {
                id: "extra-slot-name",
                modelValue: d.value,
                "onUpdate:modelValue": l[0] || (l[0] = (D) => d.value = D),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              l[4] || (l[4] = _(
                "label",
                { for: "extra-slot-position" },
                "Position",
                -1
                /* CACHED */
              )),
              r(R, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: u.value,
                "onUpdate:modelValue": l[1] || (l[1] = (D) => u.value = D),
                options: m.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              r(T, {
                label: "Add slot",
                type: "submit",
                loading: c.value,
                disabled: !d.value.trim()
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
}), Re = /* @__PURE__ */ Y(Pe, [["__scopeId", "data-v-a7cbbf03"]]), Ue = ["data-timeline-date"], je = /* @__PURE__ */ W({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = g, n = y(), o = y(!1), d = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      o.value = !0;
    } }];
    function u(c) {
      return (/* @__PURE__ */ new Date(`${c}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (c, i) => {
      const m = f("Tag"), w = f("Button"), p = f("Menu");
      return s(), $("section", {
        class: ce(["day-card", { "is-today": e.day.isToday }]),
        "data-timeline-date": e.day.date
      }, [
        _("header", null, [
          _(
            "h3",
            null,
            V(u(e.day.date)),
            1
            /* TEXT */
          ),
          e.day.isToday ? (s(), S(m, {
            key: 0,
            value: "Today"
          })) : I("v-if", !0),
          r(w, {
            icon: "pi pi-ellipsis-v",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: i[0] || (i[0] = (l) => n.value.toggle(l))
          }),
          r(
            p,
            {
              ref_key: "menu",
              ref: n,
              model: d,
              popup: ""
            },
            null,
            512
            /* NEED_PATCH */
          )
        ]),
        (s(!0), $(
          N,
          null,
          E(e.day.slots, (l) => (s(), S(Le, {
            key: l.id,
            slot: l,
            date: e.day.date,
            onAdd: i[1] || (i[1] = (x) => t("add", x)),
            onChanged: i[2] || (i[2] = (x) => t("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        r(ee(se), {
          name: "timeline.day.footer",
          context: { date: e.day.date }
        }, null, 8, ["context"]),
        r(Re, {
          visible: o.value,
          "onUpdate:visible": i[3] || (i[3] = (l) => o.value = l),
          date: e.day.date,
          slots: e.day.slots,
          onChanged: i[4] || (i[4] = (l) => t("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), de = /* @__PURE__ */ Y(je, [["__scopeId", "data-v-0fe1623f"]]), Ne = { class: "add-entry" }, Ee = { key: 0 }, Oe = { class: "quick-notes" }, qe = /* @__PURE__ */ W({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(e, { emit: g }) {
    const t = e, n = g, o = te(), d = y("recipes"), u = y(""), c = y([]), i = y([]), m = y(""), w = y(2), p = y(!1), l = y("");
    let x = 0;
    async function P() {
      const T = ++x;
      try {
        const a = await o.api.get("/api/recipes", { q: u.value });
        T === x && (c.value = a.items);
      } catch (a) {
        T === x && (l.value = a.message);
      }
    }
    ve(() => t.visible, async (T) => {
      if (!T) {
        ++x;
        return;
      }
      d.value = "recipes", u.value = "", m.value = "", w.value = 2, l.value = "", c.value = [], await P();
      try {
        i.value = await o.api.get("/api/x/core-shortlist");
      } catch {
        i.value = [];
      }
    });
    async function R(T) {
      if (!(p.value || !T && !m.value.trim())) {
        p.value = !0, l.value = "";
        try {
          const a = await o.api.post("/api/schedule", { date: t.date, meal_type: t.mealType, entry_type: T ? "recipe" : "note", ...T ? { recipe_id: T } : { title: m.value }, servings_override: w.value });
          n("created", a), n("update:visible", !1);
        } catch (a) {
          l.value = a.message || "Could not add meal";
        } finally {
          p.value = !1;
        }
      }
    }
    return (T, a) => {
      const D = f("Message"), H = f("InputNumber"), M = f("Tab"), le = f("TabList"), J = f("InputText"), O = f("Button"), G = f("TabPanel"), ae = f("TabPanels"), ne = f("Tabs"), oe = f("Dialog");
      return s(), S(oe, {
        visible: e.visible,
        "onUpdate:visible": a[5] || (a[5] = (h) => n("update:visible", h)),
        header: `Add meal · ${e.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: k(() => [
          _("div", Ne, [
            l.value ? (s(), S(D, {
              key: 0,
              severity: "error"
            }, {
              default: k(() => [
                j(
                  V(l.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : I("v-if", !0),
            a[11] || (a[11] = _(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            r(H, {
              inputId: "entry-servings",
              modelValue: w.value,
              "onUpdate:modelValue": a[0] || (a[0] = (h) => w.value = h),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            r(ne, {
              value: d.value,
              "onUpdate:value": a[4] || (a[4] = (h) => d.value = h)
            }, {
              default: k(() => [
                r(le, null, {
                  default: k(() => [
                    r(M, { value: "recipes" }, {
                      default: k(() => [...a[6] || (a[6] = [
                        j(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    r(M, { value: "shortlist" }, {
                      default: k(() => [...a[7] || (a[7] = [
                        j(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    r(M, { value: "note" }, {
                      default: k(() => [...a[8] || (a[8] = [
                        j(
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
                r(ae, null, {
                  default: k(() => [
                    r(G, { value: "recipes" }, {
                      default: k(() => [
                        a[9] || (a[9] = _(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        r(J, {
                          id: "entry-recipe-search",
                          modelValue: u.value,
                          "onUpdate:modelValue": a[1] || (a[1] = (h) => u.value = h),
                          onInput: P,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (s(!0), $(
                          N,
                          null,
                          E(c.value, (h) => (s(), $("div", {
                            key: h.id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              V(h.title),
                              1
                              /* TEXT */
                            ),
                            r(O, {
                              label: "Schedule",
                              loading: p.value,
                              onClick: (K) => R(h.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    r(G, { value: "shortlist" }, {
                      default: k(() => [
                        i.value.length ? I("v-if", !0) : (s(), $("p", Ee, "No recipes in shortlist")),
                        (s(!0), $(
                          N,
                          null,
                          E(i.value, (h) => (s(), $("div", {
                            key: h.recipe_id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              V(h.recipe_title),
                              1
                              /* TEXT */
                            ),
                            r(O, {
                              label: "Schedule",
                              loading: p.value,
                              onClick: (K) => R(h.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    r(G, { value: "note" }, {
                      default: k(() => [
                        a[10] || (a[10] = _(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        r(J, {
                          id: "entry-note",
                          modelValue: m.value,
                          "onUpdate:modelValue": a[2] || (a[2] = (h) => m.value = h),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        _("div", Oe, [
                          (s(), $(
                            N,
                            null,
                            E(["Dining out", "Leftovers", "Takeout", "Quick meal"], (h) => r(O, {
                              key: h,
                              label: h,
                              outlined: "",
                              size: "small",
                              onClick: (K) => m.value = h
                            }, null, 8, ["label", "onClick"])),
                            64
                            /* STABLE_FRAGMENT */
                          ))
                        ]),
                        r(O, {
                          label: "Add meal",
                          loading: p.value,
                          disabled: !m.value.trim(),
                          onClick: a[3] || (a[3] = (h) => R())
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
}), ze = /* @__PURE__ */ Y(qe, [["__scopeId", "data-v-442cef49"]]);
function B(e, g) {
  const t = /* @__PURE__ */ new Date(`${e}T12:00:00`);
  return t.setDate(t.getDate() + g), `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function Fe(e, g, t, n) {
  const o = [];
  for (let d = e.from; d <= e.to; d = B(d, 1)) {
    const u = (g[d] || []).map((c) => ({ ...c, entries: [] }));
    for (const c of t.filter((i) => i.date === d)) {
      const i = c.meal_type.toLowerCase();
      let m = u.find((w) => w.id.toLowerCase() === i) || u.find((w) => w.label.toLowerCase() === i);
      m || (m = { id: c.meal_type, label: c.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (w) => w.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, u.push(m)), m.entries.push(c), m.skipped = !1;
    }
    o.push({ date: d, isPast: d < n, isToday: d === n, slots: u });
  }
  return o;
}
const We = { class: "timeline-page" }, Ye = { class: "timeline-toolbar" }, He = { class: "timeline-container" }, Ge = { class: "timeline-sidebar-wrapper" }, Qe = { class: "timeline-feed" }, Je = { class: "past-days" }, Ke = ["data-timeline-date"], Xe = /* @__PURE__ */ W({
  __name: "TimelinePage",
  setup(e) {
    const g = te();
    function t() {
      const v = /* @__PURE__ */ new Date();
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    }
    const n = y(t()), o = y({ from: B(n.value, -2), to: B(n.value, 6) }), d = y([]), u = y({}), c = y(""), i = y(/* @__PURE__ */ new Set()), m = y(null), w = y(window.innerWidth < 768), p = y([]), l = fe("__SS_SLOT_REGISTRY__"), x = F(() => (l == null ? void 0 : l.getContributions("timeline.sidebar")) || []), P = F(() => Fe(o.value, u.value, d.value, n.value)), R = F(() => P.value.filter((v) => v.isPast)), T = F(() => P.value.filter((v) => !v.isPast));
    let a = 0, D, H = !1;
    async function M() {
      const v = ++a, { from: C, to: L } = o.value;
      c.value = "";
      try {
        const U = [], X = [], Z = {};
        for (let A = C; A <= L; ) {
          const Q = B(A, 62) < L ? B(A, 62) : L, q = { from: A, to: Q }, [b, z, me] = await Promise.all([g.api.get("/api/schedule", q), g.api.get("/api/journal", q), g.api.get("/api/x/core-timeline/slots", q)]);
          if (v !== a || H) return;
          U.push(...b), X.push(...z), Object.assign(Z, me.days), A = B(Q, 1);
        }
        const ie = new Set(X.filter((A) => A.status === "cooked").map((A) => A.schedule_entry_id));
        d.value = U.map((A) => ({ ...A, is_cooked: ie.has(A.id) })), u.value = Z;
      } catch (U) {
        v === a && !H && (c.value = U.message || "Could not load Timeline");
      }
    }
    function le() {
      clearTimeout(D), D = setTimeout(M, 300);
    }
    const J = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted", "core-timeline:slots-changed"].map((v) => g.on(v, le));
    function O() {
      w.value = window.innerWidth < 768;
    }
    function G() {
      o.value = { ...o.value, from: B(o.value.from, -2) }, M();
    }
    function ae() {
      o.value = { ...o.value, to: B(o.value.to, 5) }, M();
    }
    async function ne() {
      var v, C;
      n.value = t(), o.value = { from: B(n.value, -2), to: B(n.value, 6) }, i.value.clear(), await M(), await he(), (C = (v = document.querySelector(".day-card.is-today")) == null ? void 0 : v.scrollIntoView) == null || C.call(v, { block: "start", behavior: "smooth" });
    }
    function oe(v) {
      i.value.has(v) ? i.value.delete(v) : i.value.add(v);
    }
    function h(v) {
      return (/* @__PURE__ */ new Date(`${v}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function K(v) {
      return v.slots.flatMap((C) => C.entries.map((L) => {
        var U;
        return `${C.label.toUpperCase()} ${((U = L.recipe) == null ? void 0 : U.title) || L.title || "Planned meal"}`;
      })).join(" · ") || "Nothing planned";
    }
    return ye(() => {
      M(), window.addEventListener("resize", O);
    }), ge(() => {
      H = !0, ++a, clearTimeout(D), J.forEach((v) => {
        typeof v == "function" && v();
      }), window.removeEventListener("resize", O);
    }), (v, C) => {
      var Q, q;
      const L = f("Button"), U = f("Message"), X = f("AccordionHeader"), Z = f("AccordionContent"), ie = f("AccordionPanel"), A = f("Accordion");
      return s(), $("div", We, [
        _("div", Ye, [
          C[4] || (C[4] = _(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          r(L, {
            label: "Today",
            icon: "pi pi-calendar",
            outlined: "",
            onClick: ne
          })
        ]),
        c.value ? (s(), S(U, {
          key: 0,
          severity: "error"
        }, {
          default: k(() => [
            j(
              V(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : I("v-if", !0),
        _("div", He, [
          _("aside", Ge, [
            w.value ? (s(), S(A, {
              key: 0,
              value: p.value,
              "onUpdate:value": C[0] || (C[0] = (b) => p.value = b),
              multiple: ""
            }, {
              default: k(() => [
                (s(!0), $(
                  N,
                  null,
                  E(x.value, (b) => (s(), S(ie, {
                    key: b.id,
                    value: b.id
                  }, {
                    default: k(() => [
                      r(
                        X,
                        null,
                        {
                          default: k(() => [
                            j(
                              V(b.pluginId === "core-shortlist" ? "Shortlist" : b.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : b.pluginId),
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
                      r(
                        Z,
                        null,
                        {
                          default: k(() => [
                            (s(), S(be(b.component), { context: o.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (s(), S(ee(se), {
              key: 1,
              name: "timeline.sidebar",
              context: o.value
            }, null, 8, ["context"]))
          ]),
          _("div", Qe, [
            r(L, {
              label: "Show 2 earlier days",
              text: "",
              onClick: G
            }),
            _("div", Je, [
              (s(!0), $(
                N,
                null,
                E(R.value, (b) => (s(), $("div", {
                  key: b.date,
                  "data-timeline-date": i.value.has(b.date) ? void 0 : b.date
                }, [
                  r(L, {
                    class: "past-day-line",
                    label: `${h(b.date)} · ${K(b)}`,
                    text: "",
                    "aria-expanded": i.value.has(b.date),
                    onClick: (z) => oe(b.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  i.value.has(b.date) ? (s(), S(de, {
                    key: 0,
                    day: b,
                    onAdd: C[1] || (C[1] = (z) => m.value = z),
                    onChanged: M
                  }, null, 8, ["day"])) : I("v-if", !0)
                ], 8, Ke))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (s(!0), $(
              N,
              null,
              E(T.value, (b) => (s(), S(de, {
                key: b.date,
                day: b,
                onAdd: C[2] || (C[2] = (z) => m.value = z),
                onChanged: M
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            r(L, {
              label: "Show 5 more days",
              outlined: "",
              onClick: ae
            })
          ])
        ]),
        r(ze, {
          visible: !!m.value,
          date: ((Q = m.value) == null ? void 0 : Q.date) || n.value,
          mealType: ((q = m.value) == null ? void 0 : q.mealType) || "",
          "onUpdate:visible": C[3] || (C[3] = (b) => {
            b || (m.value = null);
          }),
          onCreated: M
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Ze = /* @__PURE__ */ Y(Xe, [["__scopeId", "data-v-f079e105"]]);
function lt(e) {
  e.route({ path: "/timeline", component: Ze, nav: { label: "Timeline", icon: "calendar", order: 5 } }), e.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), e.intent.hub({ id: "entry:interact", title: "Meal actions" }), e.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), e.intent.provider({
    hub: "entry:interact",
    id: "view-recipe",
    title: "View recipe",
    icon: "book",
    order: 10,
    kind: "headless",
    isAvailable: (t) => {
      var n;
      return !!((n = t == null ? void 0 : t.entry) != null && n.recipe_id);
    },
    execute: (t) => e.navigate(`/recipes/${t.entry.recipe_id}`)
  }), e.intent.provider({
    hub: "entry:interact",
    id: "remove",
    title: "Remove from plan",
    icon: "trash",
    order: 999,
    kind: "headless",
    execute: async (t) => {
      const n = t == null ? void 0 : t.entry;
      !n || !await e.confirm({ header: "Remove meal", message: "Remove this meal from the plan?", acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }) || (await e.api.delete(`/api/schedule/${n.id}?revision=${n.revision}`), e.notify({ level: "success", message: "Meal removed from plan" }));
    }
  });
  const g = async () => {
    try {
      const t = /* @__PURE__ */ new Date(), n = new Date(t), o = new Date(t);
      n.setDate(n.getDate() - 2), o.setDate(o.getDate() + 14);
      const d = await e.api.get(`/api/schedule?from=${n.toISOString().slice(0, 10)}&to=${o.toISOString().slice(0, 10)}`);
      for (const u of d) u.recipe_id && e.api.get(`/api/recipes/${u.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  g();
  for (const t of ["schedule:created", "schedule:updated", "schedule:deleted"]) e.on(t, g);
}
export {
  lt as default
};
