/** Chính sách mật khẩu dùng chung (đăng ký, đổi mật khẩu, script seed admin):
 * tối thiểu 8 ký tự, có ít nhất 1 chữ cái, 1 chữ số, 1 ký tự đặc biệt. */
export const PASSWORD_POLICY_MESSAGE =
  "Mật khẩu phải có tối thiểu 8 ký tự, gồm chữ, số và ký tự đặc biệt.";

const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function isPasswordValid(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password);
}
