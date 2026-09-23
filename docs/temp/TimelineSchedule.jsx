import React, { useRef, useEffect, useState } from 'react';
import {
  RESOURCE_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  PRODUCTIVE_RESOURCE_COLOR,
  NON_PRODUCTIVE_RESOURCE_COLOR,
} from '../config/planningConfig';
import {
  formatDayHeader,
  formatHour,
  addMinutes,
  extractTimeOfDayHours,
  formatTimeOfDay,
} from '../utils/planningDateUtils';
import WorkOrderBar from './WorkOrderBar';

const DEFAULT_HOUR_WIDTH = 88;
const ABSENCE_BACKGROUND_STYLE = {
  backgroundColor: '#fefbfb',
  backgroundImage: 'repeating-linear-gradient(-45deg, #fadcdc 0px, #fadcdc 1px, transparent 1px, transparent 4px)',
};

// Tracks the scroll container's width so hour columns can stretch to fill it
function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// Builds a "name HH:mm-HH:mm" label, omitting the time range when start/end are missing.
function formatShiftLabel(name, start, end) {
  const startLabel = formatTimeOfDay(start);
  const endLabel = formatTimeOfDay(end);
  const range = startLabel && endLabel ? `${startLabel}-${endLabel}` : null;
  if (!name && !range) return null;
  return [name, range].filter(Boolean).join(' ');
}

// Shows the clocked-in shift when present; the planned shift is only added in parenthesis
// when it differs from the clocked-in one.
function resolveShiftLine(resource) {
  if (resource.isAbsent) {
    return resource.shiftName ?? null;
  }

  const plannedLabel = formatShiftLabel(resource.shiftName, resource.shiftStart, resource.shiftEnd);
  const clockedLabel = formatShiftLabel(resource.clockedShiftName, resource.clockedShiftStart, resource.clockedShiftEnd);

  if (!clockedLabel) {
    return plannedLabel;
  }

  const isSameShift = resource.shiftId != null && resource.shiftId === resource.clockedShiftId;
  if (!plannedLabel || isSameShift) {
    return clockedLabel;
  }

  return `${clockedLabel} (${plannedLabel})`;
}

// Absent if the planned shift is an absence type, or if currently clocked into one
// (e.g. planned for a normal shift but clocked in sick).
function isResourceAbsentNow(resource) {
  return resource.isAbsent || resource.isClockedShiftAbsent;
}

function ResourceLabel({ resource, rowHeight, onContextMenu }) {
  const backgroundColor = resource.color
    ?? (resource.isProductive === false ? NON_PRODUCTIVE_RESOURCE_COLOR : PRODUCTIVE_RESOURCE_COLOR);
  const shiftLine = resolveShiftLine(resource);

  return (
    <div
      onContextMenu={(e) => onContextMenu(e, resource)}
      className="flex items-center justify-between gap-2 pl-3 pr-5 border-b border-white/20 select-none transition-colors"
      style={{
        width: `${RESOURCE_COL_WIDTH}px`,
        height: `${rowHeight}px`,
        flex: '0 0 auto',
        backgroundColor,
      }}
      title={resource.isProductive === false ? `${resource.name} (Ej produktiv)` : `${resource.name} (Produktiv)`}
    >
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-xs text-gray-200 truncate">
          {resource.name}
        </span>

        {shiftLine ? (
          <span className={`mt-[2px] text-tiny truncate ${resource.isAbsent ? 'text-amber-300' : 'text-gray-200/80'}`}>
            {shiftLine}
          </span>
        ) : null}
      </div>

      {resource.group ? (
        <span className="text-xs text-gray-200/80 truncate shrink-0">
          {resource.group}
        </span>
      ) : null}
    </div>
  );
}

function GridBackground({ geometry, dayStart, dayEnd, hideLines = false }) {
  const { totalHours, hourWidth } = geometry;
  const minuteWidth = hourWidth / 6;

  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {[...Array(totalHours)].map((_, h) => (
        <div
          key={h}
          className={`relative h-full ${hideLines ? '' : 'border-r border-slate-300'}`}
          style={{ width: `${hourWidth}px`, flex: '0 0 auto' }}
        >
          {/* 10-minute / 15-minute subdivision lines */}
          {!hideLines && [...Array(6)].map((_, m) => {
            if (m === 0) return null;
            return (
              <div
                key={m}
                className="absolute top-0 bottom-0 border-l border-slate-100"
                style={{ left: `${m * minuteWidth}px` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TimelineHeader({ geometry, anchorDate }) {
  const { totalHours, hourWidth, dayStart } = geometry;
  const minuteWidth = hourWidth / 6;
  const dayLabel = formatDayHeader(anchorDate);

  return (
    <div className="flex sticky top-0 z-30 border-b border-slate-300 shadow-2xs select-none">
      {/* Top-left corner box above resources */}
      <div
        className="flex items-top pt-1.5 px-3 border-r border-slate-300 font-bold text-xs text-slate-700 uppercase tracking-tight truncate"
        style={{ width: `${RESOURCE_COL_WIDTH}px`, flex: '0 0 auto', height: '28px' }}
      >
        {dayLabel}
      </div>

      {/* Hour columns header */}
      <div className="flex">
        {[...Array(totalHours)].map((_, h) => {
          const hourNum = dayStart + h;
          return (
            <div
              key={h}
              className="relative text-[11px] font-semibold text-slate-600 border-r border-slate-300 px-1.5 flex flex-col justify-between"
              style={{ width: `${hourWidth}px`, flex: '0 0 auto', height: '28px' }}
            >
              <span className="leading-tight pt-1.5">{formatHour(hourNum)}</span>
              {/* Minute ticks along the bottom */}
              <div className="absolute left-0 right-0 bottom-0 h-1.5 flex">
                {[...Array(6)].map((_, m) => {
                  if (m === 0) return null;
                  return (
                    <div
                      key={m}
                      className="absolute bottom-0 w-px h-1 bg-slate-300"
                      style={{ left: `${m * minuteWidth}px` }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftBreakIndicators({ resource, geometry, dayStart, dayEnd }) {
  const breakRanges = [
    [resource.break1Start, resource.break1End],
    [resource.break2Start, resource.break2End],
    [resource.break3Start, resource.break3End],
  ].map(([start, end]) => [extractTimeOfDayHours(start), extractTimeOfDayHours(end)])
    .filter(([start, end]) => start !== null && end !== null && end > start);

  if (resource.isAbsent || breakRanges.length === 0) {
    return null;
  }

  const shiftBoundaries = [
    extractTimeOfDayHours(resource.shiftStart),
    extractTimeOfDayHours(resource.shiftEnd),
  ].filter((hour) => hour !== null && hour >= dayStart && hour <= dayEnd);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {breakRanges.map(([start, end], index) => {
        const visibleStart = Math.max(start, dayStart);
        const visibleEnd = Math.min(end, dayEnd);
        if (visibleEnd <= visibleStart) return null;

        return (
          <div
            key={`${start}-${end}-${index}`}
            className="absolute inset-y-0 border-r border-slate-300"
            style={{
              ...ABSENCE_BACKGROUND_STYLE,
              left: `${(visibleStart - dayStart) * geometry.hourWidth}px`,
              width: `${(visibleEnd - visibleStart) * geometry.hourWidth}px`,
            }}
          />
        );
      })}

      {shiftBoundaries.map((hour, index) => (
        <div
          key={`${hour}-${index}`}
          className="absolute inset-y-0 w-0.5 bg-red-600"
          style={{ left: `${(hour - dayStart) * geometry.hourWidth}px` }}
        />
      ))}
    </div>
  );
}

function ResourceRow({
  resource,
  orders,
  geometry,
  dayStart,
  dayEnd,
  rowHeight,
  laneHeight,
  laneOf,
  selectedOrderId,
  resizingId,
  isContextMenuOpen,
  onSelectOrder,
  onDrop,
  onDragStartExisting,
  onResizeStart,
  onOrderContextMenu,
  onOpenWorkorder,
}) {
  const isAbsentNow = isResourceAbsentNow(resource);

  return (
    <div
      className="relative border-b border-slate-200"
      style={{
        width: `${geometry.totalWidth}px`,
        height: `${rowHeight}px`,
        ...(isAbsentNow ? ABSENCE_BACKGROUND_STYLE : { backgroundColor: '#ffffff' }),
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDrop(e, resource.id, geometry)}
    >
      <GridBackground geometry={geometry} dayStart={dayStart} dayEnd={dayEnd} hideLines={isAbsentNow} />

      <ShiftBreakIndicators
        resource={resource}
        geometry={geometry}
        dayStart={dayStart}
        dayEnd={dayEnd}
      />

      <div className="pointer-events-none absolute inset-y-0 right-0 border-r border-slate-300" />

      {orders.map((o) => (
        <WorkOrderBar
          key={o.id}
          order={o}
          geometry={geometry}
          laneIndex={laneOf[o.id] ?? 0}
          laneHeight={laneHeight}
          isSelected={selectedOrderId === o.id}
          isResizing={resizingId === o.id}
          isContextMenuOpen={isContextMenuOpen}
          onSelect={onSelectOrder}
          onDragStartExisting={onDragStartExisting}
          onResizeStart={onResizeStart}
          onContextMenu={onOrderContextMenu}
          onOpenWorkorder={onOpenWorkorder}
        />
      ))}
    </div>
  );
}

export default function TimelineSchedule({
  resources,
  ordersByResource,
  lanesByResource,
  geometry,
  anchorDate,
  dayStart,
  dayEnd,
  rowHeight = DEFAULT_ROW_HEIGHT,
  selectedOrderId,
  resizingId,
  isContextMenuOpen,
  onSelectOrder,
  onDrop,
  onDragStartExisting,
  onResizeStart,
  onOrderContextMenu,
  onResourceContextMenu,
  onEffectiveHourWidthChange,
  onOpenWorkorder,
}) {
  const [containerRef, containerWidth] = useContainerWidth();

  // Stretch hour columns to fill the available width; zooming in can still grow beyond it
  const availableWidth = Math.max(containerWidth - RESOURCE_COL_WIDTH, 0);
  const fillHourWidth = geometry.totalHours > 0 ? availableWidth / geometry.totalHours : DEFAULT_HOUR_WIDTH;
  const hourWidth = Math.max(55, fillHourWidth + (geometry.hourWidth - DEFAULT_HOUR_WIDTH));
  const totalWidth = geometry.totalHours * hourWidth;

  // Let the parent know the actually-rendered hourWidth so drag/resize math stays in sync with pixels on screen
  useEffect(() => {
    onEffectiveHourWidthChange?.(hourWidth);
  }, [hourWidth, onEffectiveHourWidthChange]);

  const displayGeometry = hourWidth === geometry.hourWidth ? geometry : {
    ...geometry,
    hourWidth,
    minuteWidth: hourWidth / 60,
    totalWidth,
    dateToX: (dateInput) => {
      if (!dateInput) return 0;
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      const hrs = date.getHours() + date.getMinutes() / 60;
      const clamped = Math.min(Math.max(hrs, dayStart), dayEnd);
      return (clamped - dayStart) * hourWidth;
    },
    xToDropTime: (x) => {
      const clampedX = Math.min(Math.max(x, 0), totalWidth - 1);
      const hourFrac = dayStart + clampedX / hourWidth;
      const snappedMinutes = Math.round((hourFrac * 60) / 5) * 5;
      const start = new Date(geometry.viewDay);
      start.setHours(0, snappedMinutes, 0, 0);
      return start;
    },
  };

  return (
    <div ref={containerRef} className="flex-1 min-w-0 overflow-auto">
      <div style={{ width: `${RESOURCE_COL_WIDTH + displayGeometry.totalWidth}px` }}>
        {/* Sticky Timeline Header */}
        <TimelineHeader geometry={displayGeometry} anchorDate={anchorDate} />

        {/* Resources and Row Grids */}
        {resources.map((resource) => {
          const lanes = lanesByResource[resource.id] ?? { laneById: {}, laneCount: 1 };
          const resourceRowHeight = rowHeight * lanes.laneCount;

          return (
            <div key={resource.id} className="flex">
              {/* Sticky Left Resource Column */}
              <div className="sticky left-0 z-20 shadow-2xs">
                <ResourceLabel
                  resource={resource}
                  rowHeight={resourceRowHeight}
                  onContextMenu={onResourceContextMenu}
                />
              </div>

              {/* Grid Timeline Row */}
              <ResourceRow
                resource={resource}
                orders={ordersByResource[resource.id] || []}
                geometry={displayGeometry}
                dayStart={dayStart}
                dayEnd={dayEnd}
                rowHeight={resourceRowHeight}
                laneHeight={rowHeight}
                laneOf={lanes.laneById}
                selectedOrderId={selectedOrderId}
                resizingId={resizingId}
                isContextMenuOpen={isContextMenuOpen}
                onSelectOrder={onSelectOrder}
                onDrop={onDrop}
                onDragStartExisting={onDragStartExisting}
                onResizeStart={onResizeStart}
                onOrderContextMenu={onOrderContextMenu}
                onOpenWorkorder={onOpenWorkorder}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
