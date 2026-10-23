#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ROOT_PREFIX="${SECRETSAUCE_INSTALL_ROOT:-}"

if [[ -z "${ROOT_PREFIX}" && "$(id -u)" -ne 0 ]]; then
  echo "Run this installer with sudo: sudo $0" >&2
  exit 1
fi

if [[ -z "${ROOT_PREFIX}" ]]; then
  command -v podman >/dev/null || { echo "Podman 5.8+ is required" >&2; exit 1; }
  command -v systemctl >/dev/null || { echo "systemd is required" >&2; exit 1; }
fi

target_path() {
  local path="$1"
  if [[ -n "${ROOT_PREFIX}" ]]; then
    printf '%s%s\n' "${ROOT_PREFIX%/}" "${path}"
  else
    printf '%s\n' "${path}"
  fi
}

quadlet_dir="$(target_path /etc/containers/systemd)"
family_a_data="$(target_path /var/lib/secretsauce/family-a)"
family_b_data="$(target_path /var/lib/secretsauce/family-b)"
backup_dir="$(target_path /var/backups/secretsauce)"

if [[ -n "${ROOT_PREFIX}" ]]; then
  mkdir -p "${quadlet_dir}" "${family_a_data}" "${family_b_data}" "${backup_dir}"
else
  install -d -m 0755 "${quadlet_dir}"
  install -d -m 0700 "${family_a_data}" "${family_b_data}" "${backup_dir}"
fi
install -m 0644 "${REPO_ROOT}/deploy/quadlet/secretsauce-family-a.container" "${quadlet_dir}/secretsauce-family-a.container"
install -m 0644 "${REPO_ROOT}/deploy/quadlet/secretsauce-family-b.container" "${quadlet_dir}/secretsauce-family-b.container"

if [[ -z "${ROOT_PREFIX}" ]]; then
  chown 10001:10001 "${family_a_data}" "${family_b_data}"
  chown root:root "${backup_dir}"
  chmod 0700 "${family_a_data}" "${family_b_data}" "${backup_dir}"
  chown root:root "${quadlet_dir}/secretsauce-family-a.container" "${quadlet_dir}/secretsauce-family-b.container"
  systemctl daemon-reload
  echo "Quadlets installed. Run deploy/release.py with a Git ref to build and start both services."
else
  echo "Quadlets and data directories staged under ${ROOT_PREFIX}; systemd was not reloaded."
fi
