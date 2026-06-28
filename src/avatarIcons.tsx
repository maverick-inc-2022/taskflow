// Person icon definitions and AvatarDisplay component

export type IconId =
  | "male-young" | "female-young"
  | "male-adult" | "female-adult"
  | "male-senior" | "female-senior"
  | "child-boy" | "child-girl";

// SVG inner paths for each icon (rendered on colored circle, white fill/stroke)
const ICON_PATHS: Record<IconId, React.ReactNode> = {
  "male-young": (
    <>
      <circle cx="12" cy="7" r="3.5" fill="white" />
      <path d="M5 21v-1a7 7 0 0 1 14 0v1" fill="white" />
      {/* short hair hint */}
      <path d="M9 4.5 Q12 3 15 4.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  ),
  "female-young": (
    <>
      <circle cx="12" cy="7" r="3.5" fill="white" />
      {/* long side hair */}
      <path d="M8.5 5 Q5.5 8 6.5 13.5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M15.5 5 Q18.5 8 17.5 13.5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M5 21v-1a7 7 0 0 1 14 0v1" fill="white" />
    </>
  ),
  "male-adult": (
    <>
      <circle cx="12" cy="7" r="3.5" fill="white" />
      <path d="M5 21v-1a7 7 0 0 1 14 0v1" fill="white" />
      {/* broader shoulders suggestion */}
      <path d="M7 14 Q12 12 17 14" stroke="white" strokeWidth="1.2" fill="none" />
    </>
  ),
  "female-adult": (
    <>
      <circle cx="12" cy="7" r="3.5" fill="white" />
      {/* hair bun */}
      <circle cx="12" cy="3.5" r="2" fill="white" />
      <path d="M5 21v-1a7 7 0 0 1 14 0v1" fill="white" />
    </>
  ),
  "male-senior": (
    <>
      <circle cx="12" cy="7.5" r="3" fill="white" />
      {/* grey/thin hair hint at sides */}
      <path d="M9 5.5 Q8 4.5 9.5 4" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M15 5.5 Q16 4.5 14.5 4" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M5.5 21v-1a6.5 6.5 0 0 1 13 0v1" fill="white" />
      {/* cane */}
      <path d="M17 17 Q18.5 18.5 18 21" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  ),
  "female-senior": (
    <>
      <circle cx="12" cy="7.5" r="3" fill="white" />
      {/* tight hair bun */}
      <circle cx="12" cy="4.5" r="1.5" fill="white" />
      <path d="M10 5.5 Q12 3 14 5.5" stroke="white" strokeWidth="1" fill="none" />
      <path d="M5.5 21v-1a6.5 6.5 0 0 1 13 0v1" fill="white" />
    </>
  ),
  "child-boy": (
    <>
      {/* bigger head */}
      <circle cx="12" cy="8" r="4.5" fill="white" />
      <path d="M8 13 Q12 16 16 13" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M7 21v-1a5 5 0 0 1 10 0v1" fill="white" />
    </>
  ),
  "child-girl": (
    <>
      {/* bigger head */}
      <circle cx="12" cy="8" r="4.5" fill="white" />
      {/* pigtails */}
      <circle cx="7" cy="6" r="1.5" fill="white" />
      <circle cx="17" cy="6" r="1.5" fill="white" />
      <path d="M7 21v-1a5 5 0 0 1 10 0v1" fill="white" />
    </>
  ),
};

export const PERSON_ICONS: { id: IconId; label: string }[] = [
  { id: "male-young",   label: "青年・男" },
  { id: "female-young", label: "青年・女" },
  { id: "male-adult",   label: "大人・男" },
  { id: "female-adult", label: "大人・女" },
  { id: "male-senior",  label: "高齢・男" },
  { id: "female-senior",label: "高齢・女" },
  { id: "child-boy",    label: "男の子" },
  { id: "child-girl",   label: "女の子" },
];

export const AVATAR_COLORS = [
  { id: "blue",   value: "#3b82f6" },
  { id: "indigo", value: "#6366f1" },
  { id: "purple", value: "#8b5cf6" },
  { id: "pink",   value: "#ec4899" },
  { id: "red",    value: "#ef4444" },
  { id: "orange", value: "#f97316" },
  { id: "amber",  value: "#f59e0b" },
  { id: "green",  value: "#22c55e" },
  { id: "teal",   value: "#14b8a6" },
  { id: "slate",  value: "#64748b" },
];

export const DEFAULT_AVATAR = `icon:male-adult:${AVATAR_COLORS[0].value}`;

export function parseAvatar(avatar: string): { iconId: IconId; color: string } {
  if (avatar.startsWith("icon:")) {
    const rest = avatar.slice(5);
    const colonIdx = rest.indexOf(":");
    const iconId = (colonIdx >= 0 ? rest.slice(0, colonIdx) : rest) as IconId;
    const color = colonIdx >= 0 ? rest.slice(colonIdx + 1) : AVATAR_COLORS[0].value;
    return { iconId: ICON_PATHS[iconId] ? iconId : "male-adult", color };
  }
  return { iconId: "male-adult", color: AVATAR_COLORS[0].value };
}

export function makeAvatar(iconId: IconId, color: string): string {
  return `icon:${iconId}:${color}`;
}

interface AvatarDisplayProps {
  avatar: string;
  name: string;
  className?: string;
  size?: number;
}

export function AvatarDisplay({ avatar, name, className = "", size = 28 }: AvatarDisplayProps) {
  if (!avatar.startsWith("icon:")) {
    // legacy URL
    return (
      <img
        src={avatar}
        alt={name}
        title={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size, minWidth: size }}
      />
    );
  }
  const { iconId, color } = parseAvatar(avatar);
  const iconSize = Math.round(size * 0.62);
  return (
    <div
      title={name}
      className={`flex-none flex items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, minWidth: size, maxWidth: size, background: color }}
    >
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        {ICON_PATHS[iconId]}
      </svg>
    </div>
  );
}

// Picker UI component for selecting icon + color
interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

// Fixed icon — always use the same person silhouette, only color changes
const FIXED_ICON: IconId = "male-adult";

export function makeAvatarColor(color: string): string {
  return makeAvatar(FIXED_ICON, color);
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const { color } = parseAvatar(value || DEFAULT_AVATAR);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-400">カラー</p>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(makeAvatar(FIXED_ICON, c.value))}
            title={c.id}
            className={`h-6 w-6 rounded-full transition hover:scale-110 ${
              color === c.value ? "ring-2 ring-offset-1 ring-slate-400" : ""
            }`}
            style={{ background: c.value }}
          />
        ))}
      </div>
    </div>
  );
}
