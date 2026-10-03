import { defineComponent as W, resolveComponent as f, resolveDirective as re, openBlock as s, createBlock as S, withCtx as k, createElementVNode as _, toDisplayString as L, withDirectives as ue, createElementBlock as $, createCommentVNode as M, createVNode as r, unref as ee, ref as y, computed as F, normalizeClass as ce, createTextVNode as j, Fragment as N, renderList as E, watch as ve, withModifiers as pe, inject as fe, onMounted as ye, onBeforeUnmount as ge, resolveDynamicComponent as be, nextTick as he } from "vue";
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
    function t(i) {
      return (/* @__PURE__ */ new Date(`${i}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const o = g;
    return (i, d) => {
      const c = f("Button"), u = re("tooltip");
      return s(), S(c, {
        class: "schedule-card",
        variant: "text",
        onClick: d[0] || (d[0] = (n) => o("interact", n))
      }, {
        default: k(() => {
          var n;
          return [
            _("div", ke, [
              _(
                "span",
                $e,
                L(((n = e.entry.recipe) == null ? void 0 : n.title) || e.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              e.entry.origin === "plugin:core-recurring" ? ue((s(), $("i", {
                key: 0,
                class: "pi pi-replay",
                "aria-label": `Repeats every ${t(e.entry.date)}`
              }, null, 8, we)), [
                [u, `Repeats every ${t(e.entry.date)}`]
              ]) : M("v-if", !0),
              r(ee(se), {
                name: "timeline.entry.badge",
                context: { entry: e.entry }
              }, null, 8, ["context"])
            ]),
            e.entry.servings_override ? (s(), $(
              "div",
              Ce,
              L(e.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : M("v-if", !0),
            e.entry.note ? (s(), $(
              "div",
              Se,
              L(e.entry.note),
              1
              /* TEXT */
            )) : M("v-if", !0)
          ];
        }),
        _: 1
        /* STABLE */
      });
    };
  }
}), Y = (e, g) => {
  const t = e.__vccOpts || e;
  for (const [o, i] of g)
    t[o] = i;
  return t;
}, xe = /* @__PURE__ */ Y(Te, [["__scopeId", "data-v-c4318b17"]]), De = ["data-slot-id"], Ae = { class: "slot-header" }, Me = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Ie = {
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
    const t = e, o = g, i = te(), d = y(), c = y(""), u = y(!1);
    function n() {
      o("add", { date: t.date, mealType: t.slot.id });
    }
    async function m(p) {
      if (!u.value) {
        u.value = !0, c.value = "";
        try {
          if (p === "remove" && t.slot.entries.length && !await i.confirm({ header: "Remove slot", message: `Remove ${t.slot.label} and its ${t.slot.entries.length} planned meal${t.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const l = `/api/x/core-timeline/days/${t.date}/slots/${encodeURIComponent(t.slot.id)}`;
          p === "skip" ? await i.api.put(l, { kind: "skip" }) : await i.api.delete(l, p === "remove" ? { with_entries: "true" } : void 0), o("changed");
        } catch (l) {
          c.value = l.message || "Could not change slot";
        } finally {
          u.value = !1;
        }
      }
    }
    const w = F(() => [{ label: "Add another meal", icon: "pi pi-plus", command: n }, ...t.slot.kind === "default" && !t.slot.entries.length ? [{ label: "Skip on this day", command: () => m("skip") }] : [], ...t.slot.kind === "extra" && !t.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => m("remove") }] : []]);
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
                L(e.slot.label) + " ",
                1
                /* TEXT */
              ),
              e.slot.kind === "extra" ? ue((s(), $(
                "i",
                Me,
                null,
                512
                /* NEED_PATCH */
              )), [
                [T, "Only on this day"]
              ]) : M("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          e.slot.skipped ? M("v-if", !0) : (s(), S(x, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: u.value,
            onClick: l[0] || (l[0] = (a) => d.value.toggle(a))
          }, null, 8, ["disabled"])),
          r(P, {
            ref_key: "menu",
            ref: d,
            model: w.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        c.value ? (s(), S(R, {
          key: 0,
          severity: "error"
        }, {
          default: k(() => [
            j(
              L(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : M("v-if", !0),
        e.slot.skipped ? (s(), $("div", Ie, [
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
            loading: u.value,
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
                onResolve: l[2] || (l[2] = (D) => o("changed"))
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
            e.slot.entries.length ? M("v-if", !0) : (s(), S(x, {
              key: 0,
              label: "Add meal",
              icon: "pi pi-plus",
              text: "",
              onClick: n
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
  const t = e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", o = new Set(g);
  let i = t.slice(0, 64).replace(/-+$/g, "");
  for (let d = 2; o.has(i); d++) {
    const c = `-${d}`;
    i = t.slice(0, 64 - c.length).replace(/-+$/g, "") + c;
  }
  return i;
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
    const t = e, o = g, i = te(), d = y(""), c = y(null), u = y(!1), n = y(""), m = F(() => [{ label: "At the end", value: null }, ...t.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    ve(() => t.visible, (p) => {
      p && (d.value = "", c.value = null, n.value = "");
    });
    async function w() {
      if (!(!d.value.trim() || u.value)) {
        u.value = !0, n.value = "";
        try {
          const p = Be(d.value, [...t.slots.map((l) => l.id), ...i.store.household.value.meal_types.map((l) => l.id)]);
          await i.api.put(`/api/x/core-timeline/days/${t.date}/slots/${p}`, { kind: "extra", label: d.value.trim(), before: c.value }), o("changed"), o("update:visible", !1);
        } catch (p) {
          n.value = p.message || "Could not add slot";
        } finally {
          u.value = !1;
        }
      }
    }
    return (p, l) => {
      const x = f("Message"), P = f("InputText"), R = f("Select"), T = f("Button"), a = f("Dialog");
      return s(), S(a, {
        visible: e.visible,
        "onUpdate:visible": l[2] || (l[2] = (D) => o("update:visible", D)),
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
              n.value ? (s(), S(x, {
                key: 0,
                severity: "error"
              }, {
                default: k(() => [
                  j(
                    L(n.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : M("v-if", !0),
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
                modelValue: c.value,
                "onUpdate:modelValue": l[1] || (l[1] = (D) => c.value = D),
                options: m.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              r(T, {
                label: "Add slot",
                type: "submit",
                loading: u.value,
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
    const t = g, o = y(), i = y(!1), d = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      i.value = !0;
    } }];
    function c(u) {
      return (/* @__PURE__ */ new Date(`${u}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (u, n) => {
      const m = f("Tag"), w = f("Button"), p = f("Menu");
      return s(), $("section", {
        class: ce(["day-card", { "is-today": e.day.isToday }]),
        "data-timeline-date": e.day.date
      }, [
        _("header", null, [
          _(
            "h3",
            null,
            L(c(e.day.date)),
            1
            /* TEXT */
          ),
          e.day.isToday ? (s(), S(m, {
            key: 0,
            value: "Today"
          })) : M("v-if", !0),
          r(w, {
            icon: "pi pi-ellipsis-v",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: n[0] || (n[0] = (l) => o.value.toggle(l))
          }),
          r(
            p,
            {
              ref_key: "menu",
              ref: o,
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
            onAdd: n[1] || (n[1] = (x) => t("add", x)),
            onChanged: n[2] || (n[2] = (x) => t("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        r(ee(se), {
          name: "timeline.day.footer",
          context: { date: e.day.date }
        }, null, 8, ["context"]),
        r(Re, {
          visible: i.value,
          "onUpdate:visible": n[3] || (n[3] = (l) => i.value = l),
          date: e.day.date,
          slots: e.day.slots,
          onChanged: n[4] || (n[4] = (l) => t("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), de = /* @__PURE__ */ Y(je, [["__scopeId", "data-v-0fe1623f"]]), Ne = { class: "add-entry" }, Ee = { key: 0 }, qe = { class: "quick-notes" }, ze = /* @__PURE__ */ W({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(e, { emit: g }) {
    const t = e, o = g, i = te(), d = y("recipes"), c = y(""), u = y([]), n = y([]), m = y(""), w = y(2), p = y(!1), l = y("");
    let x = 0;
    async function P() {
      const T = ++x;
      try {
        const a = await i.api.get("/api/recipes", { q: c.value });
        T === x && (u.value = a.items);
      } catch (a) {
        T === x && (l.value = a.message);
      }
    }
    ve(() => t.visible, async (T) => {
      if (!T) {
        ++x;
        return;
      }
      d.value = "recipes", c.value = "", m.value = "", w.value = 2, l.value = "", u.value = [], await P();
      try {
        n.value = await i.api.get("/api/x/core-shortlist");
      } catch {
        n.value = [];
      }
    });
    async function R(T) {
      if (!(p.value || !T && !m.value.trim())) {
        p.value = !0, l.value = "";
        try {
          const a = await i.api.post("/api/schedule", { date: t.date, meal_type: t.mealType, entry_type: T ? "recipe" : "note", ...T ? { recipe_id: T } : { title: m.value }, servings_override: w.value });
          o("created", a), o("update:visible", !1);
        } catch (a) {
          l.value = a.message || "Could not add meal";
        } finally {
          p.value = !1;
        }
      }
    }
    return (T, a) => {
      const D = f("Message"), H = f("InputNumber"), I = f("Tab"), le = f("TabList"), J = f("InputText"), q = f("Button"), G = f("TabPanel"), ae = f("TabPanels"), ne = f("Tabs"), oe = f("Dialog");
      return s(), S(oe, {
        visible: e.visible,
        "onUpdate:visible": a[5] || (a[5] = (h) => o("update:visible", h)),
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
                  L(l.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : M("v-if", !0),
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
                    r(I, { value: "recipes" }, {
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
                    r(I, { value: "shortlist" }, {
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
                    r(I, { value: "note" }, {
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
                          modelValue: c.value,
                          "onUpdate:modelValue": a[1] || (a[1] = (h) => c.value = h),
                          onInput: P,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (s(!0), $(
                          N,
                          null,
                          E(u.value, (h) => (s(), $("div", {
                            key: h.id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              L(h.title),
                              1
                              /* TEXT */
                            ),
                            r(q, {
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
                        n.value.length ? M("v-if", !0) : (s(), $("p", Ee, "No recipes in shortlist")),
                        (s(!0), $(
                          N,
                          null,
                          E(n.value, (h) => (s(), $("div", {
                            key: h.recipe_id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              L(h.recipe_title),
                              1
                              /* TEXT */
                            ),
                            r(q, {
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
                        _("div", qe, [
                          (s(), $(
                            N,
                            null,
                            E(["Dining out", "Leftovers", "Takeout", "Quick meal"], (h) => r(q, {
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
                        r(q, {
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
}), Oe = /* @__PURE__ */ Y(ze, [["__scopeId", "data-v-442cef49"]]);
function V(e, g) {
  const t = /* @__PURE__ */ new Date(`${e}T12:00:00`);
  return t.setDate(t.getDate() + g), `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function Fe(e, g, t, o) {
  const i = [];
  for (let d = e.from; d <= e.to; d = V(d, 1)) {
    const c = (g[d] || []).map((u) => ({ ...u, entries: [] }));
    for (const u of t.filter((n) => n.date === d)) {
      const n = u.meal_type.toLowerCase();
      let m = c.find((w) => w.id.toLowerCase() === n) || c.find((w) => w.label.toLowerCase() === n);
      m || (m = { id: u.meal_type, label: u.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (w) => w.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, c.push(m)), m.entries.push(u), m.skipped = !1;
    }
    i.push({ date: d, isPast: d < o, isToday: d === o, slots: c });
  }
  return i;
}
const We = { class: "timeline-page" }, Ye = { class: "timeline-toolbar" }, He = { class: "timeline-container" }, Ge = { class: "timeline-sidebar-wrapper" }, Qe = { class: "timeline-feed" }, Je = { class: "past-days" }, Ke = ["data-timeline-date"], Xe = /* @__PURE__ */ W({
  __name: "TimelinePage",
  setup(e) {
    const g = te();
    function t() {
      const v = /* @__PURE__ */ new Date();
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    }
    const o = y(t()), i = y({ from: V(o.value, -2), to: V(o.value, 6) }), d = y([]), c = y({}), u = y(""), n = y(/* @__PURE__ */ new Set()), m = y(null), w = y(window.innerWidth < 768), p = y([]), l = fe("__SS_SLOT_REGISTRY__"), x = F(() => (l == null ? void 0 : l.getContributions("timeline.sidebar")) || []), P = F(() => Fe(i.value, c.value, d.value, o.value)), R = F(() => P.value.filter((v) => v.isPast)), T = F(() => P.value.filter((v) => !v.isPast));
    let a = 0, D, H = !1;
    async function I() {
      const v = ++a, { from: C, to: B } = i.value;
      u.value = "";
      try {
        const U = [], X = [], Z = {};
        for (let A = C; A <= B; ) {
          const Q = V(A, 62) < B ? V(A, 62) : B, z = { from: A, to: Q }, [b, O, me] = await Promise.all([g.api.get("/api/schedule", z), g.api.get("/api/journal", z), g.api.get("/api/x/core-timeline/slots", z)]);
          if (v !== a || H) return;
          U.push(...b), X.push(...O), Object.assign(Z, me.days), A = V(Q, 1);
        }
        const ie = new Set(X.filter((A) => A.status === "cooked").map((A) => A.schedule_entry_id));
        d.value = U.map((A) => ({ ...A, is_cooked: ie.has(A.id) })), c.value = Z;
      } catch (U) {
        v === a && !H && (u.value = U.message || "Could not load Timeline");
      }
    }
    function le() {
      clearTimeout(D), D = setTimeout(I, 300);
    }
    const J = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted", "core-timeline:slots-changed"].map((v) => g.on(v, le));
    function q() {
      w.value = window.innerWidth < 768;
    }
    function G() {
      i.value = { ...i.value, from: V(i.value.from, -2) }, I();
    }
    function ae() {
      i.value = { ...i.value, to: V(i.value.to, 5) }, I();
    }
    async function ne() {
      var v, C;
      o.value = t(), i.value = { from: V(o.value, -2), to: V(o.value, 6) }, n.value.clear(), await I(), await he(), (C = (v = document.querySelector(".day-card.is-today")) == null ? void 0 : v.scrollIntoView) == null || C.call(v, { block: "start", behavior: "smooth" });
    }
    function oe(v) {
      n.value.has(v) ? n.value.delete(v) : n.value.add(v);
    }
    function h(v) {
      return (/* @__PURE__ */ new Date(`${v}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function K(v) {
      return v.slots.flatMap((C) => C.entries.map((B) => {
        var U;
        return `${C.label.toUpperCase()} ${((U = B.recipe) == null ? void 0 : U.title) || B.title || "Planned meal"}`;
      })).join(" · ") || "Nothing planned";
    }
    return ye(() => {
      I(), window.addEventListener("resize", q);
    }), ge(() => {
      H = !0, ++a, clearTimeout(D), J.forEach((v) => {
        typeof v == "function" && v();
      }), window.removeEventListener("resize", q);
    }), (v, C) => {
      var Q, z;
      const B = f("Button"), U = f("Message"), X = f("AccordionHeader"), Z = f("AccordionContent"), ie = f("AccordionPanel"), A = f("Accordion");
      return s(), $("div", We, [
        _("div", Ye, [
          C[4] || (C[4] = _(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          r(B, {
            label: "Today",
            icon: "pi pi-calendar",
            outlined: "",
            onClick: ne
          })
        ]),
        u.value ? (s(), S(U, {
          key: 0,
          severity: "error"
        }, {
          default: k(() => [
            j(
              L(u.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : M("v-if", !0),
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
                              L(b.pluginId === "core-shortlist" ? "Shortlist" : b.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : b.pluginId),
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
                            (s(), S(be(b.component), { context: i.value }, null, 8, ["context"]))
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
              context: i.value
            }, null, 8, ["context"]))
          ]),
          _("div", Qe, [
            r(B, {
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
                  "data-timeline-date": n.value.has(b.date) ? void 0 : b.date
                }, [
                  r(B, {
                    class: "past-day-line",
                    label: `${h(b.date)} · ${K(b)}`,
                    text: "",
                    "aria-expanded": n.value.has(b.date),
                    onClick: (O) => oe(b.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  n.value.has(b.date) ? (s(), S(de, {
                    key: 0,
                    day: b,
                    onAdd: C[1] || (C[1] = (O) => m.value = O),
                    onChanged: I
                  }, null, 8, ["day"])) : M("v-if", !0)
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
                onAdd: C[2] || (C[2] = (O) => m.value = O),
                onChanged: I
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            r(B, {
              label: "Show 5 more days",
              outlined: "",
              onClick: ae
            })
          ])
        ]),
        r(Oe, {
          visible: !!m.value,
          date: ((Q = m.value) == null ? void 0 : Q.date) || o.value,
          mealType: ((z = m.value) == null ? void 0 : z.mealType) || "",
          "onUpdate:visible": C[3] || (C[3] = (b) => {
            b || (m.value = null);
          }),
          onCreated: I
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
      var o;
      return !!((o = t == null ? void 0 : t.entry) != null && o.recipe_id);
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
      const o = t == null ? void 0 : t.entry;
      !o || !await e.confirm({ header: "Remove meal", message: "Remove this meal from the plan?", acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }) || (await e.api.delete(`/api/schedule/${o.id}?revision=${o.revision}`), e.notify({ level: "success", message: "Meal removed from plan" }));
    }
  });
  const g = async () => {
    try {
      const t = /* @__PURE__ */ new Date(), o = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`, i = await e.api.get(`/api/schedule?from=${V(o, -2)}&to=${V(o, 14)}`);
      for (const d of i) d.recipe_id && e.api.get(`/api/recipes/${d.recipe_id}`).catch(() => {
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
