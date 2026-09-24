import asyncio
import json
import logging
from typing import Any, AsyncIterator

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from secretsauce.events import Event

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stream"])

SUBSCRIBER_QUEUE_SIZE = 1000
KEEPALIVE_SECONDS = 20.0
REPLAY_PAGE_SIZE = 500

_OVERFLOW = ("overflow", None)


class EventBroadcaster:
    """Fans committed events and transient pushes out to open SSE streams.

    Each subscriber has a bounded queue. A client too slow to drain it is
    disconnected rather than allowed to grow memory without limit; it
    reconnects with Last-Event-ID and replays what it missed from the log.
    """

    def __init__(self, queue_size: int = SUBSCRIBER_QUEUE_SIZE):
        self._queue_size = queue_size
        self._subscribers: set[asyncio.Queue] = set()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._queue_size)
        self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    def _offer(self, item: tuple[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(item)
            except asyncio.QueueFull:
                self._subscribers.discard(q)
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                q.put_nowait(_OVERFLOW)
                logger.info("Dropped a stalled SSE subscriber")

    def broadcast_event(self, event: Event) -> None:
        self._offer(("event", event))

    def broadcast_push(self, name: str, data: Any = None, plugin_id: str | None = None) -> None:
        self._offer(("push", {"kind": "push", "name": name, "data": data, "plugin_id": plugin_id}))


def _frame(event: str, data: dict[str, Any], event_id: int | None = None) -> str:
    head = f"id: {event_id}\n" if event_id is not None else ""
    return f"{head}event: {event}\ndata: {json.dumps(data)}\n\n"


def _event_frame(evt: Event) -> str:
    return _frame("event", {"kind": "event", **evt.envelope()}, event_id=evt.seq)


def _parse_seq(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


@router.get("/api/events/stream")
async def events_stream(
    request: Request,
    live: bool = Query(default=True),
    limit: int | None = Query(default=None, ge=1),
    last_event_id: str | None = Query(default=None),
):
    kernel = request.app.state.kernel
    broadcaster: EventBroadcaster = kernel.broadcaster

    # EventSource sends Last-Event-ID itself only on automatic reconnects; a
    # client opening a fresh connection passes its position as a query param.
    last_seq = _parse_seq(request.headers.get("last-event-id"))
    if last_seq is None:
        last_seq = _parse_seq(last_event_id)

    # Subscribe before reading the head so no commit falls between the two.
    queue = await broadcaster.subscribe()

    async def event_generator() -> AsyncIterator[str]:
        sent = 0

        def exhausted() -> bool:
            return limit is not None and sent >= limit

        try:
            head_seq = await kernel.events.get_head_seq()
            yield _frame("hello", {"kind": "hello", "boot_id": kernel.boot_id, "seq": head_seq})
            sent += 1
            if exhausted():
                return

            delivered_seq = head_seq
            if last_seq is not None and last_seq < head_seq:
                cursor = last_seq
                while cursor < head_seq:
                    page = await kernel.events.get_events_after(cursor, limit=REPLAY_PAGE_SIZE)
                    if not page:
                        break
                    for evt in page:
                        if evt.seq > head_seq:
                            break
                        yield _event_frame(evt)
                        sent += 1
                        cursor = evt.seq
                        if exhausted():
                            return
                    else:
                        continue
                    break

            if not live:
                return

            while True:
                try:
                    kind, content = await asyncio.wait_for(queue.get(), timeout=KEEPALIVE_SECONDS)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue

                if kind == "overflow":
                    return
                if kind == "event":
                    # Skip what the hello position or the replay already covered.
                    if content.seq <= delivered_seq:
                        continue
                    delivered_seq = content.seq
                    yield _event_frame(content)
                else:
                    yield _frame("push", content)
                sent += 1
                if exhausted():
                    return
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
