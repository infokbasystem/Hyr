import React, { useState } from 'react';

import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';


const ReservationItemVehicle = ({ item, index, onRemove, onChange, insuranceCompanies, itemCategories }) => {
    const [showInsurance, setShowInsurance] = useState(item?.isInsurance || false);

    const handleChange = (field, value) => {
        onChange(index, field, value);
    };

    const handleInsuranceToggle = (value) => {
        setShowInsurance(value);
        handleChange('isInsurance', value);
    };

    return (
        <div className="bg-yellow-50 border border-gray-300 rounded-sm p-3 mb-3">
            <div className="grid grid-cols-[270px_520px_200px_170px] gap-4">
                {/* Column 1: Vehicle Info */}
                <div>
                    <h3 className="text-sm font-bold mb-2">{item?.regNr || 'Fordon'}</h3>
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Reg.nr</label>
                            <span className="text-xs">{item?.regNr}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Kategori</label>
                            <span className="text-xs">{item?.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Fabrikat</label>
                            <span className="text-xs">{item?.manufacturer} {item?.model}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-700 w-20">Årsmodell</label>
                            <span className="text-xs">{item?.yearModel}</span>
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
                    {item?.itemNote && (
                        <p className="text-xs text-gray-500 mt-2">{item.itemNote}</p>
                    )}
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
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={item?.evProlonging || false}
                                onChange={(e) => handleChange('evProlonging', e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">Ev. förlängning</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={item?.abroadOk || false}
                                onChange={(e) => handleChange('abroadOk', e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">Utland tillåtet</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={item?.notRebookable || false}
                                onChange={(e) => handleChange('notRebookable', e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">Ej ombokningsbar</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={showInsurance}
                                onChange={(e) => handleInsuranceToggle(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">Försäkringsärende</span>
                        </label>
                    </div>
                </div>

                {/* Column 4: Meter & Fuel */}
                <div>
                    <h3 className="text-sm font-bold mb-2">&nbsp;</h3>
                    <div className="space-y-1">
                        <LabeledInput
                            label="Mätarst. ut"
                            value={item?.kmOut || ''}
                            onChange={(value) => handleChange('kmOut', value)}
                            labelWidth="w-20"
                        />
                        <LabeledInput
                            label="Mätarst. in"
                            value={item?.kmIn || ''}
                            onChange={(value) => handleChange('kmIn', value)}
                            labelWidth="w-20"
                        />
                        <LabeledInput
                            label="Drivmedel ltr."
                            value={item?.fuelLitres || ''}
                            onChange={(value) => handleChange('fuelLitres', value)}
                            labelWidth="w-20"
                            margintop="2"
                        />
                        <LabeledInput
                            label="á-pris"
                            value={item?.fuelUnitPrice || ''}
                            onChange={(value) => handleChange('fuelUnitPrice', value)}
                            labelWidth="w-20"
                        />
                    </div>
                </div>
            </div>

            {/* Insurance Section */}
            {showInsurance && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="grid grid-cols-[350px_240px_220px_1fr] gap-4">
                        {/* Insurance Column 1 */}
                        <div className="space-y-1">
                            <LabeledSelect
                                label="Försäkringsbolag"
                                value={item?.insuranceCompanyId || ''}
                                onChange={(value) => handleChange('insuranceCompanyId', value)}
                                items={insuranceCompanies || []}
                                labelWidth="w-28"
                            />
                            <LabeledInput
                                label="Skadenummer"
                                value={item?.insuranceDamageNr || ''}
                                onChange={(value) => handleChange('insuranceDamageNr', value)}
                                labelWidth="w-28"
                            />
                        </div>

                        {/* Insurance Column 2 */}
                        <div className="space-y-1">
                            <LabeledInput
                                label="Kunds reg.nr"
                                value={item?.insuranceCustomerRegNr || ''}
                                onChange={(value) => handleChange('insuranceCustomerRegNr', value)}
                                labelWidth="w-28"
                            />
                            <LabeledInput
                                label="Motparts reg.nr"
                                value={item?.insuranceCounterpartRegNr || ''}
                                onChange={(value) => handleChange('insuranceCounterpartRegNr', value)}
                                labelWidth="w-28"
                            />
                            <LabeledInput
                                label="Skadedatum"
                                value={item?.insuranceDamageDate || ''}
                                onChange={(value) => handleChange('insuranceDamageDate', value)}
                                labelWidth="w-28"
                            />
                            <label className="flex items-center space-x-2 mt-2">
                                <span className="text-xs text-gray-700 w-28">Kund vållande</span>
                                <input
                                    type="checkbox"
                                    checked={item?.insuranceCustomerIsCause || false}
                                    onChange={(e) => handleChange('insuranceCustomerIsCause', e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-red-600"
                                />
                            </label>
                        </div>

                        {/* Insurance Column 3 */}
                        <div className="space-y-1">
                            <LabeledInput
                                label="Medgivna dagar"
                                value={item?.insuranceMaxAllowedCompensationDays || ''}
                                onChange={(value) => handleChange('insuranceMaxAllowedCompensationDays', value)}
                                labelWidth="w-28"
                            />
                            <LabeledInput
                                label="Medgivet belopp"
                                value={item?.insuranceMaxAllowedCompensationCost || ''}
                                onChange={(value) => handleChange('insuranceMaxAllowedCompensationCost', value)}
                                labelWidth="w-28"
                            />
                        </div>

                        {/* Insurance Column 4: Manual Calculation */}
                        <div className="bg-gray-50 p-2 rounded">
                            <label className="flex items-center space-x-2 mb-2">
                                <span className="text-xs text-gray-700">Manuell fördelning</span>
                                <input
                                    type="checkbox"
                                    checked={item?.insuranceIsManualCalc || false}
                                    onChange={(e) => handleChange('insuranceIsManualCalc', e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-red-600"
                                />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <LabeledInput
                                        label="Maxbel. hyra"
                                        value={item?.insuranceManualMaxCompensationCost || ''}
                                        onChange={(value) => handleChange('insuranceManualMaxCompensationCost', value)}
                                        labelWidth="w-20"
                                    />
                                    <LabeledInput
                                        label="Max dagar"
                                        value={item?.insuranceManualMaxCompensationDays || ''}
                                        onChange={(value) => handleChange('insuranceManualMaxCompensationDays', value)}
                                        labelWidth="w-20"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <LabeledInput
                                        label="Ange belopp i"
                                        value={item?.insuranceManualCalcPercentSek || ''}
                                        onChange={(value) => handleChange('insuranceManualCalcPercentSek', value)}
                                        labelWidth="w-24"
                                    />
                                    <LabeledInput
                                        label="Andel av hyra"
                                        value={item?.insuranceManualShareRent || ''}
                                        onChange={(value) => handleChange('insuranceManualShareRent', value)}
                                        labelWidth="w-24"
                                    />
                                    <LabeledInput
                                        label="Andel av km"
                                        value={item?.insuranceManualShareKm || ''}
                                        onChange={(value) => handleChange('insuranceManualShareKm', value)}
                                        labelWidth="w-24"
                                    />
                                    <LabeledInput
                                        label="Andel av moms"
                                        value={item?.insuranceManualShareVat || ''}
                                        onChange={(value) => handleChange('insuranceManualShareVat', value)}
                                        labelWidth="w-24"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Button */}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                >
                    TA BORT BIL
                </button>
            </div>
        </div>
    );
};

export default ReservationItemVehicle;
