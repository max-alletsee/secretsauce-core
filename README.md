# SecretSauce Core

Local-first, extensible recipe and meal management kernel with plugin runtime, SQLite WAL persistence, FTS5 trigram search, and transactional event dispatching.

---

## Architecture & Features

- **SQLite WAL Concurrency**: Dedicated single-writer connection protected by `asyncio.Lock` with concurrent non-blocking reader connections.
- **Recipe Engine**: Composite group and language rows (`<group_id>_<language>`), fallback language resolution, safe deletion foreign-key re-pointing, and trigram FTS5 search.
- **Optimistic Revision Concurrency**: Conflict detection returning HTTP 409 on stale edits for recipes, members, and journals.
- **Cryptography & Security**: HKDF master key derivation (`/data/secret.key`), Scrypt passphrase hashing with per-household salts, versioned session cookie invalidation, and Fernet config encryption.
- **Transactional Event Log & Outbox**: Event log written in the same transaction as state changes, with per-plugin outbox dispatchers and causal loop detection.
- **Server-Sent Events Stream**: Live SSE event bus with `event: hello`, historical catch-up via `Last-Event-ID`, and live push notifications.
- **Background Jobs**: Asynchronous job tracker with real-time numeric progress, cancellation signals, and automatic recovery on server reboot.
- **Plugin Architecture**: Manifest validation, dependency sorting, scoped database context, entity attributes, synchronous pre-commit policy hooks, and inter-plugin services.
- **CLI & Backup**: SQLite hot backup via `VACUUM INTO` bundling database, uploads, plugins, and config into portable zip archives.

---

## Getting Started

### Requirements
- Python 3.12+
- `uv` (recommended) or standard `pip`

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/secretsauce-core.git
cd secretsauce-core

# Sync dependencies with uv
uv sync
```

### Running Tests
Execute the full test suite (69 automated test cases across all kernel subsystems):
```bash
uv run pytest
```

---

## Command Line Interface (CLI)

The `secretsauce` command is registered as an entry point:

```bash
# Show CLI commands
uv run secretsauce --help

# 1. Run database migrations on a data directory
uv run secretsauce migrate --data-dir ./data

# 2. Export a full system backup (VACUUM INTO snapshot + uploads + config)
uv run secretsauce export --data-dir ./data --output backup.zip

# 3. Start the FastAPI server
uv run secretsauce serve --host 0.0.0.0 --port 8000 --data-dir ./data
```

---

## Documentation

- [Kernel Architecture Guide](docs/KERNEL_ARCHITECTURE.md) - Deep-dive into database concurrency, cryptographic derivation, entity models, event dispatching, and background jobs.
- [REST API Reference](docs/API_REFERENCE.md) - Endpoints, request/response models, authentication headers, error codes, and SSE stream framing.
- [Plugin Developer Guide](docs/PLUGIN_DEVELOPER_GUIDE.md) - Creating plugins, `PLUGIN` manifest spec, `PluginContext` SDK reference, and test harness usage.
- [Kernel Implementation Plan](docs/superpowers/plans/2026-09-09-kernel-implementation-plan.md) - Phase 1 through Phase 4 build steps and status.

---

## Project Structure

```text
secretsauce/
├── __init__.py           # Package definition & __version__
├── __main__.py           # `python -m secretsauce` entry point
├── app.py                # FastAPI application factory with lifespan
├── boot.py               # Application boot sequence orchestrator
├── cli.py                # Command-line interface (`serve`, `migrate`, `export`)
├── config.py             # Infrastructure & environment configuration
├── db.py                 # SQLite WAL single-writer / reader database engine
├── errors.py             # Domain error hierarchy
├── events.py             # Transactional event log & plugin outbox dispatchers
├── gc.py                 # Hourly lazy garbage collector
├── hooks.py              # Synchronous pre-commit policy hooks
├── jobs.py               # Background jobs manager & boot recovery
├── secrets.py            # HKDF key derivation & secret encryption
├── stream.py             # Server-Sent Events (SSE) broadcaster & replay
├── testing.py            # Ephemeral test kernel harness (`make_kernel`)
├── api/
│   └── routes/           # REST API routes (auth, household, members, recipes, ...)
├── nouns/                # Domain repositories (recipes, schedule, journal, assets, ...)
└── plugins/              # Plugin loader, manifest validator, registry, & SDK context
```

---

## License
MIT
