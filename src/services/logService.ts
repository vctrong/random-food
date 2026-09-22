/**
 * Lớp duy nhất "biết" cách ghi log thật qua `/api/logs`. Chỉ dùng ở phía
 * client, gọi kiểu fire-and-forget — không được làm chậm/chặn UX random.
 */
export function trackRandomEvent(): void {
  fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "random" }),
    keepalive: true,
  }).catch(() => {
    // Log analytics không quan trọng bằng trải nghiệm random — im lặng bỏ qua lỗi.
  });
}
