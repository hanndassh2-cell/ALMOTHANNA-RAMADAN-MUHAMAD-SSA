import re

with open('src/utils/pdfV2Exporter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

repl = """    } else {
      // Since range.getBoundingClientRect() provides the tight visual bounding box of the text,
      // and we manually reverse RTL text so it renders LTR in jsPDF, 
      // the absolute left coordinate (textX) is always the correct anchor point.
      // Using jsPDF's align:"right" or "center" introduces width calculation errors.
      doc.text(processedText, textX, textY, {
         align: "left"
      });
    }"""

code = re.sub(r'\} else \{\n\s*let cssAlign = style\.textAlign[\s\S]*?\}\n    \}', repl, code)

with open('src/utils/pdfV2Exporter.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print("Removed alignment hacks and anchored to textX")
