"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Ban, CheckCircle2, DoorClosed, DoorOpen, EyeOff, GitMerge, PencilLine, Star, Trash2, TriangleAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import { SearchListbox } from "@/components/ui/SearchListbox";
import { useToast } from "@/components/ui/ToastProvider";
import { RestaurantImage } from "@/components/restaurant/RestaurantImage";
import { RestaurantMap } from "@/components/map/RestaurantMap";
import { PinLocationEditor } from "@/components/map/PinLocationEditor";
import { LocationConfidenceBadge } from "@/components/reviewer/LocationConfidenceBadge";
import { useRestaurantSearch } from "@/features/contribute-food/useRestaurantSearch";
import { formatPriceInput, parsePrice } from "@/features/contribute-food/formProgress";
import { cn, formatDateTime, formatPriceRange, isAllowedImageHost, shortenAddress } from "@/lib/utils";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import {
  REPORT_CASE_ACTION_LABELS,
  REPORT_REASON_LABELS,
  RESOLUTION_PRESETS,
  type ReportCaseStatus,
} from "@/constants/reports";
import type { AdminReportCaseDetail, AdminReportCaseTarget } from "@/types/admin";

const STATUS_BADGE: Record<ReportCaseStatus, { label: string; variant: "warning" | "success" | "neutral" }> = {
  pending: { label: "Đang chờ xử lý", variant: "warning" },
  resolved: { label: "Đã xử lý", variant: "success" },
  dismissed: { label: "Đã bỏ qua", variant: "neutral" },
};

const TYPE_LABEL = { review: "Đánh giá bị báo cáo", food: "Món bị báo cáo", restaurant: "Quán bị báo cáo" } as const;

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

type Mode = "idle" | "edit" | "merge";

async function postJson(url: string, method: "POST" | "PATCH", body: unknown) {
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return response.ok ? { ok: true as const } : { ok: false as const, error: getApiErrorMessage(response.status, data.error) };
  } catch {
    return { ok: false as const, error: getNetworkErrorMessage() };
  }
}

/** Chi tiết 1 case + hành động xử lý (chỉ Admin — API cũng chặn). */
export function ReportCaseDetailPanel({ detail, onResolved }: { detail: AdminReportCaseDetail; onResolved: () => void }) {
  const { showToast } = useToast();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "close" | "merge" | "ban">(null);
  const [mergeTarget, setMergeTarget] = useState<MergeCandidate | null>(null);
  const target = detail.target;
  const isPending = detail.status === "pending";
  const maxCount = Math.max(1, ...detail.reasonCounts.map((entry) => entry.count));

  async function resolve(body: Record<string, unknown>, label: string) {
    if (!note.trim()) {
      showToast("Cần ghi lý do xử lý (chọn nhanh hoặc tự gõ).", "warning");
      return false;
    }
    setPending(label);
    const result = await postJson(`/api/admin/report-cases/${detail.id}`, "POST", { ...body, note: note.trim() });
    setPending(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return false;
    }
    showToast("Đã xử lý case và báo cho người báo cáo.", "success");
    onResolved();
    return true;
  }

  const presets =
    detail.targetType === "review"
      ? [...RESOLUTION_PRESETS.remove, ...RESOLUTION_PRESETS.dismiss]
      : [...RESOLUTION_PRESETS.place, ...RESOLUTION_PRESETS.dismiss];

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary-soft/50 px-5 py-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-secondary-strong dark:text-text-primary">
          {TYPE_LABEL[detail.targetType]}
        </span>
        <Badge variant={STATUS_BADGE[detail.status].variant}>{STATUS_BADGE[detail.status].label}</Badge>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        {target ? (
          <TargetView target={target} onReopened={onResolved} />
        ) : (
          <p className="rounded-xl bg-background p-4 text-sm text-text-secondary">Nội dung bị báo cáo không còn tồn tại.</p>
        )}

        {target && target.type !== "review" && target.author && (
          <p className="text-xs text-text-secondary">Người đóng góp: {target.author.name}</p>
        )}
        {target?.type === "review" && target.author && (
          <AuthorBox
            author={target.author}
            onBan={() => setConfirm("ban")}
          />
        )}

        {/* Thống kê lý do */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {detail.reportCount} lượt báo cáo · mở lúc {formatDateTime(detail.createdAt)}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {detail.reasonCounts.map((entry) => (
              <li key={entry.reason} className="grid grid-cols-[8.5rem_1fr_2rem] sm:grid-cols-[11rem_1fr_2rem] items-center gap-2 text-xs">
                <span className="truncate text-text-primary">{REPORT_REASON_LABELS[entry.reason]}</span>
                <span className="h-2 rounded-full bg-background overflow-hidden">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(entry.count / maxCount) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-text-secondary">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ghi chú người báo cáo */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Ghi chú từ người báo cáo</h3>
          <ul className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {detail.reports.map((report) => (
              <li key={report.id} className="flex flex-col gap-1 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant="neutral">{REPORT_REASON_LABELS[report.reason]}</Badge>
                  <span className="text-xs text-text-secondary">
                    {report.reporter.name} · {formatDateTime(report.createdAt)}
                  </span>
                </div>
                {report.note && <p className="break-words text-text-primary">{report.note}</p>}
                {report.duplicateOf && (
                  <p className="text-xs text-text-secondary">
                    Trùng với: <span className="font-semibold text-text-primary">{report.duplicateOf.name}</span> ·{" "}
                    {shortenAddress(report.duplicateOf.address)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {!isPending ? (
          <div className="rounded-xl bg-background p-4 text-sm">
            <p className="font-semibold text-text-primary">
              {detail.action ? REPORT_CASE_ACTION_LABELS[detail.action] : STATUS_BADGE[detail.status].label}
              {detail.resolvedBy && ` · bởi ${detail.resolvedBy.name}`}
              {detail.resolvedAt && ` · ${formatDateTime(detail.resolvedAt)}`}
            </p>
            {detail.resolutionNote && <p className="mt-1 text-text-secondary">Lý do: {detail.resolutionNote}</p>}
          </div>
        ) : (
          target && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <label htmlFor={noteId} className="text-sm font-semibold text-text-primary">
                Lý do xử lý <span className="text-xs font-normal text-text-secondary">(bắt buộc — gửi kèm thông báo)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      note === preset ? "border-primary bg-primary-soft text-text-primary" : "border-border text-text-secondary hover:border-primary-line",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                id={noteId}
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Hoặc tự gõ lý do…"
                className="w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
              />

              {mode === "edit" && target.type !== "review" && (
                <EditForm
                  target={target}
                  isSaving={pending === "edit"}
                  onCancel={() => setMode("idle")}
                  onSave={(changes) => void resolve({ action: "edit_info", ...changes }, "edit")}
                />
              )}
              {mode === "merge" && target.type === "restaurant" && (
                <MergePicker
                  detail={detail}
                  isSaving={pending === "merge"}
                  onCancel={() => setMode("idle")}
                  onPick={(restaurant) => setMergeTarget(restaurant)}
                  selected={mergeTarget}
                  onConfirm={() => {
                    if (!note.trim()) {
                      showToast("Cần ghi lý do xử lý trước khi gộp.", "warning");
                      return;
                    }
                    setConfirm("merge");
                  }}
                />
              )}

              {mode === "idle" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    isLoading={pending === "dismiss"}
                    leftIcon={<XCircle className="size-4" aria-hidden />}
                    onClick={() => void resolve({ action: "dismiss" }, "dismiss")}
                  >
                    Bỏ qua{target.type === "review" && target.status === "hidden_pending_review" ? " & hiện lại" : ""}
                  </Button>
                  {target.type === "review" ? (
                    <>
                      <Button
                        isLoading={pending === "remove"}
                        leftIcon={<Trash2 className="size-4" aria-hidden />}
                        onClick={() => void resolve({ action: "remove_review" }, "remove")}
                      >
                        Gỡ đánh giá
                      </Button>
                      <Button
                        variant="secondary"
                        isLoading={pending === "warn"}
                        leftIcon={<TriangleAlert className="size-4 text-accent-ink" aria-hidden />}
                        onClick={() => void resolve({ action: "remove_review_warn" }, "warn")}
                      >
                        Gỡ + cảnh cáo tác giả
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button leftIcon={<PencilLine className="size-4" aria-hidden />} onClick={() => setMode("edit")}>
                        Sửa thông tin
                      </Button>
                      {target.type === "restaurant" && (
                        <>
                          {target.businessStatus === "open" && (
                            <Button variant="secondary" leftIcon={<DoorClosed className="size-4" aria-hidden />} onClick={() => setConfirm("close")}>
                              Đánh dấu đã đóng cửa
                            </Button>
                          )}
                          <Button variant="secondary" leftIcon={<GitMerge className="size-4" aria-hidden />} onClick={() => setMode("merge")}>
                            Gộp quán trùng
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      <ConfirmDangerModal
        isOpen={confirm === "close"}
        onClose={() => setConfirm(null)}
        title="Đánh dấu quán đã đóng cửa?"
        description="Quán và các món sẽ bị ẩn khỏi random, danh sách món và chọn quán. Dữ liệu vẫn giữ nguyên, có thể mở lại sau."
        confirmLabel="Đánh dấu đóng cửa"
        isLoading={pending === "close"}
        onConfirm={async () => {
          if (await resolve({ action: "mark_closed" }, "close")) setConfirm(null);
        }}
      />
      <ConfirmDangerModal
        isOpen={confirm === "merge"}
        onClose={() => setConfirm(null)}
        title="Gộp quán — không hoàn tác được"
        description={`Toàn bộ món, lịch sử check-in và đánh giá của quán này sẽ chuyển sang “${mergeTarget?.name ?? ""}”, quán này bị gỡ. Gõ GỘP để xác nhận.`}
        confirmLabel="Gộp quán"
        requireTypedConfirmation="GỘP"
        isLoading={pending === "merge"}
        onConfirm={async () => {
          if (!mergeTarget) return;
          if (await resolve({ action: "merge_restaurant", mergeIntoRestaurantId: mergeTarget.id, confirm: true }, "merge")) {
            setConfirm(null);
            setMode("idle");
          }
        }}
      />
      {target?.type === "review" && target.author && (
        <ConfirmDangerModal
          isOpen={confirm === "ban"}
          onClose={() => setConfirm(null)}
          title={`Khoá tài khoản ${target.author.name}?`}
          description={`Tác giả đã bị cảnh cáo ${target.author.warningCount} lần. Tài khoản bị khoá sẽ đăng xuất khỏi mọi thiết bị và không đăng nhập lại được.`}
          confirmLabel="Khoá tài khoản"
          isLoading={pending === "ban"}
          onConfirm={async () => {
            if (!target.author) return;
            setPending("ban");
            const result = await postJson("/api/admin/users", "PATCH", {
              userId: target.author.id,
              accountStatus: "banned",
              reason: note.trim() || "Vi phạm quy định đánh giá nhiều lần",
            });
            setPending(null);
            if (!result.ok) {
              showToast(result.error, "error");
              return;
            }
            showToast("Đã khoá tài khoản tác giả.", "success");
            setConfirm(null);
            onResolved();
          }}
        />
      )}
    </div>
  );
}

interface MergeCandidate {
  id: string;
  name: string;
  address: string;
}

function TargetView({ target, onReopened }: { target: AdminReportCaseTarget; onReopened: () => void }) {
  const { showToast } = useToast();
  const [isReopening, setIsReopening] = useState(false);

  if (target.type === "review") {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-0.5" role="img" aria-label={`${target.rating} trên 5 sao`}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star key={value} className={cn("size-4", value <= target.rating ? "fill-warning text-warning" : "text-border")} aria-hidden />
            ))}
          </span>
          {target.status === "hidden_pending_review" && (
            <Badge variant="warning">
              <EyeOff className="size-3.5" aria-hidden />
              Đang ẩn tạm chờ xử lý
            </Badge>
          )}
          {target.status === "hidden" && <Badge variant="neutral">Đã gỡ</Badge>}
        </div>
        <p className="break-words text-sm leading-relaxed text-text-primary">{target.comment ?? "(Không có bình luận)"}</p>
        {target.food && (
          <Link href={`/mon-an/${target.food.id}`} target="_blank" className="self-start text-xs font-semibold text-primary hover:underline">
            Món: {target.food.name}
          </Link>
        )}
      </div>
    );
  }

  if (target.type === "food") {
    return (
      <div className="flex flex-col gap-3">
        {target.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {target.images.slice(0, 4).map((src) =>
              isAllowedImageHost(src) ? (
                <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-primary-soft">
                  <Image src={src} alt="" fill sizes="140px" className="object-cover" />
                </div>
              ) : null,
            )}
          </div>
        )}
        <div>
          <Link href={`/mon-an/${target.id}`} target="_blank" className="text-lg font-heading text-text-primary hover:underline">
            {target.name}
          </Link>
          {target.restaurant && <p className="text-sm text-text-secondary">Quán: {target.restaurant.name}</p>}
        </div>
        <p className="text-sm font-semibold text-primary">
          {target.priceMin !== null && target.priceMax !== null ? formatPriceRange(target.priceMin, target.priceMax) : "Chưa có giá"}
        </p>
        {target.description && <p className="break-words text-sm text-text-secondary">{target.description}</p>}
      </div>
    );
  }

  const restaurantId = target.id;
  async function reopen() {
    setIsReopening(true);
    const result = await postJson("/api/admin/restaurants", "PATCH", { restaurantId, businessStatus: "open", note: "" });
    setIsReopening(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Đã mở lại quán.", "success");
    onReopened();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary-soft">
          <RestaurantImage images={target.images} alt={target.name} sizes="64px" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-heading text-text-primary">
            <span className="break-words">{target.name}</span>
            {target.businessStatus === "closed" && <Badge variant="neutral">Đã đóng cửa</Badge>}
          </p>
          <p className="break-words text-sm text-text-secondary">{target.address}</p>
          <p className="text-xs text-text-secondary">
            {target.openingHours ? `Giờ mở cửa: ${target.openingHours} · ` : ""}
            {target.foodCount} món
          </p>
        </div>
      </div>
      <LocationConfidenceBadge source={target.locationSource} />
      {target.location && (
        <div className="h-44 overflow-hidden rounded-xl border border-border">
          <RestaurantMap location={target.location} name={target.name} address={target.address} className="h-full" />
        </div>
      )}
      {target.businessStatus === "closed" && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          isLoading={isReopening}
          leftIcon={<DoorOpen className="size-4" aria-hidden />}
          onClick={() => void reopen()}
        >
          Mở lại quán
        </Button>
      )}
    </div>
  );
}

type ReviewAuthor = NonNullable<Extract<AdminReportCaseTarget, { type: "review" }>["author"]>;

function AuthorBox({ author, onBan }: { author: ReviewAuthor; onBan: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-text-primary">Tác giả: {author.name}</p>
        <p className="text-xs text-text-secondary">
          Đã bị cảnh cáo {author.warningCount} lần · {author.accountStatus === "banned" ? "Tài khoản đang bị khoá" : "Đang hoạt động"}
        </p>
      </div>
      {author.accountStatus === "active" && (
        <Button size="sm" variant="outline" leftIcon={<Ban className="size-4 text-accent-ink" aria-hidden />} onClick={onBan}>
          Khoá tài khoản tác giả
        </Button>
      )}
    </div>
  );
}

type PlaceTarget = Exclude<AdminReportCaseTarget, { type: "review" }>;

function EditForm({
  target,
  isSaving,
  onCancel,
  onSave,
}: {
  target: PlaceTarget;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (changes: Record<string, unknown>) => void;
}) {
  const food = target.type === "food" ? target : null;
  const restaurant = target.type === "restaurant" ? target : null;
  const [name, setName] = useState(target.name);
  const [description, setDescription] = useState(food?.description ?? "");
  const [priceMin, setPriceMin] = useState(food?.priceMin != null ? formatPriceInput(String(food.priceMin)) : "");
  const [priceMax, setPriceMax] = useState(food?.priceMax != null ? formatPriceInput(String(food.priceMax)) : "");
  const [address, setAddress] = useState(restaurant?.address ?? "");
  const [openingHours, setOpeningHours] = useState(restaurant?.openingHours ?? "");
  const [location, setLocation] = useState(restaurant?.location ?? null);
  const [removed, setRemoved] = useState<string[]>([]);

  const removeImages = removed.length > 0 ? { removeImages: removed } : {};
  let fields: Record<string, unknown>;
  if (food) {
    const min = parsePrice(priceMin);
    const max = parsePrice(priceMax);
    fields = {
      ...(name.trim() !== food.name && { name }),
      ...(description.trim() !== food.description && { description }),
      ...((min !== food.priceMin || max !== food.priceMax) && min !== null && max !== null && { priceMin: min, priceMax: max }),
      ...removeImages,
    };
  } else {
    fields = {
      ...(name.trim() !== target.name && { name }),
      ...(address.trim() !== restaurant?.address && { address }),
      ...(openingHours.trim() !== (restaurant?.openingHours ?? "") && { openingHours }),
      ...(JSON.stringify(location) !== JSON.stringify(restaurant?.location ?? null) && { location }),
      ...removeImages,
    };
  }
  const hasChanges = Object.keys(fields).length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary-line bg-primary-soft/30 p-4">
      <p className="text-sm font-semibold text-text-primary">Sửa thông tin (Admin — toàn quyền)</p>
      <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} aria-label="Tên" className={inputClass} />
      {food ? (
        <>
          <textarea
            value={description}
            rows={3}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Mô tả"
            className={cn(inputClass, "h-auto resize-none py-2.5")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input inputMode="numeric" value={priceMin} onChange={(event) => setPriceMin(formatPriceInput(event.target.value))} aria-label="Giá từ" placeholder="Giá từ" className={inputClass} />
            <input inputMode="numeric" value={priceMax} onChange={(event) => setPriceMax(formatPriceInput(event.target.value))} aria-label="Giá đến" placeholder="Giá đến" className={inputClass} />
          </div>
        </>
      ) : (
        <>
          <input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} aria-label="Địa chỉ" className={inputClass} />
          <input
            value={openingHours}
            onChange={(event) => setOpeningHours(event.target.value)}
            maxLength={100}
            aria-label="Giờ mở cửa"
            placeholder="Giờ mở cửa, vd 06:00 - 21:00"
            className={inputClass}
          />
          <PinLocationEditor initial={restaurant?.location ?? null} value={location} onChange={setLocation} />
        </>
      )}

      {target.images.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-primary">Gỡ ảnh sai (bấm để chọn)</span>
          <div className="grid grid-cols-4 gap-2">
            {target.images.map((src) => {
              const isRemoved = removed.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  aria-pressed={isRemoved}
                  aria-label={isRemoved ? "Bỏ chọn gỡ ảnh" : "Chọn gỡ ảnh này"}
                  onClick={() => setRemoved((prev) => (isRemoved ? prev.filter((url) => url !== src) : [...prev, src]))}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-xl bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isRemoved && "ring-2 ring-accent-strong",
                  )}
                >
                  {isAllowedImageHost(src) && <Image src={src} alt="" fill sizes="120px" className={cn("object-cover", isRemoved && "opacity-40")} />}
                  {isRemoved && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Trash2 className="size-5 text-accent-ink" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary">Không còn ảnh nào thì hệ thống tự dùng ảnh mặc định khi hiển thị.</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          size="sm"
          disabled={!hasChanges}
          isLoading={isSaving}
          leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
          onClick={() => onSave(food ? { food: fields } : { restaurant: fields })}
        >
          Lưu & đóng case
        </Button>
      </div>
    </div>
  );
}

function MergePicker({
  detail,
  selected,
  isSaving,
  onPick,
  onCancel,
  onConfirm,
}: {
  detail: AdminReportCaseDetail;
  selected: MergeCandidate | null;
  isSaving: boolean;
  onPick: (restaurant: MergeCandidate) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const search = useRestaurantSearch(true, null);
  const suggested = new Map<string, MergeCandidate & { count: number }>();
  for (const report of detail.reports) {
    if (!report.duplicateOf) continue;
    const current = suggested.get(report.duplicateOf.id);
    suggested.set(report.duplicateOf.id, { ...report.duplicateOf, count: (current?.count ?? 0) + 1 });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary-line bg-primary-soft/30 p-4">
      <p className="text-sm font-semibold text-text-primary">Bước 1 — chọn quán gốc để gộp vào</p>
      {suggested.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...suggested.values()].map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              aria-pressed={selected?.id === candidate.id}
              onClick={() => onPick(candidate)}
              className={cn(
                "min-h-11 max-w-full rounded-xl border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected?.id === candidate.id ? "border-primary bg-surface" : "border-border bg-surface hover:border-primary-line",
              )}
            >
              <span className="block truncate font-semibold text-text-primary">{candidate.name}</span>
              <span className="block truncate text-xs text-text-secondary">
                {candidate.count} người báo trùng · {shortenAddress(candidate.address)}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex h-64 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <SearchListbox
          query={search.query}
          onQueryChange={search.setQuery}
          placeholder="Hoặc tìm quán gốc khác"
          inputLabel="Tìm quán gốc"
          autoFocus={false}
          sections={[{ id: "restaurants", options: search.items.filter((item) => item.id !== detail.targetId) }]}
          getOptionId={(item) => item.id}
          isSelected={(item) => item.id === selected?.id}
          onSelect={(item) => onPick({ id: item.id, name: item.name, address: item.address })}
          status={search.status}
          onRetry={search.retry}
          hasMore={search.hasMore}
          isLoadingMore={search.isLoadingMore}
          onLoadMore={search.loadMore}
          renderOption={(item) => (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">{item.name}</span>
              <span className="block truncate text-xs text-text-secondary">{shortenAddress(item.address)}</span>
            </span>
          )}
        />
      </div>
      {selected && (
        <p className="text-xs text-text-secondary">
          Sẽ gộp vào: <span className="font-semibold text-text-primary">{selected.name}</span>
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Huỷ
        </Button>
        <Button size="sm" disabled={!selected} isLoading={isSaving} leftIcon={<GitMerge className="size-4" aria-hidden />} onClick={onConfirm}>
          Bước 2 — xác nhận gộp
        </Button>
      </div>
    </div>
  );
}
