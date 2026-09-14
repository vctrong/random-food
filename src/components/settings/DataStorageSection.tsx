"use client";

import Link from "next/link";
import {
  CloudCheck,
  Code2,
  Database,
  Download,
  FileSpreadsheet,
  History,
  RotateCcw,
} from "lucide-react";

interface DataStorageSectionProps {
  storageSize: string;
  onExportHistoryJson: () => void;
  onExportHistoryCsv: () => void;
  onBackupSaved: () => void;
  onResetAll: () => void;
}

export function DataStorageSection({
  storageSize,
  onExportHistoryJson,
  onExportHistoryCsv,
  onBackupSaved,
  onResetAll,
}: DataStorageSectionProps) {
  return (
    <section id="du-lieu" className="bg-white rounded-2xl p-6 shadow-sm space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex p-2 rounded-xl bg-soft-blue text-primary-blue">
            <Database className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">2. Quản lý dữ liệu</h2>
            <p className="text-sm text-text-secondary">
              Cài đặt được lưu cục bộ trên trình duyệt của bạn (localStorage).
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue/50 text-text-primary text-xs font-medium">
          <CloudCheck className="size-3.5 text-success" aria-hidden />
          <span>
            Dung lượng cài đặt đã lưu: <strong>{storageSize}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-soft-blue/30 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <Download className="size-4 text-primary-blue" aria-hidden />
              <span>Xuất dữ liệu lịch sử</span>
            </div>
            <p className="text-sm text-text-secondary">
              Tải nhật ký các món bạn đã random trong phiên này.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportHistoryJson}
              className="px-4 py-2 rounded-full bg-white text-primary-blue hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
            >
              <Code2 className="size-4" aria-hidden />
              <span>File JSON</span>
            </button>
            <button
              type="button"
              onClick={onExportHistoryCsv}
              className="px-4 py-2 rounded-full bg-white text-primary-blue hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              <span>File CSV / Excel</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-soft-blue/30 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <Download className="size-4 text-primary-blue" aria-hidden />
              <span>Sao lưu món đã lưu</span>
            </div>
            <p className="text-sm text-text-secondary">
              Tải file JSON danh sách món yêu thích để chuyển sang máy khác.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackupSaved}
            className="w-full sm:w-auto px-4 py-2 rounded-full bg-white text-text-primary hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="size-4" aria-hidden />
            <span>Tạo bản sao lưu ngay</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-soft-blue/30 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-text-primary">
              <History className="size-4 text-primary-pink" aria-hidden />
              <span>Xoá lịch sử random</span>
            </div>
            <p className="text-sm text-text-secondary">
              Có thể xoá từng mục hoặc toàn bộ lịch sử tại trang Lịch sử.
            </p>
          </div>
          <Link
            href="/lich-su"
            className="w-full sm:w-auto text-center px-4 py-2 rounded-full bg-white text-text-primary hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all"
          >
            Đến trang Lịch sử
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-red-50 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-red-600">
              <RotateCcw className="size-4" aria-hidden />
              <span>Vùng nguy hiểm: Đặt lại mặc định</span>
            </div>
            <p className="text-sm text-text-secondary">
              Xoá vĩnh viễn khẩu vị, danh sách kiêng cữ và cài đặt đã lưu trên trình duyệt này.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "CẢNH BÁO: Toàn bộ danh sách dị ứng, món thích và cài đặt sẽ trở về ban đầu! Tiếp tục?",
                )
              ) {
                onResetAll();
              }
            }}
            className="px-4 py-2 rounded-full bg-red-600 text-white hover:opacity-90 text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="size-4" aria-hidden />
            <span>Xoá toàn bộ & Cài lại</span>
          </button>
        </div>
      </div>
    </section>
  );
}
