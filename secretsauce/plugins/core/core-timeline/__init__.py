"""Core timeline plugin: provides rolling meal planning schedule and cache warming."""

from .slots import TimelineSlotsService, router

PLUGIN = {
    "id": "core-timeline",
    "name": "core-timeline",
    "version": "1.0.0",
    "description": "Rolling household meal timeline, schedule management, and offline cache warming",
    "core": True,
    "schema": 1,
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "default_past_days": {
                "type": "integer",
                "minimum": 0,
                "maximum": 30,
                "default": 2,
            },
            "default_planning_days": {
                "type": "integer",
                "minimum": 1,
                "maximum": 60,
                "default": 7,
            },
        },
    },
}

async def setup(ctx):
    ctx.services.register('core-timeline', TimelineSlotsService(ctx))
    ctx.router(router)
