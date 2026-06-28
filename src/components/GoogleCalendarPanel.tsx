import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  fetchCalendarEvents,
  eventStartDate,
  type GCalEvent,
} from "../googleCalendar";
import { ExternalLinkIcon, GoogleCalendarIcon, PlusIcon } from "../icons";

const TODAY = new Date().toISOString().slice(0, 10);
const HOUR_PX = 56;
const DEFAULT_START = 8;
const DEFAULT_END = 20;

// Google Calendar colorId → { bg, border, text } in light pastel style
const GCAL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "1":  { bg: "#EEEFFE", border: "#7986CB", text: "#3949AB" },
  "2":  { bg: "#E6F8F1", border: "#33B679", text: "#0B8043" },
  "3":  { bg: "#F5E6FA", border: "#8E24AA", text: "#6A1B9A" },
  "4":  { bg: "#FDECEA", border: "#E67C73", text: "#C62828" },
  "5":  { bg: "#FEF9E0", border: "#F6BF26", text: "#E65100" },
  "6":  { bg: "#FEF0EB", border: "#F4511E", text: "#BF360C" },
  "7":  { bg: "#E1F5FD", border: "#039BE5", text: "#0277BD" },
  "8":  { bg: "#F1F3F4", border: "#616161", text: "#424242" },
  "9":  { bg: "#E8EAF6", border: "#3F51B5", text: "#283593" },
  "10": { bg: "#E8F5E9", border: "#0B8043", text: "#1B5E20" },
  "11": { bg: "#FDECEA", border: "#D50000", text: "#B71C1C" },
};
const DEFAULT_COLOR = { bg: "#E8F0FE", border: "#4285F4", text: "#1A73E8" };

function getColor(ev: GCalEvent) {
  return ev.colorId ? (GCAL_COLORS[ev.colorId] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
}

function toDecimalHour(dateTime: string): number {
  const d = new Date(dateTime);
  return d.getHours() + d.getMinutes() / 60;
}

function fmtTime(dateTime: string): string {
  const d = new Date(dateTime);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  onAddTask?: (title: string, due: string) => void;
  accessToken?: string | null;
  onConnect?: (token: string) => void;
  onDisconnect?: () => void;
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function GoogleCalendarPanel({ onAddTask, accessToken, onConnect, onDisconnect }: Props) {
  const [events, setEvents] = useState<GCalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const ev = await fetchCalendarEvents(token, 1);
      setEvents(ev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) load(accessToken);
    else setEvents([]);
  }, [accessToken, load]);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar",
    onSuccess: (res) => onConnect?.(res.access_token),
    onError: () => setError("Googleログインに失敗しました"),
  });

  const handleAddTask = (ev: GCalEvent) => {
    const due = eventStartDate(ev);
    onAddTask?.(ev.summary, due);
    setAddedIds((s) => new Set(s).add(ev.id));
  };

  // Separate today's timed events from all-day events
  const todayEvents = events.filter((ev) => {
    const date = eventStartDate(ev);
    return date === TODAY;
  });
  const allDayEvents = todayEvents.filter((ev) => !ev.start.dateTime);
  const timedEvents = todayEvents.filter((ev) => !!ev.start.dateTime);

  // Compute dynamic hour range
  let startHour = DEFAULT_START;
  let endHour = DEFAULT_END;
  if (timedEvents.length > 0) {
    const starts = timedEvents.map((ev) => Math.floor(toDecimalHour(ev.start.dateTime!)));
    const ends = timedEvents.map((ev) => Math.ceil(toDecimalHour(ev.end.dateTime!)));
    startHour = Math.max(0, Math.min(...starts) - 1);
    endHour = Math.min(24, Math.max(...ends) + 1);
  }
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * HOUR_PX;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          今日の予定
          <span className="text-xs font-normal text-slate-400">(Googleカレンダー)</span>
        </h2>
        <div className="flex items-center gap-2">
          {accessToken ? (
            <>
              <button
                onClick={() => load(accessToken)}
                disabled={loading}
                title="更新"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <svg viewBox="0 0 24 24" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 9M21 3v6h-6M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64L3 15M3 21v-6h6" />
                </svg>
              </button>
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 transition">
                <ExternalLinkIcon className="h-4 w-4" />
              </a>
              <button
                onClick={onDisconnect}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-red-50 hover:text-red-500 transition"
              >
                連携中
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Not connected */}
      {!accessToken && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <GoogleCalendarIcon className="h-10 w-10 opacity-60" />
          <p className="text-sm text-slate-500">Google カレンダーと連携して<br />予定をTaskFlowに表示できます</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={() => login()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <GoogleCalendarIcon className="h-4 w-4 brightness-0 invert" />
            Google でログイン
          </button>
        </div>
      )}

      {/* Loading */}
      {accessToken && loading && (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      )}

      {/* Error */}
      {accessToken && !loading && error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={() => load(accessToken)} className="ml-2 underline">再試行</button>
        </div>
      )}

      {/* Connected + loaded */}
      {accessToken && !loading && !error && (
        <>
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {allDayEvents.map((ev) => {
                const c = getColor(ev);
                const added = addedIds.has(ev.id);
                return (
                  <div
                    key={ev.id}
                    className="group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: c.bg, color: c.text }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.border }} />
                    {ev.summary}
                    {onAddTask && (
                      <button
                        onClick={() => handleAddTask(ev)}
                        disabled={added}
                        className="ml-0.5 opacity-0 group-hover:opacity-100 transition"
                        title="タスクに追加"
                      >
                        {added
                          ? <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5" /></svg>
                          : <PlusIcon className="h-3 w-3" />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No events for today */}
          {timedEvents.length === 0 && allDayEvents.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">今日の予定はありません</p>
          )}

          {/* Timeline */}
          {timedEvents.length > 0 && (
            <div className="relative" style={{ height: gridHeight + 12 }}>
              {/* Hour grid lines */}
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top: i * HOUR_PX }}
                >
                  <span className="w-12 -translate-y-2 text-xs text-slate-400">
                    {h}:00
                  </span>
                  <div className="flex-1 border-t border-slate-100" />
                </div>
              ))}

              {/* Events */}
              {timedEvents.map((ev) => {
                const startH = toDecimalHour(ev.start.dateTime!);
                const endH = toDecimalHour(ev.end.dateTime!);
                const top = (startH - startHour) * HOUR_PX;
                const height = Math.max((endH - startH) * HOUR_PX - 4, 24);
                const c = getColor(ev);
                const added = addedIds.has(ev.id);
                const duration = endH - startH;

                return (
                  <div
                    key={ev.id}
                    className="group absolute overflow-hidden rounded-lg px-3 py-1.5"
                    style={{
                      top,
                      height,
                      left: "3.5rem",
                      right: "0.25rem",
                      background: c.bg,
                      borderLeft: `4px solid ${c.border}`,
                    }}
                  >
                    <div className="flex h-full items-start justify-between gap-1">
                      <div className="min-w-0 flex-1" style={{ color: c.text }}>
                        <p className={`font-semibold leading-snug ${duration < 0.6 ? "text-xs truncate" : "text-sm"}`}>
                          {ev.summary}
                        </p>
                        {duration >= 0.5 && (
                          <p className="text-xs opacity-75">
                            {fmtTime(ev.start.dateTime!)} 〜 {fmtTime(ev.end.dateTime!)}
                          </p>
                        )}
                        {ev.location && duration >= 1 && (
                          <p className="mt-0.5 truncate text-xs opacity-60">📍 {ev.location}</p>
                        )}
                      </div>
                      {onAddTask && (
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleAddTask(ev)}
                            disabled={added}
                            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition"
                            style={{
                              background: added ? "#d1fae5" : "white",
                              color: added ? "#059669" : c.border,
                              border: `1px solid ${added ? "#a7f3d0" : c.border}`,
                            }}
                          >
                            {added
                              ? <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5" /></svg>
                              : <PlusIcon className="h-3 w-3" />
                            }
                            {added ? "追加済" : "タスク"}
                          </button>
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-0.5 text-slate-400 hover:bg-white/60 transition"
                          >
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
