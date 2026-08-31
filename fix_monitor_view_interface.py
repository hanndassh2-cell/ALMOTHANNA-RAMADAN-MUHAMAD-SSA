with open('src/modules/settings/components/EquationMonitorView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "latex: string;\n  status: 'healthy' | 'needs_fix' | 'failed';",
    "latex: string;\n  originalLatex?: string;\n  status: 'healthy' | 'needs_fix' | 'failed';"
)

with open('src/modules/settings/components/EquationMonitorView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
