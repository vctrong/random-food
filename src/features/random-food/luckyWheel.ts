/**
 * Góc xoay (độ, theo chiều kim đồng hồ) để TÂM lát `targetIndex` dừng đúng dưới
 * kim chỉ ở đỉnh vòng quay. Lát i chiếm cung [i*s, (i+1)*s) tính từ đỉnh theo
 * chiều kim đồng hồ (s = 360 / sliceCount). Luôn quay tới (góc mới > góc hiện
 * tại + fullTurns vòng) để hiệu ứng không bị giật ngược.
 */
export function wheelTargetRotation(
  currentRotation: number,
  targetIndex: number,
  sliceCount: number,
  fullTurns: number,
): number {
  const slice = 360 / sliceCount;
  const sliceCenter = targetIndex * slice + slice / 2;
  const desiredMod = (360 - (sliceCenter % 360)) % 360;
  const base = currentRotation + fullTurns * 360;
  const baseMod = ((base % 360) + 360) % 360;
  return base + ((desiredMod - baseMod + 360) % 360);
}

/** Lát đang nằm dưới kim chỉ ở góc xoay `rotation` — dùng để kiểm chứng/đồng bộ. */
export function sliceAtPointer(rotation: number, sliceCount: number): number {
  const slice = 360 / sliceCount;
  const wheelAngleAtPointer = (((-rotation % 360) + 360) % 360);
  return Math.floor(wheelAngleAtPointer / slice) % sliceCount;
}
