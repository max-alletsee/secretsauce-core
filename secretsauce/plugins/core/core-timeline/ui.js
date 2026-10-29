import { defineComponent as K, resolveComponent as m, resolveDirective as de, openBlock as s, createBlock as C, withCtx as w, createElementVNode as _, toDisplayString as M, withDirectives as ue, createElementBlock as T, createCommentVNode as L, createVNode as u, unref as ee, ref as y, computed as Y, normalizeClass as ce, createTextVNode as U, Fragment as z, renderList as O, watch as ve, withModifiers as pe, inject as fe, onMounted as ye, onBeforeUnmount as ge, resolveDynamicComponent as be, nextTick as he } from "vue";
import { Slot as ae, useSecretSauce as ne, IntentTrigger as _e } from "@secretsauce/ui";
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
  setup(e, { emit: g }) {
    function t(d) {
      return (/* @__PURE__ */ new Date(`${d}T12:00:00`)).toLocaleDateString("en", { weekday: "long" });
    }
    const n = g;
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
                M(((o = e.entry.recipe) == null ? void 0 : o.title) || e.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              e.entry.origin === "plugin:core-recurring" ? ue((s(), T("i", {
                key: 0,
                class: "pi pi-replay",
                "aria-label": `Repeats every ${t(e.entry.date)}`
              }, null, 8, we)), [
                [c, `Repeats every ${t(e.entry.date)}`]
              ]) : L("v-if", !0),
              u(ee(ae), {
                name: "timeline.entry.badge",
                context: { entry: e.entry }
              }, null, 8, ["context"])
            ]),
            e.entry.servings_override ? (s(), T(
              "div",
              Te,
              M(e.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : L("v-if", !0),
            e.entry.note ? (s(), T(
              "div",
              Ce,
              M(e.entry.note),
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
}), X = (e, g) => {
  const t = e.__vccOpts || e;
  for (const [n, d] of g)
    t[n] = d;
  return t;
}, xe = /* @__PURE__ */ X(Se, [["__scopeId", "data-v-a27a3d19"]]), De = ["data-slot-id"], Ae = { class: "slot-header" }, Le = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Ie = {
  key: 1,
  class: "skipped-row"
}, Me = /* @__PURE__ */ K({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = e, n = g, d = ne(), r = y(), v = y(""), c = y(!1);
    function o() {
      n("add", { date: t.date, mealType: t.slot.id });
    }
    async function b(p) {
      if (!c.value) {
        c.value = !0, v.value = "";
        try {
          if (p === "remove" && t.slot.entries.length && !await d.confirm({ header: "Remove slot", message: `Remove ${t.slot.label} and its ${t.slot.entries.length} planned meal${t.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const a = `/api/x/core-timeline/days/${t.date}/slots/${encodeURIComponent(t.slot.id)}`;
          p === "skip" ? await d.api.put(a, { kind: "skip" }) : await d.api.delete(a, p === "remove" ? { with_entries: "true" } : void 0), n("changed");
        } catch (a) {
          v.value = a.message || "Could not change slot";
        } finally {
          c.value = !1;
        }
      }
    }
    const k = Y(() => [{ label: "Add another meal", icon: "pi pi-plus", command: o }, ...t.slot.kind === "default" && !t.slot.entries.length ? [{ label: "Skip on this day", command: () => b("skip") }] : [], ...t.slot.kind === "extra" && !t.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => b("remove") }] : []]);
    return (p, a) => {
      const S = m("Button"), E = m("Menu"), B = m("Message"), N = de("tooltip");
      return s(), T("div", {
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
              U(
                M(e.slot.label) + " ",
                1
                /* TEXT */
              ),
              e.slot.kind === "extra" ? ue((s(), T(
                "i",
                Le,
                null,
                512
                /* NEED_PATCH */
              )), [
                [N, "Only on this day"]
              ]) : L("v-if", !0)
            ],
            2
            /* CLASS */
          ),
          e.slot.skipped ? L("v-if", !0) : (s(), C(S, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: c.value,
            onClick: a[0] || (a[0] = (x) => r.value.toggle(x))
          }, null, 8, ["disabled"])),
          u(E, {
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
              M(v.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : L("v-if", !0),
        e.slot.skipped ? (s(), T("div", Ie, [
          a[3] || (a[3] = _(
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
            onClick: a[1] || (a[1] = (x) => b("undo"))
          }, null, 8, ["loading"])
        ])) : (s(), T(
          z,
          { key: 2 },
          [
            (s(!0), T(
              z,
              null,
              O(e.slot.entries, (x) => (s(), C(ee(_e), {
                key: x.id,
                hub: "entry:interact",
                context: { entry: x, mealType: e.slot.id },
                onResolve: a[2] || (a[2] = (h) => n("changed"))
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
            u(ee(ae), {
              name: "timeline.slot.suggestions",
              context: { date: e.date, slot: e.slot, onChanged: () => n("changed") }
            }, null, 8, ["context"]),
            e.slot.entries.length ? L("v-if", !0) : (s(), C(S, {
              key: 0,
              class: "empty-slot-btn",
              icon: "pi pi-plus",
              size: "small",
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
}), Ve = /* @__PURE__ */ X(Me, [["__scopeId", "data-v-c6b8aadf"]]);
function Be(e, g) {
  const t = e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", n = new Set(g);
  let d = t.slice(0, 64).replace(/-+$/g, "");
  for (let r = 2; n.has(d); r++) {
    const v = `-${r}`;
    d = t.slice(0, 64 - v.length).replace(/-+$/g, "") + v;
  }
  return d;
}
const Re = /* @__PURE__ */ K({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(e, { emit: g }) {
    const t = e, n = g, d = ne(), r = y(""), v = y(null), c = y(!1), o = y(""), b = Y(() => [{ label: "At the end", value: null }, ...t.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    ve(() => t.visible, (p) => {
      p && (r.value = "", v.value = null, o.value = "");
    });
    async function k() {
      if (!(!r.value.trim() || c.value)) {
        c.value = !0, o.value = "";
        try {
          const p = Be(r.value, [...t.slots.map((a) => a.id), ...d.store.household.value.meal_types.map((a) => a.id)]);
          await d.api.put(`/api/x/core-timeline/days/${t.date}/slots/${p}`, { kind: "extra", label: r.value.trim(), before: v.value }), n("changed"), n("update:visible", !1);
        } catch (p) {
          o.value = p.message || "Could not add slot";
        } finally {
          c.value = !1;
        }
      }
    }
    return (p, a) => {
      const S = m("Message"), E = m("InputText"), B = m("Select"), N = m("Button"), x = m("Dialog");
      return s(), C(x, {
        visible: e.visible,
        "onUpdate:visible": a[2] || (a[2] = (h) => n("update:visible", h)),
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
                    M(o.value),
                    1
                    /* TEXT */
                  )
                ]),
                _: 1
                /* STABLE */
              })) : L("v-if", !0),
              a[3] || (a[3] = _(
                "label",
                { for: "extra-slot-name" },
                "Slot name",
                -1
                /* CACHED */
              )),
              u(E, {
                id: "extra-slot-name",
                modelValue: r.value,
                "onUpdate:modelValue": a[0] || (a[0] = (h) => r.value = h),
                maxlength: "64",
                required: ""
              }, null, 8, ["modelValue"]),
              a[4] || (a[4] = _(
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
                "onUpdate:modelValue": a[1] || (a[1] = (h) => v.value = h),
                options: b.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              u(N, {
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
}), Pe = /* @__PURE__ */ X(Re, [["__scopeId", "data-v-8c53feab"]]), Ue = ["data-timeline-date"], ze = /* @__PURE__ */ K({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = g, n = y(), d = y(!1), r = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      d.value = !0;
    } }];
    function v(c) {
      return (/* @__PURE__ */ new Date(`${c}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (c, o) => {
      const b = m("Tag"), k = m("Button"), p = m("Menu");
      return s(), T("section", {
        class: ce(["day-card", { "is-today": e.day.isToday }]),
        "data-timeline-date": e.day.date
      }, [
        _("header", null, [
          _(
            "h3",
            null,
            M(v(e.day.date)),
            1
            /* TEXT */
          ),
          e.day.isToday ? (s(), C(b, {
            key: 0,
            value: "Today"
          })) : L("v-if", !0),
          u(k, {
            icon: "pi pi-ellipsis-v",
            size: "small",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: o[0] || (o[0] = (a) => n.value.toggle(a))
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
          z,
          null,
          O(e.day.slots, (a) => (s(), C(Ve, {
            key: a.id,
            slot: a,
            date: e.day.date,
            onAdd: o[1] || (o[1] = (S) => t("add", S)),
            onChanged: o[2] || (o[2] = (S) => t("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        u(ee(ae), {
          name: "timeline.day.footer",
          context: { date: e.day.date }
        }, null, 8, ["context"]),
        u(Pe, {
          visible: d.value,
          "onUpdate:visible": o[3] || (o[3] = (a) => d.value = a),
          date: e.day.date,
          slots: e.day.slots,
          onChanged: o[4] || (o[4] = (a) => t("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), re = /* @__PURE__ */ X(ze, [["__scopeId", "data-v-1b485257"]]), Ee = { class: "add-entry" }, Ne = { key: 0 }, je = { class: "quick-notes" }, qe = /* @__PURE__ */ K({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(e, { emit: g }) {
    const t = e, n = g, d = ["Dining out", "Leftovers", "Takeout", "Quick meal"], r = ne(), v = y("recipes"), c = y(""), o = y([]), b = y([]), k = y(""), p = y(2), a = y(!1), S = y(""), E = Y(() => {
      var H, j;
      const i = (((H = r.store.household.value) == null ? void 0 : H.meal_types) || []).find(
        (q) => {
          var W, R, F, G;
          return q.id === t.mealType || ((W = q.id) == null ? void 0 : W.toLowerCase()) === ((R = t.mealType) == null ? void 0 : R.toLowerCase()) || ((F = q.label) == null ? void 0 : F.toLowerCase()) === ((G = t.mealType) == null ? void 0 : G.toLowerCase());
        }
      );
      if (i && Array.isArray(i.predefined_notes))
        return i.predefined_notes;
      const A = (j = r.store.household.value) == null ? void 0 : j.predefined_notes;
      return Array.isArray(A) ? A : d;
    });
    let B = 0;
    async function N() {
      const h = ++B;
      try {
        const i = await r.api.get("/api/recipes", { q: c.value });
        h === B && (o.value = i.items);
      } catch (i) {
        h === B && (S.value = i.message);
      }
    }
    ve(() => t.visible, async (h) => {
      if (!h) {
        ++B;
        return;
      }
      v.value = "recipes", c.value = "", k.value = "", p.value = 2, S.value = "", o.value = [], await N();
      try {
        b.value = await r.api.get("/api/x/core-shortlist");
      } catch {
        b.value = [];
      }
    });
    async function x(h) {
      if (!(a.value || !h && !k.value.trim())) {
        a.value = !0, S.value = "";
        try {
          const i = await r.api.post("/api/schedule", { date: t.date, meal_type: t.mealType, entry_type: h ? "recipe" : "note", ...h ? { recipe_id: h } : { title: k.value }, servings_override: p.value });
          n("created", i), n("update:visible", !1);
        } catch (i) {
          S.value = i.message || "Could not add meal";
        } finally {
          a.value = !1;
        }
      }
    }
    return (h, i) => {
      const A = m("Message"), H = m("InputNumber"), j = m("Tab"), q = m("TabList"), W = m("InputText"), R = m("Button"), F = m("TabPanel"), G = m("TabPanels"), oe = m("Tabs"), ie = m("Dialog");
      return s(), C(ie, {
        visible: e.visible,
        "onUpdate:visible": i[5] || (i[5] = (l) => n("update:visible", l)),
        header: `Add meal · ${e.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: w(() => [
          _("div", Ee, [
            S.value ? (s(), C(A, {
              key: 0,
              severity: "error"
            }, {
              default: w(() => [
                U(
                  M(S.value),
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
              "onUpdate:modelValue": i[0] || (i[0] = (l) => p.value = l),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            u(oe, {
              value: v.value,
              "onUpdate:value": i[4] || (i[4] = (l) => v.value = l)
            }, {
              default: w(() => [
                u(q, null, {
                  default: w(() => [
                    u(j, { value: "recipes" }, {
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
                    u(j, { value: "shortlist" }, {
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
                    u(j, { value: "note" }, {
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
                    u(F, { value: "recipes" }, {
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
                          "onUpdate:modelValue": i[1] || (i[1] = (l) => c.value = l),
                          onInput: N,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (s(!0), T(
                          z,
                          null,
                          O(o.value, (l) => (s(), T("div", {
                            key: l.id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              M(l.title),
                              1
                              /* TEXT */
                            ),
                            u(R, {
                              label: "Schedule",
                              loading: a.value,
                              onClick: ($) => x(l.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(F, { value: "shortlist" }, {
                      default: w(() => [
                        b.value.length ? L("v-if", !0) : (s(), T("p", Ne, "No recipes in shortlist")),
                        (s(!0), T(
                          z,
                          null,
                          O(b.value, (l) => (s(), T("div", {
                            key: l.recipe_id,
                            class: "recipe-result"
                          }, [
                            _(
                              "span",
                              null,
                              M(l.recipe_title),
                              1
                              /* TEXT */
                            ),
                            u(R, {
                              label: "Schedule",
                              loading: a.value,
                              onClick: ($) => x(l.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(F, { value: "note" }, {
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
                          "onUpdate:modelValue": i[2] || (i[2] = (l) => k.value = l),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        _("div", je, [
                          (s(!0), T(
                            z,
                            null,
                            O(E.value, (l) => (s(), C(R, {
                              key: l,
                              label: l,
                              outlined: "",
                              size: "small",
                              onClick: ($) => k.value = l
                            }, null, 8, ["label", "onClick"]))),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ]),
                        u(R, {
                          label: "Add meal",
                          loading: a.value,
                          disabled: !k.value.trim(),
                          onClick: i[3] || (i[3] = (l) => x())
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
}), Fe = /* @__PURE__ */ X(qe, [["__scopeId", "data-v-73f61ade"]]);
function I(e, g) {
  const t = /* @__PURE__ */ new Date(`${e}T12:00:00`);
  return t.setDate(t.getDate() + g), `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function Oe(e, g, t, n) {
  const d = [];
  for (let r = e.from; r <= e.to; r = I(r, 1)) {
    const v = (g[r] || []).map((c) => ({ ...c, entries: [] }));
    for (const c of t.filter((o) => o.date === r)) {
      const o = c.meal_type.toLowerCase();
      let b = v.find((k) => k.id.toLowerCase() === o) || v.find((k) => k.label.toLowerCase() === o);
      b || (b = { id: c.meal_type, label: c.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (k) => k.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, v.push(b)), b.entries.push(c), b.skipped = !1;
    }
    d.push({ date: r, isPast: r < n, isToday: r === n, slots: v });
  }
  return d;
}
const We = { class: "timeline-page" }, Ye = { class: "timeline-toolbar" }, He = { class: "timeline-container" }, Ge = { class: "timeline-sidebar-wrapper" }, Qe = { class: "timeline-feed" }, Je = { class: "past-days" }, Ke = ["data-timeline-date"], Xe = /* @__PURE__ */ K({
  __name: "TimelinePage",
  setup(e) {
    const g = ne();
    function t() {
      const l = /* @__PURE__ */ new Date();
      return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, "0")}-${String(l.getDate()).padStart(2, "0")}`;
    }
    const n = y(t()), d = y({ from: I(n.value, -2), to: I(n.value, 6) }), r = y([]), v = y({}), c = y(""), o = y(/* @__PURE__ */ new Set()), b = y(null), k = y(window.innerWidth < 768), p = y([]), a = fe("__SS_SLOT_REGISTRY__"), S = Y(() => (a == null ? void 0 : a.getContributions("timeline.sidebar")) || []), E = Y(() => Oe(d.value, v.value, r.value, n.value)), B = Y(() => E.value.filter((l) => l.isPast)), N = Y(() => E.value.filter((l) => !l.isPast));
    let x = 0, h, i = !1;
    async function A() {
      const l = ++x, { from: $, to: V } = d.value;
      c.value = "";
      try {
        const P = [], te = [], le = {};
        for (let D = $; D <= V; ) {
          const Z = I(D, 62) < V ? I(D, 62) : V, Q = { from: D, to: Z }, [f, J, me] = await Promise.all([g.api.get("/api/schedule", Q), g.api.get("/api/journal", Q), g.api.get("/api/x/core-timeline/slots", Q)]);
          if (l !== x || i) return;
          P.push(...f), te.push(...J), Object.assign(le, me.days), D = I(Z, 1);
        }
        const se = new Set(te.filter((D) => D.status === "cooked").map((D) => D.schedule_entry_id));
        r.value = P.map((D) => ({ ...D, is_cooked: se.has(D.id) })), v.value = le;
      } catch (P) {
        l === x && !i && (c.value = P.message || "Could not load Timeline");
      }
    }
    function H() {
      clearTimeout(h), h = setTimeout(A, 300);
    }
    const j = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted", "core-timeline:slots-changed"].map((l) => g.on(l, H));
    function q() {
      k.value = window.innerWidth < 768;
    }
    function W() {
      d.value = { ...d.value, from: I(d.value.from, -2) }, A();
    }
    function R() {
      d.value = { ...d.value, to: I(d.value.to, 5) }, A();
    }
    async function F() {
      var l, $;
      n.value = t(), d.value = { from: I(n.value, -2), to: I(n.value, 6) }, o.value.clear(), await A(), await he(), ($ = (l = document.querySelector(".day-card.is-today")) == null ? void 0 : l.scrollIntoView) == null || $.call(l, { block: "start", behavior: "smooth" });
    }
    function G(l) {
      o.value.has(l) ? o.value.delete(l) : o.value.add(l);
    }
    function oe(l) {
      return (/* @__PURE__ */ new Date(`${l}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function ie(l) {
      return l.slots.flatMap(($) => $.entries.map((V) => {
        var P;
        return `${$.label.toUpperCase()} ${((P = V.recipe) == null ? void 0 : P.title) || V.title || "Planned meal"}`;
      })).join(" · ") || "—";
    }
    return ye(() => {
      A(), window.addEventListener("resize", q);
    }), ge(() => {
      i = !0, ++x, clearTimeout(h), j.forEach((l) => {
        typeof l == "function" && l();
      }), window.removeEventListener("resize", q);
    }), (l, $) => {
      var Z, Q;
      const V = m("Button"), P = m("Message"), te = m("AccordionHeader"), le = m("AccordionContent"), se = m("AccordionPanel"), D = m("Accordion");
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
            size: "small",
            outlined: "",
            onClick: F
          })
        ]),
        c.value ? (s(), C(P, {
          key: 0,
          severity: "error"
        }, {
          default: w(() => [
            U(
              M(c.value),
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
              "onUpdate:value": $[0] || ($[0] = (f) => p.value = f),
              multiple: ""
            }, {
              default: w(() => [
                (s(!0), T(
                  z,
                  null,
                  O(S.value, (f) => (s(), C(se, {
                    key: f.id,
                    value: f.id
                  }, {
                    default: w(() => [
                      u(
                        te,
                        null,
                        {
                          default: w(() => [
                            U(
                              M(f.pluginId === "core-shortlist" ? "Shortlist" : f.pluginId === "core-meal-planner-ai" ? "AI meal suggestions" : f.pluginId === "core-recurring" ? "Recurring meals" : f.pluginId),
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
                        le,
                        null,
                        {
                          default: w(() => [
                            (s(), C(be(f.component), { context: d.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (s(), C(ee(ae), {
              key: 1,
              name: "timeline.sidebar",
              context: d.value
            }, null, 8, ["context"]))
          ]),
          _("div", Qe, [
            u(V, {
              label: "Show 2 earlier days",
              size: "small",
              text: "",
              onClick: W
            }),
            _("div", Je, [
              (s(!0), T(
                z,
                null,
                O(B.value, (f) => (s(), T("div", {
                  key: f.date,
                  "data-timeline-date": o.value.has(f.date) ? void 0 : f.date
                }, [
                  u(V, {
                    class: "past-day-line",
                    label: `${oe(f.date)} · ${ie(f)}`,
                    size: "small",
                    text: "",
                    "aria-expanded": o.value.has(f.date),
                    onClick: (J) => G(f.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  o.value.has(f.date) ? (s(), C(re, {
                    key: 0,
                    day: f,
                    onAdd: $[1] || ($[1] = (J) => b.value = J),
                    onChanged: A
                  }, null, 8, ["day"])) : L("v-if", !0)
                ], 8, Ke))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (s(!0), T(
              z,
              null,
              O(N.value, (f) => (s(), C(re, {
                key: f.date,
                day: f,
                onAdd: $[2] || ($[2] = (J) => b.value = J),
                onChanged: A
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            u(V, {
              label: "Show 5 more days",
              size: "small",
              outlined: "",
              onClick: R
            })
          ])
        ]),
        u(Fe, {
          visible: !!b.value,
          date: ((Z = b.value) == null ? void 0 : Z.date) || n.value,
          mealType: ((Q = b.value) == null ? void 0 : Q.mealType) || "",
          "onUpdate:visible": $[3] || ($[3] = (f) => {
            f || (b.value = null);
          }),
          onCreated: A
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Ze = /* @__PURE__ */ X(Xe, [["__scopeId", "data-v-7df69d31"]]);
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
      const t = /* @__PURE__ */ new Date(), n = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`, d = await e.api.get(`/api/schedule?from=${I(n, -2)}&to=${I(n, 14)}`);
      for (const r of d) r.recipe_id && e.api.get(`/api/recipes/${r.recipe_id}`).catch(() => {
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
