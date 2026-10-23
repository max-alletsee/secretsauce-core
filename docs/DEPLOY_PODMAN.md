# Deploy SecretSauce with Podman

This guide runs one SecretSauce container per family on one Linux VPS. The containers share an application image but **do not share data**: Family A and Family B have separate databases, uploads, plugin configuration, encryption keys, household passphrases, and hostnames. The application does not support multiple households in one instance.

## Requirements

- A Linux VPS using systemd and rootful Podman **5.8 or newer** (Quadlet and `HealthOnFailure=kill` are used).
- Python 3.12+, `uv`, Git, and `sudo` for the operator account.
- DNS A/AAAA records for two hostnames pointing to the VPS, for example `family-a.example.com` and `family-b.example.com`.
- Caddy installed as a host service (or an equivalent HTTPS reverse proxy). Permit inbound TCP 80/443 and do not expose application ports 8081/8082 publicly.

The image build downloads Node/Python base images and package dependencies. Routine updates are built locally on the VPS from a Git commit; no image registry or automatic deploy-on-push is used.

## 1. Get the code and check the Podman gateway

Clone the repository to a stable path, then fetch the branch or tag you intend to deploy:

```bash
sudo install -d -o "$(id -un)" -g "$(id -gn)" /opt/secretsauce-core
git clone <repository-url> /opt/secretsauce-core
cd /opt/secretsauce-core
git fetch --all --tags
```

The Quadlet units trust forwarded request headers from the rootful Podman bridge gateway. Check the actual gateway:

```bash
sudo podman network inspect podman --format '{{range .Subnets}}{{.Gateway}}{{end}}'
```

The default in the supplied units is `10.88.0.1`. If your host prints a different address, edit `FORWARDED_ALLOW_IPS` in both `deploy/quadlet/secretsauce-family-*.container` files before installing them. This trusted-proxy setting matters for client IP handling and HTTPS detection; do not replace it with `*`.

## 2. Install persistent directories and Quadlet units

```bash
cd /opt/secretsauce-core
sudo deploy/install.sh
```

This installs the units to `/etc/containers/systemd/`, creates the family data directories at `/var/lib/secretsauce/family-a` and `/var/lib/secretsauce/family-b`, and creates a root-only backup directory at `/var/backups/secretsauce`. The app runs in each container as UID/GID 10001; each family data directory is owned by that UID/GID. `:Z` on the bind mounts lets Podman relabel the directories on SELinux hosts.

The installer reloads systemd but does not start a container before the first image exists. Quadlet units use `[Install] WantedBy=multi-user.target` for boot activation; they are generated services, so **do not run `systemctl enable` on them**.

## 3. First setup: build and start the first release

Deploy a branch, tag, or commit that exists in the checkout:

```bash
cd /opt/secretsauce-core
uv run python deploy/release.py <git-ref>
```

For example:

```bash
uv run python deploy/release.py main
```

The command resolves the Git ref to a commit, builds that immutable commit in a temporary context, and starts both systemd services. The image is built with Docker manifest format so Podman's health-check metadata is retained. It runs a single Uvicorn worker as a non-root user and publishes only on host loopback:

- Family A: `127.0.0.1:8081` → container port 8080
- Family B: `127.0.0.1:8082` → container port 8080

After both services pass `/api/health`, open each hostname in a browser and complete setup once for that family. Choose independent household passphrases. The families then use independent browser origins, sessions, and service-worker storage.

## 4. Configure HTTPS with Caddy

Copy `deploy/Caddyfile.example` into your Caddy configuration and replace its example hostnames with the DNS names you control:

```caddy
family-a.example.com {
    reverse_proxy 127.0.0.1:8081
}

family-b.example.com {
    reverse_proxy 127.0.0.1:8082
}
```

Caddy obtains and renews HTTPS certificates automatically when DNS points to the VPS and ports 80/443 are reachable. The app sets `COOKIE_SECURE=true`; HTTPS is required for secure cookies and full PWA/offline behavior.

## Update

After committing/pushing the desired release, fetch it on the VPS and run the release command with its Git ref:

```bash
cd /opt/secretsauce-core
git fetch --all --tags
uv run python deploy/release.py <git-ref>
```

The release command:

1. Resolves the ref to a commit and builds a versioned image without changing the checkout.
2. Refuses to switch images if either existing family service is not active.
3. Hot-exports each family's database, uploads, plugins, and configuration, then separately copies its `secret.key` into a timestamped directory under `/var/backups/secretsauce/`. Backups are root-owned and mode 0600 (the directory is mode 0700).
4. Tags the current image as `previous`, tags the new image as `current`, and restarts both Quadlet services.
5. Retries health checks at `http://127.0.0.1:8081/api/health` and `http://127.0.0.1:8082/api/health` for up to about one minute.

A failed image build or backup leaves the running image unchanged. If the new containers fail health checks, the script restores the previous image tag and restarts both services. It leaves the data backup untouched for investigation. On a first deployment, there is no previous image; a failed initial release is stopped and reported.

Updates have a short restart window while the two containers are recreated. Database migrations run at app startup. Image rollback does not reverse a database migration or undo writes, so the backup is preserved for explicit operator-directed recovery rather than automatically restored.

## Rollback

Switch both families to the last successful image:

```bash
uv run python deploy/release.py --rollback
```

Rollback makes a fresh pre-change export/key backup, switches the image tags, restarts both services, and checks health. If the rollback image is unhealthy, it restores the image that was active before the rollback attempt. Data is never silently restored or overwritten.

## Health, restart, and logs

Quadlet configures `Restart=always` and `HealthOnFailure=kill`. A process exit or unhealthy container is therefore restarted by systemd. The `[Install] WantedBy=multi-user.target` target brings both units back after a host reboot or power loss, after systemd and Podman start. Verify the generated units on the VPS after installation:

```bash
sudo systemctl daemon-reload
sudo systemctl cat secretsauce-family-a.service
sudo systemctl cat secretsauce-family-b.service
sudo systemctl status secretsauce-family-a.service secretsauce-family-b.service
```

Follow service logs:

```bash
sudo journalctl -u secretsauce-family-a.service -f
sudo journalctl -u secretsauce-family-b.service -f
```

Check the local health endpoints:

```bash
curl --fail http://127.0.0.1:8081/api/health
curl --fail http://127.0.0.1:8082/api/health
```

## Data and backups

The persistent host directories are:

```text
/var/lib/secretsauce/family-a/
/var/lib/secretsauce/family-b/
```

Each contains `secretsauce.db`, `secret.key`, `uploads/`, and per-instance plugin data. Never delete or share these directories between families. The automatic update backup archives include database/uploads/plugins/configuration, but **the export format omits `secret.key`**; the release command backs it up as a separate file for each family. Copy `/var/backups/secretsauce/` to independent, encrypted off-host storage on a regular schedule. Protect `secret.key` as carefully as the database export: it decrypts stored plugin secrets and signs sessions.

A manual export can also be created with:

```bash
sudo podman exec secretsauce-family-a secretsauce export \
  --data-dir /data --output /tmp/family-a-manual.zip
sudo podman cp secretsauce-family-a:/tmp/family-a-manual.zip /var/backups/secretsauce/
```

Remember to separately copy `/var/lib/secretsauce/family-a/secret.key` into the protected backup set.

## Operational notes

- Use one running instance/process per family data directory. Do not add multiple Uvicorn workers or mount the same data directory into two containers.
- Keep the published ports bound to `127.0.0.1`; Caddy should be the public entry point.
- `FORWARDED_ALLOW_IPS` must contain the trusted Podman bridge gateway, not an untrusted network range.
- The container image can be rebuilt from any committed Git ref; uncommitted files are intentionally not included in a release.
