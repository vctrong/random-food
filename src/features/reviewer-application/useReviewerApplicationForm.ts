"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { COMMITMENTS, REVIEWER_APPLICATION_DRAFT_KEY, REVIEWER_APPLICATION_LIMITS as LIMITS } from "@/constants/reviewerApplication";
import { getApplicationProgress, validateApplicationFields } from "@/features/reviewer-application/applicationLogic";
import { submitReviewerApplication } from "@/services/reviewerApplicationService";
import type { SocialPlatformId } from "@/constants/reviewerApplication";
import type { ReviewerApplicationFields } from "@/types/reviewerApplication";

export interface PortfolioDraft {
  file: File;
  previewUrl: string;
}

interface DraftData {
  fullName: string;
  motivation: string;
  expertiseCategoryIds: string[];
  activeAreas: string[];
  social: Record<SocialPlatformId, string>;
  scenarioAnswer: string;
}

const EMPTY_SOCIAL: Record<SocialPlatformId, string> = { tiktok: "", instagram: "" };

function readDraft(): Partial<DraftData> | null {
  try {
    const raw = window.localStorage.getItem(REVIEWER_APPLICATION_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<DraftData>) : null;
  } catch {
    return null;
  }
}

/**
 * State + validate + nháp cho form ứng tuyển. Nháp chỉ lưu ở trình duyệt (chữ,
 * không gồm ảnh và cam kết) — dữ liệu chưa hoàn chỉnh không đi vào DB.
 */
export function useReviewerApplicationForm({ defaultFullName, onSubmitted }: { defaultFullName: string; onSubmitted: () => void }) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [motivation, setMotivation] = useState("");
  const [expertiseCategoryIds, setExpertiseCategoryIds] = useState<string[]>([]);
  const [activeAreas, setActiveAreas] = useState<string[]>([]);
  const [social, setSocial] = useState<Record<SocialPlatformId, string>>(EMPTY_SOCIAL);
  const [portfolio, setPortfolio] = useState<PortfolioDraft[]>([]);
  const [scenarioAnswer, setScenarioAnswer] = useState("");
  const [acceptedCommitmentIds, setAcceptedCommitmentIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Khôi phục nháp sau khi mount (localStorage không có ở SSR nên không đọc trong initial state).
  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    /* eslint-disable react-hooks/set-state-in-effect -- đồng bộ từ nguồn ngoài (localStorage) chỉ có sau mount */
    if (draft.fullName) setFullName(draft.fullName);
    if (draft.motivation) setMotivation(draft.motivation);
    if (draft.expertiseCategoryIds) setExpertiseCategoryIds(draft.expertiseCategoryIds);
    if (draft.activeAreas) setActiveAreas(draft.activeAreas);
    if (draft.social) setSocial({ ...EMPTY_SOCIAL, ...draft.social });
    if (draft.scenarioAnswer) setScenarioAnswer(draft.scenarioAnswer);
    setHasDraft(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Giải phóng blob URL ảnh xem trước khi rời trang.
  const portfolioRef = useRef(portfolio);
  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);
  useEffect(() => () => portfolioRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), []);

  const fields: ReviewerApplicationFields = useMemo(
    () => ({
      fullName,
      motivation,
      expertiseCategoryIds,
      activeAreas,
      socialLinks: (Object.entries(social) as [SocialPlatformId, string][])
        .filter(([, url]) => url.trim())
        .map(([platform, url]) => ({ platform, url: url.trim() })),
      portfolioCount: portfolio.length,
      scenarioAnswer,
      acceptedCommitmentIds,
    }),
    [fullName, motivation, expertiseCategoryIds, activeAreas, social, portfolio.length, scenarioAnswer, acceptedCommitmentIds],
  );

  const errors = useMemo(() => validateApplicationFields(fields), [fields]);
  const progress = useMemo(() => getApplicationProgress(fields), [fields]);
  const isValid = Object.keys(errors).length === 0;

  function toggleExpertise(id: string) {
    setExpertiseCategoryIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return prev.length >= LIMITS.expertiseMax ? prev : [...prev, id];
    });
  }

  function addArea(value: string) {
    const area = value.trim().slice(0, LIMITS.areaMaxLength);
    if (!area) return;
    setActiveAreas((prev) => (prev.includes(area) || prev.length >= LIMITS.areasMax ? prev : [...prev, area]));
  }

  function removeArea(value: string) {
    setActiveAreas((prev) => prev.filter((item) => item !== value));
  }

  function toggleCommitment(id: string) {
    setAcceptedCommitmentIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function addPortfolioImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const valid = files.filter((file) => file.type.startsWith("image/") && file.size <= LIMITS.portfolioImageMaxBytes);
    setError(valid.length < files.length ? "Chỉ nhận tệp hình JPG/PNG dưới 5MB, một số tệp đã bị bỏ qua." : null);

    const room = Math.max(0, LIMITS.portfolioMax - portfolio.length);
    setPortfolio((prev) => [...prev, ...valid.slice(0, room).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  }

  function removePortfolioImage(index: number) {
    setPortfolio((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function saveDraft(): boolean {
    const draft: DraftData = { fullName, motivation, expertiseCategoryIds, activeAreas, social, scenarioAnswer };
    try {
      window.localStorage.setItem(REVIEWER_APPLICATION_DRAFT_KEY, JSON.stringify(draft));
      setHasDraft(true);
      return true;
    } catch {
      return false;
    }
  }

  async function submit(): Promise<{ ok: boolean; error?: string }> {
    if (!isValid || isSubmitting) return { ok: false };
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("fullName", fullName.trim());
    formData.append("motivation", motivation.trim());
    formData.append("scenarioAnswer", scenarioAnswer.trim());
    expertiseCategoryIds.forEach((id) => formData.append("expertiseCategoryIds", id));
    activeAreas.forEach((area) => formData.append("activeAreas", area));
    (Object.entries(social) as [SocialPlatformId, string][]).forEach(([platform, url]) => {
      if (url.trim()) formData.append(`social_${platform}`, url.trim());
    });
    portfolio.forEach((image) => formData.append("portfolio", image.file));
    COMMITMENTS.filter((commitment) => acceptedCommitmentIds.includes(commitment.id)).forEach((commitment) =>
      formData.append("acceptedCommitmentIds", commitment.id),
    );

    const result = await submitReviewerApplication(formData);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return { ok: false, error: result.error };
    }

    try {
      window.localStorage.removeItem(REVIEWER_APPLICATION_DRAFT_KEY);
    } catch {
      // bỏ qua: không xoá được nháp không ảnh hưởng đơn đã nộp.
    }
    onSubmitted();
    return { ok: true };
  }

  return {
    values: { fullName, motivation, expertiseCategoryIds, activeAreas, social, portfolio, scenarioAnswer, acceptedCommitmentIds },
    setFullName,
    setMotivation,
    setScenarioAnswer,
    setSocialUrl: (platform: SocialPlatformId, url: string) => setSocial((prev) => ({ ...prev, [platform]: url })),
    toggleExpertise,
    addArea,
    removeArea,
    toggleCommitment,
    addPortfolioImages,
    removePortfolioImage,
    errors,
    progress,
    isValid,
    isSubmitting,
    error,
    hasDraft,
    saveDraft,
    submit,
  };
}
