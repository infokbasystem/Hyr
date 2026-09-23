import React, { useEffect, useRef } from 'react';
import { MONTHS_SV, WEEKDAYS_SV, WEEKDAYS_SHORT_SV } from '../config/planningConfig';
import { addDays, isSameDay, startOfDay } from '../utils/planningDateUtils';

const DAYS_BEFORE = 10;
const DAYS_AFTER = 30;
const TOTAL_DAYS = DAYS_BEFORE + 1 + DAYS_AFTER;
// Days before today that should stay visible at the left edge on first render
const SCROLL_LEAD_DAYS = 2;
const DAY_WIDTH = 64;

// Deterministic pseudo-utilization (0-100) so the placeholder bars stay stable across renders
function getUtilizationPct(dateStr, isWeekend) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const pct = hash % 101;
  return isWeekend ? Math.round(pct * 0.35) : pct;
}

const UTILIZATION_BAR_COLORS = ['bg-emerald-500', 'bg-lime-500', 'bg-yellow-400', 'bg-orange-500', 'bg-rose-600'];

// Converts a 0-100 utilization percentage into a 0-5 filled bar count
function getUtilizationLevel(pct) {
  return Math.min(5, Math.round(pct / 20));
}

export default function MinimapCalendarPlaceholder({
  anchorDate,
  onSelectDate,
}) {
  const today = startOfDay(new Date());
  const baseDate = anchorDate ? startOfDay(anchorDate) : today;

  // The window is fixed around today: 10 days back, 30 days forward.
  const rangeStart = addDays(today, -DAYS_BEFORE);

  const scrollRef = useRef(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (hasScrolledRef.current || !scrollRef.current) {
      return;
    }
    scrollRef.current.scrollLeft = (DAYS_BEFORE - SCROLL_LEAD_DAYS) * DAY_WIDTH;
    hasScrolledRef.current = true;
  }, []);

  // Generate the day window
  const days = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const date = addDays(rangeStart, i);
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const name = WEEKDAYS_SV[date.getDay()];
    const isWeekend = name === 'lördag' || name === 'söndag';
    return {
      date,
      dayNum: date.getDate(),
      name,
      dateStr,
      utilizationPct: getUtilizationPct(dateStr, isWeekend),
    };
  });

  // Group consecutive days by month so the month bar can span each month's columns
  const monthSegments = [];
  days.forEach((day) => {
    const [year, month] = day.dateStr.split('-');
    const monthKey = `${year}-${month}`;
    const last = monthSegments[monthSegments.length - 1];
    if (last && last.key === monthKey) {
      last.count += 1;
    } else {
      monthSegments.push({ key: monthKey, year, monthIndex: Number(month) - 1, count: 1 });
    }
  });

  return (
    <div className="flex flex-col flex-1 self-start min-w-0 overflow-hidden select-none mt-2 px-10">
      <div ref={scrollRef} className="overflow-x-auto min-w-0">
        <div style={{ width: TOTAL_DAYS * DAY_WIDTH }}>
          {/* Month bar */}
          <div className="flex border-b border-slate-300">
            {monthSegments.map((seg) => (
              <div
                key={seg.key}
                style={{ width: seg.count * DAY_WIDTH }}
                className="shrink-0 border-r border-slate-200 last:border-r-0"
              >
                <div className="sticky left-0 w-max px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate">
                  {MONTHS_SV[seg.monthIndex]} {seg.year}
                </div>
              </div>
            ))}
          </div>

          {/* Day columns strip */}
          <div className="relative flex h-18 pb-4">
            {days.map((day) => {
              const isSelected = isSameDay(day.date, baseDate);
              const isWeekend = day.name === 'lördag' || day.name === 'söndag';
              return (
                <button
                  type="button"
                  key={day.dateStr}
                  style={{ width: DAY_WIDTH }}
                  onClick={() => {
                    if (onSelectDate) {
                      onSelectDate(day.date);
                    }
                  }}
                  className={`shrink-0 flex flex-col items-center justify-between py-1 border-r border-b border-slate-300 transition-colors text-left relative uppercase ${
                    isSelected
                      ? 'bg-lime-200/50'
                      : isWeekend
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-tiny font-medium truncate px-0.5 ${
                    isWeekend
                        ? 'text-red-500'
                        : 'text-slate-600'
                  }`}>
                    {WEEKDAYS_SHORT_SV[day.date.getDay()]}, {day.dayNum}
                  </div>

                  {/* Utilization indicator: 0-5 horizontal bars, green (low) to red (high) */}
                  <div
                    className="flex flex-col items-start justify-center gap-0.25 h-6 mb-1"
                    title={`Beläggning: ${day.utilizationPct}%`}
                  >
                    {UTILIZATION_BAR_COLORS.map((color, index) => (
                      <div
                        key={index}
                        className={`h-1 w-3 rounded-xs ${
                          index < getUtilizationLevel(day.utilizationPct)
                            ? color
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Viewport Range Slider Bar underneath */}
      {/* <div className="relative h-6 bg-[#ececec] border-t border-slate-200 flex items-center justify-center">
        <div className="absolute left-[44%] -translate-x-1/2 flex flex-col items-center">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 border border-amber-600/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 leading-none">
            <span>2026-09-08 - 2026-09-08</span>
          </div>
          <div className="w-12 h-1 bg-amber-500 rounded-full mt-0.5 shadow-xs" />
        </div>
      </div> */}
    </div>
  );
}
