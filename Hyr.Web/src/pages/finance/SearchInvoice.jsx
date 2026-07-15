import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, AlertTriangle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import apiClient from '../../lib/apiClient';
import DateRangePicker from '../../components/DaterangePicker';

function formatDate(value) {
    if (!value) {
        return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toLocaleDateString('sv-SE');
}

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

const SearchInvoice = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedRowId, setSelectedRowId] = useState(null);

    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const [filters, setFilters] = useState({
        page: 1,
        pageSize: 20
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


    useEffect(() => {
        buildAndExecuteQuery();
    }, []);


    return (
        <div className="flex h-full flex-col py-2">
            <div className='ml-10 text-sm text-gray-500'>Sök fakturor</div>

            <div className={`mt-3 mx-8 flex flex-wrap items-center gap-5 ${loading ? 'pointer-events-none opacity-70' : ''}`}>
                <div className='flex items-center'>
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
                </div>

                <div className="ml-auto mr-4 flex items-center" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                    {/* <div className="ml-4 text-xs text-gray-500">
                        Fakturor: <strong>{invoices.length}</strong>
                    </div> */}

                    <div className="ml-6 flex items-center">
                        <span className="mr-3 text-xs text-gray-700">
                            Sida <strong>{filters.page}</strong> av <strong>{totalPages || 1}</strong>
                        </span>

                        <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: Math.max(1, filters.page - 1) };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={filters.page <= 1 || loading}
                            className="disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                        </button>
                        <button
                            onClick={() => {
                                const newFilters = { ...filters, page: filters.page + 1 };
                                setFilters(newFilters);
                                buildAndExecuteQuery(fromDate, toDate, invoiceNumber, newFilters);
                            }}
                            disabled={loading || invoices.length < filters.pageSize}
                            className="disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ArrowRightCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                        </button>
                    </div>
                </div>
            </div>
            </div>

            {error && (
                <div className="mt-4 mx-8 w-fit rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                    {error}
                </div>
            )}

            <div className='mt-4 mx-8 flex-1 overflow-auto border-t border-gray-300 py-1'>
                <table className="w-full min-w-full border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                            <thead>
                                <tr>
                                    <th className="w-[90px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturanr</th>
                                    <th className="w-[26%] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Kund</th>
                                    <th className="w-[110px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturadatum</th>
                                    <th className="w-[110px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Förfallodatum</th>
                                    <th className="w-[130px] whitespace-nowrap px-2 pt-1.5 pb-2 text-right text-tiny font-medium text-gray-400 tracking-wider">Belopp ink moms</th>
                                    <th className="w-[120px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Status</th>
                                </tr>
                            </thead>

                            <tbody className={`divide-y divide-gray-100 ${!loading && invoices.length > 0 ? 'bg-white' : 'bg-transparent'}`}>
                                {loading ? (
                                    Array.from({ length: 12 }).map((_, index) => (
                                        <tr key={`skeleton-${index}`} className="border-b border-gray-100">
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                            <td className="px-2 py-1"><Skeleton height={14} /></td>
                                        </tr>
                                    ))
                                ) : !invoices || invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-6 text-center text-xs text-gray-400">Inga fakturor att visa</td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const dueDate = new Date(invoice.dueDate);
                                        dueDate.setHours(0, 0, 0, 0);
                                        const isOverdue = dueDate < today;
                                        
                                        return (
                                            <tr
                                                key={invoice.id}
                                                className={selectedRowId === invoice.id
                                                    ? (isOverdue ? 'bg-red-100' : 'bg-lime-100')
                                                    : (isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-transparent hover:bg-lime-50')}
                                                onClick={() => setSelectedRowId((prev) => (prev === invoice.id ? null : invoice.id))}
                                            >
                                                <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
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
                                                <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{invoice.customerName}</td>
                                                <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{formatDate(invoice.invoiceDate)}</td>
                                                <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">
                                                    <div className="flex items-center gap-1">
                                                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                                                        <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                                                            {formatDate(invoice.dueDate)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-2 pb-[4px] pt-[6px] text-right text-xs text-gray-800">{Number(invoice.totSum).toLocaleString('sv-SE')} <span className='text-gray-400'>SEK</span></td>
                                                <td className="px-2 pb-[4px] pt-[6px] text-xs text-gray-800">{invoice.status}</td>
                                            </tr>
                                        )
                                    }
                                    )
                                )}
                            </tbody>
                        </table>
            </div>


        </div >
    )
}

export default SearchInvoice
