"use client";

import { useEffect, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { cropImageFile, UploadError } from "@/services/uploadService";
import { cn } from "@/lib/utils";

type AspectKey = "free" | "original" | "16:9" | "4:3" | "1:1";

const ASPECT_OPTIONS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "free", label: "Tự do", ratio: null },
  { key: "original", label: "Gốc", ratio: null },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "1:1", label: "1:1", ratio: 1 },
];

const FULL_CROP: PercentCrop = { unit: "%", x: 0, y: 0, width: 100, height: 100 };

/** Vùng lớn nhất đúng tỉ lệ `ratio`, đặt giữa ảnh (đơn vị %). */
function centeredCrop(ratio: number, imageWidth: number, imageHeight: number): PercentCrop {
  const imageRatio = imageWidth / imageHeight;
  const width = imageRatio > ratio ? (ratio / imageRatio) * 100 : 100;
  const height = imageRatio > ratio ? 100 : (imageRatio / ratio) * 100;
  return { unit: "%", x: (100 - width) / 2, y: (100 - height) / 2, width, height };
}

function isFullCrop(crop: PercentCrop): boolean {
  return crop.width >= 99.5 && crop.height >= 99.5;
}

interface GalleryCropPanelProps {
  file: File;
  /** Vị trí trong hàng chờ, vd "2/5" — null nếu chỉ 1 ảnh. */
  queueLabel: string | null;
  hasMoreInQueue: boolean;
  onApply: (file: File) => void;
  onSkipAll: () => void;
  onDiscard: () => void;
}

/**
 * Bước cắt ảnh (tuỳ chọn) trước khi upload — chạy hoàn toàn ở trình duyệt.
 * Không cắt gì (vùng = cả ảnh) thì giữ nguyên file gốc, không mã hoá lại.
 */
export function GalleryCropPanel({ file, queueLabel, hasMoreInQueue, onApply, onSkipAll, onDiscard }: GalleryCropPanelProps) {
  const { showToast } = useToast();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [aspectKey, setAspectKey] = useState<AspectKey>("free");
  const [crop, setCrop] = useState<PercentCrop>(FULL_CROP);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // Object URL là tài nguyên ngoài React — tạo/dọn trong effect (an toàn với StrictMode).
    // Nơi gọi đặt `key` theo file nên các state khác tự reset khi sang ảnh mới.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const ratioOf = (key: AspectKey): number | undefined => {
    if (key === "free") return undefined;
    if (key === "original") return natural ? natural.width / natural.height : undefined;
    return ASPECT_OPTIONS.find((option) => option.key === key)?.ratio ?? undefined;
  };

  function chooseAspect(key: AspectKey) {
    setAspectKey(key);
    const ratio = ratioOf(key);
    if (key === "original" || !natural) setCrop(FULL_CROP);
    else if (ratio) setCrop(centeredCrop(ratio, natural.width, natural.height));
  }

  async function apply() {
    if (!natural || isFullCrop(crop)) {
      onApply(file);
      return;
    }
    setIsWorking(true);
    try {
      const cropped = await cropImageFile(file, {
        x: (crop.x / 100) * natural.width,
        y: (crop.y / 100) * natural.height,
        width: (crop.width / 100) * natural.width,
        height: (crop.height / 100) * natural.height,
      });
      onApply(cropped);
    } catch (error) {
      showToast(error instanceof UploadError ? error.message : "Không cắt được ảnh này, thử bỏ qua bước cắt nha.", "error");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 pr-16">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-h4 text-text-primary">
            <Crop className="size-4.5 text-primary" aria-hidden />
            Cắt ảnh {queueLabel && <span className="text-sm font-normal text-text-secondary tabular-nums">({queueLabel})</span>}
          </h3>
          <p className="truncate text-xs text-text-secondary">{file.name} · Kéo khung để chọn vùng giữ lại, hoặc bỏ qua nếu không cần.</p>
        </div>
        <div role="group" aria-label="Tỉ lệ khung cắt" className="flex flex-wrap gap-1.5">
          {ASPECT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => chooseAspect(option.key)}
              aria-pressed={aspectKey === option.key}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                aspectKey === option.key
                  ? "border-primary-strong bg-primary-strong text-white"
                  : "border-border text-text-secondary hover:border-primary-line hover:text-text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-4">
        {objectUrl && (
          <ReactCrop
            crop={crop}
            onChange={(_pixel, percent) => setCrop(percent)}
            aspect={ratioOf(aspectKey)}
            keepSelection
            ruleOfThirds
            minWidth={24}
            minHeight={24}
            // react-image-crop cho ảnh con `max-height: inherit` → giới hạn đặt ở đây để cả ảnh nằm gọn trong khung.
            className="max-h-[calc(92svh-11rem)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh cục bộ (blob:) chưa upload */}
            <img
              src={objectUrl}
              alt="Ảnh đang cắt"
              onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              className="block w-auto max-w-full"
            />
          </ReactCrop>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={onDiscard}
          disabled={isWorking}
          className="h-10 rounded-full px-3 text-sm font-semibold text-text-secondary transition-colors hover:text-accent-ink"
        >
          Bỏ ảnh này
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {hasMoreInQueue && (
            <Button size="sm" variant="outline" onClick={onSkipAll} disabled={isWorking} leftIcon={<SkipForward className="size-4" />}>
              Không cắt các ảnh còn lại
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onApply(file)} disabled={isWorking}>
            Bỏ qua bước cắt
          </Button>
          <Button size="sm" onClick={apply} isLoading={isWorking} disabled={!natural} leftIcon={<Crop className="size-4" />}>
            {isFullCrop(crop) ? "Dùng ảnh này" : "Cắt & tải lên"}
          </Button>
        </div>
      </div>
    </div>
  );
}
