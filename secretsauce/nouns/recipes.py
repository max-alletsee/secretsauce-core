from datetime import datetime, timezone
import json
import re
from typing import Any, Sequence
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.household import HouseholdRepo


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _deserialize_recipe(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    for col in ("ingredients", "steps", "tags", "source"):
        val = res.get(col)
        if isinstance(val, str):
            try:
                res[col] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                if col in ("ingredients", "steps", "tags"):
                    res[col] = []
                else:
                    res[col] = None
        elif val is None and col in ("ingredients", "steps", "tags"):
            res[col] = []

    if "servings" in res and res["servings"] is not None:
        res["servings"] = float(res["servings"])
    return res


def _extract_fts_data(data: dict[str, Any]) -> tuple[str, str, str, str]:
    title = data.get("title") or ""
    description = data.get("description") or ""

    ingredients_raw = data.get("ingredients") or []
    if isinstance(ingredients_raw, str):
        try:
            ingredients_raw = json.loads(ingredients_raw)
        except Exception:
            ingredients_raw = []

    ingredient_names: list[str] = []
    if isinstance(ingredients_raw, list):
        for item in ingredients_raw:
            if isinstance(item, dict) and "name" in item:
                ingredient_names.append(str(item["name"]))
            elif isinstance(item, str):
                ingredient_names.append(item)
    ingredients_text = " ".join(ingredient_names)

    tags_raw = data.get("tags") or []
    if isinstance(tags_raw, str):
        try:
            tags_raw = json.loads(tags_raw)
        except Exception:
            tags_raw = []

    tags_list: list[str] = []
    if isinstance(tags_raw, list):
        tags_list = [str(t) for t in tags_raw]
    tags_text = " ".join(tags_list)

    return title, description, ingredients_text, tags_text


class RecipesRepo:
    def __init__(
        self,
        db: Database,
        household_repo: HouseholdRepo | None = None,
        hooks: Any = None,
    ):
        self.db = db
        self.household_repo = household_repo or HouseholdRepo(db)
        self.hooks = hooks

    async def get_recipe(
        self,
        id_or_group_id: str,
        lang: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        if "_" in id_or_group_id:
            # Specific row query
            row = await self.db.read_one(
                "SELECT * FROM recipes WHERE id = ?;", (id_or_group_id,), conn=conn
            )
            if row is None:
                raise NotFoundError(f"Recipe '{id_or_group_id}' not found")

            group_id = row["group_id"]
            lang_rows = await self.db.read_all(
                "SELECT language FROM recipes WHERE group_id = ? ORDER BY created_at ASC;",
                (group_id,),
                conn=conn,
            )
            res = _deserialize_recipe(row)
            res["languages"] = [r["language"] for r in lang_rows]
            return res

        # Group query
        group_id = id_or_group_id
        rows = await self.db.read_all(
            "SELECT * FROM recipes WHERE group_id = ? ORDER BY created_at ASC;",
            (group_id,),
            conn=conn,
        )
        if not rows:
            raise NotFoundError(f"Recipe group '{group_id}' not found")

        available_languages = [r["language"] for r in rows]

        # Resolution precedence:
        # 1. requested lang
        # 2. primary language from household config
        # 3. oldest row (rows[0])
        chosen_row: dict[str, Any] | None = None
        if lang:
            for r in rows:
                if r["language"] == lang:
                    chosen_row = r
                    break

        if chosen_row is None:
            cfg = await self.household_repo.get_config()
            primary = cfg.get("languages", {}).get("primary", "en")
            for r in rows:
                if r["language"] == primary:
                    chosen_row = r
                    break

        if chosen_row is None:
            chosen_row = rows[0]

        res = _deserialize_recipe(chosen_row)
        res["languages"] = available_languages
        return res

    async def create_recipe(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        draft = dict(data)
        if self.hooks:
            draft = await self.hooks.run_before("recipe:create", draft)

        group_id = draft.get("group_id") or str(uuid.uuid4()).lower()
        language = draft["language"]
        row_id = f"{group_id}_{language}"

        existing = await self.db.read_one(
            "SELECT * FROM recipes WHERE id = ?;", (row_id,), conn=conn
        )
        if existing is not None:
            raise ConflictError(
                f"Recipe row '{row_id}' already exists",
                current=_deserialize_recipe(existing),
            )

        now = _now_iso()
        title = draft["title"]
        description = draft.get("description")
        ingredients_json = json.dumps(draft.get("ingredients") or [])
        steps_json = json.dumps(draft.get("steps") or [])
        servings = float(draft.get("servings", 2.0))
        yield_text = draft.get("yield_text")
        prep_time_minutes = draft.get("prep_time_minutes")
        cook_time_minutes = draft.get("cook_time_minutes")
        total_time_minutes = draft.get("total_time_minutes")
        tags_json = json.dumps(draft.get("tags") or [])
        source_json = json.dumps(draft["source"]) if draft.get("source") else None
        actor_member_id = draft.get("actor_member_id")
        origin = draft.get("origin", "member")
        revision = 1

        t_fts, d_fts, i_fts, tags_fts = _extract_fts_data(draft)

        async def _do_create(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            await writer_conn.execute(
                """
                INSERT INTO recipes (
                    id, group_id, language, revision, title, description,
                    ingredients, steps, servings, yield_text,
                    prep_time_minutes, cook_time_minutes, total_time_minutes,
                    tags, source, created_at, updated_at, actor_member_id, origin
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    row_id,
                    group_id,
                    language,
                    revision,
                    title,
                    description,
                    ingredients_json,
                    steps_json,
                    servings,
                    yield_text,
                    prep_time_minutes,
                    cook_time_minutes,
                    total_time_minutes,
                    tags_json,
                    source_json,
                    now,
                    now,
                    actor_member_id,
                    origin,
                ),
            )
            await writer_conn.execute(
                """
                INSERT INTO recipes_fts (
                    id, group_id, language, title, description, ingredients, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (row_id, group_id, language, t_fts, d_fts, i_fts, tags_fts),
            )
            return await self.get_recipe(row_id, conn=writer_conn)

        if conn is not None:
            return await _do_create(conn)
        else:
            async with self.db.transaction() as writer_conn:
                return await _do_create(writer_conn)

    async def update_recipe(
        self,
        recipe_id: str,
        revision: int,
        data: dict[str, Any],
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        async def _do_update(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            current = await self.get_recipe(recipe_id, conn=writer_conn)
            if current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            draft = {**current, **data}
            if self.hooks:
                draft = await self.hooks.run_before(
                    "recipe:update", draft, current=current
                )

            new_revision = current["revision"] + 1
            now = _now_iso()

            title = draft.get("title", current["title"])
            description = (
                draft["description"]
                if "description" in draft
                else current.get("description")
            )
            ingredients = draft.get("ingredients", current.get("ingredients", []))
            steps = draft.get("steps", current.get("steps", []))
            servings = float(draft.get("servings", current.get("servings", 2.0)))
            yield_text = (
                draft["yield_text"]
                if "yield_text" in draft
                else current.get("yield_text")
            )
            prep_time = (
                draft["prep_time_minutes"]
                if "prep_time_minutes" in draft
                else current.get("prep_time_minutes")
            )
            cook_time = (
                draft["cook_time_minutes"]
                if "cook_time_minutes" in draft
                else current.get("cook_time_minutes")
            )
            total_time = (
                draft["total_time_minutes"]
                if "total_time_minutes" in draft
                else current.get("total_time_minutes")
            )
            tags = draft.get("tags", current.get("tags", []))
            source = draft["source"] if "source" in draft else current.get("source")
            actor_member_id = (
                draft["actor_member_id"]
                if "actor_member_id" in draft
                else current.get("actor_member_id")
            )
            origin = draft.get("origin", current.get("origin", "member"))

            await writer_conn.execute(
                """
                UPDATE recipes SET
                    revision = ?,
                    title = ?,
                    description = ?,
                    ingredients = ?,
                    steps = ?,
                    servings = ?,
                    yield_text = ?,
                    prep_time_minutes = ?,
                    cook_time_minutes = ?,
                    total_time_minutes = ?,
                    tags = ?,
                    source = ?,
                    updated_at = ?,
                    actor_member_id = ?,
                    origin = ?
                WHERE id = ?;
                """,
                (
                    new_revision,
                    title,
                    description,
                    json.dumps(ingredients),
                    json.dumps(steps),
                    servings,
                    yield_text,
                    prep_time,
                    cook_time,
                    total_time,
                    json.dumps(tags),
                    json.dumps(source) if source is not None else None,
                    now,
                    actor_member_id,
                    origin,
                    recipe_id,
                ),
            )

            # Update FTS
            t_fts, d_fts, i_fts, tags_fts = _extract_fts_data(
                {
                    "title": title,
                    "description": description,
                    "ingredients": ingredients,
                    "tags": tags,
                }
            )
            await writer_conn.execute(
                "DELETE FROM recipes_fts WHERE id = ?;", (recipe_id,)
            )
            await writer_conn.execute(
                """
                INSERT INTO recipes_fts (
                    id, group_id, language, title, description, ingredients, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    recipe_id,
                    current["group_id"],
                    current["language"],
                    t_fts,
                    d_fts,
                    i_fts,
                    tags_fts,
                ),
            )

            return await self.get_recipe(recipe_id, conn=writer_conn)

        if conn is not None:
            return await _do_update(conn)
        else:
            async with self.db.transaction() as writer_conn:
                return await _do_update(writer_conn)

    async def delete_recipe_row(
        self,
        recipe_id: str,
        revision: int | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        async def _do_delete_row(writer_conn: aiosqlite.Connection) -> None:
            current = await self.get_recipe(recipe_id, conn=writer_conn)
            if revision is not None and current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            group_id = current["group_id"]
            other_rows = await self.db.read_all(
                "SELECT id, language, created_at FROM recipes WHERE group_id = ? AND id != ? ORDER BY created_at ASC;",
                (group_id, recipe_id),
                conn=writer_conn,
            )

            if other_rows:
                # Section 4.4: Re-point foreign keys to primary or oldest remaining row
                cfg = await self.household_repo.get_config()
                primary_lang = cfg.get("languages", {}).get("primary", "en")
                replacement_id = other_rows[0]["id"]
                for r in other_rows:
                    if r["language"] == primary_lang:
                        replacement_id = r["id"]
                        break

                # Query tables with FKs referencing recipes(id)
                user_tables = await self.db.read_all(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('recipes', 'recipes_fts', 'sqlite_sequence');",
                    conn=writer_conn,
                )
                for tbl_row in user_tables:
                    tbl_name = tbl_row["name"]
                    fk_list = await self.db.read_all(
                        f"PRAGMA foreign_key_list({tbl_name});", conn=writer_conn
                    )
                    for fk in fk_list:
                        if fk["table"] == "recipes" and fk["to"] == "id":
                            col = fk["from"]
                            await writer_conn.execute(
                                f"UPDATE {tbl_name} SET {col} = ? WHERE {col} = ?;",
                                (replacement_id, recipe_id),
                            )

                await writer_conn.execute(
                    "DELETE FROM recipes WHERE id = ?;", (recipe_id,)
                )
                await writer_conn.execute(
                    "DELETE FROM recipes_fts WHERE id = ?;", (recipe_id,)
                )
            else:
                # Last remaining row in group
                await self.delete_recipe_group(group_id, conn=writer_conn)

        if conn is not None:
            await _do_delete_row(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_delete_row(writer_conn)

    async def delete_recipe_group(
        self, group_id: str, conn: aiosqlite.Connection | None = None
    ) -> None:
        async def _do_delete_group(writer_conn: aiosqlite.Connection) -> None:
            # Section 4.4: Delete assets and attributes for group
            await writer_conn.execute(
                "DELETE FROM assets WHERE entity_type = 'recipe' AND entity_id = ?;",
                (group_id,),
            )
            await writer_conn.execute(
                "DELETE FROM entity_attributes WHERE entity_type = 'recipe' AND entity_id = ?;",
                (group_id,),
            )
            # Foreign keys fire as declared (e.g. SET NULL)
            await writer_conn.execute(
                "DELETE FROM recipes WHERE group_id = ?;", (group_id,)
            )
            await writer_conn.execute(
                "DELETE FROM recipes_fts WHERE group_id = ?;", (group_id,)
            )

        if conn is not None:
            await _do_delete_group(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_delete_group(writer_conn)

    async def list_recipes(
        self,
        lang: str | None = None,
        q: str | None = None,
        tags: Sequence[str] | None = None,
        attrs: Sequence[str] | None = None,
        sort: str = "title",
        limit: int = 50,
        offset: int = 0,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        cfg = await self.household_repo.get_config()
        primary_lang = cfg.get("languages", {}).get("primary", "en")
        target_lang = lang or primary_lang

        candidate_group_ids: list[str] = []

        if q and q.strip():
            query_str = q.strip()
            if len(query_str) >= 3:
                # Trigram FTS5 search
                # Clean query
                tokens = [re.sub(r'["\']', "", t) for t in query_str.split()]
                fts_query = " ".join(f'"{t}"' for t in tokens if len(t) > 0)
                fts_rows = await self.db.read_all(
                    """
                    SELECT group_id, min(rank) as r
                    FROM recipes_fts
                    WHERE recipes_fts MATCH ? AND language IN (?, ?)
                    GROUP BY group_id
                    ORDER BY r;
                    """,
                    (fts_query, target_lang, primary_lang),
                    conn=conn,
                )
                candidate_group_ids = [r["group_id"] for r in fts_rows]
            else:
                # Shorter than 3 chars: fallback to LIKE on title
                like_param = f"%{query_str}%"
                like_rows = await self.db.read_all(
                    """
                    SELECT DISTINCT group_id
                    FROM recipes
                    WHERE lower(title) LIKE lower(?) AND language IN (?, ?)
                    ORDER BY title ASC;
                    """,
                    (like_param, target_lang, primary_lang),
                    conn=conn,
                )
                candidate_group_ids = [r["group_id"] for r in like_rows]
        else:
            # All groups
            order = "ASC"
            sort_col = sort
            if sort.startswith("-"):
                order = "DESC"
                sort_col = sort[1:]

            if sort_col not in ("title", "created_at", "updated_at"):
                sort_col = "title"

            all_groups = await self.db.read_all(
                f"SELECT DISTINCT group_id FROM recipes ORDER BY {sort_col} {order};",
                conn=conn,
            )
            candidate_group_ids = [r["group_id"] for r in all_groups]

        # Resolve each group into the requested language
        resolved_recipes: list[dict[str, Any]] = []
        for gid in candidate_group_ids:
            try:
                rec = await self.get_recipe(gid, lang=target_lang, conn=conn)
                # Apply tags filter if present
                if tags:
                    rec_tags = set(rec.get("tags") or [])
                    if not all(t in rec_tags for t in tags):
                        continue
                resolved_recipes.append(rec)
            except NotFoundError:
                continue

        total = len(resolved_recipes)
        paged_items = resolved_recipes[offset : offset + limit]

        return {
            "items": paged_items,
            "total": total,
            "limit": limit,
            "offset": offset,
        }


RecipeRepo = RecipesRepo
RecipesRepo.create = RecipesRepo.create_recipe
RecipesRepo.get = RecipesRepo.get_recipe

