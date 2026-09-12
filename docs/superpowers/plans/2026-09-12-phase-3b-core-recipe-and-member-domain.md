# Phase 3B: Core Recipe & Member Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Phase 3B core plugins (`core-members`, `core-recipes`, `shortlist`) providing household member selection and settings, complete recipe browsing, structured editing, multi-language switching, serving scaling, and favorites shortlisting.

**Architecture:** Build three standard core plugins in `secretsauce/plugins/core/` adhering to Principles P2 and P3. Decouple `AppHeader` so member selection lives in `shell.header.right` via `core-members`. Implement `core-recipes` routes, hubs (`recipe:create`, `recipe:actions`), and slots (`recipe.list.filters`, `recipe.card.actions`, `recipe.detail.sidebar`, `recipe.detail.footer`). Implement `shortlist` with SQLite foreign keys, REST endpoints at `/api/x/shortlist`, and card/filter slot contributions.

**Tech Stack:** Python 3.12/3.13, FastAPI, aiosqlite, Vue 3.5, PrimeVue 4.5, Pinia 3, Vue Router 5, TypeScript 5.9, Vite 7, Vitest 4, Pytest 9.

**Spec:** `docs/superpowers/specs/2026-09-12-phase-3b-core-recipe-and-member-domain-design.md`

## Global Constraints

- Kernel contains only what every plugin must agree on; core plugins are ordinary plugins in `secretsauce/plugins/core/<id>/` (P2, P3).
- SQLite WAL mode, foreign keys enabled (`foreign_keys=ON`), plugin tables prefixed with `plugin_<plugin_id>_` (Spec 4.1, 4.2).
- All IDs are lowercase UUID v4 strings. Timestamps are ISO-8601 UTC with `Z` suffix.
- Outgoing API mutations pass `x-actor-member: <id>` when an active member is chosen.
- Plugin UI bundles are compiled ES modules served at `/api/plugins/{id}/ui.js` with `Cache-Control: public, max-age=31536000, immutable`.
- All Vitest and Pytest test suites must remain green after each task.

---

### Task 1: AppHeader Shell Decoupling

**Files:**
- Modify: `shell/src/components/AppHeader.vue`
- Test: `shell/src/components/components.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` `<Slot name="shell.header.right" />`
- Produces: Decoupled shell header with member selection delegated entirely to the slot.

- [ ] **Step 1: Write the failing test**

Edit `shell/src/components/components.spec.ts` to assert that `AppHeader` renders the household title and `<Slot name="shell.header.right" />` without rendering a hardcoded `<select class="member-select">`:

```ts
it('AppHeader renders title and delegates right section to slot', () => {
  const pinia = createPinia()
  const household = useHouseholdStore(pinia)
  household.setHousehold({ household_name: 'The Baker House' } as any)

  const wrapper = mount(AppHeader, {
    global: {
      plugins: [pinia],
      stubs: {
        Slot: {
          template: '<div class="slot-stub" :data-name="name"><slot /></div>',
          props: ['name'],
        },
      },
    },
  })

  expect(wrapper.text()).toContain('The Baker House')
  expect(wrapper.find('select.member-select').exists()).toBe(false)
  const slot = wrapper.find('.slot-stub[data-name="shell.header.right"]')
  expect(slot.exists()).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/src/components/components.spec.ts`
Expected: FAIL because `select.member-select` currently exists in `AppHeader.vue`.

- [ ] **Step 3: Write minimal implementation**

Edit `shell/src/components/AppHeader.vue` to remove the hardcoded `<select class="member-select">` and `handleMemberChange`, keeping `<Slot name="shell.header.right" />`:

```vue
<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'

const householdStore = useHouseholdStore()
</script>

<template>
  <header class="ss-app-header">
    <div class="header-left">
      <Slot name="shell.header.left" />
      <span class="household-title">{{ householdStore.household.household_name }}</span>
    </div>

    <div class="header-right">
      <Slot name="shell.header.right" />
    </div>
  </header>
</template>

<style scoped>
.ss-app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: #faf7f2;
  border-bottom: 1px solid #e7e5e4;
}
.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.household-title {
  font-weight: bold;
  font-size: 1.2em;
  color: #1c1917;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/src/components/components.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shell/src/components/AppHeader.vue shell/src/components/components.spec.ts
git commit -m "refactor(shell): decouple AppHeader member select into shell.header.right slot"
```

---

### Task 2: `core-members` Core Plugin (Backend & Frontend UI)

**Files:**
- Create: `secretsauce/plugins/core/core-members/__init__.py`
- Create: `secretsauce/plugins/core/core-members/ui/package.json`
- Create: `secretsauce/plugins/core/core-members/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-members/ui/src/MemberPicker.vue`
- Create: `secretsauce/plugins/core/core-members/ui/src/MemberSettings.vue`
- Test: `tests/test_plugin_recipes_members.py`
- Test: `shell/tests/plugins/member-picker.spec.ts`

**Interfaces:**
- Consumes: Kernel `/api/members` endpoints, `useMemberStore`, `SecretSauceUI` slot & settings section API.
- Produces: `MemberPicker.vue` in `shell.header.right`, `MemberSettings.vue` in Settings, updates `ss.store.currentMember`, `localStorage`, and default API `x-actor-member` header.

- [ ] **Step 1: Write the failing tests**

1. Create `tests/test_plugin_recipes_members.py`:
```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.anyio
async def test_core_members_discovery(tmp_path):
    kernel = await make_kernel(tmp_path, plugins=["core-members"])
    active = await kernel.plugins.list_active()
    assert any(p["id"] == "core-members" for p in active)
    assert kernel.ctx_for("core-members") is not None
```

2. Create `shell/tests/plugins/member-picker.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MemberPicker from '../../../secretsauce/plugins/core/core-members/ui/src/MemberPicker.vue'
import { useMemberStore } from '../../src/stores/member'

describe('MemberPicker', () => {
  it('renders active member avatar and changes current member on select', async () => {
    const pinia = createPinia()
    const memberStore = useMemberStore(pinia)
    memberStore.setMembers([
      { id: 'm1', name: 'Alice', avatar_color: '#ef4444' } as any,
      { id: 'm2', name: 'Bob', avatar_color: '#3b82f6' } as any,
    ])
    memberStore.setCurrentMember('m1')

    const mockApi = {
      setDefaultHeader: vi.fn(),
    }

    const wrapper = mount(MemberPicker, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    expect(wrapper.find('.member-avatar').text()).toBe('A')
    const select = wrapper.find('select.member-select')
    await select.setValue('m2')

    expect(memberStore.currentMember?.id).toBe('m2')
    expect(localStorage.getItem('secretsauce:current_member_id')).toBe('m2')
    expect(mockApi.setDefaultHeader).toHaveBeenCalledWith('x-actor-member', 'm2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_plugin_recipes_members.py`
Expected: FAIL because plugin `core-members` does not exist yet.
Run: `pnpm --prefix shell test shell/tests/plugins/member-picker.spec.ts`
Expected: FAIL because component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

1. Create `secretsauce/plugins/core/core-members/__init__.py`:
```python
PLUGIN = {
    "id": "core-members",
    "name": "Household Members",
    "version": "1.0.0",
    "description": "Household member switching, active context, and profile management",
    "core": True,
    "ui": "ui.js",
}

async def setup(ctx):
    pass
```

2. Create `secretsauce/plugins/core/core-members/ui/package.json`:
```json
{
  "name": "@secretsauce/plugin-core-members",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

3. Create `secretsauce/plugins/core/core-members/ui/src/MemberPicker.vue`:
```vue
<script setup lang="ts">
import { inject } from 'vue'
import { useMemberStore } from '../../../../../shell/src/stores/member'

const memberStore = useMemberStore()
const api = inject<any>('__SS_API__')

function onMemberChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const id = target.value
  if (!id) return
  memberStore.setCurrentMember(id)
  localStorage.setItem('secretsauce:current_member_id', id)
  if (api && typeof api.setDefaultHeader === 'function') {
    api.setDefaultHeader('x-actor-member', id)
  }
}
</script>

<template>
  <div class="ss-member-picker">
    <div
      v-if="memberStore.currentMember"
      class="member-avatar"
      :style="{ backgroundColor: memberStore.currentMember.avatar_color || '#0284c7' }"
    >
      {{ memberStore.currentMember.name.slice(0, 1).toUpperCase() }}
    </div>
    <select
      class="member-select"
      :value="memberStore.currentMember?.id"
      @change="onMemberChange"
    >
      <option
        v-for="m in memberStore.members"
        :key="m.id"
        :value="m.id"
      >
        {{ m.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.ss-member-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
}
.member-select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #d6d3d1;
  background: white;
}
</style>
```

4. Create `secretsauce/plugins/core/core-members/ui/src/MemberSettings.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
import { useMemberStore } from '../../../../../shell/src/stores/member'

const memberStore = useMemberStore()
const api = inject<any>('__SS_API__')

const showAddModal = ref(false)
const newName = ref('')
const newLanguage = ref('en')
const newColor = ref('#0284c7')
const newServingRatio = ref(1.0)
const newRestrictions = ref('')
const newAllergies = ref('')

async function createMember() {
  if (!newName.value.trim() || !api) return
  const payload = {
    name: newName.value.trim(),
    preferred_language: newLanguage.value,
    avatar_color: newColor.value,
    serving_ratio: Number(newServingRatio.value) || 1.0,
    dietary_restrictions: newRestrictions.value.split(',').map(s => s.trim()).filter(Boolean),
    allergies: newAllergies.value.split(',').map(s => s.trim()).filter(Boolean),
  }
  const created = await api.post('/api/members', payload)
  memberStore.addMember(created)
  newName.value = ''
  newRestrictions.value = ''
  newAllergies.value = ''
  showAddModal.value = false
}

async function deleteMember(id: string, revision: number) {
  if (!confirm('Are you sure you want to remove this member?') || !api) return
  await api.delete(`/api/members/${id}?revision=${revision}`)
  memberStore.removeMember(id)
}
</script>

<template>
  <div class="ss-member-settings">
    <div class="header-row">
      <p class="description">Manage profiles, preferences, and dietary restrictions for household members.</p>
      <button class="btn-primary" @click="showAddModal = true">+ Add Member</button>
    </div>

    <div class="members-grid">
      <div v-for="m in memberStore.members" :key="m.id" class="member-card">
        <div class="member-card-header">
          <div class="avatar" :style="{ backgroundColor: m.avatar_color || '#0284c7' }">
            {{ m.name.slice(0, 1).toUpperCase() }}
          </div>
          <div>
            <strong>{{ m.name }}</strong>
            <div class="subtext">Lang: {{ m.preferred_language }} · Ratio: {{ m.serving_ratio }}x</div>
          </div>
          <button class="btn-danger" @click="deleteMember(m.id, m.revision)">Delete</button>
        </div>
        <div class="tags" v-if="m.dietary_restrictions?.length || m.allergies?.length">
          <span v-for="tag in m.dietary_restrictions" :key="tag" class="tag tag-dietary">{{ tag }}</span>
          <span v-for="tag in m.allergies" :key="tag" class="tag tag-allergy">Allergy: {{ tag }}</span>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-backdrop">
      <div class="modal">
        <h3>Add Household Member</h3>
        <div class="form-group">
          <label>Name</label>
          <input v-model="newName" type="text" placeholder="Name" class="input" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Language</label>
            <input v-model="newLanguage" type="text" placeholder="en, de, etc." class="input" />
          </div>
          <div class="form-group">
            <label>Serving Ratio</label>
            <input v-model="newServingRatio" type="number" step="0.1" min="0.1" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>Avatar Color</label>
          <input v-model="newColor" type="color" class="color-picker" />
        </div>
        <div class="form-group">
          <label>Dietary Restrictions (comma-separated)</label>
          <input v-model="newRestrictions" type="text" placeholder="vegetarian, gluten-free" class="input" />
        </div>
        <div class="form-group">
          <label>Allergies (comma-separated)</label>
          <input v-model="newAllergies" type="text" placeholder="nuts, dairy" class="input" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
          <button class="btn-primary" @click="createMember">Save Member</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-member-settings { margin-top: 12px; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.description { color: #57534e; margin: 0; }
.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.member-card { border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px; background: white; }
.member-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.subtext { font-size: 0.85em; color: #78716c; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag { font-size: 0.75em; padding: 2px 6px; border-radius: 4px; }
.tag-dietary { background: #e0f2fe; color: #0369a1; }
.tag-allergy { background: #fee2e2; color: #b91c1c; }
.btn-primary { background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #f5f5f4; border: 1px solid #d6d3d1; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.btn-danger { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; padding: 4px 8px; border-radius: 4px; margin-left: auto; cursor: pointer; font-size: 0.8em; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 24px; border-radius: 8px; width: 420px; max-width: 90vw; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 0.85em; font-weight: 500; margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.input { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; box-sizing: border-box; }
.color-picker { width: 100%; height: 36px; border: 1px solid #d6d3d1; border-radius: 4px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
```

5. Create `secretsauce/plugins/core/core-members/ui/src/index.ts`:
```ts
import MemberPicker from './MemberPicker.vue'
import MemberSettings from './MemberSettings.vue'

export default function activate(ss: any) {
  ss.slot('shell.header.right', MemberPicker, { order: 10 })
  ss.settings.section({
    id: 'members',
    title: 'Household Members',
    component: MemberSettings,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_plugin_recipes_members.py`
Expected: PASS
Run: `pnpm --prefix shell test shell/tests/plugins/member-picker.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-members/ tests/test_plugin_recipes_members.py shell/tests/plugins/member-picker.spec.ts
git commit -m "feat(members): implement core-members plugin with header picker and settings section"
```

---

### Task 3: `shortlist` Backend Plugin & SQLite Migration

**Files:**
- Create: `secretsauce/plugins/core/shortlist/__init__.py`
- Create: `secretsauce/plugins/core/shortlist/migrations/0001_initial.sql`
- Test: `tests/test_plugin_shortlist.py`

**Interfaces:**
- Consumes: `aiosqlite`, `FastAPI` APIRouter, `PluginContext`.
- Produces: `plugin_shortlist_entries` table, REST endpoints `GET /api/x/shortlist`, `POST /api/x/shortlist`, `DELETE /api/x/shortlist/{recipe_id}`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_plugin_shortlist.py`:
```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.anyio
async def test_shortlist_crud_and_cascade(tmp_path):
    kernel = await make_kernel(tmp_path, plugins=["core-members", "core-recipes", "shortlist"])
    client = kernel.client

    # 1. Create member & recipe
    mem_res = await client.post("/api/members", json={"name": "Sarah", "preferred_language": "en"})
    assert mem_res.status_code == 201
    member_id = mem_res.json()["id"]

    rec_res = await client.post("/api/recipes", json={
        "title": "Pasta Primavera",
        "language": "en",
        "ingredients": [],
        "steps": [],
        "servings": 2,
    })
    assert rec_res.status_code == 201
    recipe_id = rec_res.json()["id"]

    # 2. Add to shortlist
    add_res = await client.post(
        "/api/x/shortlist",
        json={"recipe_id": recipe_id, "note": "Favorite weeknight dinner"},
        headers={"x-actor-member": member_id},
    )
    assert add_res.status_code == 201
    assert add_res.json()["recipe_id"] == recipe_id

    # 3. List shortlist
    list_res = await client.get("/api/x/shortlist", headers={"x-actor-member": member_id})
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["recipe_id"] == recipe_id

    # 4. Cascade deletion on recipe delete
    del_res = await client.delete(f"/api/recipes/{recipe_id}")
    assert del_res.status_code == 204

    list_after = await client.get("/api/x/shortlist", headers={"x-actor-member": member_id})
    assert len(list_after.json()) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_shortlist.py`
Expected: FAIL because `shortlist` plugin is not yet created.

- [ ] **Step 3: Write minimal implementation**

1. Create `secretsauce/plugins/core/shortlist/migrations/0001_initial.sql`:
```sql
CREATE TABLE plugin_shortlist_entries (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    note TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_plugin_shortlist_member_recipe ON plugin_shortlist_entries(member_id, recipe_id);
```

2. Create `secretsauce/plugins/core/shortlist/__init__.py`:
```python
from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Query, Request
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "shortlist",
    "name": "Recipe Shortlist",
    "version": "1.0.0",
    "description": "Quick favorites and shortlisted meals per household member",
    "core": True,
    "schema": 1,
    "dependencies": ["core-recipes", "core-members"],
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/shortlist", tags=["shortlist"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("")
async def list_shortlist(
    request: Request,
    member_id: str | None = Query(None),
) -> list[dict[str, Any]]:
    kernel = request.app.state.kernel
    target_member = member_id or request.headers.get("x-actor-member")

    if target_member:
        rows = await kernel.db.read_all(
            """SELECT s.id, s.member_id, s.recipe_id, s.note, s.created_at, r.title as recipe_title
               FROM plugin_shortlist_entries s
               JOIN recipes r ON s.recipe_id = r.id
               WHERE s.member_id = ?
               ORDER BY s.created_at DESC;""",
            (target_member,),
        )
    else:
        rows = await kernel.db.read_all(
            """SELECT s.id, s.member_id, s.recipe_id, s.note, s.created_at, r.title as recipe_title
               FROM plugin_shortlist_entries s
               JOIN recipes r ON s.recipe_id = r.id
               ORDER BY s.created_at DESC;"""
        )
    return [dict(row) for row in rows]


@router.post("", status_code=201)
async def add_to_shortlist(data: dict[str, Any], request: Request) -> dict[str, Any]:
    kernel = request.app.state.kernel
    member_id = data.get("member_id") or request.headers.get("x-actor-member")
    if not member_id:
        raise HTTPException(status_code=400, detail="Missing member_id")

    recipe_id = data["recipe_id"]
    try:
        await kernel.recipes.get_recipe(recipe_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Recipe not found")

    entry_id = str(uuid.uuid4()).lower()
    now = _now_iso()
    note = data.get("note")

    await kernel.db.write(
        """INSERT INTO plugin_shortlist_entries (id, member_id, recipe_id, note, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(member_id, recipe_id) DO UPDATE SET note = excluded.note;""",
        (entry_id, member_id, recipe_id, note, now),
    )
    return {
        "id": entry_id,
        "member_id": member_id,
        "recipe_id": recipe_id,
        "note": note,
        "created_at": now,
    }


@router.delete("/{recipe_id}", status_code=204)
async def remove_from_shortlist(recipe_id: str, request: Request):
    kernel = request.app.state.kernel
    member_id = request.headers.get("x-actor-member")
    if not member_id:
        await kernel.db.write("DELETE FROM plugin_shortlist_entries WHERE recipe_id = ?;", (recipe_id,))
    else:
        await kernel.db.write(
            "DELETE FROM plugin_shortlist_entries WHERE recipe_id = ? AND member_id = ?;",
            (recipe_id, member_id),
        )


async def setup(ctx: PluginContext):
    ctx.app.include_router(router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_shortlist.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/shortlist/ tests/test_plugin_shortlist.py
git commit -m "feat(shortlist): implement shortlist plugin with SQLite schema and REST endpoints"
```

---

### Task 4: `shortlist` Frontend UI Bundle

**Files:**
- Create: `secretsauce/plugins/core/shortlist/ui/package.json`
- Create: `secretsauce/plugins/core/shortlist/ui/src/index.ts`
- Create: `secretsauce/plugins/core/shortlist/ui/src/ShortlistAction.vue`
- Create: `secretsauce/plugins/core/shortlist/ui/src/ShortlistFilter.vue`
- Create: `secretsauce/plugins/core/shortlist/ui/src/ShortlistSidebar.vue`
- Test: `shell/tests/plugins/shortlist.spec.ts`

**Interfaces:**
- Consumes: `ss.slot`, context `{ recipe }` on `recipe.card.actions`, `/api/x/shortlist`.
- Produces: Card star/bookmark toggle and recipe list filter chip.

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/shortlist.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ShortlistAction from '../../../secretsauce/plugins/core/shortlist/ui/src/ShortlistAction.vue'
import ShortlistFilter from '../../../secretsauce/plugins/core/shortlist/ui/src/ShortlistFilter.vue'

describe('Shortlist UI Components', () => {
  it('ShortlistAction toggles favorite state and calls API', async () => {
    const mockApi = {
      post: vi.fn().mockResolvedValue({ id: 's1' }),
      delete: vi.fn().mockResolvedValue({}),
    }

    const wrapper = mount(ShortlistAction, {
      props: {
        context: {
          recipe: { id: 'r1_en', title: 'Pancakes' },
          isShortlisted: false,
        },
      },
      global: {
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    const btn = wrapper.find('button.btn-shortlist')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/shortlist', { recipe_id: 'r1_en' })
  })

  it('ShortlistFilter renders active filter chip and emits toggle', async () => {
    const wrapper = mount(ShortlistFilter, {
      props: {
        context: {
          active: false,
        },
      },
    })

    const chip = wrapper.find('.shortlist-filter-chip')
    expect(chip.text()).toContain('Shortlist')
    await chip.trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/shortlist.spec.ts`
Expected: FAIL because components do not exist yet.

- [ ] **Step 3: Write minimal implementation**

1. Create `secretsauce/plugins/core/shortlist/ui/package.json`:
```json
{
  "name": "@secretsauce/plugin-shortlist",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

2. Create `secretsauce/plugins/core/shortlist/ui/src/ShortlistAction.vue`:
```vue
<script setup lang="ts">
import { ref, inject, watch } from 'vue'

const props = defineProps<{
  context?: {
    recipe: { id: string; title: string }
    isShortlisted?: boolean
  }
}>()

const emit = defineEmits<{
  change: [boolean]
}>()

const api = inject<any>('__SS_API__')
const favorited = ref(Boolean(props.context?.isShortlisted))

watch(() => props.context?.isShortlisted, (val) => {
  favorited.value = Boolean(val)
})

async function toggle(e: Event) {
  e.stopPropagation()
  if (!props.context?.recipe || !api) return

  const next = !favorited.value
  favorited.value = next

  try {
    if (next) {
      await api.post('/api/x/shortlist', { recipe_id: props.context.recipe.id })
    } else {
      await api.delete(`/api/x/shortlist/${props.context.recipe.id}`)
    }
    emit('change', next)
  } catch (err) {
    favorited.value = !next
  }
}
</script>

<template>
  <button
    type="button"
    class="btn-shortlist"
    :class="{ active: favorited }"
    :title="favorited ? 'Remove from shortlist' : 'Add to shortlist'"
    @click="toggle"
  >
    ★
  </button>
</template>

<style scoped>
.btn-shortlist {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #d6d3d1;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.15s, transform 0.1s;
}
.btn-shortlist:hover {
  transform: scale(1.15);
}
.btn-shortlist.active {
  color: #f59e0b;
}
</style>
```

3. Create `secretsauce/plugins/core/shortlist/ui/src/ShortlistFilter.vue`:
```vue
<script setup lang="ts">
const props = defineProps<{
  context?: {
    active?: boolean
  }
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    type="button"
    class="shortlist-filter-chip"
    :class="{ active: props.context?.active }"
    @click="emit('toggle')"
  >
    ★ Shortlist
  </button>
</template>

<style scoped>
.shortlist-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid #d6d3d1;
  background: white;
  font-size: 0.85rem;
  color: #44403c;
  cursor: pointer;
}
.shortlist-filter-chip.active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #b45309;
  font-weight: 500;
}
</style>
```

4. Create `secretsauce/plugins/core/shortlist/ui/src/ShortlistSidebar.vue`:
```vue
<script setup lang="ts">
defineProps<{
  context?: unknown
}>()
</script>

<template>
  <div class="shortlist-sidebar">
    <h4>Shortlist</h4>
  </div>
</template>
```

5. Create `secretsauce/plugins/core/shortlist/ui/src/index.ts`:
```ts
import ShortlistAction from './ShortlistAction.vue'
import ShortlistFilter from './ShortlistFilter.vue'
import ShortlistSidebar from './ShortlistSidebar.vue'

export default function activate(ss: any) {
  ss.slot('recipe.card.actions', ShortlistAction, { order: 10 })
  ss.slot('recipe.list.filters', ShortlistFilter, { order: 10 })
  ss.slot('timeline.sidebar', ShortlistSidebar, { order: 20 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/shortlist.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/shortlist/ui/ shell/tests/plugins/shortlist.spec.ts
git commit -m "feat(shortlist): implement shortlist UI bundle with card actions and filter chip"
```

---

### Task 5: `core-recipes` Backend Manifest & Sub-Components

**Files:**
- Create: `secretsauce/plugins/core/core-recipes/__init__.py`
- Create: `secretsauce/plugins/core/core-recipes/ui/package.json`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/components/IngredientRowList.vue`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/components/StepList.vue`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/components/RecipeCard.vue`
- Test: `shell/tests/plugins/recipe-components.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` `<Slot>`, `@secretsauce/units`.
- Produces: `IngredientRowList.vue` (structured rows for quantity, unit, name, notes), `StepList.vue` (steps with timers), `RecipeCard.vue` (card with thumbnail and actions slot).

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/recipe-components.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IngredientRowList from '../../../secretsauce/plugins/core/core-recipes/ui/src/components/IngredientRowList.vue'
import RecipeCard from '../../../secretsauce/plugins/core/core-recipes/ui/src/components/RecipeCard.vue'

describe('Recipe Sub-Components', () => {
  it('IngredientRowList adds and modifies rows', async () => {
    const wrapper = mount(IngredientRowList, {
      props: {
        modelValue: [
          { id: '1', quantity: 2, unit: 'cup', name: 'Flour', notes: 'all-purpose' },
        ],
      },
    })

    expect(wrapper.findAll('.ingredient-row')).toHaveLength(1)
    await wrapper.find('button.btn-add-ingredient').trigger('click')
    expect(wrapper.emitted('update:modelValue')![0][0]).toHaveLength(2)
  })

  it('RecipeCard renders title, time, and card.actions slot', () => {
    const wrapper = mount(RecipeCard, {
      props: {
        recipe: {
          id: 'r1_en',
          title: 'Lemon Cake',
          prep_time_minutes: 15,
          cook_time_minutes: 45,
          tags: ['dessert', 'baking'],
        },
      },
      global: {
        stubs: {
          Slot: {
            template: '<div class="card-actions-slot"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Lemon Cake')
    expect(wrapper.text()).toContain('15m prep')
    expect(wrapper.text()).toContain('dessert')
    expect(wrapper.find('.card-actions-slot').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-components.spec.ts`
Expected: FAIL because components do not exist yet.

- [ ] **Step 3: Write minimal implementation**

1. Create `secretsauce/plugins/core/core-recipes/__init__.py`:
```python
PLUGIN = {
    "id": "core-recipes",
    "name": "Recipes",
    "version": "1.0.0",
    "description": "Core recipe browsing, structured editing, and multi-language translations",
    "core": True,
    "ui": "ui.js",
}

async def setup(ctx):
    pass
```

2. Create `secretsauce/plugins/core/core-recipes/ui/package.json`:
```json
{
  "name": "@secretsauce/plugin-core-recipes",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

3. Create `secretsauce/plugins/core/core-recipes/ui/src/components/IngredientRowList.vue`:
```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

interface IngredientItem {
  id: string
  quantity: number | null
  quantity_max?: number | null
  unit: string | null
  name: string
  notes: string | null
}

const props = defineProps<{
  modelValue: IngredientItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [IngredientItem[]]
}>()

const rows = ref<IngredientItem[]>(props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : [])

watch(() => props.modelValue, (newVal) => {
  rows.value = newVal ? JSON.parse(JSON.stringify(newVal)) : []
}, { deep: true })

const commonUnits = [
  { id: '', label: '(none)' },
  { id: 'g', label: 'g' },
  { id: 'kg', label: 'kg' },
  { id: 'ml', label: 'ml' },
  { id: 'l', label: 'l' },
  { id: 'tsp', label: 'tsp' },
  { id: 'tbsp', label: 'tbsp' },
  { id: 'cup', label: 'cup' },
  { id: 'oz', label: 'oz' },
  { id: 'lb', label: 'lb' },
  { id: 'piece', label: 'piece' },
  { id: 'clove', label: 'clove' },
  { id: 'pinch', label: 'pinch' },
  { id: 'can', label: 'can' },
]

function addRow() {
  const newRow: IngredientItem = {
    id: String(Date.now() + Math.random()),
    quantity: 1,
    unit: 'g',
    name: '',
    notes: '',
  }
  rows.value.push(newRow)
  emit('update:modelValue', rows.value)
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emit('update:modelValue', rows.value)
}

function updateRow() {
  emit('update:modelValue', rows.value)
}

function moveUp(index: number) {
  if (index <= 0) return
  const item = rows.value.splice(index, 1)[0]
  rows.value.splice(index - 1, 0, item)
  emit('update:modelValue', rows.value)
}

function moveDown(index: number) {
  if (index >= rows.value.length - 1) return
  const item = rows.value.splice(index, 1)[0]
  rows.value.splice(index + 1, 0, item)
  emit('update:modelValue', rows.value)
}
</script>

<template>
  <div class="ingredient-row-list">
    <div class="rows-container">
      <div v-for="(row, idx) in rows" :key="row.id" class="ingredient-row">
        <div class="reorder-btns">
          <button type="button" class="btn-arrow" :disabled="idx === 0" @click="moveUp(idx)">▲</button>
          <button type="button" class="btn-arrow" :disabled="idx === rows.length - 1" @click="moveDown(idx)">▼</button>
        </div>
        <input
          v-model.number="row.quantity"
          type="number"
          step="any"
          min="0"
          placeholder="Qty"
          class="input input-qty"
          @input="updateRow"
        />
        <select v-model="row.unit" class="select-unit" @change="updateRow">
          <option v-for="u in commonUnits" :key="u.id" :value="u.id || null">{{ u.label }}</option>
        </select>
        <input
          v-model="row.name"
          type="text"
          placeholder="Ingredient name (e.g. Flour)"
          class="input input-name"
          @input="updateRow"
        />
        <input
          v-model="row.notes"
          type="text"
          placeholder="Notes (e.g. sifted)"
          class="input input-notes"
          @input="updateRow"
        />
        <button type="button" class="btn-remove" @click="removeRow(idx)" title="Remove ingredient">✕</button>
      </div>
    </div>
    <button type="button" class="btn-add-ingredient" @click="addRow">+ Add Ingredient</button>
  </div>
</template>

<style scoped>
.ingredient-row-list { display: flex; flex-direction: column; gap: 8px; }
.rows-container { display: flex; flex-direction: column; gap: 8px; }
.ingredient-row { display: flex; align-items: center; gap: 8px; }
.reorder-btns { display: flex; flex-direction: column; }
.btn-arrow { background: none; border: none; font-size: 8px; cursor: pointer; padding: 2px 4px; }
.btn-arrow:disabled { opacity: 0.3; cursor: default; }
.input { padding: 6px 8px; border: 1px solid #d6d3d1; border-radius: 4px; font-size: 0.9em; }
.input-qty { width: 70px; }
.select-unit { padding: 6px 8px; border: 1px solid #d6d3d1; border-radius: 4px; background: white; font-size: 0.9em; }
.input-name { flex: 2; }
.input-notes { flex: 1.5; }
.btn-remove { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
.btn-add-ingredient { align-self: flex-start; background: #f5f5f4; border: 1px dashed #a8a29e; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; }
.btn-add-ingredient:hover { background: #e7e5e4; }
</style>
```

4. Create `secretsauce/plugins/core/core-recipes/ui/src/components/StepList.vue`:
```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

interface StepItem {
  id: string
  instruction: string
  timer_minutes: number | null
  title?: string
}

const props = defineProps<{
  modelValue: StepItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [StepItem[]]
}>()

const steps = ref<StepItem[]>(props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : [])

watch(() => props.modelValue, (newVal) => {
  steps.value = newVal ? JSON.parse(JSON.stringify(newVal)) : []
}, { deep: true })

function addStep() {
  steps.value.push({
    id: String(Date.now() + Math.random()),
    instruction: '',
    timer_minutes: null,
  })
  emit('update:modelValue', steps.value)
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
  emit('update:modelValue', steps.value)
}

function updateSteps() {
  emit('update:modelValue', steps.value)
}
</script>

<template>
  <div class="step-list">
    <div class="steps-container">
      <div v-for="(s, idx) in steps" :key="s.id" class="step-row">
        <div class="step-num">{{ idx + 1 }}</div>
        <div class="step-inputs">
          <textarea
            v-model="s.instruction"
            rows="2"
            placeholder="Instruction details..."
            class="textarea-instruction"
            @input="updateSteps"
          />
          <div class="timer-row">
            <label>Timer (min):</label>
            <input
              v-model.number="s.timer_minutes"
              type="number"
              min="0"
              placeholder="Optional"
              class="input-timer"
              @input="updateSteps"
            />
          </div>
        </div>
        <button type="button" class="btn-remove" @click="removeStep(idx)">✕</button>
      </div>
    </div>
    <button type="button" class="btn-add-step" @click="addStep">+ Add Step</button>
  </div>
</template>

<style scoped>
.step-list { display: flex; flex-direction: column; gap: 8px; }
.steps-container { display: flex; flex-direction: column; gap: 12px; }
.step-row { display: flex; gap: 10px; align-items: flex-start; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #e7e5e4; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em; margin-top: 4px; }
.step-inputs { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.textarea-instruction { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; font-family: inherit; font-size: 0.9em; box-sizing: border-box; }
.timer-row { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: #57534e; }
.input-timer { width: 70px; padding: 4px; border: 1px solid #d6d3d1; border-radius: 4px; }
.btn-remove { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
.btn-add-step { align-self: flex-start; background: #f5f5f4; border: 1px dashed #a8a29e; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; }
.btn-add-step:hover { background: #e7e5e4; }
</style>
```

5. Create `secretsauce/plugins/core/core-recipes/ui/src/components/RecipeCard.vue`:
```vue
<script setup lang="ts">
import { Slot } from '@secretsauce/ui'

const props = defineProps<{
  recipe: {
    id: string
    title: string
    prep_time_minutes?: number | null
    cook_time_minutes?: number | null
    tags?: string[]
    cover_asset_id?: string | null
  }
}>()

const emit = defineEmits<{
  select: [string]
}>()
</script>

<template>
  <div class="recipe-card" @click="emit('select', props.recipe.id)">
    <div class="cover-image">
      <img
        v-if="props.recipe.cover_asset_id"
        :src="`/api/assets/${props.recipe.cover_asset_id}/file`"
        alt="Cover"
      />
      <div v-else class="placeholder-cover">🍲</div>
    </div>
    <div class="card-body">
      <div class="card-header">
        <h3 class="title">{{ props.recipe.title }}</h3>
        <div class="actions" @click.stop>
          <Slot name="recipe.card.actions" :context="{ recipe: props.recipe }" />
        </div>
      </div>
      <div class="meta">
        <span v-if="props.recipe.prep_time_minutes" class="meta-item">⏱ {{ props.recipe.prep_time_minutes }}m prep</span>
        <span v-if="props.recipe.cook_time_minutes" class="meta-item">🍳 {{ props.recipe.cook_time_minutes }}m cook</span>
      </div>
      <div v-if="props.recipe.tags?.length" class="tags">
        <span v-for="tag in props.recipe.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-card {
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.cover-image {
  width: 100%;
  height: 140px;
  background: #f5f5f4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder-cover { font-size: 3rem; }
.card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.title { margin: 0; font-size: 1.1em; color: #1c1917; }
.meta { display: flex; gap: 8px; font-size: 0.85em; color: #78716c; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; padding-top: 6px; }
.tag { font-size: 0.75em; background: #f5f5f4; color: #57534e; padding: 2px 6px; border-radius: 4px; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-components.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-recipes/ shell/tests/plugins/recipe-components.spec.ts
git commit -m "feat(recipes): implement recipe sub-components: IngredientRowList, StepList, and RecipeCard"
```

---

### Task 6: `core-recipes` Pages & Manifest Activator

**Files:**
- Create: `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeListPage.vue`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue`
- Create: `secretsauce/plugins/core/core-recipes/ui/src/index.ts`
- Test: `shell/tests/plugins/recipe-pages.spec.ts`

**Interfaces:**
- Consumes: `ss.route`, `ss.intent.hub`, `ss.intent.provider`, `ss.slot`, `/api/recipes`, `/api/assets`.
- Produces: Complete recipe management UI: `/recipes`, `/recipes/new`, `/recipes/:id`, `/recipes/:id/edit`, multi-language switcher, and servings scaler.

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/recipe-pages.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeDetailPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue'

describe('RecipeDetailPage', () => {
  it('scales ingredient quantities dynamically when servings are adjusted', async () => {
    const mockRecipe = {
      id: 'r1_en',
      group_id: 'grp_1',
      language: 'en',
      title: 'Crepes',
      servings: 2,
      languages: ['en', 'de'],
      ingredients: [
        { id: 'i1', quantity: 200, unit: 'g', name: 'Flour' },
        { id: 'i2', quantity: 2, unit: 'piece', name: 'Eggs' },
      ],
      steps: [{ id: 's1', instruction: 'Mix and fry' }],
    }

    const mockApi = {
      get: vi.fn().mockResolvedValue(mockRecipe),
    }

    const wrapper = mount(RecipeDetailPage, {
      props: {
        recipeId: 'r1_en',
      },
      global: {
        provide: {
          __SS_API__: mockApi,
        },
        stubs: {
          Slot: true,
          IntentTrigger: true,
        },
      },
    })

    await vi.dynamicImportSettled?.()
    // Wait for async fetch
    await new Promise(r => setTimeout(r, 10))

    expect(wrapper.text()).toContain('Crepes')
    expect(wrapper.text()).toContain('200') // base servings = 2

    // Scale up to 4 servings
    const plusBtn = wrapper.find('button.btn-scaler-plus')
    await plusBtn.trigger('click')
    expect(wrapper.text()).toContain('400') // scaled quantity = 400
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-pages.spec.ts`
Expected: FAIL because `RecipeDetailPage` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

1. Create `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { Slot, IntentTrigger } from '@secretsauce/ui'

const props = defineProps<{
  recipeId: string
}>()

const api = inject<any>('__SS_API__')
const recipe = ref<any>(null)
const currentServings = ref(2)
const checkedIngredients = ref<Record<string, boolean>>({})

async function loadRecipe() {
  if (!api || !props.recipeId) return
  recipe.value = await api.get(`/api/recipes/${props.recipeId}`)
  currentServings.value = recipe.value?.servings || 2
}

onMounted(loadRecipe)

const scaleMultiplier = computed(() => {
  if (!recipe.value || !recipe.value.servings) return 1
  return currentServings.value / recipe.value.servings
})

function scaledQuantity(qty: number | null | undefined): string {
  if (qty == null) return ''
  const val = qty * scaleMultiplier.value
  return Number.isInteger(val) ? String(val) : val.toFixed(1)
}

function scaleDown() {
  if (currentServings.value > 1) currentServings.value -= 1
}

function scaleUp() {
  currentServings.value += 1
}
</script>

<template>
  <div v-if="recipe" class="recipe-detail-page">
    <div class="lang-bar" v-if="recipe.languages?.length > 1">
      <span class="lang-label">Languages:</span>
      <button
        v-for="l in recipe.languages"
        :key="l"
        class="lang-tab"
        :class="{ active: l === recipe.language }"
        @click="$emit('switchLanguage', `${recipe.group_id}_${l}`)"
      >
        {{ l.toUpperCase() }}
      </button>
      <button class="btn-add-translation" @click="$emit('addTranslation', recipe)">+ Add Translation</button>
    </div>

    <div class="detail-header">
      <div>
        <h1 class="recipe-title">{{ recipe.title }}</h1>
        <p v-if="recipe.description" class="description">{{ recipe.description }}</p>
      </div>
      <div class="detail-actions">
        <IntentTrigger hub="recipe:actions" :context="{ recipe }" label="Actions" />
      </div>
    </div>

    <div class="scaler-card">
      <span class="scaler-label">Servings:</span>
      <button type="button" class="btn-scaler btn-scaler-minus" @click="scaleDown">−</button>
      <span class="servings-value">{{ currentServings }}</span>
      <button type="button" class="btn-scaler btn-scaler-plus" @click="scaleUp">+</button>
    </div>

    <div class="content-grid">
      <div class="ingredients-section">
        <h3>Ingredients</h3>
        <ul class="ingredient-checklist">
          <li v-for="ing in recipe.ingredients" :key="ing.id" class="ingredient-item">
            <label>
              <input type="checkbox" v-model="checkedIngredients[ing.id]" />
              <span :class="{ struck: checkedIngredients[ing.id] }">
                <strong>{{ scaledQuantity(ing.quantity) }}</strong>
                <span v-if="ing.unit"> {{ ing.unit }}</span>
                <span> {{ ing.name }}</span>
                <span v-if="ing.notes" class="notes"> ({{ ing.notes }})</span>
              </span>
            </label>
          </li>
        </ul>
      </div>

      <div class="steps-section">
        <h3>Instructions</h3>
        <ol class="steps-list">
          <li v-for="(s, idx) in recipe.steps" :key="s.id" class="step-item">
            <div class="step-text">{{ s.instruction }}</div>
            <div v-if="s.timer_minutes" class="timer-badge">⏱ {{ s.timer_minutes }} min</div>
          </li>
        </ol>
      </div>
    </div>

    <Slot name="recipe.detail.sidebar" :context="{ recipe }" />
    <Slot name="recipe.detail.footer" :context="{ recipe }" />
  </div>
</template>

<style scoped>
.recipe-detail-page { padding: 24px; max-width: 900px; margin: 0 auto; }
.lang-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.lang-label { font-size: 0.85em; color: #78716c; }
.lang-tab { padding: 4px 10px; border: 1px solid #d6d3d1; background: white; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
.lang-tab.active { background: #0284c7; color: white; border-color: #0284c7; }
.btn-add-translation { background: transparent; border: 1px dashed #0284c7; color: #0284c7; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.recipe-title { margin: 0; font-size: 2em; }
.description { color: #57534e; margin-top: 6px; }
.scaler-card { display: inline-flex; align-items: center; gap: 8px; background: #f5f5f4; padding: 8px 16px; border-radius: 8px; margin-bottom: 24px; }
.btn-scaler { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #d6d3d1; background: white; font-weight: bold; cursor: pointer; }
.servings-value { font-size: 1.1em; font-weight: bold; width: 20px; text-align: center; }
.content-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; }
.ingredient-checklist { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ingredient-item label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.struck { text-decoration: line-through; opacity: 0.6; }
.notes { color: #78716c; font-size: 0.9em; }
.steps-list { padding-left: 20px; display: flex; flex-direction: column; gap: 16px; }
.step-item { line-height: 1.5; }
.timer-badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 0.8em; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
</style>
```

2. Create `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import IngredientRowList from '../components/IngredientRowList.vue'
import StepList from '../components/StepList.vue'

const props = defineProps<{
  recipeId?: string
}>()

const api = inject<any>('__SS_API__')

const title = ref('')
const description = ref('')
const language = ref('en')
const servings = ref(2)
const prepTime = ref<number | null>(null)
const cookTime = ref<number | null>(null)
const tags = ref('')
const coverAssetId = ref<string | null>(null)
const ingredients = ref<any[]>([])
const steps = ref<any[]>([])
const revision = ref(1)

onMounted(async () => {
  if (props.recipeId && api) {
    const existing = await api.get(`/api/recipes/${props.recipeId}`)
    title.value = existing.title || ''
    description.value = existing.description || ''
    language.value = existing.language || 'en'
    servings.value = existing.servings || 2
    prepTime.value = existing.prep_time_minutes || null
    cookTime.value = existing.cook_time_minutes || null
    tags.value = (existing.tags || []).join(', ')
    coverAssetId.value = existing.cover_asset_id || null
    ingredients.value = existing.ingredients || []
    steps.value = existing.steps || []
    revision.value = existing.revision || 1
  }
})

async function onImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !api) return
  const form = new FormData()
  form.append('file', file)
  form.append('entity_type', 'recipe')
  form.append('slot', 'cover')
  const res = await api.upload('/api/assets', form)
  coverAssetId.value = res.id
}

async function save() {
  if (!title.value.trim() || !api) return
  const payload = {
    title: title.value.trim(),
    description: description.value.trim(),
    language: language.value,
    servings: Number(servings.value) || 2,
    prep_time_minutes: prepTime.value ? Number(prepTime.value) : null,
    cook_time_minutes: cookTime.value ? Number(cookTime.value) : null,
    tags: tags.value.split(',').map(t => t.trim()).filter(Boolean),
    cover_asset_id: coverAssetId.value,
    ingredients: ingredients.value,
    steps: steps.value,
  }

  if (props.recipeId) {
    await api.patch(`/api/recipes/${props.recipeId}`, { ...payload, revision: revision.value })
  } else {
    await api.post('/api/recipes', payload)
  }
}
</script>

<template>
  <div class="recipe-edit-page">
    <h2>{{ props.recipeId ? 'Edit Recipe' : 'New Recipe' }}</h2>
    <div class="form-section">
      <div class="form-group">
        <label>Title</label>
        <input v-model="title" type="text" placeholder="Recipe Title" class="input" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="description" rows="2" placeholder="Brief description..." class="textarea" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Language</label>
          <input v-model="language" type="text" class="input" />
        </div>
        <div class="form-group">
          <label>Servings</label>
          <input v-model.number="servings" type="number" min="1" class="input" />
        </div>
        <div class="form-group">
          <label>Prep Time (m)</label>
          <input v-model.number="prepTime" type="number" min="0" class="input" />
        </div>
        <div class="form-group">
          <label>Cook Time (m)</label>
          <input v-model.number="cookTime" type="number" min="0" class="input" />
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input v-model="tags" type="text" placeholder="dinner, quick, italian" class="input" />
      </div>
      <div class="form-group">
        <label>Cover Image</label>
        <input type="file" accept="image/*" @change="onImageUpload" />
      </div>
    </div>

    <div class="editor-section">
      <h3>Ingredients</h3>
      <IngredientRowList v-model="ingredients" />
    </div>

    <div class="editor-section">
      <h3>Instructions</h3>
      <StepList v-model="steps" />
    </div>

    <div class="actions-row">
      <button class="btn-primary" @click="save">Save Recipe</button>
    </div>
  </div>
</template>

<style scoped>
.recipe-edit-page { padding: 24px; max-width: 800px; margin: 0 auto; }
.form-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.form-group label { display: block; font-size: 0.85em; font-weight: 500; margin-bottom: 4px; }
.input, .textarea { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; box-sizing: border-box; }
.form-row { display: flex; gap: 12px; }
.editor-section { margin-bottom: 24px; }
.actions-row { display: flex; justify-content: flex-end; margin-top: 24px; }
.btn-primary { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 500; cursor: pointer; }
</style>
```

3. Create `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeListPage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { Slot, IntentTrigger } from '@secretsauce/ui'
import RecipeCard from '../components/RecipeCard.vue'

const api = inject<any>('__SS_API__')
const recipes = ref<any[]>([])
const search = ref('')
const activeTag = ref<string | null>(null)
const sortBy = ref('title')

async function loadRecipes() {
  if (!api) return
  const res = await api.get('/api/recipes', { params: { q: search.value || undefined } })
  recipes.value = res.items || []
}

onMounted(loadRecipes)

const allTags = computed(() => {
  const set = new Set<string>()
  for (const r of recipes.value) {
    for (const t of r.tags || []) set.add(t)
  }
  return Array.from(set)
})

const filteredRecipes = computed(() => {
  let list = [...recipes.value]
  if (activeTag.value) {
    list = list.filter(r => r.tags?.includes(activeTag.value))
  }
  if (sortBy.value === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy.value === 'prep') {
    list.sort((a, b) => (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0))
  }
  return list
})
</script>

<template>
  <div class="recipe-list-page">
    <div class="intent-header-bar">
      <div class="search-box">
        <input
          v-model="search"
          type="search"
          placeholder="Search recipes (trigram FTS)..."
          class="input-search"
          @input="loadRecipes"
        />
      </div>
      <div class="intent-area">
        <IntentTrigger hub="recipe:create" label="+ Add / Import Recipe" />
      </div>
    </div>

    <div class="filter-sort-bar">
      <Slot name="recipe.list.filters" />
      <div class="tag-chips" v-if="allTags.length">
        <button
          v-for="t in allTags"
          :key="t"
          class="tag-chip"
          :class="{ active: activeTag === t }"
          @click="activeTag = activeTag === t ? null : t"
        >
          {{ t }}
        </button>
      </div>
      <select v-model="sortBy" class="select-sort">
        <option value="title">Title (A-Z)</option>
        <option value="prep">Prep time</option>
      </select>
    </div>

    <div v-if="filteredRecipes.length" class="recipes-grid">
      <RecipeCard
        v-for="r in filteredRecipes"
        :key="r.id"
        :recipe="r"
        @select="(id) => $emit('openRecipe', id)"
      />
    </div>

    <div v-else class="empty-banner">
      <h3>No recipes found</h3>
      <p>Start your household cookbook by adding your first recipe!</p>
      <IntentTrigger hub="recipe:create" label="+ Add / Import Recipe" />
    </div>
  </div>
</template>

<style scoped>
.recipe-list-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.intent-header-bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.search-box { flex: 1; }
.input-search { width: 100%; padding: 10px 14px; border: 1px solid #d6d3d1; border-radius: 8px; font-size: 1rem; }
.filter-sort-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.tag-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tag-chip { padding: 4px 10px; border-radius: 9999px; border: 1px solid #d6d3d1; background: white; font-size: 0.85em; cursor: pointer; }
.tag-chip.active { background: #0284c7; color: white; border-color: #0284c7; }
.select-sort { padding: 6px 12px; border: 1px solid #d6d3d1; border-radius: 6px; background: white; margin-left: auto; }
.recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.empty-banner { text-align: center; padding: 48px; border: 2px dashed #e7e5e4; border-radius: 12px; background: #fafaf9; }
</style>
```

4. Create `secretsauce/plugins/core/core-recipes/ui/src/index.ts`:
```ts
import RecipeListPage from './pages/RecipeListPage.vue'
import RecipeDetailPage from './pages/RecipeDetailPage.vue'
import RecipeEditPage from './pages/RecipeEditPage.vue'

export default function activate(ss: any) {
  // Routes
  ss.route({ path: '/recipes', component: RecipeListPage, nav: { label: 'Recipes', icon: 'book', order: 10 } })
  ss.route({ path: '/recipes/new', component: RecipeEditPage })
  ss.route({ path: '/recipes/:id', component: RecipeDetailPage })
  ss.route({ path: '/recipes/:id/edit', component: RecipeEditPage })

  // Hubs
  ss.intent.hub({ id: 'recipe:create', title: 'Add or Import Recipe' })
  ss.intent.provider({
    hub: 'recipe:create',
    id: 'manual',
    title: 'Manual Recipe',
    order: 100,
    kind: 'headless',
    execute: () => {
      window.location.hash = '#/recipes/new'
    },
  })

  ss.intent.hub({ id: 'recipe:actions', title: 'Recipe Actions' })
  ss.intent.provider({
    hub: 'recipe:actions',
    id: 'edit',
    title: 'Edit',
    order: 10,
    kind: 'headless',
    execute: (ctx: any) => {
      if (ctx?.recipe?.id) {
        window.location.hash = `#/recipes/${ctx.recipe.id}/edit`
      }
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-pages.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-recipes/ shell/tests/plugins/recipe-pages.spec.ts
git commit -m "feat(recipes): implement recipe pages: list with intent area, detail with scaler, and structured edit"
```

---

### Task 7: Plugin UI Bundling & Serving Pipeline

**Files:**
- Modify: `shell/scripts/build-plugins.ts`
- Test: `tests/test_plugin_recipes_members.py`

**Interfaces:**
- Consumes: `shell/scripts/build-plugins.ts`, Rollup/Vite.
- Produces: `ui.js` bundles under `secretsauce/plugins/core/{core-members,core-recipes,shortlist}/` served at `/api/plugins/{id}/ui.js`.

- [ ] **Step 1: Write the failing test**

Add UI route serving checks to `tests/test_plugin_recipes_members.py`:
```python
@pytest.mark.anyio
async def test_plugin_ui_bundle_serving(tmp_path):
    kernel = await make_kernel(tmp_path, plugins=["core-members", "core-recipes", "shortlist"])
    client = kernel.client

    for pid in ["core-members", "core-recipes", "shortlist"]:
        res = await client.get(f"/api/plugins/{pid}/ui.js")
        assert res.status_code == 200
        assert "application/javascript" in res.headers["content-type"]
        assert "public, max-age=31536000, immutable" in res.headers["cache-control"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_recipes_members.py`
Expected: FAIL because `ui.js` files are not built yet.

- [ ] **Step 3: Run the plugin build script**

Run: `pnpm --prefix shell build:plugins`
Expected: Builds `core-members/ui/dist`, `core-recipes/ui/dist`, and `shortlist/ui/dist`, copying each bundle to `ui.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_recipes_members.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/ shell/scripts/build-plugins.ts tests/test_plugin_recipes_members.py
git commit -m "feat(plugins): bundle and verify ui.js serving for core-members, core-recipes, and shortlist"
```

---

### Task 8: End-to-End Build & Full Test Suite Verification

**Files:**
- Modify: `TODO.md`
- Test: Complete Pytest and Vitest test suites.

**Interfaces:**
- Consumes: All Phase 1, 2, 3A, and 3B deliverables.
- Produces: Green test ledger and updated project status.

- [ ] **Step 1: Run full Vitest suite**

Run: `pnpm --prefix shell test`
Expected: All tests PASS (all 15 existing test suites + new plugin tests).

- [ ] **Step 2: Run full Pytest suite**

Run: `uv run pytest`
Expected: All tests PASS (all 92 existing tests + new Phase 3B plugin tests).

- [ ] **Step 3: Run shell production build**

Run: `pnpm --prefix shell build`
Expected: Shell build succeeds, producing static assets with zero errors.

- [ ] **Step 4: Update TODO.md with Phase 3B progress**

Update `TODO.md` reflecting Phase 3B completion.

- [ ] **Step 5: Commit**

```bash
git add TODO.md
git commit -m "docs: record Phase 3B core recipes, members, and shortlist completion"
```
