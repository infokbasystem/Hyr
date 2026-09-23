import React, { useState, useEffect, useRef } from 'react';
import { ArrowDownToLine } from 'lucide-react';

const LabeledTextArea = ({
    label,
    labelPosition = 'left',
    labelWidth,
    inputWidth,
    margintop,
    height,
    name,
    type = 'text',
    decimals = 2,
    integerOnly = false,
    value,
    disabled = false,
    onChange,
    popupItems,
    popupOnSelect,
    popupLabelField = 'name',
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState(
        type === 'number' ? formatNumberDisplay(value) : value || ''
    );
    const [showPopup, setShowPopup] = useState(false);
    const [filter, setFilter] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        setDisplayValue(type === 'number' ? formatNumberDisplay(value) : value || '');
    }, [value, type]);

    useEffect(() => {
        function handleOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowPopup(false);
            }
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleChange = (e) => {
        const input = e.target.value;

        if (type === 'number') {
            if (/^[0-9\s,]*$/.test(input) || input === '') {
                setDisplayValue(input);
                const numericValue = parseNumberInput(input, integerOnly);
                onChange && onChange(numericValue);
            }
        } else {
            setDisplayValue(input);
            onChange && onChange(input);
        }
    };

    const handleBlur = () => {
        if (type === 'number') {
            const numericValue = parseNumberInput(displayValue, integerOnly);
            setDisplayValue(formatNumberDisplay(numericValue, integerOnly));
        }
    };

    const handleSelect = (item) => {
        if (typeof popupOnSelect === 'function') {
            popupOnSelect(item);
        } else {
            const text = item?.[popupLabelField] ?? '';
            setDisplayValue(text);
            onChange && onChange(text);
        }
        setShowPopup(false);
    };

    function formatNumberDisplay(value, integerOnly = false) {
        if (value === null || value === undefined) return '';
        if (integerOnly) {
            return Math.round(value).toLocaleString('sv-SE');
        }
        return value.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 5 });
    }

    function parseNumberInput(str, integerOnly = false) {
        if (!str) return null;
        const normalized = str.replace(/\s/g, '').replace(',', '.');
        let num = parseFloat(normalized);
        if (isNaN(num)) return null;
        if (integerOnly) num = Math.round(num);
        return num;
    }

    return (
        <div className={`w-full pb-[1px] mt-${margintop} ${labelPosition === 'top' ? 'flex flex-col' : 'flex items-start'}`} ref={wrapperRef}>
            <div className={`relative flex flex-none justify-between ${labelPosition === 'top' ? 'w-full items-start' : `items-center ${labelWidth}`}`}>
                <label className={`text-xs text-gray-700 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${labelPosition === 'top' ? 'ml-1' : 'mt-1'}`}>{label}</label>
                {popupItems && Array.isArray(popupItems) && (
                    <button
                        type="button"
                        onClick={() => { setShowPopup(s => !s); setFilter(''); }}
                        className="ml-2 rounded px-1 text-right text-xs text-gray-600 hover:bg-gray-100"
                        aria-expanded={showPopup}
                    >
                        <ArrowDownToLine size={12} className='scale-110 text-red-700 hover:text-red' />
                    </button>
                )}

                {showPopup && popupItems && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded border border-gray-400 bg-yellow-50 p-2 shadow-md">
                        <input
                            className="mb-2 w-full rounded border border-gray-400 bg-white px-2 py-1 text-xs"
                            placeholder="Sök..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <div className="max-h-40 space-y-1 overflow-auto">
                            {popupItems
                                .filter(it => {
                                    if (!filter) return true;
                                    const txt = String(it?.[popupLabelField] ?? '').toLowerCase();
                                    return txt.includes(filter.toLowerCase());
                                })
                                .map(it => (
                                    <button
                                        key={it.id ?? (it[popupLabelField] ?? Math.random())}
                                        type="button"
                                        className="w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                                        onClick={() => handleSelect(it)}
                                    >
                                        {it[popupLabelField] ?? ''}
                                    </button>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex w-full flex-row items-center">
                    <textarea
                        name={name}
                        value={displayValue}
                        disabled={disabled}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`text-xs ${inputWidth || 'w-full'} ${height} rounded-sm border border-gray-300 px-2 pt-1 pb-[calc(0.25rem-1px)] focus:outline-none ${!disabled ? 'bg-white' : ''}`}
                        {...props}
                    />
            </div>
        </div>
    );
};

export default LabeledTextArea;