import { Contrast, Monitor, Moon, Sun, Volume2 } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";

interface InterfaceSectionProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function InterfaceSection({ soundEnabled, onToggleSound }: InterfaceSectionProps) {
  return (
    <section id="giao-dien" className="bg-white rounded-2xl p-6 shadow-sm space-y-6 scroll-mt-24">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <span className="inline-flex p-2 rounded-xl bg-soft-pink text-primary-pink">
          <Contrast className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">3. Giao diện & Âm thanh</h2>
          <p className="text-sm text-text-secondary">Cá nhân hoá chế độ hiển thị và hiệu ứng tương tác.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="font-semibold text-text-primary">Chủ đề hiển thị</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-soft-blue text-primary-blue text-center text-sm font-semibold flex flex-col items-center gap-1">
              <Sun className="size-5" aria-hidden />
              <span>Sáng (Chuẩn)</span>
            </div>
            <div className="p-3 rounded-xl bg-soft-blue/30 text-text-secondary text-center text-sm transition-all flex flex-col items-center gap-1 opacity-60">
              <Moon className="size-5" aria-hidden />
              <span>Tối (Sắp có)</span>
            </div>
            <div className="p-3 rounded-xl bg-soft-blue/30 text-text-secondary text-center text-sm transition-all flex flex-col items-center gap-1 opacity-60">
              <Monitor className="size-5" aria-hidden />
              <span>Hệ thống (Sắp có)</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-text-primary">Ngôn ngữ ứng dụng</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-soft-blue text-primary-blue text-center text-sm font-semibold flex items-center justify-center gap-2">
              <span className="text-lg">🇻🇳</span>
              <span>Tiếng Việt</span>
            </div>
            <div className="p-3 rounded-xl bg-soft-blue/30 text-text-secondary text-center text-sm flex items-center justify-center gap-2 opacity-60">
              <span className="text-lg">🇬🇧</span>
              <span>English (Sắp có)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-soft-blue/30">
        <div className="space-y-0.5 pr-4">
          <div className="font-semibold text-text-primary flex items-center gap-2">
            <Volume2 className="size-4 text-primary-blue" aria-hidden />
            <span>Âm thanh khi có kết quả random</span>
          </div>
          <p className="text-sm text-text-secondary">
            Phát một tiếng &ldquo;tinh&rdquo; ngắn khi random ra kết quả mới.
          </p>
        </div>
        <Toggle checked={soundEnabled} onChange={onToggleSound} label="Âm thanh khi random" />
      </div>
    </section>
  );
}
