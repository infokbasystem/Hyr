import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useParams, useBlocker } from "react-router";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, Save, Trash2 } from 'lucide-react';

import { usePdf } from '../../contexts/PdfContext';
import ConfirmationModal from '../../components/ConfirmationModal';

import SearchCustomer from '../../components/SearchCustomer';
import NumberInput from '../../components/NumberInput';
import ArticleSearchInput from '../../components/ArticleSearchInput';
import Input from '../../components/Input';
import LabeledCheckbox from '../../components/LabeledCheckbox';
import LabeledDatePicker from '../../components/LabeledDatePicker';
import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';
import LabeledTextArea from '../../components/LabeledTextArea';
import ActionButton from '../../components/ActionButton';
import InvoiceCalculations from '../../utils/invoiceCalculations';
import apiClient from '../../lib/apiClient';
import { getCustomerById } from '../../lib/customerApi';


const invoiceRequestCache = new Map();
const savedInvoiceRouteCache = new Map();
const SKELETON_SHOW_DELAY_MS = 200;
const SKELETON_TEST_DELAY_MS = 0;
const SAVED_INVOICE_ROUTE_CACHE_TTL_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSharedInvoiceRequest = (key, requestFactory) => {
    if (!key || typeof requestFactory !== 'function') {
        return requestFactory();
    }

    if (invoiceRequestCache.has(key)) {
        return invoiceRequestCache.get(key);
    }

    const request = Promise.resolve()
        .then(requestFactory)
        .finally(() => {
            invoiceRequestCache.delete(key);
        });

    invoiceRequestCache.set(key, request);
    return request;
};

const isSummaryRow = (row) => ['vat', 'rounding'].includes(row?.invoiceRowType?.toLowerCase?.());

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
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const getIsInvoiceDue = (invoice) => {
    if (!invoice?.dueDate || invoice?.isSettled) {
        return false;
    }

    const dueDate = new Date(invoice.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
        return false;
    }

    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dueDate <= today;
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

const renderInfoRow = (label, value, pill = null) => {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">{label}</span>
            <span className="flex items-center gap-2 text-gray-700">
                {pill}
                <span>{value}</span>
            </span>
        </div>
    );
};

const parseIntegerOrNull = (value) => {
    if (value == null || value === '') {
        return null;
    }

    const parsed = Number.parseInt(String(value).replace(/\s+/g, ''), 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const recalculateInvoiceRows = (rows) => {
    const recalculatedRows = rows.map((row) => ({ ...row }));

    recalculatedRows.forEach((row) => {
        if (isSummaryRow(row)) {
            return;
        }

        const qty = parseFloat(row.qty) || 0;
        const unitPrice = parseFloat(row.unitPrice) || 0;
        const discountRate = parseFloat(row.discountRate) || 0;
        row.sum = qty * unitPrice * (1 - discountRate / 100);
    });

    const vatAmount = recalculatedRows
        .filter((row) => !isSummaryRow(row))
        .reduce((sum, row) => sum + (parseFloat(row.sum) || 0) * (parseFloat(row.vatRate) || 0) / 100, 0);

    const upsertSummaryRow = (invoiceRowType, sum) => {
        const rowIndex = recalculatedRows.findIndex((row) => row.invoiceRowType?.toLowerCase?.() === invoiceRowType);

        if (rowIndex !== -1) {
            recalculatedRows[rowIndex] = {
                ...recalculatedRows[rowIndex],
                invoiceRowType,
                sum,
            };
            return;
        }

        recalculatedRows.push({
            id: 0,
            tempId: Math.random(),
            invoiceRowType,
            sum,
        });
    };

    upsertSummaryRow('vat', vatAmount);

    const subtotal = recalculatedRows
        .filter((row) => row.invoiceRowType?.toLowerCase?.() !== 'rounding')
        .reduce((sum, row) => sum + (parseFloat(row.sum) || 0), 0);

    upsertSummaryRow('rounding', InvoiceCalculations.calculateRounding(subtotal));

    return recalculatedRows;
};



const Invoice = () => {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const calculationId = searchParams.get('calculationId');
    const reservationId = searchParams.get('reservationId');
    const receiverTypeCode = searchParams.get('receiverTypeCode');
    const routeInvoiceId = params.id ?? 'new';
    const initialSavedInvoiceEntry = savedInvoiceRouteCache.get(`${routeInvoiceId}`) ?? null;
    const initialSavedInvoice = initialSavedInvoiceEntry?.invoice ?? null;
    const initialMessages = initialSavedInvoiceEntry?.messages ?? [];
    const initialFormOptions = initialSavedInvoiceEntry?.formOptions ?? { currencies: [], paymentMethods: [] };

    const [invoice, setInvoice] = useState(initialSavedInvoice);
    const [originalInvoice, setOriginalInvoice] = useState(
        initialSavedInvoice ? JSON.parse(JSON.stringify(initialSavedInvoice)) : null
    );
    const [messages, setMessages] = useState(initialMessages);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    // const [pendingAction, setPendingAction] = useState(null);
    const [initialLoadPending, setInitialLoadPending] = useState(!initialSavedInvoice);
    const [loading, setLoading] = useState(false);
    const [formOptions, setFormOptions] = useState(initialFormOptions);

    const skipUnsavedGuardRef = useRef(false);
    const consumedSavedInvoiceRouteRef = useRef(null);

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const defaultBadges = [
        { text: 'Epostadress finns', color: '#56983cff' }
    ];

    const isDue = getIsInvoiceDue(invoice);
    const defaultCurrencyId = formOptions.currencies.find((option) => option.isDefault)?.id ?? formOptions.currencies[0]?.id ?? null;

    useEffect(() => {
        let isActive = true;

        getSharedInvoiceRequest('invoice-form-options', async () => {
            const response = await apiClient.get('/invoice/form-options');
            return response.data;
        })
            .then((data) => {
                if (!isActive) {
                    return;
                }

                const currencies = Array.isArray(data?.currencies)
                    ? data.currencies
                    : (Array.isArray(data?.Currencies) ? data.Currencies : []);

                const paymentMethods = Array.isArray(data?.paymentMethods)
                    ? data.paymentMethods
                    : (Array.isArray(data?.PaymentMethods) ? data.PaymentMethods : []);

                setFormOptions({
                    currencies: currencies.map((currency) => ({
                        id: currency?.id ?? currency?.Id ?? null,
                        label: currency?.currencyName ?? currency?.CurrencyName ?? '',
                    })).filter((currency) => currency.id != null),
                    paymentMethods: paymentMethods.map((paymentMethod) => ({
                        value: paymentMethod?.value ?? paymentMethod?.Value ?? '',
                        label: paymentMethod?.label ?? paymentMethod?.Label ?? '',
                    })),
                });
            })
            .catch(() => {
                if (!isActive) {
                    return;
                }

                setFormOptions({ currencies: [], paymentMethods: [] });
            });

        return () => {
            isActive = false;
        };
    }, []);

    // Helper to get row identifier (id if exists, otherwise tempId)
    const getRowTempId = (row) => row.id || row.tempId;

    // Invoice row handlers
    const handleRowChange = (tempId, field, value) => {
        markStale();
        setInvoice(prev => {
            const updatedRows = [...(prev?.invoiceRows || [])];
            const rowIndex = updatedRows.findIndex(r => getRowTempId(r) === tempId);
            if (rowIndex === -1) return prev;

            updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value };

            return { ...prev, invoiceRows: recalculateInvoiceRows(updatedRows) };
        });
    };

    const addNewRow = () => {
        markStale();
        const visibleRowCount = (invoice?.invoiceRows || []).filter((row) => !isSummaryRow(row)).length;
        const newRow = {
            id: 0,
            tempId: Math.random(),
            officeId: null,
            invoiceId: invoice?.id || null,
            itemId: null,
            reservationCalcItemId: null,
            sortNr: visibleRowCount + 1,
            articleId: null,
            articleNr: '',
            invoiceRowType: '',
            text1: '',
            text2: '',
            qty: 0,
            unitPrice: 0,
            sum: 0,
            vatRate: 25,
            accountNr: null,
            costCenter: ''
        };
        setInvoice(prev => ({
            ...prev,
            invoiceRows: recalculateInvoiceRows([...(prev?.invoiceRows || []), newRow])
        }));
    };

    const deleteRow = (tempId) => {
        markStale();
        setInvoice(prev => ({
            ...prev,
            invoiceRows: recalculateInvoiceRows((prev?.invoiceRows || []).filter(r => getRowTempId(r) !== tempId))
        }));
    };

    const handleArticleSelect = (rowId, article) => {
        markStale();
        setInvoice(prev => {
            const updatedRows = [...(prev?.invoiceRows || [])];
            const rowIndex = updatedRows.findIndex(r => getRowTempId(r) === rowId);
            if (rowIndex === -1) return prev;

            updatedRows[rowIndex] = {
                ...updatedRows[rowIndex],
                articleId: article.id,
                articleNr: article.articleNr || '',
                text1: article.name || article.description || '',
                unitPrice: article.price || 0,
                vatRate: article.vatRate || 25,
                accountNr: article.accountNr || null,
            };

            return { ...prev, invoiceRows: recalculateInvoiceRows(updatedRows) };
        });
    };

    const handleChange = (field, e) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));
        setInvoice(prev => ({
            ...prev,
            [field]: e
        }));
    };

    const handleCustomerSelect = async (customer) => {
        markStale();
        setMessages(prev => prev.filter(msg => msg.type !== 'success'));

        if (!customer?.id) {
            setInvoice(prev => ({
                ...prev,
                customerId: null,
                customerName: '',
                orgNr: '',
                vatNr: '',
                street1: '',
                street2: '',
                zipCode: null,
                city: '',
            }));
            return;
        }

        try {
            const selectedCustomer = await getCustomerById(customer.id);

            setInvoice(prev => ({
                ...prev,
                customerId: selectedCustomer?.id ?? customer.id,
                customerName: selectedCustomer?.customerName ?? customer.customerName ?? '',
                orgNr: selectedCustomer?.orgNr ?? '',
                vatNr: selectedCustomer?.vatNr ?? '',
                street1: selectedCustomer?.street1 ?? '',
                street2: selectedCustomer?.street2 ?? '',
                zipCode: parseIntegerOrNull(selectedCustomer?.zipCode),
                city: selectedCustomer?.city ?? '',
                nrOfInvoiceDays: selectedCustomer?.nrOfInvoiceDays ?? prev?.nrOfInvoiceDays ?? null,
                termsOfPayment: selectedCustomer?.nrOfInvoiceDays != null
                    ? String(selectedCustomer.nrOfInvoiceDays)
                    : (prev?.termsOfPayment ?? ''),
            }));
        } catch (error) {
            console.error('Error selecting customer:', error);

            setInvoice(prev => ({
                ...prev,
                customerId: customer.id,
                customerName: customer.customerName ?? prev?.customerName ?? '',
            }));
        }
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

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleBackClick = () => {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        window.close();
    };

    const hasUnsavedChanges = () => {
        if (skipUnsavedGuardRef.current) {
            return false;
        }

        if (!invoice || !originalInvoice) {
            return false;
        }

        return JSON.stringify(invoice) !== JSON.stringify(originalInvoice);
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
    }, [invoice, originalInvoice]);


    const getInvoiceById = async (id, calculationId, { dedupe = false, isActive = () => true, newInvoiceParams = null } = {}) => {
        console.log('getInvoiceById', id);

        const query = new URLSearchParams();
        if (`${id}` === 'new') {
            if (newInvoiceParams?.reservationId) {
                query.set('reservationId', newInvoiceParams.reservationId);
            }
            if (newInvoiceParams?.receiverTypeCode) {
                query.set('receiverTypeCode', newInvoiceParams.receiverTypeCode);
            }
        } else if (calculationId) {
            query.set('calculationId', calculationId);
        }

        const queryString = query.toString();
        const cacheKey = `invoice:${id}:${queryString || 'none'}`;

        const fetchInvoice = async () => {
            const response = await apiClient.get(`/invoice/${id}${queryString ? `?${queryString}` : ''}`);
            return response.data;
        };

        try {
            const data = dedupe
                ? await getSharedInvoiceRequest(cacheKey, fetchInvoice)
                : await fetchInvoice();

            if (!isActive()) {
                return null;
            }

            const attachments = (
                Array.isArray(data?.attachments)
                    ? data.attachments
                    : []
            ).map(att => ({
                ...att,
                url: att.path ?? ''
            }));

            const invoiceData = { ...data, attachments };
            if (`${id}` === 'new') {
                invoiceData.invoiceRows = recalculateInvoiceRows(
                    (invoiceData.invoiceRows || []).map((row) => ({ ...row, tempId: Math.random() }))
                );
            }
            setInvoice(invoiceData);
            setOriginalInvoice(JSON.parse(JSON.stringify(invoiceData)));
            skipUnsavedGuardRef.current = false;
            // pass the default badges into PdfContext (can be updated later)
            try { setBadges && setBadges(defaultBadges); } catch { /* ignore if unavailable */ }
            return invoiceData;
        }
        catch (error) {
            console.error('Error getting invoice by ID:', error);
            return null;
        }
    }

    const submitInvoice = async (e) => {
        e?.preventDefault?.();
        console.log('Form submitted');
        if (!invoice) {
            console.error('No invoice data to submit');
            return;
        }
        console.log('invoice:', invoice);

        const invoiceData = { ...invoice };

        try {
            let invoiceId = invoice.id;
            let hasRefreshedInvoice = false;
            let refreshedInvoice = null;

            const res = await apiClient.post('/invoice', invoiceData);
            invoiceId = res.data;

            refreshedInvoice = await getInvoiceById(invoiceId, null, { dedupe: false });
            if (refreshedInvoice) {
                hasRefreshedInvoice = true;
                setInvoice(refreshedInvoice);
                setOriginalInvoice(JSON.parse(JSON.stringify(refreshedInvoice)));
            }

            setMessages([{ type: 'success', text: 'Fakturan sparad' }]);

            if (`${params.id}` !== `${invoiceId}`) {
                skipUnsavedGuardRef.current = true;
                consumedSavedInvoiceRouteRef.current = `${invoiceId}`;
                if (hasRefreshedInvoice) {
                    savedInvoiceRouteCache.set(`${invoiceId}`, {
                        invoice: refreshedInvoice,
                        formOptions,
                        messages: [{ type: 'success', text: 'Fakturan sparad' }],
                    });
                    setTimeout(() => {
                        savedInvoiceRouteCache.delete(`${invoiceId}`);
                    }, SAVED_INVOICE_ROUTE_CACHE_TTL_MS);
                } else {
                    savedInvoiceRouteCache.delete(`${invoiceId}`);
                }
                navigate(`/finance/invoice/${invoiceId}`, { replace: true });
            }

            clearStale?.();
            // Reload the PDF after successful save without triggering unsaved warning
            if (showPdfPanel) {
                await getPdf({ ignoreUnsaved: true });
            }
        } catch (error) {
            const errorText = error?.response?.data ?? error?.message;
            setMessages([{ type: 'error', text: errorText }]);
            return;
        }
    };

    const deleteInvoice = async () => {
        if (!invoice?.id) {
            console.error('No invoice ID to delete');
            return;
        }

        setShowDeleteConfirm(false);

        try {
            await apiClient.delete(`/invoice/${invoice.id}`);
        } catch (error) {
            const errorText = error?.response?.data;
            if (errorText) {
                setMessages([{ type: 'error', text: errorText || 'Kunde inte ta bort förfrågan' }]);
                return;
            }
            console.error('Error deleting invoice:', error);
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
        if (!invoice) return;

        if (!ignoreUnsaved && hasUnsavedChanges()) {
            // setPendingAction('pdf');
            setShowUnsavedWarning(true);
            return;
        }

        // Open the PDF panel immediately
        openPdfPreview('');

        try {
            const res = await apiClient.get(`/pdf/invoice/${invoice.id}`, {
                responseType: 'blob',
            });
            console.log('Response ok:', true, 'content-type:', res.headers['content-type']);
            const blob = res.data;
            console.log('Blob size:', blob.size, 'type:', blob.type);
            const url = URL.createObjectURL(blob);
            openPdfPreview(url); // update the panel with the real PDF
        } catch (error) {
            console.error('Error getting inquiry PDF:', error);
            // Optional: toast.error('Kunde inte ladda PDF');
            // Optional: keep panel open to show an error state in PdfPanel
        }
    };


    // Initial data fetching - runs when ID or calculation query changes
    useEffect(() => {
        if (consumedSavedInvoiceRouteRef.current && consumedSavedInvoiceRouteRef.current !== `${routeInvoiceId}`) {
            consumedSavedInvoiceRouteRef.current = null;
        }

        if (consumedSavedInvoiceRouteRef.current === `${routeInvoiceId}`) {
            skipUnsavedGuardRef.current = false;
            setInitialLoadPending(false);
            setLoading(false);
            return;
        }

        const savedInvoiceEntry = savedInvoiceRouteCache.get(`${routeInvoiceId}`);
        if (savedInvoiceEntry) {
            consumedSavedInvoiceRouteRef.current = `${routeInvoiceId}`;
            savedInvoiceRouteCache.delete(`${routeInvoiceId}`);
            skipUnsavedGuardRef.current = false;
            setInvoice(savedInvoiceEntry.invoice);
            setOriginalInvoice(JSON.parse(JSON.stringify(savedInvoiceEntry.invoice)));
            setFormOptions(savedInvoiceEntry.formOptions ?? { currencies: [], paymentMethods: [] });
            setMessages(savedInvoiceEntry.messages ?? []);
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
                await getInvoiceById(routeInvoiceId, calculationId, {
                    dedupe: true,
                    isActive: () => isActive,
                    newInvoiceParams: { reservationId, receiverTypeCode },
                });

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
    }, [routeInvoiceId, calculationId, reservationId, receiverTypeCode]);

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
                                        <div className="h-3 bg-gray-200 rounded w-[92%]" />
                                        <div className="h-3 bg-gray-200 rounded w-[88%]" />
                                    </div>
                                </div>
                                <div className="border-b border-gray-300" />

                                <div className="space-y-4 pr-0 py-4 ml-2">
                                    <h2 className="text-4 text-center text-gray-700 text-sm">Meddelanden</h2>
                                    <div className="space-y-2 text-xs text-gray-600">
                                        <div className="h-6 bg-gray-200 rounded" />
                                        <div className="h-6 bg-gray-200 rounded w-[92%]" />
                                    </div>
                                </div>

                                <div className="border-b border-gray-300" />
                            </aside>
                        </div>

                        <div className="flex-grow lg:pl-2 pb-10">
                            <div className="h-4 bg-gray-200 rounded w-40 mb-6" />
                            <div className="flex gap-4 mb-8">
                                <div className="h-8 bg-gray-200 rounded w-20" />
                                <div className="h-8 bg-gray-200 rounded w-20" />
                                <div className="h-8 bg-gray-200 rounded w-24" />
                            </div>
                            <div className="space-y-3">
                                <div className="h-10 bg-gray-200 rounded" />
                                <div className="h-10 bg-gray-200 rounded" />
                                <div className="h-10 bg-gray-200 rounded" />
                                <div className="h-10 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (initialLoadPending) {
        return <div className="relative flex flex-col h-full md:px-[clamp(4px,3vw,6vw)]" />;
    }

    const visibleInvoiceRows = (invoice?.invoiceRows || []).filter((row) => !isSummaryRow(row));
    const isReservationBasedInvoice = Boolean(calculationId)
        || (invoice?.invoiceRows || []).some((row) => row?.reservationCalcItemId != null);

    return (
        <div className="relative flex flex-col h-full md:px-[clamp(4px,3vw,6vw)]">

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
                                    Är du säker på att du vill ta bort denna faktura? Denna åtgärd kan inte ångras.
                                </p>
                                <div className="flex gap-4 mt-6 mb-3 pt-4 justify-end">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={deleteInvoice}
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

            <div className="mt-1 flex min-h-0 flex-1 flex-col">

                <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-start">

                    <div className="mt-6 mb-8 pr-3 border-b border-gray-300 lg:mb-6 lg:self-stretch lg:border-b-0 lg:border-r">
                        <aside className="lg:sticky lg:top-[calc(52px+72px+1rem)] lg:z-10 lg:self-start">
                            <div className="space-y-4 pr-0 pb-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm">Info</h2>
                                <div className="space-y-2 text-xs text-gray-500" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                                    {renderMetaRow('Skapad:', invoice?.createdDate, invoice?.createdByUserName)}
                                    {renderMetaRow('Redigerad:', invoice?.modifiedDate, invoice?.modifiedByUserName)}
                                    <div className="my-2 border-t border-gray-200" />
                                    {renderInfoRow('Fakturanr:', invoice?.invoiceNr || '-')}
                                    {renderInfoRow('Fakturadatum:', formatDateOnly(invoice?.invoiceDate))}
                                    {renderInfoRow(
                                        'Förfallodatum:',
                                        formatDateOnly(invoice?.dueDate),
                                        isDue ? (
                                            <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-tiny tracking-wider text-rose-700">
                                                Förfallen
                                            </span>
                                        ) : null,
                                    )}
                                    {renderInfoRow('Bokföringsdatum:', formatDateOnly(invoice?.accountedDate))}
                                </div>
                            </div>

                            <div className="border-b border-gray-300" />

                            <div className="space-y-4 pr-0 py-4 ml-2">
                                <h2 className="text-4 text-center text-gray-500 text-sm">Meddelanden</h2>
                                <div className="space-y-2 text-xs text-gray-600">
                                    {messages.length === 0 && (
                                        <div className="text-center text-xs text-gray-500">
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

                    <div className='flex-grow lg:pl-2 pb-10 mr-20'>
                        <h2 className="pb-3 text-sm text-gray-500 tracking-[0.10em] font-semibold">{invoice?.id ? (<>FAKTURA <span className="ml-2">Nr. {invoice.invoiceNr}</span></>) : ("NY FAKTURA")}</h2>
                        <form onSubmit={submitInvoice} autoComplete="off">
                            <div className="flex justify-between w-full mb-6">
                                <div className='flex items-center gap-6 flex-wrap'>
                                    <ActionButton
                                        label="Tillbaka"
                                        icon={ArrowLeft}
                                        onClick={handleBackClick}
                                        accent="sky"
                                    />
                                    <ActionButton
                                        label={'Spara'}
                                        icon={Save}
                                        onClick={submitInvoice}
                                        accent={'lime'}
                                    />
                                    {invoice?.id != 0 && (
                                        <ActionButton
                                            label="Skriv ut"
                                            icon={Printer}
                                            onClick={getPdf}
                                            accent="sky"
                                        />
                                    )}
                                </div>
                                <div className='flex items-center gap-5'>
                                    {invoice?.id != 0 && (
                                        <ActionButton
                                            label="Radera"
                                            icon={Trash2}
                                            onClick={handleDeleteClick}
                                            accent="rose"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="">
                                <div className="grid gap-15 xl:grid-cols-[280px_360px_300px_auto]">
                                    <div className="">
                                        <SearchCustomer
                                            selectedCustomerName={invoice?.customerName ?? ''}
                                            onCustomerSelect={handleCustomerSelect}
                                            width="w-full"
                                            className="min-w-0"
                                            disabled={isReservationBasedInvoice}
                                        />

                                        <div className="flex w-full pb-[1px] mt-4">
                                            <p className="w-15 shrink-0 text-xs pt-2 text-gray-700">Adress</p>
                                            <div className="min-w-0 flex-1">
                                                <Input
                                                    type="text"
                                                    value={invoice?.street1 ?? ''}
                                                    onChange={(e) => handleChange('street1', e.target.value)}
                                                />
                                                <Input
                                                    type="text"
                                                    value={invoice?.street2 ?? ''}
                                                    onChange={(e) => handleChange('street2', e.target.value)}
                                                    className="mt-[1px]"
                                                />
                                                <div className="grid grid-cols-[2fr_3fr] space-x-1 w-full mt-[1px]">
                                                    <Input
                                                        type="text"
                                                        value={invoice?.zipCode ?? ''}
                                                        onChange={(e) => handleChange('zipCode', parseIntegerOrNull(e.target.value))}
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={invoice?.city ?? ''}
                                                        onChange={(e) => handleChange('city', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <LabeledInput
                                            label="Org.nr"
                                            labelWidth="w-15"
                                            value={invoice?.orgNr ?? ''}
                                            onChange={(value) => handleChange('orgNr', value)}
                                            margintop="2"
                                        />

                                        <LabeledInput
                                            label="Vat.nr"
                                            labelWidth="w-15"
                                            value={invoice?.vatNr ?? ''}
                                            onChange={(value) => handleChange('vatNr', value)}
                                            margintop="0"
                                        />
                                    </div>

                                    <div className="">
                                        <LabeledInput
                                            label="Vår referens"
                                            labelWidth="w-22"
                                            value={invoice?.ourReference ?? ''}
                                            onChange={(value) => handleChange('ourReference', value)}
                                            margintop="0"
                                        />
                                        <LabeledInput
                                            label="Er referens"
                                            labelWidth="w-22"
                                            value={invoice?.yourReference ?? ''}
                                            onChange={(value) => handleChange('yourReference', value)}
                                            margintop="0"
                                        />
                                        <LabeledInput
                                            label="Märkning"
                                            labelWidth="w-22"
                                            value={invoice?.marking ?? ''}
                                            onChange={(value) => handleChange('marking', value)}
                                            margintop="0"
                                        />
                                        <LabeledTextArea
                                            label="Betalvillkor"
                                            labelWidth="w-22"
                                            height="min-h-10"
                                            value={invoice?.termsOfPayment ?? ''}
                                            onChange={(value) => handleChange('termsOfPayment', value)}
                                            margintop="2"
                                        />
                                        <LabeledTextArea
                                            label="Meddelande"
                                            labelWidth="w-22"
                                            height="min-h-14"
                                            value={invoice?.note ?? ''}
                                            onChange={(value) => handleChange('note', value)}
                                            margintop="0"
                                        />
                                    </div>

                                    <div className="">
                                        <div className="grid grid-cols-[auto_1fr] items-center gap-1">
                                            <LabeledDatePicker
                                                label="Fakturadatum"
                                                labelWidth="w-22"
                                                inputWidth="w-[130px]"
                                                value={invoice?.invoiceDate}
                                                onChange={(nextValue) => handleChange('invoiceDate', nextValue || null)}
                                                valueType="input"
                                                margintop="0"
                                                clearable={true}
                                                showCalendarIcon={true}
                                            />
                                            <Input
                                                type="text"
                                                value={invoice?.nrOfInvoiceDays ?? ''}
                                                onChange={(e) => {
                                                    const nextValue = parseIntegerOrNull(e.target.value);
                                                    handleChange('nrOfInvoiceDays', nextValue);
                                                    handleChange('termsOfPayment', nextValue != null ? String(nextValue) : '');
                                                }}
                                                placeholder="dagar"
                                                suffix="dag"
                                                className="text-right"                                            
                                            />
                                        </div>

                                        <div className="grid grid-cols-[auto_1fr] items-center gap-1">
                                            <LabeledSelect
                                                label="Valuta"
                                                labelWidth="w-22"
                                                inputWidth="w-[130px]"
                                                value={invoice?.currencyId ?? defaultCurrencyId ?? ''}
                                                items={formOptions.currencies.map((option) => ({ id: option.id, name: option.label }))}
                                                onChange={(value) => handleChange('currencyId', parseIntegerOrNull(value) ?? defaultCurrencyId)}
                                                margintop="0"
                                            />
                                            <Input
                                                type="text"
                                                value={invoice?.currencyRate ?? ''}
                                                onChange={(e) => handleChange('currencyRate', Number.parseFloat(e.target.value.replace(',', '.')) || null)}
                                                placeholder="kurs"
                                                suffix="SEK"
                                                className="text-right"
                                            />
                                        </div>

                                        <LabeledSelect
                                            label="Betalsätt"
                                            labelWidth="w-22"
                                            inputWidth='w-[130px]'
                                            value={invoice?.invoicePayMethod ?? ''}
                                            items={formOptions.paymentMethods.map((option) => ({ id: option.value, name: option.label }))}
                                            onChange={(value) => handleChange('invoicePayMethod', value)}
                                            margintop="0"
                                        />

                                        <LabeledInput
                                            label="Konto, kf"
                                            labelWidth="w-22"
                                            inputWidth='w-[130px]'
                                            type="number"
                                            integerOnly
                                            value={invoice?.accountNr ?? null}
                                            onChange={(value) => handleChange('accountNr', value)}
                                            margintop="0"
                                        />

                                        <LabeledInput
                                            label="Konto, moms"
                                            labelWidth="w-22"
                                            inputWidth='w-[130px]'
                                            type="number"
                                            integerOnly
                                            value={invoice?.accountNrVat ?? null}
                                            onChange={(value) => handleChange('accountNrVat', value)}
                                            margintop="0"
                                        />
                                    </div>

                                    <div className="pt-1">
                                        <div className="flex flex-col">
                                            {[
                                                { label: 'Utskrift gjord', field: 'isPrinted' },
                                                { label: 'Faktura mailad', field: 'isEmailed' },
                                                { label: 'Godkänd för bokf.', field: 'isOkForAccounting' },
                                                { label: 'Faktura reglerad', field: 'isSettled' },
                                            ].map((statusRow) => {
                                                const checked = Boolean(invoice?.[statusRow.field]);
                                                return (
                                                    <LabeledCheckbox
                                                        key={statusRow.field}
                                                        label={statusRow.label}
                                                        checked={checked}
                                                        onChange={(nextChecked) => handleChange(statusRow.field, nextChecked)}
                                                        color="cyan"
                                                        uncheckedBorderColor="#d1d5db"
                                                        className="select-none"
                                                        
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Rows Editable Grid */}
                            <div className="mt-8 ml-1">
                                <div className="ml-1 mb-2 flex items-center gap-3">
                                    <p className="w-50 text-xs font-semibold uppercase tracking-wider text-gray-500">Fakturarader</p>
                                    <p className="text-xs text-gray-500">Sök i Artikelnr-kolumnen.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-t border-gray-300">
                                                <th className="px-2 py-2 text-left text-tiny font-medium text-gray-400 uppercase w-10">Sort</th>
                                                <th className="px-3 py-2 text-left text-tiny font-medium text-gray-400 uppercase w-44">Artikelnr</th>
                                                <th className="px-3 py-2 text-left text-tiny font-medium text-gray-400 uppercase">Text</th>
                                                <th className="px-3 py-2 text-left text-tiny font-medium text-gray-400 uppercase">Text 2</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-20">Rabatt %</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-20">Kvantitet</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-24">á-pris</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-24">Summa</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-16">Moms</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-20">Konto</th>
                                                <th className="px-3 pl-2 pr-1 text-right text-tiny font-medium text-gray-400 uppercase w-20">Kostn.st.</th>
                                                <th className="px-3 py-2 text-right text-tiny font-medium text-gray-400 uppercase w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {visibleInvoiceRows.map((row, index) => (
                                                <tr key={getRowTempId(row)} className="border-b border-gray-100 transition-colors hover:bg-blue-50">
                                                    <td className="px-2 pt-[1px] text-xs text-gray-600 align-middle">{index + 1}</td>
                                                    <td className="p-0 align-top">
                                                        <ArticleSearchInput
                                                            value={row.articleNr}
                                                            onChange={(value) => handleRowChange(getRowTempId(row), 'articleNr', value)}
                                                            onArticleSelect={(article) => handleArticleSelect(getRowTempId(row), article)}
                                                            gridcell
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <Input
                                                            type="text"
                                                            gridcell
                                                            value={row.text1 || ''}
                                                            onChange={(e) => handleRowChange(getRowTempId(row), 'text1', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <Input
                                                            type="text"
                                                            gridcell
                                                            value={row.text2 || ''}
                                                            onChange={(e) => handleRowChange(getRowTempId(row), 'text2', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="discountRate"
                                                            value={row.discountRate || ''}
                                                            onChange={handleRowChange}
                                                            gridcell
                                                            decimals={2}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="qty"
                                                            value={row.qty || ''}
                                                            onChange={handleRowChange}
                                                            gridcell
                                                            decimals={2}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="unitPrice"
                                                            value={row.unitPrice || ''}
                                                            onChange={handleRowChange}
                                                            gridcell
                                                            decimals={2}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="sum"
                                                            value={row.sum || ''}
                                                            disabled={true}
                                                            gridcell
                                                            className="text-gray-600"
                                                            decimals={2}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="vatRate"
                                                            value={row.vatRate || ''}
                                                            onChange={handleRowChange}
                                                            gridcell
                                                            decimals={2}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <NumberInput
                                                            rowId={getRowTempId(row)}
                                                            field="accountNr"
                                                            value={row.accountNr || ''}
                                                            onChange={handleRowChange}
                                                            gridcell
                                                            decimals={0}
                                                        />
                                                    </td>
                                                    <td className="p-0 align-top">
                                                        <Input
                                                            type="text"
                                                            gridcell
                                                            value={row.costCenter || ''}
                                                            onChange={(e) => handleRowChange(getRowTempId(row), 'costCenter', e.target.value)}
                                                            className="text-right"
                                                        />
                                                    </td>
                                                    <td className="px-0 text-center align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteRow(getRowTempId(row))}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                            title="Ta bort rad"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Empty row for adding new entries */}
                                            <tr className="border-b border-gray-100">
                                                <td className="px-2 py-0 text-xs leading-5 text-gray-400">{visibleInvoiceRows.length + 1}</td>
                                                <td colSpan="11" className="px-2 py-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={addNewRow}
                                                        className="text-xs text-gray-400 hover:text-gray-600"
                                                    >
                                                        + Lägg till rad
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Section */}
                                {visibleInvoiceRows.length > 0 && (
                                    <div className="flex justify-end mt-6">
                                        <div className="border border-gray-300 bg-yellow-50 px-6 py-3">
                                            <div className="grid grid-cols-4 gap-8 text-xs">
                                                <div className="text-left">
                                                    <div className="text-gray-500 font-medium mb-1">BELOPP</div>
                                                    <div className=" text-gray-800 font-semibold">
                                                        {(invoice?.invoiceRows || [])
                                                            .filter(row => !['vat', 'rounding'].includes(row.invoiceRowType?.toLowerCase?.()))
                                                            .reduce((sum, row) => sum + (parseFloat(row.sum) || 0), 0)
                                                            .toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-gray-500 font-medium mb-1">MOMS</div>
                                                    <div className="text-gray-800 font-semibold">
                                                        {(invoice?.invoiceRows || [])
                                                            .find(row => row.invoiceRowType?.toLowerCase() === 'vat')?.sum?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} SEK
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-gray-500 font-medium mb-1">ÖRESUTJ.</div>
                                                    <div className="text-gray-800 font-semibold">
                                                        {(() => {
                                                            const roundingValue = (invoice?.invoiceRows || [])
                                                                .find(row => row.invoiceRowType?.toLowerCase() === 'rounding')?.sum;
                                                            return roundingValue === 0 || roundingValue === null || roundingValue === undefined
                                                                ? '0'
                                                                : roundingValue.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' SEK';
                                                        })()}
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-gray-500 font-medium mb-1">ATT BETALA</div>
                                                    <div className="text-gray-800 font-semibold">
                                                        {(invoice?.invoiceRows || [])
                                                            .reduce((sum, row) => sum + (parseFloat(row.sum) || 0), 0)
                                                            .toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>

                            </div>

                        </form>
                        {/* <div className="flex gap-4 mt-6">
                        <pre className="flex-1 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(invoice, null, 2)}
                        </pre>
                        <pre className="flex-1 bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                            {JSON.stringify(originalInvoice, null, 2)}
                        </pre>
                    </div> */}
                    </div>

                </div>

            </div>

        </div>
    )
}

export default Invoice