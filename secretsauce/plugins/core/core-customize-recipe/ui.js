import { defineComponent as Z, resolveComponent as V, openBlock as i, createBlock as q, withCtx as D, createElementVNode as a, createCommentVNode as x, ref as B, watch as pe, createElementBlock as s, Fragment as w, renderList as E, normalizeClass as W, toDisplayString as h, withDirectives as he, vModelText as ye, createVNode as S, createTextVNode as P, nextTick as ke, computed as F, unref as U, onMounted as _e } from "vue";
import { useSecretSauce as J } from "@secretsauce/ui";
const ze = /* @__PURE__ */ Z({
  __name: "CustomizeDetailButton",
  props: {
    context: {}
  },
  setup(e) {
    return (d, n) => {
      var r;
      const y = V("Button");
      return (r = e.context) != null && r.recipe ? (i(), q(y, {
        key: 0,
        label: e.context.customizeOpen ? "Close Customize" : "Customize Recipe",
        class: "btn-customize-recipe",
        outlined: !e.context.customizeOpen && !e.context.customizedRecipe,
        size: "small",
        onClick: n[0] || (n[0] = (u) => {
          var k, _;
          return (_ = (k = e.context).setCustomizeOpen) == null ? void 0 : _.call(k, !e.context.customizeOpen);
        })
      }, {
        icon: D(() => [...n[1] || (n[1] = [
          a(
            "svg",
            {
              width: "15",
              height: "15",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              class: "customize-icon",
              "aria-hidden": "true"
            },
            [
              a("path", { d: "m19 2 2 2-2 2-2-2Z" }),
              a("path", { d: "m5 17 2 2-2 2-2-2Z" }),
              a("path", { d: "m15 4 5 5L7 22l-5-5Z" })
            ],
            -1
            /* CACHED */
          )
        ])]),
        _: 1
        /* STABLE */
      }, 8, ["label", "outlined"])) : x("v-if", !0);
    };
  }
}), H = (e, d) => {
  const n = e.__vccOpts || e;
  for (const [y, r] of d)
    n[y] = r;
  return n;
}, be = /* @__PURE__ */ H(ze, [["__scopeId", "data-v-f1ad3225"]]), xe = { class: "customize-chat-panel" }, Ce = { class: "shorthand-picker" }, Re = { class: "action-grid" }, $e = ["data-action-id", "disabled", "onClick"], Ie = { key: 0 }, Se = {
  key: 0,
  class: "chat-log",
  "aria-live": "polite"
}, we = { class: "chat-role" }, Ae = { class: "chat-composer" }, Be = ["disabled"], Te = {
  key: 3,
  class: "loading-state"
}, Ve = /* @__PURE__ */ Z({
  __name: "CustomizeChatPanel",
  props: {
    recipe: {},
    active: { type: Boolean }
  },
  emits: ["customized", "openSettings"],
  setup(e, { expose: d, emit: n }) {
    const y = e, r = n, u = J(), k = B([]), _ = B(""), R = B(""), A = B(null), I = B([]), v = B(!1), o = B(""), f = B(!1);
    async function b() {
      o.value = "";
      try {
        k.value = await u.api.get("/api/x/core-customize-recipe/actions");
      } catch (m) {
        o.value = (m == null ? void 0 : m.message) || "Failed to load actions";
      }
    }
    pe(
      () => y.active,
      (m) => {
        m !== !1 && !k.value.length && b();
      },
      { immediate: !0 }
    );
    async function c(m) {
      var $;
      _.value = m.id, R.value = m.prompt || m.title || "", await ke(), ($ = A.value) == null || $.focus();
    }
    async function t() {
      const m = R.value.trim();
      if (!m || v.value) return;
      v.value = !0, o.value = "", f.value = !1;
      const $ = k.value.find((g) => g.id === _.value), O = $ && ($.prompt === m || $.title === m) ? $.id : _.value || "custom", N = [...I.value];
      try {
        const g = {
          action_id: O,
          custom_prompt: m,
          messages: N,
          recipe: y.recipe
        }, C = await u.api.post("/api/x/core-customize-recipe/customize", g);
        I.value.push({ role: "user", content: m }), C != null && C.adaptation_summary && I.value.push({ role: "assistant", content: C.adaptation_summary }), R.value = "", _.value = "", r("customized", C);
      } catch (g) {
        (g == null ? void 0 : g.code) === "unavailable" || (g == null ? void 0 : g.status) === 503 ? f.value = !0 : o.value = (g == null ? void 0 : g.message) || "Customization failed";
      } finally {
        v.value = !1;
      }
    }
    function l(m) {
      m.key === "Enter" && !m.shiftKey && (m.preventDefault(), t());
    }
    function z() {
      I.value = [], R.value = "", _.value = "", o.value = "", f.value = !1;
    }
    return d({ clearHistory: z, selectShorthand: c, sendPrompt: t }), (m, $) => {
      const O = V("Button"), N = V("Message"), g = V("ProgressSpinner");
      return i(), s("div", xe, [
        a("div", Ce, [
          $[2] || ($[2] = a(
            "label",
            { class: "shorthand-label" },
            "Quick Shorthands",
            -1
            /* CACHED */
          )),
          a("div", Re, [
            (i(!0), s(
              w,
              null,
              E(k.value, (C) => (i(), s("button", {
                key: C.id,
                type: "button",
                class: W(["action-chip", { active: _.value === C.id }]),
                "data-action-id": C.id,
                disabled: v.value,
                onClick: (T) => c(C)
              }, [
                a(
                  "strong",
                  null,
                  h(C.title),
                  1
                  /* TEXT */
                ),
                C.description ? (i(), s(
                  "small",
                  Ie,
                  h(C.description),
                  1
                  /* TEXT */
                )) : x("v-if", !0)
              ], 10, $e))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ]),
        I.value.length ? (i(), s("div", Se, [
          (i(!0), s(
            w,
            null,
            E(I.value, (C, T) => (i(), s(
              "div",
              {
                key: T,
                class: W(["chat-bubble", `chat-bubble-${C.role}`])
              },
              [
                a(
                  "span",
                  we,
                  h(C.role === "user" ? "You" : "Chef AI"),
                  1
                  /* TEXT */
                ),
                a(
                  "p",
                  null,
                  h(C.content),
                  1
                  /* TEXT */
                )
              ],
              2
              /* CLASS */
            ))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])) : x("v-if", !0),
        a("div", Ae, [
          he(a("textarea", {
            ref_key: "chatInputEl",
            ref: A,
            "onUpdate:modelValue": $[0] || ($[0] = (C) => R.value = C),
            class: "chat-input",
            rows: "2",
            placeholder: "Describe how to customize this recipe, or click a shorthand above…",
            disabled: v.value,
            onKeydown: l
          }, null, 40, Be), [
            [ye, R.value]
          ]),
          S(O, {
            label: "Customize",
            icon: "pi pi-send",
            class: "btn-send-customize",
            loading: v.value,
            disabled: v.value || !R.value.trim(),
            onClick: t
          }, null, 8, ["loading", "disabled"])
        ]),
        f.value ? (i(), q(N, {
          key: 1,
          severity: "warn"
        }, {
          default: D(() => [
            $[3] || ($[3] = P(
              " AI isn’t set up yet. ",
              -1
              /* CACHED */
            )),
            S(O, {
              label: "Open AI settings",
              severity: "secondary",
              size: "small",
              onClick: $[1] || ($[1] = (C) => r("openSettings"))
            })
          ]),
          _: 1
          /* STABLE */
        })) : o.value ? (i(), q(N, {
          key: 2,
          severity: "error"
        }, {
          default: D(() => [
            P(
              h(o.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        v.value ? (i(), s("div", Te, [
          S(g, { style: { width: "2rem", height: "2rem" } }),
          $[4] || ($[4] = a(
            "p",
            null,
            "Customizing recipe…",
            -1
            /* CACHED */
          ))
        ])) : x("v-if", !0)
      ]);
    };
  }
}), ve = /* @__PURE__ */ H(Ve, [["__scopeId", "data-v-fb9e37b0"]]);
function Q(e) {
  return (e || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function G(e, d = 1) {
  if (!e) return "";
  const n = [];
  if (e.quantity != null && e.quantity !== "") {
    const y = Number(e.quantity) * d, r = Number.isInteger(y) ? String(y) : Number(y.toFixed(1)).toString();
    if (e.quantity_max != null && e.quantity_max !== "") {
      const u = Number(e.quantity_max) * d, k = Number.isInteger(u) ? String(u) : Number(u.toFixed(1)).toString();
      n.push(`${r}-${k}`);
    } else
      n.push(r);
  }
  return e.unit && n.push(String(e.unit).trim()), n.join(" ");
}
function Y(e, d = 1) {
  if (!e) return "";
  const n = G(e, d), y = (e.name || "").trim(), r = [n, y].filter(Boolean).join(" "), u = (e.notes || "").trim();
  return u ? `${r} (${u})` : r;
}
function X(e, d) {
  const n = (e ?? "").trim(), y = (d ?? "").trim();
  if (n === y)
    return y ? [{ type: "same", text: y }] : [];
  if (!n)
    return [{ type: "added", text: y }];
  if (!y)
    return [{ type: "removed", text: n }];
  const r = n.split(/\s+/), u = y.split(/\s+/), k = r.length, _ = u.length, R = Array.from({ length: k + 1 }, () => Array(_ + 1).fill(0));
  for (let f = k - 1; f >= 0; f--)
    for (let b = _ - 1; b >= 0; b--)
      r[f] === u[b] ? R[f][b] = 1 + R[f + 1][b + 1] : R[f][b] = Math.max(R[f + 1][b], R[f][b + 1]);
  const A = [];
  let I = 0, v = 0;
  for (; I < k && v < _; )
    r[I] === u[v] ? (A.push({ type: "same", word: r[I] }), I++, v++) : R[I + 1][v] >= R[I][v + 1] ? (A.push({ type: "removed", word: r[I] }), I++) : (A.push({ type: "added", word: u[v] }), v++);
  for (; I < k; )
    A.push({ type: "removed", word: r[I++] });
  for (; v < _; )
    A.push({ type: "added", word: u[v++] });
  const o = [];
  for (const f of A) {
    const b = o[o.length - 1];
    b && b.type === f.type ? b.text += ` ${f.word}` : o.push({ type: f.type, text: f.word });
  }
  return o;
}
function Oe(e = [], d = []) {
  var f, b, c;
  const n = /* @__PURE__ */ new Set(), y = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Map();
  let u = -1;
  for (let t = 0; t < d.length; t++) {
    const l = Q((f = d[t]) == null ? void 0 : f.name);
    if (!l) continue;
    let z = -1;
    for (let m = u + 1; m < e.length; m++)
      if (!n.has(m) && Q((b = e[m]) == null ? void 0 : b.name) === l) {
        z = m;
        break;
      }
    if (z === -1) {
      for (let m = 0; m < e.length; m++)
        if (!n.has(m) && Q((c = e[m]) == null ? void 0 : c.name) === l) {
          z = m;
          break;
        }
    }
    z !== -1 && (n.add(z), y.add(t), r.set(t, z), z > u && (u = z));
  }
  const k = [];
  let _ = -1;
  for (let t = 0; t < d.length; t++) {
    const l = r.get(t);
    l !== void 0 && l > _ && (k.push({ oIdx: l, cIdx: t }), _ = l);
  }
  const R = [];
  function A(t, l) {
    const z = Number((t == null ? void 0 : t.quantity) ?? 0) !== Number((l == null ? void 0 : l.quantity) ?? 0) || Number((t == null ? void 0 : t.quantity_max) ?? 0) !== Number((l == null ? void 0 : l.quantity_max) ?? 0) || ((t == null ? void 0 : t.unit) || "") !== ((l == null ? void 0 : l.unit) || ""), m = ((t == null ? void 0 : t.notes) || "").trim() !== ((l == null ? void 0 : l.notes) || "").trim();
    return z || m ? {
      kind: "modified",
      original: t,
      customized: l,
      qtyUnitChanged: z,
      notesChanged: m
    } : {
      kind: "unchanged",
      original: t,
      customized: l
    };
  }
  e.length - k.length, d.length - k.length;
  function I(t, l, z, m) {
    const $ = [];
    for (let g = t; g < l; g++) $.push(g);
    const O = [];
    for (let g = z; g < m; g++) O.push(g);
    const N = Math.min($.length, O.length);
    for (let g = 0; g < N; g++) {
      const C = e[$[g]], T = d[O[g]];
      Q(C == null ? void 0 : C.name) === Q(T == null ? void 0 : T.name) ? R.push(A(C, T)) : R.push({
        kind: "substituted",
        original: C,
        customized: T
      });
    }
    for (let g = N; g < $.length; g++)
      R.push({
        kind: "removed",
        original: e[$[g]]
      });
    for (let g = N; g < O.length; g++)
      R.push({
        kind: "added",
        customized: d[O[g]]
      });
  }
  let v = 0, o = 0;
  for (const t of k)
    I(v, t.oIdx, o, t.cIdx), R.push(A(e[t.oIdx], d[t.cIdx])), v = t.oIdx + 1, o = t.cIdx + 1;
  return I(v, e.length, o, d.length), R;
}
const Me = { class: "customized-recipe-preview" }, Ne = {
  key: 0,
  class: "adaptation-summary"
}, Pe = { class: "preview-header" }, Ue = { class: "preview-title" }, De = {
  key: 0,
  class: "diff-removed"
}, qe = {
  key: 1,
  class: "diff-added"
}, Fe = { key: 2 }, je = {
  key: 0,
  class: "preview-description"
}, Ee = {
  key: 0,
  class: "diff-removed"
}, Ze = {
  key: 1,
  class: "diff-added"
}, He = { key: 2 }, Ge = { class: "meta-badges" }, Ke = { class: "meta-badge" }, Qe = { class: "diff-removed" }, We = { class: "diff-added" }, Ye = { key: 1 }, Je = {
  key: 0,
  class: "meta-badge"
}, Xe = {
  key: 0,
  class: "diff-removed"
}, Le = {
  key: 1,
  class: "diff-added"
}, et = { key: 1 }, tt = {
  key: 1,
  class: "meta-badge"
}, it = {
  key: 0,
  class: "diff-removed"
}, nt = {
  key: 1,
  class: "diff-added"
}, st = { key: 1 }, ot = { class: "content-grid" }, at = { class: "ingredients-section" }, lt = { class: "ingredient-checklist" }, ct = ["for"], ut = {
  key: 0,
  class: "notes"
}, dt = {
  key: 0,
  class: "diff-removed"
}, rt = {
  key: 1,
  class: "diff-added"
}, mt = { key: 1 }, pt = {
  key: 0,
  class: "diff-removed"
}, vt = {
  key: 1,
  class: "diff-added"
}, ft = {
  key: 3,
  class: "notes"
}, gt = { class: "diff-removed" }, ht = { class: "diff-added" }, yt = {
  key: 3,
  class: "diff-removed"
}, kt = {
  key: 4,
  class: "diff-added"
}, _t = { class: "steps-section" }, zt = { class: "steps-list" }, bt = {
  key: 0,
  class: "diff-removed"
}, xt = {
  key: 1,
  class: "diff-added"
}, Ct = { key: 2 }, Rt = {
  key: 0,
  class: "step-timers"
}, $t = {
  key: 0,
  class: "diff-removed"
}, It = {
  key: 1,
  class: "diff-added"
}, St = /* @__PURE__ */ Z({
  __name: "CustomizedRecipePreview",
  props: {
    originalRecipe: {},
    customizedRecipe: {},
    currentServings: {},
    interactiveCheckboxes: { type: Boolean },
    checkedIngredients: {}
  },
  emits: ["update:checkedIngredients"],
  setup(e, { emit: d }) {
    const n = e, y = d, r = F(() => {
      var v;
      return n.currentServings ? n.currentServings / (((v = n.originalRecipe) == null ? void 0 : v.servings) || 1) : 1;
    }), u = F(() => {
      var v;
      return n.currentServings ? n.currentServings / (((v = n.customizedRecipe) == null ? void 0 : v.servings) || 1) : 1;
    }), k = F(
      () => {
        var v, o;
        return X(((v = n.originalRecipe) == null ? void 0 : v.title) || "", ((o = n.customizedRecipe) == null ? void 0 : o.title) || "");
      }
    ), _ = F(
      () => {
        var v, o;
        return X(((v = n.originalRecipe) == null ? void 0 : v.description) || "", ((o = n.customizedRecipe) == null ? void 0 : o.description) || "");
      }
    ), R = F(
      () => {
        var v, o;
        return Oe(
          ((v = n.originalRecipe) == null ? void 0 : v.ingredients) || [],
          ((o = n.customizedRecipe) == null ? void 0 : o.ingredients) || []
        );
      }
    ), A = F(() => {
      var c, t;
      const v = ((c = n.originalRecipe) == null ? void 0 : c.steps) || [], o = ((t = n.customizedRecipe) == null ? void 0 : t.steps) || [], f = Math.max(v.length, o.length), b = [];
      for (let l = 0; l < f; l++) {
        const z = v[l], m = o[l];
        z && m ? b.push({
          kind: "normal",
          segments: X(z.instruction || "", m.instruction || ""),
          origTimer: z.timer_minutes ?? null,
          custTimer: m.timer_minutes ?? null
        }) : z && !m ? b.push({
          kind: "removed",
          segments: [{ type: "removed", text: z.instruction || "" }],
          origTimer: z.timer_minutes ?? null,
          custTimer: null
        }) : !z && m && b.push({
          kind: "added",
          segments: [{ type: "added", text: m.instruction || "" }],
          origTimer: null,
          custTimer: m.timer_minutes ?? null
        });
      }
      return b;
    });
    function I(v, o) {
      const f = { ...n.checkedIngredients || {}, [v]: o };
      y("update:checkedIngredients", f);
    }
    return (v, o) => {
      var c, t, l, z, m, $, O, N, g, C, T, L, ee, te, ie, ne, se, oe, ae;
      const f = V("Checkbox"), b = V("Tag");
      return i(), s("div", Me, [
        (c = e.customizedRecipe) != null && c.adaptation_summary ? (i(), s("div", Ne, [
          o[1] || (o[1] = a(
            "i",
            {
              class: "pi pi-sparkles",
              "aria-hidden": "true"
            },
            null,
            -1
            /* CACHED */
          )),
          a("div", null, [
            o[0] || (o[0] = a(
              "strong",
              null,
              "Customization Summary:",
              -1
              /* CACHED */
            )),
            a(
              "p",
              null,
              h(e.customizedRecipe.adaptation_summary),
              1
              /* TEXT */
            )
          ])
        ])) : x("v-if", !0),
        a("div", Pe, [
          a("h2", Ue, [
            (i(!0), s(
              w,
              null,
              E(k.value, (p, M) => (i(), s(
                w,
                { key: M },
                [
                  p.type === "removed" ? (i(), s(
                    "s",
                    De,
                    h(p.text),
                    1
                    /* TEXT */
                  )) : p.type === "added" ? (i(), s(
                    "span",
                    qe,
                    h(p.text),
                    1
                    /* TEXT */
                  )) : (i(), s(
                    "span",
                    Fe,
                    h(p.text),
                    1
                    /* TEXT */
                  )),
                  M < k.value.length - 1 ? (i(), s(
                    w,
                    { key: 3 },
                    [
                      P(h(" "))
                    ],
                    64
                    /* STABLE_FRAGMENT */
                  )) : x("v-if", !0)
                ],
                64
                /* STABLE_FRAGMENT */
              ))),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          _.value.length ? (i(), s("p", je, [
            (i(!0), s(
              w,
              null,
              E(_.value, (p, M) => (i(), s(
                w,
                { key: M },
                [
                  p.type === "removed" ? (i(), s(
                    "s",
                    Ee,
                    h(p.text),
                    1
                    /* TEXT */
                  )) : p.type === "added" ? (i(), s(
                    "span",
                    Ze,
                    h(p.text),
                    1
                    /* TEXT */
                  )) : (i(), s(
                    "span",
                    He,
                    h(p.text),
                    1
                    /* TEXT */
                  )),
                  M < _.value.length - 1 ? (i(), s(
                    w,
                    { key: 3 },
                    [
                      P(h(" "))
                    ],
                    64
                    /* STABLE_FRAGMENT */
                  )) : x("v-if", !0)
                ],
                64
                /* STABLE_FRAGMENT */
              ))),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : x("v-if", !0),
          a("div", Ge, [
            a("span", Ke, [
              o[2] || (o[2] = a(
                "strong",
                null,
                "Servings:",
                -1
                /* CACHED */
              )),
              ((t = e.originalRecipe) == null ? void 0 : t.servings) != null && ((l = e.customizedRecipe) == null ? void 0 : l.servings) != null && e.originalRecipe.servings !== e.customizedRecipe.servings ? (i(), s(
                w,
                { key: 0 },
                [
                  a(
                    "s",
                    Qe,
                    h(e.originalRecipe.servings),
                    1
                    /* TEXT */
                  ),
                  a(
                    "span",
                    We,
                    h(e.customizedRecipe.servings),
                    1
                    /* TEXT */
                  )
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (i(), s(
                "span",
                Ye,
                h(((z = e.customizedRecipe) == null ? void 0 : z.servings) ?? ((m = e.originalRecipe) == null ? void 0 : m.servings) ?? 2),
                1
                /* TEXT */
              ))
            ]),
            (($ = e.originalRecipe) == null ? void 0 : $.prep_time_minutes) != null || ((O = e.customizedRecipe) == null ? void 0 : O.prep_time_minutes) != null ? (i(), s("span", Je, [
              o[3] || (o[3] = a(
                "strong",
                null,
                "Prep:",
                -1
                /* CACHED */
              )),
              ((N = e.originalRecipe) == null ? void 0 : N.prep_time_minutes) !== ((g = e.customizedRecipe) == null ? void 0 : g.prep_time_minutes) ? (i(), s(
                w,
                { key: 0 },
                [
                  ((C = e.originalRecipe) == null ? void 0 : C.prep_time_minutes) != null ? (i(), s(
                    "s",
                    Xe,
                    h(e.originalRecipe.prep_time_minutes) + " min",
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  ((T = e.customizedRecipe) == null ? void 0 : T.prep_time_minutes) != null ? (i(), s(
                    "span",
                    Le,
                    h(e.customizedRecipe.prep_time_minutes) + " min",
                    1
                    /* TEXT */
                  )) : x("v-if", !0)
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (i(), s(
                "span",
                et,
                h((L = e.customizedRecipe) == null ? void 0 : L.prep_time_minutes) + " min",
                1
                /* TEXT */
              ))
            ])) : x("v-if", !0),
            ((ee = e.originalRecipe) == null ? void 0 : ee.cook_time_minutes) != null || ((te = e.customizedRecipe) == null ? void 0 : te.cook_time_minutes) != null ? (i(), s("span", tt, [
              o[4] || (o[4] = a(
                "strong",
                null,
                "Cook:",
                -1
                /* CACHED */
              )),
              ((ie = e.originalRecipe) == null ? void 0 : ie.cook_time_minutes) !== ((ne = e.customizedRecipe) == null ? void 0 : ne.cook_time_minutes) ? (i(), s(
                w,
                { key: 0 },
                [
                  ((se = e.originalRecipe) == null ? void 0 : se.cook_time_minutes) != null ? (i(), s(
                    "s",
                    it,
                    h(e.originalRecipe.cook_time_minutes) + " min",
                    1
                    /* TEXT */
                  )) : x("v-if", !0),
                  ((oe = e.customizedRecipe) == null ? void 0 : oe.cook_time_minutes) != null ? (i(), s(
                    "span",
                    nt,
                    h(e.customizedRecipe.cook_time_minutes) + " min",
                    1
                    /* TEXT */
                  )) : x("v-if", !0)
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (i(), s(
                "span",
                st,
                h((ae = e.customizedRecipe) == null ? void 0 : ae.cook_time_minutes) + " min",
                1
                /* TEXT */
              ))
            ])) : x("v-if", !0)
          ])
        ]),
        a("div", ot, [
          a("section", at, [
            o[6] || (o[6] = a(
              "h3",
              null,
              "Ingredients",
              -1
              /* CACHED */
            )),
            a("ul", lt, [
              (i(!0), s(
                w,
                null,
                E(R.value, (p, M) => {
                  var j, K, le, ce, ue, de, re, me;
                  return i(), s(
                    "li",
                    {
                      key: M,
                      class: W(["ingredient-item", `ingredient-row-${p.kind}`])
                    },
                    [
                      e.interactiveCheckboxes ? (i(), q(f, {
                        key: 0,
                        inputId: `cust-ingredient-${M}`,
                        modelValue: !!((j = e.checkedIngredients) != null && j[M]),
                        disabled: p.kind === "removed",
                        binary: "",
                        "onUpdate:modelValue": (ge) => I(M, ge)
                      }, null, 8, ["inputId", "modelValue", "disabled", "onUpdate:modelValue"])) : x("v-if", !0),
                      a("label", {
                        for: e.interactiveCheckboxes ? `cust-ingredient-${M}` : void 0,
                        class: W({ struck: e.interactiveCheckboxes && ((K = e.checkedIngredients) == null ? void 0 : K[M]) })
                      }, [
                        p.kind === "unchanged" ? (i(), s(
                          w,
                          { key: 0 },
                          [
                            a(
                              "strong",
                              null,
                              h(U(G)(p.customized, u.value)),
                              1
                              /* TEXT */
                            ),
                            P(
                              " " + h((le = p.customized) == null ? void 0 : le.name) + " ",
                              1
                              /* TEXT */
                            ),
                            (ce = p.customized) != null && ce.notes ? (i(), s(
                              "span",
                              ut,
                              " (" + h(p.customized.notes) + ")",
                              1
                              /* TEXT */
                            )) : x("v-if", !0)
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : p.kind === "modified" ? (i(), s(
                          w,
                          { key: 1 },
                          [
                            p.qtyUnitChanged ? (i(), s(
                              w,
                              { key: 0 },
                              [
                                U(G)(p.original, r.value) ? (i(), s(
                                  "s",
                                  dt,
                                  h(U(G)(p.original, r.value)),
                                  1
                                  /* TEXT */
                                )) : x("v-if", !0),
                                U(G)(p.customized, u.value) ? (i(), s(
                                  "span",
                                  rt,
                                  h(U(G)(p.customized, u.value)),
                                  1
                                  /* TEXT */
                                )) : x("v-if", !0)
                              ],
                              64
                              /* STABLE_FRAGMENT */
                            )) : (i(), s(
                              "strong",
                              mt,
                              h(U(G)(p.customized, u.value)),
                              1
                              /* TEXT */
                            )),
                            P(
                              " " + h(" ") + h((ue = p.customized) == null ? void 0 : ue.name) + " ",
                              1
                              /* TEXT */
                            ),
                            p.notesChanged ? (i(), s(
                              w,
                              { key: 2 },
                              [
                                (de = p.original) != null && de.notes ? (i(), s(
                                  "s",
                                  pt,
                                  " (" + h(p.original.notes) + ")",
                                  1
                                  /* TEXT */
                                )) : x("v-if", !0),
                                (re = p.customized) != null && re.notes ? (i(), s(
                                  "span",
                                  vt,
                                  " (" + h(p.customized.notes) + ")",
                                  1
                                  /* TEXT */
                                )) : x("v-if", !0)
                              ],
                              64
                              /* STABLE_FRAGMENT */
                            )) : (me = p.customized) != null && me.notes ? (i(), s(
                              "span",
                              ft,
                              " (" + h(p.customized.notes) + ")",
                              1
                              /* TEXT */
                            )) : x("v-if", !0)
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : p.kind === "substituted" ? (i(), s(
                          w,
                          { key: 2 },
                          [
                            a(
                              "s",
                              gt,
                              h(U(Y)(p.original, r.value)),
                              1
                              /* TEXT */
                            ),
                            o[5] || (o[5] = P(
                              " " + h(" ") + " ",
                              -1
                              /* CACHED */
                            )),
                            a(
                              "span",
                              ht,
                              h(U(Y)(p.customized, u.value)),
                              1
                              /* TEXT */
                            )
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        )) : p.kind === "removed" ? (i(), s(
                          "s",
                          yt,
                          h(U(Y)(p.original, r.value)),
                          1
                          /* TEXT */
                        )) : p.kind === "added" ? (i(), s(
                          "span",
                          kt,
                          h(U(Y)(p.customized, u.value)),
                          1
                          /* TEXT */
                        )) : x("v-if", !0)
                      ], 10, ct)
                    ],
                    2
                    /* CLASS */
                  );
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ]),
          a("section", _t, [
            o[7] || (o[7] = a(
              "h3",
              null,
              "Instructions",
              -1
              /* CACHED */
            )),
            a("ol", zt, [
              (i(!0), s(
                w,
                null,
                E(A.value, (p, M) => (i(), s(
                  "li",
                  {
                    key: M,
                    class: W(`step-row-${p.kind}`)
                  },
                  [
                    a("p", null, [
                      (i(!0), s(
                        w,
                        null,
                        E(p.segments, (j, K) => (i(), s(
                          w,
                          { key: K },
                          [
                            j.type === "removed" ? (i(), s(
                              "s",
                              bt,
                              h(j.text),
                              1
                              /* TEXT */
                            )) : j.type === "added" ? (i(), s(
                              "span",
                              xt,
                              h(j.text),
                              1
                              /* TEXT */
                            )) : (i(), s(
                              "span",
                              Ct,
                              h(j.text),
                              1
                              /* TEXT */
                            )),
                            K < p.segments.length - 1 ? (i(), s(
                              w,
                              { key: 3 },
                              [
                                P(h(" "))
                              ],
                              64
                              /* STABLE_FRAGMENT */
                            )) : x("v-if", !0)
                          ],
                          64
                          /* STABLE_FRAGMENT */
                        ))),
                        128
                        /* KEYED_FRAGMENT */
                      ))
                    ]),
                    p.origTimer != null || p.custTimer != null ? (i(), s("div", Rt, [
                      p.origTimer !== p.custTimer ? (i(), s(
                        w,
                        { key: 0 },
                        [
                          p.origTimer != null ? (i(), s(
                            "s",
                            $t,
                            h(p.origTimer) + " min",
                            1
                            /* TEXT */
                          )) : x("v-if", !0),
                          p.custTimer != null ? (i(), s(
                            "span",
                            It,
                            h(p.custTimer) + " min",
                            1
                            /* TEXT */
                          )) : x("v-if", !0)
                        ],
                        64
                        /* STABLE_FRAGMENT */
                      )) : p.custTimer ? (i(), q(b, {
                        key: 1,
                        value: `${p.custTimer} min`,
                        icon: "pi pi-clock",
                        severity: "info"
                      }, null, 8, ["value"])) : x("v-if", !0)
                    ])) : x("v-if", !0)
                  ],
                  2
                  /* CLASS */
                ))),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ])
      ]);
    };
  }
}), fe = /* @__PURE__ */ H(St, [["__scopeId", "data-v-81614d15"]]), wt = {
  key: 0,
  class: "customize-detail-panel"
}, At = {
  key: 0,
  class: "chat-drawer-card"
}, Bt = { class: "chat-drawer-header" }, Tt = { class: "customized-version-bar" }, Vt = { class: "version-actions" }, Ot = /* @__PURE__ */ Z({
  __name: "CustomizeDetailPanel",
  props: {
    context: {}
  },
  setup(e) {
    const d = e, n = J(), y = B(!1), r = B(""), u = B(null), k = F(() => {
      var o, f;
      return ((o = d.context) == null ? void 0 : o.customizedRecipe) || ((f = d.context) == null ? void 0 : f.recipe);
    });
    function _(o) {
      r.value = "", d.context.applyCustomization(o);
    }
    function R() {
      var o;
      r.value = "", (o = u.value) == null || o.clearHistory(), d.context.resetCustomization();
    }
    function A() {
      var o;
      d.context.setCustomizeOpen(!1), (o = n.navigate) == null || o.call(n, "/settings?section=core-ai-provider");
    }
    async function I() {
      var o, f, b, c;
      if (!(!((o = d.context) != null && o.customizedRecipe) || !((b = (f = d.context) == null ? void 0 : f.recipe) != null && b.id) || y.value)) {
        y.value = !0, r.value = "";
        try {
          const t = await n.api.post("/api/x/core-customize-recipe/save", {
            recipe_id: d.context.recipe.id,
            revision: d.context.recipe.revision,
            recipe: {
              ...d.context.customizedRecipe,
              language: d.context.recipe.language || "en"
            }
          });
          n.notify({ level: "success", message: "Recipe updated with customization" }), (c = u.value) == null || c.clearHistory(), d.context.onRecipeUpdated(t);
        } catch (t) {
          r.value = (t == null ? void 0 : t.message) || "Failed to update recipe";
        } finally {
          y.value = !1;
        }
      }
    }
    async function v() {
      var o, f, b, c;
      if (!(!((o = d.context) != null && o.customizedRecipe) || y.value)) {
        y.value = !0, r.value = "";
        try {
          const t = await n.api.post("/api/x/core-customize-recipe/save", {
            recipe: {
              ...d.context.customizedRecipe,
              language: ((f = d.context.recipe) == null ? void 0 : f.language) || "en"
            }
          });
          n.notify({ level: "success", message: "Saved as new recipe variation" }), (b = u.value) == null || b.clearHistory(), d.context.resetCustomization(), d.context.setCustomizeOpen(!1), (c = n.navigate) == null || c.call(n, `/recipes/${t.id}`);
        } catch (t) {
          r.value = (t == null ? void 0 : t.message) || "Failed to save new recipe";
        } finally {
          y.value = !1;
        }
      }
    }
    return (o, f) => {
      var t, l;
      const b = V("Button"), c = V("Message");
      return (t = e.context) != null && t.customizeOpen || (l = e.context) != null && l.customizedRecipe ? (i(), s("div", wt, [
        e.context.customizeOpen ? (i(), s("div", At, [
          a("div", Bt, [
            f[2] || (f[2] = a(
              "span",
              null,
              "Customize Recipe",
              -1
              /* CACHED */
            )),
            S(b, {
              icon: "pi pi-times",
              text: "",
              rounded: "",
              size: "small",
              "aria-label": "Close customize panel",
              onClick: f[0] || (f[0] = (z) => e.context.setCustomizeOpen(!1))
            })
          ]),
          S(ve, {
            ref_key: "chatRef",
            ref: u,
            recipe: k.value,
            active: e.context.customizeOpen,
            onCustomized: _,
            onOpenSettings: A
          }, null, 8, ["recipe", "active"])
        ])) : x("v-if", !0),
        r.value ? (i(), q(c, {
          key: 1,
          severity: "error"
        }, {
          default: D(() => [
            P(
              h(r.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        e.context.customizedRecipe ? (i(), s(
          w,
          { key: 2 },
          [
            a("div", Tt, [
              f[3] || (f[3] = a(
                "span",
                { class: "version-badge" },
                "Viewing customized version (changes highlighted)",
                -1
                /* CACHED */
              )),
              a("div", Vt, [
                S(b, {
                  label: "Reset to Original",
                  icon: "pi pi-undo",
                  severity: "secondary",
                  size: "small",
                  outlined: "",
                  class: "btn-reset-customization",
                  disabled: y.value,
                  onClick: R
                }, null, 8, ["disabled"]),
                S(b, {
                  label: "Save as New Recipe",
                  icon: "pi pi-copy",
                  size: "small",
                  outlined: "",
                  class: "btn-save-fork",
                  loading: y.value,
                  onClick: v
                }, null, 8, ["loading"]),
                S(b, {
                  label: "Update Recipe",
                  icon: "pi pi-check",
                  size: "small",
                  class: "btn-update-recipe",
                  loading: y.value,
                  onClick: I
                }, null, 8, ["loading"])
              ])
            ]),
            S(fe, {
              originalRecipe: e.context.recipe,
              customizedRecipe: e.context.customizedRecipe,
              currentServings: e.context.currentServings,
              interactiveCheckboxes: !0,
              checkedIngredients: e.context.checkedIngredients,
              "onUpdate:checkedIngredients": f[1] || (f[1] = (z) => {
                var m, $;
                return ($ = (m = e.context).setCheckedIngredients) == null ? void 0 : $.call(m, z);
              })
            }, null, 8, ["originalRecipe", "customizedRecipe", "currentServings", "checkedIngredients"])
          ],
          64
          /* STABLE_FRAGMENT */
        )) : x("v-if", !0)
      ])) : x("v-if", !0);
    };
  }
}), Mt = /* @__PURE__ */ H(Ot, [["__scopeId", "data-v-1fb6a609"]]), Nt = { class: "dialog-content" }, Pt = { class: "dialog-actions" }, Ut = {
  key: 0,
  class: "commit-actions"
}, Dt = /* @__PURE__ */ Z({
  inheritAttrs: !1,
  __name: "CustomizeRecipeDialog",
  props: {
    visible: { type: Boolean },
    context: {}
  },
  emits: ["update:visible", "resolved"],
  setup(e, { emit: d }) {
    const n = e, y = d, r = J(), u = B(null), k = B(!1), _ = B(""), R = B(null), A = F(() => {
      var c;
      return u.value || ((c = n.context) == null ? void 0 : c.recipe);
    });
    pe(
      () => n.visible,
      (c) => {
        var t;
        c && (_.value = "", u.value = null, (t = R.value) == null || t.clearHistory());
      }
    );
    function I(c) {
      u.value = c;
    }
    function v() {
      var c;
      o(), (c = r.navigate) == null || c.call(r, "/settings?section=core-ai-provider");
    }
    function o() {
      y("update:visible", !1);
    }
    function f() {
      u.value && (n.context.applyAdaptation(u.value), r.notify({ level: "success", message: "Recipe customized" }), y("resolved", u.value), o());
    }
    async function b() {
      var c, t;
      if (!(!u.value || k.value)) {
        k.value = !0, _.value = "";
        try {
          const l = await r.api.post("/api/x/core-customize-recipe/save", {
            recipe: {
              ...u.value,
              language: ((c = n.context.recipe) == null ? void 0 : c.language) || "en"
            }
          });
          r.notify({ level: "success", message: "Saved as new recipe variation" }), y("resolved", l), o(), (t = r.navigate) == null || t.call(r, `/recipes/${l.id}`);
        } catch (l) {
          _.value = (l == null ? void 0 : l.message) || "Failed to save new recipe";
        } finally {
          k.value = !1;
        }
      }
    }
    return (c, t) => {
      const l = V("Message"), z = V("Button"), m = V("Dialog");
      return i(), q(m, {
        visible: n.visible,
        modal: "",
        "append-to": "self",
        class: "customize-recipe-dialog",
        style: { width: "min(56rem, 95vw)" },
        "onUpdate:visible": t[0] || (t[0] = ($) => y("update:visible", $))
      }, {
        header: D(() => [...t[1] || (t[1] = [
          a(
            "div",
            { class: "dialog-header" },
            [
              a("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "wand-icon",
                "aria-hidden": "true"
              }, [
                a("path", { d: "m19 2 2 2-2 2-2-2Z" }),
                a("path", { d: "m5 17 2 2-2 2-2-2Z" }),
                a("path", { d: "m15 4 5 5L7 22l-5-5Z" })
              ]),
              a("span", null, "Customize Recipe")
            ],
            -1
            /* CACHED */
          )
        ])]),
        footer: D(() => [
          a("div", Pt, [
            S(z, {
              label: "Cancel",
              severity: "secondary",
              disabled: k.value,
              onClick: o
            }, null, 8, ["disabled"]),
            u.value ? (i(), s("div", Ut, [
              S(z, {
                label: "Save as New Recipe",
                icon: "pi pi-copy",
                class: "btn-save-fork",
                outlined: "",
                loading: k.value,
                onClick: b
              }, null, 8, ["loading"]),
              S(z, {
                label: "Apply to Editor",
                icon: "pi pi-check",
                class: "btn-apply-editor",
                loading: k.value,
                onClick: f
              }, null, 8, ["loading"])
            ])) : x("v-if", !0)
          ])
        ]),
        default: D(() => [
          a("div", Nt, [
            S(ve, {
              ref_key: "chatRef",
              ref: R,
              recipe: A.value,
              active: n.visible,
              onCustomized: I,
              onOpenSettings: v
            }, null, 8, ["recipe", "active"]),
            _.value ? (i(), q(l, {
              key: 0,
              severity: "error"
            }, {
              default: D(() => [
                P(
                  h(_.value),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : x("v-if", !0),
            u.value ? (i(), q(fe, {
              key: 1,
              originalRecipe: n.context.recipe,
              customizedRecipe: u.value
            }, null, 8, ["originalRecipe", "customizedRecipe"])) : x("v-if", !0)
          ])
        ]),
        _: 1
        /* STABLE */
      }, 8, ["visible"]);
    };
  }
}), qt = /* @__PURE__ */ H(Dt, [["__scopeId", "data-v-dabc3076"]]), Ft = { class: "customize-recipe-trigger-container" }, jt = /* @__PURE__ */ Z({
  __name: "CustomizeRecipeButton",
  props: {
    context: {}
  },
  setup(e) {
    const d = e, n = B(!1), y = F(() => {
      var u, k;
      const r = (u = d.context) == null ? void 0 : u.recipe;
      return !!(r && ((k = r.title) != null && k.trim() || r.ingredients && r.ingredients.length > 0));
    });
    return (r, u) => {
      const k = V("Button");
      return i(), s("div", Ft, [
        S(k, {
          label: "Customize Recipe",
          class: "btn-customize-recipe",
          outlined: "",
          disabled: !y.value,
          onClick: u[0] || (u[0] = (_) => n.value = !0)
        }, {
          icon: D(() => [...u[2] || (u[2] = [
            a(
              "svg",
              {
                width: "15",
                height: "15",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                class: "wand-icon",
                "aria-hidden": "true"
              },
              [
                a("path", { d: "m19 2 2 2-2 2-2-2Z" }),
                a("path", { d: "m5 17 2 2-2 2-2-2Z" }),
                a("path", { d: "m15 4 5 5L7 22l-5-5Z" })
              ],
              -1
              /* CACHED */
            )
          ])]),
          _: 1
          /* STABLE */
        }, 8, ["disabled"]),
        S(qt, {
          visible: n.value,
          "onUpdate:visible": u[1] || (u[1] = (_) => n.value = _),
          context: d.context
        }, null, 8, ["visible", "context"])
      ]);
    };
  }
}), Et = /* @__PURE__ */ H(jt, [["__scopeId", "data-v-4c6cb481"]]), Zt = { class: "customize-settings" }, Ht = { class: "settings-header" }, Gt = { class: "header-actions" }, Kt = { class: "model-key-row" }, Qt = {
  key: 1,
  class: "loading-state"
}, Wt = {
  key: 2,
  class: "actions-list"
}, Yt = { class: "card-header" }, Jt = { class: "card-title-group" }, Xt = { class: "index-badge" }, Lt = { class: "card-tools" }, ei = { class: "card-body" }, ti = { class: "form-group" }, ii = { class: "form-group" }, ni = { class: "footer-actions" }, si = /* @__PURE__ */ Z({
  __name: "CustomizeSettings",
  setup(e) {
    const d = J(), n = B([]), y = B("default"), r = B(["default"]), u = B(!1), k = B(!1), _ = B("");
    function R(c) {
      const t = r.value.length ? r.value : ["default"], l = t.map((z) => ({ value: z, label: z }));
      return c && !t.includes(c) && l.unshift({ value: c, label: `${c} (missing — uses default)` }), l;
    }
    async function A() {
      u.value = !0, _.value = "";
      try {
        const [c, t, l] = await Promise.all([
          d.api.get("/api/x/core-customize-recipe/actions"),
          d.api.get("/api/x/core-ai-provider/settings").catch(() => ({ models: { default: "gemini-3.8-flash" } })),
          d.api.get("/api/plugins/core-customize-recipe/config").catch(() => ({ adapt_model_key: "default" }))
        ]);
        n.value = Array.isArray(c) ? c : [];
        const z = t != null && t.models && typeof t.models == "object" ? Object.keys(t.models) : ["default"];
        r.value = z.length ? z : ["default"], y.value = (l == null ? void 0 : l.adapt_model_key) || "default";
      } catch (c) {
        _.value = (c == null ? void 0 : c.message) || "Failed to load actions";
      } finally {
        u.value = !1;
      }
    }
    function I(c, t) {
      const l = c + t;
      if (l < 0 || l >= n.value.length) return;
      const z = n.value.splice(c, 1)[0];
      n.value.splice(l, 0, z);
    }
    function v(c) {
      n.value.splice(c, 1);
    }
    function o() {
      const c = `custom_${Date.now()}`;
      n.value.push({
        id: c,
        title: "New Custom Action",
        description: "Custom recipe customization rule",
        prompt: "Customize this recipe to..."
      });
    }
    async function f() {
      k.value = !0, _.value = "";
      try {
        const [c] = await Promise.all([
          d.api.put("/api/x/core-customize-recipe/actions", n.value),
          d.api.put("/api/plugins/core-customize-recipe/config", {
            actions: n.value,
            adapt_model_key: y.value
          })
        ]);
        Array.isArray(c) && (n.value = c), d.notify({ level: "success", message: "Customization shorthands saved" });
      } catch (c) {
        _.value = (c == null ? void 0 : c.message) || "Failed to save actions";
      } finally {
        k.value = !1;
      }
    }
    async function b() {
      k.value = !0, _.value = "";
      try {
        n.value = await d.api.post("/api/x/core-customize-recipe/actions/reset"), d.notify({ level: "success", message: "Reset shorthands to defaults" });
      } catch (c) {
        _.value = (c == null ? void 0 : c.message) || "Failed to reset actions";
      } finally {
        k.value = !1;
      }
    }
    return _e(() => {
      A();
    }), (c, t) => {
      const l = V("Button"), z = V("Message"), m = V("Select"), $ = V("ProgressSpinner"), O = V("InputText"), N = V("Textarea");
      return i(), s("div", Zt, [
        a("div", Ht, [
          t[1] || (t[1] = a(
            "div",
            null,
            [
              a("h4", { class: "settings-title" }, "Customize Recipe Shorthands & Prompts"),
              a("p", { class: "subtitle" }, "Configure built-in shorthand prompts for unit conversion, ingredient substitution, and culinary transformations.")
            ],
            -1
            /* CACHED */
          )),
          a("div", Gt, [
            S(l, {
              label: "Reset to Defaults",
              icon: "pi pi-refresh",
              severity: "secondary",
              size: "small",
              outlined: "",
              class: "btn-reset-actions",
              disabled: u.value || k.value,
              onClick: b
            }, null, 8, ["disabled"]),
            S(l, {
              label: "Add Action",
              icon: "pi pi-plus",
              size: "small",
              class: "btn-add-action",
              disabled: u.value || k.value,
              onClick: o
            }, null, 8, ["disabled"])
          ])
        ]),
        _.value ? (i(), q(z, {
          key: 0,
          severity: "error"
        }, {
          default: D(() => [
            P(
              h(_.value),
              1
              /* TEXT */
            )
          ]),
          _: 1
          /* STABLE */
        })) : x("v-if", !0),
        a("div", Kt, [
          t[2] || (t[2] = a(
            "label",
            { for: "customize-adapt-model-key" },
            "Recipe customization model key",
            -1
            /* CACHED */
          )),
          S(m, {
            id: "customize-adapt-model-key",
            inputId: "customize-adapt-model-key",
            "aria-label": "Recipe customization model key",
            modelValue: y.value,
            "onUpdate:modelValue": t[0] || (t[0] = (g) => y.value = g),
            options: R(y.value),
            optionLabel: "label",
            optionValue: "value",
            fluid: ""
          }, null, 8, ["modelValue", "options"])
        ]),
        u.value ? (i(), s("div", Qt, [
          S($, { style: { width: "2rem", height: "2rem" } })
        ])) : (i(), s("div", Wt, [
          (i(!0), s(
            w,
            null,
            E(n.value, (g, C) => (i(), s("div", {
              key: g.id,
              class: "action-card"
            }, [
              a("div", Yt, [
                a("div", Jt, [
                  a(
                    "span",
                    Xt,
                    "#" + h(C + 1),
                    1
                    /* TEXT */
                  ),
                  S(O, {
                    modelValue: g.title,
                    "onUpdate:modelValue": (T) => g.title = T,
                    placeholder: "Action Title",
                    class: "title-input",
                    size: "small",
                    fluid: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                a("div", Lt, [
                  S(l, {
                    icon: "pi pi-arrow-up",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-up",
                    "aria-label": "Move up",
                    disabled: C === 0,
                    onClick: (T) => I(C, -1)
                  }, null, 8, ["disabled", "onClick"]),
                  S(l, {
                    icon: "pi pi-arrow-down",
                    text: "",
                    rounded: "",
                    size: "small",
                    class: "btn-move-down",
                    "aria-label": "Move down",
                    disabled: C === n.value.length - 1,
                    onClick: (T) => I(C, 1)
                  }, null, 8, ["disabled", "onClick"]),
                  S(l, {
                    icon: "pi pi-trash",
                    text: "",
                    rounded: "",
                    size: "small",
                    severity: "danger",
                    class: "btn-remove-action",
                    "aria-label": "Remove action",
                    disabled: n.value.length <= 1,
                    onClick: (T) => v(C)
                  }, null, 8, ["disabled", "onClick"])
                ])
              ]),
              a("div", ei, [
                a("div", ti, [
                  t[3] || (t[3] = a(
                    "label",
                    null,
                    "Description",
                    -1
                    /* CACHED */
                  )),
                  S(O, {
                    modelValue: g.description,
                    "onUpdate:modelValue": (T) => g.description = T,
                    placeholder: "Brief explanation shown on card",
                    fluid: "",
                    size: "small"
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ]),
                a("div", ii, [
                  t[4] || (t[4] = a(
                    "label",
                    null,
                    "AI Prompt Instructions",
                    -1
                    /* CACHED */
                  )),
                  S(N, {
                    modelValue: g.prompt,
                    "onUpdate:modelValue": (T) => g.prompt = T,
                    placeholder: "Instruction given to AI...",
                    rows: "3",
                    fluid: "",
                    autoResize: ""
                  }, null, 8, ["modelValue", "onUpdate:modelValue"])
                ])
              ])
            ]))),
            128
            /* KEYED_FRAGMENT */
          ))
        ])),
        a("div", ni, [
          S(l, {
            label: "Save Actions",
            icon: "pi pi-check",
            size: "small",
            class: "btn-save-settings",
            loading: k.value,
            disabled: u.value || !n.value.length,
            onClick: f
          }, null, 8, ["loading", "disabled"])
        ])
      ]);
    };
  }
}), oi = /* @__PURE__ */ H(si, [["__scopeId", "data-v-16a92ea2"]]), ai = {
  key: 0,
  class: "customize-inline-settings"
}, li = /* @__PURE__ */ Z({
  inheritAttrs: !1,
  __name: "CustomizePluginSettings",
  props: {
    context: {}
  },
  setup(e) {
    const d = B(!1);
    function n() {
      d.value = !d.value;
    }
    return (y, r) => {
      var k, _, R, A, I, v;
      const u = V("Button");
      return ((_ = (k = e.context) == null ? void 0 : k.plugin) == null ? void 0 : _.id) === "core-customize-recipe" ? (i(), s(
        w,
        { key: 0 },
        [
          S(u, {
            label: d.value ? "Close Settings" : "Settings",
            icon: d.value ? "pi pi-chevron-up" : "pi pi-cog",
            size: "small",
            outlined: !d.value,
            disabled: ((A = (R = e.context) == null ? void 0 : R.plugin) == null ? void 0 : A.state) !== "active",
            class: "btn-customize-settings-toggle",
            onClick: n
          }, null, 8, ["label", "icon", "outlined", "disabled"]),
          d.value && ((v = (I = e.context) == null ? void 0 : I.plugin) == null ? void 0 : v.state) === "active" ? (i(), s("div", ai, [
            S(oi)
          ])) : x("v-if", !0)
        ],
        64
        /* STABLE_FRAGMENT */
      )) : x("v-if", !0);
    };
  }
}), ci = /* @__PURE__ */ H(li, [["__scopeId", "data-v-348a3bf5"]]);
function ri(e) {
  e.slot("recipe.detail.actions", be, { order: 10 }), e.slot("recipe.detail.customize", Mt, { order: 10 }), e.slot("recipe.edit.actions", Et, { order: 10 }), e.slot("plugin_manager.plugin.actions", ci, { order: 10 });
}
export {
  ve as CustomizeChatPanel,
  be as CustomizeDetailButton,
  Mt as CustomizeDetailPanel,
  ci as CustomizePluginSettings,
  Et as CustomizeRecipeButton,
  qt as CustomizeRecipeDialog,
  oi as CustomizeSettings,
  fe as CustomizedRecipePreview,
  ri as default
};
