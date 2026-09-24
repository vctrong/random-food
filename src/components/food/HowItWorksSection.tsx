import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Chọn gu thèm ăn",
    description: "Chọn mức độ đói và tầm giá mong muốn — hoặc để trống, số phận lo hết.",
    badgeClassName: "bg-primary-strong text-white",
  },
  {
    title: "Gạt cần random",
    description: "Nhấn “Quay ngay”, nhấn Space hoặc kéo cần gạt — máy tự chốt món trong vài giây.",
    badgeClassName: "bg-accent text-secondary-strong",
  },
  {
    title: "Đi ăn & lưu món ngon",
    description: "Bấm “Chỉ đường” để mở Google Maps tới quán, hoặc lưu món để dành cho lần sau.",
    badgeClassName: "bg-warning text-secondary-strong",
  },
];

export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-title" className="border-y border-border bg-accent-soft/60 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <SectionHeading
          id="how-title"
          align="center"
          tone="pink"
          eyebrow="Đơn giản vậy thôi"
          title="Chỉ 3 bước để có ngay bữa ăn ưng ý"
          description="Không cần tranh luận, không cần lướt app giao hàng cả buổi."
        />

        <ol className="relative mt-10 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-3 md:gap-8 md:pt-7">
          {/* Đường nối: dọc trên mobile (qua tâm các số), ngang trên desktop (qua tâm các badge). */}
          <span
            aria-hidden
            className="absolute left-7 top-6 bottom-6 border-l-2 border-dashed border-secondary/20 md:hidden"
          />
          <span
            aria-hidden
            className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-secondary/20 md:block"
          />

          {STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 0.1}
              className="relative flex items-start gap-4 md:h-full md:flex-col md:items-center md:rounded-2xl md:border md:border-border md:bg-surface md:px-6 md:pb-7 md:text-center md:shadow-sm"
            >
              <span
                className={cn(
                  "relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-secondary font-heading text-lg font-bold shadow-chunky-sm md:-mt-7",
                  step.badgeClassName,
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="pt-1 md:pt-0">
                <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
