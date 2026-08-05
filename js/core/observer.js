// 微型事件总线。系统间通过领域事件解耦。

export function createObserver() {
  const handlers = new Map();
  const api = {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return () => api.off(event, fn);
    },
    off(event, fn) {
      handlers.get(event)?.delete(fn);
    },
    emit(event, payload) {
      handlers.get(event)?.forEach((fn) => {
        try { fn(payload); } catch (e) { console.error(`[events:${event}]`, e); }
      });
    },
  };
  return api;
}
