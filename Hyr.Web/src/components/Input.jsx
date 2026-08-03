import React from 'react'

const Input = ({ type = 'text', className = '', disabled = false, stylePreset, gridcell = false, ...props }) => {
    const hasExplicitWidthClass = /(^|\s)(!?w-|!?min-w-|!?max-w-|!?basis-)/.test(className)
    const isGridCell = stylePreset === 'gridCell' || gridcell

    const presetClassName =
        isGridCell
            ? `block h-full border border-transparent bg-transparent px-3 pt-[6px] pb-[3px] text-xs text-gray-800 outline-none transition focus:bg-white focus:outline-none focus:ring-0 focus:shadow-[inset_0_0_0_1px_#60a5fa]`
            : null

    const baseClassName =
        type === 'checkbox'
            ? `h-8 w-8 border border-gray-400 ${className}`
            : presetClassName
                ? `${hasExplicitWidthClass ? '' : 'w-full'} ${presetClassName} ${className}`
                : `text-xs leading-none ${hasExplicitWidthClass ? '' : 'w-full'} border border-gray-300 rounded-sm px-2 pt-1 pb-[calc(0.25rem-1px)] focus:outline-none bg-white ${className}`

    return <input type={type} disabled={disabled} className={baseClassName.trim()} {...props} />
}

export default Input