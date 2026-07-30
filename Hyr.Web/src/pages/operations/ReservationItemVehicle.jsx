import React, { useState } from 'react';

import LabeledCheckbox from '../../components/LabeledCheckbox';
import LabeledDatePicker from '../../components/LabeledDatePicker';
import LabeledInput from '../../components/LabeledInput';
import LabeledSelect from '../../components/LabeledSelect';
import TimeDropdownInput from '../../components/TimeDropdownInput';

const DEFAULT_TIME = '00:00';
const DATE_TIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/;

const getTodayDatePart = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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

const buildDateTimeValue = (datePart, timePart) => {
    if (!datePart) {
        return '';
    }

    return `${datePart}T${timePart || DEFAULT_TIME}`;
};


const ReservationItemVehicle = ({ item, index, onRemove, onChange, insuranceCompanies, itemCategories }) => {
    const [showInsurance, setShowInsurance] = useState(item?.isInsurance || false);

    const handleChange = (field, value) => {
        onChange(index, field, value);
    };

    const handleInsuranceToggle = (value) => {
        setShowInsurance(value);
        handleChange('isInsurance', value);
    };

    const handleDateChange = (field, nextDatePart) => {
        const nextDate = String(nextDatePart ?? '').trim();
        if (!nextDate) {
            handleChange(field, '');
            return;
        }

        const currentValue = splitDateTimeValue(item?.[field]);
        handleChange(field, buildDateTimeValue(nextDate, currentValue.timePart || DEFAULT_TIME));
    };

    const handleTimeChange = (field, nextTimePart) => {
        const nextTime = String(nextTimePart ?? '').trim();
        if (!nextTime) {
            return;
        }

        const currentValue = splitDateTimeValue(item?.[field]);
        const datePart = currentValue.datePart || getTodayDatePart();
        handleChange(field, buildDateTimeValue(datePart, nextTime));
    };

    const bookedFrom = splitDateTimeValue(item?.bookedFrom);
    const actualFrom = splitDateTimeValue(item?.actualFrom);
    const bookedTo = splitDateTimeValue(item?.bookedTo);
    const actualTo = splitDateTimeValue(item?.actualTo);

    return (
        <div className="bg-lime-50/50 border border-gray-300 rounded-sm p-3 mb-3">
            <div className="flex flex-row gap-12">
                {/* Column 1: Vehicle Info */}
                <div className="w-[270px]">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">{item?.regNr || 'Bil'}</h3>
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
                <div className="">
                    <h3 className="text-xs font-bold mb-2 uppercase tracking-[0.1em] text-gray-500">Bokningsinfo</h3>
                    <div className="">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-1">
                                <LabeledDatePicker
                                    label="Bokad från"
                                    value={bookedFrom.datePart}
                                    onChange={(value) => handleDateChange('bookedFrom', value)}
                                    valueType="input"
                                    labelWidth="w-18"
                                    inputWidth="w-[100px]"
                                    margintop="0"
                                    placeholder="Datum"
                                />
                                <TimeDropdownInput
                                    value={bookedFrom.timePart}
                                    onChange={(value) => handleTimeChange('bookedFrom', value)}
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <LabeledDatePicker
                                    label="Utlämnad"
                                    value={actualFrom.datePart}
                                    onChange={(value) => handleDateChange('actualFrom', value)}
                                    valueType="input"
                                    labelWidth="w-18"
                                    inputWidth="w-[100px]"
                                    margintop="0"
                                    placeholder="Datum"
                                />
                                <TimeDropdownInput
                                    value={actualFrom.timePart}
                                    onChange={(value) => handleTimeChange('actualFrom', value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-1">
                                <LabeledDatePicker
                                    label="Bokad till"
                                    value={bookedTo.datePart}
                                    onChange={(value) => handleDateChange('bookedTo', value)}
                                    valueType="input"
                                    labelWidth="w-18"
                                    inputWidth="w-[100px]"
                                    margintop="0"
                                    placeholder="Datum"
                                />
                                <TimeDropdownInput
                                    value={bookedTo.timePart}
                                    onChange={(value) => handleTimeChange('bookedTo', value)}
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <LabeledDatePicker
                                    label="Återlämnad"
                                    value={actualTo.datePart}
                                    onChange={(value) => handleDateChange('actualTo', value)}
                                    valueType="input"
                                    labelWidth="w-18"
                                    inputWidth="w-[100px]"
                                    margintop="0"
                                    placeholder="Datum"
                                />
                                <TimeDropdownInput
                                    value={actualTo.timePart}
                                    onChange={(value) => handleTimeChange('actualTo', value)}
                                />
                            </div>
                        </div>
                        <LabeledInput
                            label="Lämningsplats"
                            value={item?.deliveryPlaceNote || ''}
                            onChange={(value) => handleChange('deliveryPlaceNote', value)}
                            labelWidth="w-24"
                            inputWidth="w-[432px]"
                            margintop="2"
                        />
                        <LabeledInput
                            label="Hämtningsplats"
                            value={item?.pickupPlaceNote || ''}
                            onChange={(value) => handleChange('pickupPlaceNote', value)}
                            labelWidth="w-24"
                            inputWidth="w-[432px]"
                        />
                    </div>
                </div>

                {/* Column 3: Checkboxes */}
                <div className="w-[160px] pl-6">
                    <h3 className="text-sm font-bold mb-2">&nbsp;</h3>
                    <div className="">
                        <LabeledCheckbox
                            label="Incheckad"
                            checked={item?.isCheckedIn || false}
                            onChange={(value) => handleChange('isCheckedIn', value)}
                            color="teal"
                        />
                        <LabeledCheckbox
                            label="Ev. förlängning"
                            checked={item?.evProlonging || false}
                            onChange={(value) => handleChange('evProlonging', value)}
                            color="teal"
                        />
                        <LabeledCheckbox
                            label="Utland tillåtet"
                            checked={item?.abroadOk || false}
                            onChange={(value) => handleChange('abroadOk', value)}
                            color="teal"
                        />
                        <LabeledCheckbox
                            label="Ej ombokningsbar"
                            checked={item?.notRebookable || false}
                            onChange={(value) => handleChange('notRebookable', value)}
                            color="teal"
                        />
                        <LabeledCheckbox
                            label="Försäkringsärende"
                            checked={showInsurance}
                            onChange={handleInsuranceToggle}
                            color="teal"
                        />
                    </div>
                </div>

                {/* Column 4: Meter & Fuel */}
                <div className="w-[150px]">
                    <h3 className="text-sm font-bold mb-2">&nbsp;</h3>
                    <div className="">
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
                    <div className="flex flex-row gap-12">
                        {/* Insurance Column 1 */}
                        <div className="w-70">
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
                        <div className="w-50">
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
                            <LabeledCheckbox
                                label="Kund vållande"
                                checked={item?.insuranceCustomerIsCause || false}
                                onChange={(value) => handleChange('insuranceCustomerIsCause', value)}
                                labelPosition="left"
                                labelClassName="w-28"
                                className="mt-2"
                                color="red"
                            />
                        </div>

                        {/* Insurance Column 3 */}
                        <div className="w-50">
                            <LabeledInput
                                label="Medgivna dagar"
                                value={item?.insuranceMaxAllowedCompensationDays || ''}
                                onChange={(value) => handleChange('insuranceMaxAllowedCompensationDays', value)}
                                labelWidth="w-25"
                            />
                            <LabeledInput
                                label="Medgivet belopp"
                                value={item?.insuranceMaxAllowedCompensationCost || ''}
                                onChange={(value) => handleChange('insuranceMaxAllowedCompensationCost', value)}
                                labelWidth="w-25"
                            />
                        </div>

                        {/* Insurance Column 4: Manual Calculation */}
                        <div className="w-80 bg-sky-50 border border-sky-200 py-2 px-4 rounded">
                            <LabeledCheckbox
                                label="Manuell fördelning"
                                checked={item?.insuranceIsManualCalc || false}
                                onChange={(value) => handleChange('insuranceIsManualCalc', value)}
                                labelPosition="left"
                                className="mb-2"
                                color="red"
                            />
                            <div className="grid grid-cols-2 gap-5">
                                <div className="">
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
                                <div className="">
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
            <div className="mt-1">
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
