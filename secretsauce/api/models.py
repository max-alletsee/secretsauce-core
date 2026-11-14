"""Request bodies for the kernel REST API.

Unknown keys are ignored rather than rejected so clients may round-trip a
row they fetched. `origin` and `actor_member_id` are never read from bodies:
REST writes are member writes, and the actor comes from X-Actor-Member.
"""

from datetime import date
from typing import Any, Literal

from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field, field_validator


class _Body(BaseModel):
    model_config = ConfigDict(extra="ignore")

    def data(self, request: Request | None = None) -> dict[str, Any]:
        """The fields the client actually sent, plus the request's actor."""
        values = self.model_dump(exclude_unset=True, exclude={"revision"})
        if request is not None:
            actor = getattr(request.state, "actor_member_id", None)
            if actor:
                values["actor_member_id"] = actor
        return values


def _iso_date(value: str | None) -> str | None:
    if value is not None:
        date.fromisoformat(value)
    return value


class _Revisioned(_Body):
    revision: int = Field(ge=1)


# -- household -----------------------------------------------------------------


class MealType(_Body):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,63}$")
    label: str = Field(min_length=1, max_length=64)
    predefined_notes: list[str] | None = None

    @field_validator("predefined_notes")
    @classmethod
    def check_predefined_notes(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = []
        for note in value:
            if not isinstance(note, str):
                raise ValueError("Note must be a string")
            s = note.strip()
            if not s:
                raise ValueError("Note cannot be blank")
            if len(s) > 64:
                raise ValueError("Note cannot exceed 64 characters")
            if s not in cleaned:
                cleaned.append(s)
        return cleaned


class MealTypesPayload(_Body):
    # The unvalidated default represents omission; an explicitly sent null is invalid.
    meal_types: list[MealType] | None = Field(default=None, min_length=1)

    @field_validator("meal_types")
    @classmethod
    def check_meal_types(cls, value: list[MealType] | None) -> list[MealType]:
        if value is None:
            raise ValueError("meal_types cannot be null")
        ids = [slot.id for slot in value]
        if len(set(ids)) != len(ids):
            raise ValueError("meal_types ids must be unique")
        return value


# -- members -------------------------------------------------------------------


class MemberFields(_Body):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    avatar_color: str | None = Field(default=None, max_length=32)
    serving_ratio: float | None = Field(default=None, gt=0, le=10)
    dietary_restrictions: list[str] | None = None
    allergies: list[str] | None = None
    disliked_ingredients: list[str] | None = None
    favorite_cuisines: list[str] | None = None
    preferred_language: str | None = Field(default=None, max_length=35)


class MemberCreate(MemberFields):
    id: str | None = Field(default=None, max_length=64)
    name: str = Field(min_length=1, max_length=200)


class MemberPatch(MemberFields, _Revisioned):
    pass


# -- recipes -------------------------------------------------------------------


class RecipeSource(_Body):
    type: Literal["website", "cookbook", "person", "other"] = "other"
    name: str = Field(min_length=1, max_length=300)
    author: str | None = Field(default=None, max_length=200)
    page: str | None = Field(default=None, max_length=64)
    url: str | None = Field(default=None, max_length=2048)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Source name cannot be blank")
        return cleaned

    @field_validator("author", "page", "url", "notes")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RecipeSourceRename(_Body):
    from_name: str = Field(min_length=1, max_length=300)
    to_name: str = Field(min_length=1, max_length=300)
    author: str | None = Field(default=None, max_length=200)

    @field_validator("from_name", "to_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Source name cannot be blank")
        return cleaned

    @field_validator("author")
    @classmethod
    def strip_author(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RecipeTagRename(_Body):
    from_name: str = Field(min_length=1, max_length=200)
    to_name: str = Field(min_length=1, max_length=200)

    @field_validator("from_name", "to_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Tag name cannot be blank")
        return cleaned


class RecipeTagDelete(_Body):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Tag name cannot be blank")
        return cleaned


class RecipeFields(_Body):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    ingredients: list[Any] | None = None
    steps: list[Any] | None = None
    servings: float | None = Field(default=None, gt=0)
    yield_text: str | None = None
    prep_time_minutes: int | None = Field(default=None, ge=0)
    cook_time_minutes: int | None = Field(default=None, ge=0)
    total_time_minutes: int | None = Field(default=None, ge=0)
    tags: list[str] | None = None
    source: RecipeSource | None = None


class RecipeCreate(RecipeFields):
    group_id: str | None = Field(default=None, max_length=64)
    language: str = Field(min_length=2, max_length=35)
    title: str = Field(min_length=1, max_length=500)


class RecipePatch(RecipeFields, _Revisioned):
    pass


# -- timeline ------------------------------------------------------------------


class TimelineFields(_Body):
    date: str | None = None
    meal_type: str | None = Field(default=None, min_length=1, max_length=64)
    entry_type: str | None = Field(default=None, max_length=32)
    recipe_id: str | None = None
    title: str | None = None
    note: str | None = None
    servings_override: float | None = Field(default=None, gt=0)
    position: int | None = None
    assigned_cook_id: str | None = None
    participant_member_ids: list[str] | None = None
    status: Literal["planned", "cooked"] | None = None
    cooked_by_member_id: str | None = None

    _check_date = field_validator("date")(_iso_date)


class TimelineCreate(TimelineFields):
    id: str | None = Field(default=None, max_length=64)
    date: str
    meal_type: str = Field(min_length=1, max_length=64)


class TimelinePatch(TimelineFields, _Revisioned):
    pass
