import { ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AboutPhoto } from "@/components/about/AboutPhoto";
import { ABOUT_IMAGES } from "@/constants/about";

export function OriginStory() {
  return (
    <section aria-labelledby="story-title" className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-6">
          <SectionHeading
            id="story-title"
            tone="pink"
            eyebrow="Câu chuyện"
            title="Từ một danh sách quán và một nút random"
          />
          <div className="mt-5 space-y-4 leading-relaxed text-text-secondary">
            <p>
              Mọi thứ bắt đầu từ một câu hỏi rất đời thường:{" "}
              <strong className="text-text-primary">&ldquo;Nay ăn gì?&rdquo;</strong> Tụi mình nhận ra vấn đề không
              phải là thiếu quán ngon mà là <strong className="text-text-primary">thiếu một cách để chọn</strong>.
            </p>
            <p>
              Ban đầu NayAnGi chỉ là một danh sách quán ăn và nút random. Rồi những người dùng đầu tiên bắt đầu hỏi:
              &ldquo;Quán này ở đâu?&rdquo;, &ldquo;Có quán nào gần mình không?&rdquo;, &ldquo;Mình biết quán này ngon
              mà chưa thấy trên app.&rdquo; Từ những câu hỏi ấy, NayAnGi lớn dần thành bản đồ quán ăn, nơi lưu lại món
              yêu thích và cộng đồng cùng nhau đóng góp.
            </p>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary-line bg-primary-soft p-4">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-text-secondary">
              <strong className="block text-text-primary">Thông tin luôn được kiểm duyệt</strong>
              Mỗi món, mỗi quán do cộng đồng góp đều được đội ngũ kiểm duyệt xem xét trước khi hiển thị.
            </p>
          </div>
        </Reveal>

        {/* Ảnh chính + ảnh phụ chồng góc; chừa pr/pb để ảnh phụ không tràn khỏi khung trên mobile. */}
        <Reveal delay={0.1} className="lg:col-span-6">
          <div className="relative pr-8 pb-10 sm:pr-14 lg:pr-10">
            <AboutPhoto
              image={ABOUT_IMAGES.streetTable}
              sizes="(min-width: 1152px) 480px, (min-width: 1024px) 45vw, 90vw"
              className="aspect-[4/5] w-full shadow-sm sm:aspect-square lg:aspect-[4/5]"
              captionClassName="pr-[44%] sm:pr-[40%]"
            />
            <AboutPhoto
              image={ABOUT_IMAGES.banhCanh}
              sizes="(min-width: 1024px) 240px, 45vw"
              className="absolute! right-0 bottom-0 aspect-[3/4] w-[44%] max-w-60 rotate-3 shadow-lg ring-4 ring-background"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
