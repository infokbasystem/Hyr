import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import DateRangeSelect from '../components/DateRangeSelect';
import Select from '../components/Select';

function toEndOfDay(value) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        return value;
    }

    const date = new Date(value);
    date.setHours(23, 59, 59, 0);
    return date;
}

const CabinSearchModal = ({ isOpen, onClose, onSearch, cabinTypeOptions = [] }) => {
    const [period, setPeriod] = useState({ from: null, to: null });
    const [cabinTypeCode, setCabinTypeCode] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPeriod({ from: null, to: null });
            setCabinTypeCode('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSearch = () => {
        const selectedType = cabinTypeOptions.find((option) => option.value === cabinTypeCode);

        onSearch({
            period: { from: period.from, to: toEndOfDay(period.to) },
            cabinTypeCode,
            cabinTypeName: selectedType?.label ?? '',
        });
        onClose();
    };

    const typeItems = [
        { id: '', name: 'Alla byggbodtyper' },
        ...cabinTypeOptions.map((option) => ({ id: option.value, name: option.label })),
    ];

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 z-40" />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={onClose}>
                <div
                    className="relative max-h-[calc(100vh-6rem)] overflow-hidden rounded-sm border border-slate-200 bg-slate-50 shadow-xl py-6 px-8 flex flex-col w-[720px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center mb-4">
                        <h2 className="text-sm font-semibold text-center">
                            Sök lediga byggbodar
                        </h2>
                        <button
                            onClick={onClose}
                            className="absolute right-0 text-slate-400 hover:text-slate-600 text-l leading-none mb-1"
                        >
                            ×
                        </button>
                    </div>
                    <div className="text-xs text-slate-700 grid place-items-center justify-center py-3">
                        <Select
                            value={cabinTypeCode}
                            onChange={setCabinTypeCode}
                            items={typeItems}
                            placeholder="Välj byggbodtyp"
                            stylePreset="search"
                            className="w-50"
                        />
                    </div>
                    <div className="my-3 flex flex-col items-center">
                        <DateRangeSelect onChange={setPeriod} />
                    </div>
                    <div className="flex gap-4 mt-3 mb-4 pt-4 justify-end">
                        <button
                            onClick={onClose}
                            className="shadow-md/30 text-xs text-white bg-orange-400 hover:bg-orange-600 px-10 p-[5px]"
                        >
                            Avbryt
                        </button>
                        <button
                            onClick={handleSearch}
                            className="shadow-md/30 text-xs text-white px-10 p-[5px] bg-lime-700 hover:bg-lime-900 disabled:bg-lime-500 disabled:cursor-not-allowed"
                            disabled={!period.from || !period.to}
                        >
                            Sök
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CabinSearchModal;
