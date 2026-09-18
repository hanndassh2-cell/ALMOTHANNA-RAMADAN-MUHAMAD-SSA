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
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  Award,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { SubjectModal, ICON_MAP } from "../components/SubjectModal";
import { UnitModal } from "../components/UnitModal";
import { LessonModal } from "../components/LessonModal";
import { DeleteConfirmationModal, DeleteTargetInfo } from "../components/DeleteConfirmationModal";
import { Subject, Unit, Lesson, Question } from "../../../types";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

interface CurriculumTreeViewProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions?: Question[];
  onSaveSubject: (subject: Subject) => void;
  onDeleteSubject: (id: string) => void;
  onSaveUnit: (unit: Unit) => void;
  onDeleteUnit: (id: string) => void;
  onSaveLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onOpenLessonEditor: (lessonId: string) => void;
  onOpenLessonQuestions?: (subjectId: string, unitId: string, lessonId: string) => void;
}

const normalizeArabicSearch = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

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
    selectedType: null as "subject" | "unit" | "lesson" | null,
    selectedId: null as string | null,
    searchQuery: "",
  }), []);

  const [selectedType, setSelectedType] = useState<"subject" | "unit" | "lesson" | null>(treeSavedUi.selectedType);
  const [selectedId, setSelectedId] = useState<string | null>(treeSavedUi.selectedId);
  const [searchQuery, setSearchQuery] = useState(treeSavedUi.searchQuery || "");

  // Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitDefaultSubjectId, setUnitDefaultSubjectId] = useState<string | undefined>(undefined);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonDefaultUnitId, setLessonDefaultUnitId] = useState<string | undefined>(undefined);
  const [lessonDefaultSubjectId, setLessonDefaultSubjectId] = useState<string | undefined>(undefined);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetInfo | null>(null);

  React.useEffect(() => {
    storage.saveUiState("curriculum_tree_ui", {
      selectedType,
      selectedId,
      searchQuery,
    });
  }, [selectedType, selectedId, searchQuery]);

  // Selection Sanitization based on permissions
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

  // RBAC Permission Helpers
  const canManageCurriculum = useMemo(() => canPerformAction(currentUser, "create", "curriculum"), [currentUser]);
  const canEditCurriculum = useMemo(() => canPerformAction(currentUser, "edit", "curriculum"), [currentUser]);
  const canDeleteCurriculum = useMemo(() => canPerformAction(currentUser, "delete", "curriculum"), [currentUser]);

  const canManageLessons = useMemo(() => canPerformAction(currentUser, "create", "lessons"), [currentUser]);
  const canEditLessons = useMemo(() => canPerformAction(currentUser, "edit", "lessons"), [currentUser]);
  const canDeleteLessons = useMemo(() => canPerformAction(currentUser, "delete", "lessons"), [currentUser]);

  const isSubjectPermitted = (sId?: string) => sId ? canAccessSubject(currentUser, sId) : false;

  // Modals Openers
  const handleOpenAddSubject = () => {
    if (!canManageCurriculum) return;
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    if (!canEditCurriculum || !isSubjectPermitted(subj.id)) return;
    setEditingSubject(subj);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectModal = (savedSubj: Subject) => {
    onSaveSubject(savedSubj);
    setSelectedType("subject");
    setSelectedId(savedSubj.id);
  };

  const handleOpenAddUnit = (subjId?: string) => {
    const sId = subjId || (selectedType === "subject" ? selectedId : null) || allowedSubjects[0]?.id || "";
    if (!canManageCurriculum || !isSubjectPermitted(sId)) return;
    setEditingUnit(null);
    setUnitDefaultSubjectId(sId);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: Unit) => {
    if (!canEditCurriculum || !isSubjectPermitted(unit.subjectId)) return;
    setEditingUnit(unit);
    setUnitDefaultSubjectId(unit.subjectId);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnitModal = (savedUnit: Unit) => {
    onSaveUnit(savedUnit);
    setSelectedType("unit");
    setSelectedId(savedUnit.id);
  };

  const handleOpenAddLesson = (unitId?: string) => {
    const uId = unitId || (selectedType === "unit" ? selectedId : null) || allowedUnits[0]?.id || "";
    const parentUnit = units.find((u) => u.id === uId);
    const sId = parentUnit?.subjectId || (selectedType === "subject" ? selectedId : null) || allowedSubjects[0]?.id || "";
    if (!canManageLessons || !isSubjectPermitted(sId)) return;

    setEditingLesson(null);
    setLessonDefaultUnitId(uId);
    setLessonDefaultSubjectId(sId);
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    if (!canEditLessons || !isSubjectPermitted(lesson.subjectId)) return;
    setEditingLesson(lesson);
    setLessonDefaultUnitId(lesson.unitId);
    setLessonDefaultSubjectId(lesson.subjectId);
    setIsLessonModalOpen(true);
  };

  const handleSaveLessonModal = (savedLesson: Lesson) => {
    onSaveLesson(savedLesson);
    setSelectedType("lesson");
    setSelectedId(savedLesson.id);
  };

  // Safe Deletion Triggers
  const triggerDeleteSubject = (subjId: string) => {
    if (!canDeleteCurriculum || !isSubjectPermitted(subjId)) return;
    const sub = subjects.find((s) => s.id === subjId);
    if (!sub) return;

    const childUnits = units.filter((u) => u && u.subjectId === subjId);
    const childLessons = lessons.filter((l) => l && l.subjectId === subjId);
    const childQuestions = questions.filter((q) => q && q.subjectId === subjId);

    setDeleteTarget({
      type: "subject",
      id: subjId,
      title: sub.name,
      childUnitsCount: childUnits.length,
      childLessonsCount: childLessons.length,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const triggerDeleteUnit = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit || !canDeleteCurriculum || !isSubjectPermitted(unit.subjectId)) return;

    const childLessons = lessons.filter((l) => l && l.unitId === unitId);
    const childQuestions = questions.filter((q) => q && (q.unitId === unitId || childLessons.some((l) => l.id === q.lessonId)));

    setDeleteTarget({
      type: "unit",
      id: unitId,
      title: unit.title,
      childLessonsCount: childLessons.length,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const triggerDeleteLesson = (lessonId: string) => {
    const lesson = lessons.find((l) => l && l.id === lessonId);
    if (!lesson || !canDeleteLessons || !isSubjectPermitted(lesson.subjectId)) return;

    const childQuestions = questions.filter(
      (q) => q && (q.lessonId === lessonId || (Array.isArray(q.lessonIds) && q.lessonIds.includes(lessonId)))
    );

    setDeleteTarget({
      type: "lesson",
      id: lessonId,
      title: lesson.title,
      contentCardsCount: lesson.contentParagraphs?.length || 0,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "subject") {
      onDeleteSubject(deleteTarget.id);
    } else if (deleteTarget.type === "unit") {
      onDeleteUnit(deleteTarget.id);
    } else if (deleteTarget.type === "lesson") {
      onDeleteLesson(deleteTarget.id);
    }
    setSelectedType(null);
    setSelectedId(null);
    setDeleteTarget(null);
  };

  const stats = useMemo(() => {
    return {
      totalSubjects: allowedSubjects.length,
      totalUnits: allowedUnits.length,
      totalLessons: allowedLessons.length,
      totalQuestions: questions.filter((q) => !q.subjectId || allowedSubjects.some((s) => s.id === q.subjectId)).length,
    };
  }, [allowedSubjects, allowedUnits, allowedLessons, questions]);

  const normalizedQuery = normalizeArabicSearch(searchQuery);
  const visibleSubjects = useMemo(() => {
    if (!normalizedQuery) return allowedSubjects;
    return allowedSubjects.filter((subject) => {
      const subjectUnits = allowedUnits.filter((unit) => unit.subjectId === subject.id);
      const subjectLessons = allowedLessons.filter((lesson) => lesson.subjectId === subject.id);
      return [
        subject.name,
        subject.code,
        subject.description,
        ...subjectUnits.map((unit) => unit.title),
        ...subjectLessons.map((lesson) => lesson.title),
      ].some((value) => normalizeArabicSearch(value || "").includes(normalizedQuery));
    });
  }, [allowedSubjects, allowedUnits, allowedLessons, normalizedQuery]);

  const currentSubject = selectedType === "subject"
    ? allowedSubjects.find((subject) => subject.id === selectedId)
    : selectedType === "unit"
      ? allowedSubjects.find((subject) => subject.id === allowedUnits.find((unit) => unit.id === selectedId)?.subjectId)
      : selectedType === "lesson"
        ? allowedSubjects.find((subject) => subject.id === allowedLessons.find((lesson) => lesson.id === selectedId)?.subjectId)
        : undefined;
  const currentUnit = selectedType === "unit"
    ? allowedUnits.find((unit) => unit.id === selectedId)
    : selectedType === "lesson"
      ? allowedUnits.find((unit) => unit.id === allowedLessons.find((lesson) => lesson.id === selectedId)?.unitId)
      : undefined;
  const currentLesson = selectedType === "lesson"
    ? allowedLessons.find((lesson) => lesson.id === selectedId)
    : undefined;

  const openExplorerRoot = () => {
    setSelectedType(null);
    setSelectedId(null);
  };

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

      {/* Unit Modal */}
      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSave={handleSaveUnitModal}
        initialUnit={editingUnit}
        subjects={allowedSubjects}
        defaultSubjectId={unitDefaultSubjectId}
        existingUnitsCount={units.length}
      />

      {/* Lesson Modal */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onSave={handleSaveLessonModal}
        initialLesson={editingLesson}
        units={allowedUnits}
        subjects={allowedSubjects}
        defaultUnitId={lessonDefaultUnitId}
        defaultSubjectId={lessonDefaultSubjectId}
        existingLessonsCount={lessons.length}
      />

      {/* Safe Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        target={deleteTarget}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto w-full mb-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 flex items-center justify-center border border-primary-100 dark:border-primary-800/50">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">مستكشف المناهج</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">انتقل خطوة واحدة في كل مرة: مادة، ثم وحدة، ثم درس.</p>
                  </div>
                </div>

                <nav className="flex items-center gap-1.5 mt-3 text-xs font-bold text-slate-500 overflow-x-auto" aria-label="مسار المنهاج">
                  <button type="button" onClick={openExplorerRoot} className="shrink-0 hover:text-primary-600">المناهج</button>
                  {currentSubject && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <button
                        type="button"
                        onClick={() => { setSelectedType("subject"); setSelectedId(currentSubject.id); }}
                        className={`shrink-0 max-w-[190px] truncate hover:text-primary-600 ${selectedType === "subject" ? "text-slate-900 dark:text-white" : ""}`}
                      >
                        {currentSubject.name}
                      </button>
                    </>
                  )}
                  {currentUnit && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <button
                        type="button"
                        onClick={() => { setSelectedType("unit"); setSelectedId(currentUnit.id); }}
                        className={`shrink-0 max-w-[190px] truncate hover:text-primary-600 ${selectedType === "unit" ? "text-slate-900 dark:text-white" : ""}`}
                      >
                        {currentUnit.title}
                      </button>
                    </>
                  )}
                  {currentLesson && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <span className="shrink-0 max-w-[220px] truncate text-slate-900 dark:text-white">{currentLesson.title}</span>
                    </>
                  )}
                </nav>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:max-w-2xl lg:flex-1 lg:justify-end">
                <div className="relative sm:min-w-[280px] lg:max-w-md lg:flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="ابحث عن مادة أو وحدة أو درس..."
                    value={searchQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchQuery(value);
                      if (value.trim() && selectedType) openExplorerRoot();
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs font-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("refresh-data-all"))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-primary-600 transition"
                  title="تحديث البيانات"
                  aria-label="تحديث البيانات"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {!selectedType && canManageCurriculum && (
                  <button type="button" onClick={handleOpenAddSubject} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة مادة</span>
                  </button>
                )}
                {selectedType === "subject" && currentSubject && canManageCurriculum && (
                  <button type="button" onClick={() => handleOpenAddUnit(currentSubject.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة وحدة</span>
                  </button>
                )}
                {selectedType === "unit" && currentUnit && canManageLessons && (
                  <button type="button" onClick={() => handleOpenAddLesson(currentUnit.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة درس</span>
                  </button>
                )}
                {selectedType === "lesson" && currentLesson && canEditLessons && (
                  <button type="button" onClick={() => onOpenLessonEditor(currentLesson.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Edit2 className="w-4 h-4" /><span>تحرير الدرس</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!selectedType || !selectedId ? (
          <div className="max-w-6xl mx-auto w-full">
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
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
                  <div className="text-3xl font-black text-primary-600 mb-1">{stats.totalQuestions}</div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">سؤال في البنك</div>
                </div>
              </div>

              <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">المواد الدراسية</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">اختر مادة لعرض وحداتها. لا تُعرض الدروس قبل اختيار وحدتها.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-300">{visibleSubjects.length} مواد</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleSubjects.map((subject) => {
                    const SubjectIcon = ICON_MAP[subject.icon] || BookOpen;
                    const subjectUnits = allowedUnits.filter((unit) => unit.subjectId === subject.id);
                    const subjectLessons = allowedLessons.filter((lesson) => lesson.subjectId === subject.id);
                    const subjectQuestions = questions.filter((question) => question.subjectId === subject.id);
                    const color = subject.color || "#2563eb";
                    return (
                      <article
                        key={subject.id}
                        className="group relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-primary-400 hover:shadow-md transition-all overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: color }} />
                        <button
                          type="button"
                          onClick={() => { setSelectedType("subject"); setSelectedId(subject.id); }}
                          className="w-full text-right"
                          aria-label={`فتح مادة ${subject.name}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                              <SubjectIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-slate-900 dark:text-white truncate">{subject.name}</h3>
                                {subject.code && <span className="text-[10px] font-bold text-slate-400">{subject.code}</span>}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-8">{subject.description || "مادة دراسية ضمن المنهاج الأكاديمي."}</p>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-slate-400 mt-1 group-hover:text-primary-600 group-hover:-translate-x-1 transition" />
                          </div>
                        </button>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                          <div><strong className="block text-sm text-slate-900 dark:text-white">{subjectUnits.length}</strong><span className="text-[10px] text-slate-500">وحدات</span></div>
                          <div><strong className="block text-sm text-slate-900 dark:text-white">{subjectLessons.length}</strong><span className="text-[10px] text-slate-500">دروس</span></div>
                          <div><strong className="block text-sm text-slate-900 dark:text-white">{subjectQuestions.length}</strong><span className="text-[10px] text-slate-500">أسئلة</span></div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {visibleSubjects.length === 0 && (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                    لا توجد نتائج مطابقة. جرّب كلمة أخرى أو امسح البحث.
                  </div>
                )}
              </section>
            </div>
            </div>
        ) : (
          <div className="max-w-6xl mx-auto w-full space-y-6">

            {/* SUBJECT VIEW */}
            {selectedType === "subject" && subjects.find((s) => s && s.id === selectedId) && (() => {
              const currentSub = subjects.find((s) => s && s.id === selectedId)!;
              const subUnits = units.filter((u) => u && u.subjectId === selectedId);
              const subLessons = lessons.filter((l) => l && l.subjectId === selectedId);
              const subQuestions = questions.filter((q) => q && q.subjectId === selectedId);
              const SubIconComponent = ICON_MAP[currentSub.icon] || BookOpen;
              const subjColor = currentSub.color || "#2563eb";
              const canEditThisSub = canEditCurriculum && isSubjectPermitted(currentSub.id);
              const canDeleteThisSub = canDeleteCurriculum && isSubjectPermitted(currentSub.id);

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
                            {currentSub.description || "مادة دراسية معتمدة ضمن المنهاج الأكاديمي."}
                          </p>
                        </div>
                      </div>

                      {/* Primary Actions for Subject */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
                        {onOpenLessonQuestions && (
                          <button
                            type="button"
                            onClick={() => onOpenLessonQuestions(currentSub.id, "", "")}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                            title="عرض كافة الأسئلة التابعة لهذه المادة في بنك الأسئلة"
                          >
                            <Target className="w-3.5 h-3.5" />
                            <span>أسئلة المادة ({subQuestions.length})</span>
                          </button>
                        )}

                        {canEditThisSub && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditSubject(currentSub)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل المادة</span>
                          </button>
                        )}

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
                          انقر على أي وحدة لاستعراض دروسها وتعديل محتواها.
                        </p>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      {subUnits.map((unit) => {
                        const unitLessons = lessons.filter((l) => l && l.unitId === unit.id);
                        return (
                          <div
                            key={unit.id}
                            onClick={() => {
                              setSelectedType("unit");
                              setSelectedId(unit.id);
                            }}
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
                        {canManageCurriculum && (
                          <button
                            type="button"
                            onClick={() => handleOpenAddUnit(currentSub.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة أول وحدة تعليمية</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Footer Subject Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                      {canDeleteThisSub ? (
                        <button
                          type="button"
                          onClick={() => triggerDeleteSubject(currentSub.id)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-rose-200 dark:border-rose-900/40"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف المادة الدراسية</span>
                        </button>
                      ) : (
                        <div />
                      )}

                    </div>
                  </div>
                </div>
              );
            })()}

            {/* UNIT VIEW */}
            {selectedType === "unit" && units.find((u) => u && u.id === selectedId) && (() => {
              const currentUnit = units.find((u) => u && u.id === selectedId)!;
              const parentSub = subjects.find((s) => s && s.id === currentUnit.subjectId);
              const unitLessons = lessons.filter((l) => l && l.unitId === currentUnit.id);
              const unitQuestions = questions.filter(
                (q) => q && (q.unitId === currentUnit.id || unitLessons.some((l) => l.id === q.lessonId))
              );
              const canEditThisUnit = canEditCurriculum && isSubjectPermitted(currentUnit.subjectId);
              const canDeleteThisUnit = canDeleteCurriculum && isSubjectPermitted(currentUnit.subjectId);

              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-xs shrink-0">
                        <Folder className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
                            {currentUnit.title}
                          </h2>
                          {currentUnit.code && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                              {currentUnit.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                          <span>المادة الدراسية: {parentSub?.name || "غير محدد"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenLessonQuestions && (
                        <button
                          type="button"
                          onClick={() => onOpenLessonQuestions(currentUnit.subjectId, currentUnit.id, "")}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                          title="استعراض أسئلة هذه الوحدة في بنك الأسئلة"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>أسئلة الوحدة ({unitQuestions.length})</span>
                        </button>
                      )}

                      {canEditThisUnit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditUnit(currentUnit)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل الوحدة</span>
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Description if present */}
                  {currentUnit.description && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {currentUnit.description}
                    </div>
                  )}

                  {/* Lessons List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span>الدروس التعليمية التابعة للوحدة</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        {unitLessons.length} درس
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {unitLessons.map((lesson) => {
                        const lQuestions = questions.filter(
                          (q) => q && (q.lessonId === lesson.id || (Array.isArray(q.lessonIds) && q.lessonIds.includes(lesson.id)))
                        );
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              setSelectedType("lesson");
                              setSelectedId(lesson.id);
                            }}
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
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                      lesson.status === "approved" || lesson.status === "completed"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : lesson.status === "review"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    }`}
                                  >
                                    {lesson.status === "approved" || lesson.status === "completed"
                                      ? "معتمد ومنشور"
                                      : lesson.status === "review"
                                      ? "قيد المراجعة"
                                      : "مسودة"}
                                  </span>
                                  <span>• {lesson.durationMinutes || 45} دقيقة</span>
                                  <span>• {lQuestions.length} أسئلة</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {canEditLessons && isSubjectPermitted(lesson.subjectId) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenLessonEditor(lesson.id);
                                  }}
                                  className="text-xs font-black bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors"
                                >
                                  تحرير الدرس
                                </button>
                              )}
                              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-transform group-hover:-translate-x-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {unitLessons.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        لا توجد دروس مضافة لهذه الوحدة حتى الآن.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    {canDeleteThisUnit ? (
                      <button
                        type="button"
                        onClick={() => triggerDeleteUnit(currentUnit.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-rose-200 dark:border-rose-900/40"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الوحدة</span>
                      </button>
                    ) : (
                      <div />
                    )}

                  </div>
                </div>
              );
            })()}

            {/* LESSON VIEW */}
            {selectedType === "lesson" && lessons.find((l) => l && l.id === selectedId) && (() => {
              const lesson = lessons.find((l) => l && l.id === selectedId)!;
              const lessonQuestions = questions.filter(
                (q) => q && (q.lessonId === lesson.id || (Array.isArray(q.lessonIds) && q.lessonIds.includes(lesson.id)))
              );
              const numParagraphs = lesson?.contentParagraphs?.length || 0;
              const isApproved = lesson?.status === "approved" || lesson?.status === "completed";
              const isReview = lesson?.status === "review";
              const canEditThisLesson = canEditLessons && isSubjectPermitted(lesson.subjectId);
              const canDeleteThisLesson = canDeleteLessons && isSubjectPermitted(lesson.subjectId);

              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center border border-primary-100 dark:border-primary-800/50 shadow-xs shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {lesson?.title}
                          </h2>
                          {lesson?.code && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                              {lesson.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{subjects.find((s) => s && s.id === lesson?.subjectId)?.name}</span>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <Folder className="w-3.5 h-3.5" />
                          <span>{units.find((u) => u && u.id === lesson?.unitId)?.title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canEditThisLesson && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditLesson(lesson)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل البيانات</span>
                        </button>
                      )}

                      {canEditThisLesson && (
                        <button
                          type="button"
                          onClick={() => onOpenLessonEditor(lesson.id)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-xs font-black text-xs cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>تحرير الدرس</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> حالة الدرس
                      </span>
                      <span
                        className={`text-sm font-black ${
                          isApproved
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isReview
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {isApproved ? "معتمد ومنشور ✅" : isReview ? "قيد المراجعة 🔍" : "مسودة 📝"}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> المدة التقديرية
                      </span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                        {lesson?.durationMinutes || 45} <span className="text-xs font-medium">دقيقة</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" /> الفقرات والمحتوى
                      </span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                        {numParagraphs}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-rose-500" /> أسئلة البنك
                      </span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                        {lessonQuestions.length}
                      </span>
                    </div>
                  </div>

                  {/* LINKED QUESTIONS SECTION */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary-600" />
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          الأسئلة المرتبطة بهذا الدرس في بنك الأسئلة ({lessonQuestions.length})
                        </h4>
                      </div>

                      {onOpenLessonQuestions && (
                        <button
                          type="button"
                          onClick={() => onOpenLessonQuestions(lesson.subjectId, lesson.unitId, lesson.id)}
                          className="flex items-center gap-1 text-xs font-black text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline cursor-pointer"
                        >
                          <span>عرض وإدارة في بنك الأسئلة</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {lessonQuestions.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {lessonQuestions.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {q.text?.replace(/<[^>]*>?/gm, "") || "نص السؤال"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-slate-600 dark:text-slate-300">
                                {q.type === "mcq"
                                  ? "اختيار من متعدد"
                                  : q.type === "true_false"
                                  ? "صح / خطأ"
                                  : q.type === "essay"
                                  ? "مقالي"
                                  : "سؤال"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 font-bold text-[10px] text-blue-600 dark:text-blue-300">
                                {q.marks || 1} درجات
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        <p className="font-medium">لا توجد أسئلة مرتبطة بهذا الدرس في بنك الأسئلة حالياً.</p>
                        {onOpenLessonQuestions && (
                          <button
                            type="button"
                            onClick={() => onOpenLessonQuestions(lesson.subjectId, lesson.unitId, lesson.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 rounded-xl font-bold transition cursor-pointer border border-primary-200 dark:border-primary-800 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة أسئلة لهذا الدرس في بنك الأسئلة</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    {canDeleteThisLesson ? (
                      <button
                        type="button"
                        onClick={() => triggerDeleteLesson(lesson.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-rose-200 dark:border-rose-900/40"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الدرس</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {canEditThisLesson && (
                      <button
                        type="button"
                        onClick={() => onOpenLessonEditor(lesson.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح مخطط الدرس</span>
                      </button>
                    )}
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
