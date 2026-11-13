import json
import re
from typing import Any, Sequence
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError, ValidationError
from secretsauce.events import EventLog, resolve_origin
from secretsauce.nouns._common import emit_noun_event, in_transaction, require_fields, to_float
from secretsauce.nouns.attributes import filter_sql as attribute_filter_sql
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.util import now_iso

# Group ids must not contain '_' because '<group_id>_<language>' row ids are
# told apart from group ids by that character.
GROUP_ID_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,64}$")
LANGUAGE_PATTERN = re.compile(r"^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$")
SOURCE_TYPES = {"website", "cookbook", "person", "other"}


def normalize_source(raw: Any) -> dict[str, Any] | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            text = raw.strip()
            return {"type": "other", "name": text} if text else None
    if not isinstance(raw, dict):
        return None

    name = str(raw.get("name") or "").strip()
    if not name:
        return None

    raw_type = str(raw.get("type") or "other").strip().lower()
    source_type = raw_type if raw_type in SOURCE_TYPES else "other"

    cleaned: dict[str, Any] = {
        "type": source_type,
        "name": name,
    }
    for key in ("author", "page", "url", "notes"):
        val = raw.get(key)
        if val is not None:
            s = str(val).strip()
            if s:
                cleaned[key] = s
    return cleaned


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

    if res.get("source") is not None:
        res["source"] = normalize_source(res["source"])

    if "servings" in res and res["servings"] is not None:
        res["servings"] = float(res["servings"])
    return res


def _extract_fts_data(data: dict[str, Any]) -> tuple[str, str, str, str, str]:
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

    source_norm = normalize_source(data.get("source"))
    source_parts: list[str] = []
    if source_norm:
        if source_norm.get("name"):
            source_parts.append(source_norm["name"])
        if source_norm.get("author"):
            source_parts.append(source_norm["author"])
    source_text = " ".join(source_parts)

    return title, description, ingredients_text, tags_text, source_text


def _validate_identity(draft: dict[str, Any]) -> None:
    fields: dict[str, str] = {}
    group_id = draft.get("group_id")
    if group_id is not None and not GROUP_ID_PATTERN.match(str(group_id)):
        fields["group_id"] = "Must be 1-64 letters, digits or '-'"
    if not LANGUAGE_PATTERN.match(str(draft.get("language", ""))):
        fields["language"] = "Must be a language tag such as 'en' or 'pt-BR'"
    if fields:
        raise ValidationError("Invalid recipe identity", fields=fields)


class RecipesRepo:
    def __init__(
        self,
        db: Database,
        household_repo: HouseholdRepo | None = None,
        hooks: Any = None,
        events: EventLog | None = None,
    ):
        self.db = db
        self.household_repo = household_repo or HouseholdRepo(db)
        self.hooks = hooks
        self.events = events

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

    async def get_recipes_by_ids(
        self, recipe_ids: Sequence[str], conn: aiosqlite.Connection | None = None
    ) -> dict[str, dict[str, Any]]:
        """Row id -> recipe row (with 'languages'), fetched in two queries."""
        ids = sorted({rid for rid in recipe_ids if rid})
        if not ids:
            return {}
        placeholders = ",".join("?" * len(ids))
        rows = await self.db.read_all(
            f"SELECT * FROM recipes WHERE id IN ({placeholders});", ids, conn=conn
        )
        group_ids = sorted({r["group_id"] for r in rows})
        languages: dict[str, list[str]] = {gid: [] for gid in group_ids}
        if group_ids:
            group_placeholders = ",".join("?" * len(group_ids))
            lang_rows = await self.db.read_all(
                f"SELECT group_id, language FROM recipes WHERE group_id IN ({group_placeholders}) "
                "ORDER BY created_at ASC;",
                group_ids,
                conn=conn,
            )
            for r in lang_rows:
                languages[r["group_id"]].append(r["language"])
        result: dict[str, dict[str, Any]] = {}
        for row in rows:
            rec = _deserialize_recipe(row)
            rec["languages"] = languages.get(row["group_id"], [])
            result[row["id"]] = rec
        return result

    async def create_recipe(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        require_fields(data, "title", "language")

        async def _do_create(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            draft = dict(data)
            draft["origin"] = resolve_origin(data.get("origin"))
            if self.hooks:
                # Pre-commit hooks run inside the transaction so their writes
                # through ctx.db join it and a veto rolls everything back.
                draft = await self.hooks.run_before("recipe:create", draft)
            require_fields(draft, "title", "language")
            _validate_identity(draft)

            group_id = draft.get("group_id") or str(uuid.uuid4()).lower()
            language = draft["language"]
            row_id = f"{group_id}_{language}"

            existing = await self.db.read_one(
                "SELECT * FROM recipes WHERE id = ?;", (row_id,), conn=writer_conn
            )
            if existing is not None:
                raise ConflictError(
                    f"Recipe row '{row_id}' already exists",
                    current=_deserialize_recipe(existing),
                )

            now = now_iso()
            source = normalize_source(draft.get("source"))
            actor_member_id = draft.get("actor_member_id")

            # Keep Recipe Source synchronized across all rows in a recipe group.
            existing_group_rows = await self.db.read_all(
                "SELECT * FROM recipes WHERE group_id = ? ORDER BY created_at ASC;",
                (group_id,),
                conn=writer_conn,
            )
            if existing_group_rows:
                if source is not None:
                    for sib in existing_group_rows:
                        sib_before = _deserialize_recipe(sib)
                        if sib_before.get("source") != source:
                            sib_rev = sib["revision"] + 1
                            await writer_conn.execute(
                                """
                                UPDATE recipes SET
                                    revision = ?,
                                    source = ?,
                                    updated_at = ?,
                                    actor_member_id = ?,
                                    origin = ?
                                WHERE id = ?;
                                """,
                                (
                                    sib_rev,
                                    json.dumps(source),
                                    now,
                                    actor_member_id,
                                    draft["origin"],
                                    sib["id"],
                                ),
                            )
                            sib_after = await self.get_recipe(sib["id"], conn=writer_conn)
                            await self._rebuild_fts_row(writer_conn, sib_after)
                            await emit_noun_event(
                                self.events,
                                writer_conn,
                                "recipe:updated",
                                "recipe",
                                sib["id"],
                                revision=sib_rev,
                                before=sib_before,
                                after=sib_after,
                                actor_member_id=sib_after.get("actor_member_id"),
                                origin=sib_after.get("origin"),
                            )
                else:
                    source = normalize_source(_deserialize_recipe(existing_group_rows[0]).get("source"))

            await writer_conn.execute(
                """
                INSERT INTO recipes (
                    id, group_id, language, revision, title, description,
                    ingredients, steps, servings, yield_text,
                    prep_time_minutes, cook_time_minutes, total_time_minutes,
                    tags, source, created_at, updated_at, actor_member_id, origin
                ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    row_id,
                    group_id,
                    language,
                    draft["title"],
                    draft.get("description"),
                    json.dumps(draft.get("ingredients") or []),
                    json.dumps(draft.get("steps") or []),
                    to_float(draft.get("servings", 2.0), "servings"),
                    draft.get("yield_text"),
                    draft.get("prep_time_minutes"),
                    draft.get("cook_time_minutes"),
                    draft.get("total_time_minutes"),
                    json.dumps(draft.get("tags") or []),
                    json.dumps(source) if source else None,
                    now,
                    now,
                    actor_member_id,
                    draft["origin"],
                ),
            )
            t_fts, d_fts, i_fts, tags_fts, src_fts = _extract_fts_data(
                {**draft, "source": source}
            )
            await writer_conn.execute(
                """
                INSERT INTO recipes_fts (
                    id, group_id, language, title, description, ingredients, tags, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (row_id, group_id, language, t_fts, d_fts, i_fts, tags_fts, src_fts),
            )
            created = await self.get_recipe(row_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "recipe:created",
                "recipe",
                row_id,
                revision=1,
                after=created,
                actor_member_id=actor_member_id,
                origin=draft["origin"],
            )
            return created

        return await in_transaction(self.db, conn, _do_create)

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
            # Provenance describes this write, never the previous one.
            draft["origin"] = resolve_origin(data.get("origin"))
            draft["actor_member_id"] = data.get("actor_member_id")
            if self.hooks:
                draft = await self.hooks.run_before(
                    "recipe:update", draft, current=current
                )

            new_revision = current["revision"] + 1
            title = draft.get("title") or current["title"]
            ingredients = draft.get("ingredients", current.get("ingredients", []))
            tags = draft.get("tags", current.get("tags", []))
            description = draft.get("description")
            old_source = normalize_source(current.get("source"))
            source = normalize_source(draft.get("source"))
            updated_at = now_iso()

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
                    json.dumps(draft.get("steps", current.get("steps", []))),
                    to_float(draft.get("servings", current.get("servings", 2.0)), "servings"),
                    draft.get("yield_text"),
                    draft.get("prep_time_minutes"),
                    draft.get("cook_time_minutes"),
                    draft.get("total_time_minutes"),
                    json.dumps(tags),
                    json.dumps(source) if source is not None else None,
                    updated_at,
                    draft.get("actor_member_id"),
                    draft.get("origin") or "member",
                    recipe_id,
                ),
            )

            await self._rebuild_fts_row(
                writer_conn,
                {
                    "id": recipe_id,
                    "group_id": current["group_id"],
                    "language": current["language"],
                    "title": title,
                    "description": description,
                    "ingredients": ingredients,
                    "tags": tags,
                    "source": source,
                },
            )

            updated = await self.get_recipe(recipe_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "recipe:updated",
                "recipe",
                recipe_id,
                revision=new_revision,
                before=current,
                after=updated,
                actor_member_id=updated.get("actor_member_id"),
                origin=updated.get("origin"),
            )

            if "source" in data and source != old_source:
                siblings = await self.db.read_all(
                    "SELECT * FROM recipes WHERE group_id = ? AND id != ?;",
                    (current["group_id"], recipe_id),
                    conn=writer_conn,
                )
                for sib in siblings:
                    sib_before = _deserialize_recipe(sib)
                    if sib_before.get("source") == source:
                        continue
                    sib_rev = sib["revision"] + 1
                    await writer_conn.execute(
                        """
                        UPDATE recipes SET
                            revision = ?,
                            source = ?,
                            updated_at = ?,
                            actor_member_id = ?,
                            origin = ?
                        WHERE id = ?;
                        """,
                        (
                            sib_rev,
                            json.dumps(source) if source is not None else None,
                            updated_at,
                            draft.get("actor_member_id"),
                            draft.get("origin") or "member",
                            sib["id"],
                        ),
                    )
                    sib_after = await self.get_recipe(sib["id"], conn=writer_conn)
                    await self._rebuild_fts_row(writer_conn, sib_after)
                    await emit_noun_event(
                        self.events,
                        writer_conn,
                        "recipe:updated",
                        "recipe",
                        sib["id"],
                        revision=sib_rev,
                        before=sib_before,
                        after=sib_after,
                        actor_member_id=sib_after.get("actor_member_id"),
                        origin=sib_after.get("origin"),
                    )

            return updated

        return await in_transaction(self.db, conn, _do_update)

    async def _rebuild_fts_row(
        self, writer_conn: aiosqlite.Connection, rec: dict[str, Any]
    ) -> None:
        t_fts, d_fts, i_fts, tags_fts, src_fts = _extract_fts_data(rec)
        await writer_conn.execute(
            "DELETE FROM recipes_fts WHERE id = ?;", (rec["id"],)
        )
        await writer_conn.execute(
            """
            INSERT INTO recipes_fts (
                id, group_id, language, title, description, ingredients, tags, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                rec["id"],
                rec["group_id"],
                rec["language"],
                t_fts,
                d_fts,
                i_fts,
                tags_fts,
                src_fts,
            ),
        )

    async def _emit_deleted(
        self, writer_conn: aiosqlite.Connection, rows: list[dict[str, Any]]
    ) -> None:
        for row in rows:
            before = _deserialize_recipe(row)
            await emit_noun_event(
                self.events,
                writer_conn,
                "recipe:deleted",
                "recipe",
                before["id"],
                revision=before.get("revision"),
                before=before,
            )

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

            if not other_rows:
                # Last remaining row in group
                await self._delete_group(writer_conn, group_id)
                return

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
                    f'PRAGMA foreign_key_list("{tbl_name}");', conn=writer_conn
                )
                for fk in fk_list:
                    if fk["table"] == "recipes" and fk["to"] == "id":
                        col = fk["from"]
                        await writer_conn.execute(
                            f'UPDATE "{tbl_name}" SET "{col}" = ? WHERE "{col}" = ?;',
                            (replacement_id, recipe_id),
                        )

            row = await self.db.read_one(
                "SELECT * FROM recipes WHERE id = ?;", (recipe_id,), conn=writer_conn
            )
            await writer_conn.execute(
                "DELETE FROM recipes WHERE id = ?;", (recipe_id,)
            )
            await writer_conn.execute(
                "DELETE FROM recipes_fts WHERE id = ?;", (recipe_id,)
            )
            await self._emit_deleted(writer_conn, [row] if row else [])

        await in_transaction(self.db, conn, _do_delete_row)

    async def _delete_group(self, writer_conn: aiosqlite.Connection, group_id: str) -> None:
        rows = await self.db.read_all(
            "SELECT * FROM recipes WHERE group_id = ? ORDER BY created_at ASC;",
            (group_id,),
            conn=writer_conn,
        )
        if not rows:
            raise NotFoundError(f"Recipe group '{group_id}' not found")
        # Preserve each linked recipe translation's title on Timeline Entries
        # that did not specify a custom title before ON DELETE SET NULL unlinks them.
        for row in rows:
            await writer_conn.execute(
                """
                UPDATE timeline_entries
                SET title = ?
                WHERE recipe_id = ? AND (title IS NULL OR TRIM(title) = '');
                """,
                (row["title"], row["id"]),
            )
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
        await self._emit_deleted(writer_conn, rows)

    async def delete_recipe_group(
        self, group_id: str, conn: aiosqlite.Connection | None = None
    ) -> None:
        async def _do_delete_group(writer_conn: aiosqlite.Connection) -> None:
            await self._delete_group(writer_conn, group_id)

        await in_transaction(self.db, conn, _do_delete_group)

    async def list_recipes(
        self,
        lang: str | None = None,
        q: str | None = None,
        tags: Sequence[str] | None = None,
        sources: Sequence[str] | None = None,
        attrs: Sequence[str] | None = None,
        sort: str = "title",
        limit: int = 50,
        offset: int = 0,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        """One row per group, resolved into lang (Appendix A.4), in a single query.

        Resolution order per group: the requested language, the household's
        primary language, the oldest row. Filters and sorting apply to the
        resolved row; `total` counts matching groups.
        """
        cfg = await self.household_repo.get_config()
        primary_lang = cfg.get("languages", {}).get("primary", "en")
        target_lang = lang or primary_lang

        join = ""
        join_params: list[Any] = []
        where = ["r.rn = 1"]
        where_params: list[Any] = []
        order_by = _recipe_order_by(sort)
        order_params = _recipe_order_params(sort)

        query = (q or "").strip()
        if len(query) >= 3:
            # Trigram FTS over the requested and primary language; rank order, sort ignored.
            tokens = [re.sub(r'["\']', "", t) for t in query.split()]
            join = (
                "JOIN (SELECT group_id, MIN(rank) AS fts_rank FROM recipes_fts "
                "WHERE recipes_fts MATCH ? AND language IN (?, ?) GROUP BY group_id) f "
                "ON f.group_id = r.group_id"
            )
            join_params = [" ".join(f'"{t}"' for t in tokens if t), target_lang, primary_lang]
            order_by, order_params = "f.fts_rank, r.group_id", []
        elif query:
            # Too short for the trigram index: LIKE on titles, sorted by title.
            where.append(
                "r.group_id IN (SELECT group_id FROM recipes "
                "WHERE lower(title) LIKE lower(?) AND language IN (?, ?))"
            )
            where_params += [f"%{query}%", target_lang, primary_lang]
            order_by, order_params = "r.title COLLATE NOCASE, r.group_id", []

        for tag in tags or []:
            where.append("EXISTS (SELECT 1 FROM json_each(r.tags) WHERE value = ?)")
            where_params.append(tag)

        if sources:
            include_none = any(s == "none" for s in sources)
            named_sources = [s for s in sources if s != "none"]
            source_clauses: list[str] = []
            if named_sources:
                placeholders = ",".join("?" * len(named_sources))
                source_clauses.append(
                    f"json_extract(r.source, '$.name') IN ({placeholders})"
                )
                where_params.extend(named_sources)
            if include_none:
                source_clauses.append(
                    "(r.source IS NULL OR json_extract(r.source, '$.name') IS NULL OR TRIM(json_extract(r.source, '$.name')) = '')"
                )
            if source_clauses:
                where.append(f"({' OR '.join(source_clauses)})")

        if attrs:
            attr_sql, attr_params = attribute_filter_sql("recipe", attrs)
            where.append(f"r.group_id IN ({attr_sql})")
            where_params += attr_params

        base = f"""
            WITH r AS (
                SELECT recipes.*, ROW_NUMBER() OVER (
                    PARTITION BY group_id
                    ORDER BY CASE language WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END,
                             created_at, rowid
                ) AS rn
                FROM recipes
            )
            SELECT {{columns}} FROM r {join}
            WHERE {" AND ".join(where)}
        """
        filter_params = [target_lang, primary_lang, *join_params, *where_params]
        rows = await self.db.read_all(
            base.format(columns="r.*, COUNT(*) OVER () AS total_groups")
            + f" ORDER BY {order_by} LIMIT ? OFFSET ?;",
            [*filter_params, *order_params, limit, offset],
            conn=conn,
        )
        if rows:
            total = rows[0]["total_groups"]
        elif offset:
            # A page past the end has no row to carry the windowed count.
            total = await self.db.read_val(base.format(columns="COUNT(*)"), filter_params, conn=conn)
        else:
            total = 0

        languages = await self._languages_for([r["group_id"] for r in rows], conn)
        items = []
        for row in rows:
            row.pop("rn", None)
            row.pop("total_groups", None)
            rec = _deserialize_recipe(row)
            rec["languages"] = languages.get(row["group_id"], [])
            items.append(rec)
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    async def list_sources(
        self,
        lang: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        """Distinct recipe sources aggregated across recipe groups."""
        cfg = await self.household_repo.get_config()
        primary_lang = cfg.get("languages", {}).get("primary", "en")
        target_lang = lang or primary_lang

        rows = await self.db.read_all(
            """
            WITH r AS (
                SELECT recipes.*, ROW_NUMBER() OVER (
                    PARTITION BY group_id
                    ORDER BY CASE language WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END,
                             created_at, rowid
                ) AS rn
                FROM recipes
            )
            SELECT
                json_extract(r.source, '$.name') AS name,
                COALESCE(MAX(NULLIF(json_extract(r.source, '$.type'), '')), 'other') AS type,
                MAX(NULLIF(json_extract(r.source, '$.author'), '')) AS author,
                COUNT(*) AS count
            FROM r
            WHERE r.rn = 1
              AND r.source IS NOT NULL
              AND TRIM(COALESCE(json_extract(r.source, '$.name'), '')) != ''
            GROUP BY json_extract(r.source, '$.name')
            ORDER BY name COLLATE NOCASE ASC;
            """,
            (target_lang, primary_lang),
            conn=conn,
        )
        items = [
            {
                "name": row["name"],
                "type": row["type"] or "other",
                "author": row["author"],
                "count": int(row["count"]),
            }
            for row in rows
        ]
        return {"items": items}

    async def rename_source(
        self,
        from_name: str,
        to_name: str,
        author: str | None = None,
        update_author: bool = False,
        actor_member_id: str | None = None,
        origin: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        """Atomically rename a recipe source across all matching recipe rows."""
        clean_from = (from_name or "").strip()
        clean_to = (to_name or "").strip()
        if not clean_from or not clean_to:
            raise ValidationError(
                "Source names cannot be blank",
                fields={"from_name": "Required", "to_name": "Required"},
            )
        clean_author = author.strip() if isinstance(author, str) and author.strip() else None

        async def _do_rename(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            rows = await self.db.read_all(
                "SELECT * FROM recipes WHERE json_extract(source, '$.name') = ?;",
                (clean_from,),
                conn=writer_conn,
            )
            if not rows:
                return {"updated_count": 0, "updated_rows": 0}

            updated_at = now_iso()
            resolved_origin = resolve_origin(origin)
            updated_groups: set[str] = set()
            updated_rows = 0

            for row in rows:
                before = _deserialize_recipe(row)
                current_source = before.get("source")
                if not isinstance(current_source, dict):
                    continue
                next_source = dict(current_source)
                next_source["name"] = clean_to
                if update_author:
                    if clean_author is not None:
                        next_source["author"] = clean_author
                    else:
                        next_source.pop("author", None)
                next_source = normalize_source(next_source)
                if next_source == current_source:
                    continue

                new_rev = row["revision"] + 1
                await writer_conn.execute(
                    """
                    UPDATE recipes SET
                        revision = ?,
                        source = ?,
                        updated_at = ?,
                        actor_member_id = ?,
                        origin = ?
                    WHERE id = ?;
                    """,
                    (
                        new_rev,
                        json.dumps(next_source) if next_source is not None else None,
                        updated_at,
                        actor_member_id,
                        resolved_origin,
                        row["id"],
                    ),
                )
                after = await self.get_recipe(row["id"], conn=writer_conn)
                await self._rebuild_fts_row(writer_conn, after)
                await emit_noun_event(
                    self.events,
                    writer_conn,
                    "recipe:updated",
                    "recipe",
                    row["id"],
                    revision=new_rev,
                    before=before,
                    after=after,
                    actor_member_id=after.get("actor_member_id"),
                    origin=after.get("origin"),
                )
                updated_groups.add(row["group_id"])
                updated_rows += 1

            return {"updated_count": len(updated_groups), "updated_rows": updated_rows}

        return await in_transaction(self.db, conn, _do_rename)

    async def _languages_for(
        self, group_ids: list[str], conn: aiosqlite.Connection | None
    ) -> dict[str, list[str]]:
        if not group_ids:
            return {}
        placeholders = ",".join("?" * len(group_ids))
        rows = await self.db.read_all(
            f"SELECT group_id, language FROM recipes WHERE group_id IN ({placeholders}) "
            "ORDER BY created_at, rowid;",
            group_ids,
            conn=conn,
        )
        result: dict[str, list[str]] = {}
        for r in rows:
            result.setdefault(r["group_id"], []).append(r["language"])
        return result


_SORT_COLUMNS = {"title": "r.title COLLATE NOCASE", "created_at": "r.created_at", "updated_at": "r.updated_at"}
_ATTR_SORT = re.compile(r"^([a-z][a-z0-9-]{1,40})\.([A-Za-z0-9_-]+)$")


def _sort_fields(sort: str) -> list[tuple[str, bool]]:
    fields = []
    for raw in (sort or "title").split(","):
        raw = raw.strip()
        if raw:
            fields.append((raw.lstrip("-"), raw.startswith("-")))
    return fields or [("title", False)]


def _recipe_order_by(sort: str) -> str:
    """ORDER BY for the Appendix A sort grammar; attribute sorts put missing values last."""
    terms = []
    for name, desc in _sort_fields(sort):
        direction = "DESC" if desc else "ASC"
        if name in _SORT_COLUMNS:
            terms.append(f"{_SORT_COLUMNS[name]} {direction}")
        elif _ATTR_SORT.match(name):
            value = (
                "(SELECT COALESCE(a.value_numeric, a.value_text) FROM entity_attributes a "
                "WHERE a.entity_type = 'recipe' AND a.entity_id = r.group_id "
                "AND a.plugin_id = ? AND a.key = ?)"
            )
            terms.append(f"{value} {direction} NULLS LAST")
        else:
            raise ValidationError(
                f"Unknown sort field '{name}'",
                fields={"sort": "Use title, created_at, updated_at or <plugin_id>.<key>"},
            )
    terms.append("r.group_id")
    return ", ".join(terms)


def _recipe_order_params(sort: str) -> list[Any]:
    params: list[Any] = []
    for name, _ in _sort_fields(sort):
        m = _ATTR_SORT.match(name) if name not in _SORT_COLUMNS else None
        if m:
            params.extend(m.groups())
    return params


RecipeRepo = RecipesRepo
RecipesRepo.create = RecipesRepo.create_recipe
RecipesRepo.get = RecipesRepo.get_recipe
