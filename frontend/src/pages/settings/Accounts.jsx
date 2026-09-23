import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { ArrowLeftCircle, ArrowRightCircle, Plus, Save, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import ActionButton from '../../components/ActionButton'
import ConfirmationModal from '../../components/ConfirmationModal'
import LabeledCheckbox from '../../components/LabeledCheckbox'
import LabeledInput from '../../components/LabeledInput'
import { useDelayedSkeleton } from '../../hooks/useDelayedSkeleton'
import { getSharedRequest } from '../../lib/sharedRequest'
import { deleteAccount, getAccountById, saveAccount, searchAccounts } from '../../lib/accountApi'

const PAGE_SIZE = 200

function createEmptyAccountForm() {
    return { id: null, accountNr: null, name: '', isActive: true }
}

function mapAccountToListItem(account) {
    return {
        id: account?.id ?? null,
        accountNr: account?.accountNr ?? null,
        systemCode: account?.systemCode ?? null,
        name: account?.name ?? '',
        isActive: Boolean(account?.isActive),
    }
}

function mapAccountToForm(account) {
    return {
        id: account?.id ?? null,
        accountNr: account?.accountNr ?? null,
        systemCode: account?.systemCode ?? null,
        name: account?.name ?? '',
        isActive: Boolean(account?.isActive),
    }
}

function createAccountSnapshot(form) {
    return JSON.stringify({
        accountNr: form?.accountNr == null ? null : Number(form.accountNr),
        name: form?.name ?? '',
        isActive: Boolean(form?.isActive),
    })
}

export default function Accounts() {
    const initialSnapshotRef = useRef('')
    const hasInitializedSnapshotRef = useRef(false)
    const pendingTransitionRef = useRef(null)
    const listRef = useRef(null)
    const [rows, setRows] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [form, setForm] = useState(createEmptyAccountForm)
    const [searchValue, setSearchValue] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
    const showListSkeleton = useDelayedSkeleton(isLoading, 300, 200)
    const showDetailSkeleton = useDelayedSkeleton(isDetailLoading, 300, 200)

    function markAsSaved(nextForm) {
        initialSnapshotRef.current = createAccountSnapshot(nextForm)
        hasInitializedSnapshotRef.current = true
    }

    useEffect(() => {
        let isActive = true
        setIsLoading(true)
        setError('')
        const requestKey = `settings:accounts:${pageNumber}:${PAGE_SIZE}:${searchValue.trim().toLowerCase()}`
        getSharedRequest(requestKey, () => searchAccounts({ searchTerm: searchValue, pageNumber, pageSize: PAGE_SIZE }))
            .then((result) => {
                if (!isActive) return
                const mappedRows = (result?.items ?? []).map(mapAccountToListItem)
                setRows(mappedRows)
                setTotalCount(result?.totalCount ?? 0)
                setTotalPages(result?.totalPages ?? 0)
                if (mappedRows.length === 0) {
                    setSelectedId(null)
                    if (!isCreating) {
                        const emptyForm = createEmptyAccountForm()
                        setForm(emptyForm)
                        markAsSaved(emptyForm)
                    }
                    return
                }
                if (!isCreating) {
                    const selectedFromPage = mappedRows.find((entry) => entry.id === selectedId)
                    setSelectedId(selectedFromPage?.id ?? null)
                }
            })
            .catch((requestError) => isActive && setError(requestError?.message || 'Kunde inte hämta konton.'))
            .finally(() => isActive && setIsLoading(false))
        return () => { isActive = false }
    }, [pageNumber, searchValue])

    useEffect(() => {
        let isActive = true
        if (isCreating || selectedId == null) {
            setIsDetailLoading(false)
            return () => { isActive = false }
        }
        setIsDetailLoading(true)
        getAccountById(selectedId)
            .then((result) => {
                if (!isActive) return
                const nextForm = mapAccountToForm(result)
                setForm(nextForm)
                markAsSaved(nextForm)
            })
            .catch((requestError) => isActive && setError(requestError?.message || 'Kunde inte hämta konto.'))
            .finally(() => isActive && setIsDetailLoading(false))
        return () => { isActive = false }
    }, [isCreating, selectedId])

    const listRows = useMemo(() => rows, [rows])
    const isDirty = hasInitializedSnapshotRef.current
        && createAccountSnapshot(form) !== initialSnapshotRef.current
    const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname)

    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirty) return
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    useEffect(() => {
        if (blocker.state === 'blocked') setShowUnsavedChangesModal(true)
    }, [blocker.state])

    function requestTransition(action) {
        if (!isDirty) { action(); return }
        pendingTransitionRef.current = action
        setShowUnsavedChangesModal(true)
    }

    function handleSelect(entry) {
        if (!entry || entry.id == null || (!isCreating && entry.id === selectedId)) return
        setSelectedId(entry.id)
        setIsCreating(false)
        setSuccessMessage('')
        setError('')
    }

    function handleListArrowNavigation(offset) {
        if (listRows.length === 0) return
        const selectedIndex = listRows.findIndex((entry) => entry.id === selectedId)
        const start = selectedIndex >= 0 ? selectedIndex : (offset > 0 ? -1 : listRows.length)
        const nextRow = listRows[Math.min(listRows.length - 1, Math.max(0, start + offset))]
        if (!nextRow) return
        requestTransition(() => {
            handleSelect(nextRow)
            requestAnimationFrame(() => listRef.current?.querySelector(`[data-account-id="${nextRow.id}"]`)?.scrollIntoView({ block: 'nearest' }))
        })
    }

    function handleListKeyDown(event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            handleListArrowNavigation(event.key === 'ArrowDown' ? 1 : -1)
        }
    }

    function handleAdd() {
        requestTransition(() => {
            const nextForm = createEmptyAccountForm()
            setSelectedId(null)
            setIsCreating(true)
            setForm(nextForm)
            markAsSaved(nextForm)
            setSuccessMessage('')
            setError('')
        })
    }

    async function handleSave() {
        setIsSaving(true); setError(''); setSuccessMessage('')
        try {
            const saved = await saveAccount({ id: form.id, accountNr: form.accountNr, name: form.name, isActive: form.isActive })
            const savedForm = mapAccountToForm(saved)
            const savedRow = mapAccountToListItem(saved)
            setRows((previousRows) => {
                const existingIndex = previousRows.findIndex((entry) => entry.id === savedRow.id)
                if (existingIndex >= 0) {
                    const nextRows = [...previousRows]; nextRows[existingIndex] = savedRow; return nextRows
                }
                return [savedRow, ...previousRows].slice(0, PAGE_SIZE)
            })
            if (form.id == null) setTotalCount((previousTotal) => previousTotal + 1)
            setSelectedId(savedForm.id); setIsCreating(false); setForm(savedForm); markAsSaved(savedForm)
            setSuccessMessage('Konto sparat.')
        } catch (requestError) { setError(requestError?.message || 'Kunde inte spara konto.') }
        finally { setIsSaving(false) }
    }

    async function handleDelete() {
        if (form.id == null || isDeleting) return
        setIsDeleting(true); setError(''); setSuccessMessage('')
        try {
            await deleteAccount(form.id)
            setRows((previousRows) => {
                const nextRows = previousRows.filter((entry) => entry.id !== form.id)
                const fallbackRow = nextRows[0]
                if (fallbackRow) { setSelectedId(fallbackRow.id); setIsCreating(false) }
                else { const emptyForm = createEmptyAccountForm(); setSelectedId(null); setIsCreating(false); setForm(emptyForm); markAsSaved(emptyForm) }
                return nextRows
            })
            setTotalCount((previousTotal) => Math.max(0, previousTotal - 1))
            setSuccessMessage('Konto raderat.')
        } catch (requestError) { setError(requestError?.message || 'Kunde inte radera konto.') }
        finally { setIsDeleting(false) }
    }

    function handleStay() {
        pendingTransitionRef.current = null
        if (blocker.state === 'blocked') blocker.reset()
        setShowUnsavedChangesModal(false)
    }

    function handleDiscard() {
        if (blocker.state === 'blocked') { setShowUnsavedChangesModal(false); blocker.proceed(); return }
        const pendingTransition = pendingTransitionRef.current
        pendingTransitionRef.current = null
        setShowUnsavedChangesModal(false)
        pendingTransition?.()
    }

    const isDetailDisabled = (selectedId == null && !isCreating) || isDetailLoading
    const isSystemAccount = Boolean(form.systemCode)
    return (
        <div className="flex h-full min-h-full w-full flex-col px-0 pb-10 md:px-[clamp(8px,15vw,10vw)]">
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 flex-1 lg:items-stretch lg:grid-cols-[450px_1px_minmax(0,1fr)] lg:gap-8">
                    <aside className="mb-8 border-b border-gray-300 pr-4 text-gray-700 lg:border-b-0">
                        <div className="mr-5 flex items-center justify-between gap-2">
                            <input value={searchValue} onChange={(event) => requestTransition(() => { setSearchValue(event.target.value); setPageNumber(1); setSelectedId(null); setIsCreating(false) })} placeholder="Sök konto, namn" className="h-7 w-70 rounded-full border border-lime-600 bg-white px-4 text-xs text-gray-700 outline-none transition placeholder:text-gray-500 focus:border-lime-700" />
                            <ActionButton label="Ny" icon={Plus} onClick={handleAdd} accent="sky" />
                        </div>
                        <div ref={listRef} tabIndex={0} onKeyDown={handleListKeyDown} className="mt-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2 focus:outline-none">
                            <div className="mb-1 grid grid-cols-[92px_minmax(0,1fr)] border-b border-gray-300 px-3 pb-1 text-xs font-medium tracking-[0.08em] text-gray-700"><span>Konto</span><span>Namn</span></div>
                            {showListSkeleton && <div className="space-y-1 px-3 py-2">{Array.from({ length: 12 }).map((_, index) => <Skeleton key={`account-list-skeleton-${index}`} height={16} />)}</div>}
                            {isLoading && !showListSkeleton && <div className="py-4 text-xs text-gray-500">Laddar konton...</div>}
                            {!isLoading && listRows.length === 0 && <div className="py-4 text-center text-xs text-gray-500">Inga konton matchar sökningen.</div>}
                            {!isLoading && listRows.map((entry) => <button key={entry.id} type="button" data-account-id={entry.id} onClick={() => requestTransition(() => handleSelect(entry))} onKeyDown={handleListKeyDown} className={`w-full px-3 py-1.5 text-left text-xs leading-[1.1] transition ${entry.id === selectedId ? 'bg-lime-200 text-gray-900' : 'text-gray-800 hover:bg-lime-100'}`}><div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2"><span>{entry.accountNr ?? '-'}</span><span className="truncate">{entry.name || '-'}{!entry.isActive ? ' (inaktiv)' : ''}</span></div></button>)}
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            {totalPages > 1 && <div className="ml-3 text-xs text-gray-500">{totalCount} konton totalt, {PAGE_SIZE} per sida.</div>}
                            {totalPages > 1 && <div className="mr-5 flex items-center justify-end text-xs text-gray-700"><span>Sida {Math.min(pageNumber, Math.max(1, totalPages))} av {Math.max(1, totalPages)}</span><div className="ml-4 flex gap-1"><button type="button" onClick={() => requestTransition(() => setPageNumber(Math.max(1, pageNumber - 1)))} disabled={pageNumber <= 1 || isLoading} className="disabled:cursor-not-allowed disabled:opacity-50" aria-label="Föregående sida"><ArrowLeftCircle className="h-5 w-5 text-red-300 hover:text-red-400" /></button><button type="button" onClick={() => requestTransition(() => setPageNumber(pageNumber + 1))} disabled={isLoading || pageNumber >= totalPages} className="disabled:cursor-not-allowed disabled:opacity-50" aria-label="Nästa sida"><ArrowRightCircle className="h-5 w-5 text-red-300 hover:text-red-400" /></button></div></div>}
                        </div>
                    </aside>
                    <div aria-hidden="true" className="mt-6 bg-gray-300" />
                    <section className="px-3 lg:px-4">
                        <div className="mb-4 flex items-start justify-between gap-5"><div className="flex items-center gap-5"><ActionButton label="Spara" icon={Save} onClick={handleSave} accent="lime" disabled={isSaving || isDetailDisabled} /><ActionButton label="Radera" icon={Trash2} onClick={handleDelete} accent="rose" disabled={form.id == null || isSaving || isDetailDisabled || isDeleting || isSystemAccount} /></div><div className="mb-0 min-h-[42px] w-80">{error && <div className="rounded-full border border-rose-200 bg-rose-50 px-5 py-1 text-center text-xs text-rose-700">{error}</div>}{successMessage && <div className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-1 text-center text-xs text-emerald-700">{successMessage}</div>}</div></div>
                        <div className="max-w-[300px]">{showDetailSkeleton ? <div className="space-y-2 pt-1"><Skeleton height={28} width={250} /><Skeleton height={28} width={300} /><Skeleton height={28} width={220} /></div> :
                            <>
                                <LabeledInput 
                                    name="accountNr" label="Kontonr" labelWidth="w-20" inputWidth="w-30" margintop="0" value={form.accountNr} disabled={isDetailDisabled} onChange={(value) => setForm((previous) => ({ ...previous, accountNr: value }))} />
                                <LabeledInput name="name" label="Namn" labelWidth="w-20" margintop="0" value={form.name} disabled={isDetailDisabled} onChange={(value) => setForm((previous) => ({ ...previous, name: value ?? '' }))} />
                                <LabeledCheckbox id="account-active" name="account-active" label="Aktiv" labelWidth="w-20" labelPosition="left" checked={Boolean(form.isActive)} disabled={isDetailDisabled} onChange={(checked) => setForm((previous) => ({ ...previous, isActive: checked }))} color="green" />
                            </>}</div>
                    </section>
                </div>
            </div>
            <ConfirmationModal isOpen={showUnsavedChangesModal} onClose={handleStay} onConfirm={handleDiscard} title="OSPARADE ÄNDRINGAR" message="Du har osparade ändringar. Vill du lämna kontot utan att spara?" confirmText="Lämna konto" cancelText="Stanna kvar" isDestructive />
        </div>
    )
}
