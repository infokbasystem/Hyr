import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import CarSearchModal from '../../Modals/CarSearchModal';

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
const CARS = [
    { id: 1, name: "Tesla Model 3", plate: "AB-1234", category: "Electric" },
    { id: 2, name: "BMW 5 Series", plate: "CD-5678", category: "Luxury" },
    { id: 3, name: "Ford Transit", plate: "EF-9012", category: "Van" },
    { id: 4, name: "Toyota Corolla", plate: "GH-3456", category: "Economy" },
    { id: 5, name: "Mercedes GLC", plate: "IJ-7890", category: "SUV" },
    { id: 6, name: "Volkswagen Golf", plate: "KL-1234", category: "Economy" },
    { id: 7, name: "Audi A4", plate: "MN-5678", category: "Luxury" },
    { id: 8, name: "Renault Trafic", plate: "OP-9012", category: "Van" },
];

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
    booked: { name: "bokad", bg: "rgb(128,128,255)", text: "#fff", border: "rgb(73, 73, 144)" },
    out: { name: "utlämnad", bg: "rgb(209, 209, 0)", text: "#fff", border: "rgb(160, 160, 0)" },
    late_out: { name: "sen hämtning", bg: "#f39c12", text: "#fff", border: "#d68910" },
    late_in: { name: "sen återlämning", bg: "#e16355", text: "#fff", border: "#a93226" },
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const SNAP = 1 / 96;
const MIN_DUR = 1 / 96;
const LANE_H = 44;
const LANE_PAD = 6;
const LABEL_W = 180;
const HEADER_H = 72;
const TOTAL_DAYS = 60;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function snapTo15(val) { return Math.round(val / SNAP) * SNAP; }

function formatTime(fracDay) {
    const m = Math.round((fracDay % 1) * 24 * 60);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function formatDateTime(fracDay, startDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + Math.floor(fracDay));
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${formatTime(fracDay)}`;
}

function formatDuration(days) {
    const t = Math.round(days * 24 * 60);
    const h = Math.floor(t / 60), m = t % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
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

function computeRowLayout(bookings) {
    const layout = CARS.map(car => {
        const carBookings = bookings.filter(b => b.carId === car.id);
        const { laneMap, laneCount } = assignLanes(carBookings);
        const rowH = laneCount * LANE_H + LANE_PAD * (laneCount + 1);
        return { carId: car.id, laneMap, laneCount, rowH };
    });
    let cumY = HEADER_H;
    layout.forEach(row => { row.top = cumY; cumY += row.rowH; });
    layout.totalH = cumY - HEADER_H;
    return layout;
}

function getRowIdxFromY(clientY, gridTop, layout, headerH = HEADER_H) {
    const relY = clientY - gridTop - headerH;
    if (relY < 0) return 0;
    let cumY = 0;
    for (let i = 0; i < layout.length; i++) { cumY += layout[i].rowH; if (relY < cumY) return i; }
    return layout.length - 1;
}

function computeMonthSpans(visibleStartDayI, totalVisible, dayW, scrollX, startDate) {
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
        spans.push({ label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), startPx: dayIdx * dayW - scrollX, widthPx: count * dayW });
        i += count;
    }
    return spans;
}


const arrowBtnBase = {
    width: 32, height: 32, borderRadius: 6, border: "1px solid",
    background: "white", cursor: "pointer", fontSize: 18,
    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
};



function VehicleTimeline(props) {
    const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
    const [scrollX, setScrollX] = useState(0);
    const [dragging, setDragging] = useState(null);
    const [ghost, setGhost] = useState(null);
    const [dropTargetCarIdx, setDropTarget] = useState(null);
    const [hoveredBooking, setHovered] = useState(null);
    const [tooltip, setTooltip] = useState(null);
    const [daysVisible, setDaysVisible] = useState(31);
    const [isDark, setIsDark] = useState(false);
    const [isPanMode, setIsPanMode] = useState(true);
    const [selectedBooking, setSelected] = useState(null);
    const panRef = useRef(null); // tracks pan drag start
    const pendingRef = useRef(null); // stores intent before drag threshold
    const [startDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 2); return d; });

    const T = THEMES[isDark ? "dark" : "light"];

    const gridRef = useRef(null);
    const scrollbarRef = useRef(null);
    const containerRef = useRef(null);
    const nextId = useRef(20);

    const [carSearchOpen, setCarSearchOpen] = useState(false);
    // Example categories and models
    const categories = Array.from(new Set(CARS.map(c => c.category))).map(cat => ({ label: cat, value: cat }));
    const models = Array.from(new Set(CARS.map(c => c.name))).map(model => ({ label: model, value: model }));

    const handleCarSearch = (params) => {
        // Pass params to overview or handle as needed
        if (props.onCarSearch) props.onCarSearch(params);
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

    const minDayW = daysVisible <= 3 ? 120 : daysVisible <= 7 ? 100 : daysVisible <= 14 ? 80 : 28;
    // const availableW = containerW - LABEL_W;
    // const dayW = Math.max(minDayW, Math.floor(availableW / daysVisible));
    const availableW = Math.max(0, containerW - LABEL_W);
    const dayW = availableW > 0 ? Math.max(minDayW, Math.floor(availableW / daysVisible)) : minDayW;
    const maxScrollX = Math.max(0, TOTAL_DAYS * dayW - daysVisible * dayW);

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
    const headerH = (showMonthRow ? MONTH_ROW_H : 0) + (showSubRow ? 84 : 64);

    const layout = useMemo(() => computeRowLayout(bookings), [bookings]);
    const totalGridH = layout.reduce((s, r) => s + r.rowH, 0);

    const onWheel = useCallback((e) => {
        // Horizontal scroll (trackpad swipe or shift+wheel): intercept for timeline
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
            e.preventDefault();
            setScrollX(prev => clamp(prev + e.deltaX, 0, maxScrollX));
        }
        // Pure vertical scroll: let browser handle it naturally (do nothing)
    }, [maxScrollX]);

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
                setScrollX(prev => clamp(prev - dayW * 3, 0, maxScrollX));
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                setScrollX(prev => clamp(prev + dayW * 3, 0, maxScrollX));
            }
            // ArrowUp / ArrowDown: do nothing, let browser scroll the page
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [dayW, maxScrollX]);

    // Draggable scrollbar thumb
    const onScrollbarMouseDown = useCallback((e) => {
        e.preventDefault();
        const track = scrollbarRef.current;
        if (!track) return;
        const trackRect = track.getBoundingClientRect();
        const thumbW = (daysVisible / TOTAL_DAYS) * trackRect.width;
        const startX = e.clientX;
        const startScrollX = scrollX;
        const onMove = (me) => {
            const dx = me.clientX - startX;
            const scrollable = trackRect.width - thumbW;
            const ratio = scrollable > 0 ? dx / scrollable : 0;
            setScrollX(clamp(startScrollX + ratio * maxScrollX, 0, maxScrollX));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [scrollX, maxScrollX, daysVisible]);

    // Click on track (outside thumb) jumps to that position
    const onScrollbarTrackClick = useCallback((e) => {
        const track = scrollbarRef.current;
        if (!track) return;
        const trackRect = track.getBoundingClientRect();
        const clickRatio = (e.clientX - trackRect.left) / trackRect.width;
        setScrollX(clamp(clickRatio * maxScrollX, 0, maxScrollX));
    }, [maxScrollX]);

    const scrollDays = dir => setScrollX(prev => clamp(prev + dir * dayW * 3, 0, maxScrollX));

    // Pan mode: drag on grid to scroll horizontally
    const onGridMouseDown = useCallback((e) => {
        if (!isPanMode) return;
        if (e.button !== 0) return;
        e.preventDefault();
        panRef.current = { startX: e.clientX, startScrollX: scrollX };
        const onMove = (me) => {
            if (!panRef.current) return;
            const dx = panRef.current.startX - me.clientX;
            setScrollX(clamp(panRef.current.startScrollX + dx, 0, maxScrollX));
        };
        const onUp = () => {
            panRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isPanMode, scrollX, maxScrollX]);

    const DRAG_THRESHOLD = 5; // pixels before drag is committed

    const onBookingMouseDown = (e, booking, type) => {
        e.stopPropagation(); e.preventDefault();
        setTooltip(null); setHovered(null);
        const color = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;
        const width = (booking.end - booking.start) * dayW;
        const carIdx = CARS.findIndex(c => c.id === booking.carId);
        const row = layout[carIdx];
        const lane = row?.laneMap.get(booking.id) ?? 0;
        const gridRect = gridRef.current?.getBoundingClientRect();
        const barLeftPx = booking.start * dayW - scrollX;
        const clickOffsetX = gridRect ? e.clientX - (gridRect.left + LABEL_W + barLeftPx) : 0;
        const barTopAbs = gridRect ? gridRect.top + row.top + LANE_PAD + lane * (LANE_H + LANE_PAD) : e.clientY;
        const clickOffsetY = e.clientY - barTopAbs;
        // Store intent — don't commit drag until threshold crossed
        pendingRef.current = { bookingId: booking.id, type, startX: e.clientX, startY: e.clientY, origStart: booking.start, origEnd: booking.end, origCarIdx: carIdx, color, customer: booking.customer, width, clickOffsetX, clickOffsetY, booking };
        // Attach pre-drag listeners immediately (refs don't trigger useEffect)
        const cleanup = () => {
            window.removeEventListener("mousemove", handlePendingMove);
            window.removeEventListener("mouseup", handlePendingUp);
        };
        const handlePendingMove = (me) => {
            if (!pendingRef.current) { cleanup(); return; }
            const p = pendingRef.current;
            const dist = Math.hypot(me.clientX - p.startX, me.clientY - p.startY);
            if (dist >= DRAG_THRESHOLD) {
                cleanup();
                pendingRef.current = null;
                setDragging({ bookingId: p.bookingId, type: p.type, startX: p.startX, origStart: p.origStart, origEnd: p.origEnd, origCarIdx: p.origCarIdx, color: p.color, customer: p.customer, width: p.width, clickOffsetX: p.clickOffsetX, clickOffsetY: p.clickOffsetY });
                if (p.type === "move") {
                    setGhost({ x: me.clientX, y: me.clientY, width: p.width, color: p.color, label: p.customer, clickOffsetX: p.clickOffsetX, clickOffsetY: p.clickOffsetY });
                    setDropTarget(p.origCarIdx);
                }
            }
        };
        const handlePendingUp = () => {
            cleanup();
            if (pendingRef.current) {
                // No drag — it's a click → select
                setSelected(pendingRef.current.booking);
                pendingRef.current = null;
            }
        };
        window.addEventListener("mousemove", handlePendingMove);
        window.addEventListener("mouseup", handlePendingUp);
    };

    const onCellMouseDown = (e, carId, snappedDay) => {
        if (dragging) return; e.preventDefault();
        const id = nextId.current++;
        setBookings(prev => [...prev, { id, carId, start: snappedDay, end: snappedDay + MIN_DUR, customer: "New Booking", status: "pending" }]);
        setDragging({ bookingId: id, type: "resize-right", startX: e.clientX, origStart: snappedDay, origEnd: snappedDay + MIN_DUR, origCarIdx: CARS.findIndex(c => c.id === carId), color: STATUS_COLORS.pending, customer: "New Booking", width: MIN_DUR * dayW });
    };

    const onMouseMove = useCallback((e) => {
        if (!dragging) return;
        const dayDelta = snapTo15((e.clientX - dragging.startX) / dayW);
        if (dragging.type === "move") {
            setGhost(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
            const gridEl = gridRef.current;
            if (gridEl) setDropTarget(getRowIdxFromY(e.clientY, gridEl.getBoundingClientRect().top, layout, headerH));
            setBookings(prev => prev.map(b => {
                if (b.id !== dragging.bookingId) return b;
                const dur = dragging.origEnd - dragging.origStart;
                const ns = clamp(snapTo15(dragging.origStart + dayDelta), 0, TOTAL_DAYS - dur);
                return { ...b, start: ns, end: ns + dur };
            }));
        } else if (dragging.type === "resize-right") {
            setBookings(prev => prev.map(b => b.id !== dragging.bookingId ? b : { ...b, end: clamp(snapTo15(dragging.origEnd + dayDelta), b.start + MIN_DUR, TOTAL_DAYS) }));
        } else if (dragging.type === "resize-left") {
            setBookings(prev => prev.map(b => b.id !== dragging.bookingId ? b : { ...b, start: clamp(snapTo15(dragging.origStart + dayDelta), 0, b.end - MIN_DUR) }));
        }
    }, [dragging, dayW, layout, headerH]);

    const onMouseUp = useCallback(() => {
        if (dragging) {
            let selectedAfter = null;
            setBookings(prev => {
                const updated = prev.map(b => {
                    if (b.id !== dragging.bookingId) return b;
                    if (dragging.type === "move" && dropTargetCarIdx !== null) {
                        const tc = CARS[dropTargetCarIdx]; if (tc) return { ...b, carId: tc.id };
                    }
                    return b;
                });
                selectedAfter = updated.find(b => b.id === dragging.bookingId) ?? null;
                return updated;
            });
            if (selectedAfter) setSelected(selectedAfter);
        }
        if (!dragging && pendingRef.current) {
            setSelected(pendingRef.current.booking);
        }
        pendingRef.current = null;
        setDragging(null); setGhost(null); setDropTarget(null);
    }, [dragging, dropTargetCarIdx]);

    useEffect(() => {
        if (!dragging) return;
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    }, [dragging, onMouseMove, onMouseUp]);

    const visibleStartDay = scrollX / dayW;
    const visibleStartDayI = Math.floor(visibleStartDay);
    const movingId = dragging?.type === "move" ? dragging.bookingId : null;


    return (
        <div style={{ position: "relative" }}>
            <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 0, pointerEvents: "none" }} />

            {/* ── Top Bar ── */}
            <div className="pt-6 pb-7 px-6" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}` }}>

                <button
                    type='button'
                    onClick={() => setCarSearchOpen(true)}
                    className="w-30 ml-5 shadow-md/30 text-xs text-gray bg-purple-200 hover:bg-purple-300 px-4 py-[5px]"
                >
                    Sök lediga tider
                </button>
                
                <CarSearchModal
                    isOpen={carSearchOpen}
                    onClose={() => setCarSearchOpen(false)}
                    onSearch={handleCarSearch}
                />

                {/* Days selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="text-xs" style={{ color: T.textPlate }}>Dagar:</span>
                    {[1, 3, 7, 14, 21, 31].map(n => (
                        <button className="text-xs" key={n} onClick={() => setDaysVisible(n)} style={{
                            padding: "5px 12px", borderRadius: 6, border: "1px solid",
                            borderColor: daysVisible === n ? T.activeBtnBorder : T.inactiveBtnBorder,
                            background: daysVisible === n ? T.activeBtn : T.inactiveBtn,
                            color: daysVisible === n ? T.activeBtnText : T.inactiveBtnText,
                            cursor: "pointer", fontWeight: daysVisible === n ? 600 : 400, transition: "all 0.15s",
                        }}>{n}</button>
                    ))}
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

                {/* Right controls: pan toggle + theme toggle + nav arrows */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => scrollDays(-1)} style={{ ...arrowBtnBase, borderColor: T.arrowBtnBorder, color: T.arrowBtnText }}>‹</button>
                    <button onClick={() => scrollDays(1)} style={{ ...arrowBtnBase, borderColor: T.arrowBtnBorder, color: T.arrowBtnText }}>›</button>
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="" ref={gridRef} style={{ overflow: "hidden", position: "relative" }}>
                <div style={{ display: "flex" }}>

                    {/* Label column */}
                    <div style={{ width: LABEL_W, flexShrink: 0, zIndex: 10 }}>
                        <div style={{ height: headerH, background: T.bg, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
                            {showMonthRow && <div style={{ height: MONTH_ROW_H, borderBottom: `1px solid ${T.borderMonth}`, flexShrink: 0, background: T.bgDeep }} />}
                            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 10, paddingLeft: 16 }}>
                                <span style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Vehicle</span>
                            </div>
                        </div>
                        {CARS.map((car, i) => {
                            const row = layout[i], isTarget = dropTargetCarIdx === i;
                            return (
                                <div key={car.id} style={{ height: row.rowH, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, background: isTarget ? T.dropTarget : (i % 2 === 0 ? T.bg : T.bgAlt), display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 16, paddingRight: 8, gap: 2, transition: "background 0.1s, height 0.2s" }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: isTarget ? "#1a9e6e" : T.textLabel, transition: "color 0.1s" }}>{car.name}</div>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 10, color: T.textPlate, background: T.plateBg, padding: "1px 6px", borderRadius: 4 }}>{car.plate}</span>
                                        <span style={{ fontSize: 10, color: T.textCat }}>{car.category}</span>
                                        {row.laneCount > 1 && <span style={{ fontSize: 9, color: T.textDim, background: T.overlapBg, padding: "1px 5px", borderRadius: 4 }}>{row.laneCount} overlaps</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Timeline */}
                    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>

                        {/* Header */}
                        <div style={{ height: headerH, position: "relative", width: "100%", borderBottom: `1px solid ${T.border}` }}>

                            {/* Month row */}
                            {showMonthRow && (() => {
                                const spans = computeMonthSpans(visibleStartDayI, daysVisible, dayW, scrollX, startDate);
                                return spans.map((span, si) => {
                                    const hiddenLeft = Math.max(0, -span.startPx);
                                    const labelLeft = hiddenLeft + 6;
                                    return (
                                        <div key={si} style={{
                                            position: "absolute", left: span.startPx, top: 0,
                                            width: span.widthPx, height: MONTH_ROW_H,
                                            borderRight: `1px solid ${T.border}`,
                                            borderBottom: `1px solid ${T.borderMonth}`,
                                            background: si % 2 === 0 ? T.bgDeep : T.bgAlt,
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
                            {Array.from({ length: daysVisible + 2 }).map((_, i) => {
                                const dayIdx = visibleStartDayI + i;
                                const label = getDayLabel(dayIdx, startDate);
                                const offsetX = dayIdx * dayW - scrollX;
                                if (offsetX < -dayW || offsetX > daysVisible * dayW) return null;
                                return (
                                    <div key={dayIdx} style={{ position: "absolute", left: offsetX, top: showMonthRow ? MONTH_ROW_H : 0, width: dayW, height: `calc(100% - ${showMonthRow ? MONTH_ROW_H : 0}px)`, borderRight: `1px solid ${T.border}`, background: label.isToday ? T.todayBg : label.isWeekend ? T.weekendBg : "white", display: "flex", flexDirection: "column" }}>
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                            {dayW >= 40 && <div style={{ fontSize: 10, color: label.isToday ? "#1a9e6e" : T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label.weekday}</div>}
                                            <div style={{ fontSize: dayW < 40 ? 11 : dayW < 60 ? 14 : 18, fontWeight: 700, color: label.isToday ? "#1a9e6e" : label.isWeekend ? T.dayWeekend : T.dayNumber, lineHeight: 1.1 }}>{label.day}</div>
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
                                );
                            })}
                        </div>

                        {/* Car rows */}
                        {CARS.map((car, rowIdx) => {
                            const row = layout[rowIdx];
                            const carBookings = bookings.filter(b => b.carId === car.id);
                            const isTarget = dropTargetCarIdx === rowIdx;
                            return (
                                <div key={car.id}
                                    style={{ height: row.rowH, borderBottom: `1px solid ${T.border}`, position: "relative", background: isTarget ? T.dropTargetRow : (rowIdx % 2 === 0 ? T.bg : T.bgAlt), width: "100%", cursor: dragging?.type === "move" ? "grabbing" : isPanMode ? "grab" : "crosshair", transition: "background 0.1s, height 0.2s" }}
                                    onMouseDown={(e) => {
                                        if (isPanMode) { onGridMouseDown(e); return; }
                                        if (dragging) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        onCellMouseDown(e, car.id, snapTo15((e.clientX - rect.left + scrollX) / dayW));
                                    }}
                                >
                                    {isTarget && dragging?.type === "move" && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#1a9e6e", zIndex: 20, pointerEvents: "none" }} />}

                                    {/* Day grid lines */}
                                    {Array.from({ length: daysVisible + 2 }).map((_, i) => {
                                        const dayIdx = visibleStartDayI + i;
                                        const label = getDayLabel(dayIdx, startDate);
                                        const offsetX = dayIdx * dayW - scrollX;
                                        return (
                                            <div key={i} style={{ position: "absolute", left: offsetX, top: 0, bottom: 0, width: dayW, borderRight: `1px solid ${T.gridLine}`, background: label.isToday ? T.todayBg : label.isWeekend ? T.weekendRow : "transparent", pointerEvents: "none" }}>
                                                {hourTicks.map(h => (
                                                    <div key={h} style={{ position: "absolute", top: 0, bottom: 0, left: (h / 24) * dayW, width: 1, background: T.hourGridLine }} />
                                                ))}
                                            </div>
                                        );
                                    })}

                                    {/* Lane dividers */}
                                    {row.laneCount > 1 && Array.from({ length: row.laneCount - 1 }).map((_, li) => (
                                        <div key={li} style={{ position: "absolute", top: LANE_PAD + (li + 1) * (LANE_H + LANE_PAD) - LANE_PAD / 2, left: 0, right: 0, height: 1, background: T.laneDivider, pointerEvents: "none" }} />
                                    ))}

                                    {/* Booking bars */}
                                    {carBookings.map(booking => {
                                        const color = STATUS_COLORS[booking.status] || STATUS_COLORS.confirmed;
                                        const leftPx = booking.start * dayW - scrollX;
                                        const widthPx = (booking.end - booking.start) * dayW;
                                        if (leftPx + widthPx < 0 || leftPx > daysVisible * dayW) return null;
                                        const lane = row.laneMap.get(booking.id) ?? 0;
                                        const barTop = LANE_PAD + lane * (LANE_H + LANE_PAD);
                                        const isHov = hoveredBooking === booking.id;
                                        const isMov = movingId === booking.id;
                                        const isSel = selectedBooking?.id === booking.id && !isMov;
                                        return (
                                            <div key={booking.id}
                                                onMouseDown={(e) => onBookingMouseDown(e, booking, "move")}
                                                onMouseEnter={(e) => { if (dragging) return; setHovered(booking.id); setTooltip({ booking, x: e.clientX, y: e.clientY }); }}
                                                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                                                onMouseMove={(e) => { if (!dragging) setTooltip({ booking, x: e.clientX, y: e.clientY }); }}
                                                style={{
                                                    position: "absolute", left: leftPx, top: 0,
                                                    transform: `translateY(${barTop}px)`,
                                                    height: LANE_H, width: Math.max(widthPx, 8),
                                                    background: color.bg, borderRadius: 6,
                                                    cursor: isMov ? "grabbing" : "grab",
                                                    display: "flex", alignItems: "center", overflow: "hidden",
                                                    boxShadow: isHov ? `0 4px 20px ${color.bg}66, 0 0 0 2px ${color.border}` : isSel ? `0 0 0 2px #fff, 0 0 0 4px ${color.bg}, 0 2px 8px ${color.bg}66` : `0 2px 6px ${color.bg}44`,
                                                    transition: isMov ? "none" : "box-shadow 0.15s, opacity 0.12s",
                                                    zIndex: isHov ? 10 : 1, opacity: isMov ? 0 : 1, pointerEvents: isMov ? "none" : "auto",
                                                }}
                                            >
                                                <div onMouseDown={(e) => onBookingMouseDown(e, booking, "resize-left")} style={{ width: 8, height: "100%", cursor: "ew-resize", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <div style={{ width: 2, height: 16, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
                                                </div>
                                                <div style={{ flex: 1, overflow: "hidden", fontSize: 11, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                                    {booking.customer}
                                                    {widthPx > 80 && <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 4 }}>{formatTime(booking.start)}–{formatTime(booking.end)}</span>}
                                                </div>
                                                <div onMouseDown={(e) => onBookingMouseDown(e, booking, "resize-right")} style={{ width: 8, height: "100%", cursor: "ew-resize", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <div style={{ width: 2, height: 16, borderRadius: 2, background: "rgba(255,255,255,0.35)" }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {/* Today line */}
                        {(() => {
                            const x = 2 * dayW - scrollX + dayW / 2;
                            if (x < 0 || x > daysVisible * dayW) return null;
                            return <div style={{ position: "absolute", top: headerH, left: x, width: 2, height: totalGridH, background: "#1a9e6e", opacity: 0.4, pointerEvents: "none", zIndex: 5 }} />;
                        })()}
                    </div>
                </div>

                {/* Scrollbar */}
                <div
                    ref={scrollbarRef}
                    onClick={onScrollbarTrackClick}
                    style={{ height: 10, background: T.scrollTrack, borderRadius: 5, margin: `4px 8px 4px ${LABEL_W + 8}px`, position: "relative", cursor: "pointer" }}
                >
                    <div
                        onMouseDown={onScrollbarMouseDown}
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: "absolute", height: "100%", borderRadius: 5,
                            background: T.scrollThumb,
                            left: `${(scrollX / (TOTAL_DAYS * dayW)) * 100}%`,
                            width: `${(daysVisible / TOTAL_DAYS) * 100}%`,
                            cursor: "grab", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = T.activeBtnBorder}
                        onMouseLeave={e => e.currentTarget.style.background = T.scrollThumb}
                    />
                </div>
            </div>

            {/* Ghost */}
            {ghost && dragging?.type === "move" && (
                <div style={{
                    position: "fixed", left: ghost.x - (ghost.clickOffsetX ?? 0), top: ghost.y - (ghost.clickOffsetY ?? 0),
                    width: Math.max(ghost.width, 80), height: LANE_H,
                    background: ghost.color.bg, borderRadius: 6, opacity: 0.9,
                    pointerEvents: "none", zIndex: 9999,
                    display: "flex", alignItems: "center", paddingLeft: 10, paddingRight: 10,
                    boxShadow: `0 8px 32px ${ghost.color.bg}88, 0 0 0 2px ${ghost.color.border}`,
                    fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", whiteSpace: "nowrap",
                }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ghost.label}</span>
                    {dropTargetCarIdx !== null && dropTargetCarIdx !== dragging.origCarIdx && (
                        <span style={{ marginLeft: 8, fontSize: 10, opacity: 0.8, background: T.ghostOverlay, borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>
                            → {CARS[dropTargetCarIdx]?.name}
                        </span>
                    )}
                </div>
            )}

            {/* Tooltip */}
            {tooltip && !dragging && (
                <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 80, background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: 8, padding: "10px 14px", pointerEvents: "none", zIndex: 1000, minWidth: 200, boxShadow: T.tooltipShadow }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.textLabel, marginBottom: 6 }}>{tooltip.booking.customer}</div>
                    <div style={{ fontSize: 11, color: T.textPlate, marginBottom: 3 }}>
                        <span style={{ color: T.textMuted }}>From</span> {formatDateTime(tooltip.booking.start, startDate)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textPlate, marginBottom: 6 }}>
                        <span style={{ color: T.textMuted }}>To&nbsp;&nbsp;&nbsp;</span> {formatDateTime(tooltip.booking.end, startDate)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: T.textDim }}>{formatDuration(tooltip.booking.end - tooltip.booking.start)}</span>
                        <span style={{ fontSize: 10, color: STATUS_COLORS[tooltip.booking.status]?.bg, textTransform: "capitalize", fontWeight: 600 }}>{tooltip.booking.status}</span>
                    </div>
                </div>
            )}

            {/* ── Info Panel ── */}
            {(() => {
                const b = selectedBooking ? bookings.find(x => x.id === selectedBooking.id) || selectedBooking : null;
                const car = b ? CARS.find(c => c.id === b.carId) : null;
                const color = b ? STATUS_COLORS[b.status] || STATUS_COLORS.confirmed : null;
                return (
                    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgAlt, transition: "background 0.2s" }}>
                        {!b ? (
                            <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 10, color: T.textDim }}>
                                <span style={{ fontSize: 18, opacity: 0.4 }}>📋</span>
                                <span style={{ fontSize: 13 }}>Click a reservation to see its details</span>
                            </div>
                        ) : (
                            <div style={{ padding: "16px 24px", display: "flex", gap: 32, alignItems: "flex-start" }}>
                                {/* Color bar + customer */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200 }}>
                                    <div style={{ width: 4, height: 48, borderRadius: 2, background: color.bg, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: T.textLabel, letterSpacing: "-0.2px" }}>{b.customer}</div>
                                        <div style={{ marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: color.bg, textTransform: "capitalize", background: `${color.bg}22`, padding: "2px 8px", borderRadius: 10 }}>{b.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ width: 1, alignSelf: "stretch", background: T.border }} />

                                {/* Vehicle */}
                                <div style={{ minWidth: 160 }}>
                                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Vehicle</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: T.textLabel }}>{car?.name ?? "—"}</div>
                                    <div style={{ fontSize: 11, color: T.textPlate, marginTop: 2 }}>{car?.plate} · {car?.category}</div>
                                </div>

                                {/* Divider */}
                                <div style={{ width: 1, alignSelf: "stretch", background: T.border }} />

                                {/* Dates */}
                                <div style={{ minWidth: 200 }}>
                                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Period</div>
                                    <div style={{ fontSize: 13, color: T.textLabel, fontWeight: 500 }}>{formatDateTime(b.start, startDate)}</div>
                                    <div style={{ fontSize: 11, color: T.textPlate, margin: "2px 0" }}>→</div>
                                    <div style={{ fontSize: 13, color: T.textLabel, fontWeight: 500 }}>{formatDateTime(b.end, startDate)}</div>
                                </div>

                                {/* Divider */}
                                <div style={{ width: 1, alignSelf: "stretch", background: T.border }} />

                                {/* Duration */}
                                <div>
                                    <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Duration</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: T.textLabel, letterSpacing: "-0.5px" }}>{formatDuration(b.end - b.start)}</div>
                                </div>

                                {/* Close button */}
                                <div style={{ marginLeft: "auto" }}>
                                    <button
                                        onClick={() => setSelected(null)}
                                        style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.textDim, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >×</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Footer */}
            <div style={{ padding: "10px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 24, alignItems: "center" }}>
                {(isPanMode
                    ? [["Drag grid", "scroll horizontally"], ["Drag booking", "move across days & cars"], ["Drag edges", "resize duration"], ["Scroll / arrows", "navigate days"]]
                    : [["Drag booking", "move across days & cars"], ["Drag edges", "resize (snaps to 15 min)"], ["Click empty cell", "create booking"], ["Scroll / arrows", "navigate days"]]
                ).map(([a, d]) => (
                    <span key={a} style={{ fontSize: 11, color: T.footerText }}>
                        <strong style={{ color: T.footerStrong }}>{a}</strong> → {d}
                    </span>
                ))}
            </div>

        </div>
    )
}

export default VehicleTimeline
