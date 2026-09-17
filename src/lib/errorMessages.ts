/**
 * Bộ chuyển đổi lỗi (mã NextAuth, mã HTTP, lỗi mạng) sang thông báo tiếng Việt
 * ngắn gọn, dễ hiểu, dùng chung cho toàn app — tránh mỗi form tự bịa 1 kiểu
 * thông báo lỗi khác nhau.
 */

/** Lỗi trả về từ NextAuth signIn() (result.error) — có thể là mã chuẩn của
 * NextAuth ("CredentialsSignin", "AccessDenied"...) hoặc message ta tự throw
 * trong authorize() (xem src/lib/auth.ts). */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Tên đăng nhập hoặc mật khẩu không đúng.",
  "Email hoặc mật khẩu không đúng.": "Tên đăng nhập hoặc mật khẩu không đúng.",
  "Tài khoản của bạn đã bị khóa.": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
  AccessDenied: "Bạn không có quyền đăng nhập bằng phương thức này.",
  Configuration: "Hệ thống đăng nhập đang gặp sự cố, vui lòng thử lại sau.",
  Verification: "Liên kết xác thực đã hết hạn hoặc không còn hợp lệ.",
  OAuthAccountNotLinked: "Email này đã đăng ký bằng phương thức khác, vui lòng đăng nhập theo cách cũ.",
};

export function getAuthErrorMessage(code: string | null | undefined): string {
  if (!code) return "Đăng nhập thất bại, vui lòng thử lại.";
  return AUTH_ERROR_MESSAGES[code] ?? "Tên đăng nhập hoặc mật khẩu không đúng.";
}

/** Thông báo chung theo mã trạng thái HTTP, dùng khi API không trả về message
 * cụ thể (lỗi hạ tầng/hệ thống — 500/502/503...) hoặc khi cần 1 câu ngắn gọn
 * thay cho thông điệp kỹ thuật từ server. */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Yêu cầu không hợp lệ, vui lòng kiểm tra lại thông tin.",
  401: "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập, vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy nội dung yêu cầu.",
  408: "Yêu cầu quá thời gian chờ, vui lòng thử lại.",
  409: "Dữ liệu đã tồn tại hoặc đang xung đột, vui lòng thử lại.",
  413: "Tệp tải lên quá lớn, vui lòng chọn tệp nhỏ hơn.",
  422: "Thông tin gửi lên không hợp lệ.",
  429: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
  500: "Hệ thống đang gặp sự cố, vui lòng thử lại sau.",
  502: "Máy chủ đang gặp sự cố, vui lòng thử lại sau.",
  503: "Dịch vụ đang tạm gián đoạn, vui lòng thử lại sau.",
  504: "Máy chủ phản hồi quá chậm, vui lòng thử lại sau.",
};

/**
 * Ưu tiên message cụ thể mà API tự trả (thường đã là tiếng Việt, rõ ràng hơn,
 * vd "Email đã được sử dụng."); chỉ dùng thông báo chung theo status khi API
 * không trả message (lỗi hạ tầng, lỗi 502 từ proxy, v.v...).
 */
export function getApiErrorMessage(status: number | undefined, serverMessage?: string | null): string {
  if (serverMessage) return serverMessage;
  if (status && HTTP_STATUS_MESSAGES[status]) return HTTP_STATUS_MESSAGES[status];
  return "Đã có lỗi xảy ra, vui lòng thử lại.";
}

/** Dùng trong catch của fetch() khi request không tới được server (mất mạng, CORS, timeout trình duyệt...). */
export function getNetworkErrorMessage(): string {
  return "Không thể kết nối tới máy chủ, vui lòng kiểm tra kết nối mạng và thử lại.";
}
