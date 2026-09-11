# SecretSauce Plugin Developer Guide

This guide explains how to develop, test, and package backend plugins for the SecretSauce Kernel.

---

## 1. Plugin Directory Structure

A plugin lives in a directory under `data/plugins/<plugin-id>/` (for user or runtime plugins) or under `secretsauce/plugins/core/<plugin-id>/` (for built-in core plugins).

```text
my-plugin/
├── __init__.py          # Plugin definition and setup(ctx) entry point
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

---

## 2. Plugin Manifest (`PLUGIN`)

Every plugin defines a `PLUGIN` dictionary in its `__init__.py` (or a `manifest.json` file in the root of the plugin directory):

```python
PLUGIN = {
    "id": "recipe-nutrition",
    "name": "Recipe Nutrition Calculator",
    "version": "1.0.0",
    "schema": 1,
    "dependencies": [],
    "config_schema": {
        "api_key": {
            "type": "string",
            "title": "Nutrition Provider API Key",
            "secret": True
        },
        "default_calories": {
            "type": "number",
            "default": 500
        }
    },
    "slots": ["recipe.detail.sidebar"],
    "intents": ["nutrition:estimate"]
}
```

### Manifest Fields
| Field | Type | Description |
|---|---|---|
| `id` | `str` | Unique plugin identifier (`[a-z0-9-]+`). |
| `name` | `str` | Display name. |
| `version` | `str` | SemVer string (e.g. `1.0.0`). |
| `schema` | `int` | Database schema version integer. Migrations run when `schema > applied_schema`. |
| `dependencies` | `list[str]` | List of required plugin IDs that must be active. |
| `config_schema`| `dict` | JSON Schema for plugin settings. Fields with `"secret": True` are encrypted on disk. |
| `slots` | `list[str]` | UI slots contributed by the plugin. |
| `intents` | `list[str]` | Intent hubs or providers provided by the plugin. |

---

## 3. The `setup(ctx)` Lifecycle Function

When a plugin is activated, the kernel calls its `setup(ctx)` function, passing a sandboxed `PluginContext` instance:

```python
from secretsauce.plugins.context import PluginContext

async def setup(ctx: PluginContext) -> None:
    # Register synchronous pre-commit policy hooks
    @ctx.hook("before_recipe_save")
    async def validate_recipe(tx, recipe_data, is_new):
        # Mutate or veto before commit
        if "nutrition" not in recipe_data.get("tags", []):
            recipe_data.setdefault("tags", []).append("nutrition")

    # Register event listeners
    @ctx.on("recipe:created")
    async def on_recipe_created(event):
        # Enqueue background job
        await ctx.jobs.create(
            job_type="calculate_nutrition",
            input_data={"recipe_id": event.entity_id}
        )
```

---

## 4. `PluginContext` SDK Reference

### 4.1 Scoped Entity Attributes (`ctx.attributes`)
Plugins store metadata on kernel entities without modifying kernel tables:

```python
# Store a numeric rating or nutrition value
await ctx.attributes.set("recipe", "rec_123", "calories", 450.0)

# Retrieve attributes for an entity (automatically scoped to current plugin)
attrs = await ctx.attributes.get("recipe", "rec_123")
calories = attrs.get("calories")

# Delete attribute
await ctx.attributes.delete("recipe", "rec_123", "calories")
```

### 4.2 Policy Hooks (`ctx.hook`)
Hooks execute **synchronously** inside the active SQLite transaction before changes are committed.

- **Mutation**: Mutate dictionary in place to transform data.
- **Veto**: Raise `VetoError("Reason")` to roll back the entire transaction.

Supported hook points:
- `before_recipe_save(tx, data, is_new)`
- `before_recipe_delete(tx, group_id, language)`
- `before_member_save(tx, data, is_new)`
- `before_schedule_save(tx, data, is_new)`
- `before_journal_save(tx, data, is_new)`

```python
from secretsauce.errors import VetoError

@ctx.hook("before_member_save")
async def check_member_name(tx, member_data, is_new):
    if member_data.get("name") == "Admin":
        raise VetoError("The name 'Admin' is reserved.")
```

### 4.3 Background Jobs (`ctx.jobs`)
For long-running tasks:

```python
job_id = await ctx.jobs.create(
    job_type="import_recipes",
    input_data={"url": "https://example.com/recipe"}
)

# In background worker:
async for handle in ctx.jobs.run(job_id):
    await handle.set_progress(0.5, message="Parsing ingredients...")
    if await handle.is_cancelled():
        return
    await handle.set_result({"imported_count": 1})
```

### 4.4 Custom REST Endpoints (`ctx.routes` / `ctx.router`)
Plugins can mount custom FastAPI routers scoped to the `/api/x/{plugin_id}` prefix:

```python
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/x/my-plugin", tags=["my-plugin"])

@router.get("/status")
async def get_status(request: Request):
    return {"status": "operational"}

async def setup(ctx: PluginContext):
    ctx.routes.mount(router)
```

### 4.5 Invocable Commands (`ctx.command`)
Plugins can expose commands registered in the kernel's `ServiceRegistry`:

```python
async def recalculate_all(ctx: PluginContext):
    # Command implementation
    return {"updated": 42}

async def setup(ctx: PluginContext):
    ctx.command("recalculate", recalculate_all, title="Recalculate all statistics")
```

### 4.6 Cooperative Background Tasks (`ctx.background`)
Plugins can run persistent background loops managed cooperatively by the kernel:

```python
import asyncio

async def polling_worker(ctx: PluginContext):
    while True:
        try:
            await do_periodic_work()
        except asyncio.CancelledError:
            break
        except Exception as e:
            ctx.log.error(f"Worker error: {e}")
        await asyncio.sleep(3600)

async def setup(ctx: PluginContext):
    ctx.background(polling_worker(ctx))
```

### 4.7 Inter-Plugin Services (`ctx.services`)
Plugins can export services or invoke other plugins without direct imports:

```python
# Provider plugin
ctx.services.register("generate_summary", my_summary_function)

# Consumer plugin
summary_fn = ctx.services.get("generate_summary")
if summary_fn:
    result = await summary_fn(recipe_text)
```

### 4.8 API Tokens (`ctx.tokens`)
Issue dedicated bearer tokens for external webhooks or integrations:

```python
token = await ctx.tokens.issue(
    plugin_id=ctx.plugin_id,
    scope="write:recipes",
    label="External Webhook"
)
```

---

## 5. Testing Plugins with `secretsauce.testing`

The kernel provides a first-class test harness (`secretsauce.testing.make_kernel`) that sets up an ephemeral SQLite database, authenticates an `httpx.AsyncClient`, and provides full access to repositories and plugin contexts.

```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_my_plugin(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Get plugin context
        ctx = k.ctx_for("recipe-nutrition")
        
        # Test attribute storage
        await ctx.attributes.set("recipe", "rec_1", "score", 9.5)
        val = await ctx.attributes.get("recipe", "rec_1", "score")
        assert val == 9.5

        # Test authenticated REST API
        res = await k.client.get("/api/recipes")
        assert res.status_code == 200
```

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
      fileName: () => 'ui.js'
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

For workspace-managed core plugins, run the build script to compile all plugins into `ui.js`:
```bash
pnpm --prefix shell build:plugins
```

Because these dependencies are externalized, plugins do not bundle their own copies of Vue, PrimeVue, or the units engine. Shared dependencies resolve at runtime through the shell's vendor import map.

### 6.2 The `activate(ss)` Function
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
  ss.slot('recipe.detail.sidebar', NutritionWidget, { order: 10 })

  // 3. Register intent providers (e.g. handle shared content or calculations)
  ss.intent.provider({
    hub: 'recipe:analyze',
    id: 'calculate-macros',
    title: 'Calculate Nutrition Macros',
    kind: 'action',
    action: async (ctx) => {
      return ss.api.post(`/api/plugins/${ss.pluginId}/calculate`, { recipe_id: ctx.recipeId })
    }
  })

  // 4. Register settings sections in /settings
  ss.settings.section({
    id: 'nutrition',
    title: 'Nutrition Settings',
    component: NutritionSettings
  })

  // 5. Listen to real-time events from SSE
  ss.on('recipe:*', (event) => {
    console.log('Recipe event received:', event)
  })

  // 6. Register localized strings
  ss.i18n.add('de', {
    'nutrition.title': 'Nährwerte',
    'nutrition.calories': 'Kalorien'
  })
}
```

---

## 7. Testing Frontend Plugin Components

The `@secretsauce/ui` package provides a test harness (`createFakeSecretSauceUI`) for unit testing plugin components in Vitest / Jest:

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

