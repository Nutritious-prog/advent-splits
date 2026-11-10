export type CalendarMode = { kind: "public" } | { kind: "demo"; at: string };

export function urls(mode: CalendarMode) {
  if (mode.kind === "public") {
    return {
      state: "/api/me",
      door: (day: number, action: string) => `/api/doors/${day}/${action}`,
      share: (day: number, withResult: boolean) => `/api/share/${day}?result=${withResult ? 1 : 0}`,
      summary: "/api/share/summary",
    };
  }
  const at = encodeURIComponent(mode.at);
  return {
    state: `/api/admin/demo/state?at=${at}`,
    door: (day: number, action: string) => `/api/admin/demo/doors/${day}/${action}?at=${at}`,
    share: (day: number, withResult: boolean) => `/api/admin/demo/share/${day}?result=${withResult ? 1 : 0}`,
    summary: `/api/admin/demo/share/summary?at=${at}`,
  };
}
