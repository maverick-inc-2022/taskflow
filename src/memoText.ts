import type { NoteMemo } from "./types";

// The desktop detail panel stores rich memos (NoteMemo[]). The mobile editor is
// a plain-text textarea. These helpers bridge the two so both edit the *same*
// underlying data — the first memo is treated as the canonical note.

let _mid = Date.now();
const mid = () => `n${_mid++}`;

/** First memo → plain text (formatting is dropped for the mobile view). */
export function memosToPlainText(memos?: NoteMemo[]): string {
  if (!memos || memos.length === 0) return "";
  return htmlToPlain(memos[0].html);
}

export function htmlToPlain(html: string): string {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const text = tmp.textContent ?? "";
  return text.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");
}

export function plainToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (!text) return "";
  return text.split("\n").map((line) => `<div>${esc(line) || "<br>"}</div>`).join("");
}

/**
 * Write plain text back into a memos array, keeping any extra memos and the
 * first memo's checklist/attachments intact. Returns [] when there's nothing
 * to store and no memo existed yet (avoids creating empty placeholder memos).
 */
export function applyPlainTextToMemos(memos: NoteMemo[] | undefined, text: string): NoteMemo[] {
  const html = plainToHtml(text);
  if (memos && memos.length > 0) {
    return memos.map((m, i) => (i === 0 ? { ...m, html } : m));
  }
  if (!text.trim()) return [];
  return [{ id: mid(), label: "メモ①", html, checklist: [], attachments: [] }];
}
