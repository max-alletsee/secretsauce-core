import asyncio
import json
from typing import Any, AsyncIterator
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from secretsauce.events import Event

router = APIRouter(tags=["stream"])


class EventBroadcaster:
    def __init__(self):
        self._subscribers: set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    def broadcast_event(self, event: Event) -> None:
        for q in list(self._subscribers):
            q.put_nowait(("event", event))

    def broadcast_push(self, kind: str, data: Any = None) -> None:
        for q in list(self._subscribers):
            q.put_nowait(("push", {"kind": kind, "data": data}))


@router.get("/api/events/stream")
async def events_stream(
    request: Request,
    live: bool = Query(default=True),
    limit: int | None = Query(default=None),
):
    kernel = request.app.state.kernel
    broadcaster: EventBroadcaster = kernel.broadcaster
    boot_id = kernel.boot_id

    last_event_id_header = request.headers.get("last-event-id")
    last_seq: int | None = None
    if last_event_id_header is not None:
        try:
            last_seq = int(last_event_id_header)
        except ValueError:
            last_seq = None

    queue = await broadcaster.subscribe()

    async def event_generator() -> AsyncIterator[str]:
        frames_yielded = 0
        try:
            # 1. First frame: hello
            head_seq = await kernel.events.get_head_seq()
            hello_data = json.dumps({"boot_id": boot_id, "seq": head_seq})
            yield f"event: hello\ndata: {hello_data}\n\n"
            frames_yielded += 1

            if limit is not None and frames_yielded >= limit:
                return

            # 2. Replay log events if Last-Event-ID was provided
            if last_seq is not None and last_seq < head_seq:
                replayed_events = await kernel.events.get_events_after(
                    last_seq, limit=1000
                )
                for evt in replayed_events:
                    if evt.seq <= head_seq:
                        payload = json.dumps(evt.envelope())
                        yield f"id: {evt.seq}\nevent: event\ndata: {payload}\n\n"
                        frames_yielded += 1
                        if limit is not None and frames_yielded >= limit:
                            return

            if not live:
                return

            # 3. Live loop
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=20.0)
                    msg_type, content = item
                    if msg_type == "event":
                        payload = json.dumps(content.envelope())
                        yield f"id: {content.seq}\nevent: event\ndata: {payload}\n\n"
                    elif msg_type == "push":
                        payload = json.dumps(content)
                        yield f"event: push\ndata: {payload}\n\n"
                    frames_yielded += 1
                    if limit is not None and frames_yielded >= limit:
                        return
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            await broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
