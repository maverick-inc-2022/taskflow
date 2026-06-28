import { calendarEvents } from "../data";
import { ExternalLinkIcon } from "../icons";
import { eventColor } from "../ui";

const START_HOUR = 9;
const END_HOUR = 18;
const HOUR_PX = 56;

function fmt(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

export default function CalendarPanel() {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">
          今日の予定{" "}
          <span className="text-xs font-normal text-slate-400">
            (Googleカレンダー)
          </span>
        </h2>
        <button className="text-slate-400 hover:text-slate-600">
          <ExternalLinkIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        className="relative"
        style={{ height: (END_HOUR - START_HOUR) * HOUR_PX + 12 }}
      >
        {/* hour grid */}
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start"
            style={{ top: i * HOUR_PX }}
          >
            <span className="w-12 -translate-y-2 text-xs text-slate-400">
              {h}:00
            </span>
            <div className="mt-0 flex-1 border-t border-slate-100" />
          </div>
        ))}

        {/* events */}
        {calendarEvents.map((e) => {
          const c = eventColor[e.color];
          const top = (e.start - START_HOUR) * HOUR_PX;
          const height = (e.end - e.start) * HOUR_PX - 6;
          return (
            <div
              key={e.id}
              className={`absolute left-14 right-1 overflow-hidden rounded-lg border-l-4 px-3 py-1.5 ${c.bg}`}
              style={{
                top,
                height,
                borderLeftColor: "currentColor",
              }}
            >
              <div className={`flex h-full flex-col justify-center ${c.text}`}>
                <span className={`truncate text-sm font-semibold`}>
                  {e.title}
                </span>
                {e.color !== "gray" && (
                  <span className="text-xs opacity-80">
                    {fmt(e.start)} - {fmt(e.end)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
