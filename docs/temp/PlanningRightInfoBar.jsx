import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Copy, Move, Settings, Minus, Pause, Play, Check } from 'lucide-react';
import {
  BOOKING_STATUSES,
  STATUS_STYLES,
  COLOR_LEGENDS,
} from '../config/planningConfig';
import { formatTimeRange } from '../utils/planningDateUtils';

const BOOKING_STATUS_ICONS = {
  not_started: Minus,
  started: Play,
  paused: Pause,
  completed: Check,
};

export default function PlanningRightInfoBar({
  selectedOrder,
  resourceName,
  onStatusChange,
  onOpenWorkorder,
  onCopyWorkorder,
  onMoveWorkorder,
  onManualRefresh,
}) {
  const [secondsToRefresh, setSecondsToRefresh] = useState(73);

  // Auto-refresh countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsToRefresh((prev) => (prev <= 1 ? 90 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshClick = () => {
    setSecondsToRefresh(90);
    if (onManualRefresh) onManualRefresh();
  };

  const currentBookingStatusKey = selectedOrder?.bookingStatus ?? 'not_started';
  const workorderStatusStyle = selectedOrder ? (STATUS_STYLES[selectedOrder.status] ?? STATUS_STYLES.in_progress) : null;

  return (
    <aside className="w-[260px] bg-[#f7f8fa] p-3 flex flex-col text-xs text-slate-700 select-none overflow-y-auto shrink-0 shadow-xs">
      {/* Top refresh indicator */}
      <div className="flex items-center justify-between text-tiny border-b border-slate-200 pb-2">
        <span className="text-slate-500">
          Tid till refresh <strong className="text-slate-700">{secondsToRefresh} sek.</strong>
        </span>
        <button
          type="button"
          onClick={handleRefreshClick}
          className="font-bold text-tiny text-slate-700 hover:text-blue-700 uppercase tracking-tight flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Uppdatera nu
        </button>
      </div>

      {/* Beläggning & Budget meters */}
      <div className="flex flex-col gap-2 border-b border-slate-200 py-5">
        <div className="flex items-center justify-between gap-2">
          <span className="w-15 text-tiny text-slate-600">Beläggning</span>
          <div className="flex-1 h-5 bg-slate-200 rounded-xs overflow-hidden relative flex items-center justify-center">
            <div
              className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: '88%' }}
            />
            <span className="relative z-10 text-tiny font-bold text-white drop-shadow-xs">
              88%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="w-15 text-tiny text-slate-600">Budget</span>
          <div className="flex-1 h-5 bg-slate-200 rounded-xs overflow-hidden relative flex items-center px-2">
            <div
              className="absolute inset-0 bg-slate-300"
              style={{ width: '65%' }}
            />
            <span className="relative z-10 text-tiny font-semibold text-slate-700">
              1068kr
            </span>
          </div>
        </div>
      </div>

      {/* Vald bokning */}
      <div className={`py-3 transition-opacity ${selectedOrder ? '' : 'opacity-40'}`}>
        <div className="font-semibold text-xs text-slate-800 mb-2">Vald bokning</div>

        {selectedOrder ? (
          <div className="flex flex-col gap-1.5 text-tiny">
            {/* Interactive Status Badges */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <div className="flex items-center gap-1.5">
                {Object.entries(BOOKING_STATUSES).map(([key, item]) => {
                  const isActive = currentBookingStatusKey === key;
                  const StatusIcon = BOOKING_STATUS_ICONS[key] ?? Minus;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => onStatusChange && onStatusChange(selectedOrder.id, key)}
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-tiny font-bold border transition-transform ${
                        item.badgeBg
                      } ${item.badgeBorder} ${item.badgeText} ${
                        isActive ? 'ring-2 ring-blue-600 ring-offset-1 scale-110 shadow-xs' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={item.label}
                    >
                      <StatusIcon
                        className="h-2.5 w-2.5"
                        strokeWidth={3}
                        fill={key === 'started' || key === 'paused' ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-slate-500">Mekaniker</span>
              <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                {resourceName ?? '–'}
              </span>
            </div>

            <div className="flex items-start justify-between">
              <span className="text-slate-500">Period</span>
              <span className="font-semibold text-slate-800">
                {formatTimeRange(selectedOrder.start, selectedOrder.end)}
              </span>
            </div>

            {/* <div className="flex flex-col gap-0.5 mt-0.5">
              <span className="text-slate-500">Anteckning</span>
              <div className="p-1.5 bg-white border border-slate-300 rounded-xs text-tiny text-slate-800 min-h-[38px] leading-snug">
                {selectedOrder.note || <span className="text-slate-400 italic">Ingen anteckning</span>}
              </div>
            </div> */}
          </div>
        ) : (
          <div className="text-tiny text-slate-400 italic py-2">
            Klicka på en bokning i schemat för att visa detaljer
          </div>
        )}
      </div>

      {/* Vald arbetsorder */}
      <div className={`border-b border-slate-200 py-3 transition-opacity ${selectedOrder ? '' : 'opacity-40'}`}>
        <span className="font-semibold text-xs text-slate-800">Vald arbetsorder</span>

        <div className="flex items-center justify-end my-2">
          {selectedOrder && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenWorkorder && onOpenWorkorder(selectedOrder)}
                className="flex items-center gap-0.5 text-tiny text-slate-600 hover:text-blue-700 font-semibold uppercase"
                title="Visa arbetsorder"
              >
                <Settings className="w-3 h-3" />
                <span>Visa AO</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onCopyWorkorder && onCopyWorkorder(selectedOrder)}
                className="flex items-center gap-0.5 text-tiny text-slate-600 hover:text-blue-700 font-semibold uppercase"
                title="Kopiera"
              >
                <Copy className="w-3 h-3" />
                <span>Kopiera</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onMoveWorkorder && onMoveWorkorder(selectedOrder)}
                className="flex items-center gap-0.5 text-tiny text-slate-600 hover:text-blue-700 font-semibold uppercase"
                title="Flytta"
              >
                <Move className="w-3 h-3" />
                <span>Flytta</span>
              </button>
            </div>
          )}
        </div>

        {selectedOrder ? (
          <div className="flex flex-col gap-1 text-tiny">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-slate-800">
                {workorderStatusStyle?.label ?? selectedOrder.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Aonr</span>
              <span className="font-bold text-slate-800">
                {selectedOrder.aonr || '–'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Regnr</span>
              <span className="font-bold text-slate-800 uppercase">
                {selectedOrder.regnr || selectedOrder.title || '–'}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-slate-500">Kund</span>
              <span className="font-semibold text-slate-800 truncate max-w-[140px] text-right">
                {selectedOrder.customer || selectedOrder.subtitle || '–'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Modell</span>
              <span className="font-medium text-slate-800">
                {selectedOrder.model || '–'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Fabrikat</span>
              <span className="font-medium text-slate-800">
                {selectedOrder.make || '–'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-tiny text-slate-400 italic py-2">
            Ingen arbetsorder vald
          </div>
        )}
      </div>

      {/* Bokningsstatus Legend */}
      <div className="border-b border-slate-200 py-3">
        <div className="font-semibold text-xs text-slate-800 mb-1.5">Bokningsstatus</div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-tiny">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-sky-500 bg-sky-400 text-white flex items-center justify-center font-bold text-[8px]">
              <Minus className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-slate-600">Ej påbörjad</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-blue-600 bg-blue-500 text-white flex items-center justify-center font-bold text-[8px]">
              <Pause className="h-3 w-3" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="text-slate-600">Pausad</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-rose-600 bg-rose-500 text-white flex items-center justify-center font-bold text-[8px]">
              <Play className="h-3 w-3" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="text-slate-600">Påbörjad</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-emerald-600 bg-emerald-500 text-white flex items-center justify-center font-bold text-[8px]">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-slate-600">Klar</span>
          </div>
        </div>
      </div>

      {/* Färgkodningar Legend */}
      <div className="py-3">
        <div className="font-semibold text-xs text-slate-800 mb-1.5">Färgkodningar</div>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-tiny">
          {COLOR_LEGENDS.map((legend) => (
            <div key={legend.id} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: legend.color }}
              />
              <span className="text-slate-600 truncate">{legend.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
