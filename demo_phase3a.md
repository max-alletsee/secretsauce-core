# Phase 3A: Units Engine & Stage 6 Core Plugins

*2026-09-11T21:37:19Z by Showboat 0.6.1*
<!-- showboat-id: df52f96b-73bf-4fa2-ab54-e21c27b49067 -->

## Overview

Phase 3A introduces the SecretSauce Units Engine (Python backend and browser `@secretsauce/units`), core plugin discovery from `secretsauce/plugins/core/`, plugin UI bundle serving pipeline, and two core Stage 6 plugins: `units` and `recurring`.

### 1. Ingredient Parsing and Canonicalization

The `secretsauce.units` package loads dimensional definitions from `units.json` and parses ingredient strings containing vulgar fractions, compound fractions, unit aliases, ranges, notes, and subjective amounts.

```bash
uv run python -X utf8 -c "
from secretsauce.units import parse

examples = [
    '1 ½ cups all-purpose flour',
    '2 3/4 tbsp olive oil',
    '2-3 cloves garlic, minced',
    'pinch of kosher salt',
    '500 g chopped tomatoes',
]

for ex in examples:
    p = parse(ex)
    print(f'{ex:30} -> qty: {str(p[\"quantity\"]):5} unit: {str(p[\"unit\"]):10} name: {p[\"name\"]}')
"

```

```output
1 ½ cups all-purpose flour     -> qty: 1.5   unit: cup        name: all-purpose flour
2 3/4 tbsp olive oil           -> qty: 2.75  unit: tbsp       name: olive oil
2-3 cloves garlic, minced      -> qty: 2.0   unit: clove      name: garlic
pinch of kosher salt           -> qty: None  unit: None       name: pinch of kosher salt
500 g chopped tomatoes         -> qty: 500.0 unit: g          name: chopped tomatoes
```

### 2. Unit Conversion, System Targeting & Formatting

The engine handles cross-unit conversions, temperature rounding, measurement system targeting (`metric`, `us_customary`), and localized vulgar fraction formatting.

```bash
uv run python -X utf8 -c "
from secretsauce.units import convert, to_system, format

print('2 cups to ml:        ', convert(2, 'cup', 'ml'))
print('350 F to C:          ', convert(350, 'f', 'c'))
print('format 1.25 cups (US):', format(1.25, None, 'cup', system='us_customary'))
print('format 250 g (metric):', format(250, None, 'g', system='metric'))
"

```

```output
2 cups to ml:         480.0
350 F to C:           175.0
format 1.25 cups (US): 1 ¼ cup
format 250 g (metric): 250 g
```

### 3. Browser Package (`@secretsauce/units`) & Dynamic Import Map

The browser environment resolves `@secretsauce/units` through the server-injected import map pointing to the vendored browser bundle.

```bash
uv run python -c "
from secretsauce.testing import Kernel
from secretsauce.api.routes.pwa import render_index_html
from pathlib import Path
import tempfile

with tempfile.TemporaryDirectory() as td:
    k = Kernel(Path(td))
    html = render_index_html(k, '/')
    for line in html.splitlines():
        if '@secretsauce' in line or 'importmap' in line:
            print(line.strip())
"

```

```output
<script type="importmap">
"@secretsauce/ui": "/static/vendor/secretsauce-ui.js",
"@secretsauce/units": "/static/vendor/secretsauce-units.js"
```

### 4. Core Plugin Search Paths & Dynamic UI Serving

The `PluginLoader` discovers core plugins from `secretsauce/plugins/core/`. Active plugins report their UI bundles on `GET /api/plugins/active`, and bundles are served directly with caching headers at `GET /api/plugins/{id}/ui.js`.

```bash
uv run python -c "
import asyncio
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            res = await k.client.get('/api/plugins/active')
            plugins = res.json()
            for p in plugins:
                print(f\"Plugin: {p['id']:12} State: {p['state']:8} UI Entry: {p.get('ui_entry')}\")

            ui_res = await k.client.get('/api/plugins/recurring/ui.js')
            print(f\"Recurring UI HTTP status: {ui_res.status_code}, content-type: {ui_res.headers.get('content-type')}, bytes: {len(ui_res.content)}\")

asyncio.run(demo())
"

```

```output
Plugin: recurring    State: active   UI Entry: /api/plugins/recurring/ui.js
Plugin: units        State: active   UI Entry: /api/plugins/units/ui.js
Recurring UI HTTP status: 200, content-type: text/javascript; charset=utf-8, bytes: 3235
```

### 5. `units` Core Plugin: Pre-commit Recipe Normalization

The `units` plugin attaches pre-commit hooks to `recipe:create` and `recipe:update`. Raw ingredient lines are automatically parsed and normalized into structured quantities and canonical units matching household preferences.

```bash
uv run python -c "
import asyncio
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            res = await k.client.post('/api/recipes', json={
                'title': 'Test Pancakes',
                'language': 'en',
                'ingredients': ['2 1/2 cups flour', '1 tbsp sugar'],
                'steps': ['Mix and fry']
            })
            recipe = res.json()
            print('Saved recipe title:', recipe['title'])
            for ing in recipe['ingredients']:
                print(f\"  - Raw: {ing['raw_text']:18} -> Qty: {ing.get('quantity')} {ing.get('unit')}\")

asyncio.run(demo())
"

```

```output
Saved recipe title: Test Pancakes
  - Raw: 2 1/2 cups flour   -> Qty: 600.0 ml
  - Raw: 1 tbsp sugar       -> Qty: 1.0 tbsp
```

### 6. `recurring` Core Plugin: Rules, Materializer & Cascade Deletion

The `recurring` plugin provides rules CRUD under `/api/x/recurring/rules`, 14-day schedule materialization, and foreign key cascade deletion when a recipe is deleted.

```bash
uv run python -c "
import asyncio
from datetime import date, timedelta
from pathlib import Path
import tempfile
from secretsauce.testing import make_kernel

async def demo():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            # 1. Create recipe
            rec = (await k.client.post('/api/recipes', json={
                'title': 'Wednesday Pasta',
                'language': 'en',
                'ingredients': ['500 g pasta'],
                'steps': ['Boil water']
            })).json()
            recipe_id = rec['id']

            # 2. Add recurring rule for Wednesday dinner
            rule = (await k.client.post('/api/x/recurring/rules', json={
                'weekday': 2,
                'meal_type': 'dinner',
                'recipe_id': recipe_id
            })).json()
            print('Created rule for recipe:', rule['recipe_title'])

            # 3. Materialize next 14 days
            mat = (await k.client.post('/api/x/recurring/materialize', json={})).json()
            print('Materialize triggered:', mat)

            # 4. Check schedule
            today = date.today()
            entries = await k.schedule.list_entries(from_date=today.isoformat(), to_date=(today + timedelta(days=14)).isoformat())
            wed_entries = [e for e in entries if e['meal_type'] == 'dinner' and e['recipe_id'] == recipe_id]
            print(f'Schedule entries created for Wednesday dinner: {len(wed_entries)}')

            # 5. Delete recipe and check rule cascade
            await k.client.delete(f\"/api/recipes/{recipe_id}?revision={rec['revision']}\")
            remaining_rules = (await k.client.get('/api/x/recurring/rules')).json()
            print(f'Remaining rules after recipe deletion: {len(remaining_rules)}')

asyncio.run(demo())
"

```

```output
Created rule for recipe: Wednesday Pasta
Materialize triggered: {'ok': True}
Schedule entries created for Wednesday dinner: 2
Remaining rules after recipe deletion: 0
```

### 7. Plugin UI Build Pipeline

The `pnpm --prefix shell build:plugins` script compiles plugin UI sources into browser ES modules and places them into each plugin's directory for serving.

```bash
pnpm --prefix shell build:plugins
```

```output

> secretsauce-shell@1.0.0 build:plugins C:\github\secretsauce-core\shell
> node scripts/build-plugins.ts

Building plugin UI for: recurring -> C:\github\secretsauce-core\secretsauce\plugins\core\recurring\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m3.24 kB[22m[1m[22m[2m │ gzip: 1.24 kB[22m
[32m✓ built in 529ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\recurring\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\recurring\ui.js
```
