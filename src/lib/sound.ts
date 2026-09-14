/** Beep ngắn, tổng hợp bằng Web Audio API — không cần file audio riêng. */
export function playRandomizeChime(): void {
  if (typeof window === "undefined") return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
    oscillator.onended = () => ctx.close();
  } catch {
    // Trình duyệt chặn AudioContext (vd: chưa có tương tác người dùng) — bỏ qua lặng lẽ.
  }
}
