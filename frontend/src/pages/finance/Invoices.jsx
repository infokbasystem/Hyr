import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, AlertTriangle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import apiClient from '../../lib/apiClient';
import DateRangePicker from '../../components/DaterangePicker';

const INVOICE_SEARCH_CACHE_KEY = 'finance-invoice-search-page-state';

function readCachedInvoiceState() {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(INVOICE_SEARCH_CACHE_KEY);
        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function parseDateOnly(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return null;
    }

    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

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

const Invoices = () => {
    const cachedState = readCachedInvoiceState();
    const requestSequenceRef = useRef(0);
    const didMountRef = useRef(false);
    const hadCachedSnapshotRef = useRef(Boolean(cachedState?.searchLoaded));

    const [loading, setLoading] = useState(!cachedState?.searchLoaded);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState(cachedState?.invoices ?? []);
    const [totalPages, setTotalPages] = useState(cachedState?.totalPages ?? 1);
    const [selectedRowId, setSelectedRowId] = useState(cachedState?.selectedRowId ?? null);
    const [hasSearchSnapshot, setHasSearchSnapshot] = useState(Boolean(cachedState?.searchLoaded));

    const [fromDate, setFromDate] = useState(parseDateOnly(cachedState?.fromDate));
    const [toDate, setToDate] = useState(parseDateOnly(cachedState?.toDate));
    const [invoiceNumber, setInvoiceNumber] = useState(cachedState?.invoiceNumber ?? '');

    const [filters, setFilters] = useState({
        page: cachedState?.filters?.page ?? 1,
        pageSize: cachedState?.filters?.pageSize ?? 20
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.sessionStorage.setItem(
            INVOICE_SEARCH_CACHE_KEY,
            JSON.stringify({
                invoices,
                totalPages,
                selectedRowId,
                fromDate: formatDateForQuery(fromDate),
                toDate: formatDateForQuery(toDate),
                invoiceNumber,
                filters,
                searchLoaded: hasSearchSnapshot
            })
        );
    }, [invoices, totalPages, selectedRowId, fromDate, toDate, invoiceNumber, filters, hasSearchSnapshot]);


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

        return queryParams;
    };

    const fetchInvoices = async (queryParams, requestId) => {
        try {
            const response = await apiClient.get(`/invoice?${queryParams.toString()}`);
            const data = response.data;

            if (requestId !== requestSequenceRef.current) {
                return;
            }

            setTotalPages(data.totalPages);
            const incomingInvoices = data.data ?? [];
            setInvoices(incomingInvoices);
            setSelectedRowId((prev) => (incomingInvoices.some((invoice) => invoice.id === prev) ? prev : null));
        } catch (error) {
            if (requestId !== requestSequenceRef.current) {
                return;
            }

            console.error('Error fetching invoices:', error);
            setError(error.message);
        }
    };


    const handlePeriodApply = ({ startDate, endDate }) => {
        setFromDate(startDate ?? null);
        setToDate(endDate ?? null);

        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    const handleInvoiceNumberChange = (value) => {
        setInvoiceNumber(value);
    };


    useEffect(() => {
        let isDisposed = false;

        const timer = window.setTimeout(async () => {
            const requestId = ++requestSequenceRef.current;
            const isWarmStartRefresh = !didMountRef.current && hadCachedSnapshotRef.current;
            const queryParams = buildAndExecuteQuery();

            if (!isWarmStartRefresh) {
                setLoading(true);
            }

            setError(null);

            try {
                if (isDisposed) {
                    return;
                }

                await fetchInvoices(queryParams, requestId);
            } finally {
                if (!isDisposed && requestId === requestSequenceRef.current) {
                    if (!isWarmStartRefresh) {
                        setLoading(false);
                    }

                    setHasSearchSnapshot(true);

                    if (!didMountRef.current) {
                        didMountRef.current = true;
                    }
                }
            }
        }, 250);

        return () => {
            isDisposed = true;
            window.clearTimeout(timer);
        };
    }, [fromDate, toDate, invoiceNumber, filters.page, filters.pageSize]);


    return (
        <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
            {/* <div className='ml-10 text-sm text-gray-500'>Sök fakturor</div> */}

            <div className={`mt-3 flex flex-wrap items-center gap-5 ${loading && !hasSearchSnapshot ? 'pointer-events-none opacity-70' : ''}`}>
                <div className='flex items-center gap-10'>
                    <DateRangePicker
                        presets={['this-month', 'last-month', 'last-3-months', 'last-12-months', 'last-year', 'year-to-date']}
                        placeholder="Välj period"
                        onApply={handlePeriodApply}
                        initialStartDate={fromDate}
                        initialEndDate={toDate}
                        triggerRadius="full"
                        triggerClassName="h-7 w-[260px] border-lime-600 px-3 text-xs text-gray-700 focus:border-lime-700"
                        openTriggerClassName="border-lime-700 ring-1 ring-lime-200"
                        closedTriggerClassName="border-lime-600 hover:border-lime-700"
                        widthClassName="w-60"
                    />
                    <input
                        type="number"
                        value={invoiceNumber}
                        onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                        className="h-7 w-[120px] rounded-full border border-lime-600 bg-white px-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                        placeholder="Fakturanr"
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
                <div className="mt-4 w-fit rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                    {error}
                </div>
            )}

            <div className='mt-4 flex-1 overflow-auto border-t border-gray-300 py-1'>
                <table className="w-full min-w-full border-collapse text-xs" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                            <thead>
                                <tr>
                                    <th className="w-[90px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturanr</th>
                                    <th className="w-[26%] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Kund</th>
                                    <th className="w-[110px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturadatum</th>
                                    <th className="w-[110px] whitespace-nowrap px-2 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Förfallodatum</th>
                                    <th className="w-[130px] whitespace-nowrap px-2 pt-1.5 pb-2 text-right text-tiny font-medium text-gray-400 tracking-wider">Belopp ink moms</th>
                                    <th className="w-[120px] whitespace-nowrap pl-5 pt-1.5 pb-2 text-left text-tiny font-medium text-gray-400 tracking-wider">Status</th>
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
                                                <td className="px-2 pb-[4px] pt-[6px] text-right text-xs text-gray-800">{Number(invoice.totSum).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className='text-tiny ml-1 text-gray-400'>SEK</span></td>
                                                <td className="pl-5 text-xs text-gray-800">
                                                    <div className="flex flex-wrap items-center gap-1">
                                                        {isOverdue && !invoice.isSettled && (
                                                            <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-tiny tracking-wider text-amber-800">
                                                                Förfallen
                                                            </span>
                                                        )}
                                                        {invoice.isCancelled && (
                                                            <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-tiny tracking-wider text-rose-700">
                                                                Makulerad
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
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

export default Invoices
