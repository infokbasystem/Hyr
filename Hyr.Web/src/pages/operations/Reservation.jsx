import React, { useContext, useLayoutEffect } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useParams, useBlocker } from "react-router";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, DollarSign, Printer, Search, Save, Trash2, RotateCcw, Wrench, HandCoins } from 'lucide-react';

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
const PRICING_CALENDAR_OPTIONS = [
    { id: 'ALLDAYS', name: 'ALLDAYS' },
    { id: 'WEEKDAYS', name: 'WEEKDAYS' },
    { id: 'WORKINGDAYS', name: 'WORKINGDAYS' },
];

const normalizeItemTypeCode = (value) => String(value || '').trim().toUpperCase();

const isVehicleItem = (item) => normalizeItemTypeCode(item?.itemTypeCode) === 'VEHICLE';
const isAccessoryItem = (item) => normalizeItemTypeCode(item?.itemTypeCode) === 'ACCESSORY';

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

const getVatRateFromVatCode = (vatCode) => {
    const normalizedVatCode = String(vatCode ?? '').trim();
    if (!normalizedVatCode) {
        return 25;
    }

    const parsedVatRate = Number(normalizedVatCode.replace('%', '').replace(',', '.'));
    return Number.isFinite(parsedVatRate) ? parsedVatRate : 25;
};

const getSumInclVat = (sum, vatCode) => {
    const exVatSum = Number(sum ?? 0);
    if (!Number.isFinite(exVatSum)) {
        return null;
    }

    const vatRate = getVatRateFromVatCode(vatCode);
    return Number((exVatSum * (1 + vatRate / 100)).toFixed(2));
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const formatAmount = (value) => {
    const normalized = Number(value || 0);
    return normalized.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatCode: '',
            },
            {
                id: 0,
                itemId: defaultItemId,
                text: 'Dygnspris',
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatCode: '',
            },
        ];
    }

    return [
        {
            id: 0,
            itemId: defaultItemId,
            text: getReservationItemDisplayName(item),
            qty: 1,
            unitPrice: null,
            discount: null,
            sum: null,
            vatCode: '',
        },
    ];
};

const normalizeReservationForComparison = (reservationData) => {
    if (!reservationData || typeof reservationData !== 'object') {
        return reservationData;
    }

    const reservationItems = Array.isArray(reservationData.reservationItems)
        ? reservationData.reservationItems
        : [];
    const existingCalcs = Array.isArray(reservationData.reservationCalcs)
        ? reservationData.reservationCalcs
        : [];

    const normalizedCalcs = reservationItems.map((item, index) => {
        const existingCalc = existingCalcs[index];
        const existingRows = Array.isArray(existingCalc?.reservationCalcItems)
            ? existingCalc.reservationCalcItems
            : [];

        const normalizedRows = existingRows.length > 0
            ? existingRows.map((row) => ({
                ...row,
                itemId: row?.itemId ?? (Number.isInteger(item?.itemId) ? item.itemId : null),
                discount: row?.discount ?? null,
                vatCode: row?.vatCode ?? '',
            }))
            : getDefaultCalcRowsForItem(item);

        return {
            id: existingCalc?.id || 0,
            dateTimeFrom: existingCalc?.dateTimeFrom ?? item?.bookedFrom ?? null,
            dateTimeTo: existingCalc?.dateTimeTo ?? item?.bookedTo ?? null,
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
    const [reservation, setReservation] = useState(null);
    const [originalReservation, setOriginalReservation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showCarSearchModal, setShowCarSearchModal] = useState(false);
    const [showAccessorySelectModal, setShowAccessorySelectModal] = useState(false);
    const [openCalcMenu, setOpenCalcMenu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [listsLoaded, setListsLoaded] = useState(false);
    const [reservationFormOptions, setReservationFormOptions] = useState({
        itemTypes: [],
        itemCategories: [],
        defaultBookedFromTime: '',
        defaultBookedToTime: '',
    });

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const skipUnsavedGuardRef = useRef(false);

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

    const reservationCalcTotals = (reservation?.reservationCalcs || []).reduce((totals, calc) => {
        const rows = Array.isArray(calc?.reservationCalcItems) ? calc.reservationCalcItems : [];

        rows.forEach((row) => {
            totals.exVat += Number(row?.sum) || 0;
            totals.inclVat += getSumInclVat(row?.sum, row?.vatCode) || 0;
        });

        return totals;
    }, { exVat: 0, inclVat: 0 });

    const faktureringSummary = (reservation?.reservationCalcs || []).reduce((summary, calc, calcIndex) => {
        const reservationItem = reservation?.reservationItems?.[calcIndex] || null;
        const partyKey = resolveInvoiceParty(reservationItem);
        const rows = Array.isArray(calc?.reservationCalcItems) ? calc.reservationCalcItems : [];

        rows.forEach((row) => {
            const exVat = Number(row?.sum) || 0;
            const inclVat = getSumInclVat(row?.sum, row?.vatCode) || 0;

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

    const createdInvoices = Array.from(faktureringSummary.invoiceById.values())
        .sort((left, right) => {
            const leftTime = left?.invoiceDate ? new Date(left.invoiceDate).getTime() : 0;
            const rightTime = right?.invoiceDate ? new Date(right.invoiceDate).getTime() : 0;
            if (leftTime === rightTime) {
                return (right?.id || 0) - (left?.id || 0);
            }
            return rightTime - leftTime;
        });

    const canCreateInvoices = Number(reservation?.id) > 0;

    const handleCreateInvoice = (partyKey) => {
        if (!canCreateInvoices) {
            setMessages([{ type: 'error', text: 'Spara bokningen innan du skapar faktura' }]);
            return;
        }

        const query = new URLSearchParams({
            reservationId: String(reservation.id),
            party: partyKey,
        });

        navigate(`/finance/invoice/new?${query.toString()}`);
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
                    qty: 1,
                    unitPrice: null,
                    discount: null,
                    sum: null,
                    vatCode: '',
                })
            };

            if (field === 'text' || field === 'vatCode') {
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
                qty: 1,
                unitPrice: null,
                discount: null,
                sum: null,
                vatCode: '',
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


    const getReservationById = async (id, { dedupe = false, isActive = () => true } = {}) => {
        console.log('getReservationById', id);
        if (id === 'new') {
            const newReservation = {
                id: 0,
                customerName: 'Allan',
                customerOrgNr: '',
                mobilePhone: '',
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
            try { setBadges && setBadges(defaultBadges); } catch (e) { /* ignore if unavailable */ }
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
                    defaultBookedFromTime: '',
                    defaultBookedToTime: '',
                };
            }

            console.error('Error getting reservation form options:', error);
            setReservationFormOptions({
                itemTypes: [],
                itemCategories: [],
                defaultBookedFromTime: '',
                defaultBookedToTime: '',
            });
            return {
                itemTypes: [],
                itemCategories: [],
                defaultBookedFromTime: '',
                defaultBookedToTime: '',
            };
        }
    }

    const submitReservation = async (e) => {
        e?.preventDefault?.();

        if (!reservation) {
            return;
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
            setMessages([{ type: 'success', text: 'Bokningen sparad' }]);

            // Navigate if ID changed (from new → ID)
            if (`${params.id}` !== `${reservationId}`) {
                skipUnsavedGuardRef.current = true;
                navigate(`/operations/reservation/${reservationId}`, { replace: true });
            }

            clearStale?.();
            // Reload the PDF after successful save without triggering unsaved warning
            if (showPdfPanel) {
                await getPdf({ ignoreUnsaved: true });
            }
        } catch (error) {
            setMessages([{ type: 'error', text: formatErrorMessage(error) }]);
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
        let isActive = true;
        const id = params.id === 'new' ? 'new' : params.id;

        setLoading(true);
        Promise.all([
            getReservationFormOptions({ dedupe: true, isActive: () => isActive }),
            getReservationById(id, { dedupe: true, isActive: () => isActive })
        ])
            .finally(() => {
                if (isActive) {
                    setLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [params.id]);

    useEffect(() => {
        setReservation(prev => {
            if (!prev) {
                return prev;
            }

            const reservationItems = Array.isArray(prev.reservationItems) ? prev.reservationItems : [];
            const existingCalcs = Array.isArray(prev.reservationCalcs) ? prev.reservationCalcs : [];

            let hasChanges = existingCalcs.length !== reservationItems.length;

            const nextCalcs = reservationItems.map((item, index) => {
                const existingCalc = existingCalcs[index];
                const existingRows = Array.isArray(existingCalc?.reservationCalcItems)
                    ? existingCalc.reservationCalcItems
                    : [];

                const normalizedRows = existingRows.length > 0
                    ? existingRows.map((row) => ({
                        ...row,
                        itemId: row?.itemId ?? (Number.isInteger(item?.itemId) ? item.itemId : null),
                        discount: row?.discount ?? null,
                        vatCode: row?.vatCode ?? '',
                    }))
                    : getDefaultCalcRowsForItem(item);

                if (!existingCalc || existingRows.length === 0) {
                    hasChanges = true;
                }

                return {
                    id: existingCalc?.id || 0,
                    dateTimeFrom: existingCalc?.dateTimeFrom ?? item?.bookedFrom ?? null,
                    dateTimeTo: existingCalc?.dateTimeTo ?? item?.bookedTo ?? null,
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
            <div className="relative flex flex-col h-full md:px-[clamp(8px,5vw,10vw)] animate-pulse">
                <div className="mt-1 flex h-full items-stretch">
                    {/* Sidebar skeleton */}
                    <aside className="mt-6 pr-3 flex flex-col w-70 border-r border-gray-300 mb-8">
                        <div className="space-y-3 px-2 pb-4">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                        </div>
                        <hr className="border-gray-200" />
                        <div className="space-y-3 px-2 pt-4">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                            <div className="h-6 bg-gray-200 rounded" />
                            <div className="h-6 bg-gray-200 rounded" />
                        </div>
                    </aside>
                    {/* Main area skeleton */}
                    <div className="flex-grow pl-10">
                        <div className="h-4 bg-gray-200 rounded w-40 mb-6" />
                        {/* Action buttons row */}
                        <div className="flex gap-4 mb-8">
                            <div className="h-8 bg-gray-200 rounded w-20" />
                            <div className="h-8 bg-gray-200 rounded w-20" />
                            <div className="h-8 bg-gray-200 rounded w-24" />
                        </div>
                        {/* Form fields */}
                        <div className="grid grid-cols-[350px_300px_380px_1fr] gap-15 ml-3">
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-15 bg-gray-200 rounded" />
                                <div className="h-6 bg-gray-200 rounded" />
                                <div className="h-15 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full md:px-[clamp(8px,5vw,10vw)]">

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

            <div className='mt-1 flex min-h-0 items-start overflow-visible'>

                <aside className="sticky top-[calc(52px+72px+1rem)] z-10 flex w-65 shrink-0 self-start">
                    <div className="flex h-full w-full flex-col overflow-hidden pr-0">
                        <div className="ml-2 space-y-4 pr-0 pb-4">
                            <h2 className="text-sm text-center text-gray-500">Info</h2>
                            <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                    {reservation?.createdDate && (
                                        <>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                <span>Skapad:</span>
                                            </div>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                {new Date(reservation.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                {reservation?.createdByUserName && `av ${formatUserName(reservation.createdByUserName)}`}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                    {reservation?.modifiedDate && (
                                        <>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                <span>Redigerad:</span>
                                            </div>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                {new Date(reservation.modifiedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                                {reservation?.modifiedByUserName && `av ${formatUserName(reservation.modifiedByUserName)}`}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-300 dark:border-white" />

                        <h2 className="text-sm text-center text-gray-500 pt-4">Meddelanden</h2>
                        {messages.length == 0 ? (
                            <p className='text-xs text-center font-light mt-4'>Inga meddelanden</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {messages.map((message, index) => (
                                    <li key={index} className={`text-center text-xs p-2 rounded border border-gray-200 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {typeof message.text === 'string' ? message.text : JSON.stringify(message.text)}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <hr className="mt-7 border-gray-300 dark:border-white" />
                        {/* {inquiry && attachedFiles && (
                        <FileList
                            files={attachedFiles}
                            onRemove={handleRemoveFile}
                            onAdd={handleAddFile}
                            onEdit={handleEditFile}
                            paths={[
                                { id: 'docs', name: 'Dokument' },
                                { id: 'specs', name: 'Specifikationer' },
                                { id: 'designs', name: 'Design' }
                            ]}
                            entityId={inquiry?.id}
                            entityType="inquiry"
                        />
                    )} */}
                    </div>
                </aside>

                <div className="mx-10 w-px self-stretch bg-gray-300" />

                <div className='flex-grow pl-0 pb-10'>
                    <h2 className="pb-3 text-sm text-gray-500 tracking-[0.10em] font-semibold">{reservation?.id ? (<>BOKNING <span className="ml-2">Nr. {reservation?.id}</span></>) : ("Ny bokning")}</h2>

                    <form onSubmit={submitReservation} autoComplete='off'>
                        <div className="flex justify-between w-full mb-6">
                            <div className='flex items-center gap-5 flex-wrap'>
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
                                        onClick={() => { }}
                                        accent="yellow"
                                    />
                                    <ActionButton
                                        label="Återlämna"
                                        icon={RotateCcw}
                                        onClick={() => { }}
                                        accent="yellow"
                                    />
                                    <ActionButton
                                        label="Checka in"
                                        icon={CheckCircle2}
                                        onClick={() => { }}
                                        accent="yellow"
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

                        <div className='grid grid-cols-[350px_auto_auto_1fr] gap-15 ml-3'>
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
                        <div className="ml-3 mt-6">
                            {(() => {
                                const reservationItems = reservation?.reservationItems || [];
                                const reservationItemsWithIndex = reservationItems.map((item, index) => ({ item, index }));
                                const vehiclePeriod = getPrimaryVehiclePeriod(reservationItems);
                                const hasVehicleInReservation = Boolean(vehiclePeriod);

                                const regularItems = reservationItemsWithIndex.filter(({ item }) => item?.itemTypeCode?.toUpperCase() !== 'ACCESSORY');
                                const accessoryItems = reservationItemsWithIndex.filter(({ item }) => item?.itemTypeCode?.toUpperCase() === 'ACCESSORY');

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
                            <div className="grid grid-cols-[3fr_3fr_1.5fr] gap-15 rounded-sm border border-gray-300 bg-sky-50/50 p-3 pb-5">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border-collapse text-xs" >
                                        <thead>
                                            <tr className="tracking-[0.1em] text-gray-500">
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-left"></th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Antal</th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Á-pris</th>
                                                <th className="w-[50px] px-2 text-tiny font-medium uppercase text-gray-400 text-right">Rabatt</th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">Moms</th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">ex moms</th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right">ink moms</th>
                                                <th className="px-2 text-tiny font-medium uppercase text-gray-400 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(reservation?.reservationItems || []).map((item, calcIndex) => {
                                                const itemTypeCode = normalizeItemTypeCode(item?.itemTypeCode);
                                                const currentCalc = reservation?.reservationCalcs?.[calcIndex] || {};
                                                const rows = Array.isArray(currentCalc?.reservationCalcItems)
                                                    ? currentCalc.reservationCalcItems
                                                    : [];

                                                const alwaysGrouped = itemTypeCode === 'VEHICLE' || itemTypeCode === 'LIFT';
                                                const accessoryGrouped = itemTypeCode === 'ACCESSORY' && rows.length > 1;
                                                const showGroupHeader = alwaysGrouped || accessoryGrouped;

                                                return (
                                                    <React.Fragment key={`calc-${item?.id || calcIndex}`}>
                                                        {showGroupHeader && (
                                                            <tr>
                                                                <td colSpan={8} className="px-2 py-2 text-xs font-semibold tracking-[0.08em] text-gray-700">
                                                                    {getReservationItemDisplayName(item)}
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {!showGroupHeader && (
                                                            <tr aria-hidden="true">
                                                                <td colSpan={8} className="h-0.5 p-0 bg-amber-300/50"></td>
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
                                                                <td className="">
                                                                    <NumberInput
                                                                        rowId={row?.id}
                                                                        field="discount"
                                                                        value={row?.discount ?? ''}
                                                                        decimals={0}
                                                                        stylePreset="gridCell"
                                                                        onChange={(rowId, field, newValue) => handleCalcItemChange(calcIndex, rowIndex, field, newValue)}
                                                                    />
                                                                </td>
                                                                <td className="">
                                                                </td>
                                                                <td className="">
                                                                    <NumberInput
                                                                        rowId={row?.id}
                                                                        field="sum"
                                                                        value={row?.sum ?? ''}
                                                                        decimals={2}
                                                                        stylePreset="gridCell"
                                                                        onChange={(rowId, field, newValue) => handleCalcItemChange(calcIndex, rowIndex, field, newValue)}
                                                                        disabled={true}
                                                                    />
                                                                </td>
                                                                <td className="">
                                                                    <NumberInput
                                                                        rowId={row?.id}
                                                                        field="sumInclVat"
                                                                        value={getSumInclVat(row?.sum, row?.vatCode) ?? ''}
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
                                                                                    className="block w-full px-4 py-3 text-left text-sm text-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                                                                                    onClick={() => {
                                                                                        handleAddCalcRow(calcIndex, item, rowIndex);
                                                                                        closeCalcMenu();
                                                                                    }}
                                                                                >
                                                                                    Lägg till rad under
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="block w-full border-t border-gray-200 px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white"
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

                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Fakturering</h3>

                                    <div className="grid grid-cols-2 gap-5 w-full">
                                        <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Totalt att fakturera</div>
                                            <ul className="mt-1 space-y-1 text-xs text-gray-700">
                                                {Object.entries(invoicePartyLabels).map(([partyKey, label]) => (
                                                    <li key={`total-${partyKey}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                                                        <span>{label}</span>
                                                        <span className="tabular-nums text-right text-gray-500">{formatAmount(faktureringSummary.totalByParty[partyKey].exVat)} ex</span>
                                                        <span className="tabular-nums text-right">{formatAmount(faktureringSummary.totalByParty[partyKey].inclVat)} ink</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Kvar att fakturera</div>
                                            <ul className="mt-1 space-y-1 text-xs text-gray-700">
                                                {Object.entries(invoicePartyLabels).map(([partyKey, label]) => (
                                                    <li key={`left-${partyKey}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                                                        <span>{label}</span>
                                                        <span className="tabular-nums text-right text-gray-500">{formatAmount(amountLeftByParty[partyKey].exVat)} ex</span>
                                                        <span className="tabular-nums text-right">{formatAmount(amountLeftByParty[partyKey].inclVat)} ink</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="rounded-sm border border-gray-200 bg-white px-3 py-2">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Skapade fakturor</div>
                                        {createdInvoices.length === 0 ? (
                                            <p className="mt-2 text-xs text-gray-500">Inga fakturor skapade för bokningen.</p>
                                        ) : (
                                            <ul className="mt-2 space-y-2 text-xs text-gray-700">
                                                {createdInvoices.map((invoice) => (
                                                    <li key={`invoice-${invoice.id}`} className="rounded border border-gray-100 px-2 py-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-medium">Faktura {invoice.invoiceNr || invoice.id}</span>
                                                            <span className="text-gray-500">
                                                                {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('sv-SE') : '-'}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-gray-500">
                                                            {(invoice.customerName || '-')} • {[...invoice.partyKeys].map((partyKey) => invoicePartyLabels[partyKey] || partyKey).join(', ')}
                                                            {invoice.isCancelled ? ' • Makulerad' : ''}
                                                        </div>
                                                        <div className="mt-1 grid grid-cols-[1fr_auto_auto] gap-2 text-[11px]">
                                                            <span className="text-gray-500">Belopp på bokningen</span>
                                                            <span className="tabular-nums text-right text-gray-500">{formatAmount(invoice.exVat)} ex</span>
                                                            <span className="tabular-nums text-right">{formatAmount(invoice.inclVat)} ink</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                </div>

                                <div className="pt-10">
                                    {/* <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Åtgärder</h3> */}
                                    <div className="mt-3 flex flex-col gap-2">
                                        <ActionButton
                                            label="Kundfaktura"
                                            icon={HandCoins}
                                            onClick={() => handleCreateInvoice('customer')}
                                            accent="violet"
                                            disabled={!canCreateInvoices}
                                        />
                                        <ActionButton
                                            label="Försäkringsfaktura"
                                            icon={HandCoins}
                                            onClick={() => handleCreateInvoice('insuranceCompany')}
                                            accent="violet"
                                            disabled={!canCreateInvoices}
                                        />
                                        <ActionButton
                                            label="Internfaktura"
                                            icon={HandCoins}
                                            onClick={() => handleCreateInvoice('internal')}
                                            accent="violet"
                                            disabled={!canCreateInvoices}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

            </div>




        </div>
    )
}

export default Reservation