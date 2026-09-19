import { CookingPot, Dices, Home, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Cố tình KHÔNG fetch dữ liệu (không gợi ý món ăn kiểu "có thể bạn sẽ thích")
 * — not-found.tsx là fallback dùng chung cho MỌI route, nếu nó gọi dữ liệu
 * động thì Next.js buộc phải bỏ static optimization của cả những trang tĩnh
 * khác (/dang-nhap, /dang-ky, /ve-chung-toi) vì chúng đều có thể rơi vào
 * nhánh not-found này. Giữ trang này thuần tĩnh để không kéo theo chi phí đó.
 */
export default function NotFound() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-primary-blue text-sm font-semibold shadow-sm mb-6">
          <UtensilsCrossed className="size-4" aria-hidden />
          <span>Lỗi bàn ăn · 404</span>
        </div>

        <span className="font-heading font-extrabold leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-blue via-primary-blue to-primary-pink text-[96px] sm:text-[128px] select-none">
          404
        </span>

        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white shadow-inner flex items-center justify-center text-primary-blue -mt-4 mb-6">
          <CookingPot className="size-16" aria-hidden />
        </div>

        <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-2">
          Ối! Bàn ăn này đang trống
        </h1>
        <p className="text-text-secondary max-w-md mb-8">
          Có vẻ như liên kết bạn vừa bấm đã bị đổi món, xoá bỏ hoặc chưa từng tồn tại trên hệ thống của chúng tôi.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button href="/" leftIcon={<Home className="size-4" aria-hidden />}>
            Về trang chủ
          </Button>
          <Button href="/random" variant="outline" leftIcon={<Dices className="size-4" aria-hidden />}>
            Random món ngay
          </Button>
        </div>
      </div>
    </div>
  );
}
