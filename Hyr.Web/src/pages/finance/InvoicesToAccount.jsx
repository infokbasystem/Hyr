import React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Calendar, Filter, Play, Loader2, CheckCircle, XCircle, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

const InvoicesToAccount = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processingResults, setProcessingResults] = useState({});

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
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

        // Add the three main parameters if they have values
        if (newFromDate) {
            queryParams.append('InvoiceDateFrom', newFromDate);
        }
        if (newToDate) {
            queryParams.append('InvoiceDateTo', newToDate);
        }
        if (newInvoiceNumber) {
            queryParams.append('InvoiceNr', newInvoiceNumber);
        }

        // Add additional filter parameters
        if (currentFilters.sortBy) {
            queryParams.append('SortBy', currentFilters.sortBy);
        }
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
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/invoice?${queryParams.toString()}`, {
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
            setTotalPages(data.totalPages);
            setInvoices(data.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setError(err.message);
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
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiUrl}/invoice/account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(invoice.id),
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Error');
            return;
        }
        const data = await res.json();
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


    const handleFromDateChange = (value) => {
        setFromDate(value);
        buildAndExecuteQuery(value, toDate, invoiceNumber);
    };

    const handleToDateChange = (value) => {
        setToDate(value);
        buildAndExecuteQuery(fromDate, value, invoiceNumber);
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
        <div className="flex flex-col h-full p-2">
            <div className='ml-5 text-sm text-gray-500'>Bokför fakturor</div>
            <div className='flex justify-between items-center mt-3 ml-5'>
                <div className='flex items-center'>
                    <label className="mr-5 text-xs text-gray-700">Period</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => handleFromDateChange(e.target.value)}
                        className="w-30 text-xs px-2 py-1 border border-gray-300 bg-white rounded-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => handleToDateChange(e.target.value)}
                        className="ml-1 w-30 text-xs px-2 py-1 border border-gray-300 bg-white rounded-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <label className="ml-10 mr-5 text-xs text-gray-700">Fakturanr.</label>
                    <input
                        type="number"
                        value={invoiceNumber}
                        onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                        className="ml-1 w-30 text-xs px-2 py-1 border border-gray-300 bg-white rounded-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder=""
                    />
                    <button
                        className={`shadow-md/30 ml-10 w-40 text-center text-xs text-white bg-lime-700 hover:bg-lime-900 p-[5px] ${selectedCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                        disabled={selectedCount === 0}
                        onClick={processSelectedInvoices}>Bokför valda fakturor</button>
                    {selectedCount > 0 && <div className='w-50 ml-10 text-xs text-gray-500'>Valda fakturor: <strong>{selectedCount}</strong></div>}
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center">
                    <div className="mr-3 text-xs text-gray-700">
                        Visar {filters.pageSize} fakturor per sida.   Sida <strong>{filters.page}</strong> av <strong>{totalPages || 1}</strong>
                    </div>
                    <div className="flex gap-1 mr-10">
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: Math.max(1, filters.page - 1) };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={filters.page <= 1 || loading}
                            className="disabled:opacity-50 disabled:cursor-not-allowed">
                            <ArrowLeftCircle className="h-5 w-5 text-red-400 hover:text-red-500 disabled:opacity-50 disabled:text-gray-500" />
                        </button>
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: filters.page + 1 };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={loading || invoices.length < filters.pageSize}
                            className="disabled:opacity-50 disabled:cursor-not-allowed">
                            <ArrowRightCircle className="h-5 w-5 text-red-400 hover:text-red-600 disabled:opacity-50 disabled:text-gray-500" />
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

            <div className='border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto'>
                {loading || !invoices ? (
                    <div className='skeleton-content'><Skeleton count={3} className="h-5 m-0" /></div>
                ) :
                    (
                        <table className="min-w-full divide-y divide-gray-100">
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
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider">Fakturanr</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider">Kund</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider">Fakturadatum</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider">Förfallodatum</th>
                                    <th className="px-2 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider w-50 text-right">Belopp ink moms</th>
                                    <th className="pl-10 py-1.5 text-left text-tiny font-medium text-gray-400 uppercase tracking-wider w-150">Status</th>
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
                                            <tr key={invoice.id} >
                                                <td className="px-6 py-0 whitespace-nowrap">
                                                    <input
                                                        key={invoice.id}
                                                        type="checkbox"
                                                        checked={invoice.selected}
                                                        onChange={() => handleCheckboxChange(invoice.id)}
                                                        className="mt-2 py-0 h-3 w-3.5 text-green-600 focus:outline-none focus:ring-1 focus:ring-green-500 border-gray-300"
                                                    />
                                                </td>
                                                <td className="pl-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">
                                                    <NavLink to={`/finance/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">{invoice.invoiceNr}</NavLink>
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