import { describe, expect, it } from "vitest";
import { evaluateRoute, isGuestOnlyPage, type RoutePolicyToken } from "./route-policy";

const GUEST: RoutePolicyToken | null = null;
const USER: RoutePolicyToken = { id: "u1", role: "user" };
const REVIEWER: RoutePolicyToken = { id: "r1", role: "foodreviewer" };
const ADMIN: RoutePolicyToken = { id: "a1", role: "admin" };
/** Token "hỏng" — không có id (vd token cũ/giải mã lỗi một phần) → phải coi như GUEST (fail closed). */
const MALFORMED: RoutePolicyToken = { role: "admin" };

const SAME_ORIGIN = "https://nayangi.example";
const CROSS_ORIGIN = "https://evil.example";
const HOST = "nayangi.example";

function evalGet(pathname: string, token: RoutePolicyToken | null) {
  return evaluateRoute({ pathname, method: "GET", token, origin: null, host: HOST });
}

describe("route-policy: /admin/** — fail-as-404 cho mọi lý do không đủ quyền", () => {
  const paths = ["/admin", "/admin/nguoi-dung", "/api/admin/users", "/api/admin/reports"];

  for (const pathname of paths) {
    it(`${pathname} — guest → notFound`, () => {
      expect(evalGet(pathname, GUEST)).toEqual({ kind: "notFound" });
    });
    it(`${pathname} — user thường → notFound`, () => {
      expect(evalGet(pathname, USER)).toEqual({ kind: "notFound" });
    });
    it(`${pathname} — reviewer → notFound`, () => {
      expect(evalGet(pathname, REVIEWER)).toEqual({ kind: "notFound" });
    });
    it(`${pathname} — token hỏng (thiếu id) → notFound`, () => {
      expect(evalGet(pathname, MALFORMED)).toEqual({ kind: "notFound" });
    });
    it(`${pathname} — admin thật → allow`, () => {
      expect(evalGet(pathname, ADMIN)).toEqual({ kind: "allow" });
    });
  }

  it("mọi HTTP method đều notFound khi không đủ quyền (không riêng GET)", () => {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
      expect(evaluateRoute({ pathname: "/api/admin/users", method, token: USER, origin: null, host: HOST })).toEqual({
        kind: "notFound",
      });
    }
  });

  it("path lạ dưới /admin (không tồn tại thật) vẫn notFound giống hệt path thật", () => {
    expect(evalGet("/admin/xyz-123-khong-ton-tai", GUEST)).toEqual({ kind: "notFound" });
    expect(evalGet("/api/admin/xyz-123-khong-ton-tai", GUEST)).toEqual({ kind: "notFound" });
  });
});

describe("route-policy: /reviewer/** — giữ hành vi thân thiện", () => {
  it("page — guest → redirectLogin", () => {
    expect(evalGet("/reviewer", GUEST)).toEqual({ kind: "redirectLogin", callbackUrl: "/reviewer" });
  });
  it("page — user thường (đã login, sai role) → allow (layout tự hiện EmptyState)", () => {
    expect(evalGet("/reviewer", USER)).toEqual({ kind: "allow" });
  });
  it("page — reviewer thật → allow", () => {
    expect(evalGet("/reviewer/lich-su", REVIEWER)).toEqual({ kind: "allow" });
  });
  it("api — guest → unauthorized (401)", () => {
    expect(evalGet("/api/reviewer/queue", GUEST)).toEqual({ kind: "unauthorized" });
  });
  it("api — user thường (đã login) → allow (route handler tự trả 403 nếu sai role)", () => {
    expect(evalGet("/api/reviewer/queue", USER)).toEqual({ kind: "allow" });
  });
});

describe("route-policy: route công khai", () => {
  const publicPaths = ["/", "/mon-an", "/random", "/ve-chung-toi", "/tin-tuc", "/dang-nhap", "/dang-ky", "/cai-dat"];
  for (const pathname of publicPaths) {
    it(`${pathname} — guest → allow`, () => {
      expect(evalGet(pathname, GUEST)).toEqual({ kind: "allow" });
    });
  }

  const publicApis = ["/api/foods", "/api/categories", "/api/articles", "/api/restaurants", "/api/reviews", "/api/logs"];
  for (const pathname of publicApis) {
    it(`${pathname} — guest → allow`, () => {
      expect(evalGet(pathname, GUEST)).toEqual({ kind: "allow" });
    });
  }

  it("/api/auth/session — luôn allow bất kể token", () => {
    expect(evalGet("/api/auth/session", GUEST)).toEqual({ kind: "allow" });
    expect(evalGet("/api/auth/session", ADMIN)).toEqual({ kind: "allow" });
  });

  it("/mon-an/[id] — trang chi tiết món công khai như /mon-an, guest → allow", () => {
    expect(evalGet("/mon-an/6aab06549ecf6f67a3a618a4", GUEST)).toEqual({ kind: "allow" });
  });

  it("/mon-an/dong-gop — path tĩnh, KHÔNG bị coi là id món, vẫn cần đăng nhập", () => {
    expect(evalGet("/mon-an/dong-gop", GUEST)).toEqual({
      kind: "redirectLogin",
      callbackUrl: "/mon-an/dong-gop",
    });
  });
});

describe("route-policy: default-deny cho route cần đăng nhập", () => {
  const loginRequiredPages = ["/da-luu", "/ho-so", "/lich-su", "/mon-an/dong-gop"];
  for (const pathname of loginRequiredPages) {
    it(`${pathname} — guest → redirectLogin`, () => {
      expect(evalGet(pathname, GUEST)).toEqual({ kind: "redirectLogin", callbackUrl: pathname });
    });
    it(`${pathname} — user thường → allow`, () => {
      expect(evalGet(pathname, USER)).toEqual({ kind: "allow" });
    });
  }

  const loginRequiredApis = ["/api/favorites", "/api/experiences", "/api/notifications", "/api/profile", "/api/geocode"];
  for (const pathname of loginRequiredApis) {
    it(`${pathname} — guest → unauthorized`, () => {
      expect(evalGet(pathname, GUEST)).toEqual({ kind: "unauthorized" });
    });
    it(`${pathname} — user thường → allow`, () => {
      expect(evalGet(pathname, USER)).toEqual({ kind: "allow" });
    });
  }

  it("route hoàn toàn lạ, chưa từng khai báo (mô phỏng route mới quên thêm vào allowlist) — mặc định vẫn yêu cầu đăng nhập", () => {
    expect(evalGet("/mot-trang-moi-chua-khai-bao", GUEST)).toEqual({
      kind: "redirectLogin",
      callbackUrl: "/mot-trang-moi-chua-khai-bao",
    });
    expect(evalGet("/api/mot-api-moi-chua-khai-bao", GUEST)).toEqual({ kind: "unauthorized" });
  });
});

describe("route-policy: CSRF Origin/Host cho method thay đổi dữ liệu trên /api/**", () => {
  it("POST /api/foods — Origin khớp Host → allow (nếu đã login)", () => {
    expect(
      evaluateRoute({ pathname: "/api/foods", method: "POST", token: USER, origin: SAME_ORIGIN, host: HOST }),
    ).toEqual({ kind: "allow" });
  });

  it("POST /api/foods — Origin khác Host → forbiddenOrigin (dù đã login)", () => {
    expect(
      evaluateRoute({ pathname: "/api/foods", method: "POST", token: USER, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "forbiddenOrigin" });
  });

  it("POST /api/foods — thiếu Origin → forbiddenOrigin", () => {
    expect(evaluateRoute({ pathname: "/api/foods", method: "POST", token: USER, origin: null, host: HOST })).toEqual({
      kind: "forbiddenOrigin",
    });
  });

  it("GET /api/foods — không cần check Origin (method an toàn)", () => {
    expect(evaluateRoute({ pathname: "/api/foods", method: "GET", token: GUEST, origin: CROSS_ORIGIN, host: HOST })).toEqual({
      kind: "allow",
    });
  });

  it("POST /api/reviews — public GET nhưng POST vẫn qua CSRF + tự 401 ở route handler (như /api/foods)", () => {
    expect(evaluateRoute({ pathname: "/api/reviews", method: "GET", token: GUEST, origin: null, host: HOST })).toEqual({
      kind: "allow",
    });
    expect(
      evaluateRoute({ pathname: "/api/reviews", method: "POST", token: USER, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "forbiddenOrigin" });
    expect(
      evaluateRoute({ pathname: "/api/reviews", method: "POST", token: USER, origin: SAME_ORIGIN, host: HOST }),
    ).toEqual({ kind: "allow" });
  });

  it("POST /api/logs — Guest cũng được phép (khác /api/foods, /api/reviews) miễn Origin khớp Host", () => {
    expect(
      evaluateRoute({ pathname: "/api/logs", method: "POST", token: GUEST, origin: SAME_ORIGIN, host: HOST }),
    ).toEqual({ kind: "allow" });
  });

  it("POST /api/logs — thiếu Origin/Origin khác Host → vẫn forbiddenOrigin dù là API public cho Guest", () => {
    expect(evaluateRoute({ pathname: "/api/logs", method: "POST", token: GUEST, origin: null, host: HOST })).toEqual({
      kind: "forbiddenOrigin",
    });
    expect(
      evaluateRoute({ pathname: "/api/logs", method: "POST", token: GUEST, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "forbiddenOrigin" });
  });

  it("POST /api/auth/callback/credentials — luôn allow, không áp CSRF check của route-policy (NextAuth tự lo)", () => {
    expect(
      evaluateRoute({
        pathname: "/api/auth/callback/credentials",
        method: "POST",
        token: GUEST,
        origin: CROSS_ORIGIN,
        host: HOST,
      }),
    ).toEqual({ kind: "allow" });
  });

  it("admin thật, Origin sai → forbiddenOrigin (đã xác nhận là admin nên không còn nguy cơ lộ thông tin)", () => {
    expect(
      evaluateRoute({ pathname: "/api/admin/users", method: "PATCH", token: ADMIN, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "forbiddenOrigin" });
  });

  it("KHÔNG phải admin + Origin sai → vẫn notFound (fail-as-404 luôn thắng, không được lộ qua 403 CSRF)", () => {
    expect(
      evaluateRoute({ pathname: "/api/admin/users", method: "PATCH", token: USER, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "notFound" });
    expect(
      evaluateRoute({ pathname: "/api/admin/users", method: "PATCH", token: GUEST, origin: CROSS_ORIGIN, host: HOST }),
    ).toEqual({ kind: "notFound" });
  });
});

describe("route-policy: trang chỉ dành cho khách (BR-S09)", () => {
  it("nhận diện /dang-nhap, /dang-ky (kể cả dấu / cuối)", () => {
    expect(isGuestOnlyPage("/dang-nhap")).toBe(true);
    expect(isGuestOnlyPage("/dang-ky/")).toBe(true);
    expect(isGuestOnlyPage("/")).toBe(false);
    expect(isGuestOnlyPage("/lich-su")).toBe(false);
  });

  it("guest vẫn vào được trang khách (proxy không chặn)", () => {
    expect(evalGet("/dang-nhap", GUEST)).toEqual({ kind: "allow" });
    expect(evalGet("/dang-ky", GUEST)).toEqual({ kind: "allow" });
  });
});

describe("route-policy: Quên mật khẩu / mở khoá tài khoản", () => {
  const post = (pathname: string, origin: string | null) =>
    evaluateRoute({ pathname, method: "POST", token: GUEST, origin, host: HOST });

  it("/quen-mat-khau là trang chỉ dành cho khách; guest vào được", () => {
    expect(isGuestOnlyPage("/quen-mat-khau")).toBe(true);
    expect(evalGet("/quen-mat-khau", GUEST)).toEqual({ kind: "allow" });
  });

  it("/mo-khoa-tai-khoan công khai (không bị đẩy về đăng nhập)", () => {
    expect(evalGet("/mo-khoa-tai-khoan", GUEST)).toEqual({ kind: "allow" });
  });

  for (const pathname of [
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/forgot-password/resend",
    "/api/auth/forgot-password/verify-otp",
    "/api/auth/reset-password",
    "/api/auth/unlock-account",
    "/api/auth/unlock-account/resend",
    "/api/auth/check-email",
    "/api/auth/link-password",
    "/api/auth/link-password/resend",
    "/api/auth/link-password/confirm",
  ]) {
    it(`POST ${pathname} — guest cùng origin → allow`, () => {
      expect(post(pathname, SAME_ORIGIN)).toEqual({ kind: "allow" });
    });
    it(`POST ${pathname} — khác origin / thiếu Origin → forbiddenOrigin (không lọt qua nhánh NextAuth)`, () => {
      expect(post(pathname, CROSS_ORIGIN)).toEqual({ kind: "forbiddenOrigin" });
      expect(post(pathname, null)).toEqual({ kind: "forbiddenOrigin" });
    });
  }

  it("POST /api/account/set-password — guest → unauthorized (cần đăng nhập)", () => {
    expect(post("/api/account/set-password", SAME_ORIGIN)).toEqual({ kind: "unauthorized" });
  });

  it("GET /api/auth/reset-password (trạng thái phiên) — guest → allow", () => {
    expect(evalGet("/api/auth/reset-password", GUEST)).toEqual({ kind: "allow" });
  });
});
