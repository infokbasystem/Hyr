import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import apiClient from '../lib/apiClient';
import { searchItems } from '../lib/itemSearchApi';

const SORTS = [{ field: 'itemnr', direction: 'asc' }];
const PAGE_SIZE = 200;
const RESERVATION_SEARCH_PAGE_SIZE = 200;

const parseDate = (value) => {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toDateOnlyString = (value) => {
    const parsedDate = parseDate(value);
    if (!parsedDate) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsedDate.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const intervalsOverlap = (startA, endA, startB, endB) => {
    if (!startA || !endA || !startB || !endB) {
        return false;
    }

    return startA <= endB && startB <= endA;
};

const toNonNegativeInteger = (value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        return 0;
    }

    return Math.max(0, Math.trunc(parsedValue));
};

const formatCurrencySek = (value) => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
        return '';
    }

    return `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(parsedValue)} kr`;
};

const normalizeItem = (item) => ({
    id: item?.id ?? null,
    itemNr: item?.itemNr ?? '',
    regNr: item?.regNr ?? '',
    manufacturer: item?.manufacturer ?? '',
    itemCategoryName: item?.itemCategoryName ?? '',
    itemModelName: item?.itemModelName ?? '',
    nrOfItemsTotal: item?.nrOfItemsTotal ?? null,
    basePrice: item?.basePrice ?? null,
    pricePerDay: item?.pricePerDay ?? null,
    pricePerWeek: item?.pricePerWeek ?? null,
    note: item?.note ?? '',
});

const AccessorySelectModal = ({ isOpen, onClose, onSelect, itemTypeCode, selectedPeriod = null, isSubmitting = false }) => {
    const inputRef = useRef(null);
    const itemButtonRefs = useRef([]);
    const ghostTimerRef = useRef(null);
    const availabilityHintTimerRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [showGhost, setShowGhost] = useState(false);
    const [error, setError] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [busyAccessoryCounts, setBusyAccessoryCounts] = useState(new Map());
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [showAvailabilityLoadingHint, setShowAvailabilityLoadingHint] = useState(false);
    const [availabilityError, setAvailabilityError] = useState('');

    const periodStartValue = selectedPeriod?.from || selectedPeriod?.bookedFrom || '';
    const periodEndValue = selectedPeriod?.to || selectedPeriod?.bookedTo || '';
    const periodStart = parseDate(periodStartValue);
    const periodEnd = parseDate(periodEndValue);
    const periodStartMs = periodStart?.getTime() ?? null;
    const periodEndMs = periodEnd?.getTime() ?? null;
    const hasSelectedPeriod = periodStartMs !== null && periodEndMs !== null;

    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setItems([]);
            setError('');
            setLoading(false);
            setHasLoadedOnce(false);
            setShowGhost(false);
            setHighlightedIndex(-1);
            setBusyAccessoryCounts(new Map());
            setIsLoadingAvailability(false);
            setShowAvailabilityLoadingHint(false);
            setAvailabilityError('');
            window.clearTimeout(availabilityHintTimerRef.current);
            return undefined;
        }

        itemButtonRefs.current = [];
        window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        let isActive = true;
        const timer = window.setTimeout(async () => {
            setHasLoadedOnce(false);
            setLoading(true);
            setShowGhost(false);
            setError('');
            window.clearTimeout(ghostTimerRef.current);
            ghostTimerRef.current = window.setTimeout(() => {
                if (isActive) {
                    setShowGhost(true);
                }
            }, 200);

            try {
                const conditions = [
                    { field: 'itemtypecode', operator: 'eq', value: itemTypeCode },
                    { field: 'isactive', operator: 'eq', value: true },
                ];

                if (searchTerm.trim()) {
                    conditions.unshift({
                        field: 'freetext',
                        operator: 'contains',
                        value: searchTerm.trim(),
                    });
                }

                const result = await searchItems({
                    conditions,
                    pageNumber: 1,
                    pageSize: PAGE_SIZE,
                    sorts: SORTS,
                });

                if (!isActive) {
                    return;
                }

                setItems((result?.items ?? []).map(normalizeItem));
            } catch (requestError) {
                if (!isActive) {
                    return;
                }

                setItems([]);
                setError(requestError?.message || 'Kunde inte hämta tillbehör.');
            } finally {
                if (isActive) {
                    window.clearTimeout(ghostTimerRef.current);
                    setLoading(false);
                    setHasLoadedOnce(true);
                    setShowGhost(false);
                }
            }
        }, searchTerm.trim() ? 250 : 0);

        return () => {
            isActive = false;
            window.clearTimeout(timer);
            window.clearTimeout(ghostTimerRef.current);
        };
    }, [isOpen, itemTypeCode, searchTerm]);

    useEffect(() => {
        window.clearTimeout(availabilityHintTimerRef.current);

        if (!isLoadingAvailability) {
            setShowAvailabilityLoadingHint(false);
            return undefined;
        }

        availabilityHintTimerRef.current = window.setTimeout(() => {
            setShowAvailabilityLoadingHint(true);
        }, 250);

        return () => {
            window.clearTimeout(availabilityHintTimerRef.current);
        };
    }, [isLoadingAvailability]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (!hasSelectedPeriod) {
            setBusyAccessoryCounts(new Map());
            setIsLoadingAvailability(false);
            setAvailabilityError('Välj period på bilen för att se tillgängligt antal.');
            return;
        }

        if (items.length === 0) {
            setBusyAccessoryCounts(new Map());
            setIsLoadingAvailability(false);
            setAvailabilityError('');
            return;
        }

        let isActive = true;

        const fetchBusyAccessoryCounts = async () => {
            setIsLoadingAvailability(true);
            setAvailabilityError('');

            try {
                const from = toDateOnlyString(periodStartValue);
                const to = toDateOnlyString(periodEndValue);

                const firstPage = await apiClient.post('/reservation/search', {
                    filter: {
                        conditions: [{
                            field: 'itemperiod',
                            operator: 'overlaps',
                            value: { from, to },
                        }],
                    },
                    pagination: {
                        pageNumber: 1,
                        pageSize: RESERVATION_SEARCH_PAGE_SIZE,
                    },
                    sorts: [{
                        field: 'id',
                        direction: 'desc',
                    }],
                });

                const firstRows = Array.isArray(firstPage?.data?.items) ? firstPage.data.items : [];
                const totalPages = Number.isInteger(firstPage?.data?.totalPages) ? firstPage.data.totalPages : 1;

                let allRows = [...firstRows];
                for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
                    const nextPage = await apiClient.post('/reservation/search', {
                        filter: {
                            conditions: [{
                                field: 'itemperiod',
                                operator: 'overlaps',
                                value: { from, to },
                            }],
                        },
                        pagination: {
                            pageNumber,
                            pageSize: RESERVATION_SEARCH_PAGE_SIZE,
                        },
                        sorts: [{
                            field: 'id',
                            direction: 'desc',
                        }],
                    });

                    const pageRows = Array.isArray(nextPage?.data?.items) ? nextPage.data.items : [];
                    allRows = allRows.concat(pageRows);
                }

                const reservationIds = [...new Set(allRows.map((entry) => entry?.id).filter((entry) => Number.isInteger(entry)))];
                const reservationResponses = await Promise.all(
                    reservationIds.map((reservationId) => apiClient.get(`/reservation/${reservationId}`))
                );

                const nextCounts = new Map();
                const itemIdsInList = new Set(items.map((item) => item?.id).filter((id) => Number.isInteger(id)));

                reservationResponses.forEach((response) => {
                    const reservationItems = Array.isArray(response?.data?.reservationItems) ? response.data.reservationItems : [];
                    reservationItems.forEach((reservationItem) => {
                        const itemId = reservationItem?.itemId;
                        if (!Number.isInteger(itemId) || !itemIdsInList.has(itemId)) {
                            return;
                        }

                        const busyStart = parseDate(
                            reservationItem?.bookedFrom
                            || reservationItem?.actualFrom
                            || reservationItem?.bookedTo
                            || reservationItem?.actualTo
                        );
                        const busyEnd = parseDate(
                            reservationItem?.bookedTo
                            || reservationItem?.actualTo
                            || reservationItem?.bookedFrom
                            || reservationItem?.actualFrom
                        );

                        if (!intervalsOverlap(periodStart, periodEnd, busyStart, busyEnd)) {
                            return;
                        }

                        nextCounts.set(itemId, (nextCounts.get(itemId) || 0) + 1);
                    });
                });

                if (!isActive) {
                    return;
                }

                setBusyAccessoryCounts(nextCounts);
            } catch (requestError) {
                if (!isActive) {
                    return;
                }

                console.error('Error fetching accessory availability:', requestError);
                setBusyAccessoryCounts(new Map());
                setAvailabilityError('Kunde inte beräkna tillgängligt antal för vald period.');
            } finally {
                if (isActive) {
                    setIsLoadingAvailability(false);
                }
            }
        };

        fetchBusyAccessoryCounts();

        return () => {
            isActive = false;
        };
    }, [isOpen, hasSelectedPeriod, items, periodStartMs, periodEndMs, periodStartValue, periodEndValue]);

    useEffect(() => {
        if (items.length === 0) {
            setHighlightedIndex(-1);
            return;
        }

        setHighlightedIndex((previousIndex) => {
            if (previousIndex < 0) {
                return 0;
            }

            return Math.min(previousIndex, items.length - 1);
        });
    }, [items]);

    useEffect(() => {
        if (highlightedIndex < 0) {
            return;
        }

        const button = itemButtonRefs.current[highlightedIndex];
        button?.scrollIntoView({ block: 'nearest' });
    }, [highlightedIndex]);

    const moveHighlight = (direction) => {
        if (items.length === 0) {
            return;
        }

        setHighlightedIndex((previousIndex) => {
            if (previousIndex < 0) {
                return direction > 0 ? 0 : items.length - 1;
            }

            const nextIndex = previousIndex + direction;
            if (nextIndex < 0) {
                return 0;
            }

            if (nextIndex >= items.length) {
                return items.length - 1;
            }

            return nextIndex;
        });
    };

    const handleInputKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveHighlight(1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(-1);
            return;
        }

        if (event.key === 'Enter' && highlightedIndex >= 0 && items[highlightedIndex]) {
            event.preventDefault();
            onSelect(items[highlightedIndex]);
        }
    };

    if (!isOpen) {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={isSubmitting ? undefined : onClose} />
            <div className="relative z-10 flex min-h-screen items-start justify-center pt-24">
                <div
                    className="w-full max-w-lg rounded-sm bg-[rgb(255,255,234)] px-12 py-6 shadow-xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <h2 className="mb-3 text-center text-xs font-semibold text-gray-800">Välj tillbehör</h2>
                    <p className="mb-4 mt-2 text-center text-xs text-gray-700">
                        Välj ett aktivt objekt av typen tillbehör för att lägga till det på bokningen.
                    </p>

                    <div className="mb-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder="Sök tillbehör"
                            className="h-8 w-full rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="relative mb-5 h-72 overflow-y-auto rounded-sm border border-stone-300 bg-white">
                        {items.length === 0 ? (
                            <div className="flex h-full items-center justify-center px-3 py-2 text-xs text-gray-500">
                                {showGhost ? '' : loading || !hasLoadedOnce ? 'Laddar tillbehör...' : 'Inga tillbehör hittades.'}
                            </div>
                        ) : (
                            <div className={showGhost ? 'opacity-60' : ''}>
                                {items.map((item, index) => {
                                    const totalAmount = toNonNegativeInteger(item.nrOfItemsTotal);
                                    const busyAmount = Number.isInteger(item.id) ? (busyAccessoryCounts.get(item.id) || 0) : 0;
                                    const availableAmount = Math.max(0, totalAmount - busyAmount);
                                    const availabilityPillColors = availableAmount <= 0
                                        ? 'border-red-200 bg-red-100 text-red-800'
                                        : availableAmount <= 2
                                            ? 'border-amber-200 bg-amber-100 text-amber-800'
                                            : 'border-emerald-200 bg-emerald-100 text-emerald-800';

                                    const pricePerDayText = formatCurrencySek(item?.pricePerDay);
                                    const pricePerWeekText = formatCurrencySek(item?.pricePerWeek);
                                    const basePriceText = formatCurrencySek(item?.basePrice);
                                    const priceText = pricePerDayText
                                        ? `Pris/dag: ${pricePerDayText}`
                                        : pricePerWeekText
                                            ? `Pris/vecka: ${pricePerWeekText}`
                                            : basePriceText
                                                ? `Grundpris: ${basePriceText}`
                                                : 'Pris: ej angivet';

                                    return (
                                        <button
                                            key={item.id ?? `${item.itemNr}-${item.regNr}`}
                                            ref={(element) => {
                                                itemButtonRefs.current[index] = element;
                                            }}
                                            type="button"
                                            onClick={() => onSelect(item)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={`block w-full border-b border-stone-200 px-3 py-2 text-left text-xs text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 ${highlightedIndex === index ? 'bg-sky-50' : 'hover:bg-sky-50/50'}`}
                                            disabled={isSubmitting}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-medium text-gray-800 pr-2">{item.itemNr || 'Namnlöst tillbehör'}</div>
                                                {hasSelectedPeriod && (
                                                    <div className={`shrink-0 rounded-full border px-2 py-0.5 text-tiny ${availabilityPillColors}`}>
                                                        {`${availableAmount} av ${totalAmount} tillgängliga`}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-start justify-between gap-2">
                                                <div className="mt-1 text-tiny text-gray-500">{priceText}</div>
                                                {hasSelectedPeriod && (
                                                    <div className="mt-1 text-[10px] text-gray-500">
                                                        {`Bokade i perioden: ${busyAmount}`}
                                                    </div>
                                                )}

                                            </div>

                                            {/* <div className="mt-1 text-[11px] text-gray-500">
                                                {[item.itemCategoryName, item.manufacturer, item.itemModelName, item.regNr]
                                                    .filter(Boolean)
                                                    .join(' | ')}
                                            </div> */}

                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {showGhost && (
                            <div className="pointer-events-none absolute inset-0 bg-white/70 px-3 py-3">
                                <div className="space-y-2">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <div key={`accessory-ghost-${index}`} className="border-b border-lime-100 py-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="h-3 w-32 animate-pulse rounded bg-lime-100" />
                                                <div className="h-5 w-28 animate-pulse rounded-full bg-emerald-100" />
                                            </div>
                                            <div className="mt-2 flex items-start justify-between gap-2">
                                                <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100" />
                                                <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-3 h-4 text-center text-[11px]">
                        {availabilityError ? (
                            <span className="text-amber-700">{availabilityError}</span>
                        ) : hasSelectedPeriod && showAvailabilityLoadingHint ? (
                            <span className="text-gray-500">Beräknar tillgängligt antal...</span>
                        ) : null}
                    </div>

                    <div className="mb-2 mt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-orange-400 px-6 py-1 text-xs text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                        >
                            Avbryt
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default AccessorySelectModal;