# Phase 3B: Core Recipe & Member Domain, Runtime Plugin Integration, and E2E Flow

*2026-09-12T22:12:30Z by Showboat 0.6.1*
<!-- showboat-id: 6a044b5c-2da1-439a-b9df-b4808b11df8d -->

## Overview

Phase 3B implements the foundational domain plugins for SecretSauce:
- **core-members**: Decoupled member context picker in the shell header and member profile settings.
- **core-recipes**: Complete recipe management with trigram search, tag filtering, dynamic serving scaler (+ / −), structured ingredient authoring, and intent hubs.
- **shortlist**: Lightweight favorites plugin slotting into recipe cards, filter chips, and timeline drawer with SQLite foreign key cascading.
- **Runtime Browser Integration & Shared ESM Architecture**: Externalized single-instance vendor dependencies (Vue 3, Pinia, Vue Router), dynamic CSS injection, dynamic route registration, and immutable asset caching.
- **Live Playwright E2E Suite**: Full real-browser verification of member selection, recipe scaling, shortlisting, and creation flows.

### 1. Core Plugin Discovery & Registry Synchronization

The kernel's `PluginLoader` automatically discovers all core plugins located in `secretsauce/plugins/core/`, registers their manifests, runs any pending migrations, and activates them. Each plugin specifies its frontend entry point (`ui.js`) and UI capabilities.

```bash
uv run python -X utf8 -c "
import asyncio
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo_plugins():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            plugins = await k.plugins.list_plugins()
            print(f'Discovered {len(plugins)} core plugins:')
            for p in sorted(plugins, key=lambda x: x['id']):
                css = p.get('ui_css') or 'None'
                print(f\"  - [{p['id']:14}] state: {p['state']:6} | ui: {p['ui']:5} | css: {css:6} | name: {p['name']}\")

asyncio.run(demo_plugins())
"

```

```output
Discovered 5 core plugins:
  - [core-members  ] state: active | ui: ui.js | css: None   | name: Household Members
  - [core-recipes  ] state: active | ui: ui.js | css: None   | name: Recipes
  - [recurring     ] state: active | ui: ui.js | css: None   | name: Recurring Meals
  - [shortlist     ] state: active | ui: ui.js | css: None   | name: Recipe Shortlist
  - [units         ] state: active | ui: ui.js | css: None   | name: Units & Measurement
```

### 2. Shortlist Plugin: Actor Context & Foreign Key Cascading

The `shortlist` plugin provides an API at `/api/x/shortlist` where members can save recipes to their shortlist with optional notes. Mutations respect the `x-actor-member` header, and foreign keys (`ON DELETE CASCADE`) ensure shortlist entries are purged when a recipe is deleted.

```bash
uv run python -X utf8 -c "
import asyncio
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo_shortlist():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            client = k.client

            # 1. Create a member and a recipe
            m = (await client.post('/api/members', json={'name': 'Elena', 'color': '#10b981'})).json()
            r = (await client.post('/api/recipes', json={
                'title': 'Lemon Herb Salmon',
                'language': 'en',
                'servings': 4,
                'ingredients': [{'quantity': 4, 'unit': 'fillet', 'name': 'Salmon'}],
                'steps': [{'instruction': 'Pan-sear salmon in olive oil until crisp.'}]
            })).json()

            print(f\"Created Member: '{m['name']}' (UUID: {'ok' if len(m['id']) == 36 else 'err'})\")
            print(f\"Created Recipe: '{r['title']}' (UUID: {'ok' if len(r['id']) >= 36 else 'err'})\")

            # 2. Add recipe to shortlist with actor context
            add_res = await client.post(
                '/api/x/shortlist',
                json={'recipe_id': r['id'], 'note': 'Friday family dinner'},
                headers={'x-actor-member': m['id']}
            )
            print(f'Add to shortlist status: {add_res.status_code}')

            # 3. Query shortlist
            shortlist = (await client.get('/api/x/shortlist')).json()
            print(f'Shortlist contains {len(shortlist)} entry:')
            for item in shortlist:
                has_member = item['member_id'] == m['id']
                print(f\"  - Recipe: '{item['recipe_title']}' | Note: '{item['note']}' | Actor matched: {has_member}\")

            # 4. Delete the recipe and verify foreign key ON DELETE CASCADE
            del_res = await client.delete(f\"/api/recipes/{r['id']}?revision=1\")
            print(f'Delete recipe status: {del_res.status_code}')

            shortlist_after = (await client.get('/api/x/shortlist')).json()
            print(f'Shortlist count after recipe deletion: {len(shortlist_after)} (cascaded cleanly)')

asyncio.run(demo_shortlist())
"

```

```output
Created Member: 'Elena' (UUID: ok)
Created Recipe: 'Lemon Herb Salmon' (UUID: ok)
Add to shortlist status: 201
Shortlist contains 1 entry:
  - Recipe: 'Lemon Herb Salmon' | Note: 'Friday family dinner' | Actor matched: True
Delete recipe status: 204
Shortlist count after recipe deletion: 0 (cascaded cleanly)
```

### 3. Dynamic Ingredient Serving Scaler via `@secretsauce/units`

In `RecipeDetailPage.vue`, users can interactively scale servings up and down (+ / −). The frontend utilizes the browser-vendored `@secretsauce/units` bundle to recalculate and format ingredient quantities in real time according to the user's preferred measurement system.

```bash
node --input-type=module -e "
import { format } from './secretsauce/static/vendor/secretsauce-units.js';

const baseServings = 4;
const targetServings = 6;
const factor = targetServings / baseServings;

const ingredients = [
  { name: 'Flour', qty: 2, unit: 'cup' },
  { name: 'Sugar', qty: 0.5, unit: 'cup' },
  { name: 'Baking powder', qty: 1.5, unit: 'tsp' },
  { name: 'Salt', qty: 0.25, unit: 'tsp' }
];

console.log(\`Scaling ingredients from \${baseServings} to \${targetServings} servings (factor \${factor}x):\`);
for (const ing of ingredients) {
  const scaled = ing.qty * factor;
  const rendered = format(scaled, null, ing.unit, 'us_customary');
  console.log('  ' + ing.name.padEnd(16) + (ing.qty + ' ' + ing.unit).padEnd(12) + ' -> ' + rendered);
}
"

```

```output
Scaling ingredients from 4 to 6 servings (factor 1.5x):
  Flour           2 cup        -> 3 cup
  Sugar           0.5 cup      -> 0.75 cup
  Baking powder   1.5 tsp      -> 2.25 tsp
  Salt            0.25 tsp     -> 0.38 tsp
```

### 4. Shared ESM Vendor Architecture & Import Map Injection

To guarantee that dynamically loaded plugins share identical singleton instances of Vue, Pinia, and Vue Router with the host shell, the kernel injects a native browser `<script type="importmap">` during server-side HTML templating. Plugin builds externalize these dependencies so they resolve to the shell's vendored bundles at runtime.

```bash
uv run python -X utf8 -c "
from secretsauce.testing import Kernel
from secretsauce.api.routes.pwa import render_index_html
from pathlib import Path
import tempfile

with tempfile.TemporaryDirectory() as td:
    k = Kernel(Path(td))
    html = render_index_html(k, '/')
    for line in html.splitlines():
        if any(w in line for w in ['importmap', 'vue', 'pinia', 'secretsauce']):
            print(line.strip())
"

```

```output
<script type="importmap">
"vue": "/static/vendor/vue.js",
"pinia": "/static/vendor/pinia.js",
"vue-router": "/static/vendor/vue-router.js",
"@secretsauce/ui": "/static/vendor/secretsauce-ui.js",
"@secretsauce/units": "/static/vendor/secretsauce-units.js"
```

### 5. Plugin UI Bundling Pipeline

The `pnpm --prefix shell build:plugins` script compiles Vue SFC and TypeScript sources across all core plugins into standalone ES modules (`ui.js`) and extracted CSS stylesheets (`ui.css`), writing outputs directly to each plugin's directory.

```bash
pnpm --prefix shell build:plugins

```

```output

> secretsauce-shell@1.0.0 build:plugins C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\shell
> node scripts/build-plugins.ts

Building plugin UI for: core-members -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-members\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 9 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m 2.56 kB[22m[1m[22m[2m │ gzip: 0.81 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m12.06 kB[22m[1m[22m[2m │ gzip: 3.04 kB[22m
[32m✓ built in 379ms[39m
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-members\ui\dist\index.js -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-members\ui.js
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-members\ui\dist\style.css -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-members\ui.css
Building plugin UI for: core-recipes -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-recipes\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 20 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m 7.18 kB[22m[1m[22m[2m │ gzip: 1.73 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m33.55 kB[22m[1m[22m[2m │ gzip: 7.13 kB[22m
[32m✓ built in 180ms[39m
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-recipes\ui\dist\index.js -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-recipes\ui.js
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-recipes\ui\dist\style.css -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\core-recipes\ui.css
Building plugin UI for: recurring -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\recurring\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m3.09 kB[22m[1m[22m[2m │ gzip: 1.18 kB[22m
[32m✓ built in 217ms[39m
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\recurring\ui\dist\index.js -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\recurring\ui.js
Building plugin UI for: shortlist -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\shortlist\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 11 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m1.14 kB[22m[1m[22m[2m │ gzip: 0.49 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m3.60 kB[22m[1m[22m[2m │ gzip: 1.42 kB[22m
[32m✓ built in 56ms[39m
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\shortlist\ui\dist\index.js -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\shortlist\ui.js
Copied C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\shortlist\ui\dist\style.css -> C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\secretsauce\plugins\core\shortlist\ui.css
```

### 6. Plugin Static Serving & Cache-Control Differentiation

Plugin bundles are served via `/api/plugins/{id}/ui.js` and `/api/plugins/{id}/ui.css`. Requests bearing cache-busting version query parameters (`?v=...`) receive aggressive immutable caching headers (`public, max-age=31536000, immutable`), while development and unversioned requests receive `no-cache`.

```bash
uv run python -X utf8 -c "
import asyncio
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo_bundles():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            client = k.client
            for pid in ['core-members', 'core-recipes', 'shortlist']:
                res_unv = await client.get(f'/api/plugins/{pid}/ui.js')
                res_ver = await client.get(f'/api/plugins/{pid}/ui.js?v=1.0.0')
                res_css = await client.get(f'/api/plugins/{pid}/ui.css')

                print(f'Plugin [{pid:12}]:')
                print(f'  ui.js   status={res_unv.status_code} cache={res_unv.headers.get(\"cache-control\")} bytes={len(res_unv.content)}')
                print(f'  ui.js?v status={res_ver.status_code} cache={res_ver.headers.get(\"cache-control\")}')
                print(f'  ui.css  status={res_css.status_code} cache={res_css.headers.get(\"cache-control\")} bytes={len(res_css.content)}')

asyncio.run(demo_bundles())
"

```

```output
Plugin [core-members]:
  ui.js   status=200 cache=no-cache bytes=12056
  ui.js?v status=200 cache=public, max-age=31536000, immutable
  ui.css  status=200 cache=no-cache bytes=2563
Plugin [core-recipes]:
  ui.js   status=200 cache=no-cache bytes=33554
  ui.js?v status=200 cache=public, max-age=31536000, immutable
  ui.css  status=200 cache=no-cache bytes=7183
Plugin [shortlist   ]:
  ui.js   status=200 cache=no-cache bytes=3600
  ui.js?v status=200 cache=public, max-age=31536000, immutable
  ui.css  status=200 cache=no-cache bytes=1144
```

### 7. End-to-End Browser Verification (Playwright)

A live Playwright browser test launches the full backend stack and Chromium to verify the entire integrated lifecycle:
1. User logs in with household passphrase.
2. `core-members` mounts the `MemberPicker` in the header; switching active member sends `x-actor-member` headers.
3. User navigates to `/recipes` (served by `core-recipes`).
4. Recipe detail page is loaded; the interactive Serving Scaler (+ / −) is adjusted and verifies dynamic ingredient quantity recalculation.
5. User toggles the shortlist star button (`★`); the shortlist filter chip filters the recipe list dynamically.
6. The `recipe:create` intent hub is invoked; user enters structured ingredient rows (quantity, unit selector, ingredient name, notes) and instructions, saves the recipe, and is routed to the new recipe detail view.

```bash
pnpm --prefix shell test:e2e

```

```output

> secretsauce-shell@1.0.0 test:e2e C:\github\secretsauce-core\.worktrees\phase-3b-recipes-members\shell
> playwright test

[WebServer] INFO:     Started server process [24500]
[WebServer] INFO:     Waiting for application startup.
[WebServer] INFO:     Application startup complete.
[WebServer] INFO:     Uvicorn running on http://127.0.0.1:8998 (Press CTRL+C to quit)

Running 1 test using 1 worker

PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
  ok 1 [chromium] › e2e\phase-3b.e2e.ts:4:3 › Phase 3B End-to-End Browser Tests › authenticates, boots plugins, verifies member picker, recipe scaling, shortlisting, and creation (1.8s)

  1 passed (4.8s)
```
