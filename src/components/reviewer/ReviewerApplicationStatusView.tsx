"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, MapPin, MessageSquareText, Undo2, XCircle } from "lucide-react";
import { withdrawReviewerApplication } from "@/services/reviewerApplicationService";
import { formatDate, formatDateTime, isAllowedImageHost } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import type { ReviewerApplicationAccess, ReviewerApplicationView } from "@/types/reviewerApplication";

interface ReviewerApplicationStatusViewProps {
  access: Extract<ReviewerApplicationAccess, { state: "pending" | "cooldown" }>;
  application: ReviewerApplicationView;
}

const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram / Threads" };

/** UC-U20: xem trạng thái đơn — đang chờ duyệt (có thể rút) hoặc bị từ chối và đang trong thời gian chờ nộp lại. */
export function ReviewerApplicationStatusView({ access, application }: ReviewerApplicationStatusViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  async function handleWithdraw() {
    setIsWithdrawing(true);
    const result = await withdrawReviewerApplication(application.id);
    setIsWithdrawing(false);

    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setIsConfirmOpen(false);
    showToast("Đã rút đơn ứng tuyển. Bạn có thể nộp đơn mới bất cứ lúc nào.", "success");
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4">
        {access.state === "pending" ? (
          <>
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold">
              <Clock className="size-3.5" aria-hidden />
              Đang chờ duyệt
            </span>
            <div>
              <h2 className="text-xl font-heading font-semibold text-text-primary">Đơn của bạn đã được gửi</h2>
              <p className="text-sm text-text-secondary mt-1">
                Nộp lúc {formatDateTime(application.createdAt)}. Admin sẽ xem xét hồ sơ và gửi kết quả qua thông báo.
              </p>
            </div>
            <div>
              <Button variant="outline" size="sm" leftIcon={<Undo2 className="size-4" aria-hidden />} onClick={() => setIsConfirmOpen(true)}>
                Rút đơn
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full bg-accent/15 text-accent-ink text-xs font-semibold">
              <XCircle className="size-3.5" aria-hidden />
              Đơn bị từ chối
            </span>
            <div>
              <h2 className="text-xl font-heading font-semibold text-text-primary">Đơn ứng tuyển chưa được duyệt</h2>
              <p className="text-sm text-text-secondary mt-1">
                Bạn có thể nộp đơn mới từ ngày <strong className="text-text-primary">{formatDate(access.until)}</strong>.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <MessageSquareText className="size-4" aria-hidden />
                Phản hồi từ Admin:
              </span>
              <p className="text-sm text-text-secondary leading-relaxed">{application.reviewNote ? `“${application.reviewNote}”` : "Không có ghi chú."}</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4">
        <h3 className="font-heading font-semibold text-text-primary">Hồ sơ đã nộp</h3>
        <SummaryRow label="Họ tên">{application.fullName || "—"}</SummaryRow>
        <SummaryRow label="Lý do ứng tuyển">
          <p className="whitespace-pre-line">{application.motivation || "—"}</p>
        </SummaryRow>
        <SummaryRow label="Khẩu vị sở trường">
          <div className="flex flex-wrap gap-1.5">
            {application.expertise.map((category) => (
              <span key={category.id} className="px-2.5 py-1 rounded-full bg-accent-soft text-accent-ink text-xs font-medium">
                {category.name}
              </span>
            ))}
          </div>
        </SummaryRow>
        <SummaryRow label="Khu vực xác minh">
          <div className="flex flex-wrap gap-1.5">
            {application.activeAreas.map((area) => (
              <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium">
                <MapPin className="size-3" aria-hidden />
                {area}
              </span>
            ))}
          </div>
        </SummaryRow>
        {application.socialLinks.length > 0 && (
          <SummaryRow label="Kênh review">
            <ul className="space-y-1">
              {application.socialLinks.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {PLATFORM_LABEL[link.platform] ?? link.platform}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </SummaryRow>
        )}
        <SummaryRow label={`Ảnh tiêu biểu (${application.portfolioImages.length})`}>
          <div className="flex flex-wrap gap-2">
            {application.portfolioImages.map((url) =>
              isAllowedImageHost(url) ? (
                <div key={url} className="relative size-20 rounded-xl overflow-hidden border border-border">
                  <Image src={url} alt="Ảnh tiêu biểu đã nộp" fill sizes="80px" className="object-cover" />
                </div>
              ) : null,
            )}
          </div>
        </SummaryRow>
        <SummaryRow label="Bài trả lời tình huống">
          <p className="whitespace-pre-line p-3 rounded-xl bg-background">{application.scenarioAnswer || "—"}</p>
        </SummaryRow>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => (isWithdrawing ? undefined : setIsConfirmOpen(false))} panelClassName="max-w-md p-6">
        <div className="flex flex-col gap-4">
          <div className="pr-8">
            <h3 className="text-lg font-heading font-semibold text-text-primary">Rút đơn ứng tuyển?</h3>
            <p className="text-sm text-text-secondary mt-1">
              Đơn sẽ bị huỷ và không được Admin xem xét nữa. Bạn có thể nộp đơn mới ngay sau đó.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)} disabled={isWithdrawing}>
              Giữ đơn
            </Button>
            <Button size="sm" onClick={handleWithdraw} isLoading={isWithdrawing}>
              Rút đơn
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">{label}</span>
      <div className="text-sm text-text-primary leading-relaxed">{children}</div>
    </div>
  );
}
