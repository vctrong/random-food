"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Circle, ImagePlus, Lock, MessageSquareWarning, Save, X } from "lucide-react";
import {
  APPLICATION_CRITERIA,
  COMMITMENTS,
  REVIEWER_APPLICATION_LIMITS as LIMITS,
  SOCIAL_PLATFORMS,
  VERIFICATION_SCENARIO,
} from "@/constants/reviewerApplication";
import { countWords } from "@/features/reviewer-application/applicationLogic";
import { useReviewerApplicationForm } from "@/features/reviewer-application/useReviewerApplicationForm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { TagInput } from "@/components/settings/TagInput";
import type { ApplicationSectionId } from "@/features/reviewer-application/applicationLogic";
import type { ReviewerApplicationView } from "@/types/reviewerApplication";

interface ReviewerApplicationFormViewProps {
  categories: { id: string; name: string }[];
  defaultFullName: string;
  /** Đơn trước đó (bị từ chối/đã rút) — chỉ dùng để nhắc lại góp ý của Admin. */
  previousApplication: ReviewerApplicationView | null;
}

const INPUT_CLASS =
  "w-full h-11 px-4 rounded-xl border border-border bg-white text-text-primary shadow-sm placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue";

const SECTIONS: { id: ApplicationSectionId; label: string }[] = [
  { id: "profile", label: "Hồ sơ cá nhân" },
  { id: "channels", label: "Kênh & portfolio" },
  { id: "scenario", label: "Tình huống xác minh" },
  { id: "commitments", label: "Cam kết đạo đức" },
];

export function ReviewerApplicationFormView({ categories, defaultFullName, previousApplication }: ReviewerApplicationFormViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useReviewerApplicationForm({
    defaultFullName,
    onSubmitted: () => {
      showToast("Đã gửi đơn ứng tuyển! Admin sẽ xem xét và thông báo kết quả cho bạn.", "success");
      router.refresh();
    },
  });
  const { values, errors, progress } = form;
  const scenarioWords = countWords(values.scenarioAnswer);
  const scenarioInRange = scenarioWords >= LIMITS.scenarioMinWords && scenarioWords <= LIMITS.scenarioMaxWords;
  const completedCount = SECTIONS.filter((section) => progress[section.id]).length;

  function handleSaveDraft() {
    showToast(form.saveDraft() ? "Đã lưu bản nháp trên trình duyệt này." : "Không thể lưu nháp trên trình duyệt này.", form.hasDraft ? "success" : "info");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 flex flex-col gap-6">
        {previousApplication?.status === "rejected" && (
          <div className="p-4 rounded-2xl bg-warning/15 flex items-start gap-3">
            <MessageSquareWarning className="size-5 shrink-0 mt-0.5 text-[#8a690b]" aria-hidden />
            <div className="text-sm text-text-secondary leading-relaxed">
              <p className="font-semibold text-text-primary">Đơn trước của bạn đã bị từ chối.</p>
              {previousApplication.reviewNote && <p>“{previousApplication.reviewNote}”</p>}
              <p>Bạn có thể nộp đơn mới sau khi cải thiện hồ sơ.</p>
            </div>
          </div>
        )}

        {/* Tiến độ 4 phần — tính từ mức hoàn thành thật của form */}
        <nav aria-label="Tiến độ hồ sơ" className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-5">
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SECTIONS.map((section, index) => {
              const done = progress[section.id];
              return (
                <li key={section.id}>
                  <a href={`#section-${section.id}`} className="flex items-center gap-2.5 group">
                    <span
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                        done ? "bg-primary-blue text-white" : "bg-cream text-text-secondary border border-border",
                      )}
                    >
                      {done ? <Check className="size-4" aria-hidden /> : index + 1}
                    </span>
                    <span className={cn("text-xs sm:text-sm font-medium leading-tight", done ? "text-text-primary" : "text-text-secondary")}>
                      {section.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* 1. Hồ sơ */}
        <section id="section-profile" className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4 scroll-mt-24">
          <SectionHeader index={1} title="Hồ sơ người thẩm định" description="Thông tin xác thực danh tính và khu vực bạn có thể xác minh thực địa." required />

          <Field label="Họ và tên thật" htmlFor="ra-fullname" error={errors.fullName} showError={values.fullName.length > 0}>
            <input id="ra-fullname" value={values.fullName} onChange={(event) => form.setFullName(event.target.value)} className={INPUT_CLASS} />
          </Field>

          <Field
            label="Vì sao bạn muốn trở thành FoodReviewer?"
            htmlFor="ra-motivation"
            error={errors.motivation}
            showError={values.motivation.length > 0}
            hint={`${values.motivation.trim().length} / ${LIMITS.motivationMax} ký tự (tối thiểu ${LIMITS.motivationMin})`}
          >
            <textarea
              id="ra-motivation"
              value={values.motivation}
              onChange={(event) => form.setMotivation(event.target.value)}
              rows={3}
              maxLength={LIMITS.motivationMax}
              placeholder="Bạn quen thuộc khu vực nào, vì sao muốn góp phần giữ thông tin món ăn chính xác..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary shadow-sm placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue resize-none"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">
              Khẩu vị sở trường{" "}
              <span className="text-text-secondary font-normal">
                (chọn {LIMITS.expertiseMin}–{LIMITS.expertiseMax} danh mục bạn am hiểu nhất)
              </span>
            </span>
            {categories.length === 0 ? (
              <p className="text-sm text-text-secondary">Hệ thống chưa có danh mục nào.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = values.expertiseCategoryIds.includes(category.id);
                  const locked = !active && values.expertiseCategoryIds.length >= LIMITS.expertiseMax;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      disabled={locked}
                      aria-pressed={active}
                      onClick={() => form.toggleExpertise(category.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none",
                        active ? "bg-primary-blue border-primary-blue text-white shadow-sm" : "bg-white border-border text-text-secondary hover:text-text-primary",
                      )}
                    >
                      {active && <Check className="size-3.5" aria-hidden />}
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text-primary">
              Khu vực có thể xác minh thực địa{" "}
              <span className="text-text-secondary font-normal">(tối đa {LIMITS.areasMax}, nhấn Enter để thêm)</span>
            </span>
            <TagInput tags={values.activeAreas} onAdd={form.addArea} onRemove={form.removeArea} placeholder="Vd: Ninh Kiều" tone="blue" />
          </div>
        </section>

        {/* 2. Kênh & portfolio */}
        <section id="section-channels" className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4 scroll-mt-24">
          <SectionHeader
            index={2}
            title="Kênh sáng tạo & portfolio"
            description="Chất lượng thông tin quan trọng hơn số người theo dõi. Liên kết kênh là tuỳ chọn."
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOCIAL_PLATFORMS.map((platform) => (
              <Field key={platform.id} label={platform.label} htmlFor={`ra-social-${platform.id}`}>
                <input
                  id={`ra-social-${platform.id}`}
                  value={values.social[platform.id]}
                  onChange={(event) => form.setSocialUrl(platform.id, event.target.value)}
                  placeholder={platform.placeholder}
                  className={INPUT_CLASS}
                />
              </Field>
            ))}
          </div>
          {errors.socialLinks && <p className="text-xs text-red-600 -mt-2">{errors.socialLinks}</p>}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">
              Ảnh hoặc bài review tiêu biểu{" "}
              <span className="text-text-secondary font-normal">
                ({values.portfolio.length}/{LIMITS.portfolioMax} — tối thiểu {LIMITS.portfolioMin} ảnh, JPG/PNG dưới 5MB)
              </span>
            </span>
            <div className="flex flex-wrap gap-3">
              {values.portfolio.map((image, index) => (
                <div key={image.previewUrl} className="relative size-24 rounded-xl overflow-hidden border border-border shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob preview cục bộ, next/image không hỗ trợ blob: URL */}
                  <img src={image.previewUrl} alt={`Ảnh tiêu biểu ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => form.removePortfolioImage(index)}
                    aria-label={`Xoá ảnh ${index + 1}`}
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              ))}
              {values.portfolio.length < LIMITS.portfolioMax && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="size-24 rounded-xl border-2 border-dashed border-border text-text-secondary hover:text-primary-blue hover:border-primary-blue flex flex-col items-center justify-center gap-1 transition-colors shrink-0"
                >
                  <ImagePlus className="size-5" aria-hidden />
                  <span className="text-xs font-medium">Thêm ảnh</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={form.addPortfolioImages} />
            </div>
          </div>
        </section>

        {/* 3. Tình huống */}
        <section id="section-scenario" className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4 scroll-mt-24">
          <SectionHeader index={3} title="Tình huống xác minh" description="Cho Admin thấy cách bạn đối chiếu thông tin thực tế và giữ sự trung thực." required />

          <div className="p-4 rounded-xl bg-cream text-sm text-text-primary leading-relaxed">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-blue mb-1.5">Tình huống</p>
            {VERIFICATION_SCENARIO}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="ra-scenario" className="text-sm font-medium text-text-primary">
                Bài trả lời của bạn ({LIMITS.scenarioMinWords}–{LIMITS.scenarioMaxWords} từ)
              </label>
              <span className={cn("text-xs font-bold", scenarioInRange ? "text-primary-blue" : "text-text-secondary")}>
                {scenarioWords} / {LIMITS.scenarioMaxWords} từ
              </span>
            </div>
            <textarea
              id="ra-scenario"
              value={values.scenarioAnswer}
              onChange={(event) => form.setScenarioAnswer(event.target.value)}
              rows={9}
              placeholder="Bạn sẽ xác minh như thế nào, đối chiếu những gì, và phản hồi ra sao..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary shadow-sm placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue resize-y leading-relaxed"
            />
            {scenarioWords > LIMITS.scenarioMaxWords && <p className="text-xs text-red-600">Bài trả lời vượt quá {LIMITS.scenarioMaxWords} từ.</p>}
          </div>
        </section>

        {/* 4. Cam kết */}
        <section id="section-commitments" className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6 flex flex-col gap-4 scroll-mt-24">
          <SectionHeader index={4} title="Cam kết đạo đức" description="Chuẩn mực bắt buộc đối với mọi FoodReviewer." required />
          <div className="flex flex-col gap-3">
            {COMMITMENTS.map((commitment) => (
              <label key={commitment.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-cream hover:bg-soft-blue/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={values.acceptedCommitmentIds.includes(commitment.id)}
                  onChange={() => form.toggleCommitment(commitment.id)}
                  className="size-5 mt-0.5 rounded accent-primary-blue cursor-pointer"
                />
                <span className="text-sm text-text-primary leading-snug">
                  <strong className="font-semibold">{commitment.title}:</strong> {commitment.text}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-text-secondary">Thời điểm bạn nộp đơn sẽ được ghi lại làm xác nhận đồng ý các cam kết trên.</p>
        </section>

        {form.error && <p className="text-sm text-red-600">{form.error}</p>}

        {/* Nút nộp cho mobile (trên desktop nằm ở sidebar) */}
        <div className="lg:hidden">
          <Button onClick={form.submit} isLoading={form.isSubmitting} disabled={!form.isValid} size="lg" fullWidth rightIcon={<ArrowRight className="size-4" aria-hidden />}>
            Nộp đơn ứng tuyển
          </Button>
        </div>
      </div>

      <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="bg-white rounded-2xl border border-border shadow-md p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Trạng thái hồ sơ</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                form.isValid ? "bg-success/15 text-success" : "bg-soft-blue text-primary-blue",
              )}
            >
              {form.isValid ? "Sẵn sàng nộp" : `${completedCount}/${SECTIONS.length} phần`}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {SECTIONS.map((section) => (
              <li key={section.id} className="flex items-center gap-2 text-sm">
                {progress[section.id] ? (
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                ) : (
                  <Circle className="size-4 text-text-secondary/50" aria-hidden />
                )}
                <span className={progress[section.id] ? "text-text-primary" : "text-text-secondary"}>{section.label}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2.5">
            <Button onClick={form.submit} isLoading={form.isSubmitting} disabled={!form.isValid} fullWidth rightIcon={<ArrowRight className="size-4" aria-hidden />} className="hidden lg:inline-flex">
              Nộp đơn ứng tuyển
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} fullWidth size="sm" leftIcon={<Save className="size-4" aria-hidden />}>
              Lưu bản nháp
            </Button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-text-secondary">
            <Lock className="size-3.5" aria-hidden />
            Thông tin chỉ dùng để xét duyệt đơn
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-3">
          <h3 className="font-heading font-semibold text-text-primary">Tiêu chí ưu tiên</h3>
          <ul className="flex flex-col gap-2.5">
            {APPLICATION_CRITERIA.map((criterion) => (
              <li key={criterion} className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                <CheckCircle2 className="size-4 shrink-0 text-primary-blue" aria-hidden />
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function SectionHeader({ index, title, description, required }: { index: number; title: string; description: string; required?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="size-8 rounded-lg bg-soft-blue text-primary-blue font-bold flex items-center justify-center shrink-0">{index}</span>
        <div>
          <h2 className="font-heading font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      {required && <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-soft-blue text-primary-blue text-xs font-semibold shrink-0">Bắt buộc</span>}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  showError,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  showError?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
      {error && showError ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}
