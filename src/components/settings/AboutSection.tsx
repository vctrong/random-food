import Image from "next/image";
import { Info } from "lucide-react";

interface AboutSectionProps {
  version: string;
  totalFoodsCount: number;
}

const STEPS = [
  {
    number: "1",
    title: "Chọn chế độ",
    description: "Chọn mức độ đói bụng hoặc random hoàn toàn ngẫu nhiên.",
  },
  {
    number: "2",
    title: "Nhận gợi ý ngay",
    description: "Thuật toán loại trừ món dị ứng và lọc theo mức giá bạn muốn.",
  },
  {
    number: "3",
    title: "Tận hưởng bữa ăn",
    description: "Lưu món yêu thích hoặc random lại nếu chưa vừa ý.",
  },
];

export function AboutSection({ version, totalFoodsCount }: AboutSectionProps) {
  return (
    <section id="ve-app" className="bg-white rounded-2xl p-6 shadow-sm space-y-8 scroll-mt-24">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex p-2 rounded-xl bg-soft-blue text-primary-blue">
            <Info className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">4. Về Hôm Nay Ăn Gì?</h2>
            <p className="text-sm text-text-secondary">
              Câu chuyện sứ mệnh giải phóng thời gian và tôn vinh ẩm thực Cần Thơ.
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-soft-blue/50 text-text-secondary">
          v{version} · Đang phát triển
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-soft-pink text-primary-pink text-xs font-semibold uppercase tracking-wider">
            Sứ mệnh người bạn đồng hành
          </div>
          <blockquote className="text-xl font-semibold text-text-primary leading-snug">
            &ldquo;Không còn cuộc tranh luận &lsquo;Ăn gì cũng được&rsquo; kéo dài hàng tiếng đồng hồ.&rdquo;
          </blockquote>
          <p className="text-text-secondary leading-relaxed">
            Hôm Nay Ăn Gì? ra đời để giải quyết câu hỏi muôn thuở của sinh viên và người trẻ đi
            làm tại Cần Thơ. Sản phẩm tập trung vào sự tối giản, quyết định nhanh và tôn vinh ẩm
            thực phong phú của thành phố — từ gánh hàng rong đến quán ăn gia đình quen thuộc.
          </p>
        </div>
        <div className="md:col-span-5 relative">
          <div className="relative mx-auto rounded-2xl overflow-hidden shadow-lg aspect-[4/3] bg-soft-blue">
            <Image
              src="https://picsum.photos/seed/homnayangi-can-tho/480/360"
              alt="Ảnh minh hoạ các món ăn đặc trưng Cần Thơ"
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <p className="font-semibold">Tôn vinh ẩm thực Cần Thơ</p>
              <p className="text-sm opacity-85">{totalFoodsCount} món ăn đa dạng đang có trong thực đơn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Cách thức hoạt động
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <div key={step.number} className="p-4 rounded-xl bg-soft-blue/30 space-y-2 relative overflow-hidden">
              <span className="text-5xl font-bold text-primary-blue/10 absolute right-2 -bottom-2 select-none">
                {step.number}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary-blue text-white flex items-center justify-center font-bold text-sm">
                {step.number}
              </div>
              <h4 className="font-semibold text-text-primary">{step.title}</h4>
              <p className="text-sm text-text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-2 text-text-secondary text-sm border-t border-border pt-4">
        <span>Frontend demo · Tự hào tạo ra tại Cần Thơ, Việt Nam ❤️</span>
      </div>
    </section>
  );
}
