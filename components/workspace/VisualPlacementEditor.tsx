'use client';

import { useState, useRef, useCallback } from 'react';

const COLS = 12;
const ROWS = 8;
const CELL_SIZE = 28;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  label: string;
  hint: string;
  value: Rect;
  onChange: (rect: Rect) => void;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function VisualPlacementEditor({ label, hint, value, onChange }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; rect: Rect } | null>(null);

  const getCellFromEvent = useCallback((e: React.MouseEvent): { cx: number; cy: number } | null => {
    if (!gridRef.current) return null;
    const bounds = gridRef.current.getBoundingClientRect();
    const cx = Math.floor((e.clientX - bounds.left) / CELL_SIZE);
    const cy = Math.floor((e.clientY - bounds.top) / CELL_SIZE);
    return { cx: clamp(cx, 0, COLS - 1), cy: clamp(cy, 0, ROWS - 1) };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(mode);
    setDragStart({ mx: e.clientX, my: e.clientY, rect: { ...value } });
  }, [value]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart) return;

    const dx = Math.round((e.clientX - dragStart.mx) / CELL_SIZE);
    const dy = Math.round((e.clientY - dragStart.my) / CELL_SIZE);
    const r = dragStart.rect;

    if (dragging === 'move') {
      onChange({
        x: clamp(r.x + dx, 0, COLS - r.w),
        y: clamp(r.y + dy, 0, ROWS - r.h),
        w: r.w,
        h: r.h,
      });
    } else {
      onChange({
        x: r.x,
        y: r.y,
        w: clamp(r.w + dx, 1, COLS - r.x),
        h: clamp(r.h + dy, 1, ROWS - r.y),
      });
    }
  }, [dragging, dragStart, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setDragStart(null);
  }, []);

  // Click on empty cell to move block there
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    onChange({
      x: clamp(cell.cx, 0, COLS - value.w),
      y: clamp(cell.cy, 0, ROWS - value.h),
      w: value.w,
      h: value.h,
    });
  }, [getCellFromEvent, value, onChange, dragging]);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-gray-300">{label}</p>
        <p className="text-xs text-gray-600">{hint}</p>
      </div>

      {/* Mini grid */}
      <div
        ref={gridRef}
        className="relative rounded-lg border border-gray-600 overflow-hidden cursor-crosshair select-none"
        style={{
          width: COLS * CELL_SIZE,
          height: ROWS * CELL_SIZE,
          backgroundImage: 'linear-gradient(to right, #374151 1px, transparent 1px), linear-gradient(to bottom, #374151 1px, transparent 1px)',
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          backgroundColor: '#1f2937',
        }}
        onClick={handleCellClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Block preview */}
        <div
          className="absolute bg-emerald-500/30 border-2 border-emerald-500 rounded-md flex items-center justify-center"
          style={{
            left: value.x * CELL_SIZE,
            top: value.y * CELL_SIZE,
            width: value.w * CELL_SIZE,
            height: value.h * CELL_SIZE,
          }}
        >
          {/* Move handle (center) */}
          <div
            className="absolute inset-0 cursor-move"
            onMouseDown={e => handleMouseDown(e, 'move')}
          />
          {/* Resize handle (bottom-right corner) */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-tl cursor-se-resize"
            onMouseDown={e => handleMouseDown(e, 'resize')}
          />
          <span className="text-xs text-emerald-300 font-mono pointer-events-none">
            {value.w}x{value.h}
          </span>
        </div>
      </div>

      {/* Position readout */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span>x: {value.x}</span>
        <span>y: {value.y}</span>
        <span>w: {value.w}</span>
        <span>h: {value.h}</span>
      </div>
    </div>
  );
}
