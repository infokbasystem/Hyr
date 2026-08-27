import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { searchCustomers } from '../lib/customerSearchApi'

function normalizeCustomerRows(payload) {
    if (Array.isArray(payload)) {
        return payload
    }

    if (payload && Array.isArray(payload.items)) {
        return payload.items
    }

    return []
}

export default function SearchCustomer({
    onCustomerSelect,
    selectedCustomerName,
    placeholder = 'Sök kund',
    minQueryLength = 2,
    debounceMs = 200,
    take = 50,
    width = '100px',
    className = '',
    disabled = false,
}) {
    const containerRef = useRef(null)
    const requestRef = useRef(0)
    const skipNextSearchRef = useRef(false)
    const previousSelectedCustomerNameRef = useRef('')
    const [query, setQuery] = useState('')
    const [hasEditedSinceSelection, setHasEditedSinceSelection] = useState(false)
    const [matches, setMatches] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const mayHaveMoreMatches = !isSearching && take > 0 && matches.length >= take

    useEffect(() => {
        function handleDocumentMouseDown(event) {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleDocumentMouseDown)
        return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
    }, [])

    useEffect(() => {
        if (typeof selectedCustomerName !== 'string') {
            previousSelectedCustomerNameRef.current = ''
            return
        }

        if (selectedCustomerName === previousSelectedCustomerNameRef.current) {
            return
        }

        previousSelectedCustomerNameRef.current = selectedCustomerName
        requestRef.current += 1
        skipNextSearchRef.current = true
        setQuery(selectedCustomerName)
        setHasEditedSinceSelection(false)
        setMatches([])
        setIsSearching(false)
        setIsOpen(false)
    }, [selectedCustomerName])

    useEffect(() => {
        if (!disabled) {
            return
        }

        setIsOpen(false)
        setMatches([])
        setIsSearching(false)
    }, [disabled])

    useEffect(() => {
        if (!hasEditedSinceSelection) {
            setMatches([])
            setIsSearching(false)
            setIsOpen(false)
            return
        }

        if (disabled) {
            setMatches([])
            setIsSearching(false)
            setIsOpen(false)
            return
        }

        if (skipNextSearchRef.current) {
            skipNextSearchRef.current = false
            return
        }

        const trimmedQuery = query.trim()

        if (trimmedQuery.length < minQueryLength) {
            setMatches([])
            setIsSearching(false)
            setIsOpen(false)
            return
        }

        const requestId = ++requestRef.current
        setIsSearching(true)

        const timer = setTimeout(() => {
            Promise.resolve(searchCustomers({
                conditions: [
                    {
                        field: 'freetext',
                        operator: 'contains',
                        value: trimmedQuery,
                    },
                ],
                pageNumber: 1,
                pageSize: take,
                sorts: [
                    {
                        field: 'customernr',
                        direction: 'desc',
                    },
                    {
                        field: 'id',
                        direction: 'desc',
                    },
                ],
            }))
                .then((result) => {
                    if (requestRef.current !== requestId) {
                        return
                    }

                    setMatches(normalizeCustomerRows(result))
                    setIsOpen(true)
                })
                .catch(() => {
                    if (requestRef.current !== requestId) {
                        return
                    }

                    setMatches([])
                    setIsOpen(true)
                })
                .finally(() => {
                    if (requestRef.current === requestId) {
                        setIsSearching(false)
                    }
                })
        }, debounceMs)

        return () => clearTimeout(timer)
    }, [debounceMs, disabled, hasEditedSinceSelection, minQueryLength, query, take])

    useEffect(() => {
        if (!hasEditedSinceSelection) {
            return
        }

        const trimmedQuery = query.trim()
        if (trimmedQuery !== '') {
            return
        }

        if (previousSelectedCustomerNameRef.current === '') {
            return
        }

        previousSelectedCustomerNameRef.current = ''
        onCustomerSelect?.(null)
        setHasEditedSinceSelection(false)
        setMatches([])
        setIsSearching(false)
        setIsOpen(false)
    }, [hasEditedSinceSelection, onCustomerSelect, query])

    function handlePick(customer) {
        onCustomerSelect?.(customer)
        setQuery(customer?.customerName ?? '')
        setHasEditedSinceSelection(false)
        setMatches([])
        setIsOpen(false)
    }

    return (
        <div ref={containerRef} className={`relative ${className} ${width}`}>
            <div className="relative">
                <input
                    value={query}
                    onChange={(event) => {
                        if (disabled) {
                            return
                        }

                        setQuery(event.target.value)
                        setHasEditedSinceSelection(true)
                    }}
                    onFocus={() => {
                        if (disabled) {
                            return
                        }

                        if (hasEditedSinceSelection && query.trim().length >= minQueryLength) {
                            setIsOpen(true)
                        }
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    disabled={disabled}
                    className={`h-7 w-full rounded-full border border-lime-600 bg-white px-4 pr-9 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700 ${disabled ? 'cursor-not-allowed bg-gray-50 text-gray-500' : ''}`}
                />
                <Search className={`pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>

            {isOpen && query.trim().length >= minQueryLength && (
                <div className="absolute left-[calc(100%+8px)] top-0 z-50 max-h-90 w-[400px] overflow-hidden overscroll-none rounded-sm border border-stone-400 bg-stone-50 shadow-lg isolate">
                    <div className="max-h-90 overflow-x-hidden overflow-y-auto overscroll-contain bg-stone-50 [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:contain]">
                        <ul className="divide-y divide-stone-300">
                        {matches.map((customer) => {
                            const orgNr = customer.organizationNr?.trim() || 'Inget org.nr'
                            const mobilePhone = customer.mobilePhone?.trim()
                            const postalAddress = customer.postalAddress?.trim()

                            return (
                                <li key={customer.id}>
                                    <button
                                        type="button"
                                        className="w-full cursor-pointer px-4 py-2 text-left text-gray-800 transition hover:bg-stone-200/60"
                                        onClick={() => handlePick(customer)}
                                    >
                                        <div className="truncate text-xs font-medium tracking-[0.08em] text-slate-800 uppercase">
                                            {customer.customerName ?? '-'}
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-8 gap-y-0.5 text-tiny leading-4 tracking-[0.08em] text-slate-600">
                                            <span>{orgNr}</span>
                                            {mobilePhone && <span>{mobilePhone}</span>}
                                            {!mobilePhone && postalAddress && <span>{postalAddress}</span>}
                                        </div>
                                    </button>
                                </li>
                            )
                        })}
                        </ul>

                        {!isSearching && matches.length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-500">
                                Inga träffar
                            </div>
                        )}

                        {isSearching && (
                            <div className="px-4 py-2 text-xs text-gray-500">
                                Söker...
                            </div>
                        )}

                        {mayHaveMoreMatches && (
                            <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
                                Visar de första {take} träffarna. Förfina sökningen för att se fler.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}