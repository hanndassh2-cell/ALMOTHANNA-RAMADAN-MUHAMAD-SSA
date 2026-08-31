import React from "react";
import { MathText } from "../components/MathText";
import { QuestionRenderer, createAnswerKeyItems } from "../components/QuestionRenderer";
import { PrintTemplate } from "../types";

export interface PrintItem {
  id: string;
  content: React.ReactNode;
}

export const getArabicQuestionLabel = (index: number): string => {
  const labels = [
    "السؤال الأول",
    "السؤال الثاني",
    "السؤال الثالث",
    "السؤال الرابع",
    "السؤال الخامس",
    "السؤال السادس",
    "السؤال السابع",
    "السؤال الثامن",
    "السؤال التاسع",
    "السؤال العاشر",
  ];
  return labels[index - 1] || `السؤال ${index}`;
};

export const getDefaultWordingForType = (type: string): string => {
  switch (type) {
    case "true_false":
      return "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:";
    case "mcq":
      return "اختر الإجابة الصحيحة لكل من الفقرات التالية:";
    case "essay":
      return "أجب عن الأسئلة التالية:";
    case "problem":
      return "حل المسائل التالية:";
    case "definition":
      return "عرّف المصطلحات التالية:";
    case "explain":
    case "reason":
      return "علّل واشرح العبارات التالية:";
    case "fill_blanks":
      return "أكمل الفراغات التالية:";
    case "matching":
      return "صل بين عناصر العمود الأول وما يناسبها في العمود الثاني:";
    case "ordering":
      return "رتب الخطوات التالية ترتيباً صحيحاً:";
    case "diagram_label":
      return "اكتب البيانات المناسبة على الشكل:";
    case "table_query":
      return "أجب عن الأسئلة بناءً على الجدول أو الرسم البياني:";
    case "equation":
      return "اكتب واوزن المعادلات التالية:";
    case "grammar":
      return "أعرب العبارات التالية واستخرج القواعد المطلوبة:";
    case "all":
    default:
      return "أجب عن الأسئلة التالية:";
  }
};

export interface GenerateExamPrintItemsOptions {
  template: PrintTemplate;
  title: string;
  durationMinutes?: number;
  totalMarks?: number;
  showStudentBox?: boolean;
  showInstructions?: boolean;
  instructionsText?: string;
  showGradingTable?: boolean;
  sections?: any[];
  questions: any[]; // Flat array of questions (QuestionSnapshot or full Question object)
  versionQuestions?: any[]; // The specific question order list (e.g. version A questions from the generated exam or document)
  showAnswerKey?: boolean;
  canSwap?: boolean;
  onSwapQuestion?: (questionId: string, sectionId: string) => void;
  onRemoveQuestion?: (questionId: string) => void;
  groupingEnabled?: boolean;
}

/**
 * Shared Print Service / Centralized Exam & Model Print Engine
 * 
 * اجعل نظام المعاينة والطباعة خدمة مركزية (Shared Print Service)، بحيث تستدعي جميع النوافذ 
 * نفس المكون ونفس ملفات التنسيق (CSS/Templates)، ويُمنع إنشاء أي معاينة أو طباعة محلية 
 * داخل أي نافذة مستقبلاً. أي تعديل على قالب الطباعة ينعكس تلقائياً على جميع أجزاء البرنامج.
 */
export function generateExamPrintItems(options: GenerateExamPrintItemsOptions): PrintItem[] {
  const {
    template,
    title,
    durationMinutes,
    totalMarks,
    showStudentBox = true,
    showInstructions = false,
    instructionsText = "",
    showGradingTable = false,
    sections = [],
    questions = [],
    versionQuestions = [],
    showAnswerKey = false,
    canSwap = false,
    onSwapQuestion,
    onRemoveQuestion,
  } = options;

  const items: PrintItem[] = [];

  // Get typography settings
  const typo = template.typography || {
    fontFamily: "'Amiri', serif",
    baseFontSize: 12,
    headingSize: 16,
    studentBoxFontSize: 11,
    questionFontSize: 11,
    optionsFontSize: 10,
    marksFontSize: 10,
    questionSpacing: 12,
  };

  const titleSize = `${typo.headingSize || 16}pt`;
  const studentBoxSize = `${typo.studentBoxFontSize || 11}pt`;
  const questionSize = `${typo.questionFontSize || 11}pt`;
  const optionsSize = `${typo.optionsFontSize || 10}pt`;
  const marksSize = `${typo.marksFontSize || 10}pt`;
  const spacingPx = `${typo.questionSpacing !== undefined ? typo.questionSpacing : 12}px`;
  const optionSpacingPx = `${typo.questionOptionSpacing !== undefined ? typo.questionOptionSpacing : 3}px`;

  // Exam Title Displayed Live on Paper
  items.push({
    id: "header-title",
    content: (
      <div 
        className="text-center font-extrabold my-2 text-slate-900 border-b-2 border-slate-900 pb-1.5"
        style={{ fontSize: titleSize }}
      >
        {title || "وثيقة الاختبار"}
      </div>
    ),
  });

  // Exam Custom Header Additions
  if (showStudentBox) {
    items.push({
      id: "header-student-box",
      content: (
        <div 
          className="border-2 border-slate-900 p-3 rounded-md mb-4 bg-slate-50 student-info-box"
          style={{ fontSize: studentBoxSize }}
        >
          <div className="flex justify-between items-center font-bold w-full gap-x-6 gap-y-2 flex-wrap" style={{ fontSize: studentBoxSize }}>
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <span className="shrink-0" style={{ fontSize: studentBoxSize }}>اسم الطالب:</span>
              <span className="border-b-2 border-dotted border-slate-700 flex-1 min-w-[120px] h-3 inline-block"></span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="shrink-0" style={{ fontSize: studentBoxSize }}>الزمن المحدد:</span>
              <span className="border-b-2 border-dotted border-slate-700 px-2 h-5 flex items-center justify-center min-w-[60px] text-slate-900">
                {durationMinutes ? `${durationMinutes} دقيقة` : "....... دقيقة"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="shrink-0" style={{ fontSize: studentBoxSize }}>الدرجة الكلية:</span>
              <span className="border-b-2 border-dotted border-slate-700 px-2 h-5 flex items-center justify-center min-w-[60px] text-slate-900 font-extrabold">
                {totalMarks ? `${totalMarks} درجة` : "....... درجة"}
              </span>
            </div>
          </div>
        </div>
      ),
    });
  }

  if (showInstructions && instructionsText) {
    items.push({
      id: "header-instructions",
      content: (
        <div className="border-2 border-slate-900 p-4 rounded-md mb-4 bg-white space-y-1 relative mt-6" style={{ fontSize: questionSize }}>
          <div className="absolute -top-3.5 right-4 bg-white px-2 font-bold text-slate-900 border-x-2 border-slate-900" style={{ fontSize: questionSize }}>
            تعليمات وإرشادات هامة:
          </div>
          <div className="text-slate-800 font-medium space-y-1 pt-1" style={{ fontSize: questionSize }}>
            <MathText text={instructionsText} dir="rtl" style={{ fontSize: questionSize }} />
          </div>
        </div>
      ),
    });
  }

  // Use the provided versionQuestions list or fall back to questions list
  const activeQuestionsList = versionQuestions && versionQuestions.length > 0
    ? versionQuestions
    : questions.map((q, idx) => ({
        questionId: q.id || q.questionId,
        allocatedMarks: q.allocatedMarks !== undefined ? q.allocatedMarks : 0,
        sectionId: q.sectionId,
        questionOrder: idx + 1,
      }));

  if (showGradingTable && activeQuestionsList.length > 0) {
    items.push({
      id: "header-grading-table",
      content: (
        <div className="mb-4 overflow-hidden border-2 border-slate-900 rounded-md">
          <table className="w-full text-center border-separate border-spacing-0" style={{ fontSize: studentBoxSize }}>
            <thead>
              <tr className="bg-slate-100 font-bold">
                <td className="border-b-2 border-l-2 border-slate-900 p-1.5 w-28 whitespace-nowrap" style={{ fontSize: studentBoxSize }}>
                  رقم السؤال
                </td>
                {activeQuestionsList.map((_, idx) => (
                  <td
                    key={idx}
                    className="border-b-2 border-l border-slate-900 p-1.5"
                    style={{ fontSize: studentBoxSize }}
                  >
                    {idx + 1}
                  </td>
                ))}
                <td className="border-b-2 border-slate-900 p-1.5 bg-slate-200" style={{ fontSize: studentBoxSize }}>
                  المجموع
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b-2 border-l-2 border-slate-900 p-1.5 font-bold whitespace-nowrap" style={{ fontSize: studentBoxSize }}>
                  الدرجة المخصصة
                </td>
                {activeQuestionsList.map((q, idx) => (
                  <td
                    key={idx}
                    className="border-b-2 border-l border-slate-900 p-1.5 font-semibold text-slate-700"
                    style={{ fontSize: studentBoxSize }}
                  >
                    {q.allocatedMarks}
                  </td>
                ))}
                <td className="border-b-2 border-slate-900 p-1.5 font-bold" style={{ fontSize: studentBoxSize }}>
                  {totalMarks} درجة
                </td>
              </tr>
              <tr>
                <td className="border-r-0 border-l-2 border-slate-900 p-1.5 font-bold whitespace-nowrap" style={{ fontSize: studentBoxSize }}>
                  درجة الطالب
                </td>
                {activeQuestionsList.map((_, idx) => (
                  <td
                    key={idx}
                    className="border-r-0 border-l border-slate-900 p-2 text-slate-300"
                    style={{ fontSize: studentBoxSize }}
                  >
                    .
                  </td>
                ))}
                <td className="border-r-0 border-slate-900 p-2 text-slate-300 bg-slate-50" style={{ fontSize: studentBoxSize }}>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    });
  }

  // Questions List inside Exam Grouped by Section
  if (activeQuestionsList.length > 0) {
    const activeSections = sections && sections.length > 0 
      ? sections 
      : [{ id: "default-sec", title: "", questionType: "all", count: activeQuestionsList.length, markPerQuestion: 1 }];

    activeSections.forEach((sec, secIdx) => {
      const secQuestions = activeQuestionsList.filter(
        (eq) => eq.sectionId === sec.id,
      );

      // fallback grouping if no sections are assigned yet
      const displayQuestions =
        secQuestions.length > 0
          ? secQuestions
          : (sec.id === "default-sec" ? activeQuestionsList : []);

      if (displayQuestions.length === 0) return;

      const secTotalMarks = displayQuestions.reduce(
        (acc, eq) => acc + (eq.allocatedMarks || sec.markPerQuestion || 0),
        0,
      );
      const firstEqMark = displayQuestions[0]?.allocatedMarks || sec.markPerQuestion || 0;
      const formattedFirstEqMark = Number(firstEqMark).toFixed(firstEqMark % 1 === 0 ? 0 : 2);
      const labelName = getArabicQuestionLabel(secIdx + 1);

      if (sec.id !== "default-sec" || sec.title) {
        items.push({
          id: `section-${sec.id}-header`,
          content: (
            <div className="flex justify-between items-center font-extrabold text-slate-900 border-b-2 border-slate-900 pb-1.5 bg-slate-100/90 px-3 py-1.5 rounded-md my-2" style={{ fontSize: questionSize }}>
              <div
                className="flex items-baseline gap-1.5 flex-1"
                style={{ textAlign: sec.textAlign || "right" }}
              >
                <span className="font-black text-blue-900 shrink-0" style={{ fontSize: questionSize }}>
                  {labelName}:
                </span>
                <div
                  className={`leading-snug flex-1 min-w-0 ${
                    sec.isBold !== false ? "font-bold" : "font-normal"
                  } ${sec.isItalic ? "italic" : ""} ${sec.isUnderline ? "underline" : ""}`}
                  style={{
                    fontSize: sec.fontSize || questionSize,
                    fontFamily: sec.fontFamily || undefined,
                    color: sec.textColor || undefined,
                    textAlign: sec.textAlign || "right",
                  }}
                >
                  <MathText
                    text={sec.title || getDefaultWordingForType(sec.questionType)}
                    inline={true}
                    dir="rtl"
                    style={{
                      fontSize: sec.fontSize || questionSize,
                      fontFamily: sec.fontFamily || undefined,
                      color: sec.textColor || undefined,
                      textAlign: sec.textAlign || "right",
                    }}
                  />
                </div>
              </div>
              <span className="font-mono font-black bg-white px-2 py-0.5 rounded border border-slate-300 shrink-0 mr-2" style={{ fontSize: marksSize }}>
                [{secTotalMarks} درجة] - كل فقرة [{formattedFirstEqMark} درجة]
              </span>
            </div>
          ),
        });
      }

      // Extract resolved question objects for this section (1 Question = 1 Independent Block)
      const resolvedQuestions = displayQuestions
        .map((eq) => {
          const q = questions.find((item) => (item.id || item.questionId) === eq.questionId);
          if (!q) return null;
          return {
            ...q,
            allocatedMarks: eq.allocatedMarks || sec.markPerQuestion,
          };
        })
        .filter(Boolean);

      const activeFontFamily = sec.fontFamily || typo.fontFamily || "inherit";

      // Render each question as a strictly independent block (No grouping, no similarity merge)
      resolvedQuestions.forEach((q: any, qIdx: number) => {
        if (!q) return;

        items.push({
          id: `question-${q.id || q.questionId}-${sec.id}-${qIdx}`,
          content: (
            <QuestionRenderer
              question={q}
              questionNumber={qIdx + 1}
              numberFormat="dash"
              allocatedMarks={q.allocatedMarks || sec.markPerQuestion}
              showMarks={false}
              mode="exam-print"
              showAnswerKey={showAnswerKey}
              suppressAnswerBox={showAnswerKey}
              activeFontFamily={activeFontFamily}
              questionSize={questionSize}
              optionsSize={optionsSize}
              marksSize={marksSize}
              spacingPx={spacingPx}
              optionSpacingPx={optionSpacingPx}
              canSwap={canSwap}
              onSwapQuestion={onSwapQuestion ? (qid) => onSwapQuestion(qid, sec.id) : undefined}
              onRemoveQuestion={onRemoveQuestion}
              style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
            />
          ),
        });

        if (showAnswerKey) {
          const ansItems = createAnswerKeyItems(
            q,
            `${q.id || q.questionId}-${sec.id}-${qIdx}`,
            optionsSize,
            activeFontFamily
          );
          items.push(...ansItems);
        }
      });
    });
  }

  return items;
}
