import { useState } from "react";
import type { RepeatConfig, RepeatMode } from "../types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const UNIT_LABELS: Record<string, string> = { day: "日ごと", week: "週ごと", month: "月ごと", year: "年ごと" };

const REPEAT_OPTIONS: { id: RepeatMode; label: string }[] = [
  { id: "none", label: "なし" },
  { id: "daily", label: "毎日" },
  { id: "weekly", label: "毎週" },
  { id: "monthly", label: "毎月" },
  { id: "yearly", label: "毎年" },
  { id: "custom", label: "カスタム…" },
];

interface Props {
  due: string;
  repeat: RepeatMode;
  repeatConfig: RepeatConfig;
  onChange: (repeat: RepeatMode, config?: RepeatConfig) => void;
  onClose: () => void;
}

export default function CustomRepeatModal({ due, repeat, repeatConfig, onChange, onClose }: Props) {
  const [config, setConfig] = useState<RepeatConfig>(repeatConfig);

  const defaultConfig = (): RepeatConfig => ({
    interval: 1,
    unit: "week",
    daysOfWeek: [new Date(due + "T00:00:00").getDay()],
    endType: "none",
  });

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-[70] w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold text-slate-800">カスタムの繰り返し</h3>

        {/* 間隔 */}
        <p className="mb-1 text-xs font-semibold text-slate-400">繰り返す間隔:</p>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="number" min={1} value={config.interval}
            onChange={(e) => setConfig((c) => ({ ...c, interval: Math.max(1, +e.target.value) }))}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={config.unit}
            onChange={(e) => setConfig((c) => ({ ...c, unit: e.target.value as RepeatConfig["unit"] }))}
            className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
          >
            {(["day", "week", "month", "year"] as const).map((u) => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </div>

        {/* 曜日 (週のみ) */}
        {config.unit === "week" && (
          <>
            <p className="mb-1 text-xs font-semibold text-slate-400">曜日:</p>
            <div className="mb-4 flex gap-1">
              {WEEKDAY_LABELS.map((wd, i) => {
                const active = (config.daysOfWeek ?? []).includes(i);
                return (
                  <button key={i} type="button"
                    onClick={() => setConfig((c) => {
                      const days = c.daysOfWeek ?? [];
                      return { ...c, daysOfWeek: active ? days.filter((x) => x !== i) : [...days, i].sort() };
                    })}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {wd}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 終了条件 */}
        <p className="mb-1 text-xs font-semibold text-slate-400">終了日</p>
        <div className="mb-4 space-y-2">
          {([["none", "なし"], ["date", "終了日:"], ["count", "繰り返し:"]] as const).map(([type, lbl]) => (
            <label key={type} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="endType" value={type} checked={config.endType === type}
                onChange={() => setConfig((c) => ({ ...c, endType: type }))} className="accent-blue-600" />
              {lbl}
              {type === "date" && config.endType === "date" && (
                <input type="date" value={config.endDate ?? ""}
                  onChange={(e) => setConfig((c) => ({ ...c, endDate: e.target.value }))}
                  className="ml-1 flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
              )}
              {type === "count" && config.endType === "count" && (
                <div className="ml-1 flex items-center gap-1">
                  <input type="number" min={1} value={config.endCount ?? 1}
                    onChange={(e) => setConfig((c) => ({ ...c, endCount: Math.max(1, +e.target.value) }))}
                    className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400" />
                  <span className="text-xs text-slate-500">回</span>
                </div>
              )}
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            キャンセル
          </button>
          <button type="button" onClick={() => { onChange("custom", config); onClose(); }}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
            完了
          </button>
        </div>
      </div>
    </>
  );
}

interface RepeatSelectorProps {
  due: string;
  repeat: RepeatMode;
  repeatConfig?: RepeatConfig;
  onChange: (repeat: RepeatMode, config?: RepeatConfig) => void;
  className?: string;
}

export function RepeatSelector({ due, repeat, repeatConfig, onChange, className }: RepeatSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const defaultConfig: RepeatConfig = repeatConfig ?? {
    interval: 1, unit: "week",
    daysOfWeek: [new Date(due + "T00:00:00").getDay()],
    endType: "none",
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        <select
          value={repeat === "custom" ? "custom" : repeat}
          onChange={(e) => {
            const val = e.target.value as RepeatMode;
            if (val === "custom") { setShowCustom(true); }
            else { onChange(val); }
          }}
          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 outline-none focus:border-blue-400"
        >
          {REPEAT_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
      {showCustom && (
        <CustomRepeatModal
          due={due}
          repeat={repeat}
          repeatConfig={defaultConfig}
          onChange={onChange}
          onClose={() => setShowCustom(false)}
        />
      )}
    </>
  );
}
