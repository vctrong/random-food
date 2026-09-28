import { findHighlightRanges, splitByRanges } from "@/lib/vietnameseText";

/** Tô đậm phần khớp với từ khoá (so khớp không dấu, chịu lỗi gõ nhẹ) — chuỗi dài tự cắt ellipsis ở phần tử cha. */
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  return (
    <>
      {splitByRanges(text, findHighlightRanges(text, query)).map((part, index) =>
        part.highlight ? (
          <mark key={index} className="bg-transparent font-bold text-text-primary underline decoration-accent decoration-2 underline-offset-2">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
