import { useMemo, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { getAvailableItems } from '../../lib/mobileApi'
import MobileHeader from '../components/MobileHeader'
import AvailableItemList from '../components/AvailableItemList'
import { EmptyState, ErrorBanner, LoadingCards, SearchField } from '../components/MobileUi'
import useAsyncData from '../useAsyncData'
import { filterAvailableItems, getItemTypeKey, groupItemsByCategory, NO_ITEM_TYPE, toLocalInputValue } from '../mobileFormat'

const loadAvailableNow = () => {
    const now = toLocalInputValue(new Date())
    return getAvailableItems({ from: now, to: now })
}

export function ItemTypeChips({ items, selected, onSelect }) {
    const types = useMemo(() => {
        const counts = new Map()
        for (const item of items) {
            const code = getItemTypeKey(item)
            const name = code === NO_ITEM_TYPE ? 'Övrigt' : item.itemTypeName || item.itemTypeCode
            const current = counts.get(code) ?? { code, name, count: 0 }
            current.count += 1
            counts.set(code, current)
        }
        return [...counts.values()].sort((a, b) => (a.code === NO_ITEM_TYPE) - (b.code === NO_ITEM_TYPE) || a.name.localeCompare(b.name, 'sv'))
    }, [items])

    if (types.length < 2) return null

    const chip = (code, label, count) => (
        <button
            key={code || 'all'}
            type="button"
            aria-pressed={selected === code}
            onClick={() => onSelect(code)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${selected === code ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`}
        >
            {label} <span className="opacity-60">{count}</span>
        </button>
    )

    return (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {chip('', 'Alla', items.length)}
            {types.map((type) => chip(type.code, type.name, type.count))}
        </div>
    )
}

export function GroupedAvailableItems({ items, freeUntilLabel }) {
    return (
        <div className="space-y-5 px-4 py-4">
            {groupItemsByCategory(items).map((group) => (
                <section key={group.label} aria-label={group.label}>
                    <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-gray-500 uppercase">
                        {group.label}
                        <span className="rounded-full bg-white px-2 py-0.5 text-gray-600">{group.items.length}</span>
                    </h2>
                    <AvailableItemList items={group.items} freeUntilLabel={freeUntilLabel} />
                </section>
            ))}
        </div>
    )
}

export default function MobileAvailableNow() {
    const [search, setSearch] = useState('')
    const [typeCode, setTypeCode] = useState('')
    const { data, error, loading, reload } = useAsyncData(loadAvailableNow, [])
    const allItems = Array.isArray(data) ? data : []
    const items = filterAvailableItems(allItems, typeCode, search)

    return (
        <>
            <MobileHeader
                title="Lediga nu"
                subtitle={data ? `${items.length} objekt` : undefined}
                onRefresh={reload}
                refreshing={loading}
            />
            <div className="space-y-3 px-4 pt-3">
                <SearchField value={search} onChange={setSearch} placeholder="Objektnr, regnr, modell" />
                <ItemTypeChips items={allItems} selected={typeCode} onSelect={setTypeCode} />
            </div>
            <ErrorBanner message={error} onRetry={reload} />
            {loading && !data ? (
                <LoadingCards />
            ) : data && items.length === 0 ? (
                <EmptyState title={search || typeCode ? 'Inga träffar' : 'Inga lediga objekt just nu'} icon={PackageSearch} />
            ) : (
                <GroupedAvailableItems items={items} />
            )}
        </>
    )
}
