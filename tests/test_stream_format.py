import asyncio
import json

from secretsauce.events import Event
from secretsauce.stream import EventBroadcaster
from secretsauce.testing import make_kernel


def _frames(text: str) -> list[dict]:
    frames = []
    for block in text.strip().split("\n\n"):
        frame: dict = {}
        for line in block.splitlines():
            if line.startswith(":"):
                continue
            key, _, value = line.partition(": ")
            frame[key] = json.loads(value) if key == "data" else value
        if frame:
            frames.append(frame)
    return frames


async def _append(k, n: int) -> None:
    async with k.db.transaction() as tx:
        for i in range(n):
            await k.events.append(tx, name="test:thing", data={"secret": i}, origin="system")


async def test_every_frame_carries_its_kind_and_events_omit_data(tmp_path):
    async with make_kernel(tmp_path) as k:
        await _append(k, 1)
        res = await k.client.get("/api/events/stream?live=false", headers={"Last-Event-ID": "0"})
        hello, event = _frames(res.text)[:2]
        assert hello["event"] == "hello" and hello["data"]["kind"] == "hello"
        assert hello["data"]["boot_id"] == k.boot_id
        assert event["event"] == "event" and event["data"]["kind"] == "event"
        assert "data" not in event["data"]
        assert event["id"] == str(event["data"]["seq"])


async def test_replay_pages_past_the_first_batch_via_query_param(tmp_path):
    async with make_kernel(tmp_path) as k:
        start = await k.events.get_head_seq()
        await _append(k, 1200)
        res = await k.client.get(f"/api/events/stream?live=false&last_event_id={start}")
        replayed = [f for f in _frames(res.text) if f["event"] == "event"]
        assert len(replayed) == 1200
        seqs = [f["data"]["seq"] for f in replayed]
        assert seqs == sorted(seqs) and len(set(seqs)) == 1200


async def test_push_frames_have_name_and_data(tmp_path):
    async with make_kernel(tmp_path) as k:
        async def send_later():
            await asyncio.sleep(0.05)
            await k.ctx_for("pusher").push("timer:done", {"text": "Pasta is ready"})

        task = asyncio.create_task(send_later())
        res = await k.client.get("/api/events/stream?limit=2")
        await task
        push = _frames(res.text)[1]
        assert push["event"] == "push"
        assert push["data"] == {
            "kind": "push", "name": "timer:done", "data": {"text": "Pasta is ready"}, "plugin_id": "pusher"
        }


async def test_live_stream_skips_events_already_covered_by_hello(tmp_path):
    async with make_kernel(tmp_path) as k:
        await _append(k, 1)
        old = await k.events.get_events_after(0, limit=1000)

        async def publish():
            await asyncio.sleep(0.05)
            for evt in old:  # a late broadcast of an event at or below hello.seq
                k.broadcaster.broadcast_event(evt)
            await _append(k, 1)

        task = asyncio.create_task(publish())
        res = await k.client.get("/api/events/stream?limit=2")
        await task
        frames = _frames(res.text)
        assert frames[1]["data"]["seq"] > frames[0]["data"]["seq"]


async def test_stalled_subscriber_is_dropped_not_buffered_forever():
    broadcaster = EventBroadcaster(queue_size=3)
    q = await broadcaster.subscribe()
    for seq in range(1, 10):
        broadcaster.broadcast_event(Event(seq=seq, name="x"))
    assert broadcaster.subscriber_count == 0
    items = [q.get_nowait() for _ in range(q.qsize())]
    assert items[-1] == ("overflow", None)
    assert q.qsize() == 0
