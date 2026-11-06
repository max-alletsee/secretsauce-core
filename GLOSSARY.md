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

**Recipe Customization**:
A user-requested transformation of a recipe—such as dietary swaps, ingredient substitutions, unit conversions, or technique adjustments—that produces a modified version of the recipe highlighting the changes against the original.
_Avoid_: Recipe Magic, Make it Magic, Recipe Adaptation
