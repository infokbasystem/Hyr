import React, { useContext, useLayoutEffect } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from 'lucide-react';

import { usePdf } from '../../contexts/PdfContext';
import ConfirmationModal from '../../components/ConfirmationModal';

import LabeledReactSelect from '../../components/LabeledReactSelect';
import NumberInput from '../../components/NumberInput';
import ArticleSearchInput from '../../components/ArticleSearchInput';
import InvoiceCalculations from '../../utils/invoiceCalculations';



const Invoice = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const params = useParams();
    const [invoice, setInvoice] = useState(null);
    const [originalInvoice, setOriginalInvoice] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    // const [pendingAction, setPendingAction] = useState(null);
    const [customers, setCustomers] = useState([]);

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

            // Auto-calculate sum when qty or unitPrice changes
            if (field === 'qty' || field === 'unitPrice' || field === 'discountRate') {
                const qty = field === 'qty' ? parseFloat(value) || 0 : parseFloat(updatedRows[rowIndex].qty) || 0;
                const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(updatedRows[rowIndex].unitPrice) || 0;
                const discountRate = parseFloat(field === 'discountRate' ? value : updatedRows[rowIndex].discountRate) || 0;
                updatedRows[rowIndex].sum = qty * unitPrice * (1 - discountRate / 100);

                // Calculate VAT
                const vatRowIndex = updatedRows.findIndex(r => r.invoiceRowType?.toLowerCase() === 'vat');
                const vatAmount = updatedRows
                    .filter(r => !['vat', 'rounding'].includes(r.invoiceRowType?.toLowerCase?.()))
                    .reduce((sum, r) => sum + (parseFloat(r.sum) || 0) * (parseFloat(r.vatRate) || 0) / 100, 0);
                if (vatRowIndex !== -1) {
                    // Update existing VAT row
                    updatedRows[vatRowIndex].sum = vatAmount;
                } else {
                    // Add new VAT row
                    const vatRow = {
                        id: 0,
                        tempId: Math.random(),
                        invoiceRowType: 'vat',
                        sum: vatAmount,
                    };
                    updatedRows.push(vatRow);
                }

                // Calculate rounding
                const subtotal = updatedRows
                    .filter(r => !['rounding'].includes(r.invoiceRowType?.toLowerCase?.()))
                    .reduce((sum, r) => sum + (parseFloat(r.sum) || 0), 0);

                const roundingAmount = InvoiceCalculations.calculateRounding(subtotal);

                const roundingRowIndex = updatedRows.findIndex(r => r.invoiceRowType?.toLowerCase() === 'rounding');
                if (roundingRowIndex !== -1) {
                    updatedRows[roundingRowIndex].sum = roundingAmount;
                } else {
                    const roundingRow = {
                        id: 0,
                        tempId: Math.random(),
                        invoiceRowType: 'rounding',
                        sum: roundingAmount,
                    };
                    updatedRows.push(roundingRow);
                }
            }

            return { ...prev, invoiceRows: updatedRows };
        });
    };

    const addNewRow = () => {
        markStale();
        const newRow = {
            id: 0,
            tempId: Math.random(),
            officeId: null,
            invoiceId: invoice?.id || null,
            itemId: null,
            reservationCalcItemId: null,
            sortNr: (invoice?.invoiceRows?.length || 0) + 1,
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
            invoiceRows: [...(prev?.invoiceRows || []), newRow]
        }));
    };

    const deleteRow = (tempId) => {
        markStale();
        setInvoice(prev => ({
            ...prev,
            invoiceRows: (prev?.invoiceRows || []).filter(r => getRowTempId(r) !== tempId)
        }));
    };

    const handleArticleSelect = (rowId, article) => {
        handleRowChange(rowId, 'articleId', article.id);
        handleRowChange(rowId, 'articleNr', article.articleNr || '');
        handleRowChange(rowId, 'text1', article.name || article.description || '');
        handleRowChange(rowId, 'unitPrice', article.price || 0);
        handleRowChange(rowId, 'vatRate', article.vatRate || 25);
        handleRowChange(rowId, 'accountNr', article.accountNr || null);
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

    const handleSaveOrClose = async (e) => {
        e.preventDefault();
        if (hasUnsavedChanges()) {
            await submitInvoice(e);
        } else {
            window.close();
        }
    };

    const hasUnsavedChanges = () => {
        if (!invoice || !originalInvoice) return false;
        const isSame = JSON.stringify(invoice) !== JSON.stringify(originalInvoice);
        console.log('hasUnsavedChanges:', isSame);
        return isSame;
    };


    const getInvoiceById = async (id, calculationId) => {
        console.log('getInvoiceById', id);
        try {
            const token = localStorage.getItem('token');
            const queryParams = calculationId ? `?calculationId=${calculationId}` : '';
            const response = await fetch(`${apiUrl}/invoice/${id}${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

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
            // load address lists for customer and supplier (if present)
            await fetchCustomerDeliveryAddresses(data?.customerId);
            await fetchSupplierPickupAddresses(data?.supplierId);
            // setOriginalFiles(attachments);
            setAttachedFiles(attachments.map(f => ({ ...f })));
            return invoiceData;
        }
        catch (error) {
            console.error('Error getting invoice by ID:', error);
            return null;
        }
    }

    const submitInvoice = async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        if (!invoice) {
            console.error('No invoice data to submit');
            return;
        }
        console.log('invoice:', invoice);

        const token = localStorage.getItem('token');
        const invoiceData = { ...invoice };
        const res = await fetch(`${apiUrl}/invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(invoiceData),
        });
        if (!res.ok) {
            const errorText = await res.text();
            setMessages([{ type: 'error', text: errorText }]);
            return;
        }
        const data = await res.json();
        console.log('invoice updated:', data);
        await getInvoiceById(data);
        window.history.replaceState({}, '', `/sales/invoice/${data}`);
        clearStale?.();
        // Reload the PDF after successful save without triggering unsaved warning
        if (showPdfPanel) {
            await getPdf({ ignoreUnsaved: true });
        }
        setMessages([{ type: 'success', text: 'Fakturan sparad' }]);
    };

    const deleteInvoice = async () => {
        if (!invoice?.id) {
            console.error('No invoice ID to delete');
            return;
        }

        setShowDeleteConfirm(false);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${apiUrl}/invoice/${invoice.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!res.ok) {
                const errorText = await res.text();
                setMessages([{ type: 'error', text: errorText || 'Kunde inte ta bort förfrågan' }]);
                return;
            }

            setMessages([{ type: 'success', text: 'Fakturan borttagen' }]);
            // Navigate back to a list or home page after deletion
            setTimeout(() => {
                navigate('/sales/inquiries');
            }, 1000);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            setMessages([{ type: 'error', text: 'Ett fel uppstod vid borttagning' }]);
        }
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
            const token = localStorage.getItem('token');
            const res = await fetch(`${apiUrl}/pdf/invoice/${invoice.id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Response ok:', res.ok, 'content-type:', res.headers.get('content-type'));
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            const blob = await res.blob();
            console.log('Blob size:', blob.size, 'type:', blob.type);
            const url = URL.createObjectURL(blob);
            openPdfPreview(url); // update the panel with the real PDF
        } catch (error) {
            console.error('Error getting inquiry PDF:', error);
            // Optional: toast.error('Kunde inte ladda PDF');
            // Optional: keep panel open to show an error state in PdfPanel
        }
    };


    // Initial data fetching - runs once on mount
    useEffect(() => {
        if (params.id === 'new') {
            getInvoiceById(params.id, null);
        } else {
            getInvoiceById(params.id, null);
        }
    }, []);

    // Cleanup: close PDF panel when component unmounts (navigating away)
    useEffect(() => {
        return () => {
            closePdfPreview?.();
        };
    }, [closePdfPreview]);



    return (
        <div className="relative flex flex-col h-full p-2">
            <h2 className="ml-5 pb-2 text-sm text-gray-700">{invoice?.id ? (<>Faktura <span className="text-red-500">{invoice.invoiceNr}</span></>) : ("Ny faktura")}</h2>

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

            <div className="flex h-full items-stretch">

                <div className="flex-grow pe-10 py-2 ml-2">
                    <form onSubmit={submitInvoice} autoComplete="off">
                        <div className="flex justify-between w-full mb-5">
                            <div className='flex items-center space-x-4'>
                                <button
                                    type='button'
                                    onClick={handleSaveOrClose}
                                    className={`w-25 shadow-md/30 text-xs text-white ${hasUnsavedChanges() ? 'bg-lime-700 hover:bg-lime-900': 'bg-orange-400 hover:bg-orange-500'} px-5 p-[5px]`}
                                >
                                    {hasUnsavedChanges() ? 'Spara' : 'Stäng'}
                                </button>
                                {invoice?.id != 0 && (
                                    <button
                                        type="button"
                                        onClick={getPdf}
                                        className="shadow-md/30 text-xs text-gray bg-blue-200 hover:bg-blue-300 px-4 py-[5px] ml-10"
                                    >
                                        Skriv ut
                                    </button>
                                )}
                            </div>
                            <div className='flex items-center space-x-4'>
                                {invoice?.id != 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteClick}
                                        className="shadow-md/30 text-xs text-white bg-red-700 hover:bg-red-800 px-5 p-[5px]"
                                    >
                                        Radera
                                    </button>
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
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-t border-gray-300">
                                            <th className="px-2 py-2 text-left text-tiny font-medium text-gray-400 uppercase w-10">Sort</th>
                                            <th className="px-3 py-2 text-left text-tiny font-medium text-gray-400 uppercase w-40">Artikelnr</th>
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
                                        {(invoice?.invoiceRows || []).filter(row => !['vat', 'rounding'].includes(row.invoiceRowType?.toLowerCase?.())).map((row, index) => (
                                            <tr key={getRowTempId(row)} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                                                <td className="px-2 py-0.5 text-xs text-gray-600">{index + 1}</td>
                                                <td className="p-0">
                                                    <ArticleSearchInput
                                                        value={row.articleNr}
                                                        onChange={(value) => handleRowChange(getRowTempId(row), 'articleNr', value)}
                                                        onArticleSelect={(article) => handleArticleSelect(getRowTempId(row), article)}
                                                        apiUrl={apiUrl}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <input
                                                        type="text"
                                                        value={row.text1 || ''}
                                                        onChange={(e) => handleRowChange(getRowTempId(row), 'text1', e.target.value)}
                                                        className="w-full h-full text-xs px-3 py-1 bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <input
                                                        type="text 2"
                                                        value={row.text2 || ''}
                                                        onChange={(e) => handleRowChange(getRowTempId(row), 'text2', e.target.value)}
                                                        className="w-full h-full text-xs px-3 py-1 bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="discountRate"
                                                        value={row.discountRate || ''}
                                                        onChange={handleRowChange}
                                                        className="w-full h-full text-xs border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                        decimals={2}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="qty"
                                                        value={row.qty || ''}
                                                        onChange={handleRowChange}
                                                        className="w-full h-full text-xs border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                        decimals={2}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="unitPrice"
                                                        value={row.unitPrice || ''}
                                                        onChange={handleRowChange}
                                                        className="w-full h-full text-xs border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                        decimals={2}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="sum"
                                                        value={row.sum || ''}
                                                        disabled={true}
                                                        className="w-full h-full text-xs border-0 text-right text-gray-600"
                                                        decimals={2}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="vatRate"
                                                        value={row.vatRate || ''}
                                                        onChange={handleRowChange}
                                                        className="w-full h-full text-xs border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                        decimals={2}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <NumberInput
                                                        rowId={getRowTempId(row)}
                                                        field="accountNr"
                                                        value={row.accountNr || ''}
                                                        onChange={handleRowChange}
                                                        className="w-full h-full text-xs border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                        decimals={0}
                                                    />
                                                </td>
                                                <td className="p-0">
                                                    <input
                                                        type="text"
                                                        value={row.costCenter || ''}
                                                        onChange={(e) => handleRowChange(getRowTempId(row), 'costCenter', e.target.value)}
                                                        className="w-full text-xs px-3 py-1 border-0 text-right focus:outline-none focus:bg-white focus:border focus:border-blue-400"
                                                    />
                                                </td>
                                                <td className="px-0 text-center">
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
                                            <td className="px-2 py-0.5 text-xs text-gray-400">{(invoice?.invoiceRows?.length || 0) + 1}</td>
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
                            {(invoice?.invoiceRows?.length || 0) > 0 && (
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

                {/* Right bar */}
                <div className="flex flex-col w-70 border-l border-gray-300 px-4 py-2 mb-20">
                    <div className="space-y-3">
                        <h2 className="text-sm text-center text-gray-700">Info</h2>
                        <div className="space-y-2 text-xs text-gray-600">
                            <div className="grid grid-cols-5 gap-4 mx-2">
                                {invoice?.createdDate && (
                                    <>
                                        <div className="col-span-1">
                                            <span className="font-medium">Skapad:</span>
                                        </div>
                                        <div className="col-span-2">
                                            {new Date(invoice.createdDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="col-span-2 text-gray-500">
                                            {invoice?.createdByUserName && `av ${invoice.createdByUserName}`}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-5 gap-4 mx-2">
                                {invoice?.editedDate && (
                                    <>
                                        <div className="col-span-1">
                                            <span className="font-medium">Redigerad:</span>
                                        </div>
                                        <div className="col-span-2">
                                            {new Date(invoice.editedDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="col-span-2 text-gray-500">
                                            {invoice?.editedByUserName && `av ${invoice.editedByUserName}`}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <hr className="mt-7 border-gray-300 dark:border-white" />
                    <h2 className="text-sm text-center text-gray-700 mt-5">Meddelanden</h2>
                    {messages.length == 0 ? (
                        <p className='text-xs text-center font-light mt-5'>Inga meddelanden</p>
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

            </div>

        </div>
    )
}

export default Invoice