// Google Calendar API v3 helpers

export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  colorId?: string;
}

export interface GCalListResponse {
  items: GCalEvent[];
  nextPageToken?: string;
}

export async function fetchCalendarEvents(
  accessToken: string,
  days = 14
): Promise<GCalEvent[]> {
  const now = new Date();
  const future = new Date(now);
  future.setDate(now.getDate() + days);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    orderBy: "startTime",
    singleEvents: "true",
    maxResults: "50",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const data: GCalListResponse = await res.json();
  return data.items ?? [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: string; // ISO date or datetime
    end: string;
    allDay?: boolean;
  }
): Promise<GCalEvent> {
  const body = {
    summary: event.summary,
    description: event.description,
    start: event.allDay
      ? { date: event.start.slice(0, 10) }
      : { dateTime: event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: event.allDay
      ? { date: event.end.slice(0, 10) }
      : { dateTime: event.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function eventStartDate(ev: GCalEvent): string {
  return (ev.start.dateTime ?? ev.start.date ?? "").slice(0, 10);
}

export function eventTimeLabel(ev: GCalEvent): string {
  if (ev.start.dateTime) {
    const d = new Date(ev.start.dateTime);
    const e = new Date(ev.end.dateTime!);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(d)} 〜 ${fmt(e)}`;
  }
  return "終日";
}

export function eventDateLabel(ev: GCalEvent, today: string): string {
  const date = eventStartDate(ev);
  if (date === today) return "今日";
  const diff =
    (new Date(date + "T00:00:00").getTime() -
      new Date(today + "T00:00:00").getTime()) /
    86400000;
  if (diff === 1) return "明日";
  if (diff <= 7) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[new Date(date + "T00:00:00").getDay()] + "曜日";
  }
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// Gcal event color id → tailwind class
const GCAL_COLORS: Record<string, string> = {
  "1": "bg-[#7986CB]",
  "2": "bg-[#33B679]",
  "3": "bg-[#8E24AA]",
  "4": "bg-[#E67C73]",
  "5": "bg-[#F6BF26]",
  "6": "bg-[#F4511E]",
  "7": "bg-[#039BE5]",
  "8": "bg-[#616161]",
  "9": "bg-[#3F51B5]",
  "10": "bg-[#0B8043]",
  "11": "bg-[#D50000]",
};

export function eventColorClass(ev: GCalEvent): string {
  return ev.colorId ? (GCAL_COLORS[ev.colorId] ?? "bg-blue-500") : "bg-blue-500";
}
