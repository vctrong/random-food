import { CircleHelp, MapPinOff, Navigation, Pin, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { LocationSource } from "@/types/restaurant";

const CONFIG: Record<LocationSource | "unknown", { label: string; variant: "success" | "blue" | "warning" | "neutral"; icon: typeof Pin; hint: string }> = {
  gps: { label: "GPS tại quán", variant: "success", icon: Navigation, hint: "Người gửi bấm “Tôi đang ở quán này” — tin cậy cao." },
  pin_confirmed: { label: "Ghim tay", variant: "blue", icon: Pin, hint: "Người gửi tự kéo bản đồ để ghim — khá tin cậy." },
  geocoded: { label: "Theo địa chỉ", variant: "warning", icon: TriangleAlert, hint: "Toạ độ suy ra từ địa chỉ chữ, chưa ai xác nhận — cần kiểm tra." },
  none: { label: "Chưa có vị trí", variant: "neutral", icon: MapPinOff, hint: "Chỉ có địa chỉ chữ — kiểm tra bằng Google Maps." },
  unknown: { label: "Chưa rõ nguồn", variant: "neutral", icon: CircleHelp, hint: "Dữ liệu cũ, chưa ghi nhận nguồn vị trí." },
};

/** Badge độ tin cậy vị trí quán theo `locationSource` — màn duyệt reviewer/admin. */
export function LocationConfidenceBadge({ source, showHint = false }: { source: LocationSource | null; showHint?: boolean }) {
  const config = CONFIG[source ?? "unknown"];
  const Icon = config.icon;
  return (
    <span className="inline-flex flex-col gap-1">
      <Badge variant={config.variant}>
        <Icon className="size-3.5" aria-hidden />
        {config.label}
      </Badge>
      {showHint && <span className="text-xs text-text-secondary">{config.hint}</span>}
    </span>
  );
}
