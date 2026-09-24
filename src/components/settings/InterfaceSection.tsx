"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Contrast, Eye, Monitor, Moon, Sun, Volume2 } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils";

interface InterfaceSectionProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  reducedMotionEnabled: boolean;
  onToggleReducedMotion: () => void;
}

const THEME_OPTIONS = [
  { id: "light", label: "Sáng", icon: Sun },
  { id: "dark", label: "Tối", icon: Moon },
  { id: "system", label: "Theo hệ thống", icon: Monitor },
] as const;

export function InterfaceSection({
  soundEnabled,
  onToggleSound,
  reducedMotionEnabled,
  onToggleReducedMotion,
}: InterfaceSectionProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <section id="giao-dien" className="bg-surface rounded-2xl p-6 shadow-sm space-y-6 scroll-mt-24">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <span className="inline-flex p-2 rounded-xl bg-accent-soft text-accent-ink">
          <Contrast className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Giao diện & Âm thanh</h2>
          <p className="text-sm text-text-secondary">Cá nhân hoá chế độ hiển thị và hiệu ứng tương tác.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="font-semibold text-text-primary">Chủ đề hiển thị</label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = mounted && theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  aria-pressed={isActive}
                  className={cn(
                    "p-3 rounded-xl text-center text-sm transition-all flex flex-col items-center gap-1",
                    isActive
                      ? "bg-primary-soft text-primary font-semibold shadow-sm"
                      : "bg-primary-soft/30 text-text-secondary hover:bg-primary-soft/50",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-text-primary">Ngôn ngữ ứng dụng</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-primary-soft text-primary text-center text-sm font-semibold flex items-center justify-center gap-2">
              <span className="text-lg">🇻🇳</span>
              <span>Tiếng Việt</span>
            </div>
            <div className="p-3 rounded-xl bg-primary-soft/30 text-text-secondary text-center text-xs flex items-center justify-center gap-1.5 opacity-70">
              <span>🇬🇧 English</span>
              <span className="px-1.5 py-0.5 rounded-full bg-primary-soft/60 text-[10px] font-semibold">Sắp có</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-xl bg-primary-soft/30">
          <div className="space-y-0.5 pr-4">
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <Volume2 className="size-4 text-primary" aria-hidden />
              <span>Âm thanh khi có kết quả random</span>
            </div>
            <p className="text-sm text-text-secondary">
              Phát một tiếng &ldquo;tinh&rdquo; ngắn khi random ra kết quả mới.
            </p>
          </div>
          <Toggle checked={soundEnabled} onChange={onToggleSound} label="Âm thanh khi random" />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-primary-soft/30">
          <div className="space-y-0.5 pr-4">
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <Eye className="size-4 text-primary" aria-hidden />
              <span>Giảm chuyển động</span>
            </div>
            <p className="text-sm text-text-secondary">
              Tắt bớt hiệu ứng trượt/mờ dần trong app — hữu ích nếu chuyển động gây khó chịu, kể cả khi máy chưa bật sẵn ở hệ điều hành.
            </p>
          </div>
          <Toggle checked={reducedMotionEnabled} onChange={onToggleReducedMotion} label="Giảm chuyển động" />
        </div>
      </div>
    </section>
  );
}
