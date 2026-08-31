import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import html2canvas from "html2canvas";
import { sanitizeCssString, sanitizeClonedDocument } from "./colorSanitizer";

export interface ExportPdfOptions {
  title?: string;
  orientation?: "portrait" | "landscape";
  onProgress?: (message: string) => void;
}

export interface ExportImageOptions {
  title?: string;
  orientation?: "portrait" | "landscape";
  pageIndex?: number;
  exportAllPages?: boolean;
  onProgress?: (message: string) => void;
}

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// Cached font CSS to avoid re-fetching on subsequent PDF generations
let cachedFontEmbedCSS: string | null = null;

/**
 * Helper to ensure fonts, KaTeX equations, MathML, and SVG assets are fully rendered in DOM.
 */
async function waitForMathAndFonts(container: HTMLElement): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  if (document.fonts && document.fonts.load) {
    try {
      await Promise.allSettled([
        document.fonts.load("16px KaTeX_Main"),
        document.fonts.load("16px KaTeX_Math"),
        document.fonts.load("16px KaTeX_Size1"),
        document.fonts.load("16px KaTeX_Size2"),
        document.fonts.load("16px KaTeX_AMS"),
      ]);
    } catch {
      // ignore
    }
  }

  const mathEls = container.querySelectorAll(
    ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, svg, math, img"
  );

  mathEls.forEach((el) => {
    const htmlEl = el as HTMLElement;
    void htmlEl.offsetHeight;
    void htmlEl.offsetWidth;
  });

  if (mathEls.length > 0) {
    // Force layout reflow and wait for double frame paint to settle KaTeX font glyph metrics
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 100)));
  }
}

/**
 * Dynamically extract @font-face rules from document style sheets or fetch Google Fonts CSS.
 * Sanitizes external font URLs to prevent SVG image decoding security violations.
 */
async function getFontEmbedCSS(): Promise<string> {
  if (cachedFontEmbedCSS !== null) {
    return cachedFontEmbedCSS;
  }

  let rawCss = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (
            rule.constructor.name === "CSSFontFaceRule" ||
            rule.cssText.startsWith("@font-face") ||
            rule.cssText.includes(".katex")
          ) {
            rawCss += rule.cssText + "\n";
          }
        }
      } catch {
        // Skip cross-origin stylesheets that cannot be read directly due to CORS
      }
    }
  } catch (e) {
    console.warn("Failed to read stylesheets for font embedding:", e);
  }

  if (!rawCss.includes("KaTeX")) {
    try {
      for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))) {
        if (link.href && link.href.includes("katex")) {
          const res = await fetch(link.href, { mode: "cors" });
          if (res.ok) {
            rawCss += (await res.text()) + "\n";
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!rawCss) {
    try {
      const response = await fetch(
        "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap",
        { mode: "cors" }
      );
      if (response.ok) {
        rawCss = await response.text();
      }
    } catch {
      // ignore
    }
  }

  cachedFontEmbedCSS = await sanitizeAndInlineFontCss(rawCss);
  return cachedFontEmbedCSS;
}

/**
 * Sanitizes font CSS by converting external and relative font URLs into base64 Data URIs
 * or stripping URLs that fail to load, preventing SVG foreignObject Image onerror events.
 */
async function sanitizeAndInlineFontCss(css: string): Promise<string> {
  if (!css) return "";

  const urlRegex = /url\((['"]?)([^'"\)\s]+)\1\)/g;
  let match: RegExpExecArray | null;
  const fontUrls = new Set<string>();
  while ((match = urlRegex.exec(css)) !== null) {
    const u = match[2];
    if (u && !u.startsWith("data:")) {
      fontUrls.add(u);
    }
  }

  let inlinedCss = css;
  for (const fontUrl of Array.from(fontUrls)) {
    try {
      let absoluteUrl = fontUrl;
      if (!fontUrl.startsWith("http://") && !fontUrl.startsWith("https://")) {
        absoluteUrl = new URL(fontUrl, document.baseURI).href;
      }

      let res = await fetch(absoluteUrl, { mode: "cors" });

      if (!res.ok && (fontUrl.includes("KaTeX") || absoluteUrl.includes("KaTeX"))) {
        const fontFileName = fontUrl.split("/").pop() || absoluteUrl.split("/").pop();
        if (fontFileName) {
          const cdnUrl = `https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/${fontFileName}`;
          try {
            const cdnRes = await fetch(cdnUrl, { mode: "cors" });
            if (cdnRes.ok) {
              res = cdnRes;
            }
          } catch {
            // ignore
          }
        }
      }

      if (res.ok) {
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        inlinedCss = inlinedCss.replaceAll(fontUrl, base64);
      } else {
        inlinedCss = inlinedCss.replaceAll(fontUrl, absoluteUrl);
      }
    } catch {
      // Keep absolute URL or ignore
    }
  }

  return inlinedCss;
}

/**
 * Inlines all <img> elements inside a container into base64 Data URIs.
 * If an image is broken or blocked by CORS, replaces it with a transparent pixel.
 */
async function inlineAllImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src === "" || img.src.startsWith("data:")) return;

      try {
        // Try canvas draw first if image is already loaded in DOM
        if (img.complete && img.naturalWidth > 0) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              if (dataUrl && dataUrl.length > 100) {
                img.src = dataUrl;
                return;
              }
            }
          } catch {
            // Tainted canvas
          }
        }

        // Try fetch
        const res = await fetch(img.src, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          img.src = base64;
        } else {
          img.src = TRANSPARENT_PIXEL;
        }
      } catch {
        img.src = TRANSPARENT_PIXEL;
      }
    })
  );

  // Background images
  const allEls = Array.from(container.querySelectorAll<HTMLElement>("*"));
  for (const el of allEls) {
    if (el.style && el.style.backgroundImage) {
      const bg = el.style.backgroundImage;
      if (bg.includes("http://") || bg.includes("https://")) {
        const urlMatch = bg.match(/url\((['"]?)(https?:\/\/[^'"]+)\1\)/);
        if (urlMatch && urlMatch[2]) {
          try {
            const res = await fetch(urlMatch[2], { mode: "cors" });
            if (res.ok) {
              const blob = await res.blob();
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              el.style.backgroundImage = `url("${base64}")`;
            } else {
              el.style.backgroundImage = "none";
            }
          } catch {
            el.style.backgroundImage = "none";
          }
        }
      }
    }
  }
}

function ensureReadableTextColorForPrint(element: HTMLElement) {
  const allNodes = Array.from(element.querySelectorAll<HTMLElement>("*"));
  allNodes.push(element);

  allNodes.forEach((el) => {
    // Remove Tailwind dark classes that force light text on dark background
    if (el.classList) {
      el.classList.forEach((cls) => {
        if (cls.startsWith("dark:text-") || cls.startsWith("dark:bg-")) {
          // preserve layout, remove dark overrides for print
        }
      });
    }

    try {
      const computed = window.getComputedStyle(el);
      const color = computed.color;
      // Convert white/light text on light/white background to slate-900 (#0f172a)
      if (
        color === "rgb(255, 255, 255)" ||
        color === "rgba(255, 255, 255, 1)" ||
        color === "rgb(248, 250, 252)" ||
        color === "rgb(241, 245, 249)" ||
        color === "rgb(226, 232, 240)"
      ) {
        const bg = computed.backgroundColor;
        if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || bg === "rgb(255, 255, 255)" || bg === "rgb(248, 250, 252)") {
          el.style.color = "#0f172a";
        }
      }
    } catch {
      // ignore
    }
  });
}

function cleanClonedSheetForPrinting(originalSheet: HTMLElement, clonedSheet: HTMLElement) {
  // Ensure cloned sheet itself is fully visible, not clipped, and has print density optimization
  clonedSheet.classList.remove("hidden", "opacity-0", "pointer-events-none");
  clonedSheet.classList.add("pdf-print-density", "pdf-export-sheet");
  clonedSheet.style.display = "flex";
  clonedSheet.style.opacity = "1";
  clonedSheet.style.visibility = "visible";

  // Ensure math elements, cards, and containers are overflow visible so equations or text aren't clipped
  clonedSheet.querySelectorAll(".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, svg, math, [class*='rounded-'], [class*='bg-slate-50'], .question-renderer-block, .exam-question-item, main, footer").forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = "visible";
    htmlEl.style.overflowX = "visible";
    htmlEl.style.overflowY = "visible";
    htmlEl.style.visibility = "visible";
    htmlEl.style.opacity = "1";
  });

  // Remove .katex-mathml elements completely from clonedSheet so raw TeX string annotations ($A$, $i$, $j$, etc.) don't show up in SVG foreignObject capture
  clonedSheet.querySelectorAll(".katex-mathml").forEach((el) => {
    el.remove();
  });

  // Ensure .katex-html is strictly visible and inline-block
  clonedSheet.querySelectorAll(".katex-html").forEach((el) => {
    (el as HTMLElement).style.setProperty("display", "inline-block", "important");
    (el as HTMLElement).style.setProperty("visibility", "visible", "important");
    (el as HTMLElement).style.setProperty("opacity", "1", "important");
  });

  // Thoroughly remove all non-print elements, buttons, edit controls, overlays, toolbars
  const remainingNoPrints = clonedSheet.querySelectorAll(
    'button, [role="button"], .no-print, .no-pdf, [class*="print:hidden"], [data-no-print="true"], input, select, textarea, .modal, .toolbar, .editor-toolbar'
  );
  remainingNoPrints.forEach((el) => {
    // DO NOT remove math elements, equations, or content cards!
    if (el.closest('.katex, .katex-display, .math-text-container, tiptap-math, [data-type="equation"], math, svg, .question-renderer-block, .editor-card-content, .card-shell-content')) {
      return;
    }
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Strip title attributes from cloned elements to prevent lingering tooltip popups or accidental button removals
  clonedSheet.querySelectorAll('[title]').forEach((el) => {
    el.removeAttribute('title');
  });

  // Strip hover outline / focus / border classes that belong only to editor UI
  clonedSheet.querySelectorAll('*').forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.classList) {
      const classesToRemove: string[] = [];
      htmlEl.classList.forEach((cls) => {
        if (cls.startsWith('hover:') || cls.startsWith('focus:') || cls.startsWith('group-hover:')) {
          classesToRemove.push(cls);
        }
      });
      classesToRemove.forEach((cls) => htmlEl.classList.remove(cls));
    }
  });

  // Unhide non-interactive content elements inside clonedSheet so hidden sub-containers render properly in export
  clonedSheet.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const tag = el.tagName;
    if (tag === "STYLE" || tag === "SCRIPT" || tag === "TEMPLATE" || tag === "LINK" || tag === "HEAD" || tag === "META") {
      return;
    }
    if (el.getAttribute("data-measuring") === "true" || el.closest('[data-measuring="true"]')) {
      return;
    }
    if (el.matches('.no-print, .no-pdf, [class*="print:hidden"], [data-no-print="true"], button, [role="button"], .katex-mathml')) {
      return;
    }
    if (el.classList.contains("hidden")) {
      el.classList.remove("hidden");
    }
    if (el.style.display === "none") {
      el.style.removeProperty("display");
    }
  });

  ensureReadableTextColorForPrint(clonedSheet);
}

function filterPrintElements(node: Node): boolean {
  if (node instanceof HTMLElement) {
    if (
      node.tagName === "BUTTON" ||
      node.classList.contains("no-print") ||
      node.classList.contains("no-pdf") ||
      node.classList.contains("print-modal-toolbar") ||
      node.classList.contains("print-modal-toast") ||
      node.matches('.no-print, .no-pdf, [class*="print:hidden"], [data-no-print="true"]')
    ) {
      return false;
    }
  }
  return true;
}

/**
  * Appends a vector invisible text layer onto the PDF page matching DOM text nodes.
  * This guarantees that all text in the generated PDF is 100% SELECTABLE, SEARCHABLE,
  * and COPYABLE, while keeping exact 1:1 visual fidelity for equations, tables, and images.
  */
function appendSelectableTextLayer(
  pdf: jsPDF,
  clonedSheet: HTMLElement,
  pdfWidthMm: number,
  pdfHeightMm: number
) {
  const sheetRect = clonedSheet.getBoundingClientRect();
  if (!sheetRect || sheetRect.width === 0 || sheetRect.height === 0) return;

  const scaleX = pdfWidthMm / sheetRect.width;
  const scaleY = pdfHeightMm / sheetRect.height;

  const walker = document.createTreeWalker(
    clonedSheet,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (
          parent.closest(
            'script, style, .no-print, .no-pdf, .katex-mathml, button, [role="button"], [class*="print:hidden"], [data-no-print="true"]'
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        const txt = node.nodeValue?.trim();
        if (!txt) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;

    const rawText = node.nodeValue || "";
    if (!rawText.trim()) continue;

    try {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) continue;

      const computedStyle = window.getComputedStyle(parent);
      const fontSizePx = parseFloat(computedStyle.fontSize) || 14;
      const fontSizePt = fontSizePx * 0.75;

      pdf.setFontSize(Math.max(6, Math.min(36, fontSizePt)));

      for (const rect of rects) {
        if (rect.width === 0 || rect.height === 0) continue;

        const xMm = (rect.left - sheetRect.left) * scaleX;
        const yMm = (rect.top - sheetRect.top) * scaleY + fontSizePx * 0.8 * scaleY;

        if (xMm < 0 || xMm > pdfWidthMm || yMm < 0 || yMm > pdfHeightMm) continue;

        pdf.text(rawText, xMm, yMm, {
          renderingMode: "invisible",
        });
      }
    } catch {
      // Fallback if range fails for special node
    }
  }
}

/**
 * Multi-tier robust canvas rendering engine with high performance settings.
 * Guarantees a valid HTMLCanvasElement without throwing unhandled DOM exceptions.
 */
async function renderSheetToCanvas(
  sheet: HTMLElement,
  fontEmbedCSS?: string
): Promise<HTMLCanvasElement> {
  await inlineAllImages(sheet);

  // Attempt 1: html-to-image with embedded fonts (fast 1.5 ratio)
  try {
    const cvs = await htmlToImage.toCanvas(sheet, {
      pixelRatio: 1.5,
      cacheBust: true,
      backgroundColor: "#ffffff",
      fontEmbedCSS: fontEmbedCSS || undefined,
      imagePlaceholder: TRANSPARENT_PIXEL,
      filter: filterPrintElements,
    });
    if (cvs && cvs.width > 0 && cvs.height > 0) {
      return cvs;
    }
  } catch (e) {
    console.warn("html-to-image with fontEmbedCSS failed, attempting skipFonts...", e);
  }

  // Attempt 2: html-to-image with skipFonts
  try {
    const cvs = await htmlToImage.toCanvas(sheet, {
      pixelRatio: 1.5,
      cacheBust: true,
      backgroundColor: "#ffffff",
      skipFonts: true,
      imagePlaceholder: TRANSPARENT_PIXEL,
      filter: filterPrintElements,
    });
    if (cvs && cvs.width > 0 && cvs.height > 0) {
      return cvs;
    }
  } catch (e) {
    console.warn("html-to-image with skipFonts failed, falling back to html2canvas...", e);
  }

  // Attempt 3: html2canvas
  try {
    const cvs = await html2canvas(sheet, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDoc) => {
        sanitizeClonedDocument(clonedDoc);
      },
    });
    if (cvs && cvs.width > 0 && cvs.height > 0) {
      return cvs;
    }
  } catch (e) {
    console.error("html2canvas fallback failed:", e);
  }

  // Attempt 4: Emergency blank canvas
  const emergencyCvs = document.createElement("canvas");
  emergencyCvs.width = 1200;
  emergencyCvs.height = 1700;
  const ctx = emergencyCvs.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, emergencyCvs.width, emergencyCvs.height);
  }
  return emergencyCvs;
}

export async function buildJsPdfInstance(
  containerEl: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<jsPDF> {
  const orientation = options.orientation || "portrait";

  await waitForMathAndFonts(containerEl);

  const fontEmbedCSS = await getFontEmbedCSS();

  let sheets: HTMLElement[] = [];
  const startTime = Date.now();
  while (Date.now() - startTime < 2000) {
    const foundSheets = Array.from(
      containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet")
    ).filter((s) => !s.closest('[data-measuring="true"]'));

    if (foundSheets.length > 0) {
      sheets = foundSheets;
      await new Promise((r) => setTimeout(r, 100));
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (sheets.length === 0) {
    sheets = Array.from(
      containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet")
    );
  }

  if (sheets.length === 0) {
    sheets = [containerEl];
  }

  const pdfWidth = orientation === "landscape" ? 297 : 210;
  const pdfHeight = orientation === "landscape" ? 210 : 297;

  const pdf = new jsPDF({
    orientation: orientation,
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 16,
  });

  pdf.setProperties({
    title: options.title || "مستند إديوتيك",
    subject: "تصدير وطباعة المناهج والاختبارات",
    author: "نظام إديوتيك",
    creator: "jsPDF Engine with Selectable Text",
  });

  const stage = document.createElement("div");
  stage.id = "pdf-export-isolation-stage";
  stage.className = "print-preview-modal-root";
  stage.style.position = "fixed";
  stage.style.top = "-10000px";
  stage.style.left = "-10000px";
  stage.style.zIndex = "-99999";
  stage.style.width = `${pdfWidth}mm`;
  stage.style.height = `${pdfHeight}mm`;
  stage.style.overflow = "hidden";
  stage.style.background = "#ffffff";
  stage.style.color = "#000000";
  stage.style.boxSizing = "border-box";
  stage.style.opacity = "1";
  stage.style.visibility = "visible";
  stage.style.pointerEvents = "none";
  document.body.appendChild(stage);

  try {
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      if (options.onProgress) {
        options.onProgress(`جاري معالجة الصفحة ${i + 1} من ${sheets.length}...`);
      }

      stage.innerHTML = "";
      const clonedSheet = sheet.cloneNode(true) as HTMLElement;

      clonedSheet.style.transform = "none";
      clonedSheet.style.margin = "0";
      clonedSheet.style.position = "relative";
      clonedSheet.style.top = "0";
      clonedSheet.style.left = "0";
      clonedSheet.style.boxShadow = "none";
      clonedSheet.style.border = "none";
      clonedSheet.style.width = `${pdfWidth}mm`;
      clonedSheet.style.minHeight = `${pdfHeight}mm`;
      clonedSheet.style.background = "#ffffff";

      cleanClonedSheetForPrinting(sheet, clonedSheet);

      // Force transparent backgrounds for options and tables in PDF export to avoid gray/blue shading
      const bgElements = clonedSheet.querySelectorAll(
        '.bg-gray-50, .bg-slate-50, .bg-blue-50, .bg-muted, [class*="bg-gray-"], [class*="bg-slate-"], [class*="bg-blue-"], th, td, table, .question-mcq-options div, .question-mcq-options td'
      );
      bgElements.forEach((el) => {
        (el as HTMLElement).style.setProperty("background-color", "transparent", "important");
      });

      const allEls = clonedSheet.querySelectorAll("*");
      allEls.forEach((el) => {
        const hEl = el as HTMLElement;
        if (hEl.style && hEl.style.cssText) {
          hEl.style.cssText = sanitizeCssString(hEl.style.cssText);
        }
      });

      stage.appendChild(clonedSheet);
      await waitForMathAndFonts(clonedSheet);

      const canvas = await renderSheetToCanvas(clonedSheet, fontEmbedCSS);
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      if (i > 0) {
        pdf.addPage("a4", orientation);
      }

      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST"
      );

      // Append selectable text layer for searchability, copying, and text selection
      appendSelectableTextLayer(pdf, clonedSheet, pdfWidth, pdfHeight);
    }
  } finally {
    if (document.body.contains(stage)) {
      document.body.removeChild(stage);
    }
  }

  return pdf;
}

export async function generatePdfFromElement(
  containerEl: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<Blob> {
  const pdf = await buildJsPdfInstance(containerEl, options);
  return pdf.output("blob");
}

export async function downloadPdfFromElement(
  containerEl: HTMLElement,
  fileName: string,
  options: ExportPdfOptions = {}
): Promise<void> {
  const pdf = await buildJsPdfInstance(containerEl, options);
  const cleanName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  pdf.save(cleanName);
}

export async function downloadPngFromElement(
  containerEl: HTMLElement,
  fileName: string,
  options: ExportImageOptions = {}
): Promise<void> {
  const orientation = options.orientation || "portrait";

  await waitForMathAndFonts(containerEl);

  const fontEmbedCSS = await getFontEmbedCSS();

  let sheets: HTMLElement[] = [];
  const startTime = Date.now();
  while (Date.now() - startTime < 2000) {
    const foundSheets = Array.from(
      containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet")
    ).filter((s) => !s.closest('[data-measuring="true"]'));

    if (foundSheets.length > 0) {
      sheets = foundSheets;
      await new Promise((r) => setTimeout(r, 100));
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (sheets.length === 0) {
    sheets = Array.from(containerEl.querySelectorAll<HTMLElement>(".a4-print-sheet"));
  }
  if (sheets.length === 0) {
    sheets = [containerEl];
  }

  const pdfWidth = orientation === "landscape" ? 297 : 210;
  const pdfHeight = orientation === "landscape" ? 210 : 297;

  const stage = document.createElement("div");
  stage.id = "png-export-isolation-stage";
  stage.className = "print-preview-modal-root";
  stage.style.position = "fixed";
  stage.style.top = "-10000px";
  stage.style.left = "-10000px";
  stage.style.zIndex = "-99999";
  stage.style.width = `${pdfWidth}mm`;
  stage.style.height = `${pdfHeight}mm`;
  stage.style.overflow = "hidden";
  stage.style.background = "#ffffff";
  stage.style.color = "#000000";
  stage.style.boxSizing = "border-box";
  stage.style.opacity = "1";
  stage.style.visibility = "visible";
  stage.style.pointerEvents = "none";
  document.body.appendChild(stage);

  try {
    let targets: { sheet: HTMLElement; pageNum: number }[] = [];
    if (options.exportAllPages) {
      targets = sheets.map((sheet, idx) => ({ sheet, pageNum: idx + 1 }));
    } else {
      const idx = options.pageIndex !== undefined ? options.pageIndex : 0;
      const targetSheet = sheets[idx] || sheets[0];
      targets = [{ sheet: targetSheet, pageNum: idx + 1 }];
    }

    const cleanBaseName = fileName.replace(/\.(png|jpg|jpeg|pdf|doc|docx)$/i, "");

    for (let i = 0; i < targets.length; i++) {
      const { sheet, pageNum } = targets[i];
      if (options.onProgress) {
        options.onProgress(`جاري تصدير الصفحة ${pageNum} من ${sheets.length} كصورة عالية الدقة...`);
      }

      stage.innerHTML = "";
      const clonedSheet = sheet.cloneNode(true) as HTMLElement;

      clonedSheet.style.transform = "none";
      clonedSheet.style.margin = "0";
      clonedSheet.style.position = "relative";
      clonedSheet.style.top = "0";
      clonedSheet.style.left = "0";
      clonedSheet.style.boxShadow = "none";
      clonedSheet.style.border = "none";
      clonedSheet.style.width = `${pdfWidth}mm`;
      clonedSheet.style.height = `${pdfHeight}mm`;
      clonedSheet.style.maxHeight = `${pdfHeight}mm`;
      clonedSheet.style.minHeight = `${pdfHeight}mm`;
      clonedSheet.style.boxSizing = "border-box";
      clonedSheet.style.background = "#ffffff";

      cleanClonedSheetForPrinting(sheet, clonedSheet);

      const allEls = clonedSheet.querySelectorAll("*");
      allEls.forEach((el) => {
        const hEl = el as HTMLElement;
        if (hEl.style && hEl.style.cssText) {
          hEl.style.cssText = sanitizeCssString(hEl.style.cssText);
        }
      });

      stage.appendChild(clonedSheet);
      await waitForMathAndFonts(clonedSheet);

      const canvas = await renderSheetToCanvas(clonedSheet, fontEmbedCSS);
      const dataUrl = canvas.toDataURL("image/png");

      const fileTitle = targets.length > 1 || sheets.length > 1
        ? `${cleanBaseName}_صفحة_${pageNum}.png`
        : `${cleanBaseName}.png`;

      const a = document.createElement("a");
      a.download = fileTitle;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (targets.length > 1 && i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  } finally {
    if (document.body.contains(stage)) {
      document.body.removeChild(stage);
    }
  }
}

export function downloadWordFromElement(
  containerEl: HTMLElement,
  fileName: string,
  options: { title?: string } = {}
): void {
  const cleanName = fileName.replace(/\.(doc|docx)$/i, "") + ".doc";
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${options.title || cleanName}</title>
      <style>
        @page { size: A4; margin: 2.5cm 2cm; }
        body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; background: #ffffff; color: #000000; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        td, th { border: 1px solid #cbd5e1; padding: 8px; }
        .question-mcq-options { width: 100%; margin-bottom: 6px; }
        .question-mcq-options table { width: 100%; table-layout: fixed; border-collapse: collapse; }
        .question-mcq-options td { vertical-align: middle; word-break: break-word; overflow-wrap: anywhere; white-space: normal; padding: 4px 6px; }
        .a4-print-sheet { background: #ffffff; padding: 20px; page-break-after: always; }
        .no-print, .no-pdf, button { display: none !important; }
      </style>
    </head>
    <body>
      ${containerEl.innerHTML}
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
