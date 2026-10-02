/**
 * Migration giờ mở cửa có cấu trúc (docs/opening-hours.md):
 *  - Quán CHƯA có `openingSchedule`:
 *      · `openingHours` dạng "HH:mm - HH:mm" → { status: "known", mode: "daily", 7 ngày cùng 1 khung },
 *        đồng thời chuẩn hoá `openingHours` thành chuỗi tóm tắt "Hằng ngày HH:mm–HH:mm".
 *      · không có giờ / chuỗi không đọc được → { status: "unknown" } (GIỮ nguyên chuỗi cũ để reviewer tham khảo).
 *  - Quán đã có `openingSchedule` → bỏ qua (idempotent).
 *
 * Mặc định DRY-RUN. Chạy thật: npm run migrate:opening-schedule -- --apply
 * An toàn secret: chỉ in tên DB; lỗi chỉ in tên/mã lỗi, KHÔNG in message (có thể chứa connection string).
 */
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const LEGACY_PATTERN = /^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/;

/** Cùng luật với parseLegacyOpeningHours (src/features/opening-hours/openingHours.ts). */
function parseLegacy(text) {
  const match = LEGACY_PATTERN.exec(text ?? "");
  if (!match) return null;
  const [openHour, openMinute, closeHour, closeMinute] = match.slice(1).map(Number);
  if (openHour > 23 || closeHour > 23 || openMinute > 59 || closeMinute > 59) return null;
  const pad = (value) => String(value).padStart(2, "0");
  const range = { open: `${pad(openHour)}:${pad(openMinute)}`, close: `${pad(closeHour)}:${pad(closeMinute)}` };
  if (range.open === range.close) return null;
  return {
    schedule: {
      status: "known",
      mode: "daily",
      days: Array.from({ length: 7 }, (_, day) => ({ day, closed: false, allDay: false, ranges: [{ ...range }] })),
    },
    summary: `Hằng ngày ${range.open}–${range.close}`,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error("missing"), { name: "MissingMongoUri" });
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  const restaurants = db.collection("restaurants");

  console.log(`Chế độ: ${APPLY ? "APPLY (ghi thật)" : "DRY-RUN (không ghi)"} · DB: ${db.databaseName}\n`);

  const pending = await restaurants
    .find({ openingSchedule: { $exists: false } })
    .project({ _id: 1, name: 1, openingHours: 1 })
    .toArray();
  const alreadyDone = await restaurants.countDocuments({ openingSchedule: { $exists: true } });
  console.log(`Quán đã có openingSchedule (bỏ qua): ${alreadyDone}`);
  console.log(`Quán cần chuyển: ${pending.length}`);

  const operations = [];
  let known = 0;
  let unknown = 0;
  for (const restaurant of pending) {
    const parsed = parseLegacy(restaurant.openingHours);
    if (parsed) {
      known += 1;
      console.log(`  ✓ "${restaurant.name}" (${restaurant._id}): "${restaurant.openingHours}" → ${parsed.summary}`);
      operations.push({
        updateOne: {
          filter: { _id: restaurant._id, openingSchedule: { $exists: false } },
          update: { $set: { openingSchedule: parsed.schedule, openingHours: parsed.summary } },
        },
      });
    } else {
      unknown += 1;
      const note = restaurant.openingHours ? `chuỗi không đọc được "${restaurant.openingHours}" (giữ nguyên)` : "chưa có giờ";
      console.log(`  ? "${restaurant.name}" (${restaurant._id}): ${note} → Không rõ giờ`);
      operations.push({
        updateOne: {
          filter: { _id: restaurant._id, openingSchedule: { $exists: false } },
          update: { $set: { openingSchedule: { status: "unknown" } } },
        },
      });
    }
  }
  console.log(`\nTổng: ${known} quán có giờ cụ thể · ${unknown} quán "Không rõ giờ"`);

  if (APPLY && operations.length > 0) {
    const result = await restaurants.bulkWrite(operations, { ordered: false });
    console.log(`Đã cập nhật: ${result.modifiedCount}`);
  }

  console.log(APPLY ? "\n✓ Hoàn tất." : "\nThêm --apply để chạy thật.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Lỗi: ${error?.name ?? "Error"}${error?.code ? ` (code ${error.code})` : ""}`);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
