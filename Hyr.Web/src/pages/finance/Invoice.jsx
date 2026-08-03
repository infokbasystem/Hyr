import React from 'react'
import { useState, useEffect } from 'react'
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, Save, Trash2 } from 'lucide-react';

import { usePdf } from '../../contexts/PdfContext';
import ConfirmationModal from '../../components/ConfirmationModal';

import LabeledReactSelect from '../../components/LabeledReactSelect';
import NumberInput from '../../components/NumberInput';
import ArticleSearchInput from '../../components/ArticleSearchInput';
import Input from '../../components/Input';
import ActionButton from '../../components/ActionButton';
import InvoiceCalculations from '../../utils/invoiceCalculations';
import apiClient from '../../lib/apiClient';


const invoiceRequestCache = new Map();

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
    const [invoice, setInvoice] = useState(null);
    const [originalInvoice, setOriginalInvoice] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    // const [pendingAction, setPendingAction] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const { openPdfPreview, setBadges, markStale, clearStale, showPdfPanel, closePdfPreview } = usePdf();

    const defaultBadges = [
        { text: 'Epostadress finns', color: '#56983cff' }
    ];

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

    const handleUnsavedWarningConfirm = () => {
        setShowUnsavedWarning(false);
        // setPendingAction(null);
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
        if (!invoice || !originalInvoice) return false;
        const isSame = JSON.stringify(invoice) !== JSON.stringify(originalInvoice);
        console.log('hasUnsavedChanges:', isSame);
        return isSame;
    };


    const getInvoiceById = async (id, calculationId, { dedupe = false, isActive = () => true } = {}) => {
        console.log('getInvoiceById', id);
        const cacheKey = `invoice:${id}:calc:${calculationId || 'none'}`;

        const fetchInvoice = async () => {
            const queryParams = calculationId ? `?calculationId=${calculationId}` : '';
            const response = await apiClient.get(`/invoice/${id}${queryParams}`);
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
            setInvoice(invoiceData);
            setOriginalInvoice(JSON.parse(JSON.stringify(invoiceData)));
            // pass the default badges into PdfContext (can be updated later)
            try { setBadges && setBadges(defaultBadges); } catch (e) { /* ignore if unavailable */ }
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

            const res = await apiClient.post('/invoice', invoiceData);
            invoiceId = res.data;

            const refreshedInvoice = await getInvoiceById(invoiceId, null, { dedupe: false });
            if (refreshedInvoice) {
                setInvoice(refreshedInvoice);
                setOriginalInvoice(JSON.parse(JSON.stringify(refreshedInvoice)));
            }

            setMessages([{ type: 'success', text: 'Fakturan sparad' }]);

            if (`${params.id}` !== `${invoiceId}`) {
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


    const calculationId = searchParams.get('calculationId');

    // Initial data fetching - runs when ID or calculation query changes
    useEffect(() => {
        let isActive = true;

        setLoading(true);
        getInvoiceById(params.id, calculationId, { dedupe: true, isActive: () => isActive })
            .finally(() => {
                if (isActive) {
                    setLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [params.id, calculationId]);

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
                    <div className="flex-grow pl-10">
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
        );
    }

    const visibleInvoiceRows = (invoice?.invoiceRows || []).filter((row) => !isSummaryRow(row));

    return (
        <div className="relative flex flex-col h-full md:px-[clamp(8px,5vw,10vw)]">

            {/* Unsaved Changes Warning Modal */}
            <ConfirmationModal
                isOpen={showUnsavedWarning}
                onClose={() => {
                    setShowUnsavedWarning(false);
                    // setPendingAction(null);
                }}
                onConfirm={handleUnsavedWarningConfirm}
                title="OSPARADE ÄNDRINGAR"
                message="Du har osparade ändringar. Vänligen spara fakturan innan du fortsätter."
                confirmText="Jag förstår"
                cancelText="Avbryt"
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

            <div className="mt-1 flex min-h-0 items-start overflow-visible">

                <aside className="sticky top-[calc(52px+72px+1rem)] z-10 flex w-65 shrink-0 self-start">
                    <div className="flex h-full w-full flex-col overflow-hidden pr-0">
                        <div className="ml-2 space-y-4 pr-0 pb-4">
                            <h2 className="text-sm text-center text-gray-500">Info</h2>
                            <div className="space-y-2 text-xs">
                                <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                    {invoice?.createdDate && (
                                        <>
                                            <div className="text-gray-500">
                                                <span>Skapad:</span>
                                            </div>
                                            <div className="text-gray-500">
                                                {new Date(invoice.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-gray-500">
                                                {invoice?.createdByUserName && `av ${invoice.createdByUserName}`}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-[65px_110px_1fr] mx-2">
                                    {invoice?.editedDate && (
                                        <>
                                            <div className="text-gray-500">
                                                <span>Redigerad:</span>
                                            </div>
                                            <div className="text-gray-500">
                                                {new Date(invoice.editedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="text-gray-500">
                                                {invoice?.editedByUserName && `av ${invoice.editedByUserName}`}
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
                                        {message.text}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <hr className="mt-7 border-gray-300 dark:border-white" />
                    </div>
                </aside>

                <div className="mx-10 w-px self-stretch bg-gray-300" />

                <div className='flex-grow pl-0 pb-10'>
                    <h2 className="pb-3 text-sm text-gray-500 tracking-[0.10em] font-semibold">{invoice?.id ? (<>FAKTURA <span className="ml-2">Nr. {invoice.invoiceNr}</span></>) : ("Ny faktura")}</h2>
                    <form onSubmit={submitInvoice} autoComplete="off">
                        <div className="flex justify-between w-full mb-6">
                            <div className='flex items-center gap-5 flex-wrap'>
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

                        <div className="grid md:grid-cols-[400px_350px] gap-15 ml-3">
                            <LabeledReactSelect
                                name='customerId'
                                label='Kund'
                                value={invoice?.customerId || ''}
                                items={customers}
                                onChange={(e) => handleChange('customerId', e)}
                                labelWidth="w-20"
                                margintop="0"
                            />

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
    )
}

export default Invoice