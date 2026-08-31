import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the stray return pdf.output("blob") inside renderSheetVectorAndLiveText
code = code.replace(
"""    }
  }

  return pdf.output("blob");
}""",
"""    }
  }
}

export async function generatePdfV2(
  containerEl: HTMLElement,
  options?: ExportPdfV2Options
): Promise<Blob | null> {
  const pdf = new jsPDF({
    orientation: options?.orientation || "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const fonts = await ensureTrueTypeFonts(pdf);
  
  const sheets = Array.from(containerEl.querySelectorAll('.a4-print-sheet')) as HTMLElement[];
  if (sheets.length === 0) return null;

  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) pdf.addPage();
    if (options?.onProgress) {
      options.onProgress(`جاري معالجة الصفحة ${i + 1} من ${sheets.length}...`);
    }
    await renderSheetVectorAndLiveText(sheets[i], pdf, i, fonts, options || {});
  }

  return pdf.output("blob");
}""")

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)

