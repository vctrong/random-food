"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ConfirmDangerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading?: boolean;
  /** Nếu có: bắt gõ lại đúng chuỗi này (vd email) mới bấm xác nhận được — dùng cho hành động không thể hoàn tác. */
  requireTypedConfirmation?: string;
}

/** Modal xác nhận dùng chung cho MỌI hành động nguy hiểm (thay window.confirm cũ). */
export function ConfirmDangerModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isLoading = false,
  requireTypedConfirmation,
}: ConfirmDangerModalProps) {
  const [typedValue, setTypedValue] = useState("");
  const isConfirmDisabled = Boolean(requireTypedConfirmation) && typedValue !== requireTypedConfirmation;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="max-w-sm p-6 flex flex-col items-center text-center"
    >
      <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary mb-5">{description}</p>

      {requireTypedConfirmation && (
        <div className="w-full text-left mb-5">
          <label htmlFor="confirm-typed" className="text-xs text-text-secondary mb-1 block">
            Gõ lại <strong className="text-text-primary">{requireTypedConfirmation}</strong> để xác nhận
          </label>
          <input
            id="confirm-typed"
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            className="w-full h-11 px-4 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
            autoComplete="off"
          />
        </div>
      )}

      <div className="flex flex-col w-full gap-2">
        <Button
          variant="primary"
          className="!bg-red-600 hover:!bg-red-700 disabled:!opacity-50"
          onClick={onConfirm}
          isLoading={isLoading}
          disabled={isConfirmDisabled}
        >
          {confirmLabel}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-full text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
        >
          Huỷ, giữ nguyên
        </button>
      </div>
    </Modal>
  );
}
