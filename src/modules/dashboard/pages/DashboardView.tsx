import React from "react";
import {
  BookOpen,
  Sparkles,
  PlusCircle,
  Download,
  ScanLine,
  FileText,
} from "lucide-react";
import {
  Subject,
  Question,
  Exam,
  Lesson,
  AuditLog,
  SystemSettings,
  Cycle,
} from "../../../types/index";

interface DashboardViewProps {
  subjects?: Subject[];
  questions?: Question[];
  exams?: Exam[];
  lessons?: Lesson[];
  auditLogs?: AuditLog[];
  settings?: SystemSettings;
  cycles?: Cycle[];
  onNavigate: (tab: string) => void;
  onQuickAddQuestion: () => void;
  onExportBackup: () => void;
  onNavigateToSmartImport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onQuickAddQuestion,
  onExportBackup,
  onNavigateToSmartImport,
}) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 pt-4 space-y-6 max-w-[1600px] mx-auto bg-[var(--app-bg)] min-h-[calc(100vh-80px)] rtl">
      
      {/* Header / Hero */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent border-0 shadow-none pb-2">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 tracking-tight">
            مساحة عمل المعلم
            <Sparkles className="w-5 h-5 text-ai-500" />
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            استيراد، تحرير، وتوليد الاختبارات بكل يسر. حدد مسارك للبدء.
          </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={onExportBackup} 
             className="px-5 py-2 bg-[var(--surface-card)] hover:bg-[var(--sidebar-item-hover)] border border-[var(--border-default)] text-[var(--text-main)] rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
           >
             <Download className="w-4 h-4" /> 
             <span>المكتبة والتصدير</span>
           </button>
        </div>
      </div>

      {/* Quick Start Zone (Primary User Journey) */}
      <section>
         <h2 className="text-sm font-bold text-[var(--text-secondary)] mb-4 px-1">ابدأ بسرعة (مهام أساسية)</h2>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Smart Import OCR (AI - Purple) */}
            <button 
              onClick={() => {
                if (onNavigateToSmartImport) {
                  onNavigateToSmartImport();
                } else {
                  onNavigate("questions");
                }
              }} 
              className="group p-4 bg-[var(--surface-card)] rounded-[1.25rem] shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-primary-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
               <div className="w-10 h-10 rounded-xl bg-ai-50 dark:bg-ai-900/40 text-ai-600 dark:text-ai-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-ai-100 dark:group-hover:bg-ai-900/60 transition-all">
                 <ScanLine className="w-5 h-5" strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--text-main)] text-base">استيراد ذكي (OCR)</h3>
                 <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">رقمنة الصور وتوليد أسئلة بالذكاء الاصطناعي</p>
               </div>
            </button>
            {/* Create Question (Action - Blue) */}
            <button 
              onClick={onQuickAddQuestion} 
              className="group p-4 bg-[var(--surface-card)] rounded-[1.25rem] shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-primary-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
               <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/60 transition-all">
                 <PlusCircle className="w-5 h-5" strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--text-main)] text-base">إنشاء سؤال جديد</h3>
                 <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">إضافة سؤال يدوياً والمراجعة</p>
               </div>
            </button>
            {/* Setup Lesson (Success - Green) */}
            <button 
              onClick={() => onNavigate("lessons")} 
              className="group p-4 bg-[var(--surface-card)] rounded-[1.25rem] shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-primary-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
               <div className="w-10 h-10 rounded-xl bg-success-50 dark:bg-success-900/40 text-success-600 dark:text-success-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-success-100 dark:group-hover:bg-success-900/60 transition-all">
                 <BookOpen className="w-5 h-5" strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--text-main)] text-base">إعداد وحدة / درس</h3>
                 <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">تنظيم المحتوى لبناء الاختبارات</p>
               </div>
            </button>
            {/* Create Exam (Action - Blue) */}
            <button 
              onClick={() => onNavigate("exams")} 
              className="group p-4 bg-[var(--surface-card)] rounded-[1.25rem] shadow-xs hover:shadow-md border border-[var(--border-default)] hover:border-primary-500/50 text-right flex flex-col gap-3 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
               <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/60 transition-all">
                 <FileText className="w-5 h-5" strokeWidth={1.5} />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--text-main)] text-base">توليد اختبار</h3>
                 <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">تكوين وتصدير نماذج امتحانية</p>
               </div>
            </button>
         </div>
      </section>

    </div>
  );
};
