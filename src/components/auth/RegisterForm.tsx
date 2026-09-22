"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Mail,
  PartyPopper,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/errorMessages";
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from "@/lib/password";
import { sanitizeCallbackUrl } from "@/lib/safe-redirect";
import { GoogleIcon } from "./GoogleIcon";

const TRUST_BADGES = [
  "Không quảng cáo phiền toái",
  "Đồng bộ đa thiết bị",
  "Tự do tạo danh sách quán",
];

/** Chấm điểm độ mạnh mật khẩu 0-4 dựa trên độ dài + đa dạng ký tự. Hàm thuần, chỉ dùng để hiển thị gợi ý UX. */
function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Chống open-redirect: callbackUrl đến từ query string do client kiểm soát được.
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"form" | "avatar">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      showToast(PASSWORD_POLICY_MESSAGE, "error");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setStep("avatar");
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function completeRegistration() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    if (avatarFile) formData.append("avatar", avatarFile);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        const message = getApiErrorMessage(response.status, data.error);
        setError(message);
        showToast(message, "error");
        setIsSubmitting(false);
        return;
      }

      // Vừa tạo tài khoản xong, coi như "ghi nhớ đăng nhập" để không bị buộc
      // đăng xuất sau 30 phút idle ngay sau khi vừa đăng ký.
      const result = await signIn("credentials", { email, password, remember: "true", redirect: false });

      setIsSubmitting(false);

      if (result?.error) {
        router.push(`/dang-nhap?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      showToast("Tạo tài khoản thành công! Chào mừng bạn.", "success");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      showToast(getNetworkErrorMessage(), "error");
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[460px]">
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-soft-pink blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 right-0 w-64 h-64 rounded-full bg-soft-blue blur-3xl pointer-events-none -z-10"
        />

        <div className="relative overflow-hidden bg-surface rounded-2xl shadow-xl p-6 sm:p-8">
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-pink via-primary-blue to-primary-blue"
          />

          {step === "form" ? (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-soft-pink text-primary-pink text-sm font-medium mb-4 shadow-sm">
                  <PartyPopper className="size-3.5" aria-hidden />
                  <span>Thành viên mới</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-1.5">
                  Tạo tài khoản mới
                </h1>
                <p className="text-sm text-text-secondary max-w-sm">
                  Lưu lại món ăn yêu thích và những lần random ẩm thực kỳ diệu của bạn.
                </p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleContinue}>
                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="fullname-field" className="text-sm font-medium text-text-primary">
                    Họ và tên
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                    <input
                      id="fullname-field"
                      name="fullname"
                      type="text"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nhập họ và tên"
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="register-email-field" className="text-sm font-medium text-text-primary">
                    Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                    <input
                      id="register-email-field"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Nhập email của bạn"
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="register-password-field" className="text-sm font-medium text-text-primary">
                    Mật khẩu
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                    <input
                      id="register-password-field"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Tối thiểu 8 ký tự, có chữ, số và ký tự đặc biệt"
                      className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                      className="absolute right-3.5 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-0.5">
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className={cn(
                              "rounded-full transition-all",
                              index < strength ? "bg-success" : "bg-border",
                            )}
                          />
                        ))}
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs font-medium",
                          isPasswordValid(password) ? "text-success" : "text-text-secondary",
                        )}
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {isPasswordValid(password) ? "Đạt yêu cầu mật khẩu" : PASSWORD_POLICY_MESSAGE}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label htmlFor="confirm-password-field" className="text-sm font-medium text-text-primary">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative flex items-center">
                    <ShieldCheck className="absolute left-3.5 size-4.5 text-text-secondary pointer-events-none" aria-hidden />
                    <input
                      id="confirm-password-field"
                      name="confirm_password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-secondary/70 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-blue/40 focus:border-primary-blue"
                    />
                    {passwordsMatch && (
                      <span className="absolute right-3.5" title="Mật khẩu trùng khớp">
                        <Check className="size-4.5 text-success" aria-hidden />
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  Bằng việc tạo tài khoản, bạn đồng ý với{" "}
                  <span className="font-medium text-primary-blue">Điều khoản sử dụng</span> và{" "}
                  <span className="font-medium text-primary-blue">Chính sách riêng tư</span> của Hôm Nay Ăn Gì?
                </p>

                {error && <p className="text-sm text-red-600 -mt-1">{error}</p>}

                <Button type="submit" size="lg" fullWidth rightIcon={<ArrowRight className="size-4.5" aria-hidden />}>
                  Tiếp tục
                </Button>
              </form>

              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-border" />
                </div>
                <span className="relative bg-surface px-4 text-xs text-text-secondary">hoặc đăng ký với</span>
              </div>

              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full h-12 px-4 rounded-xl border border-border bg-surface hover:bg-soft-blue text-text-primary text-sm font-semibold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.99]"
              >
                <GoogleIcon className="size-5" />
                <span>Tiếp tục với Google</span>
              </button>

              <div className="mt-6 pt-5 border-t border-border text-center">
                <p className="text-sm text-text-secondary">
                  Đã có tài khoản?{" "}
                  <Link href="/dang-nhap" className="font-semibold text-primary-pink hover:underline">
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-5 disabled:opacity-60"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Quay lại
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-soft-blue text-primary-blue text-sm font-medium mb-4 shadow-sm">
                  <ImagePlus className="size-3.5" aria-hidden />
                  <span>Bước cuối</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-1.5">
                  Thêm ảnh đại diện
                </h1>
                <p className="text-sm text-text-secondary max-w-sm">
                  Giúp mọi người dễ nhận ra bạn hơn. Bạn có thể bỏ qua và thêm sau trong hồ sơ.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative shrink-0">
                  <div className="size-28 rounded-full overflow-hidden bg-soft-blue flex items-center justify-center text-primary-blue text-3xl font-bold">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- blob preview cục bộ, next/image không hỗ trợ blob: URL
                      <img src={avatarPreview} alt="Xem trước ảnh đại diện" className="object-cover size-28" />
                    ) : (
                      (name || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Chọn ảnh đại diện"
                    className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary-blue text-white flex items-center justify-center shadow-md hover:bg-[#4a8ddb] transition-colors"
                  >
                    <Camera className="size-4.5" aria-hidden />
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      aria-label="Bỏ ảnh đã chọn"
                      className="absolute -top-1 -right-1 size-7 rounded-full bg-surface border border-border text-text-secondary flex items-center justify-center shadow-md hover:text-red-600 transition-colors"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="w-full flex flex-col gap-3 mt-2">
                  <Button
                    type="button"
                    size="lg"
                    fullWidth
                    isLoading={isSubmitting}
                    onClick={completeRegistration}
                    rightIcon={<ArrowRight className="size-4.5" aria-hidden />}
                  >
                    Hoàn tất đăng ký
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting}
                    onClick={completeRegistration}
                  >
                    Bỏ qua, để sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-text-secondary">
          {TRUST_BADGES.map((label) => (
            <span key={label} className="flex items-center gap-1.5 text-xs">
              <span className="size-4 rounded-full bg-success/15 text-success flex items-center justify-center">
                <Check className="size-2.5" aria-hidden />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
