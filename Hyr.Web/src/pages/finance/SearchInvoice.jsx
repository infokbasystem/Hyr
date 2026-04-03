import React from 'react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, AlertTriangle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

const SearchInvoice = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [totalPages, setTotalPages] = useState(1);

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const [filters, setFilters] = useState({
        page: 1,
        pageSize: 20
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

        // Add sort parameters
        queryParams.append('SortBy', 'InvoiceDate:desc');
        queryParams.append('SortBy', 'InvoiceNr:desc');
        queryParams.append('Page', currentFilters.page.toString());
        queryParams.append('PageSize', currentFilters.pageSize.toString());

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
            setError(error.message);
        } finally {
            setLoading(false);
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


    useEffect(() => {
        buildAndExecuteQuery();
    }, []);


    return (
        <div className="flex flex-col h-full p-2">
            <div className='ml-5 text-sm text-gray-500'>Sök fakturor</div>
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
                                        <td colSpan="6" className="px-6 py-14 whitespace-nowrap text-sm text-gray-500 text-center">Inga fakturor att visa</td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const dueDate = new Date(invoice.dueDate);
                                        dueDate.setHours(0, 0, 0, 0);
                                        const isOverdue = dueDate < today;
                                        
                                        return (
                                            <tr key={invoice.id} className={isOverdue ? 'bg-red-50' : ''}>
                                                <td className="pl-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">
                                                    <NavLink to={`/finance/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">{invoice.invoiceNr}</NavLink>
                                                </td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{invoice.customerName}</td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">
                                                    <div className="flex items-center gap-1">
                                                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                                                        <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                                                            {new Date(invoice.dueDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800  text-right">{Number(invoice.totSum).toLocaleString('sv-SE')} <span className='text-gray-400'>SEK</span></td>
                                                <td className="pl-10 pt-[6px] pb-[4px] whitespace-nowrap text-xs text-gray-800">{invoice.status}</td>
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

export default SearchInvoice
