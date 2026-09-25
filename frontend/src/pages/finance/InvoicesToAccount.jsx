import React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import apiClient from '../../lib/apiClient';
import DateRangePicker from '../../components/DaterangePicker';

function SelectCircleCheckbox({ checked, onChange, ariaLabel }) {
    function handleKeyDown(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            onChange();
        }
    }

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onChange}
            onKeyDown={handleKeyDown}
            className="inline-flex h-[15px] w-[15px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f1f3f2] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-700"
        >
            <span
                className={`inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border shadow-[inset_0_0px_0_rgba(255,255,255,0.95)] transition-all ${checked ? 'border-[#368b3f] bg-[#3f9848]' : 'border-[#c8cfcb] bg-white'
                    }`}
            >
                <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
                >
                    <path d="M3 8.5 6.3 11.6 13 4.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        </button>
    );
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

const USE_DUMMY_ACCOUNTING = false

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const InvoicesToAccount = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processingResults, setProcessingResults] = useState({});
    const requestSequenceRef = useRef(0);
    const autoBookNextPageRef = useRef(false);
    const pendingAutoBookPageRef = useRef(null);
    const autoBookReadyPageRef = useRef(null);
    const bookingPromptHideTimerRef = useRef(null);
    const skeletonTimerRef = useRef(null);

    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [bookingPrompt, setBookingPrompt] = useState(null);
    const [bookingPromptVisible, setBookingPromptVisible] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);

    const [filters, setFilters] = useState({
        page: 1,
        pageSize: 20,
        sortBy: '',
        sortDirection: 'asc',
        isAccounted: true
    });

    const processInvoiceBatch = async (batchInvoices, currentPage) => {
        if (batchInvoices.length === 0) {
            alert('Välj minst en faktura att bokföra.');
            return;
        }

        setProcessing(true);
        setProcessingResults({});

        for (const invoice of batchInvoices) {
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
                    setProcessing(false);
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

        const bookedAllInvoicesOnPage = batchInvoices.length === invoices.length;

        if (currentPage < totalPages && bookedAllInvoicesOnPage) {
            setBookingPrompt({
                currentPage,
                nextPage: currentPage + 1,
            });
            setBookingPromptVisible(true);
        } else {
            setBookingPrompt(null);
            setBookingPromptVisible(false);
        }
    };

    const processSelectedInvoices = async () => {
        const selectedInvoices = invoices.filter(inv => inv.selected);
        await processInvoiceBatch(selectedInvoices, filters.page);
    };


    const processInvoice = async (invoice) => {
        if (USE_DUMMY_ACCOUNTING) {
            await delay(500)

            return {
                success: true,
                status: 'Processed',
                message: 'Testbokförd',
            }
        }

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

        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    const handleInvoiceNumberChange = (value) => {
        setInvoiceNumber(value);
    };

    const continueBookingNextPage = () => {
        if (filters.page >= totalPages) {
            setBookingPromptVisible(false);
            window.clearTimeout(bookingPromptHideTimerRef.current);
            bookingPromptHideTimerRef.current = window.setTimeout(() => {
                setBookingPrompt(null);
            }, 180);
            return;
        }

        autoBookNextPageRef.current = true;
        pendingAutoBookPageRef.current = filters.page + 1;
        setBookingPromptVisible(false);
        window.clearTimeout(bookingPromptHideTimerRef.current);
        bookingPromptHideTimerRef.current = window.setTimeout(() => {
            setBookingPrompt(null);
        }, 180);
        setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    };

    const stopBookingChain = () => {
        autoBookNextPageRef.current = false;
        pendingAutoBookPageRef.current = null;
        autoBookReadyPageRef.current = null;
        setBookingPromptVisible(false);
        window.clearTimeout(bookingPromptHideTimerRef.current);
        bookingPromptHideTimerRef.current = window.setTimeout(() => {
            setBookingPrompt(null);
        }, 180);
    };

    const handleCheckboxChange = (invoiceId) => {
        setInvoices(prev => prev.map(invoice =>
            invoice.id === invoiceId
                ? { ...invoice, selected: !invoice.selected }
                : invoice
        ));
    };


    useEffect(() => {
        let isDisposed = false;

        const timer = setTimeout(async () => {
            const requestId = ++requestSequenceRef.current;
            const queryParams = new URLSearchParams();
            const queryFromDate = formatDateForQuery(fromDate);
            const queryToDate = formatDateForQuery(toDate);

            setLoading(true);
            setError(null);
            setShowSkeleton(false);
            window.clearTimeout(skeletonTimerRef.current);
            skeletonTimerRef.current = window.setTimeout(() => {
                setShowSkeleton(true);
            }, 200);

            if (queryFromDate) {
                queryParams.append('InvoiceDateFrom', queryFromDate);
            }
            if (queryToDate) {
                queryParams.append('InvoiceDateTo', queryToDate);
            }
            if (invoiceNumber) {
                queryParams.append('InvoiceNr', invoiceNumber);
            }

            queryParams.append('SortBy', 'InvoiceNr:asc');
            queryParams.append('SortDirection', filters.sortDirection);
            queryParams.append('Page', filters.page.toString());
            queryParams.append('PageSize', filters.pageSize.toString());
            queryParams.append('IsAccounted', filters.isAccounted.toString());

            try {
                if (USE_DUMMY_ACCOUNTING) {
                    await delay(500);
                }

                const response = await apiClient.get(`/invoice?${queryParams.toString()}`);
                const data = response.data;

                if (isDisposed || requestId !== requestSequenceRef.current) {
                    return;
                }

                setTotalPages(data.totalPages);
                setInvoices(data.data);
            } catch (requestError) {
                if (isDisposed || requestId !== requestSequenceRef.current) {
                    return;
                }

                console.error('Error fetching invoices:', requestError);
                setError(requestError.message);
            } finally {
                if (!isDisposed && requestId === requestSequenceRef.current) {
                    window.clearTimeout(skeletonTimerRef.current);
                    setShowSkeleton(false);
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            isDisposed = true;
            clearTimeout(timer);
            window.clearTimeout(skeletonTimerRef.current);
        };
    }, [fromDate, toDate, invoiceNumber, filters.page, filters.pageSize, filters.sortDirection, filters.isAccounted]);

    useEffect(() => {
        return () => {
            window.clearTimeout(bookingPromptHideTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!autoBookNextPageRef.current || loading || invoices.length === 0) {
            return;
        }

        if (pendingAutoBookPageRef.current !== filters.page && autoBookReadyPageRef.current !== filters.page) {
            return;
        }

        const allSelected = invoices.every((invoice) => invoice.selected);

        if (pendingAutoBookPageRef.current === filters.page && !allSelected) {
            autoBookReadyPageRef.current = filters.page;
            setInvoices((prev) => prev.map((invoice) => ({
                ...invoice,
                selected: true,
            })));
            return;
        }

        if (autoBookReadyPageRef.current === filters.page && allSelected) {
            const timer = setTimeout(() => {
                autoBookNextPageRef.current = false;
                pendingAutoBookPageRef.current = null;
                autoBookReadyPageRef.current = null;
                processInvoiceBatch(invoices, filters.page);
            }, 150);

            return () => clearTimeout(timer);
        }
    }, [loading, invoices, filters.page]);

    const selectedCount = invoices.filter(inv => inv.selected).length;

    return (
        <div className="flex h-full flex-col px-0 py-2 md:px-[clamp(8px,10vw,20vw)]">
            {/* <div className='ml-10 text-sm text-gray-500'>Bokför fakturor</div> */}
            <div className={`mt-3 flex flex-wrap items-center gap-5 ${loading ? 'pointer-events-none opacity-70' : ''}`}>
                <div className='flex items-center'>
                    <DateRangePicker
                        presets={['this-month', 'last-month', 'last-3-months', 'last-12-months', 'last-year', 'year-to-date']}
                        placeholder="Välj period"
                        onApply={handlePeriodApply}
                        triggerRadius="full"
                        triggerClassName="h-7 w-[260px] border-lime-600 px-3 text-xs text-gray-700 focus:border-lime-700"
                        openTriggerClassName="border-lime-700 ring-1 ring-lime-200"
                        closedTriggerClassName="border-lime-600 hover:border-lime-700"
                        widthClassName="w-60"
                    />
                    <label className="pt-[2px] ml-10 mr-5 text-xs text-gray-700">Fakturanr.</label>
                    <input
                        type="number"
                        value={invoiceNumber}
                        onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                        className="h-7 w-[120px] rounded-full border border-lime-600 bg-white pt-[1px] px-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700"
                        placeholder=""
                    />
                    <button
                        className={`ml-10 h-7 w-40 rounded-full border border-lime-700 bg-lime-700 pt-[1px] px-3 text-center text-xs text-white transition hover:bg-lime-900 disabled:cursor-not-allowed disabled:opacity-50`}
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
                                setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                            }}
                            disabled={filters.page <= 1 || loading || processing}
                            className="disabled:cursor-not-allowed disabled:opacity-50">
                            <ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" />
                        </button>
                        <button
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
                            }}
                            disabled={loading || processing || invoices.length < filters.pageSize}
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

            {bookingPrompt && (
                <div className={`mt-3 flex items-center gap-3 overflow-hidden rounded border border-lime-200 bg-lime-50 px-4 py-2 text-xs text-gray-700 transition-all duration-200 ease-out ${bookingPromptVisible ? 'max-h-20 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2 py-0'}`}>
                    <span>
                        Sida {bookingPrompt.currentPage} är bokförd. Vill du bokföra sida {bookingPrompt.nextPage} också?
                    </span>
                    <button
                        type="button"
                        onClick={continueBookingNextPage}
                        className="h-7 rounded-full border border-lime-700 bg-lime-700 px-4 text-xs font-medium text-white transition hover:bg-lime-900"
                    >
                        Ja
                    </button>
                    <button
                        type="button"
                        onClick={stopBookingChain}
                        className="h-7 rounded-full border border-slate-400 bg-white px-4 text-xs font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                    >
                        Nej
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {error}
                </div>
            )}

            <div className='border-t border-gray-300 rounded-sm py-1 mt-4 h-full overflow-y-auto'>
                <table className="min-w-full table-fixed divide-y divide-gray-100" style={{ fontFamily: "'Neue Haas Unica', 'Helvetica Neue', Arial, sans-serif" }}>
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className='w-10 px-2 py-0.5 text-left text-tiny font-medium text-gray-400 tracking-wider'>
                                <SelectCircleCheckbox
                                    checked={invoices.length > 0 && invoices.every(inv => inv.selected)}
                                    onChange={() => {
                                        const shouldSelectAll = !(invoices.length > 0 && invoices.every(inv => inv.selected));
                                        setInvoices(prev => prev.map(invoice => ({
                                            ...invoice,
                                            selected: shouldSelectAll
                                        })));
                                    }}
                                    ariaLabel="Markera alla fakturor"
                                />
                            </th>
                            <th className="w-[120px] px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturanr</th>
                            <th className="w-[260px] px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Kund</th>
                            <th className="w-[130px] px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Fakturadatum</th>
                            <th className="w-[130px] px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Förfallodatum</th>
                            <th className="w-[150px] px-2 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider text-right">Belopp ink moms</th>
                            <th className="w-[220px] pl-10 py-1.5 text-left text-tiny font-medium text-gray-400 tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-100 ${!loading && invoices.length > 0 ? 'bg-white' : 'bg-transparent'}`}>
                        {showSkeleton ? (
                            Array.from({ length: 3 }).map((_, index) => (
                                <tr key={`invoice-skeleton-${index}`} className="border-b border-gray-100">
                                    <td className="px-2 py-2"><Skeleton circle height={15} width={15} /></td>
                                    <td className="px-2 py-2"><Skeleton height={14} /></td>
                                    <td className="px-2 py-2"><Skeleton height={14} /></td>
                                    <td className="px-2 py-2"><Skeleton height={14} /></td>
                                    <td className="px-2 py-2"><Skeleton height={14} /></td>
                                    <td className="px-2 py-2"><Skeleton height={14} /></td>
                                    <td className="pl-10 py-2"><Skeleton height={14} /></td>
                                </tr>
                            ))
                        ) : loading && invoices.length > 0 ? (
                            invoices.map((invoice) => {
                                const currentProcessingResult = processingResults[invoice.id];
                                return (
                                    <tr
                                        key={invoice.id}
                                        className={invoice.selected ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                                        onClick={() => handleCheckboxChange(invoice.id)}
                                    >
                                        <td className="px-2 py-[4px] text-xs text-gray-800 align-middle whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                                            <div className="flex h-full items-center">
                                                <SelectCircleCheckbox
                                                    checked={Boolean(invoice.selected)}
                                                    onChange={() => handleCheckboxChange(invoice.id)}
                                                    ariaLabel={`Markera faktura ${invoice.invoiceNr}`}
                                                />
                                            </div>
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
                            })
                        ) : !invoices || invoices.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-14 whitespace-nowrap text-sm text-gray-500 text-center">Inga fakturor att visa</td>
                            </tr>
                        ) : (
                            invoices.map((invoice) => {
                                const currentProcessingResult = processingResults[invoice.id];
                                return (
                                    <tr
                                        key={invoice.id}
                                        className={invoice.selected ? 'bg-lime-100' : 'bg-transparent hover:bg-lime-50'}
                                        onClick={() => handleCheckboxChange(invoice.id)}
                                    >
                                        <td className="px-2 py-[4px] text-xs text-gray-800 align-middle whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                                            <div className="flex h-full items-center">
                                                <SelectCircleCheckbox
                                                    checked={Boolean(invoice.selected)}
                                                    onChange={() => handleCheckboxChange(invoice.id)}
                                                    ariaLabel={`Markera faktura ${invoice.invoiceNr}`}
                                                />
                                            </div>
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
            </div>


        </div >
    )
}

export default InvoicesToAccount