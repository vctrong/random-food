"use client";

import Link from "next/link";
import { CloudCheck, Code2, Database, Download, FileSpreadsheet, History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ConfirmDangerModal } from "@/components/ui/ConfirmDangerModal";

interface DataStorageSectionProps {
  storageSize: string;
  isAuthenticated: boolean;
  onExportHistoryJson: () => void;
  onExportHistoryCsv: () => void;
  onBackupSaved: () => void;
  onResetAll: () => void;
}

export function DataStorageSection({
  storageSize,
  isAuthenticated,
  onExportHistoryJson,
  onExportHistoryCsv,
  onBackupSaved,
  onResetAll,
}: DataStorageSectionProps) {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  return (
    <section id="du-lieu" className="bg-surface rounded-2xl p-6 shadow-sm space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex p-2 rounded-xl bg-soft-blue text-primary-blue">
            <Database className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Quản lý dữ liệu</h2>
            <p className="text-sm text-text-secondary">
              {isAuthenticated
                ? "Lịch sử random và sở thích ăn uống của bạn nằm trên server. Cài đặt giao diện/âm thanh dưới đây vẫn lưu riêng trên trình duyệt này."
                : "Bạn đang dùng ở chế độ khách — cài đặt giao diện/âm thanh chỉ lưu trên trình duyệt này, đăng nhập để lưu lịch sử và sở thích lâu dài."}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blue/50 text-text-primary text-xs font-medium">
          <CloudCheck className="size-3.5 text-success" aria-hidden />
          <span>
            Dung lượng cài đặt giao diện đã lưu: <strong>{storageSize}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isAuthenticated && (
          <>
            <div className="p-4 rounded-xl bg-soft-blue/30 flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold text-text-primary">
                  <Download className="size-4 text-primary-blue" aria-hidden />
                  <span>Xuất dữ liệu lịch sử</span>
                </div>
                <p className="text-sm text-text-secondary">Tải nhật ký các món bạn đã random.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExportHistoryJson}
                  className="px-4 py-2 rounded-full bg-surface text-primary-blue hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Code2 className="size-4" aria-hidden />
                  <span>File JSON</span>
                </button>
                <button
                  type="button"
                  onClick={onExportHistoryCsv}
                  className="px-4 py-2 rounded-full bg-surface text-primary-blue hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center gap-1.5"
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
                <p className="text-sm text-text-secondary">Tải file JSON danh sách món yêu thích.</p>
              </div>
              <button
                type="button"
                onClick={onBackupSaved}
                className="w-full sm:w-auto px-4 py-2 rounded-full bg-surface text-text-primary hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="size-4" aria-hidden />
                <span>Tạo bản sao lưu ngay</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-soft-blue/30 flex flex-col justify-between gap-4 md:col-span-2">
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
                className="w-full sm:w-auto text-center px-4 py-2 rounded-full bg-surface text-text-primary hover:bg-primary-blue hover:text-white text-sm font-medium shadow-sm transition-all"
              >
                Đến trang Lịch sử
              </Link>
            </div>
          </>
        )}

        <div className={`p-4 rounded-xl bg-red-50 dark:bg-red-500/10 flex flex-col justify-between gap-4 ${isAuthenticated ? "md:col-span-2" : "md:col-span-2"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-red-600 dark:text-red-400">
              <RotateCcw className="size-4" aria-hidden />
              <span>Vùng nguy hiểm: Đặt lại cài đặt giao diện</span>
            </div>
            <p className="text-sm text-text-secondary">
              Đưa chủ đề, âm thanh, giảm chuyển động trên trình duyệt này về mặc định. Không ảnh hưởng lịch sử hay sở thích ăn uống đã lưu trên server.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-4 py-2 rounded-full bg-red-600 text-white hover:opacity-90 text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-1.5 w-fit"
          >
            <RotateCcw className="size-4" aria-hidden />
            <span>Đặt lại cài đặt giao diện</span>
          </button>
        </div>
      </div>

      <ConfirmDangerModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          onResetAll();
          setIsResetModalOpen(false);
        }}
        title="Đặt lại cài đặt giao diện?"
        description="Chủ đề, âm thanh và giảm chuyển động trên trình duyệt này sẽ về mặc định."
        confirmLabel="Đặt lại"
      />
    </section>
  );
}
