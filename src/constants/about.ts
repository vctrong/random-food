/**
 * Nội dung tĩnh trang "Về chúng tôi" (/ve-chung-toi). Tách khỏi component để sau này
 * chuyển sang lấy từ backend chỉ cần thay nguồn dữ liệu. Icon lưu dạng key chuỗi
 * (map sang lucide-react trong component) để dữ liệu thuần JSON.
 */

export interface AboutImage {
  src: string;
  alt: string;
  /** Chú thích ngắn hiển thị trên ảnh — mô tả đúng những gì có trong ảnh. */
  caption?: string;
  /** Ghi công tác giả khi ảnh có watermark/bản quyền. */
  credit?: string;
}

export const ABOUT_IMAGES = {
  bunCha: {
    src: "/image/about/bun-cha-ben-cua-so.jpg",
    alt: "Bàn bún chả với rau sống, nước chấm và chả nướng đặt bên khung cửa sổ nhìn ra phố",
    caption: "Một bữa trưa bên khung cửa sổ",
  },
  pho: {
    src: "/image/about/pho-vat-chanh.jpg",
    alt: "Bàn tay vắt chanh vào tô phở bò tái với hành lá và ớt",
    caption: "Vắt thêm chút chanh",
  },
  banhMi: {
    src: "/image/about/banh-mi-via-he.jpg",
    alt: "Ổ bánh mì thịt nướng kẹp rau thơm, ớt, cầm trên tay trước xe bánh mì ven đường",
    caption: "Bánh mì nóng giòn vỉa hè",
  },
  streetTable: {
    src: "/image/about/ban-nho-via-he.jpg",
    alt: "Chiếc bàn gỗ nhỏ trên vỉa hè với bánh gói lá, món trộn và ba ly nước, bên cạnh lá cờ Việt Nam",
    caption: "Ghế nhựa, bàn gỗ, vài món quen",
  },
  banhCanh: {
    src: "/image/about/banh-canh-chan-nuoc-dung.jpg",
    alt: "Chan nước dùng nóng vào tô bánh canh có tôm, chả cá và hành lá",
    caption: "Nước dùng vừa chan",
    credit: "Vu Pham",
  },
  collage: {
    src: "/image/about/am-thuc-viet-collage.jpg",
    alt: "Ảnh ghép nhiều món ăn Việt: bánh mì, gỏi cuốn, phở, bánh xèo và bánh lá",
  },
} satisfies Record<string, AboutImage>;

export type AboutIconKey = "zap" | "map-pin" | "heart-handshake" | "bookmark";

export interface AboutValue {
  icon: AboutIconKey;
  title: string;
  description: string;
  /** Tính năng thật tương ứng trên app. */
  feature: string;
  tone: "primary" | "accent";
}

export const ABOUT_VALUES: AboutValue[] = [
  {
    icon: "zap",
    title: "Nhanh gọn, dứt khoát",
    description: "Một cú chạm là có món, có quán, có địa chỉ. Không cần lướt app cả buổi trưa mới chọn xong.",
    feature: "Random món ăn",
    tone: "primary",
  },
  {
    icon: "map-pin",
    title: "Đậm chất Cần Thơ",
    description:
      "Danh sách quán tập trung ở Cần Thơ, từ quán nổi tiếng đến những hàng quen ít người biết, xem được ngay trên bản đồ.",
    feature: "Bản đồ quán ăn",
    tone: "accent",
  },
  {
    icon: "heart-handshake",
    title: "Cộng đồng cùng xây",
    description:
      "Ai cũng có thể giới thiệu món và quán mới. Mỗi đóng góp đều được đội ngũ kiểm duyệt xem xét để thông tin luôn đáng tin.",
    feature: "Đóng góp & kiểm duyệt",
    tone: "primary",
  },
  {
    icon: "bookmark",
    title: "Nhớ giùm bạn",
    description: "Lưu lại món hợp vị, xem lại những lần đã random để không bao giờ quên tên quán ngon.",
    feature: "Đã lưu & Lịch sử",
    tone: "accent",
  },
];

/** Key khớp với LandingStats (src/lib/landing.ts) — số liệu luôn lấy thật từ DB. */
export const ABOUT_STATS: { key: "foodCount" | "restaurantCount" | "randomCount90d"; label: string; suffix: string }[] = [
  { key: "foodCount", label: "Món ăn đã duyệt", suffix: "+" },
  { key: "restaurantCount", label: "Quán ăn ở Cần Thơ", suffix: "+" },
  { key: "randomCount90d", label: "Lượt random 90 ngày qua", suffix: "" },
];

export interface AboutTeamMember {
  name: string;
  role: string;
  image: string;
  tone: "primary" | "accent";
}

export const ABOUT_TEAM: AboutTeamMember[] = [
  { name: "Võ Chí Trọng", role: "Nhà sáng lập & Phát triển", image: "/image/team/vochitrong.jpg", tone: "primary" },
  { name: "Ngô Chúc Quỳnh", role: "Thiết kế trải nghiệm", image: "/image/team/ngochucquynh.jpg", tone: "accent" },
];

export const ABOUT_LETTER = {
  eyebrow: "Thư ngỏ",
  heading: "Lá thư nhỏ từ NayAnGi",
  greeting: "Gửi bạn — người đang đói bụng mà chưa biết ăn gì,",
  paragraphs: [
    "Chắc bạn cũng từng như tụi mình: đồng hồ vừa điểm giờ trưa, bụng bắt đầu réo, cả nhóm quay sang hỏi nhau “Nay ăn gì?”. Người bảo “gì cũng được”, người bảo “tùy bạn”. Nửa tiếng trôi qua, cả nhóm vẫn đứng đó, rồi cuối cùng lại ghé đúng quán quen, gọi đúng món cũ.",
    "Cần Thơ đâu có thiếu quán ngon. Từ gánh hàng đầu hẻm đến quán nhỏ ven đường, có biết bao hương vị mà chính người ở đây cũng chưa kịp thử. Thứ tụi mình thiếu chưa bao giờ là món ăn, mà là một cách chọn nhẹ nhàng hơn.",
  ],
  quote: "Bớt một chút phân vân, thêm một chút háo hức — vậy là bữa ăn đã ngon hơn rồi.",
  closingParagraphs: [
    "NayAnGi ra đời từ suy nghĩ giản dị đó. Một cú chạm để máy chọn giúp bạn một món, một quán, kèm địa chỉ để đi ngay. Món nào hợp vị thì lưu lại. Biết quán ngon nào chưa có trên app thì góp thêm, để người sau cũng được ăn ngon như mình.",
    "Tụi mình không mong NayAnGi quyết định thay bạn mọi thứ. Tụi mình chỉ mong mỗi lần mở app, câu hỏi “Nay ăn gì?” không còn là gánh nặng, mà trở thành một lần khám phá nho nhỏ giữa lòng Tây Đô.",
  ],
  signOff: "Thân gửi,",
  signature: "Trọng & Quỳnh",
  signatureNote: "Đội ngũ NayAnGi · Cần Thơ",
};

export type AboutContactIcon = "mail" | "phone" | "message" | "globe" | "share";

export const ABOUT_CONTACTS: { icon: AboutContactIcon; label: string; value: string; href: string }[] = [
  { icon: "mail", label: "Email", value: "trongvc.work913@gmail.com", href: "mailto:trongvc.work913@gmail.com" },
  { icon: "phone", label: "Điện thoại", value: "0336 922 235", href: "tel:0336922235" },
  { icon: "message", label: "Zalo", value: "0336 922 235", href: "https://zalo.me/0336922235" },
  { icon: "globe", label: "Website", value: "nayangi.io.vn", href: "https://nayangi.io.vn" },
  { icon: "share", label: "Facebook", value: "nayangi.social", href: "https://facebook.com/nayangi.social" },
];
