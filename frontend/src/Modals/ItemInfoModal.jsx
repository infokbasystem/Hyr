import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';

import { getItemById, getItemFormOptions } from '../lib/itemApi';
import { getSharedRequest } from '../lib/sharedRequest';
import { formatApiDateToSwedish } from '../helpers/dateUtils';

const numberFormatter = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });

const IDENTITY_SECTION = {
    title: 'Objekt',
    fields: [
        { key: 'itemNr', label: 'Namn' },
        { key: 'itemCategoryId', label: 'Kategori', type: 'category' },
        { key: 'itemModelId', label: 'Modell', type: 'model' },
        { key: 'manufacturer', label: 'Fabrikat' },
        { key: 'articleNr', label: 'Artikelnr' },
    ],
};

const PRICE_SECTION = {
    title: 'Pris',
    fields: [
        { key: 'basePrice', label: 'Grundpris', type: 'money' },
        { key: 'pricePerHour', label: 'Pris/timme', type: 'money' },
        { key: 'pricePerDay', label: 'Pris/dag', type: 'money' },
        { key: 'pricePerWeek', label: 'Pris/vecka', type: 'money' },
        { key: 'pricePerMonth', label: 'Pris/månad', type: 'money' },
        { key: 'pricePerKm', label: 'Pris/km', type: 'money' },
        { key: 'replacementCost', label: 'Ersättningskostnad', type: 'money' },
    ],
};

const NOTE_SECTION = {
    title: 'Noteringar',
    fields: [
        { key: 'note', label: 'Notering', type: 'multiline' },
        { key: 'popupText', label: 'Popuptext', type: 'multiline' },
        { key: 'unavailableForReservation', label: 'Ej bokningsbar', type: 'bool' },
        { key: 'unavailableFrom', label: 'Ej bokningsbar från', type: 'date' },
        { key: 'unavailableTo', label: 'Ej bokningsbar till', type: 'date' },
        { key: 'unavailableReason', label: 'Orsak', type: 'multiline' },
    ],
};

const MACHINE_SECTION = {
    title: 'Teknisk info',
    fields: [
        { key: 'machineNr', label: 'Maskinnr' },
        { key: 'serialNr', label: 'Serienr' },
        { key: 'yearModel', label: 'Årsmodell' },
        { key: 'weightKg', label: 'Vikt', type: 'number', suffix: 'kg' },
        { key: 'platformHeightMm', label: 'Plattformshöjd', type: 'number', suffix: 'mm' },
        { key: 'platformLengthMm', label: 'Plattformslängd', type: 'number', suffix: 'mm' },
        { key: 'hourMeter', label: 'Timmätare', type: 'number', suffix: 'h' },
        { key: 'nrOfItemsTotal', label: 'Totalt antal', type: 'number' },
    ],
};

const ITEM_INFO_TEMPLATES = {
    VEHICLE: [
        {
            ...IDENTITY_SECTION,
            fields: [
                ...IDENTITY_SECTION.fields,
                { key: 'regNr', label: 'Regnr' },
                { key: 'yearModel', label: 'Årsmodell' },
                { key: 'fuel', label: 'Drivmedel' },
            ],
        },
        {
            title: 'Fordon',
            fields: [
                { key: 'kmReading', label: 'Mätarställning', type: 'number', suffix: 'km' },
                { key: 'hourMeter', label: 'Timmätare', type: 'number', suffix: 'h' },
                { key: 'fuelConsumptionLitresPerKm', label: 'Förbrukning', type: 'number', suffix: 'l/km' },
                { key: 'equipment', label: 'Utrustning', type: 'multiline' },
            ],
        },
        PRICE_SECTION,
        NOTE_SECTION,
    ],
    CABIN: [
        {
            ...IDENTITY_SECTION,
            fields: [
                ...IDENTITY_SECTION.fields,
                { key: 'cabinTypeCode', label: 'Byggbodtyp', type: 'cabinType' },
                { key: 'serialNr', label: 'Serienr' },
                { key: 'yearModel', label: 'Tillverkningsår' },
            ],
        },
        {
            title: 'Mått & vikt',
            fields: [
                { key: 'lengthMm', label: 'Längd (utv.)', type: 'number', suffix: 'mm' },
                { key: 'widthMm', label: 'Bredd (utv.)', type: 'number', suffix: 'mm' },
                { key: 'heightMm', label: 'Höjd (utv.)', type: 'number', suffix: 'mm' },
                { key: 'internalHeightMm', label: 'Invändig takhöjd', type: 'number', suffix: 'mm' },
                { key: 'internalFloorAreaM2', label: 'Golvyta (inv.)', type: 'number', suffix: 'm²' },
                { key: 'weightKg', label: 'Tomvikt', type: 'number', suffix: 'kg' },
                { key: 'maxLoadKg', label: 'Max last', type: 'number', suffix: 'kg' },
                { key: 'nrOfModules', label: 'Antal moduler', type: 'number' },
            ],
        },
        {
            title: 'El & klimat',
            fields: [
                { key: 'nrOfSockets', label: 'Antal uttag', type: 'number' },
                { key: 'electricalPhase', label: 'Fas' },
                { key: 'powerConnectionType', label: 'Anslutning' },
                { key: 'hasResidualCurrentDevice', label: 'Jordfelsbrytare', type: 'bool' },
                { key: 'hasDistributionBoard', label: 'Elcentral', type: 'bool' },
                { key: 'hasLighting', label: 'Belysning', type: 'bool' },
                { key: 'hasElectricRadiator', label: 'Elelement', type: 'bool' },
                { key: 'hasHeatPump', label: 'Värmepump', type: 'bool' },
                { key: 'hasUnderfloorHeating', label: 'Golvvärme', type: 'bool' },
                { key: 'hasAirConditioning', label: 'AC/kyla', type: 'bool' },
                { key: 'hasVentilation', label: 'Ventilation', type: 'bool' },
            ],
        },
        {
            title: 'Vatten, kök & inredning',
            fields: [
                { key: 'toiletType', label: 'Toalett' },
                { key: 'nrOfSeats', label: 'Antal platser', type: 'number' },
                { key: 'nrOfLockers', label: 'Antal skåp', type: 'number' },
                { key: 'nrOfTables', label: 'Antal bord', type: 'number' },
                { key: 'nrOfChairs', label: 'Antal stolar', type: 'number' },
                { key: 'nrOfBenches', label: 'Antal bänkar', type: 'number' },
                { key: 'hasSink', label: 'Handfat', type: 'bool' },
                { key: 'hasWaterHeater', label: 'Varmvattenberedare', type: 'bool' },
                { key: 'hasWaterTank', label: 'Vattentank', type: 'bool' },
                { key: 'hasFridge', label: 'Kylskåp', type: 'bool' },
                { key: 'hasMicrowave', label: 'Mikrovågsugn', type: 'bool' },
                { key: 'hasCoffeeMaker', label: 'Kaffebryggare', type: 'bool' },
                { key: 'hasKitchenSink', label: 'Diskbänk', type: 'bool' },
                { key: 'hasDryingCabinet', label: 'Torkskåp', type: 'bool' },
                { key: 'equipment', label: 'Övrig utrustning', type: 'multiline' },
            ],
        },
        {
            title: 'Funktion & placering',
            fields: [
                { key: 'nrOfWindows', label: 'Antal fönster', type: 'number' },
                { key: 'doorType', label: 'Dörrtyp' },
                { key: 'lockType', label: 'Lås' },
                { key: 'isInsulated', label: 'Isolerad', type: 'bool' },
                { key: 'isWinterRated', label: 'Vinterklassad', type: 'bool' },
                { key: 'hasLoadBearingRoof', label: 'Bärande tak', type: 'bool' },
                { key: 'hasLiftingEyes', label: 'Lyftöglor', type: 'bool' },
                { key: 'hasForkliftPockets', label: 'Gaffelfickor', type: 'bool' },
                { key: 'isStackable', label: 'Stapelbar', type: 'bool' },
                { key: 'requiresSupportLegs', label: 'Kräver stödben', type: 'bool' },
                { key: 'placementRequirements', label: 'Placeringskrav', type: 'multiline' },
            ],
        },
        PRICE_SECTION,
        {
            title: 'Ekonomi & ägande',
            fields: [
                { key: 'purchasePrice', label: 'Inköpspris', type: 'money' },
                { key: 'purchaseDate', label: 'Inköpsdatum', type: 'date' },
                { key: 'bookValue', label: 'Bokfört värde', type: 'money' },
                { key: 'depreciationPeriodMonths', label: 'Avskrivningstid', type: 'number', suffix: 'mån' },
                { key: 'isRentedIn', label: 'Inhyrd', type: 'bool' },
                { key: 'ownerName', label: 'Ägare' },
                { key: 'rentedInCostPerMonth', label: 'Inhyrning/mån', type: 'money' },
                { key: 'rentedInAgreementRef', label: 'Avtalsreferens' },
            ],
        },
        NOTE_SECTION,
    ],
};

const DEFAULT_TEMPLATE = [IDENTITY_SECTION, MACHINE_SECTION, PRICE_SECTION, NOTE_SECTION];

function hasValue(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'boolean') return value;
    return true;
}

function resolveLookup(options, id) {
    return options.find((option) => String(option.id) === String(id))?.name ?? '';
}

function formatFieldValue(field, value, formOptions) {
    switch (field.type) {
        case 'category':
            return resolveLookup(formOptions.itemCategoryOptions, value);
        case 'model':
            return resolveLookup(formOptions.itemModelOptions, value);
        case 'cabinType':
            return resolveLookup(formOptions.cabinTypeOptions, value) || value;
        case 'money':
            return `${numberFormatter.format(Number(value))} kr`;
        case 'number':
            return `${numberFormatter.format(Number(value))}${field.suffix ? ` ${field.suffix}` : ''}`;
        case 'date':
            return formatApiDateToSwedish(value);
        default:
            return String(value);
    }
}

function buildSections(item, formOptions) {
    const code = String(item?.itemTypeCode ?? '').trim().toUpperCase();
    const template = ITEM_INFO_TEMPLATES[code] ?? DEFAULT_TEMPLATE;

    return template
        .map((section) => {
            const filledFields = section.fields.filter((field) => hasValue(item[field.key]));
            return {
                title: section.title,
                values: filledFields
                    .filter((field) => field.type !== 'bool')
                    .map((field) => ({ ...field, display: formatFieldValue(field, item[field.key], formOptions) }))
                    .filter((field) => field.display),
                flags: filledFields.filter((field) => field.type === 'bool').map((field) => field.label),
            };
        })
        .filter((section) => section.values.length > 0 || section.flags.length > 0);
}

const ItemInfoModal = ({ itemId, onClose }) => {
    const [item, setItem] = useState(null);
    const [formOptions, setFormOptions] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itemId) return undefined;

        let isActive = true;
        setItem(null);
        setError('');

        Promise.all([
            getItemById(itemId),
            getSharedRequest('item-form-options', () => getItemFormOptions()),
        ])
            .then(([itemData, options]) => {
                if (!isActive) return;
                setItem(itemData);
                setFormOptions(options);
            })
            .catch(() => {
                if (isActive) setError('Kunde inte läsa objektets information.');
            });

        return () => { isActive = false; };
    }, [itemId]);

    useEffect(() => {
        if (!itemId) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [itemId, onClose]);

    if (!itemId) return null;

    const sections = item && formOptions ? buildSections(item, formOptions) : [];

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 z-40" />
            <div className="relative z-50 flex min-h-screen items-start justify-center pt-20" onClick={onClose}>
                <div
                    className="relative max-h-[calc(100vh-8rem)] w-[720px] overflow-hidden rounded-sm border border-slate-200 bg-slate-50 shadow-xl py-6 px-8 flex flex-col"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="relative flex items-center justify-center mb-4">
                        <h2 className="text-sm font-semibold text-center">
                            {item?.itemNr || 'Objektinformation'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-0 text-slate-400 hover:text-slate-600 text-l leading-none mb-1"
                        >
                            ×
                        </button>
                    </div>

                    <div className="min-h-0 overflow-y-auto pr-1">
                        {error && (
                            <div className="text-center text-xs text-red-600">{error}</div>
                        )}

                        {!error && !item && (
                            <div className="flex justify-center py-6">
                                <LoaderCircle className="h-5 w-5 animate-spin text-gray-500" />
                            </div>
                        )}

                        {item && sections.length === 0 && (
                            <div className="text-center text-xs text-slate-600">Ingen information har angetts för objektet.</div>
                        )}

                        {sections.map((section) => (
                            <div key={section.title} className="mb-4">
                                <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.10em] text-gray-500">
                                    {section.title}
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                    {section.values.map((field) => (
                                        <div
                                            key={field.key}
                                            className={`flex text-xs ${field.type === 'multiline' ? 'col-span-2' : ''}`}
                                        >
                                            <span className="w-36 flex-none text-gray-600">{field.label}</span>
                                            <span className="whitespace-pre-wrap text-gray-900">{field.display}</span>
                                        </div>
                                    ))}
                                </div>
                                {section.flags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {section.flags.map((label) => (
                                            <span
                                                key={label}
                                                className="rounded-full border border-sky-300 bg-sky-50 px-2 py-[1px] text-[11px] text-gray-800"
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ItemInfoModal;
