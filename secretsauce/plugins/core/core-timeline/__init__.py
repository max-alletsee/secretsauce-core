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
}

async def setup(ctx):
    ctx.services.register('core-timeline', TimelineSlotsService(ctx))
    ctx.router(router)
