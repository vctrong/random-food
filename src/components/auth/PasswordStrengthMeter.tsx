import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PASSWORD_STRENGTH_LABELS,
  getPasswordChecks,
  getPasswordStrength,
} from "@/features/password-reset/passwordResetLogic";

/** Thanh độ mạnh (4 vạch, cùng kiểu RegisterForm) + checklist điều kiện tick realtime. */
export function PasswordStrengthMeter({ password, id }: { password: string; id?: string }) {
  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);

  return (
    <div id={id} className="flex flex-col gap-2.5 mt-1">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5 h-1.5">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn("rounded-full transition-colors duration-300", index < strength ? "bg-success" : "bg-border")}
            />
          ))}
        </div>
        <span className="w-20 text-right text-xs font-medium text-text-secondary" aria-live="polite">
          {password ? PASSWORD_STRENGTH_LABELS[strength] : ""}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Điều kiện mật khẩu">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center gap-1.5 text-xs">
            {check.passed ? (
              <Check className="size-3.5 shrink-0 text-success" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0 text-border" aria-hidden />
            )}
            <span className={check.passed ? "text-text-primary" : "text-text-secondary"}>
              {check.label}
              <span className="sr-only">{check.passed ? " — đã đạt" : " — chưa đạt"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
