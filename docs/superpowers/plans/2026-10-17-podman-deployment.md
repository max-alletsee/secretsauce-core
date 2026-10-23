# Podman Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package SecretSauce into a Podman image and provide a recoverable, manual update workflow for two independent family instances on a systemd VPS.

**Architecture:** A multi-stage Containerfile builds the pnpm UI and Python runtime. Two rootful Podman Quadlet units share the versioned local image but mount separate persistent data directories; systemd restarts failures and brings them back at boot. A Python standard-library release command builds a selected Git commit, backs up each family's export and key, switches images, health-checks both, and rolls the image back on failure.

**Tech Stack:** Podman 5.8+, Quadlet/systemd, Caddy (host reverse proxy example), Node 22, pnpm 10, Python 3.12, uv, Python stdlib, pytest.

**Spec:** `docs/superpowers/specs/2026-10-17-podman-deployment-design.md`

## Global Constraints

- Keep one `secretsauce serve` process per family; do not add Uvicorn workers.
- Build the UI with `pnpm --prefix shell build` and compile Python dependencies from `uv.lock` without dev extras; release images use `podman build --format docker` so Podman retains image health-check metadata.
- Mount independent host data directories at `/data`; do not add household tenancy to the app.
- Publish app ports only on `127.0.0.1`; public traffic goes through HTTPS reverse proxy.
- Never put local `.env` files, private keys, PEMs, or backup archives into the build context.
- Persist both `secretsauce.db` and each instance's `secret.key`; export archives do not contain the key.
- Do not reset or mutate the operator's Git checkout during deployment; build from a resolved, immutable Git commit.
- Quadlet units use `[Install] WantedBy=multi-user.target`; do not call `systemctl enable` on generated services.
- Keep failure rollback image-only and retain pre-deploy exports for explicit data recovery.

## Review Focus

- **Image build failure, local secret files, and image-store errors:** a failed build leaves the active image unchanged, `.env`/private-key/backup files never enter the context, and Podman query errors are not mistaken for an absent image. Test in Tasks 1 and 2 by checking excluded patterns, failing the build, and injecting image-store errors before retag/restart.
- **Backup failure or stopped family service:** abort before changing the running image. Test in Task 2 by injecting export/copy failures and inactive-service state.
- **New image unhealthy:** restore the prior image tag and restart both units. Test in Task 2 by making health polling fail after restart.
- **VPS reboot or container crash:** Quadlet target activation starts units at boot and health failure kills the container for systemd restart. Test in Task 1 by asserting both unit files contain the complete restart/health/boot settings.
- **Unsafe/invalid Git ref:** resolve it to a commit before archiving/building; an unresolved ref must not issue Podman commands. Test in Task 2 with a temporary Git repository and a nonexistent ref.

---

### Task 1: Build image and define the two family services

**Files:**
- Create: `tests/test_podman_deployment.py`
- Create: `Containerfile`
- Create: `.containerignore`
- Create: `deploy/quadlet/secretsauce-family-a.container`
- Create: `deploy/quadlet/secretsauce-family-b.container`

**Interfaces:**
- Produces image `localhost/secretsauce:current`, listening on container port 8080 and storing all mutable state under `/data`.
- Produces systemd service names `secretsauce-family-a.service` and `secretsauce-family-b.service`, with host ports 8081/8082 and data directories `/var/lib/secretsauce/family-a` and `/var/lib/secretsauce/family-b`.

- [x] **Step 1: Write failing image/service asset tests.** Add tests named `test_containerfile_builds_shell_and_runs_non_root_runtime`, `test_build_context_excludes_local_state_and_tooling`, and `test_family_quadlets_are_isolated_and_restartable`. Assert Node 22 and Python 3.12 stages, locked pnpm/uv installs, non-root UID 10001, `/data`, health check, exclusion of `.env`, private keys and backup archives, distinct loopback ports and volumes, `HealthOnFailure=kill`, `Restart=always`, and `WantedBy=multi-user.target`.
- [x] **Step 2: Run `uv run pytest tests/test_podman_deployment.py -q` and verify these fail because the assets do not exist.**
- [x] **Step 3: Implement the Containerfile, ignore rules, and Quadlet units.** Use Python's urllib for the container health check; set `COOKIE_SECURE=true` and the default rootful Podman gateway `FORWARDED_ALLOW_IPS=10.88.0.1`, with a comment that operators must verify their actual gateway.
- [x] **Step 4: Re-run the focused pytest file and verify all asset assertions pass.**
- [x] **Step 5: Build the image with `podman build --format docker -t localhost/secretsauce:test .` where Podman machine/network support is available, then assert `podman image inspect localhost/secretsauce:test --format '{{json .Config.Healthcheck}}'` returns the Python `/api/health` command.** On a Linux VPS, confirm Quadlet generation with `systemctl daemon-reload` and inspect the generated `systemctl cat secretsauce-family-a.service` and `systemctl cat secretsauce-family-b.service`; `podman quadlet print` alone displays source and is not a parser check.

### Task 2: Implement release, backup, health-check, and rollback behavior

**Files:**
- Modify: `tests/test_podman_deployment.py`
- Create: `deploy/release.py`

**Interfaces:**
- `run_command(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]` runs external commands.
- `deploy(ref: str, *, repo_root: Path, runtime_root: Path, backup_root: Path, runner=run_command) -> None` resolves the ref, builds, backs up, switches, restarts, checks health, and restores the previous image on failure.
- `rollback(*, runtime_root: Path, runner=run_command) -> None` activates the `previous` image tag, health-checks it, and swaps tags only after success.
- `main(argv: list[str] | None = None) -> int` supports `deploy/release.py <git-ref>` and `deploy/release.py --rollback`.

- [x] **Step 1: Write failing tests for build failure, invalid ref, backup failure, successful deploy, failed health check rollback, and explicit rollback health failure.** Use a real temporary Git repository for commit resolution/archive and an injected command runner to emulate Podman/systemd/curl outputs; keep image-tag and restart assertions against the command sequence.
- [x] **Step 2: Run the focused pytest cases and confirm they fail for the missing `deploy/release.py` behavior.**
- [x] **Step 3: Implement release orchestration.** Build a temporary context from `git archive <resolved-commit>` without changing checkout, using `podman build --format docker`; only retag after build and both running instances back up. Create timestamped exports by `podman exec ... secretsauce export`, copy the archives and `secret.key` files to the host backup directory with restrictive permissions, restart both Quadlet services, and poll both `/api/health` URLs for a bounded interval. On failure, restore the previous image tag and restart; never automatically restore the data archive.
- [x] **Step 4: Implement `--rollback` with reversible image-tag updates and a bounded health check.** If rollback is unhealthy, restore the pre-command current image tag and restart services.
- [x] **Step 5: Run the focused pytest tests and verify all deploy/rollback command sequences and failure guarantees pass.**

### Task 3: Add host installer, proxy example, and operator guide

**Files:**
- Modify: `tests/test_podman_deployment.py`
- Modify: `README.md`
- Create: `deploy/install.sh`
- Create: `deploy/Caddyfile.example`
- Create: `docs/DEPLOY_PODMAN.md`

**Interfaces:**
- `sudo deploy/install.sh` installs the Quadlet definitions, creates per-family data directories owned by UID/GID 10001 and a root-only backup directory, then reloads systemd. It does not attempt to start services before the first image exists.
- `uv run python deploy/release.py <git-ref>` is the repeatable update command; `uv run python deploy/release.py --rollback` restores the last successful image.
- Caddy proxies `family-a.example.com` and `family-b.example.com` to `127.0.0.1:8081` and `127.0.0.1:8082`.

- [x] **Step 1: Write failing tests for installer/proxy/documentation coverage.** Assert installer creates both data directories and installs both units without using `systemctl enable`; Caddy targets loopback ports; README links the guide; guide contains first setup, update, rollback, logs, HTTPS, data/key backups, and failure recovery instructions.
- [x] **Step 2: Run the focused tests and verify they fail because installer, proxy sample, and guide are missing.**
- [x] **Step 3: Implement `deploy/install.sh`, Caddy example, the operator guide, and README link.** State Linux/systemd/Podman 5.8+ prerequisites and how to verify the Podman gateway before trusting forwarded headers. Keep the backup directory root-owned mode 0700 and the exported archives/keys root-owned mode 0600.
- [x] **Step 4: Run `bash -n deploy/install.sh` and the focused pytest file; verify both pass.**

### Task 4: Verify repository and container integration

**Files:**
- No additional files unless a verification failure reveals a defect.

- [x] **Step 1: Run `uv run pytest tests/test_podman_deployment.py -v`.**
- [x] **Step 2: Run `uv run pytest` and report any unrelated baseline failures separately.**
- [x] **Step 3: Run `podman build -t localhost/secretsauce:verification .` and Quadlet generation checks if the local Podman machine can build Linux images; otherwise report the exact environment limitation and keep the documented server-side commands.**
- [x] **Step 4: Review `git diff --check` and confirm no existing user-modified UI/data files were changed by this work.**
