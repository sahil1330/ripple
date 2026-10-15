// Server-Sent Events client for real-time Ripple updates.
import { apiBaseUrl, apiMode } from "./api";
import { MOCK_DEMO_STEPS } from "./mock-data";
import { SseEnvelope } from "./types";

export type EventCallback = (event: SseEnvelope) => void;

export function subscribeToStream(
  tenant: string,
  onEvent: EventCallback,
  options?: { replayMock?: boolean; replayIntervalMs?: number }
): () => void {
  if (apiMode === "live") {
    const url = `${apiBaseUrl}/api/stream?tenant=${encodeURIComponent(tenant)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as SseEnvelope;
        onEvent(parsed);
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection error", err);
    };

    return () => {
      eventSource.close();
    };
  }

  // Mock mode: optionally replay scripted events
  let isCancelled = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  if (options?.replayMock) {
    const allEvents = MOCK_DEMO_STEPS.flatMap((s) => s.events);
    let index = 0;
    const interval = options.replayIntervalMs ?? 1500;

    const emitNext = () => {
      if (isCancelled || index >= allEvents.length) return;
      onEvent(allEvents[index]);
      index++;
      timerId = setTimeout(emitNext, interval);
    };

    timerId = setTimeout(emitNext, interval);
  }

  return () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
  };
}
