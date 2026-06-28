import type { AppNotification } from "../types";

interface Props {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAll: () => void;
  onRead: (id: string) => void;
}

const dotColor: Record<AppNotification["kind"], string> = {
  task: "bg-blue-500",
  mention: "bg-violet-500",
  system: "bg-slate-300",
};

export default function NotificationsPopover({
  notifications,
  onClose,
  onMarkAll,
  onRead,
}: Props) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="animate-slide-up absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">
            通知{unread > 0 && <span className="ml-1 text-blue-600">{unread}</span>}
          </h3>
          <button
            onClick={onMarkAll}
            className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-300"
            disabled={unread === 0}
          >
            すべて既読
          </button>
        </div>

        <ul className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-slate-400">
              通知はありません
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onRead(n.id)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    n.read ? "" : "bg-blue-50/40"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? "bg-transparent" : dotColor[n.kind]
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${
                          n.read
                            ? "font-medium text-slate-600"
                            : "font-bold text-slate-800"
                        }`}
                      >
                        {n.title}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {n.time}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{n.body}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
