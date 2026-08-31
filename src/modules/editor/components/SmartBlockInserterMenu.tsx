import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Lightbulb, HelpCircle, Target, Sigma, Table as TableIcon, 
  Image as ImageIcon, BookOpen, Sparkles, FileSpreadsheet, Search, 
  CheckSquare, CheckCircle2, ChevronRight, X, ArrowRight
} from "lucide-react";

interface SmartBlockInserterMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: string, initialData?: any) => void;
  onOpenOcr?: () => void;
  onOpenAI?: () => void;
  atIndex?: number;
}

const STORAGE_KEY_RECENT_TYPES = "teacher_app_recent_card_types";

// Default card definitions
const ALL_TYPES = [
  { type: "paragraph", label: "شرح / فقرة", icon: FileText, category: "popular", desc: "نص عادي وشرح تفصيلي" },
  { type: "concepts", label: "مثال / مفاهيم", icon: Lightbulb, category: "popular", desc: "أمثلة ومفاهيم أساسية" },
  { type: "questions", label: "سؤال / تدريب", icon: CheckSquare, category: "popular", desc: "أسئلة وتدريبات تفاعلية" },
  { type: "activities", label: "مسألة / نشاط", icon: Target, category: "popular", desc: "مسائل وأنشطة تطبيقية" },
  { type: "notes", label: "ملاحظة / تنبيه", icon: BookOpen, category: "insert", desc: "ملاحظة هامة للطلاب" },
  { type: "math", label: "معادلة رياضية", icon: Sigma, category: "insert", desc: "معادلات وصيغ رياضية" },
  { type: "tables", label: "جدول بيانات", icon: TableIcon, category: "insert", desc: "جدول نصوص أو أرقام" },
  { type: "images", label: "صورة / وسائط", icon: ImageIcon, category: "insert", desc: "إدراج صورة توضيحية" },
  { type: "summary", label: "ملخص الدرس", icon: FileText, category: "more", desc: "خلاصة ونقاط تنفيذية" },
  { type: "objectives", label: "أهداف الدرس", icon: Target, category: "more", desc: "أهداف نتاجات التعلم" },
];

// Question Subtypes
const QUESTION_SUBTYPES = [
  { id: "mcq", label: "اختيار من متعدد", desc: "سؤال مع 4 خيارات وتحديد الإجابة الصحيحة", icon: CheckSquare, defaultQuestion: "اختر الإجابة الصحيحة مما يلي:", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], answer: "خيار 1" },
  { id: "true_false", label: "صح / خطأ", desc: "سؤال العبارة وتحديد صحتها", icon: CheckCircle2, defaultQuestion: "ضع علامة (✓) أمام العبارة الصحيحة وعلامة (✗) أمام العبارة الخاطئة:", options: ["صح", "خطأ"], answer: "صح" },
  { id: "problem", label: "مسألة / تحليلي", desc: "مسألة خطوة بخطوة مع الحل النموذجي", icon: Sigma, defaultQuestion: "احسب أو حل المسألة التالية مع توضيح خطوات الحل:", answer: "الحل النموذجي:" },
  { id: "essay", label: "سؤال مقالي / علل", desc: "سؤال إجابة مفتوحة أو تعليل", icon: HelpCircle, defaultQuestion: "علل أو اشرح ما يلي باختصار:", answer: "الإجابة النموذجية:" },
];

export const SmartBlockInserterMenu: React.FC<SmartBlockInserterMenuProps> = ({
  isOpen,
  onClose,
  onSelectType,
  onOpenOcr,
  onOpenAI,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuestionSubmenu, setShowQuestionSubmenu] = useState(false);
  const [showAllMore, setShowAllMore] = useState(false);
  const [recentTypes, setRecentTypes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_TYPES);
      if (saved) {
        setRecentTypes(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setShowQuestionSubmenu(false);
      setShowAllMore(false);
    }
  }, [isOpen]);

  // Global escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (type: string, initialData?: any) => {
    // Save to recent types
    try {
      const updated = [type, ...recentTypes.filter(t => t !== type)].slice(0, 4);
      setRecentTypes(updated);
      localStorage.setItem(STORAGE_KEY_RECENT_TYPES, JSON.stringify(updated));
    } catch (e) {
      // Ignore
    }

    if (type === "questions" && !initialData) {
      setShowQuestionSubmenu(true);
      return;
    }

    onSelectType(type, initialData);
    onClose();
  };

  const handleQuestionSubtypeSelect = (sub: typeof QUESTION_SUBTYPES[0]) => {
    let bodyData: any[] = [];
    if (sub.id === "mcq") {
      bodyData = [{
        id: `q_${Date.now()}`,
        type: "mcq",
        question: sub.defaultQuestion,
        options: sub.options,
        answer: sub.answer
      }];
    } else if (sub.id === "true_false") {
      bodyData = [{
        id: `q_${Date.now()}`,
        type: "true_false",
        question: sub.defaultQuestion,
        options: sub.options,
        answer: sub.answer
      }];
    } else if (sub.id === "problem") {
      bodyData = [{
        id: `q_${Date.now()}`,
        type: "problem",
        question: sub.defaultQuestion,
        answer: sub.answer
      }];
    } else {
      bodyData = [{
        id: `q_${Date.now()}`,
        type: "essay",
        question: sub.defaultQuestion,
        answer: sub.answer
      }];
    }

    handleSelect("questions", JSON.stringify(bodyData));
  };

  // Filter types by search
  const filteredTypes = ALL_TYPES.filter(t => 
    t.label.includes(searchQuery) || t.desc.includes(searchQuery) || t.type.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 rtl">
        
        {/* Header Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن نوع البطاقة (شرح، سؤال، صورة، معادلة...)"
            className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Subtype Submenu View */}
        {showQuestionSubmenu ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <CheckSquare className="w-4 h-4" />
                <span>اختر نوع السؤال الموحد</span>
              </div>
              <button 
                onClick={() => setShowQuestionSubmenu(false)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <span>رجوع</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {QUESTION_SUBTYPES.map((sub) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleQuestionSubtypeSelect(sub)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-right transition cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {sub.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {sub.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Main Smart Category View */
          <div className="p-3 overflow-y-auto space-y-4 max-h-[60vh] text-right">
            {searchQuery ? (
              /* Search Filter Results */
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 px-1">نتائج البحث ({filteredTypes.length})</div>
                {filteredTypes.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleSelect(item.type)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-500/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition text-right cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* 1. الأكثر استخداماً */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    الأكثر استخداماً
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_TYPES.filter(t => t.category === "popular").map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => handleSelect(item.type)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 transition text-right cursor-pointer group"
                        >
                          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. إدراج عناصر خاصة */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    إدراج
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_TYPES.filter(t => t.category === "insert").map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => handleSelect(item.type)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 transition text-right cursor-pointer group"
                        >
                          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. أدوات الاستيراد والذكاء الاصطناعي */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    أدوات استيراد وذكاء اصطناعي
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {onOpenOcr && (
                      <button
                        onClick={() => {
                          onOpenOcr();
                          onClose();
                        }}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition text-right cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 shrink-0">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs truncate">OCR / Word استيراد</span>
                      </button>
                    )}

                    {onOpenAI && (
                      <button
                        onClick={() => {
                          onOpenAI();
                          onClose();
                        }}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 transition text-right cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-xs truncate">إنشاء بالذكاء الاصطناعي</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. المزيد للأنواع الأقل شيوعاً */}
                <div>
                  <button
                    onClick={() => setShowAllMore(!showAllMore)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span>{showAllMore ? "إخفاء الأنواع الإضافية" : "المزيد من أنواع البطاقات..."}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAllMore ? "rotate-90" : ""}`} />
                  </button>

                  {showAllMore && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1">
                      {ALL_TYPES.filter(t => t.category === "more").map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            onClick={() => handleSelect(item.type)}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition text-right cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
