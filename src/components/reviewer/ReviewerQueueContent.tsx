"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  EditIcon,
  ExternalLink,
  Hand,
  Lock,
  MapPin,
  MessageSquareText,
  ScanSearch,
  Search,
  Store,
  Undo2,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { QueueCard } from "@/components/reviewer/QueueCard";
import { ClaimCountdown } from "@/components/reviewer/ClaimCountdown";
import { LocationConfidenceBadge } from "@/components/reviewer/LocationConfidenceBadge";
import { ProposalReviewPanel } from "@/components/reviewer/ProposalReviewPanel";
import { FactEditPanel } from "@/components/reviewer/FactEditPanel";
import { RestaurantImage } from "@/components/restaurant/RestaurantImage";
import { OpeningHoursSummary } from "@/components/restaurant/OpeningHoursSummary";
import { RestaurantMap } from "@/components/map/RestaurantMap";
import { EATING_LEVEL_LABELS, isEatingLevel } from "@/constants/categories";
import { CLAIM_TTL_HOURS } from "@/features/contributions/submissionRules";
import { cn, formatDateTime, formatPriceRange, formatRelativeTime, getGoogleMapsUrl } from "@/lib/utils";
import type { ModerationDecision, ReviewQueue, ReviewQueueItem } from "@/types/reviewer";
import type { CategoryOption } from "@/types/category";

interface ReviewerQueueContentProps {
  initialQueue: ReviewQueue;
  categories: CategoryOption[];
}

type QueueTab = "available" | "mine";

const NOTE_PRESETS = [
  { label: "+ Ảnh đạt chuẩn", text: "Ảnh chụp thực tế rõ nét, đúng món/địa điểm." },
  { label: "+ Địa chỉ khớp bản đồ", text: "Toạ độ và địa chỉ khớp với thực địa." },
  { label: "- Thiếu ảnh minh chứng", text: "Cần bổ sung ảnh chụp thực tế món ăn/quán." },
  { label: "- Địa chỉ chưa rõ", text: "Địa chỉ/toạ độ chưa đủ chi tiết để xác minh." },
];

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { ok: true } : { ok: false, error: data.error ?? "Có lỗi xảy ra, thử lại sau." };
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ, thử lại sau." };
  }
}

export function ReviewerQueueContent({ initialQueue, categories }: ReviewerQueueContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [queue, setQueue] = useState(initialQueue);
  const [tab, setTab] = useState<QueueTab>(initialQueue.mine.length > 0 ? "mine" : "available");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<ModerationDecision | "claim" | "release" | null>(null);

  const items = tab === "mine" ? queue.mine : queue.available;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.address ?? "").toLowerCase().includes(query) ||
        item.submitter.name.toLowerCase().includes(query),
    );
  }, [items, search]);

  const selected = items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const isMine = selected?.status === "in_review";
  const needsClaim = Boolean(selected && selected.requiresClaim && !isMine);

  /** Tải lại cả 2 tab từ server (state khởi tạo từ props nên router.refresh không tự cập nhật). */
  const reloadQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/reviewer/queue", { cache: "no-store" });
      if (response.ok) setQueue((await response.json()) as ReviewQueue);
    } catch {
      // Giữ dữ liệu đang hiển thị; lần thao tác sau sẽ tải lại.
    }
    router.refresh(); // cập nhật badge hàng chờ ở sidebar
  }, [router]);

  function selectItem(item: ReviewQueueItem) {
    setSelectedId(item.id);
    setNote("");
  }

  function switchTab(next: QueueTab) {
    setTab(next);
    setSelectedId(null);
    setNote("");
  }

  async function handleClaim() {
    if (!selected) return;
    setPendingAction("claim");
    const result = await postJson("/api/reviewer/claim", { action: "claim", foodId: selected.id });
    setPendingAction(null);
    if (!result.ok) {
      showToast(result.error ?? "Không nhận được đề xuất này.", "error");
      await reloadQueue();
      return;
    }
    showToast(`Đã nhận xác minh "${selected.name}". Bạn có ${CLAIM_TTL_HOURS} giờ để xử lý.`, "success");
    const claimedId = selected.id;
    await reloadQueue();
    setTab("mine");
    setSelectedId(claimedId);
  }

  async function handleRelease() {
    if (!selected) return;
    setPendingAction("release");
    const result = await postJson("/api/reviewer/claim", { action: "release", foodId: selected.id });
    setPendingAction(null);
    if (!result.ok) {
      showToast(result.error ?? "Không nhả được đề xuất này.", "error");
    } else {
      showToast(`Đã nhả "${selected.name}" về hàng chờ.`, "success");
      setSelectedId(null);
      setNote("");
    }
    await reloadQueue();
  }

  async function handleDecision(decision: ModerationDecision) {
    if (!selected) return;
    if (decision !== "approved" && !note.trim()) {
      showToast(
        decision === "needs_revision" ? "Cần nhập lý do yêu cầu chỉnh sửa để người gửi biết sửa gì." : "Cần nhập lý do từ chối.",
        "warning",
      );
      return;
    }

    setPendingAction(decision);
    const result = await postJson("/api/reviewer/decision", { targetType: selected.targetType, targetId: selected.id, decision, note });
    setPendingAction(null);
    if (!result.ok) {
      showToast(result.error ?? "Có lỗi xảy ra, thử lại sau.", "error");
      await reloadQueue();
      return;
    }

    const successMessage =
      decision === "approved"
        ? `Đã duyệt "${selected.name}".`
        : decision === "rejected"
          ? `Đã từ chối "${selected.name}".`
          : `Đã gửi yêu cầu chỉnh sửa cho "${selected.name}".`;
    showToast(successMessage, "success");
    setSelectedId(null);
    setNote("");
    await reloadQueue();
  }

  /** Đề xuất đã gộp/từ chối — cập nhật mọi món trong hàng chờ dùng chung đề xuất đó. */
  function handleProposalResolved({ proposalId, mergedCategory }: { proposalId: string; mergedCategory: CategoryOption | null }) {
    const update = (list: ReviewQueueItem[]) =>
      list.map((item) =>
        item.proposal?.id !== proposalId
          ? item
          : {
              ...item,
              proposal: null,
              categoryNames:
                mergedCategory && !item.categoryNames.includes(mergedCategory.name)
                  ? [...item.categoryNames, mergedCategory.name]
                  : item.categoryNames,
            },
      );
    setQueue((prev) => ({ available: update(prev.available), mine: update(prev.mine) }));
  }

  function patchSelected(changes: Partial<ReviewQueueItem>) {
    if (!selected) return;
    const update = (list: ReviewQueueItem[]) => list.map((item) => (item.id === selected.id ? { ...item, ...changes } : item));
    setQueue((prev) => ({ available: update(prev.available), mine: update(prev.mine) }));
  }

  const tabs: { id: QueueTab; label: string; count: number }[] = [
    { id: "available", label: "Chờ nhận", count: queue.available.length },
    { id: "mine", label: "Đang giữ", count: queue.mine.length },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Danh sách hàng chờ */}
      <section className="xl:col-span-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-background" role="tablist" aria-label="Hàng chờ">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => switchTab(item.id)}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  tab === item.id ? "bg-surface shadow-sm text-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên món, quán, người gửi..."
              aria-label="Tìm hồ sơ"
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-background text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {items.length === 0 ? (
            <div className="text-center text-sm text-text-secondary py-10 px-4">
              {tab === "mine"
                ? "Bạn chưa giữ đề xuất nào. Sang tab “Chờ nhận” để nhận xác minh."
                : "Hiện chưa có đề xuất nào chờ nhận. Quay lại sau nhé."}
            </div>
          ) : filteredItems.length === 0 ? (
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
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-primary-soft/50">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-strong dark:text-text-primary">
                {selected.targetType === "food" ? "Thẩm định món ăn" : "Thẩm định quán ăn mới"}
              </span>
              <span className="text-xs text-text-secondary">
                Nộp bởi <span className="font-semibold text-text-primary">{selected.submitter.name}</span>
              </span>
            </div>

            {isMine && selected.claimExpiresAt && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-border">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                  <ScanSearch className="size-4 text-primary" aria-hidden />
                  Bạn đang giữ đề xuất này
                  <ClaimCountdown expiresAt={selected.claimExpiresAt} className="ml-1" />
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={pendingAction === "release"}
                  disabled={pendingAction !== null}
                  onClick={handleRelease}
                  leftIcon={<Undo2 className="size-4" aria-hidden />}
                >
                  Nhả
                </Button>
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              {isMine && selected.notes.length > 0 && (
                <div className="p-4 rounded-2xl bg-accent-soft border border-accent/60 flex flex-col gap-2" role="status">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                    <MessageSquareText className="size-4 text-accent-ink" aria-hidden />
                    Người gửi có {selected.notes.length} ghi chú đính chính — đọc trước khi xác minh
                  </span>
                  <ul className="flex flex-col gap-2">
                    {selected.notes.map((item) => (
                      <li key={item.id} className="p-3 rounded-xl bg-surface text-sm text-text-primary">
                        <p className="whitespace-pre-line leading-relaxed">{item.content}</p>
                        <span className="block mt-1 text-xs text-text-secondary">{formatDateTime(item.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
              ) : selected.targetType === "restaurant" ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 relative h-56 rounded-2xl overflow-hidden bg-primary-soft">
                    <RestaurantImage images={selected.restaurantImages} alt={selected.name} sizes="600px" />
                  </div>
                  {selected.restaurantImages.slice(1, 3).map((src) => (
                    <div key={src} className="relative h-16 rounded-xl overflow-hidden bg-primary-soft">
                      <RestaurantImage images={src} alt="" sizes="160px" />
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
                    <span className="text-lg font-bold text-primary">{formatPriceRange(selected.priceMin, selected.priceMax)}</span>
                  )}
                </div>

                {selected.restaurantName && (
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary min-w-0">
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
                      <RestaurantImage images={selected.restaurantImages} alt={selected.restaurantName} sizes="36px" />
                    </span>
                    <span className="truncate">
                      Thuộc quán: <span className="font-medium text-text-primary">{selected.restaurantName}</span>
                    </span>
                  </div>
                )}

                {selected.hasNewRestaurant && (
                  <p className="flex items-start gap-2 text-xs text-text-secondary p-3 rounded-xl bg-secondary-soft">
                    <Store className="size-4 shrink-0 text-secondary-strong dark:text-text-primary" aria-hidden />
                    Quán này do người gửi thêm mới kèm món. Duyệt hoặc từ chối món sẽ áp dụng luôn cho quán.
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
                  {selected.openingSchedule && (
                    <Badge variant="neutral">
                      <OpeningHoursSummary schedule={selected.openingSchedule} />
                    </Badge>
                  )}
                  {selected.editCount > 0 && <Badge variant="neutral">Người gửi đã sửa {selected.editCount} lần</Badge>}
                </div>

                {selected.description && (
                  <div className="p-4 rounded-2xl bg-background flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Mô tả từ người gửi</span>
                    <p className="text-sm text-text-primary leading-relaxed">{selected.description}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-border">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="size-11 rounded-full bg-accent-soft flex items-center justify-center text-accent-ink shrink-0">
                      <MapPin className="size-5" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <p className="text-sm font-semibold text-text-primary break-words">{selected.address ?? "Chưa có địa chỉ"}</p>
                      <LocationConfidenceBadge source={selected.locationSource} showHint />
                      <p className="text-xs text-text-secondary">Gửi lúc: {formatRelativeTime(selected.createdAt)}</p>
                    </div>
                    <a
                      href={getGoogleMapsUrl(selected.location, selected.address ?? selected.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 min-h-10 text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      Mở trên Google Maps <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </div>
                  {selected.location && (
                    <div className="h-48 rounded-xl overflow-hidden border border-border">
                      <RestaurantMap
                        key={selected.id}
                        location={selected.location}
                        name={selected.restaurantName ?? selected.name}
                        address={selected.address ?? ""}
                        className="h-full"
                      />
                    </div>
                  )}
                </div>

                <FactEditPanel key={`facts-${selected.id}`} item={selected} disabled={!selected.canDecide} onSaved={patchSelected} />

                {selected.targetType === "food" && selected.proposal?.status === "pending" && (
                  <ProposalReviewPanel
                    key={selected.proposal.id}
                    foodId={selected.id}
                    proposal={selected.proposal}
                    categories={categories}
                    disabled={!selected.canDecide}
                    onResolved={handleProposalResolved}
                  />
                )}
              </div>

              {selected.lockReason && (
                <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-warning/15 text-[#7a5c0c]">
                  <Lock className="size-4 mt-0.5 shrink-0" aria-hidden />
                  <p className="text-sm">{selected.lockReason}</p>
                </div>
              )}

              {needsClaim ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-primary-soft/60">
                  <p className="flex-1 text-sm text-text-secondary">
                    Nhận xác minh để giữ đề xuất trong {CLAIM_TTL_HOURS} giờ — trong lúc đó người gửi không sửa được nữa, và bạn mới
                    duyệt, từ chối hoặc yêu cầu chỉnh sửa được. Quá hạn chưa xử lý thì đề xuất tự quay về “Chờ nhận”.
                  </p>
                  <Button
                    isLoading={pendingAction === "claim"}
                    disabled={selected.isSelfSubmitted || pendingAction !== null}
                    onClick={handleClaim}
                    leftIcon={<Hand className="size-4" aria-hidden />}
                    className="shrink-0"
                  >
                    Nhận xác minh
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Gắn nhận xét nhanh</span>
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
                      Ghi chú thẩm định / lý do (gửi tới người đóng góp)
                    </label>
                    <textarea
                      id="reviewer-note"
                      rows={3}
                      disabled={!selected.canDecide}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Bắt buộc khi Từ chối hoặc Yêu cầu chỉnh sửa — người gửi sẽ thấy nội dung này..."
                      className="w-full p-3.5 rounded-2xl bg-background text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Button
                      variant="primary"
                      disabled={!selected.canDecide || pendingAction !== null}
                      isLoading={pendingAction === "approved"}
                      onClick={() => handleDecision("approved")}
                      leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={!selected.canDecide || pendingAction !== null}
                      isLoading={pendingAction === "needs_revision"}
                      onClick={() => handleDecision("needs_revision")}
                      leftIcon={<EditIcon className="size-4" aria-hidden />}
                    >
                      Yêu cầu chỉnh sửa
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!selected.canDecide || pendingAction !== null}
                      isLoading={pendingAction === "rejected"}
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
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
