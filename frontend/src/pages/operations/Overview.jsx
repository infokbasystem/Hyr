import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  Smile,
  Wrench,
} from "lucide-react";
import Gauge from "../../components/Gauge";
import { getOperationsOverview } from "../../lib/operationsOverviewApi";
import { getReservationInOutEvents } from "../../lib/reservationSearchApi";

const DAY_MS = 24 * 60 * 60 * 1000;
const timeFmt = new Intl.DateTimeFormat("sv-SE", {
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabelFmt = new Intl.DateTimeFormat("sv-SE", {
  weekday: "long",
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

function formatUtilizationDelta(value) {
  const roundedValue = Math.abs(value) < 0.05 ? 0 : value;
  const sign = roundedValue > 0 ? "+" : "";
  return `${sign}${roundedValue.toFixed(1).replace(".", ",")}% mot fg. år`;
}

function getPillAndCardColors(daysCount, defaultType = "yellow") {
  if (daysCount !== null && daysCount !== undefined) {
    if (daysCount >= 6) {
      return {
        cardBg: "bg-pink-50/60 hover:bg-pink-100/60",
        cardBorder: "border-pink-200 hover:border-pink-300",
        pillBg: "bg-red-200",
        pillBorder: "border-red-300",
      };
    }
    if (daysCount >= 3) {
      return {
        cardBg: "bg-orange-50/60 hover:bg-orange-100/60",
        cardBorder: "border-orange-200 hover:border-orange-300",
        pillBg: "bg-orange-100",
        pillBorder: "border-orange-300",
      };
    }
    return {
      cardBg: "bg-yellow-50/60 hover:bg-yellow-100/60",
      cardBorder: "border-yellow-200 hover:border-yellow-300",
      pillBg: "bg-lime-200",
      pillBorder: "border-lime-300",
    };
  }

  if (defaultType === "orange") {
    return {
      cardBg: "bg-orange-50/60 hover:bg-orange-100/60",
      cardBorder: "border-orange-200 hover:border-orange-300",
      pillBg: "bg-orange-100",
      pillBorder: "border-orange-300",
    };
  }

  if (defaultType === "lime") {
    return {
      cardBg: "bg-lime-100/30 hover:bg-lime-100/60",
      cardBorder: "border-lime-300 hover:border-lime-400",
      pillBg: "bg-lime-200",
      pillBorder: "border-lime-400",
    };
  }

  return {
    cardBg: "bg-yellow-50/60 hover:bg-yellow-100/60",
    cardBorder: "border-yellow-200 hover:border-yellow-300",
    pillBg: "bg-yellow-200",
    pillBorder: "border-yellow-300",
  };
}

function StatusPill({ text, pillBg, pillBorder }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-tiny tracking-tight text-gray-900 ${pillBg} ${pillBorder}`}
    >
      {text}
    </span>
  );
}

function OverviewCard({ to, title, subtitle, badgeText, daysCount, defaultColorType = "yellow" }) {
  const { cardBg, cardBorder, pillBg, pillBorder } = getPillAndCardColors(
    daysCount,
    defaultColorType
  );

  return (
    <Link
      to={to}
      className={`block rounded-xl border px-4 py-2.5 transition-colors ${cardBg} ${cardBorder}`}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-800">
            {title}
          </p>
          <p className="mt-0.5 truncate text-tiny text-gray-500">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <StatusPill
            text={badgeText}
            pillBg={pillBg}
            pillBorder={pillBorder}
          />
        </div>
      </div>
    </Link>
  );
}

function OverviewColumn({ title, icon: Icon, items, emptyText, renderCard }) {
  const isEmpty = items.length === 0;

  return (
    <div className={`w-full ${isEmpty ? "mx-auto max-w-xs" : ""}`}>
      <div className="mb-3.5 flex items-center justify-center gap-2">
        {React.createElement(Icon, { size: 20, className: "text-gray-500" })}
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">
          {title}
        </h3>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Smile className="h-9 w-9 text-lime-500" strokeWidth={2} />
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
            {emptyText}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {items.map((item, index) => {
            const isUnevenLastItem =
              items.length % 2 === 1 && index === items.length - 1;

            return (
              <div
                key={item.key || item.id || item.reservationId || index}
                className={
                  items.length === 1 || isUnevenLastItem
                    ? "sm:col-span-2 sm:mx-auto sm:w-[calc((100%_-_0.625rem)_/_2)]"
                    : ""
                }
              >
                {renderCard(item, index)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemChips({ items }) {
  const shown = items.slice(0, 2);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((item) => (
        <span
          key={item}
          className="whitespace-nowrap text-tiny leading-4 text-gray-800"
        >
          {item}
        </span>
      ))}
      {items.length > shown.length && (
        <span className="text-tiny leading-4 text-gray-800">
          +{items.length - shown.length} till
        </span>
      )}
    </div>
  );
}

function DirectionTag({ type }) {
  const delivery = type === "delivery";
  const Icon = delivery ? ArrowUpRight : ArrowDownLeft;
  const label = delivery ? "Utlämning" : "Återlämning";
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-0.5 py-0.5 text-tiny font-medium tracking-tight ${delivery
          ? "border-lime-300 bg-lime-50 text-lime-700"
          : "border-blue-300 bg-blue-50 text-blue-700"
        }`}
    >
      <Icon size={20} strokeWidth={2.25} />
    </span>
  );
}

function InOutStatusPill({ event, now }) {
  const daysLate = Math.max(
    0,
    Math.ceil((startOfDay(now) - startOfDay(event.date)) / DAY_MS)
  );

  if (daysLate === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-tiny font-medium text-green-700">
        Idag
      </span>
    );
  }

  const { pillBg, pillBorder } = getPillAndCardColors(daysLate);
  return (
    <StatusPill
      text={`${daysLate} ${daysLate === 1 ? "dag" : "dgr"}`}
      pillBg={pillBg}
      pillBorder={pillBorder}
    />
  );
}

const inOutColumns = [
  { label: "Bokningsnr", width: "80px" },
  { label: "Dagar sen", width: "90px" },
  { label: "Datum", width: "110px" },
  { label: "", width: "70px" },
  { label: "Kund", width: "260px" },
  { label: "Kategori", width: "150px" },
  { label: "Artiklar", width: "240px" },
  { label: "Intern anteckning", width: "180px" },
  { label: "Extern anteckning", width: "180px" },
];

function InOutTable({ rows, now }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[1375px] table-fixed border-collapse text-left"
        style={{
          fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <colgroup>
          {inOutColumns.map((column, index) => (
            <col key={`width-${index}`} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200">
            {inOutColumns.map((column, index) => (
              <th
                key={`${column.label || "empty"}-${index}`}
                className="whitespace-nowrap px-2 pb-2 pt-1.5 text-tiny font-medium tracking-wider text-gray-400"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.length === 0 ? (
            <tr className="border-b border-gray-200">
              <td
                colSpan={inOutColumns.length}
                className="px-3 py-2 text-xs text-gray-500"
              >
                Inget att visa
              </td>
            </tr>
          ) : (
            rows.map((event) => (
              <tr
                key={event.key}
                className="h-10 border-b border-gray-200 align-top last:border-b-0 hover:bg-lime-50"
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
                <td className="px-2 pb-0.5 align-middle pt-0.5">
                  <InOutStatusPill event={event} now={now} />
                </td>
                <td className="whitespace-nowrap px-3 align-middle pt-0.5 text-xs font-medium text-gray-700">
                  <div>{capitalize(dayLabelFmt.format(new Date(event.date)))}</div>
                  {event.date && (
                    <div className="text-tiny font-normal text-gray-500 pb-0.5">
                      {timeFmt.format(new Date(event.date))}
                    </div>
                  )}
                </td>
                <td className="px-2 align-middle text-center pt-0.5">
                  <DirectionTag type={event.type} />
                </td>
                <td className="px-2 align-middle pt-0.5">
                  <p className="truncate text-xs text-gray-800">
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
                  {event.internalNote || <span className="text-gray-400"></span>}
                </td>
                <td className="px-2 align-middle pt-0.5 text-tiny text-gray-500">
                  {event.externalNote || <span className="text-gray-400"></span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


const Overview = () => {
  const [overviewData, setOverviewData] = useState({
    currentUtilization: 0,
    ytdUtilization: 0,
    lastYearYtdUtilization: 0,
    ytdUtilizationDelta: 0,
    returnedNotCheckedIn: [],
    specialHandlingItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [inOutEvents, setInOutEvents] = useState([]);
  const [inOutLoading, setInOutLoading] = useState(true);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let isActive = true;

    getReservationInOutEvents()
      .then((data) => {
        if (isActive) setInOutEvents(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to load in/out events", err);
      })
      .finally(() => {
        if (isActive) setInOutLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function fetchData() {
      try {
        const result = await getOperationsOverview();
        if (isActive && result) {
          setOverviewData({
            currentUtilization: Number(result.currentUtilization) || 0,
            ytdUtilization: Number(result.ytdUtilization) || 0,
            lastYearYtdUtilization: Number(result.lastYearYtdUtilization) || 0,
            ytdUtilizationDelta: Number(result.ytdUtilizationDelta) || 0,
            returnedNotCheckedIn: Array.isArray(result.returnedNotCheckedIn)
              ? result.returnedNotCheckedIn
              : [],
            specialHandlingItems: Array.isArray(result.specialHandlingItems)
              ? result.specialHandlingItems
              : [],
          });
        }
      } catch (err) {
        console.error("Failed to load operations overview data", err);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isActive = false;
    };
  }, []);

  const returnedReservations = overviewData.returnedNotCheckedIn;
  const specialHandlingItems = overviewData.specialHandlingItems;
  const hasAnyItems = returnedReservations.length > 0 || specialHandlingItems.length > 0;

  const inOutRows = useMemo(() => {
    return inOutEvents
      .filter(
        (event) =>
          new Date(event.date) < now || sameDay(new Date(event.date), now)
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [inOutEvents, now]);

  return (
    <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
      {/* Top row: Utilization Gauges */}
      <div className="flex flex-wrap items-stretch justify-center gap-20">
        {/* Current Utilization Gauge Card */}
        <div className="flex flex-col items-center px-6 py-5">
          <Gauge
            id="current-utilization"
            title="NYTTJANDEGRAD JUST NU"
            value={overviewData.currentUtilization}
            max={100}
            unit="%"
            colorDirection="goodHigh"
            size={160}
          />
        </div>

        {/* YTD Utilization Gauge Card */}
        <div className="flex flex-col items-center px-6 py-5">
          <Gauge
            id="ytd-utilization"
            title="NYTTJANDEGRAD YTD"
            value={overviewData.ytdUtilization}
            max={100}
            unit="%"
            deltaLabel={formatUtilizationDelta(overviewData.ytdUtilizationDelta)}
            deltaPositive={
              overviewData.ytdUtilizationDelta === 0
                ? undefined
                : overviewData.ytdUtilizationDelta > 0
            }
            colorDirection="goodHigh"
            size={160}
          />
        </div>
      </div>

      {/* Second row: Returned but not checked in reservations & Special handling items */}
      <div
        className={`mt-8 grid w-full grid-cols-1 items-start gap-10 lg:grid-cols-2 ${!hasAnyItems ? "mx-auto max-w-2xl" : "mx-auto max-w-10xl"
          }`}
      >
        {/* Column 1: Returned but not checked in reservations */}
        <OverviewColumn
          title="ÅTERLÄMNADE EJ INCHECKADE"
          icon={PackageCheck}
          items={returnedReservations}
          emptyText="Inga ej incheckade återlämningar"
          renderCard={(item) => {
            const itemsText = Array.isArray(item.items) && item.items.length > 0
              ? item.items.join(", ")
              : item.category || "Hyresobjekt";
            const subtitle = `${itemsText} ·`;
            const badgeText = `${item.daysSinceReturn} ${item.daysSinceReturn === 1 ? "dag" : "dgr"
              }`;

            return (
              <OverviewCard
                to={`/operations/reservation/${item.reservationId}`}
                title={item.customerName}
                subtitle={subtitle}
                badgeText={badgeText}
                daysCount={item.daysSinceReturn}
                defaultColorType={item.daysSinceReturn >= 3 ? "orange" : "yellow"}
              />
            );
          }}
        />

        {/* Column 2: Items needing special handling (service, besiktning, workshop) */}
        <OverviewColumn
          title="BEHÖVER SPECIALHANTERING"
          icon={Wrench}
          items={specialHandlingItems}
          emptyText="Inga objekt i behov av specialhantering"
          renderCard={(item, index) => {
            const subtitle = item.subtitle ? `${item.subtitle} ·` : `${item.category || item.itemTypeName} ·`;
            const badgeText = item.badgeText || item.reason || "Service";

            return (
              <OverviewCard
                to={`/item/${item.id}`}
                title={item.title}
                subtitle={subtitle}
                badgeText={badgeText}
                daysCount={item.daysCount}
                defaultColorType={index % 2 === 0 ? "lime" : "lime"}
              />
            );
          }}
        />
      </div>

      {/* Third row: Late returns/deliveries plus today's and tomorrow's planned in/out */}
      <div className="mt-10 w-full">
        {/* <div className="mb-3.5 flex items-center justify-center gap-2">
          <ArrowLeftRight size={20} className="text-gray-500" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600">
            IN- OCH UTLÄMNINGAR
          </h3>
        </div> */}

        {inOutLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-xs text-gray-500">
            Läser in bokningar...
          </div>
        ) : (
          <InOutTable rows={inOutRows} now={now} />
        )}
      </div>
    </div>
  );
};

export default Overview;