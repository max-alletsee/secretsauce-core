# UI Overhaul: Design System, Import with AI, Settings, Members, Recurring Meals & Vertical Timeline

**Date:** 2026-09-28  
**Status:** Approved in conversation, awaiting written-spec review  
**Baseline:** `main` at d2ce510 (hardened kernel, see `docs/superpowers/specs/2026-09-20-pre-stage-8-completion-design.md`)  
**Mockups:** `.superpowers/brainstorm/1963-1790630191/content/` (`visual-style.html`, `timeline-layout-v2.html`), rendered with the PrimeVue 4.5.5 already installed in `shell/`

---

## 1. Context

Testing the app locally surfaced four problems and one design complaint:

1. **Import with AI does nothing.** Clicking it closes the menu, and no recipe can be imported even with an API key configured.
2. **Settings and Plugins are two nav entries**, and Plugins sorts below Settings.
3. **The timeline stacks days horizontally.** Only Dinner is shown, there's no setting for default meal slots, and there's no way to add a one-off slot (for example, Brunch on one Sunday).
4. **Household members can't be edited.** The first member keeps portion 1.0 and empty preferences forever. There's an unwanted avatar colour picker, "Recurring Meals" appears twice as a heading, and nobody knows what "Materialize now" does.
5. **The buttons look home-made:** raw `<button>` elements in three different accent colours.

### 1.1 Root causes found

| Symptom | Cause |
|---|---|
| Import with AI does nothing | The `recipe:create` provider in `core-recipe-importer/ui/src/index.ts` has no `kind`. `IntentTrigger.runProvider` only acts on `'headless'` + `execute` or `'ui'` + `component`, so it closes the menu and returns. The modal is registered on slot `recipe.list.actions`, which no page renders. It expects props (`isOpen`, `ss`) that nothing passes, and it is styled with Tailwind classes although Tailwind is not installed. The backend routes are fine. |
| Same bug class elsewhere | `core-meal-planner-ai` and `core-translator` providers have no `kind`. The meal-planner widget targets `schedule.sidebar`, but the timeline renders `timeline.sidebar`. `core-shopping-list` puts its nav under `meta.nav`, so it never appears. Six components (`AiSettings`, `MealPlannerWidget`, `ImportRecipeModal`, `RecurringSettings`, `ShoppingListPage`, `TranslateAction`) declare an `ss` prop that the shell never passes, and use Tailwind classes. `__SS_NOTIFY__` and `__SS_INTENT__` are injected but never provided, so clicking a planned meal does nothing. |
| Why tests were green | Plugin specs mount components directly with hand-passed props (`isOpen: true, ss: {...}`) instead of going through `activate()`, the registries and `Slot`/`IntentTrigger`. |
| Plugins below Settings | `main.ts` registers Settings (order 900) and Plugins (910) as nav routes. `SettingsPage` reads its sections once, non-reactively. |
| Only Dinner on the timeline | `TimelinePage.vue` hardcodes `defaultMealTypes = ['Dinner']`. The household already stores `meal_types` (`breakfast`/`lunch`/`dinner` by default since setup), but nothing edits or reads it. `PATCH /api/household` accepts `meal_types` unvalidated. |
| Duplicate heading | `SettingsPage` renders `<h3>{{ sec.title }}</h3>`, and `RecurringSettings.vue` renders its own `<h3>`. |
| "Materialize now" | It copies weekly rules into real schedule entries for the next 14 days. An hourly background loop already does this. There is **no UI to create a rule**. Hidden bug: removing a recurring meal from the plan gets undone within the hour, because the loop only checks whether the (date, meal_type) slot is free. |
| Buttons | PrimeVue 4 + Aura is installed and configured, but almost nothing uses it. Plugins **cannot** use PrimeVue today: `build-plugins.ts` externalizes `primevue/*`, but the import map in `api/routes/pwa.py` has no entry for it. The Appearance → Theme picker saves a choice but never applies a preset. |
| Phones | `AppNav` is a fixed 220px sidebar with no responsive behaviour. |

---

## 2. Goals & Non-Goals

### Goals
- A single PrimeVue-based design system for the shell and every core plugin, with four selectable themes.
- Import with AI works end to end from the Recipes page.
- Every core plugin's intents, slots, nav entries and injected services are wired correctly, and a guard test keeps them that way.
- Settings is one accordion page, pinned last in the nav, and absorbs the Plugin Manager. It gains a Household section with default meal slots.
- Members can be edited (add and edit share one dialog), without a colour picker.
- Recurring meals can be created from the timeline and from Settings. They materialize automatically and never resurrect removed meals.
- The timeline is a vertical feed of day cards with default, one-off and skipped slots, and explicit buttons to load earlier or later days.
- A usable phone layout (hamburger + drawer).

### Non-Goals (recorded in `TODO.md`)
- Dark mode. The token migration makes it cheap later; not shipped now.
- Translating new UI strings through the i18n registry. The existing code is English-only.
- A phone bottom tab bar; drag-and-drop reordering of slots.
- Changing the kernel's schedule/journal data model. `meal_type` stays a free string.

---

## 3. Key Decisions

| # | Decision | Chosen | Rejected alternatives |
|---|---|---|---|
| D1 | How plugins use PrimeVue | The shell registers a curated component set **globally**. Plugins use the tags without importing. A test fails on any `primevue` import in plugin UI source. | Vendoring PrimeVue into the import map (about 100 sub-modules with shared internals: fragile). Re-exporting from `@secretsauce/ui` (a second PrimeVue copy that can't see the shell's config or theme). |
| D2 | How plugin components get `ss` | The shell **wraps every component a plugin registers** (route, slot, settings section, `ui` intent provider). The wrapper passes the plugin's `SecretSauceUI` as the `ss` prop and provides it under the string key `'__SS_UI__'`. `@secretsauce/ui` exports `useSecretSauce()`. | Module-level `let ss` in each plugin (implicit, easy to forget). |
| D3 | Where per-day slot changes live | A `core-timeline` plugin table plus a `core-timeline` **service** (`slots_for`) and routes. The recurring and AI-planner plugins consume the service when present. | A JSON blob in household config (unbounded growth); a new kernel noun (too heavy). |
| D4 | Themes | Four presets, all on the **zinc** surface palette: `aura-tomato` (default), `nora-tomato`, `material-indigo`, `lara-amber`. "Tomato" is PrimeVue's `rose` palette. The choice is per device (localStorage `ss-theme`, as today). | A single hard-wired theme. |
| D5 | Timeline layout | **Day cards** (mockup A, v2), not the date rail. | Date rail (mockup B). |
| D6 | Timeline loading | An explicit **Show 2 earlier days** / **Show 5 more days**; no infinite scroll, because elements at the bottom must stay reachable. | Infinite scroll; fixed paging. |
| D7 | Extra slots | Saved one-off slots that can exist while empty, **plus** skipping a default slot on one day. | Slots that exist only while a meal is planned in them. |
| D8 | Phone navigation | Below 768px: a hamburger in the header opens a PrimeVue `Drawer`. | Bottom tab bar; no phone layout. |
| D9 | Scope | Includes the sweep of every core plugin with the same wiring bugs. | Reported issues only. |

`@secretsauce/ui` exists twice at runtime: bundled into the shell through the Vite alias, and as `static/vendor/secretsauce-ui.js` for plugins. So every provide/inject key it defines must be a **string**, never a `Symbol`.

---

## 4. Design

### 4.1 Foundation (shell)

**UI install module.** `shell/src/ui/install.ts` exports `installUi(app, { themes })`, which does the following:
- Installs `PrimeVue` (styled mode) with the current theme preset, plus `ToastService`, `ConfirmationService` and the `tooltip` directive.
- Globally registers this component set: `Button`, `SplitButton`, `Menu`, `Dialog`, `ConfirmDialog`, `Drawer`, `Accordion`, `AccordionPanel`, `AccordionHeader`, `AccordionContent`, `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`, `InputText`, `Textarea`, `InputNumber`, `Select`, `SelectButton`, `AutoComplete`, `ToggleSwitch`, `Checkbox`, `IconField`, `InputIcon`, `Tag`, `Avatar`, `Message`, `ProgressSpinner`, `Card`, `Divider`.
- Is used by `main.ts` and by a Vitest helper (`shell/tests/helpers/mountWithUi.ts`), so component tests render what production renders.
- Documents the global set in `docs/PLUGIN_DEVELOPER_GUIDE.md` as part of the plugin UI contract.

`InputChips` is deprecated in 4.5: chip inputs use `AutoComplete` with `multiple` and `:typeahead="false"`.

**Themes.** `shell/src/theme.ts` builds the four presets with `definePreset(base, { semantic: { primary: <palette>, colorScheme: { light: { surface: zinc }, dark: { surface: zinc } } } })`.
- `setTheme(id)` applies the preset live with `usePreset`.
- At boot the stored id is applied. An unknown id falls back to `aura-tomato`.
- Reading and writing `localStorage` is wrapped in try/catch.
- Plugin-registered themes (`ss.theme.register`) keep working.

**Tokens.**
- Hard-coded colours in shell and plugin CSS are replaced with PrimeVue CSS variables (`--p-primary-color`, `--p-surface-*`, `--p-content-border-color`, `--p-text-color`, `--p-text-muted-color`, `--p-highlight-background`, and so on).
- `body` uses `--p-surface-50`.
- Tailwind-class markup is removed.
- Raw `<button>`s become `Button` with `severity`, `outlined`, `text`, `rounded`, `size`, `loading` or `icon` as appropriate.
- `confirm()` and `alert()` become `ss.confirm()` or toasts.

**Plugin context wiring (D2).**
- `makeSecretSauceUI(pluginId)` wraps components before handing them to the registries: `withPlugin(component, ss)` returns a component with `inheritAttrs: false` that provides `'__SS_UI__'` and renders `h(component, { ...attrs, ss }, slots)`. Route params still arrive as props.
- The unused inject fallbacks (`__SS_NOTIFY__`, `__SS_INTENT__`, `props.ss?.api || inject(...)`) are deleted.

**New additive `SecretSauceUI` API** (`API_VERSION` stays 1):
- `ss.confirm({ header?, message, acceptLabel?, rejectLabel?, severity? }): Promise<boolean>`, implemented with PrimeVue's confirmation event bus. `App.vue` renders `<ConfirmDialog />`. This is how headless providers in `index.ts` ask for confirmation without importing PrimeVue.

**Intent registry validation.** `registerProvider` rejects a provider whose `kind` is not `'ui'` (with `component`) or `'headless'` (with `execute`). It logs `console.error` naming the plugin and provider, and does not register it.

**Navigation.**
- `AppNav` lists registry routes that have `nav`, sorted by `nav.order`.
- Settings is **not** a registry nav route. `AppNav` renders it pinned at the bottom, after a divider and before the `shell.nav.footer` slot.
- The `/plugins` nav route is removed. `/plugins` redirects to `/settings?section=plugins`.
- Below 768px, `AppHeader` shows a hamburger `Button` that opens a left `Drawer` containing the same `AppNav`. The drawer closes on route change. Desktop is unchanged.

**Guard tests (Vitest, over all core plugins).** For each `secretsauce/plugins/core/*/ui/src/index.ts`, the test runs the real `activate()` with real registries and a real `makeSecretSauceUI`, then asserts:
- every intent provider targets a hub that is registered or rendered, and has a valid `kind` with its matching `component` or `execute`;
- every slot name is in the list of slots rendered by the shell or core plugins (a constant in the test, kept next to the `Slot` usages);
- every route's `nav`, if present, is top-level with `label`, `icon` (a PrimeIcons name, not an emoji) and `order`;
- no UI source file imports from `primevue`, `@primevue` or `@primeuix`.

### 4.2 `IntentTrigger` and Import with AI

**`IntentTrigger`** (`shell/packages/ui/src/IntentTrigger.vue`):
- One available provider renders a `Button` labelled with the `label` prop or the provider title.
- Several render a `Button` with a trailing `pi-chevron-down` that toggles a popup `Menu`. Each item shows the provider icon and title, and is disabled with a tooltip when `disabledReason(context)` returns text.
- A new **scoped default slot** `#default="{ open }"` lets the caller render its own trigger element (the timeline uses this for meal cards).
- `ui` providers open in a `Dialog` whose header is the provider title. The dialog content receives `context` and emits `resolve` or `cancel`.
- `headless` providers run `execute(context)` and emit `resolve`.

**`core-recipe-importer`:**
- Registers one provider on `recipe:create`: `{ id: 'ai-import', kind: 'ui', title: 'Import with AI…', icon: 'sparkles', component: ImportRecipeDialog, order: 15 }`. The `recipe.list.actions` slot registration is removed.
- `core-recipes` titles its manual provider "Blank recipe". The Recipes toolbar renders `<IntentTrigger hub="recipe:create" label="New recipe" />`, which produces **New recipe ▾ → Import with AI… / Blank recipe**.
- `ImportRecipeDialog.vue` (it replaces `ImportRecipeModal.vue`):
  - `Tabs`: **URL** (`InputText`), **Paste text** (`Textarea`), **Photo** (file input with preview).
  - **Extract** (`loading` while pending) calls the existing `parse-url` / `parse-text` / `parse-image` routes with `auto_save: false`.
  - A preview shows title, servings, and ingredient and step lists.
  - **Save recipe** calls `POST /api/recipes`, shows a toast, emits `resolve`, and navigates to `/recipes/{id}`.
  - Errors appear inline as a `Message`. For 503 `unavailable` the text is "AI isn't set up yet", with an **Open AI settings** button that navigates to `/settings?section=core-ai-provider`. For any other error the dialog shows the backend's error message.

### 4.3 Plugin sweep

| Plugin | Change |
|---|---|
| `core-meal-planner-ai` | Widget moves to slot `timeline.sidebar`. Its slot choices come from the household's meal types (and the timeline service when present). The dead `meal:plan` provider is removed. Rebuilt with PrimeVue. |
| `core-translator` | One `recipe:actions` provider `{ kind: 'ui', component: TranslateDialog }`, shown in the recipe detail **Actions ▾** menu. The `recipe.card.actions` and `recipe.detail.sidebar` slot registrations are removed. Rebuilt with PrimeVue. |
| `core-shopping-list` | `nav: { label: 'Shopping list', icon: 'shopping-cart', order: 30 }` at the top level. The dead `shopping:view` provider is removed. The page is rebuilt with `Checkbox`, `InputText` and `Button`. |
| `core-ai-provider` | Settings section restyled. It uses `ss` (so `notify` works). |
| `core-cook-tracker`, `core-ratings`, `core-shortlist`, `core-recipes`, `core-members` | Tokens and PrimeVue components. `confirm()` becomes `ss.confirm()`. |
| All plugin specs | Specs that mount components with hand-passed props are rewritten to go through `activate()`, the real registries and `Slot`/`IntentTrigger`. Mocked API responses are checked against the route code. |

### 4.4 Settings

`SettingsPage.vue` is one page with a PrimeVue `Accordion` (`multiple`).
- Sections come from a **computed** over the settings registry, so enabling or disabling a plugin updates the page live.
- Section titles are rendered only in `AccordionHeader`. Plugin section components must not render their own top heading; this is documented, and `RecurringSettings`' `<h3>` is removed.

Order (shell sections use fixed orders around plugin sections):

1. **Household** (shell, `id: 'household'`, order 0): household name (`InputText`), units (`SelectButton`: Metric / US customary), primary language (`Select`), and the **Default meal slots** editor:
   - The list shows each slot's label, with up/down reorder, inline rename and remove. **Add slot** asks for a name.
   - The id is the slug of the label: lowercase, `[a-z0-9-]`, with `-2` and so on appended when it clashes.
   - Renaming changes only `label`. Removing is disabled for the last slot.
   - Saving uses `PATCH /api/household` and updates the household store.
2. **Members** (`core-members`, order 10), see 4.5.
3. **Recurring meals** (`core-recurring`, order 20), see 4.6.
4. **AI & budget** (`core-ai-provider`, id `core-ai-provider`, order 80, unchanged), with any other plugin sections placed by their `order`.
5. **Plugins** (shell, `id: 'plugins'`, order 900): the former Plugin Manager as a component.
   - Each row shows the name and description, a state `Tag` (active/success, disabled/secondary, errored/danger, blocked/warn), an enable `ToggleSwitch`, collapsible error details, and commands as small buttons.
6. **This device** (shell, `id: 'device'`, order 1000): theme (`Select` over the theme registry), default start page (`Select`), and **Log out** (`Button` severity danger, outlined) with the existing explanation text.

Behaviour:
- `/settings?section=<id>` opens that panel and scrolls it into view. Otherwise Household is open.
- The set of open panels is remembered per device in localStorage (try/catch; the page works without it).

**Backend: `meal_types` validation.** A `MealType` model (`id`: `^[a-z0-9][a-z0-9-]{0,63}$`; `label`: 1–64 characters) is used by `PATCH /api/household` and `POST /api/setup`. The list must have at least one entry, and ids must be unique. Violations return the standard validation error (422).

**Behaviour change for existing households:** they have stored Breakfast/Lunch/Dinner since setup. After this change the timeline shows all three until a slot is removed in Settings.

### 4.5 Members

- **Member card:**
  - `Avatar` (initial; the background colour is derived deterministically from the member id over a fixed eight-colour palette readable in all four themes);
  - name, language and "portion 1.0×";
  - `Tag`s for dietary restrictions (info), allergies (danger, warning icon) and dislikes (secondary);
  - **Edit** (`pi-pencil`, rounded text) and **Delete** (`pi-trash`, rounded text danger, confirmed through `ss.confirm`).
  - A member with no restrictions, allergies, dislikes or cuisines shows an **Add dietary preferences** text button that opens the edit dialog.
- **`MemberDialog.vue`** is shared by add and edit. Fields:
  - name (required);
  - preferred language (`Select`: household primary and translation languages, the member's current value, and en/de/fr/es/it/nl);
  - **portion size** (`InputNumber`, 0.25–10, step 0.25, hint "relative to one adult portion");
  - dietary restrictions, allergies, disliked ingredients and favourite cuisines, each an `AutoComplete multiple` with a short suggestion list and free entry.
  
  Add uses `POST /api/members`. Edit uses `PATCH /api/members/{id}` with `revision`. On 409, the dialog shows "Someone else changed this member" and reloads the member into the form.
- **No colour picker.** `avatar_color` stays in the API model for compatibility; the UI ignores it. `SetupPage` stops sending `first_member.color`.
- **Last member.** `DELETE /api/members/{id}` returns 409 when it would remove the last member. The UI disables Delete in that case.
- **`MemberPicker`** (header): `Avatar` plus name, opening a `Menu` to switch the current member.

### 4.6 Recurring meals

**Meaning (shown as help text in the section):** "A recurring meal is planned automatically on the same weekday every week, 14 days ahead."

**Creating rules:**
- **From the timeline:** an `entry:interact` provider `repeat-weekly` (headless) is available when the entry has a `recipe_id` and was not created by a rule. It posts `{ weekday, meal_type, recipe_id }`, where `weekday` uses Python's convention (0 = Monday). JS `Date.getDay()` must be converted; this gets a unit test.
- **From Settings:** **Add recurring meal** opens a form with weekday (`Select`), slot (`Select` over household meal types) and recipe (`AutoComplete` search over `/api/recipes?q=`).

**Settings list:** "Every Monday · Dinner · Lentil soup" rows with a delete button. The **Materialize now** button, the `POST /api/x/core-recurring/materialize` route and the `materialize` command are removed.

**Backend (`core-recurring`):**
- Migration `0002_materialized.sql` creates `plugin_core_recurring_materialized (rule_id TEXT NOT NULL, date TEXT NOT NULL, entry_id TEXT NOT NULL, PRIMARY KEY (rule_id, date))`.
- `materialize_rules(ctx)` runs for every rule and every horizon day whose weekday matches:
  - skip if `(rule_id, date)` is already recorded, which means **a removed meal is not re-added**;
  - skip if the timeline service reports the slot as skipped;
  - if the slot already holds an entry with `origin == 'plugin:core-recurring'` and the same `recipe_id`, record it (this backfills rules materialized before this change) and move on;
  - skip if the slot is otherwise occupied;
  - otherwise create the entry and insert the tracking row **in one transaction**.
- `POST /rules` creates the rule, then materializes in the same request, and returns `{ ...rule, created }`.
- `DELETE /rules/{id}` returns 404 for an unknown rule. Otherwise, in one transaction, it deletes the rule, deletes tracked entries dated **after today** whose `revision == 1` (unedited), and deletes all of the rule's tracking rows. Past, today's and edited entries stay.
- The hourly `background_loop` is unchanged. It runs immediately at startup, then every hour.

**Timeline indicator:** entries with `origin == 'plugin:core-recurring'` show a `pi-replay` icon with the tooltip "Repeats every <weekday>".

### 4.7 Timeline

**Page layout** (`TimelinePage.vue`):
- The toolbar holds the "Timeline" title and a **Today** button (outlined, `pi-calendar`).
- ≥ 1024px: the feed column plus a 280px right column rendering `<Slot name="timeline.sidebar">` (Shortlist, AI meal planner).
- < 1024px: the sidebar renders **above** the feed. Below 768px each widget is wrapped in a collapsible container that starts collapsed, so today's card stays near the top.

**Date window:**
- The initial window runs from today − 2 to today + 6.
- **Show 2 earlier days** (text button, top) extends the start by 2 days; **Show 5 more days** (outlined button, bottom) extends the end by 5. There is no scroll-triggered loading.
- **Today** resets the window and scrolls today's card into view.
- The window is not persisted.

**Past days** (before today) render as **one block** with one line per day: `Fri 26 Sep · DINNER Chicken curry · …`, or "Nothing planned". Clicking a line expands that day into a full card; clicking again collapses it.

**Day card:**
- Header: weekday and date, a `Tag` "Today" on today, and a ⋮ `Menu` containing *Add slot for this day*.
- Today's card has a primary-coloured border.
- Slots are listed in resolved order (see below).
- *Add slot for this day* opens a `Dialog` with a name (`InputText`) and a position (`Select`: "Before <each default slot>" or "At the end"; the default is "At the end").

**Slot row:**
- The label is uppercase and muted. One-off slots add a `pi-calendar-plus` icon with the tooltip "Only on this day".
- The slot's entries are listed, each with the title (recipe title, or the note title), a servings `Tag` when overridden, the recurring icon, and `<Slot name="timeline.entry.badge">`.
- An empty slot shows an **Add meal** text button.
- The ⋯ `Menu` offers:
  - *Add another meal*;
  - *Skip on this day*, only for **empty default** slots;
  - *Remove slot*, only for one-off slots. When the slot has meals, it confirms through `ss.confirm` with "Remove Brunch and its 1 planned meal?".
- A skipped slot renders struck through as "Skipped this day", with an **Undo** text button.

**Meal interaction:** the entry is rendered inside `<IntentTrigger hub="entry:interact" :context="{ entry }">` using the scoped slot, so clicking the meal opens the popup `Menu` of providers: *View recipe*, cook-tracker's *Mark as cooked* and similar, *Repeat every <weekday>*, and *Remove from plan* (`ss.confirm`, then `DELETE /api/schedule/{id}?revision=`). There is no page reload.

**Add-meal dialog** (`AddEntryDialog.vue`, replacing `AddEntryModal.vue`):
- A `Dialog` with `Tabs`: **Recipes** (search), **Shortlist**, **Note** (free text; optional quick chips Dining out / Leftovers / Takeout / Quick meal fill the text).
- Servings is an `InputNumber`.
- New entries store `meal_type = <slot id>`. The note title is stored as typed, with no `[Category]` prefix.
- The placeholder "AI Suggestions" tab is removed.

**Composing days (pure function, frontend).** `buildDays(window, resolvedSlots, entries, today)` returns an ordered list of day view-models:
- Entries match a slot by case-insensitive comparison with the slot `id`, then with its `label`. Legacy entries stored as `"Dinner"` land in the `dinner` slot.
- Entries that match no slot on their day produce a one-off slot `{ id: entry.meal_type, label: <title-cased>, kind: 'extra' }`, appended at the end. Nothing is ever hidden.
- A skipped slot that nevertheless has entries (for example, planned from another device) renders as a normal slot showing them.

**Live updates:** the page subscribes (through `ss.on`) to `schedule:created|updated|deleted` and to the plugin push `core-timeline:slots-changed`, then refetches the window with a 300 ms debounce. The existing cache warming stays.

**Backend (`core-timeline`)** gets `"schema": 1` and migration `0001_day_slots.sql`:

```sql
CREATE TABLE plugin_core_timeline_day_slots (
    date        TEXT NOT NULL,
    meal_type   TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('extra', 'skip')),
    label       TEXT,
    before      TEXT,           -- extra slots: default slot id to insert before; NULL = at the end
    created_at  TEXT NOT NULL,
    PRIMARY KEY (date, meal_type)
);
```

**Service `core-timeline`:** `async slots_for(from_date, to_date) -> dict[str, list[Slot]]`, where `Slot = { id, label, kind: 'default' | 'extra', skipped: bool }`.
- Each date's list is the household `meal_types` in order, with skips marked.
- Extra slots are inserted before their `before` slot, or at the end when `before` is `NULL` or no longer exists.
- Extra slots that share a `before` keep their creation order.

**Routes** (all under `/api/x/core-timeline/`, auth: cookie):

| Method & path | Behaviour |
|---|---|
| `GET /slots?from=&to=` | `{ "days": { "<date>": [Slot, …] } }` from the service. The range is at most 92 days; otherwise 422. |
| `PUT /days/{date}/slots/{meal_type}` body `{ "kind": "extra", "label": str, "before": str \| null }` | Creates or updates a one-off slot. `meal_type` must match the slug pattern and must not be a default id (409). `label` is 1–64 characters. Returns the resolved day. |
| `PUT /days/{date}/slots/{meal_type}` body `{ "kind": "skip" }` | Skips a default slot. 404 if `meal_type` isn't a default id. 409 if the slot has entries. Returns the resolved day. |
| `DELETE /days/{date}/slots/{meal_type}?with_entries=false` | Removes the override (un-skip, or remove the extra slot). For an extra slot with entries and `with_entries=false`, returns 409 with the entry count. With `with_entries=true`, it deletes the slot's entries through `ctx.schedule.delete_entry` (emitting `schedule:deleted`) and the override **in one transaction**. |

Every write calls `ctx.push("core-timeline:slots-changed", { "date": date })` after commit. Push names are not namespaced by the kernel, hence the explicit prefix. `date` is validated as ISO `YYYY-MM-DD`.

---

## 5. Testing

This follows `AGENTS.md` §4: outside-in, through real entry points, covering failure cases.

### 5.1 Backend (pytest)
Uses `build_app()` + `app.router.lifespan_context(app)` + httpx, polling with `_eventually` where background work is involved.
- **Household:** `meal_types` validation (bad slug, duplicate ids, empty list, label length) on both `PATCH /api/household` and `POST /api/setup`.
- **Members:** deleting the last member returns 409; editing with a stale revision returns 409.
- **Timeline day slots:**
  - add, rename and move an extra slot; skip and un-skip; `GET /slots` ordering (`before`, missing `before`, several extras);
  - 409 for skipping an occupied slot, for an extra slot clashing with a default, and for deleting a slot with entries without `with_entries`;
  - 404 for skipping a non-default slot; 422 for a bad date or an oversized range;
  - `with_entries=true` deletes the entries and the slot atomically. If an entry delete fails midway, nothing changes;
  - `core-timeline:slots-changed` reaches an SSE client.
- **Recurring:**
  - creating a rule makes the entries appear immediately;
  - a materialized meal that is then removed is **not** recreated after the loop runs again or after a restart (a new `build_app` over the same data dir);
  - deleting a rule removes only its unedited future entries; past, today's and edited ones stay;
  - skipped slots are not filled;
  - entries from before the migration are backfilled and not duplicated;
  - deleting an unknown rule returns 404;
  - `/materialize` and the command are gone.
- **Shared rules (new):** one parametrized test over `app.routes` asserts that every `/api/*` route except the public ones in `secretsauce/auth.py` (`GET /api/setup`, `POST /api/auth/login`, `/api/health`; `POST /api/setup` answers 409 once set up) returns 401 without a session. New routes, including plugin routes under `/api/x/<plugin_id>/`, are then covered automatically.

### 5.2 Frontend (Vitest)
- The guard suite from 4.1.
- `IntentTrigger`: single versus multiple providers, `ui` dialog, `headless` execution, the scoped trigger slot, disabled reasons.
- Intent registry validation: a provider without a valid `kind` is rejected.
- Theme registry: applies the preset on `setTheme`, falls back when the stored id is unknown, and survives `localStorage` throwing.
- `withPlugin`: the wrapped component receives `ss` and `useSecretSauce()` returns it; route params still arrive as props.
- Settings: sections are reactive to register/unregister, `?section=` opens the panel, and there is exactly one heading per section.
- The meal-slot editor: slug generation and collisions, rename keeping the id, the last slot not being removable.
- `MemberDialog`: add and edit payloads, the 409 path.
- `buildDays()`: defaults, extras with `before`, skips, skipped slots with entries, legacy label matching, unmatched entries, past and today classification, window extension.
- Weekday conversion (JS → Python convention).
- Plugin specs rewritten per 4.3.

### 5.3 End to end (Playwright, real server, built bundles)
The e2e server (`shell/e2e/server.py`) stubs **only** the external LLM HTTP call (the OpenAI-compatible completion helper in `core-ai-provider`) with canned JSON. Browser, routes, importer service and AI service all run for real.

1. **Import with AI:** New recipe ▾ → Import with AI… → paste text → Extract → preview → Save lands on `/recipes/<id>`. With AI unconfigured, the dialog shows "AI isn't set up yet" and **Open AI settings** opens the AI section.
2. **Settings:** Settings is the last nav item; `/plugins` redirects to the Plugins panel; disabling and re-enabling a plugin updates the nav live; the theme choice survives a reload and changes `--p-primary-color`.
3. **Members:** editing the first member's portion and allergies persists across a reload.
4. **Meal slots:** adding Lunch in Settings makes Lunch appear on every timeline day.
5. **Timeline:** add Brunch before Lunch on one day; skip Lunch on another, then Undo; add a meal; remove a meal (no reload); Show 2 earlier / Show 5 more; "Repeat every <weekday>" creates the same meal 7 days later with the ↻ icon.
6. **Phone** (390×844): the hamburger opens the drawer; Settings is last in it; the drawer closes on navigation; the timeline sidebar sits above the feed.
7. **Theme smoke:** every main screen in all four themes with no console errors, with screenshots saved under `shell/test-results/` for manual review.

---

## 6. Delivery

- Work on branch `feat/ui-overhaul` in a worktree under `.worktrees/`, with one commit per phase:
  1. **Foundation:** `installUi`, themes, tokens in the shell, nav + drawer, `withPlugin`/`useSecretSauce`/`ss.confirm`, intent validation, guard suite.
  2. **Intents, Import with AI and the plugin sweep.**
  3. **Settings:** accordion, Household + meal slots (with backend validation), Plugins section, This device.
  4. **Members:** dialog, cards, last-member guard.
  5. **Timeline:** backend day slots and service, vertical UI, add-meal dialog, live updates.
  6. **Recurring:** tracking table, immediate materialization, rule creation from the timeline and Settings, rule deletion semantics. It comes after the timeline because it consumes `slots_for`.
  7. **Docs:** `SHELL_ARCHITECTURE.md`, `PLUGIN_DEVELOPER_GUIDE.md` (global components, `ss` prop, `useSecretSauce`, `ss.confirm`, provider kinds, settings-section heading rule), `CORE_PLUGINS.md`, `API_REFERENCE.md` (new timeline routes, removed `/materialize`, `meal_types` validation, the last-member 409), and `TODO.md`.
- After each phase: `uv run pytest`, `pnpm --prefix shell test`, `pnpm --prefix shell build`. From phase 2 on, also `pnpm --prefix shell test:e2e`.

## 7. Risks

- **Material preset density** differs (larger controls, ripple). Layouts use tokens and flex/grid gaps, not fixed pixel heights, and the theme smoke screenshots are reviewed.
- **Global component names** could shadow a plugin's local component with the same name. Local registration wins in Vue, so this is safe; the developer guide lists the reserved names.
- **Existing data:** households whose stored `meal_types` fail the new validation. Stored values came from `DEFAULT_MEAL_TYPES` or the e2e seed, which already conform. `GET` keeps returning stored values unvalidated; only writes are validated.
- **Service worker:** stale plugin bundles after upgrade. This is already handled by content-hashed `ui_entry` URLs; the e2e suite runs against fresh builds.
