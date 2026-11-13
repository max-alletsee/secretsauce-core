# Store Recipe Sources as Embedded Structured Metadata Instead of a Dedicated Relational Table

While recipe sources (such as cookbooks, websites, and people) can be shared across multiple recipes and require multi-select filtering, creating a separate normalized `sources` table introduces administrative overhead, orphaned entity management, and extra CRUD interfaces for household users. We decided to store recipe sources as structured JSON objects (`type`, `name`, `author`, `page`, `url`, `notes`) embedded directly on the `recipes` table, dynamically aggregating active source names across recipes for autocomplete and list filtering.

To mitigate the risk of typo fragmentation across embedded records without foreign keys, the kernel provides an atomic batch rename operation (`POST /api/recipes/sources/rename`) to consolidate or correct source names across recipes in a single transaction.

