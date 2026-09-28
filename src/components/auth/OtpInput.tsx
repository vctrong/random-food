"use client";

import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  describedBy?: string;
  onChange?: (value: string) => void;
  /** Gọi 1 lần khi đủ `length` chữ số (gõ, dán, hoặc autofill từ SMS/email). */
  onComplete: (value: string) => void;
}

/**
 * N ô nhập OTP riêng biệt: tự nhảy ô khi gõ, Backspace lùi ô, mũi tên trái/phải,
 * dán cả mã vào ô bất kỳ, và nhận autofill "one-time-code" (trình duyệt đổ cả mã
 * vào ô đầu). Muốn xoá trắng thì đổi `key` của component từ bên ngoài.
 */
export function OtpInput({ length, disabled, invalid, autoFocus, describedBy, onChange, onComplete }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length }, () => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus && !disabled) inputs.current[0]?.focus();
  }, [autoFocus, disabled]);

  function commit(next: string[], focusIndex: number) {
    setDigits(next);
    const value = next.join("");
    onChange?.(value);
    inputs.current[Math.max(0, Math.min(length - 1, focusIndex))]?.focus();
    if (next.every(Boolean)) onComplete(value);
  }

  /** Ghi 1 chuỗi chữ số bắt đầu từ ô `start` (dùng chung cho gõ nhiều ký tự / dán / autofill). */
  function fillFrom(start: number, raw: string) {
    const incoming = raw.replace(/\D/g, "").slice(0, length);
    if (!incoming) return;
    // Dán/autofill đủ cả mã → luôn ghi từ ô đầu, bất kể con trỏ đang ở đâu.
    const from = incoming.length === length ? 0 : start;
    const next = [...digits];
    for (let offset = 0; offset < incoming.length && from + offset < length; offset += 1) {
      next[from + offset] = incoming[offset];
    }
    commit(next, from + incoming.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        commit(next, index);
      } else if (index > 0) {
        next[index - 1] = "";
        commit(next, index - 1);
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  }

  return (
    <div role="group" aria-label={`Mã xác thực gồm ${length} chữ số`} className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Chữ số thứ ${index + 1}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const raw = event.target.value;
            // Bàn phím ảo Android có thể xoá mà không phát keydown "Backspace".
            if (!raw) {
              const next = [...digits];
              next[index] = "";
              commit(next, index);
              return;
            }
            // Ô đã có số mà gõ thêm (con trỏ không bôi đen) → giữ chữ số mới.
            fillFrom(index, digit && raw.length === 2 ? raw.replace(digit, "") || digit : raw);
          }}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          className={cn(
            "size-12 sm:size-14 rounded-xl border bg-surface text-center text-xl sm:text-2xl font-bold text-text-primary tabular-nums shadow-sm transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60",
            digit ? "border-primary-line" : "border-border",
            invalid && "border-accent-strong focus:ring-accent/40",
          )}
        />
      ))}
    </div>
  );
}
