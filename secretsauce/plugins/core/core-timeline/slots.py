"""Per-day slots without changing the kernel's free-string meal_type noun."""
from datetime import date, timedelta
import re
from typing import Literal, TypedDict

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, model_validator

from secretsauce.errors import ConflictError, NotFoundError, ValidationError
from secretsauce.plugins.context import PluginContext, current_ctx
from secretsauce.util import now_iso

ID_PATTERN = r'^[a-z0-9][a-z0-9-]{0,63}$'


class Slot(TypedDict):
    id: str
    label: str
    kind: Literal['default', 'extra']
    skipped: bool


def calendar_date(value: str) -> date:
    try:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value): raise ValueError()
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError('Expected an ISO calendar date (YYYY-MM-DD)') from None


def validate_id(value: str):
    if not re.fullmatch(ID_PATTERN, value):
        raise ValidationError('Invalid meal slot id')


class SlotWrite(BaseModel):
    kind: Literal['extra', 'skip']
    label: str | None = Field(default=None, min_length=1, max_length=64)
    before: str | None = Field(default=None, pattern=ID_PATTERN)

    @model_validator(mode='after')
    def extra_has_label(self):
        if self.kind == 'extra' and self.label is None:
            raise ValueError('Extra slots require a label')
        return self


class TimelineSlotsService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx

    async def slots_for(self, from_date: str, to_date: str, conn=None) -> dict[str, list[Slot]]:
        start, end = calendar_date(from_date), calendar_date(to_date)
        if end < start or (end - start).days >= 92:
            raise ValidationError('Slot ranges must be ordered and at most 92 days')
        defaults = (await self.ctx.household.get_config())['meal_types']
        rows = await self.ctx.db.read_all(
            'SELECT * FROM plugin_core_timeline_day_slots WHERE date >= ? AND date <= ? ORDER BY created_at, rowid',
            (from_date, to_date), conn=conn,
        )
        days = {}
        for offset in range((end - start).days + 1):
            day = (start + timedelta(days=offset)).isoformat()
            overrides = [row for row in rows if row['date'] == day]
            skips = {row['meal_type'] for row in overrides if row['kind'] == 'skip'}
            slots: list[Slot] = [{'id': slot['id'], 'label': slot['label'], 'kind': 'default', 'skipped': slot['id'] in skips} for slot in defaults]
            default_ids = {slot['id'] for slot in defaults}
            for row in overrides:
                if row['kind'] != 'extra' or row['meal_type'] in default_ids: continue
                extra: Slot = {'id': row['meal_type'], 'label': row['label'], 'kind': 'extra', 'skipped': False}
                index = next((i for i, slot in enumerate(slots) if slot['kind'] == 'default' and slot['id'] == row['before']), len(slots))
                slots.insert(index, extra)
            days[day] = slots
        return days

    async def entries_for(self, day: str, slot_id: str, conn):
        # Id matching has priority over labels, just like frontend composition.
        slots = (await self.slots_for(day, day, conn=conn))[day]
        entries = await self.ctx.schedule.get_for_date(day, conn=conn)
        result = []
        for entry in entries:
            alias = entry['meal_type'].lower()
            match = next((slot for slot in slots if slot['id'].lower() == alias), None)
            if match is None: match = next((slot for slot in slots if slot['label'].lower() == alias), None)
            if (match and match['id'] == slot_id) or (not match and alias == slot_id.lower()): result.append(entry)
        return result

    def push_after_commit(self, day: str):
        self.ctx.db.after_commit(lambda: self.ctx.push('core-timeline:slots-changed', {'date': day}))

    async def put(self, day: str, slot_id: str, payload: SlotWrite):
        calendar_date(day); validate_id(slot_id)
        async with self.ctx.db.transaction() as tx:
            default_ids = {slot['id'] for slot in (await self.ctx.household.get_config())['meal_types']}
            if payload.kind == 'extra' and slot_id in default_ids:
                raise ConflictError('An extra slot cannot use a default slot id')
            if payload.kind == 'skip':
                if slot_id not in default_ids: raise NotFoundError('Default slot not found')
                entries = await self.entries_for(day, slot_id, tx)
                if entries: raise ConflictError('Cannot skip an occupied slot', current={'entry_count': len(entries)})
            await tx.execute(
                '''INSERT INTO plugin_core_timeline_day_slots (date, meal_type, kind, label, before, created_at)
                   VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(date, meal_type) DO UPDATE SET
                   kind=excluded.kind, label=excluded.label, before=excluded.before''',
                (day, slot_id, payload.kind, payload.label, payload.before, now_iso()),
            )
            resolved = (await self.slots_for(day, day, conn=tx))[day]
            self.push_after_commit(day)
        return {'date': day, 'slots': resolved}

    async def delete(self, day: str, slot_id: str, with_entries: bool):
        calendar_date(day); validate_id(slot_id)
        async with self.ctx.db.transaction() as tx:
            override = await self.ctx.db.read_one('SELECT * FROM plugin_core_timeline_day_slots WHERE date=? AND meal_type=?', (day, slot_id), conn=tx)
            if override is None: raise NotFoundError('Slot override not found')
            default_ids = {slot['id'] for slot in (await self.ctx.household.get_config())['meal_types']}
            # A later Household change may promote this id to a default. Only
            # remove the obsolete override; the default and its meals remain.
            if override['kind'] == 'extra' and slot_id not in default_ids:
                entries = await self.entries_for(day, slot_id, tx)
                if entries and not with_entries: raise ConflictError('Slot still has planned meals', current={'entry_count': len(entries)})
                for entry in entries:
                    await self.ctx.schedule.delete_entry(entry['id'], revision=entry['revision'], conn=tx)
            await tx.execute('DELETE FROM plugin_core_timeline_day_slots WHERE date=? AND meal_type=?', (day, slot_id))
            resolved = (await self.slots_for(day, day, conn=tx))[day]
            self.push_after_commit(day)
        return {'date': day, 'slots': resolved}


router = APIRouter(prefix='/api/x/core-timeline', tags=['core-timeline'])


@router.get('/slots')
async def get_slots(from_date: str = Query(alias='from'), to_date: str = Query(alias='to'), ctx: PluginContext = Depends(current_ctx)):
    return {'days': await ctx.services.get('core-timeline').slots_for(from_date, to_date)}


@router.put('/days/{day}/slots/{meal_type}')
async def put_slot(day: str, meal_type: str, payload: SlotWrite, ctx: PluginContext = Depends(current_ctx)):
    return await ctx.services.get('core-timeline').put(day, meal_type, payload)


@router.delete('/days/{day}/slots/{meal_type}')
async def delete_slot(day: str, meal_type: str, with_entries: bool = False, ctx: PluginContext = Depends(current_ctx)):
    return await ctx.services.get('core-timeline').delete(day, meal_type, with_entries)
