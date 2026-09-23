import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MiniCalendarPlaceholder({
  selectedDate,
  onSelectDate,
}) {
  const currentDay = selectedDate ? selectedDate.getDate() : 8;

  // Static matrix for September 2026 for placeholder
  const weeks = [
    { weekNum: 36, days: [{ day: 31, isPrev: true }, { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }] },
    { weekNum: 37, days: [{ day: 7 }, { day: 8 }, { day: 9 }, { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 }] },
    { weekNum: 38, days: [{ day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }] },
    { weekNum: 39, days: [{ day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }] },
    { weekNum: 40, days: [{ day: 28 }, { day: 29 }, { day: 30 }, { day: 1, isNext: true }, { day: 2, isNext: true }, { day: 3, isNext: true }, { day: 4, isNext: true }] },
  ];

  return (
    <div className="w-48 bg-white border border-slate-300 rounded shadow-xs p-1 text-[11px] select-none shrink-0 flex flex-col justify-between">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-1 py-0.5 border-b border-slate-200">
        <button
          type="button"
          className="p-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
          title="Föregående månad"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-semibold text-slate-700 text-xs">september 2026</span>
        <button
          type="button"
          className="p-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
          title="Nästa månad"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center font-semibold text-slate-500 text-[10px] pt-1">
        <div>må</div>
        <div>ti</div>
        <div>on</div>
        <div>to</div>
        <div>fr</div>
        <div>lö</div>
        <div>sö</div>
      </div>

      {/* Days grid */}
      <div className="flex flex-col gap-0.5 py-0.5">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 text-center">
            {week.days.map((item, dIdx) => {
              const isSelected = !item.isPrev && !item.isNext && item.day === currentDay;
              const isOtherMonth = item.isPrev || item.isNext;

              return (
                <button
                  type="button"
                  key={dIdx}
                  onClick={() => {
                    if (!isOtherMonth && onSelectDate) {
                      onSelectDate(new Date(2026, 8, item.day));
                    }
                  }}
                  className={`h-4.5 flex items-center justify-center rounded text-[10px] leading-none transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : isOtherMonth
                      ? 'text-slate-300'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
