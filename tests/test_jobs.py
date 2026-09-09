import pytest
from secretsauce.db import Database
from secretsauce.errors import NotFoundError
from secretsauce.jobs import JobManager


@pytest.mark.asyncio
async def test_job_lifecycle(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    jm = JobManager(db)

    job_id = await jm.create_job(
        "test-plugin", "import_url", {"url": "https://example.com"}
    )
    job = await jm.get_job(job_id)
    assert job["status"] == "pending"
    assert job["input"] == {"url": "https://example.com"}

    async with jm.run(job_id) as handle:
        await handle.set_progress(50, "Parsing recipe...")
        job_mid = await jm.get_job(job_id)
        assert job_mid["status"] == "running"
        assert job_mid["progress"] == 50
        assert job_mid["message"] == "Parsing recipe..."
        await handle.set_result({"recipe_id": "r1"})

    job_done = await jm.get_job(job_id)
    assert job_done["status"] == "done"
    assert job_done["result"] == {"recipe_id": "r1"}
    assert job_done["finished_at"] is not None

    await db.close()


@pytest.mark.asyncio
async def test_job_failure(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    jm = JobManager(db)

    job_id = await jm.create_job("test-plugin", "failing_job")

    with pytest.raises(RuntimeError):
        async with jm.run(job_id) as handle:
            await handle.set_progress(10, "Working...")
            raise RuntimeError("Something crashed")

    job = await jm.get_job(job_id)
    assert job["status"] == "failed"
    assert "Something crashed" in job["error"]
    assert job["finished_at"] is not None

    await db.close()


@pytest.mark.asyncio
async def test_job_cancellation_and_boot_recovery(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    jm = JobManager(db)

    j1 = await jm.create_job("p1", "type1")
    await jm.cancel_job(j1)
    job1 = await jm.get_job(j1)
    assert job1["status"] == "cancelled"

    # Create pending and running jobs
    j2 = await jm.create_job("p1", "type2")
    j3 = await jm.create_job("p1", "type3")
    async with db.transaction() as tx:
        await tx.execute("UPDATE jobs SET status = 'running' WHERE id = ?;", (j3,))

    # Boot recovery
    recovered = await jm.recover_stale_jobs_on_boot()
    assert recovered == 2

    job2 = await jm.get_job(j2)
    assert job2["status"] == "failed"
    assert "Server restarted" in job2["error"]

    job3 = await jm.get_job(j3)
    assert job3["status"] == "failed"

    await db.close()
