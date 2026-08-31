import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import html2canvas from "html2canvas";
import { sanitizeCssString, sanitizeClonedDocument } from "./colorSanitizer";

export interface ExportPdfV2Options {
  title?: string;
  orientation?: "portrait" | "landscape";
  scale?: number;
  quality?: number;
  onProgress?: (message: string) => void;
}

// Cached font binary data
let cachedAmiriRegularBase64: string | null = null;
let cachedAmiriBoldBase64: string | null = null;
let cachedCairoRegularBase64: string | null = null;

/**
 * Loads font as binary string from local public assets or CDN fallback
 */
async function loadFontAsBinary(url: string, fallbackUrl?: string): Promise<string | null> {
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const fetchFont = async (fetchUrl: string) => {
    // Add base URI if relative
    const finalUrl = fetchUrl.startsWith("/") && typeof window !== "undefined"
      ? new URL(fetchUrl, window.location.origin).href
      : fetchUrl;
      
    const res = await fetch(finalUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    // Crucial check: Prevent Vite/React SPA fallback from being loaded as a font
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error(`Received HTML instead of a valid font file for ${finalUrl}`);
    }
    
    const buffer = await res.arrayBuffer();
    return arrayBufferToBase64(buffer);
  };

  try {
    return await fetchFont(url);
  } catch (err) {
    console.warn(`[PDF-V2] Primary font URL failed (${url}):`, err);
  }

  if (fallbackUrl) {
    try {
      console.log(`[PDF-V2] Attempting to load fallback font: ${fallbackUrl}`);
      return await fetchFont(fallbackUrl);
    } catch (e) {
      console.warn(`[PDF-V2] Fallback font URL failed (${fallbackUrl}):`, e);
    }
  }

  return null;
}

/**
 * Initializes and registers TrueType fonts with jsPDF for true Arabic & English live text.
 */
async function ensureTrueTypeFonts(doc: jsPDF): Promise<{ hasAmiri: boolean; hasCairo: boolean }> {
  try {
    if (!cachedAmiriRegularBase64) {
      cachedAmiriRegularBase64 = await loadFontAsBinary(
        "/fonts/Amiri-Regular.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf"
      );
    }

    if (!cachedAmiriBoldBase64) {
      cachedAmiriBoldBase64 = await loadFontAsBinary(
        "/fonts/Amiri-Bold.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Bold.ttf"
      );
    }

    if (!cachedCairoRegularBase64) {
      cachedCairoRegularBase64 = await loadFontAsBinary(
        "/fonts/Cairo-Regular.ttf",
        "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf"
      );
    }

    let hasAmiri = false;
    let hasCairo = false;

    if (cachedAmiriRegularBase64) {
      doc.addFileToVFS("Amiri-Regular.ttf", cachedAmiriRegularBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
      hasAmiri = true;
    }

    if (cachedAmiriBoldBase64) {
      doc.addFileToVFS("Amiri-Bold.ttf", cachedAmiriBoldBase64);
      doc.addFont("Amiri-Bold.ttf", "Amiri", "bold");
    }

    if (cachedCairoRegularBase64) {
      doc.addFileToVFS("Cairo-Regular.ttf", cachedCairoRegularBase64);
      doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
      doc.addFont("Cairo-Regular.ttf", "Cairo", "bold");
      hasCairo = true;
    }

    return { hasAmiri, hasCairo };
  } catch (err) {
    console.warn("[PDF-V2] Error loading TrueType fonts into jsPDF:", err);
    return { hasAmiri: false, hasCairo: false };
  }
}

// --- ARABIC RESHAPING & BIDI VECTOR ENGINE ---

const ARABIC_GLYPHS_MAP: Record<number, [number, number, number, number]> = {
  0x0621: [0xfe80, 0xfe80, 0xfe80, 0xfe80], // Hamza
  0x0622: [0xfe81, 0xfe81, 0xfe82, 0xfe82], // Alef with Madda
  0x0623: [0xfe83, 0xfe83, 0xfe84, 0xfe84], // Alef with Hamza Above
  0x0624: [0xfe85, 0xfe85, 0xfe86, 0xfe86], // Waw with Hamza Above
  0x0625: [0xfe87, 0xfe87, 0xfe88, 0xfe88], // Alef with Hamza Below
  0x0626: [0xfe89, 0xfe8b, 0xfe8c, 0xfe8a], // Yeh with Hamza Above
  0x0627: [0xfe8d, 0xfe8d, 0xfe8e, 0xfe8e], // Alef
  0x0628: [0xfe8f, 0xfe91, 0xfe92, 0xfe90], // Beh
  0x0629: [0xfe93, 0xfe93, 0xfe94, 0xfe94], // Teh Marbuta
  0x062a: [0xfe95, 0xfe97, 0xfe98, 0xfe96], // Teh
  0x062b: [0xfe99, 0xfe9b, 0xfe9c, 0xfe9a], // Theh
  0x062c: [0xfe9d, 0xfe9f, 0xfea0, 0xfe9e], // Jeem
  0x062d: [0xfea1, 0xfea3, 0xfea4, 0xfea2], // Hah
  0x062e: [0xfea5, 0xfea7, 0xfea8, 0xfea6], // Khah
  0x062f: [0xfea9, 0xfea9, 0xfeaa, 0xfeaa], // Dal
  0x0630: [0xfeab, 0xfeab, 0xfeac, 0xfeac], // Thal
  0x0631: [0xfead, 0xfead, 0xfeae, 0xfeae], // Reh
  0x0632: [0xfeaf, 0xfeaf, 0xfeb0, 0xfeb0], // Zain
  0x0633: [0xfeb1, 0xfeb3, 0xfeb4, 0xfeb2], // Seen
  0x0634: [0xfeb5, 0xfeb7, 0xfeb8, 0xfeb6], // Sheen
  0x0635: [0xfeb9, 0xfebb, 0xfebc, 0xfeba], // Sad
  0x0636: [0xfebd, 0xfebf, 0xfec0, 0xfebe], // Dad
  0x0637: [0xfec1, 0xfec3, 0xfec4, 0xfec2], // Tah
  0x0638: [0xfec5, 0xfec7, 0xfec8, 0xfec6], // Zah
  0x0639: [0xfec9, 0xfecb, 0xfecc, 0xfeca], // Ain
  0x063a: [0xfecd, 0xfecf, 0xfed0, 0xfece], // Ghain
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640], // Tatweel
  0x0641: [0xfed1, 0xfed3, 0xfed4, 0xfed2], // Feh
  0x0642: [0xfed5, 0xfed7, 0xfed8, 0xfed6], // Qaf
  0x0643: [0xfed9, 0xfedb, 0xfedc, 0xfeda], // Kaf
  0x0644: [0xfedd, 0xfedf, 0xfee0, 0xfede], // Lam
  0x0645: [0xfee1, 0xfee3, 0xfee4, 0xfee2], // Meem
  0x0646: [0xfee5, 0xfee7, 0xfee8, 0xfee6], // Noon
  0x0647: [0xfee9, 0xfeeb, 0xfeec, 0xfeea], // Heh
  0x0648: [0xfeed, 0xfeed, 0xfeee, 0xfeee], // Waw
  0x0649: [0xfeef, 0xfeef, 0xfef0, 0xfef0], // Alef Maksura
  0x064a: [0xfef1, 0xfef3, 0xfef4, 0xfef2], // Yeh
  // Persian / Urdu extensions
  0x067e: [0xfb56, 0xfb58, 0xfb59, 0xfb57], // Peh
  0x0686: [0xfb7a, 0xfb7c, 0xfb7d, 0xfb7b], // Tcheh
  0x0698: [0xfb8a, 0xfb8a, 0xfb8b, 0xfb8b], // Jeh
  0x06af: [0xfb92, 0xfb94, 0xfb95, 0xfb93], // Gaf
};

const RIGHT_JOINING_CHARS = new Set([
  0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629, 0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649,
  0x0698,
]);

const ARABIC_TASHKEEL_REGEX = /[\u064B-\u0652\u0670\u0640]/g;

function isArabicCharCode(code: number): boolean {
  return (
    (code >= 0x0600 && code <= 0x06ff) ||
    (code >= 0x0750 && code <= 0x077f) ||
    (code >= 0x08a0 && code <= 0x08ff) ||
    (code >= 0xfb50 && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  );
}

function hasArabicText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isArabicCharCode(text.charCodeAt(i))) return true;
  }
  return false;
}

/**
 * Converts raw Arabic Unicode string into shaped presentation forms (isolated, initial, medial, final)
 * including all Lam-Alef ligatures.
 */
export function reshapeArabicString(text: string): string {
  if (!text || !hasArabicText(text)) return text;

  const cleanText = text.replace(ARABIC_TASHKEEL_REGEX, "");
  const chars: { code: number; isShaped: boolean }[] = [];

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i);

    // Combine Lam-Alef ligatures
    if (code === 0x0644 && i + 1 < cleanText.length) {
      const nextCode = cleanText.charCodeAt(i + 1);
      let lamAlef: [number, number] | null = null;
      if (nextCode === 0x0622) lamAlef = [0xfef5, 0xfef6];
      else if (nextCode === 0x0623) lamAlef = [0xfef7, 0xfef8];
      else if (nextCode === 0x0625) lamAlef = [0xfef9, 0xfefa];
      else if (nextCode === 0x0627) lamAlef = [0xfefb, 0xfefc];

      if (lamAlef) {
        const prevCode = chars.length > 0 ? chars[chars.length - 1].code : null;
        const prevConnects =
          prevCode !== null &&
          ARABIC_GLYPHS_MAP[prevCode] &&
          !RIGHT_JOINING_CHARS.has(prevCode);
        const glyph = prevConnects ? lamAlef[1] : lamAlef[0];
        chars.push({ code: glyph, isShaped: true });
        i++;
        continue;
      }
    }

    chars.push({ code, isShaped: false });
  }

  const resultCodes: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const cur = chars[i];
    if (cur.isShaped || !ARABIC_GLYPHS_MAP[cur.code]) {
      resultCodes.push(cur.code);
      continue;
    }

    const prev = i > 0 ? chars[i - 1] : null;
    const next = i + 1 < chars.length ? chars[i + 1] : null;

    const prevConnects =
      prev !== null &&
      !prev.isShaped &&
      ARABIC_GLYPHS_MAP[prev.code] &&
      !RIGHT_JOINING_CHARS.has(prev.code);
    const nextConnects =
      next !== null &&
      !next.isShaped &&
      ARABIC_GLYPHS_MAP[next.code] &&
      cur.code !== 0x0621;

    let pos = 0; // isolated
    if (prevConnects && nextConnects && !RIGHT_JOINING_CHARS.has(cur.code)) {
      pos = 2; // medial
    } else if (prevConnects) {
      pos = 3; // final
    } else if (nextConnects && !RIGHT_JOINING_CHARS.has(cur.code)) {
      pos = 1; // initial
    } else {
      pos = 0; // isolated
    }

    const mapped = ARABIC_GLYPHS_MAP[cur.code][pos];
    resultCodes.push(mapped);
  }

  return String.fromCharCode(...resultCodes);
}

/**
 * Reorders mixed BiDi runs (Arabic words, English terms, numbers, brackets)
 * so that when placed with PDF vector text coordinates, characters render in visual order
 * while remaining fully copyable and searchable.
 */
export function formatBidiTextForVectorPdf(text: string, isRtlContext: boolean = true): string {
  if (!text) return "";
  if (!isRtlContext && !hasArabicText(text)) return text;

  // Split into Arabic runs vs Non-Arabic runs (Latin, digits, symbols)
  const tokens =
    text.match(
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g
    ) || [text];

  const processedRuns: string[] = [];

  for (const token of tokens) {
    if (hasArabicText(token)) {
      const shaped = reshapeArabicString(token);
      // In visual PDF right-to-left placement, reverse Arabic character order
      const reversedArabic = [...shaped].reverse().join("");
      processedRuns.push(reversedArabic);
    } else {
      // Non-Arabic (English / numbers) stays in forward LTR order
      let norm = token;
      // Invert parentheses for visual RTL stream
      if (isRtlContext) {
        norm = norm
          .replace(/\(/g, "__TEMP_OPEN__")
          .replace(/\)/g, "(")
          .replace(/__TEMP_OPEN__/g, ")")
          .replace(/\[/g, "__TEMP_BOPEN__")
          .replace(/\]/g, "[")
          .replace(/__TEMP_BOPEN__/g, "]")
          .replace(/\{/g, "__TEMP_COPEN__")
          .replace(/\}/g, "{")
          .replace(/__TEMP_COPEN__/g, "}");
      }
      processedRuns.push(norm);
    }
  }

  if (isRtlContext) {
    // In RTL lines, token runs flow from right to left
    return processedRuns.reverse().join("");
  }

  return processedRuns.join("");
}

// --- COLOR & GEOMETRY UTILITIES ---

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const _colorCache = new Map<string, ParsedColor | null>();
let _sharedCtx: CanvasRenderingContext2D | null = null;

function parseColorToRgb(colorStr: string): ParsedColor | null {
  if (!colorStr || colorStr === "transparent" || colorStr === "inherit" || colorStr === "initial" || colorStr === "none" || colorStr === "rgba(0, 0, 0, 0)") {
    return null;
  }
  if (_colorCache.has(colorStr)) return _colorCache.get(colorStr) || null;

  const rgbMatch = colorStr.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    const res = {
      r: Math.round(parseFloat(rgbMatch[1])),
      g: Math.round(parseFloat(rgbMatch[2])),
      b: Math.round(parseFloat(rgbMatch[3])),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    };
    _colorCache.set(colorStr, res);
    return res;
  }

  if (!_sharedCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    _sharedCtx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!_sharedCtx) return null;

  _sharedCtx.clearRect(0, 0, 1, 1);
  _sharedCtx.fillStyle = colorStr;
  _sharedCtx.fillRect(0, 0, 1, 1);
  const data = _sharedCtx.getImageData(0, 0, 1, 1).data;
  
  if (data[3] === 0) {
    _colorCache.set(colorStr, null);
    return null;
  }
  
  const res = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
  _colorCache.set(colorStr, res);
  return res;
}

/**
 * Stabilizes all math equations, KaTeX layouts, and fonts in the DOM container before PDF creation.
 */
async function waitForMathAndFontsV2(container: HTMLElement): Promise<void> {
  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch {}
  }
  
  // 2. Wait for all images
  const newImgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(newImgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
  
  // 3. Wait for KaTeX to finish rendering (if there are math elements)
  await new Promise(resolve => setTimeout(resolve, 500)); // Fixed buffer for React renders
  
  // 4. Next Animation Frames to ensure DOM is visually settled
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // ignore
    }
  }

  // 2. Wait for all images to load
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // 3. Force reflow for Math/KaTeX and wait
  const mathEls = container.querySelectorAll(
    ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, svg, math, img"
  );

  mathEls.forEach((el) => {
    const htmlEl = el as HTMLElement;
    void htmlEl.offsetHeight;
    void htmlEl.offsetWidth;
  });

  // Give DOM and KaTeX plenty of time to stabilize
  await new Promise((resolve) => setTimeout(resolve, 800));
}

// --- VECTOR + LIVE TEXT SHEET RENDERER ---

async function renderSheetVectorAndLiveText(
  sheet: HTMLElement,
  doc: jsPDF,
  pageIndex: number,
  fonts: { hasAmiri: boolean; hasCairo: boolean },
  options: ExportPdfV2Options
): Promise<void> {
  const orientation = options.orientation || "portrait";
  const pdfWidthMm = orientation === "landscape" ? 297 : 210;
  const pdfHeightMm = orientation === "landscape" ? 210 : 297;

  if (pageIndex > 0) {
    doc.addPage("a4", orientation);
  }

  const sheetRect = sheet.getBoundingClientRect();

  if (sheetRect.width <= 0 || sheetRect.height <= 0) return;

  const scaleX = pdfWidthMm / sheetRect.width;
  const scaleY = pdfHeightMm / sheetRect.height;

  // 1. RENDER VECTOR BACKGROUND & DECORATIVE BORDERS
  const allContainers = Array.from(
    sheet.querySelectorAll<HTMLElement>(
      "*"
    )
  );

  // 3. IDENTIFY MATH ELEMENTS FIRST TO SKIP THEM IN VECTOR RENDER
  const mathNodes = new Set<Node>();
  const specialMathEls = Array.from(
    sheet.querySelectorAll<HTMLElement>(
      ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, .math-block-wrapper"
    )
  );
  for (const mathEl of specialMathEls) {
    if (mathEl.getBoundingClientRect().height > 500) {
      console.log("HUGE MATH EL:", mathEl.className, mathEl.tagName, mathEl.getBoundingClientRect());
    }
    mathEl.querySelectorAll("*").forEach((n) => mathNodes.add(n));
    mathNodes.add(mathEl);
  }

  for (const el of allContainers) {
    if (mathNodes.has(el)) continue; // Skip vector backgrounds/borders for math elements as they are rendered via html2canvas
    
    /* removed no-print skip */
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (rect.width <= 0 || rect.height <= 0) {
      if (el.tagName !== "DIV" && el.tagName !== "SPAN" && el.tagName !== "P") continue;
    }

    const x = (rect.left - sheetRect.left) * scaleX;
    const y = (rect.top - sheetRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;




            
        if (el.tagName === "LI") {
      const listStyle = style.listStyleType;
      if (listStyle !== "none") {
        const bulletX = (rect.left - sheetRect.left - 4) * scaleX;
        const bulletY = (rect.top - sheetRect.top + 8) * scaleY;
        const parentDir = style.direction || (el.closest("[dir]")?.getAttribute("dir") ?? "rtl");
        
        doc.setFillColor(0, 0, 0);
        
        if (listStyle === "disc" || listStyle === "circle") {
           doc.circle(parentDir === "rtl" ? bulletX + w + 8 : bulletX, bulletY, 1, listStyle === "disc" ? "F" : "S");
        } else if (listStyle === "square") {
           doc.rect(parentDir === "rtl" ? bulletX + w + 8 - 1 : bulletX - 1, bulletY - 1, 2, 2, "F");
        } else if (listStyle === "decimal") {
           // extract list item index
           let index = 1;
           if (el.parentElement instanceof HTMLOListElement) {
              const children = Array.from(el.parentElement.children);
              index = children.indexOf(el) + 1;
           }
           doc.setFontSize(10);
           doc.setTextColor(0, 0, 0);
           doc.text(index + ".", parentDir === "rtl" ? bulletX + w + 8 : bulletX - 4, bulletY + 1);
        }
      }
    }

        const bg = parseColorToRgb(style.backgroundColor);
    if (bg && bg.a > 0.05 && !(bg.r > 250 && bg.g > 250 && bg.b > 250)) {
      doc.setFillColor(bg.r, bg.g, bg.b);
      doc.rect(x, y, w, h, "F");
    }

    // Borders
    const bTopW = parseFloat(style.borderTopWidth) || 0;
    if (el.classList.contains("student-info-box")) {
      console.log("student-info-box border:", {
        bTopW, bBotW: parseFloat(style.borderBottomWidth),
        topColor: style.borderTopColor,
        parsed: parseColorToRgb(style.borderTopColor)
      });
    }
    const bBotW = parseFloat(style.borderBottomWidth) || 0;
    const bLeftW = parseFloat(style.borderLeftWidth) || 0;
    const bRightW = parseFloat(style.borderRightWidth) || 0;

    const bTopColor = parseColorToRgb(style.borderTopColor);
    if (bTopW > 0 && bTopColor) {
      doc.setDrawColor(bTopColor.r, bTopColor.g, bTopColor.b);
      doc.setLineWidth(Math.max(0.15, bTopW * scaleY * 0.75));
      doc.line(x, y, x + w, y);
    }
    if (bBotW > 0) {
      const bColor = parseColorToRgb(style.borderBottomColor) || bTopColor;
      if (bColor) {
        doc.setDrawColor(bColor.r, bColor.g, bColor.b);
        doc.setLineWidth(Math.max(0.15, bBotW * scaleY * 0.75));
        doc.line(x, y + h, x + w, y + h);
      }
    }
    if (bLeftW > 0) {
      const bColor = parseColorToRgb(style.borderLeftColor) || bTopColor;
      if (bColor) {
        doc.setDrawColor(bColor.r, bColor.g, bColor.b);
        doc.setLineWidth(Math.max(0.15, bLeftW * scaleX * 0.75));
        doc.line(x, y, x, y + h);
      }
    }
    if (bRightW > 0) {
      const bColor = parseColorToRgb(style.borderRightColor) || bTopColor;
      if (bColor) {
        doc.setDrawColor(bColor.r, bColor.g, bColor.b);
        doc.setLineWidth(Math.max(0.15, bRightW * scaleX * 0.75));
        doc.line(x + w, y, x + w, y + h);
      }
    }
  }

  // 2. RENDER WATERMARK IF PRESENT (Native Rotated Vector)
  const watermarkEls = sheet.querySelectorAll<HTMLElement>(".exam-watermark, [class*='watermark']");
  watermarkEls.forEach((wm) => {
    const wmText = wm.innerText?.trim();
    if (wmText) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
      doc.setFont(fonts.hasCairo ? "Cairo" : fonts.hasAmiri ? "Amiri" : "helvetica", "bold");
      doc.setFontSize(38);
      doc.setTextColor(100, 116, 139);
      const shapedWm = formatBidiTextForVectorPdf(wmText, true);
      doc.text(shapedWm, pdfWidthMm / 2, pdfHeightMm / 2, {
        align: "center",
        angle: 45,
      });
      doc.restoreGraphicsState();
    }
  });

  // 3. RENDER SPECIAL ISOLATED ELEMENTS (KaTeX Math, Matrices, SVGs, Images)

  for (const mathEl of specialMathEls) {
    // Record all child nodes so they aren't duplicated as plain text
    mathEl.querySelectorAll("*").forEach((n) => mathNodes.add(n));
    mathNodes.add(mathEl);

    const mRect = mathEl.getBoundingClientRect();
    if (mRect.width <= 0 || mRect.height <= 0) continue;

    const mx = (mRect.left - sheetRect.left) * scaleX;
    const my = (mRect.top - sheetRect.top) * scaleY;
    const mw = mRect.width * scaleX;
    const mh = mRect.height * scaleY;

    try {
      // Render crisp isolated math snippet
      const mathDataUrl = await htmlToImage.toPng(mathEl, {
        pixelRatio: 3.5,
        backgroundColor: "transparent",
        skipFonts: false,
      });
      if (mathDataUrl && mathDataUrl.length > 50) {
        doc.addImage(mathDataUrl, "PNG", mx, my, mw, mh, undefined, "FAST");
      }
    } catch {
      // Math render fallback
      try {
        const cvs = await html2canvas(mathEl, {
          scale: 3,
          backgroundColor: null,
          logging: false,
        });
        const dUrl = cvs.toDataURL("image/png");
        doc.addImage(dUrl, "PNG", mx, my, mw, mh, undefined, "FAST");
      } catch (e) {
        console.warn("[PDF-V2] Math snippet render error:", e);
      }
    }
  }

  // 4. RENDER STANDALONE IMAGES & NON-MATH SVGS
  const imagesAndSvgs = Array.from(
    sheet.querySelectorAll<HTMLElement>("img, svg:not(.katex svg)")
  );

  for (const el of imagesAndSvgs) {
    if (mathNodes.has(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const x = (rect.left - sheetRect.left) * scaleX;
    const y = (rect.top - sheetRect.top) * scaleY;
    const w = rect.width * scaleX;
    const h = rect.height * scaleY;

                
    if (el.tagName === "IMG") {
      const img = el as HTMLImageElement;
      if (img.src && img.complete && img.naturalWidth > 0) {
        try {
          doc.addImage(img.src, "JPEG", x, y, w, h, undefined, "FAST");
        } catch {
          // ignore cross-origin img errors
        }
      }
    } else {
      try {
        const svgDataUrl = await htmlToImage.toPng(el, {
          pixelRatio: 3,
          backgroundColor: "transparent",
        });
        if (svgDataUrl) {
          doc.addImage(svgDataUrl, "PNG", x, y, w, h, undefined, "FAST");
        }
      } catch {
        // ignore
      }
    }
  }

  // 5. RENDER LIVE SELECTABLE / SEARCHABLE / COPYABLE VECTOR TEXT
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      if (
        mathNodes.has(node) ||
        mathNodes.has(parent) ||
        parent.closest(".katex") ||
        
        
        parent.closest("button") ||
        parent.tagName === "BUTTON" ||
        parent.tagName === "STYLE" ||
        parent.tagName === "SCRIPT"
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Node[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const textNode of textNodes) {
    const parentEl = textNode.parentElement;
    if (!parentEl) continue;

    const textContent = textNode.nodeValue?.trim();
    if (!textContent) continue;

    const range = document.createRange();
    range.selectNodeContents(textNode);
        let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
       rect = parentEl.getBoundingClientRect();
    }

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    if (rect.width === 0 && rect.height === 0) continue;
    

    const isArabic = hasArabicText(textContent);
    const parentDir = style.direction || (parentEl.closest("[dir]")?.getAttribute("dir") ?? "rtl");
    const isRtl = parentDir === "rtl" || isArabic;

    // Font selection & sizing
    const isBold = parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === "bold";
    let selectedFont = "helvetica";
    if (isArabic || fonts.hasCairo || fonts.hasAmiri) {
      if (style.fontFamily.toLowerCase().includes("cairo") && fonts.hasCairo) {
        selectedFont = "Cairo";
      } else if (fonts.hasAmiri) {
        selectedFont = "Amiri";
      } else if (fonts.hasCairo) {
        selectedFont = "Cairo";
      }
    }

    doc.setFont(selectedFont, isBold ? "bold" : "normal");

    const rawFontSizePx = parseFloat(style.fontSize) || 14;
    // Map CSS px to PDF pt accurately
    const fontSizePt = Math.max(6, Math.min(48, rawFontSizePx * 0.75 * (pdfHeightMm / 297)));
    doc.setFontSize(fontSizePt);

    // Text color
    const textColor = parseColorToRgb(style.color) || { r: 15, g: 23, b: 42, a: 1 };
    doc.setTextColor(textColor.r, textColor.g, textColor.b);

    // Exact vector coordinates
    const textX = (rect.left - sheetRect.left) * scaleX;
    const textW = rect.width * scaleX;
    const textY = (rect.top - sheetRect.top + rect.height * 0.78) * scaleY;

    let angleDeg = 0;
    if (style.transform && style.transform !== "none") {
      const match = style.transform.match(/matrix\((.+)\)/);
      if (match) {
        const values = match[1].split(',').map(parseFloat);
        if (values.length >= 6) {
          angleDeg = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
        }
      }
    }

    const processedText = textContent;

    
    
    if (Math.abs(angleDeg) > 5) {
      // Let's rely on doc.text for vector crispness. 
      // cx, cy should be the center of the bounding box.
      const cx = (rect.left - sheetRect.left + rect.width / 2) * scaleX;
      const cy = (rect.top - sheetRect.top + rect.height / 2) * scaleY;
      
      doc.text(processedText, cx, cy, {
        align: "center",
        baseline: "middle",
        angle: -angleDeg,
      });
        } else {
      // Since range.getBoundingClientRect() provides the tight visual bounding box of the text,
      // and we manually reverse RTL text so it renders LTR in jsPDF, 
      // the absolute left coordinate (textX) is always the correct anchor point.
      // Using jsPDF's align:"right" or "center" introduces width calculation errors.
      doc.text(processedText, textX, textY, {
         align: "left"
      });
    }
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
}

export async function downloadPdfV2FromElement(
  containerEl: HTMLElement,
  filename: string,
  options?: ExportPdfV2Options
) {
  const blob = await generatePdfV2(containerEl, options);
  if (!blob) throw new Error("Failed to generate PDF");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
