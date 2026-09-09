# SecretSauce Plugin Developer Guide

This guide explains how to develop, test, and package backend plugins for the SecretSauce Kernel.

---

## 1. Plugin Directory Structure

A plugin lives in a directory under `/data/plugins/<plugin-id>/` (or `/app/plugins/<plugin-id>/` for built-in plugins).

```text
my-plugin/
├── __init__.py          # Plugin definition and setup(ctx) entry point
├── migrations/          # SQLite schema migrations (optional)
│   └── 0001_initial.sql
├── ui.js                # Frontend ES module bundle (for Phase 2 UI integration)
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
    @ctx.hooks.register("before_recipe_save")
    async def validate_recipe(tx, recipe_data, is_new):
        # Mutate or veto before commit
        if "nutrition" not in recipe_data.get("tags", []):
            recipe_data.setdefault("tags", []).append("nutrition")

    # Register event listeners
    @ctx.events.on("recipe:created")
    async def on_recipe_created(event):
        # Enqueue background job
        await ctx.jobs.create_job(
            plugin_id="recipe-nutrition",
            action="calculate_nutrition",
            payload={"recipe_id": event.entity_id}
        )
```

---

## 4. `PluginContext` SDK Reference

### 4.1 Scoped Entity Attributes (`ctx.attributes`)
Plugins store metadata on kernel entities without modifying kernel tables:

```python
# Store a numeric rating or nutrition value
await ctx.attributes.set("recipe", "rec_123", "calories", 450.0)

# Retrieve attribute value (automatically scoped to current plugin)
calories = await ctx.attributes.get("recipe", "rec_123", "calories")

# Delete attribute
await ctx.attributes.delete("recipe", "rec_123", "calories")
```

### 4.2 Policy Hooks (`ctx.hooks`)
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

@ctx.hooks.register("before_member_save")
async def check_member_name(tx, member_data, is_new):
    if member_data.get("name") == "Admin":
        raise VetoError("The name 'Admin' is reserved.")
```

### 4.3 Background Jobs (`ctx.jobs`)
For long-running tasks:

```python
job_id = await ctx.jobs.create_job(
    plugin_id=ctx.plugin_id,
    action="import_recipes",
    payload={"url": "https://example.com/recipe"}
)

# In background worker:
async for handle in ctx.jobs.run(job_id):
    await handle.set_progress(0.5, message="Parsing ingredients...")
    if await handle.is_cancelled():
        return
    await handle.set_result({"imported_count": 1})
```

### 4.4 Inter-Plugin Services (`ctx.services`)
Plugins can export services or invoke other plugins without direct imports:

```python
# Provider plugin
ctx.services.register("generate_summary", my_summary_function)

# Consumer plugin
summary_fn = ctx.services.get("generate_summary")
if summary_fn:
    result = await summary_fn(recipe_text)
```

### 4.5 API Tokens (`ctx.tokens`)
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
