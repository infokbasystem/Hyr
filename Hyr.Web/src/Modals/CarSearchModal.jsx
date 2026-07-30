import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import DateRangeSelect from '../components/DateRangeSelect';
import apiClient from '../lib/apiClient';

const ITEM_PAGE_SIZE = 1000;

function toDateOnlyString(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(value) {
    if (!value) {
        return null;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function intervalsOverlap(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) {
        return false;
    }

    return startA <= endB && startB <= endA;
}


const CarSearchModal = ({ isOpen, onClose, onSearch, showAvailabilityPanel = false }) => {
    const [period, setPeriod] = useState({ from: null, to: null });
    const [category, setCategory] = useState('');
    const [model, setModel] = useState('');
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableModels, setAvailableModels] = useState([]);
    const [cars, setCars] = useState([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [busyCarIds, setBusyCarIds] = useState(new Set());
    const [loadError, setLoadError] = useState('');
    const [availabilityError, setAvailabilityError] = useState('');


    const fetchLists = async () => {
        setIsLoadingFilters(true);
        setLoadError('');

        try {
            const [formOptionsResponse, itemsResponse] = await Promise.all([
                apiClient.get('/item/carsearch-form-options'),
                apiClient.get(`/item?Page=1&PageSize=${ITEM_PAGE_SIZE}&IsActive=true&ItemTypeCode=VEHICLE&SortBy=ItemNr:asc`),
            ]);

            const categoriesData = Array.isArray(formOptionsResponse.data?.itemCategories) ? formOptionsResponse.data.itemCategories : [];
            const modelsData = Array.isArray(formOptionsResponse.data?.itemModels) ? formOptionsResponse.data.itemModels : [];
            const itemRows = Array.isArray(itemsResponse.data?.data) ? itemsResponse.data.data : [];

            setAvailableCategories(categoriesData.map((entry) => ({
                label: entry?.name ?? '',
                value: entry?.name ?? '',
            })));

            setAvailableModels(modelsData.map((entry) => ({
                label: entry?.name ?? '',
                value: entry?.name ?? '',
            })));

            setCars(itemRows.map((entry) => ({
                id: entry?.id,
                itemNr: entry?.itemNr ?? '',
                regNr: entry?.regNr ?? '',
                yearModel: entry?.yearModel ?? '',
                manufacturer: entry?.manufacturer ?? '',
                itemCategoryName: entry?.itemCategoryName ?? '',
                itemModelName: entry?.itemModelName ?? '',
                isActive: Boolean(entry?.isActive),
            })));
        } catch (error) {
            console.error('Error fetching car search options:', error);
            setLoadError('Kunde inte ladda filter och bilar.');
        } finally {
            setIsLoadingFilters(false);
        }
    };

    const fetchAvailableCarIds = async (periodFrom, periodTo) => {
        if (!periodFrom || !periodTo) {
            setBusyCarIds(new Set());
            setAvailabilityError('Välj period för att se lediga bilar.');
            return;
        }

        setIsLoadingAvailability(true);
        setAvailabilityError('');

        try {
            const from = toDateOnlyString(periodFrom);
            const to = toDateOnlyString(periodTo);
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
                    pageSize: 200,
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
                        pageSize: 200,
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

            const periodStart = new Date(periodFrom);
            const periodEnd = new Date(periodTo);

            const busyCarIds = new Set();
            reservationResponses.forEach((response) => {
                const reservationItems = Array.isArray(response?.data?.reservationItems) ? response.data.reservationItems : [];
                reservationItems.forEach((reservationItem) => {
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

                    if (intervalsOverlap(periodStart, periodEnd, busyStart, busyEnd) && Number.isInteger(reservationItem?.itemId)) {
                        busyCarIds.add(reservationItem.itemId);
                    }
                });
            });

            setBusyCarIds(busyCarIds);
        } catch (error) {
            console.error('Error fetching available cars:', error);
            setAvailabilityError('Kunde inte berakna lediga bilar for vald period.');
        } finally {
            setIsLoadingAvailability(false);
        }
    };


    const handleSearch = () => {
        onSearch({ period, category, model });
        onClose();
    };

    const handleCarSelect = (carEntry) => {
        if (!period.from || !period.to) {
            setAvailabilityError('Välj period för att se lediga bilar.');
            return;
        }

        onSearch({
            period,
            category,
            model,
            selectedCar: carEntry,
        });
        onClose();
    };

    const hasSelectedPeriod = Boolean(period.from && period.to);

    const categoryOptions = useMemo(() => ([
        { label: isLoadingFilters ? 'Laddar kategorier...' : 'Alla kategorier', value: '' },
        ...availableCategories,
    ]), [availableCategories, isLoadingFilters]);

    const modelOptions = useMemo(() => ([
        { label: isLoadingFilters ? 'Laddar modeller...' : 'Alla modeller', value: '' },
        ...availableModels,
    ]), [availableModels, isLoadingFilters]);

    const filteredCars = useMemo(
        () => cars.filter((carEntry) => {
            if (category && carEntry.itemCategoryName !== category) {
                return false;
            }

            if (model && carEntry.itemModelName !== model) {
                return false;
            }

            return true;
        }),
        [cars, category, model]
    );

    const availableCars = useMemo(
        () => {
            if (!hasSelectedPeriod) {
                return [];
            }

            return filteredCars.filter((carEntry) => Number.isInteger(carEntry.id) && !busyCarIds.has(carEntry.id));
        },
        [filteredCars, busyCarIds, hasSelectedPeriod]
    );


    useEffect(() => {
        if (isOpen) {
            setPeriod({ from: null, to: null });
            fetchLists();
            setAvailabilityError(showAvailabilityPanel ? 'Välj period för att se lediga bilar.' : '');
            setBusyCarIds(new Set());
        }
    }, [isOpen, showAvailabilityPanel]);

    useEffect(() => {
        if (!isOpen || !showAvailabilityPanel || !period.from || !period.to) {
            return;
        }

        fetchAvailableCarIds(period.from, period.to);
    }, [isOpen, showAvailabilityPanel, period.from, period.to]);


    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 z-40" />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={onClose}>
                <div
                    className={`relative max-h-[calc(100vh-6rem)] overflow-hidden rounded-sm border border-slate-200 bg-slate-50 shadow-xl py-6 px-8 flex flex-col ${showAvailabilityPanel ? 'w-[1050px]' : 'w-[720px]'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center mb-4">
                        <h2 className="text-sm font-semibold text-center">
                            Sök lediga bilar
                        </h2>
                        <button
                            onClick={onClose}
                            className="absolute right-0 text-slate-400 hover:text-slate-600 text-l leading-none mb-1"
                        >
                            ×
                        </button>
                    </div>
                    <div className="mx-auto flex gap-6">
                        <div className={showAvailabilityPanel ? 'w-[620px] min-h-0' : 'w-full min-h-0'}>
                            <div className="text-xs text-slate-700 grid grid-cols-2 gap-10 place-items-center justify-center">
                                <div className="flex flex-col items-center w-full px-10">
                                    <label className="block mb-1 text-xs text-slate-700 text-center">Kategori</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="text-xs w-full rounded-sm border border-slate-300 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
                                        disabled={isLoadingFilters && availableCategories.length === 0}
                                    >
                                        {categoryOptions.map((option) => (
                                            <option key={`category-${option.value || 'all'}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col items-center w-full px-10">
                                    <label className="block mb-1 text-xs text-slate-700 text-center">Modell</label>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="text-xs w-full rounded-sm border border-slate-300 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
                                        disabled={isLoadingFilters && availableModels.length === 0}
                                    >
                                        {modelOptions.map((option) => (
                                            <option key={`model-${option.value || 'all'}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {loadError && (
                                <div className="mt-3 px-10 text-center text-[11px] text-red-600">
                                    {loadError}
                                </div>
                            )}
                            <div className="my-3 flex flex-col items-center">
                                <DateRangeSelect onChange={setPeriod} />
                            </div>
                            {showAvailabilityPanel && (
                                <div className="flex items-center justify-end mt-2 mb-1 px-10">
                                    <span className="text-[11px] text-slate-600">
                                        {period.from && period.to ? `${availableCars.length} lediga av ${filteredCars.length}` : 'Valj period for tillganglighet'}
                                    </span>
                                </div>
                            )}
                            <div className={`flex gap-4 mt-3 mb-4 pt-4 ${showAvailabilityPanel ? 'justify-start ml-1' : 'justify-end'}`}>
                                <button
                                    onClick={onClose}
                                    className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                                >
                                    Avbryt
                                </button>
                                {!showAvailabilityPanel && (
                                    <button
                                        onClick={handleSearch}
                                        className="shadow-md/30 text-xs text-white px-10 p-[5px] bg-lime-700 hover:bg-lime-900 disabled:bg-lime-500 disabled:cursor-not-allowed"
                                        disabled={!period.from || !period.to}
                                    >
                                        Sök
                                    </button>
                                )}
                            </div>
                        </div>
                        {showAvailabilityPanel && (
                            <div className="w-[340px] ml-4 flex flex-col self-start">
                                <h3 className="text-xs font-semibold text-slate-700 mb-2 text-center">Tillgangliga bilar</h3>
                                <div className="border border-slate-200 rounded-sm bg-white p-3 h-[390px] flex flex-col overflow-hidden">
                                    {/* <div className="text-[11px] text-slate-600 mb-2">
                                    {category || 'Alla kategorier'} / {model || 'Alla modeller'}
                                </div> */}

                                    {availabilityError && (
                                        <div className="text-[11px] text-red-600 mb-2 text-center mt-10">{availabilityError}</div>
                                    )}

                                    {isLoadingAvailability && (
                                        <div className="text-[11px] text-slate-600">Laddar tillgangliga bilar...</div>
                                    )}

                                    {!isLoadingAvailability && !availabilityError && availableCars.length === 0 && (
                                        <div className="text-[11px] text-slate-600 text-center mt-10">Inga lediga bilar for vald period och filter.</div>
                                    )}

                                    {!isLoadingAvailability && !availabilityError && availableCars.length > 0 && (
                                        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                            {availableCars.map((carEntry) => (
                                                <button
                                                    key={`car-available-${carEntry.id}`}
                                                    type="button"
                                                    onClick={() => handleCarSelect(carEntry)}
                                                    className="w-full mb-1 last:mb-0 rounded-sm border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 px-2 py-1.5 text-left transition-colors"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[11px] font-semibold text-slate-800 truncate ml-2">{carEntry.regNr || carEntry.itemNr || `Bil ${carEntry.id}`}</span>
                                                        <div className="leading-3 flex flex-col items-end gap-1.5">
                                                            <div className="text-[10px] text-slate-500 truncate">{carEntry.itemModelName || 'Okand modell'}</div>
                                                            <span className="text-[10px] text-slate-500 truncate">{carEntry.itemCategoryName || 'Okand kategori'}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

};

export default CarSearchModal;
