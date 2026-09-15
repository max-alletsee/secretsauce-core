"""Cook tracker plugin: records meal execution, carryovers, leftovers, and journal."""

PLUGIN = {
    "id": "cook-tracker",
    "name": "Cook Tracker",
    "version": "1.0.0",
    "description": "Meal execution tracking, leftovers, carryovers, and cooking journal",
    "schema": 1,
    "core": True,
    "ui": "ui.js",
}


async def rebuild(ctx):
    await ctx.db.write(
        """
        DELETE FROM plugin_cook_tracker_leftovers
        WHERE schedule_entry_id NOT IN (SELECT id FROM schedule_entries)
           OR journal_id NOT IN (SELECT id FROM cook_journal)
        """
    )
    await ctx.db.write(
        """
        DELETE FROM plugin_cook_tracker_carryovers
        WHERE journal_id NOT IN (SELECT id FROM cook_journal)
        """
    )
    return {"status": "ok"}


async def setup(ctx):
    ctx.command("rebuild", rebuild, title="Reconcile orphaned leftovers and carryovers")
