import { BookOpen, Database, Lightbulb, Palette, UtensilsCrossed } from "lucide-react";

const NAV_ITEMS = [
  { href: "#so-thich", label: "Sở thích ăn uống", icon: UtensilsCrossed },
  { href: "#du-lieu", label: "Quản lý dữ liệu", icon: Database },
  { href: "#giao-dien", label: "Giao diện & Âm thanh", icon: Palette },
  { href: "#ve-app", label: "Về Hôm Nay Ăn Gì?", icon: BookOpen },
];

export function SettingsNav() {
  return (
    <aside className="lg:col-span-3 lg:sticky lg:top-24 self-start">
      <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
        <div className="px-2 py-1 text-xs text-text-secondary uppercase tracking-wider font-semibold">
          Mục điều hướng
        </div>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-soft-blue/40 transition-all"
          >
            <item.icon className="size-5" aria-hidden />
            <span>{item.label}</span>
          </a>
        ))}

        <div className="mt-4 p-4 rounded-xl bg-soft-blue/40 relative overflow-hidden">
          <Lightbulb className="size-6 text-primary-blue mb-1" aria-hidden />
          <h4 className="font-semibold text-text-primary mb-1">Bạn có biết?</h4>
          <p className="text-sm text-text-secondary">
            Món trong danh sách dị ứng sẽ tự động bị loại khi bạn random (khi tính năng lọc được
            nối vào thuật toán).
          </p>
        </div>
      </div>
    </aside>
  );
}
