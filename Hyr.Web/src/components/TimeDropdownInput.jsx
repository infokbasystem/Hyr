import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'

const TIME_HOURS = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, '0'))
const TIME_MINUTES = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, '0'))
const TIME_MINUTES_QUARTER = TIME_MINUTES.filter((_, index) => index % 15 === 0)

function parseTimeValue(value) {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) {
        return null
    }

    const match = trimmed.match(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    if (!match) {
        return null
    }

    return trimmed
}

export default function TimeDropdownInput({ value, onChange, disabled = false }) {
    const wrapperRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)

    const parsedValue = parseTimeValue(value)
    const selectedHour = parsedValue?.slice(0, 2)
    const selectedMinute = parsedValue?.slice(3, 5)

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => document.removeEventListener('mousedown', handleOutsideClick)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        const rootElement = wrapperRef.current
        if (!rootElement) {
            return
        }

        // Use requestAnimationFrame to delay scrollIntoView until after the DOM has settled,
        // preventing scrollbar flash on macOS
        requestAnimationFrame(() => {
            const selectedHourElement = rootElement.querySelector('[data-time-option="hour"][data-selected="true"]')
            const selectedMinuteElement = rootElement.querySelector('[data-time-option="minute"][data-selected="true"]')

            selectedHourElement?.scrollIntoView({ block: 'center' })
            selectedMinuteElement?.scrollIntoView({ block: 'center' })
        })
    }, [isOpen])

    function handleHourSelect(hour) {
        const nextMinute = selectedMinute ?? '00'
        onChange?.(`${hour}:${nextMinute}`)
    }

    function handleMinuteSelect(minute) {
        const nextHour = selectedHour ?? '00'
        onChange?.(`${nextHour}:${minute}`)
        setIsOpen(false)
    }

    return (
        <div ref={wrapperRef} className="relative pb-[1px]">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen((current) => !current)}
                disabled={disabled}
                className={`flex h-6 w-[70px] items-center justify-between rounded-sm border border-gray-300 bg-white px-2 text-xs focus:outline-none ${disabled ? 'text-gray-400' : parsedValue ? 'font-medium text-gray-800' : 'text-gray-400'}`}
                aria-expanded={isOpen}
            >
                <span>{parsedValue ?? '--:--'}</span>
                <Clock3 size={13} className="text-gray-600" />
            </button>

            {isOpen && !disabled && (
                <div className="absolute left-0 top-full z-40 mt-1 rounded-sm border border-gray-300 bg-white p-2 shadow-lg">
                    <div className="mb-2 grid grid-cols-[100px_100px] gap-3 px-1 text-tiny font-semibold uppercase tracking-[0.08em] text-gray-500">
                        <span className="text-center">Tim</span>
                        <span className="text-center">Min</span>
                    </div>

                    <div className="grid gap-2" style={{ gridTemplateColumns: '106px 106px' }}>
                        <div className="max-h-64 overflow-y-scroll overflow-x-hidden" style={{ width: '106px', boxSizing: 'border-box', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
                            {TIME_HOURS.map((hour) => {
                                const isSelected = selectedHour === hour
                                return (
                                    <button
                                        key={hour}
                                        type="button"
                                        onClick={() => handleHourSelect(hour)}
                                        data-time-option="hour"
                                        data-selected={isSelected ? 'true' : 'false'}
                                        className={`h-7 w-full rounded-sm border text-center text-xs leading-none tabular-nums ${isSelected ? 'border-lime-700 bg-lime-600 font-semibold text-emerald-50' : 'border-transparent font-medium text-gray-800 hover:bg-lime-50'}`}
                                    >
                                        {hour}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="max-h-64 overflow-y-scroll overflow-x-hidden" style={{ width: '106px', boxSizing: 'border-box', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
                            {TIME_MINUTES_QUARTER.map((minute) => {
                                const isSelected = selectedMinute === minute
                                return (
                                    <button
                                        key={minute}
                                        type="button"
                                        onClick={() => handleMinuteSelect(minute)}
                                        data-time-option="minute"
                                        data-selected={isSelected ? 'true' : 'false'}
                                        className={`h-7 w-full rounded-sm border text-center text-xs leading-none tabular-nums ${isSelected ? 'border-lime-700 bg-lime-600 font-semibold text-emerald-50' : 'border-transparent font-medium text-gray-800 hover:bg-lime-50'}`}
                                    >
                                        {minute}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
