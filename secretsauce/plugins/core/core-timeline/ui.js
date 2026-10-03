import { defineComponent as W, resolveComponent as f, openBlock as i, createBlock as S, withCtx as k, createElementVNode as _, toDisplayString as V, createVNode as u, unref as ee, createElementBlock as $, createCommentVNode as M, ref as y, computed as F, resolveDirective as ve, normalizeClass as re, createTextVNode as j, withDirectives as me, Fragment as N, renderList as E, watch as ue, withModifiers as pe, inject as fe, onMounted as ye, onBeforeUnmount as ge, resolveDynamicComponent as be, nextTick as he } from "vue";
import { Slot as se, useSecretSauce as te, IntentTrigger as _e } from "@secretsauce/ui";
const ke = { class: "card-header" }, $e = { class: "card-title" }, we = {
  key: 0,
  class: "card-servings"
}, Ce = {
  key: 1,
  class: "card-note"
}, Se = /* @__PURE__ */ W({
  __name: "ScheduleCard",
  props: {
    entry: {}
  },
  emits: ["interact"],
  setup(e, { emit: g }) {
    const t = g;
    return (o, n) => {
      const d = f("Button");
      return i(), S(d, {
        class: "schedule-card",
        variant: "text",
        onClick: n[0] || (n[0] = (r) => t("interact", r))
      }, {
        default: k(() => {
          var r;
          return [
            _("div", ke, [
              _(
                "span",
                $e,
                V(((r = e.entry.recipe) == null ? void 0 : r.title) || e.entry.title || "Planned Meal"),
                1
                /* TEXT */
              ),
              u(ee(se), {
                name: "timeline.entry.badge",
                context: { entry: e.entry }
              }, null, 8, ["context"])
            ]),
            e.entry.servings_override ? (i(), $(
              "div",
              we,
              V(e.entry.servings_override) + " servings",
              1
              /* TEXT */
            )) : M("v-if", !0),
            e.entry.note ? (i(), $(
              "div",
              Ce,
              V(e.entry.note),
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
  for (const [o, n] of g)
    t[o] = n;
  return t;
}, Te = /* @__PURE__ */ Y(Se, [["__scopeId", "data-v-6dd69cdc"]]), xe = ["data-slot-id"], De = { class: "slot-header" }, Ae = {
  key: 0,
  class: "pi pi-calendar-plus",
  "aria-label": "Only on this day"
}, Ie = {
  key: 1,
  class: "skipped-row"
}, Me = /* @__PURE__ */ W({
  __name: "MealSlot",
  props: {
    slot: {},
    date: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = e, o = g, n = te(), d = y(), r = y(""), c = y(!1);
    function s() {
      o("add", { date: t.date, mealType: t.slot.id });
    }
    async function m(p) {
      if (!c.value) {
        c.value = !0, r.value = "";
        try {
          if (p === "remove" && t.slot.entries.length && !await n.confirm({ header: "Remove slot", message: `Remove ${t.slot.label} and its ${t.slot.entries.length} planned meal${t.slot.entries.length === 1 ? "" : "s"}?`, acceptLabel: "Remove", rejectLabel: "Cancel", severity: "danger" })) return;
          const l = `/api/x/core-timeline/days/${t.date}/slots/${encodeURIComponent(t.slot.id)}`;
          p === "skip" ? await n.api.put(l, { kind: "skip" }) : await n.api.delete(l, p === "remove" ? { with_entries: "true" } : void 0), o("changed");
        } catch (l) {
          r.value = l.message || "Could not change slot";
        } finally {
          c.value = !1;
        }
      }
    }
    const w = F(() => [{ label: "Add another meal", icon: "pi pi-plus", command: s }, ...t.slot.kind === "default" && !t.slot.entries.length ? [{ label: "Skip on this day", command: () => m("skip") }] : [], ...t.slot.kind === "extra" && !t.slot.synthetic ? [{ label: "Remove slot", icon: "pi pi-trash", command: () => m("remove") }] : []]);
    return (p, l) => {
      const x = f("Button"), P = f("Menu"), U = f("Message"), T = ve("tooltip");
      return i(), $("div", {
        class: "meal-slot",
        "data-slot-id": e.slot.id
      }, [
        _("div", De, [
          _(
            "span",
            {
              class: re(["slot-name", { skipped: e.slot.skipped }])
            },
            [
              j(
                V(e.slot.label) + " ",
                1
                /* TEXT */
              ),
              e.slot.kind === "extra" ? me((i(), $(
                "i",
                Ae,
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
          e.slot.skipped ? M("v-if", !0) : (i(), S(x, {
            key: 0,
            icon: "pi pi-ellipsis-h",
            text: "",
            rounded: "",
            "aria-label": "Slot actions",
            disabled: c.value,
            onClick: l[0] || (l[0] = (a) => d.value.toggle(a))
          }, null, 8, ["disabled"])),
          u(P, {
            ref_key: "menu",
            ref: d,
            model: w.value,
            popup: ""
          }, null, 8, ["model"])
        ]),
        r.value ? (i(), S(U, {
          key: 0,
          severity: "error"
        }, {
          default: k(() => [
            j(
              V(r.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : M("v-if", !0),
        e.slot.skipped ? (i(), $("div", Ie, [
          l[3] || (l[3] = _(
            "span",
            null,
            "Skipped this day",
            -1
            /* CACHED */
          )),
          u(x, {
            label: "Undo",
            text: "",
            loading: c.value,
            onClick: l[1] || (l[1] = (a) => m("undo"))
          }, null, 8, ["loading"])
        ])) : (i(), $(
          N,
          { key: 2 },
          [
            (i(!0), $(
              N,
              null,
              E(e.slot.entries, (a) => (i(), S(ee(_e), {
                key: a.id,
                hub: "entry:interact",
                context: { entry: a },
                onResolve: l[2] || (l[2] = (D) => o("changed"))
              }, {
                default: k(({ open: D }) => [
                  u(Te, {
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
            e.slot.entries.length ? M("v-if", !0) : (i(), S(x, {
              key: 0,
              label: "Add meal",
              icon: "pi pi-plus",
              text: "",
              onClick: s
            }))
          ],
          64
          /* STABLE_FRAGMENT */
        ))
      ], 8, xe);
    };
  }
}), Ve = /* @__PURE__ */ Y(Me, [["__scopeId", "data-v-934a763a"]]);
function Be(e, g) {
  const t = e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "slot", o = new Set(g);
  let n = t.slice(0, 64).replace(/-+$/g, "");
  for (let d = 2; o.has(n); d++) {
    const r = `-${d}`;
    n = t.slice(0, 64 - r.length).replace(/-+$/g, "") + r;
  }
  return n;
}
const Le = /* @__PURE__ */ W({
  __name: "AddSlotDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    slots: {}
  },
  emits: ["update:visible", "changed"],
  setup(e, { emit: g }) {
    const t = e, o = g, n = te(), d = y(""), r = y(null), c = y(!1), s = y(""), m = F(() => [{ label: "At the end", value: null }, ...t.slots.filter((p) => p.kind === "default").map((p) => ({ label: `Before ${p.label}`, value: p.id }))]);
    ue(() => t.visible, (p) => {
      p && (d.value = "", r.value = null, s.value = "");
    });
    async function w() {
      if (!(!d.value.trim() || c.value)) {
        c.value = !0, s.value = "";
        try {
          const p = Be(d.value, [...t.slots.map((l) => l.id), ...n.store.household.value.meal_types.map((l) => l.id)]);
          await n.api.put(`/api/x/core-timeline/days/${t.date}/slots/${p}`, { kind: "extra", label: d.value.trim(), before: r.value }), o("changed"), o("update:visible", !1);
        } catch (p) {
          s.value = p.message || "Could not add slot";
        } finally {
          c.value = !1;
        }
      }
    }
    return (p, l) => {
      const x = f("Message"), P = f("InputText"), U = f("Select"), T = f("Button"), a = f("Dialog");
      return i(), S(a, {
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
              s.value ? (i(), S(x, {
                key: 0,
                severity: "error"
              }, {
                default: k(() => [
                  j(
                    V(s.value),
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
              u(P, {
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
              u(U, {
                inputId: "extra-slot-position",
                "aria-label": "Position",
                modelValue: r.value,
                "onUpdate:modelValue": l[1] || (l[1] = (D) => r.value = D),
                options: m.value,
                optionLabel: "label",
                optionValue: "value"
              }, null, 8, ["modelValue", "options"]),
              u(T, {
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
}), Pe = /* @__PURE__ */ Y(Le, [["__scopeId", "data-v-a7cbbf03"]]), Ue = ["data-timeline-date"], Re = /* @__PURE__ */ W({
  __name: "DayCard",
  props: {
    day: {}
  },
  emits: ["add", "changed"],
  setup(e, { emit: g }) {
    const t = g, o = y(), n = y(!1), d = [{ label: "Add slot for this day", icon: "pi pi-calendar-plus", command: () => {
      n.value = !0;
    } }];
    function r(c) {
      return (/* @__PURE__ */ new Date(`${c}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", day: "numeric", month: "short" });
    }
    return (c, s) => {
      const m = f("Tag"), w = f("Button"), p = f("Menu");
      return i(), $("section", {
        class: re(["day-card", { "is-today": e.day.isToday }]),
        "data-timeline-date": e.day.date
      }, [
        _("header", null, [
          _(
            "h3",
            null,
            V(r(e.day.date)),
            1
            /* TEXT */
          ),
          e.day.isToday ? (i(), S(m, {
            key: 0,
            value: "Today"
          })) : M("v-if", !0),
          u(w, {
            icon: "pi pi-ellipsis-v",
            text: "",
            rounded: "",
            "aria-label": "Day actions",
            onClick: s[0] || (s[0] = (l) => o.value.toggle(l))
          }),
          u(
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
        (i(!0), $(
          N,
          null,
          E(e.day.slots, (l) => (i(), S(Ve, {
            key: l.id,
            slot: l,
            date: e.day.date,
            onAdd: s[1] || (s[1] = (x) => t("add", x)),
            onChanged: s[2] || (s[2] = (x) => t("changed"))
          }, null, 8, ["slot", "date"]))),
          128
          /* KEYED_FRAGMENT */
        )),
        u(ee(se), {
          name: "timeline.day.footer",
          context: { date: e.day.date }
        }, null, 8, ["context"]),
        u(Pe, {
          visible: n.value,
          "onUpdate:visible": s[3] || (s[3] = (l) => n.value = l),
          date: e.day.date,
          slots: e.day.slots,
          onChanged: s[4] || (s[4] = (l) => t("changed"))
        }, null, 8, ["visible", "date", "slots"])
      ], 10, Ue);
    };
  }
}), de = /* @__PURE__ */ Y(Re, [["__scopeId", "data-v-0fe1623f"]]), je = { class: "add-entry" }, Ne = { key: 0 }, Ee = { class: "quick-notes" }, Oe = /* @__PURE__ */ W({
  __name: "AddEntryDialog",
  props: {
    visible: { type: Boolean },
    date: {},
    mealType: {}
  },
  emits: ["update:visible", "created"],
  setup(e, { emit: g }) {
    const t = e, o = g, n = te(), d = y("recipes"), r = y(""), c = y([]), s = y([]), m = y(""), w = y(2), p = y(!1), l = y("");
    let x = 0;
    async function P() {
      const T = ++x;
      try {
        const a = await n.api.get("/api/recipes", { q: r.value });
        T === x && (c.value = a.items);
      } catch (a) {
        T === x && (l.value = a.message);
      }
    }
    ue(() => t.visible, async (T) => {
      if (!T) {
        ++x;
        return;
      }
      d.value = "recipes", r.value = "", m.value = "", w.value = 2, l.value = "", c.value = [], await P();
      try {
        s.value = await n.api.get("/api/x/core-shortlist");
      } catch {
        s.value = [];
      }
    });
    async function U(T) {
      if (!(p.value || !T && !m.value.trim())) {
        p.value = !0, l.value = "";
        try {
          const a = await n.api.post("/api/schedule", { date: t.date, meal_type: t.mealType, entry_type: T ? "recipe" : "note", ...T ? { recipe_id: T } : { title: m.value }, servings_override: w.value });
          o("created", a), o("update:visible", !1);
        } catch (a) {
          l.value = a.message || "Could not add meal";
        } finally {
          p.value = !1;
        }
      }
    }
    return (T, a) => {
      const D = f("Message"), H = f("InputNumber"), I = f("Tab"), le = f("TabList"), J = f("InputText"), O = f("Button"), G = f("TabPanel"), ae = f("TabPanels"), ne = f("Tabs"), oe = f("Dialog");
      return i(), S(oe, {
        visible: e.visible,
        "onUpdate:visible": a[5] || (a[5] = (h) => o("update:visible", h)),
        header: `Add meal · ${e.date}`,
        modal: "",
        style: { width: "36rem", maxWidth: "95vw" }
      }, {
        default: k(() => [
          _("div", je, [
            l.value ? (i(), S(D, {
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
            })) : M("v-if", !0),
            a[11] || (a[11] = _(
              "label",
              { for: "entry-servings" },
              "Servings",
              -1
              /* CACHED */
            )),
            u(H, {
              inputId: "entry-servings",
              modelValue: w.value,
              "onUpdate:modelValue": a[0] || (a[0] = (h) => w.value = h),
              min: 0.25,
              maxFractionDigits: 2
            }, null, 8, ["modelValue"]),
            u(ne, {
              value: d.value,
              "onUpdate:value": a[4] || (a[4] = (h) => d.value = h)
            }, {
              default: k(() => [
                u(le, null, {
                  default: k(() => [
                    u(I, { value: "recipes" }, {
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
                    u(I, { value: "shortlist" }, {
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
                    u(I, { value: "note" }, {
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
                u(ae, null, {
                  default: k(() => [
                    u(G, { value: "recipes" }, {
                      default: k(() => [
                        a[9] || (a[9] = _(
                          "label",
                          { for: "entry-recipe-search" },
                          "Search recipes",
                          -1
                          /* CACHED */
                        )),
                        u(J, {
                          id: "entry-recipe-search",
                          modelValue: r.value,
                          "onUpdate:modelValue": a[1] || (a[1] = (h) => r.value = h),
                          onInput: P,
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        (i(!0), $(
                          N,
                          null,
                          E(c.value, (h) => (i(), $("div", {
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
                            u(O, {
                              label: "Schedule",
                              loading: p.value,
                              onClick: (K) => U(h.id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(G, { value: "shortlist" }, {
                      default: k(() => [
                        s.value.length ? M("v-if", !0) : (i(), $("p", Ne, "No recipes in shortlist")),
                        (i(!0), $(
                          N,
                          null,
                          E(s.value, (h) => (i(), $("div", {
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
                            u(O, {
                              label: "Schedule",
                              loading: p.value,
                              onClick: (K) => U(h.recipe_id)
                            }, null, 8, ["loading", "onClick"])
                          ]))),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ]),
                      _: 1
                      /* STABLE */
                    }),
                    u(G, { value: "note" }, {
                      default: k(() => [
                        a[10] || (a[10] = _(
                          "label",
                          { for: "entry-note" },
                          "Note title",
                          -1
                          /* CACHED */
                        )),
                        u(J, {
                          id: "entry-note",
                          modelValue: m.value,
                          "onUpdate:modelValue": a[2] || (a[2] = (h) => m.value = h),
                          fluid: ""
                        }, null, 8, ["modelValue"]),
                        _("div", Ee, [
                          (i(), $(
                            N,
                            null,
                            E(["Dining out", "Leftovers", "Takeout", "Quick meal"], (h) => u(O, {
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
                        u(O, {
                          label: "Add meal",
                          loading: p.value,
                          disabled: !m.value.trim(),
                          onClick: a[3] || (a[3] = (h) => U())
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
}), qe = /* @__PURE__ */ Y(Oe, [["__scopeId", "data-v-442cef49"]]);
function L(e, g) {
  const t = /* @__PURE__ */ new Date(`${e}T12:00:00`);
  return t.setDate(t.getDate() + g), `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
function ze(e, g, t, o) {
  const n = [];
  for (let d = e.from; d <= e.to; d = L(d, 1)) {
    const r = (g[d] || []).map((c) => ({ ...c, entries: [] }));
    for (const c of t.filter((s) => s.date === d)) {
      const s = c.meal_type.toLowerCase();
      let m = r.find((w) => w.id.toLowerCase() === s) || r.find((w) => w.label.toLowerCase() === s);
      m || (m = { id: c.meal_type, label: c.meal_type.replace(/[-_]/g, " ").replace(/\b\w/g, (w) => w.toUpperCase()), kind: "extra", skipped: !1, entries: [], synthetic: !0 }, r.push(m)), m.entries.push(c), m.skipped = !1;
    }
    n.push({ date: d, isPast: d < o, isToday: d === o, slots: r });
  }
  return n;
}
const Fe = { class: "timeline-page" }, We = { class: "timeline-toolbar" }, Ye = { class: "timeline-container" }, He = { class: "timeline-sidebar-wrapper" }, Ge = { class: "timeline-feed" }, Qe = { class: "past-days" }, Je = ["data-timeline-date"], Ke = /* @__PURE__ */ W({
  __name: "TimelinePage",
  setup(e) {
    const g = te();
    function t() {
      const v = /* @__PURE__ */ new Date();
      return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
    }
    const o = y(t()), n = y({ from: L(o.value, -2), to: L(o.value, 6) }), d = y([]), r = y({}), c = y(""), s = y(/* @__PURE__ */ new Set()), m = y(null), w = y(window.innerWidth < 768), p = y([]), l = fe("__SS_SLOT_REGISTRY__"), x = F(() => (l == null ? void 0 : l.getContributions("timeline.sidebar")) || []), P = F(() => ze(n.value, r.value, d.value, o.value)), U = F(() => P.value.filter((v) => v.isPast)), T = F(() => P.value.filter((v) => !v.isPast));
    let a = 0, D, H = !1;
    async function I() {
      const v = ++a, { from: C, to: B } = n.value;
      c.value = "";
      try {
        const R = [], X = [], Z = {};
        for (let A = C; A <= B; ) {
          const Q = L(A, 62) < B ? L(A, 62) : B, q = { from: A, to: Q }, [b, z, ce] = await Promise.all([g.api.get("/api/schedule", q), g.api.get("/api/journal", q), g.api.get("/api/x/core-timeline/slots", q)]);
          if (v !== a || H) return;
          R.push(...b), X.push(...z), Object.assign(Z, ce.days), A = L(Q, 1);
        }
        const ie = new Set(X.filter((A) => A.status === "cooked").map((A) => A.schedule_entry_id));
        d.value = R.map((A) => ({ ...A, is_cooked: ie.has(A.id) })), r.value = Z;
      } catch (R) {
        v === a && !H && (c.value = R.message || "Could not load Timeline");
      }
    }
    function le() {
      clearTimeout(D), D = setTimeout(I, 300);
    }
    const J = ["schedule:created", "schedule:updated", "schedule:deleted", "journal:created", "journal:updated", "journal:deleted", "core-timeline:slots-changed"].map((v) => g.on(v, le));
    function O() {
      w.value = window.innerWidth < 768;
    }
    function G() {
      n.value = { ...n.value, from: L(n.value.from, -2) }, I();
    }
    function ae() {
      n.value = { ...n.value, to: L(n.value.to, 5) }, I();
    }
    async function ne() {
      var v, C;
      o.value = t(), n.value = { from: L(o.value, -2), to: L(o.value, 6) }, s.value.clear(), await I(), await he(), (C = (v = document.querySelector(".day-card.is-today")) == null ? void 0 : v.scrollIntoView) == null || C.call(v, { block: "start", behavior: "smooth" });
    }
    function oe(v) {
      s.value.has(v) ? s.value.delete(v) : s.value.add(v);
    }
    function h(v) {
      return (/* @__PURE__ */ new Date(`${v}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric", month: "short" });
    }
    function K(v) {
      return v.slots.flatMap((C) => C.entries.map((B) => {
        var R;
        return `${C.label.toUpperCase()} ${((R = B.recipe) == null ? void 0 : R.title) || B.title || "Planned meal"}`;
      })).join(" · ") || "Nothing planned";
    }
    return ye(() => {
      I(), window.addEventListener("resize", O);
    }), ge(() => {
      H = !0, ++a, clearTimeout(D), J.forEach((v) => {
        typeof v == "function" && v();
      }), window.removeEventListener("resize", O);
    }), (v, C) => {
      var Q, q;
      const B = f("Button"), R = f("Message"), X = f("AccordionHeader"), Z = f("AccordionContent"), ie = f("AccordionPanel"), A = f("Accordion");
      return i(), $("div", Fe, [
        _("div", We, [
          C[4] || (C[4] = _(
            "h2",
            null,
            "Timeline",
            -1
            /* CACHED */
          )),
          u(B, {
            label: "Today",
            icon: "pi pi-calendar",
            outlined: "",
            onClick: ne
          })
        ]),
        c.value ? (i(), S(R, {
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
        })) : M("v-if", !0),
        _("div", Ye, [
          _("aside", He, [
            w.value ? (i(), S(A, {
              key: 0,
              value: p.value,
              "onUpdate:value": C[0] || (C[0] = (b) => p.value = b),
              multiple: ""
            }, {
              default: k(() => [
                (i(!0), $(
                  N,
                  null,
                  E(x.value, (b) => (i(), S(ie, {
                    key: b.id,
                    value: b.id
                  }, {
                    default: k(() => [
                      u(
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
                      u(
                        Z,
                        null,
                        {
                          default: k(() => [
                            (i(), S(be(b.component), { context: n.value }, null, 8, ["context"]))
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
            }, 8, ["value"])) : (i(), S(ee(se), {
              key: 1,
              name: "timeline.sidebar",
              context: n.value
            }, null, 8, ["context"]))
          ]),
          _("div", Ge, [
            u(B, {
              label: "Show 2 earlier days",
              text: "",
              onClick: G
            }),
            _("div", Qe, [
              (i(!0), $(
                N,
                null,
                E(U.value, (b) => (i(), $("div", {
                  key: b.date,
                  "data-timeline-date": s.value.has(b.date) ? void 0 : b.date
                }, [
                  u(B, {
                    class: "past-day-line",
                    label: `${h(b.date)} · ${K(b)}`,
                    text: "",
                    "aria-expanded": s.value.has(b.date),
                    onClick: (z) => oe(b.date)
                  }, null, 8, ["label", "aria-expanded", "onClick"]),
                  s.value.has(b.date) ? (i(), S(de, {
                    key: 0,
                    day: b,
                    onAdd: C[1] || (C[1] = (z) => m.value = z),
                    onChanged: I
                  }, null, 8, ["day"])) : M("v-if", !0)
                ], 8, Je))),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            (i(!0), $(
              N,
              null,
              E(T.value, (b) => (i(), S(de, {
                key: b.date,
                day: b,
                onAdd: C[2] || (C[2] = (z) => m.value = z),
                onChanged: I
              }, null, 8, ["day"]))),
              128
              /* KEYED_FRAGMENT */
            )),
            u(B, {
              label: "Show 5 more days",
              outlined: "",
              onClick: ae
            })
          ])
        ]),
        u(qe, {
          visible: !!m.value,
          date: ((Q = m.value) == null ? void 0 : Q.date) || o.value,
          mealType: ((q = m.value) == null ? void 0 : q.mealType) || "",
          "onUpdate:visible": C[3] || (C[3] = (b) => {
            b || (m.value = null);
          }),
          onCreated: I
        }, null, 8, ["visible", "date", "mealType"])
      ]);
    };
  }
}), Xe = /* @__PURE__ */ Y(Ke, [["__scopeId", "data-v-f079e105"]]);
function tt(e) {
  e.route({ path: "/timeline", component: Xe, nav: { label: "Timeline", icon: "calendar", order: 5 } }), e.intent.hub({ id: "entry:create", title: "Add entry to timeline" }), e.intent.hub({ id: "entry:interact", title: "Meal actions" }), e.intent.hub({ id: "timeline:assist", title: "Timeline planning assistance" }), e.intent.provider({
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
      const t = /* @__PURE__ */ new Date(), o = new Date(t), n = new Date(t);
      o.setDate(o.getDate() - 2), n.setDate(n.getDate() + 14);
      const d = await e.api.get(`/api/schedule?from=${o.toISOString().slice(0, 10)}&to=${n.toISOString().slice(0, 10)}`);
      for (const r of d) r.recipe_id && e.api.get(`/api/recipes/${r.recipe_id}`).catch(() => {
      });
    } catch {
    }
  };
  g();
  for (const t of ["schedule:created", "schedule:updated", "schedule:deleted"]) e.on(t, g);
}
export {
  tt as default
};
