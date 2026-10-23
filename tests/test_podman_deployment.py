from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_containerfile_builds_shell_and_runs_non_root_runtime():
    containerfile = (ROOT / "Containerfile").read_text(encoding="utf-8")

    assert "FROM node:22" in containerfile
    assert "FROM python:3.12" in containerfile
    assert "pnpm --prefix shell install --frozen-lockfile" in containerfile
    assert "pnpm --prefix shell build" in containerfile
    assert "uv sync --frozen --no-dev" in containerfile
    assert "USER 10001:10001" in containerfile
    assert 'VOLUME ["/data"]' in containerfile
    assert "HEALTHCHECK" in containerfile


def test_build_context_excludes_local_state_and_tooling():
    ignored = set((ROOT / ".containerignore").read_text(encoding="utf-8").splitlines())

    assert ".git" in ignored
    assert ".venv" in ignored
    assert "node_modules" in ignored
    assert "data" in ignored
    assert "test-data" in ignored
    assert "dev-data" in ignored
    assert ".env" in ignored
    assert ".env.*" in ignored
    assert "*.key" in ignored
    assert "*.zip" in ignored
    assert "backups" in ignored


def test_family_quadlets_are_isolated_and_restartable():
    family_a = (ROOT / "deploy/quadlet/secretsauce-family-a.container").read_text(encoding="utf-8")
    family_b = (ROOT / "deploy/quadlet/secretsauce-family-b.container").read_text(encoding="utf-8")

    for unit in (family_a, family_b):
        assert "Image=localhost/secretsauce:current" in unit
        assert "HealthOnFailure=kill" in unit
        assert "Restart=always" in unit
        assert "RestartSec=5s" in unit
        unit_section = unit.split("[Container]", 1)[0]
        service_section = unit.split("[Service]", 1)[1]
        assert "StartLimitIntervalSec=0" in unit_section
        assert "StartLimitIntervalSec=0" not in service_section
        assert "WantedBy=multi-user.target" in unit
        assert "COOKIE_SECURE=true" in unit
        assert "FORWARDED_ALLOW_IPS=10.88.0.1" in unit

    assert "127.0.0.1:8081:8080" in family_a
    assert "/var/lib/secretsauce/family-a:/data:Z" in family_a
    assert "127.0.0.1:8082:8080" in family_b
    assert "/var/lib/secretsauce/family-b:/data:Z" in family_b
    assert "ContainerName=secretsauce-family-a" in family_a
    assert "ContainerName=secretsauce-family-b" in family_b


def _release_module():
    import importlib.util
    import pytest

    module_path = ROOT / "deploy/release.py"
    if not module_path.exists():
        pytest.fail("deploy/release.py does not exist")
    spec = importlib.util.spec_from_file_location("secretsauce_release", module_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeReleaseRunner:
    def __init__(self, *, healthy=True, fail_build=False, fail_export=False, inactive_service=None, fail_image_query=False, fail_backup_dir=False):
        from collections import defaultdict

        self.calls = []
        self.images = {
            "localhost/secretsauce:current": "sha256:old",
            "localhost/secretsauce:previous": "sha256:older",
        }
        self.healthy = healthy
        self.fail_build = fail_build
        self.fail_export = fail_export
        self.inactive_service = inactive_service
        self.fail_image_query = fail_image_query
        self.fail_backup_dir = fail_backup_dir
        self.restart_count = 0
        self._image_sequence = 0
        self._exports = defaultdict(int)

    def __call__(self, args, *, check=True):
        import subprocess

        args = [str(arg) for arg in args]
        self.calls.append(args)
        command = args[1:] if args and args[0] == "sudo" else args
        status, stdout, stderr = 0, "", ""

        if command[:3] == ["podman", "image", "exists"]:
            if self.fail_image_query:
                status, stderr = 125, "image store unavailable"
            else:
                status = 0 if command[-1] in self.images else 1
        elif command[:2] == ["podman", "image"] and command[2:3] == ["inspect"]:
            tag = command[-1]
            image_id = self.images.get(tag)
            if image_id is None:
                status, stderr = 1, "image not found"
            else:
                stdout = image_id
        elif command[:2] == ["podman", "build"]:
            if self.fail_build:
                status, stderr = 1, "build failed"
            else:
                self._image_sequence += 1
                tag_index = command.index("--tag") + 1
                self.images[command[tag_index]] = f"sha256:new{self._image_sequence}"
        elif command[:2] == ["podman", "tag"]:
            source, target = command[2:4]
            image_id = self.images.get(source, source)
            self.images[target] = image_id
        elif command[:2] == ["systemctl", "is-active"]:
            if command[-1] == self.inactive_service:
                status = 3
                stderr = "inactive"
        elif command[:2] in (["systemctl", "restart"], ["systemctl", "start"]):
            self.restart_count += 1
        elif command[:2] == ["podman", "exec"]:
            if self.fail_export and "export" in command:
                status, stderr = 1, "backup failed"
        elif command[:2] == ["podman", "cp"]:
            pass
        elif command[0] == "curl":
            if not self.healthy:
                status, stderr = 22, "health check failed"
        elif command[0] == "install" and command[1:2] == ["-d"]:
            if self.fail_backup_dir:
                status, stderr = 1, "backup directory is not writable"
        elif command[0] in ("install", "chmod", "chown"):
            pass
        else:
            raise AssertionError(f"Unexpected command: {args}")

        result = subprocess.CompletedProcess(args, status, stdout, stderr)
        if check and status:
            raise subprocess.CalledProcessError(status, args, output=stdout, stderr=stderr)
        return result


def _git_repo(tmp_path):
    import subprocess

    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    subprocess.run(["git", "-C", str(repo), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(repo), "config", "user.name", "Deployment Test"], check=True)
    (repo / "committed.txt").write_text("included", encoding="utf-8")
    subprocess.run(["git", "-C", str(repo), "add", "committed.txt"], check=True)
    subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", "deployment fixture"], check=True)
    return repo


def test_invalid_ref_does_not_invoke_podman(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner()

    with pytest.raises(release.ReleaseError):
        release.deploy("missing-ref", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.calls == []


def test_build_failure_leaves_current_image_and_services_unchanged(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(fail_build=True)

    with pytest.raises(release.ReleaseError):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.restart_count == 0
    assert not any(call[1:3] == ["podman", "tag"] for call in runner.calls)


def test_image_store_error_aborts_instead_of_treating_as_first_install(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(fail_image_query=True)

    with pytest.raises(release.ReleaseError, match="image store"):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.restart_count == 0


def test_backup_failure_aborts_before_retag_or_restart(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(fail_export=True)

    with pytest.raises(release.ReleaseError):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.restart_count == 0
    assert not any(call[1:3] == ["podman", "tag"] for call in runner.calls)


def test_backup_directory_failure_reports_safe_release_error(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(fail_backup_dir=True)

    with pytest.raises(release.ReleaseError, match="backup"):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.restart_count == 0


def test_inactive_family_aborts_before_retag_or_restart(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(inactive_service="secretsauce-family-b.service")

    with pytest.raises(release.ReleaseError):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.restart_count == 0
    assert not any(call[1:3] == ["podman", "tag"] for call in runner.calls)


def test_successful_deploy_backs_up_and_restarts_both_families(tmp_path):
    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner()

    release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner, sleep_fn=lambda _: None)

    assert runner.images["localhost/secretsauce:current"].startswith("sha256:new")
    assert runner.images["localhost/secretsauce:previous"] == "sha256:old"
    assert runner.restart_count == 1
    assert sum("/api/health" in " ".join(call) for call in runner.calls) == 2
    assert sum("secretsauce export" in " ".join(call) for call in runner.calls) == 2
    assert sum("secret.key" in " ".join(call) for call in runner.calls) == 2
    assert any("--format" in call and "docker" in call for call in runner.calls)


def test_failed_health_check_restores_previous_image_and_restarts(tmp_path):
    import pytest

    release = _release_module()
    repo = _git_repo(tmp_path)
    runner = FakeReleaseRunner(healthy=False)

    with pytest.raises(release.ReleaseError):
        release.deploy("HEAD", repo_root=repo, runtime_root=tmp_path / "runtime", backup_root=tmp_path / "backups", runner=runner, sleep_fn=lambda _: None)

    assert runner.images["localhost/secretsauce:current"] == "sha256:old"
    assert runner.images["localhost/secretsauce:previous"] == "sha256:old"
    assert runner.restart_count == 2


def test_cli_reports_privileged_command_failure_without_traceback(monkeypatch, capsys):
    import subprocess
    import pytest

    release = _release_module()

    def fail_deploy(_ref):
        raise subprocess.CalledProcessError(1, ["sudo", "podman", "tag"])

    monkeypatch.setattr(release, "deploy", fail_deploy)
    with pytest.raises(SystemExit) as error:
        release.main(["HEAD"])

    assert error.value.code == 1
    assert "release failed:" in capsys.readouterr().err


def test_explicit_rollback_restores_current_image_if_health_check_fails(tmp_path):
    import pytest

    release = _release_module()
    runner = FakeReleaseRunner(healthy=False)
    runner.images["localhost/secretsauce:current"] = "sha256:new"
    runner.images["localhost/secretsauce:previous"] = "sha256:old"

    with pytest.raises(release.ReleaseError):
        release.rollback(runtime_root=tmp_path / "runtime", runner=runner, sleep_fn=lambda _: None)

    assert runner.images["localhost/secretsauce:current"] == "sha256:new"
    assert runner.images["localhost/secretsauce:previous"] == "sha256:old"
    assert runner.restart_count == 2


def test_installer_creates_family_data_backup_and_quadlet_paths(tmp_path):
    import os
    import subprocess
    import pytest

    installer = ROOT / "deploy/install.sh"
    if not installer.exists():
        pytest.fail("deploy/install.sh does not exist")
    bash = __import__("shutil").which("bash")
    if bash is None:
        pytest.skip("Bash is required to exercise the host installer")
    root_prefix = tmp_path.resolve().as_posix()
    if len(root_prefix) > 2 and root_prefix[1:3] == ":/":
        root_prefix = f"/{root_prefix[0].lower()}{root_prefix[2:]}"
    env = os.environ.copy()
    env["SECRETSAUCE_INSTALL_ROOT"] = root_prefix

    result = subprocess.run([bash, str(installer)], capture_output=True, text=True, env=env)

    assert result.returncode == 0, result.stderr
    assert (tmp_path / "etc/containers/systemd/secretsauce-family-a.container").is_file()
    assert (tmp_path / "etc/containers/systemd/secretsauce-family-b.container").is_file()
    assert (tmp_path / "var/lib/secretsauce/family-a").is_dir()
    assert (tmp_path / "var/lib/secretsauce/family-b").is_dir()
    assert (tmp_path / "var/backups/secretsauce").is_dir()


def test_caddy_and_readme_point_to_the_operator_guide():
    import pytest

    caddy_path = ROOT / "deploy/Caddyfile.example"
    if not caddy_path.exists():
        pytest.fail("deploy/Caddyfile.example does not exist")
    caddy = caddy_path.read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    guide_path = ROOT / "docs/DEPLOY_PODMAN.md"
    if not guide_path.exists():
        import pytest

        pytest.fail("docs/DEPLOY_PODMAN.md does not exist")
    guide = guide_path.read_text(encoding="utf-8")

    assert "family-a.example.com" in caddy
    assert "127.0.0.1:8081" in caddy
    assert "family-b.example.com" in caddy
    assert "127.0.0.1:8082" in caddy
    assert "DEPLOY_PODMAN.md" in readme
    for section in ("First setup", "Update", "Rollback", "Logs", "HTTPS", "secret.key"):
        assert section.lower() in guide.lower()
