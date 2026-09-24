from datetime import datetime, timezone


def now_iso() -> str:
    """UTC timestamp in the kernel's canonical second-precision ISO format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
