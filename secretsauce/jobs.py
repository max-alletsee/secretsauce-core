import asyncio
from contextlib import asynccontextmanager
import json
import logging
from typing import Any, AsyncIterator, Awaitable, Callable
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.events import FALLBACK_WAKE_SECONDS, EventLog, acting_as
from secretsauce.util import now_iso

logger = logging.getLogger(__name__)

JobHandler = Callable[[dict[str, Any], "JobHandle"], Awaitable[Any]]

INTERRUPTED_MESSAGE = "interrupted by restart"
_RUNNER_BATCH = 50


class JobNotPending(ConflictError):
    """The job was cancelled or claimed before this runner could start it."""


def _row_to_job(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    for col in ("input", "result"):
        if isinstance(res.get(col), str):
            try:
                res[col] = json.loads(res[col])
            except (json.JSONDecodeError, TypeError):
                pass
    return res


class JobHandle:
    def __init__(self, job_id: str, manager: "JobManager"):
        self.job_id = job_id
        self.manager = manager
        self._result: Any = None

    async def set_progress(self, progress: int, message: str | None = None) -> None:
        """Updates the row and pushes job:progress; progress never enters the event log."""
        percent = max(0, min(100, int(progress)))
        async with self.manager.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE jobs SET progress = ?, message = COALESCE(?, message)
                WHERE id = ? AND status = 'running';
                """,
                (percent, message, self.job_id),
            )
            self.manager.db.after_commit(
                lambda: self.manager.push(
                    "job:progress", {"id": self.job_id, "percent": percent, "message": message}
                )
            )

    progress = set_progress

    async def set_result(self, result: Any) -> None:
        self._result = result
        # A cancelled or finished job keeps the outcome it already has.
        await self.manager.db.write(
            "UPDATE jobs SET result = ? WHERE id = ? AND status = 'running';",
            (json.dumps(result), self.job_id),
        )

    async def is_cancelled(self) -> bool:
        job = await self.manager.get_job(self.job_id)
        return job.get("status") == "cancelled"


class JobManager:
    """Job rows plus the runner that executes pending jobs as tracked tasks (spec 6.8)."""

    def __init__(
        self,
        db: Database,
        events: EventLog | None = None,
        broadcaster: Any = None,
        fallback_seconds: float = FALLBACK_WAKE_SECONDS,
    ):
        self.db = db
        self.events = events
        self.broadcaster = broadcaster
        self.fallback_seconds = fallback_seconds
        self._handlers: dict[tuple[str, str], JobHandler] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._task_plugins: dict[str, str] = {}
        self._cancel_requested: set[str] = set()
        self._wake = asyncio.Event()
        self._runner: asyncio.Task | None = None

    # -- handlers ---------------------------------------------------------

    def register_handler(self, plugin_id: str, job_type: str, handler: JobHandler) -> None:
        self._handlers[(plugin_id, job_type)] = handler
        self.wake()

    def unregister_plugin(self, plugin_id: str) -> None:
        for key in [k for k in self._handlers if k[0] == plugin_id]:
            del self._handlers[key]

    def push(self, name: str, data: Any) -> None:
        if self.broadcaster is not None:
            self.broadcaster.broadcast_push(name, data)

    # -- runner -------------------------------------------------------------

    def wake(self) -> None:
        self._wake.set()

    def start(self) -> None:
        if self._runner is None:
            self._runner = asyncio.create_task(self._run_loop(), name="job-runner")

    async def stop(self) -> None:
        runner, self._runner = self._runner, None
        tasks = list(self._tasks.values())
        for task in [runner, *tasks]:
            if task is not None:
                task.cancel()
        await asyncio.gather(*(t for t in [runner, *tasks] if t is not None), return_exceptions=True)

    async def _run_loop(self) -> None:
        while True:
            self._wake.clear()
            try:
                await self._dispatch_pending()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Job runner failed to dispatch pending jobs")
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=self.fallback_seconds)
            except asyncio.TimeoutError:
                pass

    async def _dispatch_pending(self) -> None:
        rows = await self.db.read_all(
            "SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at, rowid LIMIT ?;",
            (_RUNNER_BATCH,),
        )
        for row in rows:
            handler = self._handlers.get((row["plugin_id"], row["job_type"]))
            # Jobs whose plugin has not registered a handler (yet) stay pending.
            if handler is not None and row["id"] not in self._tasks:
                self._spawn(_row_to_job(row), handler)

    def _spawn(self, job: dict[str, Any], handler: JobHandler) -> asyncio.Task:
        task = asyncio.create_task(self._execute(job, handler), name=f"job:{job['id']}")
        self._tasks[job["id"]] = task
        self._task_plugins[job["id"]] = job["plugin_id"]

        def _done(t: asyncio.Task, job_id: str = job["id"]) -> None:
            self._tasks.pop(job_id, None)
            self._task_plugins.pop(job_id, None)
            self._cancel_requested.discard(job_id)
            if not t.cancelled() and t.exception() is not None:
                logger.error("Job %s crashed", job_id, exc_info=t.exception())

        task.add_done_callback(_done)
        return task

    async def _execute(self, job: dict[str, Any], handler: JobHandler) -> None:
        try:
            async with self.run(job["id"]) as handle:
                with acting_as(f"plugin:{job['plugin_id']}"):
                    result = await handler(job.get("input") or {}, handle)
                if result is not None:
                    await handle.set_result(result)
        except JobNotPending:
            return
        except asyncio.CancelledError:
            if job["id"] in self._cancel_requested:
                return  # cancel_job() already recorded the outcome
            raise
        except Exception:
            logger.warning(
                "Job %s (%s/%s) failed", job["id"], job["plugin_id"], job["job_type"],
                exc_info=True,
            )

    async def execute_job(self, job_id: str) -> dict[str, Any]:
        """Runs one job now, in the caller's task, and returns its final row."""
        job = await self.get_job(job_id)
        handler = self._handlers.get((job["plugin_id"], job["job_type"]))
        if not handler:
            raise ValueError(
                f"No handler registered for job {job['job_type']} (plugin {job['plugin_id']})"
            )
        await self._execute(job, handler)
        return await self.get_job(job_id)

    run_job = execute_job

    async def cancel_plugin_jobs(self, plugin_id: str) -> None:
        for job_id, owner in list(self._task_plugins.items()):
            if owner == plugin_id:
                await self.cancel_job(job_id)

    # -- rows -----------------------------------------------------------------

    async def _log(
        self, conn: aiosqlite.Connection, name: str, job: dict[str, Any], status: str
    ) -> None:
        if self.events is None:
            return
        await self.events.append(
            conn,
            name=name,
            data={"plugin_id": job["plugin_id"], "job_type": job["job_type"], "status": status},
            entity_type="job",
            entity_id=job["id"],
            origin="system",
        )

    async def create_job(
        self,
        plugin_id: str,
        job_type: str,
        input_data: dict[str, Any] | None = None,
    ) -> str:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                INSERT INTO jobs (
                    id, plugin_id, job_type, status, progress, input, created_at
                ) VALUES (?, ?, ?, 'pending', 0, ?, ?);
                """,
                (job_id, plugin_id, job_type, json.dumps(input_data or {}), now_iso()),
            )
            self.db.after_commit(self.wake, key="job-runner-wake")
        return job_id

    async def get_job(self, job_id: str) -> dict[str, Any]:
        row = await self.db.read_one("SELECT * FROM jobs WHERE id = ?;", (job_id,))
        if row is None:
            raise NotFoundError(f"Job {job_id} not found")
        return _row_to_job(row)

    async def list_jobs(
        self,
        status: str | None = None,
        plugin_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        clauses = []
        params: list[Any] = []
        if status is not None:
            clauses.append("status = ?")
            params.append(status)
        if plugin_id is not None:
            clauses.append("plugin_id = ?")
            params.append(plugin_id)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        params.extend([limit, offset])
        rows = await self.db.read_all(
            f"SELECT * FROM jobs {where} ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?;",
            params,
        )
        return [_row_to_job(r) for r in rows]

    async def cancel_job(self, job_id: str) -> None:
        async with self.db.transaction() as tx:
            job = await self.db.read_one("SELECT * FROM jobs WHERE id = ?;", (job_id,), conn=tx)
            if job is None:
                raise NotFoundError(f"Job {job_id} not found")
            cursor = await tx.execute(
                """
                UPDATE jobs SET status = 'cancelled', finished_at = ?
                WHERE id = ? AND status IN ('pending', 'running');
                """,
                (now_iso(), job_id),
            )
            if cursor.rowcount and job["status"] == "running":
                await self._log(tx, "job:finished", job, "cancelled")

        task = self._tasks.get(job_id)
        if task is not None and task is not asyncio.current_task():
            self._cancel_requested.add(job_id)
            task.cancel()

    async def recover_stale_jobs_on_boot(self) -> int:
        """Jobs that were running when the process stopped cannot resume (spec 6.8)."""
        async with self.db.transaction() as tx:
            cursor = await tx.execute(
                """
                UPDATE jobs SET status = 'failed', error = ?, finished_at = ?
                WHERE status = 'running';
                """,
                (INTERRUPTED_MESSAGE, now_iso()),
            )
            return cursor.rowcount

    async def _claim(self, job_id: str) -> dict[str, Any] | None:
        async with self.db.transaction() as tx:
            cursor = await tx.execute(
                "UPDATE jobs SET status = 'running', started_at = ? WHERE id = ? AND status = 'pending';",
                (now_iso(), job_id),
            )
            if cursor.rowcount != 1:
                return None
            job = _row_to_job(
                await self.db.read_one("SELECT * FROM jobs WHERE id = ?;", (job_id,), conn=tx)
            )
            await self._log(tx, "job:started", job, "running")
            return job

    async def _finish(
        self, job: dict[str, Any], status: str, result: Any = None, error: str | None = None
    ) -> None:
        async with self.db.transaction() as tx:
            cursor = await tx.execute(
                """
                UPDATE jobs SET
                    status = ?,
                    result = COALESCE(?, result),
                    error = ?,
                    progress = CASE WHEN ? = 'done' THEN 100 ELSE progress END,
                    finished_at = ?
                WHERE id = ? AND status = 'running';
                """,
                (
                    status,
                    json.dumps(result) if result is not None else None,
                    error,
                    status,
                    now_iso(),
                    job["id"],
                ),
            )
            if cursor.rowcount == 1:
                await self._log(tx, "job:finished", job, status)

    @asynccontextmanager
    async def run(self, job_id: str) -> AsyncIterator[JobHandle]:
        """Claims a pending job, yields its handle and records the outcome.

        Raises JobNotPending when the job is no longer pending (for example
        cancelled before it started), so its body never runs.
        """
        job = await self._claim(job_id)
        if job is None:
            raise JobNotPending(f"Job {job_id} is not pending", current=await self.get_job(job_id))

        handle = JobHandle(job_id, self)
        try:
            yield handle
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self._finish(job, "failed", error=str(exc) or repr(exc))
            raise
        await self._finish(job, "done", result=handle._result)
