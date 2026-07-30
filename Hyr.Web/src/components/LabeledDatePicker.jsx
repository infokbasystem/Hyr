import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/style.css';
import { sv } from 'date-fns/locale';

import { formatDateShort, fromDateInputToSwedishIso, toSwedishDateInputValue } from '../helpers/dateUtils';

const parsePickerDate = (value) => {
    const datePart = toSwedishDateInputValue(value);
    if (!datePart) {
        return undefined;
    }

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
        return undefined;
    }

    return new Date(year, month - 1, day);
};

const formatOutputValue = (date, valueType) => {
    if (!date) {
        return null;
    }

    const datePart = toSwedishDateInputValue(date);
    if (!datePart) {
        return null;
    }

    if (valueType === 'date') {
        return date;
    }

    if (valueType === 'input') {
        return datePart;
    }

    return fromDateInputToSwedishIso(datePart);
};

const LabeledDatePicker = ({
    label,
    labelWidth,
    inputWidth,
    margintop,
    name,
    value,
    onChange,
    disabled = false,
    placeholder = 'Välj datum',
    valueType = 'iso',
    clearable = true,
    showCalendarIcon = false,
    showWeekNumber = true,
    ISOWeek = true,
    weekStartsOn = 1,
    ...props
}) => {
    const wrapperRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);

    const selectedDate = useMemo(() => parsePickerDate(value), [value]);
    const hiddenValue = useMemo(() => {
        const nextValue = formatOutputValue(selectedDate, valueType);
        return typeof nextValue === 'string' ? nextValue : '';
    }, [selectedDate, valueType]);

    const dayPickerComponents = useMemo(
        () => ({
            WeekNumber: ({ children }) => (
                <span className="mt-3 mr-2 inline-flex h-[18px] min-w-[40px] items-center justify-center rounded-md px-1 text-xs leading-none text-gray-500">
                    {`v. ${children}`}
                </span>
            ),
            ...(props.components || {}),
        }),
        [props.components],
    );

    useEffect(() => {
        const handleOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSelect = (date) => {
        onChange?.(formatOutputValue(date, valueType));
        setIsOpen(false);
    };

    const handleClear = (event) => {
        event.stopPropagation();
        onChange?.(null);
        setIsOpen(false);
    };

    return (
        <div className={`flex items-center space-x-1 w-full pb-[1px] mt-${margintop}`} ref={wrapperRef}>
            <label className={`${labelWidth || ''} flex-none text-xs text-gray-700`}>{label}</label>

            <div className={`relative ${inputWidth || 'w-full'}`}>
                {name && <input type="hidden" name={name} value={hiddenValue} />}

                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen((current) => !current)}
                    disabled={disabled}
                    className={`h-6.25 flex w-full items-center gap-0 rounded-sm border border-gray-300 pl-2 pr-0.5 text-left text-xs text-gray-700 focus:outline-none ${disabled ? 'bg-transparent text-gray-500' : 'bg-white'}`}
                    aria-expanded={isOpen}
                >
                    {showCalendarIcon && <CalendarDays size={14} className="shrink-0 text-gray-500" />}
                    <span className={`flex-1 truncate ${selectedDate ? 'text-gray-800' : 'text-gray-400'}`}>
                        {selectedDate ? formatDateShort(selectedDate) : placeholder}
                    </span>
                    {clearable && selectedDate && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={handleClear}
                            className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                            <X size={12} />
                        </span>
                    )}
                </button>

                {isOpen && !disabled && (
                    <div className="daypicker absolute left-0 top-full z-30 mt-1 rounded-sm border border-gray-300 bg-white p-2 px-5 shadow-lg">
                        <DayPicker
                            animate
                            mode="single"
                            locale={sv}
                            selected={selectedDate}
                            onSelect={handleSelect}
                            showWeekNumber={showWeekNumber}
                            ISOWeek={ISOWeek}
                            weekStartsOn={weekStartsOn}
                            className="text-xs"
                            components={dayPickerComponents}
                            {...props}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabeledDatePicker;