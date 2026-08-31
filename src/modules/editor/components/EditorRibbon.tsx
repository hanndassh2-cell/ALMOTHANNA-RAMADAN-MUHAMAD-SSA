import React, { useEffect, useState } from "react";
import {
  Save,
  Plus,
  Image as ImageIcon,
  Table as TableIcon,
  Type,
  FileText,
  Target,
  FileDown,
  Printer,
  Maximize2,
  BookOpen,
  PanelLeft,
  PanelRight,
  Sparkles,
  Database,
  Layers,
  Wand2,
  Clipboard,
  Sigma,
  MoreHorizontal,
  LayoutTemplate,
  Sliders,
  ChevronDown,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export const EditorRibbon = ({
  lastSaved,
  onSave,
  onExportWord,
  onExportPdf,
  onPrint,
  activeMainTab,
  setActiveMainTab,
  onPreview,
  isFocusReadingMode,
  setIsFocusReadingMode,
  onToggleNav,
  onTogglePreview,
  isNavCollapsed,
  isPreviewCollapsed,
  cardsZoomLevel = 100,
  setCardsZoomLevel,
  zoomLevel = 100,
  setZoomLevel,
  setIsAiAssistantOpen,
  setIsQuickPasteModalOpen,
  setIsQuestionParserOpen,
  setIsQuestionHubOpen,
  setQuestionHubTab,
  onInsertAction,
  onAddAction,
}: any) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handleCardsZoomChange = (val: number) => {
    const clamped = Math.min(200, Math.max(40, val));
    if (setCardsZoomLevel) setCardsZoomLevel(clamped);
    else if (setZoomLevel) setZoomLevel(clamped);
  };

  const currentCardsZoom = Math.round(cardsZoomLevel || zoomLevel || 100);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".ribbon-dropdown")) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const DropdownItem = ({ icon, text, onClick }: any) => (
    <button
      onClick={(e) => {
        onClick(e);
        setActiveMenu(null);
      }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right font-bold cursor-pointer"
    >
      {icon && <span className="text-slate-500">{icon}</span>}
      <span>{text}</span>
    </button>
  );

  const zoomPresets = [50, 75, 90, 100, 110, 125, 150, 200];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0 z-[100] sticky top-0 px-4 py-2 flex items-center justify-between select-none text-xs gap-3 overflow-x-auto shadow-2xs">
      {/* Right Side (RTL): Primary Document Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {onSave && (
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            title="حفظ التغييرات"
          >
            <Save className="w-4 h-4" />
            <span>حفظ</span>
          </button>
        )}

        {/* + Add Menu */}
        <div className="relative ribbon-dropdown">
          <button
            onClick={() => toggleMenu("add")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>إضافة</span>
          </button>
          {activeMenu === "add" && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">المحتوى والتعليم</div>
              <DropdownItem icon={<Type className="w-4 h-4 text-slate-600" />} text="نص أو فقرة شرح" onClick={() => onAddAction?.("explanation")} />
              <DropdownItem icon={<ImageIcon className="w-4 h-4 text-slate-600" />} text="صورة توضيحية" onClick={() => onAddAction?.("images")} />
              <DropdownItem icon={<TableIcon className="w-4 h-4 text-slate-600" />} text="جدول بيانات" onClick={() => onAddAction?.("tables")} />
              <DropdownItem icon={<Sigma className="w-4 h-4 text-slate-600" />} text="معادلة علمية" onClick={() => onAddAction?.("math")} />
              
              <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 mt-1 border-t border-slate-100 dark:border-slate-800">التقييم والتدريب</div>
              <DropdownItem icon={<Target className="w-4 h-4 text-emerald-500" />} text="سؤال تقويم" onClick={() => onAddAction?.("questions")} />
              <DropdownItem icon={<Database className="w-4 h-4 text-emerald-500" />} text="من بنك الأسئلة" onClick={() => { setQuestionHubTab?.("sync"); setIsQuestionHubOpen?.(true); }} />
              
              <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 mt-1 border-t border-slate-100 dark:border-slate-800">استيراد ذكي</div>
              <DropdownItem icon={<Clipboard className="w-4 h-4 text-purple-500" />} text="تحليل اللصق" onClick={() => setIsQuickPasteModalOpen?.(true)} />
              <DropdownItem icon={<Layers className="w-4 h-4 text-purple-500" />} text="مستخرج الأسئلة" onClick={() => setIsQuestionParserOpen?.(true)} />
            </div>
          )}
        </div>

        {/* Insert Elements Menu */}
        <div className="relative ribbon-dropdown">
          <button
            onClick={() => toggleMenu("insert")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
          >
            <LayoutTemplate className="w-4 h-4 text-slate-600" />
            <span>إدراج</span>
          </button>
          {activeMenu === "insert" && (
            <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
              <DropdownItem icon={<FileText className="w-4 h-4 text-slate-600" />} text="هيكل درس كامل" onClick={() => onInsertAction?.("lesson_template")} />
              {setActiveMainTab && (
                <DropdownItem icon={<Sliders className="w-4 h-4 text-blue-500" />} text="إعداد الصفحة والقالب" onClick={() => setActiveMainTab("page_setup")} />
              )}
            </div>
          )}
        </div>

        {/* Smart AI Menu */}
        <div className="relative ribbon-dropdown">
          <button
            onClick={() => toggleMenu("ai")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>الذكاء الاصطناعي</span>
          </button>
          {activeMenu === "ai" && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
              <DropdownItem icon={<Sparkles className="w-4 h-4 text-purple-500" />} text="المساعد الذكي (Chat)" onClick={() => setIsAiAssistantOpen?.(true)} />
              <DropdownItem icon={<Wand2 className="w-4 h-4 text-purple-500" />} text="مولد الاختبارات" onClick={() => { setQuestionHubTab?.("builder"); setIsQuestionHubOpen?.(true); }} />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0"></div>

        {/* Layout View Mode Toggles */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          {setIsFocusReadingMode && (
            <button
              onClick={() => setIsFocusReadingMode(!isFocusReadingMode)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isFocusReadingMode
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="وضع القراءة والتركيز"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {onToggleNav && (
            <button
              onClick={onToggleNav}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isNavCollapsed
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="إظهار / إخفاء شريط المنهج"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {onTogglePreview && (
            <button
              onClick={onTogglePreview}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                !isPreviewCollapsed
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
              }`}
              title="إظهار / إخفاء المعاينة المباشرة"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Main Tab Switcher (محتوى الدرس VS إعداد الصفحة والقالب) */}
      {setActiveMainTab && (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0 mx-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab("content")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeMainTab !== "page_setup"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="محرر محتوى المستند والبطاقات"
          >
            <FileText className="w-4 h-4" />
            <span>محتوى الدرس</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("page_setup")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeMainTab === "page_setup"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="إعدادات الصفحة، الهوامش، الورقة، الهيدر والفوتر والقوالب"
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>إعداد الصفحة والقالب</span>
          </button>
        </div>
      )}

      {/* Left Side (RTL): Cards Zoom & More Options */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Cards Zoom Control (تكبير/تصغير البطاقات) */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1 shadow-2xs">
          <button
            onClick={() => handleCardsZoomChange(currentCardsZoom - 10)}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition cursor-pointer"
            title="تصغير البطاقات (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="relative ribbon-dropdown">
            <button
              onClick={() => toggleMenu("cardsZoom")}
              className="flex items-center gap-0.5 text-[11px] font-black text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
            >
              <span>{currentCardsZoom}%</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {activeMenu === "cardsZoom" && (
              <div className="absolute top-full left-0 mt-1 w-24 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
                {zoomPresets.map((pz) => (
                  <button
                    key={pz}
                    onClick={() => {
                      handleCardsZoomChange(pz);
                      setActiveMenu(null);
                    }}
                    className={`px-3 py-1 text-xs font-bold text-right hover:bg-blue-50 dark:hover:bg-blue-900/40 cursor-pointer ${
                      pz === currentCardsZoom ? "text-blue-600 font-black bg-blue-50/50" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {pz}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleCardsZoomChange(currentCardsZoom + 10)}
            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition cursor-pointer"
            title="تكبير البطاقات (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleCardsZoomChange(100)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            title="إعادة ضبط زوم البطاقات 100%"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* More Actions (...) */}
        <div className="relative ribbon-dropdown">
          <button
            onClick={() => toggleMenu("more")}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="خيارات إضافية"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {activeMenu === "more" && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 flex flex-col z-50 animate-in fade-in zoom-in-95">
              <DropdownItem icon={<FileText className="w-4 h-4" />} text="تصدير Word" onClick={onExportWord} />
              <DropdownItem icon={<FileDown className="w-4 h-4" />} text="تصدير PDF" onClick={onExportPdf} />
              <DropdownItem icon={<Printer className="w-4 h-4" />} text="طباعة" onClick={onPrint} />
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <DropdownItem icon={<Maximize2 className="w-4 h-4" />} text="معاينة ملء الشاشة" onClick={onPreview} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
