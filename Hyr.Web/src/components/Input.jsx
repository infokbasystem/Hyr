import React from 'react'

const Input = ({ type = 'text', className = '', disabled = false, ...props }) => {
    const hasExplicitWidthClass = /(^|\s)(!?w-|!?min-w-|!?max-w-|!?basis-)/.test(className)

    const baseClassName =
        type === 'checkbox'
            ? `h-8 w-8 border border-gray-400 ${className}`
            : `text-xs leading-none ${hasExplicitWidthClass ? '' : 'w-full'} border border-gray-300 rounded-sm px-2 pt-1 pb-[calc(0.25rem-1px)] focus:outline-none bg-white ${className}`

    return <input type={type} disabled={disabled} className={baseClassName.trim()} {...props} />
}

export default Input