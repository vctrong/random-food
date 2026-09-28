"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthStepIndicator } from "@/components/auth/AuthStepIndicator";
import { ForgotPasswordEmailStep } from "@/components/auth/ForgotPasswordEmailStep";
import { ForgotPasswordNewPasswordStep } from "@/components/auth/ForgotPasswordNewPasswordStep";
import { ForgotPasswordOtpStep } from "@/components/auth/ForgotPasswordOtpStep";
import { ForgotPasswordLocked, ForgotPasswordSuccess } from "@/components/auth/ForgotPasswordResult";
import { Spinner } from "@/components/ui/Spinner";
import { usePasswordResetFlow, type FlowStep } from "@/features/password-reset/usePasswordResetFlow";

const STEP_LABELS = ["Email", "Xác thực", "Mật khẩu mới"] as const;
const STEP_INDEX: Record<FlowStep, number> = { email: 0, otp: 1, password: 2, success: 3 };

export function ForgotPasswordFlow() {
  const flow = usePasswordResetFlow();
  const view = flow.locked ? "locked" : flow.step;
  const index = flow.step ? STEP_INDEX[flow.step] : 0;
  // Hướng trượt theo chiều tiến/lùi của bước (Back của trình duyệt trượt ngược lại).
  const [previousIndex, setPreviousIndex] = useState(index);
  const [direction, setDirection] = useState(1);
  if (index !== previousIndex) {
    setDirection(index > previousIndex ? 1 : -1);
    setPreviousIndex(index);
  }

  return (
    <AuthCard>
      {view !== "locked" && view !== null && <AuthStepIndicator steps={STEP_LABELS} current={index} />}

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={view ?? "loading"}
          custom={direction}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {view === null && (
            <div className="flex min-h-64 items-center justify-center">
              <Spinner />
            </div>
          )}

          {view === "email" && (
            <ForgotPasswordEmailStep
              initialEmail={flow.email}
              isSubmitting={flow.pending === "request"}
              serverError={flow.emailError}
              serverErrorCode={flow.emailErrorCode}
              onClearError={flow.clearEmailError}
              onSubmit={(email) => void flow.submitEmail(email)}
            />
          )}

          {view === "otp" && flow.otpState && (
            <ForgotPasswordOtpStep
              otpState={flow.otpState}
              inputKey={flow.otpInputKey}
              isVerifying={flow.pending === "verify"}
              isResending={flow.pending === "resend"}
              error={flow.otpError}
              onVerify={(code) => void flow.verifyOtp(code)}
              onResend={() => void flow.resendOtp()}
              onChangeEmail={flow.changeEmail}
            />
          )}

          {view === "password" && flow.resetSession && (
            <ForgotPasswordNewPasswordStep
              maskedEmail={flow.resetSession.maskedEmail}
              sessionExpiresAt={flow.resetSession.expiresAt}
              isSubmitting={flow.pending === "reset"}
              serverError={flow.passwordError}
              onClearError={() => flow.setPasswordError(null)}
              onSubmit={(password, confirm) => void flow.submitPassword(password, confirm)}
              onRestart={flow.restart}
            />
          )}

          {view === "success" && <ForgotPasswordSuccess />}

          {view === "locked" && flow.locked && (
            <ForgotPasswordLocked
              maskedEmail={flow.locked.maskedEmail}
              cooldownUntil={flow.unlockCooldownUntil}
              isResending={flow.pending === "unlock"}
              onResend={() => void flow.resendUnlock()}
              onUseAnotherEmail={flow.dismissLocked}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </AuthCard>
  );
}
