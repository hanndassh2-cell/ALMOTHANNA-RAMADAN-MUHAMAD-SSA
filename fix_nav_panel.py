import re

with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add states for rename
if "editingId" not in content:
    content = content.replace(
        "const [searchQuery, setSearchQuery] = useState(\"\");",
        "const [searchQuery, setSearchQuery] = useState(\"\");\n  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editValue, setEditValue] = useState(\"\");"
    )

# update title rendering for Unit
old_unit_title = '<span className="truncate">{unit.title}</span>'
new_unit_title = """{editingId === unit.id ? (
                    <input 
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => { /* assume handled by parent or local state */ setEditingId(null); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                           unit.title = editValue; // Mock change, ideally call a prop
                           setEditingId(null);
                        }
                      }}
                      className="bg-white dark:bg-slate-800 text-sm px-1 py-0.5 rounded border border-blue-400 focus:outline-none flex-1 max-w-[120px]"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{unit.title}</span>
                  )}"""

content = content.replace(old_unit_title, new_unit_title)

# update unit rename button
content = content.replace(
    'title="إعادة تسمية"\n                    onClick={(e) => e.stopPropagation()}',
    'title="إعادة تسمية"\n                    onClick={(e) => { e.stopPropagation(); setEditingId(unit.id); setEditValue(unit.title); }}'
)

# update title rendering for Lesson
old_lesson_title = '<span className="truncate max-w-[140px]">\n                            {lesson.title}\n                          </span>'
new_lesson_title = """{editingId === lesson.id ? (
                            <input 
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => setEditingId(null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                   lesson.title = editValue; // Mock change
                                   setEditingId(null);
                                }
                              }}
                              className="bg-white dark:bg-slate-800 text-sm px-1 py-0.5 rounded border border-blue-400 focus:outline-none flex-1 w-full max-w-[130px]"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className="truncate max-w-[140px]">
                              {lesson.title}
                            </span>
                          )}"""
content = content.replace(old_lesson_title, new_lesson_title)

# update lesson rename button
content = content.replace(
    'title="إعادة تسمية"\n                            onClick={(e) => e.stopPropagation()}',
    'title="إعادة تسمية"\n                            onClick={(e) => { e.stopPropagation(); setEditingId(lesson.id); setEditValue(lesson.title); }}'
)

with open("src/modules/editor/components/NavigationPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
