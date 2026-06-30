import type {
  AppNotification,
  CalendarEvent,
  Email,
  Person,
  Profile,
  Project,
  RepeatMode,
  Settings,
  SlackMessage,
  Task,
} from "./types";

/** People who can "hold the ball" on a task. */
export const people: Person[] = [
  { id: "me",     name: "山田 太郎（自分）", avatar: "icon:male-adult:#3b82f6" },
  { id: "shima",  name: "島藤 さん",         avatar: "icon:male-adult:#ec4899" },
  { id: "tanaka", name: "田中 健一",          avatar: "icon:male-adult:#6366f1" },
  { id: "suzuki", name: "鈴木 一郎",          avatar: "icon:male-adult:#f97316" },
  { id: "sato",   name: "佐藤 美咲",          avatar: "icon:male-adult:#8b5cf6" },
];

export const repeatLabels: Record<RepeatMode, string> = {
  none: "繰り返しなし",
  daily: "毎日",
  weekly: "毎週",
  "weekly-weekday": "毎週（曜日指定）",
  monthly: "毎月",
  yearly: "毎年",
  custom: "カスタム",
};

export const defaultProfile: Profile = {
  name: "山田 太郎",
  email: "taro.yamada@example.com",
  avatar: "icon:male-adult:#3b82f6",
  role: "プロダクトマネージャー",
};

export const defaultSettings: Settings = {
  notifyEmail: true,
  notifySlack: false,
  hideCompleted: false,
  weekStart: 1,
  darkMode: false,
  accent: "blue",
  fontSize: "medium",
  defaultView: "list" as const,
  defaultDateRange: "today" as const,
};

/** Task color tag → swatch + accent classes (used for the row stripe). */
export const taskColors: Record<
  string,
  { label: string; dot: string; stripe: string }
> = {
  none: { label: "なし", dot: "bg-slate-200", stripe: "" },
  red: { label: "レッド", dot: "bg-red-500", stripe: "border-l-red-500" },
  orange: { label: "オレンジ", dot: "bg-orange-500", stripe: "border-l-orange-500" },
  green: { label: "グリーン", dot: "bg-emerald-500", stripe: "border-l-emerald-500" },
  blue: { label: "ブルー", dot: "bg-blue-500", stripe: "border-l-blue-500" },
  purple: { label: "パープル", dot: "bg-violet-500", stripe: "border-l-violet-500" },
  pink: { label: "ピンク", dot: "bg-pink-500", stripe: "border-l-pink-500" },
};

// Kept for backwards compat — no longer used (replaced by AvatarPicker in avatarIcons.tsx)
export const avatarChoices: string[] = [];

export const initialNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "提案書の作成",
    body: "期限が1時間後に迫っています（10:00まで）",
    time: "5分前",
    read: false,
    kind: "task",
  },
  {
    id: "n2",
    title: "田中 健一 さんからのメンション",
    body: "#proj-提案書「レビューお願いできますか？」",
    time: "32分前",
    read: false,
    kind: "mention",
  },
  {
    id: "n3",
    title: "請求書の送付",
    body: "明日が期限のタスクがあります",
    time: "1時間前",
    read: false,
    kind: "task",
  },
  {
    id: "n4",
    title: "Googleカレンダー連携",
    body: "今日の予定を同期しました",
    time: "今朝",
    read: true,
    kind: "system",
  },
];

/** The "today" the demo is anchored to (matches the mockup). */
export const TODAY = new Date().toLocaleDateString("sv-SE");

export const defaultProjects: Project[] = [
  { id: "work", label: "仕事", color: "bg-blue-500", icon: "💼" },
  { id: "private", label: "プライベート", color: "bg-emerald-500", icon: "🏠" },
  { id: "study", label: "勉強", color: "bg-violet-500", icon: "📚" },
  { id: "other", label: "その他", color: "bg-slate-400", icon: "📌" },
];

/** Selectable color swatches for projects. */
export const projectColorOptions = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-slate-400",
];

/** Selectable emoji icons for projects. */
export const projectIconOptions = [
  "💼", "🏠", "📚", "📌", "🚀", "💡", "🎯", "❤️",
  "⭐", "🎨", "💰", "🔧", "📊", "🌟", "🎮", "🌈",
  "📁", "✅", "🔔", "🏆",
];

/** @deprecated use the stateful projects from App state instead */
export const projects = defaultProjects;

export const initialTasks: Task[] = [];

const _unusedTasks: Task[] = [
  {
    id: "t1",
    title: "提案書の作成",
    project: "work",
    due: "2024-05-20",
    dueTime: "10:00",
    priority: "high",
    done: false,
    starred: false,
    owner: "shima",
    notes: `クライアント向けの提案書。先方の要望を反映し、10:00までに初稿を共有する。`,
    subtasks: [
      { id: "t1s1", title: "構成案の作成", done: true },
      { id: "t1s2", title: "参考資料のリンクをまとめる", done: false },
      { id: "t1s3", title: "初稿を共有", done: false },
    ],
  },
  {
    id: "t2",
    title: "AI研修資料の作成",
    project: "work",
    due: "2024-05-20",
    dueTime: "15:00",
    priority: "mid",
    done: false,
    starred: false,
  },
  {
    id: "t3",
    title: "メール返信",
    project: "work",
    due: "2024-05-20",
    dueTime: "18:00",
    priority: "low",
    done: false,
    starred: false,
  },
  {
    id: "t4",
    title: "請求書の確認",
    project: "work",
    due: "2024-05-20",
    priority: "mid",
    done: false,
    starred: false,
  },
  {
    id: "t5",
    title: "会議資料の準備",
    project: "work",
    due: "2024-05-20",
    dueTime: "9:00",
    priority: "mid",
    done: true,
    starred: false,
    owner: "me",
    completedAt: 0,
    completedDate: "5/20 9:05",
  },
  {
    id: "t9",
    title: "日報の記入",
    project: "work",
    due: "2024-05-20",
    dueTime: "18:00",
    priority: "low",
    done: false,
    starred: false,
    owner: "me",
    repeat: "daily",
  },
  {
    id: "t10",
    title: "週次ミーティングのアジェンダ作成",
    project: "work",
    due: "2024-05-20",
    priority: "mid",
    done: false,
    starred: false,
    owner: "tanaka",
    repeat: "weekly",
  },
  {
    id: "t6",
    title: "請求書の送付",
    project: "work",
    due: "2024-05-21",
    priority: "mid",
    done: false,
    starred: false,
  },
  {
    id: "t7",
    title: "契約書の確認",
    project: "work",
    due: "2024-05-22",
    priority: "high",
    done: false,
    starred: false,
  },
  {
    id: "t8",
    title: "月次レポートの作成",
    project: "work",
    due: "2024-05-23",
    priority: "mid",
    done: false,
    starred: false,
  },
];


export const calendarEvents: CalendarEvent[] = [
  { id: "e1", title: "定例ミーティング", start: 10, end: 11, color: "blue" },
  { id: "e2", title: "顧客との打ち合わせ", start: 13, end: 14, color: "green" },
  { id: "e3", title: "社内研修", start: 15.5, end: 16.5, color: "purple" },
  { id: "e4", title: "空き時間", start: 17, end: 18, color: "gray" },
];

// お気に入り(スター付き)Gmail — モックデータ
export const gmailStarred: Email[] = [
  {
    id: "m1",
    from: "田中 健一",
    subject: "【要返信】提案書のフィードバック",
    snippet: "お世話になっております。先日いただいた提案書につきまして、何点か確認したい点が…",
    time: "9:24",
    unread: true,
  },
  {
    id: "m2",
    from: "経理部",
    subject: "5月分 経費精算のお願い",
    snippet: "5月分の経費精算の締め切りは今週金曜日です。未提出の方はお早めに…",
    time: "8:10",
  },
  {
    id: "m3",
    from: "株式会社サンプル 佐藤",
    subject: "契約書の確認について",
    snippet: "添付の契約書をご確認のうえ、ご署名をお願いいたします。ご不明点が…",
    time: "5/19",
  },
  {
    id: "m4",
    from: "AIセミナー事務局",
    subject: "役員向けAIセミナー 登壇資料の件",
    snippet: "ご登壇ありがとうございます。当日の進行と資料提出の期限についてご案内…",
    time: "5/18",
  },
];

// 保存済みSlackメッセージ — モックデータ
export const slackSaved: SlackMessage[] = [
  {
    id: "s1",
    channel: "#proj-提案書",
    author: "山本 由美",
    text: "参考資料のフォルダ共有しておきました 👉 /drive/proposal",
    time: "10:32",
  },
  {
    id: "s2",
    channel: "#general",
    author: "島藤 太郎",
    text: "WBSの初稿できました。レビューお願いします！",
    time: "昨日",
  },
  {
    id: "s3",
    channel: "#ai-research",
    author: "鈴木 一郎",
    text: "セミナーの構成案、ここにまとめてます。コメント歓迎です。",
    time: "5/19",
  },
];

export const initialNotes = `・提案書の参考資料をまとめる
・クライアントからのフィードバック対応
・来週の会議のアジェンダ作成
---
【アイデア】
・新サービスの企画案を整理する`;
