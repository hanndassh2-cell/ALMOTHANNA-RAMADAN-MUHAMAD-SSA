import { OcrImportModal } from "./OcrImportModal";
import { PortalDropdown } from "../../../components/PortalDropdown";
import React, { useEffect, useState } from "react";
import { compressImage } from "../../../services/imageCompression";
import { executeCopy, executeCut, executePaste, executeDuplicate, executeDelete, executeSelectAll, executeUndo, executeRedo } from "../../../utils/editorClipboard";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { motion, AnimatePresence } from "motion/react";
import {
  formatPastedEquation,
  convertMathMLInText,
  convertMathMLToTeX,
} from "../../../components/MathText";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "./ImageNodeView";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";
import { FontSize } from "../extensions/FontSize";
import { ParagraphSpacing } from "../extensions/ParagraphSpacing";
import { ParagraphStyle } from "../extensions/ParagraphStyle";
import { AutoMathDirection } from "../extensions/AutoMathDirection";
import { CustomListStyle } from "../extensions/CustomListStyle";
import { TipTapMathExtension } from "../extensions/TipTapMathExtension";
import { MixedBidiPipeline } from "../extensions/MixedBidiPipeline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Extension } from "@tiptap/core";
import { BULLET_STYLES, NUMBER_STYLES, normalizeHtmlLists } from "../../../utils/listEngine";
import { processCentralContentPipeline } from "../../../services/bidiContentPipeline";
import {
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  List,
  ListOrdered,
  Indent,
  Outdent,
  BetweenVerticalEnd,
  Sigma,
  Sparkles,
  Link as LinkIcon,
  Rows,
  Columns,
  Trash2, Undo2, Redo2,
  Combine,
  Split,
  Table as TableIcon,
  Image as ImageIcon,
  ChevronDown, MoreHorizontal, MoreVertical,
  Upload,
  Undo,
  Redo,
  Edit,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  Copy,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
// @ts-ignore
import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import {
  analyzeClipboard,
  cleanAndConvertHtml,
  sanitizeHtmlForProseMirror,
  SmartPasteAnalysis,
} from "../../../services/smartPasteEngine";
import { setStoredData, getStoredData } from "../../../services/storage";
import { SmartPasteAnalyzerModal } from "./SmartPasteAnalyzerModal";
import { EquationEditorModal } from "./EquationEditorModal";
import { DocumentImportModal } from "./DocumentImportModal";

const TableContextMenu = ({ editor }: { editor: Editor }) => {
  const run = (command: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    command();
  };

  const toolClass =
    "flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="table-context-menu"
      shouldShow={({ editor: currentEditor }) => currentEditor.isEditable && currentEditor.isActive("table")}
      options={{ placement: "top", strategy: "fixed" }}
      className="z-[1200] flex max-w-[calc(100vw-24px)] flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      dir="rtl"
    >
      <span className="px-1.5 text-[11px] font-extrabold text-blue-700 dark:text-blue-300">الجدول</span>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={toolClass} onMouseDown={run(() => editor.chain().focus().addRowBefore().run())} title="إضافة صف أعلى"><Rows className="h-3.5 w-3.5" /><ArrowUp className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={run(() => editor.chain().focus().addRowAfter().run())} title="إضافة صف أسفل"><Rows className="h-3.5 w-3.5" /><ArrowDown className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={run(() => editor.chain().focus().addColumnBefore().run())} title="إضافة عمود قبل"><Columns className="h-3.5 w-3.5" /><ArrowRightLeft className="h-3 w-3" /></button>
      <button type="button" className={toolClass} onMouseDown={run(() => editor.chain().focus().addColumnAfter().run())} title="إضافة عمود بعد"><Columns className="h-3.5 w-3.5" /><ArrowRightLeft className="h-3 w-3" /></button>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={toolClass} disabled={!editor.can().mergeCells()} onMouseDown={run(() => editor.chain().focus().mergeCells().run())} title="دمج الخلايا المحددة"><Combine className="h-3.5 w-3.5" /><span className="hidden sm:inline">دمج</span></button>
      <button type="button" className={toolClass} disabled={!editor.can().splitCell()} onMouseDown={run(() => editor.chain().focus().splitCell().run())} title="تقسيم الخلية"><Split className="h-3.5 w-3.5" /><span className="hidden sm:inline">تقسيم</span></button>
      <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" className={`${toolClass} text-rose-600 dark:text-rose-300`} onMouseDown={run(() => editor.chain().focus().deleteRow().run())} title="حذف الصف الحالي">حذف صف</button>
      <button type="button" className={`${toolClass} text-rose-600 dark:text-rose-300`} onMouseDown={run(() => editor.chain().focus().deleteColumn().run())} title="حذف العمود الحالي">حذف عمود</button>
      <button type="button" className={`${toolClass} text-rose-700 dark:text-rose-300`} onMouseDown={run(() => editor.chain().focus().deleteTable().run())} title="حذف الجدول"><Trash2 className="h-3.5 w-3.5" /></button>
    </BubbleMenu>
  );
};

// Custom Extensions for preserving Word backgrounds, line spacing, and indentation
const BackgroundColor = Extension.create({
  name: "backgroundColor",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              element.style.backgroundColor || element.style.background,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) return {};
              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
});

const TextIndent = Extension.create({
  name: "textIndent",
  addOptions() {
    return {
      types: ["paragraph"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textIndent: {
            default: null,
            parseHTML: (element) => element.style.textIndent,
            renderHTML: (attributes) => {
              if (!attributes.textIndent) return {};
              return { style: `text-indent: ${attributes.textIndent}` };
            },
          },
        },
      },
    ];
  },
});

const AdvancedFormatting = Extension.create({
  name: "advancedFormatting",
  addOptions() {
    return {
      types: [
        "paragraph",
        "heading",
        "listItem",
        "bulletList",
        "orderedList",
        "table",
        "tableCell",
        "tableHeader",
        "tableRow",
      ],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop,
            renderHTML: (attributes) =>
              attributes.marginTop
                ? { style: `margin-top: ${attributes.marginTop}` }
                : {},
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom,
            renderHTML: (attributes) =>
              attributes.marginBottom
                ? { style: `margin-bottom: ${attributes.marginBottom}` }
                : {},
          },
          marginLeft: {
            default: null,
            parseHTML: (element) => element.style.marginLeft,
            renderHTML: (attributes) =>
              attributes.marginLeft
                ? { style: `margin-left: ${attributes.marginLeft}` }
                : {},
          },
          marginRight: {
            default: null,
            parseHTML: (element) => element.style.marginRight,
            renderHTML: (attributes) =>
              attributes.marginRight
                ? { style: `margin-right: ${attributes.marginRight}` }
                : {},
          },
          paddingTop: {
            default: null,
            parseHTML: (element) => element.style.paddingTop,
            renderHTML: (attributes) =>
              attributes.paddingTop
                ? { style: `padding-top: ${attributes.paddingTop}` }
                : {},
          },
          paddingBottom: {
            default: null,
            parseHTML: (element) => element.style.paddingBottom,
            renderHTML: (attributes) =>
              attributes.paddingBottom
                ? { style: `padding-bottom: ${attributes.paddingBottom}` }
                : {},
          },
          paddingLeft: {
            default: null,
            parseHTML: (element) => element.style.paddingLeft,
            renderHTML: (attributes) =>
              attributes.paddingLeft
                ? { style: `padding-left: ${attributes.paddingLeft}` }
                : {},
          },
          paddingRight: {
            default: null,
            parseHTML: (element) => element.style.paddingRight,
            renderHTML: (attributes) =>
              attributes.paddingRight
                ? { style: `padding-right: ${attributes.paddingRight}` }
                : {},
          },
          direction: {
            default: null,
            parseHTML: (element) =>
              element.style.direction || element.getAttribute("dir"),
            renderHTML: (attributes) =>
              attributes.direction
                ? {
                    style: `direction: ${attributes.direction}`,
                    dir: attributes.direction,
                  }
                : {},
          },
        },
      },
    ];
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor ||
          element.getAttribute("data-bg-color"),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            "data-bg-color": attributes.backgroundColor,
          };
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("align"),
        renderHTML: (attributes) => {
          if (!attributes.textAlign) return {};
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            style: `width: ${attributes.width}`,
            width: attributes.width,
          };
        },
      },
      border: {
        default: null,
        parseHTML: (element) =>
          element.style.border ||
          element.style.borderTop ||
          element.style.borderBottom ||
          element.style.borderLeft ||
          element.style.borderRight ||
          element.getAttribute("border"),
        renderHTML: (attributes) => {
          if (!attributes.border) return {};
          return {
            style: `border: ${attributes.border}`,
          };
        },
      },
      padding: {
        default: null,
        parseHTML: (element) =>
          element.style.padding || element.style.paddingTop,
        renderHTML: (attributes) => {
          if (!attributes.padding) return {};
          return {
            style: `padding: ${attributes.padding}`,
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor ||
          element.getAttribute("data-bg-color"),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
            "data-bg-color": attributes.backgroundColor,
          };
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element) =>
          element.style.textAlign || element.getAttribute("align"),
        renderHTML: (attributes) => {
          if (!attributes.textAlign) return {};
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
      width: {
        default: null,
        parseHTML: (element) =>
          element.style.width || element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            style: `width: ${attributes.width}`,
            width: attributes.width,
          };
        },
      },
      border: {
        default: null,
        parseHTML: (element) =>
          element.style.border ||
          element.style.borderTop ||
          element.style.borderBottom ||
          element.style.borderLeft ||
          element.style.borderRight ||
          element.getAttribute("border"),
        renderHTML: (attributes) => {
          if (!attributes.border) return {};
          return {
            style: `border: ${attributes.border}`,
          };
        },
      },
      padding: {
        default: null,
        parseHTML: (element) =>
          element.style.padding || element.style.paddingTop,
        renderHTML: (attributes) => {
          if (!attributes.padding) return {};
          return {
            style: `padding: ${attributes.padding}`,
          };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  onOpenAI?: () => void;
  value: string;
  onChange?: (value: string) => void;
  onFocus?: (editor: Editor) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  isActive?: boolean;
  autoFocus?: boolean;
  autoFocusPosition?: "start" | "end";
  onAutoFocusComplete?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  lineSpacing?: number;
  onLineSpacingChange?: (value: number) => void;
}

// Highly sophisticated Smart Paste algorithm
export async function processSmartPaste(
  html: string,
  plainText: string,
  files: FileList | null | undefined,
): Promise<string> {
  if (!html && !files?.length) {
    if (!plainText) return "";
    return plainText
      .split(/\r?\n/)
      .map(line => line.trim() ? `<p>${line}</p>` : `<p><br></p>`)
      .join("");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "<body></body>", "text/html");

  // Step 1: Process and save images from the clipboard files to the Media Library
  const imageFiles = files
    ? Array.from(files).filter((f) => f.type.startsWith("image/"))
    : [];
  const base64Images: string[] = [];

  for (const file of imageFiles) {
    try {
      const base64 = await compressImage(file, 800, 0.7); // Compress to 800px max width, 70% quality
      if (base64) {
        base64Images.push(base64);

        // Save to local storage media library
        try {
          const existingMedia = getStoredData<any[]>("edutech_media_library_v1", []);
          const newItem = {
            id:
              "media-" +
              Date.now() +
              "-" +
              Math.random().toString(36).substring(2, 9),
            type: "image",
            url: base64,
            name: file.name || "صورة ملصقة من Word",
            createdAt: new Date().toISOString(),
          };
          const updatedMedia = [...existingMedia, newItem].slice(-8);
          setStoredData("edutech_media_library_v1", updatedMedia);
          window.dispatchEvent(new CustomEvent("refresh-media-library"));
        } catch (storageErr) {
          console.error("Failed to save to media library:", storageErr);
        }
      }
    } catch (err) {
      console.error("Error compressing pasted image", err);
    }
  }

  // Step 2: Map Base64 images to img tags (resolving blocked file:/// URLs)
  const imgTags = Array.from(doc.querySelectorAll("img"));
  let fileIndex = 0;
  imgTags.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src.startsWith("file://") || src.startsWith("blob:") || !src) {
      if (fileIndex < base64Images.length) {
        img.setAttribute("src", base64Images[fileIndex]);
        fileIndex++;
      }
    } else if (src.startsWith("data:image/")) {
      // Save existing inline images to the Media Library as well
      try {
        const existingMedia = getStoredData<any[]>("edutech_media_library_v1", []);
        const exists = existingMedia.some((m: any) => m.url === src);
        if (!exists) {
          const newItem = {
            id:
              "media-" +
              Date.now() +
              "-" +
              Math.random().toString(36).substring(2, 9),
            type: "image",
            url: src,
            name:
              img.getAttribute("alt") ||
              img.getAttribute("title") ||
              "صورة ملصقة",
            createdAt: new Date().toISOString(),
          };
          const updatedMedia = [...existingMedia, newItem].slice(-8);
          setStoredData("edutech_media_library_v1", updatedMedia);
          window.dispatchEvent(new CustomEvent("refresh-media-library"));
        }
      } catch (e) {
        console.error("Error saving inline image:", e);
      }
    }
  });

  // Append any remaining clipboard images
  while (fileIndex < base64Images.length) {
    const p = doc.createElement("p");
    const img = doc.createElement("img");
    img.setAttribute("src", base64Images[fileIndex]);
    p.appendChild(img);
    doc.body.appendChild(p);
    fileIndex++;
  }

  // Step 3: MathML / Office Math Equation Support
  // Search for any Microsoft Office math or MathML tags and convert to inline LaTeX ($...$)
  const allNodes = doc.getElementsByTagName("*");
  const mathNodes: Element[] = [];
  for (let i = 0; i < allNodes.length; i++) {
    const n = allNodes[i];
    const localName = (n.localName || n.tagName || "")
      .toLowerCase()
      .replace(/^[a-z0-9_]+:/, "");
    if (
      localName === "omath" ||
      localName === "omathpara" ||
      localName === "math"
    ) {
      mathNodes.push(n);
    }
  }

  mathNodes.forEach((node) => {
    let parent = node.parentElement;
    let isNested = false;
    while (parent) {
      const parentName = (parent.localName || parent.tagName || "")
        .toLowerCase()
        .replace(/^[a-z0-9_]+:/, "");
      if (
        parentName === "omath" ||
        parentName === "omathpara" ||
        parentName === "math"
      ) {
        isNested = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (!isNested) {
      try {
        const outerXML = node.outerHTML;
        const tex = convertMathMLToTeX(outerXML);
        if (tex && tex.trim()) {
          const textNode = doc.createTextNode(`$${tex.trim()}$`);
          node.parentNode?.replaceChild(textNode, node);
        }
      } catch (e) {
        console.error("Error converting pasted math node to TeX:", e);
      }
    }
  });

  // Step 4: Convert Microsoft Word flat list paragraphs into real list tags (ul/ol)
  const paragraphs = Array.from(doc.querySelectorAll("p"));
  let currentList: Element | null = null;
  let currentListType: "ul" | "ol" | null = null;

  paragraphs.forEach((p) => {
    const styleAttr = p.getAttribute("style") || "";
    const className = p.getAttribute("class") || "";
    const textContent = p.textContent || "";

    const isWordList =
      styleAttr.includes("mso-list") ||
      className.includes("MsoList") ||
      /^\s*·\s*/.test(textContent) ||
      /^\s*[•o§-]\s*/.test(textContent) ||
      /^\s*\d+[\.\)]\s*/.test(textContent);

    if (isWordList) {
      let isNumbered = /^\s*\d+[\.\)]\s*/.test(textContent);
      let cleanHtml = p.innerHTML;

      if (isNumbered) {
        cleanHtml = cleanHtml.replace(/^\s*\d+[\.\)]\s*/, "");
      } else {
        cleanHtml = cleanHtml.replace(/^\s*[·•o§-]\s*/, "");
        cleanHtml = cleanHtml.replace(
          /<span[^>]*font-family:\s*Symbol[^>]*>.*?<\/span>/g,
          "",
        );
      }

      const listType = isNumbered ? "ol" : "ul";

      if (!currentList || currentListType !== listType) {
        currentList = doc.createElement(listType);
        currentList.setAttribute(
          "style",
          "margin-top: 0; margin-bottom: 0; padding-right: 40px; list-style-position: inside;",
        );
        p.parentNode?.insertBefore(currentList, p);
        currentListType = listType;
      }

      const li = doc.createElement("li");
      li.innerHTML = cleanHtml;

      // Preserve inline styles from paragraph to list item
      if (p.getAttribute("style")) {
        li.setAttribute("style", p.getAttribute("style") || "");
      }

      currentList.appendChild(li);
      p.parentNode?.removeChild(p);
    } else {
      currentList = null;
      currentListType = null;
    }
  });

  // Step 5: Format Preservation, Cleansing and Standardisation
  const cleanNode = (node: Element) => {
    // Clean classes
    const className = node.getAttribute("class") || "";
    if (className) {
      const cleanedClass = className
        .split(" ")
        .filter((c) => !c.toLowerCase().startsWith("mso"))
        .join(" ");
      if (cleanedClass) {
        node.setAttribute("class", cleanedClass);
      } else {
        node.removeAttribute("class");
      }
    }

    // Clean specific Word junk attributes
    node.removeAttribute("lang");
    node.removeAttribute("v:shapes");
    node.removeAttribute("o:spid");

    const isTableElement = [
      "table",
      "tr",
      "td",
      "th",
      "tbody",
      "thead",
      "tfoot",
    ].includes(node.tagName.toLowerCase());
    if (isTableElement) {
      node.removeAttribute("width");
      node.removeAttribute("height");
      node.removeAttribute("border");
      node.removeAttribute("cellspacing");
      node.removeAttribute("cellpadding");
      node.removeAttribute("valign");
      node.removeAttribute("align");
      node.removeAttribute("bgcolor");

      // Validate and standardize colspan/rowspan for merged cells
      if (node.hasAttribute("colspan")) {
        const cs = parseInt(node.getAttribute("colspan") || "1", 10);
        if (isNaN(cs) || cs <= 1) {
          node.removeAttribute("colspan");
        } else {
          node.setAttribute("colspan", cs.toString());
        }
      }
      if (node.hasAttribute("rowspan")) {
        const rs = parseInt(node.getAttribute("rowspan") || "1", 10);
        if (isNaN(rs) || rs <= 1) {
          node.removeAttribute("rowspan");
        } else {
          node.setAttribute("rowspan", rs.toString());
        }
      }
    }

    // Clear mso styles but keep valuable CSS
    const styleAttr = node.getAttribute("style");

    if (styleAttr) {
      const props = styleAttr.split(";");
      const preserved: string[] = [];

      props.forEach((prop) => {
        const parts = prop.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(":").trim();

          if (key.startsWith("mso-")) return;

          if (
            [
              "font-family",
              "font-size",
              "color",
              "background-color",
              "background",
              "text-align",
              "line-height",
              "text-indent",
              "font-weight",
              "font-style",
              "text-decoration",
              "width",
              "height",
              "border",
              "border-collapse",
              "padding",
              "margin",
            ].includes(key)
          ) {
            preserved.push(`${key}: ${val}`);
          }
        }
      });

      if (preserved.length > 0) {
        node.setAttribute("style", preserved.join("; "));
      } else {
        node.removeAttribute("style");
      }
    }

    // Word vertical alignments to standard markup
    const verticalAlign = (node as HTMLElement).style?.verticalAlign;
    if (verticalAlign === "super") {
      const sup = doc.createElement("sup");
      while (node.firstChild) sup.appendChild(node.firstChild);
      node.appendChild(sup);
      (node as HTMLElement).style.verticalAlign = "";
    } else if (verticalAlign === "sub") {
      const sub = doc.createElement("sub");
      while (node.firstChild) sub.appendChild(node.firstChild);
      node.appendChild(sub);
      (node as HTMLElement).style.verticalAlign = "";
    }

    Array.from(node.children).forEach(cleanNode);
  };

  cleanNode(doc.body);

  // Return final purified HTML string (free of Word junk XML/comments)
  let cleanHtmlString = doc.body.innerHTML;
  cleanHtmlString = cleanHtmlString
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
    .replace(/<style>[\s\S]*?<\/style>/gi, "");

  // Post-process the text for scientific symbols, formulas and equations
  cleanHtmlString = convertMathMLInText(cleanHtmlString);

  // Normalize list directionality and styling
  cleanHtmlString = normalizeHtmlLists(cleanHtmlString);

  return cleanHtmlString;
}


const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
          };
        }
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            height: attributes.height,
          };
        }
      },
      
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  }
});

// Helper to inspect the exact line/block and list attributes for the current cursor position
export function getActiveLineState(editor: Editor | null) {
  if (!editor) {
    return {
      dir: "rtl" as const,
      dirMode: "auto" as const,
      textAlign: "right" as const,
      listType: null as "bullet" | "ordered" | null,
      listStyle: null as string | null,
      headingLevel: "p" as string,
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: "12pt",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrike: false,
      isHighlight: false,
      isSubscript: false,
      isSuperscript: false,
      isLink: false,
      isTable: false,
    };
  }

  try {
    const { selection } = editor.state;
    const { $from } = selection;

    // 1. Determine List Type strictly (closest list ancestor)
    let listType: "bullet" | "ordered" | null = null;
    let listStyle: string | null = null;
    for (let d = $from.depth; d > 0; d--) {
      const name = $from.node(d).type.name;
      if (name === "bulletList") {
        listType = "bullet";
        listStyle = $from.node(d).attrs.listStyle || "disc";
        break;
      }
      if (name === "orderedList") {
        listType = "ordered";
        listStyle = $from.node(d).attrs.listStyle || "decimal";
        break;
      }
    }

    // 2. Determine Block Direction and Alignment (closest block ancestor)
    let dir: "rtl" | "ltr" = "rtl";
    let dirMode: "auto" | "manual" = "auto";
    let textAlign: "right" | "center" | "left" | "justify" | null = null;

    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node && node.attrs) {
        if (node.attrs.dirMode !== undefined && dirMode === "auto") {
          dirMode = node.attrs.dirMode === "manual" ? "manual" : "auto";
        }
        if (node.attrs.dir !== undefined) {
          dir = node.attrs.dir === "ltr" ? "ltr" : "rtl";
        }
        if (node.attrs.textAlign && !textAlign) {
          textAlign = node.attrs.textAlign;
        }
      }
    }

    if (!textAlign) {
      textAlign = dir === "ltr" ? "left" : "right";
    }

    // 3. Heading level
    let headingLevel = "p";
    if (editor.isActive("heading", { level: 1 })) headingLevel = "1";
    else if (editor.isActive("heading", { level: 2 })) headingLevel = "2";
    else if (editor.isActive("heading", { level: 3 })) headingLevel = "3";

    // 4. Inline Text Styles & Marks
    const textStyleAttrs = editor.getAttributes("textStyle");
    const fontFamily = textStyleAttrs.fontFamily || "'Times New Roman', Times, serif";
    const fontSize = textStyleAttrs.fontSize || "12pt";

    return {
      dir,
      dirMode,
      textAlign,
      listType,
      listStyle,
      headingLevel,
      fontFamily,
      fontSize,
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isStrike: editor.isActive("strike"),
      isHighlight: editor.isActive("highlight"),
      isSubscript: editor.isActive("subscript"),
      isSuperscript: editor.isActive("superscript"),
      isLink: editor.isActive("link"),
      isTable: editor.isActive("table"),
    };
  } catch {
    return {
      dir: "rtl" as const,
      dirMode: "auto" as const,
      textAlign: "right" as const,
      listType: null as "bullet" | "ordered" | null,
      listStyle: null as string | null,
      headingLevel: "p" as string,
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: "12pt",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      isStrike: false,
      isHighlight: false,
      isSubscript: false,
      isSuperscript: false,
      isLink: false,
      isTable: false,
    };
  }
}

export function getActiveTextDirection(editor: Editor | null): { dir: "rtl" | "ltr"; dirMode: "auto" | "manual" } {
  const state = getActiveLineState(editor);
  return { dir: state.dir, dirMode: state.dirMode };
}

const MenuBar = ({
  editor,
  onOpenEquation,
  onOpenOcr,
  onOpenAI,
  onOpenFile,
  lineSpacing,
  onLineSpacingChange,
}: {
  editor: Editor | null;
  onOpenEquation: () => void;
  onOpenOcr: () => void;
  onOpenAI?: () => void;
  onOpenFile: () => void;
  lineSpacing?: number;
  onLineSpacingChange?: (val: number) => void;
}) => {
  const [, forceUpdate] = useState({});
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  // Keep the everyday writing surface quiet. Rich insert tools remain one click away.
  const [isInsertToolbarOpen, setIsInsertToolbarOpen] = useState(false);
  const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
  const [isHighlightPopoverOpen, setIsHighlightPopoverOpen] = useState(false);
  const [isLineSpacingPopoverOpen, setIsLineSpacingPopoverOpen] = useState(false);
  const colorPopoverRef = React.useRef<HTMLDivElement>(null);
  const highlightPopoverRef = React.useRef<HTMLDivElement>(null);
  const lineSpacingPopoverRef = React.useRef<HTMLDivElement>(null);
  const savedSelectionRef = React.useRef<{ from: number; to: number } | null>(null);

  const currentSpacingValue = lineSpacing !== undefined ? lineSpacing : 0;

  const handleSetSpacing = (pxVal: number, lhVal?: string) => {
    if (onLineSpacingChange) {
      onLineSpacingChange(pxVal);
    }
    if (editor && !editor.isDestroyed) {
      const calcLh = lhVal || `${(1.4 + (pxVal / 20)).toFixed(2)}`;
      try {
        editor.chain().focus().updateAttributes("paragraph", { lineHeight: calcLh }).run();
      } catch (err) {
        console.warn("Could not update paragraph lineHeight", err);
      }
    }
  };

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target) {
        if (colorPopoverRef.current && !colorPopoverRef.current.contains(target)) {
          setIsColorPopoverOpen(false);
        }
        if (highlightPopoverRef.current && !highlightPopoverRef.current.contains(target)) {
          setIsHighlightPopoverOpen(false);
        }
        if (lineSpacingPopoverRef.current && !lineSpacingPopoverRef.current.contains(target)) {
          setIsLineSpacingPopoverOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const captureSelection = () => {
    if (!editor || editor.isDestroyed) return;
    const { selection, doc } = editor.state;
    if (!selection.empty) {
      savedSelectionRef.current = { from: selection.from, to: selection.to };
      return;
    }
    const { $from } = selection;
    const parentText = $from.parent?.textContent || "";
    const offset = $from.parentOffset;
    if (parentText && parentText.length > 0) {
      let start = offset;
      while (start > 0 && /[\w\u0600-\u06FF]/.test(parentText[start - 1])) {
        start--;
      }
      let end = offset;
      while (end < parentText.length && /[\w\u0600-\u06FF]/.test(parentText[end])) {
        end++;
      }
      if (start < end) {
        const maxPos = doc.content.size;
        const parentStart = $from.start();
        const from = Math.max(0, Math.min(parentStart + start, maxPos));
        const to = Math.max(from, Math.min(parentStart + end, maxPos));
        savedSelectionRef.current = { from, to };
        return;
      }
    }
    savedSelectionRef.current = { from: selection.from, to: selection.to };
  };

  const applyColor = (color: string | null) => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.focus();
    if (savedSelectionRef.current && savedSelectionRef.current.from < savedSelectionRef.current.to) {
      const maxPos = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(savedSelectionRef.current.from, maxPos));
      const to = Math.max(from, Math.min(savedSelectionRef.current.to, maxPos));
      if (from < to) {
        editor.commands.setTextSelection({ from, to });
      }
    }
    if (color) {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setIsColorPopoverOpen(false);
  };

  const applyHighlight = (color: string | null) => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.focus();
    if (savedSelectionRef.current && savedSelectionRef.current.from < savedSelectionRef.current.to) {
      const maxPos = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(savedSelectionRef.current.from, maxPos));
      const to = Math.max(from, Math.min(savedSelectionRef.current.to, maxPos));
      if (from < to) {
        editor.commands.setTextSelection({ from, to });
      }
    }
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setIsHighlightPopoverOpen(false);
  };

  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate({});
    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  if (!editor) return null;
  
  const lineState = getActiveLineState(editor);

  const runCommand = (
    e: React.MouseEvent | React.SyntheticEvent,
    action: () => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && "blur" in e.currentTarget) {
      (e.currentTarget as HTMLElement).blur();
    }
    action();
    if (editor && !editor.isDestroyed) {
      editor.commands.focus();
    }
  };

  return (
    <div
      className="lesson-editor-toolbar sticky top-0 z-[25] w-full border-y border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl dark:border-slate-700/90 dark:bg-slate-900/95"
    >
      <div
        className="lesson-format-toolbar flex w-full flex-nowrap items-center gap-1.5 overflow-x-auto px-2 py-1.5"
        onMouseDown={(e) => {
          if (!(e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement)) {
            e.preventDefault();
          }
        }}
        dir="rtl"
      >
      {/* Google Docs-style direct history controls */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().undo().run())}
          disabled={!editor.can().undo()}
          className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          title="تراجع (Ctrl+Z)"
          aria-label="تراجع"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().redo().run())}
          disabled={!editor.can().redo()}
          className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
          title="إعادة (Ctrl+Shift+Z)"
          aria-label="إعادة"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {/* Paragraph style: a missing core control in the old toolbar. */}
      <select
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const val = e.target.value;
          runCommand(e, () => {
            if (val === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(val) as 1 | 2 | 3 }).run();
          });
        }}
        value={lineState.headingLevel}
        className="max-w-[112px] shrink-0 cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        title="نمط الفقرة"
        aria-label="نمط الفقرة"
      >
        <option value="p">نص عادي</option>
        <option value="1">عنوان 1</option>
        <option value="2">عنوان 2</option>
        <option value="3">عنوان 3</option>
      </select>

      {/* 1. Font / Size / Color */}
      <select
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const val = e.target.value;
          runCommand(e, () => {
            if (val) editor.chain().focus().setFontFamily(val).run();
            else editor.chain().focus().unsetFontFamily().run();
          });
        }}
        value={lineState.fontFamily}
        className="max-w-[120px] shrink-0 cursor-pointer truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        title="نوع الخط"
      >
        <optgroup label="خطوط عربية">
          <option value="Cairo, sans-serif">Cairo (عصري)</option>
          <option value="Tajawal, sans-serif">Tajawal (رسمي)</option>
          <option value="Almarai, sans-serif">Almarai (واضح)</option>
          <option value="'IBM Plex Sans Arabic', sans-serif">IBM Plex Arabic</option>
          <option value="'Noto Naskh Arabic', serif">Noto Naskh</option>
          <option value="'Traditional Arabic', serif">Traditional Arabic</option>
          <option value="'Amiri', serif">Amiri (أميري)</option>
          <option value="'Aref Ruqaa', serif">Aref Ruqaa (رقعة)</option>
        </optgroup>
        <optgroup label="خطوط عامة وإنجليزية">
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Courier New', Courier, monospace">Courier New</option>
        </optgroup>
      </select>

      <select
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          const val = e.target.value;
          runCommand(e, () => {
            if (val) editor.chain().focus().setFontSize(val).run();
            else editor.chain().focus().unsetFontSize().run();
          });
        }}
        value={lineState.fontSize}
        className="shrink-0 cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        title="حجم الخط"
      >
        {["8pt", "9pt", "10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "20pt", "22pt", "24pt", "28pt", "32pt", "36pt", "48pt"].map((size) => (
          <option key={size} value={size}>{size.replace("pt", "")}</option>
        ))}
      </select>

      {/* Text Color Popover */}
      <div className="relative inline-block" ref={colorPopoverRef}>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            captureSelection();
          }}
          onClick={(e) => {
            e.preventDefault();
            captureSelection();
            setIsColorPopoverOpen((prev) => !prev);
          }}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5 cursor-pointer ${
            isColorPopoverOpen ? "bg-slate-200 dark:bg-slate-700" : ""
          }`}
          title="لون النص (تلوين الكلمات المحددة)"
        >
          <div className="flex flex-col items-center leading-none">
            <span className="font-bold text-xs font-serif">A</span>
            <div
              className="w-3.5 h-1 rounded-full mt-0.5 shadow-2xs"
              style={{ backgroundColor: editor.getAttributes("textStyle").color || "#0f172a" }}
            />
          </div>
          <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
        </button>

        {isColorPopoverOpen && (
          <div
            className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[200px] flex flex-col gap-2"
            dir="rtl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span>اختر لون النص</span>
              <button
                type="button"
                onClick={() => applyColor(null)}
                className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
              >
                إلغاء التلوين
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-5 gap-1.5 py-1">
              {[
                { name: "افتراضي / داكن", color: "#0f172a" },
                { name: "أزرق أساسي", color: "#2563eb" },
                { name: "أحمر تنبيهي", color: "#dc2626" },
                { name: "أخضر نجاح", color: "#059669" },
                { name: "كهرماني / برتقالي", color: "#d97706" },
                { name: "بنفسجي", color: "#7c3aed" },
                { name: "سماوي", color: "#0891b2" },
                { name: "وردي", color: "#e11d48" },
                { name: "رمادي داكن", color: "#475569" },
                { name: "ذهبي", color: "#ca8a04" },
              ].map((c) => {
                const isCurrent = (editor.getAttributes("textStyle").color || "").toLowerCase() === c.color.toLowerCase();
                return (
                  <button
                    key={c.color}
                    type="button"
                    title={c.name}
                    onClick={() => applyColor(c.color)}
                    className={`w-6 h-6 rounded-md transition-all flex items-center justify-center cursor-pointer border ${
                      isCurrent
                        ? "scale-110 ring-2 ring-blue-500 border-white"
                        : "border-slate-200 dark:border-slate-700 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.color }}
                  >
                    {isCurrent && <span className="text-white text-[10px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">لون مخصص:</span>
              <label className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <input
                  type="color"
                  className="w-4 h-4 cursor-pointer rounded border-0 p-0 bg-transparent"
                  value={editor.getAttributes("textStyle").color || "#000000"}
                  onChange={(e) => {
                    const colorVal = e.target.value;
                    applyColor(colorVal);
                  }}
                />
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                  {editor.getAttributes("textStyle").color || "#000000"}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {/* 2. B / I / U */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().toggleBold().run())}
          className={`p-1 rounded transition-colors ${lineState.isBold ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="عريض (Bold)"
        >
          <span className="font-bold font-serif text-[14px] leading-none px-1">B</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().toggleItalic().run())}
          className={`p-1 rounded transition-colors ${lineState.isItalic ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="مائل (Italic)"
        >
          <span className="italic font-serif text-[14px] leading-none px-1">I</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().toggleUnderline().run())}
          className={`p-1 rounded transition-colors ${lineState.isUnderline ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="تسطير (Underline)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {/* 3. Alignment */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().setTextAlign("right").run())}
          className={`p-1 rounded transition-colors ${lineState.textAlign === "right" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="محاذاة لليمين"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().setTextAlign("center").run())}
          className={`p-1 rounded transition-colors ${lineState.textAlign === "center" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="محاذاة للوسط"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().setTextAlign("left").run())}
          className={`p-1 rounded transition-colors ${lineState.textAlign === "left" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="محاذاة لليسار"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().setTextAlign("justify").run())}
          className={`p-1 rounded transition-colors ${lineState.textAlign === "justify" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="ضبط النص (Justify)"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {/* 3.5. Line Spacing (تباعد الأسطر) */}
      <div className="relative inline-block" ref={lineSpacingPopoverRef}>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            captureSelection();
          }}
          onClick={(e) => {
            e.preventDefault();
            captureSelection();
            setIsLineSpacingPopoverOpen((prev) => !prev);
          }}
          className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5 cursor-pointer ${
            isLineSpacingPopoverOpen ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold" : ""
          }`}
          title="تباعد الأسطر والفقرات (Line & Paragraph Spacing)"
        >
          <BetweenVerticalEnd className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
        </button>

        {isLineSpacingPopoverOpen && (
          <div
            className="absolute top-full right-0 mt-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[220px] flex flex-col gap-2.5"
            dir="rtl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <BetweenVerticalEnd className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>تباعد الأسطر</span>
              </span>
              {currentSpacingValue > 0 && (
                <button
                  type="button"
                  onClick={() => handleSetSpacing(0, "normal")}
                  className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  إعادة تعيين (0)
                </button>
              )}
            </div>

            {/* Spacing Slider */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  مستوى تباعد الأسطر:
                </span>
                <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                  {currentSpacingValue}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={currentSpacingValue}
                  onChange={(e) => handleSetSpacing(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                خيارات سريعة لتباعد الأسطر:
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: "1.0", px: 0, lh: "1.0" },
                  { label: "1.15", px: 2, lh: "1.15" },
                  { label: "1.25", px: 4, lh: "1.25" },
                  { label: "1.5", px: 8, lh: "1.5" },
                  { label: "1.75", px: 12, lh: "1.75" },
                  { label: "2.0", px: 16, lh: "2.0" },
                  { label: "2.5", px: 22, lh: "2.5" },
                  { label: "3.0", px: 30, lh: "3.0" },
                ].map((preset) => {
                  const isSelected = currentSpacingValue === preset.px;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        handleSetSpacing(preset.px, preset.lh);
                        setIsLineSpacingPopoverOpen(false);
                      }}
                      className={`px-1.5 py-1 text-[11px] rounded font-bold transition flex items-center justify-center cursor-pointer border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paragraph Spacing */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().setParagraphSpacing("8pt").run();
                  setIsLineSpacingPopoverOpen(false);
                }}
                className="text-right text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded transition flex items-center justify-between cursor-pointer"
              >
                <span>إضافة تباعد بعد الفقرة (+8pt)</span>
                <span className="text-[9px] text-slate-400 font-mono">+8pt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  editor?.chain().focus().unsetParagraphSpacing().run();
                  setIsLineSpacingPopoverOpen(false);
                }}
                className="text-right text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded transition flex items-center justify-between cursor-pointer"
              >
                <span>إزالة التباعد الإضافي للفقرات</span>
                <span className="text-[9px] text-rose-400 font-mono">0pt</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {/* 4. Lists */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().toggleBulletList().run())}
          className={`p-1 rounded transition-colors ${lineState.listType === "bullet" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="قائمة نقطية"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => runCommand(e, () => editor.chain().focus().toggleOrderedList().run())}
          className={`p-1 rounded transition-colors ${lineState.listType === "ordered" ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
          title="قائمة رقمية"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      <div className="min-w-2 flex-1" />

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          setIsInsertToolbarOpen((current) => !current);
        }}
        className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition-colors ${isInsertToolbarOpen ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
        title={isInsertToolbarOpen ? "إخفاء أدوات الإدراج" : "إظهار أدوات الإدراج"}
        aria-expanded={isInsertToolbarOpen}
        aria-controls="lesson-insert-toolbar"
      >
        <span>إدراج</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isInsertToolbarOpen ? "rotate-180" : ""}`} />
      </button>

      {/* 6. More Secondary Tools (⋯) */}
      <PortalDropdown
        open={isMoreMenuOpen}
        onOpenChange={setIsMoreMenuOpen}
        trigger={(
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="أدوات وتنسيقات إضافية"
            aria-label="أدوات وتنسيقات إضافية"
            aria-haspopup="menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
        className="w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 dark:border-slate-800 dark:bg-slate-900"
      >
            <div role="menu" dir="rtl" className="flex flex-col">
              <div className="mb-1 px-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">تنسيق إضافي</div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().toggleStrike().run()); setIsMoreMenuOpen(false); }}
                  className={`p-1.5 rounded transition-colors flex justify-center items-center ${lineState.isStrike ? "bg-slate-200 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="يتوسطه خط"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().toggleHighlight().run()); setIsMoreMenuOpen(false); }}
                  className={`p-1.5 rounded transition-colors flex justify-center items-center ${lineState.isHighlight ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="تمييز النص (Highlight)"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().toggleSubscript().run()); setIsMoreMenuOpen(false); }}
                  className={`p-1.5 rounded transition-colors flex justify-center items-center ${lineState.isSubscript ? "bg-slate-200 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="نص سفلي (Subscript)"
                >
                  <SubscriptIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().toggleSuperscript().run()); setIsMoreMenuOpen(false); }}
                  className={`p-1.5 rounded transition-colors flex justify-center items-center ${lineState.isSuperscript ? "bg-slate-200 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="نص علوي (Superscript)"
                >
                  <SuperscriptIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-1 px-1">اتجاه النص</div>
              <div className="flex flex-col gap-1 mb-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().setTextDirection("rtl").run()); setIsMoreMenuOpen(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded transition-colors ${lineState.dir === "rtl" && lineState.dirMode === "manual" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="من اليمين لليسار (العربية)"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold flex-1 text-right">يمين لليسار (RTL)</span>
                  {lineState.dir === "rtl" && lineState.dirMode === "manual" && <span className="font-bold text-blue-600">✓</span>}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { runCommand(e, () => editor.chain().focus().setTextDirection("ltr").run()); setIsMoreMenuOpen(false); }}
                  className={`flex items-center gap-2 p-1.5 rounded transition-colors ${lineState.dir === "ltr" && lineState.dirMode === "manual" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"}`}
                  title="من اليسار لليمين (الإنجليزية)"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 rotate-180" />
                  <span className="text-xs font-bold flex-1 text-right">يسار لليمين (LTR)</span>
                  {lineState.dir === "ltr" && lineState.dirMode === "manual" && <span className="font-bold text-blue-600">✓</span>}
                </button>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { runCommand(e, () => editor.chain().focus().clearNodes().unsetAllMarks().run()); setIsMoreMenuOpen(false); }}
                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-slate-600 mt-1 transition-colors"
                title="مسح جميع التنسيقات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-right flex-1">مسح التنسيق</span>
              </button>
            </div>
      </PortalDropdown>
      </div>

      {isInsertToolbarOpen && (
        <div
          id="lesson-insert-toolbar"
          className="lesson-insert-toolbar flex w-full flex-nowrap items-stretch gap-2 overflow-x-auto border-t border-slate-200/80 bg-slate-50/90 px-2 py-2 dark:border-slate-700/80 dark:bg-slate-950/50"
          onMouseDown={(e) => {
            if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
          }}
          dir="rtl"
          aria-label="أدوات إدراج المحتوى"
        >
          <div className="flex shrink-0 flex-col rounded-lg border border-slate-200 bg-white px-1.5 pb-1 pt-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => runCommand(e, onOpenEquation)}
                className="flex min-w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-extrabold text-amber-700 transition hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50"
                title="إدراج معادلة رياضية أو كيميائية"
              >
                <Sigma className="h-5 w-5" />
                <span>معادلة</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => runCommand(e, () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
                className="flex min-w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                title="إدراج جدول 3×3 ثم تعديله من أدوات الجدول"
              >
                <TableIcon className="h-5 w-5" />
                <span>جدول</span>
              </button>
              <label
                className="flex min-w-[64px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50"
                onMouseDown={(e) => e.stopPropagation()}
                title="إدراج صورة من الجهاز"
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const b64 = await compressImage(file, 800, 0.7);
                      if (b64) editor.chain().focus().setImage({ src: b64 }).run();
                    } catch (err) {
                      console.error("Image insert error", err);
                    }
                    e.target.value = "";
                  }}
                />
                <ImageIcon className="h-5 w-5" />
                <span>صورة</span>
              </label>
            </div>
            <span className="border-t border-slate-100 pt-1 text-center text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">عناصر الدرس</span>
          </div>

          <div className="flex shrink-0 flex-col rounded-lg border border-slate-200 bg-white px-1.5 pb-1 pt-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => runCommand(e, onOpenFile)}
                className="flex min-w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/50"
                title="استيراد محتوى من Word أو PDF أو HTML أو TXT"
              >
                <FileText className="h-5 w-5" />
                <span>استيراد ملف</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => runCommand(e, onOpenOcr)}
                className="flex min-w-[82px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-bold text-purple-700 transition hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/50"
                title="استخراج النص والمعادلات من صورة أو ملف ممسوح"
              >
                <Upload className="h-5 w-5" />
                <span>استخراج OCR</span>
              </button>
            </div>
            <span className="border-t border-slate-100 pt-1 text-center text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">استيراد واستخراج</span>
          </div>

          {onOpenAI && (
            <div className="flex shrink-0 flex-col rounded-lg border border-slate-200 bg-white px-1.5 pb-1 pt-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => runCommand(e, onOpenAI)}
                className="flex min-w-[96px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                title="تنظيم المحتوى أو مساعدتك في بنائه"
              >
                <Sparkles className="h-5 w-5" />
                <span>المساعد الذكي</span>
              </button>
              <span className="border-t border-slate-100 pt-1 text-center text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">مساعدة</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const RichTextEditorComponent = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  readOnly,
  onOpenAI,
  isActive,
  autoFocus = false,
  autoFocusPosition = "end",
  onAutoFocusComplete,
  onNavigatePrevious,
  onNavigateNext,
  lineSpacing,
  onLineSpacingChange,
}: RichTextEditorProps) => {
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [pasteAnalysis, setPasteAnalysis] = useState<SmartPasteAnalysis | null>(null);
  const [pastedHtml, setPastedHtml] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [pasteReceipt, setPasteReceipt] = useState<SmartPasteAnalysis | null>(null);
  const [lastPastedRange, setLastPastedRange] = useState<{ from: number; to: number } | null>(null);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isDocumentImportOpen, setIsDocumentImportOpen] = useState(false);
  const [selectedEquationRange, setSelectedEquationRange] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [currentEquationText, setCurrentEquationText] = useState("");

  const onEditEquationRef = React.useRef<
    (data: { from: number; to: number; text: string }) => void
  >(() => {});
  const isNormalizingEditorRef = React.useRef(false);
  const isHandlingPasteRef = React.useRef(false);
  const onNavigatePreviousRef = React.useRef(onNavigatePrevious);
  const onNavigateNextRef = React.useRef(onNavigateNext);
  onNavigatePreviousRef.current = onNavigatePrevious;
  onNavigateNextRef.current = onNavigateNext;
  const normalizeEditorContentSoon = () => {
    requestAnimationFrame(() => {
      if (!editor || editor.isDestroyed || isNormalizingEditorRef.current) return;

      const currentHtml = editor.getHTML();
      const normalizedHtml = sanitizeHtmlForProseMirror(currentHtml);
      if (normalizedHtml && normalizedHtml !== currentHtml) {
        isNormalizingEditorRef.current = true;
        editor.commands.setContent(normalizedHtml, { emitUpdate: false });
        onChange?.(normalizedHtml);
        requestAnimationFrame(() => {
          isNormalizingEditorRef.current = false;
        });
      }
    });
  };

  const htmlNeedsPasteNormalization = (html: string) => {
    return /<br\s*\/?>|<p[^>]*>\s*<\/p>|<p[^>]*>\s*<br\s*\/?>\s*<\/p>|<li[^>]*>\s*(?:<p[^>]*>\s*(?:<br\s*\/?>)?\s*<\/p>|<br\s*\/?>)?\s*<\/li>/i.test(html);
  };

  const restoreSelection = (range: { from: number; to: number }) => {
    if (!editor || editor.isDestroyed) return;
    const maxPos = editor.state.doc.content.size;
    const from = Math.max(0, Math.min(range.from, maxPos));
    const to = Math.max(from, Math.min(range.to, maxPos));
    editor.commands.setTextSelection({ from, to });
  };

  const insertImportedHtml = (html: string, replaceRange?: { from: number; to: number }) => {
    if (!editor || editor.isDestroyed || !html) return null;
    const range = replaceRange || {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    restoreSelection(range);
    const safeHtml = sanitizeHtmlForProseMirror(html);
    editor.chain().focus().insertContentAt(range, safeHtml).run();
    const insertedTo = editor.state.selection.to;
    const insertedRange = { from: range.from, to: Math.max(range.from, insertedTo) };
    setLastPastedRange(insertedRange);
    normalizeEditorContentSoon();
    return insertedRange;
  };

  const handleClipboardPaste = (clipboardData: DataTransfer | null | undefined) => {
    if (!clipboardData) return false;

    const html = clipboardData.getData("text/html");
    const plain = clipboardData.getData("text/plain");
    const hasFiles = clipboardData.files && clipboardData.files.length > 0;

    const isSimpleSingleLine = !html && !hasFiles && !/[\r\n]/.test(plain);
    if (isSimpleSingleLine) return false;
    if (isHandlingPasteRef.current) return true;

    const selectionBeforePaste = editor
      ? { from: editor.state.selection.from, to: editor.state.selection.to }
      : { from: 0, to: 0 };

    isHandlingPasteRef.current = true;
    setIsPasting(true);
    cleanAndConvertHtml(html, plain, clipboardData.files)
      .then(({ html: cleanHtml, analysis }) => {
        setPasteAnalysis(analysis);
        setPasteReceipt(analysis);
        setPastedHtml(html);
        setPastedText(plain);

        try {
          insertImportedHtml(cleanHtml, selectionBeforePaste);
        } catch (err1) {
          console.warn("[RichTextEditor] insertContent failed with sanitized HTML, attempting text fallback", err1);
          try {
            if (plain) {
              restoreSelection(selectionBeforePaste);
              editor?.chain().focus().insertContentAt(selectionBeforePaste, plain).run();
            }
          } catch (err2) {
            console.error("[RichTextEditor] Text paste fallback failed", err2);
          }
        }
      })
      .catch(err => {
        console.error("Paste error", err);
      })
      .finally(() => {
        setIsPasting(false);
        isHandlingPasteRef.current = false;
      });

    return true;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: { color: "#3b82f6", width: 3 },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      TextStyle,
      Color,
      CustomImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      ParagraphSpacing,
      ParagraphStyle,
      AutoMathDirection,
      CustomListStyle,
      TipTapMathExtension.configure({
        onEditEquation: (data) => {
          if (onEditEquationRef.current) {
            onEditEquationRef.current(data);
          }
        },
      }),
      MixedBidiPipeline,
      Superscript,
      Subscript,
      BackgroundColor,
      LineHeight,
      TextIndent,
      AdvancedFormatting,
    ],
    content: value,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[40px] p-3 text-slate-800 dark:text-slate-200 outline-none",
        dir: "auto",
      },
      handlePaste: (_view, event, _slice) => {
        return handleClipboardPaste(event.clipboardData);
      },
      handleKeyDown: (view, event) => {
        if (
          event.isComposing ||
          event.shiftKey ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          !view.state.selection.empty
        ) {
          return false;
        }

        const { from, to } = view.state.selection;
        const lastCursorPosition = Math.max(1, view.state.doc.content.size - 1);

        if (event.key === "ArrowUp" && from <= 1 && onNavigatePreviousRef.current) {
          event.preventDefault();
          onNavigatePreviousRef.current();
          return true;
        }

        if (event.key === "ArrowDown" && to >= lastCursorPosition && onNavigateNextRef.current) {
          event.preventDefault();
          onNavigateNextRef.current();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const currentHtml = editor.getHTML();
      if (!isNormalizingEditorRef.current && htmlNeedsPasteNormalization(currentHtml)) {
        normalizeEditorContentSoon();
      }
      if (onChange) {
        onChange(currentHtml);
      }
    },
    onFocus: ({ editor }) => {
      if (onFocus) onFocus(editor);
    },
    onBlur: ({ editor }) => {
      if (onBlur) onBlur();
    }
  });

  useEffect(() => {
    if (editor) {
      (editor.view.dom as any).__tiptapEditor = editor;
      (editor as any).__openEquationEditor = (data: any) => onEditEquationRef.current(data);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!autoFocus || readOnly || !editor || editor.isDestroyed) return;

    const frame = requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      editor.commands.focus(autoFocusPosition);
      onAutoFocusComplete?.();
    });

    return () => cancelAnimationFrame(frame);
  }, [autoFocus, autoFocusPosition, editor, onAutoFocusComplete, readOnly]);

  onEditEquationRef.current = (data) => {
    setSelectedEquationRange({ from: data.from, to: data.to });
    setCurrentEquationText(data.text);
    setIsEquationModalOpen(true);
  };

  return (
    <div 
      className={`group relative w-full ${readOnly ? "block min-h-[auto] bg-transparent border-transparent h-auto" : "flex min-h-[56px] flex-col rounded-lg border border-transparent bg-white transition-all focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-500/10 dark:bg-slate-900 dark:focus-within:border-blue-800"}`}
      style={{
        "--card-line-spacing": `${lineSpacing || 0}px`,
      } as React.CSSProperties}
    >
      {!readOnly && (
        <div className={`${isActive ? "block" : "hidden group-focus-within:block"} z-20 w-full transition-all`}>
          <MenuBar 
            editor={editor} 
            onOpenEquation={() => setIsEquationModalOpen(true)}
            onOpenOcr={() => setIsOcrModalOpen(true)}
            onOpenFile={() => setIsDocumentImportOpen(true)}
            onOpenAI={onOpenAI}
            lineSpacing={lineSpacing}
            onLineSpacingChange={onLineSpacingChange}
          />
        </div>
      )}
      
      <div 
        className={`text-right ${readOnly ? "h-auto block overflow-visible" : "min-h-[56px] flex-1 overflow-visible"}`}
        dir="rtl"
        style={{
          "--card-line-spacing": `${lineSpacing || 0}px`,
        } as React.CSSProperties}
      >
      <EditorContent
        editor={editor}
          className={`${readOnly ? "h-auto block" : "min-h-full"}`} 
          style={{
            "--card-line-spacing": `${lineSpacing || 0}px`,
          } as React.CSSProperties}
        />
      </div>
      
      {isPasting && (
        <div className="absolute inset-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
            جاري معالجة المحتوى ولصقه بالتنسيق...
          </span>
        </div>
      )}

      {pasteReceipt && !isPasting && (
        <div
          className="mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-extrabold">تم تنظيف المحتوى وإدراجه بأمان</span>
          <span className="text-emerald-700 dark:text-emerald-300">
            {pasteReceipt.sourceApp === "Plain Text" ? "نص منسق" : pasteReceipt.sourceApp}
            {pasteReceipt.paragraphCount > 0 ? ` · ${pasteReceipt.paragraphCount} فقرة` : ""}
            {pasteReceipt.tableCount > 0 ? ` · ${pasteReceipt.tableCount} جدول` : ""}
            {pasteReceipt.imageCount > 0 ? ` · ${pasteReceipt.imageCount} صورة` : ""}
            {pasteReceipt.equationCount > 0 ? ` · ${pasteReceipt.equationCount} معادلة` : ""}
          </span>
          <span className="min-w-2 flex-1" />
          <button
            type="button"
            onClick={() => setIsAnalyzerOpen(true)}
            className="rounded-lg border border-emerald-300 bg-white/80 px-2 py-1 font-bold text-emerald-800 transition hover:bg-white dark:border-emerald-800 dark:bg-slate-900/70 dark:text-emerald-200"
          >
            مراجعة الاستيراد
          </button>
          <button
            type="button"
            onClick={() => setPasteReceipt(null)}
            className="rounded-md p-1 text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            aria-label="إخفاء إشعار الاستيراد"
            title="إخفاء"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <SmartPasteAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        onConfirm={(finalHtml) => {
          if (lastPastedRange) {
            insertImportedHtml(finalHtml, lastPastedRange);
          }
          setIsAnalyzerOpen(false);
          setPasteReceipt(null);
        }}
        analysis={pasteAnalysis}
        rawHtml={pastedHtml}
        rawPlainText={pastedText}
      />

      <EquationEditorModal
        isOpen={isEquationModalOpen}
        onClose={() => {
          setIsEquationModalOpen(false);
          setSelectedEquationRange(null);
        }}
        initialEquation={currentEquationText}
        onSave={(equationCode) => {
          if (editor && !editor.isDestroyed) {
            try {
              if (selectedEquationRange) {
                const maxPos = editor.state.doc.content.size;
                const safeFrom = Math.max(0, Math.min(selectedEquationRange.from, maxPos));
                const safeTo = Math.max(safeFrom, Math.min(selectedEquationRange.to, maxPos));
                if (safeFrom < safeTo) {
                  editor.chain().focus().deleteRange({ from: safeFrom, to: safeTo }).insertContent(equationCode).run();
                } else {
                  editor.chain().focus().insertContent(equationCode).run();
                }
              } else {
                editor.chain().focus().insertContent(equationCode).run();
              }
            } catch (err) {
              console.warn("Safe equation insert fallback:", err);
              try {
                editor.chain().focus().insertContent(equationCode).run();
              } catch (e) {}
            }
          }
          setIsEquationModalOpen(false);
          setSelectedEquationRange(null);
        }}
      />

      <OcrImportModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onImport={(html) => {
          if (!editor || editor.isDestroyed) return;
          const { html: normalizedHtml } = processCentralContentPipeline(html, {
            cleanWordJunk: true,
            convertEquations: true,
            normalizeLists: true,
          });
          insertImportedHtml(normalizedHtml);
          setPasteReceipt({
            sourceApp: "Plain Text",
            detectedTypes: ["ocr_import"],
            listCount: 0,
            tableCount: (normalizedHtml.match(/<table\b/gi) || []).length,
            imageCount: 0,
            equationCount: (normalizedHtml.match(/\$\$?|math-inline|math-block/gi) || []).length,
            linkCount: 0,
            paragraphCount: Math.max(1, (normalizedHtml.match(/<(?:p|div|li)\b/gi) || []).length),
            characterCount: normalizedHtml.replace(/<[^>]*>/g, "").length,
          });
        }}
      />

      <TableContextMenu editor={editor} />

      <DocumentImportModal
        isOpen={isDocumentImportOpen}
        onClose={() => setIsDocumentImportOpen(false)}
        onOpenOcr={() => setIsOcrModalOpen(true)}
        onImport={(html, mode) => {
          if (!editor || editor.isDestroyed) return;
          if (mode === "replace") {
            editor.commands.setContent(sanitizeHtmlForProseMirror(html), { emitUpdate: true });
            editor.commands.focus("end");
            normalizeEditorContentSoon();
            return;
          }
          insertImportedHtml(html);
        }}
      />
    </div>
  );
};

export const RichTextEditor = React.memo(
  RichTextEditorComponent,
  (prev, next) => {
    return (
      prev.value === next.value &&
      prev.placeholder === next.placeholder &&
      prev.isActive === next.isActive &&
      prev.autoFocus === next.autoFocus &&
      prev.autoFocusPosition === next.autoFocusPosition &&
      prev.readOnly === next.readOnly &&
      prev.lineSpacing === next.lineSpacing
    );
  },
);
