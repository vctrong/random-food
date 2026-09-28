/**
 * Xử lý chuỗi tiếng Việt cho tìm kiếm/so khớp: bỏ dấu, so khớp mờ, tính vùng tô
 * đậm. Hàm thuần — dùng chung cho client (gợi ý danh mục, tô đậm kết quả) và
 * server (field `nameNormalized`/`addressNormalized`, fallback khi không có Atlas Search).
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Bỏ dấu 1 ký tự, giữ đúng 1 ký tự đầu ra để map được vị trí về chuỗi gốc (tô đậm). */
function foldChar(char: string): string {
  const lower = char.toLowerCase();
  if (lower === "đ") return "d";
  const folded = lower.normalize("NFD").replace(COMBINING_MARKS, "");
  return folded.length === 1 ? folded : lower;
}

/** "Hủ Tiếu  Cô Ba!" → "hu tieu co ba" — không dấu, lowercase, chỉ chữ/số, 1 khoảng trắng. */
export function normalizeVietnamese(value: string): string {
  return value
    .normalize("NFC")
    .split("")
    .map(foldChar)
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyVietnamese(value: string): string {
  return normalizeVietnamese(value).replace(/ /g, "-");
}

export function tokenize(value: string): string[] {
  const normalized = normalizeVietnamese(value);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Khoảng cách Damerau–Levenshtein (bản OSA: gõ đảo 2 ký tự liền nhau "tiue" ↔
 * "tieu" tính 1 lỗi như khi gõ nhanh), dừng sớm khi chắc chắn vượt `max`.
 */
export function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2] + 1);
      }
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length];
}

/** Số lỗi gõ chấp nhận theo độ dài từ — từ ngắn mà cho sai 2 ký tự thì khớp bừa. */
export function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * Từ `queryToken` khớp `targetToken` không: khớp đầu từ (gõ dở "tie" → "tieu")
 * hoặc sai tối đa 1–2 ký tự (chữ đầu phải đúng) so với từ đích.
 */
function tokenMatches(queryToken: string, targetToken: string): boolean {
  if (targetToken.startsWith(queryToken)) return true;
  // Giống `prefixLength: 1` của Atlas Search: chữ đầu phải đúng, tránh "tieu" khớp "kieu".
  if (queryToken[0] !== targetToken[0]) return false;
  const typos = allowedTypos(queryToken.length);
  if (typos === 0) return false;
  const prefix = targetToken.slice(0, queryToken.length);
  return boundedLevenshtein(queryToken, prefix, typos) <= typos || boundedLevenshtein(queryToken, targetToken, typos) <= typos;
}

/**
 * Điểm khớp mờ 0–1 (0 = không khớp). Mọi từ trong query phải khớp 1 từ trong
 * đích; khớp liền mạch cả cụm và khớp đầu chuỗi được cộng điểm.
 */
export function fuzzyScore(query: string, target: string): number {
  const normalizedQuery = normalizeVietnamese(query);
  const normalizedTarget = normalizeVietnamese(target);
  if (!normalizedQuery || !normalizedTarget) return 0;

  if (normalizedTarget === normalizedQuery) return 1;
  if (normalizedTarget.startsWith(normalizedQuery)) return 0.95;
  if (normalizedTarget.includes(normalizedQuery)) return 0.85;

  const queryTokens = normalizedQuery.split(" ");
  const targetTokens = normalizedTarget.split(" ");
  let exactHits = 0;
  for (const queryToken of queryTokens) {
    const exact = targetTokens.some((token) => token.startsWith(queryToken));
    if (exact) {
      exactHits++;
      continue;
    }
    if (!targetTokens.some((token) => tokenMatches(queryToken, token))) return 0;
  }
  return 0.4 + 0.35 * (exactHits / queryTokens.length);
}

/** Độ giống nhau cả chuỗi 0–1 theo Levenshtein — dùng cho "Có phải ý bạn là…". */
export function similarity(a: string, b: string): number {
  const x = normalizeVietnamese(a);
  const y = normalizeVietnamese(b);
  if (!x || !y) return 0;
  const longest = Math.max(x.length, y.length);
  const distance = boundedLevenshtein(x, y, longest);
  return 1 - distance / longest;
}

export interface TextRange {
  start: number;
  end: number;
}

/**
 * Vùng cần tô đậm trong chuỗi GỐC (có dấu) theo từng từ của query. Mỗi ký tự
 * gốc bỏ dấu ra đúng 1 ký tự nên vị trí trên chuỗi đã bỏ dấu dùng lại được.
 */
export function findHighlightRanges(text: string, query: string): TextRange[] {
  const source = text.normalize("NFC");
  const folded = source.split("").map(foldChar).join("");
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const ranges: TextRange[] = [];
  const wordPattern = /[a-z0-9]+/g;
  let match: RegExpExecArray | null;
  while ((match = wordPattern.exec(folded))) {
    const word = match[0];
    for (const token of queryTokens) {
      if (word.startsWith(token)) {
        ranges.push({ start: match.index, end: match.index + token.length });
        break;
      }
      if (tokenMatches(token, word)) {
        ranges.push({ start: match.index, end: match.index + Math.min(word.length, token.length) });
        break;
      }
    }
  }
  return ranges;
}

/** Tách chuỗi thành các đoạn thường/tô đậm để render. */
export function splitByRanges(text: string, ranges: TextRange[]): { text: string; highlight: boolean }[] {
  const source = text.normalize("NFC");
  const parts: { text: string; highlight: boolean }[] = [];
  let cursor = 0;
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    if (range.start < cursor) continue;
    if (range.start > cursor) parts.push({ text: source.slice(cursor, range.start), highlight: false });
    parts.push({ text: source.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), highlight: false });
  return parts;
}

/** Escape để nhúng chuỗi người dùng gõ vào RegExp an toàn. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
