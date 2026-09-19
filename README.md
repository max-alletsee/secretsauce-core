# SecretSauce Core

Secret Sauce is a minimal extensible meal planning app that can be modified easily. It is heavily inspired by the pi coding agent.

Local-first, extensible recipe and meal management kernel with plugin runtime, SQLite WAL persistence, FTS5 trigram search, transactional event dispatching, and Vue 3 + PrimeVue PWA application shell.

---

## Architecture & Features

### Backend Kernel
- **SQLite WAL Concurrency**: Dedicated single-writer connection protected by `asyncio.Lock` with concurrent non-blocking reader connections.
- **Recipe Engine**: Composite group and language rows (`<group_id>_<language>`), fallback language resolution, safe deletion foreign-key re-pointing, and trigram FTS5 search.
- **Optimistic Revision Concurrency**: Conflict detection returning HTTP 409 on stale edits for recipes, members, and journals.
- **Cryptography & Security**: HKDF master key derivation (`/data/secret.key`), Scrypt passphrase hashing with per-household salts, versioned session cookie invalidation, and Fernet config encryption.
- **Transactional Event Log & Outbox**: Event log written in the same transaction as state changes, with per-plugin outbox dispatchers and causal loop detection.
- **Server-Sent Events Stream**: Live SSE event bus with `event: hello`, historical catch-up via `Last-Event-ID`, and live push notifications.
- **Background Jobs**: Asynchronous job tracker with real-time numeric progress, cancellation signals, and automatic recovery on server reboot.
- **Plugin Architecture**: Manifest validation, dependency sorting, scoped database context, entity attributes, synchronous pre-commit policy hooks, and inter-plugin services.
- **CLI & Backup**: SQLite hot backup via `VACUUM INTO` bundling database, uploads, plugins, and config into portable zip archives, and safe offline restoration (`secretsauce export` / `secretsauce restore`).

### Frontend Shell & PWA
- **Progressive Web App (PWA)**: Standalone installation support, dynamic manifest generation with household name, and Service Worker offline caching.
- **Modular Shell & `@secretsauce/ui`**: Micro-frontend slot and cross-plugin intent dispatch architecture allowing plugins to mount Vue components without full page reloads.
- **Offline Outbox Engine**: IndexedDB persistent write queue with exponential backoff retries, conflict detection, 401 pause handling, and optimistic rollbacks.
- **Dynamic Theming**: PrimeVue 4 Aura preset foundation with live theme switching and token synchronization.
- **Schema Form Generator**: Dynamic form generation for plugin settings from JSON Schema specifications.

---

## Getting Started

### Requirements
- Python 3.12+ (managed with `uv`)
- Node.js 22+ & `pnpm` 10+ (for frontend shell development)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/secretsauce-core.git
cd secretsauce-core

# Sync Python backend dependencies
uv sync

# Install frontend shell dependencies
pnpm --prefix shell install
```

### Building Frontend Shell
Compile the SPA shell, Service Worker, and vendored assets into `secretsauce/static/`:
```bash
pnpm --prefix shell build
```

### Running Tests
Execute the complete automated test suite (166 tests total + Playwright E2E):
```bash
# Run backend kernel & plugin tests (103 tests)
uv run pytest

# Run frontend shell & plugin tests (63 tests across 24 suites)
pnpm --prefix shell test

# Run browser end-to-end Playwright tests
pnpm --prefix shell test:e2e
```

---

## Command Line Interface (CLI)

The `secretsauce` command is registered as an entry point:

```bash
# Show CLI commands
uv run secretsauce --help

# 1. Run database migrations on a data directory
uv run secretsauce migrate --data-dir ./data

# 2. Export a full system backup (VACUUM INTO snapshot + uploads + plugins + config)
uv run secretsauce export --data-dir ./data --output backup.zip

# 3. Restore a system backup archive
uv run secretsauce restore backup.zip --data-dir ./data

# 4. Start the FastAPI server (serves REST API, SSE stream, and PWA shell; default port 8080)
uv run secretsauce serve --host 0.0.0.0 --port 8080 --data-dir ./data
```

---

## Documentation

- [Frontend Shell & PWA Architecture](docs/SHELL_ARCHITECTURE.md) - Deep-dive into Vue 3 shell, service worker caching, outbox queue, slot & intent registries, and theming.
- [Kernel Architecture Guide](docs/KERNEL_ARCHITECTURE.md) - Deep-dive into database concurrency, cryptographic derivation, entity models, event dispatching, and background jobs.
- [REST API Reference](docs/API_REFERENCE.md) - Endpoints, request/response models, authentication headers, error codes, and SSE stream framing.
- [Plugin Developer Guide](docs/PLUGIN_DEVELOPER_GUIDE.md) - Backend Python plugins and frontend `ui.js` ES module development with `@secretsauce/ui`.
- [Phase 1: Kernel Implementation Plan](docs/superpowers/plans/2026-09-09-kernel-implementation-plan.md) - Phase 1 build steps and status (21/21 completed).
- [Phase 2: Frontend Shell Implementation Plan](docs/superpowers/plans/2026-09-10-frontend-shell-implementation-plan.md) - Phase 2 SPA shell, service worker, and PWA serving plan (13/13 completed).
- [Phase 3A: Units Engine & Initial Plugins](docs/superpowers/plans/2026-09-11-phase-3a-units-and-stage-6-plugins.md) - Units parser/converter, `units` and `recurring` core plugins (8/8 completed).
- [Phase 3B: Core Recipe & Member Domain](docs/superpowers/plans/2026-09-12-phase-3b-core-recipe-and-member-domain.md) - `core-members`, `core-recipes`, `shortlist` plugins (8/8 completed).
- [Phase 3C: Timeline & Cooking Workflow](docs/superpowers/plans/2026-09-13-phase-3c-timeline-and-cooking-workflow.md) - `core-timeline`, `cook-tracker`, `ratings` plugins (9/9 completed).

---

## Project Structure

```text
secretsauce-core/
├── secretsauce/                 # Python backend kernel
│   ├── app.py                   # FastAPI application factory with lifespan
│   ├── boot.py                  # Application boot sequence orchestrator
│   ├── cli.py                   # Command-line interface (`serve`, `migrate`, `export`)
│   ├── config.py                # Infrastructure & environment configuration
│   ├── db.py                    # SQLite WAL single-writer / reader database engine
│   ├── errors.py                # Domain error hierarchy
│   ├── events.py                # Transactional event log & plugin outbox dispatchers
│   ├── gc.py                    # Hourly lazy garbage collector
│   ├── hooks.py                 # Synchronous pre-commit policy hooks
│   ├── jobs.py                  # Background jobs manager & boot recovery
│   ├── secrets.py               # HKDF key derivation & secret encryption
│   ├── stream.py                # Server-Sent Events (SSE) broadcaster & replay
│   ├── testing.py               # Ephemeral test kernel harness (`make_kernel`)
│   ├── api/routes/              # REST API & PWA routes (auth, recipes, pwa, ...)
│   ├── nouns/                   # Domain repositories (recipes, schedule, journal, ...)
│   ├── plugins/                 # Plugin loader, manifest validator, & context SDK
│   └── static/                  # Built shell assets, sw.js, vendor libraries, icons
│
├── shell/                       # Frontend PWA application shell (pnpm workspace)
│   ├── packages/
│   │   └── ui/                  # `@secretsauce/ui` package (Slot, IntentTrigger, types)
│   ├── src/
│   │   ├── api.ts               # Typed API client with actor header injection
│   │   ├── outbox.ts            # IndexedDB offline mutation outbox engine
│   │   ├── stream.ts            # Reconnecting SSE client with wildcard events
│   │   ├── theme.ts             # PrimeVue dynamic preset switcher
│   │   ├── components/          # AppHeader, AppNav, OfflineBar, ConfigForm
│   │   ├── pages/               # SetupPage, LoginPage, SettingsPage, Plugins, Share
│   │   ├── registries/          # Dynamic route, slot, intent, settings registries
│   │   ├── stores/              # Pinia stores (member, household, app)
│   │   ├── sw/                  # Service Worker engine & pure URL classifier
│   │   ├── App.vue              # Main application root
│   │   ├── main.ts              # SPA entry point and bootstrapper
│   │   └── router.ts            # Vue Router definitions
│   ├── vite.config.ts           # Vite shell configuration
│   ├── vite.sw.config.ts        # Vite Service Worker IIFE build config
│   └── package.json
│
├── tests/                       # Pytest test suite (75 automated test cases)
└── docs/                        # Architecture guides, API reference, & developer guides
```

---

## License
MIT
