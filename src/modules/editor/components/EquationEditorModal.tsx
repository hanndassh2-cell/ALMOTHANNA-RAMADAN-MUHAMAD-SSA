import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Calculator,
  Sparkles,
  RotateCcw,
  Code2,
  Eye,
  Type,
  Copy,
  Sliders,
  Layers,
  ArrowRight,
  Atom,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreHorizontal
} from "lucide-react";
import "mathlive";
import { MathText, convertMathMLToTeX, convertMathMLInText, convertWordLinearMathToTeX } from "../../../components/MathText";
import { writeToClipboard } from "../../../utils/clipboard";
import { EquationToolbar } from "../../../components/EquationToolbar";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "math-field": React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            ref?: React.Ref<any>;
            style?: React.CSSProperties;
            class?: string;
          },
          HTMLElement
        >;
      }
    }
  }
}

interface EquationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEquation?: string;
  onSave: (equationCode: string) => void;
}

// Visual Quick Insert Buttons for MS Word style ribbon
const QUICK_STRUCTURES = [
  {
    label: "كسر",
    icon: "x/y",
    snippet: "\\frac{#?}{#?}",
    title: "إدراج كسر (بسط ومقام)",
  },
  {
    label: "أس علوي",
    icon: "xⁿ",
    snippet: "#?^{#?}",
    title: "إدراج قوة أو أس علوي",
  },
  {
    label: "دليل سفلي",
    icon: "xₙ",
    snippet: "#?_{#?}",
    title: "إدراج دليل سفلي",
  },
  {
    label: "أس ودليل",
    icon: "xₙⁿ",
    snippet: "#?_{#?}^{#?}",
    title: "إدراج أس ودليل سفلي معاً",
  },
  {
    label: "جذر تربيعي",
    icon: "√x",
    snippet: "\\sqrt{#?}",
    title: "إدراج جذر تربيعي",
  },
  {
    label: "جذر نوني",
    icon: "ⁿ√x",
    snippet: "\\sqrt[#?]{#?}",
    title: "إدراج جذر نوني",
  },
  {
    label: "مصفوفة 2×2",
    icon: "[2×2]",
    snippet: "\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}",
    title: "إدراج مصفوفة قوسية 2x2",
  },
  {
    label: "مصفوفة 3×3",
    icon: "[3×3]",
    snippet: "\\begin{pmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{pmatrix}",
    title: "إدراج مصفوفة قوسية 3x3",
  },
  {
    label: "نظام معادلات",
    icon: "{x,y}",
    snippet: "\\begin{cases} #? & \\text{إذا } #? \\\\ #? & \\text{إذا } #? \\end{cases}",
    title: "إدراج أقواس تفريع ونظام معادلات",
  },
  {
    label: "تكامل",
    icon: "∫",
    snippet: "\\int_{#?}^{#?} #? \\, d#?",
    title: "إدراج تكامل محدود",
  },
  {
    label: "مجموع",
    icon: "∑",
    snippet: "\\sum_{#?}^{#?} #?",
    title: "إدراج رمز المجموع",
  },
  {
    label: "سهم تفاعل",
    icon: "→",
    snippet: "\\xrightarrow{\\Delta}",
    title: "إدراج سهم تفاعل كيميائي حراري",
  },
  {
    label: "تفاعل اتزان",
    icon: "⇌",
    snippet: "\\rightleftharpoons",
    title: "إدراج سهم تفاعل انعكاسي متزن",
  },
];

const QUICK_SYMBOLS = [
  { label: "α", code: "\\alpha" },
  { label: "β", code: "\\beta" },
  { label: "γ", code: "\\gamma" },
  { label: "Δ", code: "\\Delta" },
  { label: "π", code: "\\pi" },
  { label: "θ", code: "\\theta" },
  { label: "λ", code: "\\lambda" },
  { label: "μ", code: "\\mu" },
  { label: "σ", code: "\\sigma" },
  { label: "ω", code: "\\omega" },
  { label: "Ω", code: "\\Omega" },
  { label: "±", code: "\\pm" },
  { label: "×", code: "\\times" },
  { label: "÷", code: "\\div" },
  { label: "≠", code: "\\neq" },
  { label: "≤", code: "\\leq" },
  { label: "≥", code: "\\geq" },
  { label: "≈", code: "\\approx" },
  { label: "∞", code: "\\infty" },
  { label: "→", code: "\\rightarrow" },
  { label: "↑", code: "\\uparrow" },
  { label: "↓", code: "\\downarrow" },
];

const GROUPS = [
  {
    id: 'fractions',
    label: 'كسور وجذور',
    items: [
      QUICK_STRUCTURES[0],
      QUICK_STRUCTURES[4],
      QUICK_STRUCTURES[5],
    ]
  },
  {
    id: 'scripts',
    label: 'أسس وأدلة',
    items: [
      QUICK_STRUCTURES[1],
      QUICK_STRUCTURES[2],
      QUICK_STRUCTURES[3],
    ]
  },
  {
    id: 'matrices',
    label: 'أقواس ومصفوفات',
    items: [
      QUICK_STRUCTURES[8],
      QUICK_STRUCTURES[6],
      QUICK_STRUCTURES[7],
    ]
  },
  {
    id: 'operators',
    label: 'معاملات',
    items: [
      QUICK_STRUCTURES[9],
      QUICK_STRUCTURES[10],
      QUICK_STRUCTURES[11],
      QUICK_STRUCTURES[12],
    ]
  },
  {
    id: 'symbols',
    label: 'رموز',
    items: QUICK_SYMBOLS.map(sym => ({
      label: sym.label,
      icon: sym.label,
      snippet: sym.code,
      title: sym.label
    }))
  }
];

export const EquationEditorModal: React.FC<EquationEditorModalProps> = ({
  isOpen,
  onClose,
  initialEquation = "",
  onSave,
}) => {
  const [displayMode, setDisplayMode] = useState<"inline" | "block">("inline");
  const [equationCode, setEquationCode] = useState("");
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [showCodeView, setShowCodeView] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<{ timestamp: number, latex: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const mathfieldRef = useRef<any>(null);

  // Parse initial equation when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let raw = initialEquation.trim();

    // Check if wrapping dollars exist
    if (raw.startsWith("$$") && raw.endsWith("$$") && raw.length >= 4) {
      setDisplayMode("block");
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith("$") && raw.endsWith("$") && raw.length >= 2) {
      setDisplayMode("inline");
      raw = raw.slice(1, -1).trim();
    } else {
      // Auto detect mode based on structure
      if (
        raw.includes("\\begin{") ||
        raw.includes("\\matrix") ||
        raw.includes("\\bmatrix") ||
        raw.includes("\\pmatrix") ||
        raw.includes("\\vmatrix") ||
        raw.includes("\\cases") ||
        raw.includes("\n")
      ) {
        setDisplayMode("block");
      } else {
        setDisplayMode("inline");
      }
    }

    // Convert Word MathML or Linear math if present
    if (raw.includes("<math") || raw.includes("<omath")) {
      raw = convertMathMLToTeX(raw);
    }
    raw = convertMathMLInText(raw);
    raw = convertWordLinearMathToTeX(raw);

    setEquationCode(raw);
    if (raw) {
      setVersionHistory([{ timestamp: Date.now(), latex: raw }]);
    }
  }, [isOpen, initialEquation]);

  const saveToHistory = (latex: string) => {
    if (!latex) return;
    setVersionHistory(prev => {
      // Don't save if identical to last
      if (prev.length > 0 && prev[prev.length - 1].latex === latex) return prev;
      return [...prev, { timestamp: Date.now(), latex }];
    });
  };

  const autoRepair = () => {
    saveToHistory(equationCode);
    let repaired = equationCode;
    repaired = repaired.replace(/\{([^{}]+)\\over\s+([^{}]+)\}/g, '\\frac{$1}{$2}');
    repaired = repaired.replace(/->/g, '\\rightarrow');
    handleCodeChange(repaired);
    saveToHistory(repaired);
  };

  const revertToHistory = (latex: string) => {
    saveToHistory(equationCode);
    handleCodeChange(latex);
  };

  // Sync state with MathLive field element
  useEffect(() => {
    if (!isOpen) return;

    const mf = mathfieldRef.current;
    if (!mf) return;

    // Configure MathLive Options
    try {
      mf.smartFence = true;
      mf.virtualKeyboardMode = "manual";
      mf.value = equationCode;
    } catch (err) {
      console.error("Error initializing mathfield:", err);
    }

    const handleInput = () => {
      if (mathfieldRef.current) {
        const val = mathfieldRef.current.value || "";
        setEquationCode(val);
      }
    };

    mf.addEventListener("input", handleInput);
    return () => {
      mf.removeEventListener("input", handleInput);
    };
  }, [isOpen]);

  // Update mathfield value if code is edited from text area
  const handleCodeChange = (newCode: string) => {
    setEquationCode(newCode);
    if (mathfieldRef.current) {
      try {
        mathfieldRef.current.value = newCode;
      } catch (e) {
        // ignore parse error during manual typing
      }
    }
  };

  // Insert snippet visually into MathField
  const handleInsertSnippet = (snippet: string) => {
    let cleanSnippet = snippet.trim();
    // Strip wrapping $ or $$ if present
    if (cleanSnippet.startsWith("$$") && cleanSnippet.endsWith("$$")) {
      cleanSnippet = cleanSnippet.slice(2, -2).trim();
    } else if (cleanSnippet.startsWith("$") && cleanSnippet.endsWith("$")) {
      cleanSnippet = cleanSnippet.slice(1, -1).trim();
    }

    const mf = mathfieldRef.current;
    if (mf) {
      try {
        if (typeof mf.insert === "function") {
          mf.insert(cleanSnippet, { format: "latex", focus: true });
        } else if (typeof mf.executeCommand === "function") {
          mf.executeCommand(["insert", cleanSnippet]);
        } else {
          mf.value = (mf.value || "") + " " + cleanSnippet;
        }
        mf.focus();
        setEquationCode(mf.value || "");
      } catch (err) {
        console.error("Error inserting snippet into mathfield:", err);
        handleCodeChange(equationCode + " " + cleanSnippet);
      }
    } else {
      handleCodeChange(equationCode + " " + cleanSnippet);
    }
  };

  const handleSave = () => {
    const mf = mathfieldRef.current;
    const rawVal = mf ? mf.value : equationCode;
    const trimmed = (rawVal || "").trim();

    if (!trimmed) {
      onSave("");
      onClose();
      return;
    }

    // Construct final math string with appropriate dollar delimiters
    let formatted = trimmed;
    if (displayMode === "block") {
      formatted = `$$${trimmed}$$`;
    } else {
      let inlineTrimmed = trimmed
        .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
        .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
        .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
        .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{equation\*?\}/g, "\\end{aligned}");
      formatted = `$${inlineTrimmed}$`;
    }

    onSave(formatted);
    onClose();
  };

  const handleCopyCode = async () => {
    try {
      await writeToClipboard("", equationCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء النسخ");
    }
  };

  if (!isOpen) return null;

  const formattedPreview =
    displayMode === "block" ? `$$${equationCode || "E = mc^2"}$$` : `$${equationCode || "E = mc^2"}$`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden dir-rtl border border-slate-200/80 dark:border-slate-800 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Fixed Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-md shrink-0 select-none sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0f6cbd]/10 dark:bg-blue-500/20 text-[#0f6cbd] dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 leading-tight">
                محرر المعادلات
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#0f6cbd] dark:text-blue-300">
                  Microsoft Word / MathLive
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                قم بإدراج الرموز والصيغ الرياضية والكيميائية بدقة عالية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDisplayMode("inline")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    displayMode === "inline"
                      ? "bg-white dark:bg-slate-800 text-[#0f6cbd] dark:text-blue-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  في السطر
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("block")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    displayMode === "block"
                      ? "bg-white dark:bg-slate-800 text-[#0f6cbd] dark:text-blue-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  مستقل (كتلة)
                </button>
             </div>
             <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                title="إغلاق"
             >
                <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Fixed Ribbon / Toolbar */}
        <div className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex flex-col gap-2 shrink-0 sticky top-[73px] sm:top-[74px] z-10">
          <div className="flex flex-wrap gap-2 items-center">
            {GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setActiveCategory(activeCategory === group.id ? null : group.id);
                  setShowAdvancedToolbar(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors border cursor-pointer ${
                  activeCategory === group.id 
                    ? 'bg-blue-50 border-blue-300 text-[#0f6cbd] dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {group.label}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeCategory === group.id ? 'rotate-180' : ''}`} />
              </button>
            ))}

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <button
              onClick={() => {
                setShowAdvancedToolbar(!showAdvancedToolbar);
                setActiveCategory(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors border cursor-pointer ${
                showAdvancedToolbar
                  ? 'bg-blue-50 border-blue-300 text-[#0f6cbd] dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              المزيد من الرموز
            </button>
          </div>

          {/* Expanded Category Panel */}
          {activeCategory && (
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-1.5 animate-in slide-in-from-top-1 duration-150 max-h-[160px] overflow-y-auto">
              {GROUPS.find(g => g.id === activeCategory)?.items.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertSnippet(item.snippet)}
                  title={item.title}
                  className="flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-slate-600"
                >
                  <span className="font-serif text-base sm:text-lg leading-none mb-0.5">{item.icon}</span>
                  {item.label && activeCategory !== 'symbols' && <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[44px]">{item.label}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Full Advanced Toolbar */}
          {showAdvancedToolbar && (
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-h-[180px] overflow-y-auto animate-in slide-in-from-top-1 duration-150">
              <EquationToolbar onInsert={handleInsertSnippet} />
            </div>
          )}
        </div>

        {/* Scrollable Main Content Area */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto space-y-4 min-h-0">
           {/* Interactive Math Field Canvas */}
           <div className="p-4 sm:p-6 bg-slate-50/80 dark:bg-slate-950/80 rounded-xl border-2 border-slate-200/80 dark:border-slate-800 focus-within:border-[#0f6cbd] dark:focus-within:border-blue-500 transition-colors flex items-center justify-center shadow-inner min-h-[140px]">
              <math-field
                ref={mathfieldRef}
                style={{
                  width: "100%",
                  fontSize: "2.2rem",
                  backgroundColor: "transparent",
                  outline: "none",
                  direction: "ltr",
                  border: "none",
                }}
                class="w-full text-slate-900 dark:text-slate-100 font-serif text-center cursor-text select-text"
              >
                {equationCode}
              </math-field>
           </div>

           {/* Advanced Source Code Area */}
           <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
             <button
               onClick={() => setShowCodeView(!showCodeView)}
               className="w-full px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
             >
               <span className="flex items-center gap-2">
                 <Settings className="w-4 h-4 text-[#0f6cbd]" />
                 متقدم: كود المصدر (LaTeX / MathML)
               </span>
               {showCodeView ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </button>
             
             {showCodeView && (
               <div className="px-4 pb-4 pt-1 space-y-3 animate-in fade-in duration-150">
                 <div className="flex items-center justify-between gap-2 flex-wrap">
                   <span className="text-xs text-slate-500 dark:text-slate-400">يمكنك لصق كود LaTeX أو MathML هنا (مثل المنسوخ من Word):</span>
                   <div className="flex gap-2">
                     <button onClick={handleCopyCode} className="text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 transition cursor-pointer">
                       <Copy className="w-3.5 h-3.5" />
                       {copySuccess ? "تم النسخ!" : "نسخ الكود"}
                     </button>
                     <button onClick={() => handleCodeChange("")} className="text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-600 transition cursor-pointer">
                       <RotateCcw className="w-3.5 h-3.5" />
                       مسح
                     </button>
                   </div>
                 </div>
                 <textarea
                   rows={3}
                   value={equationCode}
                   onChange={(e) => handleCodeChange(e.target.value)}
                   placeholder="أدخل كود LaTeX أو MathML هنا..."
                   className="w-full p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs sm:text-sm [direction:ltr] text-left focus:ring-2 focus:ring-[#0f6cbd]/20 focus:border-[#0f6cbd] outline-none transition"
                 />
               </div>
             )}
           </div>

           {/* Version History Panel */}
           {showHistory && versionHistory.length > 0 && (
             <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden bg-indigo-50/30 dark:bg-indigo-950/30">
               <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/50 flex items-center gap-2">
                 <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                 <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">سجل التعديلات ومقارنة الإصلاحات</h3>
               </div>
               <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                 {versionHistory.map((item, index) => (
                   <div key={index} className="flex flex-col sm:flex-row gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 items-start sm:items-center">
                     <div className="flex-1 overflow-x-auto text-center bg-slate-50 dark:bg-slate-800/50 py-2 rounded">
                       <MathText text={displayMode === "block" ? `$$${item.latex}$$` : `$${item.latex}$`} className="!m-0 text-sm" />
                       <code className="text-[10px] text-slate-400 block mt-2" dir="ltr">{item.latex}</code>
                     </div>
                     <button
                       onClick={() => revertToHistory(item.latex)}
                       className="shrink-0 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
                     >
                       استعادة
                     </button>
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

         {/* Fixed Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/70 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              سجل التعديلات ({versionHistory.length})
            </button>
            <button
              onClick={autoRepair}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-200 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              إصلاح تلقائي
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0f6cbd] hover:bg-[#115ea3] active:bg-[#004e8c] text-white shadow-md flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إدراج المعادلة</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
