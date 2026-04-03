import { useState, useCallback } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function sameDay(a, b) {
    return a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function MonthCalendar({ year, month, rangeStart, rangeEnd, hovered, onDayClick, onDayHover, onPrev, onNext, isDark }) {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthIdx = month === 0 ? 11 : month - 1;

    const nextYear = month === 11 ? year + 1 : year;
    const nextMonthIdx = month === 11 ? 0 : month + 1;

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ date: new Date(prevYear, prevMonthIdx, prevMonthDays - i), outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), outside: false });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ date: new Date(nextYear, nextMonthIdx, d), outside: true });
    }

    const effectiveEnd = rangeStart && !rangeEnd ? hovered : rangeEnd;
    const lo = rangeStart && effectiveEnd
        ? (startOfDay(rangeStart) <= startOfDay(effectiveEnd) ? rangeStart : effectiveEnd)
        : null;
    const hi = rangeStart && effectiveEnd
        ? (startOfDay(rangeStart) <= startOfDay(effectiveEnd) ? effectiveEnd : rangeStart)
        : null;

    function classify(date) {
        const d = startOfDay(date);
        const isStart = lo && sameDay(d, lo);
        const isEnd = hi && sameDay(d, hi);
        const inRange = lo && hi && d > startOfDay(lo) && d < startOfDay(hi);
        if (isStart && isEnd) return "both";
        if (isStart) return "start";
        if (isEnd) return "end";
        if (inRange) return "middle";
        return "";
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    const textDay = isDark ? "#c0d0e0" : "#0f213a";
    const textOutside = isDark ? "#3a5068" : "#817d88";
    const bgSelected = isDark ? "#c936f5" : "rgb(152, 191, 13)";
    const bgHeader = isDark ? "#1e2a3a" : "white";
    const borderHeader = isDark ? "#2a3a4e" : "#c4d6c6";
    const textHeader = isDark ? "#fff" : "#3b0764";
    const textSubtle = isDark ? "#6a7f96" : "#7c3aed";

    return (
        <div style={{ width: 275 }}>
            {/* Month/Year header */}
            <div className="flex items-center px-4 py-[1px] mb-4 rounded justify-between" style={{ background: bgHeader, border: `1px solid ${borderHeader}` }}>
                <button onClick={onPrev} className="bg-none border-none text-[#8899aa] cursor-pointer text-[18px] px-2 font-bold text-xs">‹</button>
                <div className="flex-1 flex justify-center gap-6 items-center">
                    <span className="text-xs tracking-wider" style={{ color: textDay}}>{MONTHS[month]}</span>
                    <span className="text-xs tracking-wide" style={{ color: textDay}}>{year}</span>
                </div>
                <button onClick={onNext} className="bg-none border-none text-[#8899aa] cursor-pointer text-[18px] px-2 font-bold text-xs">›</button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-tiny text-[#6a7f96] pb-2 border-b border-slate-200 mb-1">{d}</div>
                ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7">
                    {week.map(({ date, outside }, di) => {
                        // Only select dates in the left calendar that are not also visible in the right calendar
                        let isVisibleInRight = false;
                        if (typeof window !== 'undefined' && window._rightMonthRange) {
                          const { rightYear, rightMonth } = window._rightMonthRange;
                          isVisibleInRight = date.getFullYear() === rightYear && date.getMonth() === rightMonth;
                        }
                        const cls = classify(date);
                        const isStart = cls === "start" || cls === "both";
                        const isEnd = cls === "end" || cls === "both";
                        const isMiddle = cls === "middle";
                        let isHighlighted = isStart || isEnd;
                        // If this is the left calendar and the date is also in the right calendar, don't highlight
                        if (isHighlighted && isVisibleInRight && month < rightMonth) isHighlighted = false;

                        let rowBg = "transparent";
                        if (isMiddle) rowBg = isDark ? "#2a3a52" : "rgb(231, 238, 207)";
                        if (isStart && !isEnd) rowBg = isDark
                          ? "linear-gradient(to right, transparent 50%, #2a3a52 50%)"
                          : "linear-gradient(to right, transparent 50%, #e0e7ef 50%)";
                        if (isEnd && !isStart) rowBg = isDark
                          ? "linear-gradient(to left, transparent 50%, #2a3a52 50%)"
                          : "linear-gradient(to left, transparent 50%, #e0e7ef 50%)";

                        return (
                            <div
                                key={di}
                                style={{ background: rowBg, position: "relative" }}
                                onClick={() => onDayClick(date)}
                                onMouseEnter={() => onDayHover(date)}
                            >
                                <div className={`m-[1px] mx-auto w-7 h-7 flex items-center justify-center ${isHighlighted ? 'rounded-full' : 'rounded-[6px]'} cursor-pointer relative z-10 transition-colors`}
                                  style={{background: isHighlighted ? bgSelected : 'transparent'}}>
                                  <span className={`text-xs font-${isHighlighted ? 'bold' : 'normal'}`}
                                    style={{color: isHighlighted ? '#fff' : outside ? textOutside : isMiddle ? textDay : textDay}}>{date.getDate()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default function DateRangeSelect({ onChange, theme = "light" }) {
    const today = new Date();
    const [leftYear, setLeftYear] = useState(today.getFullYear());
    const [leftMonth, setLeftMonth] = useState(today.getMonth());
    const [rightYear, setRightYear] = useState(today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear());
    const [rightMonth, setRightMonth] = useState(today.getMonth() === 11 ? 0 : today.getMonth() + 1);

    const [rangeStart, setRangeStart] = useState(null);
    const [rangeEnd, setRangeEnd] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [selecting, setSelecting] = useState(false);

    function prevLeft() {
        if (leftMonth === 0) { setLeftMonth(11); setLeftYear(y => y - 1); }
        else setLeftMonth(m => m - 1);
    }
    function nextLeft() {
        if (leftMonth === 11) { setLeftMonth(0); setLeftYear(y => y + 1); }
        else setLeftMonth(m => m + 1);
    }
    function prevRight() {
        if (rightMonth === 0) { setRightMonth(11); setRightYear(y => y - 1); }
        else setRightMonth(m => m - 1);
    }
    function nextRight() {
        if (rightMonth === 11) { setRightMonth(0); setRightYear(y => y + 1); }
        else setRightMonth(m => m + 1);
    }

    const handleDayClick = useCallback((date) => {
        if (!selecting || !rangeStart) {
            setRangeStart(date);
            setRangeEnd(date); // Mark as selected immediately
            setSelecting(true);
        } else {
            if (startOfDay(date) < startOfDay(rangeStart)) {
                setRangeEnd(rangeStart);
                setRangeStart(date);
            } else {
                setRangeEnd(date);
            }
            setSelecting(false);
            setHovered(null);
            if (onChange) onChange({ from: startOfDay(rangeStart), to: startOfDay(date) });
        }
    }, [selecting, rangeStart, onChange]);

    const handleDayHover = useCallback((date) => {
        if (selecting) setHovered(date);
    }, [selecting]);

    const isDark = theme === "dark";
    const bgMain = isDark ? "#131f2e" : "#rgb(255, 255, 234)";
    const borderDivider = isDark ? "#1e2e40" : "lightgray";

    return (
        <div style={{ display: "flex", gap: 24, background: bgMain, borderRadius: 5, padding: 12 }}>
            <MonthCalendar
                year={leftYear} month={leftMonth}
                rangeStart={rangeStart} rangeEnd={rangeEnd} hovered={hovered}
                onDayClick={handleDayClick} onDayHover={handleDayHover}
                onPrev={prevLeft} onNext={nextLeft}
                isDark={isDark}
            />
            <div className="border-l border-slate-200" style={{ width: 1, margin: "0 8px" }} />
            <MonthCalendar
                year={rightYear} month={rightMonth}
                rangeStart={rangeStart} rangeEnd={rangeEnd} hovered={hovered}
                onDayClick={handleDayClick} onDayHover={handleDayHover}
                onPrev={prevRight} onNext={nextRight}
                isDark={isDark}
            />
        </div>
    );
}
