import React from 'react';
import { GripVertical, Clock } from 'lucide-react';
import { STATUS_STYLES } from '../config/planningConfig';

function BacklogItem({ item, onDragStartNew, onSelect, onOpenWorkorder }) {
  const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.planned;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStartNew(e, item)}
      onClick={() => onSelect && onSelect(item)}
      className={`group relative cursor-grab select-none rounded-xs border px-2.5 py-1.5 shadow-xs transition-shadow hover:shadow-md active:cursor-grabbing ${style.text}`}
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <div className="min-w-0 leading-tight flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] font-bold uppercase">
            <span className="truncate">{item.title}</span>
            {item.regnr ? (
              <a
                href={`/workorder/${item.workorderId}`}
                className="shrink-0 underline decoration-dotted underline-offset-2 hover:opacity-70"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenWorkorder?.(item);
                }}
              >
                {item.regnr}
              </a>
            ) : null}
          </div>
          {item.subtitle && (
            <div className="text-[10px] truncate opacity-90">{item.subtitle}</div>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-current/20 pt-1 text-[9px] opacity-90">
        <span className="flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          <span className='ml-1 pt-[1px]'>
            {Math.round((item.durationMin / 60) * 10) / 10} tim
          </span>
        </span>
        {/* <span className="font-semibold">{style.label}</span> */}
      </div>
    </div>
  );
}

export default function UnplannedOrdersDrawer({
  backlog,
  isOpen,
  onClose,
  onDragStartNew,
  onSelectOrder,
  onOpenWorkorder,
}) {
  if (!isOpen) return null;

  return (
    <div className="w-60 flex flex-col shrink-0 select-none z-20 border-r border-slate-200">
      <div className="flex items-center justify-between px-3 pt-1.5 pb-2 bg-slate-50">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide mx-auto">
          Oplanerade ordrar ({backlog.length})
        </span>
        {/* <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
          title="Stäng kö"
        >
          <X className="w-3.5 h-3.5" />
        </button> */}
      </div>

      <div className="p-2 flex flex-col gap-2 overflow-y-auto flex-1">
        {backlog.map((item) => (
          <BacklogItem
            key={item.id}
            item={item}
            onDragStartNew={onDragStartNew}
            onSelect={onSelectOrder}
            onOpenWorkorder={onOpenWorkorder}
          />
        ))}

        {backlog.length === 0 && (
          <div className="text-xs text-slate-400 italic text-center py-6">
            Inga oplanerade ordrar i kö
          </div>
        )}
      </div>
    </div>
  );
}
