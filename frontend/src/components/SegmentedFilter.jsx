const THEMES = {
    default: {
        wrapper: 'inline-flex items-center gap-0.5 rounded-full bg-slate-700 px-1 py-1',
        buttonBase: 'rounded-full px-3 py-[2px] text-xs font-semibold transition-colors',
        active: 'bg-amber-400 text-white',
        inactive: 'text-slate-300 hover:text-white',
    },
    green: {
        wrapper: 'inline-flex h-7 items-center rounded-full border border-lime-600 bg-lime-50 p-px transition hover:border-lime-700',
        buttonBase: 'h-full rounded-full px-3 text-xs font-medium text-gray-900 transition-colors',
        active: 'bg-[var(--color-green-200)] text-gray-900',
        inactive: 'text-gray-900 hover:bg-lime-100',
    },
    sky: {
        wrapper: 'inline-flex h-7 items-center rounded-full border border-sky-600 bg-sky-50 p-px transition hover:border-sky-700',
        buttonBase: 'h-full rounded-full px-3 text-xs font-medium transition-colors',
        active: 'bg-[#bfdbfe] text-gray-900',
        inactive: 'text-gray-700 hover:text-gray-900',
    },
}

export default function SegmentedFilter({ value, onChange, options = [], theme = 'default', className = '' }) {
    const styles = THEMES[theme] ?? THEMES.default

    return (
        <div className={`${styles.wrapper} ${className}`.trim()}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`${styles.buttonBase} ${
                        value === option.value
                            ? styles.active
                            : styles.inactive
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}