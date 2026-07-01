const accentClasses = {
    sky: 'group-hover:border-sky-300 group-hover:bg-sky-200 group-focus:border-sky-300 group-focus:bg-sky-200 group-focus-visible:border-sky-300 group-focus-visible:bg-sky-200 group-active:border-sky-300 group-active:bg-sky-300',
    lime: 'group-hover:border-lime-300 group-hover:bg-lime-200 group-focus:border-lime-300 group-focus:bg-lime-200 group-focus-visible:border-lime-300 group-focus-visible:bg-lime-200 group-active:border-lime-300 group-active:bg-lime-300',
    rose: 'group-hover:border-rose-300 group-hover:bg-rose-200 group-focus:border-rose-300 group-focus:bg-rose-200 group-focus-visible:border-rose-300 group-focus-visible:bg-rose-200 group-active:border-rose-300 group-active:bg-rose-300',
    yellow: 'group-hover:border-amber-300 group-hover:bg-amber-200 group-focus:border-amber-300 group-focus:bg-amber-200 group-focus-visible:border-amber-300 group-focus-visible:bg-amber-200 group-active:border-amber-300 group-active:bg-amber-300',
    teal: 'group-hover:border-teal-300 group-hover:bg-teal-200 group-focus:border-teal-300 group-focus:bg-teal-200 group-focus-visible:border-teal-300 group-focus-visible:bg-teal-200 group-active:border-teal-300 group-active:bg-teal-300',
    indigo: 'group-hover:border-indigo-300 group-hover:bg-indigo-200 group-focus:border-indigo-300 group-focus:bg-indigo-200 group-focus-visible:border-indigo-300 group-focus-visible:bg-indigo-200 group-active:border-indigo-300 group-active:bg-indigo-300',
    violet: 'group-hover:border-violet-300 group-hover:bg-violet-200 group-focus:border-violet-300 group-focus:bg-violet-200 group-focus-visible:border-violet-300 group-focus-visible:bg-violet-200 group-active:border-violet-300 group-active:bg-violet-300',
    slate: 'group-hover:border-slate-300 group-hover:bg-slate-200 group-focus:border-slate-300 group-focus:bg-slate-200 group-focus-visible:border-slate-300 group-focus-visible:bg-slate-200 group-active:border-slate-300 group-active:bg-slate-300',
    orange: 'group-hover:border-orange-300 group-hover:bg-orange-200 group-focus:border-orange-300 group-focus:bg-orange-200 group-focus-visible:border-orange-300 group-focus-visible:bg-orange-200 group-active:border-orange-300 group-active:bg-orange-300',
}

export default function ActionButton({
    label,
    icon: Icon,
    onClick,
    type = 'button',
    disabled = false,
    accent = 'sky',
}) {
    const iconAccentClassName = accentClasses[accent] ?? accentClasses.sky

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="group inline-flex items-center gap-2 py-1 text-xs font-medium tracking-[0.10em] text-[#4b5563] transition enabled:focus:underline enabled:focus:outline-none enabled:focus:text-[#111827] enabled:focus:decoration-[#4b5563] enabled:hover:text-[#111827] enabled:hover:underline enabled:active:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none"
        >
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#cfd4cc] bg-[#f2f3f1] text-[#5a5f59] transition-colors ${iconAccentClassName}`}>
                {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}
            </span>
            <span className="pr-1 uppercase">{label}</span>
        </button>
    )
}
