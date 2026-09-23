import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Circle,
    LoaderCircle,
    RotateCcw,
    Smile,
} from "lucide-react";
import { getReservationInOutEvents } from "../../lib/reservationSearchApi";

const DAY_MS = 24 * 60 * 60 * 1000;
const dayLabelFmt = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "short",
});
const timeFmt = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
});
const rangeFmt = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
});

function startOfDay(value) {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day;
}

function sameDay(first, second) {
    return startOfDay(first).getTime() === startOfDay(second).getTime();
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function ItemChips({ items }) {
    const shown = items.slice(0, 2);
    return (
        <div className="flex flex-wrap items-center gap-1">
            {shown.map((item) => (
                <span
                    key={item}
                    className="whitespace-nowrap text-tiny leading-4 text-gray-500"
                >
                    {item}
                </span>
            ))}
            {items.length > shown.length && (
                <span className="text-tiny leading-4 text-gray-500">
                    +{items.length - shown.length} till
                </span>
            )}
        </div>
    );
}

function DirectionTag({ type, compact = false }) {
    const delivery = type === "delivery";
    const Icon = delivery ? ArrowUpRight : ArrowDownLeft;
    const label = delivery ? "Utlämning" : "Återlämning";
    return (
        <span
            aria-label={label}
            title={label}
            className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-tiny font-medium tracking-tight ${delivery ? "border-amber-300 bg-amber-50 text-amber-700" : "border-blue-300 bg-blue-50 text-blue-700"}`}
        >
            <Icon size={20} strokeWidth={2.25} />
            {!compact && label}
        </span>
    );
}

function DaysLatePill({ daysLate }) {
    const color =
        daysLate >= 6
            ? "bg-red-200"
            : daysLate >= 3
                ? "bg-orange-100"
                : "bg-lime-200";
    const borderColor =
        daysLate >= 6
            ? "border-red-300"
            : daysLate >= 3
                ? "border-orange-300"
                : "border-lime-300";
    return (
        <span
            className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-tiny tracking-tight text-gray-900 ${color} ${borderColor}`}
        >
            {daysLate} {daysLate === 1 ? "dag" : "dgr"}
        </span>
    );
}

function OverdueCard({ event, now }) {
    const daysLate = Math.max(
        1,
        Math.ceil((startOfDay(now) - startOfDay(event.date)) / DAY_MS),
    );
    const cardColor =
        daysLate >= 6
            ? "bg-pink-100/50"
            : daysLate >= 3
                ? "bg-orange-100/50"
                : "bg-lime-100/60";
    const cardBorderColor =
        daysLate >= 6
            ? "border-pink-200/50"
            : daysLate >= 3
                ? "border-orange-200/50"
                : "border-lime-300/50";
    const hoverCardColor =
        daysLate >= 6
            ? "hover:bg-pink-100/50"
            : daysLate >= 3
                ? "hover:bg-orange-100/50"
                : "hover:bg-lime-100/50";
    const hoverCardBorderColor =
        daysLate >= 6
            ? "hover:border-pink-300/50"
            : daysLate >= 3
                ? "hover:border-orange-300/50"
                : "hover:border-lime-400/50";
    return (
        <Link
            to={`/operations/reservation/${event.reservationId}`}
            className={`block rounded-lg border px-4 py-2 transition-colors ${cardBorderColor} ${hoverCardBorderColor} ${cardColor} ${hoverCardColor}`}
        >
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-xs text-gray-800">
                            {event.customer}
                        </p>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden">
                        <span className="min-w-0 truncate text-tiny uppercase tracking-[0.08em]">
                            {event.category}
                        </span>
                        <div className="min-w-0 shrink overflow-hidden">
                            <ItemChips items={event.items} />
                        </div>
                        <div className="min-w-0 flex-1 truncate text-tiny text-gray-500">
                            {event.phone} · {event.email}
                        </div>
                    </div>

                </div>

                <div className="flex flex-col text-xs text-gray-700">
                        <DaysLatePill daysLate={daysLate} />
                        {/* <span className="mt-1 shrink-0 text-tiny text-gray-500">
                            {rangeFmt.format(new Date(event.date))},{" "}
                            {timeFmt.format(new Date(event.date))}
                        </span> */}
                </div>
            </div>
        </Link>
    );
}

function OverdueColumn({ title, icon: Icon, events, now }) {
    return (
        <div className="w-full min-w-0">
            <div className="mb-3 flex items-center gap-2">
                <div className="mx-auto flex flex-row items-center gap-1.5">
                    {React.createElement(Icon, { size: 20, className: "text-gray-700" })}
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-[0.08em]">
                        {title}
                        {/* <span className="ml-3 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                            {events.length}
                        </span> */}
                    </h3>
                </div>
            </div>
            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-3 py-0">
                    <Smile className="h-10 w-10 text-lime-500" strokeWidth={2} />
                    <span className="text-xs uppercase tracking-[0.08em] font-medium text-gray-500">Inga sena återlämningar</span>
                </div>
            ) : (
                <div className="pt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {events.map((event, index) => {
                        const isUnevenLastItem =
                            events.length % 2 === 1 && index === events.length - 1;

                        return (
                            <div
                                key={event.key}
                                className={
                                    events.length === 1 || isUnevenLastItem
                                        ? "sm:col-span-2 sm:mx-auto sm:w-[calc((100%_-_0.5rem)_/_2)]"
                                        : ""
                                }
                            >
                                <OverdueCard event={event} now={now} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const columns = [
    "Bokningsnr",
    "",
    "Datum",
    "",
    "Kund",
    "Kategori",
    "Artiklar",
    "Intern anteckning",
    "Extern anteckning",
];

function UpcomingTable({ days, now }) {
    const rows = days.flatMap(({ day, events }) =>
        events.map((event) => ({ day, event })),
    );

    return (
        <div className="overflow-x-auto">
            <table
                className="w-full min-w-[1180px] border-collapse text-left"
                style={{
                    fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif",
                }}
            >
                <thead>
                    <tr className="border-b border-gray-200">
                        {columns.map((column, index) => (
                            <th
                                key={`${column || "empty"}-${index}`}
                                className="whitespace-nowrap px-2 pb-2 pt-1.5 text-tiny font-medium tracking-wider text-gray-400"
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {rows.length === 0 ? (
                        <tr className="border-b border-gray-200">
                            <td
                                colSpan={columns.length}
                                className="px-3 py-2 text-xs text-gray-500"
                            >
                                Inget planerat
                            </td>
                        </tr>
                    ) : (
                        rows.map(({ day, event }) => (
                            <tr
                                key={event.key}
                                className="h-10  border-b border-gray-200 align-top last:border-b-0 hover:bg-lime-50"
                            >
                                <td className="whitespace-nowrap px-2 pt-1.5 pb-0.5 text-xs align-middle">
                                    {event.reservationId ? (
                                        <Link
                                            to={`/operations/reservation/${event.reservationId}`}
                                            className="pb-1 text-sky-700 decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:underline"
                                        >
                                            {event.reservationNr ?? ""}
                                        </Link>
                                    ) : (
                                        event.reservationNr ?? ""
                                    )}
                                </td>
                                <td className="px-2 pb-0.5 align-middle text-center">
                                    {sameDay(day, now) && (
                                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                            Idag
                                        </span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 align-middle pt-0.5 text-xs font-medium text-gray-700">
                                    <div>
                                        {capitalize(dayLabelFmt.format(day))}
                                    </div>
                                    {event.date && (
                                        <div className="text-tiny font-normal text-gray-500 pb-0.5">
                                            {timeFmt.format(new Date(event.date))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-2 align-middle text-center pt-0.5">
                                    <DirectionTag type={event.type} compact />
                                </td>
                                <td className="px-2 align-middle pt-0.5">
                                    <p className="truncate text-xs font-medium text-gray-800">
                                        {event.customer}
                                    </p>
                                    {event.phone || event.email ? (
                                        <p className="truncate text-tiny text-gray-500 pb-0.5">
                                            {event.phone} · {event.email}
                                        </p>
                                    ) : null}
                                </td>
                                <td className="px-2 align-middle pt-0.5">
                                    {event.category && (
                                        <span className="align-middle pt-0.5 pb-0 text-tiny text-gray-600">
                                            {event.category}
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 align-middle pt-1.5 pb-0.5">
                                    <ItemChips items={event.items} />
                                </td>
                                <td className="px-2 align-middle pt-0.5 pb-0 text-tiny text-gray-600">
                                    {event.internalNote || (
                                        <span className="text-gray-400"></span>
                                    )}
                                </td>
                                <td className="px-2 align-middle pt-0.5 text-tiny text-gray-500">
                                    {event.externalNote || (
                                        <span className="text-gray-400"></span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function InOut() {
    const [events, setEvents] = useState([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const now = useMemo(() => new Date(), []);

    useEffect(() => {
        let active = true;
        getReservationInOutEvents()
            .then((data) => {
                if (active) setEvents(Array.isArray(data) ? data : []);
            })
            .catch((requestError) => {
                if (active)
                    setError(requestError.message || "Kunde inte läsa in händelser.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const overdue = useMemo(
        () =>
            events
                .filter(
                    (event) =>
                        new Date(event.date) < now && !sameDay(new Date(event.date), now),
                )
                .sort((a, b) => {
                    const daysLateA = Math.ceil(
                        (startOfDay(now) - startOfDay(a.date)) / DAY_MS,
                    );
                    const daysLateB = Math.ceil(
                        (startOfDay(now) - startOfDay(b.date)) / DAY_MS,
                    );

                    return (
                        daysLateB - daysLateA ||
                        new Date(a.date) - new Date(b.date)
                    );
                }),
        [events, now],
    );
    const overdueOut = overdue.filter((event) => event.type === "delivery");
    const overdueIn = overdue.filter((event) => event.type === "return");
    const windowStart = useMemo(() => {
        const day = startOfDay(now);
        day.setDate(day.getDate() + offset * 3);
        return day;
    }, [now, offset]);
    const windowDays = useMemo(
        () =>
            [0, 1, 2].map(
                (index) => new Date(windowStart.getTime() + index * DAY_MS),
            ),
        [windowStart],
    );
    const upcomingByDay = useMemo(
        () =>
            windowDays.map((day) => ({
                day,
                events: events
                    .filter((event) => sameDay(new Date(event.date), day))
                    .sort((a, b) => new Date(a.date) - new Date(b.date)),
            })),
        [events, windowDays],
    );

    return (
        <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
            <div className="mt-3">
                {loading && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs text-gray-500">
                        <LoaderCircle size={15} className="animate-spin" /> Läser in
                        bokningar...
                    </div>
                )}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                        {error}
                    </div>
                )}
                {!loading && !error && (
                    <>
                        {overdue.length > 0 && (
                            <section className="mb-2">
                                {/* <div className="mb-1 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h2 className="text-[13.5px] font-semibold text-red-600">
                    Försenade ({overdue.length})
                  </h2>
                </div> */}
                                <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <OverdueColumn
                                        title="Sena att levereras ut"
                                        icon={ArrowUpRight}
                                        events={overdueOut}
                                        now={now}
                                    />
                                    <OverdueColumn
                                        title="Sena att återlämnas"
                                        icon={ArrowDownLeft}
                                        events={overdueIn}
                                        now={now}
                                    />
                                </div>
                            </section>
                        )}
                        <section>
                            <div className="mt-15 mb-0 flex items-center justify-between">
                                {/* <h2 className="text-[13.5px] font-semibold text-gray-700">
                                    Kommande dagar
                                </h2> */}
                                <div className="flex items-center gap-1.5 mx-auto">
                                    <button
                                        onClick={() => setOffset((current) => current - 1)}
                                        aria-label="Föregående period"
                                        className="rounded-full bg-white border border-gray-300 p-1.5 text-gray-500 hover:border-gray-400 hover:text-gray-800"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    <span className="min-w-[112px] text-center font-semibold text-xs text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                        {rangeFmt.format(windowStart)} -{" "}
                                        {rangeFmt.format(windowDays[2])}
                                    </span>
                                    <button
                                        onClick={() => setOffset((current) => current + 1)}
                                        aria-label="Nästa period"
                                        className="rounded-full bg-white border border-gray-300 p-1.5 text-gray-500 hover:border-gray-400 hover:text-gray-800"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                    {/* {offset !== 0 && (
                                        <button
                                            onClick={() => setOffset(0)}
                                            className="mr-1 inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:border-gray-400 hover:text-gray-800"
                                        >
                                            <RotateCcw size={11} /> Idag
                                        </button>
                                    )} */}
                                </div>
                            </div>
                            <UpcomingTable days={upcomingByDay} now={now} />
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
