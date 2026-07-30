import React from 'react';
import LabeledSelect from '../../components/LabeledSelect';
import ReservationItemDateTimeFields from './ReservationItemDateTimeFields';

const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/;

const splitDateTimeValue = (value) => {
    const trimmedValue = String(value ?? '').trim();
    if (!trimmedValue) {
        return { datePart: '', timePart: '' };
    }

    const match = trimmedValue.match(DATE_TIME_PATTERN);
    if (!match) {
        return { datePart: '', timePart: '' };
    }

    return {
        datePart: match[1] || '',
        timePart: match[2] || '',
    };
};

const formatDateTimeForDisplay = (value) => {
    const parts = splitDateTimeValue(value);
    if (!parts.datePart) {
        return '';
    }

    const isoLikeValue = `${parts.datePart}T${parts.timePart || '00:00'}`;
    const parsedDate = new Date(isoLikeValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return `${parts.datePart} ${parts.timePart || '00:00'}`;
    }

    return parsedDate.toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const ReservationItemAccessory = ({ item, index, onRemove, onChange, itemCategories, lockPeriodToVehicle = false, vehiclePeriod = null }) => {
    const handleChange = (field, value) => {
        onChange(index, field, value);
    };

    const bookedFromValue = vehiclePeriod?.bookedFrom || item?.bookedFrom;
    const bookedToValue = vehiclePeriod?.bookedTo || item?.bookedTo;
    const actualFromValue = vehiclePeriod?.actualFrom || item?.actualFrom;
    const actualToValue = vehiclePeriod?.actualTo || item?.actualTo;

    return (
        <div className="w-fit min-w-[340px] max-w-[620px] bg-yellow-50/50 border border-gray-300 rounded-sm p-3">
            <div className="flex flex-row items-start gap-6">
                {/* Column 1: Accessory Info */}
                <div className="min-w-[180px] max-w-[250px]">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">{item?.itemName || 'Tillbehör'}</h3>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Kategori</label>
                            <span className="text-xs">{item?.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Fabrikat</label>
                            <span className="text-xs">{item?.manufacturer} {item?.model}</span>
                        </div>
                        <LabeledSelect
                            label="Debitkategori"
                            value={item?.debitCategoryId || ''}
                            onChange={(value) => handleChange('debitCategoryId', value)}
                            items={itemCategories || []}
                            placeholder="-"
                            labelWidth="w-20"
                            margintop="1"
                        />
                    </div>
                    {item?.itemNote && (
                        <p className="text-xs text-gray-500 mt-2">{item.itemNote}</p>
                    )}
                </div>

                {/* Column 2: Booking Info */}
                <div className="min-w-[200px] max-w-[320px]">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Bokningsinfo</h3>
                    <div className="space-y-1">
                        {lockPeriodToVehicle ? (
                            <>
                                <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700 w-16">Bokad tid</label>
                                    <span className="text-xs text-gray-700 leading-4">
                                        <span className="block">{formatDateTimeForDisplay(bookedFromValue)}</span>
                                        <span className="block">{formatDateTimeForDisplay(bookedToValue)}</span>
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700 w-16">Använd tid</label>
                                    <span className="text-xs text-gray-700 leading-4">
                                        <span className="block">{formatDateTimeForDisplay(actualFromValue)}</span>
                                        <span className="block">{formatDateTimeForDisplay(actualToValue)}</span>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <ReservationItemDateTimeFields item={item} onFieldChange={handleChange} />
                        )}
                    </div>
                </div>

            </div>

            {/* Delete Button */}
            <div className="mt-2">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                    TA BORT TILLBEHOR
                </button>
            </div>
        </div>
    );
};

export default ReservationItemAccessory;
