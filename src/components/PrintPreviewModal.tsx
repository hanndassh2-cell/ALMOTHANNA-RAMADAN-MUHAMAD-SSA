import React, { useState, useRef, useEffect, ReactElement } from "react";
import { Info } from "lucide-react";
import { 
  downloadPdfFromElement, 
  downloadWordFromElement, 
  downloadPngFromElement 
} from "../utils/pdfExporter";
import { downloadPdfV2FromElement } from "../utils/pdfV2Exporter";
import { UnifiedPreviewToolbar } from "./UnifiedPreviewToolbar";
import { GridColumnsOption, SubItemNumberingStyle, GroupingDensity } from "../services/groupingEngine";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  extraToolbarContent?: React.ReactNode;
  groupingEnabled?: boolean;
  onGroupingEnabledChange?: (enabled: boolean) => void;
  groupingColumns?: GridColumnsOption;
  onGroupingColumnsChange?: (cols: GridColumnsOption) => void;
  groupingNumberingStyle?: SubItemNumberingStyle;
  onGroupingNumberingStyleChange?: (style: SubItemNumberingStyle) => void;
  groupingDensity?: GroupingDensity;
  onGroupingDensityChange?: (density: GroupingDensity) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  extraToolbarContent,
  groupingEnabled,
  onGroupingEnabledChange,
  groupingColumns,
  onGroupingColumnsChange,
  groupingNumberingStyle,
  onGroupingNumberingStyleChange,
  groupingDensity,
  onGroupingDensityChange,
}) => {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'double'>('single');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const printContentRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Keyboard navigation & Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && viewMode === "single") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === "ArrowRight" && viewMode === "single") {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalPages, viewMode, onClose]);

  // Listen to afterprint event
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setToastMsg(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (!isOpen) return null;

  const getFormattedFileName = (baseName?: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
    return `${baseName || "مستند_اختباري"} - ${dateStr} ${timeStr}`;
  };

  const showNotification = (msg: string, durationMs = 4000) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, durationMs);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = getFormattedFileName(title);
    setIsPrinting(true);
    showNotification("جاري فتح نافذة الطباعة...", 3000);

    setTimeout(() => {
      window.focus();
      window.print();
      
      setTimeout(() => {
        setIsPrinting(false);
        document.title = originalTitle;
      }, 1000);
    }, 350);
  };

  const handleSavePdf = async () => {
    if (!printContentRef.current) return;

    const fileName = getFormattedFileName(title) + '.pdf';
    showNotification("جاري تدقيق المستند وتصدير PDF عالي الدقة مطابق للمعاينة 100%...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const audit = await downloadPdfFromElement(printContentRef.current, fileName, {
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم بنجاح! ${audit?.message || fileName}`, 6000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء إنشاء PDF");
      console.error("PDF export error:", msg);
      showNotification(`❌ تعذر التصدير: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdfV2 = async () => {
    if (!printContentRef.current) return;

    const fileName = `${getFormattedFileName(title)}_نص_حي.pdf`;
    showNotification("جاري تدقيق المستند وتصدير PDF نص حي قابل للبحث والنسخ بدقة عالية...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const audit = await downloadPdfV2FromElement(printContentRef.current, fileName, {
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم بنجاح (PDF نص حي)! ${audit?.message || fileName}`, 6000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء إنشاء PDF V2");
      console.error("[PDF-V2] Export error:", msg);
      showNotification(`❌ تعذر التصدير (PDF نص حي): ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveWord = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title) + '.doc';
    showNotification("جاري تصدير المستند بتنسيق Word...", 3000);
    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      downloadWordFromElement(printContentRef.current, fileName, { title });
      showNotification(`✅ تم تحميل المستند بتنسيق Word (${fileName}) بنجاح!`, 4000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير Word");
      showNotification(`❌ تعذر تصدير Word: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePngCurrentPage = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title);
    showNotification("جاري تصدير الصفحة الحالية كصورة PNG عالية الدقة...", 5000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const audit = await downloadPngFromElement(printContentRef.current, fileName, {
        pageIndex: currentPage - 1,
        exportAllPages: false,
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم تحميل صورة الصفحة (${currentPage}) بنجاح! ${audit?.message || ""}`, 4500);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير الصورة");
      console.error("PNG export error:", msg);
      showNotification(`❌ تعذر تصدير الصورة: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePngAllPages = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title);
    showNotification("جاري تصدير كافة الصفحات كصور PNG عالية الدقة...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const audit = await downloadPngFromElement(printContentRef.current, fileName, {
        exportAllPages: true,
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم تحميل صور جميع الصفحات بنجاح! ${audit?.message || ""}`, 4500);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير الصور");
      console.error("PNG export error:", msg);
      showNotification(`❌ تعذر تصدير الصور: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const content = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<any>, {
        currentPageIndex: (viewMode === 'continuous' || isPrinting) ? undefined : (currentPage - 1),
        overrideOrientation: orientation,
        onPagesChange: (count: number) => {
          setTotalPages((prev) => {
            if (prev !== count) return count;
            return prev;
          });
          setCurrentPage((prev) => {
            if (prev > count) return count || 1;
            return prev;
          });
        },
      });
    }
    return child;
  });

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-200 dark:bg-slate-900 print-preview-modal-root" dir="rtl">
      {/* Dynamic CSS for scoped printing */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all standard page elements outside the modal */
          body > *:not(.print-preview-modal-root) {
            display: none !important;
          }
          /* Hide all toolbar controls, buttons, sidebars, measuring nodes and toasts */
          .print-modal-toolbar,
          .print-modal-toast,
          header, nav, aside, button, [role="button"], .no-print, .no-pdf, [data-no-print="true"], .editor-only-hint, [data-measuring="true"] {
            display: none !important;
          }
          .a4-preview-container > div {
            display: block !important;
          }
          .print-preview-modal-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            background: #ffffff !important;
            z-index: 99999 !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-preview-area {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .print-preview-transform {
            transform: none !important;
            width: 100% !important;
          }
          .a4-print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          /* Ensure KaTeX elements preserve strict LTR direction and isolation in print */
          .katex, .katex *, .katex-display, .katex-display *, .katex-html, .katex-html * {
            direction: ltr !important;
            text-align: left !important;
          }
          .katex {
            direction: ltr !important;
            unicode-bidi: isolate !important;
            display: inline-block !important;
            white-space: nowrap !important;
            vertical-align: middle;
          }
          .katex-display {
            direction: ltr !important;
            unicode-bidi: isolate !important;
            display: block !important;
            text-align: center !important;
          }
          /* MCQ table formatting in print */
          .question-mcq-options {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .question-mcq-options table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .question-mcq-options tr,
          .question-mcq-options td {
            height: auto !important;
            overflow: visible !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            white-space: normal !important;
          }
          .question-mcq-options .katex-display,
          .question-mcq-options .math-block-wrapper,
          .question-mcq-options .katex {
            max-width: 100% !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
          }
        }
      `}</style>

      {/* Standardized Unified Preview Toolbar */}
      <UnifiedPreviewToolbar
        onPrint={handlePrint}
        onExportPdf={handleSavePdf}
        onExportPdfV2={handleSavePdfV2}
        onExportWord={handleSaveWord}
        onExportPngCurrentPage={handleSavePngCurrentPage}
        onExportPngAllPages={handleSavePngAllPages}
        zoom={zoom}
        onZoomChange={setZoom}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        orientation={orientation}
        onOrientationChange={setOrientation}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        groupingEnabled={groupingEnabled}
        onGroupingEnabledChange={onGroupingEnabledChange}
        groupingColumns={groupingColumns}
        onGroupingColumnsChange={onGroupingColumnsChange}
        groupingNumberingStyle={groupingNumberingStyle}
        onGroupingNumberingStyleChange={onGroupingNumberingStyleChange}
        groupingDensity={groupingDensity}
        onGroupingDensityChange={onGroupingDensityChange}
        extraToolbarContent={extraToolbarContent}
        onClose={onClose}
        title={title}
      />

      {/* Floating Guidance Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2.5 print-modal-toast">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Central Document Preview Canvas */}
      <div className="flex-1 overflow-auto flex justify-center print-preview-area custom-scrollbar py-8 px-4" dir="rtl">
        <div className="min-h-full flex items-start justify-center">
          <div
            ref={printContentRef}
            className="flex justify-center"
            style={{ zoom: zoom }}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};
