# Podman Deployment Design

## Intent

Make SecretSauce straightforward to host on one Linux VPS using Podman, with two independent family instances and an explicit, recoverable update process. The operator triggers releases manually over SSH; the server does not deploy every push automatically.

## Existing behavior and constraints

- The backend is launched with `secretsauce serve`; the CLI supports selecting a data directory and port.
- A booted app uses one SQLite database and one household configuration/passphrase. This design runs two app processes with different data directories; it does not add multi-tenant support.
- The UI and plugin assets are built by `pnpm --prefix shell build` into `secretsauce/static/`.
- The backend is Python 3.12+, and `secretsauce serve` must remain a single-worker process per instance.
- Each data directory contains its own `secretsauce.db`, `secret.key`, uploads, and user plugins. The export archive does not include `secret.key`, so backup procedures must save it separately.
- The repository currently has no container image or deploy workflow.

## Goals

1. Build a small multi-stage OCI image that compiles the shell and runs the existing backend without development dependencies.
2. Run two containers, one per family, with separate persistent host data directories and loopback-only published ports.
3. Have systemd/Podman Quadlet start the containers at boot and restart them after process exit. A failed health check should terminate the container so systemd can restart it.
4. Provide a manual install and a manual deploy-by-Git-ref workflow on the VPS. Build a versioned image locally on the server with `--format docker` so the image health check is retained, back up both family instances before replacement, health-check both instances, and restore the previous image tag if the new release fails its health check.
5. Document HTTPS reverse-proxy configuration, first setup, updating, rollback, and data/key backup locations.

## Non-goals

- Application-level multi-household accounts or tenant isolation within one database.
- A public image registry, CI/CD auto-deploy, or a cloud-specific orchestrator.
- Automatic restoration of a database backup during image rollback. A failed release may have run migrations or accepted writes; image rollback is automatic, while data restoration remains an explicit operator recovery decision using the pre-deploy backup.
- Installing Podman or Caddy packages for every Linux distribution.

## Design decisions

### Image

- Add a root `Containerfile` with a Node 22 frontend-build stage and a Python 3.12 slim runtime stage.
- Build the UI with the repository's frozen pnpm workspace lockfile, then install locked Python runtime dependencies with `uv` and no dev extras.
- Run the app as a non-root image user (UID/GID 10001), listen on container port 8080, and mount `/data` for persistent state.
- Include a Python-based `/api/health` image health check. Release builds must use `podman build --format docker`, because the default OCI format discards this health-check metadata. Exclude Git history, local databases, virtual environments, node modules, test data, environment files, private keys, and backup archives from the build context.

### Runtime services

- Use two rootful Podman Quadlet `.container` units managed by systemd: `secretsauce-family-a` and `secretsauce-family-b`.
- Both use the local image tag `localhost/secretsauce:current`; ports are bound only on host loopback (`127.0.0.1:8081` and `127.0.0.1:8082`).
- Each service bind-mounts its own `/var/lib/secretsauce/<family>` directory at `/data`, labels it for SELinux where applicable, and runs as container UID/GID 10001.
- Set `Restart=always`, a short restart delay, boot installation under `multi-user.target`, and Podman `HealthOnFailure=kill`. Use the actual Podman bridge gateway as `FORWARDED_ALLOW_IPS`; default rootful Podman commonly uses `10.88.0.1`, which must be checked on the target host. Set `COOKIE_SECURE=true` because public access is HTTPS-only.
- An example Caddy configuration proxies distinct family subdomains to the two loopback ports and handles TLS.

### Install and update flow

- `deploy/install.sh` creates the family data directories with correct ownership, installs both Quadlet files, and reloads systemd. Quadlet `[Install] WantedBy=multi-user.target` provides boot activation; `deploy/release.py` starts the services after building the first image. It assumes Podman 5.8+ and systemd are installed.
- `deploy/release.py <git-ref>` runs from a Git checkout on the VPS. It resolves the ref to an immutable commit, archives that commit into a temporary build context, and builds `localhost/secretsauce:<commit>`. Python's standard library is used for orchestration and testability; privileged Podman/systemd commands run through `sudo`.
- Before switching running services, the script hot-exports each active family's database/uploads/plugin/config data and separately copies that family's `secret.key` into a dated host backup directory. It retains the previous image ID.
- It tags the new image as `current`, restarts both units, and retries `/api/health` checks for a bounded startup window. On failure it restores the previous image tag, restarts the services, and reports that the saved data backup is available for manual recovery. It does not silently alter family data.
- The release command requires rootful Podman/systemd operations; it is invoked by an administrator and uses `sudo` for privileged commands while resolving Git refs as the calling user. It never resets or modifies the operator's checkout. `--rollback` switches to the last successful image and health-checks it, reverting the image tag if that rollback is unhealthy. Image-store query failures must abort rather than be mistaken for the first install.

## Security and operations

- Do not expose the application ports publicly; only the reverse proxy should access the loopback bindings.
- Use HTTPS, keep each host data directory private, and preserve `secret.key` alongside each export backup with restrictive permissions.
- Keep one process/worker per family instance. Separate directories and processes provide operational separation; separate Linux users can be added by an operator if stronger host-level isolation is required.
- A successful image rollback does not undo schema changes or writes. The pre-deploy exports and keys are the recovery point for operator-directed restoration.

## Files expected

- Create `Containerfile` and `.containerignore` for the reproducible image build.
- Create two Quadlet files under `deploy/quadlet/`.
- Create `deploy/install.sh`, `deploy/release.py`, and a Caddy example under `deploy/`.
- Add `docs/DEPLOY_PODMAN.md` with prerequisites, setup, first-run, update, health, logs, backup, and rollback commands.
- Add tests that check image/runtime requirements, both-family separation, systemd recovery settings, and release command behavior including health-check rollback.
