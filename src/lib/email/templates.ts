import { BRAND, CONTACTS } from "@/constants/brand";
import { SITE_URL } from "@/config/env";
import { describeUserAgent, formatVietnamDateTime } from "@/features/password-reset/passwordResetLogic";
import type { EmailMessage } from "@/lib/email/mailer";

/**
 * Template email giao dịch — bố cục theo example/mail (pill thương hiệu, card
 * 600px, huy hiệu, khối nội dung, hộp lưu ý, lời chào, footer liên hệ) nhưng
 * dùng đúng token màu của CLAUDE.md 4.3 (email không đọc được CSS variable nên
 * ghi hex trực tiếp tại đây). Table-based + inline CSS để hiển thị ổn trên
 * Gmail/Outlook/mobile. Luôn escape dữ liệu người dùng (tên, IP, UA).
 */
const COLOR = {
  canvas: "#EAF3FD", // primary-soft
  surface: "#FFFFFF",
  primaryStrong: "#2F6FB8",
  primaryLine: "#C4DCF7",
  accentStrong: "#B8488F",
  accentSoft: "#FDF1F9",
  text: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
} as const;

const FONT_STACK = "'Quicksand', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type Tone = "primary" | "accent";

const TONE: Record<Tone, { badgeBg: string; badgeText: string }> = {
  primary: { badgeBg: COLOR.canvas, badgeText: COLOR.primaryStrong },
  accent: { badgeBg: COLOR.accentSoft, badgeText: COLOR.accentStrong },
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

function paragraph(html: string, options: { muted?: boolean; align?: "center" | "left" } = {}): string {
  return `<p style="margin:0 0 14px;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${options.muted ? COLOR.textSecondary : COLOR.text};text-align:${options.align ?? "center"};">${html}</p>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 4px;">
  <tr><td align="center" bgcolor="${COLOR.primaryStrong}" style="border-radius:999px;">
    <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT_STACK};font-size:15px;font-weight:700;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(label)} &rarr;</a>
  </td></tr>
</table>`;
}

function noticeBox(title: string, bodyHtml: string, tone: "accent" | "primary" = "accent"): string {
  const bg = tone === "accent" ? COLOR.accentSoft : COLOR.canvas;
  const titleColor = tone === "accent" ? COLOR.accentStrong : COLOR.primaryStrong;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px;">
  <tr><td style="background:${bg};border-radius:16px;padding:16px 18px;">
    <p style="margin:0 0 6px;font-family:${FONT_STACK};font-size:14px;font-weight:700;line-height:20px;color:${titleColor};">${escapeHtml(title)}</p>
    <p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${COLOR.text};">${bodyHtml}</p>
  </td></tr>
</table>`;
}

function detailRows(rows: Array<[string, string | null]>): string {
  const visible = rows.filter((row): row is [string, string] => Boolean(row[1]));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;border:1px solid ${COLOR.border};border-radius:14px;">
  ${visible
    .map(
      ([label, value], index) => `<tr>
    <td style="padding:11px 16px;${index > 0 ? `border-top:1px solid ${COLOR.border};` : ""}font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLOR.textSecondary};width:42%;">${escapeHtml(label)}</td>
    <td style="padding:11px 16px;${index > 0 ? `border-top:1px solid ${COLOR.border};` : ""}font-family:${FONT_STACK};font-size:14px;font-weight:600;line-height:20px;color:${COLOR.text};">${escapeHtml(value)}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

function otpBlock(otp: string): string {
  const cells = otp
    .split("")
    .map(
      (digit) =>
        `<td align="center" style="padding:0 3px;"><div style="width:38px;height:50px;line-height:50px;background:#FFFFFF;border:1px solid ${COLOR.primaryLine};border-radius:12px;font-family:${FONT_STACK};font-size:24px;font-weight:700;color:${COLOR.primaryStrong};text-align:center;">${digit}</div></td>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 10px;">
  <tr><td align="center" style="background:${COLOR.canvas};border-radius:16px;padding:18px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>${cells}</tr></table>
  </td></tr>
</table>
<p style="margin:0 0 16px;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:${COLOR.textSecondary};text-align:center;">Mã để sao chép: <strong style="color:${COLOR.primaryStrong};letter-spacing:2px;">${otp}</strong></p>`;
}

interface LayoutInput {
  preheader: string;
  badge: string;
  tone: Tone;
  title: string;
  name: string;
  contentHtml: string;
}

function renderLayout({ preheader, badge, tone, title, name, contentHtml }: LayoutInput): string {
  const year = new Date().getFullYear();
  const mascotUrl = `${SITE_URL}${BRAND.mascot}`;
  const toneStyle = TONE[tone];
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${COLOR.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${COLOR.canvas};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.canvas};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td align="center" style="padding:0 0 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ${COLOR.primaryLine};border-radius:999px;">
        <tr>
          <td style="padding:6px 6px 6px 8px;"><img src="${mascotUrl}" width="30" height="30" alt="" style="display:block;border:0;border-radius:999px;"></td>
          <td style="padding:6px 8px 6px 2px;font-family:${FONT_STACK};font-size:16px;font-weight:700;color:${COLOR.text};">Nay<span style="color:${COLOR.primaryStrong};">AnGi</span></td>
          <td style="padding:6px 12px 6px 0;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${COLOR.accentSoft};font-family:${FONT_STACK};font-size:12px;font-weight:600;color:${COLOR.accentStrong};">Cần Thơ</span></td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-radius:20px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="background:${COLOR.canvas};padding:22px 24px 18px;border-radius:20px 20px 0 0;">
          <img src="${mascotUrl}" width="84" height="84" alt="Linh vật NayAnGi" style="display:block;border:0;">
        </td></tr>
        <tr><td style="padding:28px 28px 8px;" align="center">
          <span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${toneStyle.badgeBg};font-family:${FONT_STACK};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${toneStyle.badgeText};">${escapeHtml(badge)}</span>
          <h1 style="margin:14px 0 6px;font-family:${FONT_STACK};font-size:22px;font-weight:700;line-height:30px;color:${COLOR.text};">${escapeHtml(title)}</h1>
          <p style="margin:0 0 14px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:24px;color:${COLOR.text};">Chào ${escapeHtml(name)},</p>
        </td></tr>
        <tr><td style="padding:0 28px 8px;">${contentHtml}</td></tr>
        <tr><td align="center" style="padding:18px 28px 30px;">
          <p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:14px;font-style:italic;line-height:22px;color:${COLOR.textSecondary};">"Chúc bạn luôn tìm được món ngon ưng ý mỗi ngày!"</p>
          <p style="margin:0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${COLOR.text};">Thân mến,<br><span style="color:${COLOR.primaryStrong};font-weight:600;">Đội ngũ NayAnGi Cần Thơ</span></p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:22px 16px 8px;font-family:${FONT_STACK};font-size:13px;line-height:22px;color:${COLOR.textSecondary};">
      <a href="${CONTACTS.website}" style="color:${COLOR.primaryStrong};text-decoration:none;">${CONTACTS.websiteDisplay}</a> &nbsp;•&nbsp;
      <a href="mailto:${CONTACTS.email}" style="color:${COLOR.primaryStrong};text-decoration:none;">${CONTACTS.email}</a><br>
      <a href="tel:${CONTACTS.phone}" style="color:${COLOR.primaryStrong};text-decoration:none;">${CONTACTS.phoneDisplay}</a> &nbsp;•&nbsp;
      <a href="${CONTACTS.facebook}" style="color:${COLOR.primaryStrong};text-decoration:none;">facebook.com/nayangi.social</a>
      <p style="margin:12px 0 4px;font-family:${FONT_STACK};font-size:12px;line-height:19px;color:${COLOR.textSecondary};">Email này được gửi tự động từ hệ thống NayAnGi Cần Thơ, vui lòng không trả lời trực tiếp email này.</p>
      <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:19px;color:${COLOR.textSecondary};">© ${year} NayAnGi — Nền tảng gợi ý ẩm thực Tây Đô.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function textFooter(): string {
  return `\n—\nThân mến,\nĐội ngũ NayAnGi Cần Thơ\n${CONTACTS.websiteDisplay} · ${CONTACTS.email} · ${CONTACTS.phoneDisplay}\nEmail này được gửi tự động, vui lòng không trả lời.`;
}

export function buildPasswordResetOtpEmail(input: {
  to: string;
  name: string;
  otp: string;
  expiresAt: Date;
  ttlMinutes: number;
}): EmailMessage {
  const { to, name, otp, expiresAt, ttlMinutes } = input;
  const expiresText = formatVietnamDateTime(expiresAt);
  const html = renderLayout({
    preheader: `Mã đặt lại mật khẩu NayAnGi của bạn là ${otp}. Không chia sẻ mã này với bất kỳ ai.`,
    badge: "Yêu cầu bảo mật",
    tone: "primary",
    title: "Đặt lại mật khẩu của bạn",
    name,
    contentHtml: [
      paragraph("Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NayAnGi. Hãy nhập mã xác thực gồm 6 chữ số dưới đây:"),
      otpBlock(otp),
      paragraph(`⏱ Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong> (hết hạn lúc ${escapeHtml(expiresText)}) và chỉ dùng được một lần.`, { muted: true }),
      noticeBox(
        "Không phải bạn yêu cầu?",
        "Cứ bỏ qua email này — mật khẩu của bạn vẫn giữ nguyên. Tuyệt đối không chia sẻ mã với bất kỳ ai, kể cả người tự nhận là đội ngũ hỗ trợ NayAnGi.",
      ),
    ].join(""),
  });
  const text = `Chào ${name},\n\nBạn vừa yêu cầu đặt lại mật khẩu cho tài khoản NayAnGi.\nMã xác thực của bạn: ${otp}\nMã có hiệu lực trong ${ttlMinutes} phút (hết hạn lúc ${expiresText}) và chỉ dùng được một lần.\n\nKhông phải bạn yêu cầu? Hãy bỏ qua email này — mật khẩu vẫn giữ nguyên. Không chia sẻ mã với bất kỳ ai.${textFooter()}`;
  return { to, subject: `${otp} là mã đặt lại mật khẩu NayAnGi của bạn`, html, text };
}

export function buildEmailVerificationOtpEmail(input: {
  to: string;
  name: string;
  otp: string;
  expiresAt: Date;
  ttlMinutes: number;
}): EmailMessage {
  const { to, name, otp, expiresAt, ttlMinutes } = input;
  const expiresText = formatVietnamDateTime(expiresAt);
  const html = renderLayout({
    preheader: `Mã xác thực email NayAnGi của bạn là ${otp}. Không chia sẻ mã này với bất kỳ ai.`,
    badge: "Xác thực email",
    tone: "primary",
    title: "Xác thực địa chỉ email",
    name,
    contentHtml: [
      paragraph("Bạn vừa yêu cầu xác thực email cho tài khoản NayAnGi. Hãy nhập mã gồm 6 chữ số dưới đây trong trang <strong>Hồ sơ</strong>:"),
      otpBlock(otp),
      paragraph(`⏱ Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong> (hết hạn lúc ${escapeHtml(expiresText)}) và chỉ dùng được một lần.`, { muted: true }),
      noticeBox(
        "Vì sao cần xác thực?",
        "Email đã xác thực giúp bạn lấy lại tài khoản qua “Quên mật khẩu” khi cần. Không phải bạn yêu cầu? Có thể ai đó đã nhập nhầm email của bạn — cứ bỏ qua email này.",
        "primary",
      ),
    ].join(""),
  });
  const text = `Chào ${name},\n\nBạn vừa yêu cầu xác thực email cho tài khoản NayAnGi.\nMã xác thực email của bạn: ${otp}\nNhập mã trong trang Hồ sơ. Mã có hiệu lực trong ${ttlMinutes} phút (hết hạn lúc ${expiresText}) và chỉ dùng được một lần.\n\nKhông phải bạn yêu cầu? Cứ bỏ qua email này.${textFooter()}`;
  return { to, subject: `${otp} là mã xác thực email NayAnGi của bạn`, html, text };
}

/** Đăng ký bằng email của tài khoản chỉ có Google — mã xác nhận trước khi thêm mật khẩu vào tài khoản đó. */
export function buildPasswordLinkOtpEmail(input: {
  to: string;
  name: string;
  otp: string;
  expiresAt: Date;
  ttlMinutes: number;
}): EmailMessage {
  const { to, name, otp, expiresAt, ttlMinutes } = input;
  const expiresText = formatVietnamDateTime(expiresAt);
  const html = renderLayout({
    preheader: `Mã xác thực NayAnGi của bạn là ${otp}. Không chia sẻ mã này với bất kỳ ai.`,
    badge: "Yêu cầu bảo mật",
    tone: "primary",
    title: "Thêm đăng nhập bằng mật khẩu",
    name,
    contentHtml: [
      paragraph(
        "Có người vừa dùng email này để đăng ký trên NayAnGi. Email đã được liên kết với tài khoản Google của bạn, nên để thêm đăng nhập bằng mật khẩu, hãy nhập mã gồm 6 chữ số dưới đây:",
      ),
      otpBlock(otp),
      paragraph(`⏱ Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong> (hết hạn lúc ${escapeHtml(expiresText)}) và chỉ dùng được một lần.`, { muted: true }),
      noticeBox(
        "Không phải bạn yêu cầu?",
        "Cứ bỏ qua email này — tài khoản của bạn vẫn chỉ đăng nhập bằng Google và không ai thêm được mật khẩu khi không có mã này. Tuyệt đối không chia sẻ mã với bất kỳ ai.",
      ),
    ].join(""),
  });
  const text = `Chào ${name},\n\nCó người vừa dùng email này để đăng ký trên NayAnGi. Email đã được liên kết với tài khoản Google của bạn.\nĐể thêm đăng nhập bằng mật khẩu, hãy nhập mã xác thực: ${otp}\nMã có hiệu lực trong ${ttlMinutes} phút (hết hạn lúc ${expiresText}) và chỉ dùng được một lần.\n\nKhông phải bạn yêu cầu? Hãy bỏ qua email này — tài khoản vẫn chỉ đăng nhập bằng Google. Không chia sẻ mã với bất kỳ ai.${textFooter()}`;
  return { to, subject: `${otp} là mã xác thực thêm mật khẩu NayAnGi của bạn`, html, text };
}

export function buildAccountLockedEmail(input: {
  to: string;
  name: string;
  lockedAt: Date;
  ip: string | null;
  userAgent: string | null;
  unlockUrl: string;
  maxAttempts: number;
  unlockTtlHours: number;
}): EmailMessage {
  const { to, name, lockedAt, ip, userAgent, unlockUrl, maxAttempts, unlockTtlHours } = input;
  const lockedText = formatVietnamDateTime(lockedAt);
  const device = describeUserAgent(userAgent);
  const html = renderLayout({
    preheader: "Tài khoản NayAnGi của bạn đã tạm khoá do nhập sai mã xác thực nhiều lần.",
    badge: "Cảnh báo bảo mật",
    tone: "accent",
    title: "Tài khoản đã được tạm khoá",
    name,
    contentHtml: [
      paragraph(`Có người đã nhập sai mã đặt lại mật khẩu <strong>${maxAttempts} lần</strong> cho tài khoản của bạn. Để bảo vệ bạn, NayAnGi đã tạm khoá tài khoản.`),
      detailRows([
        ["Thời điểm", lockedText],
        ["Địa chỉ IP", ip],
        ["Thiết bị", device],
      ]),
      paragraph("Nếu đó là bạn, hãy bấm nút dưới để mở khoá. <strong>Mật khẩu hiện tại vẫn giữ nguyên</strong> — sau khi mở khoá bạn đăng nhập như bình thường.", { muted: true }),
      button("Mở khoá tài khoản", unlockUrl),
      paragraph(`Liên kết có hiệu lực trong ${unlockTtlHours} giờ và chỉ dùng được một lần.`, { muted: true }),
      noticeBox(
        "Không phải bạn?",
        "Có thể ai đó đang cố truy cập tài khoản. Tài khoản đang an toàn vì đã được khoá; bạn vẫn nên mở khoá và đổi mật khẩu mạnh hơn. Tuyệt đối không chia sẻ mã xác thực với bất kỳ ai.",
      ),
    ].join(""),
  });
  const text = `Chào ${name},\n\nCó người đã nhập sai mã đặt lại mật khẩu ${maxAttempts} lần cho tài khoản của bạn. NayAnGi đã tạm khoá tài khoản để bảo vệ bạn.\n\nThời điểm: ${lockedText}${ip ? `\nĐịa chỉ IP: ${ip}` : ""}${device ? `\nThiết bị: ${device}` : ""}\n\nMở khoá tài khoản (hiệu lực ${unlockTtlHours} giờ, dùng 1 lần): ${unlockUrl}\nMật khẩu hiện tại vẫn giữ nguyên — sau khi mở khoá bạn đăng nhập như bình thường.\n\nKhông phải bạn? Tài khoản đang an toàn vì đã được khoá; bạn vẫn nên mở khoá và đổi mật khẩu mạnh hơn.${textFooter()}`;
  return { to, subject: "Cảnh báo: tài khoản NayAnGi của bạn đã tạm khoá", html, text };
}

export function buildPasswordChangedEmail(input: {
  to: string;
  name: string;
  changedAt: Date;
  ip: string | null;
  userAgent: string | null;
  loginUrl: string;
}): EmailMessage {
  const { to, name, changedAt, ip, userAgent, loginUrl } = input;
  const changedText = formatVietnamDateTime(changedAt);
  const device = describeUserAgent(userAgent);
  const html = renderLayout({
    preheader: "Mật khẩu NayAnGi của bạn vừa được thay đổi.",
    badge: "Đổi mật khẩu thành công",
    tone: "primary",
    title: "Mật khẩu đã được thay đổi",
    name,
    contentHtml: [
      paragraph("Mật khẩu tài khoản NayAnGi của bạn vừa được đặt lại thành công. Để an toàn, mọi thiết bị đang đăng nhập đã được đăng xuất."),
      detailRows([
        ["Thời điểm", changedText],
        ["Địa chỉ IP", ip],
        ["Thiết bị", device],
      ]),
      button("Đăng nhập ngay", loginUrl),
      noticeBox(
        "Không phải bạn thay đổi?",
        `Hãy đặt lại mật khẩu ngay tại trang “Quên mật khẩu” và liên hệ chúng tôi qua ${escapeHtml(CONTACTS.email)}.`,
      ),
    ].join(""),
  });
  const text = `Chào ${name},\n\nMật khẩu tài khoản NayAnGi của bạn vừa được đặt lại thành công lúc ${changedText}. Mọi thiết bị đang đăng nhập đã được đăng xuất.${ip ? `\nĐịa chỉ IP: ${ip}` : ""}${device ? `\nThiết bị: ${device}` : ""}\n\nĐăng nhập: ${loginUrl}\n\nKhông phải bạn thay đổi? Hãy đặt lại mật khẩu ngay và liên hệ ${CONTACTS.email}.${textFooter()}`;
  return { to, subject: "Mật khẩu NayAnGi của bạn đã được thay đổi", html, text };
}

export function buildAccountUnlockedEmail(input: { to: string; name: string; unlockedAt: Date; loginUrl: string }): EmailMessage {
  const { to, name, unlockedAt, loginUrl } = input;
  const unlockedText = formatVietnamDateTime(unlockedAt);
  const html = renderLayout({
    preheader: "Tài khoản NayAnGi của bạn đã được mở khoá.",
    badge: "Mở khoá thành công",
    tone: "primary",
    title: "Tài khoản đã được mở khoá",
    name,
    contentHtml: [
      paragraph(`Tài khoản của bạn đã được mở khoá lúc ${escapeHtml(unlockedText)}. Mật khẩu không thay đổi — bạn có thể đăng nhập bằng email và mật khẩu như trước.`),
      button("Đăng nhập", loginUrl),
      noticeBox("Không phải bạn mở khoá?", `Hãy đổi mật khẩu ngay và liên hệ chúng tôi qua ${escapeHtml(CONTACTS.email)}.`, "primary"),
    ].join(""),
  });
  const text = `Chào ${name},\n\nTài khoản NayAnGi của bạn đã được mở khoá lúc ${unlockedText}. Mật khẩu không thay đổi — bạn đăng nhập như trước.\nĐăng nhập: ${loginUrl}\n\nKhông phải bạn? Hãy đổi mật khẩu ngay và liên hệ ${CONTACTS.email}.${textFooter()}`;
  return { to, subject: "Tài khoản NayAnGi của bạn đã được mở khoá", html, text };
}
