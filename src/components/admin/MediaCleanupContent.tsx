"use client";

/* eslint-disable @next/next/no-img-element -- thumbnail Cloudinary đã transform sẵn (c_fill) */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FolderOpen,
  HardDrive,
  ImageOff,
  Maximize2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";
import { Lightbox } from "@/components/ui/Lightbox";
import { useToast } from "@/components/ui/ToastProvider";
import { listCleanupRuns, listOrphanImages, runCleanupBatch } from "@/services/mediaCleanupService";
import { cloudinaryThumb } from "@/lib/media/cloudinaryUrl";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { CleanupRunRow, OrphanImage } from "@/types/media";

const BATCH_SIZE = 100;
const PAGE_STEP = 60;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const TRIGGER_LABELS: Record<CleanupRunRow["trigger"], string> = {
  manual: "Admin",
  cron: "Tự động",
  script: "Script dòng lệnh",
};

const STATUS_STYLES: Record<CleanupRunRow["status"], { label: string; className: string }> = {
  completed: { label: "Hoàn tất", className: "bg-success/15 text-text-primary" },
  partial: { label: "Dang dở / có lỗi", className: "bg-warning/25 text-secondary-strong dark:text-warning" },
  running: { label: "Đang chạy", className: "bg-primary-soft text-primary-strong dark:text-primary" },
};

interface Progress {
  total: number;
  deleted: number;
  retagged: number;
  failed: number;
  bytesFreed: number;
  processed: number;
}

type ConfirmTarget = { mode: "selected"; count: number; bytes: number } | { mode: "all"; count: number; bytes: number };

export function MediaCleanupContent({ initialRuns }: { initialRuns: CleanupRunRow[] }) {
  const { showToast } = useToast();
  const [images, setImages] = useState<OrphanImage[] | null>(null);
  const [days, setDays] = useState(3);
  const [truncated, setTruncated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runs, setRuns] = useState(initialRuns);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [preview, setPreview] = useState<OrphanImage | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const [orphans, history] = await Promise.all([listOrphanImages(), listCleanupRuns()]);
    if (orphans.ok) {
      setImages(orphans.data.images);
      setDays(orphans.data.days);
      setTruncated(orphans.data.truncated);
      setSelected((prev) => new Set([...prev].filter((id) => orphans.data.images.some((image) => image.publicId === id))));
    } else {
      setLoadError(orphans.message);
      setImages((prev) => prev ?? []);
    }
    if (history.ok) setRuns(history.data);
  }, []);

  useEffect(() => {
    // Đồng bộ dữ liệu từ API bên ngoài (Cloudinary) khi mở trang.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const folders = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const image of images ?? []) {
      const entry = map.get(image.folder) ?? { count: 0, bytes: 0 };
      entry.count += 1;
      entry.bytes += image.bytes;
      map.set(image.folder, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  }, [images]);

  const totalBytes = (images ?? []).reduce((sum, image) => sum + image.bytes, 0);
  const filtered = (images ?? []).filter((image) => !folderFilter || image.folder === folderFilter);
  const selectedImages = (images ?? []).filter((image) => selected.has(image.publicId));
  const selectedBytes = selectedImages.reduce((sum, image) => sum + image.bytes, 0);
  const isAllFilteredSelected = filtered.length > 0 && filtered.every((image) => selected.has(image.publicId));

  function toggle(publicId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) filtered.forEach((image) => next.delete(image.publicId));
      else filtered.forEach((image) => next.add(image.publicId));
      return next;
    });
  }

  async function execute(target: ConfirmTarget) {
    setConfirm(null);
    setIsRunning(true);
    const state: Progress = { total: target.count, deleted: 0, retagged: 0, failed: 0, bytesFreed: 0, processed: 0 };
    setProgress({ ...state });
    let runId: string | null = null;
    let errorMessage: string | null = null;

    const apply = (outcome: { deleted: number; retagged: number; failed: number; bytesFreed: number }) => {
      state.deleted += outcome.deleted;
      state.retagged += outcome.retagged;
      state.failed += outcome.failed;
      state.bytesFreed += outcome.bytesFreed;
      state.processed = Math.min(state.total, state.deleted + state.retagged + state.failed);
      setProgress({ ...state });
    };

    if (target.mode === "selected") {
      const ids = selectedImages.map((image) => image.publicId);
      for (let index = 0; index < ids.length; index += BATCH_SIZE) {
        const result = await runCleanupBatch({ runId, publicIds: ids.slice(index, index + BATCH_SIZE) });
        if (!result.ok) {
          errorMessage = result.message;
          break;
        }
        runId = result.data.runId;
        apply(result.data);
      }
    } else {
      // Server tự dừng mỗi lượt trước hạn chót; gọi tiếp tới khi hết ảnh rác hoặc không còn tiến triển.
      for (let round = 0; round < 50; round += 1) {
        const result = await runCleanupBatch({ runId, all: true });
        if (!result.ok) {
          errorMessage = result.message;
          break;
        }
        runId = result.data.runId;
        apply(result.data);
        const progressed = result.data.deleted + result.data.retagged + result.data.failed > 0;
        if (result.data.remaining === 0 || !progressed) break;
      }
    }

    setIsRunning(false);
    setSelected(new Set());
    if (errorMessage) showToast(errorMessage, "error");
    else if (state.failed > 0) showToast(`Đã xoá ${state.deleted} ảnh, ${state.failed} ảnh lỗi — xem lịch sử bên dưới.`, "warning");
    else showToast(`Đã dọn ${state.deleted} ảnh, giải phóng ${formatBytes(state.bytesFreed)}.`, "success");
    await load();
  }

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading text-text-primary">Dọn ảnh rác</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Ảnh trên Cloudinary không còn gắn với nội dung nào (tag <code className="rounded bg-background px-1">unattached</code>) quá {days} ngày.
            Trước khi xoá, hệ thống kiểm tra lại DB — ảnh còn được dùng chỉ được gỡ tag. Tự động dọn lúc ~3:00 sáng mỗi ngày.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={isRunning} leftIcon={<RefreshCw className="size-4" />}>
          Làm mới
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={ImageOff} label="Ảnh rác" value={images ? String(images.length) : "…"} tone="pink" />
        <SummaryCard icon={HardDrive} label="Tổng dung lượng" value={images ? formatBytes(totalBytes) : "…"} />
        <SummaryCard icon={FolderOpen} label="Thư mục có ảnh rác" value={images ? String(folders.length) : "…"} />
      </div>

      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo thư mục">
          <FolderChip label="Tất cả" detail={`${images?.length ?? 0} ảnh`} isActive={!folderFilter} onClick={() => setFolderFilter(null)} />
          {folders.map(([name, entry]) => (
            <FolderChip
              key={name}
              label={name}
              detail={`${entry.count} ảnh · ${formatBytes(entry.bytes)}`}
              isActive={folderFilter === name}
              onClick={() => setFolderFilter(folderFilter === name ? null : name)}
            />
          ))}
        </div>
      )}

      {progress && (
        <Card className="space-y-3 p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {isRunning ? <RefreshCw className="size-4 animate-spin text-primary" aria-hidden /> : <CheckCircle2 className="size-4 text-success" aria-hidden />}
              {isRunning ? "Đang dọn ảnh…" : "Kết quả lần dọn vừa rồi"}
            </p>
            <p className="text-sm text-text-secondary tabular-nums">
              {progress.processed}/{progress.total} ảnh
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress.total ? Math.round((progress.processed / progress.total) * 100) : 100}%` }}
            />
          </div>
          <p className="text-sm text-text-secondary">
            Đã xoá <strong className="text-text-primary">{progress.deleted}</strong> ({formatBytes(progress.bytesFreed)}) · còn dùng → gỡ tag{" "}
            <strong className="text-text-primary">{progress.retagged}</strong> · lỗi{" "}
            <strong className={progress.failed ? "text-accent-ink" : "text-text-primary"}>{progress.failed}</strong>
          </p>
        </Card>
      )}

      <section aria-labelledby="orphan-list" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={toggleAllFiltered}
              disabled={filtered.length === 0 || isRunning}
              className="size-4 rounded accent-[var(--color-primary-strong)]"
            />
            <span id="orphan-list">
              Chọn tất cả{folderFilter ? ` trong “${folderFilter}”` : ""} · đã chọn{" "}
              <strong className="tabular-nums">{selected.size}</strong> ảnh ({formatBytes(selectedBytes)})
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || isRunning}
              onClick={() => setConfirm({ mode: "selected", count: selectedImages.length, bytes: selectedBytes })}
              leftIcon={<Trash2 className="size-4" />}
            >
              Dọn ảnh đã chọn
            </Button>
            <Button
              size="sm"
              disabled={!images || images.length === 0 || isRunning}
              onClick={() => setConfirm({ mode: "all", count: images?.length ?? 0, bytes: totalBytes })}
              leftIcon={<Sparkles className="size-4" />}
            >
              Dọn tất cả
            </Button>
          </div>
        </div>

        {loadError && <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-accent-ink">{loadError}</p>}
        {truncated && (
          <p className="rounded-xl bg-warning/15 px-4 py-2.5 text-sm text-secondary-strong dark:text-warning">
            Có quá nhiều ảnh — mới hiện phần đầu. Dọn xong bấm “Làm mới” để xem tiếp.
          </p>
        )}

        {images === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-border bg-background" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Không có ảnh rác" description={`Không có ảnh nào bị bỏ quá ${days} ngày. Cloudinary đang gọn gàng.`} />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((image) => {
                const isSelected = selected.has(image.publicId);
                return (
                  <li key={image.publicId}>
                    <div
                      className={cn(
                        "group overflow-hidden rounded-2xl border bg-surface transition-[border-color,box-shadow]",
                        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary-line",
                      )}
                    >
                      <div className="relative aspect-square bg-background">
                        <img src={cloudinaryThumb(image.url, 320)} alt="" loading="lazy" className="size-full object-cover" />
                        <label className="absolute inset-0 cursor-pointer" aria-label={`Chọn ảnh ${image.publicId}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(image.publicId)}
                            disabled={isRunning}
                            className="absolute left-2.5 top-2.5 size-5 rounded accent-[var(--color-primary-strong)]"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPreview(image)}
                          aria-label="Xem ảnh lớn"
                          className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-surface/90 text-text-secondary opacity-0 shadow-sm transition-opacity hover:text-text-primary focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Maximize2 className="size-4" aria-hidden />
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold text-text-primary shadow-sm">
                          {image.folder}
                        </span>
                      </div>
                      <div className="space-y-0.5 px-3 py-2.5 text-xs text-text-secondary">
                        <p className="flex justify-between gap-2">
                          <span>{formatBytes(image.bytes)}</span>
                          <span className="uppercase">{image.format}</span>
                        </p>
                        <p>Tải lên {formatDate(image.uploadedAt)}</p>
                        {image.referenceAt !== image.uploadedAt && <p>Bị gỡ {formatDate(image.referenceAt)}</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {filtered.length > visibleCount && (
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => count + PAGE_STEP)}>
                  Xem thêm {Math.min(PAGE_STEP, filtered.length - visibleCount)} ảnh
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="cleanup-history" className="space-y-3">
        <h2 id="cleanup-history" className="flex items-center gap-2 text-h4 text-text-primary">
          <Clock className="size-4.5 text-primary" aria-hidden />
          Lịch sử dọn ảnh
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-text-secondary">Chưa có lần dọn nào.</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-background text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Người chạy</th>
                  <th className="px-4 py-3 font-semibold">Phạm vi</th>
                  <th className="px-4 py-3 text-right font-semibold">Đã xoá</th>
                  <th className="px-4 py-3 text-right font-semibold">Dung lượng</th>
                  <th className="px-4 py-3 text-right font-semibold">Gỡ tag</th>
                  <th className="px-4 py-3 text-right font-semibold">Lỗi</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id} className="align-top">
                    <td className="px-4 py-3 text-text-primary">{formatDateTime(run.startedAt)}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {run.trigger === "manual" ? (run.actorName ?? "Admin") : TRIGGER_LABELS[run.trigger]}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {run.mode === "selected" ? "Ảnh đã chọn" : "Tất cả"} · {run.folder ?? "mọi thư mục"} · &gt; {run.days} ngày
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">{run.deletedCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">{formatBytes(run.bytesFreed)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{run.retaggedCount}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums", run.failedCount ? "text-accent-ink" : "text-text-secondary")}>
                      {run.failedCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[run.status].className)}>
                        {STATUS_STYLES[run.status].label}
                      </span>
                      {run.errorSamples.length > 0 && (
                        <details className="mt-1.5 text-xs text-text-secondary">
                          <summary className="cursor-pointer">Xem lỗi</summary>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {run.errorSamples.map((line) => (
                              <li key={line} className="break-all">{line}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <ConfirmDangerModal
        isOpen={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) void execute(confirm);
        }}
        title={confirm?.mode === "all" ? "Dọn tất cả ảnh rác?" : "Dọn ảnh đã chọn?"}
        description={
          confirm
            ? `Xoá vĩnh viễn ${confirm.count} ảnh khỏi Cloudinary, giải phóng khoảng ${formatBytes(confirm.bytes)}. Không khôi phục được — ảnh nào vẫn đang được dùng sẽ chỉ được gỡ tag, không bị xoá.`
            : ""
        }
        confirmLabel={confirm ? `Xoá ${confirm.count} ảnh` : "Xoá"}
      />

      {preview && <Lightbox items={[{ src: preview.url, alt: preview.publicId }]} startIndex={0} onClose={() => setPreview(null)} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "blue" }: { icon: typeof ImageOff; label: string; value: string; tone?: "blue" | "pink" }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl",
          tone === "blue" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent-ink",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-text-secondary">{label}</p>
        <p className="text-2xl font-heading font-semibold tracking-tight text-text-primary tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

function FolderChip({ label, detail, isActive, onClick }: { label: string; detail: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive ? "border-primary-strong bg-primary-strong text-white" : "border-border bg-surface text-text-primary hover:border-primary-line",
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className={cn("ml-1.5 text-xs", isActive ? "text-white/85" : "text-text-secondary")}>{detail}</span>
    </button>
  );
}
