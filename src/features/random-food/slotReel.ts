import type { Food } from "@/types/food";
import { formatPriceShort } from "@/lib/utils";

/** 3 cuộn của máy slot ở landing: món — quán — mức giá. */
export type ReelKey = "dish" | "place" | "price";

export const REEL_KEYS: ReelKey[] = ["dish", "place", "price"];

export type ReelLabels = Record<ReelKey, string>;

/** Nhãn hiển thị ở ô trúng thưởng trước lần quay đầu tiên. */
export const IDLE_REEL_LABEL = "?";

export function getReelLabels(food: Food): ReelLabels {
  return {
    dish: food.name,
    place: food.restaurant?.name ?? "Chưa gắn quán",
    price: formatPriceShort(food.priceMin, food.priceMax),
  };
}

/**
 * Dải cuộn = [đệm trên, nhãn đang hiện, ...nhãn lấp, nhãn trúng, đệm dưới].
 * Cửa sổ cuộn luôn hiện 3 dòng, nên phần tử đầu/cuối chỉ để dòng trên/dưới của
 * nhãn đang hiện và nhãn trúng không bị trống. Bắt đầu bằng đúng nhãn đang hiện
 * nên khi mount dải mới, cuộn không bị giật.
 *
 * Nhãn lấp lấy từ món THẬT trong pool, tránh 2 nhãn giống nhau đứng liền nhau
 * (nhìn như cuộn bị đứng). `rng` truyền vào để test được — mặc định Math.random,
 * chỉ gọi hàm này trong event handler, không gọi lúc render.
 */
export function buildReelStrip(
  sourceLabels: string[],
  fromLabel: string,
  targetLabel: string,
  fillerCount: number,
  rng: () => number = Math.random,
): string[] {
  const unique = [...new Set(sourceLabels.filter((label) => label.length > 0))];
  const pickFiller = (avoid: string) => {
    const candidates = unique.filter((label) => label !== avoid);
    if (candidates.length === 0) return unique[0] ?? targetLabel;
    return candidates[Math.floor(rng() * candidates.length)];
  };

  const strip: string[] = [pickFiller(fromLabel), fromLabel];
  for (let i = 0; i < fillerCount; i += 1) {
    strip.push(pickFiller(strip[strip.length - 1]));
  }
  if (strip[strip.length - 1] === targetLabel && unique.length > 1) {
    strip[strip.length - 1] = pickFiller(targetLabel);
  }
  strip.push(targetLabel, pickFiller(targetLabel));
  return strip;
}

/** Dải tĩnh lúc chưa quay — tất định (không random) để khớp SSR/hydrate. */
export function buildIdleStrip(sourceLabels: string[]): string[] {
  return [sourceLabels[0] ?? "", IDLE_REEL_LABEL, sourceLabels[1] ?? ""];
}

/**
 * translateY (%) để dòng `index` của dải nằm giữa cửa sổ 3 dòng. Tính theo % chiều
 * cao chính dải nên không phụ thuộc chiều cao dòng (khác nhau giữa mobile/desktop).
 */
export function reelOffsetPercent(index: number, stripLength: number): number {
  if (stripLength === 0) return 0;
  return -((index - 1) / stripLength) * 100;
}
