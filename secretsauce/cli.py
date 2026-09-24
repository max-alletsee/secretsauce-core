import argparse
import asyncio
from datetime import datetime, timezone
import os
import sys

from secretsauce.api.routes.export import create_export_zip, restore_from_zip
from secretsauce.boot import resolve_data_dir
from secretsauce.config import load_config
from secretsauce.db import Database


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="secretsauce",
        description="SecretSauce Kernel & CLI",
    )
    subparsers = parser.add_subparsers(dest="subcommand")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Run SecretSauce server")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    serve_parser.add_argument("--port", type=int, default=None, help="Bind port (default: from config or 8080)")
    serve_parser.add_argument("--data-dir", default=None, help="Path to data directory")

    # migrate
    migrate_parser = subparsers.add_parser("migrate", help="Run database migrations")
    migrate_parser.add_argument("--data-dir", default=None, help="Path to data directory")

    # export
    export_parser = subparsers.add_parser("export", help="Export backup zip")
    export_parser.add_argument("--data-dir", default=None, help="Path to data directory")
    export_parser.add_argument("--output", "-o", default=None, help="Target zip file path")

    # restore
    restore_parser = subparsers.add_parser("restore", help="Restore data directory from backup zip")
    restore_parser.add_argument("backup", help="Path to backup zip file")
    restore_parser.add_argument("--data-dir", default=None, help="Path to data directory")

    return parser


def cli_main(args: list[str] | None = None) -> int:
    parser = build_parser()
    parsed = parser.parse_args(args)

    subcommand = parsed.subcommand or "serve"

    data_dir = resolve_data_dir(getattr(parsed, "data_dir", None))
    os.environ["DATA_DIR"] = str(data_dir)
    os.environ["SECRETSAUCE_DATA_DIR"] = str(data_dir)

    if subcommand == "serve":
        config = load_config(config_path=data_dir / "config.json")
        port = parsed.port if parsed.port is not None else config.port
        forwarded_allow_ips = config.forwarded_allow_ips if config.forwarded_allow_ips else None

        import uvicorn

        uvicorn.run(
            "secretsauce.app:build_app",
            host=parsed.host,
            port=port,
            factory=True,
            proxy_headers=True,
            forwarded_allow_ips=forwarded_allow_ips,
            log_level=config.log_level,
        )
        return 0

    elif subcommand == "migrate":
        data_dir.mkdir(parents=True, exist_ok=True)
        db_path = data_dir / "secretsauce.db"

        async def _migrate():
            db = Database(db_path)
            await db.connect()
            await db.run_migrations()
            await db.close()

        asyncio.run(_migrate())
        print(f"Migrations applied successfully to {db_path}")
        return 0

    elif subcommand == "export":
        db_path = data_dir / "secretsauce.db"
        if not db_path.exists():
            print(f"Database {db_path} does not exist", file=sys.stderr)
            return 1

        output_path = parsed.output
        if not output_path:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            output_path = f"secretsauce-export-{ts}.zip"

        async def _export():
            db = Database(db_path)
            await db.connect()
            await create_export_zip(db, data_dir, target_path=output_path)
            await db.close()

        asyncio.run(_export())
        print(f"Exported data to {output_path}")
        return 0

    elif subcommand == "restore":
        try:
            restore_from_zip(parsed.backup, data_dir)
            print(f"Restored data from {parsed.backup} to {data_dir}")
            return 0
        except Exception as e:
            print(f"Restore failed: {e}", file=sys.stderr)
            return 1

    else:
        parser.print_help()
        return 1


def main() -> None:
    sys.exit(cli_main())
