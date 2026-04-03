import React from 'react';
import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';

const ReservationItemEquipment = ({ item, index, onRemove, onChange, itemCategories }) => {
    const handleChange = (field, value) => {
        onChange(index, field, value);
    };

    return (
        <div className="bg-yellow-50 border border-gray-300 rounded-sm p-3 mb-3">
            <div className="grid grid-cols-[270px_520px_200px_170px] gap-4">
                {/* Column 1: Equipment Info */}
                <div>
                    <h3 className="text-sm font-bold mb-2">UTRUSTNING - {item?.itemName || ''}</h3>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Artikelnr</label>
                            <span className="text-xs">{item?.articleNr}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Typ</label>
                            <span className="text-xs">{item?.category}</span>
                        </div>
                        <LabeledSelect
                            label="Debitkategori"
                            value={item?.debitCategoryId || ''}
                            onChange={(value) => handleChange('debitCategoryId', value)}
                            items={itemCategories || []}
                            labelWidth="w-20"
                            margintop="1"
                        />
                    </div>
                </div>

                {/* Column 2: Booking Info */}
                <div>
                    <h3 className="text-sm font-bold mb-2">Bokningsinfo</h3>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Bokad från</label>
                            <input
                                type="datetime-local"
                                value={item?.bookedFrom || ''}
                                onChange={(e) => handleChange('bookedFrom', e.target.value)}
                                className="text-xs w-40 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                            />
                            <label className="text-xs text-gray-700 w-16">utlämnad</label>
                            <input
                                type="datetime-local"
                                value={item?.actualFrom || ''}
                                onChange={(e) => handleChange('actualFrom', e.target.value)}
                                className="text-xs w-40 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Bokad till</label>
                            <input
                                type="datetime-local"
                                value={item?.bookedTo || ''}
                                onChange={(e) => handleChange('bookedTo', e.target.value)}
                                className="text-xs w-40 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                            />
                            <label className="text-xs text-gray-700 w-16">åter</label>
                            <input
                                type="datetime-local"
                                value={item?.actualTo || ''}
                                onChange={(e) => handleChange('actualTo', e.target.value)}
                                className="text-xs w-40 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none bg-white"
                            />
                        </div>
                        <LabeledInput
                            label="Lämningsplats"
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

                {/* Column 3: Checkboxes */}
                <div>
                    <h3 className="text-sm font-bold mb-2">&nbsp;</h3>
                    <div className="space-y-2">
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

                {/* Column 4: Empty */}
                <div>
                    <h3 className="text-sm font-bold mb-2">&nbsp;</h3>
                </div>
            </div>

            {/* Delete Button */}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                    TA BORT UTRUSTNING
                </button>
            </div>
        </div>
    );
};

export default ReservationItemEquipment;
