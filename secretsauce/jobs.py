from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from typing import Any, AsyncIterator, Callable
import uuid

from secretsauce.db import Database
from secretsauce.errors import NotFoundError


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _row_to_job(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    if isinstance(res.get("input"), str):
        try:
            res["input"] = json.loads(res["input"])
        except Exception:
            pass
    if isinstance(res.get("result"), str):
        try:
            res["result"] = json.loads(res["result"])
        except Exception:
            pass
    return res


class JobHandle:
    def __init__(self, job_id: str, manager: "JobManager"):
        self.job_id = job_id
        self.manager = manager
        self._result: Any = None

    async def set_progress(
        self, progress: int, message: str | None = None
    ) -> None:
        clamped_progress = max(0, min(100, progress))
        async with self.manager.db.transaction() as tx:
            if message is not None:
                await tx.execute(
                    "UPDATE jobs SET progress = ?, message = ? WHERE id = ?;",
                    (clamped_progress, message, self.job_id),
                )
            else:
                await tx.execute(
                    "UPDATE jobs SET progress = ? WHERE id = ?;",
                    (clamped_progress, self.job_id),
                )

    async def set_result(self, result: Any) -> None:
        self._result = result
        result_json = json.dumps(result)
        async with self.manager.db.transaction() as tx:
            await tx.execute(
                "UPDATE jobs SET result = ? WHERE id = ?;",
                (result_json, self.job_id),
            )

    async def is_cancelled(self) -> bool:
        job = await self.manager.get_job(self.job_id)
        return job.get("status") == "cancelled"


class JobManager:
    def __init__(self, db: Database):
        self.db = db
        self._handlers: dict[tuple[str, str], Callable[..., Any]] = {}

    def register_handler(
        self, plugin_id: str, job_type: str, handler: Callable[..., Any]
    ) -> None:
        self._handlers[(plugin_id, job_type)] = handler

    async def execute_job(self, job_id: str) -> dict[str, Any]:
        job = await self.get_job(job_id)
        handler = self._handlers.get((job["plugin_id"], job["job_type"]))
        if not handler:
            raise ValueError(
                f"No handler registered for job {job['job_type']} (plugin {job['plugin_id']})"
            )
        async with self.run(job_id) as handle:
            res = await handler(job.get("input") or {}, handle)
            if res is not None:
                await handle.set_result(res)
        return await self.get_job(job_id)

    async def run_job(self, job_id: str) -> dict[str, Any]:
        return await self.execute_job(job_id)

    async def create_job(
        self,
        plugin_id: str,
        job_type: str,
        input_data: dict[str, Any] | None = None,
    ) -> str:
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = _now_iso()
        input_json = json.dumps(input_data or {})

        async with self.db.transaction() as tx:
            await tx.execute(
                """
                INSERT INTO jobs (
                    id, plugin_id, job_type, status, progress, input, created_at
                ) VALUES (?, ?, ?, 'pending', 0, ?, ?);
                """,
                (job_id, plugin_id, job_type, input_json, now),
            )
        return job_id

    async def get_job(self, job_id: str) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM jobs WHERE id = ?;", (job_id,)
        )
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
        params = []
        if status is not None:
            clauses.append("status = ?")
            params.append(status)
        if plugin_id is not None:
            clauses.append("plugin_id = ?")
            params.append(plugin_id)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"SELECT * FROM jobs {where} ORDER BY created_at DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])

        rows = await self.db.read_all(sql, tuple(params))
        return [_row_to_job(r) for r in rows]

    async def cancel_job(self, job_id: str) -> None:
        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE jobs
                SET status = 'cancelled', finished_at = ?
                WHERE id = ? AND status IN ('pending', 'running');
                """,
                (now, job_id),
            )

    async def recover_stale_jobs_on_boot(self) -> int:
        now = _now_iso()
        async with self.db.transaction() as tx:
            cursor = await tx.execute(
                """
                UPDATE jobs
                SET status = 'failed',
                    error = 'Server restarted before job completed',
                    finished_at = ?
                WHERE status IN ('pending', 'running');
                """,
                (now,),
            )
            return cursor.rowcount

    @asynccontextmanager
    async def run(self, job_id: str) -> AsyncIterator[JobHandle]:
        job = await self.get_job(job_id)
        if job["status"] == "cancelled":
            handle = JobHandle(job_id, self)
            yield handle
            return

        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                "UPDATE jobs SET status = 'running', started_at = ? WHERE id = ?;",
                (now, job_id),
            )

        handle = JobHandle(job_id, self)
        try:
            yield handle
            # Complete job normally if not cancelled
            curr = await self.get_job(job_id)
            if curr["status"] != "cancelled":
                finish_time = _now_iso()
                async with self.db.transaction() as tx:
                    await tx.execute(
                        """
                        UPDATE jobs
                        SET status = 'done', progress = 100, finished_at = ?
                        WHERE id = ? AND status != 'cancelled';
                        """,
                        (finish_time, job_id),
                    )
        except Exception as e:
            finish_time = _now_iso()
            err_msg = str(e) or repr(e)
            async with self.db.transaction() as tx:
                await tx.execute(
                    """
                    UPDATE jobs
                    SET status = 'failed', error = ?, finished_at = ?
                    WHERE id = ?;
                    """,
                    (err_msg, finish_time, job_id),
                )
            raise
