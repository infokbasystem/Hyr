import React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useBlocker } from "react-router";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Euro, Printer, Search, Save, Trash2, RotateCcw, Wrench, HandCoins } from 'lucide-react';

import ActionButton from '../../components/ActionButton';
import { usePdf } from '../../contexts/PdfContext';
import { formatUserName } from '../../utils/nameFormatters';
import ConfirmationModal from '../../components/ConfirmationModal';
import CustomerSearchModal from '../../components/CustomerSearchModal';
import AccessorySelectModal from '../../modals/AccessorySelectModal';
import CarSearchModal from '../../modals/CarSearchModal';

import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';
import LabeledTextArea from '../../components/LabeledTextArea';
import Input from '../../components/Input';
import ReservationItemVehicle from './ReservationItemVehicle';
import ReservationItemTrailer from './ReservationItemTrailer';
import ReservationItemLift from './ReservationItemLift';
import ReservationItemHaki from './ReservationItemHaki';
import ReservationItemAlu from './ReservationItemAlu';
import ReservationItemAccessory from './ReservationItemAccessory';
import ReservationItemTool from './ReservationItemTool';
import apiClient from '../../lib/apiClient';
import { getSharedRequest } from '../../lib/sharedRequest';
import NumberInput from '../../components/NumberInput';

const TIME_OF_DAY_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const ITEM_PERIOD_FIELDS = ['bookedFrom', 'bookedTo', 'actualFrom', 'actualTo'];
const savedReservationRouteCache = new Map();
const SKELETON_SHOW_DELAY_MS = 200;
const SKELETON_TEST_DELAY_MS = 0;
const SAVED_RESERVATION_ROUTE_CACHE_TTL_MS = 5000;
const PRICING_CALENDAR_OPTIONS = [
    { id: 'ALLDAYS', name: 'ALLDAYS' },
    { id: 'WEEKDAYS', name: 'WEEKDAYS' },
    { id: 'WORKINGDAYS', name: 'WORKINGDAYS' },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeItemTypeCode = (value) => String(value || '').trim().toUpperCase();

const isVehicleItem = (item) => normalizeItemTypeCode(item?.itemTypeCode) === 'VEHICLE';
const isAccessoryItem = (item) => normalizeItemTypeCode(item?.itemTypeCode) === 'ACCESSORY';

const getNowRoundedToNearestQuarterHour = () => {
    const now = new Date();
    const roundedMinutes = Math.round(now.getMinutes() / 15) * 15;
    const rounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0, 0);

    const year = rounded.getFullYear();
    const month = String(rounded.getMonth() + 1).padStart(2, '0');
    const day = String(rounded.getDate()).padStart(2, '0');
    const hours = String(rounded.getHours()).padStart(2, '0');
    const minutes = String(rounded.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getReservationItemDisplayName = (item) => {
    if (!item) {
        return 'Artikel';
    }

    const name = String(item?.itemName || '').trim();
    const nr = String(item?.itemNr || '').trim();
    const regNr = String(item?.regNr || '').trim();
    const manufacturer = String(item?.manufacturer || '').trim();
    const model = String(item?.model || '').trim();

    return [name, model].filter(Boolean).join(', ') || nr || regNr || [manufacturer, model].filter(Boolean).join(' ') || 'Artikel';
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseVatRateValue = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const normalizedValue = String(value ?? '').trim();
    if (!normalizedValue) {
        return null;
    }

    const parsedVatRate = Number(normalizedValue.replace('%', '').replace(',', '.'));
    return Number.isFinite(parsedVatRate) ? parsedVatRate : null;
};

const getVatRateFromRow = (row) => {
    const vatRateFromField = parseVatRateValue(row?.vatRate);
    if (vatRateFromField !== null) {
        return vatRateFromField;
    }

    const vatRateFromLegacyCode = parseVatRateValue(row?.vatCode);
    if (vatRateFromLegacyCode !== null) {
        return vatRateFromLegacyCode;
    }

    return 25;
};

const getSumInclVat = (sum, row) => {
    const exVatSum = Number(sum ?? 0);
    if (!Number.isFinite(exVatSum)) {
        return null;
    }

    const vatRate = getVatRateFromRow(row);
    return Number((exVatSum * (1 + vatRate / 100)).toFixed(2));
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatAmount = (value) => {
    const normalized = Number(value || 0);
    return normalized.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateOnly = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const renderMetaRow = (label, value, userName) => {
    return (
        <div className="grid grid-cols-21 gap-1">
            <div className="col-span-5"><span className="text-gray-500">{label}</span></div>
            <div className="col-span-8">{value && formatDateTime(value)}</div>
            <div className="col-span-8 text-gray-500">{userName && `av ${userName}`}</div>
        </div>
    );
};

const getDefaultCalcRowsForItem = (item) => {
    const itemTypeCode = normalizeItemTypeCode(item?.itemTypeCode);
    const defaultItemId = Number.isInteger(item?.itemId) ? item.itemId : null;

    if (itemTypeCode === 'VEHICLE' || itemTypeCode === 'LIFT') {
        return [
            {
                id: 0,
                itemId: defaultItemId,
                text: 'Baspris',
                calcPriceTypeCode: 'FREETEXT',
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatId: null,
                vatRate: 25,
            },
            {
                id: 0,
                itemId: defaultItemId,
                text: 'Dygnspris',
                calcPriceTypeCode: 'FREETEXT',
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatId: null,
                vatRate: 25,
            },
        ];
    }

    return [
        {
            id: 0,
            itemId: defaultItemId,
            text: getReservationItemDisplayName(item),
            calcPriceTypeCode: 'FREETEXT',
            qty: 1,
            unitPrice: null,
            discount: null,
            sum: null,
            vatId: null,
            vatRate: 25,
        },
    ];
};

const normalizeReservationForComparison = (reservationData) => {
    if (!reservationData || typeof reservationData !== 'object') {
        return reservationData;
    }

    const existingCalcs = Array.isArray(reservationData.reservationCalcs)
        ? reservationData.reservationCalcs
        : [];

    const normalizedCalcs = existingCalcs.map((existingCalc) => {
        const existingRows = Array.isArray(existingCalc?.reservationCalcItems)
            ? existingCalc.reservationCalcItems
            : [];

        const normalizedRows = existingRows.map((row) => ({
            ...row,
            itemId: row?.itemId ?? null,
            discount: row?.discount ?? null,
            vatId: row?.vatId ?? null,
            vatRate: parseVatRateValue(row?.vatRate) ?? parseVatRateValue(row?.vatCode) ?? 25,
            calcPriceTypeCode: row?.calcPriceTypeCode || 'FREETEXT',
        }));

        return {
            id: existingCalc?.id || 0,
            dateTimeFrom: existingCalc?.dateTimeFrom ?? null,
            dateTimeTo: existingCalc?.dateTimeTo ?? null,
            receiverTypeCode: existingCalc?.receiverTypeCode || 'CUSTOMER',
            reservationCalcItems: normalizedRows,
        };
    });

    return {
        ...reservationData,
        pricingCalendarCode: reservationData?.pricingCalendarCode || 'ALLDAYS',
        reservationCalcs: normalizedCalcs,
    };
};

const getPrimaryVehiclePeriod = (items) => {
    const vehicle = (items || []).find(isVehicleItem);
    if (!vehicle) {
        return null;
    }

    return {
        bookedFrom: vehicle?.bookedFrom || '',
        bookedTo: vehicle?.bookedTo || '',
        actualFrom: vehicle?.actualFrom || '',
        actualTo: vehicle?.actualTo || '',
    };
};

const syncAccessoryPeriodsWithVehicle = (items) => {
    const normalizedItems = Array.isArray(items) ? items : [];
    const vehiclePeriod = getPrimaryVehiclePeriod(normalizedItems);
    if (!vehiclePeriod) {
        return { items: normalizedItems, changed: false, hasVehicle: false, vehiclePeriod: null };
    }

    let changed = false;

    const nextItems = normalizedItems.map((item) => {
        if (!isAccessoryItem(item)) {
            return item;
        }

        const hasDiff = ITEM_PERIOD_FIELDS.some((field) => (item?.[field] || '') !== vehiclePeriod[field]);
        if (!hasDiff) {
            return item;
        }

        changed = true;
        return {
            ...item,
            ...vehiclePeriod,
        };
    });

    return { items: nextItems, changed, hasVehicle: true, vehiclePeriod };
};

const Reservation = () => {
    // const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const params = useParams();
    const routeReservationId = params.id ?? 'new';
    const initialSavedReservationEntry = savedReservationRouteCache.get(`${routeReservationId}`) ?? null;
    const initialSavedReservation = initialSavedReservationEntry?.reservation ?? null;
    const initialMessages = initialSavedReservationEntry?.messages ?? [];
    const initialReservationFormOptions = initialSavedReservationEntry?.reservationFormOptions ?? {
        itemTypes: [],
        itemCategories: [],
        priceLists: [],
        defaultBookedFromTime: '',
        defaultBookedToTime: '',
    };

    const [reservation, setReservation] = useState(initialSavedReservation);
    const [originalReservation, setOriginalReservation] = useState(
        initialSavedReservation ? JSON.parse(JSON.stringify(initialSavedReservation)) : null
    );
    const [messages, setMessages] = useState(initialMessages);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showCarSearchModal, setShowCarSearchModal] = useState(false);
    const [showAccessorySelectModal, setShowAccessorySelectModal] = useState(false);
    const [showNoInvoiceItemsModal, setShowNoInvoiceItemsModal] = useState(false);
    const [openCalcMenu, setOpenCalcMenu] = useState(null);
    const [selectedDebitCalcIndex, setSelectedDebitCalcIndex] = useState(null);
    const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
    const [isCheckingInvoiceItems, setIsCheckingInvoiceItems] = useState(false);
    const [initialLoadPending, setInitialLoadPending] = useState(!initialSavedReservation);
    const [loading, setLoading] = useState(false);
    const [reservationFormOptions, setReservationFormOptions] = useState(initialReservationFormOptions);

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const skipUnsavedGuardRef = useRef(false);
    const consumedSavedReservationRouteRef = useRef(null);

    const defaultBadges = [
        { text: 'Epostadress finns', color: '#56983cff' }
    ];

    const formatErrorMessage = (error) => {
        const responseData = error?.response?.data ?? error?.payload ?? error?.message;

        if (typeof responseData === 'string') {
            return responseData;
        }

        if (responseData && typeof responseData === 'object') {
            const fieldErrors = responseData.errors;
            if (fieldErrors && typeof fieldErrors === 'object') {
                const messages = Object.values(fieldErrors)
                    .flat()
                    .filter(Boolean)
                    .map(String);

                if (messages.length > 0) {
                    return messages.join('\n');
                }
            }

            return responseData.message || responseData.title || 'Ett fel uppstod vid sparande';
        }

        return 'Ett fel uppstod vid sparande';
    };

    const toNullIfBlank = (value) => {
        if (typeof value !== 'string') {
            return value;
        }

        return value.trim() === '' ? null : value;
    };

    const sanitizeReservationForSave = (reservationToSave) => {
        const reservationItems = Array.isArray(reservationToSave?.reservationItems)
            ? reservationToSave.reservationItems.map((item) => ({
                ...item,
                itemId: item?.itemId === '' ? null : item?.itemId,
                debitCategoryId: item?.debitCategoryId === '' ? null : item?.debitCategoryId,
                insuranceCompanyId: item?.insuranceCompanyId === '' ? null : item?.insuranceCompanyId,
                bookedFrom: toNullIfBlank(item?.bookedFrom),
                bookedTo: toNullIfBlank(item?.bookedTo),
                actualFrom: toNullIfBlank(item?.actualFrom),
                actualTo: toNullIfBlank(item?.actualTo),
                kmOut: item?.kmOut === '' ? null : item?.kmOut,
                kmIn: item?.kmIn === '' ? null : item?.kmIn,
                fuelLitres: item?.fuelLitres === '' ? null : item?.fuelLitres,
                fuelUnitPrice: item?.fuelUnitPrice === '' ? null : item?.fuelUnitPrice,
            }))
            : [];

        const reservationCalcs = Array.isArray(reservationToSave?.reservationCalcs)
            ? reservationToSave.reservationCalcs.map((calc) => ({
                ...calc,
                dateTimeFrom: toNullIfBlank(calc?.dateTimeFrom),
                dateTimeTo: toNullIfBlank(calc?.dateTimeTo),
            }))
            : [];

        return {
            ...reservationToSave,
            pricingCalendarCode: String(reservationToSave?.pricingCalendarCode || 'ALLDAYS').trim() || 'ALLDAYS',
            driverLicenceExpireDate: toNullIfBlank(reservationToSave?.driverLicenceExpireDate),
            reservationItems,
            reservationCalcs,
        };
    };

    const officeItemTypes = (reservationFormOptions.itemTypes || [])
        .map(itemType => ({
            code: String(itemType?.code || itemType?.Code || '').trim(),
            name: String(itemType?.name || itemType?.Name || '').trim(),
        }))
        .filter(itemType => itemType.code || itemType.name);

    const normalizeItemTypeValue = (value) => String(value || '').trim().toUpperCase();

    const getEnabledOfficeItemTypeCode = (code) => {
        const normalizedCode = normalizeItemTypeValue(code);
        const match = officeItemTypes.find(itemType => normalizeItemTypeValue(itemType.code) === normalizedCode);
        return match?.code || null;
    };

    const vehicleItemTypeCode = getEnabledOfficeItemTypeCode('VEHICLE');
    const trailerItemTypeCode = getEnabledOfficeItemTypeCode('TRAILER');
    const liftItemTypeCode = getEnabledOfficeItemTypeCode('LIFT');
    const hakiItemTypeCode = getEnabledOfficeItemTypeCode('HAKI');
    const aluItemTypeCode = getEnabledOfficeItemTypeCode('ALU');
    const accessoryItemTypeCode = getEnabledOfficeItemTypeCode('ACCESSORY');
    const toolItemTypeCode = getEnabledOfficeItemTypeCode('TOOL');

    const isVehicleEnabledForOffice = Boolean(vehicleItemTypeCode);
    const hasMachineInfoItem = (reservation?.reservationItems || []).some((item) => {
        const itemTypeCode = normalizeItemTypeCode(item?.itemTypeCode);
        return itemTypeCode === 'LIFT' || itemTypeCode === 'ALU' || itemTypeCode === 'TOOL' || itemTypeCode === 'HAKI';
    });
    const itemCategories = reservationFormOptions.itemCategories || [];
    const priceListOptions = (reservationFormOptions.priceLists || reservationFormOptions.PriceLists || [])
        .map((priceList) => ({
            id: priceList?.id ?? priceList?.Id,
            name: String(priceList?.name || priceList?.Name || '').trim(),
        }))
        .filter((priceList) => priceList.id !== null && priceList.id !== undefined && priceList.name);

    const itemCategoriesById = itemCategories.reduce((acc, category) => {
        const id = category?.id ?? category?.Id;
        if (id !== null && id !== undefined) {
            acc.set(Number(id), String(category?.name || category?.Name || ''));
        }
        return acc;
    }, new Map());

    const resolveInvoiceParty = (item) => {
        if (!item) {
            return 'customer';
        }

        if (item?.insuranceCompanyId || item?.isInsurance) {
            return 'insuranceCompany';
        }

        const categoryName = itemCategoriesById.get(Number(item?.debitCategoryId)) || '';
        if (normalizeText(categoryName).includes('intern')) {
            return 'internal';
        }

        return 'customer';
    };

    const createPartyTotals = () => ({
        customer: { exVat: 0, inclVat: 0 },
        insuranceCompany: { exVat: 0, inclVat: 0 },
        internal: { exVat: 0, inclVat: 0 },
    });

    const faktureringSummary = (reservation?.reservationCalcs || []).reduce((summary, calc, calcIndex) => {
        const reservationItem = reservation?.reservationItems?.[calcIndex] || null;
        const partyKey = resolveInvoiceParty(reservationItem);
        const rows = Array.isArray(calc?.reservationCalcItems) ? calc.reservationCalcItems : [];

        rows.forEach((row) => {
            const exVat = Number(row?.sum) || 0;
            const inclVat = getSumInclVat(row?.sum, row) || 0;

            summary.totalByParty[partyKey].exVat += exVat;
            summary.totalByParty[partyKey].inclVat += inclVat;

            const invoiceRows = Array.isArray(row?.invoiceRows) ? row.invoiceRows : [];
            invoiceRows.forEach((invoiceRow) => {
                const invoicedExVat = Number(invoiceRow?.sum) || 0;
                const vatRate = Number(invoiceRow?.vatRate ?? 0) || 0;
                const invoicedInclVat = Number((invoicedExVat * (1 + vatRate / 100)).toFixed(2));

                summary.invoicedByParty[partyKey].exVat += invoicedExVat;
                summary.invoicedByParty[partyKey].inclVat += invoicedInclVat;

                const invoice = invoiceRow?.invoice;
                const invoiceId = invoice?.id;
                if (!Number.isInteger(invoiceId)) {
                    return;
                }

                const existingInvoice = summary.invoiceById.get(invoiceId) || {
                    id: invoiceId,
                    invoiceNr: invoice?.invoiceNr ?? null,
                    invoiceDate: invoice?.invoiceDate ?? null,
                    customerName: invoice?.customerName || '',
                    invoiceType: invoice?.invoiceType || '',
                    isCancelled: Boolean(invoice?.isCancelled),
                    exVat: 0,
                    inclVat: 0,
                    partyKeys: new Set(),
                };

                existingInvoice.exVat += invoicedExVat;
                existingInvoice.inclVat += invoicedInclVat;
                existingInvoice.partyKeys.add(partyKey);
                summary.invoiceById.set(invoiceId, existingInvoice);
            });
        });

        return summary;
    }, {
        totalByParty: createPartyTotals(),
        invoicedByParty: createPartyTotals(),
        invoiceById: new Map(),
    });

    const amountLeftByParty = {
        customer: {
            exVat: faktureringSummary.totalByParty.customer.exVat - faktureringSummary.invoicedByParty.customer.exVat,
            inclVat: faktureringSummary.totalByParty.customer.inclVat - faktureringSummary.invoicedByParty.customer.inclVat,
        },
        insuranceCompany: {
            exVat: faktureringSummary.totalByParty.insuranceCompany.exVat - faktureringSummary.invoicedByParty.insuranceCompany.exVat,
            inclVat: faktureringSummary.totalByParty.insuranceCompany.inclVat - faktureringSummary.invoicedByParty.insuranceCompany.inclVat,
        },
        internal: {
            exVat: faktureringSummary.totalByParty.internal.exVat - faktureringSummary.invoicedByParty.internal.exVat,
            inclVat: faktureringSummary.totalByParty.internal.inclVat - faktureringSummary.invoicedByParty.internal.inclVat,
        },
    };

    const invoicePartyLabels = {
        customer: 'Kund',
        insuranceCompany: 'Försäkringsbolag',
        internal: 'Intern',
    };

    const invoicePartyReceiverTypeCodes = {
        customer: 'CUSTOMER',
        insuranceCompany: 'INSURANCECOMPANY',
        internal: 'INTERNAL',
    };

    const createdInvoices = Array.from(faktureringSummary.invoiceById.values())
        .sort((left, right) => {
            const leftTime = left?.invoiceDate ? new Date(left.invoiceDate).getTime() : 0;
            const rightTime = right?.invoiceDate ? new Date(right.invoiceDate).getTime() : 0;
            if (leftTime === rightTime) {
                return (right?.id || 0) - (left?.id || 0);
            }
            return rightTime - leftTime;
        });

    const debitPeriods = useMemo(() => {
        const reservationCalcs = Array.isArray(reservation?.reservationCalcs)
            ? reservation.reservationCalcs
            : [];

        return reservationCalcs.map((calc, calcIndex) => {
            const rows = Array.isArray(calc?.reservationCalcItems) ? calc.reservationCalcItems : [];
            const invoicesById = new Map();

            rows.forEach((row) => {
                const invoiceRows = Array.isArray(row?.invoiceRows) ? row.invoiceRows : [];

                invoiceRows.forEach((invoiceRow) => {
                    const invoice = invoiceRow?.invoice;
                    const invoiceId = invoice?.id;

                    if (!Number.isInteger(invoiceId) || invoicesById.has(invoiceId)) {
                        return;
                    }

                    invoicesById.set(invoiceId, {
                        id: invoiceId,
                        invoiceNr: invoice?.invoiceNr ?? null,
                    });
                });
            });

            const createdDateCandidate = calc?.createdDate || calc?.createdAt || calc?.modifiedDate || calc?.modifiedAt || null;
            const createdTimestamp = createdDateCandidate ? new Date(createdDateCandidate).getTime() : Number.NaN;

            return {
                key: `${calc?.id || 0}-${calcIndex}`,
                calcIndex,
                calcId: Number.isInteger(calc?.id) ? calc.id : 0,
                createdTimestamp: Number.isFinite(createdTimestamp) ? createdTimestamp : null,
                dateTimeFrom: calc?.dateTimeFrom ?? null,
                dateTimeTo: calc?.dateTimeTo ?? null,
                receiverTypeCode: calc?.receiverTypeCode || 'CUSTOMER',
                invoices: Array.from(invoicesById.values()),
            };
        });
    }, [reservation?.reservationCalcs]);

    const selectedDebitPeriod = selectedDebitCalcIndex === null
        ? null
        : debitPeriods.find((period) => period.calcIndex === selectedDebitCalcIndex) || null;

    const selectedReservationCalc = selectedDebitPeriod
        ? reservation?.reservationCalcs?.[selectedDebitPeriod.calcIndex] || null
        : null;

    const selectedReservationCalcRows = Array.isArray(selectedReservationCalc?.reservationCalcItems)
        ? selectedReservationCalc.reservationCalcItems
        : [];

    const selectedReservationItem = useMemo(() => {
        if (!selectedDebitPeriod) {
            return null;
        }

        const reservationItems = Array.isArray(reservation?.reservationItems) ? reservation.reservationItems : [];
        // ReservationCalcs aren't 1:1 with ReservationItems (an item can have several periods),
        // so match the calc to its item via the calc rows' itemId instead of the calc index.
        const matchedItemId = selectedReservationCalcRows.find((row) => Number.isInteger(row?.itemId))?.itemId;
        const matchedByItemId = Number.isInteger(matchedItemId)
            ? reservationItems.find((reservationItem) => reservationItem?.itemId === matchedItemId)
            : null;

        return matchedByItemId || reservationItems[selectedDebitPeriod.calcIndex] || null;
    }, [reservation?.reservationItems, selectedReservationCalcRows, selectedDebitPeriod]);

    useEffect(() => {
        if (debitPeriods.length === 0) {
            setSelectedDebitCalcIndex(null);
            return;
        }

        const hasSelectedPeriod = selectedDebitCalcIndex !== null
            && debitPeriods.some((period) => period.calcIndex === selectedDebitCalcIndex);

        if (hasSelectedPeriod) {
            return;
        }

        const latestPeriod = debitPeriods.reduce((latest, current) => {
            if (!latest) {
                return current;
            }

            const latestTimestamp = latest.createdTimestamp ?? Number.NEGATIVE_INFINITY;
            const currentTimestamp = current.createdTimestamp ?? Number.NEGATIVE_INFINITY;
            if (currentTimestamp !== latestTimestamp) {
                return currentTimestamp > latestTimestamp ? current : latest;
            }

            const latestId = Number.isInteger(latest.calcId) ? latest.calcId : 0;
            const currentId = Number.isInteger(current.calcId) ? current.calcId : 0;
            if (currentId !== latestId) {
                return currentId > latestId ? current : latest;
            }

            return current.calcIndex > latest.calcIndex ? current : latest;
        }, null);

        setSelectedDebitCalcIndex(latestPeriod?.calcIndex ?? debitPeriods[debitPeriods.length - 1].calcIndex);
    }, [debitPeriods, selectedDebitCalcIndex]);

    useEffect(() => {
        setSelectedDebitCalcIndex(null);
    }, [routeReservationId]);

    useEffect(() => {
        setOpenCalcMenu(null);
    }, [selectedDebitCalcIndex]);

    const canCreateInvoices = Number(reservation?.id) > 0;

    const handleCreateInvoice = async (partyKey) => {
        if (!canCreateInvoices) {
            setMessages([{ type: 'error', text: 'Spara bokningen innan du skapar faktura' }]);
            return;
        }

        if (isCheckingInvoiceItems) {
            return;
        }

        const receiverTypeCode = invoicePartyReceiverTypeCodes[partyKey] || invoicePartyReceiverTypeCodes.customer;
        const query = new URLSearchParams({
            reservationId: String(reservation.id),
            receiverTypeCode,
        });

        setIsCheckingInvoiceItems(true);
        setShowNoInvoiceItemsModal(false);

        try {
            const response = await apiClient.get(`/invoice/reservation/${reservation.id}/has-uninvoiced-items`, {
                params: { receiverTypeCode },
            });

            if (!response?.data?.hasUninvoicedItems) {
                setShowNoInvoiceItemsModal(true);
                return;
            }

            navigate(`/finance/invoice/new?${query.toString()}`);
        } catch (error) {
            setMessages([{ type: 'error', text: formatErrorMessage(error) }]);
        } finally {
            setIsCheckingInvoiceItems(false);
        }
    };


    const hasUnsavedChanges = () => {
        if (skipUnsavedGuardRef.current) {
            return false;
        }

        if (!reservation || !originalReservation) {
            return false;
        }

        const normalizedCurrent = normalizeReservationForComparison(reservation);
        const normalizedOriginal = normalizeReservationForComparison(originalReservation);

        return JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
    };


    const handleUnsavedWarningConfirm = () => {
        setShowUnsavedWarning(false);

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.proceed();
        }
    };

    const handleUnsavedWarningClose = () => {
        setShowUnsavedWarning(false);

        if (navigationBlocker.state === 'blocked') {
            navigationBlocker.reset();
        }
    };

    const navigationBlocker = useBlocker(({ currentLocation, nextLocation }) => {
        return hasUnsavedChanges() && currentLocation.pathname !== nextLocation.pathname;
    });

    useEffect(() => {
        if (navigationBlocker.state === 'blocked') {
            setShowUnsavedWarning(true);
        }
    }, [navigationBlocker.state]);

    useEffect(() => {
        function handleBeforeUnload(event) {
            if (!hasUnsavedChanges()) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [reservation, originalReservation]);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleSelectCustomer = (customerData) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => ({
            ...prev,
            customerId: customerData.id,
            customerOrgNr: customerData.orgNr || '',
            customerName: customerData.customerName,
            address: customerData.street1 || '',
            zipCode: customerData.zipCode || '',
            email: customerData.email || '',
            mobilePhone: customerData.mobilePhone || '',
        }));
    };

    const handleChange = (field, value) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleItemChange = (index, field, value) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => {
            const newItems = [...(prev.reservationItems || [])];
            newItems[index] = {
                ...newItems[index],
                [field]: value
            };

            const changedItem = newItems[index];
            const shouldSyncAccessories = isVehicleItem(changedItem) && ITEM_PERIOD_FIELDS.includes(field);
            const syncedItems = shouldSyncAccessories
                ? syncAccessoryPeriodsWithVehicle(newItems).items
                : newItems;

            return {
                ...prev,
                reservationItems: syncedItems
            };
        });
    };

    const handleLamnaUt = () => {
        const items = reservation?.reservationItems || [];
        const vehicleIndex = items.findIndex(isVehicleItem);
        if (vehicleIndex === -1) {
            return;
        }

        handleItemChange(vehicleIndex, 'actualFrom', getNowRoundedToNearestQuarterHour());
    };

    const handleAterlamna = () => {
        const items = reservation?.reservationItems || [];
        const vehicleIndex = items.findIndex(isVehicleItem);
        if (vehicleIndex === -1) {
            return;
        }

        handleItemChange(vehicleIndex, 'actualTo', getNowRoundedToNearestQuarterHour());
    };

    const handleRemoveItem = (index) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => {
            const nextItems = (prev.reservationItems || []).filter((_, i) => i !== index);
            const synced = syncAccessoryPeriodsWithVehicle(nextItems);

            return {
                ...prev,
                reservationItems: synced.items
            };
        });
    };

    const handleCalcItemChange = (calcIndex, rowIndex, field, value) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        setReservation(prev => {
            if (!prev) {
                return prev;
            }

            const reservationCalcs = [...(prev.reservationCalcs || [])];
            const currentCalc = {
                ...(reservationCalcs[calcIndex] || {
                    id: 0,
                    dateTimeFrom: null,
                    dateTimeTo: null,
                    reservationCalcItems: [],
                })
            };

            const rows = [...(currentCalc.reservationCalcItems || [])];
            const row = {
                ...(rows[rowIndex] || {
                    id: 0,
                    itemId: null,
                    text: '',
                    calcPriceTypeCode: 'FREETEXT',
                    qty: 1,
                    unitPrice: null,
                    discount: null,
                    sum: null,
                    vatId: null,
                    vatRate: 25,
                })
            };

            if (field === 'text') {
                row[field] = value;
            } else {
                row[field] = value === '' ? null : toNumberOrNull(value);
            }

            if (field === 'qty' || field === 'unitPrice' || field === 'discount') {
                const qty = Number(row?.qty ?? 0);
                const unitPrice = Number(row?.unitPrice ?? 0);
                const discount = Number(row?.discount ?? 0);
                const calculatedSum = qty * unitPrice - discount;
                row.sum = Number.isFinite(calculatedSum) ? Number(calculatedSum.toFixed(2)) : null;
            }

            rows[rowIndex] = row;
            currentCalc.reservationCalcItems = rows;
            reservationCalcs[calcIndex] = currentCalc;

            return {
                ...prev,
                reservationCalcs,
            };
        });
    };

    const handleAddCalcRow = (calcIndex, item, insertAfterRowIndex = null) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        setReservation(prev => {
            if (!prev) {
                return prev;
            }

            const reservationCalcs = [...(prev.reservationCalcs || [])];
            const currentCalc = {
                ...(reservationCalcs[calcIndex] || {
                    id: 0,
                    dateTimeFrom: null,
                    dateTimeTo: null,
                    reservationCalcItems: [],
                })
            };

            const rows = [...(currentCalc.reservationCalcItems || [])];
            const newRow = {
                id: 0,
                itemId: Number.isInteger(item?.itemId) ? item.itemId : null,
                text: '',
                calcPriceTypeCode: 'FREETEXT',
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatId: null,
                vatRate: 25,
            };

            if (Number.isInteger(insertAfterRowIndex) && insertAfterRowIndex >= 0 && insertAfterRowIndex < rows.length) {
                rows.splice(insertAfterRowIndex + 1, 0, newRow);
            } else {
                rows.push(newRow);
            }

            currentCalc.reservationCalcItems = rows;
            reservationCalcs[calcIndex] = currentCalc;

            return {
                ...prev,
                reservationCalcs,
            };
        });
    };

    const handleRemoveCalcRow = (calcIndex, rowIndex, item) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        setReservation(prev => {
            if (!prev) {
                return prev;
            }

            const reservationCalcs = [...(prev.reservationCalcs || [])];
            const currentCalc = {
                ...(reservationCalcs[calcIndex] || {
                    id: 0,
                    dateTimeFrom: null,
                    dateTimeTo: null,
                    reservationCalcItems: [],
                })
            };

            const currentRows = [...(currentCalc.reservationCalcItems || [])];
            let nextRows = currentRows.filter((_, index) => index !== rowIndex);

            if (nextRows.length === 0) {
                nextRows = getDefaultCalcRowsForItem(item);
            }

            currentCalc.reservationCalcItems = nextRows;
            reservationCalcs[calcIndex] = currentCalc;

            return {
                ...prev,
                reservationCalcs,
            };
        });
    };

    const closeCalcMenu = () => {
        setOpenCalcMenu(null);
    };

    useEffect(() => {
        const handlePointerDown = (event) => {
            const menuRoot = event.target?.closest?.('[data-calc-menu-root="true"]');
            if (!menuRoot) {
                closeCalcMenu();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    const closeAccessorySelectModal = () => {
        setShowAccessorySelectModal(false);
    };

    const handleAddAccessoryClick = () => {
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setShowAccessorySelectModal(true);
    };

    const handleSelectAccessory = (selectedItem) => {
        if (!selectedItem) {
            return;
        }

        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        setReservation(prev => {
            const existingItems = prev?.reservationItems || [];
            const vehiclePeriod = getPrimaryVehiclePeriod(existingItems);
            const shouldCopyVehiclePeriod = Boolean(vehiclePeriod);

            const newItem = {
                itemTypeCode: accessoryItemTypeCode,
                itemId: Number.isInteger(selectedItem?.id) ? selectedItem.id : null,
                itemName: selectedItem?.itemNr || '',
                itemNr: selectedItem?.itemNr || '',
                regNr: selectedItem?.regNr || '',
                manufacturer: selectedItem?.manufacturer || '',
                category: selectedItem?.itemCategoryName || '',
                model: selectedItem?.itemModelName || '',
                itemNote: selectedItem?.note || '',
                bookedFrom: shouldCopyVehiclePeriod ? vehiclePeriod.bookedFrom : '',
                bookedTo: shouldCopyVehiclePeriod ? vehiclePeriod.bookedTo : '',
                actualFrom: shouldCopyVehiclePeriod ? vehiclePeriod.actualFrom : '',
                actualTo: shouldCopyVehiclePeriod ? vehiclePeriod.actualTo : ''
            };

            const nextItems = [...existingItems, newItem];
            const synced = syncAccessoryPeriodsWithVehicle(nextItems);

            return {
                ...prev,
                reservationItems: synced.items
            };
        });

        closeAccessorySelectModal();
    };

    const handleAddItem = (itemTypeCode) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setReservation(prev => {
            const existingItems = prev?.reservationItems || [];
            const vehiclePeriod = getPrimaryVehiclePeriod(existingItems);
            const shouldCopyVehiclePeriod = normalizeItemTypeValue(itemTypeCode) === 'ACCESSORY' && Boolean(vehiclePeriod);

            const newItem = {
                itemTypeCode: itemTypeCode,
                bookedFrom: shouldCopyVehiclePeriod ? vehiclePeriod.bookedFrom : '',
                bookedTo: shouldCopyVehiclePeriod ? vehiclePeriod.bookedTo : '',
                actualFrom: shouldCopyVehiclePeriod ? vehiclePeriod.actualFrom : '',
                actualTo: shouldCopyVehiclePeriod ? vehiclePeriod.actualTo : ''
            };

            const nextItems = [...existingItems, newItem];
            const synced = syncAccessoryPeriodsWithVehicle(nextItems);

            return {
                ...prev,
                reservationItems: synced.items
            };
        });
    };

    const formatDateTimeLocal = (value) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return '';
        }

        const year = value.getFullYear();
        const month = `${value.getMonth() + 1}`.padStart(2, '0');
        const day = `${value.getDate()}`.padStart(2, '0');
        const hours = `${value.getHours()}`.padStart(2, '0');
        const minutes = `${value.getMinutes()}`.padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const applyTimeOfDay = (value, timeOfDay) => {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return '';
        }

        const normalizedTimeOfDay = String(timeOfDay ?? '').trim();
        if (!TIME_OF_DAY_PATTERN.test(normalizedTimeOfDay)) {
            return formatDateTimeLocal(value);
        }

        const [hoursText, minutesText] = normalizedTimeOfDay.split(':');
        const nextValue = new Date(value);
        nextValue.setHours(Number(hoursText), Number(minutesText), 0, 0);
        return formatDateTimeLocal(nextValue);
    };

    const handleCarSearch = ({ period, category, model, selectedCar }) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        setReservation(prev => {
            const selectedRegNr = selectedCar?.regNr || selectedCar?.regnr || '';
            const selectedManufacturer = selectedCar?.manufacturer || '';
            const selectedCategory = selectedCar?.itemCategoryName || selectedCar?.categoryName || selectedCar?.category || category || '';
            const selectedModel = selectedCar?.itemModelName || selectedCar?.modelName || selectedCar?.model || model || '';
            const selectedYearModel = selectedCar?.yearModel || selectedCar?.yearmodel || '';
            const defaultBookedFromTime = String(reservationFormOptions?.defaultBookedFromTime ?? '').trim();
            const defaultBookedToTime = String(reservationFormOptions?.defaultBookedToTime ?? '').trim();

            const newItem = {
                itemTypeCode: 'VEHICLE',
                itemId: Number.isInteger(selectedCar?.id) ? selectedCar.id : null,
                itemNr: selectedCar?.itemNr || '',
                regNr: selectedRegNr,
                manufacturer: selectedManufacturer,
                category: selectedCategory,
                model: selectedModel,
                yearModel: selectedYearModel,
                bookedFrom: applyTimeOfDay(period?.from, defaultBookedFromTime),
                bookedTo: applyTimeOfDay(period?.to, defaultBookedToTime),
                actualFrom: '',
                actualTo: ''
            };

            const nextItems = [...(prev?.reservationItems || []), newItem];
            const synced = syncAccessoryPeriodsWithVehicle(nextItems);

            return {
                ...prev,
                reservationItems: synced.items
            };
        });
    };

    const handleBackClick = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        window.close();
    };

    const resolveCalculateToDate = (reservationData) => {
        const vehicleItem = (reservationData?.reservationItems || []).find(isVehicleItem);
        if (!vehicleItem) {
            return null;
        }

        const calculateToDate = vehicleItem?.actualTo || vehicleItem?.bookedTo;
        if (!calculateToDate) {
            return null;
        }

        return calculateToDate;
    };


    const getReservationById = async (id, { dedupe = false, isActive = () => true } = {}) => {
        console.log('getReservationById', id);
        if (id === 'new') {
            const newReservation = {
                id: 0,
                customerName: '',
                customerOrgNr: '',
                mobilePhone: '',
                priceListId: null,
                driverName: '',
                pickUpBy: '',
                telephoneWorkplace: '',
                deliveryPlace: '',
                customerMarking: '',
                pricingCalendarCode: 'ALLDAYS',
                note: '',
                reservationItems: []
            };
            setReservation(newReservation);
            setOriginalReservation(JSON.parse(JSON.stringify(newReservation)));
            skipUnsavedGuardRef.current = false;
            return newReservation;
        }

        const fetchReservation = async () => {
            const queryParams = '';
            const response = await apiClient.get(`/reservation/${id}${queryParams}`);
            const data = response.data;

            const attachments = (
                Array.isArray(data?.attachments)
                    ? data.attachments
                    : []
            ).map(att => ({
                ...att,
                url: att.path ?? ''
            }));

            return { ...data, attachments };
        };

        try {
            const reservationData = dedupe
                ? await getSharedRequest(`reservation:${id}`, fetchReservation)
                : await fetchReservation();

            if (!isActive()) {
                return reservationData;
            }

            const synced = syncAccessoryPeriodsWithVehicle(reservationData?.reservationItems || []);
            const normalizedReservationData = normalizeReservationForComparison({
                ...reservationData,
                reservationItems: synced.items,
            });

            setReservation(normalizedReservationData);
            setOriginalReservation(JSON.parse(JSON.stringify(normalizedReservationData)));
            skipUnsavedGuardRef.current = false;
            try { setBadges && setBadges(defaultBadges); } catch { /* ignore if unavailable */ }
            return normalizedReservationData;
        }
        catch (error) {
            if (!isActive()) {
                return null;
            }

            console.error('Error getting reservation by ID:', error);
            navigate('/something-went-wrong');
            return null;
        }
    }

    const getReservationFormOptions = async ({ dedupe = false, isActive = () => true } = {}) => {
        const fetchFormOptions = async () => {
            const response = await apiClient.get('/reservation/form-options');
            return response?.data || {
                itemTypes: [],
                itemCategories: [],
                priceLists: [],
                defaultBookedFromTime: '',
                defaultBookedToTime: '',
            };
        };

        try {
            const formOptions = dedupe
                ? await getSharedRequest('reservation-form-options', fetchFormOptions)
                : await fetchFormOptions();

            if (!isActive()) {
                return formOptions;
            }

            setReservationFormOptions(formOptions);
            return formOptions;
        } catch (error) {
            if (!isActive()) {
                return {
                    itemTypes: [],
                    itemCategories: [],
                    priceLists: [],
                    defaultBookedFromTime: '',
                    defaultBookedToTime: '',
                };
            }

            console.error('Error getting reservation form options:', error);
            setReservationFormOptions({
                itemTypes: [],
                itemCategories: [],
                priceLists: [],
                defaultBookedFromTime: '',
                defaultBookedToTime: '',
            });
            return {
                itemTypes: [],
                itemCategories: [],
                priceLists: [],
                defaultBookedFromTime: '',
                defaultBookedToTime: '',
            };
        }
    }

    const saveReservationAndRefresh = async ({ showSuccessMessage = true, reloadPdf = true } = {}) => {
        if (!reservation) {
            return null;
        }

        const reservationData = sanitizeReservationForSave(reservation);

        try {
            let reservationId = reservation.id;

            // POST to create/update reservation
            const res = await apiClient.post('/reservation', reservationData);
            reservationId = res.data;

            // Refresh the reservation data from API
            const refreshedReservation = await getReservationById(reservationId, { dedupe: false });
            const normalizedRefreshedReservation = normalizeReservationForComparison(refreshedReservation);
            setReservation(normalizedRefreshedReservation);
            setOriginalReservation(JSON.parse(JSON.stringify(normalizedRefreshedReservation)));

            if (showSuccessMessage) {
                setMessages([{ type: 'success', text: 'Bokningen sparad' }]);
            }

            // Navigate if ID changed (from new → ID)
            if (`${routeReservationId}` !== `${reservationId}`) {
                skipUnsavedGuardRef.current = true;
                consumedSavedReservationRouteRef.current = `${reservationId}`;
                if (normalizedRefreshedReservation) {
                    savedReservationRouteCache.set(`${reservationId}`, {
                        reservation: normalizedRefreshedReservation,
                        reservationFormOptions,
                        messages: showSuccessMessage ? [{ type: 'success', text: 'Bokningen sparad' }] : [],
                    });
                    setTimeout(() => {
                        savedReservationRouteCache.delete(`${reservationId}`);
                    }, SAVED_RESERVATION_ROUTE_CACHE_TTL_MS);
                } else {
                    savedReservationRouteCache.delete(`${reservationId}`);
                }
                navigate(`/operations/reservation/${reservationId}`, { replace: true });
            }

            clearStale?.();
            // Reload the PDF after successful save without triggering unsaved warning
            if (reloadPdf && showPdfPanel) {
                await getPdf({ ignoreUnsaved: true });
            }

            return normalizedRefreshedReservation;
        } catch (error) {
            setMessages([{ type: 'error', text: formatErrorMessage(error) }]);
            return null;
        }
    };

    const submitReservation = async (e) => {
        e?.preventDefault?.();
        await saveReservationAndRefresh({ showSuccessMessage: true, reloadPdf: true });
    };

    const handleCalculatePrice = async () => {
        if (!reservation) {
            setMessages([{ type: 'error', text: 'Kunde inte läsa bokningen' }]);
            return;
        }

        if (!reservation?.priceListId) {
            setMessages([{ type: 'error', text: 'Välj prislista innan priset beräknas' }]);
            return;
        }

        setIsCalculatingPrice(true);
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        try {
            let reservationForCalculation = reservation;

            if (hasUnsavedChanges() || Number(reservationForCalculation?.id) <= 0) {
                const savedReservation = await saveReservationAndRefresh({
                    showSuccessMessage: false,
                    reloadPdf: false,
                });

                if (!savedReservation) {
                    return;
                }

                reservationForCalculation = savedReservation;
            }

            if (Number(reservationForCalculation?.id) <= 0) {
                setMessages([{ type: 'error', text: 'Spara bokningen innan priset beräknas' }]);
                return;
            }

            const calculateToDate = resolveCalculateToDate(reservationForCalculation);
            if (!calculateToDate) {
                setMessages([{ type: 'error', text: 'Sätt Bokad till eller Faktisk till på fordonet innan priset beräknas' }]);
                return;
            }

            const existingCalculationIds = new Set(
                (reservationForCalculation?.reservationCalcs || [])
                    .map((calculation) => calculation?.id)
                    .filter((calculationId) => Number.isInteger(calculationId) && calculationId > 0)
            );

            await apiClient.post('/pricing/execute-reservation-calc', {
                reservationId: Number(reservationForCalculation.id),
                calculateToDate,
            });

            const refreshedReservation = await getReservationById(reservationForCalculation.id, { dedupe: false });
            const newCalculationIndex = (refreshedReservation?.reservationCalcs || []).findIndex(
                (calculation) => Number.isInteger(calculation?.id)
                    && calculation.id > 0
                    && !existingCalculationIds.has(calculation.id)
            );

            if (newCalculationIndex >= 0) {
                setSelectedDebitCalcIndex(newCalculationIndex);
            }

            clearStale?.();
            setMessages([{ type: 'success', text: 'Pris beräknat' }]);
        } catch (error) {
            setMessages([{ type: 'error', text: formatErrorMessage(error) }]);
        } finally {
            setIsCalculatingPrice(false);
        }
    };

    const deleteReservation = async () => {
        if (!reservation?.id) {
            console.error('No reservation ID to delete');
            return;
        }

        setShowDeleteConfirm(false);

        try {
            await apiClient.delete(`/reservation/${reservation.id}`);
        } catch (error) {
            const errorText = formatErrorMessage(error);
            if (errorText) {
                setMessages([{ type: 'error', text: errorText || 'Kunde inte ta bort förfrågan' }]);
                return;
            }
            console.error('Error deleting reservation:', error);
            setMessages([{ type: 'error', text: 'Ett fel uppstod vid borttagning' }]);
            return;
        }
        setMessages([{ type: 'success', text: 'Fakturan borttagen' }]);
        // Navigate back to a list or home page after deletion
        setTimeout(() => {
            navigate('/sales/inquiries');
        }, 1000);
    };

    const getPdf = async ({ ignoreUnsaved = false } = {}) => {
        if (!reservation) return;

        if (!ignoreUnsaved && hasUnsavedChanges()) {
            // setPendingAction('pdf');
            setShowUnsavedWarning(true);
            return;
        }

        // Open the PDF panel immediately
        openPdfPreview('');

        try {
            const res = await apiClient.get(`/pdf/reservation/${reservation.id}`, {
                responseType: 'blob',
            });
            console.log('Response ok:', true, 'content-type:', res.headers['content-type']);
            const blob = res.data;
            console.log('Blob size:', blob.size, 'type:', blob.type);
            const url = URL.createObjectURL(blob);
            openPdfPreview(url); // update the panel with the real PDF
        } catch (error) {
            console.error('Error getting reservation PDF:', error);
            // Optional: toast.error('Kunde inte ladda PDF');
            // Optional: keep panel open to show an error state in PdfPanel
        }
    };


    // Initial data fetching - runs when ID changes
    useEffect(() => {
        if (consumedSavedReservationRouteRef.current && consumedSavedReservationRouteRef.current !== `${routeReservationId}`) {
            consumedSavedReservationRouteRef.current = null;
        }

        if (consumedSavedReservationRouteRef.current === `${routeReservationId}`) {
            skipUnsavedGuardRef.current = false;
            setInitialLoadPending(false);
            setLoading(false);
            return;
        }

        const savedReservationEntry = savedReservationRouteCache.get(`${routeReservationId}`);
        if (savedReservationEntry) {
            consumedSavedReservationRouteRef.current = `${routeReservationId}`;
            savedReservationRouteCache.delete(`${routeReservationId}`);
            skipUnsavedGuardRef.current = false;
            setReservation(savedReservationEntry.reservation);
            setOriginalReservation(JSON.parse(JSON.stringify(savedReservationEntry.reservation)));
            setReservationFormOptions(savedReservationEntry.reservationFormOptions);
            setMessages(savedReservationEntry.messages ?? []);
            setInitialLoadPending(false);
            setLoading(false);
            return;
        }

        let isActive = true;
        let skeletonDelayTimer = null;

        const loadInitialData = async () => {
            setInitialLoadPending(true);
            setLoading(false);
            skeletonDelayTimer = setTimeout(() => {
                if (isActive) {
                    setLoading(true);
                }
            }, SKELETON_SHOW_DELAY_MS);

            try {
                await Promise.all([
                    getReservationFormOptions({ dedupe: true, isActive: () => isActive }),
                    getReservationById(routeReservationId, { dedupe: true, isActive: () => isActive })
                ]);

                if (SKELETON_TEST_DELAY_MS > 0) {
                    await wait(SKELETON_TEST_DELAY_MS);
                }
            } finally {
                if (skeletonDelayTimer) {
                    clearTimeout(skeletonDelayTimer);
                }

                if (isActive) {
                    setInitialLoadPending(false);
                    setLoading(false);
                }
            }
        };

        loadInitialData();

        return () => {
            isActive = false;
            if (skeletonDelayTimer) {
                clearTimeout(skeletonDelayTimer);
            }
        };
    }, [routeReservationId]);

    useEffect(() => {
        setReservation(prev => {
            if (!prev) {
                return prev;
            }

            const existingCalcs = Array.isArray(prev.reservationCalcs) ? prev.reservationCalcs : [];

            let hasChanges = false;

            const nextCalcs = existingCalcs.map((existingCalc) => {
                const existingRows = Array.isArray(existingCalc?.reservationCalcItems)
                    ? existingCalc.reservationCalcItems
                    : [];

                const normalizedRows = existingRows.map((row) => ({
                    ...row,
                    itemId: row?.itemId ?? null,
                    discount: row?.discount ?? null,
                    vatId: row?.vatId ?? null,
                    vatRate: parseVatRateValue(row?.vatRate) ?? parseVatRateValue(row?.vatCode) ?? 25,
                    calcPriceTypeCode: row?.calcPriceTypeCode || 'FREETEXT',
                }));

                if (JSON.stringify(existingRows) !== JSON.stringify(normalizedRows)) {
                    hasChanges = true;
                }

                return {
                    id: existingCalc?.id || 0,
                    dateTimeFrom: existingCalc?.dateTimeFrom ?? null,
                    dateTimeTo: existingCalc?.dateTimeTo ?? null,
                    receiverTypeCode: existingCalc?.receiverTypeCode || 'CUSTOMER',
                    reservationCalcItems: normalizedRows,
                };
            });

            if (!hasChanges) {
                const prevSerialized = JSON.stringify(existingCalcs);
                const nextSerialized = JSON.stringify(nextCalcs);
                hasChanges = prevSerialized !== nextSerialized;
            }

            if (!hasChanges) {
                return prev;
            }

            return {
                ...prev,
                reservationCalcs: nextCalcs,
            };
        });
    }, [reservation?.reservationItems]);

    // Cleanup: close PDF panel when component unmounts (navigating away)
    useEffect(() => {
        return () => {
            closePdfPreview?.();
        };
    }, [closePdfPreview]);



    if (loading) {
        return (
            <div className="relative flex flex-col h-full md:px-[clamp(4px,3vw,6vw)] animate-pulse">
                <div className="mt-1 flex min-h-0 flex-1 flex-col">
                    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-start">
                        <div className="mt-6 mb-8 pr-3 border-b border-gray-300 lg:mb-6 lg:self-stretch lg:border-b-0 lg:border-r">
                            <aside className="text-gray-700 lg:sticky lg:top-[calc(52px+72px+1rem)] lg:z-10 lg:self-start">
                                <div className="space-y-4 pr-0 pb-4 ml-2">
                                    <h2 className="text-4 text-center text-gray-700 text-sm">Info</h2>
                                    <div className="space-y-2 text-xs text-gray-600">
                                        <div className="h-4 bg-gray-200 rounded w-[92%]" />
                                        <div className="h-4 bg-gray-200 rounded w-[88%]" />
                                    </div>
                                </div>
                                
                                <div className="border-b border-gray-300" />

                                <div className="space-y-4 pr-0 py-4 ml-2">
                                    <h2 className="text-4 text-center text-gray-500 text-sm mb-2">Meddelanden</h2>
                                    <div className="space-y-2 text-xs text-gray-600">
                                        <div className="h-6 bg-gray-200 rounded" />
                                        <div className="h-6 bg-gray-200 rounded w-[92%]" />
                                    </div>
                                </div>

                                <div className="border-b border-gray-300" />
                            </aside>
                        </div>

                        <div className="flex-grow lg:pl-2 pb-10 mr-20">
                            <div className="h-4 bg-gray-200 rounded w-52 mb-3" />

                            <div className="flex justify-between w-full mb-4">
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="h-8 bg-gray-200 rounded w-24" />
                                    <div className="h-8 bg-gray-200 rounded w-20" />
                                    <div className="h-8 bg-gray-200 rounded w-24" />
                                    <div className="h-8 bg-gray-200 rounded w-28" />
                                    <div className="ml-20 flex items-center flex-wrap gap-3">
                                        <div className="h-8 bg-gray-200 rounded w-24" />
                                        <div className="h-8 bg-gray-200 rounded w-28" />
                                        <div className="h-8 bg-gray-200 rounded w-24" />
                                    </div>
                                    <div className="ml-10 h-8 bg-gray-200 rounded w-32" />
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="h-8 bg-gray-200 rounded w-24" />
                                </div>
                            </div>

                            <div className="grid grid-cols-[350px_auto_auto_1fr_auto] gap-15">
                                <div className="space-y-3">
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded w-[92%]" />
                                </div>
                                <div className="space-y-3 min-w-[280px]">
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                </div>
                                <div className="space-y-3 min-w-[320px]">
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                    <div className="h-6 bg-gray-200 rounded" />
                                </div>
                                <div className="space-y-3 min-w-[260px]">
                                    <div className="h-12 bg-gray-200 rounded" />
                                    <div className="h-20 bg-gray-200 rounded" />
                                </div>
                                <div className="w-52 space-y-3">
                                    <div className="h-6 bg-gray-200 rounded" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-3 mt-4">
                                <div className="h-4 bg-gray-200 rounded w-20 mr-2" />
                                <div className="h-7 bg-gray-200 rounded w-20" />
                                <div className="h-7 bg-gray-200 rounded w-16" />
                                <div className="h-7 bg-gray-200 rounded w-16" />
                                <div className="h-7 bg-gray-200 rounded w-16" />
                                <div className="h-7 bg-gray-200 rounded w-24" />
                            </div>

                            <div className="ml-3 mt-6 space-y-3">
                                <div className="h-24 bg-gray-200 rounded" />
                                <div className="h-24 bg-gray-200 rounded" />
                            </div>

                            <div className="ml-3 mt-4">
                                <div className="grid grid-cols-[1fr_3fr_3fr] gap-10 rounded-sm border border-gray-300 bg-sky-50/50 p-3 pb-5">
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-28" />
                                        <div className="h-14 bg-gray-200 rounded" />
                                        <div className="h-14 bg-gray-200 rounded" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-24" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                        <div className="h-8 bg-gray-200 rounded w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (initialLoadPending) {
        return <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(4px,3vw,6vw)]" />;
    }

    return (
        <div className="flex h-full min-h-full w-full flex-1 flex-col px-0 py-0 md:px-[clamp(4px,3vw,6vw)]">

            {/* Customer Search Modal */}
            <CustomerSearchModal
                isOpen={showCustomerSearch}
                onClose={() => setShowCustomerSearch(false)}
                onSelectCustomer={handleSelectCustomer}
            />

            <AccessorySelectModal
                isOpen={showAccessorySelectModal}
                onClose={closeAccessorySelectModal}
                onSelect={handleSelectAccessory}
                itemTypeCode={accessoryItemTypeCode}
                selectedPeriod={getPrimaryVehiclePeriod(reservation?.reservationItems || [])}
            />

            <CarSearchModal
                isOpen={showCarSearchModal}
                onClose={() => setShowCarSearchModal(false)}
                onSearch={handleCarSearch}
                showAvailabilityPanel={true}
            />

            {/* Unsaved Changes Warning Modal */}
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={handleUnsavedWarningClose}
                onConfirm={handleUnsavedWarningConfirm}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vänligen spara fakturan innan du fortsätter."
                confirmText="Fortsätt"
                cancelText="Stanna kvar"
                isDestructive={false}
            />

            <ConfirmationModal
                isOpen={showNoInvoiceItemsModal}
                onClose={() => setShowNoInvoiceItemsModal(false)}
                onConfirm={() => setShowNoInvoiceItemsModal(false)}
                title="INGEN NY PRISBERÄKNING"
                message="Det finns ingen ny prisberäkning att fakturera för denna mottagare. Ingen ny faktura skapades."
                confirmText="Stäng"
                singleAction={true}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50 z-40" />
                    <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={() => setShowDeleteConfirm(false)}>
                        <div
                            className="relative bg-white rounded-sm shadow-xl max-w-xl w-full mx-4 p-6"
                            style={{ background: 'rgb(255, 255, 234)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative flex items-center justify-center mb-4">
                                <h2 className="text-sm font-semibold text-center">
                                    BEKRÄFTA BORTTAGNING
                                </h2>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="absolute right-0 text-gray-400 hover:text-gray-600 text-l leading-none mb-1"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="mx-10 mt-7">
                                <p className="text-xs text-gray-700 mb-6">
                                    Är du säker på att du vill ta bort denna bokning? Denna åtgärd kan inte ångras.
                                </p>
                                <div className="flex gap-4 mt-6 mb-3 pt-4 justify-end">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={deleteReservation}
                                        className="shadow-md/30 text-xs text-white bg-red-600 hover:bg-red-800 px-10 p-[5px]"
                                    >
                                        Ta bort
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className='mt-1 flex min-h-0 flex-1 flex-col'>

                <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-start">

                    <div className="mt-6 mb-8 pr-3 border-b border-gray-300 lg:mb-6 lg:self-stretch lg:border-b-0 lg:border-r">
                        <aside className="lg:sticky lg:top-[calc(52px+72px+1rem)] lg:z-10 lg:self-start">
                            <div className="space-y-4 pr-0 pb-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm">Info</h2>
                                <div className="space-y-2 text-xs text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                    {renderMetaRow('Skapad:', reservation?.createdDate, formatUserName(reservation?.createdByUserName))}
                                    {renderMetaRow('Redigerad:', reservation?.modifiedDate, formatUserName(reservation?.modifiedByUserName))}
                                </div>
                            </div>

                            <div className="border-b border-gray-300" />

                            <div className="space-y-4 pr-0 py-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm mb-2">Meddelanden</h2>
                                <div className="space-y-2 text-xs text-gray-600">
                                    {messages.length === 0 && (
                                        <div className="px-3 pb-2 text-center text-xs text-gray-500">
                                            Inga meddelanden
                                        </div>
                                    )}

                                    {messages.map((message, index) => (
                                        <div
                                            key={message.id ?? `${message.type}-${message.text}-${index}`}
                                            className={`rounded-sm border px-3 py-2 text-xs text-center ${message.type === 'error'
                                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                                : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                                }`}
                                        >
                                            {typeof message.text === 'string' ? message.text : JSON.stringify(message.text)}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-b border-gray-300" />
                        </aside>
                    </div>

                    {/* <div className="mx-10 w-px self-stretch bg-gray-300" /> */}

                    <div className='flex-grow lg:pl-2 pb-10 mr-20'>
                        <h2 className="pb-3 text-sm text-gray-500 tracking-[0.10em] font-semibold">{reservation?.id ? (<>BOKNING <span className="ml-2">Nr. {reservation?.id}</span></>) : ("Ny bokning")}</h2>

                        <form onSubmit={submitReservation} autoComplete='off'>
                            <div className="flex justify-between w-full mb-4">
                                <div className='flex items-center gap-6 flex-wrap'>
                                    <ActionButton
                                        label="Tillbaka"
                                        icon={ArrowLeft}
                                        onClick={handleBackClick}
                                        accent="sky"
                                    />
                                    <ActionButton
                                        label="Spara"
                                        icon={Save}
                                        onClick={submitReservation}
                                        accent="lime"
                                    />
                                    {reservation?.id != 0 && (
                                        <ActionButton
                                            label="Skriv ut"
                                            icon={Printer}
                                            onClick={getPdf}
                                            accent="sky"
                                        />
                                    )}
                                    <ActionButton
                                        label="Välj kund"
                                        icon={Search}
                                        onClick={() => setShowCustomerSearch(true)}
                                        accent="teal"
                                    />
                                    <div className='ml-20 flex items-center flex-wrap gap-3'>
                                        <ActionButton
                                            label="Lämna ut"
                                            icon={ArrowRight}
                                            onClick={handleLamnaUt}
                                            accent="yellow"
                                        />
                                        <ActionButton
                                            label="Återlämna"
                                            icon={RotateCcw}
                                            onClick={handleAterlamna}
                                            accent="yellow"
                                        />
                                        <ActionButton
                                            label="Checka in"
                                            icon={CheckCircle2}
                                            onClick={() => { }}
                                            accent="yellow"
                                        />
                                    </div>
                                    <div className='ml-10'>
                                        <ActionButton
                                            label={isCalculatingPrice ? 'Beräknar...' : 'Beräkna pris'}
                                            icon={Euro}
                                            onClick={handleCalculatePrice}
                                            accent="lime"
                                            disabled={isCalculatingPrice}
                                        />
                                    </div>

                                </div>
                                <div className='flex items-center gap-5'>
                                    {reservation?.id != 0 && (
                                        <ActionButton
                                            label="Radera"
                                            icon={Trash2}
                                            onClick={handleDeleteClick}
                                            accent="rose"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className='grid grid-cols-[350px_auto_auto_1fr_auto] gap-15'>
                                <span>
                                    <LabeledInput
                                        label="Namn"
                                        value={reservation?.customerName || ''}
                                        labelWidth="w-20"
                                        disabled={true} />
                                    <LabeledInput
                                        label="Pers./org.nr"
                                        value={reservation?.customerOrgNr || ''}
                                        labelWidth="w-20"
                                        disabled={true} />
                                    <LabeledInput
                                        label="Mobiltelefon"
                                        value={reservation?.mobilePhone || ''}
                                        onChange={(e) => handleChange('mobilePhone', e)}
                                        labelWidth="w-20" />
                                    <LabeledInput
                                        label="Email"
                                        value={reservation?.email || ''}
                                        onChange={(e) => handleChange('email', e)}
                                        labelWidth="w-20" />
                                </span>
                                {isVehicleEnabledForOffice && (
                                    <span id="driver-info" className="w-60">
                                        <LabeledInput
                                            label="Förare"
                                            value={reservation?.driverName || ''}
                                            onChange={(e) => handleChange('driverName', e)}
                                            labelWidth="w-20" />
                                        <LabeledInput
                                            label="Förare, tfn"
                                            value={reservation?.driverMobilePhone || ''}
                                            onChange={(e) => handleChange('driverMobilePhone', e)}
                                            labelWidth="w-20" />
                                        <LabeledInput
                                            label="Körkortsnr."
                                            value={reservation?.driverLicenceNr || ''}
                                            onChange={(e) => handleChange('driverLicenceNr', e)}
                                            labelWidth="w-20" />
                                        <LabeledInput
                                            label="Referens"
                                            value={reservation?.reference || ''}
                                            onChange={(e) => handleChange('reference', e)}
                                            labelWidth="w-20" />
                                    </span>
                                )}
                                {hasMachineInfoItem && (
                                    <span id="machine-info" className="w-60">
                                        <LabeledSelect
                                            label="Kalender"
                                            value={reservation?.pricingCalendarCode || 'ALLDAYS'}
                                            onChange={(value) => handleChange('pricingCalendarCode', value)}
                                            items={PRICING_CALENDAR_OPTIONS}
                                            labelWidth="w-18"
                                            margintop="1"
                                        />
                                        <LabeledInput
                                            label="Leveranspl."
                                            value={reservation?.deliveryPlace || ''}
                                            onChange={(e) => handleChange('deliveryPlace', e)}
                                            labelWidth="w-18"
                                        />
                                        <LabeledInput
                                            label="Tfn arb.plats"
                                            value={reservation?.telephoneWorkplace || ''}
                                            onChange={(e) => handleChange('telephoneWorkplace', e)}
                                            labelWidth="w-18" />
                                        <LabeledInput
                                            label="Beställare"
                                            value={reservation?.orderer || ''}
                                            onChange={(e) => handleChange('orderer', e)}
                                            labelWidth="w-18" />
                                        <LabeledInput
                                            label="Hämtas av"
                                            value={reservation?.pickUpBy || ''}
                                            onChange={(e) => handleChange('pickUpBy', e)}
                                            labelWidth="w-18" />
                                    </span>
                                )}
                                <span>
                                    <LabeledTextArea
                                        name='externalNote'
                                        label='Märkning'
                                        value={reservation?.customerMarking || ''}
                                        onChange={(e) => handleChange('customerMarking', e)}
                                        labelWidth="w-18"
                                        margintop="0"
                                        height='h-12'
                                        placeholder="" />
                                    <LabeledTextArea
                                        name='internalNote'
                                        label='Notering, intern'
                                        value={reservation?.note || ''}
                                        onChange={(e) => handleChange('note', e)}
                                        labelWidth="w-18"
                                        margintop="0"
                                        height='h-20'
                                        placeholder="" />
                                </span>

                                <span className="w-52">
                                    <LabeledSelect
                                        name='priceListId'
                                        label='Prislista'
                                        value={reservation?.priceListId ?? ''}
                                        onChange={(value) => {
                                            if (value === '') {
                                                handleChange('priceListId', null);
                                                return;
                                            }

                                            const nextPriceListId = Number(value);
                                            handleChange('priceListId', Number.isFinite(nextPriceListId) ? nextPriceListId : null);
                                        }}
                                        items={priceListOptions}
                                        placeholder="Välj prislista"
                                        labelWidth="w-18"
                                        margintop="0"
                                    />
                                </span>
                            </div>

                            <div className="flex items-center space-x-2 ml-3 mt-4 tracking-[0.10em]">
                                <span className="text-xs text-gray-700 mr-2 uppercase">Lägg till:</span>
                                {vehicleItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => setShowCarSearchModal(true)}
                                    >
                                        PERSONBIL
                                    </button>
                                )}
                                {trailerItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => handleAddItem(trailerItemTypeCode)}
                                    >
                                        SLÄP
                                    </button>
                                )}
                                {liftItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => handleAddItem(liftItemTypeCode)}
                                    >
                                        LIFT
                                    </button>
                                )}
                                {hakiItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => handleAddItem(hakiItemTypeCode)}
                                    >
                                        HAKI
                                    </button>
                                )}
                                {aluItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => handleAddItem(aluItemTypeCode)}
                                    >
                                        ALU-STÄLLNING
                                    </button>
                                )}
                                {accessoryItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={handleAddAccessoryClick}
                                    >
                                        TILLBEHÖR
                                    </button>
                                )}
                                {toolItemTypeCode && (
                                    <button
                                        type="button"
                                        className="text-xs text-gray-700 border border-blue-300 bg-sky-50/50 hover:bg-lime-100 px-3 py-1"
                                        onClick={() => handleAddItem(toolItemTypeCode)}
                                    >
                                        VERKTYG
                                    </button>
                                )}
                            </div>

                            {/* Reservation Items List */}
                            <div className="ml-3 mt-4">
                                {(() => {
                                    const reservationItems = reservation?.reservationItems || [];
                                    const reservationItemsWithIndex = reservationItems.map((item, index) => ({ item, index }));
                                    const vehiclePeriod = getPrimaryVehiclePeriod(reservationItems);
                                    const hasVehicleInReservation = Boolean(vehiclePeriod);

                                    const regularItems = reservationItemsWithIndex.filter(({ item }) => item?.itemTypeCode?.toUpperCase() !== 'ACCESSORY');
                                    const accessoryItems = reservationItemsWithIndex.filter(({ item }) => item?.itemTypeCode?.toUpperCase() === 'ACCESSORY');
                                    const defaultBookedFromTime = String(reservationFormOptions?.defaultBookedFromTime ?? '').trim();
                                    const defaultBookedToTime = String(reservationFormOptions?.defaultBookedToTime ?? '').trim();

                                    const renderRegularItem = ({ item, index }) => {
                                        const itemTypeCode = item?.itemTypeCode?.toUpperCase();

                                        switch (itemTypeCode) {
                                            case 'VEHICLE':
                                                return (
                                                    <ReservationItemVehicle
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        insuranceCompanies={[]}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            case 'TRAILER':
                                                return (
                                                    <ReservationItemTrailer
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            case 'LIFT':
                                                return (
                                                    <ReservationItemLift
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            case 'HAKI':
                                                return (
                                                    <ReservationItemHaki
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            case 'ALU':
                                                return (
                                                    <ReservationItemAlu
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            case 'TOOL':
                                                return (
                                                    <ReservationItemTool
                                                        key={item.id || index}
                                                        item={item}
                                                        index={index}
                                                        onChange={handleItemChange}
                                                        onRemove={handleRemoveItem}
                                                        itemCategories={itemCategories}
                                                        defaultBookedFromTime={defaultBookedFromTime}
                                                        defaultBookedToTime={defaultBookedToTime}
                                                    />
                                                );
                                            default:
                                                return null;
                                        }
                                    };

                                    return (
                                        <>
                                            <div className="space-y-3">
                                                {regularItems.map(renderRegularItem)}
                                            </div>
                                            {accessoryItems.length > 0 && (
                                                <div className="mt-3 flex flex-wrap items-start gap-3">
                                                    {accessoryItems.map(({ item, index }) => (
                                                        <ReservationItemAccessory
                                                            key={item.id || index}
                                                            item={item}
                                                            index={index}
                                                            onChange={handleItemChange}
                                                            onRemove={handleRemoveItem}
                                                            itemCategories={itemCategories}
                                                            lockPeriodToVehicle={hasVehicleInReservation}
                                                            vehiclePeriod={vehiclePeriod}
                                                            defaultBookedFromTime={defaultBookedFromTime}
                                                            defaultBookedToTime={defaultBookedToTime}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Price Calculation Grid */}
                            <div className="ml-3 mt-4">
                                <div className="grid grid-cols-[1fr_3fr_3fr] gap-10 rounded-sm border border-gray-300 bg-sky-50/50 p-3 pb-5">
                                    <div className="flex flex-col gap-3">
                                        {/* Debit periods */}
                                        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500 pl-2">PERIODER</h3>

                                        {debitPeriods.length === 0 ? (
                                            <p className="pl-2 text-xs text-gray-500">Inga perioder</p>
                                        ) : (
                                            <div className="text-xs text-gray-700">
                                                {debitPeriods.map((period) => {
                                                    const isSelected = period.calcIndex === selectedDebitCalcIndex;

                                                    return (
                                                        <div
                                                            key={period.key}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedDebitCalcIndex(period.calcIndex)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter' || event.key === ' ') {
                                                                    event.preventDefault();
                                                                    setSelectedDebitCalcIndex(period.calcIndex);
                                                                }
                                                            }}
                                                            className={`mb-2 w-full rounded-sm border px-3 pt-2 pb-2 text-left transition leading-2 ${isSelected
                                                                ? 'border-lime-500 bg-lime-100/50 text-gray-900'
                                                                : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div className="text-xs font-semibold uppercase tracking-[0.0em] text-gray-500">{formatDateOnly(period.dateTimeFrom) || '-'} - {formatDateOnly(period.dateTimeTo) || '-'}</div>
                                                            <div className="mt-1 text-tiny tracking-[0.06em] text-gray-500">Mottagare: {period.receiverTypeCode}</div>
                                                            <div className="mt-1 flex flex-wrap items-center gap-1 text-tiny">
                                                                {period.invoices.length === 0 ? (
                                                                    <span className="text-gray-500">Ej fakturerad</span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-gray-500">Faktura:</span>
                                                                        {period.invoices.map((invoice, invoiceIndex) => (
                                                                            <React.Fragment key={`period-invoice-${period.key}-${invoice.id}`}>
                                                                                {invoiceIndex > 0 && <span className="text-gray-400">,</span>}
                                                                                <NavLink
                                                                                    to={`/finance/invoice/${invoice.id}`}
                                                                                    className="text-sky-700 hover:text-sky-900 hover:underline"
                                                                                >
                                                                                    {invoice.invoiceNr || invoice.id}
                                                                                </NavLink>
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto pt-2">
                                        <table className="w-full table-fixed border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                            <colgroup>
                                                <col />
                                                <col className="w-[70px]" />
                                                <col className="w-[70px]" />
                                                {/* <col className="w-[35px]" /> */}
                                                <col className="w-[64px]" />
                                                <col className="w-[80px]" />
                                                <col className="w-[40px]" />
                                            </colgroup>
                                            <thead>
                                                <tr className="tracking-[0.1em] text-gray-500">
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-left"></th>
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Antal</th>
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Á-pris</th>
                                                    {/* <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Rbt</th> */}
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Moms</th>
                                                    {/* <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">ex moms</th> */}
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">ink moms</th>
                                                    <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedDebitPeriod === null ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-2 py-6 text-center text-xs text-gray-500">
                                                            Välj en period till vänster
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (() => {
                                                        const calcIndex = selectedDebitPeriod.calcIndex;
                                                        const item = selectedReservationItem;
                                                        const rows = selectedReservationCalcRows;
                                                        const itemTypeCode = normalizeItemTypeCode(item?.itemTypeCode);
                                                        const alwaysGrouped = itemTypeCode === 'VEHICLE' || itemTypeCode === 'LIFT';
                                                        const accessoryGrouped = itemTypeCode === 'ACCESSORY' && rows.length > 1;
                                                        const showGroupHeader = alwaysGrouped || accessoryGrouped;

                                                        return (
                                                            <>
                                                                {showGroupHeader && (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-2 py-2 text-xs font-semibold tracking-[0.08em] text-gray-700">
                                                                            {getReservationItemDisplayName(item)}
                                                                        </td>
                                                                    </tr>
                                                                )}

                                                                {!showGroupHeader && (
                                                                    <tr aria-hidden="true">
                                                                        <td colSpan={6} className="h-0.5 p-0 bg-amber-300/50"></td>
                                                                    </tr>
                                                                )}

                                                                {rows.length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-2 py-4 text-center text-xs text-gray-500">
                                                                            Inga beräkningsrader för vald period
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                {rows.map((row, rowIndex) => (
                                                                    <tr key={`calc-row-${row?.id || `${calcIndex}-${rowIndex}`}`} className="bg-white border-b border-gray-100 transition-colors">
                                                                        <td className="p-0 bg-white">
                                                                            <Input
                                                                                type="text"
                                                                                stylePreset="gridCell"
                                                                                value={row?.text || ''}
                                                                                onChange={(e) => handleCalcItemChange(calcIndex, rowIndex, 'text', e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td className="">
                                                                            <NumberInput
                                                                                rowId={row?.id}
                                                                                field="qty"
                                                                                value={row?.qty ?? ''}
                                                                                decimals={2}
                                                                                stylePreset="gridCell"
                                                                                onChange={(rowId, field, newValue) => handleCalcItemChange(calcIndex, rowIndex, field, newValue)}
                                                                            />
                                                                        </td>
                                                                        <td className="">
                                                                            <NumberInput
                                                                                rowId={row?.id}
                                                                                field="unitPrice"
                                                                                value={row?.unitPrice ?? ''}
                                                                                decimals={2}
                                                                                stylePreset="gridCell"
                                                                                onChange={(rowId, field, newValue) => handleCalcItemChange(calcIndex, rowIndex, field, newValue)}
                                                                            />
                                                                        </td>
                                                                        {/* <td className="">
                                                                            <NumberInput
                                                                                rowId={row?.id}
                                                                                field="discount"
                                                                                value={row?.discount ?? ''}
                                                                                decimals={0}
                                                                                stylePreset="gridCell"
                                                                                onChange={(rowId, field, newValue) => handleCalcItemChange(calcIndex, rowIndex, field, newValue)}
                                                                            />
                                                                        </td> */}
                                                                        <td className="px-3 pt-[6px] pb-[3px] text-right text-xs text-gray-800">
                                                                            {formatAmount(getVatRateFromRow(row))}
                                                                        </td>
                                                                        <td className="">
                                                                            <NumberInput
                                                                                rowId={row?.id}
                                                                                field="sumInclVat"
                                                                                value={getSumInclVat(row?.sum, row) ?? ''}
                                                                                decimals={2}
                                                                                stylePreset="gridCell"
                                                                                onChange={() => { }}
                                                                                disabled={true}
                                                                            />
                                                                        </td>
                                                                        <td className="px-1">
                                                                            <div className="relative flex justify-end" data-calc-menu-root="true">
                                                                                <button
                                                                                    type="button"
                                                                                    className="inline-flex h-7 w-7 items-center justify-center bg-white text-gray-700 hover:bg-gray-100"
                                                                                    onClick={() => setOpenCalcMenu(openCalcMenu === `${calcIndex}-${rowIndex}` ? null : `${calcIndex}-${rowIndex}`)}
                                                                                    title="Åtgärder"
                                                                                >
                                                                                    <Wrench className="h-4 w-4" />
                                                                                </button>

                                                                                {openCalcMenu === `${calcIndex}-${rowIndex}` && (
                                                                                    <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                                                                                        <button
                                                                                            type="button"
                                                                                            className="block w-full px-4 py-3 text-left text-xs text-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                                                                            onClick={() => {
                                                                                                handleAddCalcRow(calcIndex, item, rowIndex);
                                                                                                closeCalcMenu();
                                                                                            }}
                                                                                        >
                                                                                            Lägg till rad under
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="block w-full border-t border-gray-200 px-4 py-3 text-left text-xs text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
                                                                                            onClick={() => {
                                                                                                handleRemoveCalcRow(calcIndex, rowIndex, item);
                                                                                                closeCalcMenu();
                                                                                            }}
                                                                                            disabled={rows.length <= 1}
                                                                                        >
                                                                                            Ta bort rad
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </>
                                                        );
                                                    })()
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="ml-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Fakturering</h3>

                                            <div className="flex flex-row items-center gap-4">
                                                <ActionButton
                                                    label="Kundfaktura"
                                                    icon={HandCoins}
                                                    onClick={() => handleCreateInvoice('customer')}
                                                    accent="violet"
                                                    disabled={!canCreateInvoices}
                                                />
                                                <ActionButton
                                                    label="Försäkring"
                                                    icon={HandCoins}
                                                    onClick={() => handleCreateInvoice('insuranceCompany')}
                                                    accent="violet"
                                                    disabled={!canCreateInvoices}
                                                />
                                                <ActionButton
                                                    label="Intern"
                                                    icon={HandCoins}
                                                    onClick={() => handleCreateInvoice('internal')}
                                                    accent="violet"
                                                    disabled={!canCreateInvoices}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5 w-full">
                                            <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                                <div className="text-tiny font-semibold uppercase tracking-[0.08em] text-gray-500">Totalt att fakturera</div>
                                                <table className="mt-1 w-full text-xs text-gray-700" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                    <tbody>
                                                        {Object.entries(invoicePartyLabels).map(([partyKey, label]) => (
                                                            <tr key={`total-${partyKey}`} className="align-top">
                                                                <td className="pr-2 py-0.5">{label}</td>
                                                                <td className="tabular-nums py-0.5 text-right text-gray-500">{formatAmount(faktureringSummary.totalByParty[partyKey].exVat)} ex</td>
                                                                <td className="tabular-nums py-0.5 text-right">{formatAmount(faktureringSummary.totalByParty[partyKey].inclVat)} ink</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                                <div className="text-tiny font-semibold uppercase tracking-[0.08em] text-gray-500">Kvar att fakturera</div>
                                                <table className="mt-1 w-full text-xs text-gray-700" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                    <tbody>
                                                        {Object.entries(invoicePartyLabels).map(([partyKey, label]) => (
                                                            <tr key={`left-${partyKey}`} className="align-top">
                                                                <td className="pr-2 py-0.5">{label}</td>
                                                                <td className="tabular-nums py-0.5 text-right text-gray-500">{formatAmount(amountLeftByParty[partyKey].exVat)} ex</td>
                                                                <td className="tabular-nums py-0.5 text-right">{formatAmount(amountLeftByParty[partyKey].inclVat)} ink</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                            <div className="text-tiny font-semibold uppercase tracking-[0.08em] text-gray-500">Skapade fakturor</div>
                                            {createdInvoices.length === 0 ? (
                                                <p className="mt-2 text-xs text-gray-500">Inga fakturor skapade för bokningen.</p>
                                            ) : (
                                                <div className="mt-1 overflow-hidden">
                                                    <table className="w-full border-collapse text-xs text-gray-700" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                        <tbody>
                                                            {createdInvoices.map((invoice) => (
                                                                <tr key={`invoice-${invoice.id}`} className="align-top">
                                                                    <td className="py-1 font-medium">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => navigate(`/finance/invoice/${invoice.id}`)}
                                                                            className="text-left font-medium text-sky-700 decoration-sky-300 underline-offset-2 hover:underline hover:text-sky-800"
                                                                            title="Öppna faktura"
                                                                        >
                                                                            {invoice.invoiceNr || invoice.id}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-2 py-1 text-gray-500">
                                                                        {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('sv-SE') : '-'}
                                                                    </td>
                                                                    <td className="px-2 py-1">
                                                                        <div className="text-gray-700">{invoice.customerName || '-'}</div>
                                                                        <div className="mt-0.5 text-tiny text-gray-500">
                                                                            {[...invoice.partyKeys].map((partyKey) => invoicePartyLabels[partyKey] || partyKey).join(', ')}
                                                                            {invoice.isCancelled ? ' • Makulerad' : ''}
                                                                        </div>
                                                                    </td>
                                                                    <td className="tabular-nums px-2 py-1 text-right text-gray-500">{formatAmount(invoice.exVat)} ex</td>
                                                                    <td className="tabular-nums px-2 py-1 text-right">{formatAmount(invoice.inclVat)} ink</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                </div>
                            </div>

                        </form>
                    </div>

                </div>


            </div>




        </div>
    )
}

export default Reservation