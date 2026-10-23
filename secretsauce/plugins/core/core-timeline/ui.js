import { defineComponent as K, resolveComponent as m, resolveDirective as de, openBlock as s, createBlock as C, withCtx as w, createElementVNode as _, toDisplayString as I, withDirectives as ue, createElementBlock as T, createCommentVNode as L, createVNode as u, unref as ae, ref as f, computed as Y, normalizeClass as ce, createTextVNode as U, Fragment as E, renderList as z, watch as ve, withModifiers as pe, inject as fe, onMounted as ye, onBeforeUnmount as ge, resolveDynamicComponent as be, nextTick as he } from "vue";
import { Slot as se, useSecretSauce as le, IntentTrigger as _e } from "@secretsauce/ui";
const ke = { class: "card-header" }, $e = { class: "card-title" }, we = ["aria-label"], Te = {
  key: 0,
  class: "card-servings"
}, Ce = {
  key: 1,
  class: "card-note"
}, Se = /* @__PURE__ */ K({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(t, { emit: y }) {
    function e(d) {
      return (/* @__PURE__ */ new Date(`${d}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const n = y;
    return (d, r) => {
      const v = m("Button"), c = de("tooltip");
      return s(), C(v, {
        class: "schedule-card",
        variant: "text",
        onClick: r[0] || (r[0] = (o) => n("interact", o))
      }, {
        default: w(() => {
          var o;
          return [
            _("div", ke, [
              _(
                "span",
                $e,
                I(((o = t.entry.recipe) == null ? void 0 : o.title) || t.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              t.entry.origin === "plugin:core-recurring" ? ue((s(), T("i", {
                key: 0,
                class: "pi pi-replay",
                "aria-label": `Repeats every ${e(t.entry.date)}`
              }, null, 8, we)), [
                [c, `Repeats every ${e(t.entry.date)}`]
              ]) : L("v-if", !0),
              u(ae(se), {
                name: "timeline.entry.badge",
                context: { entry: t.entry }
              }, null, 8, ["context"])
            ]),
            t.entry.servings_override ? (s(), T(
              "div",
              Te,
              I(t.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : L("v-if", !0),
            t.entry.note ? (s(), T(
              "div",
              Ce,
              I(t.entry.note),
              1
              /* TEXT */
            )) : L("v-if", !0)
          ];
        }),
        _: 1
        /* STABLE */
      });
    };
  }
}), X = (t, y) => {
  const e = t.__vccOpts || t;
  for (const [n, d] of y)
    e[n] = d;
  return e;
}, xe = /* @__PURE__ */ X(Se, [["__scopeId", "data-v-d742beac"]]), De = ["data-slot-id"], Ae = { class: "slot-header" }, Le = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Me = {
  key: 1,
  class: "skipped-row"
}, Ie = /* @__PURE__ */ K({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: y }) {
    const e = t, n = y, d = le(), r = f(), v = f(""), c = f(!1);
    function o() {
      n("add", { date: e.date, mealType: e.slot.id });
    }
    async function g(p) {
      if (!c.value) {
        c.value = !0, v.value = "";
        try {
          if (p === "remove" && e.slot.entries.length && !await d.confirm({ header: "Remove slot", message: `Remove ${e.slot.label} and its ${e.slot.entries.length} planned meal${e.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const l = `/api/x/core-timeline/days/${e.date}/slots/${encodeURIComponent(e.slot.id)}`;
          p === "skip" ? await d.api.put(l, { kind: "skip" }) : await d.api.delete(l, p === "remove" ? { with_entries: "true" } : void 0), n("changed");
        } catch (l) {
          v.value = l.message || "Could not change slot";
        } finally {
          c.value = !1;
        }
      }
    }
    const k = Y(() => [{ label: "Add another meal", icon: "pi pi-plus", command: o }, ...e.slot.kind === "default" && !e.slot.entries.length ? [{ label: "Skip on this day", command: () => g("skip") }] : [], ...e.slot.kind === "extra" && !e.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => g("remove") }] : []]);
    return (p, l) => {
      const S = m("Button"), N = m("Menu"), B = m("Message"), j = de("tooltip");
      return s(), T("div", {
        class: "meal-slot",
        "data-slot-id": t.slot.id
      }, [
        _("div", Ae, [
          _(
            "span",
            {
              class: ce(["slot-name", { skipped: t.slot.skipped }])
            },
            [
              U(
                I(t.slot.label) + " ",
                1
                /* TEXT */
              ),
              t.slot.kind === "extra" ? ue((s(), T(
                "i",
                Le,
                null,
                512
                /* NEED_PATCH */
              )), [
                [j, "Only on this day"]
              ]) : L("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          t.slot.skipped ? L("v-if", !0) : (s(), C(S, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: c.value,
            onClick: l[0] || (l[0] = (x) => r.value.toggle(x))
          }, null, 8, ["disabled"])),
          u(N, {
            ref_key: "menu",
            ref: r,
            model: k.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        v.value ? (s(), C(B, {
          key: 0,
          severity: "error"
        }, {
          default: w(() => [
            U(
              I(v.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : L("v-if", !0),
        t.slot.skipped ? (s(), T("div", Me, [
          l[3] || (l[3] = _(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          u(S, {
            label: "Undo",
            text: "",
            loading: c.value,
            onClick: l[1] || (l[1] = (x) => g("undo"))
          }, null, 8, ["loading"])
        ])) : (s(), T(
          E,
          { key: 2 },
          [
            (s(!0), T(
              E,
              null,
              z(t.slot.entries, (x) => (s(), C(ae(_e), {
                key: x.id,
                hub: "entry:interact",
                context: { entry: x, mealType: t.slot.id },
                onResolve: l[2] || (l[2] = (h) => n("changed"))
              }, {
                default: w(({ open: h }) => [
                  u(xe, {
                    entry: x,
                    onInteract: h
                  }, null, 8, ["entry", "onInteract"])
                ]),
                _: 2
                /* DYNAMIC */
              }, 1032, ["context"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            t.slot.entries.length ? L("v-if", !0) : (s(), C(S, {
              key: 0,
              class: "empty-slot-btn",
              icon: "pi pi-plus",
              text: "",
              "aria-label": "Add meal",
              onClick: o
            }))
          ],
          64
          /* STABLE_FRAGMENT */
        ))
      ], 8, De);
    };
  }
}), Ve = /* @__PURE__ */ X(Ie, [["__scopeId", "data-v-2a9876d7"]]);
function Be(t, y) {
  const e = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", n = new Set(y);
  let d = e.slice(0, 64).replace(/-+$/g, "");
  for (let r = 2; n.has(d); r++) {
    const v = `-${r}`;
    d = e.slice(0, 64 - v.length).replace(/-+$/g, "") + v;
  }
  return d;
}
const Pe = /* @__PURE__ */ K({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(t, { emit: y }) {
    const e = t, n = y, d = le(), r = f(""), v = f(null), c = f(!1), o = f(""), g = Y(() => [{ label: "At the end", value: null }, ...e.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    ve(() => e.visible, (p) => {
      p && (r.value = "", v.value = null, o.value = "");
    });
    async function k() {
      if (!(!r.value.trim() || c.value)) {
        c.value = !0, o.value = "";
        try {
          const p = Be(r.value, [...e.slots.map((l) => l.id), ...d.store.household.value.meal_types.map((l) => l.id)]);
          await d.api.put(`/api/x/core-timeline/days/${e.date}/slots/${p}`, { kind: "extra", label: r.value.trim(), before: v.value }), n("changed"), n("update:visible", !1);
        } catch (p) {
          o.value = p.message || "Could not add slot";
        } finally {
          c.value = !1;
        }
      }
    }
    return (p, l) => {
      const S = m("Message"), N = m("InputText"), B = m("Select"), j = m("Button"), x = m("Dialog");
      return s(), C(x, {
        visible: t.visible,
        "onUpdate:visible": l[2] || (l[2] = (h) => n("update:visible", h)),
        header: "Add slot for this day",
        modal: "",
        style: { width: "28rem", maxWidth: "95vw" }
      }, {
        default: w(() => [
          _(
            "form",
            {
              onSubmit: pe(k, ["prevent"])
            },
            [
              o.value ? (s(), C(S, {
                key: 0,
                severity: "error"
              }, {
                default: w(() => [
                  U(
                    I(o.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : L("v-if", !0),
              l[3] || (l[3] = _(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              u(N, {
                id: "extra-slot-name",
                modelValue: r.value,
                "onUpdate:modelValue": l[0] || (l[0] = (h) => r.value = h),
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
              u(B, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: v.value,
                "onUpdate:modelValue": l[1] || (l[1] = (h) => v.value = h),
                options: g.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              u(j, {
                label: "Add slot",
                type: "submit",
                loading: c.value,
                disabled: !r.value.trim()
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
}), Re = /* @__PURE__ */ X(Pe, [["__scopeId", "data-v-e6e93022"]]), Ue = ["data-timeline-date"], Ee = /* @__PURE__ */ K({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(t, { emit: y }) {
    const e = y, n = f(), d = f(!1), r = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      d.value = !0;
    } }];
    function v(c) {
      return (/* @__PURE__ */ new Date(`${c}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (c, o) => {
      const g = m("Tag"), k = m("Button"), p = m("Menu");
      return s(), T("section", {
        class: ce(["day-card", { "is-today": t.day.isToday }]),
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
          t.day.isToday ? (s(), C(g, {
            key: 0,
            value: "Today"
          })) : L("v-if", !0),
          u(k, {
            icon: "pi pi-ellipsis-v",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: o[0] || (o[0] = (l) => n.value.toggle(l))
          }),
          u(
            p,
            {
              ref_key: "menu",
              ref: n,
              model: r,
              popup: ""
            },
            null,
            512
            /* NEED_PATCH */
          )
        ]),
        (s(!0), T(
          E,
          null,
          z(t.day.slots, (l) => (s(), C(Ve, {
            key: l.id,
            slot: l,
            date: t.day.date,
            onAdd: o[1] || (o[1] = (S) => e("add", S)),
            onChanged: o[2] || (o[2] = (S) => e("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        u(ae(se), {
          name: "timeline.day.footer",
          context: { date: t.day.date }
        }, null, 8, ["context"]),
        u(Re, {
          visible: d.value,
          "onUpdate:visible": o[3] || (o[3] = (l) => d.value = l),
          date: t.day.date,
          slots: t.day.slots,
          onChanged: o[4] || (o[4] = (l) => e("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), re = /* @__PURE__ */ X(Ee, [["__scopeId", "data-v-23b8dadf"]]), Ne = { class: "add-entry" }, je = { key: 0 }, qe = { class: "quick-notes" }, Fe = /* @__PURE__ */ K({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(t, { emit: y }) {
    const e = t, n = y, d = ["Dining out", "Leftovers", "Takeout", "Quick meal"], r = le(), v = f("recipes"), c = f(""), o = f([]), g = f([]), k = f(""), p = f(2), l = f(!1), S = f(""), N = Y(() => {
      var H, q;
      const i = (((H = r.store.household.value) == null ? void 0 : H.meal_types) || []).find(
        (F) => {
          var W, P, O, G;
          return F.id === e.mealType || ((W = F.id) == null ? void 0 : W.toLowerCase()) === ((P = e.mealType) == null ? void 0 : P.toLowerCase()) || ((O = F.label) == null ? void 0 : O.toLowerCase()) === ((G = e.mealType) == null ? void 0 : G.toLowerCase());
        }
      );
      if (i && Array.isArray(i.predefined_notes))
        return i.predefined_notes;
      const A = (q = r.store.household.value) == null ? void 0 : q.predefined_notes;
      return Array.isArray(A) ? A : d;
    });
    let B = 0;
    async function j() {
      const h = ++B;
      try {
        const i = await r.api.get("/api/recipes", { q: c.value });
        h === B && (o.value = i.items);
      } catch (i) {
        h === B && (S.value = i.message);
      }
    }
    ve(() => e.visible, async (h) => {
      if (!h) {
        ++B;
        return;
      }
      v.value = "recipes", c.value = "", k.value = "", p.value = 2, S.value = "", o.value = [], await j();
      try {
        g.value = await r.api.get("/api/x/core-shortlist");
      } catch {
        g.value = [];
      }
    });
    async function x(h) {
      if (!(l.value || !h && !k.value.trim())) {
        l.value = !0, S.value = "";
        try {
          const i = await r.api.post("/api/schedule", { date: e.date, meal_type: e.mealType, entry_type: h ? "recipe" : "note", ...h ? { recipe_id: h } : { title: k.value }, servings_override: p.value });
          n("created", i), n("update:visible", !1);
        } catch (i) {
          S.value = i.message || "Could not add meal";
        } finally {
          l.value = !1;
        }
      }
    }
    return (h, i) => {
      const A = m("Message"), H = m("InputNumber"), q = m("Tab"), F = m("TabList"), W = m("InputText"), P = m("Button"), O = m("TabPanel"), G = m("TabPanels"), ne = m("Tabs"), oe = m("Dialog");
      return s(), C(oe, {
        visible: t.visible,
        "onUpdate:visible": i[5] || (i[5] = (a) => n("update:visible", a)),
        header: `Add meal · ${t.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: w(() => [
          _("div", Ne, [
            S.value ? (s(), C(A, {
              key: 0,
              severity: "error"
            }, {
              default: w(() => [
                U(
                  I(S.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : L("v-if", !0),
            i[11] || (i[11] = _(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            u(H, {
              inputId: "entry-servings",
              modelValue: p.value,
              "onUpdate:modelValue": i[0] || (i[0] = (a) => p.value = a),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            u(ne, {
              value: v.value,
              "onUpdate:value": i[4] || (i[4] = (a) => v.value = a)
            }, {
              default: w(() => [
                u(F, null, {
                  default: w(() => [
                    u(q, { value: "recipes" }, {
                      default: w(() => [...i[6] || (i[6] = [
                        U(
                          "Recipes",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    u(q, { value: "shortlist" }, {
                      default: w(() => [...i[7] || (i[7] = [
                        U(
                          "Shortlist",
                          -1
                          /* CACHED */
                        )
                      ])]),
                      _: 1
                      /* STABLE */
                    }),
                    u(q, { value: "note" }, {
                      default: w(() => [...i[8] || (i[8] = [
                        U(
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
                u(G, null, {
                  default: w(() => [
                    u(O, { value: "recipes" }, {
                      default: w(() => [
                        i[9] || (i[9] = _(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        u(W, {
                          id: "entry-recipe-search",
                          modelValue: c.value,
                          "onUpdate:modelValue": i[1] || (i[1] = (a) => c.value = a),
                          onInput: j,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (s(!0), T(
                          E,
                          null,
                          z(o.value, (a) => (s(), T("div", {
                            key: a.id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              I(a.title),
                              1
                              /* TEXT */
                            ),
                            u(P, {
                              label: "Schedule",
                              loading: l.value,
                              onClick: ($) => x(a.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(O, { value: "shortlist" }, {
                      default: w(() => [
                        g.value.length ? L("v-if", !0) : (s(), T("p", je, "No recipes in shortlist")),
                        (s(!0), T(
                          E,
                          null,
                          z(g.value, (a) => (s(), T("div", {
                            key: a.recipe_id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              I(a.recipe_title),
                              1
                              /* TEXT */
                            ),
                            u(P, {
                              label: "Schedule",
                              loading: l.value,
                              onClick: ($) => x(a.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(O, { value: "note" }, {
                      default: w(() => [
                        i[10] || (i[10] = _(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        u(W, {
                          id: "entry-note",
                          modelValue: k.value,
                          "onUpdate:modelValue": i[2] || (i[2] = (a) => k.value = a),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        _("div", qe, [
                          (s(!0), T(
                            E,
                            null,
                            z(N.value, (a) => (s(), C(P, {
                              key: a,
                              label: a,
                              outlined: "",
                              size: "small",
                              onClick: ($) => k.value = a
                            }, null, 8, ["label", "onClick"]))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        u(P, {
                          label: "Add meal",
                          loading: l.value,
                          disabled: !k.value.trim(),
                          onClick: i[3] || (i[3] = (a) => x())
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
}), Oe = /* @__PURE__ */ X(Fe, [["__scopeId", "data-v-e702574c"]]);
function M(t, y) {
  const e = /* @__PURE__ */ new Date(`${t}T12:00:00`);
  return e.setDate(e.getDate() + y), `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function ze(t, y, e, n) {
  const d = [];
  for (let r = t.from; r <= t.to; r = M(r, 1)) {
    const v = (y[r] || []).map((c) => ({ ...c, entries: [] }));
    for (const c of e.filter((o) => o.date === r)) {
      const o = c.meal_type.toLowerCase();
      let g = v.find((k) => k.id.toLowerCase() === o) || v.find((k) => k.label.toLowerCase() === o);
      g || (g = { id: c.meal_type, label: c.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (k) => k.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, v.push(g)), g.entries.push(c), g.skipped = !1;
    }
    d.push({ date: r, isPast: r < n, isToday: r === n, slots: v });
  }
  return d;
}
const We = { class: "timeline-page" }, Ye = { class: "timeline-toolbar" }, He = { class: "timeline-container" }, Ge = { class: "timeline-sidebar-wrapper" }, Qe = { class: "timeline-feed" }, Je = { class: "past-days" }, Ke = ["data-timeline-date"], Xe = /* @__PURE__ */ K({
  __name: "TimelinePage",
  setup(t) {
    const y = le();
    function e() {
      const a = /* @__PURE__ */ new Date();
      return `${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, "0")}-${String(a.getDate()).padStart(2, "0")}`;
    }
    const n = f(e()), d = f({ from: M(n.value, -2), to: M(n.value, 6) }), r = f([]), v = f({}), c = f(""), o = f(/* @__PURE__ */ new Set()), g = f(null), k = f(window.innerWidth < 768), p = f([]), l = fe("__SS_SLOT_REGISTRY__"), S = Y(() => (l == null ? void 0 : l.getContributions("timeline.sidebar")) || []), N = Y(() => ze(d.value, v.value, r.value, n.value)), B = Y(() => N.value.filter((a) => a.isPast)), j = Y(() => N.value.filter((a) => !a.isPast));
    let x = 0, h, i = !1;
    async function A() {
      const a = ++x, { from: $, to: V } = d.value;
      c.value = "";
      try {
        const R = [], ee = [], te = {};
        for (let D = $; D <= V; ) {
          const Z = M(D, 62) < V ? M(D, 62) : V, Q = { from: D, to: Z }, [b, J, me] = await Promise.all([y.api.get("/api/schedule", Q), y.api.get("/api/journal", Q), y.api.get("/api/x/core-timeline/slots", Q)]);
          if (a !== x || i) return;
          R.push(...b), ee.push(...J), Object.assign(te, me.days), D = M(Z, 1);
        }
        const ie = new Set(ee.filter((D) => D.status === "cooked").map((D) => D.schedule_entry_id));
        r.value = R.map((D) => ({ ...D, is_cooked: ie.has(D.id) })), v.value = te;
      } catch (R) {
        a === x && !i && (c.value = R.message || "Could not load Timeline");
      }
    }
    function H() {
      clearTimeout(h), h = setTimeout(A, 300);
    }
    const q = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted", "core-timeline:slots-changed"].map((a) => y.on(a, H));
    function F() {
      k.value = window.innerWidth < 768;
    }
    function W() {
      d.value = { ...d.value, from: M(d.value.from, -2) }, A();
    }
    function P() {
      d.value = { ...d.value, to: M(d.value.to, 5) }, A();
    }
    async function O() {
      var a, $;
      n.value = e(), d.value = { from: M(n.value, -2), to: M(n.value, 6) }, o.value.clear(), await A(), await he(), ($ = (a = document.querySelector(".day-card.is-today")) == null ? void 0 : a.scrollIntoView) == null || $.call(a, { block: "start", behavior: "smooth" });
    }
    function G(a) {
      o.value.has(a) ? o.value.delete(a) : o.value.add(a);
    }
    function ne(a) {
      return (/* @__PURE__ */ new Date(`${a}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function oe(a) {
      return a.slots.flatMap(($) => $.entries.map((V) => {
        var R;
        return `${$.label.toUpperCase()} ${((R = V.recipe) == null ? void 0 : R.title) || V.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    return ye(() => {
      A(), window.addEventListener("resize", F);
    }), ge(() => {
      i = !0, ++x, clearTimeout(h), q.forEach((a) => {
        typeof a == "function" && a();
      }), window.removeEventListener("resize", F);
    }), (a, $) => {
      var Z, Q;
      const V = m("Button"), R = m("Message"), ee = m("AccordionHeader"), te = m("AccordionContent"), ie = m("AccordionPanel"), D = m("Accordion");
      return s(), T("div", We, [
        _("div", Ye, [
          $[4] || ($[4] = _(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          u(V, {
            label: "Today",
            icon: "pi pi-calendar",
            outlined: "",
            onClick: O
          })
        ]),
        c.value ? (s(), C(R, {
          key: 0,
          severity: "error"
        }, {
          default: w(() => [
            U(
              I(c.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : L("v-if", !0),
        _("div", He, [
          _("aside", Ge, [
            k.value ? (s(), C(D, {
              key: 0,
              value: p.value,
              "onUpdate:value": $[0] || ($[0] = (b) => p.value = b),
              multiple: ""
            }, {
              default: w(() => [
                (s(!0), T(
                  E,
                  null,
                  z(S.value, (b) => (s(), C(ie, {
                    key: b.id,
                    value: b.id
                  }, {
                    default: w(() => [
                      u(
                        ee,
                        null,
                        {
                          default: w(() => [
                            U(
                              I(b.pluginId === "core-shortlist" ? "Shortlist" : b.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : b.pluginId),
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
                        te,
                        null,
                        {
                          default: w(() => [
                            (s(), C(be(b.component), { context: d.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (s(), C(ae(se), {
              key: 1,
              name: "timeline.sidebar",
              context: d.value
            }, null, 8, ["context"]))
          ]),
          _("div", Qe, [
            u(V, {
              label: "Show 2 earlier days",
              text: "",
              onClick: W
            }),
            _("div", Je, [
              (s(!0), T(
                E,
                null,
                z(B.value, (b) => (s(), T("div", {
                  key: b.date,
                  "data-timeline-date": o.value.has(b.date) ? void 0 : b.date
                }, [
                  u(V, {
                    class: "past-day-line",
                    label: `${ne(b.date)} · ${oe(b)}`,
                    text: "",
                    "aria-expanded": o.value.has(b.date),
                    onClick: (J) => G(b.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  o.value.has(b.date) ? (s(), C(re, {
                    key: 0,
                    day: b,
                    onAdd: $[1] || ($[1] = (J) => g.value = J),
                    onChanged: A
                  }, null, 8, ["day"])) : L("v-if", !0)
                ], 8, Ke))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (s(!0), T(
              E,
              null,
              z(j.value, (b) => (s(), C(re, {
                key: b.date,
                day: b,
                onAdd: $[2] || ($[2] = (J) => g.value = J),
                onChanged: A
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            u(V, {
              label: "Show 5 more days",
              outlined: "",
              onClick: P
            })
          ])
        ]),
        u(Oe, {
          visible: !!g.value,
          date: ((Z = g.value) == null ? void 0 : Z.date) || n.value,
          mealType: ((Q = g.value) == null ? void 0 : Q.mealType) || "",
          "onUpdate:visible": $[3] || ($[3] = (b) => {
            b || (g.value = null);
          }),
          onCreated: A
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Ze = /* @__PURE__ */ X(Xe, [["__scopeId", "data-v-3e7b1666"]]);
function at(t) {
  t.route({ path: "/timeline", component: Ze, nav: { label: "Timeline", icon: "calendar", order: 5 } }), t.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), t.intent.hub({ id: "entry:interact", title: "Meal actions" }), t.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), t.intent.provider({
    hub: "entry:interact",
    id: "view-recipe",
    title: "View recipe",
    icon: "book",
    order: 10,
    kind: "headless",
    isAvailable: (e) => {
      var n;
      return !!((n = e == null ? void 0 : e.entry) != null && n.recipe_id);
    },
    execute: (e) => t.navigate(`/recipes/${e.entry.recipe_id}`)
  }), t.intent.provider({
    hub: "entry:interact",
    id: "remove",
    title: "Remove from plan",
    icon: "trash",
    order: 999,
    kind: "headless",
    execute: async (e) => {
      const n = e == null ? void 0 : e.entry;
      !n || !await t.confirm({ header: "Remove meal", message: "Remove this meal from the plan?", acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" }) || (await t.api.delete(`/api/schedule/${n.id}?revision=${n.revision}`), t.notify({ level: "success", message: "Meal removed from plan" }));
    }
  });
  const y = async () => {
    try {
      const e = /* @__PURE__ */ new Date(), n = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`, d = await t.api.get(`/api/schedule?from=${M(n, -2)}&to=${M(n, 14)}`);
      for (const r of d) r.recipe_id && t.api.get(`/api/recipes/${r.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  y();
  for (const e of ["schedule:created", "schedule:updated", "schedule:deleted"]) t.on(e, y);
}
export {
  at as default
};
