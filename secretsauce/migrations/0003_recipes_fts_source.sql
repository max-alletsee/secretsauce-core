-- 0003_recipes_fts_source.sql: add source column to recipes_fts and rebuild index

DROP TABLE IF EXISTS recipes_fts;

CREATE VIRTUAL TABLE recipes_fts USING fts5(
    id UNINDEXED,
    group_id UNINDEXED,
    language UNINDEXED,
    title,
    description,
    ingredients,
    tags,
    source,
    tokenize='trigram'
);

INSERT INTO recipes_fts (id, group_id, language, title, description, ingredients, tags, source)
SELECT
    r.id,
    r.group_id,
    r.language,
    COALESCE(r.title, ''),
    COALESCE(r.description, ''),
    COALESCE((
        SELECT group_concat(
            CASE
                WHEN json_type(j.value) = 'object' THEN COALESCE(json_extract(j.value, '$.name'), '')
                ELSE COALESCE(j.value, '')
            END,
            ' '
        )
        FROM json_each(r.ingredients) j
    ), ''),
    COALESCE((
        SELECT group_concat(COALESCE(j.value, ''), ' ')
        FROM json_each(r.tags) j
    ), ''),
    TRIM(
        COALESCE(json_extract(r.source, '$.name'), '') || ' ' ||
        COALESCE(json_extract(r.source, '$.author'), '')
    )
FROM recipes r;
