import { memo, useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CalendarSearch, Calendar, ChevronLeft, ChevronRight, Info, LoaderCircle, RotateCw, X } from 'lucide-react';
import PlanningItemSearchModal from '../../modals/PlanningItemSearchModal';
import ItemInfoModal from '../../modals/ItemInfoModal';
import FilterSelect from '../../components/FilterSelect';
import SegmentedFilter from '../../components/SegmentedFilter';
import DateRangePicker from '../../components/DaterangePicker';
import ActionButton from '../../components/ActionButton';
import { PLANNING_STATUS_COLORS as STATUS_COLORS } from '../../lib/planningStatus';
import { getPlanningCategories, getPlanningLifts, getPlanningReservations, updatePlanningReservation } from '../../lib/planningApi';
import useVehicleTimelineDrag from './useVehicleTimelineDrag';
import useVehicleTimelineGeometry, { getRowRenderWindow, getTimelineBookingRange, getTimelineRenderWindow, getTimelineYearSpans } from './useVehicleTimelineGeometry';
import useProgressivePlanningReservations from './useProgressivePlanningReservations';
import PlanningSkeleton from './PlanningSkeleton';
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton';
import { withPlanningLoadingDelay } from '../../lib/planningLoading';
import bg from "../../assets/content.png";
// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------
const THEMES = {
    dark: {
        bg: "#0f1117",
        bgAlt: "#111420",
        bgDeep: "#0d0f17",
        surface: "#1a1d27",
        surfaceAlt: "#1e2130",
        border: "#1e2130",
        borderSubtle: "#1a1d27",
        borderMonth: "#252838",
        text: "#e8eaf0",
        textMuted: "#8890aa",
        textFaint: "#556",
        textDim: "#444",
        textLabel: "#dde",
        textPlate: "#555",
        textCat: "#666",
        dayNumber: "#8890aa",
        dayWeekend: "#555",
        weekendBg: "#13151e",
        weekendRow: "#ffffff04",
        todayBg: "#1a9e6e14",
        todayLine: "#1a9e6e",
        gridLine: "#1a1d27",
        scrollTrack: "#1a1d27",
        scrollThumb: "#2a3a50",
        tooltipBg: "#1a1d27",
        tooltipBorder: "#2a2d3a",
        tooltipShadow: "0 8px 32px rgba(0,0,0,0.5)",
        dropTarget: "#1a9e6e18",
        dropTargetRow: "#1a9e6e0c",
        plateBg: "#1a1d27",
        overlapBg: "#1e2130",
        activeBtn: "#1a9e6e22",
        activeBtnBorder: "#1a9e6e",
        activeBtnText: "#1a9e6e",
        inactiveBtn: "transparent",
        inactiveBtnBorder: "#2a2d3a",
        inactiveBtnText: "#888",
        arrowBtnBorder: "#2a2d3a",
        arrowBtnText: "#888",
        footerText: "#444",
        footerStrong: "#666",
        hourTickLine: "#2a2d3a",
        hourTickLabel: "#444",
        hourGridLine: "#1e2130",
        laneDivider: "#1e2130",
        ghostOverlay: "rgba(0,0,0,0.2)",
    },
    light: {
        bg: "#fefefefe",
        bgAlt: "#fefefefe",
        bgDeep: "#e8eaef",
        surface: "#ffffff",
        surfaceAlt: "#f0f1f5",
        border: "#dde0ea",
        borderSubtle: "#e8eaf0",
        borderMonth: "#d0d3df",
        text: "#1a1d2e",
        textMuted: "#5a6080",
        textFaint: "#8890aa",
        textDim: "#aab",
        textLabel: "#1e2130",
        textPlate: "#888",
        textCat: "#777",
        dayNumber: "#5a6080",
        dayWeekend: "#5a6080",
        weekendBg: "#f6f2f2",
        weekendRow: "#df838308",
        todayBg: "#1a9e6e14",
        todayLine: "#1a9e6e",
        gridLine: "#e8eaf0",
        scrollTrack: "#dde0ea",
        scrollThumb: "#b0b8d0",
        tooltipBg: "#ffffff",
        tooltipBorder: "#dde0ea",
        tooltipShadow: "0 8px 32px rgba(0,0,0,0.12)",
        dropTarget: "#1a9e6e18",
        dropTargetRow: "#1a9e6e0c",
        plateBg: "#eceef3",
        overlapBg: "#dde0ea",
        activeBtn: "#1a9e6e18",
        activeBtnBorder: "#1a9e6e",
        activeBtnText: "#1a9e6e",
        inactiveBtn: "white",
        inactiveBtnBorder: "#dde0ea",
        inactiveBtnText: "#777",
        arrowBtnBorder: "#dde0ea",
        arrowBtnText: "#777",
        footerText: "#aab",
        footerStrong: "#888",
        hourTickLine: "#c8ccd8",
        hourTickLabel: "#aab",
        hourGridLine: "#dde0ea",
        laneDivider: "#dde0ea",
        ghostOverlay: "rgba(0,0,0,0.1)",
    },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const EMPTY_VEHICLES = [];
const EMPTY_BOOKINGS = [];

const INITIAL_BOOKINGS = [
    // { id: 1, carId: 1, start: 2.0, end: 5.5, customer: "John Smith", status: "confirmed" },
    // { id: 2, carId: 1, start: 4.25, end: 8.75, customer: "Anna K.", status: "pending" },
    // { id: 10, carId: 1, start: 3.5, end: 6.25, customer: "Triple Overlap", status: "maintenance" },
    // { id: 3, carId: 2, start: 0.0, end: 3.5, customer: "Maria Garcia", status: "pending" },
    // { id: 4, carId: 3, start: 4.0, end: 8.0, customer: "Peter Brown", status: "confirmed" },
    // { id: 5, carId: 4, start: 1.25, end: 4.75, customer: "Liu Wei", status: "confirmed" },
    // { id: 6, carId: 5, start: 6.5, end: 10.0, customer: "Sarah Connor", status: "maintenance" },
    // { id: 7, carId: 6, start: 0.0, end: 2.5, customer: "James Bond", status: "confirmed" },
    // { id: 8, carId: 7, start: 3.0, end: 7.25, customer: "Emma Watson", status: "pending" },
    // { id: 9, carId: 8, start: 8.0, end: 13.5, customer: "Tom Hanks", status: "confirmed" },
];

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
// Drags move whole days; the original time of day is kept (see dragGeometry).
const SNAP = 1;
const MIN_DUR = 1 / 24;
const LANE_H = 27;
const LANE_GAP = 1;
const LANE_TOP_PAD = 2;
const LANE_BOTTOM_PAD = LANE_TOP_PAD + 2;
const LABEL_W = 200;
const HEADER_H = 72;
const TIMELINE_MAX_HEIGHT = "calc(var(--app-viewport-height) - 189px)";
const TIMELINE_HEADER_H = 88;

const PERIOD_OPTIONS = [
    // { value: 31, label: '1 mån' },
    { value: 92, label: '3 mån' },
    { value: 183, label: '6 mån' },
    { value: 365, label: '1 år' },
    { value: 730, label: '2 år' },
];

const EMPTY_TICKS = [];
const DAY_HEADER_MIN_W = 14;
const WEEKEND_SHADE_MIN_W = 6;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function formatShortDate(fracDay, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(fracDay));
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getIsoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
function formatTimelineDate(fracDay, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(fracDay));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDayLabel(dayIndex, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayIndex);
    return {
        day: d.getDate(),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isMonday: d.getDay() === 1,
        week: getIsoWeek(d),
        isToday: d.toDateString() === new Date().toDateString(),
    };
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function toIsoDateTime(value) {
    const date = value instanceof Date ? value : (value ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

function timelineDayToLocalDateTime(value, timelineStart) {
    const date = new Date(timelineStart);
    const wholeDays = Math.floor(value);
    const minutes = Math.round((value - wholeDays) * 24 * 60);
    date.setDate(date.getDate() + wholeDays);
    date.setHours(0, minutes, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minute}:00`;
}

function formatSelectionDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function assignLanes(carBookings) {
    const sorted = [...carBookings].sort((a, b) => a.start - b.start);
    const lanes = [], result = new Map();
    const lastBookingByLane = new Map();
    const bookingsWithFollowers = new Set();
    for (const b of sorted) {
        const { start, end } = getTimelineBookingRange(b);
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] <= start) { lanes[i] = end; result.set(b.id, i); placed = true; break; }
        }
        if (!placed) { result.set(b.id, lanes.length); lanes.push(end); }
        const lane = result.get(b.id);
        const previousBookingId = lastBookingByLane.get(lane);
        if (previousBookingId !== undefined) bookingsWithFollowers.add(previousBookingId);
        lastBookingByLane.set(lane, b.id);
    }
    return { laneMap: result, laneCount: Math.max(1, lanes.length), bookingsWithFollowers };
}

function computeRowLayout(bookings, cars) {
    // Single pass grouping instead of re-filtering the whole bookings array once per car
    // (once here, and again later when rendering each row's bars).
    const bookingsByCarId = new Map();
    for (const booking of bookings) {
        const list = bookingsByCarId.get(booking.carId);
        if (list) list.push(booking);
        else bookingsByCarId.set(booking.carId, [booking]);
    }

    const layout = cars.map(car => {
        const carBookings = bookingsByCarId.get(car.id) ?? EMPTY_BOOKINGS;
        const { laneMap, laneCount, bookingsWithFollowers } = assignLanes(carBookings);
        const rowH = laneCount * LANE_H + Math.max(0, laneCount - 1) * LANE_GAP + LANE_TOP_PAD + LANE_BOTTOM_PAD;
        return { carId: car.id, laneMap, laneCount, rowH, bookings: carBookings, bookingsWithFollowers };
    });
    let cumY = HEADER_H;
    layout.forEach(row => { row.top = cumY; cumY += row.rowH; });
    layout.totalH = cumY - HEADER_H;
    return layout;
}

function computeMonthSpans(visibleStartDayI, totalVisible, dayW, startDate) {
    const spans = [];
    const monthDate = new Date(startDate);
    monthDate.setDate(monthDate.getDate() + visibleStartDayI);
    monthDate.setDate(1);
    const origin = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    while (true) {
        const dayIdx = (Date.UTC(monthDate.getFullYear(), monthDate.getMonth(), 1) - origin) / 86400000;
        if (dayIdx >= visibleStartDayI + totalVisible) break;
        const monthDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        spans.push({
            label: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
            monthLabel: monthDate.toLocaleDateString("en-US", { month: "short" }),
            year: monthDate.getFullYear(),
            startPx: dayIdx * dayW,
            widthPx: monthDays * dayW,
        });
        monthDate.setMonth(monthDate.getMonth() + 1);
    }
    return spans;
}

const LiftTimelineBar = memo(function LiftTimelineBar({
    booking,
    dayW,
    startDate,
    timelineViewportWidth,
    lane,
    hasFollowingBooking,
    isMoving,
    isHovered,
    lockPlanningTimelineDrag,
    onBookingMouseDown,
    onOpenReservation,
    onHoverChange,
}) {
    const color = STATUS_COLORS[booking.status] || STATUS_COLORS.booked;
    const { start, end } = getTimelineBookingRange(booking);
    const widthPx = (end - start) * dayW;
    const barTop = LANE_TOP_PAD + lane * (LANE_H + LANE_GAP);
    const barWidth = Math.max(widthPx - (hasFollowingBooking ? 1 : 0), 8);
    const arrowSize = Math.min(10, barWidth / 2);
    const labelLeft = `max(${arrowSize + 4}px, calc(var(--timeline-scroll-x) - ${start * dayW}px + ${arrowSize + 4}px))`;
    const labelRight = `max(${arrowSize + 4}px, calc(${end * dayW}px - var(--timeline-scroll-x) - ${timelineViewportWidth}px + ${arrowSize + 4}px))`;

    return (
        <div
            data-reservation-bar="true"
            onMouseDown={(event) => onBookingMouseDown(event, booking, "move")}
            onMouseEnter={() => onHoverChange(booking.id)}
            onMouseLeave={() => onHoverChange(null)}
            style={{
                position: "absolute",
                left: start * dayW,
                top: 0,
                transform: `translateY(${barTop}px)`,
                height: LANE_H,
                width: barWidth,
                background: color.bg,
                clipPath: `polygon(${arrowSize}px 0, calc(100% - ${arrowSize}px) 0, 100% 50%, calc(100% - ${arrowSize}px) 100%, ${arrowSize}px 100%, 0 50%)`,
                cursor: lockPlanningTimelineDrag ? "not-allowed" : isMoving ? "grabbing" : isHovered ? "grab" : "default",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                boxShadow: `0 2px 6px ${color.bg}44`,
                transition: isMoving ? "none" : "box-shadow 0.15s",
                zIndex: 1,
                opacity: isMoving ? 0.4 : 1,
                pointerEvents: isMoving ? "none" : "auto",
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
        >
            <div
                onMouseDown={(event) => onBookingMouseDown(event, booking, "resize-left")}
                onClick={(event) => event.stopPropagation()}
                style={{ position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2, width: 20, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <ChevronLeft
                    className="h-10 w-10 text-white"
                    strokeWidth={2}
                    style={{ opacity: isHovered ? 0.9 : 0, transition: "opacity 0.12s" }}
                />
            </div>
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: labelLeft,
                    right: labelRight,
                    containerType: "inline-size",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    overflow: "hidden",
                    padding: "0 4px",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                }}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    className="text-tiny text-white font-normal tracking-[0.12em] hover:underline"
                    title="Öppna bokningen i ny flik"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => onOpenReservation(event, booking.reservationId)}
                    style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        flex: "0 1 auto",
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "inline-block",
                        verticalAlign: "bottom",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                    }}
                >
                    {[booking.customer, booking.deliveryPlace].filter(Boolean).join(' - ')}
                </button>
                {widthPx >= 90 && (
                    <span className="text-white" style={{ fontSize: 10 }}>
                        {formatShortDate(booking.start, startDate)}–{formatShortDate(booking.end, startDate)}
                    </span>
                )}
            </div>
            <div
                onMouseDown={(event) => onBookingMouseDown(event, booking, "resize-right")}
                onClick={(event) => event.stopPropagation()}
                style={{ position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 2, width: 20, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <ChevronRight
                    className="h-10 w-10 text-white"
                    strokeWidth={2}
                    style={{ opacity: isHovered ? 0.9 : 0, transition: "opacity 0.12s" }}
                />
            </div>
        </div>
    );
});


const LiftTimelineRowContent = memo(function LiftTimelineRowContent({
    row,
    dayW,
    startDate,
    renderWindow,
    timelineViewportWidth,
    movingId,
    draggingId,
    hoveredBooking,
    lockPlanningTimelineDrag,
    onBookingMouseDown,
    onOpenReservation,
    onHoverChange,
}) {
    return (
        <div style={{ position: "absolute", inset: 0, transform: "translateX(calc(-1 * var(--timeline-scroll-x)))" }}>
            {row.bookings.filter(booking => {
                const { start, end } = getTimelineBookingRange(booking);
                return booking.id === draggingId
                    || booking.id === hoveredBooking
                    || (start < renderWindow.endDay
                        && Math.max(end, start + 8 / dayW) > renderWindow.startDay);
            }).map(booking => (
                <LiftTimelineBar
                    key={booking.id}
                    booking={booking}
                    dayW={dayW}
                    startDate={startDate}
                    timelineViewportWidth={timelineViewportWidth}
                    lane={row.laneMap.get(booking.id) ?? 0}
                    hasFollowingBooking={row.bookingsWithFollowers.has(booking.id)}
                    isMoving={movingId === booking.id}
                    isHovered={hoveredBooking === booking.id}
                    lockPlanningTimelineDrag={lockPlanningTimelineDrag}
                    onBookingMouseDown={onBookingMouseDown}
                    onOpenReservation={onOpenReservation}
                    onHoverChange={onHoverChange}
                />
            ))}
        </div>
    );
});

const arrowBtnBase = {
    width: 28, height: 28, borderRadius: "9999px", border: "1px solid",
    background: "white", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
};

// One gradient tile per day keeps hour lines aligned; fractional repeating tiles drift over long ranges.
function buildGridBackground(dayW, hourTicks, theme) {
    const stops = [];
    for (const hour of hourTicks) {
        const x = (hour / 24) * dayW;
        stops.push(`transparent ${x}px`, `${theme.hourGridLine} ${x}px`, `${theme.hourGridLine} ${x + 1}px`, `transparent ${x + 1}px`);
    }
    stops.push(`transparent ${dayW - 1}px`, `${theme.gridLine} ${dayW - 1}px`, `${theme.gridLine} ${dayW}px`);
    return {
        backgroundImage: `linear-gradient(to right, transparent 0px, ${stops.join(', ')})`,
        backgroundSize: `${dayW}px 100%`,
        backgroundRepeat: "repeat",
        backgroundPositionX: "calc(-1 * var(--timeline-scroll-x))",
    };
}

function buildWeekGridBackground(dayW, firstMondayDay, theme, showDayLines = false) {
    const weekW = dayW * 7;
    const stops = [`${theme.gridLine} 0px`, `${theme.gridLine} 1px`, `transparent 1px`];
    if (showDayLines) {
        for (let day = 1; day < 7; day++) {
            const x = day * dayW;
            stops.push(`transparent ${x}px`, `${theme.hourGridLine} ${x}px`, `${theme.hourGridLine} ${x + 1}px`, `transparent ${x + 1}px`);
        }
    }
    return {
        backgroundImage: `linear-gradient(to right, ${stops.join(', ')})`,
        backgroundSize: `${weekW}px 100%`,
        backgroundRepeat: "repeat",
        backgroundPositionX: `calc(${firstMondayDay * dayW}px - var(--timeline-scroll-x))`,
    };
}

// Kept outside the component so the view survives navigating away and back.
const timelineViewState = {
    scrollX: 0,
    daysVisible: 92,
    startDate: null,
    populateFromDate: null,
    selectedCategories: [],
    searchSelection: null,
    loadedRange: null,
    loadedRangeQueryKey: null,
};

function getDefaultPopulateFromDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// Short periods keep a 2-day buffer before the anchor, longer ones a week.
function computeViewportStartDate(anchorDate, daysVisible) {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (daysVisible <= 31 ? 2 : 7));
    return d;
}

function resolveDaysVisible(fromIso, toIso) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

    const spanDays = Math.ceil((to - from) / 86400000) + 1;
    const option = PERIOD_OPTIONS.find(entry => entry.value >= spanDays);
    return option ? option.value : PERIOD_OPTIONS[PERIOD_OPTIONS.length - 1].value;
}


function LiftTimeline(props) {
    const navigate = useNavigate();
    const hasPersistedSearch = Boolean(timelineViewState.searchSelection);
    const defaultDaysVisible = timelineViewState.daysVisible;
    const defaultPopulateFromDate = hasPersistedSearch && timelineViewState.populateFromDate
        ? new Date(timelineViewState.populateFromDate)
        : getDefaultPopulateFromDate();
    const defaultStartDate = hasPersistedSearch && timelineViewState.startDate
        ? new Date(timelineViewState.startDate)
        : computeViewportStartDate(defaultPopulateFromDate, defaultDaysVisible);
    const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
    const [restoredView] = useState(() => hasPersistedSearch ? {
        range: timelineViewState.loadedRange,
        queryKey: timelineViewState.loadedRangeQueryKey,
        scrollX: timelineViewState.scrollX,
    } : null);
    const [scrollX, setScrollX] = useState(hasPersistedSearch ? timelineViewState.scrollX : 0);
    const pendingScrollXRef = useRef(hasPersistedSearch ? timelineViewState.scrollX : 0);
    const scrollFrameRef = useRef(null);
    const scrollCommitTimeoutRef = useRef(null);
    const scrollDirectionRef = useRef(0);
    const gestureRef = useRef(null);
    const pendingSavesRef = useRef(0);
    const bookingRevisionRef = useRef(0);
    const [renderWindowState, setRenderWindowState] = useState(null);
    const renderWindowRef = useRef(null);
    const [hoveredBooking, setHoveredBooking] = useState(null);
    const [daysVisible, setDaysVisible] = useState(timelineViewState.daysVisible);
    const isPanMode = true;
    const panRef = useRef(null); // tracks pan drag start
    const [startDate, setStartDate] = useState(() => new Date(defaultStartDate));
    const [populateFromDate, setPopulateFromDate] = useState(() => new Date(defaultPopulateFromDate));

    const T = THEMES.light;

    const gridRef = useRef(null);
    const scrollbarRef = useRef(null);
    const scrollbarThumbRef = useRef(null);
    const containerRef = useRef(null);
    const nextId = useRef(20);

    const [liftSearchOpen, setLiftSearchOpen] = useState(false);
    const [dateSelectOpen, setDateSelectOpen] = useState(false);
    const [infoItemId, setInfoItemId] = useState(null);
    const closeItemInfo = useCallback(() => setInfoItemId(null), []);
    const dateSelectRef = useRef(null);
    const [searchSelection, setSearchSelection] = useState(timelineViewState.searchSelection);
    const [selectedCategories, setSelectedCategories] = useState(timelineViewState.selectedCategories);
    const [categoryOptions, setCategoryOptions] = useState(EMPTY_VEHICLES);
    const [visibleCars, setVisibleCars] = useState(EMPTY_VEHICLES);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [itemsError, setItemsError] = useState(null);
    const [itemsReloadKey, setItemsReloadKey] = useState(0);

    const isPlanningBusy = useCallback((kind) => (
        kind === 'replace'
            ? gestureRef.current !== null || pendingSavesRef.current > 0
            : gestureRef.current === 'thumb'
    ), []);
    const getBookingRevision = useCallback(() => bookingRevisionRef.current, []);
    const setEditedBookings = useCallback((update) => {
        bookingRevisionRef.current += 1;
        setBookings(update);
    }, []);
    const resetTimelineScroll = useCallback(() => {
        if (scrollFrameRef.current !== null) {
            window.cancelAnimationFrame(scrollFrameRef.current);
            scrollFrameRef.current = null;
        }
        pendingScrollXRef.current = 0;
        scrollDirectionRef.current = 0;
        setScrollX(0);
    }, []);

    useEffect(() => {
        timelineViewState.scrollX = scrollX;
        timelineViewState.daysVisible = daysVisible;
        timelineViewState.startDate = startDate;
        timelineViewState.populateFromDate = populateFromDate;
        timelineViewState.selectedCategories = selectedCategories;
        timelineViewState.searchSelection = searchSelection;
    }, [scrollX, daysVisible, startDate, populateFromDate, selectedCategories, searchSelection]);

    useEffect(() => {
        let isActive = true;

        getPlanningCategories({ itemTypeCode: 'LIFT' })
            .then(categories => {
                if (!isActive) return;
                setCategoryOptions(categories.map(category => ({ value: category.id, label: category.name })));
            })
            .catch(() => {
                if (isActive) setCategoryOptions(EMPTY_VEHICLES);
            });

        return () => { isActive = false; };
    }, []);

    const categoryKey = useMemo(
        () => selectedCategories.map(option => Number(option.value)).sort((first, second) => first - second).join(','),
        [selectedCategories]
    );

    useEffect(() => {
        let isActive = true;
        setItemsLoading(true);
        setItemsError(null);
        withPlanningLoadingDelay(getPlanningLifts({
            categoryIds: categoryKey ? categoryKey.split(',').map(Number) : [],
            availableFrom: searchSelection?.from ?? '',
            availableTo: searchSelection?.to ?? '',
        }))
            .then(lifts => {
                if (isActive) setVisibleCars(lifts);
            })
            .catch(error => {
                if (isActive) {
                    setItemsError(error);
                    setVisibleCars(EMPTY_VEHICLES);
                }
            })
            .finally(() => {
                if (isActive) setItemsLoading(false);
            });

        return () => { isActive = false; };
    }, [categoryKey, searchSelection, itemsReloadKey]);

    const handleLiftSearch = (params) => {
        const from = toIsoDateTime(params?.period?.from);
        const to = toIsoDateTime(params?.period?.to);

        const selectedCategory = categoryOptions.find(option => String(option.value) === String(params?.categoryId));
        setSelectedCategories(selectedCategory ? [selectedCategory] : []);
        setSearchSelection({ from, to });

        if (from && to) {
            const nextDaysVisible = resolveDaysVisible(from, to);
            const effectiveDaysVisible = nextDaysVisible || daysVisible;
            if (nextDaysVisible) setDaysVisible(nextDaysVisible);
            const selectedFromDate = new Date(new Date(from).setHours(0, 0, 0, 0));
            setPopulateFromDate(selectedFromDate);
            setStartDate(computeViewportStartDate(selectedFromDate, effectiveDaysVisible));
            resetTimelineScroll();
        }
    };

    const handleClearLiftSearch = () => {
        setSearchSelection(null);
        const clearedPopulateFromDate = getDefaultPopulateFromDate();
        setPopulateFromDate(clearedPopulateFromDate);
        setStartDate(computeViewportStartDate(clearedPopulateFromDate, daysVisible));
        resetTimelineScroll();
    };

    const handlePopulateDateApply = ({ startDate: selectedStartDate, endDate: selectedEndDate }) => {
        const selectedDate = selectedStartDate || selectedEndDate;
        if (!selectedDate) return;

        const normalizedDate = new Date(selectedDate);
        normalizedDate.setHours(0, 0, 0, 0);

        setPopulateFromDate(normalizedDate);
        setStartDate(computeViewportStartDate(normalizedDate, daysVisible));
        resetTimelineScroll();
    };

    const handleDaysVisibleChange = (value) => {
        setDaysVisible(value);
        setStartDate(computeViewportStartDate(populateFromDate, value));
        resetTimelineScroll();
    };

    useEffect(() => {
        if (!dateSelectOpen) return;
        const handler = (e) => {
            if (dateSelectRef.current && !dateSelectRef.current.contains(e.target)) {
                setDateSelectOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [dateSelectOpen]);

    const handleOpenNewReservation = (lift) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        navigate('/operations/reservation/new', {
            state: {
                newReservationPrefill: {
                    lift: {
                        id: lift.id,
                        itemNr: lift.itemNr,
                        manufacturer: lift.manufacturer,
                        itemCategoryName: lift.category,
                        itemModelName: lift.model,
                    },
                    period: searchSelection?.from && searchSelection?.to
                        ? { from: searchSelection.from, to: searchSelection.to }
                        : { from: today, to: tomorrow },
                },
            },
        });
    };

    // Track container width with ResizeObserver so dayW adapts to any parent size
    const [containerW, setContainerW] = useState(0);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        setContainerW(el.offsetWidth);
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) setContainerW(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const baseGeometry = useVehicleTimelineGeometry({
        containerWidth: containerW,
        daysVisible,
        labelWidth: LABEL_W,
        snapDays: SNAP,
    });
    const viewportDays = baseGeometry.timelineViewportWidth > 0
        ? baseGeometry.timelineViewportWidth / baseGeometry.dayWidth
        : daysVisible;
    const currentQueryKey = `categories:${categoryKey}|${startDate.getTime()}|${daysVisible}`;
    const fetchLiftReservations = useCallback(({ filterKey, from, to }) => getPlanningReservations({
        itemTypeCode: 'LIFT',
        categoryIds: filterKey ? filterKey.split(',').map(Number) : [],
        from,
        to,
    }), []);
    const progressive = useProgressivePlanningReservations({
        categoryKey,
        startDate,
        daysVisible,
        viewportDays,
        initialScrollDay: restoredView?.queryKey === currentQueryKey
            ? restoredView.scrollX / baseGeometry.dayWidth
            : pendingScrollXRef.current / baseGeometry.dayWidth,
        restoredRange: restoredView?.range,
        restoredQueryKey: restoredView?.queryKey,
        enabled: containerW > 0,
        fetchReservations: fetchLiftReservations,
        setBookings,
        isBusy: isPlanningBusy,
        getRevision: getBookingRevision,
    });
    const { loadedRange, queryKey, extend, refresh, flush, ensureCoverage } = progressive;
    const isInitialLoading = itemsLoading || progressive.initialLoading;
    const delayedInitialLoading = useDelayedSkeleton(isInitialLoading, 200);
    const delayedBackgroundLoading = useDelayedSkeleton(!isInitialLoading && progressive.loading, 200);
    const showLoadingSkeleton = isInitialLoading && delayedInitialLoading;
    const geometry = useVehicleTimelineGeometry({
        containerWidth: containerW,
        daysVisible,
        labelWidth: LABEL_W,
        snapDays: SNAP,
        loadedRange,
    });
    const {
        dayWidth: dayW,
        timelineViewportWidth,
        minScrollX,
        maxScrollX,
        scrollRangeX,
        thumbRatio,
    } = geometry;

    useEffect(() => {
        timelineViewState.loadedRange = loadedRange;
        timelineViewState.loadedRangeQueryKey = queryKey;
    }, [loadedRange, queryKey]);

    useEffect(() => {
        ensureCoverage(pendingScrollXRef.current / dayW, viewportDays);
    }, [dayW, ensureCoverage, loadedRange, progressive.loading, viewportDays]);

    useEffect(() => {
        const refreshInBackground = () => {
            if (document.visibilityState !== 'hidden') refresh();
        };
        const finishInteraction = () => {
            queueMicrotask(() => {
                gestureRef.current = null;
                flush();
            });
        };
        window.addEventListener('mouseup', finishInteraction);
        window.addEventListener('focus', refreshInBackground);
        document.addEventListener('visibilitychange', refreshInBackground);
        return () => {
            window.removeEventListener('mouseup', finishInteraction);
            window.removeEventListener('focus', refreshInBackground);
            document.removeEventListener('visibilitychange', refreshInBackground);
        };
    }, [flush, refresh]);

    const renderWindow = useMemo(() => (
        renderWindowState?.geometry === geometry
            ? renderWindowState.window
            : getTimelineRenderWindow(geometry, clamp(pendingScrollXRef.current, minScrollX, maxScrollX))
    ), [geometry, maxScrollX, minScrollX, renderWindowState]);

    useLayoutEffect(() => {
        const currentScrollX = clamp(pendingScrollXRef.current, minScrollX, maxScrollX);
        pendingScrollXRef.current = currentScrollX;
        gridRef.current?.style.setProperty('--timeline-scroll-x', `${currentScrollX}px`);
        const thumbPosition = scrollRangeX > 0
            ? ((currentScrollX - minScrollX) / scrollRangeX) * (100 - thumbRatio * 100)
            : 0;
        scrollbarThumbRef.current?.style.setProperty('left', `${thumbPosition}%`);
    }, [maxScrollX, minScrollX, scrollRangeX, thumbRatio]);

    const scheduleScrollX = useCallback((nextValue) => {
        const currentValue = pendingScrollXRef.current;
        const requestedValue = typeof nextValue === 'function'
            ? nextValue(currentValue)
            : nextValue;
        scrollDirectionRef.current = Math.sign(requestedValue - currentValue);
        pendingScrollXRef.current = clamp(requestedValue, minScrollX, maxScrollX);

        if (scrollCommitTimeoutRef.current !== null) {
            window.clearTimeout(scrollCommitTimeoutRef.current);
        }
        scrollCommitTimeoutRef.current = window.setTimeout(() => {
            scrollCommitTimeoutRef.current = null;
            setScrollX(pendingScrollXRef.current);
        }, 100);

        if (scrollFrameRef.current !== null) return;

        scrollFrameRef.current = window.requestAnimationFrame(() => {
            scrollFrameRef.current = null;
            const nextScrollX = pendingScrollXRef.current;
            const previousWindow = renderWindowRef.current?.geometry === geometry
                ? renderWindowRef.current.window
                : null;
            const nextWindow = getTimelineRenderWindow(geometry, nextScrollX, previousWindow);
            if (nextWindow !== previousWindow) {
                const nextState = { geometry, window: nextWindow };
                renderWindowRef.current = nextState;
                flushSync(() => setRenderWindowState(nextState));
            }
            gridRef.current?.style.setProperty('--timeline-scroll-x', `${nextScrollX}px`);

            const thumbPosition = scrollRangeX > 0
                ? ((nextScrollX - minScrollX) / scrollRangeX) * (100 - thumbRatio * 100)
                : 0;
            scrollbarThumbRef.current?.style.setProperty('left', `${thumbPosition}%`);
            if (scrollDirectionRef.current !== 0) {
                extend(nextScrollX / dayW, viewportDays, scrollDirectionRef.current);
            }
        });
    }, [dayW, extend, geometry, maxScrollX, minScrollX, scrollRangeX, thumbRatio, viewportDays]);

    const scheduleScrollXRef = useRef(scheduleScrollX);
    useLayoutEffect(() => {
        scheduleScrollXRef.current = scheduleScrollX;
    }, [scheduleScrollX]);

    useEffect(() => {
        return () => {
            if (scrollFrameRef.current !== null) {
                window.cancelAnimationFrame(scrollFrameRef.current);
                scrollFrameRef.current = null;
            }
            if (scrollCommitTimeoutRef.current !== null) {
                window.clearTimeout(scrollCommitTimeoutRef.current);
                scrollCommitTimeoutRef.current = null;
            }
        };
    }, []);

    const showMonthRow = true;
    const showDayHeader = daysVisible <= 31 && dayW >= DAY_HEADER_MIN_W;
    const showWeekHeader = !showDayHeader && daysVisible < 365;
    const showWeekDayTicks = !showDayHeader && daysVisible <= 92;
    const showWeekendShade = dayW >= WEEKEND_SHADE_MIN_W;
    const showYearRow = daysVisible >= 365;
    const MONTH_ROW_H = 24;
    const headerH = TIMELINE_HEADER_H;

    const layout = useMemo(() => computeRowLayout(bookings, visibleCars), [bookings, visibleCars]);

    const rowOffsets = useMemo(() => {
        const offsets = new Array(layout.length + 1);
        offsets[0] = 0;
        for (let index = 0; index < layout.length; index++) {
            offsets[index + 1] = offsets[index] + layout[index].rowH;
        }
        return offsets;
    }, [layout]);
    const gridViewRef = useRef({ top: 0, height: 800 });
    const [rowWindowState, setRowWindowState] = useState(null);
    const rowWindow = useMemo(() => (
        rowWindowState?.offsets === rowOffsets
            ? rowWindowState.window
            : getRowRenderWindow(rowOffsets, gridViewRef.current.top, gridViewRef.current.height)
    ), [rowOffsets, rowWindowState]);
    const rowWindowRef = useRef({ offsets: rowOffsets, window: rowWindow });
    useLayoutEffect(() => {
        rowWindowRef.current = { offsets: rowOffsets, window: rowWindow };
    }, [rowOffsets, rowWindow]);

    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        let frameId = null;
        const measure = () => {
            frameId = null;
            const view = { top: grid.scrollTop, height: Math.max(1, grid.clientHeight - TIMELINE_HEADER_H) };
            gridViewRef.current = view;
            const { offsets, window: previousWindow } = rowWindowRef.current;
            const nextWindow = getRowRenderWindow(offsets, view.top, view.height, previousWindow);
            if (nextWindow !== previousWindow) {
                rowWindowRef.current = { offsets, window: nextWindow };
                flushSync(() => setRowWindowState({ offsets, window: nextWindow }));
            }
        };
        const scheduleMeasure = () => {
            if (frameId === null) frameId = window.requestAnimationFrame(measure);
        };
        grid.addEventListener('scroll', scheduleMeasure, { passive: true });
        const observer = new ResizeObserver(scheduleMeasure);
        observer.observe(grid);
        scheduleMeasure();
        return () => {
            grid.removeEventListener('scroll', scheduleMeasure);
            observer.disconnect();
            if (frameId !== null) window.cancelAnimationFrame(frameId);
        };
    }, []);

    const renderedCars = visibleCars.slice(rowWindow.startIndex, rowWindow.endIndex);
    const rowsTopSpacer = rowOffsets[rowWindow.startIndex] ?? 0;
    const rowsBottomSpacer = (rowOffsets[rowOffsets.length - 1] ?? 0) - (rowOffsets[rowWindow.endIndex] ?? 0);
    const firstMondayDay = (8 - startDate.getDay()) % 7;
    const gridBackground = useMemo(() => (
        showDayHeader
            ? buildGridBackground(dayW, EMPTY_TICKS, T)
            : buildWeekGridBackground(dayW, firstMondayDay, T, showWeekDayTicks)
    ), [dayW, firstMondayDay, showDayHeader, showWeekDayTicks, T]);

    // Computed once (only when the date range actually changes) instead of once per day PER CAR ROW.
    // getDayLabel() does toLocaleDateString() calls, which are expensive - previously this ran
    // totalTimelineDays * visibleCars.length times on every render.
    const dayLabels = useMemo(() => {
        const labels = [];
        for (let dayIdx = renderWindow.startDay; dayIdx < renderWindow.endDay; dayIdx++) {
            labels.push({ dayIdx, ...getDayLabel(dayIdx, startDate) });
        }
        return labels;
    }, [renderWindow, startDate]);

    const monthSpans = useMemo(() => (
        showMonthRow
                ? computeMonthSpans(renderWindow.startDay, renderWindow.endDay - renderWindow.startDay, dayW, startDate)
            : []
            ), [dayW, renderWindow, showMonthRow, startDate]);

    const onWheel = useCallback((e) => {
        // Horizontal scroll (trackpad swipe or shift+wheel): intercept for timeline
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
            e.preventDefault();
            scheduleScrollX(prev => prev + (e.deltaX || (e.shiftKey ? e.deltaY : 0)));
        }
        // Pure vertical scroll: let browser handle it naturally (do nothing)
    }, [scheduleScrollX]);

    useEffect(() => {
        const el = gridRef.current; if (!el) return;
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [onWheel]);

    // Arrow key horizontal scroll
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                scheduleScrollX(prev => prev - dayW * 3);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                scheduleScrollX(prev => prev + dayW * 3);
            }
            // ArrowUp / ArrowDown: do nothing, let browser scroll the page
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [dayW, scheduleScrollX]);

    // Draggable scrollbar thumb
    const onScrollbarMouseDown = useCallback((e) => {
        e.preventDefault();
        gestureRef.current = 'thumb';
        const track = scrollbarRef.current;
        if (!track) return;
        const trackRect = track.getBoundingClientRect();
        const thumbW = thumbRatio * trackRect.width;
        const startX = e.clientX;
        const startScrollX = pendingScrollXRef.current;
        const onMove = (me) => {
            const dx = me.clientX - startX;
            const scrollable = trackRect.width - thumbW;
            const ratio = scrollable > 0 ? dx / scrollable : 0;
            scheduleScrollX(startScrollX + ratio * scrollRangeX);
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [scheduleScrollX, scrollRangeX, thumbRatio]);

    // Click on track (outside thumb) jumps to that position
    const onScrollbarTrackClick = useCallback((e) => {
        const track = scrollbarRef.current;
        if (!track) return;
        const trackRect = track.getBoundingClientRect();
        const clickRatio = (e.clientX - trackRect.left) / trackRect.width;
        const next = minScrollX + clickRatio * scrollRangeX;
        scheduleScrollX(next);
    }, [scheduleScrollX, minScrollX, scrollRangeX]);

    const scrollDays = dir => scheduleScrollX(prev => prev + dir * dayW * 3);

    // Pan mode: drag on grid to scroll horizontally
    const onGridMouseDown = useCallback((e) => {
        if (!isPanMode) return;
        if (e.button !== 0) return;
        e.preventDefault();
        panRef.current = { startX: e.clientX, startScrollX: pendingScrollXRef.current };
        const onMove = (me) => {
            if (!panRef.current) return;
            const dx = panRef.current.startX - me.clientX;
            scheduleScrollXRef.current(panRef.current.startScrollX + dx);
        };
        const onUp = () => {
            panRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isPanMode]);

    useEffect(() => {
        scheduleScrollX(prev => prev);
        return () => {
            if (scrollFrameRef.current !== null) {
                window.cancelAnimationFrame(scrollFrameRef.current);
                scrollFrameRef.current = null;
            }
        };
    }, [scheduleScrollX]);

    const handleBookingCommit = useCallback((booking) => {
        if (!booking.reservationId || booking.id <= 0) return Promise.resolve();

        pendingSavesRef.current += 1;
        return updatePlanningReservation(booking.id, {
            vehicleId: booking.carId,
            start: timelineDayToLocalDateTime(booking.start, startDate),
            end: timelineDayToLocalDateTime(booking.end, startDate),
        }).then((response) => {
            if (!response?.status) return;

            setBookings((currentBookings) => currentBookings.map((currentBooking) => {
                const isSameSavedPosition = currentBooking.id === booking.id
                    && currentBooking.carId === booking.carId
                    && currentBooking.start === booking.start
                    && currentBooking.end === booking.end;
                return isSameSavedPosition
                    ? { ...currentBooking, status: response.status }
                    : currentBooking;
            }));
        }).catch((error) => {
            console.error('Kunde inte spara bokningsändringen', error);
            throw error;
        }).finally(() => {
            pendingSavesRef.current -= 1;
            queueMicrotask(flush);
        });
    }, [flush, startDate]);

    const formatDragRange = useCallback(
        (start, end) => `${formatTimelineDate(start, startDate)} -> ${formatTimelineDate(end, startDate)}`,
        [startDate]
    );

    const dragGeometry = useMemo(() => ({
        ...geometry,
        snapDay: (value) => value,
        dayDeltaFromPixels: (pixels) => Math.round(pixels / geometry.dayWidth),
    }), [geometry]);

    const {
        beginResize,
        dragging,
        ghost,
        ghostRef,
        ghostTextRef,
        isReservationClickSuppressed,
        onBookingMouseDown,
    } = useVehicleTimelineDrag({
        wholeDays: true,
        daysVisible,
        geometry: dragGeometry,
        gridRef,
        headerHeight: headerH,
        labelWidth: LABEL_W,
        minimumDuration: MIN_DUR,
        onCommit: handleBookingCommit,
        pendingScrollXRef,
        scheduleScrollXRef,
        formatRange: formatDragRange,
        setBookings: setEditedBookings,
        statusColors: STATUS_COLORS,
        minimumDay: loadedRange.startDay,
        maximumDay: loadedRange.endDay,
        lockPlanningTimelineDrag: props.lockPlanningTimelineDrag,
    });

    const handleOpenReservationInNewTab = useCallback((e, reservationId) => {
        e.preventDefault();
        e.stopPropagation();
        if (isReservationClickSuppressed()) return;
        if (!reservationId || reservationId <= 0) return;
        window.open(`/operations/reservation/${reservationId}?newTab=true`, "_blank", "noopener,noreferrer");
    }, [isReservationClickSuppressed]);

    const onCellMouseDown = (e, carId, snappedDay) => {
        if (dragging) return; e.preventDefault();
        const id = nextId.current++;
        const booking = { id, carId, start: snappedDay, end: snappedDay + MIN_DUR, customer: "New Booking", status: "pending" };
        setEditedBookings(prev => [...prev, booking]);
        beginResize(e, booking);
    };

    const movingId = dragging?.type === "move" ? dragging.bookingId : null;
    const isMoveGhostActive = Boolean(ghost && dragging?.type === "move");
    const ghostWidth = Math.max(ghost?.width ?? 8, 8);
    const ghostArrowSize = Math.min(10, Math.max(4, ghostWidth / 4));
    const ghostClipPath = `polygon(${ghostArrowSize}px 0, calc(100% - ${ghostArrowSize}px) 0, 100% 50%, calc(100% - ${ghostArrowSize}px) 100%, ${ghostArrowSize}px 100%, 0 50%)`;


    return (
        <div className="px-4 min-w-0" style={{ position: "relative" }}>
            <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 0, pointerEvents: "none" }} />

            <ItemInfoModal itemId={infoItemId} onClose={closeItemInfo} />

            <PlanningItemSearchModal
                isOpen={liftSearchOpen}
                onClose={() => setLiftSearchOpen(false)}
                onSearch={handleLiftSearch}
                categoryOptions={categoryOptions}
                title="Sök lediga liftar"
            />

            {/* ── Top Bar ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-7 2xl:px-10">

                <div className="flex flex-wrap items-center gap-3 min-w-0">

                    {props.typeSelector && <div className="shrink-0">{props.typeSelector}</div>}

                    {/* Days selector */}
                    <div className="shrink-0" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <SegmentedFilter
                            value={daysVisible}
                            onChange={handleDaysVisibleChange}
                            options={PERIOD_OPTIONS}
                            theme="green"
                        />
                    </div>

                    <div ref={dateSelectRef} style={{ position: "relative" }}>
                        <button
                            type="button"
                            aria-label="Välj datum"
                            title="Välj datum"
                            onClick={() => setDateSelectOpen(v => !v)}
                            style={{ ...arrowBtnBase, borderColor: T.arrowBtnBorder, color: T.arrowBtnText }}
                        >
                            <Calendar className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                        {dateSelectOpen && (
                            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50 }}>
                                <DateRangePicker
                                    popupOnly
                                    singleDate
                                    onApply={handlePopulateDateApply}
                                    onClose={() => setDateSelectOpen(false)}
                                    initialStartDate={populateFromDate}
                                    initialEndDate={populateFromDate}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right controls: pan toggle + theme toggle + nav arrows */}
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        <button
                            type="button"
                            aria-label="Bakåt"
                            onClick={() => scrollDays(-1)}
                            style={{ ...arrowBtnBase, borderColor: T.arrowBtnBorder, color: T.arrowBtnText }}
                        >
                            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                        <button
                            type="button"
                            aria-label="Framåt"
                            onClick={() => scrollDays(1)}
                            style={{ ...arrowBtnBase, borderColor: T.arrowBtnBorder, color: T.arrowBtnText }}
                        >
                            <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-4">
                    <FilterSelect
                        value={selectedCategories}
                        onChange={(selected) => setSelectedCategories(selected ?? [])}
                        options={categoryOptions}
                        placeholder="Alla kategorier"
                        width="w-50"
                        isMulti
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 min-w-0 max-w-full">
                    <ActionButton
                        label="Sök lediga tider"
                        icon={CalendarSearch}
                        onClick={() => setLiftSearchOpen(true)}
                        accent="lime"
                    />

                    {searchSelection && (
                        <div className="flex items-center gap-2 rounded-sm border border-lime-500 bg-lime-50 px-3 py-1 min-h-7 min-w-0 max-w-full">
                            <span className="text-xs text-lime-900 min-w-0 break-words">
                                {[
                                    selectedCategories.map(category => category.label).join(', ') || 'Alla kategorier',
                                    searchSelection.from && searchSelection.to
                                        ? `${formatSelectionDate(searchSelection.from)} – ${formatSelectionDate(searchSelection.to)}`
                                        : '',
                                ].filter(Boolean).join(' · ')}
                            </span>
                            <button
                                type="button"
                                aria-label="Rensa sökning"
                                title="Rensa sökning"
                                onClick={handleClearLiftSearch}
                                className="cursor-pointer shrink-0 text-lime-600 hover:text-lime-800"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    {/* {progressive.loading && <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" aria-label="Läser bokningar" />} */}
                    {progressive.error && (
                        <button
                            type="button"
                            title="Kunde inte läsa bokningar. Försök igen"
                            aria-label="Kunde inte läsa bokningar. Försök igen"
                            onClick={progressive.retry}
                            className="cursor-pointer text-red-700"
                        >
                            <RotateCw className="h-4 w-4" />
                        </button>
                    )}
                    {Object.entries(STATUS_COLORS).map(([s, c]) => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: c.bg, border: `1px solid ${c.border}` }} />
                            <span className="text-xs" style={{ color: T.textPlate, textTransform: "capitalize" }}>{c.name}</span>
                        </div>
                    ))}
                </div>


            </div>

            {/* ── Grid ── */}
            {itemsError && (
                <div role="alert" className="mb-3 flex items-center gap-3 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                    Kunde inte läsa objekten. {itemsError.message}
                    <ActionButton label="Försök igen" icon={RotateCw} onClick={() => setItemsReloadKey(value => value + 1)} accent="lime" />
                </div>
            )}
            <div
                style={{ position: "relative" }}
                aria-busy={isInitialLoading || progressive.loading}
                onMouseDownCapture={(event) => {
                    if (!isInitialLoading && event.button === 0) gestureRef.current = 'pointer';
                }}
            >
                {showLoadingSkeleton && (
                    <div className="absolute inset-0 z-50">
                        <PlanningSkeleton labelWidth={LABEL_W} headerHeight={headerH} />
                    </div>
                )}
                {!isInitialLoading && progressive.loading && delayedBackgroundLoading && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
                        <PlanningSkeleton variant="progress" />
                    </div>
                )}
                <div
                    className=""
                    ref={gridRef}
                    inert={isInitialLoading}
                    aria-hidden={isInitialLoading}
                    style={{
                        height: TIMELINE_MAX_HEIGHT,
                        maxHeight: TIMELINE_MAX_HEIGHT,
                        overflowX: "hidden",
                        overflowY: "auto",
                        position: "relative",
                        visibility: isInitialLoading ? "hidden" : "visible",
                        '--timeline-scroll-x': '0px',
                    }}
                >
                    <div style={{ display: "flex" }}>

                        {/* Label column */}
                        <div style={{ width: LABEL_W, flexShrink: 0, zIndex: 10 }}>
                            <div style={{ height: headerH, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, zIndex: 30 }}>
                                {showMonthRow && <div style={{ height: MONTH_ROW_H, borderBottom: `1px solid ${T.borderMonth}`, flexShrink: 0, background: `url(${bg})` }} />}
                                <div className="" style={{ flex: 1, background: "#d4defc", display: "flex", alignItems: "flex-end", paddingBottom: 10, paddingLeft: 16 }}>
                                    <span style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>

                                    </span>
                                </div>
                            </div>
                            {rowsTopSpacer > 0 && <div style={{ height: rowsTopSpacer }} />}
                            {renderedCars.map((car, i) => {
                                const row = layout[rowWindow.startIndex + i];
                                return (
                                    <div key={car.id} data-timeline-car-id={car.id} style={{ height: row.rowH, background: "#d4defc", borderBottom: "1px solid rgba(0, 0, 0, 0.2)", borderRight: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", alignItems: "center", paddingLeft: 16, paddingRight: 8, gap: 8, transition: "background 0.1s, height 0.2s" }}>
                                        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", paddingBlock: 1 }}>
                                            <button
                                                type="button"
                                                className="text-tiny text-gray-900 py-0.5 cursor-pointer hover:underline"
                                                title="Skapa ny bokning"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleOpenNewReservation(car)}
                                                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1, background: "none", border: "none", paddingInline: 0, textAlign: "left" }}
                                            >
                                                {car.category}
                                            </button>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 1, lineHeight: 1.1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    className="text-tiny text-red-500 cursor-pointer hover:underline"
                                                    title="Skapa ny bokning"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                    onClick={() => handleOpenNewReservation(car)}
                                                    style={{ background: "none", border: "none", padding: 0 }}
                                                >
                                                    {car.itemNr}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                className="text-tiny text-gray-500 cursor-pointer hover:underline"
                                                title="Skapa ny bokning"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleOpenNewReservation(car)}
                                                style={{ whiteSpace: "nowrap", background: "none", border: "none", padding: 0 }}
                                            >
                                                {car.serialNr}
                                            </button>
                                            {row.laneCount > 1 && <span style={{ fontSize: 9, color: T.textDim, background: T.overlapBg, padding: "1px 5px", borderRadius: 4 }}>{row.laneCount} overlaps</span>}
                                        </div>
                                        <div>
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    className="cursor-pointer text-gray-400 hover:text-black"
                                                    title="Visa information"
                                                    aria-label="Visa information"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setInfoItemId(car.id)}
                                                    style={{ background: "none", border: "none", padding: 0, display: "flex" }}
                                                >
                                                    <Info className="h-3.5 w-3.5" strokeWidth={2} />
                                                </button>
                                        </div>
                                                    
                                    </div>
                                );
                            })}
                            {rowsBottomSpacer > 0 && <div style={{ height: rowsBottomSpacer }} />}
                        </div>

                        {/* Timeline */}
                        <div style={{ flex: 1, position: "relative", background: T.bg }}>

                            <div style={{ position: "absolute", top: headerH, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", ...gridBackground }}>
                                <div style={{ position: "absolute", inset: 0, transform: "translateX(calc(-1 * var(--timeline-scroll-x)))" }}>
                                    {dayLabels.filter(label => label.isToday || (showWeekendShade && label.isWeekend)).map(label => (
                                        <div key={label.dayIdx} style={{ position: "absolute", top: 0, bottom: 0, left: label.dayIdx * dayW, width: dayW, background: label.isToday ? T.todayBg : T.weekendRow }} />
                                    ))}
                                </div>
                            </div>

                            {/* Header */}
                            <div style={{ height: headerH, position: "sticky", top: 0, zIndex: 20, width: "100%", overflow: "hidden", borderBottom: `1px solid ${T.border}`, background: `url(${bg})` }}>
                              <div style={{ position: "relative", width: "100%", height: "100%", transform: "translateX(calc(-1 * var(--timeline-scroll-x)))" }}>

                                {showYearRow && getTimelineYearSpans(monthSpans).map(span => (
                                    <div key={span.year} style={{
                                        position: "absolute", left: span.startPx, top: 0,
                                        width: span.widthPx, height: MONTH_ROW_H,
                                        borderRight: `1px solid ${T.border}`,
                                        borderBottom: `1px solid ${T.borderMonth}`,
                                        overflow: "hidden", boxSizing: "border-box",
                                    }}>
                                        <span style={{
                                            position: "absolute", left: `max(6px, calc(var(--timeline-scroll-x) - ${span.startPx}px + 6px))`, top: 0, bottom: 0,
                                            display: "flex", alignItems: "center",
                                            fontSize: 10, fontWeight: 700, color: T.textFaint,
                                            letterSpacing: 1, whiteSpace: "nowrap",
                                        }}>{span.year}</span>
                                    </div>
                                ))}

                                {/* Month row */}
                                {showMonthRow && (() => {
                                    const spans = monthSpans.filter(span => (
                                        span.startPx < renderWindow.endDay * dayW
                                        && span.startPx + span.widthPx > renderWindow.startDay * dayW
                                    ));
                                    return spans.map((span, si) => {
                                        const hiddenLeft = Math.max(0, -span.startPx);
                                        const labelLeft = hiddenLeft + 6;
                                        return (
                                            <div key={si} style={{
                                                position: "absolute", left: span.startPx, top: showYearRow ? MONTH_ROW_H : 0,
                                                width: span.widthPx, height: showYearRow ? headerH - MONTH_ROW_H : MONTH_ROW_H,
                                                borderRight: `1px solid ${T.border}`,
                                                borderBottom: `1px solid ${T.borderMonth}`,
                                                // background: si % 2 === 0 ? T.bgDeep : T.bgAlt,
                                                overflow: "hidden",
                                                boxSizing: "border-box",
                                            }}>
                                                <span title={span.label} style={{
                                                    position: "absolute", left: labelLeft, top: 0, bottom: 0,
                                                    display: "flex", alignItems: "center",
                                                    fontSize: 10, fontWeight: 700, color: T.textFaint,
                                                    textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap",
                                                    pointerEvents: "none",
                                                }}>
                                                    {showYearRow ? span.monthLabel : span.label}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Day columns */}
                                {showDayHeader && dayLabels.map(({ dayIdx, ...label }) => (
                                        <div key={dayIdx} style={{ position: "absolute", left: dayIdx * dayW, top: MONTH_ROW_H, width: dayW, height: `calc(100% - ${MONTH_ROW_H}px)`, borderRight: `1px solid ${T.border}`, background: label.isToday ? T.todayBg : label.isWeekend ? T.weekendBg : "white", display: "flex", flexDirection: "column" }}>
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                                {dayW >= 40 && <div style={{ fontSize: 10, color: label.isToday ? "#1a9e6e" : T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label.weekday}</div>}
                                                <div style={{ fontSize: dayW < 40 ? 10 : 14, fontWeight: 700, color: label.isToday ? "#1a9e6e" : label.isWeekend ? T.dayWeekend : T.dayNumber, lineHeight: 1.1 }}>{label.day}</div>
                                                {label.isMonday && <div style={{ fontSize: 8, color: T.textDim }}>v{label.week}</div>}
                                                {label.isToday && <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#1a9e6e" }} />}
                                            </div>
                                        </div>
                                ))}

                                {/* Week columns when days are too narrow for labels */}
                                {showWeekHeader && dayLabels.filter(label => label.isMonday).map(({ dayIdx, week }) => (
                                        <div key={dayIdx} style={{ position: "absolute", left: dayIdx * dayW, top: MONTH_ROW_H, width: dayW * 7, height: `calc(100% - ${MONTH_ROW_H}px)`, borderLeft: `1px solid ${T.border}`, background: "white", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                                {showWeekDayTicks && <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Vecka</div>}
                                                {dayW * 7 >= 24 && <span style={{ fontSize: showWeekDayTicks ? 14 : 10, fontWeight: 700, color: T.dayNumber, lineHeight: 1.1 }}>{showWeekDayTicks ? week : `v${week}`}</span>}
                                            </div>
                                            {showWeekDayTicks && <div style={{ height: 22, borderTop: `1px solid ${T.border}`, flexShrink: 0 }} />}
                                        </div>
                                ))}
                                {showWeekDayTicks && dayLabels.map(({ dayIdx, day, isToday, isWeekend }) => (
                                        <div key={`tick-${dayIdx}`} style={{ position: "absolute", left: dayIdx * dayW, bottom: 0, width: dayW, height: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isToday ? T.todayBg : "transparent", pointerEvents: "none" }}>
                                            <div style={{ width: 1, height: 4, background: T.hourTickLine, marginBottom: 2 }} />
                                            <div style={{ fontSize: 8, lineHeight: 1, color: isToday ? "#1a9e6e" : isWeekend ? T.dayWeekend : T.hourTickLabel, fontWeight: isToday ? 700 : 400 }}>{day}</div>
                                        </div>
                                ))}
                                {!showDayHeader && !showWeekDayTicks && dayLabels.filter(label => label.isToday).map(({ dayIdx }) => (
                                        <div key={`today-${dayIdx}`} style={{ position: "absolute", left: dayIdx * dayW, bottom: 0, width: Math.max(dayW, 2), height: 4, background: "#1a9e6e" }} />
                                ))}
                              </div>
                            </div>

                            {/* Car rows */}
                            {rowsTopSpacer > 0 && <div style={{ height: rowsTopSpacer }} />}
                            {renderedCars.map((car, i) => {
                                const row = layout[rowWindow.startIndex + i];
                                return (
                                    <div key={car.id}
                                        data-timeline-car-id={car.id}
                                        style={{ height: row.rowH, borderBottom: `1px solid ${T.border}`, position: "relative", overflow: "hidden", width: "100%", cursor: dragging?.type === "move" ? "grabbing" : "default", transition: "height 0.2s" }}
                                        onMouseDown={(e) => {
                                            if (isPanMode) { onGridMouseDown(e); return; }
                                            if (dragging) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            onCellMouseDown(e, car.id, geometry.dayAtPixel(e.clientX - rect.left, pendingScrollXRef.current));
                                        }}
                                    >
                                        <LiftTimelineRowContent
                                            row={row}
                                            dayW={dayW}
                                            startDate={startDate}
                                            renderWindow={renderWindow}
                                            timelineViewportWidth={timelineViewportWidth}
                                            movingId={row.laneMap.has(movingId) ? movingId : null}
                                            draggingId={row.laneMap.has(dragging?.bookingId) ? dragging.bookingId : null}
                                            hoveredBooking={row.laneMap.has(hoveredBooking) ? hoveredBooking : null}
                                            lockPlanningTimelineDrag={props.lockPlanningTimelineDrag}
                                            onBookingMouseDown={onBookingMouseDown}
                                            onOpenReservation={handleOpenReservationInNewTab}
                                            onHoverChange={setHoveredBooking}
                                        />
                                    </div>
                                );
                            })}
                            {rowsBottomSpacer > 0 && <div style={{ height: rowsBottomSpacer }} />}

                            {/* Today line */}
                            {/* {(() => {
                                return <div style={{ position: "absolute", top: headerH, left: `calc(${2 * dayW + dayW / 2}px - var(--timeline-scroll-x))`, width: 2, height: totalGridH, background: "#1a9e6e", opacity: 0.4, pointerEvents: "none", zIndex: 5 }} />;
                            })()} */}
                        </div>
                    </div>
                </div>

                {/* Scrollbar */}
                <div
                    ref={scrollbarRef}
                    className={isInitialLoading ? 'invisible' : ''}
                    inert={isInitialLoading}
                    aria-hidden={isInitialLoading}
                    data-timeline-scrollbar="true"
                    onClick={onScrollbarTrackClick}
                    style={{ height: 10, background: T.scrollTrack, borderRadius: 5, position: "absolute", left: LABEL_W + 8, right: 8, bottom: 4, cursor: "pointer", zIndex: 40 }}
                >
                    <div
                        ref={scrollbarThumbRef}
                        onMouseDown={onScrollbarMouseDown}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: "absolute", height: "100%", borderRadius: 5,
                            background: T.scrollThumb,
                            left: '0%',
                            width: `${thumbRatio * 100}%`,
                            cursor: "grab", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = T.activeBtnBorder}
                        onMouseLeave={e => e.currentTarget.style.background = T.scrollThumb}
                    />
                </div>
            </div>

            {/* Ghost */}
            <div ref={ghostRef} style={{
                position: "fixed", left: 0, top: 0,
                transform: `translate3d(${(ghost?.x ?? 0) - (ghost?.clickOffsetX ?? 0)}px, ${(ghost?.y ?? 0) - (ghost?.clickOffsetY ?? 0)}px, 0)`,
                width: ghostWidth, height: LANE_H,
                background: ghost?.color?.bg ?? STATUS_COLORS.booked.bg, opacity: 1,
                clipPath: ghostClipPath,
                pointerEvents: "none", zIndex: 9999,
                display: isMoveGhostActive ? "flex" : "none", alignItems: "center", overflow: "hidden",
                boxShadow: `0 2px 6px ${(ghost?.color?.bg ?? STATUS_COLORS.booked.bg)}44`,
                fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap",
            }} />
            <div ref={ghostTextRef} style={{
                position: "fixed",
                left: 0,
                top: 0,
                transform: `translate3d(${typeof window !== "undefined" ? clamp(ghost?.x ?? 0, 170, window.innerWidth - 170) : (ghost?.x ?? 0)}px, ${Math.max(8, (ghost?.y ?? 0) - 34)}px, 0) translateX(-50%)`,
                maxWidth: "min(75vw, 640px)",
                fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif",
                background: "rgba(15,17,23,0.75)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: 0,
                color: "#fff",
                fontSize: 9,
                fontWeight: 400,
                padding: "4px 10px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none",
                zIndex: 10000,
                display: isMoveGhostActive ? "block" : "none",
            }} />

            {/* Footer */}
            {/* <div style={{ padding: "10px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 24, alignItems: "center" }}>
                {(isPanMode
                    ? [["Drag grid", "scroll horizontally"], ["Drag booking", "move across days & cars"], ["Drag edges", "resize duration"], ["Scroll / arrows", "navigate days"]]
                    : [["Drag booking", "move across days & cars"], ["Drag edges", "resize (snaps to 15 min)"], ["Click empty cell", "create booking"], ["Scroll / arrows", "navigate days"]]
                ).map(([a, d]) => (
                    <span key={a} style={{ fontSize: 11, color: T.footerText }}>
                        <strong style={{ color: T.footerStrong }}>{a}</strong> → {d}
                    </span>
                ))}
            </div> */}

        </div>
    )
}

export default LiftTimeline
