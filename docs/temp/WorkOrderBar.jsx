import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Pause, Play, Check } from 'lucide-react';
import { STATUS_STYLES, BOOKING_STATUSES, LANE_PAD } from '../config/planningConfig';

const BOOKING_STATUS_ICONS = {
  not_started: Minus,
  started: Play,
  paused: Pause,
  completed: Check,
};

function ResizeHandle({ side, visible, onMouseDown }) {
  const sideClass =
    side === 'right'
      ? 'right-0 rounded-r-xs'
      : 'left-0 rounded-l-xs';

  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-10 transition-all ${sideClass} ${
        visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
      }`}
    >
      <div className="flex flex-col gap-0.5 pointer-events-none">
        <span className="w-[2px] h-[2px] rounded-full bg-white" />
        <span className="w-[2px] h-[2px] rounded-full bg-white" />
        <span className="w-[2px] h-[2px] rounded-full bg-white" />
        <span className="w-[2px] h-[2px] rounded-full bg-white" />
        <span className="w-[2px] h-[2px] rounded-full bg-white" />
      </div>
    </div>
  );
}

export default function WorkOrderBar({
  order,
  geometry,
  laneIndex,
  laneHeight,
  isSelected,
  isResizing,
  isContextMenuOpen,
  onSelect,
  onDragStartExisting,
  onResizeStart,
  onContextMenu,
  onOpenWorkorder,
}) {
  const hoverTimerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);
  useEffect(() => {
    if (!isContextMenuOpen) return;
    clearTimeout(hoverTimerRef.current);
    setTooltip(null);
  }, [isContextMenuOpen]);

  const { dateToX, totalWidth } = geometry;
  const left = dateToX(order.start);
  const rawWidth = dateToX(order.end) - left;
  const width = Math.max(rawWidth, 24);

  if (left + width <= 0 || left >= totalWidth) {
    return null;
  }

  const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.in_progress;
  const bookingStatus = BOOKING_STATUSES[order.bookingStatus] ?? BOOKING_STATUSES.not_started;

  const top = laneIndex * laneHeight + LANE_PAD;
  const height = laneHeight - LANE_PAD * 3;

  const hideTooltip = () => {
    clearTimeout(hoverTimerRef.current);
    setTooltip(null);
  };

  const showTooltip = (event) => {
    if (isContextMenuOpen) return;
    clearTimeout(hoverTimerRef.current);
    const rect = event.currentTarget.getBoundingClientRect();
    hoverTimerRef.current = setTimeout(() => {
      setTooltip({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left),
      });
    }, 1000);
  };

  const popup = tooltip && createPortal(
    <div
      className="fixed z-[100] w-[300px] border border-stone-300 bg-[#fffef0] p-3 pb-5 text-tiny text-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.45)]"
      style={{ top: tooltip.top, left: tooltip.left }}
      onMouseMove={hideTooltip}
    >
      <div className="grid grid-cols-[40px_1fr] gap-x-2 leading-tight">
        <span>Aonr:</span>
        <span>{order.aonr || '–'}</span>
        <span>Modell:</span>
        <span>{[order.make, order.model].filter(Boolean).join(' ') || '–'}</span>
      </div>
      <div className="mt-2 text-tiny font-bold uppercase leading-tight">
        {order.customer || order.subtitle || '–'}
      </div>
      {order.note && (
        <div className="mt-1 whitespace-pre-line leading-tight">
          {order.note}
        </div>
      )}
      <div className="mt-3 border-t border-slate-500 pt-2">
        <div className="grid grid-cols-[85px_1fr_70px] gap-x-2 leading-tight">
          <span>Regnr</span>
          <span>{order.regnr || '–'}</span>
          <span className="text-right">{bookingStatus.label}</span>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div
      draggable={!isResizing}
      onDragStart={(e) => {
        hideTooltip();
        onDragStartExisting(e, order);
      }}
      onMouseEnter={showTooltip}
      onMouseMove={() => {
        if (tooltip) hideTooltip();
      }}
      onMouseLeave={hideTooltip}
      onClick={(e) => {
        hideTooltip();
        e.stopPropagation();
        onSelect(order);
      }}
      onContextMenu={(e) => {
        hideTooltip();
        onContextMenu(e, order);
      }}
      className={`group absolute border shadow-xs cursor-grab active:cursor-grabbing select-none overflow-hidden transition-shadow ${
        isSelected ? 'shadow-xl' : 'z-10'
      }`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: statusStyle.bg,
        borderColor: statusStyle.bg,
        // statusStyle.border
      }}
      title=''
      >
      {/* Content wrapper */}
      <div className="flex py-1 pl-3 pr-2 justify-between h-full px-2 text-white overflow-hidden gap-1">
        <div className="min-w-0 leading-[0.8em] flex-1">
          <div className="mt-[1px] flex min-w-0 items-center gap-1.5 text-tiny font-bold tracking-wide uppercase">
            <div
              className={`min-w-0 truncate ${
                order.workorderId ? 'hover:underline cursor-pointer' : ''
              }`}
              onClick={(e) => {
                if (!order.workorderId) return;
                e.stopPropagation();
                onOpenWorkorder?.(order);
              }}
              title={order.workorderId ? 'Öppna arbetsorder' : undefined}
            >
              {order.title}
            </div>
            {order.regnr ? <span className="pl-1 shrink-0">{order.regnr}</span> : null}
          </div>
          {order.subtitle && (
            <div className="text-tiny truncate font-medium text-white/90">
              {order.subtitle}
            </div>
          )}
        </div>

        {/* Circular booking status icon badge on the right */}
        <div
          className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center shadow-2xs border border-white ${bookingStatus.badgeBg} ${bookingStatus.badgeBorder} ${bookingStatus.badgeText}`}
          title={`Status: ${bookingStatus.label}`}
        >
          {(() => {
            const StatusIcon = BOOKING_STATUS_ICONS[order.bookingStatus] ?? BOOKING_STATUS_ICONS.not_started;
            return (
              <StatusIcon
                className="h-2.5 w-2.5"
                strokeWidth={3}
                fill={order.bookingStatus === 'started' || order.bookingStatus === 'paused' ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            );
          })()}
        </div>
      </div>

      {/* Resize handles */}
      <ResizeHandle
        side="left"
        visible={isResizing}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(order, 'start');
        }}
      />
      <ResizeHandle
        side="right"
        visible={isResizing}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(order, 'end');
        }}
      />
      </div>
      {popup}
    </>
  );
}
