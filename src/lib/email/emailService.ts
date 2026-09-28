import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Bản plain-text fallback cho client không hiển thị HTML. */
  text: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = SMTPS; các cổng khác dùng STARTTLS. Ghi đè bằng SMTP_SECURE nếu nhà cung cấp khác chuẩn.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

/**
 * Điểm gửi email DUY NHẤT của app (quên mật khẩu, xác thực email, thông báo —
 * docs/notifications.md mục 5). Đổi nhà cung cấp (vd Resend) chỉ sửa file này.
 *
 * Gửi email qua SMTP (biến môi trường SMTP_* — xem .env.example). Chưa cấu hình
 * SMTP: ở dev in email ra console server để test luồng không cần mail thật; ở
 * production thì ném lỗi (không âm thầm "gửi thành công" khi thực ra không gửi).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP chưa được cấu hình (SMTP_HOST).");
    console.info(`\n[mail:dev] To: ${message.to}\n[mail:dev] Subject: ${message.subject}\n${message.text}\n`);
    return;
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}
