import { memo, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { CalendarSearch, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import CarSearchModal from '../../modals/CarSearchModal';
import FilterSelect from '../../components/FilterSelect';
import SegmentedFilter from '../../components/SegmentedFilter';
import DateRangePicker from '../../components/DaterangePicker';
import ActionButton from '../../components/ActionButton';
import { getPlanningCategories, getPlanningReservations, getPlanningVehicles, updatePlanningReservation } from '../../lib/planningApi';
import useVehicleTimelineDrag from './useVehicleTimelineDrag';
import useVehicleTimelineGeometry from './useVehicleTimelineGeometry';
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

const STATUS_COLORS = {
    booked: { name: "bokad", bg: "#889DFA", text: "#fff", border: "#889DFA" },
    out: { name: "utlämnad", bg: "rgb(3,191,127)", text: "#fff", border: "rgb(3,191,127)" },
    late_out: { name: "sen hämtning", bg: "rgb(251,167,21)", text: "#fff", border: "rgb(255,170,1)" },
    late_in: { name: "sen återlämning", bg: "#A8120B", text: "#fff", border: "#A8120B" },
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const SNAP = 1 / 96;
const MIN_DUR = 1 / 96;
const LANE_H = 25;
const LANE_GAP = 1;
const LANE_TOP_PAD = 1;
const LANE_BOTTOM_PAD = 1;
const LABEL_W = 200;
const HEADER_H = 72;
const TOTAL_DAYS = 180;
const TIMELINE_MAX_HEIGHT = "calc(100vh - 189px)";
const TIMELINE_HEADER_H = 88;

const PERIOD_OPTIONS = [
    { value: 3, label: '3 dagar' },
    { value: 7, label: '7 dagar' },
    { value: 31, label: '31 dagar' },
    { value: 90, label: '3 månader' },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function formatTime(fracDay) {
    const normalizedDayFraction = ((fracDay % 1) + 1) % 1;
    const m = Math.round(normalizedDayFraction * 24 * 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function formatTimelineDateTime(fracDay, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(fracDay));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day} ${formatTime(fracDay)}`;
}

function getDayLabel(dayIndex, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayIndex);
    return {
        day: d.getDate(),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: d.toDateString() === new Date().toDateString(),
    };
}

function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

function toIsoDateTime(value) {
    const date = value instanceof Date ? value : (value ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

function toTimelineDay(value, timelineStart) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return (date.getTime() - timelineStart.getTime()) / 86400000;
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
    for (const b of sorted) {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] <= b.start) { lanes[i] = b.end; result.set(b.id, i); placed = true; break; }
        }
        if (!placed) { result.set(b.id, lanes.length); lanes.push(b.end); }
    }
    return { laneMap: result, laneCount: Math.max(1, lanes.length) };
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
        const { laneMap, laneCount } = assignLanes(carBookings);
        const rowH = laneCount * LANE_H + Math.max(0, laneCount - 1) * LANE_GAP + LANE_TOP_PAD + LANE_BOTTOM_PAD;
        return { carId: car.id, laneMap, laneCount, rowH, bookings: carBookings };
    });
    let cumY = HEADER_H;
    layout.forEach(row => { row.top = cumY; cumY += row.rowH; });
    layout.totalH = cumY - HEADER_H;
    return layout;
}

function computeMonthSpans(visibleStartDayI, totalVisible, dayW, startDate) {
    const spans = [];
    let i = 0;
    while (i <= totalVisible + 1) {
        const dayIdx = visibleStartDayI + i;
        const d = new Date(startDate); d.setDate(d.getDate() + dayIdx);
        const month = d.getMonth(), year = d.getFullYear();
        let count = 0, j = i;
        while (j <= totalVisible + 31) {
            const dd = new Date(startDate); dd.setDate(dd.getDate() + visibleStartDayI + j);
            if (dd.getMonth() !== month || dd.getFullYear() !== year) break;
            count++; j++;
        }
        spans.push({ label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), startPx: dayIdx * dayW, widthPx: count * dayW });
        i += count;
    }
    return spans;
}

const VehicleTimelineBar = memo(function VehicleTimelineBar({
    booking,
    dayW,
    timelineViewportWidth,
    lane,
    hasFollowingBooking,
    isMoving,
    isHovered,
    onBookingMouseDown,
    onOpenReservation,
    onHoverChange,
}) {
    const color = STATUS_COLORS[booking.status] || STATUS_COLORS.booked;
    const widthPx = (booking.end - booking.start) * dayW;
    const barTop = LANE_TOP_PAD + lane * (LANE_H + LANE_GAP);
    const barWidth = Math.max(widthPx - (hasFollowingBooking ? 1 : 0), 8);
    const arrowSize = Math.min(10, barWidth / 2);
    const labelLeft = `max(${arrowSize + 4}px, calc(var(--timeline-scroll-x) - ${booking.start * dayW}px + ${arrowSize + 4}px))`;
    const labelRight = `max(${arrowSize + 4}px, calc(${booking.end * dayW}px - var(--timeline-scroll-x) - ${timelineViewportWidth}px + ${arrowSize + 4}px))`;

    return (
        <div
            data-reservation-bar="true"
            onMouseDown={(event) => onBookingMouseDown(event, booking, "move")}
            onMouseEnter={() => onHoverChange(booking.id)}
            onMouseLeave={() => onHoverChange(null)}
            style={{
                position: "absolute",
                left: booking.start * dayW,
                top: 0,
                transform: `translateY(${barTop}px)`,
                height: LANE_H,
                width: barWidth,
                background: color.bg,
                clipPath: `polygon(${arrowSize}px 0, calc(100% - ${arrowSize}px) 0, 100% 50%, calc(100% - ${arrowSize}px) 100%, ${arrowSize}px 100%, 0 50%)`,
                cursor: isMoving ? "grabbing" : isHovered ? "grab" : "default",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                boxShadow: `0 2px 6px ${color.bg}44`,
                transition: isMoving ? "none" : "box-shadow 0.15s",
                zIndex: 1,
                opacity: isMoving ? 0 : 1,
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
                    strokeWidth={3}
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
                    {booking.customer}
                </button>
                {widthPx >= 150 && (
                    <span className="vehicle-timeline-time vehicle-timeline-time-full text-white">
                        {formatTime(booking.start)}–{formatTime(booking.end)}
                    </span>
                )}
                {widthPx >= 150 && (
                    <span className="vehicle-timeline-time vehicle-timeline-time-compact text-white" aria-hidden="true">
                        {formatTime(booking.start).slice(0, 2)}–{formatTime(booking.end).slice(0, 2)}
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
                    strokeWidth={3}
                    style={{ opacity: isHovered ? 0.9 : 0, transition: "opacity 0.12s" }}
                />
            </div>
        </div>
    );
});


const arrowBtnBase = {
    width: 28, height: 28, borderRadius: "9999px", border: "1px solid",
    background: "white", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
};

// Kept outside the component so the view survives navigating away and back.
const timelineViewState = {
    scrollX: 0,
    daysVisible: 31,
    startDate: null,
    populateFromDate: null,
    selectedCategories: [],
    searchSelection: null,
};

function getDefaultPopulateFromDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// 3-day mode starts on yesterday; every other period keeps a 2-day buffer before the anchor.
function computeViewportStartDate(anchorDate, daysVisible) {
    const d = new Date(anchorDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (daysVisible === 3 ? 1 : 2));
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


function VehicleTimeline(props) {
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
    const [scrollX, setScrollX] = useState(hasPersistedSearch ? timelineViewState.scrollX : 0);
    const pendingScrollXRef = useRef(hasPersistedSearch ? timelineViewState.scrollX : 0);
    const scrollFrameRef = useRef(null);
    const scrollCommitTimeoutRef = useRef(null);
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
    const fetchReservationsRef = useRef(() => {});

    const [carSearchOpen, setCarSearchOpen] = useState(false);
    const [dateSelectOpen, setDateSelectOpen] = useState(false);
    const dateSelectRef = useRef(null);
    const [searchSelection, setSearchSelection] = useState(timelineViewState.searchSelection);
    const [selectedCategories, setSelectedCategories] = useState(timelineViewState.selectedCategories);
    const [categoryOptions, setCategoryOptions] = useState(EMPTY_VEHICLES);
    const [visibleCars, setVisibleCars] = useState(EMPTY_VEHICLES);

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

        getPlanningCategories()
            .then(categories => {
                if (!isActive) return;
                setCategoryOptions(categories.map(category => ({ value: category.id, label: category.name })));
            })
            .catch(() => {
                if (isActive) setCategoryOptions(EMPTY_VEHICLES);
            });

        return () => { isActive = false; };
    }, []);

    const selectedCategoryKey = useMemo(
        () => selectedCategories.map(option => option.value).sort().join(','),
        [selectedCategories]
    );

    useEffect(() => {
        let isActive = true;
        const categoryIds = selectedCategoryKey ? selectedCategoryKey.split(',').map(Number) : [];

        getPlanningVehicles({
            categoryIds,
            categoryName: searchSelection?.category ?? '',
            modelName: searchSelection?.model ?? '',
        })
            .then(vehicles => {
                if (isActive) setVisibleCars(vehicles);
            })
            .catch(() => {
                if (isActive) setVisibleCars(EMPTY_VEHICLES);
            });

        return () => { isActive = false; };
    }, [selectedCategoryKey, searchSelection]);

    const visibleVehicleKey = useMemo(
        () => visibleCars.map(vehicle => vehicle.id).join(','),
        [visibleCars]
    );

    useEffect(() => {
        let isActive = true;
        const vehicleIds = visibleVehicleKey
            ? visibleVehicleKey.split(',').map(Number)
            : [];

        const fetchReservations = () => {
            if (vehicleIds.length === 0) {
                setBookings([]);
                return;
            }

            const fetchFrom = new Date(populateFromDate);
            fetchFrom.setDate(fetchFrom.getDate() - (daysVisible * 2));

            const fetchTo = new Date(populateFromDate);
            fetchTo.setDate(fetchTo.getDate() + (daysVisible * 3));

            getPlanningReservations({
                vehicleIds,
                from: toIsoDateTime(fetchFrom),
                to: toIsoDateTime(fetchTo),
            })
                .then(reservations => {
                    if (!isActive) return;
                    const timelineStart = new Date(startDate);
                    const mappedReservations = reservations
                        .map(reservation => ({
                            ...reservation,
                            start: toTimelineDay(reservation.start, timelineStart),
                            end: toTimelineDay(reservation.end, timelineStart),
                        }))
                        .filter(reservation => (
                            reservation.start !== null
                            && reservation.end !== null
                            && reservation.end > reservation.start
                        ));
                    setBookings(mappedReservations);
                })
                .catch(() => {
                    if (isActive) setBookings([]);
                });
        };

        // Exposed so a background refresh (e.g. tab regains focus) can reuse the same fetch.
        fetchReservationsRef.current = fetchReservations;
        fetchReservations();

        return () => { isActive = false; };
    }, [visibleVehicleKey, startDate, daysVisible, populateFromDate]);

    // Re-fetch silently when returning to this tab, so edits saved from a reservation opened elsewhere show up.
    useEffect(() => {
        const refreshInBackground = () => {
            if (document.visibilityState === "hidden") return;
            fetchReservationsRef.current?.();
        };
        window.addEventListener("focus", refreshInBackground);
        document.addEventListener("visibilitychange", refreshInBackground);
        return () => {
            window.removeEventListener("focus", refreshInBackground);
            document.removeEventListener("visibilitychange", refreshInBackground);
        };
    }, []);

    const handleCarSearch = (params) => {
        const from = toIsoDateTime(params?.period?.from);
        const to = toIsoDateTime(params?.period?.to);

        setSearchSelection({
            category: params?.category ?? '',
            model: params?.model ?? '',
            from,
            to,
        });

        if (from && to) {
            const nextDaysVisible = resolveDaysVisible(from, to);
            const effectiveDaysVisible = nextDaysVisible || daysVisible;
            if (nextDaysVisible) setDaysVisible(nextDaysVisible);
            const selectedFromDate = new Date(new Date(from).setHours(0, 0, 0, 0));
            setPopulateFromDate(selectedFromDate);
            setStartDate(computeViewportStartDate(selectedFromDate, effectiveDaysVisible));
            scheduleScrollX(0);
        }

        // Pass params to overview or handle as needed
        if (props.onCarSearch) props.onCarSearch(params);
    };

    const handleClearCarSearch = () => {
        setSearchSelection(null);
        const clearedPopulateFromDate = getDefaultPopulateFromDate();
        setPopulateFromDate(clearedPopulateFromDate);
        setStartDate(computeViewportStartDate(clearedPopulateFromDate, daysVisible));
        scheduleScrollX(0);
    };

    const handlePopulateDateApply = ({ startDate: selectedStartDate, endDate: selectedEndDate }) => {
        const selectedDate = selectedStartDate || selectedEndDate;
        if (!selectedDate) return;

        const normalizedDate = new Date(selectedDate);
        normalizedDate.setHours(0, 0, 0, 0);

        setPopulateFromDate(normalizedDate);
        setStartDate(computeViewportStartDate(normalizedDate, daysVisible));
        scheduleScrollX(0);
    };

    const handleDaysVisibleChange = (value) => {
        setDaysVisible(value);
        setStartDate(computeViewportStartDate(populateFromDate, value));
        scheduleScrollX(0);
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

    const handleOpenNewReservation = (car) => {
        navigate('/operations/reservation/new', {
            state: {
                newReservationPrefill: {
                    vehicle: {
                        id: car.id,
                        itemNr: car.itemNr,
                        regNr: car.regNr,
                        manufacturer: car.manufacturer,
                        itemCategoryName: car.category,
                        itemModelName: car.model,
                    },
                    period: searchSelection?.from && searchSelection?.to
                        ? { from: searchSelection.from, to: searchSelection.to }
                        : null,
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

    const geometry = useVehicleTimelineGeometry({
        containerWidth: containerW,
        daysVisible,
        labelWidth: LABEL_W,
        snapDays: SNAP,
    });
    const {
        dayWidth: dayW,
        timelineViewportWidth,
        populatedPastDays,
        totalTimelineDays,
        minScrollX,
        maxScrollX,
        scrollRangeX,
    } = geometry;

    const scheduleScrollX = useCallback((nextValue) => {
        const currentValue = pendingScrollXRef.current;
        const requestedValue = typeof nextValue === 'function'
            ? nextValue(currentValue)
            : nextValue;
        pendingScrollXRef.current = clamp(requestedValue, minScrollX, maxScrollX);

        if (scrollFrameRef.current !== null) return;

        scrollFrameRef.current = window.requestAnimationFrame(() => {
            scrollFrameRef.current = null;
            const nextScrollX = pendingScrollXRef.current;
            gridRef.current?.style.setProperty('--timeline-scroll-x', `${nextScrollX}px`);

            const thumbWidth = daysVisible / totalTimelineDays;
            const thumbPosition = scrollRangeX > 0
                ? ((nextScrollX - minScrollX) / scrollRangeX) * (100 - thumbWidth * 100)
                : 0;
            scrollbarThumbRef.current?.style.setProperty('left', `${thumbPosition}%`);
        });

        if (scrollCommitTimeoutRef.current !== null) {
            window.clearTimeout(scrollCommitTimeoutRef.current);
        }
        scrollCommitTimeoutRef.current = window.setTimeout(() => {
            scrollCommitTimeoutRef.current = null;
            setScrollX(pendingScrollXRef.current);
        }, 100);
    }, [daysVisible, maxScrollX, minScrollX, scrollRangeX, totalTimelineDays]);

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

    const timeConfig = useMemo(() => {
        if (daysVisible <= 1) return { ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], intervalLabel: h => `${String(h).padStart(2, "0")}:00`, showSubRow: true };
        if (daysVisible <= 3) return { ticks: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22], intervalLabel: h => `${String(h).padStart(2, "0")}:00`, showSubRow: true };
        if (daysVisible <= 7) return { ticks: [0, 6, 12, 18], intervalLabel: h => `${String(h).padStart(2, "0")}:00`, showSubRow: true };
        if (daysVisible <= 14) return { ticks: [0, 12], intervalLabel: h => h === 0 ? "00:00" : "12:00", showSubRow: true };
        return { ticks: [], intervalLabel: () => "", showSubRow: false };
    }, [daysVisible]);

    const { ticks: hourTicks, intervalLabel, showSubRow } = timeConfig;
    const showMonthRow = daysVisible >= 21;
    const MONTH_ROW_H = 24;
    const headerH = TIMELINE_HEADER_H;

    const layout = useMemo(() => computeRowLayout(bookings, visibleCars), [bookings, visibleCars]);

    // Computed once (only when the date range actually changes) instead of once per day PER CAR ROW.
    // getDayLabel() does toLocaleDateString() calls, which are expensive - previously this ran
    // totalTimelineDays * visibleCars.length times on every render.
    const dayLabels = useMemo(() => {
        const labels = new Array(totalTimelineDays);
        for (let i = 0; i < totalTimelineDays; i++) {
            const dayIdx = i - populatedPastDays;
            labels[i] = { dayIdx, ...getDayLabel(dayIdx, startDate) };
        }
        return labels;
    }, [totalTimelineDays, populatedPastDays, startDate]);

    const onWheel = useCallback((e) => {
        // Horizontal scroll (trackpad swipe or shift+wheel): intercept for timeline
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
            e.preventDefault();
            scheduleScrollX(prev => prev + e.deltaX);
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
        const track = scrollbarRef.current;
        if (!track) return;
        const trackRect = track.getBoundingClientRect();
        const thumbW = (daysVisible / totalTimelineDays) * trackRect.width;
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
    }, [daysVisible, scheduleScrollX, scrollRangeX, totalTimelineDays]);

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
            scheduleScrollX(panRef.current.startScrollX + dx);
        };
        const onUp = () => {
            panRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isPanMode, scheduleScrollX]);

    useEffect(() => {
        scheduleScrollX(prev => prev);
    }, [scheduleScrollX]);

    const handleBookingCommit = useCallback((booking) => {
        if (!booking.reservationId || booking.id <= 0) return Promise.resolve();

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
        });
    }, [startDate]);

    const {
        beginResize,
        dragging,
        ghost,
        ghostRef,
        ghostTextRef,
        isReservationClickSuppressed,
        onBookingMouseDown,
    } = useVehicleTimelineDrag({
        daysVisible,
        geometry,
        gridRef,
        headerHeight: headerH,
        labelWidth: LABEL_W,
        layout,
        minimumDuration: MIN_DUR,
        onCommit: handleBookingCommit,
        pendingScrollXRef,
        setBookings,
        statusColors: STATUS_COLORS,
        totalDays: TOTAL_DAYS,
        visibleCars,
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
        setBookings(prev => [...prev, booking]);
        beginResize(e, booking, visibleCars.findIndex(c => c.id === carId));
    };

    const movingId = dragging?.type === "move" ? dragging.bookingId : null;
    const draggingBooking = useMemo(
        () => (dragging ? bookings.find(booking => booking.id === dragging.bookingId) ?? null : null),
        [dragging, bookings]
    );
    const dragRangeText = draggingBooking
        ? `${formatTimelineDateTime(draggingBooking.start, startDate)} -> ${formatTimelineDateTime(draggingBooking.end, startDate)}`
        : (ghost ? `${formatTimelineDateTime(ghost.start, startDate)} -> ${formatTimelineDateTime(ghost.end, startDate)}` : '');
    const isMoveGhostActive = Boolean(ghost && dragging?.type === "move");
    const ghostWidth = Math.max(ghost?.width ?? 8, 8);
    const ghostArrowSize = Math.min(10, Math.max(4, ghostWidth / 4));
    const ghostClipPath = ghost?.isCappedLeft && ghost?.isCappedRight
        ? `polygon(${ghostArrowSize}px 0, calc(100% - ${ghostArrowSize}px) 0, 100% 50%, calc(100% - ${ghostArrowSize}px) 100%, ${ghostArrowSize}px 100%, 0 50%)`
        : ghost?.isCappedLeft
            ? `polygon(${ghostArrowSize}px 0, 100% 0, 100% 100%, ${ghostArrowSize}px 100%, 0 50%)`
            : ghost?.isCappedRight
                ? `polygon(0 0, calc(100% - ${ghostArrowSize}px) 0, 100% 50%, calc(100% - ${ghostArrowSize}px) 100%, 0 100%)`
                : undefined;


    return (
        <div className="px-4" style={{ position: "relative" }}>
            <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 0, pointerEvents: "none" }} />

            <CarSearchModal
                isOpen={carSearchOpen}
                onClose={() => setCarSearchOpen(false)}
                onSearch={handleCarSearch}
            />

            {/* ── Top Bar ── */}
            <div className="flex flex-row items-center justify-between pt-6 pb-7 px-30">

                <div className="flex flex-row items-center gap-5">

                    {/* Days selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <SegmentedFilter
                            value={daysVisible}
                            onChange={handleDaysVisibleChange}
                            options={PERIOD_OPTIONS}
                            theme="sky"
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

                <div className="flex flex-row items-center gap-4 w-140">
                    <ActionButton
                        label="Sök lediga tider"
                        icon={CalendarSearch}
                        onClick={() => setCarSearchOpen(true)}
                        accent="lime"
                    />

                    {searchSelection && (
                        <div className="flex flex-row items-center gap-2 rounded-full border border-lime-500 bg-lime-50 px-3 h-7">
                            <span className="text-xs text-lime-900">
                                {[
                                    searchSelection.category || 'Alla kategorier',
                                    searchSelection.model || 'Alla modeller',
                                    searchSelection.from && searchSelection.to
                                        ? `${formatSelectionDate(searchSelection.from)} – ${formatSelectionDate(searchSelection.to)}`
                                        : '',
                                ].filter(Boolean).join(' · ')}
                            </span>
                            <button
                                type="button"
                                aria-label="Rensa sökning"
                                title="Rensa sökning"
                                onClick={handleClearCarSearch}
                                className="cursor-pointer text-lime-600 hover:text-lime-800"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 16 }}>
                    {Object.entries(STATUS_COLORS).map(([s, c]) => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: c.bg, border: `1px solid ${c.border}` }} />
                            <span className="text-xs" style={{ color: T.textPlate, textTransform: "capitalize" }}>{c.name}</span>
                        </div>
                    ))}
                </div>


            </div>

            {/* ── Grid ── */}
            <div
                className=""
                ref={gridRef}
                style={{
                    height: TIMELINE_MAX_HEIGHT,
                    maxHeight: TIMELINE_MAX_HEIGHT,
                    overflowX: "hidden",
                    overflowY: "auto",
                    position: "relative",
                    '--timeline-scroll-x': `${scrollX}px`,
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
                        {visibleCars.map((car, i) => {
                            const row = layout[i];
                            return (
                                <div key={car.id} style={{ height: row.rowH, background: "#AAB8E4", borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", paddingLeft: 16, paddingRight: 8, gap: 8, transition: "background 0.1s, height 0.2s" }}>
                                    <div className="text-xs" style={{ minWidth: 0, color: 'black', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {car.category}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            className="text-tiny cursor-pointer hover:underline"
                                            title="Skapa ny bokning"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                            }}
                                            onClick={() => handleOpenNewReservation(car)}
                                            style={{ color: 'black', background: "none", border: "none", padding: 0 }}
                                        >
                                            {car.regNr}
                                        </button>
                                        {row.laneCount > 1 && <span style={{ fontSize: 9, color: T.textDim, background: T.overlapBg, padding: "1px 5px", borderRadius: 4 }}>{row.laneCount} overlaps</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline */}
                    <div style={{ flex: 1, position: "relative" }}>

                        {/* Header */}
                        <div style={{ height: headerH, position: "sticky", top: 0, zIndex: 20, width: "100%", overflow: "hidden", borderBottom: `1px solid ${T.border}`, background: `url(${bg})` }}>
                          <div style={{ position: "relative", width: "100%", height: "100%", transform: "translateX(calc(-1 * var(--timeline-scroll-x)))" }}>

                            {/* Month row */}
                            {showMonthRow && (() => {
                                const spans = computeMonthSpans(-populatedPastDays, totalTimelineDays, dayW, startDate);
                                return spans.map((span, si) => {
                                    const hiddenLeft = Math.max(0, -span.startPx);
                                    const labelLeft = hiddenLeft + 6;
                                    return (
                                        <div key={si} style={{
                                            position: "absolute", left: span.startPx, top: 0,
                                            width: span.widthPx, height: MONTH_ROW_H,
                                            borderRight: `1px solid ${T.border}`,
                                            borderBottom: `1px solid ${T.borderMonth}`,
                                            // background: si % 2 === 0 ? T.bgDeep : T.bgAlt,
                                            overflow: "hidden",
                                            boxSizing: "border-box",
                                        }}>
                                            <span style={{
                                                position: "absolute", left: labelLeft, top: 0, bottom: 0,
                                                display: "flex", alignItems: "center",
                                                fontSize: 10, fontWeight: 700, color: T.textFaint,
                                                textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap",
                                                pointerEvents: "none",
                                            }}>
                                                {span.label}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}

                            {/* Day columns */}
                            {dayLabels.map(({ dayIdx, ...label }) => (
                                    <div key={dayIdx} style={{ position: "absolute", left: dayIdx * dayW, top: showMonthRow ? MONTH_ROW_H : 0, width: dayW, height: `calc(100% - ${showMonthRow ? MONTH_ROW_H : 0}px)`, borderRight: `1px solid ${T.border}`, background: label.isToday ? T.todayBg : label.isWeekend ? T.weekendBg : "white", display: "flex", flexDirection: "column" }}>
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                            {dayW >= 40 && <div style={{ fontSize: 10, color: label.isToday ? "#1a9e6e" : T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label.weekday}</div>}
                                            <div style={{ fontSize: dayW < 40 ? 10 : dayW < 60 ? 14 : 18, fontWeight: 700, color: label.isToday ? "#1a9e6e" : label.isWeekend ? T.dayWeekend : T.dayNumber, lineHeight: 1.1 }}>{label.day}</div>
                                            {!showMonthRow && <div style={{ fontSize: 9, color: T.textDim }}>{label.month}</div>}
                                            {label.isToday && <div style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "#1a9e6e" }} />}
                                        </div>
                                        {showSubRow && (
                                            <div style={{ height: 22, borderTop: `1px solid ${T.border}`, position: "relative", flexShrink: 0 }}>
                                                {hourTicks.map(h => {
                                                    if (h === 0) return null;
                                                    return (
                                                        <div key={h} style={{ position: "absolute", left: (h / 24) * dayW, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", transform: "translateX(-50%)" }}>
                                                            <div style={{ width: 1, height: 5, background: T.hourTickLine, marginBottom: 2 }} />
                                                            <div style={{ fontSize: 8, color: T.hourTickLabel, lineHeight: 1, whiteSpace: "nowrap" }}>{intervalLabel(h)}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                            ))}
                          </div>
                        </div>

                        {/* Car rows */}
                        {visibleCars.map((car, rowIdx) => {
                            const row = layout[rowIdx];
                            const carBookings = row.bookings;
                            return (
                                <div key={car.id}
                                    style={{ height: row.rowH, borderBottom: `1px solid ${T.border}`, position: "relative", overflow: "hidden", background: rowIdx % 2 === 0 ? T.bg : T.bgAlt, width: "100%", cursor: dragging?.type === "move" ? "grabbing" : "default", transition: "background 0.1s, height 0.2s" }}
                                    onMouseDown={(e) => {
                                        if (isPanMode) { onGridMouseDown(e); return; }
                                        if (dragging) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        onCellMouseDown(e, car.id, geometry.dayAtPixel(e.clientX - rect.left, pendingScrollXRef.current));
                                    }}
                                >
                                    <div style={{ position: "absolute", inset: 0, transform: "translateX(calc(-1 * var(--timeline-scroll-x)))" }}>
                                        {/* Day grid lines */}
                                        {dayLabels.map(({ dayIdx, ...label }) => (
                                            <div key={dayIdx} style={{ position: "absolute", left: dayIdx * dayW, top: 0, bottom: 0, width: dayW, borderRight: `1px solid ${T.gridLine}`, background: label.isToday ? T.todayBg : label.isWeekend ? T.weekendRow : "transparent", pointerEvents: "none" }}>
                                                {hourTicks.map(h => (
                                                    <div key={h} style={{ position: "absolute", top: 0, bottom: 0, left: (h / 24) * dayW, width: 1, background: T.hourGridLine }} />
                                                ))}
                                            </div>
                                        ))}

                                        {/* Booking bars */}
                                        {carBookings.map(booking => {
                                            const lane = row.laneMap.get(booking.id) ?? 0;
                                            const hasFollowingBooking = carBookings.some(otherBooking => (
                                                otherBooking.id !== booking.id
                                                && row.laneMap.get(otherBooking.id) === lane
                                                && otherBooking.start >= booking.end
                                            ));
                                            return (
                                                <VehicleTimelineBar
                                                    key={booking.id}
                                                    booking={booking}
                                                    dayW={dayW}
                                                    timelineViewportWidth={timelineViewportWidth}
                                                    lane={lane}
                                                    hasFollowingBooking={hasFollowingBooking}
                                                    isMoving={movingId === booking.id}
                                                    isHovered={hoveredBooking === booking.id}
                                                    onBookingMouseDown={onBookingMouseDown}
                                                    onOpenReservation={handleOpenReservationInNewTab}
                                                    onHoverChange={setHoveredBooking}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Today line */}
                        {/* {(() => {
                            return <div style={{ position: "absolute", top: headerH, left: `calc(${2 * dayW + dayW / 2}px - var(--timeline-scroll-x))`, width: 2, height: totalGridH, background: "#1a9e6e", opacity: 0.4, pointerEvents: "none", zIndex: 5 }} />;
                        })()} */}
                    </div>
                </div>

                {/* Scrollbar */}
                <div
                    ref={scrollbarRef}
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
                            left: `${scrollRangeX > 0 ? ((scrollX - minScrollX) / scrollRangeX) * (100 - (daysVisible / totalTimelineDays) * 100) : 0}%`,
                            width: `${(daysVisible / totalTimelineDays) * 100}%`,
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
            }}>
                <span style={{ width: 14, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronLeft className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ width: 14, height: "100%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight className="h-3 w-3" strokeWidth={2.4} />
                </span>
            </div>
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
            }}>
                {dragRangeText}
            </div>

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

export default VehicleTimeline
