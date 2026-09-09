import argparse
import asyncio
from datetime import datetime, timezone
import os
from pathlib import Path
import sys

from secretsauce.api.routes.export import create_export_zip
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
    serve_parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    serve_parser.add_argument("--data-dir", default=None, help="Path to data directory")

    # migrate
    migrate_parser = subparsers.add_parser("migrate", help="Run database migrations")
    migrate_parser.add_argument("--data-dir", default=None, help="Path to data directory")

    # export
    export_parser = subparsers.add_parser("export", help="Export backup zip")
    export_parser.add_argument("--data-dir", default=None, help="Path to data directory")
    export_parser.add_argument("--output", "-o", default=None, help="Target zip file path")

    return parser


def cli_main(args: list[str] | None = None) -> int:
    parser = build_parser()
    parsed = parser.parse_args(args)

    subcommand = parsed.subcommand or "serve"

    def get_data_dir(arg_dir: str | None) -> Path:
        if arg_dir:
            return Path(arg_dir)
        env_dir = os.environ.get("SECRETSAUCE_DATA_DIR")
        if env_dir:
            return Path(env_dir)
        if Path("/data").exists():
            return Path("/data")
        return Path("data")

    if subcommand == "serve":
        data_dir = get_data_dir(parsed.data_dir)
        os.environ["SECRETSAUCE_DATA_DIR"] = str(data_dir)
        import uvicorn

        uvicorn.run(
            "secretsauce.app:build_app",
            host=parsed.host,
            port=parsed.port,
            factory=True,
        )
        return 0

    elif subcommand == "migrate":
        data_dir = get_data_dir(parsed.data_dir)
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
        data_dir = get_data_dir(parsed.data_dir)
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

    else:
        parser.print_help()
        return 1


def main() -> None:
    sys.exit(cli_main())
