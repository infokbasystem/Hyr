import React from 'react';
import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';
import ReservationItemDateTimeFields from './ReservationItemDateTimeFields';

const ReservationItemCabin = ({ item, index, onRemove, onChange, itemCategories, defaultBookedFromTime = '', defaultBookedToTime = '' }) => {
    const handleChange = (field, value) => {
        onChange(index, field, value);
    };

    return (
        <div className="bg-yellow-50/50 border border-gray-300 rounded-sm p-3 mb-3">
            <div className="flex flex-row gap-12">
                <div className="w-[270px]">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">{item?.itemName || 'Cabin'}</h3>
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

                <div className="w-[540px]">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Bokningsinfo</h3>
                    <div className="space-y-1">
                        <ReservationItemDateTimeFields
                            item={item}
                            onFieldChange={handleChange}
                            defaultBookedFromTime={defaultBookedFromTime}
                            defaultBookedToTime={defaultBookedToTime}
                        />
                        <LabeledInput
                            label="Leveransplats"
                            value={item?.deliveryPlaceNote || ''}
                            onChange={(value) => handleChange('deliveryPlaceNote', value)}
                            labelWidth="w-24"
                            margintop="2"
                        />
                        <LabeledInput
                            label="Hämtningsplats"
                            value={item?.pickupPlaceNote || ''}
                            onChange={(value) => handleChange('pickupPlaceNote', value)}
                            labelWidth="w-24"
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold mb-2">&nbsp;</h3>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={item?.isCheckedIn || false}
                            onChange={(e) => handleChange('isCheckedIn', e.target.checked)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <span className="text-xs text-gray-700">Incheckad</span>
                    </label>
                </div>
            </div>

            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                    TA BORT BYGGBOD
                </button>
            </div>
        </div>
    );
};

export default ReservationItemCabin;
