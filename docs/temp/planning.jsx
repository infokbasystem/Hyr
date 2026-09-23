import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_ROW_HEIGHT,
  INITIAL_ANCHOR_DATE,
  STATUS_STYLES,
} from './config/planningConfig';
import {
  startOfDay,
  addMinutes,
  assignLanes,
  toDateKey,
  toNaiveIso,
  usePlanningGeometry,
  extractTimeOfDayHours,
} from './utils/planningDateUtils';
import { createSharedRequestGetter } from '../../lib/sharedRequest';
import { searchWorkordersByStatuses } from '../../lib/workorderApi';
import {
  getPlanningResources,
  getPlanningBookings,
  createPlanningBooking,
  updatePlanningBooking,
  updatePlanningBookingStatus,
  deletePlanningBooking,
  getMonthlyPlanning,
  updateMonthlyPlanningCell,
} from '../../lib/planningApi';
import PlanningTopBar from './components/PlanningTopBar';
import TimelineSchedule from './components/TimelineSchedule';
import PlanningRightInfoBar from './components/PlanningRightInfoBar';
import UnplannedOrdersDrawer from './components/UnplannedOrdersDrawer';
import PlanningContextMenu from './components/PlanningContextMenu';

// Builds an offscreen element sized/colored like the real booking bar so the native
// drag image reflects the booking's actual length instead of the source row/card.
function setBookingDragImage(event, { title, subtitle, status, durationMin, statusBackgroundColor, statusBorderColor }, hourWidth) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.planned;
  const backgroundColor = statusBackgroundColor || statusStyle.bg;
  const borderColor = statusBorderColor || statusStyle.border;
  const colorValue = backgroundColor.match(/^#([\da-f]{6})$/i)?.[1];
  const textColor = colorValue
    && (Number.parseInt(colorValue.slice(0, 2), 16) * 299
      + Number.parseInt(colorValue.slice(2, 4), 16) * 587
      + Number.parseInt(colorValue.slice(4, 6), 16) * 114) / 1000 > 160
    ? '#1f2937'
    : '#fff';
  const width = Math.max((durationMin / 60) * hourWidth, 60);
  const height = DEFAULT_ROW_HEIGHT - 6;

  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.top = '-9999px';
  ghost.style.left = '-9999px';
  ghost.style.width = `${width}px`;
  ghost.style.height = `${height}px`;
  ghost.style.backgroundColor = backgroundColor;
  ghost.style.border = `1px solid ${borderColor}`;
  ghost.style.borderRadius = '2px';
  ghost.style.padding = '4px 8px';
  ghost.style.display = 'flex';
  ghost.style.flexDirection = 'column';
  ghost.style.justifyContent = 'center';
  ghost.style.overflow = 'hidden';
  ghost.style.color = textColor;
  ghost.style.fontFamily = 'inherit';
  ghost.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.35)';

  const titleEl = document.createElement('div');
  titleEl.textContent = title ?? '';
  titleEl.style.fontSize = '11px';
  titleEl.style.fontWeight = '700';
  titleEl.style.textTransform = 'uppercase';
  titleEl.style.letterSpacing = '0.02em';
  titleEl.style.whiteSpace = 'nowrap';
  titleEl.style.overflow = 'hidden';
  titleEl.style.textOverflow = 'ellipsis';
  ghost.appendChild(titleEl);

  if (subtitle) {
    const subtitleEl = document.createElement('div');
    subtitleEl.textContent = subtitle;
    subtitleEl.style.fontSize = '9px';
    subtitleEl.style.fontWeight = '500';
    subtitleEl.style.color = textColor;
    subtitleEl.style.opacity = '0.9';
    subtitleEl.style.whiteSpace = 'nowrap';
    subtitleEl.style.overflow = 'hidden';
    subtitleEl.style.textOverflow = 'ellipsis';
    ghost.appendChild(subtitleEl);
  }

  document.body.appendChild(ghost);
  // Anchor the ghost's left edge (not its middle) at the cursor so it matches the
  // left-edge-at-cursor math onDrop uses to compute the booking's start time.
  event.dataTransfer.setDragImage(ghost, 0, height / 2);
  // The browser snapshots the ghost synchronously during dragstart; safe to remove right after.
  setTimeout(() => ghost.remove(), 0);
}

const getSharedRequest = createSharedRequestGetter();

// Matches the backend's Planning.Status codes (0-3)
const BOOKING_STATUS_CODES = {
  not_started: 0,
  started: 1,
  paused: 2,
  completed: 3,
};

const PLANNING_ANCHOR_DATE_STORAGE_KEY = 'planning-anchor-date';
const PLANNING_BACKLOG_OPEN_STORAGE_KEY = 'planning-backlog-open';

// Fallback timeline bounds used when there are no bookings/shifts to derive a range from.
const FALLBACK_DAY_START_HOURS = 6;
const FALLBACK_DAY_END_HOURS = 19;
const DAY_BOUNDS_MARGIN_HOURS = 0.5;
const ABSENCE_SHIFT_ID_THRESHOLD = 100000;

function isAbsenceShift(shift) {
  return shift.isAbsence === true || shift.id >= ABSENCE_SHIFT_ID_THRESHOLD;
}

function getWorkorderDurationMin(workorder) {
  const grovtid = Number(workorder.grovtid ?? workorder.GROVTID);
  if (!Number.isFinite(grovtid) || grovtid <= 0) {
    return 60;
  }

  const durationMin = (grovtid / 100) * 60;
  return Math.min(durationMin, 8 * 60);
}

function mapUnplannedWorkorder(workorder) {
  const aonr = workorder.aonr ?? workorder.AONR ?? workorder.id;
  const customer = workorder.kundnamn ?? workorder.KUNDNAMN ?? workorder.customerDetails?.customerName ?? 'Okänd kund';
  const regnr = workorder.regnr ?? workorder.REGNR ?? workorder.vehicleDetails?.regnr ?? '';

  return {
    id: workorder.id,
    workorderId: workorder.id,
    status: workorder.status ?? workorder.STATUS ?? 'planned',
    statusBackgroundColor: workorder.statusPillBackgroundColor ?? workorder.StatusPillBackgroundColor,
    statusBorderColor: workorder.statusPillBorderColor ?? workorder.StatusPillBorderColor,
    bookingStatus: 'not_started',
    title: `AO ${aonr}`,
    subtitle: customer,
    durationMin: getWorkorderDurationMin(workorder),
    aonr,
    customer,
    regnr,
    make: workorder.vehicleDetails?.tillverkare ?? '',
    model: workorder.vehicleDetails?.model ?? '',
    note: workorder.beskrivning ?? workorder.BESKRIVNING ?? '',
  };
}

function readStoredAnchorDate() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PLANNING_ANCHOR_DATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : startOfDay(date);
  } catch {
    return null;
  }
}

function readStoredBacklogOpen() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(PLANNING_BACKLOG_OPEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function PlanningPage() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [orders, setOrders] = useState([]);
  const [backlog, setBacklog] = useState([]);

  const [anchorDate, setAnchorDate] = useState(() => readStoredAnchorDate() ?? INITIAL_ANCHOR_DATE);
  const [hourWidth, setHourWidth] = useState(88);
  const [effectiveHourWidth, setEffectiveHourWidth] = useState(88);

  const [selectedOrderId, setSelectedOrderId] = useState('wo-102'); // Default selected matching legacy view
  const [selectedSearchWorkorder, setSelectedSearchWorkorder] = useState(null);
  const [showBacklog, setShowBacklog] = useState(readStoredBacklogOpen);
  const [shiftOptions, setShiftOptions] = useState([]);

  const resizing = useRef(null);
  const [resizingId, setResizingId] = useState(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const anchorDateKey = toDateKey(anchorDate);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PLANNING_ANCHOR_DATE_STORAGE_KEY, anchorDateKey);
  }, [anchorDateKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PLANNING_BACKLOG_OPEN_STORAGE_KEY, String(showBacklog));
  }, [showBacklog]);

  useEffect(() => {
    let isActive = true;

    getSharedRequest(`resources:${anchorDateKey}`, () => getPlanningResources(anchorDateKey))
      .then((data) => {
        if (isActive) {
          setResources(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => {
        if (isActive) {
          setToast(error?.message ?? 'Kunde inte hämta resurser');
        }
      });

    return () => {
      isActive = false;
    };
  }, [anchorDateKey]);

  useEffect(() => {
    let isActive = true;

    getSharedRequest('planning-unplanned-workorders:10-20', () => searchWorkordersByStatuses([10, 20], {
      pageSize: 200,
      sorts: [
        { field: 'tvstdat', direction: 'asc' },
        { field: 'id', direction: 'asc' },
      ],
    })).then((data) => {
      if (!isActive) return;
      const workorders = Array.isArray(data) ? data : data?.items ?? [];
      setBacklog(workorders.map(mapUnplannedWorkorder));
    }).catch((error) => {
      if (isActive) {
        setToast(error?.message ?? 'Kunde inte hämta oplanerade arbetsordrar');
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    getSharedRequest(
      `planning-shifts:${anchorDate.getFullYear()}-${anchorDate.getMonth() + 1}`,
      () => getMonthlyPlanning(anchorDate.getFullYear(), anchorDate.getMonth() + 1)
    ).then((data) => {
      if (isActive) {
        setShiftOptions(Array.isArray(data?.shifts) ? data.shifts : []);
      }
    }).catch((error) => {
      if (isActive) {
        setToast(error?.message ?? 'Kunde inte hämta skift');
      }
    });

    return () => {
      isActive = false;
    };
  }, [anchorDate]);

  useEffect(() => {
    let isActive = true;

    getSharedRequest(`bookings:${anchorDateKey}`, () => getPlanningBookings(anchorDateKey))
      .then((data) => {
        if (!isActive) return;
        const list = Array.isArray(data) ? data : [];
        setOrders(
          list.map((booking) => ({
            ...booking,
            resourceId: booking.resourceId,
            start: new Date(booking.start),
            end: new Date(booking.end),
          }))
        );
      })
      .catch((error) => {
        if (isActive) {
          setToast(error?.message ?? 'Kunde inte hämta planering');
        }
      });

    return () => {
      isActive = false;
    };
  }, [anchorDateKey]);

  // Timeline bounds are the min/max of: booking times, employees' shift times, and a
  // 06:00-19:00 fallback. The 30 min margin + rounding only applies when real data (bookings
  // or shifts) extends the range beyond the fallback — the fallback itself is never padded.
  const visibleDayStart = useMemo(() => {
    let min = Infinity;

    for (const o of orders) {
      const start = new Date(o.start);
      const hrs = start.getHours() + start.getMinutes() / 60;
      if (hrs < min) min = hrs;
    }

    for (const r of resources) {
      if (r.isAbsent) continue;
      const hrs = extractTimeOfDayHours(r.shiftStart);
      if (hrs !== null && hrs < min) min = hrs;
    }

    if (min >= FALLBACK_DAY_START_HOURS) {
      return FALLBACK_DAY_START_HOURS;
    }

    return Math.max(0, Math.floor(min - DAY_BOUNDS_MARGIN_HOURS));
  }, [orders, resources]);

  const visibleDayEnd = useMemo(() => {
    let max = -Infinity;

    for (const o of orders) {
      const end = new Date(o.end);
      const hrs = end.getHours() + end.getMinutes() / 60;
      if (hrs > max) max = hrs;
    }

    for (const r of resources) {
      if (r.isAbsent) continue;
      const hrs = extractTimeOfDayHours(r.shiftEnd);
      if (hrs !== null && hrs > max) max = hrs;
    }

    if (max <= FALLBACK_DAY_END_HOURS) {
      return FALLBACK_DAY_END_HOURS;
    }

    return Math.min(24, Math.ceil(max + DAY_BOUNDS_MARGIN_HOURS));
  }, [orders, resources]);

  const geometry = usePlanningGeometry(anchorDate, visibleDayStart, visibleDayEnd, hourWidth);

  // Group orders by resource
  const ordersByResource = useMemo(() => {
    const map = {};
    for (const r of resources) {
      map[r.id] = [];
    }
    for (const o of orders) {
      if (map[o.resourceId]) {
        map[o.resourceId].push(o);
      }
    }
    return map;
  }, [resources, orders]);

  // Compute multi-lane packaging for overlapping orders on each resource row
  const lanesByResource = useMemo(() => {
    const map = {};
    for (const r of resources) {
      map[r.id] = assignLanes(ordersByResource[r.id]);
    }
    return map;
  }, [resources, ordersByResource]);

  const selectedOrder = useMemo(() => {
    return (
      orders.find((o) => o.id === selectedOrderId) ||
      backlog.find((b) => b.id === selectedOrderId) ||
      null
    );
  }, [orders, backlog, selectedOrderId]);

  const selectedResource = useMemo(() => {
    if (!selectedOrder?.resourceId) return null;
    return resources.find((r) => r.id === selectedOrder.resourceId) || null;
  }, [resources, selectedOrder]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openOrderContextMenu = useCallback((e, order) => {
    e.preventDefault();
    setSelectedOrderId(order.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        // {
        //   label: `Visa AO ${order.aonr || order.title}`,
        //   onSelect: () => setToast(`Öppnar arbetsorder ${order.aonr || order.title}`),
        // },
        {
          label: 'Ändra till "Ej påbörjad"',
          onSelect: () => handleStatusChange(order.id, 'not_started'),
        },
        {
          label: 'Ändra till "Påbörjad"',
          onSelect: () => handleStatusChange(order.id, 'started'),
        },
        {
          label: 'Ändra till "Pausad"',
          onSelect: () => handleStatusChange(order.id, 'paused'),
        },
        {
          label: 'Ändra till "Klar"',
          onSelect: () => handleStatusChange(order.id, 'completed'),
        },
        { separator: true },
        {
          label: 'Kopiera bokning',
          onSelect: () => {
            const newOrder = {
              ...order,
              id: `wo-${Date.now()}`,
              start: addMinutes(new Date(order.start), 60),
              end: addMinutes(new Date(order.end), 60),
            };
            setOrders((prev) => [...prev, newOrder]);
            setSelectedOrderId(newOrder.id);
            setToast(`Bokning kopierad`);
          },
        },
        {
          label: 'Ta bort bokning',
          danger: true,
          onSelect: () => {
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
            if (selectedOrderId === order.id) {
              setSelectedOrderId(null);
            }
            setToast(`${order.title} borttagen`);

            if (typeof order.id === 'number') {
              deletePlanningBooking(order.id).catch((error) => {
                setToast(error?.message ?? 'Kunde inte ta bort bokningen');
              });
            }
          },
        },
      ],
    });
  }, [selectedOrderId]);

  const openResourceContextMenu = useCallback((e, resource) => {
    e.preventDefault();
    const normalShifts = shiftOptions.filter((shift) => !isAbsenceShift(shift));
    const absenceShifts = shiftOptions.filter(isAbsenceShift);

    const selectShift = async (shift) => {
      try {
        await updateMonthlyPlanningCell({
          employeeId: resource.id,
          date: anchorDateKey,
          code: shift?.code ?? null,
        });
        const updatedResources = await getPlanningResources(anchorDateKey);
        setResources(Array.isArray(updatedResources) ? updatedResources : []);
        setToast(shift ? `${shift.name} satt för ${resource.name}` : `Skift borttaget för ${resource.name}`);
      } catch (error) {
        setToast(error?.message ?? 'Kunde inte spara skift');
      }
    };

    const shiftItems = [
      ...normalShifts.map((shift) => ({
        label: shift.name || shift.code,
        onSelect: () => selectShift(shift),
      })),
      ...(normalShifts.length > 0 ? [{ separator: true }] : []),
      { label: 'Inget skift', onSelect: () => selectShift(null) },
    ];
    const absenceItems = absenceShifts.map((shift) => ({
        label: shift.name || shift.code,
        onSelect: () => selectShift(shift),
      }));

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: 'Ange skift/närvaro',
          items: shiftItems,
        },
        {
          label: 'Ange frånvaro',
          items: absenceItems,
        },
        { separator: true },
        {
          label: `Visa planering för ${resource.name}`,
          onSelect: () => setToast(`Visar schema för ${resource.name}`),
        },
      ],
    });
  }, [anchorDateKey, shiftOptions]);

  const handleStatusChange = useCallback((orderId, newBookingStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, bookingStatus: newBookingStatus } : o))
    );
    setToast(`Bokningsstatus uppdaterad`);

    if (typeof orderId === 'number') {
      updatePlanningBookingStatus(orderId, BOOKING_STATUS_CODES[newBookingStatus] ?? 0)
        .then((booking) => {
          // The workorder's color status is shared by every booking on it, so a status
          // change (e.g. -> "I arbete") must repaint every other booking for that workorder too.
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id === orderId) {
                return { ...o, status: booking.status, bookingStatus: booking.bookingStatus };
              }
              if (booking.workorderId && o.workorderId === booking.workorderId) {
                return { ...o, status: booking.status };
              }
              return o;
            })
          );
        })
        .catch((error) => {
          setToast(error?.message ?? 'Kunde inte spara bokningsstatus');
        });
    }
  }, []);

  const handleOpenWorkorder = useCallback((order) => {
    setToast(`Öppnar arbetsorder ${order.aonr || order.title}`);
  }, []);

  const handleOpenWorkorderFromBar = useCallback((order) => {
    if (order?.workorderId) {
      navigate(`/workorder/${order.workorderId}`);
    } else {
      setToast('Ingen arbetsorder kopplad till bokningen');
    }
  }, [navigate]);

  const handleSelectSearchWorkorder = useCallback((workorder) => {
    setSelectedSearchWorkorder(workorder);
    handleOpenWorkorder(workorder);
  }, [handleOpenWorkorder]);

  const handleDragStartWorkorder = useCallback((event, workorder) => {
    if (!workorder) return;

    const aonr = workorder.aonr ?? workorder.AONR ?? workorder.id;
    const customerName = workorder.kundnamn ?? workorder.KUNDNAMN ?? workorder.customerDetails?.customerName ?? 'Okänd kund';
    const registrationNumber = workorder.regnr ?? workorder.REGNR ?? workorder.vehicleDetails?.regnr ?? '';
    const description = workorder.beskrivning ?? workorder.BESKRIVNING ?? '';
    const durationMin = getWorkorderDurationMin(workorder);
    const payload = {
      type: 'new',
      id: `search-${workorder.id}`,
      workorderId: workorder.id,
      durationMin,
      status: workorder.status ?? workorder.STATUS ?? 'planned',
      statusBackgroundColor: workorder.statusPillBackgroundColor ?? workorder.StatusPillBackgroundColor,
      statusBorderColor: workorder.statusPillBorderColor ?? workorder.StatusPillBorderColor,
      bookingStatus: 'not_started',
      title: `AO ${aonr}`,
      subtitle: customerName,
      aonr,
      customer: customerName,
      regnr: registrationNumber,
      make: workorder.vehicleDetails?.tillverkare ?? '',
      model: workorder.vehicleDetails?.model ?? '',
      note: description,
    };

    setBookingDragImage(event, payload, effectiveHourWidth);
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  }, [effectiveHourWidth]);

  const handleCopyWorkorder = useCallback((order) => {
    const newOrder = {
      ...order,
      id: `wo-${Date.now()}`,
      start: addMinutes(new Date(order.start), 60),
      end: addMinutes(new Date(order.end), 60),
    };
    setOrders((prev) => [...prev, newOrder]);
    setSelectedOrderId(newOrder.id);
    setToast(`Arbetsorder ${order.aonr} kopierad`);
  }, []);

  const handleMoveWorkorder = useCallback((order) => {
    setToast(`Flyttläge aktiverat för ${order.aonr || order.title}`);
  }, []);

  const handleNewWorkorder = useCallback(() => {
    const newOrder = {
      id: `wo-${Date.now()}`,
      resourceId: 'r1',
      status: 'planned',
      bookingStatus: 'not_started',
      title: 'NY AO',
      subtitle: 'Kund AB',
      start: new Date(2026, 8, anchorDate.getDate(), 10, 0),
      end: new Date(2026, 8, anchorDate.getDate(), 12, 0),
      aonr: `${Math.floor(10000 + Math.random() * 90000)}`,
      customer: 'Kund AB',
      regnr: 'ABC123',
      make: 'Volvo',
      model: 'FH',
      note: 'Ny arbetsorder',
    };
    setOrders((prev) => [...prev, newOrder]);
    setSelectedOrderId(newOrder.id);
    setToast(`Ny arbetsorder skapad`);
  }, [anchorDate]);

  const onDragStartExisting = useCallback((e, order) => {
    const barRect = e.currentTarget.getBoundingClientRect();
    const payload = {
      type: 'existing',
      id: order.id,
      durationMin: (new Date(order.end) - new Date(order.start)) / 60000,
      grabOffsetX: e.clientX - barRect.left,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragStartNew = useCallback((e, item) => {
    const payload = { type: 'new', ...item };
    setBookingDragImage(e, payload, effectiveHourWidth);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  }, [effectiveHourWidth]);

  const onDrop = useCallback(
    (e, resourceId, renderedGeometry = geometry) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;

      const payload = JSON.parse(raw);
      const rowRect = e.currentTarget.getBoundingClientRect();
      const grabOffsetX = payload.type === 'existing' ? (payload.grabOffsetX ?? 0) : 0;
      const x = e.clientX - rowRect.left - grabOffsetX;
      const start = renderedGeometry.xToDropTime(x, payload);
      const end = addMinutes(start, payload.durationMin);

      if (payload.type === 'new') {
        if (payload.workorderId) {
          createPlanningBooking({
            resourceId,
            workorderId: payload.workorderId,
            start: toNaiveIso(start),
            end: toNaiveIso(end),
          })
            .then((booking) => {
              const newOrder = {
                ...booking,
                start: new Date(booking.start),
                end: new Date(booking.end),
              };
              setOrders((prev) => [...prev, newOrder]);
              setBacklog((prev) => prev.filter((b) => b.id !== payload.id));
              setSelectedOrderId(newOrder.id);
              setToast(`Planerade ${booking.title}`);
            })
            .catch((error) => {
              setToast(error?.message ?? 'Kunde inte skapa bokning');
            });
          return;
        }

        const newOrder = {
          id: payload.id,
          resourceId,
          status: payload.status,
          bookingStatus: payload.bookingStatus || 'not_started',
          title: payload.title,
          subtitle: payload.subtitle,
          aonr: payload.aonr,
          customer: payload.customer,
          regnr: payload.regnr,
          make: payload.make,
          model: payload.model,
          note: payload.note,
          start,
          end,
        };
        setOrders((prev) => [...prev, newOrder]);
        setBacklog((prev) => prev.filter((b) => b.id !== payload.id));
        setSelectedOrderId(newOrder.id);
        setToast(`Planerade ${payload.title}`);
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === payload.id ? { ...o, resourceId, start, end } : o))
        );
        setSelectedOrderId(payload.id);

        updatePlanningBooking(payload.id, {
          resourceId,
          start: toNaiveIso(start),
          end: toNaiveIso(end),
        }).catch((error) => {
          setToast(error?.message ?? 'Kunde inte spara flytten');
        });
      }
    },
    [geometry]
  );

  const onResizeStart = useCallback((order, edge) => {
    resizing.current = {
      id: order.id,
      edge,
      startX: null,
      originalStart: new Date(order.start),
      originalEnd: new Date(order.end),
    };
    setResizingId(order.id);
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function move(e) {
      if (!resizing.current) return;
      const r = resizing.current;
      if (r.startX === null) {
        r.startX = e.clientX;
      }
      const deltaX = e.clientX - r.startX;
      const deltaMin = Math.round((deltaX / effectiveHourWidth) * 60 / 5) * 5;

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== r.id) return o;
          r.resourceId = o.resourceId;
          if (r.edge === 'end') {
            const newEnd = addMinutes(r.originalEnd, deltaMin);
            const minEnd = addMinutes(new Date(o.start), 15);
            const end = newEnd > minEnd ? newEnd : minEnd;
            r.start = new Date(o.start);
            r.end = end;
            return { ...o, end };
          }
          const newStart = addMinutes(r.originalStart, deltaMin);
          const maxStart = addMinutes(new Date(o.end), -15);
          const start = newStart < maxStart ? newStart : maxStart;
          r.start = start;
          r.end = new Date(o.end);
          return { ...o, start };
        })
      );
    }

    function up() {
      if (resizing.current) {
        const r = resizing.current;
        resizing.current = null;
        setResizingId(null);
        document.body.style.userSelect = '';

        if (r.start && r.end) {
          updatePlanningBooking(r.id, {
            resourceId: r.resourceId,
            start: toNaiveIso(r.start),
            end: toNaiveIso(r.end),
          }).catch((error) => {
            setToast(error?.message ?? 'Kunde inte spara ändringen');
          });
        }
      }
    }

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [geometry, effectiveHourWidth]);

  const handleZoomIn = useCallback(() => {
    setHourWidth((prev) => Math.min(prev + 12, 140));
  }, []);

  const handleZoomOut = useCallback(() => {
    setHourWidth((prev) => Math.max(prev - 12, 55));
  }, []);

  return (
    <main className="w-full flex flex-col  overflow-hidden">
      {/* Top Controls & Minimap Placeholder */}
      <PlanningTopBar
        anchorDate={anchorDate}
        onSelectDate={(d) => setAnchorDate(startOfDay(d))}
        dayStart={visibleDayStart}
        dayEnd={visibleDayEnd}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onToggleBacklog={() => setShowBacklog((prev) => !prev)}
        showBacklog={showBacklog}
        onNewWorkorder={handleNewWorkorder}
        onWorkorderSelect={handleSelectSearchWorkorder}
        onDragStartWorkorder={handleDragStartWorkorder}
        selectedWorkorder={selectedSearchWorkorder}
      />

      {/* Main Timeline + Right Info Bar Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative py-2 px-5">
        {/* Central Timeline Calendar Grid */}
        <TimelineSchedule
          resources={resources}
          ordersByResource={ordersByResource}
          lanesByResource={lanesByResource}
          geometry={geometry}
          anchorDate={anchorDate}
          dayStart={visibleDayStart}
          dayEnd={visibleDayEnd}
          rowHeight={DEFAULT_ROW_HEIGHT}
          selectedOrderId={selectedOrderId}
          resizingId={resizingId}
          isContextMenuOpen={Boolean(contextMenu)}
          onSelectOrder={(order) => setSelectedOrderId(order.id)}
          onDrop={onDrop}
          onDragStartExisting={onDragStartExisting}
          onResizeStart={onResizeStart}
          onOrderContextMenu={openOrderContextMenu}
          onResourceContextMenu={openResourceContextMenu}
          onEffectiveHourWidthChange={setEffectiveHourWidth}
          onOpenWorkorder={handleOpenWorkorderFromBar}
        />

        {/* Backlog / Unplanned Orders Drawer (if opened via VISA / DÖLJ KÖ) */}
        <UnplannedOrdersDrawer
          backlog={backlog}
          isOpen={showBacklog}
          onClose={() => setShowBacklog(false)}
          onDragStartNew={onDragStartNew}
          onSelectOrder={(order) => setSelectedOrderId(order.id)}
          onOpenWorkorder={handleOpenWorkorderFromBar}
        />

        {/* Right Info Bar */}
        <PlanningRightInfoBar
          selectedOrder={selectedOrder}
          resourceName={selectedResource?.name}
          onStatusChange={handleStatusChange}
          onOpenWorkorder={handleOpenWorkorder}
          onCopyWorkorder={handleCopyWorkorder}
          onMoveWorkorder={handleMoveWorkorder}
          onManualRefresh={() => setToast('Planering uppdaterad')}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <PlanningContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}

      {/* Feedback Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/95 text-white text-xs font-semibold px-4 py-2 rounded shadow-lg z-50 animate-fade-in border border-slate-700">
          {toast}
        </div>
      )}
    </main>
  );
}
