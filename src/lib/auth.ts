import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import clientPromise, { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { createNotification } from "@/lib/notify";

/** Phiên "không ghi nhớ đăng nhập" tự hết hạn sau 30 phút không hoạt động
 * (kiểm tra thật trong callbacks.session() — chạy lại mỗi request, không phải
 * chỉ ở client). Google OAuth không có checkbox "ghi nhớ" nên luôn áp dụng
 * mốc này. */
const IDLE_LIMIT_MS = 30 * 60 * 1000;
/** Chỉ ghi lastActiveAt vào DB nếu đã cũ hơn mốc này, tránh ghi Mongo mỗi request. */
const ACTIVITY_TOUCH_THROTTLE_MS = 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/dang-nhap",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
        remember: { label: "Ghi nhớ đăng nhập", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email.toLowerCase() });
        // Email không tồn tại: không tạo notification (tránh lộ thông tin tài khoản nào tồn tại).
        if (!user || !user.passwordHash) return null;

        if (user.accountStatus === "banned") {
          await createNotification({
            userId: user._id.toString(),
            type: "login_failed",
            message: "Có một lần đăng nhập thất bại: tài khoản của bạn đang bị khóa.",
          });
          throw new Error("Tài khoản của bạn đã bị khóa.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await createNotification({
            userId: user._id.toString(),
            type: "login_failed",
            message: "Có một lần đăng nhập thất bại vào tài khoản của bạn (sai mật khẩu).",
          });
          throw new Error("Email hoặc mật khẩu không đúng.");
        }

        user.lastLoginAt = new Date();
        user.lastActiveAt = new Date();
        await user.save();
        await createNotification({
          userId: user._id.toString(),
          type: "login_success",
          message: "Bạn vừa đăng nhập thành công.",
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? null,
          sessionVersion: user.sessionVersion ?? 0,
          remember: credentials.remember === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        // Google không có checkbox "ghi nhớ đăng nhập" — luôn áp dụng idle-timeout 30 phút.
        token.remember = account?.provider === "google" ? false : Boolean((user as { remember?: boolean }).remember);
      }
      // Client gọi update() sau khi tự đổi mật khẩu — đồng bộ lại sessionVersion cho
      // đúng thiết bị hiện tại, tránh tự đăng xuất chính mình (các thiết bị khác vẫn
      // bị thu hồi vì sessionVersion cũ không khớp nữa).
      if (trigger === "update" && token.id) {
        await connectDB();
        const dbUser = (await User.findById(token.id as string)
          .select("sessionVersion")
          .lean()) as { sessionVersion?: number } | null;
        if (dbUser) token.sessionVersion = dbUser.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = token.id as string;
      await connectDB();
      const dbUser = (await User.findById(userId)
        .select("sessionVersion accountStatus lastActiveAt")
        .lean()) as { sessionVersion?: number; accountStatus?: string; lastActiveAt?: Date } | null;

      const now = Date.now();
      const tokenSessionVersion = (token.sessionVersion as number) ?? 0;
      const remember = Boolean(token.remember);
      const lastActiveAt = dbUser?.lastActiveAt ? new Date(dbUser.lastActiveAt).getTime() : now;
      const isIdleExpired = !remember && now - lastActiveAt > IDLE_LIMIT_MS;
      const isRevoked = !dbUser || dbUser.accountStatus === "banned" || (dbUser.sessionVersion ?? 0) !== tokenSessionVersion;

      if (isRevoked || isIdleExpired) {
        (session as typeof session & { error?: string }).error = isIdleExpired
          ? "SessionExpired"
          : "SessionRevoked";
        delete (session as { user?: unknown }).user;
        return session;
      }

      // Còn hoạt động — gia hạn mốc lastActiveAt (throttle để đỡ ghi Mongo mỗi request).
      if (!remember && now - lastActiveAt > ACTIVITY_TOUCH_THROTTLE_MS) {
        await User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } });
      }

      if (session.user) {
        (session.user as typeof session.user & { id?: string }).id = userId;
      }
      return session;
    },
  },
  events: {
    /**
     * MongoDBAdapter tạo document `users` cho tài khoản OAuth (Google) bằng field
     * riêng (name/email/image/emailVerified), không đi qua Mongoose schema User
     * (mục 7.2) nên thiếu role/isVerified/avatarUrl/createdAt. Bổ sung lại đúng
     * schema đã chốt ngay khi user mới được tạo lần đầu.
     */
    async createUser({ user }) {
      await connectDB();
      await User.updateOne(
        { _id: user.id },
        {
          $set: {
            role: "user",
            isVerified: true,
            avatarUrl: user.image ?? undefined,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            lastActiveAt: new Date(),
            sessionVersion: 0,
          },
        },
      );
    },
    /** Cập nhật lastLoginAt cho các lần đăng nhập Google sau lần đầu (Credentials đã tự cập nhật trong authorize()). */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return;
      await connectDB();
      await User.updateOne({ _id: user.id }, { $set: { lastLoginAt: new Date(), lastActiveAt: new Date() } });
      await createNotification({
        userId: user.id,
        type: "login_success",
        message: "Bạn vừa đăng nhập thành công bằng Google.",
      });
    },
  },
};
