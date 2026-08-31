import React, { useState } from "react";
import {
  History,
  Clock,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Cycle, Exam } from "../../../types/index";
import { initialCycles } from "../../../database/initialData";

interface PastCyclesViewProps {
  cycles: Cycle[];
  exams?: Exam[];
  onSaveCycle: (cycle: Cycle) => void;
  onDeleteCycle: (id: string) => void;
}

export const PastCyclesView: React.FC<PastCyclesViewProps> = ({
  cycles,
  exams = [],
  onSaveCycle,
  onDeleteCycle,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"active" | "archived">("archived");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCycle: Cycle = {
      id: `cycle-${Date.now()}`,
      name,
      academicYear,
      startDate: startDate || new Date().toISOString().split("T")[0],
      endDate: endDate || new Date().toISOString().split("T")[0],
      status,
      examIds: [],
    };

    onSaveCycle(newCycle);
    setName("");
    setStartDate("");
    setEndDate("");
    setIsAdding(false);
  };

  const handleRestoreDefaults = () => {
    initialCycles.forEach((c) => {
      onSaveCycle(c);
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#0f6cbd] dark:text-blue-400" />
            <span>أرشيف الامتحانات والدورات السابقة</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            متابعة أسئلة الامتحانات الوزارية للسنوات الماضية وحساب معامل التكرار التاريخي لتوقع أسئلة الامتحان القادم.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleRestoreDefaults}
            className="px-4 py-2 text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 rounded-xl transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الدورات الافتراضية</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 text-xs sm:text-sm font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دورة مؤرشفة جديدة</span>
          </button>
        </div>
      </div>

      {/* Add Cycle Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>إضافة دورة امتحانية مؤرشفة</span>
              </h2>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الدورة / الفصل الدراسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الفصل الدراسي الأول 2025/2026"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    السنة الأكاديمية
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2025/2026"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة الدورة
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "archived")}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  >
                    <option value="archived">مؤرشفة</option>
                    <option value="active">نشطة حالياً</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ البدء
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition cursor-pointer"
                >
                  حفظ الدورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      {cycles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0f6cbd] dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              أرشيف الامتحانات فارغ حالياً
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              لم تقم بإضافة أي دورات مؤرشفة بعد. يمكنك استيراد الدورات الافتراضية بضغطة زر واحدة لتجربة نظام التحليل وتوقع الأسئلة.
            </p>
          </div>
          <button
            onClick={handleRestoreDefaults}
            className="px-4 py-2.5 text-xs font-bold bg-[#0f6cbd] hover:bg-[#115ea3] text-white rounded-xl transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الدورات الافتراضية الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cycles.map((c, cIdx) => (
            <div
              key={c.id ? `${c.id}_${cIdx}` : `cycle_${cIdx}`}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4 relative group"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-1">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white block">
                    {c.name}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold block">
                    السنة الأكاديمية: {c.academicYear}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === "active"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                  }`}>
                    {c.status === "active" ? "دورة نشطة" : "مؤرشفة"}
                  </span>
                  <button
                    onClick={() => onDeleteCycle(c.id)}
                    title="حذف الدورة"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 dark:hover:bg-red-950/40 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>البدء: {c.startDate}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>الانتهاء: {c.endDate}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>تحتوي على: {c.examIds?.length || 0} اختبارات مربوطة</span>
                </div>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>جاهز للتحليل</span>
                </span>
              </div>

              {/* Connected Exams List */}
              {c.examIds && c.examIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block">قائمة الامتحانات في هذا الأرشيف:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {(exams || []).filter(e => e && c.examIds?.includes(e.id)).map((exam, eIdx) => (
                      <div key={(exam.id || "exam") + "_" + eIdx} className="p-2 bg-slate-50/55 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px] flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block truncate">{exam.title}</span>
                          <span className="text-[9px] text-slate-400">الأسئلة: {exam.totalQuestions} | الدرجة: {exam.totalMarks} | التاريخ: {exam.createdAt}</span>
                        </div>
                        <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[8px] font-bold">
                          نموذج رسمي
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
