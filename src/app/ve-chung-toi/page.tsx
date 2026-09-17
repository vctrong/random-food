import { Info, Soup, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const PLACEHOLDER_TEAM = [
  { role: "Người sáng lập & Phát triển sản phẩm" },
  { role: "Phụ trách nội dung ẩm thực" },
  { role: "Thiết kế trải nghiệm" },
];

export default function AboutPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <div className="flex justify-center mb-4">
        <Badge variant="warning">
          <Info className="size-3" aria-hidden />
          Nội dung minh hoạ tạm thời — sẽ được Ttong cập nhật lại
        </Badge>
      </div>

      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-1.5 text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
          <Soup className="size-4" aria-hidden />
          <span>Về chúng tôi</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-3">
          Hôm Nay Ăn Gì?
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Một web app nhỏ giúp sinh viên và người trẻ ở Cần Thơ bớt băn khoăn mỗi bữa ăn —
          chỉ cần một cú chạm để random ra món ngon phù hợp với túi tiền và tâm trạng hôm nay.
        </p>
      </div>

      <Card className="p-6 md:p-8 mb-6">
        <h2 className="font-heading font-semibold text-xl text-text-primary mb-2">Câu chuyện của chúng tôi</h2>
        <p className="text-text-secondary leading-relaxed">
          Ý tưởng bắt đầu từ một câu hỏi quen thuộc mỗi ngày: &ldquo;Hôm nay ăn gì?&rdquo;. Thay vì loay hoay
          lướt hàng chục hội nhóm ẩm thực, chúng tôi muốn tạo ra một công cụ gọn nhẹ, nhanh chóng
          và đáng tin cậy, giúp việc chọn món trở nên dễ dàng hơn cho sinh viên và người trẻ tại Cần Thơ.
        </p>
      </Card>

      <Card className="p-6 md:p-8">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-xl text-text-primary mb-4">
          <Users className="size-5 text-primary-blue" aria-hidden />
          Đội ngũ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLACEHOLDER_TEAM.map((member) => (
            <div key={member.role} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-soft-blue/50">
              <div className="w-14 h-14 rounded-full bg-soft-blue flex items-center justify-center text-primary-blue">
                <Users className="size-6" aria-hidden />
              </div>
              <p className="text-sm text-text-secondary">{member.role}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
