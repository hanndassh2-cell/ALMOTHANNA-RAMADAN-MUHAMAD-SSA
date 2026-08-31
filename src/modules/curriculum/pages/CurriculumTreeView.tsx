import React, { useState, useMemo } from "react";
import { storage } from "../../../services/storage";
import {
  FolderTree,
  Plus,
  Search,
  BookOpen,
  Folder,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Target,
  Database,
  Check,
  X,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  Layers,
  Sparkles,
  Award,
  RefreshCw,
} from "lucide-react";
import { UnifiedCurriculumTree } from "../../../components/UnifiedCurriculumTree";
import { ResizableSidebar } from "../../../components/ResizableSidebar";
import { SubjectModal, ICON_MAP } from "../components/SubjectModal";
import { Subject } from "../../../types";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

interface CurriculumTreeViewProps {
  subjects: any[];
  units: any[];
  lessons: any[];
  questions?: any[];
  onSaveSubject: (subject: any) => void;
  onDeleteSubject: (id: string) => void;
  onSaveUnit: (unit: any) => void;
  onDeleteUnit: (id: string) => void;
  onSaveLesson: (lesson: any) => void;
  onDeleteLesson: (id: string) => void;
  onOpenLessonEditor: (lessonId: string) => void;
  onOpenLessonQuestions?: (subjectId: string, unitId: string, lessonId: string) => void;
}

export const CurriculumTreeView: React.FC<CurriculumTreeViewProps> = ({
  subjects,
  units,
  lessons,
  questions = [],
  onSaveSubject,
  onDeleteSubject,
  onSaveUnit,
  onDeleteUnit,
  onSaveLesson,
  onDeleteLesson,
  onOpenLessonEditor,
  onOpenLessonQuestions,
}) => {
  const currentUser = useMemo(() => storage.getCurrentUser(), []);
  const allowedSubjects = useMemo(() => filterAllowedSubjects(currentUser, subjects), [currentUser, subjects]);
  const allowedUnits = useMemo(() => filterAllowedItemsBySubject(currentUser, units), [currentUser, units]);
  const allowedLessons = useMemo(() => filterAllowedItemsBySubject(currentUser, lessons), [currentUser, lessons]);

  const treeSavedUi = useMemo(() => storage.getUiState("curriculum_tree_ui", {
    selectedType: null as "subject"|"unit"|"lesson"|null,
    selectedId: null as string | null,
    searchQuery: "",
  }), []);

  const [selectedType, setSelectedType] = useState<"subject"|"unit"|"lesson"|null>(treeSavedUi.selectedType);
  const [selectedId, setSelectedId] = useState<string | null>(treeSavedUi.selectedId);
  const [searchQuery, setSearchQuery] = useState(treeSavedUi.searchQuery || "");

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  React.useEffect(() => {
    storage.saveUiState("curriculum_tree_ui", {
      selectedType,
      selectedId,
      searchQuery,
    });
  }, [selectedType, selectedId, searchQuery]);

  // Selection Sanitization
  React.useEffect(() => {
    if (selectedType === "subject" && selectedId && !allowedSubjects.some((s) => s.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    } else if (selectedType === "unit" && selectedId && !allowedUnits.some((u) => u.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    } else if (selectedType === "lesson" && selectedId && !allowedLessons.some((l) => l.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    }
  }, [allowedSubjects, allowedUnits, allowedLessons, selectedType, selectedId]);

  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    setEditingSubject(subj);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectModal = (savedSubj: Subject) => {
    onSaveSubject(savedSubj);
    // If it was a new subject or editing current one, select it
    setSelectedType("subject");
    setSelectedId(savedSubj.id);
  };

  const handleAddUnit = (subjId?: string) => {
    const sId = subjId || (selectedType === "subject" ? selectedId : null) || subjects[0]?.id || "subj-1";
    const newUnit = {
      id: "unit-" + Date.now(),
      subjectId: sId,
      title: "وحدة تعليمية جديدة",
      code: `U${units.filter(u => u && u.subjectId === sId).length + 1}`,
      description: "",
      orderIndex: units.length + 1,
      status: "active"
    };
    onSaveUnit(newUnit);
    setSelectedType("unit");
    setSelectedId(newUnit.id);
  };

  const handleAddLesson = (unitId: string) => {
    const unit = units.find(u => u && u.id === unitId);
    const newLesson = {
      id: "lesson-" + Date.now(),
      unitId,
      subjectId: unit?.subjectId || "",
      title: "درس جديد",
      code: `L${lessons.filter(l => l && l.unitId === unitId).length + 1}`,
      description: "",
      durationMinutes: 45,
      orderIndex: lessons.filter(l => l && l.unitId === unitId).length + 1,
      status: "draft",
      contentParagraphs: [],
      objectives: []
    };
    onSaveLesson(newLesson);
    setSelectedType("lesson");
    setSelectedId(newLesson.id);
  };

  const handleDeleteSubjectSafely = (subjId: string) => {
    const childUnits = units.filter(u => u && u.subjectId === subjId);
    const childLessons = lessons.filter(l => l && l.subjectId === subjId);
    const childQuestions = questions.filter(q => q && q.subjectId === subjId);

    const warnMsg = childUnits.length > 0 || childQuestions.length > 0
      ? `تنبيه: هذه المادة تحتوي على (${childUnits.length}) وحدات و (${childLessons.length}) دروس و (${childQuestions.length}) أسئلة مرتبطة بها.\n\nهل أنت متأكد من رغبتك في حذف المادة؟`
      : "هل أنت متأكد من رغبتك في حذف هذه المادة الدراسية؟";

    if (window.confirm(warnMsg)) {
      onDeleteSubject(subjId);
      setSelectedType(null);
      setSelectedId(null);
    }
  };

  const getStats = () => {
    return {
      totalSubjects: subjects.length,
      totalUnits: units.length,
      totalLessons: lessons.length,
      totalQuestions: questions.length
    };
  };

  const stats = getStats();

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleSaveSubjectModal}
        initialSubject={editingSubject}
        existingSubjectsCount={subjects.length}
      />

      {/* Sidebar Tree */}
      <ResizableSidebar storageKey="curriculum_tree_sidebar" position="right" defaultWidth={320} minWidth={260} maxWidth={520}>
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary-600" />
                <span>شجرة المنهاج</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {subjects.length} مواد
                </span>
              </h2>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("refresh-data-all"))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="تحديث البيانات يدوياً من المصدر المركزي"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddSubject}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer shrink-0"
                  title="إضافة مادة دراسية جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة مادة</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في المناهج والوحدات والدروس..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs font-medium focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <UnifiedCurriculumTree
              subjects={allowedSubjects}
              units={allowedUnits}
              lessons={allowedLessons}
              searchQuery={searchQuery}
              selectedUnitId={selectedType === "unit" ? selectedId : undefined}
              selectedLessonId={selectedType === "lesson" ? selectedId : undefined}
              onSelectSubject={(id) => { setSelectedType("subject"); setSelectedId(id); }}
              onSelectUnit={(id) => { setSelectedType("unit"); setSelectedId(id); }}
              onSelectLesson={(id) => { setSelectedType("lesson"); setSelectedId(id); }}
              onAddSubject={handleOpenAddSubject}
              onEditSubject={handleOpenEditSubject}
              onAddUnit={handleAddUnit}
              onAddLesson={handleAddLesson}
              onDeleteSubject={handleDeleteSubjectSafely}
              onDeleteUnit={onDeleteUnit}
              onDeleteLesson={onDeleteLesson}
              onRenameSubject={(id, newTitle) => {
                const s = subjects.find(x => x.id === id);
                if(s) onSaveSubject({...s, name: newTitle});
              }}
              onRenameUnit={(id, newTitle) => {
                const u = units.find(x => x.id === id);
                if(u) onSaveUnit({...u, title: newTitle});
              }}
              onRenameLesson={(id, newTitle) => {
                const l = lessons.find(x => x.id === id);
                if(l) onSaveLesson({...l, title: newTitle});
              }}
            />
          </div>
        </div>
      </ResizableSidebar>

      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
        {!selectedType || !selectedId ? (
          <div className="max-w-3xl mx-auto w-full mt-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-primary-800/40 shadow-xs">
                <FolderTree className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">شجرة المنهاج وتطوير المحتوى الأكاديمي</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 text-sm leading-relaxed font-medium">
                قم بإدارة المواد والوحدات والدروس، أو أضف مواد دراسية جديدة لبناء بنك الأسئلة وتوليد الاختبارات بسهولة.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-8">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-primary-600 mb-1">{stats.totalSubjects}</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مادة دراسية</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-primary-600 mb-1">{stats.totalUnits}</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">وحدة تعليمية</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-primary-600 mb-1">{stats.totalLessons}</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">درس معتمد</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black text-ai-600 mb-1">{stats.totalQuestions}</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">سؤال في البنك</div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenAddSubject}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black transition-all shadow-md hover:shadow-lg cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>إضافة مادة دراسية جديدة</span>
                </button>
                {subjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddUnit()}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Folder className="w-4 h-4 text-primary-500" />
                    <span>إضافة وحدة تعليمية</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Top Quick Navigation & Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 overflow-x-auto py-0.5">
                <button
                  onClick={() => { setSelectedType(null); setSelectedId(null); }}
                  className="hover:text-primary-600 flex items-center gap-1 shrink-0"
                >
                  <FolderTree className="w-4 h-4" />
                  <span>شجرة المنهاج</span>
                </button>

                {selectedType === "subject" && subjects.find(s => s && s.id === selectedId) && (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="text-slate-900 dark:text-white font-black truncate max-w-[200px]">
                      {subjects.find(s => s && s.id === selectedId)?.name}
                    </span>
                  </>
                )}

                {selectedType === "unit" && units.find(u => u && u.id === selectedId) && (() => {
                  const u = units.find(x => x && x.id === selectedId);
                  const parentSub = subjects.find(s => s && s.id === u?.subjectId);
                  return (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      {parentSub && (
                        <button
                          onClick={() => { setSelectedType("subject"); setSelectedId(parentSub.id); }}
                          className="hover:text-primary-600 truncate max-w-[150px]"
                        >
                          {parentSub.name}
                        </button>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      <span className="text-slate-900 dark:text-white font-black truncate max-w-[200px]">
                        {u?.title}
                      </span>
                    </>
                  );
                })()}

                {selectedType === "lesson" && lessons.find(l => l && l.id === selectedId) && (() => {
                  const l = lessons.find(x => x && x.id === selectedId);
                  const parentSub = subjects.find(s => s && s.id === l?.subjectId);
                  const parentUnit = units.find(u => u && u.id === l?.unitId);
                  return (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      {parentSub && (
                        <button
                          onClick={() => { setSelectedType("subject"); setSelectedId(parentSub.id); }}
                          className="hover:text-primary-600 truncate max-w-[120px]"
                        >
                          {parentSub.name}
                        </button>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      {parentUnit && (
                        <button
                          onClick={() => { setSelectedType("unit"); setSelectedId(parentUnit.id); }}
                          className="hover:text-primary-600 truncate max-w-[120px]"
                        >
                          {parentUnit.title}
                        </button>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                      <span className="text-slate-900 dark:text-white font-black truncate max-w-[180px]">
                        {l?.title}
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Fast Add Subject & Add Unit buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddSubject}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>مادة جديدة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUnit(selectedType === "subject" ? selectedId! : undefined)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>وحدة جديدة</span>
                </button>
              </div>
            </div>

            {/* SUBJECT VIEW */}
            {selectedType === "subject" && subjects.find(s => s && s.id === selectedId) && (() => {
              const currentSub = subjects.find(s => s && s.id === selectedId)!;
              const subUnits = units.filter(u => u && u.subjectId === selectedId);
              const subLessons = lessons.filter(l => l && l.subjectId === selectedId);
              const subQuestions = questions.filter(q => q && q.subjectId === selectedId);
              const SubIconComponent = ICON_MAP[currentSub.icon] || BookOpen;
              const subjColor = currentSub.color || "#2563eb";

              return (
                <div className="space-y-6">
                  {/* Subject Hero Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 right-0 h-2.5"
                      style={{ backgroundColor: subjColor }}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                          style={{ backgroundColor: subjColor }}
                        >
                          <SubIconComponent className="w-8 h-8" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                              {currentSub.name}
                            </h2>
                            {currentSub.code && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                                {currentSub.code}
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                                currentSub.status === "active"
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {currentSub.status === "active" ? "نشط ومتاح" : "مؤرشف"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                            {currentSub.description || "لا يوجد وصف مدخل للمادة. يمكنك تعديل بيانات المادة لإضافة وصف وتحديد المعايير."}
                          </p>
                        </div>
                      </div>

                      {/* Primary Actions for Subject */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSubject(currentSub)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل المادة</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenAddSubject}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>مادة جديدة</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid for this Subject */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-blue-500" />
                          <span>الوحدات التعليمية</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {subUnits.length}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-500" />
                          <span>الدروس المعتمدة</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {subLessons.length}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-rose-500" />
                          <span>الأسئلة المرتبطة</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {subQuestions.length}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>الدرجة الكلية</span>
                        </div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {currentSub.totalMarks || 100} <span className="text-xs font-bold text-slate-400">درجة</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Units List */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <Folder className="w-5 h-5 text-primary-600" />
                          <span>الوحدات الدراسية التابعة لمادة ({currentSub.name})</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          انقر على أي وحدة لاستعراض دروسها أو إضافة وحدات جديدة.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddUnit(selectedId!)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-xl text-xs font-black transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة وحدة</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      {subUnits.map(unit => {
                        const unitLessons = lessons.filter(l => l && l.unitId === unit.id);
                        return (
                          <div
                            key={unit.id}
                            onClick={() => { setSelectedType("unit"); setSelectedId(unit.id); }}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer flex items-center justify-between group hover:shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-100 dark:border-blue-900/50">
                                <Folder className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                  {unit.title}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{unitLessons.length} دروس</span>
                                  {unit.code && <span>• {unit.code}</span>}
                                </div>
                              </div>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-transform group-hover:-translate-x-1" />
                          </div>
                        );
                      })}
                    </div>

                    {subUnits.length === 0 && (
                      <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                        <Folder className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500 font-bold">لا توجد وحدات تعليمية مضافة لهذه المادة بعد.</p>
                        <button
                          type="button"
                          onClick={() => handleAddUnit(selectedId!)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة أول وحدة تعليمية</span>
                        </button>
                      </div>
                    )}

                    {/* Footer Subject Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubjectSafely(selectedId!)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-rose-200 dark:border-rose-900/40"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف المادة الدراسية</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddUnit(selectedId!)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة وحدة جديدة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* UNIT VIEW */}
            {selectedType === "unit" && units.find(u => u && u.id === selectedId) && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-xs shrink-0">
                      <Folder className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                        {units.find(u => u && u.id === selectedId)?.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                        <span>المادة الدراسية: {subjects.find(s => s && s.id === units.find(u => u && u.id === selectedId)?.subjectId)?.name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddLesson(selectedId)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة درس</span>
                    </button>
                  </div>
                </div>

                {/* Lessons List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-600" />
                      <span>الدروس التعليمية</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      {lessons.filter(l => l && l.unitId === selectedId).length} درس
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {lessons.filter(l => l && l.unitId === selectedId).map(lesson => (
                      <div
                        key={lesson.id}
                        onClick={() => { setSelectedType("lesson"); setSelectedId(lesson.id); }}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer flex items-center justify-between group hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                              {lesson.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                lesson.status === "approved" || lesson.status === "published" || lesson.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : lesson.status === "review"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                {lesson.status === "approved" || lesson.status === "published" || lesson.status === "completed"
                                  ? "معتمد ومنشور"
                                  : lesson.status === "review"
                                  ? "قيد المراجعة"
                                  : "مسودة"}
                              </span>
                              <span>• {lesson.durationMinutes || 45} دقيقة</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenLessonEditor(lesson.id); }}
                            className="text-xs font-black bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors"
                          >
                            تحرير وتأليف
                          </button>
                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-transform group-hover:-translate-x-1" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {lessons.filter(l => l && l.unitId === selectedId).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                      لا توجد دروس مضافة لهذه الوحدة حتى الآن.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { onDeleteUnit(selectedId); setSelectedType(null); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف الوحدة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddLesson(selectedId)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة درس جديد</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* LESSON VIEW */}
            {selectedType === "lesson" && lessons.find(l => l && l.id === selectedId) && (() => {
              const lesson = lessons.find(l => l && l.id === selectedId);
              const lessonQuestions = questions.filter(q => q && q.lessonId === selectedId);
              const numParagraphs = lesson?.contentParagraphs?.length || 0;
              const isApproved = lesson?.status === "approved" || lesson?.status === "published" || lesson?.status === "completed";
              const isReview = lesson?.status === "review";
              
              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center border border-primary-100 dark:border-primary-800/50 shadow-xs shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                          {lesson?.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{subjects.find(s => s && s.id === lesson?.subjectId)?.name}</span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <Folder className="w-3.5 h-3.5" />
                          <span>{units.find(u => u && u.id === lesson?.unitId)?.title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenLessonEditor(selectedId)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-xs font-black text-xs cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>تحرير وتأليف الدرس</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> حالة الدرس</span>
                      <span className={`text-sm font-black ${
                        isApproved
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isReview
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}>
                        {isApproved
                          ? "معتمد ومنشور ✅"
                          : isReview
                          ? "قيد المراجعة 🔍"
                          : "مسودة 📝"}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> المدة التقديرية</span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                        {lesson?.durationMinutes || 45} <span className="text-xs font-medium">دقيقة</span>
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-500"/> الفقرات والمحتوى</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                        {numParagraphs}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><Target className="w-3.5 h-3.5 text-rose-500"/> أسئلة البنك</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                        {lessonQuestions.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { onDeleteLesson(selectedId); setSelectedType(null); }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف الدرس</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLessonEditor(selectedId)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>فتح محرر ومؤلف الدرس</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
