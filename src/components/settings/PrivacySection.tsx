import { FileText, ShieldAlert } from "lucide-react";

const PLACEHOLDER_LINKS = [
  { label: "Chính sách quyền riêng tư", icon: ShieldAlert },
  { label: "Điều khoản sử dụng", icon: FileText },
];

/** Chưa có trang chính sách/điều khoản thật — hiện placeholder rõ ràng "Sắp có" thay vì link chết. */
export function PrivacySection() {
  return (
    <section id="quyen-rieng-tu" className="bg-surface rounded-2xl p-6 shadow-sm space-y-4 scroll-mt-24">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <span className="inline-flex p-2 rounded-xl bg-soft-blue text-primary-blue">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Quyền riêng tư & điều khoản</h2>
          <p className="text-sm text-text-secondary">Chi tiết chính sách sẽ được cập nhật ở bản sau.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLACEHOLDER_LINKS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-soft-blue/30 text-text-secondary text-sm"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
            <span className="px-1.5 py-0.5 rounded-full bg-soft-blue/60 text-[10px] font-semibold">Sắp có</span>
          </span>
        ))}
      </div>
    </section>
  );
}
