# SecretSauce

A household meal planning, cooking, and recipe management system.

## Language

**Timeline**:
The continuous chronological feed of past, present, and future days where a household plans upcoming meals and reviews past meals.
_Avoid_: Schedule, Calendar, Journal

**Timeline Entry**:
A single meal record placed in a Meal Slot on a given date, representing both the plan for that meal and what actually happened when it was prepared.
_Avoid_: Schedule Entry, Journal Entry, Cook Log, Planned Meal, Meal Item

**Meal Slot**:
A named meal occasion on a specific calendar date (such as Breakfast, Lunch, Dinner, or a one-off occasion like Sunday Brunch) that holds Timeline Entries.
_Avoid_: Meal Type, Time Slot

**Rating**:
A household member's positive or negative vote on a completed Timeline Entry, reflecting how that meal turned out.
_Avoid_: Review, Star Rating, Recipe Vote

**Recipe**:
A dish's structured ingredients, steps, metadata, and media managed by the household as a single logical item across one or more language versions.
_Avoid_: Dish, Recipe Group

**Recipe Translation**:
A single language-specific version of a Recipe, holding its localized title, description, ingredients, and steps.
_Avoid_: Recipe Row, Language Variant, Language Copy

**Recipe Customization**:
A user-requested transformation of a recipe—such as dietary swaps, ingredient substitutions, unit conversions, or technique adjustments—that produces a modified version of the recipe highlighting the changes against the original.
_Avoid_: Recipe Magic, Make it Magic, Recipe Adaptation

**Recipe Source**:
The publication, website, or person from which a recipe originated, along with optional locator information such as a page number or web address.
_Avoid_: Attribution, Origin, Recipe Origin, Provider

**Source Locator**:
The specific reference indicating where inside a Recipe Source the recipe is found, such as a page number or web address (URL).
_Avoid_: Page Reference, Anchor, Bookmark

**Tag**:
A lightweight, user-defined label attached to a Recipe for categorizing and filtering.
_Avoid_: Category, Label, Keyword


