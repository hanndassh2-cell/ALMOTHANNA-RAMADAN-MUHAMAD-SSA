import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
"""export async function downloadPdfV2FromElement(
  containerEl: HTMLElement,
  filename: string,
  options?: { orientation?: "portrait" | "landscape", title?: string }
) {""",
"""export async function downloadPdfV2FromElement(
  containerEl: HTMLElement,
  filename: string,
  options?: ExportPdfV2Options
) {""")

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)

