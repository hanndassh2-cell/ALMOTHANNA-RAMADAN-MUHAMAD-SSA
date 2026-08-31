import React from "react";
import { CheckCircle2, Type, ZoomIn, ZoomOut, Hash, Layout, Globe, Clock } from "lucide-react";

export const StatusBar = ({
  wordCount,
  charCount,
  cardCount,
  pageCount,
  lastSaved,
  zoomLevel,
  setZoomLevel
}: {
  wordCount: number;
  charCount: number;
  cardCount: number;
  pageCount: number;
  lastSaved: string;
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
}) => {
  return (
    <div className="h-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 z-20">
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5" title="الكلمات / الحروف">
          <Type className="w-3.5 h-3.5 text-slate-400" />
          <span>{wordCount} كلمة / {charCount} حرف</span>
        </div>
        
        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
        
        <div className="flex items-center gap-1.5" title="عدد البطاقات">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          <span>{cardCount} بطاقات</span>
        </div>
        
        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
        
        <div className="flex items-center gap-1.5" title="الصفحات المتوقعة">
          <Layout className="w-3.5 h-3.5 text-slate-400" />
          <span>{pageCount} صفحة</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5" title="حالة الحفظ">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>آخر حفظ: {lastSaved}</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />
        </div>
        
        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
        
        <div className="flex items-center gap-1.5" title="لغة الكتابة">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>العربية</span>
        </div>
        
        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
        
        <div className="flex items-center gap-2" title="مستوى التكبير">
          <button 
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => setZoomLevel(100)} title="إعادة للوضع الطبيعي 100%">{Math.round(zoomLevel)}%</span>
          <button 
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
    </div>
  );
};
