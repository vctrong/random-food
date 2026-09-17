import type { HistoryEntry } from "@/types/history";

/**
 * Lớp duy nhất "biết" data lịch sử đến từ đâu. Các thay đổi thật (thêm/xoá/sửa)
 * được lưu vào localStorage của trình duyệt (chưa nối với collection
 * `experiences`/`logs` thật). Trên server (SSR) không có localStorage nên luôn
 * trả về mảng rỗng — component client tự đồng bộ lại dữ liệu thật ngay sau khi
 * mount.
 */

const STORAGE_KEY = "homnayangi:history";

function readStorage(): HistoryEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : null;
  } catch {
    return null;
  }
}

function writeStorage(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage (vd: chế độ riêng tư).
  }
}

function readEntries(): HistoryEntry[] {
  return readStorage() ?? [];
}

export function getAllHistory(): HistoryEntry[] {
  return [...readEntries()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function getRecentHistory(limit: number): HistoryEntry[] {
  return getAllHistory().slice(0, limit);
}

export function addHistoryEntry(entry: Omit<HistoryEntry, "id">): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  writeStorage([newEntry, ...readEntries()]);
  return newEntry;
}

export function updateHistoryEntry(id: string, patch: Partial<Omit<HistoryEntry, "id">>): void {
  writeStorage(readEntries().map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
}

export function removeHistoryEntry(id: string): void {
  writeStorage(readEntries().filter((entry) => entry.id !== id));
}

export function clearAllHistory(): void {
  writeStorage([]);
}
