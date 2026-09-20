import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Globe,
  HeartHandshake,
  History,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shuffle,
  Soup,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Shuffle,
    title: "Random món ăn",
    description: "Gợi ý ngẫu nhiên món và quán ăn phù hợp, thoát cảnh “gì cũng được”.",
  },
  {
    icon: MapPin,
    title: "Bản đồ quán ăn",
    description: "Xem quán ở đâu, gần bạn hay không và đi đường nào cho tiện.",
  },
  {
    icon: Bookmark,
    title: "Lưu quán yêu thích",
    description: "Món nào hợp vị thì lưu lại để lần sau ghé tiếp.",
  },
  {
    icon: History,
    title: "Lịch sử gợi ý",
    description: "Xem lại những món đã random, không lo quên tên quán ngon.",
  },
  {
    icon: HeartHandshake,
    title: "Cộng đồng đóng góp",
    description:
      "Ai cũng có thể giới thiệu món và quán mới. Mỗi đóng góp đều được đội ngũ kiểm duyệt xem xét để thông tin luôn đáng tin.",
  },
];

const TEAM = [
  {
    name: "Võ Chí Trọng",
    role: "Nhà sáng lập & Phát triển",
    image: "/image/team/vochitrong.jpg",
    accent: "bg-soft-blue text-primary-blue",
  },
  {
    name: "Ngô Chúc Quỳnh",
    role: "Thiết kế trải nghiệm",
    image: "/image/team/ngochucquynh.jpg",
    accent: "bg-soft-pink text-primary-pink",
  },
];

const CONTACTS: { icon: LucideIcon; label: string; value: string; href: string }[] = [
  { icon: Mail, label: "Email", value: "trongvc.work913@gmail.com", href: "mailto:trongvc.work913@gmail.com" },
  { icon: Phone, label: "Điện thoại", value: "0336 922 235", href: "tel:0336922235" },
  { icon: MessageCircle, label: "Zalo", value: "0336 922 235", href: "https://zalo.me/0336922235" },
  { icon: Globe, label: "Website", value: "nayangi.io.vn", href: "https://nayangi.io.vn" },
  { icon: Share2, label: "Facebook", value: "facebook.com/nayangi.social", href: "https://facebook.com/nayangi.social" },
];

export default function AboutPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-6">
      <header className="text-center mb-4">
        <div className="flex items-center justify-center gap-1.5 text-primary-blue text-xs font-bold uppercase tracking-wider mb-2">
          <Soup className="size-4" aria-hidden />
          <span>Về chúng tôi</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-3">
          &ldquo;Nay ăn gì?&rdquo;: câu hỏi khó nhất mỗi ngày
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Ai ở Cần Thơ cũng từng có lúc đói bụng mà đứng trước cả trăm lựa chọn, hỏi nhau nửa tiếng
          vẫn chưa quyết được ăn gì. <strong className="text-text-primary">NayAnGi</strong> ra đời để
          giải quyết đúng nỗi khổ nhỏ mà ai cũng gặp đó.
        </p>
        <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed mt-3">
          Chỉ cần một cú chạm, NayAnGi chọn giúp bạn một món ngon từ danh sách quán ăn ở Cần Thơ.
          Bạn không cần suy nghĩ, không cần cãi nhau, chỉ cần đi ăn.
        </p>
      </header>

      <Card className="p-6 md:p-8">
        <h2 className="font-heading font-semibold text-xl text-text-primary mb-3">Câu chuyện của chúng tôi</h2>
        <div className="space-y-3 text-text-secondary leading-relaxed">
          <p>
            Mọi thứ bắt đầu từ một câu hỏi rất đời thường:{" "}
            <strong className="text-text-primary">&ldquo;Nay ăn gì?&rdquo;</strong>
          </p>
          <p>
            Hỏi bạn bè thì nhận về &ldquo;gì cũng được&rdquo;. Hỏi lại thì &ldquo;tùy bạn&rdquo;. Cuối
            cùng cả nhóm đứng giữa đường, bụng đói cồn cào, mất nửa tiếng chỉ để quyết định. Rồi ăn lại
            đúng quán quen, đúng món cũ, dù Cần Thơ còn biết bao quán ngon chưa kịp ghé.
          </p>
          <p>
            Chúng tôi nhận ra vấn đề không phải là thiếu quán ngon mà là{" "}
            <strong className="text-text-primary">thiếu một cách để chọn</strong>. Vậy nên chúng tôi làm
            một thứ thật đơn giản: một cú chạm, một món ăn, một quán để đi ngay.
          </p>
          <p>
            Ban đầu NayAnGi chỉ là một danh sách quán ăn và nút random. Sau đó, những người dùng đầu tiên
            bắt đầu hỏi: &ldquo;Quán này ở đâu?&rdquo;, &ldquo;Có quán nào gần mình không?&rdquo;,
            &ldquo;Mình biết quán này ngon mà chưa thấy trên app.&rdquo; Từ những câu hỏi ấy, NayAnGi lớn
            dần thành bản đồ quán ăn, nơi lưu lại món yêu thích, và cộng đồng cùng nhau đóng góp, kiểm
            duyệt để thông tin luôn đáng tin.
          </p>
          <p>
            Đến hôm nay, NayAnGi vẫn giữ tinh thần ban đầu:{" "}
            <strong className="text-text-primary">giúp bạn bớt nghĩ, để có thêm thời gian ăn ngon.</strong>{" "}
            Chúng tôi muốn mỗi bữa ăn ở Cần Thơ đều là một lần khám phá nhỏ, và mỗi người dùng đều góp một
            phần vào tấm bản đồ ẩm thực của thành phố này.
          </p>
        </div>
      </Card>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="font-heading font-semibold text-xl text-text-primary mb-4">
          Chúng tôi làm gì
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className={index === FEATURES.length - 1 ? "sm:col-span-2" : undefined}>
              <Card className="p-5 h-full flex gap-4">
                <span className="shrink-0 inline-flex size-10 items-center justify-center rounded-xl bg-soft-blue text-primary-blue">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-heading font-semibold text-text-primary mb-1">{title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-soft-blue/50">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-xl text-text-primary mb-2">
            <Target className="size-5 text-primary-blue" aria-hidden />
            Sứ mệnh
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Biến việc chọn món ăn thành một niềm vui nhỏ mỗi ngày, đồng thời giới thiệu ẩm thực Cần Thơ,
            từ quán nổi tiếng đến những hàng quen ít người biết, đến nhiều người hơn.
          </p>
        </Card>
        <Card className="p-6 bg-soft-pink/60">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-xl text-text-primary mb-2">
            <MapPin className="size-5 text-primary-pink" aria-hidden />
            Vì sao là Cần Thơ?
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Cần Thơ có vô số món ngon và quán ngon mà đôi khi chính người địa phương cũng chưa ăn hết.
            NayAnGi muốn làm chiếc &ldquo;bản đồ vị giác&rdquo; cho thành phố, được xây dựng cùng những
            người yêu ăn uống nơi đây.
          </p>
        </Card>
      </div>

      <Card className="p-6 md:p-8">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-xl text-text-primary mb-5">
          <Users className="size-5 text-primary-blue" aria-hidden />
          Đội ngũ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {TEAM.map((member) => (
            <div key={member.name} className="flex flex-col items-center text-center gap-3">
              <div className="relative size-40 sm:size-48 overflow-hidden rounded-2xl border border-border">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="(min-width: 640px) 192px, 160px"
                  className="object-cover object-top"
                />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-text-primary">{member.name}</h3>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${member.accent}`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 md:p-8 text-center bg-soft-blue/50">
        <h2 className="font-heading font-semibold text-xl text-text-primary mb-2">Cùng xây dựng NayAnGi</h2>
        <p className="text-text-secondary max-w-xl mx-auto leading-relaxed mb-4">
          Bạn biết một quán ngon chưa có trên app? Hãy chia sẻ với chúng tôi. Càng nhiều người đóng góp,
          mỗi lần &ldquo;nay ăn gì?&rdquo; của cả cộng đồng càng thêm nhiều lựa chọn.
        </p>
        <Link
          href="/dong-gop"
          className="inline-flex items-center justify-center rounded-xl bg-primary-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-blue"
        >
          Đóng góp quán ăn
        </Link>
      </Card>

      <Card className="p-6 md:p-8">
        <h2 className="font-heading font-semibold text-xl text-text-primary mb-2">Liên hệ</h2>
        <p className="text-text-secondary leading-relaxed mb-5">
          Bạn có góp ý, muốn giới thiệu quán ăn hay hợp tác cùng NayAnGi? Hãy liên hệ với chúng tôi qua
          các kênh dưới đây:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTACTS.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-soft-blue/50"
              >
                <span className="shrink-0 inline-flex size-9 items-center justify-center rounded-lg bg-soft-blue text-primary-blue">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-text-secondary">{label}</span>
                  <span className="block text-sm font-medium text-text-primary truncate">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
