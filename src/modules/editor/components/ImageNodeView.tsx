import React, { useCallback, useRef, useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

export const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
  getPos
}) => {
  const { src, alt, width, height, textAlign } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Fallback to text-align if style isn't directly on the node attrs, 
  // though Tiptap TextAlign extension adds `textAlign` attr to the node.
  const align = textAlign || 'center'; 
  const isSelected = selected;

  // Resize logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      // Only resizing width for aspect ratio lock
      // If aligned left/right, calculate from the appropriate edge? 
      // For simplicity, just use distance from left edge of image
      const newWidth = Math.max(50, e.clientX - rect.left);
      updateAttributes({ width: `${newWidth}px`, height: null });
    },
    [isResizing, updateAttributes]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleClick = useCallback(() => {
    if (typeof getPos === 'function') {
      editor.commands.setNodeSelection(getPos());
    }
  }, [editor, getPos]);

  // Determine flex justification based on alignment
  let justifyClass = 'justify-center';
  if (align === 'left') justifyClass = 'justify-start';
  if (align === 'right') justifyClass = 'justify-end';

  return (
    <NodeViewWrapper className={`flex w-full my-4 ${justifyClass}`} as="div" onClick={handleClick}>
      <div className="relative inline-block" style={{ maxWidth: '100%', userSelect: 'none' }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width ? parseInt(width) : undefined}
          height={height ? parseInt(height) : undefined}
          style={{
            width: width || 'auto',
            height: height || 'auto',
            maxWidth: '100%',
            display: 'block',
          }}
          className={`rounded-sm transition-all outline outline-2 outline-offset-2 ${isSelected ? 'outline-blue-500' : 'outline-transparent'} ${isResizing ? 'opacity-80' : ''}`}
          draggable={false}
        />
        {isSelected && (
          <div
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-10 flex items-center justify-center shadow-sm"
            onMouseDown={handleMouseDown}
          >
             <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
