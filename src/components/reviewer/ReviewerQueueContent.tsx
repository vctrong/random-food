"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  EditIcon,
  ExternalLink,
  Lock,
  MapPin,
  Search,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { QueueCard } from "@/components/reviewer/QueueCard";
import { EATING_LEVEL_LABELS, isEatingLevel } from "@/constants/categories";
import { cn, formatPriceRange, formatRelativeTime, getGoogleMapsUrl } from "@/lib/utils";
import type { ModerationDecision, ReviewQueueItem } from "@/types/reviewer";

interface ReviewerQueueContentProps {
  initialItems: ReviewQueueItem[];
}

type TypeFilter = "all" | "food" | "restaurant";

const NOTE_PRESETS = [
  { label: "+ Ảnh đạt chuẩn", text: "Ảnh chụp thực tế rõ nét, đúng món/địa điểm." },
  { label: "+ Địa chỉ khớp bản đồ", text: "Toạ độ và địa chỉ khớp với thực địa." },
  { label: "- Thiếu ảnh minh chứng", text: "Cần bổ sung ảnh chụp thực tế món ăn/quán." },
  { label: "- Địa chỉ chưa rõ", text: "Địa chỉ/toạ độ chưa đủ chi tiết để xác minh." },
];

export function ReviewerQueueContent({ initialItems }: ReviewerQueueContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<ModerationDecision | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.targetType !== typeFilter) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.address ?? "").toLowerCase().includes(query) ||
        item.submitter.name.toLowerCase().includes(query)
      );
    });
  }, [items, typeFilter, search]);

  const selected = items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  async function handleDecision(decision: ModerationDecision) {
    if (!selected) return;
    if (decision !== "approved" && !note.trim()) {
      showToast("Cần nhập ghi chú/lý do trước khi gửi quyết định này.", "warning");
      return;
    }

    setIsSubmitting(decision);
    try {
      const response = await fetch("/api/reviewer/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: selected.targetType, targetId: selected.id, decision, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(data.error ?? "Có lỗi xảy ra, thử lại sau.", "error");
        return;
      }

      const successMessage =
        decision === "approved"
          ? `Đã duyệt "${selected.name}".`
          : decision === "rejected"
            ? `Đã từ chối "${selected.name}".`
            : `Đã gửi yêu cầu chỉnh sửa cho "${selected.name}".`;
      showToast(successMessage, "success");

      setItems((prev) => prev.filter((item) => item.id !== selected.id));
      setSelectedId(null);
      setNote("");
      router.refresh();
    } finally {
      setIsSubmitting(null);
    }
  }

  function selectItem(item: ReviewQueueItem) {
    setSelectedId(item.id);
    setNote("");
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Hàng chờ duyệt trống"
        description="Hiện chưa có món ăn hoặc quán ăn nào chờ thẩm định. Quay lại sau nhé."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Danh sách hàng chờ */}
      <section className="xl:col-span-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "all", label: `Tất cả (${items.length})` },
                { id: "food", label: `Món ăn (${items.filter((item) => item.targetType === "food").length})` },
                { id: "restaurant", label: `Quán mới (${items.filter((item) => item.targetType === "restaurant").length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                  typeFilter === tab.id ? "bg-primary-strong text-white" : "text-text-secondary hover:bg-primary-soft",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên món, quán, người gửi..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {filteredItems.length === 0 ? (
            <div className="text-center text-sm text-text-secondary py-10">Không tìm thấy hồ sơ phù hợp.</div>
          ) : (
            filteredItems.map((item) => (
              <QueueCard key={item.id} item={item} isActive={selected?.id === item.id} onSelect={() => selectItem(item)} />
            ))
          )}
        </div>
      </section>

      {/* Chi tiết & quyết định */}
      <section className="xl:col-span-7">
        {!selected ? (
          <EmptyState icon={ClipboardList} title="Chọn 1 hồ sơ" description="Chọn 1 mục ở danh sách bên trái để xem chi tiết." />
        ) : (
          <div className="flex flex-col bg-surface border border-border rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-primary-soft/50">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-strong dark:text-text-primary">
                {selected.targetType === "food" ? "Thẩm định món ăn" : "Thẩm định quán ăn mới"}
              </span>
              <span className="text-xs text-text-secondary">
                Nộp bởi <span className="font-semibold text-text-primary">{selected.submitter.name}</span>
              </span>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {selected.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-4 relative h-64 rounded-2xl overflow-hidden bg-primary-soft">
                    <Image src={selected.images[0]} alt={selected.name} fill className="object-cover" sizes="600px" />
                  </div>
                  {selected.images.slice(1, 5).map((src) => (
                    <div key={src} className="relative h-16 rounded-xl overflow-hidden bg-primary-soft">
                      <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 rounded-2xl bg-primary-soft flex items-center justify-center text-primary/60">
                  <UtensilsCrossed className="size-10" aria-hidden />
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <h2 className="text-xl font-heading font-bold text-text-primary">{selected.name}</h2>
                  {selected.priceMin !== null && selected.priceMax !== null && (
                    <span className="text-lg font-bold text-primary">
                      {formatPriceRange(selected.priceMin, selected.priceMax)}
                    </span>
                  )}
                </div>

                {selected.restaurantName && (
                  <p className="text-sm text-text-secondary">
                    Thuộc quán: <span className="font-medium text-text-primary">{selected.restaurantName}</span>
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {selected.categoryNames.map((name) => (
                    <Badge key={name} variant="blue">
                      {name}
                    </Badge>
                  ))}
                  {selected.eatingLevels.filter(isEatingLevel).map((level) => (
                    <Badge key={level} variant="pink">
                      {EATING_LEVEL_LABELS[level]}
                    </Badge>
                  ))}
                  {selected.openingHours && <Badge variant="neutral">Mở cửa: {selected.openingHours}</Badge>}
                </div>

                {selected.description && (
                  <div className="p-4 rounded-2xl bg-background flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Mô tả từ người gửi
                    </span>
                    <p className="text-sm text-text-primary leading-relaxed">{selected.description}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-surface border border-border">
                  <div className="size-11 rounded-full bg-accent-soft flex items-center justify-center text-accent-ink shrink-0">
                    <MapPin className="size-5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{selected.address ?? "Chưa có địa chỉ"}</p>
                    <p className="text-xs text-text-secondary">Gửi lúc: {formatRelativeTime(selected.createdAt)}</p>
                  </div>
                  {selected.location && (
                    <a
                      href={getGoogleMapsUrl(selected.location, selected.address ?? selected.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      Mở Google Maps <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </div>
              </div>

              {selected.lockReason && (
                <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-warning/15 text-[#7a5c0c]">
                  <Lock className="size-4 mt-0.5 shrink-0" aria-hidden />
                  <p className="text-sm">{selected.lockReason}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Gắn nhận xét nhanh
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {NOTE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={!selected.canDecide}
                        onClick={() => setNote((prev) => (prev.trim() ? `${prev}\n${preset.text}` : preset.text))}
                        className="px-3 py-1 rounded-full bg-primary-soft hover:bg-primary-soft/70 text-primary text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reviewer-note" className="text-sm font-semibold text-text-primary">
                    Ghi chú thẩm định (gửi tới người đóng góp)
                  </label>
                  <textarea
                    id="reviewer-note"
                    rows={3}
                    disabled={!selected.canDecide}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Bắt buộc khi Từ chối hoặc Yêu cầu sửa..."
                    className="w-full p-3.5 rounded-2xl bg-background text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Button
                    variant="primary"
                    disabled={!selected.canDecide}
                    isLoading={isSubmitting === "approved"}
                    onClick={() => handleDecision("approved")}
                    leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                  >
                    Duyệt hồ sơ
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!selected.canDecide}
                    isLoading={isSubmitting === "needs_revision"}
                    onClick={() => handleDecision("needs_revision")}
                    leftIcon={<EditIcon className="size-4" aria-hidden />}
                  >
                    Yêu cầu sửa
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!selected.canDecide}
                    isLoading={isSubmitting === "rejected"}
                    onClick={() => handleDecision("rejected")}
                    leftIcon={<XCircle className="size-4 text-accent-ink" aria-hidden />}
                  >
                    Từ chối
                  </Button>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Clock className="size-3.5" aria-hidden />
                  Mọi quyết định đều được ghi vào Audit Log và thông báo tới người đóng góp (BR-F09).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
