import React, { useState } from "react";
import { X, Image as ImageIcon, Link as LinkIcon, Upload } from "lucide-react";

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}

export const ImageInsertModal: React.FC<ImageInsertModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"link" | "upload">("link");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onInsert(url.trim());
      setUrl("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold">إدراج صورة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === "link" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <LinkIcon className="w-4 h-4" />
            رابط صورة
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === "upload" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Upload className="w-4 h-4" />
            رفع من الجهاز
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-h-0">
          {activeTab === "link" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رابط الصورة (URL)
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow text-left"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  إدراج
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  انقر لاختيار صورة أو اسحبها هنا
                </p>
                <p className="text-xs text-slate-500">
                  JPG, PNG, GIF (الحد الأقصى 5MB)
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
