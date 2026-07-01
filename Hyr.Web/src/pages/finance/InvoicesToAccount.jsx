import React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import apiClient from '../../lib/apiClient';
import DateRangePicker from '../../components/DaterangePicker';

function formatDateForQuery(value) {
    if (!value) {
        return '';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toISOString().slice(0, 10);
}

const InvoicesToAccount = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [processingResults, setProcessingResults] = useState({});

    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const [filters, setFilters] = useState({
        page: 1,
        pageSize: 20,
        sortBy: '',
        sortDirection: 'asc',
        isAccounted: true
    });


    const buildAndExecuteQuery = (newFromDate = fromDate, newToDate = toDate, newInvoiceNumber = invoiceNumber, newFilters = null) => {
        const queryParams = new URLSearchParams();
        const currentFilters = newFilters || filters;
        const queryFromDate = formatDateForQuery(newFromDate);
        const queryToDate = formatDateForQuery(newToDate);

        // Add the three main parameters if they have values
        if (queryFromDate) {
            queryParams.append('InvoiceDateFrom', queryFromDate);
        }
        if (queryToDate) {
            queryParams.append('InvoiceDateTo', queryToDate);
        }
        if (newInvoiceNumber) {
            queryParams.append('InvoiceNr', newInvoiceNumber);
        }

        // Always sort by invoice number ascending.
        queryParams.append('SortBy', 'InvoiceNr:asc');
        queryParams.append('SortDirection', currentFilters.sortDirection);
        queryParams.append('Page', currentFilters.page.toString());
        queryParams.append('PageSize', currentFilters.pageSize.toString());
        queryParams.append('IsAccounted', currentFilters.isAccounted.toString());

        // Execute the fetch with built query params
        fetchInvoices(queryParams);
    };

    const fetchInvoices = async (queryParams) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/invoice?${queryParams.toString()}`);
            const data = response.data;
            setTotalPages(data.totalPages);
            setInvoices(data.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    const processSelectedInvoices = async () => {
        const selectedInvoices = invoices.filter(inv => inv.selected);
        if (selectedInvoices.length === 0) {
            alert('Välj minst en faktura att bokföra.');
            return;
        }
        setProcessing(true);
        setProcessingResults({});
        for (const invoice of selectedInvoices) {
            try {
                // Set processing state for current invoice
                setProcessingResults(prev => ({
                    ...prev,
                    [invoice.id]: { status: 'processing', message: 'Bokför...' }
                }));
                const result = await processInvoice(invoice);
                // Update invoice status in the main list
                setInvoices(prev => prev.map(inv =>
                    inv.id === invoice.id
                        ? { ...inv, status: result.status }
                        : inv
                ));
                // Update processing results
                setProcessingResults(prev => ({
                    ...prev,
                    [invoice.id]: {
                        status: 'success',
                        message: result.message || 'Ok'
                    }
                }));
                if (result.status === 'FORTNOX_PAIRING_IN_PROGRESS') {
                    // window.open(result.redirecturl, '_blank');
                    window.open(result.redirecturl, "_blank", "noopener,noreferrer");
                    return
                }

            } catch (error) {
                // Update processing results with error
                setProcessingResults(prev => ({
                    ...prev,
                    [invoice.id]: {
                        status: 'error',
                        message: error.message || 'Fel vid bokföring'
                    }
                }));
            }
        }
        setProcessing(false);
        // buildAndExecuteQuery();
    };


    const processInvoice = async (invoice) => {
        let response;
        try {
            response = await apiClient.post('/invoice/account', JSON.stringify(invoice.id), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            const data = error?.response?.data;
            throw new Error(data?.message || 'Error');
        }
        const data = response.data;
        if (data.status == 'FORTNOX_PAIRING_IN_PROGRESS') {
            return {
                success: false,
                status: 'FORTNOX_PAIRING_IN_PROGRESS',
                message: data.message || 'Fel',
                redirecturl: data.redirecturl

            };
        } else {
            return {
                success: true,
                status: 'Processed',
                message: data.message || 'Ok'
            };
        }
    };


    const handlePeriodApply = ({ startDate, endDate }) => {
        setFromDate(startDate ?? null);
        setToDate(endDate ?? null);

        const newFilters = { ...filters, page: 1 };
        setFilters(newFilters);
        buildAndExecuteQuery(startDate ?? null, endDate ?? null, invoiceNumber, newFilters);
    };

    const handleInvoiceNumberChange = (value) => {
        setInvoiceNumber(value);
        buildAndExecuteQuery(fromDate, toDate, value);
    };

    const handleCheckboxChange = (invoiceId) => {
        setInvoices(prev => prev.map(invoice =>
            invoice.id === invoiceId
                ? { ...invoice, selected: !invoice.selected }
                : invoice
        ));
    };


    useEffect(() => {
        buildAndExecuteQuery();
    }, []);

    const selectedCount = invoices.filter(inv => inv.selected).length;

    return (
        <div className="flex flex-col h-full py-2">
            <div className='ml-5 text-sm text-gray-500'>Bokför fakturor</div>
            <div className={`mt-3 mx-5 flex flex-wrap items-center gap-5 ${loading ? 'pointer-events-none opacity-70' : ''}`}>
                <div className='flex items-center'>
                    <label className="mr-5 text-xs text-gray-700">Period</label>
                    <DateRangePicker
                        presets={['this-month', 'last-month', 'last-3-months', 'last-12-months', 'last-year', 'year-to-date']}
                        placeholder="Välj period"
                        onApply={handlePeriodApply}
                        triggerRadius="full"
                        triggerClassName="h-7 w-[260px] border-lime-600 px-3 text-xs text-gray-700 focus:border-lime-700"
                        openTriggerClassName="border-lime-700 ring-1 ring-lime-200"
                        closedTriggerClassName="border-lime-600 hover:border-lime-700"
                    />
                    <label className="ml-10 mr-5 text-xs text-gray-700">Fakturanr.</label>
                    <input
                        type="number"
                        value={invoiceNumber}
                        onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                        className="h-7 w-[120px] rounded-full border border-lime-600 bg-white px-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                        placeholder=""
                    />
                    <button
                        className={`ml-10 h-7 w-40 rounded-full border border-lime-700 bg-lime-700 px-3 text-center text-xs text-white transition hover:bg-lime-900 disabled:cursor-not-allowed disabled:opacity-50`}
                        disabled={selectedCount === 0}
                        onClick={processSelectedInvoices}>Bokför valda fakturor</button>
                    {selectedCount > 0 && <div className='w-50 ml-10 text-xs text-gray-500'>Valda fakturor: <strong>{selectedCount}</strong></div>}
                </div>
                {/* Pagination Controls */}
                <div className="ml-auto mr-4 flex items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                    <div className="mr-3 text-xs text-gray-700">
                        {/* Visar {filters.pageSize} fakturor per sida.  */}
                        Sida <strong>{filters.page}</strong> av <strong>{totalPages || 1}</strong>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: Math.max(1, filters.page - 1) };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={filters.page <= 1 || loading}
                            className="disabled:cursor-not-allowed disabled:opacity-50">
                            <ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                        </button>
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: filters.page + 1 };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={loading || invoices.length < filters.pageSize}
                            className="disabled:cursor-not-allowed disabled:opacity-50">
                            <ArrowRightCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                        </button>
                        {/* <button
                            onClick={() => {
                                const newFilters = { ...filters, page: Math.max(1, filters.page - 1) };
                                setFilters(newFilters);
                                buildAndExecuteQuery();
                            }}
                            disabled={filters.page <= 1 || loading}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: filters.page + 1 };
                                setFilters(newFilters);
                                buildAndExecuteQuery();
                            }}
                            disabled={loading || invoices.length < filters.pageSize}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300"
                        >
                            Next
                        </button> */}
                    </div>
                </div>


            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {error}
                </div>
            )}

            <div className='mx-3 border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto'>
                {loading || !invoices ? (
                    <div className='skeleton-content'><Skeleton count={3} className="h-5 m-0" /></div>
                ) :
                    (
                        <table className="min-w-full divide-y divide-gray-100" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                            <thead>
                                <tr>
                                    <th className='w-10'>
                                        <input
                                            type="checkbox"
                                            checked={invoices.length > 0 && invoices.every(inv => inv.selected)}
                                            onChange={(e) => {
                                                setInvoices(prev => prev.map(invoice => ({
                                                    ...invoice,
                                                    selected: e.target.checked
                                                })));
                                            }}
                                            className="h-3 w-3.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 border-gray-300"
                                        />
                                    </th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturanr</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Kund</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturadatum</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Förfallodatum</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider w-50 text-right">Belopp ink moms</th>
                                    <th className="pl-10 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider w-150">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {!invoices || invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-14 whitespace-nowrap text-sm text-gray-500 text-center">Inga fakturor att visa</td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => {
                                        const currentProcessingResult = processingResults[invoice.id];
                                        return (
                                            <tr
                                                key={invoice.id}
                                                className={selectedRowId === invoice.id ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                                                onClick={() => setSelectedRowId((prev) => (prev === invoice.id ? null : invoice.id))}
                                            >
                                                <td className="px-6 py-0 whitespace-nowrap">
                                                    <input
                                                        key={invoice.id}
                                                        type="checkbox"
                                                        checked={invoice.selected}
                                                        onChange={() => handleCheckboxChange(invoice.id)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        className="mt-2 py-0 h-3 w-3.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 border-gray-300"
                                                    />
                                                </td>
                                                <td className="pl-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">
                                                    <NavLink
                                                        to={`/finance/invoice/${invoice.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sky-700 decoration-sky-300 underline-offset-2 hover:underline hover:text-sky-800"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        {invoice.invoiceNr}
                                                    </NavLink>
                                                </td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{invoice.customerName}</td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800  text-right">{Number(invoice.totSum).toLocaleString('sv-SE')} <span className='text-gray-400'>SEK</span></td>
                                                <td className="pl-10 whitespace-nowrap">
                                                    {currentProcessingResult && (
                                                        <div className="flex">
                                                            {currentProcessingResult.status === 'processing' && (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                                                                    <span className="text-xs text-blue-600">Bokför...</span>
                                                                </>
                                                            )}
                                                            {currentProcessingResult.status === 'success' && (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                                                    <span className="text-xs text-green-600">
                                                                        {currentProcessingResult.message}
                                                                    </span>
                                                                </>
                                                            )}
                                                            {(currentProcessingResult.status === 'error' || currentProcessingResult.status === 'FORTNOX_PAIRING_IN_PROGRESS') && (
                                                                <>
                                                                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                                                    <span className="text-xs text-red-600">
                                                                        {currentProcessingResult.message}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    }
                                    )
                                )}
                            </tbody>
                        </table>
                    )
                }
            </div>


        </div >
    )
}

export default InvoicesToAccount