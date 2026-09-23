import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'

const Input = ({ type = 'text', className = '', disabled = false, stylePreset, gridcell = false, prefix = '', suffix = '', style, ...props }) => {
    const hasExplicitWidthClass = /(^|\s)(!?w-|!?min-w-|!?max-w-|!?basis-)/.test(className)
    const isGridCell = stylePreset === 'gridCell' || gridcell
    const prefixRef = useRef(null)
    const suffixRef = useRef(null)
    const [padding, setPadding] = useState({ left: undefined, right: undefined })

    const presetClassName =
        isGridCell
            ? `block h-full border border-transparent bg-transparent px-3 pt-[6px] pb-[3px] text-xs text-gray-800 outline-none transition focus:bg-white focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_1px_#60a5fa]`
            : null

    const baseClassName =
        type === 'checkbox'
            ? `h-8 w-8 border border-gray-400 ${className}`
            : presetClassName
                ? `${hasExplicitWidthClass ? '' : 'w-full'} ${presetClassName} ${className}`
                : `text-xs leading-none h-6 mb-[1px] ${hasExplicitWidthClass ? '' : 'w-full'} border border-gray-300 rounded-sm px-2 focus:outline-none bg-white ${className}`

    if (type === 'checkbox') {
        return <input type={type} disabled={disabled} className={baseClassName.trim()} {...props} />
    }

    useLayoutEffect(() => {
        const getNextPadding = () => ({
            left: prefixRef.current ? prefixRef.current.offsetWidth + 12 : undefined,
            right: suffixRef.current ? suffixRef.current.offsetWidth + 12 : undefined,
        })

        setPadding(getNextPadding())

        if (typeof ResizeObserver === 'undefined') {
            return undefined
        }

        const observer = new ResizeObserver(() => {
            setPadding(getNextPadding())
        })

        if (prefixRef.current) {
            observer.observe(prefixRef.current)
        }

        if (suffixRef.current) {
            observer.observe(suffixRef.current)
        }

        return () => {
            observer.disconnect()
        }
    }, [prefix, suffix])

    const inputStyle = useMemo(
        () => ({
            ...style,
            ...(padding.left ? { paddingLeft: `${padding.left}px` } : {}),
            ...(padding.right ? { paddingRight: `${padding.right}px` } : {}),
        }),
        [padding.left, padding.right, style],
    )

    const adornedClassName = `${baseClassName} ${prefix ? 'pl-2' : ''} ${suffix ? 'pr-2' : ''}`

    return (
        <div className="relative leading-none">
            {prefix && (
                <span ref={prefixRef} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 whitespace-nowrap">
                    {prefix}
                </span>
            )}
            <input type={type} disabled={disabled} className={adornedClassName.trim()} style={inputStyle} {...props} />
            {suffix && (
                <span ref={suffixRef} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 whitespace-nowrap">
                    {suffix}
                </span>
            )}
        </div>
    )
}

export default Input