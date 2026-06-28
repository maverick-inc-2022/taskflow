import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const SunIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const CalendarMonthIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </svg>
);

export const ListIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
);

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg
    {...base}
    fill={filled ? "currentColor" : "none"}
    {...p}
  >
    <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.6 1-6L3.3 9.4l6-.9L12 3Z" />
  </svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 5-5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 11a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
  </svg>
);

export const ClockAlertIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 11a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
  </svg>
);

export const ExternalLinkIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);

export const EditIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
  </svg>
);

export const HelpIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m20 6-11 11-5-5" />
  </svg>
);

/** Google Calendar style multi-color icon */
export const GoogleCalendarIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" fill="#fff" stroke="#dadce0" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2h-4V4Z" fill="#4285f4" />
    <path d="M20 16v2a2 2 0 0 1-2 2h-2v-4h4Z" fill="#34a853" />
    <path d="M8 20H6a2 2 0 0 1-2-2v-2h4v4Z" fill="#fbbc04" />
    <path d="M4 8V6a2 2 0 0 1 2-2h2v4H4Z" fill="#ea4335" />
    <text
      x="12"
      y="15"
      textAnchor="middle"
      fontSize="7"
      fontWeight="700"
      fill="#4285f4"
      fontFamily="Arial, sans-serif"
    >
      31
    </text>
  </svg>
);

export const PaperclipIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19l-8.5 8.49a1.83 1.83 0 0 1-2.59-2.59l7.78-7.78" />
  </svg>
);

export const PaletteIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="13.5" cy="6.5" r="1" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="1" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="1" fill="currentColor" />
    <path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.66-.26-1.26-.68-1.7-.4-.44-.65-1.02-.65-1.66a2.5 2.5 0 0 1 2.5-2.5H18a4 4 0 0 0 4-4c0-4.42-4.48-8-10-8Z" />
  </svg>
);

export const FileIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

export const ColumnsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="5" height="16" rx="1" />
    <rect x="10" y="4" width="5" height="16" rx="1" />
    <rect x="17" y="4" width="4" height="16" rx="1" />
  </svg>
);

export const TableIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const RepeatIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

export const UndoIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 7v6h6" />
    <path d="M3.5 13a9 9 0 1 0 2.6-5.6L3 10" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const KeyboardIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const GripIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

export const SortIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3" />
  </svg>
);

export const GmailIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H5l7 5 7-5h.5A1.5 1.5 0 0 1 21 5.5V18a1 1 0 0 1-1 1h-2.5V9.8L12 13.8 6.5 9.8V19H4a1 1 0 0 1-1-1V5.5Z" fill="#eee" />
    <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H5v15H4a1 1 0 0 1-1-1V5.5Z" fill="#4285f4" />
    <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H19v15h1a1 1 0 0 0 1-1V5.5Z" fill="#34a853" />
    <path d="M3 5.5 12 12V6.5L5 1.5 3 5.5Z" fill="none" />
    <path d="M3 4.8 12 11.5l9-6.7V5.5A1.5 1.5 0 0 0 19.5 4L12 9.5 4.5 4A1.5 1.5 0 0 0 3 5.5v-.7Z" fill="#ea4335" />
    <path d="M6.5 9.3 12 13.3l5.5-4V19h-11V9.3Z" fill="#c5221f" opacity="0.15" />
  </svg>
);

export const SlackIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M6 14.5a2 2 0 1 1-2-2h2v2Zm1 0a2 2 0 0 1 4 0v5a2 2 0 1 1-4 0v-5Z" fill="#e01e5a" />
    <path d="M9.5 6a2 2 0 1 1 2-2v2h-2Zm0 1a2 2 0 0 1 0 4h-5a2 2 0 1 1 0-4h5Z" fill="#36c5f0" />
    <path d="M18 9.5a2 2 0 1 1 2 2h-2v-2Zm-1 0a2 2 0 0 1-4 0v-5a2 2 0 1 1 4 0v5Z" fill="#2eb67d" />
    <path d="M14.5 18a2 2 0 1 1-2 2v-2h2Zm0-1a2 2 0 0 1 0-4h5a2 2 0 1 1 0 4h-5Z" fill="#ecb22e" />
  </svg>
);

export const StarBadgeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="#fbbc04" {...p}>
    <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6L12 17l-5.4 2.6 1-6L3.3 9.4l6-.9L12 3Z" />
  </svg>
);

export const BookmarkIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
  </svg>
);

export const LogoIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" {...p}>
    <circle cx="12" cy="12" r="10" fill="#2563eb" />
    <path
      d="m7.5 12 3 3 6-6.5"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
