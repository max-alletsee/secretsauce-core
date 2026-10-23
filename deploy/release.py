"""Build, deploy, and roll back the rootful Podman family instances."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import subprocess
import tarfile
import tempfile
import time
from pathlib import Path
from typing import Callable, Sequence

IMAGE = "localhost/secretsauce"
CURRENT_IMAGE = f"{IMAGE}:current"
PREVIOUS_IMAGE = f"{IMAGE}:previous"
UNITS = ("secretsauce-family-a.service", "secretsauce-family-b.service")
CONTAINERS = (
    ("secretsauce-family-a", "family-a", "http://127.0.0.1:8081/api/health"),
    ("secretsauce-family-b", "family-b", "http://127.0.0.1:8082/api/health"),
)
HEALTH_ATTEMPTS = 30
HEALTH_INTERVAL_SECONDS = 2

REPO_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = Path("/var/lib/secretsauce")
BACKUP_ROOT = Path("/var/backups/secretsauce")

Runner = Callable[..., subprocess.CompletedProcess[str]]


class ReleaseError(RuntimeError):
    """A release could not be safely completed or rolled back."""


def run_command(
    args: Sequence[str | Path], *, check: bool = True
) -> subprocess.CompletedProcess[str]:
    """Run a command without a shell and preserve its output for diagnostics."""
    command = [str(arg) for arg in args]
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if check and result.returncode:
        raise subprocess.CalledProcessError(
            result.returncode, command, output=result.stdout, stderr=result.stderr
        )
    return result


def _run_root(runner: Runner, *args: str | Path, check: bool = True):
    return runner(["sudo", *args], check=check)


def _resolve_commit(ref: str, repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ReleaseError(f"Cannot resolve Git ref {ref!r} to a commit") from exc
    commit = result.stdout.strip()
    if not commit or any(char not in "0123456789abcdef" for char in commit.lower()):
        raise ReleaseError(f"Git returned an invalid commit id for {ref!r}")
    return commit


def _build_context(commit: str, repo_root: Path, context: Path) -> None:
    archive_path = context.parent / "source.tar"
    try:
        subprocess.run(
            [
                "git", "-C", str(repo_root), "archive", "--format=tar",
                f"--output={archive_path}", commit,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        with tarfile.open(archive_path, "r:") as archive:
            archive.extractall(context, filter="data")
    except (OSError, subprocess.CalledProcessError, tarfile.TarError) as exc:
        raise ReleaseError(f"Could not create a safe build context for {commit[:12]}") from exc


def _image_id(runner: Runner, tag: str) -> str | None:
    exists = _run_root(runner, "podman", "image", "exists", tag, check=False)
    if exists.returncode == 1:
        return None
    if exists.returncode:
        detail = exists.stderr.strip() or f"exit status {exists.returncode}"
        raise ReleaseError(f"Could not query Podman image {tag}: {detail}")

    result = _run_root(
        runner, "podman", "image", "inspect", "--format", "{{.Id}}", tag, check=False
    )
    if result.returncode:
        detail = result.stderr.strip() or f"exit status {result.returncode}"
        raise ReleaseError(f"Could not inspect Podman image {tag}: {detail}")
    image_id = result.stdout.strip()
    if not image_id:
        raise ReleaseError(f"Podman returned an empty image id for {tag}")
    return image_id


def _ensure_services_active(runner: Runner) -> None:
    for unit in UNITS:
        result = _run_root(runner, "systemctl", "is-active", "--quiet", unit, check=False)
        if result.returncode:
            raise ReleaseError(
                f"{unit} is not active; refusing to update without a complete live backup"
            )


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _backup_instances(
    runner: Runner,
    runtime_root: Path,
    backup_root: Path,
    timestamp: str,
) -> Path:
    backup_dir = backup_root / timestamp
    try:
        _run_root(runner, "install", "-d", "-o", "root", "-g", "root", "-m", "0700", backup_dir)
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ReleaseError(f"Could not create backup directory {backup_dir}; no image switch was made") from exc
    for container, family, _ in CONTAINERS:
        archive_name = f"{family}-{timestamp}.zip"
        container_archive = f"/tmp/{archive_name}"
        destination = backup_dir / archive_name
        try:
            _run_root(
                runner, "podman", "exec", container, "secretsauce", "export",
                "--data-dir", "/data", "--output", container_archive,
            )
            _run_root(runner, "podman", "cp", f"{container}:{container_archive}", destination)
            _run_root(runner, "chown", "root:root", destination)
            _run_root(runner, "chmod", "0600", destination)
            _run_root(
                runner,
                "install", "-o", "root", "-g", "root", "-m", "0600",
                runtime_root / family / "secret.key",
                backup_dir / f"{family}-secret.key",
            )
        except (OSError, subprocess.CalledProcessError) as exc:
            raise ReleaseError(f"Backup failed for {family}; no image switch was made") from exc
    return backup_dir


def _restart_services(runner: Runner, *, first_install: bool = False) -> None:
    action = "start" if first_install else "restart"
    _run_root(runner, "systemctl", action, *UNITS)


def _wait_for_health(
    runner: Runner,
    *,
    attempts: int = HEALTH_ATTEMPTS,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> None:
    for attempt in range(attempts):
        all_healthy = True
        for _, _, url in CONTAINERS:
            result = _run_root(
                runner,
                "curl", "--fail", "--silent", "--show-error", "--max-time", "3", url,
                check=False,
            )
            if result.returncode:
                all_healthy = False
        if all_healthy:
            return
        if attempt + 1 < attempts:
            sleep_fn(HEALTH_INTERVAL_SECONDS)
    raise ReleaseError("One or both family instances did not become healthy")


def _restore_image(runner: Runner, image_id: str, *, first_install: bool = False) -> None:
    _run_root(runner, "podman", "tag", image_id, CURRENT_IMAGE)
    _restart_services(runner, first_install=first_install)


def deploy(
    ref: str,
    *,
    repo_root: Path = REPO_ROOT,
    runtime_root: Path = RUNTIME_ROOT,
    backup_root: Path = BACKUP_ROOT,
    runner: Runner = run_command,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> None:
    """Build a commit and safely switch both family services to that image."""
    commit = _resolve_commit(ref, repo_root)
    release_image = f"{IMAGE}:{commit[:12]}"

    with tempfile.TemporaryDirectory(prefix="secretsauce-release-") as temp_dir:
        temp_path = Path(temp_dir)
        context = temp_path / "context"
        context.mkdir()
        _build_context(commit, repo_root, context)
        try:
            _run_root(
                runner,
                "podman", "build", "--format", "docker", "--pull=missing",
                "--tag", release_image, "--file", context / "Containerfile", context,
            )
        except (OSError, subprocess.CalledProcessError) as exc:
            raise ReleaseError(f"Image build failed for {commit[:12]}; running services are unchanged") from exc

    old_image_id = _image_id(runner, CURRENT_IMAGE)
    if old_image_id is not None:
        _ensure_services_active(runner)
        _backup_instances(runner, runtime_root, backup_root, _timestamp())
        _run_root(runner, "podman", "tag", old_image_id, PREVIOUS_IMAGE)

    _run_root(runner, "podman", "tag", release_image, CURRENT_IMAGE)
    try:
        _restart_services(runner, first_install=old_image_id is None)
        _wait_for_health(runner, sleep_fn=sleep_fn)
    except (OSError, subprocess.CalledProcessError, ReleaseError) as exc:
        if old_image_id is None:
            _run_root(runner, "systemctl", "stop", *UNITS, check=False)
            raise ReleaseError(f"Initial release failed health checks; services were stopped: {exc}") from exc
        try:
            _restore_image(runner, old_image_id)
            _wait_for_health(runner, sleep_fn=sleep_fn)
            raise ReleaseError(f"New release failed; previous image restored: {exc}") from exc
        except ReleaseError as rollback_error:
            if "previous image restored" in str(rollback_error):
                raise
            raise ReleaseError(
                f"New release failed ({exc}); previous image tag restored but rollback health failed ({rollback_error})"
            ) from exc
        except (OSError, subprocess.CalledProcessError) as rollback_error:
            raise ReleaseError(
                f"New release failed ({exc}) and restoring the previous image also failed: {rollback_error}"
            ) from exc


def rollback(
    *,
    runtime_root: Path = RUNTIME_ROOT,
    backup_root: Path = BACKUP_ROOT,
    runner: Runner = run_command,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> None:
    """Switch to the last successful image, retaining the current one on failure."""
    current_image_id = _image_id(runner, CURRENT_IMAGE)
    previous_image_id = _image_id(runner, PREVIOUS_IMAGE)
    if current_image_id is None or previous_image_id is None:
        raise ReleaseError("Both current and previous images are required for rollback")

    _ensure_services_active(runner)
    _backup_instances(runner, runtime_root, backup_root, _timestamp())
    _run_root(runner, "podman", "tag", previous_image_id, CURRENT_IMAGE)
    try:
        _restart_services(runner)
        _wait_for_health(runner, sleep_fn=sleep_fn)
    except (OSError, subprocess.CalledProcessError, ReleaseError) as exc:
        try:
            _restore_image(runner, current_image_id)
            _wait_for_health(runner, sleep_fn=sleep_fn)
        except (OSError, subprocess.CalledProcessError, ReleaseError) as recovery_error:
            raise ReleaseError(
                f"Rollback failed ({exc}); restoring the current image also failed ({recovery_error})"
            ) from exc
        raise ReleaseError(f"Rollback image was unhealthy; current image restored: {exc}") from exc
    _run_root(runner, "podman", "tag", current_image_id, PREVIOUS_IMAGE)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Deploy or roll back SecretSauce Podman images")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--rollback", action="store_true", help="restore the previous image")
    action.add_argument("ref", nargs="?", help="Git ref (branch, tag, or commit) to deploy")
    args = parser.parse_args(argv)
    try:
        if args.rollback:
            rollback()
        else:
            deploy(args.ref)
    except (ReleaseError, OSError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"release failed: {exc}\n")
    print("Rollback healthy; current and previous images swapped." if args.rollback else "Release healthy on both family instances.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
