import os
import uuid
from dataclasses import dataclass
from pathlib import Path

from secretsauce.api_tokens import TokenManager
from secretsauce.config import Config, load_config
from secretsauce.db import Database
from secretsauce.events import EventDispatcher, EventLog
from secretsauce.hooks import HookRegistry
from secretsauce.jobs import JobManager
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.attributes import AttributesRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.journal import JournalRepo
from secretsauce.nouns.members import MembersRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.schedule import ScheduleRepo
from secretsauce.plugins.context import PluginContext, ServiceRegistry
from secretsauce.plugins.loader import PluginLoader
from secretsauce.plugins.registry import PluginRegistry
from secretsauce.secrets import KeyManager
from secretsauce.stream import EventBroadcaster


@dataclass
class BootedKernel:
    boot_id: str
    config: Config
    key_manager: KeyManager
    db: Database
    household: HouseholdRepo
    members: MembersRepo
    recipes: RecipesRepo
    schedule: ScheduleRepo
    journal: JournalRepo
    assets: AssetsRepo
    attributes: AttributesRepo
    hooks: HookRegistry
    events: EventLog
    jobs: JobManager
    tokens: TokenManager
    services: ServiceRegistry
    registry: PluginRegistry
    loader: PluginLoader
    broadcaster: EventBroadcaster
    data_dir: Path
    uploads_dir: Path
    plugins_dir: Path


async def boot(data_dir: Path | str | None = None) -> BootedKernel:
    """Orchestrates the full kernel startup sequence."""
    if data_dir is None:
        env_dir = os.environ.get("SECRETSAUCE_DATA_DIR")
        if env_dir:
            data_path = Path(env_dir)
        elif Path("/data").exists():
            data_path = Path("/data")
        else:
            data_path = Path("data")
    else:
        data_path = Path(data_dir)

    data_path.mkdir(parents=True, exist_ok=True)
    uploads_dir = data_path / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    plugins_dir = data_path / "plugins"
    plugins_dir.mkdir(parents=True, exist_ok=True)

    config = load_config(config_path=data_path / "config.json")
    key_manager = KeyManager(data_path / "secret.key")

    db = Database(data_path / "secretsauce.db")
    await db.connect()
    await db.run_migrations()

    household = HouseholdRepo(db)
    members = MembersRepo(db)
    recipes = RecipesRepo(db)
    schedule = ScheduleRepo(db)
    journal = JournalRepo(db)
    assets = AssetsRepo(db, uploads_dir=uploads_dir)
    attributes = AttributesRepo(db)
    hooks = HookRegistry()
    broadcaster = EventBroadcaster()
    events = EventLog(db)
    events.set_broadcaster(broadcaster)
    jobs = JobManager(db)
    tokens = TokenManager(db)
    services = ServiceRegistry()
    registry = PluginRegistry(db)

    # Recover dangling jobs from previous run
    await jobs.recover_stale_jobs_on_boot()

    def context_factory(plugin_id: str) -> PluginContext:
        dispatcher = EventDispatcher(db, plugin_id=plugin_id)
        return PluginContext(
            plugin_id=plugin_id,
            db=db,
            hook_registry=hooks,
            event_log=events,
            dispatcher=dispatcher,
            job_manager=jobs,
            token_manager=tokens,
            service_registry=services,
        )

    loader = PluginLoader(
        registry, search_paths=[plugins_dir], context_factory=context_factory
    )
    await loader.discover_and_sync()

    boot_id = uuid.uuid4().hex

    return BootedKernel(
        boot_id=boot_id,
        config=config,
        key_manager=key_manager,
        db=db,
        household=household,
        members=members,
        recipes=recipes,
        schedule=schedule,
        journal=journal,
        assets=assets,
        attributes=attributes,
        hooks=hooks,
        events=events,
        jobs=jobs,
        tokens=tokens,
        services=services,
        registry=registry,
        loader=loader,
        broadcaster=broadcaster,
        data_dir=data_path,
        uploads_dir=uploads_dir,
        plugins_dir=plugins_dir,
    )
