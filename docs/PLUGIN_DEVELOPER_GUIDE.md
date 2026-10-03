# SecretSauce Plugin Developer Guide

This guide explains how to develop, test, and package backend plugins for the SecretSauce Kernel.

---

## 1. Plugin Directory Structure

A plugin lives in a directory under `<data_dir>/plugins/<plugin-id>/` (user plugins) or `secretsauce/plugins/core/<plugin-id>/` (built-in core plugins). A single-file plugin `<plugin-id>.py` works too.

```text
my-plugin/
├── __init__.py          # PLUGIN dict and setup(ctx)
├── helpers.py           # Optional submodules: `from .helpers import ...` works
├── migrations/          # SQLite schema migrations (optional)
│   └── 0001_initial.sql
├── ui/                  # UI source files (Vite library build)
│   ├── package.json
│   └── src/
│       ├── index.ts
│       └── MyComponent.vue
├── ui.js                # Compiled frontend ES module bundle
└── ui.css               # Optional frontend styles
```

The kernel imports the package as `ss_plugin_<id with dashes as underscores>`. Python modules are never reloaded in a running process, so changing plugin code needs a restart; enabling, disabling and configuring a plugin do not.

---

## 2. Plugin Manifest (`PLUGIN`)

Every plugin declares a `PLUGIN` dictionary in its module. There is no separate manifest file.

```python
PLUGIN = {
    "id": "recipe-nutrition",
    "name": "Recipe Nutrition Calculator",
    "version": "1.0.0",
    "description": "Estimates nutrition per serving",
    "schema": 1,
    "requires": ["core-ai-provider", "core-units?"],
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "api_key": {"type": "string", "title": "Provider API key", "secret": True},
            "default_calories": {"type": "number", "default": 500},
        },
    },
}
```

### Manifest Fields
| Field | Type | Description |
|---|---|---|
| `id` | `str` | Required. Matches `^[a-z][a-z0-9-]{1,40}$` and the directory or file name. |
| `version` | `str` | Required. SemVer, e.g. `1.0.0`. |
| `name` | `str` | Display name; defaults to the id. |
| `description` | `str` | Shown in Plugin Manager. |
| `schema` | `int` | Highest migration number. Pending migrations run on activation, each atomically; a failing one marks the plugin `errored`. |
| `requires` | `list[str]` | Plugin ids that must be active. A trailing `?` marks an optional dependency, which only affects start order. Plugins start in dependency order; a missing or inactive requirement leaves the plugin `blocked`. |
| `ui`, `ui_css` | `str` | Frontend bundle and stylesheet (see section 6). |
| `ui_api` | `int` | Frontend API version; defaults to 1. |
| `config_schema` | `dict` | JSON Schema (`{"type": "object", "properties": {...}}`) for the plugin's settings. `default` values are applied; properties with `"secret": True` are stored encrypted, shown to browsers as `••••••••`, and decrypted for the plugin. |

---

## 3. Lifecycle: `setup(ctx)` and `teardown()`

When a plugin activates, the kernel runs its migrations and calls `setup(ctx)` with the plugin's `PluginContext`. Everything a plugin registers through `ctx` (hooks, event handlers, routes, services, commands, jobs, background tasks) belongs to it and is removed when the plugin is disabled from Plugin Manager, at runtime and without a restart. An optional module-level `teardown()` runs first. An exception in `setup` marks the plugin `errored` with the traceback; nothing else is affected.

```python
from secretsauce.plugins.context import PluginContext

async def setup(ctx: PluginContext) -> None:
    async def tag_nutrition(draft, current=None, ctx=None):
        # Pre-commit hook: mutate the draft or raise VetoError
        draft.setdefault("tags", [])
        return draft

    async def on_recipe_created(event):
        await ctx.jobs.create("calculate-nutrition", {"recipe_id": event.entity_id})

    ctx.hook("recipe:create", tag_nutrition)
    ctx.on("recipe:created", on_recipe_created)
```

**Trust model.** A plugin runs in-process with the kernel. It can read and write the whole database, the data directory and the network; `ctx` scopes what it *registers*, not what it can reach. Only install plugins you trust as much as the kernel itself.

---

## 4. `PluginContext` SDK Reference

### 4.1 Noun repositories (`ctx.recipes`, `ctx.schedule`, `ctx.journal`, `ctx.members`, `ctx.household`, `ctx.assets`)
These are the kernel's own repositories, the same ones the REST API uses. A plugin write therefore runs pre-commit hooks and appends the same `<noun>:created|updated|deleted` events as a browser write, with `origin = "plugin:<id>"`. Pass `conn=tx` to join a transaction you opened with `ctx.db.transaction()`:

```python
async with ctx.db.transaction() as tx:
    entry = await ctx.schedule.create_entry({"date": "2026-10-01", "meal_type": "dinner"}, conn=tx)
    await tx.execute("UPDATE plugin_my_plugin_items SET entry_id = ? WHERE id = ?", (entry["id"], item_id))
```

Nested `ctx.db.transaction()` blocks in the same task join the outer transaction, so a hook that writes through `ctx.db` commits or rolls back together with the write that triggered it.

### 4.2 Configuration (`ctx.config`)
`ctx.config` returns the plugin's configuration with schema defaults applied and secret fields decrypted. It reflects changes made in Settings immediately. `await ctx.save_config({...})` merges and stores new values (secrets are encrypted).

### 4.3 Scoped Entity Attributes (`ctx.attributes`)
Plugins store metadata on kernel entities without modifying kernel tables. Keys are scoped to the plugin:

```python
await ctx.attributes.set("recipe", group_id, "calories", 450.0)
attrs = await ctx.attributes.get("recipe", group_id)          # {"calories": 450.0}
matching = await ctx.attributes.query("recipe", ["recipe-nutrition.calories<600"])
await ctx.attributes.delete("recipe", group_id, "calories")
```

The same `<plugin_id>.<key><op><value>` filters work on `GET /api/recipes?attr=...`, and `sort=-<plugin_id>.<key>` sorts by an attribute.

### 4.4 Pre-commit Hooks (`ctx.hook`)
Hooks are awaited inside the write's transaction, before commit, in plugin load order. Names are `<noun>:<create|update>`; the recipe repository runs `recipe:create` and `recipe:update`. A handler receives `(draft, current, ctx)`: for create `current` is `None`; for update `draft` is the stored row with the patch applied. Return the (possibly mutated) draft, or raise `VetoError` to abort the write with HTTP 422. Any other exception also vetoes.

```python
from secretsauce.errors import VetoError

async def no_peanuts(draft, current=None, ctx=None):
    if any("peanut" in str(i).lower() for i in draft.get("ingredients", [])):
        raise VetoError("Contains peanuts", plugin_id="allergy-guard")
    return draft

ctx.hook("recipe:create", no_peanuts)
```

### 4.5 Events (`ctx.on`, `ctx.emit`, `ctx.push`)
`ctx.on(name, handler)` subscribes to the event log by exact name or prefix (`"recipe:*"`). Each plugin has its own cursor and a dedicated delivery task: handlers see events in order, at least once, after the writing transaction commits. Make handlers idempotent; `event.revision` makes that a one-line check. Details:
- The plugin's own events are skipped unless it subscribes with `include_self=True`.
- A failing handler is retried after 1 s, 10 s, 1 min, then every 10 min, and the event is skipped after 20 attempts. Other plugins are unaffected.
- A newly installed plugin starts at the head of the log; it never receives history.
- Writes made inside a handler record the event as their cause; a chain deeper than 8 is refused with `EventDepthError`, which stops feedback loops.

`await ctx.emit("recipe-nutrition:calculated", {"calories": 450}, entity=("recipe", group_id))` appends a plugin event. `await ctx.push("recipe-nutrition:progress", {...})` sends a transient message to open browsers only; it is not logged.

### 4.6 Jobs (`ctx.jobs`)
Register a handler, then create jobs; the kernel's job runner starts them as tracked tasks:

```python
async def calculate(input_data, handle):
    await handle.set_progress(50, "Parsing ingredients...")   # pushed to browsers as job:progress
    return {"calories": 450}                                 # stored as the job result

ctx.jobs.register("calculate-nutrition", calculate)
job_id = await ctx.jobs.create("calculate-nutrition", {"recipe_id": "abc_en"})
```

`job:started` and `job:finished` are logged events. `await ctx.jobs.cancel(job_id)` cancels the running task (the handler sees `asyncio.CancelledError`). Jobs still running when the server stops are marked `failed` at the next boot; pending jobs stay queued.

### 4.7 REST Endpoints (`ctx.router`)
Routers must serve paths under `/api/x/<plugin_id>/`; anything else fails activation. Endpoints get the plugin's context through the `current_ctx` dependency instead of reaching into the app:

```python
from fastapi import APIRouter, Depends
from secretsauce.plugins.context import PluginContext, current_ctx

router = APIRouter(prefix="/api/x/recipe-nutrition")

@router.get("/summary")
async def summary(ctx: PluginContext = Depends(current_ctx)):
    return await ctx.db.fetch_all("SELECT * FROM plugin_recipe_nutrition_values")

async def setup(ctx: PluginContext):
    ctx.router(router)                                     # session cookie required
```

`ctx.router(feed_router, auth="token", scope="read:calendar")` mounts routes for machine clients: they require `Authorization: Bearer <token>` with exactly that scope, issued by this plugin, and do not accept the session cookie. Raise `secretsauce.errors` exceptions (`NotFoundError`, `ValidationError`, `ConflictError`, ...) for the standard error envelope. An unhandled exception answers 500 `plugin_error` with `details.plugin_id` and is logged against the plugin.

### 4.8 Commands (`ctx.command`)
A command is a job with a button in Plugin Manager:

```python
async def recalculate_all(ctx: PluginContext):
    return {"updated": 42}

ctx.command("recalculate", recalculate_all, title="Recalculate all statistics")
```

`POST /api/plugins/<id>/commands/recalculate` runs it as a job of type `command:recalculate` and answers `202 {"job_id"}`. A command named `rebuild` is also run by the kernel when the plugin was disabled long enough to miss pruned events.

### 4.9 Background Tasks (`ctx.background`)
`ctx.background(coro)` runs a coroutine as a tracked task: it is cancelled when the plugin is disabled or the server stops, writes it makes carry the plugin's origin, and an exception is logged against the plugin. Periodic work is a loop with `asyncio.sleep`; let `CancelledError` propagate:

```python
async def refresh_loop(ctx: PluginContext):
    while True:
        try:
            await refresh(ctx)
        except asyncio.CancelledError:
            raise
        except Exception:
            ctx.log.exception("Refresh failed; retrying next hour")
        await asyncio.sleep(3600)

ctx.background(refresh_loop(ctx))
```

### 4.10 Inter-Plugin Services (`ctx.services`)
```python
ctx.services.register("nutrition", NutritionService(ctx))   # provider; removed on disable
svc = ctx.services.get("nutrition")                          # consumer; None if absent
```

### 4.11 API Tokens (`ctx.tokens`)
```python
token = await ctx.tokens.issue(scope="read:calendar", label="Kitchen tablet")  # shown once
await ctx.tokens.revoke(token_id)
tokens = await ctx.tokens.list()
```

### 4.12 Fetching user-supplied URLs
Use `secretsauce.net.fetch_public_text(url)` rather than calling `httpx` directly. It refuses non-http(s) URLs and any host that resolves to a private, loopback or link-local address, re-checks every redirect, and caps the response size.

---

## 5. Testing Plugins with `secretsauce.testing`

`make_kernel` boots the real kernel (the same wiring as production) against a temporary directory, completes setup and gives you an authenticated `httpx.AsyncClient`. Background services are off by default so tests control timing: deliver events with `drain_events(k)` and run jobs with `k.jobs.run_job(job_id)`. Pass `services=True` to run the event pump and job runner live.

```python
from secretsauce.testing import drain_events, make_kernel

async def test_my_plugin(tmp_path):
    async with make_kernel(tmp_path) as k:
        ctx = k.ctx_for("recipe-nutrition")
        await ctx.attributes.set("recipe", "grp1", "calories", 450.0)
        assert (await ctx.attributes.get("recipe", "grp1"))["calories"] == 450.0

        res = await k.client.post("/api/recipes", json={"title": "Soup", "language": "en"})
        assert res.status_code == 201
        events = await drain_events(k)          # handlers have now run
        assert any(e.name == "recipe:created" for e in events)
```

Plugins placed in `k.plugins_dir` before `make_kernel` are discovered at boot; call `await k.loader.discover_and_sync()` to pick up ones added later.

---

## 6. Frontend Plugin Development (`ui.js`)

Plugins can provide interactive user interface components by compiling a single ES module bundle to `ui.js` and an optional `ui.css` stylesheet in the root of the plugin directory.

### 6.1 Bundling with Vite
Plugins compile `ui.js` using Vite in library mode, externalizing shared host dependencies:

```ts
// vite.config.ts (in your plugin project)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style'
    },
    rollupOptions: {
      external: [
        'vue',
        'pinia',
        'vue-router',
        '@secretsauce/ui',
        '@secretsauce/units',
        /^primevue\//,
        /^@primevue\//,
        /^@primeuix\//
      ]
    }
  }
})
```

For workspace-managed core plugins, run the build script to compile all plugins into `ui.js` and `ui.css`:
```bash
pnpm --prefix shell build:plugins
```

Because these dependencies are externalized, plugins do not bundle their own copies of Vue, Pinia, Vue Router, or the units engine. Shared dependencies resolve at runtime through the shell's vendor import map. Plugin stylesheets are automatically injected by the shell when the plugin is active.

The frontend API remains version **1**. `shell/src/ui/install.ts` installs the host's PrimeVue controls/services and `v-tooltip` once. Reserved global tags are `Button`, `SplitButton`, `Menu`, `Dialog`, `ConfirmDialog`, `Drawer`, `Accordion`, `AccordionPanel`, `AccordionHeader`, `AccordionContent`, `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`, `InputText`, `Textarea`, `InputNumber`, `Select`, `SelectButton`, `AutoComplete`, `ToggleSwitch`, `Checkbox`, `IconField`, `InputIcon`, `Tag`, `Avatar`, `Message`, `ProgressSpinner`, `Card`, `Divider`. Use these tags directly, do not import private PrimeVue component copies or register conflicting globals. Use semantic `--p-*` tokens, not fixed theme colors. Themes are device-local: `aura-tomato`, `nora-tomato`, `material-indigo`, `lara-amber` (`ss-theme`), all in light mode.

Registered routes, slot contributions, Settings sections and UI intent components are wrapped by `shell/src/pluginContext.ts`. The wrapper provides the owning plugin's `ss` as a legacy prop and through `useSecretSauce()` from `@secretsauce/ui`. `SECRET_SAUCE_UI_KEY` is the string `__SS_UI__`; all existing string registry keys are retained across externalized bundles. Avoid cross-bundle Symbols and manual injection into a component that production never mounts.

Use `await ss.confirm({ header: 'Remove item', message: 'Remove this item?', acceptLabel: 'Remove', rejectLabel: 'Cancel', severity: 'danger' })`; false means rejected or dismissed. `ss.notify` handles toast feedback. Settings section headings belong to the host Accordion: do not repeat the section heading inside your component. Sections are reactive and removed on plugin disable; `?section=<id>` opens an existing section, and `ss-settings-open` stores open panel ids. Activation-owned stream subscriptions are cleaned up even if activation throws; component-scoped `ss.on` callbacks should additionally unsubscribe on unmount.

### 6.2 Common Shell and Plugin Slots

The shell and core domain plugins expose slot locations where plugins can contribute custom components:

| Slot Name | Provider | Context | Description |
|---|---|---|---|
| `shell.header.right` | Shell (`AppHeader.vue`) | `{}` | Header controls (e.g. `core-members` mounts `MemberPicker.vue`). |
| `recipe.card.actions` | Core Recipes (`RecipeCard.vue`) | `{ recipe }` | Action buttons; shortlist state is `recipe.is_shortlisted`. |
| `recipe.list.filters` | Core Recipes (`RecipeListPage.vue`) | `{ active, toggle }` | Shortlist filter state and toggle callback. |
| `timeline.day.actions` | Core Timeline (`TimelinePage.vue`) | `{ date }` | Header action buttons for days (e.g. quick entry shortcuts). |
| `timeline.entry.badge` | Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Status badge contributions on schedule cards (e.g. `cook-tracker` checkmark). |
| `timeline.entry.actions`| Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Contextual action buttons on scheduled meals. |
| `timeline.sidebar` | Core Timeline | `{ from, to }` | Planning widgets; collapsed accordion panels on phones. |
| `journal.entry.footer` | Cook Tracker (`JournalPage.vue`) | `{ entry }` | Metadata and rating controls on cooking journal entries (e.g. `ratings` thumbs up/down). |

### 6.3 Standard Intent Hubs

Core domain plugins establish standard intent hubs to coordinate cross-plugin workflows:

| Hub ID | Context Contract | Description |
|---|---|---|
| `entry:create` | `{ date: string, mealType?: string }` | Opens modal or workflow to plan/add a scheduled meal (recipe search, shortlist, AI suggestions). |
| `entry:interact`| `{ entry: ScheduleEntry, mealType: string }` | Meal operations with the resolved canonical slot id. |
| `recipe:create` | `{}` | Manual recipe creation and AI import. |
| `recipe:actions` | `{ recipe }` | Edit, translate and other recipe actions. |
| `timeline:assist` | Provider-dependent | Planning assistance. |
| `share:receive` | Shared content | Incoming web share workflows. |

The provider type requires `hub`, `id`, a static `title`, numeric `order`, and `kind: 'ui' | 'headless'`. UI providers require `component`; headless providers require `execute(context)`. Optional `isAvailable` hides an action; `disabledReason` keeps it visible but disabled with a tooltip. Optional `titleFor(context)` supplies contextual wording without removing the static fallback title. With no available providers a trigger is absent, one runs directly, several open an anchored Menu. UI components receive `context` and emit `resolve(result)` or `cancel`; errors remain visible and dialogs retain unsaved input.

A scoped trigger supports custom icon controls:
```vue
<IntentTrigger hub="entry:interact" :context="{ entry, mealType }" v-slot="{ open }">
  <Button icon="pi pi-ellipsis-h" aria-label="Meal actions" text @click="open" />
</IntentTrigger>
```
The recurring provider uses `titleFor` for “Repeat every <weekday>”; its browser weekday is mapped to the API's Monday-zero convention. It is unavailable for notes and entries originating from `plugin:core-recurring`.

### 6.4 The `activate(ss)` Function
The entry point of `ui.js` must default export an activation function receiving `SecretSauceUI`:

```ts
import type { SecretSauceUI } from '@secretsauce/ui'
import NutritionPage from './NutritionPage.vue'
import NutritionWidget from './NutritionWidget.vue'
import NutritionSettings from './NutritionSettings.vue'

export default function activate(ss: SecretSauceUI) {
  // 1. Register routes in sidebar / navigation
  ss.route({
    path: '/nutrition',
    component: NutritionPage,
    nav: { label: 'Nutrition', icon: 'heart', order: 40 }
  })

  // 2. Insert components into existing shell or plugin slots
  ss.slot('recipe.card.actions', NutritionWidget, { order: 10 })

  // 3. Declare a custom hub before registering its provider.
  ss.intent.hub({ id: 'recipe:analyze', title: 'Analyze recipe' })
  ss.intent.provider({
    hub: 'recipe:analyze',
    id: 'calculate-macros',
    title: 'Calculate Nutrition Macros',
    order: 10,
    kind: 'headless',
    execute: async (ctx: any) => {
      // Plugin routes live under /api/x/<plugin_id>/
      return ss.api.post(`/api/x/${ss.pluginId}/calculate`, { recipe_id: ctx.recipeId })
    }
  })

  // 4. Programmatic navigation without direct router imports
  // ss.navigate?.('/recipes')

  // 5. Register settings sections in /settings
  ss.settings.section({
    id: 'nutrition',
    title: 'Nutrition Settings',
    component: NutritionSettings
  })

  // 6. Listen to real-time events from SSE (log events and pushes, by name or prefix)
  ss.on('recipe:*', (event) => {
    console.log('Recipe event received:', event)
  })

  // 7. Shared state: live refs that follow the shell's stores
  const member = ss.store.currentMember   // Ref<Member | null>, updates when the user switches

  // 8. Toast notifications
  ss.notify({ level: 'success', message: 'Nutrition calculated' })

  // 9. Register localized strings
  ss.i18n.add('de', {
    'nutrition.title': 'Nährwerte',
    'nutrition.calories': 'Kalorien'
  })
}
```

---

## 7. Testing Frontend Plugin Components

The `@secretsauce/ui` package provides `createFakeSecretSauceUI` for unit-level tests. When a component uses host controls, mount with the real installer (`shell/tests/helpers/mountWithUi.ts`). For core plugin integration at the component level, `registeredRoute`, `registeredSlot` and `registeredIntent` in `shell/tests/helpers/registeredPlugin.ts` mount the actual registry consumer, so production context wrapping and component resolution are exercised. Mock responses must match real route serialization; mocked API tests are not end-to-end tests.

The minimal fake-context example below is only a unit test; it does not prove registration, browser globals or background delivery:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createFakeSecretSauceUI } from '@secretsauce/ui'
import MyComponent from './MyComponent.vue'

describe('MyComponent', () => {
  it('renders and calls ss.api', async () => {
    const fakeSS = createFakeSecretSauceUI('my-plugin')
    fakeSS.api.get = vi.fn().mockResolvedValue({ calories: 450 })

    const wrapper = mount(MyComponent, {
      global: {
        provide: {
          __SS_UI__: fakeSS
        }
      }
    })

    expect(wrapper.text()).toContain('Nutrition')
  })
})
```

For behavior that crosses browser/kernel boundaries, add Playwright coverage against compiled bundles; `shell/e2e/helpers/ui.ts` shares login (never import another `.e2e.ts`). Backend runtime tests must use `build_app()` plus the real lifespan and HTTP, polling for eventual state, not manually draining events/running jobs. Only event-system tests may synthesize kernel noun events. The old stub-only mounts and manual materialization tests hid missing `ss` injection, unresolved globals, duplicated subscriptions and disconnected background services. See `tests/test_ui_timeline_runtime.py`, `tests/test_ui_recurring_runtime.py`, the registered-plugin suites and `shell/e2e/ui-theme-smoke.e2e.ts` for replacement coverage.

