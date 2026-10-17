# Make It Magic: AI Recipe Transformation Design

**Date:** 2026-10-17  
**Status:** Approved  
**Inspiration:** Yotam Ottolenghi's *SIMPLE* cookbook philosophy  
**Target:** SecretSauce Core (`secretsauce` backend & `shell` frontend)

---

## 1. Intent & Why

Cooking from recipes often requires adapting to circumstances: dietary restrictions, weeknight time constraints, limited pantries, or wanting an easier cleanup. Yotam Ottolenghi's *SIMPLE* cookbook categorized recipes by practical constraints:
- **S** – Short on time
- **I** – 10 ingredients or less
- **M** – Make ahead
- **P** – Pantry-led
- **L** – Lazy / simpler prep
- **E** – Easier to prepare

"Make It Magic" empowers home cooks to transform any existing recipe using AI into one that fits their immediate constraints and dietary needs, while keeping the soul, balance, and culinary integrity of the dish intact. Furthermore, home cooks can define, tweak, reorder, or delete actions and prompts to suit their household's cooking habits.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Contextual Transformation in Edit Mode:** Allow home cooks to trigger AI recipe adaptation exclusively from `RecipeEditPage` via a dedicated "Make it Magic" wand button.
- **Ottolenghi-Inspired Defaults:** Provide a built-in set of default transformation actions:
  1. *Make it vegetarian / vegan:* Swap animal proteins for plant-based substitutes while preserving umami, texture, and flavor depth.
  2. *10 ingredients or less:* Streamline and consolidate ingredient lists, combining spices and eliminating non-essential elements.
  3. *Make it fast (under 30 min):* Adjust preparation and cooking techniques to deliver the meal quickly without compromising flavor.
  4. *Make it pantry-friendly:* Swap specialty or perishable items for common pantry staples.
  5. *Easier to prepare:* Reduce dishware, knife work, and active attention required.
- **Diff & In-Place Verification:** Clearly show the AI's explanation of key modifications alongside a structured diff of ingredients, instructions, and timings. Allow manual tweaking directly before committing.
- **Dual-Save Path:**
  - *Apply to Editor:* Overwrite active form fields in `RecipeEditPage` to continue regular editing before saving the recipe revision.
  - *Save as New Recipe:* Directly persist a new recipe fork/variation (e.g., "Roasted Cauliflower (Vegetarian)") via the API, leaving the original recipe untouched.
- **Fully Configurable Prompts:** Allow households to add custom actions, edit prompts for existing actions, delete unwanted actions, reorder them, and reset to standard defaults at any time via Settings.
- **Design System Fidelity:** Maintain SecretSauce's clean PrimeVue design language, theme variables (`var(--p-surface-*)`, `var(--p-primary-color)`), PrimeIcons, and consistent typography without emoji clutter.

### Non-Goals
- Real-time collaborative multi-user editing during LLM generation.
- Full recipe version control/git-style multi-way merge trees beyond single recipe revisions or fork creation.
- Direct triggering from the read-only recipe detail view (intentionally restricted to Edit mode to keep the cooking view distraction-free).

### Anti-Goals
- Overwriting recipes without explicit user confirmation and preview.
- Destructive edits that lose original ingredient units or quantities without culinary equivalents.
- Hallucinated free-form text dumps instead of strictly validated JSON schemas.

---

## 3. Architecture & Mental Model

"Make It Magic" is architected as a core plugin (`core-recipe-magic`) with tight integration into `core-ai-provider` and `core-recipes`:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Shell)                       │
│                                                             │
│   RecipeEditPage.vue                                        │
│   ├── [Make it Magic 🪄] ─── opens ─── MagicWandDialog.vue  │
│   │                                    ├── Action Selector  │
│   │                                    ├── AI Diff Preview  │
│   │                                    ├── In-Place Edits   │
│   │                                    └── Save / Fork / Esc│
│   │                                                         │
│   Settings > Recipe Magic ──────────── MagicSettings.vue    │
│                                        ├── Reorder & Edit   │
│                                        └── Custom Prompts   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST
┌──────────────────────────────▼──────────────────────────────┐
│                  Backend (SecretSauce Core)                 │
│                                                             │
│   core-recipe-magic Plugin (/api/x/core-recipe-magic)       │
│   ├── GET/PUT /actions (Household settings store)           │
│   ├── POST /actions/reset (Reset to Ottolenghi defaults)    │
│   └── POST /adapt (Invokes core-ai-provider with Schema)    │
│                                                             │
│   core-ai-provider (LLM Service)                            │
│   └── Structured JSON completion with Pydantic Schema       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Specifications

### 4.1 Backend Plugin: `core-recipe-magic`

- **Plugin Identifier:** `core-recipe-magic`
- **Dependencies:** `core-ai-provider`, `core-recipes`
- **Routes:** `/api/x/core-recipe-magic/`

#### 4.1.1 Endpoints
1. `GET /api/x/core-recipe-magic/actions`
   - Returns the list of configured action-prompt pairs for the household.
   - If not yet customized, returns the built-in defaults.
2. `PUT /api/x/core-recipe-magic/actions`
   - Updates the household's configured actions array (order, title, description, prompt).
3. `POST /api/x/core-recipe-magic/actions/reset`
   - Restores the household's action configuration back to the default Ottolenghi SIMPLE set.
4. `POST /api/x/core-recipe-magic/adapt`
   - Accepts payload:
     ```json
     {
       "action_id": "vegetarian",
       "custom_prompt": null,
       "recipe": {
         "id": "optional-id",
         "title": "Recipe Title",
         "description": "...",
         "servings": 4,
         "prep_time_minutes": 15,
         "cook_time_minutes": 30,
         "tags": ["dinner"],
         "ingredients": [...],
         "steps": [...]
       }
     }
     ```
   - Invokes `ctx.services.get("core-ai-provider").complete(...)` using structured schema.
   - Returns adapted recipe object + `adaptation_summary` string explaining culinary choices.

#### 4.1.2 Structured Pydantic Output Schema
```python
class AdaptedIngredient(BaseModel):
    name: str
    quantity: float | None = None
    quantity_max: float | None = None
    unit: str | None = None
    notes: str | None = None

class AdaptedStep(BaseModel):
    instruction: str
    timer_minutes: int | None = None

class RecipeAdaptationResponse(BaseModel):
    title: str
    description: str | None = None
    servings: int = 2
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    ingredients: list[AdaptedIngredient] = Field(default_factory=list)
    steps: list[AdaptedStep] = Field(default_factory=list)
    adaptation_summary: str = Field(description="Brief culinary explanation of the changes made")
```

#### 4.1.3 Default Ottolenghi *SIMPLE* Actions
```json
[
  {
    "id": "vegetarian",
    "title": "Make it vegetarian",
    "description": "Swap meats and poultry for flavorful plant-based substitutes",
    "prompt": "Adapt this recipe to be completely vegetarian. Replace animal proteins with plant-based alternatives that match texture, cooking time, and savory depth (e.g. mushrooms, lentils, beans, firm tofu, halloumi). Adjust stocks and seasonings to preserve rich umami."
  },
  {
    "id": "ten-ingredients",
    "title": "10 ingredients or less",
    "description": "Streamline ingredient list without sacrificing core flavors",
    "prompt": "Adapt this recipe so the entire ingredient list contains 10 ingredients or fewer (excluding salt, black pepper, and water). Consolidate complex spice blends into singular versatile spices, eliminate non-essential garnish, and focus on maximum flavor efficiency."
  },
  {
    "id": "fast",
    "title": "Make it fast (under 30 min)",
    "description": "Speed up prep and cook time using efficient culinary techniques",
    "prompt": "Adapt this recipe so total active prep and cooking takes 30 minutes or less. Use quicker cooking methods (e.g. high-heat sauté, grating vegetables, using pre-cooked beans or quick grains), without losing balanced flavor."
  },
  {
    "id": "pantry-friendly",
    "title": "Make it pantry-friendly",
    "description": "Use accessible kitchen staples instead of hard-to-find items",
    "prompt": "Adapt this recipe using standard pantry and supermarket staples. Replace rare or specialty ingredients with widely available alternatives (e.g. dried herbs for fresh, lemon juice for sumac, standard pantry oils, canned tomatoes, garlic powder if needed)."
  },
  {
    "id": "easy-prep",
    "title": "Easier to prepare",
    "description": "Simplify multi-pan processes and reduce cleanup",
    "prompt": "Adapt this recipe to minimize equipment, simultaneous pans, and knife work. Consolidate cooking into a single pot, sheet pan, or skillet wherever possible. Simplify step instructions to make execution straightforward and foolproof."
  }
]
```

---

### 4.2 Frontend Shell & UI Components

#### 4.2.1 `RecipeEditPage.vue` Integration
- In the top action bar of `RecipeEditPage.vue`, insert a slot or button:
  `<Button label="Make it Magic" class="btn-magic" outlined @click="openMagicModal">` with SVG wand icon.
- Can also be exposed via `<Slot name="recipe.edit.actions" :context="{ form, recipeId }" />` so plugins can contribute to edit actions cleanly.

#### 4.2.2 `MagicWandDialog.vue` (The Transformation Modal)
- **Action Selection:** Displays cards/chips for all available actions.
- **Triggering AI:** Clicking an action triggers the adaptation API call and shows a PrimeVue `ProgressSpinner` with friendly status text ("Adapting recipe with AI...").
- **Diff View:**
  - Highlights additions in soft green (`var(--p-green-400)` / `rgba(34, 197, 94, 0.1)`), removals in muted strikethrough, and unmodified items in neutral text.
  - Displays `adaptation_summary` in a highlighted callout card.
  - Allows direct in-line editing of transformed title, ingredients, and steps inside the dialog if the user wants to refine the AI's output before committing.
- **Save Actions:**
  - **Apply to Editor:** Replaces the form state in `RecipeEditPage` (title, servings, prep/cook time, ingredients, steps) with the adapted recipe, closing the modal so the user can continue regular editing.
  - **Save as New Recipe:** Calls `POST /api/recipes` directly, creates a new recipe (title defaulting to `"{Original Title} ({Action Name})"`), notifies success, and redirects to the newly created recipe detail page.
  - **Cancel:** Closes modal without touching the editor form.

#### 4.2.3 Settings Section: `MagicSettings.vue`
- Registered under `ss.settings.section({ id: 'core-recipe-magic', title: 'Recipe Magic', component: MagicSettings })`.
- Lists all current actions with:
  - Drag-or-button reordering (`pi pi-arrow-up`, `pi pi-arrow-down`).
  - Edit title, description, and detailed prompt instructions.
  - Delete action button (`pi pi-trash`).
  - "Add Custom Action" button (`pi pi-plus`).
  - "Reset to Ottolenghi SIMPLE Defaults" button (`pi pi-refresh`).

---

## 5. Constraints & Quality Attributes

- **Re-entrant Database Transactions:** Any database writes (settings, new recipes) must adhere to the kernel transaction lifecycle (`db.transaction()`).
- **AI Availability Handling:** If `core-ai-provider` is unconfigured (no API key / provider disabled), display a helpful warning message with a link to AI settings (`/settings?section=core-ai-provider`), matching `core-translator` and `core-recipe-importer`.
- **TDD:** Backend endpoints and frontend components must have unit, integration, and E2E coverage.
- **Theme Support:** Must render seamlessly across light and dark themes using PrimeVue tokens.
- **Offline / Outbox:** Standard recipe saves from the editor continue using SecretSauce's outbox synchronization.
